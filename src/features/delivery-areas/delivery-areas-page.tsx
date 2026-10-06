'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, QueryView } from '@/components/ui/states';
import { ActiveBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { DeliveryAreaFormDialog } from '@/features/delivery-areas/delivery-area-form-dialog';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchDeliveryAreas, updateDeliveryArea } from '@/services/api/admin-api';
import { describeApiError, toApiError } from '@/services/api/api-error';
import type { DeliveryArea } from '@/types/api';
import { formatCurrency } from '@/utils/money';

const optionalAmount = (paise: number | null, none: string) => (paise === null ? none : formatCurrency(paise));

export function DeliveryAreasPage() {
  const toast = useToast();
  const query = useApiQuery('delivery-areas', fetchDeliveryAreas);
  // `undefined`: dialog closed. `null`: creating. An area: editing it.
  const [editing, setEditing] = useState<DeliveryArea | null | undefined>(undefined);
  const [deactivating, setDeactivating] = useState<DeliveryArea | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const setActive = async (area: DeliveryArea, isActive: boolean) => {
    await updateDeliveryArea(area.id, { isActive });
    toast.success(isActive ? `${area.name} is active again.` : `${area.name} is now inactive.`);
    query.reload();
  };

  const activate = async (area: DeliveryArea) => {
    setBusyId(area.id);
    try {
      await setActive(area, true);
    } catch (error) {
      toast.error(describeApiError(toApiError(error)));
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<DeliveryArea>[] = [
    { key: 'name', header: 'Area', cell: (area) => <span className="font-medium text-fg">{area.name}</span> },
    { key: 'pincode', header: 'Pincode', cell: (area) => area.pincode ?? '—' },
    { key: 'charge', header: 'Delivery charge', align: 'right', cell: (area) => formatCurrency(area.deliveryChargePaise) },
    { key: 'minimum', header: 'Minimum order', align: 'right', cell: (area) => optionalAmount(area.minimumOrderPaise, 'None') },
    {
      key: 'free',
      header: 'Free delivery above',
      align: 'right',
      cell: (area) => optionalAmount(area.freeDeliveryThresholdPaise, 'Never'),
    },
    { key: 'status', header: 'Status', cell: (area) => <ActiveBadge isActive={area.isActive} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (area) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setEditing(area)}>
            Edit
          </Button>
          {area.isActive ? (
            <Button size="sm" onClick={() => setDeactivating(area)}>
              Deactivate
            </Button>
          ) : (
            <Button size="sm" loading={busyId === area.id} onClick={() => activate(area)}>
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Delivery areas"
        description="Where you deliver, and what it costs. Customers pick one of the active areas at checkout."
        actions={
          <Button variant="primary" onClick={() => setEditing(null)}>
            Add area
          </Button>
        }
      />

      <QueryView
        query={query}
        empty={(areas) =>
          areas.length === 0 ? (
            <EmptyState
              title="No delivery areas yet"
              message="Customers cannot place orders until at least one area is active."
              action={
                <Button variant="primary" onClick={() => setEditing(null)}>
                  Add area
                </Button>
              }
            />
          ) : null
        }>
        {(areas) => <DataTable caption="Delivery areas" columns={columns} rows={areas} getKey={(area) => area.id} />}
      </QueryView>

      <DeliveryAreaFormDialog
        open={editing !== undefined}
        area={editing ?? null}
        onClose={() => setEditing(undefined)}
        onSaved={query.reload}
      />

      <ConfirmDialog
        open={deactivating !== null}
        title="Deactivate this delivery area?"
        confirmLabel="Deactivate"
        tone="danger"
        onClose={() => setDeactivating(null)}
        onConfirm={async () => {
          if (deactivating) {
            await setActive(deactivating, false);
          }
        }}>
        <p>
          Customers will no longer be able to order for <strong>{deactivating?.name}</strong>. Orders already placed are
          not affected, and you can activate it again at any time.
        </p>
      </ConfirmDialog>
    </>
  );
}
