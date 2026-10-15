'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField, SelectField, TextArea, TextField } from '@/components/ui/field';
import { QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/use-api-query';
import { ApiError } from '@/services/api/api-error';
import { createReturn, fetchOrderReturns, returnAction, type CreateReturn, type OrderReturns, type ReturnAction, type ReturnCase, type ReturnKind } from '@/services/api/returns-api';
import { formatCurrency, paiseToRupeeInput, parseRupeesToPaise } from '@/utils/money';
import { formatDateTime } from '@/utils/date';
import { RETURN_KIND_LABEL } from './return-labels';
import { useReturnMutation } from './use-return-mutation';

export function OrderReturnsPanel({ orderId, orderUpdatedAt }: { orderId: string; orderUpdatedAt: string }) {
  const query = useApiQuery(`returns:${orderId}:${orderUpdatedAt}`, () => fetchOrderReturns(orderId));
  return <Card title="Returns & refunds" className="print:hidden"><QueryView query={query}>{(data) => <>
    <p className="mb-4 text-sm text-muted">Cash collection and delivery history stay unchanged. Refunds below are separate manual cash payouts.</p>
    <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">{([
      ['Cash collected', data.summary.collectedPaise], ['Refunds completed', data.summary.completedRefundPaise], ['Approved, awaiting payout', data.summary.approvedAwaitingPaise], ['Available to approve', data.summary.remainingRefundablePaise], ['Net cash retained', data.summary.netCashRetainedPaise],
    ] as const).map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="font-semibold">{formatCurrency(value)}</dd></div>)}</dl>
    <div className="space-y-4">{data.cases.map((row) => <ReturnCaseCard key={row.id} row={row} reload={query.reload} />)}</div>
    {data.order.orderStatus === 'DELIVERED' && !data.cases.some(r => r.status === 'REQUESTED' || r.status === 'APPROVED') ? <CreateReturnForm data={data} onSaved={query.reload} /> : <p className="mt-4 text-sm text-muted">{data.order.orderStatus === 'DELIVERED' ? 'Complete or reject the open case before adding another.' : 'Return/refund requests are available after delivery.'}</p>}
    <Button className="mt-4" loading={query.isRefreshing} onClick={query.reload}>Refresh cases</Button>
  </>}</QueryView></Card>;
}

