/**
 * Global "auth blocked" flag for gated /api/* calls.
 *
 * The fetch wrapper (authedFetch) sees every response: a 401 on a gated path
 * marks the session blocked, a successful gated response clears it. Data
 * surfaces subscribe with `useAuthBlocked()` and render a "Sign in to load
 * data" empty state instead of a blank card.
 *
 * This is a UX signal only — Rule 4 applies: no data is fabricated, the card
 * simply states why there is none.
 */
import { useSyncExternalStore } from 'react';

let blocked = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Called by the fetch layer when a gated /api/* call returns 401. */
export function markAuthBlocked(): void {
  if (blocked) return;
  blocked = true;
  emit();
}

/** Called by the fetch layer when a gated /api/* call succeeds again. */
export function clearAuthBlocked(): void {
  if (!blocked) return;
  blocked = false;
  emit();
}

export function isAuthBlocked(): boolean {
  return blocked;
}

export function subscribeAuthGate(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook: true while gated API calls are returning 401. */
export function useAuthBlocked(): boolean {
  return useSyncExternalStore(subscribeAuthGate, isAuthBlocked, () => false);
}
