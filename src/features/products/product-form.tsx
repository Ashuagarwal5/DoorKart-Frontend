'use client';
import { ComboEditor, type ComboSelection } from './combo-editor';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useRef, useState } from 'react';

import { describeMediaProblem, type MediaItem, MediaManager } from '@/components/products/media-manager';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Card } from '@/components/ui/card';
import { CheckboxField, SelectField, TextArea, TextField } from '@/components/ui/field';
import { useSectionScroll } from '@/hooks/use-section-scroll';
import { useToast } from '@/components/ui/toast';
import { createProduct, updateProduct } from '@/services/api/admin-api';
import { resolveMediaUrl } from '@/services/api/config';
import { ApiError, describeApiError, type FieldErrors } from '@/services/api/api-error';
import type { Category, Product, ProductCreateInput, ProductUpdateInput } from '@/types/api';
import { formatCurrency, MAX_PAISE, paiseToRupeeInput, parseRupeesToPaise } from '@/utils/money';

const MAX_UNITS = 1_000_000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type FormValues = {
  kind: 'STANDARD' | 'COMBO';
  comboComponents: ComboSelection[];
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  sku: string;
  mrp: string;
  sellingPrice: string;
  openingStock: string;
  lowStockThreshold: string;
  isFeatured: boolean;
  isNew: boolean;
  isActive: boolean;
  /** Pictures and videos in display order. */
  media: MediaItem[];
};

/** Keys are the backend's field names, so server errors and local ones share one place. */
type Errors = FieldErrors;

function initialValues(product?: Product): FormValues {
  return {
    kind: product?.kind ?? 'STANDARD',
    comboComponents: product?.comboComponents ?? [],
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    sku: product?.sku ?? '',
    mrp: product ? paiseToRupeeInput(product.mrpPaise) : '',
    sellingPrice: product ? paiseToRupeeInput(product.sellingPricePaise) : '',
    openingStock: '0',
    lowStockThreshold: product ? String(product.lowStockThreshold) : '5',
    isFeatured: product?.isFeatured ?? false,
    isNew: product?.isNew ?? false,
    isActive: product?.isActive ?? true,
    media: product?.images.map((image) => ({ url: image.url, mediaType: image.mediaType, altText: image.altText })) ?? [],
  };
}

/**
 * Catches the obvious mistakes before a request is made. The backend checks everything
 * again and is the authority: this only saves a round trip for typos.
 */
function validate(values: FormValues, mode: 'create' | 'edit'): Errors {
  const errors: Errors = {};

  if (values.name.trim() === '') errors['name'] = 'Enter the product name.';
  if (values.description.trim() === '') errors['description'] = 'Enter a description.';
  if (values.categoryId === '') errors['categoryId'] = 'Choose a category.';
  if (values.sku.trim() === '') {
    errors['sku'] = 'Enter a SKU.';
  } else if (!/^[A-Za-z0-9._-]+$/.test(values.sku.trim())) {
    errors['sku'] = 'Use only letters, digits, dot, underscore and dash.';
  }
  if (values.slug.trim() !== '' && !SLUG_PATTERN.test(values.slug.trim())) {
    errors['slug'] = 'Use lower-case letters, digits and single dashes.';
  }

  const mrp = parseRupeesToPaise(values.mrp);
  const selling = parseRupeesToPaise(values.sellingPrice);
  if (mrp === null || mrp > MAX_PAISE) errors['mrpPaise'] = 'Enter an amount in rupees, like 199 or 199.50.';
  if (selling === null || selling > MAX_PAISE) errors['sellingPricePaise'] = 'Enter an amount in rupees, like 149 or 149.50.';
  if (mrp !== null && selling !== null && !errors['mrpPaise'] && !errors['sellingPricePaise'] && selling > mrp) {
    errors['sellingPricePaise'] = 'The selling price cannot be higher than the MRP.';
  }

  const isUnitCount = (text: string) => /^\d+$/.test(text.trim()) && Number(text) <= MAX_UNITS;
  if (values.kind === 'STANDARD' && !isUnitCount(values.lowStockThreshold)) errors['lowStockThreshold'] = 'Enter a whole number, 0 or more.';
  if (mode === 'create' && values.kind === 'STANDARD' && !isUnitCount(values.openingStock)) {
    errors['stockQuantity'] = 'Enter a whole number, 0 or more.';
  }

  const mediaProblem = describeMediaProblem(values.media);
  if (mediaProblem) errors['images'] = mediaProblem;

  if (values.kind === 'COMBO' && (values.comboComponents.length < 2 || values.comboComponents.some(c => !Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > 10000))) errors['comboComponents'] = 'Choose at least two products with valid whole quantities.';
  return errors;
}

