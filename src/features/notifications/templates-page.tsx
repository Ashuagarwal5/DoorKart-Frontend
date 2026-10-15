'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField, TextField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAdmin } from '@/features/auth/auth-context';
import { useApiQuery } from '@/hooks/use-api-query';
import { describeApiError, toApiError } from '@/services/api/api-error';
import {
  deleteTemplate,
  duplicateTemplate,
  fetchNotificationEvents,
  fetchTemplates,
  sendTestNotification,
  setTemplateEnabled,
  type NotificationTemplate,
} from '@/services/api/notifications-api';
import { formatDateTime } from '@/utils/date';
import { NotificationsNav } from './notifications-nav';

export function TemplatesPage() {
  const toast = useToast();
  const admin = useAdmin();
  const [filters, setFilters] = useState({ search: '', eventKey: '', enabled: '', page: 1 });
  const query = useApiQuery(JSON.stringify(filters), () => fetchTemplates({ ...filters, limit: 20 }));
  const events = useApiQuery('notification-events', fetchNotificationEvents);
  const [toDelete, setToDelete] = useState<NotificationTemplate | null>(null);
  const [toTest, setToTest] = useState<NotificationTemplate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const eventName = (key: string) => events.data?.find((event) => event.key === key)?.name ?? key;

  async function run(template: NotificationTemplate, work: () => Promise<unknown>, success: string) {
    setBusyId(template.id);
    try {
      await work();
      toast.success(success);
      query.reload();
    } catch (error) {
      toast.error(describeApiError(toApiError(error)));
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<NotificationTemplate>[] = [
    {
      key: 'name',
      header: 'Template',
      cell: (t) => (
        <>
          <Link href={`/notifications/templates/${t.id}`} className="font-medium text-primary underline">{t.name}</Link>
          <span className="block text-xs text-muted">{t.key}</span>
        </>
      ),
    },
    { key: 'event', header: 'Event', cell: (t) => eventName(t.eventKey) },
    { key: 'title', header: 'Title', cell: (t) => <p className="max-w-xs break-words">{t.title}</p> },
    { key: 'status', header: 'Status', cell: (t) => <Badge tone={t.isEnabled ? 'success' : 'neutral'}>{t.isEnabled ? 'Enabled' : 'Disabled'}</Badge> },
    { key: 'updated', header: 'Updated', cell: (t) => formatDateTime(t.updatedAt) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (t) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/notifications/templates/${t.id}`}><Button size="sm">Edit</Button></Link>
          <Button size="sm" loading={busyId === t.id} onClick={() => run(t, () => setTemplateEnabled(t.id, !t.isEnabled), t.isEnabled ? 'Template disabled.' : 'Template enabled.')}>
            {t.isEnabled ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" disabled={busyId === t.id} onClick={() => run(t, () => duplicateTemplate(t.id), 'Template duplicated (disabled).')}>Duplicate</Button>
          {admin.role === 'SUPER_ADMIN' ? <Button size="sm" onClick={() => setToTest(t)}>Send test</Button> : null}
          <Button size="sm" variant="danger" onClick={() => setToDelete(t)}>Delete</Button>
        </div>
      ),
    },
  ];

  const filter = (key: 'eventKey' | 'enabled', value: string) => setFilters((old) => ({ ...old, [key]: value, page: 1 }));

  return (
    <>
      <PageHeader
        title="Notification templates"
        description="Wording for each event. Only one template per event can be enabled at a time."
        actions={<Link href="/notifications/templates/new"><Button variant="primary">New template</Button></Link>}
      />
      <NotificationsNav />
      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Search</span>
          <SearchInput label="Search templates" placeholder="Name, identifier or title" defaultValue={filters.search} onSearch={(value) => setFilters((old) => ({ ...old, search: value, page: 1 }))} />
        </div>
        <SelectField label="Event" value={filters.eventKey} onChange={(e) => filter('eventKey', e.target.value)}>
          <option value="">All events</option>
          {events.data?.map((event) => <option key={event.key} value={event.key}>{event.name}</option>)}
        </SelectField>
        <SelectField label="Status" value={filters.enabled} onChange={(e) => filter('enabled', e.target.value)}>
          <option value="">All</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </SelectField>
      </div>
      <QueryView query={query}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState title="No templates yet" message="Create a template and enable it to send notifications for an event." action={<Link href="/notifications/templates/new"><Button variant="primary">New template</Button></Link>} />
          ) : (
            <>
              <DataTable caption="Notification templates" columns={columns} rows={data.items} getKey={(t) => t.id} />
              <Pagination pagination={data.pagination} onPageChange={(page) => setFilters((old) => ({ ...old, page }))} />
            </>
          )
        }
      </QueryView>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete template?"
        confirmLabel="Delete template"
        tone="danger"
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteTemplate(toDelete.id);
          toast.success('Template deleted. Past notifications keep their text.');
          query.reload();
        }}>
        <p className="text-sm">
          “{toDelete?.name}” will stop sending. Notifications already sent or in a customer’s inbox are kept exactly as they were.
        </p>
      </ConfirmDialog>

      <TestSendModal template={toTest} onClose={() => setToTest(null)} />
    </>
  );
}

function TestSendModal({ template, onClose }: { template: NotificationTemplate | null; onClose: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!template) return;
    setBusy(true);
    setError('');
    try {
      await sendTestNotification(template.id, email.trim());
      toast.success('Test notification queued. It appears in that customer’s inbox and on their devices shortly.');
      setEmail('');
      onClose();
    } catch (caught) {
      setError(describeApiError(toApiError(caught)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={template !== null} onClose={onClose} title="Send a test notification">
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-muted">
          The template is rendered with sample data and sent to the devices of one customer account, marked “[Test]”. Use your own account.
        </p>
        <TextField label="Customer account email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={error || undefined} />
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>Send test</Button>
        </div>
      </form>
    </Modal>
  );
}
