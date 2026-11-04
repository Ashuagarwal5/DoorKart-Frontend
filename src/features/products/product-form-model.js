import { describeMediaProblem } from '@/components/products/media-manager';
import { describeApiError } from '@/services/api/api-error';
import { MAX_PAISE, paiseToRupeeInput, parseRupeesToPaise } from '@/utils/money';

/**
 * Everything the product form knows about its data, apart from how it looks: the starting
 * values, the checks run before a request, and the conversion to what the API accepts.
 */

export const MAX_UNITS = 1_000_000;
export const NAME_LIMIT = 200;
export const GST_RATES = [0, 5, 12, 18, 28];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HSN_PATTERN = /^(\d{4}|\d{6}|\d{8})$/;
/** Up to 1,000 kg and 10 m, matching the backend. */
const MAX_WEIGHT_GRAMS = 1_000_000;
const MAX_SIDE_MM = 10_000;

export const STEPS = [
  { title: 'Product basics', fields: ['name', 'description', 'categoryId', 'sku', 'slug', 'brand'] },
  { title: 'Media & contents', fields: ['images', 'comboComponents'] },
  {
    title: 'Pricing, stock & visibility',
    fields: ['mrpPaise', 'sellingPricePaise', 'procurementCostPaise', 'gstRatePercent', 'hsnCode', 'stockQuantity', 'lowStockThreshold', 'allowBackorder', 'weightGrams', 'lengthMm', 'widthMm', 'heightMm'],
  },
];

export const FIELD_LABELS = {
  name: 'Name', description: 'Description', categoryId: 'Category', sku: 'SKU', slug: 'Product URL', brand: 'Brand',
  images: 'Photos and videos', comboComponents: 'Combo contents',
  mrpPaise: 'MRP', sellingPricePaise: 'Selling price', procurementCostPaise: 'Cost price', gstRatePercent: 'GST slab', hsnCode: 'HSN code',
  stockQuantity: 'Opening stock', lowStockThreshold: 'Low stock alert', allowBackorder: 'Out-of-stock behaviour',
  weightGrams: 'Weight', lengthMm: 'Length', widthMm: 'Width', heightMm: 'Height',
};

export const stepForField = (field) => Math.max(0, STEPS.findIndex((step) => step.fields.includes(field)));

/** 225 (mm) -> "22.5" (cm). */
const mmToCmInput = (mm) => (mm == null ? '' : String(mm / 10));
const numberInput = (value) => (value == null ? '' : String(value));

/**
 * "22.5" (cm) -> 225 (mm); '' -> null; anything else -> undefined (invalid). Whole
 * millimetres keep the stored value an integer, so at most one decimal is accepted.
 */
export function parseCmToMm(text) {
  const cleaned = text.trim();
  if (cleaned === '') return null;
  if (!/^\d+(\.\d)?$/.test(cleaned)) return undefined;
  const [whole, tenth = '0'] = cleaned.split('.');
  return Number(whole) * 10 + Number(tenth);
}

/** A whole number from a text box; '' -> null; anything else -> undefined (invalid). */
export function parseWholeNumber(text) {
  const cleaned = text.trim();
  if (cleaned === '') return null;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : undefined;
}

export function initialValues(product) {
  return {
    kind: product?.kind ?? 'STANDARD',
    comboComponents: product?.comboComponents ?? [],
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    brand: product?.brand ?? '',
    sku: product?.sku ?? '',
    mrp: product ? paiseToRupeeInput(product.mrpPaise) : '',
    sellingPrice: product ? paiseToRupeeInput(product.sellingPricePaise) : '',
    costPrice: product?.procurementCostPaise == null ? '' : paiseToRupeeInput(product.procurementCostPaise),
    gstRate: numberInput(product?.gstRatePercent),
    hsnCode: product?.hsnCode ?? '',
    openingStock: '0',
    lowStockThreshold: product ? String(product.lowStockThreshold) : '5',
    allowBackorder: product?.allowBackorder ?? false,
    weight: numberInput(product?.weightGrams),
    length: mmToCmInput(product?.lengthMm),
    width: mmToCmInput(product?.widthMm),
    height: mmToCmInput(product?.heightMm),
    isFeatured: product?.isFeatured ?? false,
    isNew: product?.isNew ?? false,
    isActive: product?.isActive ?? true,
    media: product?.images.map((image) => ({ url: image.url, mediaType: image.mediaType, altText: image.altText })) ?? [],
  };
}

