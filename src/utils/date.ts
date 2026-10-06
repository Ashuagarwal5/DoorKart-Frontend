/**
 * Every timestamp from the backend is UTC. The shop works in India, and the backend's
 * dashboard also counts "today" as an IST day, so every date shown in the panel goes
 * through here and is displayed in that one time zone, whatever the browser's setting is.
 */

export const SHOP_TIME_ZONE = 'Asia/Kolkata';

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: SHOP_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: SHOP_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function parse(iso: string | null | undefined): Date | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "5 Oct 2026, 1:30 am", or "—" when there is no value. */
export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? dateTimeFormat.format(date) : '—';
}

/** "5 Oct 2026", or "—" when there is no value. */
export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? dateFormat.format(date) : '—';
}
