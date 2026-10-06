'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Changes = Record<string, string | number | undefined>;

/**
 * Page filters (search, status, page...) live in the URL, not in state: refresh keeps them,
 * the browser's back button steps through them, and a link can be shared.
 *
 * `set` changes some of them. A blank value removes that filter, and the page number goes
 * back to 1 unless the change is to the page itself, because the old page number would
 * point past the end of a narrower result.
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = (key: string): string => params.get(key) ?? '';

  const set = (changes: Changes, options: { replace?: boolean } = {}) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    if (!('page' in changes)) {
      next.delete('page');
    }

    const query = next.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (options.replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  };

  /** The page number from the URL, as a safe positive integer. */
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);

  return { get, set, page };
}