/** Prices worked out from the form, or null where a field is blank or invalid. */
export function pricingSummary(values) {
  const mrp = parseRupeesToPaise(values.mrp);
  const selling = parseRupeesToPaise(values.sellingPrice);
  const cost = values.costPrice.trim() === '' ? null : parseRupeesToPaise(values.costPrice);
  const gstRate = values.gstRate === '' ? null : Number(values.gstRate);
  const priceValid = mrp !== null && selling !== null && selling <= mrp && mrp <= MAX_PAISE;

  const discountPercent = priceValid && mrp > 0 ? Math.round(((mrp - selling) / mrp) * 100) : 0;
  // Selling prices include GST, so the tax inside one is price × rate / (100 + rate).
  const gstPaise = priceValid && gstRate ? Math.round((selling * gstRate) / (100 + gstRate)) : 0;
  const profitPaise = priceValid && cost !== null ? selling - cost : null;
  const profitAfterGstPaise = profitPaise === null ? null : profitPaise - gstPaise;
  const marginPercent = profitPaise !== null && selling > 0 ? (profitPaise / selling) * 100 : null;

  return { mrp, selling, cost, gstRate, priceValid, discountPercent, gstPaise, profitPaise, profitAfterGstPaise, marginPercent };
}

/**
 * Catches the obvious mistakes before a request is made. The backend checks everything
 * again and is the authority: this only saves a round trip for typos.
 */
export function validate(values, mode) {
  const errors = {};
  const isCombo = values.kind === 'COMBO';

  if (values.name.trim() === '') errors.name = 'Enter the product name.';
  if (values.description.trim() === '') errors.description = 'Enter a description.';
  if (values.categoryId === '') errors.categoryId = 'Choose a category.';
  if (values.sku.trim() === '') {
    errors.sku = 'Enter a SKU.';
  } else if (!/^[A-Za-z0-9._-]+$/.test(values.sku.trim())) {
    errors.sku = 'Use only letters, digits, dot, underscore and dash.';
  }
  if (values.slug.trim() !== '' && !SLUG_PATTERN.test(values.slug.trim())) {
    errors.slug = 'Use lower-case letters, digits and single dashes.';
  }

  const { mrp, selling, cost } = pricingSummary(values);
  if (mrp === null || mrp > MAX_PAISE) errors.mrpPaise = 'Enter an amount in rupees, like 199 or 199.50.';
  if (selling === null || selling > MAX_PAISE) errors.sellingPricePaise = 'Enter an amount in rupees, like 149 or 149.50.';
  if (mrp !== null && selling !== null && !errors.mrpPaise && !errors.sellingPricePaise && selling > mrp) {
    errors.sellingPricePaise = 'The selling price cannot be higher than the MRP.';
  }
  if (values.costPrice.trim() !== '' && (cost === null || cost > MAX_PAISE)) {
    errors.procurementCostPaise = 'Enter an amount in rupees, like 99 or 99.50, or leave it blank.';
  }
  if (values.hsnCode.trim() !== '' && !HSN_PATTERN.test(values.hsnCode.trim())) {
    errors.hsnCode = 'An HSN code is 4, 6 or 8 digits.';
  }

  const isUnitCount = (text) => /^\d+$/.test(text.trim()) && Number(text) <= MAX_UNITS;
  if (!isCombo && !isUnitCount(values.lowStockThreshold)) errors.lowStockThreshold = 'Enter a whole number, 0 or more.';
  if (mode === 'create' && !isCombo && !isUnitCount(values.openingStock)) {
    errors.stockQuantity = 'Enter a whole number, 0 or more.';
  }

  const weight = parseWholeNumber(values.weight);
  if (weight === undefined || weight === 0 || weight > MAX_WEIGHT_GRAMS) errors.weightGrams = 'Enter whole grams, above 0, or leave it blank.';
  for (const [key, field] of [['length', 'lengthMm'], ['width', 'widthMm'], ['height', 'heightMm']]) {
    const mm = parseCmToMm(values[key]);
    if (mm === undefined || mm === 0 || mm > MAX_SIDE_MM) errors[field] = 'Enter centimetres above 0, like 22 or 22.5, or leave it blank.';
  }

  const mediaProblem = describeMediaProblem(values.media);
  if (mediaProblem) errors.images = mediaProblem;

  if (isCombo && (values.comboComponents.length < 2 || values.comboComponents.some((c) => !Number.isInteger(c.quantity) || c.quantity < 1 || c.quantity > 10000))) {
    errors.comboComponents = 'Choose at least two products with valid whole quantities.';
  }
  return errors;
}

