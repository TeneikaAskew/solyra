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
