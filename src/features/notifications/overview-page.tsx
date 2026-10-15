'use client';

import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryView } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchNotificationOverview, fetchProviderConfig } from '@/services/api/notifications-api';
import { useAdmin } from '@/features/auth/auth-context';
import { formatDateTime } from '@/utils/date';
import { NotificationsNav } from './notifications-nav';
import { STATUS_HINT } from './labels';

export function NotificationsOverviewPage() {
  const query = useApiQuery('notification-overview', fetchNotificationOverview);
  return (
    <>
      <PageHeader title="Notifications" description="Push notifications and the customer inbox for order, payment, return, account and review events." />
      <NotificationsNav />
      <QueryView query={query}>
        {(data) => (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Sent to FCM (7 days)" value={String(data.last7Days.SENT)} hint="Accepted by Firebase" />
              <MetricCard label="Failed (7 days)" value={String(data.last7Days.FAILED)} href="/notifications/history" tone={data.last7Days.FAILED > 0 ? 'warning' : 'neutral'} />
              <MetricCard label="Skipped (7 days)" value={String(data.last7Days.SKIPPED)} hint="No device or push off" />
              <MetricCard label="Waiting" value={String(data.last7Days.PENDING + data.last7Days.PROCESSING + data.queuedEvents)} hint="Queued or retrying" />
              <MetricCard label="Active devices" value={String(data.activeDevices)} href="/notifications/devices" />
              <MetricCard label="Templates" value={`${data.enabledTemplates} of ${data.templates} enabled`} href="/notifications/templates" />
            </div>
            <p className="text-sm text-muted">{STATUS_HINT}</p>
            <ConnectionCard />
          </div>
        )}
      </QueryView>
    </>
  );
}

function ConnectionCard() {
  const admin = useAdmin();
  if (admin.role !== 'SUPER_ADMIN') {
    return (
      <Card title="Firebase connection">
        <p className="text-sm text-muted">Only a super admin can view or change the Firebase connection.</p>
      </Card>
    );
  }
  return <SuperAdminConnection />;
}

function SuperAdminConnection() {
  const query = useApiQuery('notification-provider', fetchProviderConfig);
  return (
    <Card title="Firebase connection" action={<Link className="text-sm text-primary underline" href="/notifications/firebase">Manage</Link>}>
      <QueryView query={query}>
        {(config) => (
          <div className="space-y-1 text-sm">
            <p>
              {!config.configured
                ? 'Not configured. Add Firebase credentials to start sending push notifications.'
                : config.isEnabled
                  ? `Connected to project ${config.projectId}. Push notifications are on.`
                  : `Credentials saved for ${config.projectId}, but push notifications are off.`}
            </p>
            {config.lastTestAt ? (
              <p className="text-muted">
                Last test {formatDateTime(config.lastTestAt)}: {config.lastTestOk ? 'passed' : 'failed'}
              </p>
            ) : null}
            {config.lastFailureAt ? (
              <p className="text-warning">Last send failure {formatDateTime(config.lastFailureAt)}</p>
            ) : null}
          </div>
        )}
      </QueryView>
    </Card>
  );
}
