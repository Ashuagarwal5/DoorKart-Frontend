'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { CheckboxField } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState, QueryView } from '@/components/ui/states';
import { AdjustStockDialog } from '@/features/inventory/adjust-stock-dialog';
import { useApiQuery } from '@/hooks/use-api-query';
import { useUrlParams } from '@/hooks/use-url-params';
import { fetchProducts } from '@/services/api/admin-api';
import type { Product, ProductListFilters } from '@/types/api';

const PAGE_SIZE = 25;

export function InventoryPage() {
  const url = useUrlParams();
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [adjusting, setAdjusting] = useState<Product | null>(null);

  const lowStockOnly = url.get('lowStock') === 'true';
  const filters: ProductListFilters = {
    page: url.page,
    limit: PAGE_SIZE,
    search: url.get('search') || undefined,
    lowStock: lowStockOnly ? true : undefined,
  };
  const query = useApiQuery(`inventory:${JSON.stringify(filters)}`, () => fetchProducts(filters));
  const hasFilters = Boolean(filters.search || lowStockOnly);

  const columns: Column<Product>[] = [
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
    { key: 'stock', header: 'Stock', align: 'right', cell: (product) => product.stockQuantity },
    { key: 'reserved', header: 'Reserved', align: 'right', cell: (product) => product.reservedQuantity },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      cell: (product) => <span className="font-semibold">{product.availableQuantity}</span>,
    },
    { key: 'threshold', header: 'Low stock at', align: 'right', cell: (product) => product.lowStockThreshold },
    {
      key: 'status',
      header: 'Status',
      cell: (product) => (
        <div className="flex flex-wrap gap-1">
          {product.isLowStock ? <Badge tone="warning">Low stock</Badge> : <Badge tone="success">In stock</Badge>}
          {product.isActive ? null : <Badge>Inactive</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (product) => (
        <Button size="sm" onClick={() => setAdjusting(product)}>
          Adjust stock
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock on hand, what open orders have reserved, and what is available to sell."
      />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SearchInput
          key={searchResetKey}
          label="Search inventory"
          placeholder="Name or SKU"
          defaultValue={filters.search ?? ''}
          onSearch={(search) => url.set({ search }, { replace: true })}
        />
        <div className="pb-2">
          <CheckboxField
            label="Low stock only"
            checked={lowStockOnly}
            onChange={(event) => url.set({ lowStock: event.target.checked ? 'true' : '' })}
          />
        </div>
        {hasFilters ? (
          <Button
            onClick={() => {
              setSearchResetKey((key) => key + 1);
              url.set({ search: '', lowStock: '' });
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
              title={lowStockOnly ? 'No products are running low' : hasFilters ? 'No products match' : 'No products yet'}
              message={
                lowStockOnly
                  ? 'Every product has more available units than its low stock threshold.'
                  : 'Try a different search or clear the filters.'
              }
            />
          ) : null
        }>
        {(data) => (
          <>
            <DataTable
              caption="Inventory"
              columns={columns}
              rows={data.items}
              getKey={(product) => product.id}
              rowClassName={(product) => (product.isLowStock ? 'bg-warning-soft/40' : undefined)}
            />
            <Pagination pagination={data.pagination} onPageChange={(page) => url.set({ page })} />
          </>
        )}
      </QueryView>

      <AdjustStockDialog product={adjusting} onClose={() => setAdjusting(null)} onAdjusted={query.reload} />
    </>
  );
}
