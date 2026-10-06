import type { Metadata } from 'next';

import { NewProductPage } from '@/features/products/product-form-pages';

export const metadata: Metadata = { title: 'Add product' };

export default function Page() {
  return <NewProductPage />;
}
