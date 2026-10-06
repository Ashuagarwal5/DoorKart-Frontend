'use client';

import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { ORDER_ACTION, ORDER_ACTION_DONE } from '@/constants/status';
import { changeOrderStatus, recordCashCollected } from '@/services/api/admin-api';
import { ApiError, describeApiError, toApiError } from '@/services/api/api-error';
import type { OrderDetail, OrderStatus } from '@/types/api';
import { formatCurrency } from '@/utils/money';

/**
 * What the admin is asked to confirm for each status change that matters. The text only
 * describes what the backend does; whether the change is allowed is decided by the server.
 */
const CONFIRMATIONS: Partial<
  Record<OrderStatus, { title: string; tone: 'primary' | 'danger'; noteLabel: string; body: ReactNode }>
> = {
  DELIVERED: {
    title: 'Mark this order as delivered?',
    tone: 'primary',
    noteLabel: 'Note (optional)',
    body: (
      <>
        <p>
          This <strong>finalizes the inventory sale</strong>: the ordered quantities are taken out of stock.
        </p>
        <p>
          <strong>It cannot be undone.</strong> Delivering does not record the cash as collected; that is a separate
          step.
        </p>
      </>
    ),
  },
  CANCELLED: {
    title: 'Cancel this order?',
    tone: 'danger',
    noteLabel: 'Reason (optional)',
    body: (
      <>
        <p>The order stays on record with its totals, and the stock reserved for it goes back on sale.</p>
        <p>
          <strong>It cannot be undone.</strong>
        </p>
      </>
    ),
  },
  DELIVERY_FAILED: {
    title: 'Mark the delivery as failed?',
    tone: 'primary',
    noteLabel: 'What happened? (optional)',
    body: (
      <p>
        The stock stays reserved for this order. You can send it out again, or cancel it later.
      </p>
    ),
  },
};

/**
 * The buttons for moving an order along. They come straight from the server's
 * `allowedNextStatuses`: if the server does not list a status, there is no button for it.
 */
export function OrderActions({ order, onChanged }: { order: OrderDetail; onChanged: () => void }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [busyStatus, setBusyStatus] = useState<OrderStatus | null>(null);

  /** Runs the change. A refusal (409) means the order moved on elsewhere, so refresh first. */
  const apply = async (status: OrderStatus, note: string) => {
    try {
      await changeOrderStatus(order.id, status, note);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        onChanged();
      }
      throw error;
    }
    toast.success(ORDER_ACTION_DONE[status]);
    onChanged();
  };

  const runDirect = async (status: OrderStatus) => {
    setBusyStatus(status);
    try {
      await apply(status, '');
    } catch (error) {
      toast.error(describeApiError(toApiError(error)));
    } finally {
      setBusyStatus(null);
    }
  };

  if (order.allowedNextStatuses.length === 0) {
    return (
      <p className="text-sm text-muted">
        This order is {order.orderStatus === 'DELIVERED' ? 'delivered' : 'cancelled'}, so its status can no longer change.
      </p>
    );
  }

  const confirmation = confirming ? CONFIRMATIONS[confirming] : undefined;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {order.allowedNextStatuses.map((status) => (
          <Button
            key={status}
            variant={ORDER_ACTION[status].variant}
            loading={busyStatus === status}
            disabled={busyStatus !== null && busyStatus !== status}
            onClick={() => (CONFIRMATIONS[status] ? setConfirming(status) : void runDirect(status))}>
            {ORDER_ACTION[status].label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={confirming !== null && confirmation !== undefined}
        title={confirmation?.title ?? ''}
        tone={confirmation?.tone}
        noteLabel={confirmation?.noteLabel}
        confirmLabel={confirming ? ORDER_ACTION[confirming].label : ''}
        onClose={() => setConfirming(null)}
        onConfirm={(note) => (confirming ? apply(confirming, note) : Promise.resolve())}>
        {confirmation?.body}
      </ConfirmDialog>
    </>
  );
}

/**
 * "Mark cash collected" for a cash-on-delivery order. It is its own action and is never
 * implied by delivery. It shows only when the server says collection is possible.
 */
export function CollectCashAction({ order, onChanged }: { order: OrderDetail; onChanged: () => void }) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);

  if (!order.canCollectPayment) {
    return null;
  }

  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        Mark cash collected
      </Button>
      <ConfirmDialog
        open={isOpen}
        title="Record cash collection?"
        confirmLabel="Yes, cash received"
        noteLabel="Note (optional)"
        onClose={() => setIsOpen(false)}
        onConfirm={async (note) => {
          try {
            await recordCashCollected(order.id, note);
          } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
              onChanged();
            }
            throw error;
          }
          toast.success('Cash collection recorded.');
          onChanged();
        }}>
        <p>
          Confirm that <strong>{formatCurrency(order.grandTotalPaise)}</strong> in cash has been received for{' '}
          {order.orderNumber}.
        </p>
      </ConfirmDialog>
    </>
  );
}
