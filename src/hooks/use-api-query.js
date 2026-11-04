'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import { ApiError } from '@/services/api/api-error';

/**
 * Loads data for a page and exposes exactly one of loading / error / success.
 *
 * `key` identifies WHAT is loaded (the endpoint plus its filters): when it changes the old
 * data is dropped and the new data loads. `reload()` fetches again and keeps the data on
 * screen meanwhile (`isRefreshing`). The answer to a request is ignored when the page goes away or the
 * key changes, so a slow old answer can never overwrite a newer one. (The request itself is
 * left to finish rather than cancelled: cancelling makes the browser raise AbortError noise
 * in development, and these requests are small.)
 *
 * This is deliberately small. There is no shared cache: every page asks the server when it
 * opens, so what an admin sees is always what the server has.
 */
export function useApiQuery(key, load) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState(null);

  // The loader is a new function every render; only `key` and `attempt` restart a load.
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    let isStale = false;

    runLoad().then(
      (data) => {
        if (!isStale) {
          setSettled({ key, attempt, outcome: { ok: true, data } });
        }
      },
      (error) => {
        if (!isStale) {
          const apiError =
            error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.');
          setSettled({ key, attempt, outcome: { ok: false, error: apiError } });
        }
      }
    );

    return () => {
      isStale = true;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  const current = settled?.key === key ? settled : null;
  const isPending = current?.attempt !== attempt;

  if (current?.outcome.ok) {
    return { status: 'success', data: current.outcome.data, error: undefined, isRefreshing: isPending, reload };
  }
  if (current && !current.outcome.ok && !isPending) {
    return { status: 'error', data: undefined, error: current.outcome.error, isRefreshing: false, reload };
  }
  return { status: 'loading', data: undefined, error: undefined, isRefreshing: false, reload };
}
