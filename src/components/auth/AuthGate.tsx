import { useLayoutEffect, type ReactNode } from 'react';
import { useUser } from '@/hooks/useUser';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SignInScreen } from './SignInScreen';
import {
  dismissRefusedWriteNotice,
  noteRenderedAccount,
  useRefusedWriteNotice,
  useSignedInAccount,
} from '@/lib/authGate';

/**
 * A change composed on the previous account's screen and refused after this
 * page already switched account (authGate.ts, "A write refused across an
 * account change"). That screen is gone by the time the refusal settles, so
 * the refusal is shown here, outside the remounting shell. It names no value
 * or identity of the previous account and never says anything was saved.
 */
function RefusedWriteNotice() {
  const shown = useRefusedWriteNotice();
  if (!shown) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="account-change-refusal"
      className="fixed bottom-4 left-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-start gap-3 rounded-lg border border-amber-500/40 bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--on-surface)] shadow-lg"
    >
      <span>
        <span className="font-semibold text-[var(--warn)]">Not sent.</span> The signed-in account changed before
        a change from the previous screen was sent. Nothing was saved.
      </span>
      <button
        type="button"
        onClick={dismissRefusedWriteNotice}
        className="rounded px-2 py-0.5 text-xs font-medium text-[var(--on-surface)] hover:bg-amber-500/15"
      >
        Dismiss
      </button>
    </div>
  );
}

/**
 * Top-level auth gate.
 *
 * Only `firebase` mode (the public app-login service) ever shows a login page.
 * In `iap` mode the edge already authenticated the request; in `open`/local
 * mode there's no auth — both render the app directly, unchanged. This keeps
 * the existing E2E specs (open mode) rendering as before.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { authMode, isSignedIn, isLoading } = useUser();
  // The account this commit renders for (authGate.ts, "The account the screen
  // was rendered for"): recorded at the commit, so a setter running on the
  // previous account's screen after this page reported another one is refused.
  const shownAccount = useSignedInAccount();
  useLayoutEffect(() => {
    noteRenderedAccount(shownAccount);
    return () => noteRenderedAccount(undefined);
  }, [shownAccount]);

  if (authMode !== 'firebase') return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-0)]">
        <LoadingSpinner size={28} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <SignInScreen />
        <RefusedWriteNotice />
      </>
    );
  }

  return (
    <>
      {children}
      <RefusedWriteNotice />
    </>
  );
}
