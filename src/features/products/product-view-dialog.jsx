'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ActiveBadge } from '@/components/ui/status-badge';
import { CategoryChip, productKindLabel, SkuTag, StockHealth } from '@/features/products/product-table';
import { resolveMediaUrl } from '@/services/api/config';
import { formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/money';
import { cn } from '@/utils/cn';

/** Every picture and video of the product, one large and the rest as a strip to pick from. */
function Gallery({ product }) {
  const [index, setIndex] = useState(0);
  const media = product.images;
  const current = media[index];

  if (!current) {
    return <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line bg-bg text-sm text-muted">No pictures yet</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-bg">
        {current.mediaType === 'VIDEO' ? (
          <video key={current.id} src={resolveMediaUrl(current.url)} controls className="h-full w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveMediaUrl(current.url)} alt={current.altText ?? product.name} className="h-full w-full object-contain" />
        )}
      </div>
      {media.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {media.map((item, position) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Show ${item.mediaType === 'VIDEO' ? 'video' : 'picture'} ${position + 1}`}
                aria-current={position === index}
                className={cn('flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border bg-bg text-[10px] font-bold uppercase text-muted', position === index ? 'border-primary ring-2 ring-primary/20' : 'border-line hover:border-muted/50')}>
                {item.mediaType === 'VIDEO' ? 'Video' : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(item.url)} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}

function Details({ product }) {
  const discount = product.mrpPaise > product.sellingPricePaise
    ? Math.round(((product.mrpPaise - product.sellingPricePaise) / product.mrpPaise) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ActiveBadge isActive={product.isActive} />
        {product.isFeatured ? <Badge tone="primary">Featured</Badge> : null}
        {product.isNew ? <Badge tone="info">New arrival</Badge> : null}
        <CategoryChip product={product} />
        <SkuTag sku={product.sku} />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-bold tabular-nums text-fg">{formatCurrency(product.sellingPricePaise)}</span>
        {discount > 0 ? (
          <>
            <span className="text-base tabular-nums text-muted line-through">{formatCurrency(product.mrpPaise)}</span>
            <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-bold text-success">{discount}% off</span>
          </>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="On hand" value={product.stockQuantity} />
        <Stat label="Reserved" value={product.reservedQuantity} />
        <Stat label="Available" value={product.availableQuantity} />
        <Stat label="Alert at" value={`${product.lowStockThreshold} units`} />
      </dl>
      <StockHealth product={product} />

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Description</h3>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-fg">{product.description}</p>
      </section>

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Brand" value={product.brand ?? '—'} />
        <Stat label="Type" value={productKindLabel(product)} />
        <Stat label="Slug" value={<span className="break-all">{product.slug}</span>} />
        <Stat label="Added" value={formatDate(product.createdAt)} />
      </dl>

      {product.variants?.length ? (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Quantity packs</h3>
          <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line text-sm">
            {product.variants.map((pack) => (
              <li key={pack.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="font-medium text-fg">{pack.label} <span className="text-muted">· {pack.unitsPerPack} units</span></span>
                <span className="tabular-nums text-fg">{formatCurrency(pack.sellingPricePaise)}{pack.isActive ? '' : ' · inactive'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {product.comboComponents?.length ? (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Combo contents</h3>
          <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line text-sm">
            {product.comboComponents.map((part) => (
              <li key={part.productId} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="font-medium text-fg">{part.productName}</span>
                <span className="tabular-nums text-muted">× {part.quantity}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Everything about one product, read-only: all its pictures and details. */
export function ProductViewDialog({ product, onClose }) {
  return (
    <Modal open={product !== null} onClose={onClose} title={product?.name ?? 'Product'} wide className="!max-w-4xl">
      {product ? (
        <div className="space-y-5">
          <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <Gallery key={product.id} product={product} />
            <Details product={product} />
          </div>
          <div className="flex justify-end border-t border-line pt-4">
            <Link href={`/products/${product.id}/edit`} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-hover">
              Edit product
            </Link>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
