'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import {
  isSharp, isSquare, MAX_MEDIA, MAX_VIDEOS, MediaAddressField, MediaDropzone, MediaGallery, MediaUploadNotes, QuickMediaSlots,
} from '@/components/products/media-manager';
import { Button } from '@/components/ui/button';
import { FieldShell, SelectField, TextField, controlClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { orderCategories } from '@/features/categories/category-tree';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/money';
import { ComboEditor } from './combo-editor';
import { ChoiceCard, FormSection, ListToolbar, MoneyField, Switch, ToggleCard, UnitField } from './product-form-parts';
import { GST_RATES, MAX_UNITS, NAME_LIMIT, suggestSku } from './product-form-model';

const DESCRIPTION_LIMIT = 5000;

/** "50.1% OFF (₹250 Savings)": the discount, with one decimal as on the price tag. */
function DiscountChip({ pricing }) {
  if (!pricing.priceValid || pricing.mrp <= pricing.selling) return null;
  const percent = ((pricing.mrp - pricing.selling) / pricing.mrp) * 100;
  return (
    <span className="inline-flex rounded-md border border-success/25 bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
      {percent.toFixed(1)}% OFF ({formatCurrency(pricing.mrp - pricing.selling)} Savings)
    </span>
  );
}

/** A field label with something on its right, such as a character count. */
function LabelRow({ children, aside, className }) {
  return <div className={cn('relative', className)}><div className="absolute right-0 top-0 z-[1]">{aside}</div>{children}</div>;
}

const counter = (length, limit) => <span className="font-mono text-[11px] text-muted">{length} / {limit} chars</span>;

/** Step 1: what the product is and how it is described, with quick versions of the other steps. */
export function BasicsStep({ values, set, errors, mode, product, categories, categoryName, pricing, library, facts, disabled }) {
  const isCombo = values.kind === 'COMBO';
  const descriptionId = useId();
  const [isSeoOpen, setIsSeoOpen] = useState(Boolean(errors.slug));

  return (
    <div className="space-y-5">
      <FormSection title={mode === 'create' ? 'What are you adding?' : 'Product type'} description={mode === 'create' ? 'Choose between a standalone retail product or a grouped bundled pack.' : undefined}>
        {mode === 'create' ? (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Product type</legend>
            <ChoiceCard name="product-kind" checked={!isCombo} onChange={() => set('kind', 'STANDARD')} disabled={disabled} icon="products" title="Single product" description="Sell individually, with optional quantity packs and their own barcodes." />
            <ChoiceCard name="product-kind" checked={isCombo} onChange={() => set('kind', 'COMBO')} disabled={disabled} icon="inventory" title="Combo pack" description="Bundle multiple products at one unified selling price and auto-deduct stock." />
          </fieldset>
        ) : (
          <p className="text-sm text-muted">{isCombo ? 'Combo pack' : 'Single product'}: the type stays fixed so past orders keep their meaning.</p>
        )}
      </FormSection>

      <FormSection title={isCombo ? 'Combo details' : 'Product details'} description="General identifiers, categories, and customer-facing descriptions.">
        <div className="grid gap-4 sm:grid-cols-2">
          <LabelRow className="sm:col-span-2" aside={counter(values.name.length, NAME_LIMIT)}>
            <TextField label={isCombo ? 'Combo name' : 'Product name'} required placeholder={isCombo ? 'e.g. Back to School Essentials' : 'e.g. Wooden Toys for your Kids - Montessori Natural Wood'} value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} maxLength={NAME_LIMIT} />
          </LabelRow>
          <SelectField label="Category" required value={values.categoryId} onChange={(event) => set('categoryId', event.target.value)} error={errors.categoryId}>
            <option value="">Choose a category</option>
            {orderCategories(categories).map(({ category, label }) => <option key={category.id} value={category.id}>{label.replace(' › ', ' > ')}{category.isActive ? '' : ' (inactive)'}</option>)}
          </SelectField>
          <TextField label="Brand" placeholder="e.g. WoodCraft Inc." value={values.brand} onChange={(event) => set('brand', event.target.value)} error={errors.brand} maxLength={100} />
          <div className="sm:col-span-2">
            <FieldShell label="SKU & Barcode Identifier" required error={errors.sku} hint="Unique stock keeper number used for inventory counts and order slips.">
              {({ id, describedBy }) => (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm tracking-[-2px] text-muted">|||</span>
                    <input id={id} required aria-invalid={errors.sku ? true : undefined} aria-describedby={describedBy} placeholder={isCombo ? 'COMBO-SCHOOL-01' : 'WOODEN001'} value={values.sku} onChange={(event) => set('sku', event.target.value.toUpperCase())} maxLength={64} className={cn(controlClass(errors.sku), 'min-h-10 pl-10 font-mono tracking-wide')} />
                  </div>
                  <Button disabled={disabled || values.name.trim() === ''} onClick={() => set('sku', suggestSku(values.name, categoryName))}>
                    <Icon name="refresh" className="h-4 w-4" /> {values.sku ? 'Regenerate' : 'Generate'}
                  </Button>
                </div>
              )}
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <LabelRow aside={counter(values.description.length, DESCRIPTION_LIMIT)}>
              <FieldShell label="Description" required error={errors.description}>
                {({ describedBy }) => (
                  <div>
                    <ListToolbar textareaId={descriptionId} value={values.description} onChange={(next) => set('description', next)} disabled={disabled} />
                    <textarea id={descriptionId} required rows={5} aria-invalid={errors.description ? true : undefined} aria-describedby={describedBy} placeholder="What customers receive, its size, material, age group and key features." value={values.description} onChange={(event) => set('description', event.target.value)} maxLength={DESCRIPTION_LIMIT} className={cn(controlClass(errors.description), 'rounded-t-none py-2')} />
                  </div>
                )}
              </FieldShell>
            </LabelRow>
          </div>
        </div>
        <div className="mt-4">
          <button type="button" aria-expanded={isSeoOpen} onClick={() => setIsSeoOpen((open) => !open)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <Icon name="chevronRight" className={cn('h-4 w-4 transition-transform', isSeoOpen && 'rotate-90')} /> Custom product URL &amp; SEO handle (optional)
          </button>
          {isSeoOpen || errors.slug ? (
            <div className="mt-3">
              <TextField label="URL handle (slug)" hint={mode === 'create' ? 'Leave blank to build it from the product name.' : 'Used in this product’s web address.'} placeholder="e.g. wooden-toys-montessori-natural" value={values.slug} onChange={(event) => set('slug', event.target.value)} error={errors.slug} maxLength={100} />
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Photos and videos" description="The first photo is the main product storefront image." aside={<span className="rounded-md bg-bg px-2 py-1 font-mono text-[11px] font-semibold text-fg">{values.media.length} / {MAX_MEDIA} Media</span>}>
        <div className="space-y-4">
          <MediaDropzone library={library} disabled={disabled} compact />
          <MediaUploadNotes library={library} />
          <QuickMediaSlots library={library} facts={facts} disabled={disabled} />
          <MediaAddressField library={library} disabled={disabled} />
          {errors.images ? <p role="alert" className="text-sm text-danger">{errors.images}</p> : null}
        </div>
      </FormSection>

      <FormSection title="Pricing, stock & margins" description="Set retail pricing, opening stock and re-order triggers.">
        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <MoneyField label="MRP (₹) Maximum Retail Price" required placeholder="0" hint="Printed price on packaging tag." value={values.mrp} onChange={(event) => set('mrp', event.target.value)} error={errors.mrpPaise} />
          {isCombo ? (
            <div className="rounded-lg bg-bg p-3 text-xs text-muted">A combo has no stock of its own: it follows the products inside.</div>
          ) : mode === 'create' ? (
            <TextField label="Opening Stock (Units)" required type="number" min={0} max={MAX_UNITS} step={1} hint="Physical stock ready on your shop shelf." value={values.openingStock} onChange={(event) => set('openingStock', event.target.value)} error={errors.stockQuantity} />
          ) : (
            <div className="rounded-lg bg-bg p-3 text-sm"><p className="font-semibold text-fg">{product.availableQuantity} available</p><p className="mt-1 text-xs text-muted">{product.stockQuantity} on hand / {product.reservedQuantity} reserved · change it in Inventory</p></div>
          )}
          <MoneyField label="Selling Price (₹) Discounted" required placeholder="0" hint={<span className="flex flex-wrap items-center justify-between gap-2">Actual customer checkout price <DiscountChip pricing={pricing} /></span>} value={values.sellingPrice} onChange={(event) => set('sellingPrice', event.target.value)} error={errors.sellingPricePaise} />
          {isCombo ? null : (
            <TextField label="Low Stock Threshold Alert" type="number" min={0} max={MAX_UNITS} step={1} hint="Flags the product for restocking at this level." value={values.lowStockThreshold} onChange={(event) => set('lowStockThreshold', event.target.value)} error={errors.lowStockThreshold} />
          )}
        </div>
      </FormSection>

      <FormSection title="Visibility & Merchandising Badges" description="Control discovery in the DoorKart app and search.">
        <div className="space-y-3">
          <ToggleCard leading checked={values.isActive} onChange={(event) => set('isActive', event.target.checked)} disabled={disabled} title="Active in Store & Online Search" description="When enabled, customers can instantly find and purchase this item." />
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleCard leading checked={values.isFeatured} onChange={(event) => set('isFeatured', event.target.checked)} disabled={disabled} title="Featured in Popular Shelf" description="Ranks higher on the home screen carousel." />
            <ToggleCard leading checked={values.isNew} onChange={(event) => set('isNew', event.target.checked)} disabled={disabled} title="New Arrival Ribbon" description="Shows in New Arrivals with a New tag." />
          </div>
        </div>
      </FormSection>
    </div>
  );
}

/** Step 2: combo contents, then the full media manager. */
export function MediaStep({ values, set, errors, disabled, library, facts }) {
  const isCombo = values.kind === 'COMBO';
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const videos = values.media.filter((item) => item.mediaType === 'VIDEO').length;
  const knownBytes = values.media.reduce((sum, item) => sum + (facts[item.url]?.bytes ?? 0), 0);
  const pictures = values.media.filter((item) => item.mediaType === 'IMAGE');
  const cover = pictures[0];
  const standards = [
    { label: 'Square 1:1 aspect ratio on the cover photo', done: isSquare(facts[cover?.url]) },
    { label: `Cover at least 1200 × 1200 px`, done: isSharp(facts[cover?.url]) },
    { label: 'At least 3 photos: angles, unboxing or in use', done: pictures.length >= 3 },
    { label: 'Alt text on every photo and video', done: values.media.length > 0 && values.media.every((item) => item.altText) },
  ];
  const standardsMet = standards.filter((item) => item.done).length;

  return (
    <div className="space-y-5">
      {isCombo ? (
        <FormSection icon="inventory" title="Combo contents" description="Choose at least two products and how many of each go in one combo." aside={<span className="text-xs text-muted">{values.comboComponents.length} products</span>}>
          <ComboEditor value={values.comboComponents} onChange={(value) => set('comboComponents', value)} disabled={disabled} />
          {errors.comboComponents ? <p role="alert" className="mt-3 text-sm text-danger">{errors.comboComponents}</p> : null}
        </FormSection>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="image" /></span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-fg">Product Media &amp; Storefront Visuals</h2>
              <p className="mt-0.5 max-w-md text-sm text-muted">Upload clear photography, short video reels and scale references. Drag cards to rearrange the customer carousel.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsAddressOpen((open) => !open)} disabled={disabled} aria-expanded={isAddressOpen} className="text-primary">
              <Icon name="link" className="h-4 w-4" /> Import URL / CDN
            </Button>
            <Button variant="primary" onClick={library.openPicker} disabled={disabled || library.isFull} loading={library.isUploading}>
              {library.isUploading ? 'Uploading…' : <><Icon name="upload" className="h-4 w-4" /> Upload Files</>}
            </Button>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-[auto_auto_1fr] sm:gap-8">
          <div><dt className="text-xs text-muted">Slots Used:</dt><dd className="text-sm font-bold text-fg">{values.media.length} / {MAX_MEDIA} Assets</dd></div>
          <div><dt className="text-xs text-muted">Video Reels:</dt><dd className="text-sm font-bold text-fg">{videos} / {MAX_VIDEOS} Max</dd></div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-muted">Gallery filled:{knownBytes ? <span className="ml-1 font-semibold text-fg">{(knownBytes / (1024 * 1024)).toFixed(1)} MB</span> : null}</dt>
            <dd className="mt-2 flex items-center gap-3">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg" aria-hidden="true"><span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${(values.media.length / MAX_MEDIA) * 100}%` }} /></span>
              <span className="text-xs font-semibold text-fg">{Math.round((values.media.length / MAX_MEDIA) * 100)}%</span>
            </dd>
          </div>
        </dl>
        {isAddressOpen ? <div className="mt-4 border-t border-line pt-4"><MediaAddressField library={library} disabled={disabled} label="Import from a public image or video address" buttonLabel="Add" /></div> : null}
      </section>

      <MediaDropzone library={library} disabled={disabled} />
      <MediaUploadNotes library={library} />
      <MediaGallery library={library} facts={facts} disabled={disabled} productName={values.name} />
      {errors.images ? <p role="alert" className="text-sm text-danger">{errors.images}</p> : null}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <header className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fg"><Icon name="staff" className="h-4 w-4 text-primary" /> DoorKart storefront standards</h3>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', standardsMet === standards.length ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>{Math.round((standardsMet / standards.length) * 100)}% Compliant</span>
        </header>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {standards.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-xs text-fg">
              <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', item.done ? 'bg-success text-white' : 'border border-line')}>{item.done ? <Icon name="check" className="h-3 w-3" /> : null}</span>
              {item.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** How healthy a margin is, in plain words. */
function marginHealth(percent) {
  if (percent < 0) return { label: 'Selling at a loss', tone: 'bg-danger-soft text-danger' };
  if (percent < 10) return { label: 'Low margin', tone: 'bg-warning-soft text-warning' };
  if (percent < 30) return { label: 'Fair margin', tone: 'bg-info-soft text-info' };
  return { label: 'Healthy', tone: 'bg-success-soft text-success' };
}

/** Step 3: price and cost, tax and packs, stock, visibility and package size. */
export function PricingStep({ values, set, errors, mode, product, pricing, disabled }) {
  const isCombo = values.kind === 'COMBO';
  const health = pricing.marginPercent === null ? null : marginHealth(pricing.marginPercent);
  const openingStock = /^\d+$/.test(values.openingStock.trim()) ? Number(values.openingStock) : 0;
  const onHand = mode === 'create' ? openingStock : product.stockQuantity;
  const reserved = mode === 'create' ? 0 : product.reservedQuantity;
  const available = onHand - reserved;
  const packs = (product?.variants ?? []).filter((pack) => pack.isActive);

  return (
    <div className="space-y-5">
      <FormSection icon="chart" title="Retail Pricing & Profit Margins" description="Configure public customer rates, your purchase cost, and the margin you keep." aside={<span className="rounded-md bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">Live margin</span>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyField label="MRP (Printed Price)" required placeholder="0" hint="Max retail packaging price" value={values.mrp} onChange={(event) => set('mrp', event.target.value)} error={errors.mrpPaise} />
          <MoneyField label="Customer Selling Price" required placeholder="0" hint={<DiscountChip pricing={pricing} />} value={values.sellingPrice} onChange={(event) => set('sellingPrice', event.target.value)} error={errors.sellingPricePaise} />
          <MoneyField label="Procurement Cost Price" placeholder="Optional" hint="Supplier invoice cost. Never shown to customers." value={values.costPrice} onChange={(event) => set('costPrice', event.target.value)} error={errors.procurementCostPaise} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-primary/15 bg-primary-soft/30 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary"><Icon name="chart" /></span>
          {health && pricing.profitPaise !== null ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide text-fg">
                  Gross margin <span className="rounded-md bg-success px-2 py-0.5 text-xs normal-case text-white">{pricing.marginPercent.toFixed(1)}% Net</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  Yields <strong className="text-fg">{formatCurrency(pricing.profitPaise)} profit</strong> per {isCombo ? 'combo' : 'unit'} before delivery costs
                  {pricing.gstRate ? <> · {formatCurrency(pricing.profitAfterGstPaise)} after {pricing.gstRate}% GST</> : null}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Margin health</p>
                <p className={cn('mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-bold', health.tone)}>{health.label}</p>
              </div>
            </>
          ) : (
            <p className="min-w-0 flex-1 text-sm text-muted">Add a selling price and the procurement cost to see the margin on every sale.</p>
          )}
        </div>

        <div className="mt-5 grid gap-4 border-t border-line pt-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-fg">Tax Compliance &amp; GST Slab</p>
              {values.hsnCode ? <span className="font-mono text-[11px] text-muted">HSN: {values.hsnCode}</span> : null}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <SelectField label="GST slab" value={values.gstRate} onChange={(event) => set('gstRate', event.target.value)} error={errors.gstRatePercent}>
                <option value="">Not set</option>
                {GST_RATES.map((rate) => <option key={rate} value={String(rate)}>{rate}% GST</option>)}
              </SelectField>
              <TextField label="HSN code" inputMode="numeric" placeholder="95030010" value={values.hsnCode} onChange={(event) => set('hsnCode', event.target.value.replace(/\D/g, ''))} error={errors.hsnCode} maxLength={8} className={cn(controlClass(errors.hsnCode), 'min-h-10 w-32 font-mono')} />
            </div>
            {pricing.gstRate !== null && pricing.priceValid ? (
              <p className="flex items-center gap-2 text-xs text-fg">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-on-primary"><Icon name="check" className="h-3 w-3" /></span>
                Customer selling price includes {pricing.gstRate}% GST ({formatCurrency(pricing.gstPaise)} embedded)
              </p>
            ) : <p className="text-xs text-muted">Prices on DoorKart include GST.</p>}
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">Multi-Pack Upsell Tiers</p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Optional</span>
            </div>
            {isCombo ? (
              <p className="mt-2 text-xs text-muted">Packs are not available for combos. Create a separate combo for each size.</p>
            ) : packs.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {packs.map((pack) => {
                  const unitPrice = pack.sellingPricePaise / pack.unitsPerPack;
                  const saving = pricing.selling ? Math.round((1 - unitPrice / pricing.selling) * 100) : 0;
                  return (
                    <li key={pack.id} className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-fg">{pack.label}</span>
                      <span className="font-semibold text-fg">{formatCurrency(pack.sellingPricePaise)}{saving > 0 ? <span className="ml-1 font-normal text-success">(Save {saving}%)</span> : null}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted">{mode === 'create' ? 'Sell a 3-pack or 10-pack at its own price. Choose Publish & add packs from the publish menu.' : 'No packs yet.'}</p>
            )}
            {mode === 'edit' && !isCombo ? <a href="#quantity-packs" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">+ Configure tier</a> : null}
          </div>
        </div>
      </FormSection>

      {isCombo ? (
        <FormSection icon="inventory" title="Shared stock" description="A combo has no stock of its own.">
          <p className="text-sm text-muted">Combos available to sell are worked out from their contents. Each order reserves the quantities listed in Combo contents.</p>
          <Link href="/inventory" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Manage component stock</Link>
        </FormSection>
      ) : (
        <FormSection icon="inventory" title="Inventory & Stock Allocation" description="Stock on your shop shelf, held by open orders, and free to sell." aside={<span className="text-xs text-muted">Total available: <span className="ml-1 rounded-md bg-fg px-2 py-0.5 font-mono font-bold text-white">{Math.max(available, 0)} Units</span></span>}>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-bg text-[10px] font-bold uppercase tracking-wider text-muted">
                <tr><th className="px-4 py-2.5">Location</th><th className="px-4 py-2.5">On hand</th><th className="px-4 py-2.5">Reserved</th><th className="px-4 py-2.5">Available</th></tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="px-4 py-3"><p className="flex items-center gap-2 font-semibold text-fg"><span className="h-2 w-2 rounded-full bg-success" /> Your shop</p><p className="pl-4 text-xs text-muted">Main store · Active</p></td>
                  <td className="px-4 py-3">
                    {mode === 'create' ? (
                      <label className="flex items-center gap-1.5">
                        <span className="sr-only">Opening stock</span>
                        <input type="number" min={0} max={MAX_UNITS} step={1} value={values.openingStock} disabled={disabled} onChange={(event) => set('openingStock', event.target.value)} aria-invalid={errors.stockQuantity ? true : undefined} className={cn(controlClass(errors.stockQuantity), 'min-h-9 w-20 text-center')} />
                        <span className="text-xs text-muted">pcs</span>
                      </label>
                    ) : <span className="font-semibold">{onHand} pcs</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{reserved} pcs</td>
                  <td className={cn('px-4 py-3 font-semibold', available <= 0 ? 'text-warning' : 'text-success')}>{available} pcs</td>
                </tr>
              </tbody>
            </table>
          </div>
          {errors.stockQuantity ? <p role="alert" className="mt-2 text-xs font-medium text-danger">Opening stock: {errors.stockQuantity}</p> : null}
          {mode === 'edit' ? <Link href="/inventory" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Adjust stock in Inventory (audited)</Link> : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fg">Low Stock Notification Threshold</p>
                <span className="rounded-md bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase text-warning">Trigger alert</span>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <input type="number" min={0} max={MAX_UNITS} step={1} aria-label="Low stock alert" value={values.lowStockThreshold} disabled={disabled} onChange={(event) => set('lowStockThreshold', event.target.value)} aria-invalid={errors.lowStockThreshold ? true : undefined} className={cn(controlClass(errors.lowStockThreshold), 'min-h-10 w-20 text-center')} />
                <p className="text-xs text-muted">Flags this product as low stock on the dashboard when available stock drops to <strong className="text-fg">{values.lowStockThreshold || 0}</strong>.</p>
              </div>
              {errors.lowStockThreshold ? <p role="alert" className="mt-2 text-xs font-medium text-danger">{errors.lowStockThreshold}</p> : null}
            </div>
            <fieldset className="rounded-xl border border-line p-4">
              <legend className="sr-only">Out-of-stock checkout behaviour</legend>
              <p className="text-sm font-semibold text-fg">Out-of-Stock Checkout Behavior</p>
              <div className="mt-3 space-y-2 text-xs">
                <label className="flex cursor-pointer items-start gap-2">
                  <input type="radio" name="out-of-stock" checked={!values.allowBackorder} onChange={() => set('allowBackorder', false)} disabled={disabled} className="mt-0.5 h-4 w-4 accent-primary" />
                  <span className="text-fg">Strict zero: Mark product &quot;Sold Out&quot; at 0 units</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input type="radio" name="out-of-stock" checked={values.allowBackorder} onChange={() => set('allowBackorder', true)} disabled={disabled} className="mt-0.5 h-4 w-4 accent-primary" />
                  <span className="text-fg">Accept backorders: customers see &quot;Ships after restock&quot;; deliver once stock is added</span>
                </label>
              </div>
              {errors.allowBackorder ? <p role="alert" className="mt-2 text-xs font-medium text-danger">{errors.allowBackorder}</p> : null}
            </fieldset>
          </div>
        </FormSection>
      )}

      <FormSection icon="eye" title="Storefront Visibility" description="Where customers find this product in the DoorKart app." aside={<Switch checked={values.isActive} onChange={(event) => set('isActive', event.target.checked)} disabled={disabled} label={values.isActive ? 'Active Live' : 'Hidden'} />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleCard icon="star" checked={values.isFeatured} onChange={(event) => set('isFeatured', event.target.checked)} disabled={disabled} title="Featured Placement" description="Showcase on the home screen in Popular Products." />
          <ToggleCard icon="bell" checked={values.isNew} onChange={(event) => set('isNew', event.target.checked)} disabled={disabled} title="New Arrival Ribbon" description="Listed in New Arrivals with a New tag." />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-fg">Sales channels</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line p-3">
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-fg text-white"><Icon name="phone" className="h-4 w-4" /></span>
            <span><span className="block text-sm font-semibold text-fg">DoorKart iOS &amp; Android App</span><span className="block text-xs text-muted">Cash on delivery in your delivery areas</span></span>
          </span>
          <span className={cn('text-xs font-bold', values.isActive ? 'text-success' : 'text-muted')}>{values.isActive ? 'Active' : 'Hidden'}</span>
        </div>
        {!values.isActive ? <p className="mt-3 text-xs text-warning">Hidden products are saved but customers cannot see or order them.</p> : null}
      </FormSection>

      <FormSection icon="delivery" title="Logistics Dimensions" description="Weight and packed size, for planning deliveries. All optional.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <UnitField label="Weight" unit="g" placeholder="420" value={values.weight} onChange={(event) => set('weight', event.target.value)} error={errors.weightGrams} />
          <UnitField label="Length" unit="cm" placeholder="22" value={values.length} onChange={(event) => set('length', event.target.value)} error={errors.lengthMm} />
          <UnitField label="Width" unit="cm" placeholder="18" value={values.width} onChange={(event) => set('width', event.target.value)} error={errors.widthMm} />
          <UnitField label="Height" unit="cm" placeholder="8" value={values.height} onChange={(event) => set('height', event.target.value)} error={errors.heightMm} />
        </div>
      </FormSection>
    </div>
  );
}
