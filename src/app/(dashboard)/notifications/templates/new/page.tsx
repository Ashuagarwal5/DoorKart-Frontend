import type { Metadata } from 'next';

import { NewTemplatePage } from '@/features/notifications/template-pages';

export const metadata: Metadata = { title: 'New template' };

export default function Page() {
  return <NewTemplatePage />;
}
