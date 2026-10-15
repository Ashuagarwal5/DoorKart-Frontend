import type { Metadata } from 'next';

import { EditTemplatePage } from '@/features/notifications/template-pages';

export const metadata: Metadata = { title: 'Edit template' };

export default function Page() {
  return <EditTemplatePage />;
}
