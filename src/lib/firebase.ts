/**
 * Thin wrapper around the Firebase Auth JS SDK. Only loaded/used in
 * `firebase` auth mode (see runtimeConfig). Sign-in/out happens entirely
 * client-side; the backend just verifies the resulting ID token.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
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
  return _auth;
}

/** The current ID token (Firebase auto-refreshes when near expiry), or null. */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = _auth?.currentUser;
  return user ? user.getIdToken(forceRefresh) : null;
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
 */
export function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Reading window.top cross-origin throws — which itself proves we're framed.
    return true;
  }
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
