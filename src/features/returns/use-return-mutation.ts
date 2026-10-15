'use client';

import { useRef, useState } from 'react';
import { describeApiError, toApiError } from '@/services/api/api-error';
import { isReturnResultUnknown } from './return-result';

/** Freeze intent after an ambiguous response so a retry records the same action only. */
export function useReturnMutation<T>(send: (body: T) => Promise<unknown>, onSaved: () => void) {
  const pending = useRef<T | null>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const submit = async (makeBody: () => T) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      pending.current ??= makeBody();
      await send(pending.current);
      pending.current = null; setUncertain(false); onSaved();
    } catch (failure) {
      const apiError = toApiError(failure);
      const unknown = isReturnResultUnknown(apiError);
      if (!unknown) pending.current = null;
      setUncertain(unknown);
      setError(unknown ? 'The result is unconfirmed. Refresh to check its status, or retry this same recording. Do not hand over cash again.' : describeApiError(apiError));
    } finally { inFlight.current = false; setBusy(false); }
  };
  return { busy, uncertain, error, submit, frozen: busy || uncertain };
}
