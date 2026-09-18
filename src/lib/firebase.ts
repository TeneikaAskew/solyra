/**
 * Lazy facade over the Firebase Auth SDK.
 *
 * Why this exists: the SDK used to be statically imported here, and this
 * module is reachable from the EAGER graph five ways (main.tsx, authedFetch,
 * useUser, SignInScreen, SignOutButton) — so ~identitytoolkit and friends
 * landed in the main chunk that every visitor downloads, in every auth mode,
 * even though not one of these call sites runs outside `firebase` mode. The
 * main bundle was 732 kB minified with the SDK inside.
 *
 * The rule now: ./firebaseImpl.ts is the only module that imports the SDK,
 * and ONLY initFirebase() loads it (via dynamic import). Every other export
 * here reproduces the old "not initialized" behaviour without touching the
 * network:
 *
 *   getIdToken            → resolves null        (was: null via _auth?.…)
 *   firebaseSignOut       → resolved promise     (unchanged)
 *   subscribeAuth         → cb(null), noop unsub (unchanged)
 *   signInWith…/signUpWith… → REJECTED promise   (was: synchronous throw —
 *                           callers already `await` inside try/catch, so the
 *                           error surfaces identically)
 *
 * main.tsx awaits initFirebase() before rendering, so in firebase mode the
 * SDK is fully loaded before any component can call these; the pending-load
 * branches below are belt-and-braces, not a path the app relies on.
 *
 * Import types only from 'firebase/auth' here — `import type` is erased at
 * build time and adds nothing to the bundle.
 */
import type { ActionCodeInfo, User } from 'firebase/auth';
import type { FirebaseWebConfig } from './runtimeConfig';

type Impl = typeof import('./firebaseImpl');

// Set exactly once, by initFirebase. Null = firebase mode never engaged —
// every facade export below must behave like the old uninitialized state
// WITHOUT importing the SDK.
let _ready: Promise<Impl> | null = null;

/**
 * Load the SDK chunk and initialize the app. Idempotent. This is the single
 * trigger for the network fetch of the Firebase code — call it only when the
 * runtime config says authMode is 'firebase' (main.tsx does, and awaits it
 * before first render).
 */
export function initFirebase(cfg: FirebaseWebConfig): Promise<void> {
  _ready ??= import('./firebaseImpl').then((m) => {
    m.initFirebase(cfg);
    return m;
  });
  return _ready.then(() => undefined);
}

/** The current ID token (Firebase auto-refreshes when near expiry), or null. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  if (!_ready) return null;
  return (await _ready).getIdToken(forceRefresh);
}

/** The signed-in user's uid, or null (signed out, or firebase never engaged).
 *  authedFetch compares this across a forced token retry to catch a cross-tab
 *  account switch mid-request. */
export async function getCurrentUid(): Promise<string | null> {
  if (!_ready) return null;
  return (await _ready).currentUid();
}

/**
 * True when the app is running inside an iframe — e.g. a Lovable preview.
 *
 * Load-bearing for Google sign-in. `signInWithPopup` authenticates in the
 * popup and then `postMessage`s the credential back to the window that opened
 * it; from a CROSS-ORIGIN iframe that channel is blocked by storage
 * partitioning, so the popup succeeds while the embedded app never hears back
 * and `onAuthStateChanged` never fires — the user is left staring at the login
 * form. Being listed in Firebase's authorized domains does not help: this is a
 * framing restriction, not a domain one.
 *
 * `signInWithRedirect` is NOT a fix either — Google's sign-in page refuses to
 * be framed, so the redirect dead-ends. The only reliable path is to leave the
 * iframe, which is what the sign-in screen offers when this returns true.
 *
 * Lives on the facade (not the impl) because it needs no SDK.
 */
export function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Reading window.top cross-origin throws — which itself proves we're framed.
    return true;
  }
}

export async function signInWithGoogle() {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).signInWithGoogle();
}

export async function signInWithEmail(email: string, password: string) {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).signInWithEmail(email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).signUpWithEmail(email, password);
}

export async function firebaseSignOut(): Promise<void> {
  if (!_ready) return;
  return (await _ready).firebaseSignOut();
}

// ── Email flows ─────────────────────────────────────────────────────────────
// Same contract as the sign-in wrappers: rejected promise when firebase mode
// never engaged, so callers' existing try/catch handles it.

export async function sendPasswordReset(email: string): Promise<void> {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).sendPasswordReset(email);
}

export async function resendVerificationEmail(): Promise<void> {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).resendVerificationEmail();
}

/** Server-fresh `emailVerified` for the signed-in user; null when signed out
 *  or when firebase mode never engaged. */
export async function refreshEmailVerified(): Promise<boolean | null> {
  if (!_ready) return null;
  return (await _ready).refreshEmailVerified();
}

export async function checkAuthActionCode(code: string): Promise<ActionCodeInfo> {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).checkAuthActionCode(code);
}

export async function applyAuthActionCode(code: string): Promise<void> {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).applyAuthActionCode(code);
}

export async function verifyResetCode(code: string): Promise<string> {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).verifyResetCode(code);
}

export async function confirmReset(code: string, newPassword: string): Promise<void> {
  if (!_ready) throw new Error('Firebase not initialized');
  return (await _ready).confirmReset(code, newPassword);
}

/**
 * Subscribe to auth-state changes. Returns an unsubscribe fn, synchronously —
 * the shape useUser's effect cleanup depends on. If the SDK is still loading
 * (only possible before main.tsx's await resolves, which is before render),
 * the subscription attaches when it lands and the returned fn still cancels
 * correctly either way.
 */
export function subscribeAuth(cb: (user: User | null) => void): () => void {
  if (!_ready) {
    cb(null);
    return () => {};
  }
  let unsub: (() => void) | null = null;
  let cancelled = false;
  void _ready.then((m) => {
    if (cancelled) return;
    unsub = m.subscribeAuth(cb);
  });
  return () => {
    cancelled = true;
    unsub?.();
  };
}
