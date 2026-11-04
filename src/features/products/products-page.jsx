'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dropdown } from '@/components/ui/dropdown';
import { Icon } from '@/components/ui/icons';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/use-api-query';
import { useUrlParams } from '@/hooks/use-url-params';
import { orderCategories } from '@/features/categories/category-tree';
import { ProductTable } from '@/features/products/product-table';
import { ProductViewDialog } from '@/features/products/product-view-dialog';
import { fetchCategories, fetchProducts, updateProduct } from '@/services/api/admin-api';
import { getErrorMessage } from '@/services/api/api-error';
import { cn } from '@/utils/cn';

const PAGE_SIZES = [10, 25, 50, 100].map((size) => ({ value: String(size), label: String(size) }));
const DEFAULT_PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'low', label: 'Low stock' },
];

export function ProductsPage() {
  const url = useUrlParams();
  const toast = useToast();
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [deactivating, setDeactivating] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [density, setDensity] = useState('comfortable');

  const rawStatus = url.get('status');
  const status = STATUS_OPTIONS.some((option) => option.value === rawStatus) ? rawStatus : '';
  const rawLimit = url.get('limit');
  const limit = PAGE_SIZES.some((size) => size.value === rawLimit) ? Number(rawLimit) : DEFAULT_PAGE_SIZE;
  const filters = {
    page: url.page,
    limit,
    search: url.get('search') || undefined,
    categoryId: url.get('categoryId') || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : status === 'low' ? true : undefined,
    lowStock: status === 'low' ? true : undefined,
  };
  const query = useApiQuery(`products:${JSON.stringify(filters)}`, () => fetchProducts(filters));
  const categories = useApiQuery('categories', fetchCategories);
  const hasFilters = Boolean(filters.search || filters.categoryId || status);

  const setActive = async (product, isActive) => {
    await updateProduct(product.id, { isActive });
    toast.success(isActive ? `${product.name} is active again.` : `${product.name} is now inactive.`);
    query.reload();
  };

  const activate = async (product) => {
    setBusyIds((current) => new Set(current).add(product.id));
    try {
      await setActive(product, true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(product.id);
        return next;
      });
    }
  };

  const categoryOptions = [
    { value: '', label: 'All categories' },
    ...(categories.status === 'success'
      ? orderCategories(categories.data).map(({ category, label }) => ({ value: category.id, label }))
      : []),
  ];

  return (
    <>
      {/* One card holds the heading, the filters, the table and the paging. */}
      <div className="rounded-xl border border-line bg-surface shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-fg sm:text-2xl">Products</h1>
            <p className="mt-1 text-sm text-muted">Everything the shop sells. Inactive products are hidden from customers.</p>
          </div>
          <Link
            href="/products/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-hover">
            <Icon name="plus" className="h-4 w-4" />Add product
          </Link>
        </header>

        <div className="flex flex-wrap items-end gap-3 border-y border-line px-5 py-3">
          <SearchInput
            key={searchResetKey}
            label="Search products"
            placeholder="Filter by name, brand or SKU…"
            defaultValue={filters.search ?? ''}
            onSearch={(search) => url.set({ search }, { replace: true })}
          />
          <Dropdown
            label="Category"
            className="w-52"
            value={filters.categoryId ?? ''}
            options={categoryOptions}
            onChange={(categoryId) => url.set({ categoryId })}
          />
          <Dropdown label="Status" className="w-40" value={status} options={STATUS_OPTIONS} onChange={(value) => url.set({ status: value })} />
          {hasFilters ? (
            <Button
              onClick={() => {
                setSearchResetKey((key) => key + 1);
                url.set({ search: '', categoryId: '', status: '' });
              }}>
              Clear filters
            </Button>
          ) : null}
          <div role="group" aria-label="Row density" className="ml-auto hidden rounded-lg border border-line bg-bg p-0.5 md:flex">
            {[['compact', 'Compact'], ['comfortable', 'Comfortable']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={density === value}
                onClick={() => setDensity(value)}
                className={cn('rounded-md px-3 py-1.5 text-xs font-semibold', density === value ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-fg')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* The loading, empty and result states sit inside this card, so they drop their own borders. */}
        <div className="[&>div]:rounded-none [&>div]:border-0">
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
                <ProductTable
                  rows={data.items}
                  density={density}
                  busyIds={busyIds}
                  onView={setViewing}
                  onActivate={activate}
                  onDeactivate={setDeactivating}
                />
                <div className="border-t border-line px-5 pb-4">
                  <Pagination
                    pagination={data.pagination}
                    onPageChange={(page) => url.set({ page })}
                    extra={
                      <span className="flex items-center gap-2 text-sm text-muted">
                        Rows per page
                        <Dropdown
                          label="Rows per page"
                          hideLabel
                          placement="top"
                          className="w-20"
                          value={String(limit)}
                          options={PAGE_SIZES}
                          onChange={(size) => url.set({ limit: size })}
                        />
                      </span>
                    }
                  />
                </div>
              </>
            )}
          </QueryView>
        </div>
      </div>

      <ProductViewDialog product={viewing} onClose={() => setViewing(null)} />

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
