import type { Metadata } from 'next';

import { EventsPage } from '@/features/notifications/events-page';

export const metadata: Metadata = { title: 'Notification events' };

export default function Page() {
  return <EventsPage />;
}
