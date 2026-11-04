'use client';

import { useParams } from 'next/navigation';

import { QueryView, TableSkeleton } from '@/components/ui/states';
import { PackManager } from './pack-manager';
import { ProductForm } from '@/features/products/product-form';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchCategories, fetchProduct } from '@/services/api/admin-api';

export function NewProductPage() {
  const categories = useApiQuery('categories', fetchCategories);

  return (
    <QueryView query={categories}>{(list) => <ProductForm mode="create" categories={list} />}</QueryView>
  );
}

export function EditProductPage() {
  const { id } = useParams();
  const product = useApiQuery(`product:${id}`, () => fetchProduct(id));
  const categories = useApiQuery('categories', fetchCategories);

  return (
    <>
      <QueryView query={product} skeleton={<TableSkeleton rows={8} />}>
        {(loadedProduct) => (
          <QueryView query={categories} skeleton={<TableSkeleton rows={8} />}>
            {(list) => (
              // Keyed by the product's last change, so the form restarts from fresh data.
              <div className="space-y-6"><ProductForm key={loadedProduct.updatedAt} mode="edit" product={loadedProduct} categories={list} /><div id="quantity-packs" className="scroll-mt-24"><PackManager product={loadedProduct} onSaved={product.reload}/></div></div>
            )}
          </QueryView>
        )}
      </QueryView>
    </>
  );
}
