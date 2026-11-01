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
import type { Query, QueryClient } from '@tanstack/react-query';

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

// ── The signed-in account (FEAT-AUTH-001 account transitions) ──────────────
//
// One record of the account this page's Firebase listener last reported,
// kept outside AuthGate so code that runs between renders (stores, the query
// cache, the fetch layer) can react to a switch. initFirebase feeds it from
// onAuthStateChanged. The first report after load is not a change, and
// neither is a repeat of the same uid; on a change the auth-blocked flag is
// cleared first (the previous account's 401 says nothing about this one),
// then the account listeners run (the query reset and the write-through
// pause), and only then do the stores reload, so no reloaded value can be
// written through as the new account's choice.

type AccountState = { reported: false } | { reported: true; uid: string | null };

let account: AccountState = { reported: false };
const accountListeners = new Set<(next: string | null, prev: string | null) => void>();

/** Called with each auth report this page's Firebase listener receives. */
export function noteSignedInAccount(uid: string | null): void {
  if (!account.reported) {
    account = { reported: true, uid };
    emitStorageChange();
    return;
  }
  const prev = account.uid;
  if (prev === uid) return;
  account = { reported: true, uid };
  clearAuthBlocked();
  clearRefusedWriteNotice();
  for (const l of accountListeners) l(uid, prev);
  emitStorageChange();
}

/** The last reported account; null before the first report or while signed out. */
export function getSignedInAccount(): string | null {
  return account.reported ? account.uid : null;
}

/** True once this page's listener has reported at least once. */
export function hasAccountReport(): boolean {
  return account.reported;
}

/** Run `cb` on every later account change this page observes. */
export function onAccountChange(cb: (next: string | null, prev: string | null) => void): () => void {
  accountListeners.add(cb);
  return () => {
    accountListeners.delete(cb);
  };
}

/**
 * Clear what the previous account's queries hold, on an account change.
 * Every query keyed under 'me' except `['me', next]` is removed (those keys
 * are the account's own: profile, preferences, the previous uid). Every
 * other query is account-blind (its key omits the uid), so it is reset:
 * its data goes and an answer still in flight is discarded, and an active
 * query refetches as the new account. After a sign-out every query is
 * removed. `clear()` is never used: it would also drop mutations and
 * observers' cache entries the next screen relies on.
 */
export function resetAccountQueries(queryClient: QueryClient, next: string | null): void {
  if (next === null) {
    void queryClient.cancelQueries();
    queryClient.removeQueries();
    return;
  }
  const previousOwn = (q: Query) => q.queryKey[0] === 'me' && !(q.queryKey.length === 2 && q.queryKey[1] === next);
  // Removing a query also cancels its fetch (Query.destroy), so an answer
  // the previous account was still waiting for is discarded.
  queryClient.removeQueries({ predicate: previousOwn });
  void queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
}

// ── A write refused across an account change ───────────────────────────────
//
// A profile save or preferences write is bound to the account its screen was
// rendered for (authedFetch.boundToAccount) and refused when the SDK holds
// another account. If this page still reports the composing account, that
// screen is still shown and its own form renders the error. If this page
// already reports another account, the composing screen is being replaced
// (AuthGate remounts the shell) before the refusal settles, so the refusal is
// recorded here and AuthGate shows it to the account now on screen. The record
// holds no value, field or identity of the composing account, only that a
// change was not sent; the next account change or a dismiss clears it.

let refusedNoticeFor: { shownTo: string | null } | null = null;
const refusedListeners = new Set<() => void>();

function emitRefused(): void {
  for (const l of refusedListeners) l();
}

function clearRefusedWriteNotice(): void {
  if (refusedNoticeFor === null) return;
  refusedNoticeFor = null;
  emitRefused();
}

/** Called by the fetch layer when a write bound to `composedFor` is refused. */
export function noteRefusedWrite(composedFor: string | null): void {
  const shownTo = getSignedInAccount();
  if (composedFor === shownTo) return;
  refusedNoticeFor = { shownTo };
  emitRefused();
}

/** True while a refusal is recorded for the account this page now reports. */
export function isRefusedWriteNoticeShown(): boolean {
  return refusedNoticeFor !== null && refusedNoticeFor.shownTo === getSignedInAccount();
}

