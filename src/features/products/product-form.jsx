'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { isSharp, isSquare, MediaFileInput, useMediaFacts, useMediaLibrary } from '@/components/products/media-manager';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { orderCategories } from '@/features/categories/category-tree';
import { useSectionScroll } from '@/hooks/use-section-scroll';
import { createProduct, updateProduct } from '@/services/api/admin-api';
import { ApiError } from '@/services/api/api-error';
import { cn } from '@/utils/cn';
import { Checklist } from './product-form-parts';
import { BasicsStep, MediaStep, PricingStep } from './product-form-steps';
import { explainFailure, FIELD_LABELS, initialValues, pricingSummary, STEPS, stepForField, toCreateInput, toUpdateInput, validate } from './product-form-model';
import { ProductPreview } from './product-preview';
import { useProductDraft } from './use-product-draft';

const LAST_STEP = STEPS.length - 1;
const STEP_TITLES = ['Product Basics & Details', 'Media Assets & Contents', 'Pricing, Stock & Visibility'];
const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** "12s ago", "3 min ago", or the time for anything older than an hour. Refreshes itself. */
function useTimeAgo(time) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!time) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [time]);
  if (!time) return null;
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `at ${timeFormatter.format(time)}`;
}

/** The publish button and its menu of other ways to save. */
function PublishControl({ mode, isCombo, isSaving, isUploading, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [isOpen]);

  const text = label ?? (mode === 'edit' ? 'Save changes' : isCombo ? 'Publish Combo' : 'Publish Product');
  // Only creating has other ways to save; an edit keeps its own visibility switch.
  const options = mode === 'create'
    ? [
        ...(!isCombo ? [{ value: 'packs', title: 'Publish & add packs', description: 'Save, then set 3-pack or 10-pack prices.' }] : []),
        { value: 'hidden', title: 'Save as hidden', description: 'Keep it out of the store for now.' },
      ]
    : [];

  return (
    <div ref={root} className="relative flex" onKeyDown={(event) => event.key === 'Escape' && setIsOpen(false)}>
      <Button type="submit" variant="primary" value="publish" loading={isSaving} disabled={isUploading} className={options.length ? 'rounded-r-none' : undefined}>
        {text} <Icon name="rocket" className="h-4 w-4" />
      </Button>
      {options.length ? (
        <>
          <button type="button" aria-label="More ways to save" aria-haspopup="menu" aria-expanded={isOpen} disabled={isSaving || isUploading} onClick={() => setIsOpen((open) => !open)} className="inline-flex min-h-10 items-center rounded-r-lg border-l border-white/25 bg-primary px-2.5 text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
            <Icon name="chevronDown" className="h-4 w-4" />
          </button>
          {isOpen ? (
            <div role="menu" className="absolute bottom-full right-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg">
              {options.map((option) => (
                <button key={option.value} type="submit" role="menuitem" value={option.value} onClick={() => setIsOpen(false)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-bg">
                  <span className="block text-sm font-semibold text-fg">{option.title}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** The three steps across the top: done ones can be revisited, the current one is filled in blue. */
function StepBar({ activeStep, completed, goTo, disabled, mediaCount, navRef }) {
  return (
    <nav ref={navRef} aria-label="Product setup steps" className="grid scroll-mt-24 gap-2 rounded-2xl border border-line bg-surface p-2 md:grid-cols-3">
      {STEP_TITLES.map((title, index) => {
        const isActive = activeStep === index;
        const isDone = completed[index];
        const status = isActive ? null : isDone ? (index < activeStep ? 'Completed' : 'Ready') : index > activeStep ? 'Upcoming' : 'Needs details';
        const activeTag = index === 1 ? `${mediaCount} assets` : index === LAST_STEP ? 'Final step' : 'Active step';
        return (
          <button key={title} type="button" disabled={disabled} aria-current={isActive ? 'step' : undefined} onClick={() => goTo(index)} className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors', isActive ? 'bg-primary text-on-primary shadow-md' : 'hover:bg-bg')}>
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold', isActive ? 'bg-white/20' : isDone ? 'bg-success text-white' : 'bg-bg text-muted ring-1 ring-line')}>
              {isDone && !isActive ? <Icon name="check" className="h-4 w-4" /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider', isActive ? 'text-white/80' : 'text-muted')}>
                Step {index + 1}
                {isActive ? <span>· Active</span> : status === 'Completed' ? <span className="rounded bg-success-soft px-1 text-success">Completed</span> : status === 'Upcoming' ? <span className="font-medium normal-case tracking-normal">Upcoming</span> : null}
              </span>
              <span className={cn('block truncate text-sm font-semibold', !isActive && 'text-fg')}>{title}</span>
            </span>
            {isActive ? (
              <span className="hidden shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary lg:inline">{activeTag}</span>
            ) : status === 'Completed' ? (
              <Icon name="edit" className="h-4 w-4 shrink-0 text-muted" />
            ) : (
              <span className={cn('hidden shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide lg:inline', status === 'Ready' ? 'bg-success-soft text-success' : 'text-muted')}>{status === 'Upcoming' ? (isDone ? 'Ready' : 'Needs details') : status}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function ProductForm({ categories, mode, product }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState(() => initialValues(product));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isPristine, setIsPristine] = useState(true);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const draft = useProductDraft(values, { enabled: mode === 'create', isPristine });
  const draftAge = useTimeAgo(draft.savedAt);
  const stepPanel = useRef(null);
  const stepNavigation = useRef(null);
  const errorSummary = useRef(null);
  useSectionScroll(activeStep, stepNavigation, stepPanel);

  const set = (key, value) => {
    setIsPristine(false);
    setValues((current) => ({ ...current, [key]: value }));
  };
  const library = useMediaLibrary({
    value: values.media,
    update: (change) => {
      setIsPristine(false);
      setValues((current) => ({ ...current, media: change(current.media) }));
    },
    onUploadingChange: setIsUploading,
  });
  const facts = useMediaFacts(values.media);

  const showErrors = () => requestAnimationFrame(() => errorSummary.current?.focus());
  const goTo = (step) => {
    setActiveStep(step);
    setFormError(null);
  };

  const nextStep = () => {
    const found = Object.fromEntries(Object.entries(validate(values, mode)).filter(([field]) => STEPS[activeStep].fields.includes(field)));
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) showErrors();
    else setActiveStep((current) => Math.min(current + 1, LAST_STEP));
  };

  const saveDraft = () => {
    if (draft.saveNow()) toast.success('Draft saved in this browser.');
    else toast.error(draft.storedDraft ? 'Restore or discard the earlier draft first.' : 'This browser could not keep a draft.');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving || isUploading) return;
    const intent = event.nativeEvent.submitter?.value ?? 'publish';

    const toSave = intent === 'hidden' ? { ...values, isActive: false } : values;
    const found = validate(toSave, mode);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      setActiveStep(stepForField(Object.keys(found)[0]));
      showErrors();
      return;
    }

    setIsSaving(true);
    try {
      if (mode === 'edit') {
        const changes = toUpdateInput(toSave, product);
        if (Object.keys(changes).length === 0) {
          toast.success('Nothing was changed.');
          router.push('/products');
          return;
        }
        await updateProduct(product.id, changes);
        toast.success('Product updated.');
      } else {
        const created = await createProduct(toCreateInput(toSave));
        draft.clear();
        toast.success(intent === 'hidden' ? 'Product saved as hidden.' : 'Product published.');
        if (intent === 'packs' && toSave.kind === 'STANDARD') {
          router.push('/products/' + created.id + '/edit');
          return;
        }
      }
      router.push('/products');
    } catch (error) {
      const failure = explainFailure(error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.'));
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length) setActiveStep(stepForField(Object.keys(failure.fields)[0]));
      setFormError(failure.message);
      setIsSaving(false);
      showErrors();
    }
  };

  if (categories.length === 0) {
    return (
      <Card>
        <p className="text-sm text-fg">
          A product needs a category, and there are none yet.{' '}
          <Link href="/categories" className="text-primary hover:underline">Create a category first</Link>.
        </p>
      </Card>
    );
  }

  const isCombo = values.kind === 'COMBO';
  const pricing = pricingSummary(values);
  const category = categories.find((item) => item.id === values.categoryId);
  const categoryLabel = orderCategories(categories).find((entry) => entry.category.id === values.categoryId)?.label ?? null;
  const validation = validate(values, mode);
  const completed = STEPS.map((step) => !step.fields.some((field) => validation[field]));
  const allComplete = completed.every(Boolean);
  const errorEntries = Object.entries(errors);
  const isBusy = isSaving || isUploading;
  const sku = values.sku.trim();

  // What the preview's stock line shows: the opening stock while creating, the live balance when editing.
  const previewAvailable = isCombo ? null : mode === 'edit' ? product.availableQuantity : /^\d+$/.test(values.openingStock.trim()) ? Number(values.openingStock) : null;
  const lowStockThreshold = Number(values.lowStockThreshold) || 0;
  const previewProps = { values, pricing, categoryLabel, available: previewAvailable, lowStockThreshold };

  const pictures = values.media.filter((item) => item.mediaType === 'IMAGE');
  const coverFacts = pictures[0] ? facts[pictures[0].url] : undefined;
  const mediaChecks = [
    { label: 'Primary cover photo set', detail: coverFacts?.width ? `${coverFacts.width}×${coverFacts.height} cover${coverFacts.format ? ` · ${coverFacts.format}` : ''}` : 'The first picture, shown in every listing.', done: pictures.length > 0 },
    { label: '3+ angle visuals uploaded', detail: 'Includes scale, unboxing, and flat-lay angles.', done: pictures.length >= 3, optional: true },
    { label: 'Short video reel attached', detail: 'Helps customers judge size and use.', done: values.media.some((item) => item.mediaType === 'VIDEO'), optional: true },
    { label: 'Alt text & accessibility complete', detail: `${values.media.filter((item) => item.altText).length} of ${values.media.length} items described for screen readers.`, done: values.media.length > 0 && values.media.every((item) => item.altText), optional: true },
  ];
  const launchChecks = [
    { label: 'Step 1: Product basics & taxonomy', done: completed[0], status: 'Verified', onSelect: () => goTo(0) },
    { label: `Step 2: ${values.media.length} media asset${values.media.length === 1 ? '' : 's'} uploaded`, done: completed[1] && (isCombo || pictures.length > 0), status: 'Synced', optional: !isCombo && completed[1], onSelect: () => goTo(1) },
    { label: 'Step 3: Pricing & stock set', done: completed[2], status: 'Configured', onSelect: () => goTo(2) },
    { label: 'Tax HSN & GST rate validated', done: pricing.gstRate !== null && /^\d{4,8}$/.test(values.hsnCode), status: pricing.gstRate !== null ? `${pricing.gstRate}% GST` : 'Set', optional: true, onSelect: () => goTo(2) },
  ];
  const stockNote = isCombo
    ? 'Combo stock follows its contents: each order reserves the listed quantities.'
    : previewAvailable === null ? null
    : previewAvailable > 0 ? `${previewAvailable} unit${previewAvailable === 1 ? '' : 's'} ready on your shelf, so orders can be delivered right away${values.isFeatured ? ' and it shows in Popular Products' : ''}.`
    : values.allowBackorder ? 'No stock yet: customers can still order, and see “Ships after restock”.'
    : 'No stock yet: customers will see it as Sold out until you add stock.';

  const draftBadge = mode === 'create' && draftAge ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
      <Icon name="check" className="h-3 w-3" /> Draft saved {draftAge}
    </span>
  ) : null;

  return (
    <form
      onSubmit={submit}
      // Enter in a text box would otherwise publish from any step.
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'checkbox' && event.target.type !== 'radio') event.preventDefault();
      }}
      noValidate
      className="space-y-6">
      <MediaFileInput library={library} disabled={isSaving} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/products" className="font-medium text-primary hover:underline">← Back to Products Catalog</Link>
            {sku ? <span className="font-mono text-xs text-muted">· SKU: {sku}</span> : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-fg">{mode === 'edit' ? 'Edit Product' : 'Add New Product'}</h1>
            {mode === 'create' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Auto-saving enabled
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">Create a single SKU or bundle combo, upload high-res media, and configure inventory &amp; store visibility.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsFullPreviewOpen(true)}><Icon name="eye" className="h-4 w-4" /> Full Preview</Button>
          {mode === 'create' ? <Button onClick={saveDraft} disabled={isBusy}><Icon name="check" className="h-4 w-4 text-primary" /> <span className="text-primary">Save Draft</span></Button> : null}
        </div>
      </header>

      {draft.storedDraft ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-info/25 bg-info-soft px-4 py-3 text-sm text-fg">
          <p><strong>Unsaved draft found</strong> from {timeFormatter.format(draft.storedDraft.savedAt)}. Restore it to carry on, or discard it to start fresh.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={draft.discard}>Discard</Button>
            <Button size="sm" variant="primary" onClick={() => {
              const restored = draft.restore();
              if (restored) {
                setValues({ ...initialValues(), ...restored });
                setIsPristine(false);
              }
            }}>Restore draft</Button>
          </div>
        </div>
      ) : null}

      <StepBar activeStep={activeStep} completed={completed} goTo={goTo} disabled={isBusy} mediaCount={values.media.length} navRef={stepNavigation} />

      {formError || errorEntries.length > 0 ? (
        <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
          <p className="font-semibold">{formError ?? 'Check these details before saving'}</p>
          {errorEntries.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errorEntries.map(([key, message]) => (
                <li key={key}>
                  <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => goTo(stepForField(key))}>{FIELD_LABELS[key] ?? 'Product details'}: {message}</button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={stepPanel} tabIndex={-1} aria-label={STEP_TITLES[activeStep]} className="min-w-0 space-y-5 focus:outline-none">
          <fieldset disabled={isSaving} className="min-w-0">
            <div hidden={activeStep !== 0}>
              <BasicsStep values={values} set={set} errors={errors} mode={mode} product={product} categories={categories} categoryName={category?.name} pricing={pricing} library={library} facts={facts} disabled={isSaving} />
            </div>
            <div hidden={activeStep !== 1}>
              <MediaStep values={values} set={set} errors={errors} disabled={isSaving} library={library} facts={facts} />
            </div>
            <div hidden={activeStep !== 2}>
              <PricingStep values={values} set={set} errors={errors} mode={mode} product={product} pricing={pricing} disabled={isSaving} />
            </div>
          </fieldset>

          {activeStep === 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium', values.media.length ? 'bg-success-soft text-success' : 'bg-bg text-muted')}>
                  <Icon name="check" className="h-3.5 w-3.5" /> {values.media.length ? `All ${values.media.length} media assets kept in this ${mode === 'create' ? 'draft' : 'edit'}` : 'No media added yet'}
                </span>
                {sku ? <span className="font-mono text-muted">SKU {sku}</span> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push('/products')} disabled={isBusy}>Cancel</Button>
                <Button onClick={() => goTo(0)} disabled={isBusy}>← Back to Basics (Step 1)</Button>
                <Button variant="primary" onClick={nextStep} disabled={isBusy}>Save &amp; Continue to Pricing (Step 3) →</Button>
              </div>
            </div>
          ) : null}

          {activeStep === LAST_STEP ? (
            <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4', allComplete ? 'border-success/25 bg-success-soft/40' : 'border-line bg-surface')}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', allComplete ? 'bg-success text-white' : 'bg-bg text-muted')}><Icon name="rocket" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{allComplete ? `Step 3 of 3 Complete • Product Ready for ${mode === 'edit' ? 'Saving' : 'Live Launch'}` : 'Step 3 of 3 • A few details still need attention'}</p>
                  <p className="text-xs text-muted">{allComplete ? 'All details are checked here and again by the server when you save.' : 'Use the launch readiness list to jump to what is missing.'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => router.push('/products')} disabled={isBusy}>Cancel</Button>
                <Button onClick={() => goTo(1)} disabled={isBusy}>← Back to Media</Button>
                <PublishControl mode={mode} isCombo={isCombo} isSaving={isSaving} isUploading={isUploading} label={mode === 'edit' ? 'Save changes' : 'Publish Product to Live Store'} />
              </div>
            </div>
          ) : null}
        </div>

        <aside aria-label="Product preview and checks" className="space-y-4 xl:sticky xl:top-24">
          {activeStep === 0 ? (
            <>
              <ProductPreview {...previewProps} variant="card" />
              <Checklist title="Before you save" items={STEP_TITLES.map((title, index) => ({ label: ['Product basics', 'Media & assets', 'Pricing & visibility'][index], done: completed[index], status: index === 1 && values.media.length ? `Ready (${values.media.length} file${values.media.length === 1 ? '' : 's'})` : 'Ready', onSelect: () => goTo(index) }))} footer="Preview is a live draft. Changes reach customers once you click Publish." disabled={isBusy} />
              {mode === 'create' && !isCombo ? (
                <div className="rounded-2xl border border-primary/15 bg-primary-soft/40 p-4 text-xs leading-relaxed text-muted">
                  <p className="flex items-center gap-2 font-semibold text-primary"><Icon name="bulb" className="h-4 w-4" /> Selling quantity packs?</p>
                  <p className="mt-1.5">On Step 3, choose <strong className="text-fg">Publish &amp; add packs</strong> from the publish menu to set dedicated prices for a 3-pack, 10-pack, or custom carton size.</p>
                </div>
              ) : null}
            </>
          ) : activeStep === 1 ? (
            <>
              <ProductPreview {...previewProps} variant="phone" onFullPreview={() => setIsFullPreviewOpen(true)} />
              <Checklist title="Media quality checklist" items={mediaChecks} badge="ready" />
              {coverFacts?.width ? (
                <p className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 text-muted"><Icon name="image" className="h-4 w-4" /> Cover photo</span>
                  <span className={cn('font-semibold', isSquare(coverFacts) && isSharp(coverFacts) ? 'text-success' : 'text-warning')}>{isSquare(coverFacts) && isSharp(coverFacts) ? 'Square & sharp' : !isSquare(coverFacts) ? 'Not square' : 'Below 1200 px'}</span>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <ProductPreview {...previewProps} variant="dark" onFullPreview={() => setIsFullPreviewOpen(true)} />
              <Checklist title="Catalog launch readiness" items={launchChecks} badge="percent" showProgress disabled={isBusy} />
              {stockNote ? (
                <p className="flex gap-2 rounded-2xl border border-info/20 bg-info-soft/60 p-4 text-xs leading-relaxed text-fg">
                  <Icon name="info" className="h-4 w-4 text-info" />
                  <span><strong className="text-info">Stock check:</strong> {stockNote}</span>
                </p>
              ) : null}
            </>
          )}
        </aside>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur-sm sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-sm font-bold text-fg">Step {activeStep + 1} of {STEPS.length}</p>
          <p role="status" className={cn('text-xs text-muted', !isBusy && 'hidden 2xl:block')}>
            {isUploading ? 'Media is uploading. Please wait.' : isSaving ? 'Saving your product…' : activeStep === LAST_STEP && allComplete ? 'Ready for catalog activation.' : 'Your entries stay intact as you navigate between steps.'}
          </p>
          {draftBadge}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => router.push('/products')} disabled={isBusy}>Cancel</Button>
          <Button disabled={isBusy || activeStep === 0} onClick={() => goTo(activeStep - 1)}>{activeStep === 0 ? 'Back' : `← Back: ${['', 'Step 1', 'Media'][activeStep]}`}</Button>
          {mode === 'create' && activeStep === 1 ? <Button onClick={saveDraft} disabled={isBusy}><span className="text-primary">Save Draft</span></Button> : null}
          {activeStep < LAST_STEP ? (
            <button type="button" disabled={isBusy} onClick={nextStep} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary/25 bg-primary-soft/50 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50">
              {activeStep === 0 ? 'Save & Next: Media →' : 'Next: Pricing (Step 3) →'}
            </button>
          ) : null}
          <PublishControl mode={mode} isCombo={isCombo} isSaving={isSaving} isUploading={isUploading} />
        </div>
      </div>

      <Modal open={isFullPreviewOpen} onClose={() => setIsFullPreviewOpen(false)} title="Full storefront preview" wide="xl">
        <ProductPreview {...previewProps} variant="phone" initialView="mobile" large />
        <p className="mt-3 text-xs text-muted">Switch between the DoorKart app and the web storefront with the toggle above.</p>
      </Modal>
    </form>
  );
}
