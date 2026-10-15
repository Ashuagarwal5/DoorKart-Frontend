import type { Metadata } from 'next';

import { TemplatesPage } from '@/features/notifications/templates-page';

export const metadata: Metadata = { title: 'Notification templates' };

export default function Page() {
  return <TemplatesPage />;
}
