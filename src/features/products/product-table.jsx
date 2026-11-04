'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Fragment, useState } from 'react';

import { Icon } from '@/components/ui/icons';
import { ProductThumb } from '@/components/products/product-thumb';
import { formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/money';
import { cn } from '@/utils/cn';

/** Category chips get a steady colour per category, so the same category always looks the same. */
const CATEGORY_TONES = [
  'bg-info-soft text-info',
  'bg-warning-soft text-warning',
  'bg-success-soft text-success',
  'bg-danger-soft text-danger',
  'bg-primary-soft text-primary',
];

function categoryTone(id) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}

export function categoryLabel(product) {
  return product.category.parent ? `${product.category.parent.name} › ${product.category.name}` : product.category.name;
}

export function productKindLabel(product) {
  if (product.kind === 'COMBO') return 'Combo pack';
  return product.variants?.length ? `${product.variants.length} quantity packs` : 'Single unit';
}

/** Available stock as one pill: out, low (at or under the threshold) or fine. */
export function StockHealth({ product }) {
  const available = product.availableQuantity;
  const [tone, text] =
    available <= 0
      ? ['bg-danger-soft text-danger ring-danger/20', 'Out of stock']
      : product.isLowStock
        ? ['bg-warning-soft text-warning ring-warning/20', `${available} avail · Low`]
        : ['bg-success-soft text-success ring-success/20', `${available} in stock`];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1', tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}

export function CategoryChip({ product }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', categoryTone(product.category.id))}>
      {categoryLabel(product)}
    </span>
  );
}

export function SkuTag({ sku }) {
  return <span className="inline-block max-w-40 truncate rounded-md border border-line bg-bg px-2 py-0.5 font-mono text-xs text-fg">{sku}</span>;
}

function Price({ product }) {
  const discounted = product.mrpPaise > product.sellingPricePaise;
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="font-semibold text-fg">{formatCurrency(product.sellingPricePaise)}</span>
      {discounted ? <span className="text-xs text-muted line-through">{formatCurrency(product.mrpPaise)}</span> : null}
    </span>
  );
}

const ICON_BUTTON = 'flex h-8 w-8 items-center justify-center rounded-lg border border-transparent transition-colors disabled:opacity-50';

/** View, edit and activate/deactivate, as icons only; the name shows on hover and to screen readers. */
function RowActions({ product, busy, onView, onActivate, onDeactivate }) {
  return (
    <div className="flex justify-end gap-1">
      <button type="button" onClick={() => onView(product)} title="View" aria-label={`View ${product.name}`} className={cn(ICON_BUTTON, 'text-muted hover:bg-bg hover:text-fg')}>
        <Icon name="eye" className="h-[18px] w-[18px]" />
      </button>
      <Link href={`/products/${product.id}/edit`} title="Edit" aria-label={`Edit ${product.name}`} className={cn(ICON_BUTTON, 'text-primary hover:bg-primary-soft')}>
        <Icon name="edit" className="h-[18px] w-[18px]" />
      </Link>
      {product.isActive ? (
        <button type="button" onClick={() => onDeactivate(product)} title="Deactivate" aria-label={`Deactivate ${product.name}`} className={cn(ICON_BUTTON, 'text-danger hover:bg-danger-soft')}>
          <Icon name="power" className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => onActivate(product)} title="Activate" aria-label={`Activate ${product.name}`} className={cn(ICON_BUTTON, 'text-success hover:bg-success-soft')}>
          <Icon name="power" className={cn('h-[18px] w-[18px]', busy && 'animate-pulse')} />
        </button>
      )}
    </div>
  );
}

function Fact({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className={cn('mt-0.5 truncate text-sm font-semibold text-fg', tone)}>{value}</dd>
    </div>
  );
}

/** The expanded row: the details that do not fit in the columns, in one set of tiles. */
function ProductDetails({ product }) {
  const available = product.availableQuantity;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col rounded-lg border border-line bg-surface p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Description</p>
        <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-fg">{product.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {product.isFeatured ? <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">Featured</span> : null}
          {product.isNew ? <span className="rounded-md bg-info-soft px-2 py-0.5 text-xs font-semibold text-info">New arrival</span> : null}
          <Link href={`/inventory?search=${encodeURIComponent(product.sku)}`} className="ml-auto text-xs font-semibold text-primary hover:underline">Adjust stock →</Link>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="On hand" value={product.stockQuantity} />
        <Fact label="Reserved" value={product.reservedQuantity} />
        <Fact label="Available" value={available} tone={available <= 0 ? 'text-danger' : product.isLowStock ? 'text-warning' : 'text-success'} />
        <Fact label="Alert at" value={`${product.lowStockThreshold} units`} />
        <Fact label="Brand" value={product.brand ?? '—'} />
        <Fact label="Type" value={productKindLabel(product)} />
        <Fact label="Slug" value={product.slug} />
        <Fact label="Added" value={formatDate(product.createdAt)} />
      </dl>
    </motion.div>
  );
}

