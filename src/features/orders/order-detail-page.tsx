'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Card, DetailRow } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { QueryView, TableSkeleton } from '@/components/ui/states';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/status-badge';
import { ORDER_STATUS_LABEL } from '@/constants/status';
import { CollectCashAction, OrderActions } from '@/features/orders/order-actions';
import { CustomerContact } from '@/features/orders/customer-contact';
import { OrderProgress } from '@/features/orders/order-progress';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchOrder } from '@/services/api/admin-api';
import type { OrderDetail } from '@/types/api';
import { formatDateTime } from '@/utils/date';
import { formatCurrency } from '@/utils/money';

type Item = OrderDetail['items'][number];

const ITEM_COLUMNS: Column<Item>[] = [
  {
    key: 'product',
    header: 'Product',
    cell: (item) => (
      <div>
        <p className="font-medium text-fg">{item.productName}</p>
        <p className="text-xs text-muted">{item.sku}</p>
      </div>
    ),
  },
  { key: 'price', header: 'Unit price', align: 'right', cell: (item) => formatCurrency(item.unitPricePaise) },
  { key: 'qty', header: 'Qty', align: 'right', cell: (item) => item.quantity },
  { key: 'total', header: 'Line total', align: 'right', cell: (item) => formatCurrency(item.lineTotalPaise) },
];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useApiQuery(`order:${id}`, () => fetchOrder(id));

  return (
    <QueryView
      query={query}
      skeleton={
        <>
          <PageHeader title="Order" backHref="/orders" backLabel="All orders" />
          <TableSkeleton rows={8} />
        </>
      }>
      {(order) => <OrderDetailContent order={order} reload={query.reload} />}
    </QueryView>
  );
}

function OrderDetailContent({ order, reload }: { order: OrderDetail; reload: () => void }) {
  const address = order.deliveryAddress;

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        backHref="/orders"
        backLabel="All orders"
        actions={
          <>
            <OrderStatusBadge status={order.orderStatus} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <Button size="sm" className="print:hidden" onClick={() => window.print()}>
              Print packing slip
            </Button>
          </>
        }
      />

      <div className="mb-6 rounded-xl border border-line bg-surface px-4 py-5 sm:px-6">
        <OrderProgress status={order.orderStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Update order" className="print:hidden">
            <OrderActions order={order} onChanged={reload} />
          </Card>

          <Card title="Items">
            <DataTable caption="Order items" columns={ITEM_COLUMNS} rows={order.items} getKey={(item) => item.productId} />
            <dl className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatCurrency(order.subtotalPaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery charge</dt>
                <dd>{order.deliveryChargePaise === 0 ? 'Free' : formatCurrency(order.deliveryChargePaise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Discount</dt>
                <dd>{order.discountPaise === 0 ? '—' : `-${formatCurrency(order.discountPaise)}`}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <dt>Grand total</dt>
                <dd>{formatCurrency(order.grandTotalPaise)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Status history" className="print:hidden">
            <ol className="space-y-4">
              {order.statusHistory.map((entry, index) => (
                <li key={`${entry.status}-${entry.createdAt}-${index}`} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-fg">{ORDER_STATUS_LABEL[entry.status]}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(entry.createdAt)} · {entry.changedBy ? entry.changedBy.name : 'Customer'}
                    </p>
                    {entry.note ? <p className="mt-1 text-fg">“{entry.note}”</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Payment">
            <dl className="space-y-3">
              <DetailRow label="Method">Cash on Delivery</DetailRow>
              <DetailRow label="Status">
                <PaymentStatusBadge status={order.paymentStatus} />
              </DetailRow>
              <DetailRow label="Amount">{formatCurrency(order.grandTotalPaise)}</DetailRow>
              {order.paymentCollectedAt ? (
                <DetailRow label="Collected">{formatDateTime(order.paymentCollectedAt)}</DetailRow>
              ) : null}
            </dl>

            {order.canCollectPayment ? (
              <div className="mt-4">
                <CollectCashAction order={order} onChanged={reload} />
              </div>
            ) : order.paymentStatus === 'PENDING' ? (
              <p className="mt-4 text-xs text-muted">
                Cash can be recorded once the order is out for delivery or delivered.
              </p>
            ) : null}

            {order.paymentHistory.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-line pt-3 text-xs text-muted">
                {order.paymentHistory.map((entry, index) => (
                  <li key={`${entry.createdAt}-${index}`}>
                    {formatDateTime(entry.createdAt)} · marked {entry.toStatus.toLowerCase()} by{' '}
                    {entry.changedBy?.name ?? 'an admin'}
                    {entry.note ? ` — “${entry.note}”` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card title="Customer">
            <dl className="space-y-3">
              <DetailRow label="Name">
                <Link href={`/customers/${order.customerId}`} className="text-primary hover:underline">
                  {order.customerName}
                </Link>
              </DetailRow>
              <DetailRow label="Phone">{order.customerPhone}</DetailRow>
            </dl>
            <CustomerContact order={order} />
          </Card>

          <Card title="Delivery address">
            <address className="space-y-0.5 text-sm not-italic text-fg">
              <p>{address.addressLine1}</p>
              {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
              {address.landmark ? <p className="text-muted">Landmark: {address.landmark}</p> : null}
              <p>
                {address.area}, {address.city} - {address.pincode}
              </p>
            </address>
          </Card>
        </div>
      </div>
    </>
  );
}
