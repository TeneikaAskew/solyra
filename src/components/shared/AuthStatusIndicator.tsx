import { useState } from 'react';
import { LogIn, LogOut, Lock, ShieldCheck, MailWarning } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthBlocked, useVerificationEmailState } from '@/lib/authGate';
import { useUser } from '@/hooks/useUser';
import { firebaseSignOut, refreshEmailVerified, resendVerificationEmail } from '@/lib/firebase';

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

/**
 * Account block for the bottom of the nav menu: the auth status row plus a
 * sign-out action (exit icon). Sign-out renders only in `firebase` mode for a
 * signed-in user — iap/open sessions have no client-side sign-out, matching
 * SignOutButton. `onAction` lets the hosting menu close itself.
 */
export function AccountMenuSection({ onAction }: { onAction?: () => void }) {
  const qc = useQueryClient();
  const { authMode, isSignedIn } = useUser();
  const { status, email } = useAuthStatus();
  if (status === 'loading') return null;

  const signedIn = status === 'signed-in';
  const label = signedIn
    ? (email ?? 'Signed in')
    : status === 'blocked'
      ? 'Session expired'
      : 'Signed out';

  // Sign-out keys off the ACTUAL Firebase session (useUser), not the display
  // status: a `blocked` session is still a live Firebase account that a
  // reload would restore, so signing out must stay available as the escape
  // hatch — same basis as SignOutButton.
  const canSignOut = authMode === 'firebase' && isSignedIn;

  const onSignOut = async () => {
    try {
      await firebaseSignOut();
    } finally {
      qc.clear(); // drop cached data tied to the previous identity
      onAction?.();
    }
  };

  const actionCls =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--on-surface)]';

  return (
    <div className="mt-1 border-t border-[var(--surface-3)] pt-1" data-testid="account-menu-section">
      <div className="nav-group-label">Account</div>
      <div
        className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--on-surface-variant)]"
        data-testid="account-menu-status"
        data-status={status}
      >
        {signedIn ? (
          <ShieldCheck
            size={18}
            className="shrink-0 text-[var(--success, var(--on-surface-variant))]"
            aria-hidden
          />
        ) : (
          <Lock
            size={18}
            className="shrink-0 text-[var(--warning, var(--on-surface-variant))]"
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </div>
      {canSignOut && (
        <button type="button" onClick={onSignOut} data-testid="account-menu-sign-out" className={actionCls}>
          <LogOut size={18} className="shrink-0" aria-hidden />
          <span className="flex-1 text-left">Sign out</span>
        </button>
      )}
      {!signedIn && !canSignOut && (
        <button
          type="button"
          onClick={() => {
            onAction?.();
            goToSignIn();
          }}
          data-testid="account-menu-sign-in"
          className={actionCls}
        >
          <LogIn size={18} className="shrink-0" aria-hidden />
          <span className="flex-1 text-left">Sign in</span>
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

/**
 * Strip shown to a signed-in email/password account whose address is not yet
 * confirmed. Non-blocking: the app stays usable, the banner just keeps the
 * task visible and offers the two things the user can do about it. Never
 * renders outside `firebase` mode (emailVerified is null there) and never for
 * Google sign-ins (they arrive verified).
 *
 * "I've confirmed" re-reads the account from the server because clicking the
 * emailed link happens in another tab and does not fire onAuthStateChanged
 * here. Resend failures are shown, not swallowed (Rule 4).
 */
export function EmailVerificationBanner() {
  const { uid } = useUser();
  // Keyed by uid so the component-local state below (confirmed, resend,
  // re-check) is discarded when the account changes without the shell
  // unmounting, e.g. another tab replacing the persisted Firebase user:
  // account A's "I've confirmed" must not hide the banner from account B.
  return <EmailVerificationBannerFor key={uid ?? 'signed-out'} />;
}

function EmailVerificationBannerFor() {
  const { email, emailVerified, uid } = useUser();
  // What actually happened to the sign-up email: sign-up records it in the
  // authGate store because SignInScreen is unmounted by the time the send
  // resolves. Keyed by uid so an account switch without a reload never
  // inherits the previous account's outcome; 'unknown' = no send for this
  // account this session, so no claim is made.
  const delivery = useVerificationEmailState(uid);
  // Local override once a refresh reports verified; the subscription value
  // only updates on the next auth-state event.
  const [confirmed, setConfirmed] = useState(false);
  const [resend, setResend] = useState<
    { state: 'idle' } | { state: 'sending' } | { state: 'sent' } | { state: 'error'; message: string }
  >({ state: 'idle' });
  const [checking, setChecking] = useState(false);
  const [stillUnverified, setStillUnverified] = useState(false);

  if (emailVerified !== false || confirmed) return null;

  const onResend = async () => {
    setResend({ state: 'sending' });
    try {
      await resendVerificationEmail();
      setResend({ state: 'sent' });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setResend({
        state: 'error',
        message:
          e.code === 'auth/too-many-requests'
            ? 'Too many requests. Wait a few minutes and try again.'
            : `Could not send the email${e.message ? `: ${e.message}` : '.'}`,
      });
    }
  };

  const onConfirmed = async () => {
    setChecking(true);
    setStillUnverified(false);
    try {
      const verified = await refreshEmailVerified();
      if (verified) setConfirmed(true);
      else setStillUnverified(true);
    } catch (err) {
      const e = err as { message?: string };
      setResend({ state: 'error', message: `Could not check the account${e.message ? `: ${e.message}` : '.'}` });
    } finally {
      setChecking(false);
    }
  };

  const btnCls =
    'rounded-md border border-[var(--outline-variant)] bg-[var(--surface-1)] px-3 py-1 text-[12px] font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-0)] disabled:opacity-50';

  return (
    <div
      role="status"
      data-testid="email-verification-banner"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[var(--outline-variant)] bg-[var(--surface-2)] px-4 py-2 text-center text-[12px] text-[var(--on-surface)]"
    >
      <span className="flex items-center gap-1.5" data-delivery={delivery.status}>
        <MailWarning size={13} className="text-[var(--warning, var(--on-surface-variant))]" aria-hidden />
        Confirm your email address.
        {delivery.status === 'sent'
          ? email
            ? ` We sent a link to ${email}.`
            : ' We sent you a link.'
          : delivery.status === 'sending'
            ? ' Sending the confirmation email…'
            : delivery.status === 'failed'
              ? ` The confirmation email could not be sent (${delivery.message}). Resend it below.`
              : ' Use "Resend email" to get a fresh link.'}
      </span>
      {/* Disabled while ANY send is in flight, including the sign-up send that
          may still be settling when this banner first mounts, so two sends can
          never race (and a later failure cannot overwrite a successful resend). */}
      <button
        type="button"
        onClick={onResend}
        disabled={resend.state === 'sending' || delivery.status === 'sending'}
        data-testid="verification-resend"
        className={btnCls}
      >
        {resend.state === 'sending' || delivery.status === 'sending'
          ? 'Sending…'
          : resend.state === 'sent'
            ? 'Sent, check your inbox'
            : 'Resend email'}
      </button>
      <button type="button" onClick={onConfirmed} disabled={checking} data-testid="verification-check" className={btnCls}>
        {checking ? 'Checking…' : "I've confirmed"}
      </button>
      {stillUnverified && (
        <span className="text-[var(--on-surface-variant)]">Not confirmed yet. Open the link in the email, then try again.</span>
      )}
      {resend.state === 'error' && (
        <span data-testid="verification-error" className="text-[var(--bear)]">{resend.message}</span>
      )}
    </div>
  );
}
