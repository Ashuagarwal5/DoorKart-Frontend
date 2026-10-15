'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { TextField, SelectField } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { QueryView } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchReconciliation, fetchReturns, type ReturnCase } from '@/services/api/returns-api';
import { formatCurrency } from '@/utils/money';
import { formatDateTime } from '@/utils/date';
import { RETURN_KIND_LABEL } from './return-labels';

export function ReturnsPage() {
  const [filters,setFilters] = useState({ search:'',status:'',kind:'',page:1 });
  const [period,setPeriod] = useState({ from:'',to:'' });
  const query = useApiQuery(JSON.stringify(filters), () => fetchReturns({ ...filters,limit:20 }));
  const cash = useApiQuery(`cash:${period.from}:${period.to}`, () => fetchReconciliation(period.from,period.to));
  const filter = (key: 'search'|'status'|'kind', value: string) => setFilters(old => ({ ...old,[key]:value,page:1 }));
  const columns: Column<ReturnCase>[] = [
    { key:'order',header:'Order',cell:r=><Link href={`/orders/${r.orderId}`} className="text-primary underline">{r.order.orderNumber}<span className="block text-muted">{r.order.customerName}</span></Link> },
    { key:'kind',header:'Type / status',cell:r=><>{RETURN_KIND_LABEL[r.kind]}<strong className="block">{r.status}</strong></> },
    { key:'reason',header:'Reason',cell:r=><p className="max-w-xs break-words">{r.reason}</p> },
    { key:'amount',header:'Requested / approved',cell:r=><>{formatCurrency(r.requestedAmountPaise)}<span className="block text-muted">{r.approvedAmountPaise === null ? 'Awaiting review' : formatCurrency(r.approvedAmountPaise)}</span></> },
    { key:'receipt',header:'Cash payout',cell:r=>r.payoutReference ? <>{r.payoutReference}<span className="block">{r.completedAt && formatDateTime(r.completedAt)}</span></> : 'No payout recorded' },
    { key:'created',header:'Requested',cell:r=>formatDateTime(r.createdAt) },
    { key:'actions',header:'Actions',align:'right',cell:r=><Link href={`/orders/${r.orderId}`}>Manage request</Link> },
  ];
  return <>
    <PageHeader title="Returns & refunds" description="Record requests and cash payouts from the order detail page. Delivery and collection history are retained." />
    <Card title="Cash reconciliation">
      <div className="mb-4 grid gap-3 sm:grid-cols-2"><TextField label="From (IST, collection / payout date)" type="date" value={period.from} onChange={e=>setPeriod({ ...period,from:e.target.value })} /><TextField label="To (IST, inclusive)" type="date" value={period.to} onChange={e=>setPeriod({ ...period,to:e.target.value })} /></div>
      <QueryView query={cash}>{data=><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{([
        ['Cash collected in period',data.collectedPaise],['Cash refunded in period',data.refundedPaise],['Net cash movement in period',data.netCashMovementPaise],['Approved awaiting payout (all dates)',data.approvedAwaitingPaise],
      ] as const).map(([label,amount])=><div key={label}><p className="text-sm text-muted">{label}</p><p className="text-xl font-semibold">{formatCurrency(amount)}</p></div>)}</div>}</QueryView>
      <p className="mt-3 text-xs text-muted">Blank dates mean all time. A payout may relate to an earlier sale, so net cash movement can be negative. These figures are cash movement, not profit.</p>
    </Card>
    <div className="my-5 grid gap-3 sm:grid-cols-3"><TextField label="Search order, customer, reason or receipt" value={filters.search} maxLength={100} onChange={e=>filter('search',e.target.value)} /><SelectField label="Case status" value={filters.status} onChange={e=>filter('status',e.target.value)}><option value="">All statuses</option>{['REQUESTED','APPROVED','REJECTED','COMPLETED'].map(s=><option key={s}>{s}</option>)}</SelectField><SelectField label="Case type" value={filters.kind} onChange={e=>filter('kind',e.target.value)}><option value="">All types</option>{Object.entries(RETURN_KIND_LABEL).map(([key,label])=><option key={key} value={key}>{label}</option>)}</SelectField></div>
    <QueryView query={query}>{data=><>{data.items.length ? <DataTable caption="Return and refund cases" columns={columns} rows={data.items} getKey={r=>r.id} /> : <p className="rounded-lg border border-line p-6 text-muted">No matching cases. Open a delivered order to record a request.</p>}<Pagination pagination={data.pagination} onPageChange={page=>setFilters({ ...filters,page })} /></>}</QueryView>
  </>;
}
