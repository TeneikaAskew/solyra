import { Lock, ShieldCheck } from 'lucide-react';
import { useAuthBlocked } from '@/lib/authGate';
import { useUser } from '@/hooks/useUser';

/**
 * Global auth status.
 *
 * Two surfaces share one source of truth: the Firebase/IAP identity from
 * useUser() and the gated-401 flag from authGate. Neither fabricates a state,
 * so while identity is still resolving nothing is asserted about the session.
 *
 *   status  'loading'  identity not resolved yet
 *           'blocked'  a gated /api call answered 401 (session expired)
 *           'signed-out'
 *           'signed-in'
 *
 * Signing in routes through <AuthGate>: reloading the app returns to the
 * sign-in screen when no valid session exists.
 */
export type AuthStatus = 'loading' | 'blocked' | 'signed-out' | 'signed-in';

export function useAuthStatus(): { status: AuthStatus; email: string | null } {
  const blocked = useAuthBlocked();
  const { email, isSignedIn, isLoading } = useUser();
  if (isLoading) return { status: 'loading', email };
  if (blocked) return { status: 'blocked', email };
  return { status: isSignedIn ? 'signed-in' : 'signed-out', email };
}

export function goToSignIn(): void {
  window.location.reload();
}

/** Compact pill for the nav/header row. */
export function AuthStatusIndicator() {
  const { status, email } = useAuthStatus();
  if (status === 'loading') return null;

  const signedIn = status === 'signed-in';
  const label = signedIn ? (email ?? 'Signed in') : status === 'blocked' ? 'Session expired' : 'Signed out';

  return (
    <div
      data-testid="auth-status"
      data-status={status}
      className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--on-surface-variant)]"
      title={signedIn ? `Signed in${email ? ` as ${email}` : ''}` : 'You are not signed in'}
    >
      {signedIn ? (
        <ShieldCheck size={13} className="text-[var(--success, var(--on-surface-variant))]" aria-hidden />
      ) : (
        <Lock size={13} className="text-[var(--warning, var(--on-surface-variant))]" aria-hidden />
      )}
      <span className="hidden max-w-[160px] truncate sm:inline">{label}</span>
      {!signedIn && (
        <button
          type="button"
          onClick={goToSignIn}
          className="rounded-md border border-[var(--outline-variant)] px-2 py-0.5 text-[11px] font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-2)]"
        >
          Sign in
        </button>
      )}
    </div>
  );
}

/** Full-width strip shown above the page body while the session is not valid. */
export function AuthStatusBanner() {
  const { status } = useAuthStatus();
  if (status === 'loading' || status === 'signed-in') return null;

  const expired = status === 'blocked';
  return (
    <div
      role="status"
      data-testid="auth-status-banner"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[var(--outline-variant)] bg-[var(--surface-2)] px-4 py-2 text-center text-[12px] text-[var(--on-surface)]"
    >
      <span className="flex items-center gap-1.5">
        <Lock size={13} aria-hidden />
        {expired
          ? 'Your session expired, so live data is not loading.'
          : 'You are signed out, so live data is not loading.'}
      </span>
      <button
        type="button"
        onClick={goToSignIn}
        className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-1)] px-3 py-1 text-[12px] font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-0)]"
      >
        Sign in
      </button>
    </div>
  );
}
