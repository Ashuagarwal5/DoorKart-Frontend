import type { Metadata } from 'next';

import { DeliveryAreasPage } from '@/features/delivery-areas/delivery-areas-page';

export const metadata: Metadata = { title: 'Delivery areas' };

export default function Page() {
  return <DeliveryAreasPage />;
}
