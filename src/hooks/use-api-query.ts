'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import { ApiError } from '@/services/api/api-error';

type Settled<T> = { key: string; attempt: number; outcome: { ok: true; data: T } | { ok: false; error: ApiError } };

export type ApiQuery<T> =
  | { status: 'loading'; data: undefined; error: undefined; isRefreshing: false; reload: () => void }
  | { status: 'error'; data: undefined; error: ApiError; isRefreshing: false; reload: () => void }
  | { status: 'success'; data: T; error: undefined; isRefreshing: boolean; reload: () => void };

/**
 * Loads data for a page and exposes exactly one of loading / error / success.
 *
 * `key` identifies WHAT is loaded (the endpoint plus its filters): when it changes the old
 * data is dropped and the new data loads. `reload()` fetches again and keeps the data on
 * screen meanwhile (`isRefreshing`). A request is cancelled when the page goes away or the
 * key changes, so a slow old answer can never overwrite a newer one.
 *
 * This is deliberately small. There is no shared cache: every page asks the server when it
 * opens, so what an admin sees is always what the server has.
 */
export function useApiQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>): ApiQuery<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  // The loader is a new function every render; only `key` and `attempt` restart a load.
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    const controller = new AbortController();

    runLoad(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setSettled({ key, attempt, outcome: { ok: true, data } });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          const apiError =
            error instanceof ApiError ? error : new ApiError('SERVER_ERROR', 'Something went wrong.');
          setSettled({ key, attempt, outcome: { ok: false, error: apiError } });
        }
      }
    );

    return () => controller.abort();
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
