'use client';

import { useEffect, useState } from 'react';

import { fetchDashboard } from '@/services/api/admin-api';

const REFRESH_MS = 60_000;

/**
 * How many orders are waiting to be confirmed, for the badge beside "Orders" in the sidebar.
 * It refreshes every minute while the tab is visible, and whenever `refreshKey` changes (the
 * shell passes the current page, so the count updates after you work through an order).
 * A failed check just keeps the last number: the page you are on reports real errors.
 */
export function useNewOrderCount(refreshKey: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let isStale = false;
    const refresh = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      fetchDashboard().then(
        (dashboard) => {
          if (!isStale) {
            setCount(dashboard.ordersByStatus.PLACED);
          }
        },
        () => undefined
      );
    };

    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    // Coming back to the tab (or opening it in the background first) updates the number at once.
    document.addEventListener('visibilitychange', refresh);
    return () => {
      isStale = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refreshKey]);

  return count;
}
