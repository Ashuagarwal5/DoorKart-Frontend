'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { scrollToSection } from '@/utils/scroll';

/** Runs after a tab's height changes, before the browser paints its new layout. */
export function useSectionScroll(
  key: string | number,
  anchor: RefObject<HTMLElement | null>,
  focusTarget?: RefObject<HTMLElement | null>
) {
  const previous = useRef(key);
  useLayoutEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    focusTarget?.current?.focus({ preventScroll: true });
    scrollToSection(anchor.current);
  }, [key, anchor, focusTarget]);
}