export function dismissRefusedWriteNotice(): void {
  clearRefusedWriteNotice();
}

export function subscribeRefusedWriteNotice(cb: () => void): () => void {
  refusedListeners.add(cb);
  return () => {
    refusedListeners.delete(cb);
  };
}

/** React hook: true while the refused-write notice is shown. */
export function useRefusedWriteNotice(): boolean {
  return useSyncExternalStore(subscribeRefusedWriteNotice, isRefusedWriteNoticeShown, () => false);
}

// ── Account-scoped storage ──────────────────────────────────────────────────
//
// Appearance, sizing inputs and recent tickers are per-browser presentation
// preferences. In firebase mode they are kept per account: each value lives
// under `<key>@uid:<uid>` for this page's own last reported account, and a
// read returns only the current account's key. Nothing here ever removes a
// key, so legacy un-namespaced values and other accounts' values stay byte for
// byte. Outside firebase mode (open, IAP, the dev stub) the un-namespaced keys
// are used exactly as before.
//
// The mode:
//  - 'shared' by default, so a store imported with no ConfigGate (a unit test)
//    behaves as on main;
//  - 'pending' from the moment ConfigGate's one boot starts until it settles:
//    nothing account-scoped is read or written, and a failed boot stays here;
//  - settled by that boot to 'shared' (no initFirebase) or 'perOwner'.

export type StorageMode = 'pending' | 'shared' | 'perOwner';

let storageMode: StorageMode = 'shared';
const storageListeners = new Set<() => void>();

function emitStorageChange(): void {
  for (const l of storageListeners) l();
}

/** ConfigGate's boot, when it starts. */
export function markStoragePending(): void {
  if (storageMode === 'pending') return;
  storageMode = 'pending';
  emitStorageChange();
}

/** ConfigGate's boot, once it knows whether initFirebase runs. */
export function settleStorageMode(mode: Exclude<StorageMode, 'pending'>): void {
  if (storageMode === mode) return;
  storageMode = mode;
  emitStorageChange();
}

export function getStorageMode(): StorageMode {
  return storageMode;
}

/**
 * Run `cb` whenever what account-scoped storage resolves to may have changed:
 * the mode settling, this page's first account report, and each later account
 * change. Stores reload their values here.
 */
export function onStorageChange(cb: () => void): () => void {
  storageListeners.add(cb);
  return () => {
    storageListeners.delete(cb);
  };
}

/** The key a read or write uses now, or null when nothing may be read or written. */
function scopedKey(key: string): string | null {
  if (storageMode === 'shared') return key;
  if (storageMode === 'pending') return null;
  const uid = getSignedInAccount();
  return uid === null ? null : `${key}@uid:${uid}`;
}

/** The current account's stored value for `key`, or null when it has none,
 *  when storage is pending, with no account, or with localStorage unavailable. */
export function readScoped(key: string): string | null {
  const k = scopedKey(key);
  if (k === null) return null;
  try {
    return localStorage.getItem(k);
  } catch {
    // Unavailable storage (private mode, blocked site data) means this
    // per-browser preference was never stored: the caller shows the product
    // default, which is what an empty store shows anyway. No data value is
    // fabricated: these keys hold display preferences, not market data.
    return null;
  }
}

/** Store `value` for the current account. Stores nothing while pending, with
 *  no account, or with localStorage unavailable (the in-memory value stands). */
export function writeScoped(key: string, value: string): void {
  const k = scopedKey(key);
  if (k === null) return;
  try {
    localStorage.setItem(k, value);
  } catch {
    // Quota or blocked storage: the preference applies for this page only,
    // as the stores already behave on main.
  }
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

// The accounts an I've confirmed check found verified. Firebase fires no
// auth event when a reload/token refresh flips emailVerified, so useUser's
// value stays stale; every surface reads this instead of keeping its own.
// One entry per uid (FEAT-AUTH-001, #270): A's check answering after a switch
// to B adds A and never replaces B's confirmation.
const emailConfirmedFor = new Set<string>();

export function markEmailConfirmed(uid: string): void {
  if (emailConfirmedFor.has(uid)) return;
  emailConfirmedFor.add(uid);
  emitVerificationRequired();
}

export function isEmailConfirmed(uid: string | null): boolean {
  return uid !== null && emailConfirmedFor.has(uid);
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
