import type { Metadata } from 'next';

import { OrderDetailPage } from '@/features/orders/order-detail-page';

export const metadata: Metadata = { title: 'Order' };

export default function Page() {
  return <OrderDetailPage />;
}
