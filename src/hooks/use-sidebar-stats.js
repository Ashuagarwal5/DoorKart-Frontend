'use client';

import { useEffect, useState } from 'react';

import { fetchDashboard, fetchProducts } from '@/services/api/admin-api';

const REFRESH_MS = 60_000;

const EMPTY = { newOrders: 0, products: null, lowStock: null };

/**
 * The live numbers the sidebar shows: orders waiting to be confirmed, the catalogue size
 * and whether anything is low on stock. It refreshes every minute while the tab is visible, and whenever
 * `refreshKey` changes (the shell passes the current page, so the numbers update after you
 * work through an order or a product). A failed check keeps the last numbers: the page you
 * are on reports real errors.
 */
export function useSidebarStats(refreshKey) {
  const [stats, setStats] = useState(EMPTY);

  useEffect(() => {
    let isStale = false;
    const refresh = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      Promise.all([
        fetchDashboard(),
        fetchProducts({ page: 1, limit: 1 }),
      ]).then(
        ([dashboard, all]) => {
          if (!isStale) {
            setStats({
              newOrders: dashboard.ordersByStatus.PLACED,
              products: all.pagination.total,
              lowStock: dashboard.lowStockCount,
            });
          }
        },
        () => undefined
      );
    };

    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    // Coming back to the tab (or opening it in the background first) updates the numbers at once.
    document.addEventListener('visibilitychange', refresh);
    return () => {
      isStale = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refreshKey]);

  return stats;
}
