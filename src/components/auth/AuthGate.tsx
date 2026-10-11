import { useEffect, useRef, type ReactNode } from 'react';
import { useUser } from '@/hooks/useUser';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SignInScreen } from './SignInScreen';

/**
 * Top-level auth gate.
 *
 * Only `firebase` mode (the public app-login service) ever shows a login page.
 * In `iap` mode the edge already authenticated the request; in `open`/local
 * mode there's no auth — both render the app directly, unchanged. This keeps
 * the existing E2E specs (open mode) rendering as before.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { authMode, isSignedIn, isLoading, uid } = useUser();
  const previousUid = useRef<string | null>(uid);

  // An account switched in from another tab does not reload this one, and
  // nearly all client state is account-blind: query keys omit the uid, the
  // appearance stores and their sync guard outlive the switch, and a save
  // still in flight writes into whatever the cache now shows. Reloading on
  // every change away from an account starts all of it over for the new one.
  useEffect(() => {
    reloadOnAccountChange(previousUid.current, uid, () => window.location.reload());
    previousUid.current = uid;
  }, [uid]);

  if (authMode !== 'firebase') return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-0)]">
        <LoadingSpinner size={28} />
      </div>
    );
  }

  if (!isSignedIn) return <SignInScreen />;

  return <>{children}</>;
}

/** True when the signed-in uid moves away from a previous account (A to B, or A to signed out). */
export function isAccountChange(prev: string | null, next: string | null): boolean {
  return prev !== null && prev !== next;
}

/** Reload the page when the signed-in account changes away from a previous one. */
export function reloadOnAccountChange(prev: string | null, next: string | null, reload: () => void): void {
  if (isAccountChange(prev, next)) reload();
}
