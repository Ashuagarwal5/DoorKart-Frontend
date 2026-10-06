/**
 * Money is always integer paise (₹149.50 = 14950), exactly as the backend stores and returns
 * it. Nothing here uses floating point: amounts are split into whole rupees and paise with
 * integer arithmetic, so there is no rounding to go wrong.
 */

const rupeeFormatter = new Intl.NumberFormat('en-IN');

/** 14900 -> "₹149", 14950 -> "₹149.50", 12345600 -> "₹1,23,456". */
export function formatCurrency(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const absolute = Math.abs(paise);
  const rupees = Math.trunc(absolute / 100);
  const remainder = absolute % 100;
  const fraction = remainder === 0 ? '' : `.${String(remainder).padStart(2, '0')}`;
  return `${sign}₹${rupeeFormatter.format(rupees)}${fraction}`;
}

/** The ceiling the backend accepts for any single amount: ₹10,00,000 in paise. */
export const MAX_PAISE = 100_000_000;

/**
 * What the admin typed into a rupee field, as integer paise; null if it is not a valid
 * amount. Accepts "149", "149.5", "149.50", "1,499" and a leading "₹". It deliberately
 * rejects anything with more than two decimals instead of rounding it.
 */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.trim().replace(/^₹\s*/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const [whole = '0', fraction = ''] = cleaned.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** For filling a rupee field from stored paise: 14900 -> "149", 14950 -> "149.50". */
export function paiseToRupeeInput(paise: number): string {
  const rupees = Math.trunc(paise / 100);
  const remainder = paise % 100;
  return remainder === 0 ? String(rupees) : `${rupees}.${String(remainder).padStart(2, '0')}`;
}
