'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DetailRow } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/use-api-query';
import { describeApiError, toApiError } from '@/services/api/api-error';
import {
  fetchNotificationDetail,
  fetchNotificationEvents,
  fetchNotificationHistory,
  retryNotification,
  type NotificationRecord,
} from '@/services/api/notifications-api';
import { formatDateTime } from '@/utils/date';
import { errorLabel, NotificationStatusBadge, STATUS_HINT, STATUSES } from './labels';
import { NotificationsNav } from './notifications-nav';

export function HistoryPage() {
  const [filters, setFilters] = useState({ search: '', status: '', eventKey: '', from: '', to: '', page: 1 });
  const query = useApiQuery(JSON.stringify(filters), () => fetchNotificationHistory({ ...filters, limit: 25 }));
  const events = useApiQuery('notification-events', fetchNotificationEvents);
  const [openId, setOpenId] = useState<string | null>(null);

  const set = (key: 'status' | 'eventKey' | 'from' | 'to', value: string) =>
    setFilters((old) => ({ ...old, [key]: value, page: 1 }));

  const columns: Column<NotificationRecord>[] = [
    {
      key: 'title',
      header: 'Notification',
      cell: (n) => (
        <>
          <button type="button" className="text-left font-medium text-primary underline" onClick={() => setOpenId(n.id)}>{n.title}</button>
          <span className="block text-xs text-muted">{n.eventKey}{n.isTest ? ' · test' : ''}</span>
        </>
      ),
    },
    { key: 'recipient', header: 'Recipient', cell: (n) => <>{n.account.fullName ?? '—'}<span className="block text-xs text-muted">{n.account.email}</span></> },
    { key: 'reference', header: 'Order', cell: (n) => n.reference ?? '—' },
    { key: 'status', header: 'Status', cell: (n) => <><NotificationStatusBadge status={n.status} />{n.errorCategory ? <span className="mt-1 block text-xs text-muted">{errorLabel(n.errorCategory)}</span> : null}</> },
    { key: 'attempts', header: 'Attempts', cell: (n) => String(n.attemptCount) },
    { key: 'created', header: 'Created', cell: (n) => <>{formatDateTime(n.createdAt)}{n.processedAt ? <span className="block text-xs text-muted">Processed {formatDateTime(n.processedAt)}</span> : null}</> },
    { key: 'actions', header: 'Actions', align: 'right', cell: (n) => <Button size="sm" onClick={() => setOpenId(n.id)}>Details</Button> },
  ];

  return (
    <>
      <PageHeader title="Notification history" description={STATUS_HINT} />
      <NotificationsNav />
      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Search</span>
          <SearchInput label="Search" placeholder="Order, title, customer email" defaultValue={filters.search} onSearch={(value) => setFilters((old) => ({ ...old, search: value, page: 1 }))} />
        </div>
        <SelectField label="Status" value={filters.status} onChange={(e) => set('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </SelectField>
        <SelectField label="Event" value={filters.eventKey} onChange={(e) => set('eventKey', e.target.value)}>
          <option value="">All events</option>
          {events.data?.map((event) => <option key={event.key} value={event.key}>{event.name}</option>)}
        </SelectField>
        <TextField label="From" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        <TextField label="To" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
      </div>
      <QueryView query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState title="No notifications match" message="Notifications appear here when events occur and templates are enabled." />
          ) : (
            <>
              <DataTable caption="Notification history" columns={columns} rows={data.items} getKey={(n) => n.id} />
              <Pagination pagination={data.pagination} onPageChange={(page) => setFilters((old) => ({ ...old, page }))} />
            </>
          )
        }
      </QueryView>
      <DetailModal id={openId} onClose={() => setOpenId(null)} onChanged={query.reload} />
    </>
  );
}

function DetailModal({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  return (
    <Modal open={id !== null} onClose={onClose} title="Notification details" wide>
      {id ? <DetailBody key={id} id={id} onChanged={onChanged} /> : null}
    </Modal>
  );
}

function DetailBody({ id, onChanged }: { id: string; onChanged: () => void }) {
  const toast = useToast();
  const query = useApiQuery(`notification-detail:${id}`, () => fetchNotificationDetail(id));
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    try {
      await retryNotification(id);
      toast.success('Queued for another attempt.');
      query.reload();
      onChanged();
    } catch (error) {
      toast.error(describeApiError(toApiError(error)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <QueryView query={query}>
      {(n) => (
        <div className="space-y-4 text-sm">
          <dl>
            <DetailRow label="Status"><NotificationStatusBadge status={n.status} /></DetailRow>
            <DetailRow label="Event">{n.eventKey}</DetailRow>
            <DetailRow label="Template">{n.templateName ?? 'Deleted template'}</DetailRow>
            <DetailRow label="Recipient">{n.account.fullName ?? '—'} · {n.account.email}</DetailRow>
            <DetailRow label="Order">{n.reference ?? '—'}</DetailRow>
            <DetailRow label="Created">{formatDateTime(n.createdAt)}</DetailRow>
            <DetailRow label="Sent to FCM">{n.sentAt ? formatDateTime(n.sentAt) : '—'}</DetailRow>
            <DetailRow label="Attempts">{n.attemptCount}</DetailRow>
            <DetailRow label="FCM message ID">{n.fcmMessageId ?? '—'}</DetailRow>
            <DetailRow label="Error">{errorLabel(n.errorCategory)}</DetailRow>
            <DetailRow label="Opens">{n.targetScreen}</DetailRow>
          </dl>
          <div className="rounded-lg border border-line bg-bg p-3">
            <p className="text-xs text-muted">Push text</p>
            <p className="font-medium">{n.pushTitle}</p>
            <p className="break-words">{n.pushBody}</p>
          </div>
          <div className="rounded-lg border border-line bg-bg p-3">
            <p className="text-xs text-muted">Inbox text{n.readAt ? ` · read ${formatDateTime(n.readAt)}` : ' · unread'}</p>
            <p className="font-medium">{n.title}</p>
            <p className="break-words">{n.body}</p>
          </div>
          <div>
            <p className="mb-1 font-medium">Delivery attempts</p>
            {n.deliveries.length === 0 ? (
              <p className="text-muted">No device was contacted.</p>
            ) : (
              <ul className="space-y-1">
                {n.deliveries.map((delivery) => (
                  <li key={delivery.id} className="flex flex-wrap justify-between gap-2 rounded border border-line px-3 py-2">
                    <span>Attempt {delivery.attempt} · device …{delivery.tokenSuffix}</span>
                    <span>{delivery.status === 'SENT' ? 'Accepted by FCM' : errorLabel(delivery.errorCategory)} · {formatDateTime(delivery.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {n.status === 'FAILED' || n.status === 'SKIPPED' ? (
            <div className="flex justify-end">
              <Button variant="primary" loading={busy} onClick={retry}>Retry</Button>
            </div>
          ) : null}
        </div>
      )}
    </QueryView>
  );
}