/** The product as the form describes it, ready for the create endpoint. */
function toCreateInput(values: FormValues): ProductCreateInput {
  return {
    kind: values.kind,
    ...(values.kind === 'COMBO' ? {comboComponents: values.comboComponents.map(({productId,quantity})=>({productId,quantity}))} : {}),
    name: values.name.trim(),
    slug: values.slug.trim() || undefined,
    description: values.description.trim(),
    categoryId: values.categoryId,
    sku: values.sku.trim(),
    mrpPaise: parseRupeesToPaise(values.mrp) ?? 0,
    sellingPricePaise: parseRupeesToPaise(values.sellingPrice) ?? 0,
    stockQuantity: values.kind === 'COMBO' ? 0 : Number(values.openingStock),
    lowStockThreshold: values.kind === 'COMBO' ? 0 : Number(values.lowStockThreshold),
    isFeatured: values.isFeatured,
    isNew: values.isNew,
    isActive: values.isActive,
    images: values.media.map((item) => ({ url: item.url, mediaType: item.mediaType, altText: item.altText })),
  };
}

/** Only the fields the admin actually changed, so nothing else is touched. */
function toUpdateInput(values: FormValues, product: Product): ProductUpdateInput {
  const next = toCreateInput(values);
  const changes: ProductUpdateInput = {};
  if (values.kind === 'COMBO' && JSON.stringify(next.comboComponents) !== JSON.stringify(product.comboComponents.map(({productId,quantity})=>({productId,quantity})))) changes.comboComponents = next.comboComponents;

  if (next.name !== product.name) changes.name = next.name;
  if (next.slug && next.slug !== product.slug) changes.slug = next.slug;
  if (next.description !== product.description) changes.description = next.description;
  if (next.categoryId !== product.categoryId) changes.categoryId = next.categoryId;
  if (next.sku !== product.sku) changes.sku = next.sku;
  if (next.mrpPaise !== product.mrpPaise) changes.mrpPaise = next.mrpPaise;
  if (next.sellingPricePaise !== product.sellingPricePaise) changes.sellingPricePaise = next.sellingPricePaise;
  if (next.lowStockThreshold !== product.lowStockThreshold) changes.lowStockThreshold = next.lowStockThreshold;
  if (next.isFeatured !== product.isFeatured) changes.isFeatured = next.isFeatured;
  if (next.isNew !== product.isNew) changes.isNew = next.isNew;
  if (next.isActive !== product.isActive) changes.isActive = next.isActive;
  // The media list is only sent if it was edited, because sending it replaces the whole list.
  if (JSON.stringify(values.media) !== JSON.stringify(initialValues(product).media)) changes.images = next.images;

  return changes;
}

/** Puts a server refusal on the field it is about; anything else becomes a message on top. */
function explainFailure(error: ApiError): { fields: Errors; message: string | null } {
  if (error.code === 'VALIDATION_ERROR') {
    const fields: Errors = {};
    for (const [key, message] of Object.entries(error.fieldErrors)) {
      // "images.0.url" and the like all belong to the one pictures-and-videos section.
      fields[key.startsWith('images') ? 'images' : key.startsWith('comboComponents') ? 'comboComponents' : key] = message;
    }
    return { fields, message: Object.keys(fields).length === 0 ? describeApiError(error) : null };
  }
  const byCode: Record<string, string> = {
    DUPLICATE_SKU: 'sku',
    DUPLICATE_SLUG: 'slug',
    CATEGORY_NOT_FOUND: 'categoryId',
  };
  const field = byCode[error.code];
  return field ? { fields: { [field]: error.message }, message: null } : { fields: {}, message: describeApiError(error) };
}

