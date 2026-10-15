'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchDevices, type DeviceRecord } from '@/services/api/notifications-api';
import { formatDateTime } from '@/utils/date';
import { errorLabel } from './labels';
import { NotificationsNav } from './notifications-nav';

export function DevicesPage() {
  const [page, setPage] = useState(1);
  const query = useApiQuery(`notification-devices:${page}`, () => fetchDevices({ page, limit: 25 }));

  const columns: Column<DeviceRecord>[] = [
    { key: 'customer', header: 'Customer', cell: (d) => <>{d.account.fullName ?? '—'}<span className="block text-xs text-muted">{d.account.email}</span></> },
    { key: 'platform', header: 'Platform', cell: (d) => `${d.platform === 'ANDROID' ? 'Android' : 'iOS'}${d.appVersion ? ` · v${d.appVersion}` : ''}` },
    { key: 'token', header: 'Registration', cell: (d) => `…${d.tokenSuffix}` },
    { key: 'seen', header: 'Last registered', cell: (d) => formatDateTime(d.lastRegisteredAt) },
    {
      key: 'status',
      header: 'Status',
      cell: (d) => d.invalidatedAt
        ? <><Badge tone="danger">Inactive</Badge><span className="block text-xs text-muted">{errorLabel(d.invalidReason)}</span></>
        : <Badge tone="success">Active</Badge>,
    },
  ];

  return (
    <>
      <PageHeader title="Device registrations" description="Phones that signed in and allowed notifications. Registration tokens are never shown in full." />
      <NotificationsNav />
      <QueryView query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState title="No devices registered" message="A device appears after a customer signs in on the Android app and allows notifications." />
          ) : (
            <>
              <DataTable caption="Registered devices" columns={columns} rows={data.items} getKey={(d) => d.id} />
              <Pagination pagination={data.pagination} onPageChange={setPage} />
            </>
          )
        }
      </QueryView>
    </>
  );
}
