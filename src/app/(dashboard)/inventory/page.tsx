import type { Metadata } from 'next';
import { Suspense } from 'react';

import { TableSkeleton } from '@/components/ui/states';
import { InventoryPage } from '@/features/inventory/inventory-page';

export const metadata: Metadata = { title: 'Inventory' };

export default function Page() {
  // The page reads its filters from the URL, which Next requires to sit inside Suspense.
  return (
    <Suspense fallback={<TableSkeleton />}>
      <InventoryPage />
    </Suspense>
  );
}
