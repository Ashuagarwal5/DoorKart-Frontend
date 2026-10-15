import type { Metadata } from 'next';

import { HistoryPage } from '@/features/notifications/history-page';

export const metadata: Metadata = { title: 'Notification history' };

export default function Page() {
  return <HistoryPage />;
}
