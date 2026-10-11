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

// ── Verification required (the API's 403) ──────────────────────────────────
//
// Since stocks#1360 the API answers every gated call from an account whose
// email is unverified with 403 {"detail": "verify your email to continue"}.
// The fetch layer records that answer here so cards and page bodies can say
// why there is no data. Keyed by uid for the same reason as the delivery
// state below: an account switch in another tab does not reload this one,
// and most query keys omit the uid, so account B must not inherit A's flag.

let verificationRequiredFor: string | null = null;
const verificationRequiredListeners = new Set<() => void>();

function emitVerificationRequired(): void {
  for (const l of verificationRequiredListeners) l();
}

/** Called by the fetch layer when a gated call answers the verify-email 403. */
export function markVerificationRequired(uid: string): void {
  if (verificationRequiredFor === uid) return;
  verificationRequiredFor = uid;
  emitVerificationRequired();
}

/**
 * Called on a successful gated response (with the request's uid, so a late
 * success from account A cannot erase the flag account B's 403 just set) and,
 * with no uid, once the signed-in account reads verified.
 */
export function clearVerificationRequired(uid?: string | null): void {
  if (verificationRequiredFor === null) return;
  if (uid !== undefined && verificationRequiredFor !== uid) return;
  verificationRequiredFor = null;
  emitVerificationRequired();
}

/** True only when the flag was marked for this same account. */
export function isVerificationRequired(uid: string | null): boolean {
  return uid !== null && verificationRequiredFor === uid;
}

export function subscribeVerificationRequired(cb: () => void): () => void {
  verificationRequiredListeners.add(cb);
  return () => verificationRequiredListeners.delete(cb);
}

/** React hook: true while this account's gated calls answer the verify-email 403. */
export function useVerificationRequired(uid: string | null): boolean {
  const read = () => isVerificationRequired(uid);
  return useSyncExternalStore(subscribeVerificationRequired, read, () => false);
}

// The account an I've confirmed check last found verified. Firebase fires no
// auth event when a reload/token refresh flips emailVerified, so useUser's
// value stays stale; every surface reads this instead of keeping its own.
let emailConfirmedFor: string | null = null;

export function markEmailConfirmed(uid: string): void {
  if (emailConfirmedFor === uid) return;
  emailConfirmedFor = uid;
  emitVerificationRequired();
}

export function isEmailConfirmed(uid: string | null): boolean {
  return uid !== null && emailConfirmedFor === uid;
}

/** React hook: true once an I've confirmed check found this account verified. */
export function useEmailConfirmed(uid: string | null): boolean {
  const read = () => isEmailConfirmed(uid);
  return useSyncExternalStore(subscribeVerificationRequired, read, () => false);
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
