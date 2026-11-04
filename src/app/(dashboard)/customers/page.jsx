import { Suspense } from 'react';

import { TableSkeleton } from '@/components/ui/states';
import { CustomersPage } from '@/features/customers/customers-page';

export const metadata = { title: 'Customers' };

export default function Page() {
  // The page reads its filters from the URL, which Next requires to sit inside Suspense.
  return (
    <Suspense fallback={<TableSkeleton />}>
      <CustomersPage />
    </Suspense>
  );
}
