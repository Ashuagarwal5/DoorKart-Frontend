import { describe, expect, it } from 'vitest';

import { explainFailure, initialValues, parseCmToMm, pricingSummary, suggestSku, toCreateInput, toUpdateInput, validate } from '@/features/products/product-form-model';
import { ApiError } from '@/services/api/api-error';

const filled = (overrides = {}) => ({
  ...initialValues(),
  name: 'Wooden Blocks',
  description: 'Thirty-two blocks.',
  categoryId: 'cat-1',
  sku: 'WB-001',
  mrp: '1299',
  sellingPrice: '899',
  ...overrides,
});

describe('pricingSummary', () => {
  it('works out discount, embedded GST and margin in whole paise', () => {
    const summary = pricingSummary(filled({ costPrice: '420', gstRate: '12' }));
    expect(summary.discountPercent).toBe(31);
    // 89900 × 12 / 112 = 9632.14…
    expect(summary.gstPaise).toBe(9632);
    expect(summary.profitPaise).toBe(47900);
    expect(summary.profitAfterGstPaise).toBe(47900 - 9632);
    expect(summary.marginPercent).toBeCloseTo(53.28, 1);
  });

  it('has no margin without a cost price', () => {
    expect(pricingSummary(filled()).marginPercent).toBeNull();
  });
});

describe('parseCmToMm', () => {
  it('turns centimetres into whole millimetres', () => {
    expect(parseCmToMm('22')).toBe(220);
    expect(parseCmToMm('22.5')).toBe(225);
    expect(parseCmToMm('')).toBeNull();
    expect(parseCmToMm('22.55')).toBeUndefined();
    expect(parseCmToMm('abc')).toBeUndefined();
  });
});

describe('validate', () => {
  it('accepts a complete product with the optional details left blank', () => {
    expect(validate(filled(), 'create')).toEqual({});
  });

  it('flags malformed optional details', () => {
    const errors = validate(filled({ costPrice: '4.205', hsnCode: '12345', weight: '0', length: '1.25' }), 'create');
    expect(Object.keys(errors).sort()).toEqual(['hsnCode', 'lengthMm', 'procurementCostPaise', 'weightGrams']);
  });
});

describe('toCreateInput', () => {
  it('sends paise, millimetres and nulls for blanks', () => {
    const input = toCreateInput(filled({ costPrice: '420', gstRate: '12', hsnCode: '9503', weight: '420', length: '22.5', allowBackorder: true }));
    expect(input).toMatchObject({
      mrpPaise: 129900,
      sellingPricePaise: 89900,
      procurementCostPaise: 42000,
      gstRatePercent: 12,
      hsnCode: '9503',
      weightGrams: 420,
      lengthMm: 225,
      widthMm: null,
      allowBackorder: true,
    });
  });

  it('never asks a combo to take backorders', () => {
    expect(toCreateInput(filled({ kind: 'COMBO', allowBackorder: true })).allowBackorder).toBe(false);
  });
});

describe('toUpdateInput', () => {
  const product = {
    kind: 'STANDARD', comboComponents: [], name: 'Wooden Blocks', slug: 'wooden-blocks', description: 'Thirty-two blocks.',
    categoryId: 'cat-1', brand: null, sku: 'WB-001', mrpPaise: 129900, sellingPricePaise: 89900, procurementCostPaise: null,
    gstRatePercent: 12, hsnCode: null, lowStockThreshold: 5, allowBackorder: false, weightGrams: null, lengthMm: 220,
    widthMm: null, heightMm: null, isFeatured: false, isNew: false, isActive: true, images: [],
  };

  it('sends nothing when nothing changed', () => {
    expect(toUpdateInput(initialValues(product), product)).toEqual({});
  });

  it('sends nothing for fields an older server did not return', () => {
    const olderProduct = Object.fromEntries(Object.entries(product).filter(([key]) => !['brand', 'allowBackorder', 'gstRatePercent'].includes(key)));
    expect(toUpdateInput({ ...initialValues(olderProduct), sellingPrice: '799' }, olderProduct)).toEqual({ sellingPricePaise: 79900 });
  });

  it('sends only the changed fields, including cleared ones', () => {
    const values = { ...initialValues(product), gstRate: '', costPrice: '400', length: '22.5' };
    expect(toUpdateInput(values, product)).toEqual({ gstRatePercent: null, procurementCostPaise: 40000, lengthMm: 225 });
  });
});

describe('suggestSku', () => {
  it('builds an allowed SKU from the category and name', () => {
    expect(suggestSku('Wooden Toys for Kids!', 'Toys')).toMatch(/^TOY-WOODEN-TOYS-\d{4}$/);
    expect(suggestSku('', undefined)).toMatch(/^ITEM-\d{4}$/);
  });
});

describe('explainFailure', () => {
  it('explains a refusal from a backend that does not know the new fields', () => {
    const error = new ApiError('VALIDATION_ERROR', 'Invalid request', { details: [{ field: '', message: 'Unrecognized keys: "brand", "allowBackorder"' }] });
    const failure = explainFailure(error);
    expect(failure.fields).toEqual({});
    expect(failure.message).toMatch(/older than this admin panel.*Brand, Out-of-stock behaviour.*migrations/);
  });
});
