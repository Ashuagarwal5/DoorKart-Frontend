'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { TextField, TextArea, SelectField } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { QueryView } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/use-api-query';
import { fetchProducts } from '@/services/api/admin-api';
import { describeApiError, toApiError } from '@/services/api/api-error';
import { createManualReview, fetchReviews, moderateReview, type ModerationAction, type Review } from '@/services/api/reviews-api';

export function ReviewsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState({ search: '', status: '', origin: '', verified: '', deleted: 'false', page: 1 });
  const query = useApiQuery(JSON.stringify(filters), () => fetchReviews({ ...filters, limit: 20 }));
  const [adding, setAdding] = useState(false);
  const [moderation, setModeration] = useState<{ review: Review; action: ModerationAction } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const filter = (key: 'search' | 'status' | 'origin' | 'verified' | 'deleted', value: string) => setFilters((old) => ({ ...old, [key]: value, page: 1 }));
  const columns: Column<Review>[] = [
    { key: 'product', header: 'Product / reviewer', cell: (r) => <><p className="font-medium">{r.productName}</p><p>{r.reviewerName}</p></> },
    { key: 'review', header: 'Review', cell: (r) => <div className="max-w-md break-words"><strong>{r.rating} / 5 · {r.title}</strong><p className="whitespace-pre-wrap">{r.content}</p>{r.moderationNote && <p className="text-muted">Moderator: {r.moderationNote}</p>}</div> },
    { key: 'origin', header: 'Origin', cell: (r) => <><p>{r.origin === 'IMPORTED' ? 'Imported' : r.origin === 'ADMIN_ENTERED' ? 'Admin-entered' : r.verifiedPurchase ? 'Verified purchase' : 'Unverified customer'}</p>{r.sourceLabel && <p className="text-muted">Source: {r.sourceLabel}</p>}</> },
    { key: 'status', header: 'Status', cell: (r) => r.deletedAt ? 'Deleted by author' : r.status },
    { key: 'created', header: 'Created', cell: (r) => new Date(r.createdAt).toLocaleDateString('en-IN') },
    { key: 'actions', header: 'Actions', cell: (r) => r.deletedAt ? null : <div className="flex flex-wrap gap-2">{(r.status === 'HIDDEN' ? ['restore', 'reject'] as const : r.status === 'PUBLISHED' ? ['hide', 'reject'] as const : ['approve', 'reject'] as const).filter((action) => !(r.status === 'REJECTED' && action === 'reject')).map((action) => <Button key={action} size="sm" disabled={busy} onClick={() => { setModeration({ review: r, action }); setNote(''); }}>{action[0].toUpperCase() + action.slice(1)}</Button>)}</div> },
  ];
  return <>
    <PageHeader title="Reviews Management" description="Moderate customer reviews and clearly attributed shop-entered or imported content." actions={<div className="flex items-center gap-3"><Link href="/settings" className="text-primary underline">Review settings</Link><Button variant="primary" onClick={() => setAdding(!adding)}>{adding ? 'Close form' : 'Add attributed review'}</Button></div>} />
    {adding && <ManualReviewForm onSaved={() => { setAdding(false); query.reload(); }} />}
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <TextField label="Search reviews" value={filters.search} onChange={(e) => filter('search', e.target.value)} />
      <SelectField label="Moderation status" value={filters.status} onChange={(e) => filter('status', e.target.value)}><option value="">All statuses</option>{['PENDING', 'PUBLISHED', 'REJECTED', 'HIDDEN'].map((s) => <option key={s}>{s}</option>)}</SelectField>
      <SelectField label="Origin" value={filters.origin} onChange={(e) => filter('origin', e.target.value)}><option value="">All origins</option><option value="CUSTOMER">Customer</option><option value="ADMIN_ENTERED">Admin-entered</option><option value="IMPORTED">Imported</option></SelectField>
      <SelectField label="Purchase verification" value={filters.verified} onChange={(e) => filter('verified', e.target.value)}><option value="">All</option><option value="true">Verified</option><option value="false">Unverified / attributed</option></SelectField>
      <SelectField label="Deleted reviews" value={filters.deleted} onChange={(e) => filter('deleted', e.target.value)}><option value="false">Exclude deleted</option><option value="true">Deleted only</option><option value="">Include all</option></SelectField>
    </div>
    {moderation && <form className="mb-5 space-y-3 rounded-xl border border-line bg-surface p-4" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await moderateReview(moderation.review.id, moderation.action, note); toast.success('Review moderation saved.'); setModeration(null); query.reload(); } catch (error) { toast.error(describeApiError(toApiError(error))); } finally { setBusy(false); } }}>
      <p className="font-medium">{moderation.action.toUpperCase()}: {moderation.review.title}</p>
      <TextArea label="Note to the reviewer (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2"><Button type="submit" variant="primary" loading={busy}>Confirm {moderation.action}</Button><Button disabled={busy} onClick={() => setModeration(null)}>Cancel</Button></div>
    </form>}
    <QueryView query={query}>{(data) => <>{data.items.length === 0 ? <p className="rounded-xl border border-line p-8 text-muted">No reviews match these filters.</p> : <DataTable caption="Product reviews" columns={columns} rows={data.items} getKey={(r) => r.id} />}<Pagination pagination={data.pagination} onPageChange={(page) => setFilters((old) => ({ ...old, page }))} /></>}</QueryView>
  </>;
}

function ManualReviewForm({ onSaved }: { onSaved: () => void }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const products = useApiQuery(`review-products:${search}`, () => fetchProducts({ search, page: 1, limit: 100 }));
  const [form, setForm] = useState({ productId: '', rating: 5, title: '', content: '', sourceLabel: '', origin: 'ADMIN_ENTERED' as 'ADMIN_ENTERED' | 'IMPORTED' });
  const [busy, setBusy] = useState(false);
  return <form className="mb-6 space-y-4 rounded-xl border border-line bg-surface p-5" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await createManualReview(form); toast.success('Attributed review added. Approve it to publish.'); onSaved(); } catch (error) { toast.error(describeApiError(toApiError(error))); } finally { setBusy(false); } }}>
    <p>This content will be labeled as shop-entered or imported, with its source visible to customers. It cannot receive a Verified Purchase badge. Only enter content you have permission to publish.</p>
    <TextField label="Find a product" value={search} onChange={(e) => { setSearch(e.target.value); setForm({ ...form, productId: '' }); }} />
    <QueryView query={products}>{(data) => <SelectField label="Product" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}><option value="">Select product</option>{data.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>}</QueryView>
    <SelectField label="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value === 'IMPORTED' ? 'IMPORTED' : 'ADMIN_ENTERED' })}><option value="ADMIN_ENTERED">Shop-entered review</option><option value="IMPORTED">Imported review</option></SelectField>
    <TextField label="Public source / attribution" required minLength={2} maxLength={200} value={form.sourceLabel} onChange={(e) => setForm({ ...form, sourceLabel: e.target.value })} />
    <SelectField label="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}</SelectField>
    <TextField label="Title" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
    <TextArea label="Review content" required maxLength={10000} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
    <Button type="submit" variant="primary" disabled={!form.productId} loading={busy}>Add for moderation</Button>
  </form>;
}