/** The product as the form describes it, ready for the create endpoint. */
export function toCreateInput(values) {
  const isCombo = values.kind === 'COMBO';
  const { mrp, selling, cost, gstRate } = pricingSummary(values);
  return {
    kind: values.kind,
    ...(isCombo ? { comboComponents: values.comboComponents.map(({ productId, quantity }) => ({ productId, quantity })) } : {}),
    name: values.name.trim(),
    slug: values.slug.trim() || undefined,
    description: values.description.trim(),
    categoryId: values.categoryId,
    brand: values.brand.trim() || null,
    sku: values.sku.trim(),
    mrpPaise: mrp ?? 0,
    sellingPricePaise: selling ?? 0,
    procurementCostPaise: cost,
    gstRatePercent: gstRate,
    hsnCode: values.hsnCode.trim() || null,
    stockQuantity: isCombo ? 0 : Number(values.openingStock),
    lowStockThreshold: isCombo ? 0 : Number(values.lowStockThreshold),
    allowBackorder: isCombo ? false : values.allowBackorder,
    weightGrams: parseWholeNumber(values.weight) ?? null,
    lengthMm: parseCmToMm(values.length) ?? null,
    widthMm: parseCmToMm(values.width) ?? null,
    heightMm: parseCmToMm(values.height) ?? null,
    isFeatured: values.isFeatured,
    isNew: values.isNew,
    isActive: values.isActive,
    images: values.media.map((item) => ({ url: item.url, mediaType: item.mediaType, altText: item.altText })),
  };
}

const UPDATABLE_FIELDS = [
  'name', 'description', 'categoryId', 'brand', 'sku', 'mrpPaise', 'sellingPricePaise', 'procurementCostPaise',
  'gstRatePercent', 'hsnCode', 'lowStockThreshold', 'allowBackorder', 'weightGrams', 'lengthMm', 'widthMm', 'heightMm',
  'isFeatured', 'isNew', 'isActive',
];

/**
 * Only the fields the admin actually changed, so nothing else is touched. Each field is
 * compared with what the form started from, not with the raw product: a field the server
 * did not send (an older backend) starts at its default and is not sent unless edited.
 */
export function toUpdateInput(values, product) {
  const next = toCreateInput(values);
  const start = toCreateInput({ ...initialValues(product), kind: values.kind });
  const changes = {};
  if (values.kind === 'COMBO' && JSON.stringify(next.comboComponents) !== JSON.stringify(product.comboComponents.map(({ productId, quantity }) => ({ productId, quantity })))) {
    changes.comboComponents = next.comboComponents;
  }
  if (next.slug && next.slug !== product.slug) changes.slug = next.slug;
  for (const field of UPDATABLE_FIELDS) {
    // A combo has no stock settings of its own, so they are never sent for one.
    if (values.kind === 'COMBO' && (field === 'lowStockThreshold' || field === 'allowBackorder')) continue;
    if (next[field] !== start[field]) changes[field] = next[field];
  }
  // The media list is only sent if it was edited, because sending it replaces the whole list.
  if (JSON.stringify(values.media) !== JSON.stringify(initialValues(product).media)) changes.images = next.images;
  return changes;
}

/** Puts a server refusal on the field it is about; anything else becomes a message on top. */
export function explainFailure(error) {
  if (error.code === 'VALIDATION_ERROR') {
    // A backend older than this panel refuses fields it has never heard of: say so plainly,
    // since no change to the form can fix it.
    const unknown = Object.values(error.fieldErrors).map((message) => /^Unrecognized keys?: (.+)$/.exec(message)?.[1]).find(Boolean);
    if (unknown) {
      const names = unknown.replace(/"/g, '').split(/,\s*/).map((key) => FIELD_LABELS[key] ?? key).join(', ');
      return { fields: {}, message: `The DoorKart server is older than this admin panel and does not accept: ${names}. Update the backend and run its database migrations, then save again.` };
    }
    const fields = {};
    for (const [key, message] of Object.entries(error.fieldErrors)) {
      // "images.0.url" and the like all belong to the one pictures-and-videos section.
      fields[key.startsWith('images') ? 'images' : key.startsWith('comboComponents') ? 'comboComponents' : key] = message;
    }
    return { fields, message: Object.keys(fields).length === 0 ? describeApiError(error) : null };
  }
  const byCode = {
    DUPLICATE_SKU: 'sku',
    DUPLICATE_SLUG: 'slug',
    CATEGORY_NOT_FOUND: 'categoryId',
    BACKORDERS_OPEN: 'allowBackorder',
  };
  const field = byCode[error.code];
  return field ? { fields: { [field]: error.message }, message: null } : { fields: {}, message: describeApiError(error) };
}

/** A starting SKU built from the name and category, e.g. "TOY-WOODEN-BLOC-4821". */
export function suggestSku(name, categoryName) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const prefix = (categoryName ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const stem = words.slice(0, 2).map((word) => word.slice(0, 6)).join('-');
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return [prefix, stem || 'ITEM', suffix].filter(Boolean).join('-');
}
