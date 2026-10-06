'use client';

import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { CardsSkeleton, EmptyState, QueryView, TableSkeleton } from '@/components/ui/states';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/status-badge';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchDashboard } from '@/services/api/admin-api';
import type { DashboardData, OrderListItem } from '@/types/api';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/money';

const RECENT_COLUMNS: Column<OrderListItem>[] = [
  {
    key: 'order',
    header: 'Order',
    cell: (order) => (
      <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
        {order.orderNumber}
      </Link>
    ),
  },
  { key: 'customer', header: 'Customer', cell: (order) => order.customerName },
  { key: 'total', header: 'Total', align: 'right', cell: (order) => formatCurrency(order.grandTotalPaise) },
  { key: 'status', header: 'Status', cell: (order) => <OrderStatusBadge status={order.orderStatus} /> },
  { key: 'payment', header: 'Payment', cell: (order) => <PaymentStatusBadge status={order.paymentStatus} /> },
  { key: 'placed', header: 'Placed', cell: (order) => formatDateTime(order.createdAt) },
];

export function DashboardPage() {
  const query = useApiQuery('dashboard', fetchDashboard);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How the shop is doing today (India time)."
        actions={
          <Button onClick={query.reload} loading={query.isRefreshing}>
            Refresh
          </Button>
        }
      />
      <QueryView
        query={query}
        skeleton={
          <div className="space-y-6">
            <CardsSkeleton />
            <TableSkeleton rows={5} />
          </div>
        }>
        {(data) => <DashboardContent data={data} />}
      </QueryView>
    </>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today's orders" value={String(data.todayOrders)} hint="Placed today" href="/orders" />
        <MetricCard
          label="Pending orders"
          value={String(data.pendingOrders)}
          hint="Placed, confirmed or packed"
          href="/orders"
        />
        <MetricCard
          label="Out for delivery"
          value={String(data.outForDeliveryOrders)}
          href="/orders?status=OUT_FOR_DELIVERY"
        />
        <MetricCard label="Delivered today" value={String(data.deliveredToday)} />
        <MetricCard
          label="Today's revenue"
          value={formatCurrency(data.todayRevenuePaise)}
          hint="Orders delivered today, paid or not"
        />
        <MetricCard
          label="Cash collected today"
          value={formatCurrency(data.cashCollectedTodayPaise)}
          hint="Payments marked collected today"
        />
        <MetricCard
          label="Cash pending"
          value={formatCurrency(data.cashPendingPaise)}
          hint={`${data.deliveredUnpaidOrders} delivered ${data.deliveredUnpaidOrders === 1 ? 'order' : 'orders'} not yet paid`}
          href="/orders?status=DELIVERED&paymentStatus=PENDING"
          tone={data.deliveredUnpaidOrders > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Low stock products"
          value={String(data.lowStockCount)}
          hint="At or below their threshold"
          href="/inventory?lowStock=true"
          tone={data.lowStockCount > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          title="Recent orders"
          className="xl:col-span-2"
          action={
            <Link href="/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          }>
          {data.recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" message="Orders placed in the app will appear here." />
          ) : (
            <DataTable
              caption="Recent orders"
              columns={RECENT_COLUMNS}
              rows={data.recentOrders}
              getKey={(order) => order.id}
            />
          )}
        </Card>

        <Card
          title="Low stock"
          action={
            <Link href="/inventory?lowStock=true" className="text-sm text-primary hover:underline">
              View all
            </Link>
          }>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted">Every active product has enough stock.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.lowStockProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{product.name}</p>
                    <p className="text-xs text-muted">{product.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-warning">{product.availableQuantity} available</p>
                    <p className="text-xs text-muted">alert at {product.lowStockThreshold}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