function CreateReturnForm({ data, onSaved }: { data: OrderReturns; onSaved: () => void }) {
  const toast = useToast(); const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReturnKind>('RETURN_REFUND'); const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(''); const [quantities, setQuantities] = useState<Record<string, string>>({});
  const mutation = useReturnMutation<CreateReturn>(createReturn, () => { toast.success('Request recorded. Review it before approving.'); setOpen(false); setReason(''); setAmount(''); setQuantities({}); onSaved(); });
  if (!open) return <Button className="mt-4" variant="primary" onClick={() => setOpen(true)}>Record return / refund request</Button>;
  return <form className="mt-5 space-y-3 border-t border-line pt-4" onSubmit={(e) => { e.preventDefault(); void mutation.submit(() => {
    const paise = kind === 'RETURN_ONLY' ? 0 : parseRupeesToPaise(amount);
    if (paise === null || (kind !== 'RETURN_ONLY' && paise <= 0)) throw new ApiError('VALIDATION_ERROR', 'Enter a positive refund amount with at most two decimal places.');
    return { clientRequestId: crypto.randomUUID(), orderId: data.order.id, kind, reason, requestedAmountPaise: paise, items: kind === 'REFUND_ONLY' ? [] : data.order.items.filter(i => Number(quantities[i.id] ?? 0) > 0).map(i => ({ orderItemId: i.id, quantity: Number(quantities[i.id]) })) };
  }); }}>
    <fieldset disabled={mutation.frozen} className="space-y-3">
      <SelectField label="Case type" value={kind} onChange={(e) => setKind(e.target.value as ReturnKind)}>{Object.entries(RETURN_KIND_LABEL).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</SelectField>
      <TextArea label="Reason" required minLength={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
      {kind !== 'RETURN_ONLY' && <TextField label="Requested refund (₹)" required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} hint="Full refunds may include delivery charges. Payment must be collected before refund approval." />}
      {kind !== 'REFUND_ONLY' && <><p className="text-sm text-muted">Choose complete purchased units, packs or combos to return. Enter 0 for items not being returned.</p>{data.order.items.map((item) => {
        const used = data.cases.filter(c => c.status !== 'REJECTED').flatMap(c => c.items).filter(i => i.orderItemId === item.id).reduce((sum,i) => sum + i.quantity,0);
        return <TextField key={item.id} label={`${item.productName} — ${item.quantity - used} eligible`} type="number" min={0} max={item.quantity - used} step={1} value={quantities[item.id] ?? '0'} onChange={(e) => setQuantities({ ...quantities, [item.id]: e.target.value })} />;
      })}</>}
    </fieldset>
    {mutation.error && <p role="alert" className="text-sm text-danger">{mutation.error}</p>}
    <div className="flex gap-2"><Button type="submit" variant="primary" loading={mutation.busy}>{mutation.uncertain ? 'Retry same request' : 'Record request'}</Button><Button disabled={mutation.frozen} onClick={() => setOpen(false)}>Cancel</Button></div>
  </form>;
}

function ReturnCaseCard({ row, reload }: { row: ReturnCase; reload: () => void }) {
  return <section className="rounded-lg border border-line p-4">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{RETURN_KIND_LABEL[row.kind]}</h3><span className="text-sm font-semibold">{row.status}</span></div>
    <p className="mt-1 text-xs text-muted">Case {row.id} · {formatDateTime(row.createdAt)}</p><p className="mt-2 whitespace-pre-wrap text-sm">{row.reason}</p>
    <p className="mt-2 text-sm">Requested: {formatCurrency(row.requestedAmountPaise)}{row.approvedAmountPaise !== null ? ` · Approved: ${formatCurrency(row.approvedAmountPaise)}` : ''}</p>
    {row.payoutReference && <p className="mt-1 text-sm font-medium">Cash paid: {formatCurrency(row.approvedAmountPaise ?? 0)} · Receipt: {row.payoutReference}</p>}
    {row.items.map(item => <div key={item.id} className="mt-3 rounded-lg bg-bg p-3 text-sm"><p className="font-medium">{item.orderItem.productName} × {item.quantity}</p><p>Received: {item.receivedQuantity} · Sellable: {item.sellableQuantity} · Restocked: {item.restockedAt ? item.sellableQuantity : 0}</p>{item.components?.map(c=><p key={c.id}>{c.productName}: {c.quantity} physical units ? {c.sellableQuantity} sellable{c.conditionNote ? ` ? ${c.conditionNote}` : ""}</p>)}{item.conditionNote && <p>{item.conditionNote}</p>}{row.receivedAt && !item.restockedAt && (item.components?.length ? item.components.some(c=>c.sellableQuantity>0) : item.sellableQuantity>0) && <RestockAction row={row} itemId={item.id} reload={reload} />}</div>)}
    {(row.status === 'REQUESTED' || row.status === 'APPROVED') && <CaseActions key={`${row.status}:${row.receivedAt ?? ''}`} row={row} reload={reload} />}
    <details className="mt-4 text-sm"><summary className="cursor-pointer text-primary">Action history ({row.events.length})</summary><ol className="mt-2 space-y-2">{row.events.map(event => <li key={event.id}><strong>{event.action}</strong> · {event.adminName} · {formatDateTime(event.createdAt)}<p className="whitespace-pre-wrap text-muted">{event.note}</p></li>)}</ol></details>
  </section>;
}

function CaseActions({ row, reload }: { row: ReturnCase; reload: () => void }) {
  const toast = useToast(); const [note,setNote] = useState('');
  const [amount,setAmount] = useState(paiseToRupeeInput(row.requestedAmountPaise));
  const [receipt,setReceipt] = useState(''); const [confirmed,setConfirmed] = useState(false);
  const [inspection,setInspection] = useState<Record<string,{sellable: string; condition: string}>>({});
  const initialAction = row.status === 'REQUESTED' ? 'APPROVE' : row.kind !== 'REFUND_ONLY' && !row.receivedAt ? 'RECEIVE' : 'COMPLETE';
  const [action,setAction] = useState<'APPROVE' | 'REJECT' | 'RECEIVE' | 'COMPLETE'>(initialAction);
  const mutation = useReturnMutation<ReturnAction>((body) => returnAction(row.id,body), () => { toast.success('Case updated.'); reload(); });
  return <form className="mt-4 space-y-3 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); void mutation.submit(() => {
    const base = { requestId: crypto.randomUUID(), note };
    if (action === 'APPROVE') { const paise = row.kind === 'RETURN_ONLY' ? 0 : parseRupeesToPaise(amount); if (paise === null) throw new ApiError('VALIDATION_ERROR','Enter a valid amount in rupees.'); return { ...base, action, approvedAmountPaise: paise }; }
    if (action === 'RECEIVE') return { ...base, action, items: row.items.map(i => ({ itemId:i.id, receivedQuantity:i.quantity, sellableQuantity:Number(inspection[i.id]?.sellable ?? 0), conditionNote:inspection[i.id]?.condition || note, ...(i.components?.length ? {components:i.components.map(c=>({componentId:c.id,sellableQuantity:Number(inspection[c.id]?.sellable ?? 0),conditionNote:inspection[c.id]?.condition ?? ''}))} : {}) })) };
    if (action === 'COMPLETE') return { ...base, action, ...(row.kind === 'RETURN_ONLY' ? {} : { payoutReference:receipt }) };
    return { ...base, action:'REJECT' };
  }); }}>
    <fieldset disabled={mutation.frozen} className="space-y-3">
      <SelectField label="Action" value={action} onChange={(e) => { setAction(e.target.value as typeof action); setConfirmed(false); }}>
        <option value={initialAction}>{initialAction === 'APPROVE' ? 'Approve request' : initialAction === 'RECEIVE' ? 'Record receipt and inspection' : row.kind === 'RETURN_ONLY' ? 'Complete return' : 'Record cash refund completed'}</option>
        {!row.receivedAt && <option value="REJECT">Reject request</option>}
      </SelectField>
      {action === 'APPROVE' && row.kind !== 'RETURN_ONLY' && <TextField label="Approved refund (₹)" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} hint="Cannot exceed the requested amount or available collected cash." />}
      {action === 'RECEIVE' && <><p className="text-sm text-muted">Confirm all requested packs and their listed contents were physically received. Inspect each physical product below; this does not add stock.</p>{row.items.flatMap(item => item.components?.length ? item.components.map(c=>({id:c.id,label:c.productName,quantity:c.quantity})) : [{id:item.id,label:item.orderItem.productName,quantity:item.quantity}]).map(component=><div key={component.id} className="space-y-2 rounded-lg border border-line p-3"><TextField label={component.label + ': sellable units (of ' + component.quantity + ' received)'} type="number" min={0} max={component.quantity} step={1} required value={inspection[component.id]?.sellable ?? '0'} onChange={e=>setInspection({...inspection,[component.id]:{sellable:e.target.value,condition:inspection[component.id]?.condition ?? ''}})}/><TextField label="Condition / inspection note" minLength={3} maxLength={1000} required value={inspection[component.id]?.condition ?? ''} onChange={e=>setInspection({...inspection,[component.id]:{sellable:inspection[component.id]?.sellable ?? '0',condition:e.target.value}})}/></div>)}<CheckboxField label="I physically received and inspected every listed unit in these complete packs." checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} required/></>}
      {action === 'COMPLETE' && row.kind !== 'RETURN_ONLY' && <><p className="text-sm font-semibold">Record {formatCurrency(row.approvedAmountPaise ?? 0)} paid back in cash.</p><TextField label="Unique cash payout receipt / reference" minLength={3} maxLength={100} required value={receipt} onChange={(e) => setReceipt(e.target.value)} /><CheckboxField label="The customer received this cash refund. This only records the payout; it does not send money." checked={confirmed} required onChange={(e) => setConfirmed(e.target.checked)} /></>}
      <TextArea label="Action note" minLength={3} maxLength={1000} required value={note} onChange={(e) => setNote(e.target.value)} />
    </fieldset>
    {mutation.error && <p role="alert" className="text-sm text-danger">{mutation.error}</p>}
    <Button type="submit" variant="primary" loading={mutation.busy}>{mutation.uncertain ? 'Retry same recording' : 'Confirm action'}</Button>
  </form>;
}

function RestockAction({ row, itemId, reload }: { row: ReturnCase; itemId: string; reload: () => void }) {
  const [note,setNote] = useState(''); const [confirm,setConfirm] = useState(false);
  const mutation = useReturnMutation<ReturnAction>((body) => returnAction(row.id,body),reload);
  return <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void mutation.submit(() => ({ requestId:crypto.randomUUID(),action:'RESTOCK',itemId,note })); }}>
    <fieldset disabled={mutation.frozen} className="space-y-2"><TextField label="Restocking note" required minLength={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /><CheckboxField label="Add these inspected sellable units to available stock once." required checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /></fieldset>
    {mutation.error && <p role="alert" className="text-danger">{mutation.error}</p>}<Button type="submit" loading={mutation.busy}>{mutation.uncertain ? 'Retry same restock' : 'Restock sellable units'}</Button>
  </form>;
}
