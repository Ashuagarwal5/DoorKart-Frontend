'use client';

import { useLayoutEffect, useRef } from 'react';

/** New pages start at the top. Query filters and history restoration keep their scroll. */
export function useRouteScroll(pathname: string) {
  const previous = useRef(pathname);

  useLayoutEffect(() => {
    const restored = () => { previous.current = window.location.pathname; };
    window.addEventListener('popstate', restored);
    return () => window.removeEventListener('popstate', restored);
  }, []);

  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
}
