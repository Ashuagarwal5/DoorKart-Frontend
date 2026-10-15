import type { Metadata } from 'next';

import { NotificationsOverviewPage } from '@/features/notifications/overview-page';

export const metadata: Metadata = { title: 'Notifications' };

export default function Page() {
  return <NotificationsOverviewPage />;
}
