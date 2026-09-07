/**
 * The real Firebase Auth wrapper — the only module in the app that statically
 * imports the SDK.
 *
 * Do not import this file directly from app code: go through ./firebase (the
 * lazy facade). A static import from anywhere in the eager module graph drags
 * the whole Auth SDK back into the main chunk for every visitor in every auth
 * mode, which is exactly what the split exists to prevent. The facade loads
 * this via `import()` only when initFirebase() is actually called — i.e. only
 * in `firebase` auth mode.
 *
 * Sign-in/out happens entirely client-side; the backend just verifies the
 * resulting ID token.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  checkActionCode,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type ActionCodeInfo,
  type Auth,
  type User,
} from 'firebase/auth';
import type { FirebaseWebConfig } from './runtimeConfig';
import { recordVerificationEmail } from './authGate';

let _auth: Auth | null = null;

export function initFirebase(cfg: FirebaseWebConfig): Auth {
  if (_auth) return _auth;
  const app: FirebaseApp = initializeApp(cfg);
  _auth = getAuth(app);
  // Persist the session across reloads and browser restarts, and say so
  // explicitly rather than relying on the SDK default: a signed-in user
  // should not have to sign in again on every visit. IndexedDB first,
  // localStorage as the fallback for browsers/modes where it is unavailable.
  // The promise is fire-and-forget; a failure here only means a shorter-lived
  // session, never a broken sign-in, so it must not block init.
  void setPersistence(_auth, indexedDBLocalPersistence).catch(() =>
    setPersistence(_auth as Auth, browserLocalPersistence).catch(() => {}),
  );
  return _auth;
}


/** The current ID token (Firebase auto-refreshes when near expiry), or null. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = _auth?.currentUser;
  return user ? user.getIdToken(forceRefresh) : null;
}

/** The signed-in user's uid, or null when signed out. Synchronous read of the
 *  SDK's current auth state — used to detect a cross-tab account switch. */
export function currentUid(): string | null {
  return _auth?.currentUser?.uid ?? null;
}

export function signInWithGoogle() {
  if (!_auth) throw new Error('Firebase not initialized');
  return signInWithPopup(_auth, new GoogleAuthProvider());
}

export function signInWithEmail(email: string, password: string) {
  if (!_auth) throw new Error('Firebase not initialized');
  return signInWithEmailAndPassword(_auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  if (!_auth) throw new Error('Firebase not initialized');
  const cred = await createUserWithEmailAndPassword(_auth, email, password);
  // The verification email goes out the moment the account exists. By then
  // onAuthStateChanged has already swapped SignInScreen for the app shell,
  // so the caller's error line is gone; the outcome is recorded in the
  // authGate store, where EmailVerificationBanner reads it, and the error is
  // still rethrown (never swallowed).
  try {
    await sendEmailVerification(cred.user);
    recordVerificationEmail(cred.user.uid, { status: 'sent' });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    recordVerificationEmail(cred.user.uid, { status: 'failed', message: e.code ?? e.message ?? 'unknown error' });
    throw err;
  }
  return cred;
}

/** Password-reset email for `email`. With email-enumeration protection on
 *  (the project's setting) Firebase answers the same whether or not an
 *  account exists, so callers must not promise "email sent". */
export function sendPasswordReset(email: string): Promise<void> {
  if (!_auth) throw new Error('Firebase not initialized');
  return sendPasswordResetEmail(_auth, email);
}

/** Re-send the verification email to the signed-in user. */
export async function resendVerificationEmail(): Promise<void> {
  const user = _auth?.currentUser;
  if (!user) throw new Error('No signed-in user');
  await sendEmailVerification(user);
  recordVerificationEmail(user.uid, { status: 'sent' });
}

/**
 * Re-read the signed-in user from the server and report `emailVerified`.
 * `onAuthStateChanged` does not fire when the address is confirmed in another
 * tab, so the banner calls this on "I've confirmed". null = nobody signed in.
 */
export async function refreshEmailVerified(): Promise<boolean | null> {
  const user = _auth?.currentUser;
  if (!user) return null;
  await user.reload();
  return _auth?.currentUser?.emailVerified ?? null;
}

// ── Email action links (/auth/action) ───────────────────────────────────────
// The four one-time-code operations behind the emailed buttons. Each one
// rejects with a Firebase error code (auth/expired-action-code,
// auth/invalid-action-code, ...) that lib/authAction.ts turns into copy.

export function checkAuthActionCode(code: string): Promise<ActionCodeInfo> {
  if (!_auth) throw new Error('Firebase not initialized');
  return checkActionCode(_auth, code);
}

export function applyAuthActionCode(code: string): Promise<void> {
  if (!_auth) throw new Error('Firebase not initialized');
  return applyActionCode(_auth, code);
}

/** Validates a password-reset code; resolves with the account's email. */
export function verifyResetCode(code: string): Promise<string> {
  if (!_auth) throw new Error('Firebase not initialized');
  return verifyPasswordResetCode(_auth, code);
}

export function confirmReset(code: string, newPassword: string): Promise<void> {
  if (!_auth) throw new Error('Firebase not initialized');
  return confirmPasswordReset(_auth, code, newPassword);
}

export function firebaseSignOut(): Promise<void> {
  return _auth ? signOut(_auth) : Promise.resolve();
}

/** Subscribe to auth-state changes. Returns an unsubscribe fn. */
export function subscribeAuth(cb: (user: User | null) => void): () => void {
  if (!_auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(_auth, cb);
}
