import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TableSkeleton } from '@/components/ui/states';
import { OrdersPage } from '@/features/orders/orders-page';

export const metadata: Metadata = { title: 'Orders' };

export default function Page() {
  // The page reads its filters from the URL, which Next requires to sit inside Suspense.
  return (
    <Suspense fallback={<TableSkeleton />}>
      <OrdersPage />
    </Suspense>
  );
}
