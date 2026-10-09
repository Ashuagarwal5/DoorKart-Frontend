'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField, TextField } from '@/components/ui/field';
import { EmptyState, QueryView } from '@/components/ui/states';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/status-badge';
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@/constants/status';
import { useApiQuery } from '@/hooks/use-api-query';
import { useUrlParams } from '@/hooks/use-url-params';
import { fetchOrders } from '@/services/api/admin-api';
import {
  ORDER_STATUSES,
  type OrderListFilters,
  type OrderListItem,
  type OrderStatus,
  PAYMENT_STATUSES,
  type PaymentStatus,
} from '@/types/api';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/money';

const PAGE_SIZE = 25;
/** The two payment states an admin filters by. REFUNDED cannot happen yet. */
const PAYMENT_FILTERS: PaymentStatus[] = PAYMENT_STATUSES.filter((status) => status !== 'REFUNDED');
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const COLUMNS: Column<OrderListItem>[] = [
  {
    key: 'order',
    header: 'Order number',
    cell: (order) => (
      <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
        {order.orderNumber}
      </Link>
    ),
  },
  { key: 'customer', header: 'Customer', cell: (order) => order.customerName },
  { key: 'phone', header: 'Phone', cell: (order) => order.customerPhone },
  { key: 'items', header: 'Items', align: 'right', cell: (order) => order.itemCount },
  { key: 'total', header: 'Grand total', align: 'right', cell: (order) => formatCurrency(order.grandTotalPaise) },
  { key: 'status', header: 'Status', cell: (order) => <OrderStatusBadge status={order.orderStatus} /> },
  { key: 'payment', header: 'Payment', cell: (order) => <PaymentStatusBadge status={order.paymentStatus} /> },
  { key: 'created', header: 'Created', cell: (order) => formatDateTime(order.createdAt) },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    hideOnCard: true,
    cell: (order) => (
      <Link href={`/orders/${order.id}`} className="text-sm text-primary hover:underline">
        View
      </Link>
    ),
  },
];

/** A value from the URL, kept only if it is one of the allowed ones. */
function oneOf<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

export function OrdersPage() {
  const url = useUrlParams();
  // Bumped by "Clear filters" to empty the search box; typing must never remount it.
  const [searchResetKey, setSearchResetKey] = useState(0);

  const filters: OrderListFilters = {
    page: url.page,
    limit: PAGE_SIZE,
    status: oneOf<OrderStatus>(url.get('status'), ORDER_STATUSES),
    paymentStatus: oneOf<PaymentStatus>(url.get('paymentStatus'), PAYMENT_FILTERS),
    search: url.get('search') || undefined,
    from: DAY_PATTERN.test(url.get('from')) ? url.get('from') : undefined,
    to: DAY_PATTERN.test(url.get('to')) ? url.get('to') : undefined,
  };
  const query = useApiQuery(`orders:${JSON.stringify(filters)}`, () => fetchOrders(filters));
  const hasFilters = Boolean(filters.status || filters.paymentStatus || filters.search || filters.from || filters.to);

  return (
    <>
      <PageHeader title="Orders" description="Every order placed in the app." />

      <div role="group" aria-label="Filter by order status" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[undefined, ...ORDER_STATUSES].map((status) => {
          const isSelected = filters.status === status;
          return (
            <button
              key={status ?? 'all'}
              type="button"
              aria-pressed={isSelected}
              onClick={() => url.set({ status: status ?? '' })}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-line bg-surface text-muted hover:border-primary hover:text-fg'
              )}>
              {status ? ORDER_STATUS_LABEL[status] : 'All orders'}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput
          key={searchResetKey}
          label="Search orders"
          placeholder="Order number, name or phone"
          defaultValue={filters.search ?? ''}
          onSearch={(search) => url.set({ search }, { replace: true })}
        />
        <SelectField
          label="Payment"
          fieldClassName="w-36"
          value={filters.paymentStatus ?? ''}
          onChange={(event) => url.set({ paymentStatus: event.target.value })}>
          <option value="">All</option>
          {PAYMENT_FILTERS.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_STATUS_LABEL[status]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="From"
          type="date"
          fieldClassName="w-40"
          value={filters.from ?? ''}
          max={filters.to}
          onChange={(event) => url.set({ from: event.target.value })}
        />
        <TextField
          label="To"
          type="date"
          fieldClassName="w-40"
          value={filters.to ?? ''}
          min={filters.from}
          onChange={(event) => url.set({ to: event.target.value })}
        />
        {hasFilters ? (
          <Button
            onClick={() => {
              setSearchResetKey((key) => key + 1);
              url.set({ status: '', paymentStatus: '', search: '', from: '', to: '' });
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
              title={hasFilters ? 'No orders match these filters' : 'No orders yet'}
              message={hasFilters ? 'Try a different search or clear the filters.' : 'Orders placed in the app will appear here.'}
            />
          ) : null
        }>
        {(data) => (
          <>
            <DataTable caption="Orders" columns={COLUMNS} rows={data.items} getKey={(order) => order.id} />
            <Pagination pagination={data.pagination} onPageChange={(page) => url.set({ page })} />
          </>
        )}
      </QueryView>
    </>
  );
}
