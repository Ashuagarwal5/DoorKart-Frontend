'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { CardsSkeleton, EmptyState, QueryView, TableSkeleton } from '@/components/ui/states';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/status-badge';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchDashboard } from '@/services/api/admin-api';
import type { DashboardData, OrderListItem } from '@/types/api';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/money';

const AUTO_REFRESH_MS = 60_000;

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
  const reload = query.reload;

  // New orders arrive while this page is open, so it refreshes itself once a minute (only
  // while the tab is visible). The numbers stay on screen during a refresh.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        reload();
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How the shop is doing today (India time). Updates every minute."
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

type AttentionTone = 'accent' | 'warning' | 'primary';
type AttentionItem = { key: string; count: number; label: string; hint: string; href: string; tone: AttentionTone };

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** What needs doing right now, in the order a shop day goes. Items with nothing to do are left out. */
function attentionItems(data: DashboardData): AttentionItem[] {
  const placed = data.ordersByStatus.PLACED;
  const toPack = data.ordersByStatus.CONFIRMED;
  const toSend = data.ordersByStatus.PACKED;
  const out = data.outForDeliveryOrders;
  const unpaid = data.deliveredUnpaidOrders;
  const low = data.lowStockCount;

  const items: AttentionItem[] = [
    {
      key: 'new',
      count: placed,
      label: plural(placed, 'new order to confirm', 'new orders to confirm'),
      hint: 'Customers are waiting for a reply',
      href: '/orders?status=PLACED',
      tone: 'accent',
    },
    {
      key: 'pack',
      count: toPack,
      label: plural(toPack, 'order to pack', 'orders to pack'),
      hint: 'Confirmed, not packed yet',
      href: '/orders?status=CONFIRMED',
      tone: 'primary',
    },
    {
      key: 'send',
      count: toSend,
      label: plural(toSend, 'order ready to send', 'orders ready to send'),
      hint: 'Packed, waiting for delivery',
      href: '/orders?status=PACKED',
      tone: 'primary',
    },
    {
      key: 'out',
      count: out,
      label: plural(out, 'order out for delivery', 'orders out for delivery'),
      hint: 'Mark delivered and collect the cash',
      href: '/orders?status=OUT_FOR_DELIVERY',
      tone: 'primary',
    },
    {
      key: 'cash',
      count: unpaid,
      label: plural(unpaid, 'delivered order unpaid', 'delivered orders unpaid'),
      hint: `${formatCurrency(data.cashPendingPaise)} still to collect`,
      href: '/orders?status=DELIVERED&paymentStatus=PENDING',
      tone: 'warning',
    },
    {
      key: 'stock',
      count: low,
      label: plural(low, 'product low on stock', 'products low on stock'),
      hint: 'Restock before it sells out',
      href: '/inventory?lowStock=true',
      tone: 'warning',
    },
  ];
  return items.filter((item) => item.count > 0);
}

const ATTENTION_TONE: Record<AttentionTone, string> = {
  accent: 'border-accent/40 bg-accent/5',
  warning: 'border-warning/40 bg-warning-soft',
  primary: 'border-line bg-surface',
};

function AttentionPanel({ data }: { data: DashboardData }) {
  const items = attentionItems(data);

  return (
    <section aria-labelledby="attention-heading">
      <h2 id="attention-heading" className="mb-3 text-sm font-semibold text-fg">
        Needs your attention
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-5 text-sm text-muted">
          You are all caught up. New orders will appear here.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-4 rounded-xl border p-4 transition-shadow hover:shadow-md',
                  ATTENTION_TONE[item.tone]
                )}>
                <span className="text-3xl font-bold leading-none text-fg">{item.count}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{item.label}</span>
                  <span className="block truncate text-xs text-muted">{item.hint}</span>
                </span>
                <span aria-hidden="true" className="ml-auto text-muted">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-8">
      <AttentionPanel data={data} />

      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-sm font-semibold text-fg">
          Today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Orders placed" value={String(data.todayOrders)} hint="Placed today" href="/orders" />
          <MetricCard
            label="Delivered"
            value={String(data.deliveredToday)}
            hint="Delivered today"
            href="/orders?status=DELIVERED"
          />
          <MetricCard
            label="Revenue"
            value={formatCurrency(data.todayRevenuePaise)}
            hint="Orders delivered today, paid or not"
          />
          <MetricCard
            label="Cash collected"
            value={formatCurrency(data.cashCollectedTodayPaise)}
            hint="Payments marked collected today"
          />
        </div>
      </section>

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
