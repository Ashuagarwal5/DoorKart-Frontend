'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/use-api-query';
import { useUrlParams } from '@/hooks/use-url-params';
import { fetchCustomers } from '@/services/api/admin-api';
import type { Customer, CustomerListFilters } from '@/types/api';
import { formatDate, formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/money';

const PAGE_SIZE = 25;

const COLUMNS: Column<Customer>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (customer) => (
      <Link href={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
        {customer.name}
      </Link>
    ),
  },
  { key: 'mobile', header: 'Mobile', cell: (customer) => customer.mobile },
  { key: 'orders', header: 'Orders', align: 'right', cell: (customer) => customer.orderCount },
  { key: 'value', header: 'Total purchases', align: 'right', cell: (customer) => formatCurrency(customer.totalOrderValuePaise) },
  { key: 'last', header: 'Last order', cell: (customer) => formatDateTime(customer.lastOrderAt) },
  { key: 'joined', header: 'Joined', cell: (customer) => formatDate(customer.createdAt) },
];

export function CustomersPage() {
  const url = useUrlParams();
  const [searchResetKey, setSearchResetKey] = useState(0);

  const filters: CustomerListFilters = {
    page: url.page,
    limit: PAGE_SIZE,
    search: url.get('search') || undefined,
  };
  const query = useApiQuery(`customers:${JSON.stringify(filters)}`, (signal) => fetchCustomers(filters, signal));
  const hasSearch = Boolean(filters.search);

  return (
    <>
      <PageHeader title="Customers" description="People who have ordered from the shop." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          key={searchResetKey}
          label="Search customers"
          placeholder="Name or mobile number"
          defaultValue={filters.search ?? ''}
          onSearch={(search) => url.set({ search }, { replace: true })}
        />
        {hasSearch ? (
          <Button
            onClick={() => {
              setSearchResetKey((key) => key + 1);
              url.set({ search: '' });
            }}>
            Clear search
          </Button>
        ) : null}
      </div>

      <QueryView
        query={query}
        empty={(data) =>
          data.items.length === 0 ? (
            <EmptyState
              title={hasSearch ? 'No customers match' : 'No customers yet'}
              message={hasSearch ? 'Try a different name or number.' : 'Customers appear here after their first order.'}
            />
          ) : null
        }>
        {(data) => (
          <>
            <DataTable caption="Customers" columns={COLUMNS} rows={data.items} getKey={(customer) => customer.id} />
            <Pagination pagination={data.pagination} onPageChange={(page) => url.set({ page })} />
          </>
        )}
      </QueryView>
    </>
  );
}
