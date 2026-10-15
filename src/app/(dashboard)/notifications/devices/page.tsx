import type { Metadata } from 'next';

import { DevicesPage } from '@/features/notifications/devices-page';

export const metadata: Metadata = { title: 'Notification devices' };

export default function Page() {
  return <DevicesPage />;
}
