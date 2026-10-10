import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const previousUid = useRef<string | null>(uid);

  // An account switched in from another tab does not reload this one, and
  // most query keys omit the uid, so the new account would be served the
  // previous account's cached results (journal rows included) with no request
  // made. Reset every query on each change away from an account.
  useEffect(() => {
    if (isAccountChange(previousUid.current, uid)) void resetAccountQueries(queryClient);
    previousUid.current = uid;
  }, [uid, queryClient]);

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

/**
 * Return every query to its initial state and refetch the active ones under the
 * new account's token. Not queryClient.clear(): by the time AuthGate's effect
 * runs, useUser has already started the new account's ['me', uid] query, and
 * clear() destroys it in flight, so its answer is discarded and the gate stays
 * on its spinner; clear() also leaves a mounted view showing the old rows.
 */
export function resetAccountQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.resetQueries();
}
