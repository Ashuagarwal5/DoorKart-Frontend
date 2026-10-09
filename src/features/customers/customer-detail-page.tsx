'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Card, DetailRow } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, QueryView, TableSkeleton } from '@/components/ui/states';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/status-badge';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchCustomer } from '@/services/api/admin-api';
import type { CustomerDetail } from '@/types/api';
import { formatDate, formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/money';

type RecentOrder = CustomerDetail['recentOrders'][number];

const ORDER_COLUMNS: Column<RecentOrder>[] = [
  {
    key: 'order',
    header: 'Order',
    cell: (order) => (
      <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
        {order.orderNumber}
      </Link>
    ),
  },
  { key: 'placed', header: 'Placed', cell: (order) => formatDateTime(order.createdAt) },
  { key: 'total', header: 'Total', align: 'right', cell: (order) => formatCurrency(order.grandTotalPaise) },
  { key: 'status', header: 'Status', cell: (order) => <OrderStatusBadge status={order.orderStatus} /> },
  { key: 'payment', header: 'Payment', cell: (order) => <PaymentStatusBadge status={order.paymentStatus} /> },
];

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useApiQuery(`customer:${id}`, () => fetchCustomer(id));

  return (
    <QueryView
      query={query}
      skeleton={
        <>
          <PageHeader title="Customer" backHref="/customers" backLabel="All customers" />
          <TableSkeleton rows={6} />
        </>
      }>
      {(customer) => (
        <>
          <PageHeader title={customer.name} description={customer.mobile} backHref="/customers" backLabel="All customers" />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Details">
              <dl className="space-y-3">
                <DetailRow label="Name">{customer.name}</DetailRow>
                <DetailRow label="Mobile">{customer.mobile}</DetailRow>
                <DetailRow label="Joined">{formatDate(customer.createdAt)}</DetailRow>
                <DetailRow label="Orders">{customer.orderCount}</DetailRow>
                <DetailRow label="Total purchases">{formatCurrency(customer.totalOrderValuePaise)}</DetailRow>
                <DetailRow label="Last order">{formatDateTime(customer.lastOrderAt)}</DetailRow>
              </dl>
              <p className="mt-4 text-xs text-muted">
                The order count includes cancelled orders; total purchases does not.
              </p>
            </Card>

            <Card title="Recent orders" className="lg:col-span-2">
              {customer.recentOrders.length === 0 ? (
                <EmptyState title="No orders yet" />
              ) : (
                <DataTable
                  caption="Recent orders"
                  columns={ORDER_COLUMNS}
                  rows={customer.recentOrders}
                  getKey={(order) => order.id}
                />
              )}
            </Card>
          </div>
        </>
      )}
    </QueryView>
  );
}
