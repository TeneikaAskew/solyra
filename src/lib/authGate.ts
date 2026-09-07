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

// ── Verification-email delivery state ───────────────────────────────────────
//
// Sign-up creates the account and Firebase flips onAuthStateChanged before
// the verification email's send has resolved, so SignInScreen (the caller)
// is already unmounted when a send failure comes back. This store carries
// that outcome across the auth transition so EmailVerificationBanner can say
// what actually happened instead of asserting "we sent a link" (Rule 4: no
// fabricated success).
//
// The outcome is keyed by the uid it was recorded for. Auth state is shared
// across tabs and a sign-out/sign-in never reloads the page, so an unkeyed
// value would let account B inherit account A's "sent" (or "failed"). A
// reader asking for a different uid gets 'unknown' = nothing was sent for
// this account in this session; the banner then offers a resend without
// claiming a prior send.

export type VerificationEmailState =
  | { status: 'unknown' }
  | { status: 'sending' }
  | { status: 'sent' }
  | { status: 'failed'; message: string };

const UNKNOWN: VerificationEmailState = { status: 'unknown' };

let verificationEmail: { uid: string; state: VerificationEmailState } | null = null;
const verificationListeners = new Set<() => void>();

/** Record the outcome of a verification-email send for `uid`. */
export function recordVerificationEmail(uid: string, state: VerificationEmailState): void {
  verificationEmail = { uid, state };
  for (const l of verificationListeners) l();
}

/** The recorded outcome for `uid`; 'unknown' for any other (or no) account. */
export function getVerificationEmailState(uid: string | null): VerificationEmailState {
  return uid && verificationEmail?.uid === uid ? verificationEmail.state : UNKNOWN;
}

export function subscribeVerificationEmail(cb: () => void): () => void {
  verificationListeners.add(cb);
  return () => verificationListeners.delete(cb);
}

/** React hook: the outcome of the most recent verification-email send for `uid`. */
export function useVerificationEmailState(uid: string | null): VerificationEmailState {
  const read = () => getVerificationEmailState(uid);
  return useSyncExternalStore(subscribeVerificationEmail, read, read);
}
