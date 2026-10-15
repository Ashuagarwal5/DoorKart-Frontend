'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/use-api-query';
import { describeApiError, toApiError } from '@/services/api/api-error';
import { fetchNotificationEvents, setEventEnabled, type NotificationEvent } from '@/services/api/notifications-api';
import { NotificationsNav } from './notifications-nav';

export function EventsPage() {
  const query = useApiQuery('notification-events', fetchNotificationEvents);
  return (
    <>
      <PageHeader title="Event configuration" description="Business events that can notify a customer. Turning an event off stops all notifications for it." />
      <NotificationsNav />
      <QueryView query={query}>
        {(events) => {
          const groups = [...new Set(events.map((event) => event.group))];
          return (
            <div className="space-y-5">
              {groups.map((group) => (
                <Card key={group} title={group}>
                  <ul className="divide-y divide-line">
                    {events.filter((event) => event.group === group).map((event) => (
                      <EventRow key={event.key} event={event} onChanged={query.reload} />
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          );
        }}
      </QueryView>
    </>
  );
}

function EventRow({ event, onChanged }: { event: NotificationEvent; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const active = event.templates.find((template) => template.isEnabled);

  async function toggle() {
    setBusy(true);
    try {
      await setEventEnabled(event.key, !event.isEnabled);
      toast.success(event.isEnabled ? 'Event turned off.' : 'Event turned on.');
      onChanged();
    } catch (error) {
      toast.error(describeApiError(toApiError(error)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {event.name} <span className="ml-1 text-xs font-normal text-muted">{event.key}</span>
        </p>
        <p className="text-sm text-muted">{event.description}</p>
        <p className="text-xs text-muted">
          Variables: {event.variables.map((variable) => `{${variable}}`).join(' ')}
        </p>
        <p className="text-sm">
          {active ? (
            <>Template: <Link className="text-primary underline" href={`/notifications/templates/${active.id}`}>{active.name}</Link></>
          ) : event.templates.length > 0 ? (
            <span className="text-warning">{event.templates.length} template(s), none enabled</span>
          ) : (
            <span className="text-muted">No template: nothing is sent.</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Badge tone={event.isEnabled ? 'success' : 'neutral'}>{event.isEnabled ? 'On' : 'Off'}</Badge>
        <Button size="sm" loading={busy} onClick={toggle}>{event.isEnabled ? 'Turn off' : 'Turn on'}</Button>
      </div>
    </li>
  );
}
