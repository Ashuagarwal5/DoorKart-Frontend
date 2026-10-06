import { describe, expect, it } from 'vitest';

import { formatCurrency, MAX_PAISE, paiseToRupeeInput, parseRupeesToPaise } from '@/utils/money';

describe('formatCurrency', () => {
  it('shows whole rupees without decimals and uses Indian digit grouping', () => {
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency(14900)).toBe('₹149');
    expect(formatCurrency(12345600)).toBe('₹1,23,456');
    expect(formatCurrency(100_000_000)).toBe('₹10,00,000');
  });

  it('shows paise when there are any, always as two digits', () => {
    expect(formatCurrency(14950)).toBe('₹149.50');
    expect(formatCurrency(5)).toBe('₹0.05');
    expect(formatCurrency(10001)).toBe('₹100.01');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-14950)).toBe('-₹149.50');
  });
});

describe('parseRupeesToPaise', () => {
  it('converts what an admin types into exact integer paise', () => {
    expect(parseRupeesToPaise('149')).toBe(14900);
    expect(parseRupeesToPaise('149.5')).toBe(14950);
    expect(parseRupeesToPaise('149.50')).toBe(14950);
    expect(parseRupeesToPaise('0.05')).toBe(5);
    expect(parseRupeesToPaise('1,499')).toBe(149900);
    expect(parseRupeesToPaise('₹ 30')).toBe(3000);
    expect(parseRupeesToPaise('  30  ')).toBe(3000);
  });

  it('is exact where floating point is not (0.1 + 0.2 style traps)', () => {
    // Number('19.99') * 100 is 1998.9999999999998 in floating point.
    expect(parseRupeesToPaise('19.99')).toBe(1999);
    expect(parseRupeesToPaise('1.15')).toBe(115);
    expect(parseRupeesToPaise('4.35')).toBe(435);
    expect(parseRupeesToPaise('8.2')).toBe(820);
  });

  it('rejects anything that is not a clean amount instead of guessing', () => {
    for (const input of ['', ' ', 'abc', '12.345', '-5', '1e3', '12.', '.5', '1.2.3', '₹', '12 34']) {
      expect(parseRupeesToPaise(input), JSON.stringify(input)).toBeNull();
    }
  });

  it('never returns a non-integer', () => {
    for (const input of ['0', '0.01', '99.99', '123456.78']) {
      expect(Number.isInteger(parseRupeesToPaise(input))).toBe(true);
    }
  });

  it('reads back what it wrote', () => {
    for (const paise of [0, 5, 100, 14950, 99999, MAX_PAISE]) {
      expect(parseRupeesToPaise(paiseToRupeeInput(paise))).toBe(paise);
    }
  });
});

describe('paiseToRupeeInput', () => {
  it('fills a field with the shortest exact form', () => {
    expect(paiseToRupeeInput(14900)).toBe('149');
    expect(paiseToRupeeInput(14950)).toBe('149.50');
    expect(paiseToRupeeInput(5)).toBe('0.05');
  });
});
