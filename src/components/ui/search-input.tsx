'use client';

import { useEffect, useRef } from 'react';

import { Icon } from '@/components/ui/icons';

const DEBOUNCE_MS = 400;

/**
 * A search box that tells the page what was typed only after a short pause, so the server
 * is not asked on every keystroke. It owns its text; the page owns the applied search
 * (in the URL) and only supplies the starting value.
 */
export function SearchInput({
  defaultValue,
  placeholder,
  label,
  onSearch,
}: {
  defaultValue: string;
  placeholder: string;
  label: string;
  onSearch: (value: string) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // No pending search should fire after the page is gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="relative w-full max-w-sm">
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={(event) => {
          const value = event.target.value.trim();
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onSearch(value), DEBOUNCE_MS);
        }}
        className="min-h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm placeholder:text-muted/70"
      />
    </div>
  );
}
