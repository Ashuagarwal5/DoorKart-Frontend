'use client';

import { useEffect, useRef, useState } from 'react';

const DRAFT_KEY = 'doorkart:new-product-draft';
const SAVE_DELAY_MS = 800;

/** The stored draft, or null. Storage can be missing or blocked (private windows), which is not an error worth showing. */
function readDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && typeof draft.savedAt === 'number' && draft.values ? draft : null;
  } catch {
    return null;
  }
}

/** Stores the draft and returns when, or null when storage is full or blocked: the form still works, it just cannot keep a draft. */
function writeDraft(values) {
  const now = Date.now();
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: now, values }));
    return now;
  } catch {
    return null;
  }
}

function forgetDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing stored, or storage is blocked: either way there is nothing left to clear.
  }
}

/**
 * Keeps an unsaved new product in this browser, so closing the tab or a lost connection does
 * not lose the admin's typing. It never reaches the server: only Publish creates a product.
 *
 * A draft found on arrival is offered, not applied: `storedDraft` holds it until the admin
 * restores or discards it, and nothing is saved over it meanwhile.
 *
 * The form only renders in the browser, after its categories load, so reading storage while
 * the state is first created cannot differ from a server render.
 */
export function useProductDraft(values, { enabled, isPristine }) {
  const [storedDraft, setStoredDraft] = useState(() => (enabled ? readDraft() : null));
  const [savedAt, setSavedAt] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled || storedDraft || isPristine) return undefined;
    timer.current = window.setTimeout(() => setSavedAt(writeDraft(values)), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer.current);
  }, [enabled, storedDraft, isPristine, values]);

  return {
    storedDraft,
    savedAt,
    /** Saves straight away, for the Save draft button. Refused while an older draft waits for a decision. */
    saveNow: () => {
      if (!enabled || storedDraft) return false;
      window.clearTimeout(timer.current);
      const at = writeDraft(values);
      setSavedAt(at);
      return at !== null;
    },
    /** Hands back the stored values and resumes saving. */
    restore: () => {
      const draft = storedDraft;
      setStoredDraft(null);
      return draft?.values ?? null;
    },
    discard: () => {
      forgetDraft();
      setStoredDraft(null);
    },
    /** After a successful publish, so the next new product starts empty. */
    clear: () => {
      window.clearTimeout(timer.current);
      forgetDraft();
      setSavedAt(null);
    },
  };
}
