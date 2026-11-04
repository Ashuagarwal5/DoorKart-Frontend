'use client';

import { useState } from 'react';

import { Icon } from '@/components/ui/icons';
import { resolveMediaUrl } from '@/services/api/config';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';

/** What the stock line on the customer card says, worked out the way the storefront does. */
export function stockLine({ isCombo, available, lowStockThreshold, allowBackorder }) {
  if (isCombo) return { tone: 'muted', text: 'Stock follows the combo contents' };
  if (available === null) return { tone: 'muted', text: 'Stock appears here' };
  if (available <= 0) return allowBackorder ? { tone: 'warning', text: 'Ships after restock' } : { tone: 'danger', text: 'Sold out' };
  if (available <= lowStockThreshold) return { tone: 'warning', text: `Only ${available} left` };
  return { tone: 'success', text: `In stock (${available} units left)` };
}

const TONES = { success: 'text-success', warning: 'text-warning', danger: 'text-danger', muted: 'text-muted' };

/** The photo area: cover or chosen photo, swipe dots, type pill and ribbons. */
function PreviewPhotos({ values, isCombo, photoIndex, setPhotoIndex, showCount }) {
  const pictures = values.media.filter((item) => item.mediaType === 'IMAGE');
  const current = Math.min(photoIndex, Math.max(pictures.length - 1, 0));
  const shown = pictures[current];
  return (
    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft/60 to-bg">
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveMediaUrl(shown.url)} alt={shown.altText ?? 'Product preview'} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary/60">
          <Icon name={isCombo ? 'inventory' : 'products'} className="h-8 w-8" />
        </span>
      )}
      {values.isNew ? <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-white">New</span> : null}
      {showCount && pictures.length > 0 ? (
        <span className="absolute bottom-2 right-2 rounded-md bg-fg/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{current + 1} / {pictures.length} Photos</span>
      ) : (
        <span className="absolute bottom-2 right-2 rounded-md bg-fg/70 px-2 py-0.5 text-[10px] font-semibold text-white">{isCombo ? 'Combo pack' : 'Single product'}</span>
      )}
      {pictures.length > 1 ? (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-fg/30 px-2 py-1">
          {pictures.map((picture, index) => (
            <button key={`${picture.url}-${index}`} type="button" aria-label={`Show photo ${index + 1}`} aria-pressed={index === current} onClick={() => setPhotoIndex(index)} className={cn('h-1.5 rounded-full transition-all', index === current ? 'w-4 bg-white' : 'w-1.5 bg-white/60')} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Name, price, stock and the add button, as the storefront lays them out. */
function PreviewDetails({ values, pricing, categoryLabel, stock, isWeb, variant }) {
  const brandOrCategory = (variant === 'card' ? categoryLabel : values.brand.trim() || categoryLabel) ?? 'Category';
  return (
    <div className="space-y-2 p-3.5">
      {variant === 'card' ? (
        <p className="truncate text-[11px] font-bold uppercase tracking-wide text-primary">{brandOrCategory.replace(/ › /g, ' > ')}</p>
      ) : (
        <p className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-primary-soft px-1.5 py-0.5 font-bold uppercase tracking-wide text-primary">{brandOrCategory}</span>
          {values.brand.trim() && categoryLabel ? <span className="text-muted">· {categoryLabel}</span> : null}
        </p>
      )}
      <h3 className={cn('break-words font-semibold leading-snug text-fg', isWeb ? 'text-base' : 'line-clamp-2 text-sm')}>{values.name.trim() || 'Your product name'}</h3>
      {pricing.priceValid ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xl font-bold text-fg">{formatCurrency(pricing.selling)}</span>
          {pricing.mrp > pricing.selling ? (
            <>
              <span className="text-xs text-muted line-through">{formatCurrency(pricing.mrp)}</span>
              {variant === 'card' ? <span className="rounded bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">{pricing.discountPercent}% OFF</span> : null}
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted">Add pricing to complete the preview</p>
      )}
      {variant !== 'card' && pricing.priceValid && pricing.mrp > pricing.selling ? (
        <p className="text-[11px] font-semibold text-success">{pricing.discountPercent}% OFF · Save {formatCurrency(pricing.mrp - pricing.selling)}</p>
      ) : null}
      {isWeb && values.description.trim() ? <p className="line-clamp-3 break-words text-xs text-muted">{values.description}</p> : null}
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className={cn('flex min-w-0 items-center gap-1.5 text-[11px] font-medium', TONES[stock.tone])}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
          <span className="truncate">{stock.text}</span>
        </span>
        <span aria-hidden="true" className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold', stock.tone === 'danger' ? 'bg-bg text-muted' : variant === 'card' ? 'bg-primary text-on-primary' : 'bg-success text-white')}>
          {stock.tone === 'danger' ? 'Sold out' : variant === 'card' ? 'Add to cart' : 'ADD +'}
        </span>
      </div>
      {values.isFeatured ? <p className="text-[11px] font-medium text-primary">★ Shown in Popular Products</p> : null}
    </div>
  );
}

/**
 * The product as a customer will see it, redrawn on every keystroke. `variant` picks the look:
 * "card" (the first step's store card), "phone" (a phone with the app's top bar) or "dark"
 * (the same phone on a dark panel with a status bar). It is a picture of the storefront, not
 * the storefront: only the view toggle and the photo dots respond.
 */
export function ProductPreview({ values, pricing, categoryLabel, available, lowStockThreshold, variant = 'card', onFullPreview, initialView = 'mobile', large = false }) {
  const [view, setView] = useState(initialView);
  const [photoIndex, setPhotoIndex] = useState(0);
  const isCombo = values.kind === 'COMBO';
  const stock = stockLine({ isCombo, available, lowStockThreshold, allowBackorder: values.allowBackorder });
  const isWeb = view === 'web';
  const isDark = variant === 'dark';
  const toggleLabels = variant === 'dark' ? ['App view', 'Desktop'] : ['Mobile app', 'Web'];

  const toggle = (
    <div role="group" aria-label="Preview size" className={cn('flex rounded-lg border p-0.5 text-[11px]', isDark ? 'border-white/15 bg-white/5' : 'border-line')}>
      {[['mobile', toggleLabels[0]], ['web', toggleLabels[1]]].map(([key, label]) => (
        <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={cn('rounded-md px-2 py-1 font-semibold', view === key ? 'bg-primary text-on-primary' : isDark ? 'text-white/70 hover:text-white' : 'text-muted hover:text-fg')}>
          {label}
        </button>
      ))}
    </div>
  );

  const details = <PreviewDetails values={values} pricing={pricing} categoryLabel={categoryLabel} stock={stock} isWeb={isWeb} variant={variant} />;
  const photos = <PreviewPhotos values={values} isCombo={isCombo} photoIndex={photoIndex} setPhotoIndex={setPhotoIndex} showCount={variant !== 'card'} />;
  // The web page puts photo and details side by side only when its box is wide enough for
  // both (a container query, so it works in the narrow sidebar and the wide dialog alike).
  const webLayout = (
    <div className="@container">
      <div className="grid @md:grid-cols-[minmax(0,45%)_minmax(0,1fr)] @md:items-start">
        {photos}
        <div className="min-w-0 @md:pt-2">{details}</div>
      </div>
    </div>
  );
  const pageAddress = `doorkart.in/product/${values.slug.trim() || values.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'your-product'}`;
  /** A browser window around the web layout: dots, address bar, then the page. */
  const browserFrame = (className) => (
    <div className={cn('overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-xl', className)}>
      <div className="flex items-center gap-2 border-b border-line bg-bg px-3 py-2">
        <span className="flex gap-1" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-danger/60" /><span className="h-2 w-2 rounded-full bg-warning/60" /><span className="h-2 w-2 rounded-full bg-success/60" /></span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-surface px-2 py-0.5 font-mono text-[10px] text-muted">{pageAddress}</span>
      </div>
      <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[11px]">
        <span className="font-bold text-primary">DoorKart</span>
        <span className="truncate text-muted">{categoryLabel ? `Home › ${categoryLabel}` : 'Home'}</span>
      </div>
      {webLayout}
    </div>
  );

  if (variant === 'card') {
    return (
      <section aria-label="Store live preview" className="overflow-hidden rounded-2xl border border-line bg-surface">
        <header className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-fg"><Icon name="eye" className="h-4 w-4 text-primary" /> Store live preview</p>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', values.isActive ? 'bg-success-soft text-success' : 'bg-bg text-muted')}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {values.isActive ? 'Active on save' : 'Hidden on save'}
          </span>
        </header>
        <div className="px-4 pb-4">
          {isWeb ? browserFrame('shadow-sm') : (
            <article className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
              {photos}
              {details}
            </article>
          )}
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[11px]">
          <span className="text-muted">Viewport: {isWeb ? 'Web storefront' : '380px Mobile App'}</span>
          <button type="button" onClick={() => setView(isWeb ? 'mobile' : 'web')} className="font-semibold text-primary hover:underline">{isWeb ? 'Rotate to Mobile View' : 'Rotate to Web View'}</button>
        </footer>
      </section>
    );
  }

  return (
    <section aria-label="Live customer preview" className={cn('overflow-hidden rounded-2xl border', isDark ? 'border-fg bg-fg text-white' : 'border-line bg-surface')}>
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <p className={cn('flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-white' : 'text-fg')}>
          {isDark ? <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" /> : <Icon name="phone" className="h-4 w-4 text-primary" />}
          Live customer preview
        </p>
        {toggle}
      </header>
      <div className={cn('pb-4', isWeb ? 'px-4 pt-1' : 'px-5 pt-2')}>
        {isWeb ? browserFrame() : (
          <div className={cn('mx-auto overflow-hidden rounded-[28px] border-[6px] border-fg/90 bg-surface text-fg shadow-xl', large ? 'max-w-[340px]' : 'max-w-[270px]')}>
            {isDark ? (
              <div className="flex items-center justify-between px-4 pb-1 pt-2 text-[10px] font-semibold"><span>9:41</span><span>5G ▮</span></div>
            ) : null}
            <div className="flex items-center justify-between border-b border-line px-3 py-2 text-[11px]">
              <span aria-hidden="true">←</span>
              <span className="truncate font-semibold uppercase tracking-wide">{isDark ? (categoryLabel ?? 'DoorKart') : 'DoorKart'}</span>
              <span className="flex gap-2 text-muted" aria-hidden="true"><Icon name="link" className="h-3.5 w-3.5" />♡</span>
            </div>
            {photos}
            {details}
            <div className="flex items-center justify-between border-t border-line bg-bg px-3 py-2 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Your shop</span>
              <span className="font-semibold text-primary">{isCombo ? 'From contents' : available === null ? '–' : `${Math.max(available, 0)} in stock`}</span>
            </div>
          </div>
        )}
      </div>
      <p className={cn('px-4 pb-4 text-center text-[11px]', isDark ? 'text-white/60' : 'text-muted')}>
        {variant === 'dark' ? 'Live preview syncs instantly as you adjust fields.' : 'Preview mirrors slot #1 cover photo & swipe dots in client view.'}
        {onFullPreview ? <> <button type="button" onClick={onFullPreview} className={cn('font-semibold hover:underline', isDark ? 'text-white' : 'text-primary')}>Full preview</button></> : null}
      </p>
    </section>
  );
}