/**
 * The products grid. Click a row (or its arrow) to expand its details. Phones get one card
 * per product instead of a sideways-scrolling table.
 */
export function ProductTable({ rows, density, busyIds, onView, onActivate, onDeactivate }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const cellY = density === 'compact' ? 'py-2' : 'py-3.5';
  const headCell = 'px-3 py-3.5 text-sm font-bold uppercase tracking-wide text-fg/80';

  const toggleExpanded = (id) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <ul aria-label="Products" className="space-y-3 p-3 md:hidden">
        {rows.map((product) => (
          <li key={product.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start gap-3">
              <ProductThumb url={product.images.find((media) => media.mediaType === 'IMAGE')?.url} alt="" className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <Link href={`/products/${product.id}/edit`} className="font-semibold text-fg hover:text-primary">{product.name}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5"><SkuTag sku={product.sku} /><CategoryChip product={product} /></div>
              </div>
              <Price product={product} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>On hand <b className="text-fg">{product.stockQuantity}</b> · Reserved <b className="text-fg">{product.reservedQuantity}</b></span>
              <span className="flex items-center gap-1.5">{product.isActive ? null : <span className="rounded-md bg-bg px-2 py-0.5 font-semibold">Inactive</span>}<StockHealth product={product} /></span>
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <RowActions product={product} busy={busyIds.has(product.id)} onView={onView} onActivate={onActivate} onDeactivate={onDeactivate} />
            </div>
          </li>
        ))}
      </ul>

      <div role="region" aria-label="Products" tabIndex={0} className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="sr-only">Products</caption>
          <thead className="border-b border-line bg-bg/70">
            <tr>
              <th scope="col" className="w-10 py-3.5 pl-4 pr-1"><span className="sr-only">Details</span></th>
              <th scope="col" className={headCell}>Product</th>
              <th scope="col" className={headCell}>SKU</th>
              <th scope="col" className={headCell}>Category</th>
              <th scope="col" className={cn(headCell, 'text-right')}>Price</th>
              <th scope="col" className={cn(headCell, 'text-right')}>On hand</th>
              <th scope="col" className={cn(headCell, 'text-right')}>Reserved</th>
              <th scope="col" className={headCell}>Health / Avail</th>
              <th scope="col" className={cn(headCell, 'pl-3 pr-5 text-right')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((product) => {
              const isOpen = expanded.has(product.id);
              return (
                <Fragment key={product.id}>
                  <tr
                    onClick={(event) => {
                      if (!event.target.closest('a, button')) toggleExpanded(product.id);
                    }}
                    className={cn('cursor-pointer transition-colors', isOpen ? 'bg-primary-soft/25' : 'hover:bg-bg/70', !product.isActive && 'text-muted')}>
                    <td className={cn('pl-4 pr-1', cellY)}>
                      <button type="button" onClick={() => toggleExpanded(product.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} details for ${product.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-fg">
                        <Icon name="chevronRight" className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90 text-primary')} />
                      </button>
                    </td>
                    <td className={cn('px-3', cellY)}>
                      <div className="flex items-center gap-3">
                        <ProductThumb url={product.images.find((media) => media.mediaType === 'IMAGE')?.url} alt="" className={cn(density === 'compact' ? 'h-9 w-9' : 'h-11 w-11', !product.isActive && 'opacity-50')} />
                        <div className="min-w-0 max-w-64">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/products/${product.id}/edit`} className={cn('truncate font-semibold hover:text-primary hover:underline', product.isActive ? 'text-fg' : 'text-muted')}>{product.name}</Link>
                            {product.isFeatured ? <span className="shrink-0 rounded bg-primary-soft px-1.5 text-[10px] font-semibold text-primary">Featured</span> : null}
                          </div>
                          <p className="truncate text-xs text-muted">
                            {product.brand ?? 'No brand'}
                            {product.isActive ? null : <> · <span className="font-semibold">Inactive</span></>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={cn('px-3', cellY)}><SkuTag sku={product.sku} /></td>
                    <td className={cn('px-3', cellY)}><CategoryChip product={product} /></td>
                    <td className={cn('px-3 text-right tabular-nums', cellY)}><Price product={product} /></td>
                    <td className={cn('px-3 text-right font-semibold tabular-nums text-fg', cellY)}>{product.stockQuantity}</td>
                    <td className={cn('px-3 text-right tabular-nums', cellY)}>
                      {product.reservedQuantity > 0 ? <span className="font-mono text-xs text-muted">{product.reservedQuantity} res</span> : <span className="text-muted">0</span>}
                    </td>
                    <td className={cn('px-3', cellY)}><StockHealth product={product} /></td>
                    <td className={cn('pl-3 pr-5', cellY)}>
                      <RowActions product={product} busy={busyIds.has(product.id)} onView={onView} onActivate={onActivate} onDeactivate={onDeactivate} />
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="bg-primary-soft/25">
                      <td colSpan={9} className="px-5 pb-4 pt-1"><ProductDetails product={product} /></td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