type ProductFormProps = { categories: Category[] } & (
  | { mode: 'create'; product?: undefined }
  | { mode: 'edit'; product: Product }
);

export function ProductForm({ categories, mode, product }: ProductFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<FormValues>(() => initialValues(product));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const stepPanel = useRef<HTMLDivElement>(null);
  const stepNavigation = useRef<HTMLElement>(null);
  useSectionScroll(activeStep, stepNavigation, stepPanel);
  const steps = ['Product basics', 'Media & contents', 'Pricing & visibility'];
  const stepFields = [
    ['name', 'description', 'categoryId', 'sku', 'slug'],
    ['images', 'comboComponents'],
    ['mrpPaise', 'sellingPricePaise', 'stockQuantity', 'lowStockThreshold'],
  ];
  const stepForField = (field: string) => Math.max(0, stepFields.findIndex(fields => fields.includes(field)));
  const nextStep = () => {
    const found = Object.fromEntries(Object.entries(validate(values, mode)).filter(([field]) => stepFields[activeStep]?.includes(field)));
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) showErrors();
    else setActiveStep(current => Math.min(current + 1, 2));
  };
  const errorSummary = useRef<HTMLDivElement>(null);
  const showErrors = () => requestAnimationFrame(() => errorSummary.current?.focus());

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || isUploading) {
      return;
    }

    if (activeStep < 2) { nextStep(); return; }
    const found = validate(values, mode);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      setActiveStep(stepForField(Object.keys(found)[0]!));
      showErrors();
      return;
    }

    setIsSaving(true);
    try {
      if (mode === 'edit') {
        const changes = toUpdateInput(values, product);
        if (Object.keys(changes).length === 0) {
          toast.success('Nothing was changed.');
          router.push('/products');
          return;
        }
        await updateProduct(product.id, changes);
        toast.success('Product updated.');
      } else {
        const created = await createProduct(toCreateInput(values));
        toast.success('Product created.');
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        if (values.kind === 'STANDARD' && submitter instanceof HTMLButtonElement && submitter.value === 'packs') {
          router.push('/products/' + created.id + '/edit');
          return;
        }
      }
      router.push('/products');
    } catch (error) {
      const failure = explainFailure(error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.'));
      setErrors(failure.fields);
      if (Object.keys(failure.fields).length) setActiveStep(stepForField(Object.keys(failure.fields)[0]!));
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
          <Link href="/categories" className="text-primary hover:underline">
            Create a category first
          </Link>
          .
        </p>
      </Card>
    );
  }

  const mrp = parseRupeesToPaise(values.mrp);
  const selling = parseRupeesToPaise(values.sellingPrice);

  const isCombo = values.kind === 'COMBO';
  const priceValid = mrp !== null && selling !== null && selling <= mrp && mrp <= MAX_PAISE && selling <= MAX_PAISE;
  const categoryName = categories.find(category => category.id === values.categoryId)?.name;
  const errorEntries = Object.entries(errors);
  const fieldLabels: Record<string, string> = {name: 'Name', description: 'Description', categoryId: 'Category', sku: 'SKU', slug: 'Product URL', mrpPaise: 'MRP', sellingPricePaise: 'Selling price', stockQuantity: 'Opening stock', lowStockThreshold: 'Low stock alert', images: 'Photos and videos', comboComponents: 'Combo contents'};

  const validation = validate(values, mode);
  const basicsComplete = !stepFields[0]!.some(field => validation[field]);
  const contentsComplete = !stepFields[1]!.some(field => validation[field]);
  const pricingComplete = !stepFields[2]!.some(field => validation[field]);
  const completed = [basicsComplete, contentsComplete, pricingComplete];
  const firstImage = values.media.find(item => item.mediaType === 'IMAGE');

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <nav ref={stepNavigation} aria-label="Product setup steps" className="grid gap-2 rounded-2xl border border-line bg-surface p-2 sm:grid-cols-3">
        {steps.map((step, index) => <button key={step} type="button" disabled={isSaving || isUploading} aria-current={activeStep === index ? 'step' : undefined} onClick={() => { setActiveStep(index); setFormError(null); }} className={'flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ' + (activeStep === index ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-bg')}>
          <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ' + (activeStep === index ? 'bg-white/20 text-white' : completed[index] ? 'bg-success-soft text-success' : 'bg-bg text-muted')}>{completed[index] ? <span aria-label="Complete">✓</span> : index + 1}</span>
          <span><span className="block text-xs opacity-75">Step {index + 1}</span><span className="block text-sm font-semibold">{step}</span></span>
        </button>)}
      </nav>
      {(formError || errorEntries.length > 0) && (
        <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
          <p className="font-semibold">{formError ?? 'Check these details before saving'}</p>
          {errorEntries.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{errorEntries.map(([key, message]) => <li key={key}>{fieldLabels[key] ?? 'Product details'}: {message}</li>)}</ul>}
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={stepPanel} tabIndex={-1} aria-label={steps[activeStep]} className="min-w-0 scroll-mt-28 focus:outline-none">
          <fieldset disabled={isSaving} className="min-w-0 space-y-5">
            <div hidden={activeStep !== 0} className="space-y-5">
              <div className="mb-5"><h2 className="text-lg font-semibold">Start with the essentials</h2><p className="mt-1 text-sm text-muted">Choose what you sell and give customers the details they need.</p></div>
              <Card title={mode === 'create' ? 'What are you adding?' : 'Product type'}>
          {mode === 'create' ? (
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Product type</legend>
              {([
                {kind: 'STANDARD', title: 'Single product', description: 'Sell individually, with optional quantity packs.', icon: 'products'},
                {kind: 'COMBO', title: 'Combo pack', description: 'Bundle multiple products at one selling price.', icon: 'inventory'},
              ] as const).map(option => (
                <label key={option.kind} className={'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-5 transition-colors ' + (values.kind === option.kind ? 'border-primary bg-primary-soft/30 shadow-sm' : 'border-line hover:bg-bg')}>
                  <input type="radio" name="product-kind" value={option.kind} checked={values.kind === option.kind} onChange={() => set('kind', option.kind)} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
                  <Icon name={option.icon} className="h-7 w-7 text-primary" />
                  <span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-1 block text-xs text-muted">{option.description}</span></span>
                </label>
              ))}
            </fieldset>
          ) : <p className="text-sm text-muted">{isCombo ? 'Combo pack' : 'Single product'} - product type stays fixed to preserve purchase history.</p>}
        </Card>
              <Card title={isCombo ? 'Combo details' : 'Product details'}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label={isCombo ? 'Combo name' : 'Product name'} required fieldClassName="sm:col-span-2" placeholder={isCombo ? 'e.g. Back to School Essentials' : 'e.g. A5 Spiral Notebook'} value={values.name} onChange={event => set('name', event.target.value)} error={errors.name} maxLength={200} />
                <SelectField label="Category" required value={values.categoryId} onChange={event => set('categoryId', event.target.value)} error={errors.categoryId}>
                  <option value="">Choose a category</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}{category.isActive ? '' : ' (inactive)'}</option>)}
                </SelectField>
                <TextField label="SKU" required placeholder={isCombo ? 'e.g. COMBO-SCHOOL-01' : 'e.g. NOTEBOOK-A5-01'} hint="Your unique product code." value={values.sku} onChange={event => set('sku', event.target.value)} error={errors.sku} maxLength={64} />
                <TextArea label="Description" required fieldClassName="sm:col-span-2" rows={3} placeholder="Describe what customers receive, its size and key features." value={values.description} onChange={event => set('description', event.target.value)} error={errors.description} maxLength={5000} />
              </div>
              <details open={errors.slug ? true : undefined} className="mt-4 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted">Custom product URL (optional)</summary>
                <div className="mt-3"><TextField label="Slug" hint={mode === 'create' ? 'Leave blank to generate it from the product name.' : 'Used in this product’s web address.'} placeholder="e.g. a5-spiral-notebook" value={values.slug} onChange={event => set('slug', event.target.value)} error={errors.slug} maxLength={100} /></div>
              </details>
            </Card>
            </div>
            <div hidden={activeStep !== 1} className="space-y-5">
              <div className="mb-5"><h2 className="text-lg font-semibold">Show what customers will receive</h2><p className="mt-1 text-sm text-muted">{isCombo ? 'Choose the combo contents, then add photos and videos.' : 'Add clear photos and optional videos. You can add media later too.'}</p></div>
              {isCombo && <Card title="Combo contents" action={<span className="text-xs text-muted">{values.comboComponents.length} products</span>}>
              <ComboEditor value={values.comboComponents} onChange={value => set('comboComponents', value)} disabled={isSaving} />
              {errors.comboComponents && <p role="alert" className="mt-3 text-sm text-danger">{errors.comboComponents}</p>}
            </Card>}

            <Card title="Photos and videos" action={<span className="text-xs text-muted">{values.media.length} / 10</span>}>
              <p className="mb-4 text-xs text-muted">The first photo is the main product image. Upload files or add an image address.</p>
              <MediaManager value={values.media} onChange={media => set('media', media)} onUploadingChange={setIsUploading} error={errors.images} disabled={isSaving} />
            </Card>
            </div>
            <div hidden={activeStep !== 2} className="space-y-5">
              <div className="mb-5"><h2 className="text-lg font-semibold">Set the price and store visibility</h2><p className="mt-1 text-sm text-muted">Review your product preview before saving.</p></div>
              <div className="grid items-start gap-5 lg:grid-cols-2">
              <Card title={isCombo ? 'Combo pricing' : 'Pricing'}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <TextField label="MRP (₹)" required inputMode="decimal" placeholder="0.00" hint={isCombo ? 'MRP for the complete combo.' : 'MRP for one unit.'} value={values.mrp} onChange={event => set('mrp', event.target.value)} error={errors.mrpPaise} />
                <TextField label="Selling price (₹)" required inputMode="decimal" placeholder="0.00" hint={isCombo ? 'What customers pay for one complete combo.' : 'What customers pay for one unit.'} value={values.sellingPrice} onChange={event => set('sellingPrice', event.target.value)} error={errors.sellingPricePaise} />
              </div>
              {priceValid && mrp > 0 && <p className="mt-4 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">{Math.round((mrp - selling) / mrp * 100)}% discount - customers save {formatCurrency(mrp - selling)}</p>}
            </Card>

            {isCombo ? <Card title="Shared stock"><p className="text-sm text-muted">Available combos come from their included products. Each purchase reserves the quantities listed in Combo contents.</p><Link href="/inventory" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Manage component stock</Link></Card> : <Card title="Inventory">
              <div className="space-y-4">
                {mode === 'create' ? <TextField label="Opening stock" type="number" min={0} max={MAX_UNITS} step={1} hint="Physical units currently on hand." value={values.openingStock} onChange={event => set('openingStock', event.target.value)} error={errors.stockQuantity} /> : <div className="rounded-lg bg-bg p-3 text-sm"><p className="font-semibold">{product.availableQuantity} available</p><p className="mt-1 text-xs text-muted">{product.stockQuantity} on hand / {product.reservedQuantity} reserved</p><Link href="/inventory" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Adjust stock in Inventory</Link></div>}
                <TextField label="Low stock alert" type="number" min={0} max={MAX_UNITS} step={1} hint="Warn when available stock reaches this number." value={values.lowStockThreshold} onChange={event => set('lowStockThreshold', event.target.value)} error={errors.lowStockThreshold} />
              </div>
            </Card>}

            <Card title="Visibility">
              <div className="space-y-4">
                <CheckboxField label="Active in store" hint="Customers can find and order this product." checked={values.isActive} onChange={event => set('isActive', event.target.checked)} />
                <CheckboxField label="Featured product" hint="Show in Popular Products." checked={values.isFeatured} onChange={event => set('isFeatured', event.target.checked)} />
                <CheckboxField label="New arrival" hint="Show in New Arrivals." checked={values.isNew} onChange={event => set('isNew', event.target.checked)} />
              </div>
            </Card>
              </div>
            </div>
          </fieldset>
        </div>
        <aside aria-label="Live product preview" className="space-y-4 xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted">Store preview</p><span className={'rounded-full px-2.5 py-1 text-[11px] font-medium ' + (values.isActive ? 'bg-success-soft text-success' : 'bg-bg text-muted')}>{values.isActive ? 'Active on save' : 'Hidden on save'}</span></div>
            <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-primary-soft/70 to-bg">
              {firstImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={resolveMediaUrl(firstImage.url)} alt={firstImage.altText ?? 'Product preview'} className="h-full w-full object-contain p-5" />
              ) : <div className="text-center"><Icon name={isCombo ? 'inventory' : 'products'} className="mx-auto h-14 w-14 text-primary/35"/><p className="mt-3 text-xs text-muted">Your main photo appears here</p></div>}
              <span className="absolute bottom-3 left-3 rounded-lg bg-surface/90 px-2.5 py-1 text-xs font-semibold text-primary">{isCombo ? 'Combo pack' : 'Single product'}</span>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-xs font-medium text-primary">{categoryName ?? 'Product category'}</p>
              <h3 className="break-words text-lg font-semibold leading-snug">{values.name.trim() || 'Your product name'}</h3>
              {priceValid ? <div className="flex flex-wrap items-center gap-2"><span className="text-2xl font-bold">{formatCurrency(selling)}</span>{mrp > selling && <><span className="text-sm text-muted line-through">{formatCurrency(mrp)}</span><span className="rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">{Math.round((mrp-selling)/mrp*100)}% off</span></>}</div> : <p className="text-sm text-muted">Add pricing to complete your preview</p>}
              {values.description.trim() && <p className="line-clamp-3 break-words text-sm text-muted">{values.description}</p>}
              {isCombo && <p className="border-t border-line pt-3 text-xs text-muted">{values.comboComponents.length} products in this combo / {values.comboComponents.reduce((sum,item)=>sum+item.quantity,0)} total units</p>}
              <div className="flex flex-wrap gap-2">{values.isFeatured && <span className="rounded-full bg-primary-soft px-2 py-1 text-xs text-primary">Featured</span>}{values.isNew && <span className="rounded-full bg-warning-soft px-2 py-1 text-xs text-warning">New arrival</span>}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5"><p className="mb-3 text-sm font-semibold">Before you save</p><ul className="space-y-3">{steps.map((step,index)=><li key={step}><button type="button" disabled={isSaving || isUploading} onClick={()=>setActiveStep(index)} className="flex w-full items-center justify-between gap-2 text-left text-xs"><span className="text-muted">{step}</span><span className={completed[index] ? 'font-medium text-success' : 'text-muted'}>{completed[index] ? 'Ready' : 'Needs details'}</span></button></li>)}</ul><p className="mt-4 border-t border-line pt-3 text-xs text-muted">Preview is a draft. Changes reach customers after you save.</p></div>
          {mode === 'create' && !isCombo && <p className="rounded-xl bg-primary-soft/40 px-4 py-3 text-xs leading-relaxed text-muted"><strong className="text-primary">Selling quantity packs?</strong> On the last step, choose Create &amp; add packs to save this product and set prices for a 3-pack, 10-pack, or another quantity.</p>}
        </aside>
      </div>
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-lg backdrop-blur-sm">
        <div><p className="text-sm font-semibold">Step {activeStep + 1} of 3</p><p role="status" className="mt-0.5 text-xs text-muted">{isUploading ? 'Media is uploading. Please wait.' : isSaving ? 'Saving your product...' : 'Your entries stay intact as you switch steps.'}</p></div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => router.push('/products')} disabled={isSaving || isUploading}>Cancel</Button>
          {activeStep > 0 && <Button disabled={isSaving || isUploading} onClick={()=>setActiveStep(current=>current-1)}>Back</Button>}
          {activeStep < 2 ? <Button variant="primary" disabled={isSaving || isUploading} onClick={nextStep}>Continue <span aria-hidden="true">→</span></Button> : <>
            <Button type="submit" variant="primary" loading={isSaving} disabled={isUploading}>{mode === 'create' ? isCombo ? 'Create combo' : 'Create product' : 'Save changes'}</Button>
            {mode === 'create' && !isCombo && <Button type="submit" name="next" value="packs" disabled={isSaving || isUploading}>Create &amp; add packs</Button>}
          </>}
        </div>
      </div>
    </form>
  );
}
