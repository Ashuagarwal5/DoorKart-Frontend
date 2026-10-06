'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { describeMediaProblem, type MediaItem, MediaManager } from '@/components/products/media-manager';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField, SelectField, TextArea, TextField } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { createProduct, updateProduct } from '@/services/api/admin-api';
import { ApiError, describeApiError, type FieldErrors } from '@/services/api/api-error';
import type { Category, Product, ProductCreateInput, ProductUpdateInput } from '@/types/api';
import { formatCurrency, MAX_PAISE, paiseToRupeeInput, parseRupeesToPaise } from '@/utils/money';

const MAX_UNITS = 1_000_000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type FormValues = {
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
  if (!isUnitCount(values.lowStockThreshold)) errors['lowStockThreshold'] = 'Enter a whole number, 0 or more.';
  if (mode === 'create' && !isUnitCount(values.openingStock)) {
    errors['stockQuantity'] = 'Enter a whole number, 0 or more.';
  }

  const mediaProblem = describeMediaProblem(values.media);
  if (mediaProblem) errors['images'] = mediaProblem;

  return errors;
}

/** The product as the form describes it, ready for the create endpoint. */
function toCreateInput(values: FormValues): ProductCreateInput {
  return {
    name: values.name.trim(),
    slug: values.slug.trim() || undefined,
    description: values.description.trim(),
    categoryId: values.categoryId,
    sku: values.sku.trim(),
    mrpPaise: parseRupeesToPaise(values.mrp) ?? 0,
    sellingPricePaise: parseRupeesToPaise(values.sellingPrice) ?? 0,
    stockQuantity: Number(values.openingStock),
    lowStockThreshold: Number(values.lowStockThreshold),
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
      fields[key.startsWith('images') ? 'images' : key] = message;
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

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || isUploading) {
      return;
    }

    const found = validate(values, mode);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
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
        await createProduct(toCreateInput(values));
        toast.success('Product created.');
      }
      router.push('/products');
    } catch (error) {
      const failure = explainFailure(error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.'));
      setErrors(failure.fields);
      setFormError(failure.message);
      setIsSaving(false);
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

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {formError ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <Card title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            required
            fieldClassName="sm:col-span-2"
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            error={errors['name']}
            maxLength={200}
          />
          <TextField
            label="SKU"
            required
            hint="Your own code for this product. Must be unique."
            value={values.sku}
            onChange={(event) => set('sku', event.target.value)}
            error={errors['sku']}
            maxLength={64}
          />
          <TextField
            label="Slug"
            hint={mode === 'create' ? 'Optional. Leave blank to build it from the name.' : 'Used in the product’s web address.'}
            value={values.slug}
            onChange={(event) => set('slug', event.target.value)}
            error={errors['slug']}
            maxLength={100}
          />
          <SelectField
            label="Category"
            required
            fieldClassName="sm:col-span-2"
            value={values.categoryId}
            onChange={(event) => set('categoryId', event.target.value)}
            error={errors['categoryId']}>
            <option value="">Choose a category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </SelectField>
          <TextArea
            label="Description"
            required
            fieldClassName="sm:col-span-2"
            rows={4}
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            error={errors['description']}
            maxLength={5000}
          />
        </div>
      </Card>

      <Card title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="MRP (₹)"
            required
            inputMode="decimal"
            hint="The printed maximum retail price."
            value={values.mrp}
            onChange={(event) => set('mrp', event.target.value)}
            error={errors['mrpPaise']}
          />
          <TextField
            label="Selling price (₹)"
            required
            inputMode="decimal"
            hint={
              mrp !== null && selling !== null && selling <= mrp && mrp > 0
                ? `${Math.round(((mrp - selling) / mrp) * 100)}% off the MRP (${formatCurrency(selling)} vs ${formatCurrency(mrp)})`
                : 'What the customer pays. It cannot be more than the MRP.'
            }
            value={values.sellingPrice}
            onChange={(event) => set('sellingPrice', event.target.value)}
            error={errors['sellingPricePaise']}
          />
        </div>
      </Card>

      <Card title="Stock">
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === 'create' ? (
            <TextField
              label="Opening stock"
              inputMode="numeric"
              hint="Units on the shelf now. Later changes are made on the Inventory page."
              value={values.openingStock}
              onChange={(event) => set('openingStock', event.target.value)}
              error={errors['stockQuantity']}
            />
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-fg">Current stock</p>
              <p className="text-fg">
                {product.stockQuantity} on hand · {product.reservedQuantity} reserved · {product.availableQuantity}{' '}
                available
              </p>
              <p className="text-xs text-muted">
                Stock is changed with an adjustment, so every change is recorded.{' '}
                <Link href="/inventory" className="text-primary hover:underline">
                  Go to Inventory
                </Link>
              </p>
            </div>
          )}
          <TextField
            label="Low stock threshold"
            inputMode="numeric"
            hint="Warn when available units reach this number."
            value={values.lowStockThreshold}
            onChange={(event) => set('lowStockThreshold', event.target.value)}
            error={errors['lowStockThreshold']}
          />
        </div>
      </Card>

      <Card title="Pictures and videos">
        <MediaManager
          value={values.media}
          onChange={(media) => set('media', media)}
          onUploadingChange={setIsUploading}
          error={errors['images']}
          disabled={isSaving}
        />
      </Card>

      <Card title="Visibility">
        <div className="space-y-4">
          <CheckboxField
            label="Active"
            hint="Inactive products are hidden from customers. Past orders are not affected."
            checked={values.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
          />
          <CheckboxField
            label="Featured"
            hint="Shown in Popular Products on the home screen."
            checked={values.isFeatured}
            onChange={(event) => set('isFeatured', event.target.checked)}
          />
          <CheckboxField
            label="New"
            hint="Shown in New Arrivals on the home screen."
            checked={values.isNew}
            onChange={(event) => set('isNew', event.target.checked)}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={() => router.push('/products')} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSaving} disabled={isUploading}>
          {mode === 'create' ? 'Create product' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
