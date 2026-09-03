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
  type Auth,
  type User,
} from 'firebase/auth';
import type { FirebaseWebConfig } from './runtimeConfig';

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

export function signUpWithEmail(email: string, password: string) {
  if (!_auth) throw new Error('Firebase not initialized');
  return createUserWithEmailAndPassword(_auth, email, password);
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
