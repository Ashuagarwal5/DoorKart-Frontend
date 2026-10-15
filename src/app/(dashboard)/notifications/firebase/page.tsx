import type { Metadata } from 'next';

import { FirebasePage } from '@/features/notifications/firebase-page';

export const metadata: Metadata = { title: 'Firebase settings' };

export default function Page() {
  return <FirebasePage />;
}
