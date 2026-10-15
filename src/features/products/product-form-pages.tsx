'use client';

import { useParams } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { QueryView, TableSkeleton } from '@/components/ui/states';
import { PackManager } from './pack-manager';
import { ProductForm } from '@/features/products/product-form';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchCategories, fetchProduct } from '@/services/api/admin-api';

export function NewProductPage() {
  const categories = useApiQuery('categories', fetchCategories);

  return (
    <>
      <PageHeader title="Add product" description="Choose a product or combo, add its details, then set pricing and visibility." backHref="/products" backLabel="All products" />
      <QueryView query={categories}>{(list) => <ProductForm mode="create" categories={list} />}</QueryView>
    </>
  );
}

export function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = useApiQuery(`product:${id}`, () => fetchProduct(id));
  const categories = useApiQuery('categories', fetchCategories);

  return (
    <>
      <PageHeader title="Edit product" backHref="/products" backLabel="All products" />
      <QueryView query={product} skeleton={<TableSkeleton rows={8} />}>
        {(loadedProduct) => (
          <QueryView query={categories} skeleton={<TableSkeleton rows={8} />}>
            {(list) => (
              // Keyed by the product's last change, so the form restarts from fresh data.
              <div className="space-y-6"><ProductForm key={loadedProduct.updatedAt} mode="edit" product={loadedProduct} categories={list} /><PackManager product={loadedProduct} onSaved={product.reload}/></div>
            )}
          </QueryView>
        )}
      </QueryView>
    </>
  );
}
