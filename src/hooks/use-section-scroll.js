'use client';

import { useLayoutEffect, useRef } from 'react';
import { scrollToSection } from '@/utils/scroll';

/** Runs after a tab's height changes, before the browser paints its new layout. */
export function useSectionScroll(
  key,
  anchor,
  focusTarget
) {
  const previous = useRef(key);
  useLayoutEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    focusTarget?.current?.focus({ preventScroll: true });
    scrollToSection(anchor.current);
  }, [key, anchor, focusTarget]);
}
