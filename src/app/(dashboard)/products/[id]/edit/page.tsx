import type { Metadata } from 'next';

import { EditProductPage } from '@/features/products/product-form-pages';

export const metadata: Metadata = { title: 'Edit product' };

export default function Page() {
  return <EditProductPage />;
}
