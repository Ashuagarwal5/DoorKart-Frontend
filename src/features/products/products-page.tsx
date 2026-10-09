'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { SelectField } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState, QueryView } from '@/components/ui/states';
import { ActiveBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { ProductThumb } from '@/components/products/product-thumb';
import { useApiQuery } from '@/hooks/use-api-query';
import { useUrlParams } from '@/hooks/use-url-params';
import { fetchCategories, fetchProducts, updateProduct } from '@/services/api/admin-api';
import { describeApiError, toApiError } from '@/services/api/api-error';
import type { Product, ProductListFilters } from '@/types/api';
import { formatCurrency } from '@/utils/money';

const PAGE_SIZE = 25;

export function ProductsPage() {
  const url = useUrlParams();
  const toast = useToast();
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [deactivating, setDeactivating] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const status = url.get('status');
  const filters: ProductListFilters = {
    page: url.page,
    limit: PAGE_SIZE,
    search: url.get('search') || undefined,
    categoryId: url.get('categoryId') || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
  };
  const query = useApiQuery(`products:${JSON.stringify(filters)}`, () => fetchProducts(filters));
  const categories = useApiQuery('categories', fetchCategories);
  const hasFilters = Boolean(filters.search || filters.categoryId || status);

  const setActive = async (product: Product, isActive: boolean) => {
    await updateProduct(product.id, { isActive });
    toast.success(isActive ? `${product.name} is active again.` : `${product.name} is now inactive.`);
    query.reload();
  };

  const activate = async (product: Product) => {
    setBusyId(product.id);
    try {
      await setActive(product, true);
    } catch (error) {
      toast.error(describeApiError(toApiError(error)));
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'image',
      header: 'Image',
      cell: (product) => <ProductThumb url={product.images.find((media) => media.mediaType === 'IMAGE')?.url} alt={product.name} />,
    },
    {
      key: 'name',
      header: 'Product',
      cell: (product) => (
        <Link href={`/products/${product.id}/edit`} className="font-medium text-primary hover:underline">
          {product.name}
        </Link>
      ),
    },
    { key: 'sku', header: 'SKU', cell: (product) => product.sku },
    { key: 'category', header: 'Category', cell: (product) => product.category.name },
    { key: 'price', header: 'Selling price', align: 'right', cell: (product) => formatCurrency(product.sellingPricePaise) },
    { key: 'mrp', header: 'MRP', align: 'right', cell: (product) => formatCurrency(product.mrpPaise) },
    { key: 'stock', header: 'Stock', align: 'right', cell: (product) => product.stockQuantity },
    { key: 'reserved', header: 'Reserved', align: 'right', cell: (product) => product.reservedQuantity },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      cell: (product) => (
        <span className={product.isLowStock ? 'font-semibold text-warning' : undefined}>{product.availableQuantity}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (product) => (
        <div className="flex flex-wrap gap-1">
          <ActiveBadge isActive={product.isActive} />
          {product.isLowStock ? <Badge tone="warning">Low stock</Badge> : null}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (product) => (
        <div className="flex justify-end gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="inline-flex min-h-8 items-center rounded-lg border border-line px-3 text-xs font-medium hover:bg-bg">
            Edit
          </Link>
          {product.isActive ? (
            <Button size="sm" onClick={() => setDeactivating(product)}>
              Deactivate
            </Button>
          ) : (
            <Button size="sm" loading={busyId === product.id} onClick={() => activate(product)}>
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything the shop sells. Inactive products are hidden from customers."
        actions={
          <Link
            href="/products/new"
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover">
            Add product
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput
          key={searchResetKey}
          label="Search products"
          placeholder="Name or SKU"
          defaultValue={filters.search ?? ''}
          onSearch={(search) => url.set({ search }, { replace: true })}
        />
        <SelectField
          label="Category"
          fieldClassName="w-48"
          value={filters.categoryId ?? ''}
          onChange={(event) => url.set({ categoryId: event.target.value })}>
          <option value="">All categories</option>
          {categories.status === 'success'
            ? categories.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            : null}
        </SelectField>
        <SelectField
          label="Status"
          fieldClassName="w-36"
          value={status === 'active' || status === 'inactive' ? status : ''}
          onChange={(event) => url.set({ status: event.target.value })}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
        {hasFilters ? (
          <Button
            onClick={() => {
              setSearchResetKey((key) => key + 1);
              url.set({ search: '', categoryId: '', status: '' });
            }}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <QueryView
        query={query}
        empty={(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title={hasFilters ? 'No products match these filters' : 'No products yet'}
              message={hasFilters ? 'Try a different search or clear the filters.' : 'Add your first product to start selling.'}
              action={
                hasFilters ? undefined : (
                  <Link href="/products/new" className="text-sm text-primary hover:underline">
                    Add a product
                  </Link>
                )
              }
            />
          ) : null
        }>
        {(data) => (
          <>
            <DataTable caption="Products" columns={columns} rows={data.items} getKey={(product) => product.id} />
            <Pagination pagination={data.pagination} onPageChange={(page) => url.set({ page })} />
          </>
        )}
      </QueryView>

      <ConfirmDialog
        open={deactivating !== null}
        title="Deactivate this product?"
        confirmLabel="Deactivate"
        tone="danger"
        onClose={() => setDeactivating(null)}
        onConfirm={async () => {
          if (deactivating) {
            await setActive(deactivating, false);
          }
        }}>
        <p>
          <strong>{deactivating?.name}</strong> will be hidden from customers and cannot be ordered. Existing orders are
          not affected, and you can activate it again at any time.
        </p>
      </ConfirmDialog>
    </>
  );
}
