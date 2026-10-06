import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime } from '@/utils/date';

describe('date formatting', () => {
  it('shows UTC timestamps in India time, whatever the browser time zone is', () => {
    // 20:00 UTC on 4 Oct is 01:30 IST on 5 Oct.
    expect(formatDateTime('2026-10-04T20:00:00Z')).toMatch(/^5 Oct 2026, 1:30\s?am$/i);
    expect(formatDate('2026-10-04T20:00:00Z')).toBe('5 Oct 2026');
    // 17:00 UTC is 22:30 IST, still the same day.
    expect(formatDate('2026-10-04T17:00:00Z')).toBe('4 Oct 2026');
  });

  it('shows a dash for a missing or invalid value instead of "Invalid Date"', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });
});
