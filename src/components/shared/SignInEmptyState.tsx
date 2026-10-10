import { useState, type ReactNode } from 'react';
import { Lock, MailWarning } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthBlocked, useVerificationRequired } from '@/lib/authGate';
import { useUser } from '@/hooks/useUser';
import { refreshEmailVerified } from '@/lib/firebase';
import { confirmEmailVerified } from '@/components/shared/AuthStatusIndicator';

/**
 * Empty state shown inside a data card when the API answered 401: the user
 * needs to sign in (or their session expired) before data can load. Reloading
 * routes through AuthGate, which shows the sign-in screen when no valid
 * session exists.
 */
export function SignInEmptyState({
  compact = false,
  onRetry,
}: {
  compact?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-2 text-center ${
        compact ? 'py-4' : 'py-10'
      }`}
    >
      <Lock size={compact ? 16 : 20} className="text-[var(--on-surface-muted)]" aria-hidden />
      <p className="text-[13px] font-medium text-[var(--on-surface)]">Sign in to load data</p>
      {!compact && (
        <p className="max-w-[40ch] text-[12px] text-[var(--on-surface-muted)]">
          Your session has expired or you are signed out. Sign in again to see live values here.
        </p>
      )}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-1 rounded-md border border-[var(--outline-variant)] px-3 py-1.5 text-[12px] font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-2)]"
      >
        Sign in
      </button>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-[12px] font-medium text-[var(--on-surface-muted)] underline underline-offset-2 hover:text-[var(--on-surface)]"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Shown in place of a card or a page body while the API answers this account's
 * gated calls with the verify-email 403. Delivery-neutral on purpose: whether
 * a link was ever sent is the banner's to say (it reads the delivery state).
 * Its one action is the confirm flow, not a retry, because a plain refetch
 * reuses the stale token and gets the same 403. No values are rendered.
 */
export function VerifyEmailEmptyState({ compact = false }: { compact?: boolean }) {
  const { uid } = useUser();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [stillUnverified, setStillUnverified] = useState(false);
  const onConfirmed = async () => {
    setChecking(true);
    setStillUnverified(false);
    try {
      if (!(await confirmEmailVerified(uid, refreshEmailVerified, queryClient))) setStillUnverified(true);
    } finally {
      setChecking(false);
    }
  };
  return (
    <div
      role="status"
      data-testid="verify-email-state"
      className={`flex flex-col items-center justify-center gap-2 text-center ${compact ? 'py-4' : 'py-10'}`}
    >
      <MailWarning size={compact ? 16 : 20} className="text-[var(--on-surface-muted)]" aria-hidden />
      <p className="text-[13px] font-medium text-[var(--on-surface)]">Confirm your email to load data</p>
      {!compact && (
        <p className="max-w-[44ch] text-[12px] text-[var(--on-surface-muted)]">
          Your email address isn't confirmed yet. Use the banner at the top of the page to send a link, then
          confirm here.
        </p>
      )}
      <button
        type="button"
        onClick={onConfirmed}
        disabled={checking}
        data-testid="verify-email-state-check"
        className="mt-1 rounded-md border border-[var(--outline-variant)] px-3 py-1.5 text-[12px] font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-2)] disabled:opacity-50"
      >
        {checking ? 'Checking…' : "I've confirmed"}
      </button>
      {stillUnverified && (
        <p className="text-[12px] text-[var(--on-surface-muted)]">Not confirmed yet. Open the link in the email, then try again.</p>
      )}
    </div>
  );
}

/**
 * Prominent page-level call-to-action shown above the data area when gated
 * API calls are answering 401. Renders nothing while auth is healthy, so it
 * can sit permanently above sections like charts and options.
 */
export function SignInBanner({ label }: { label: string }) {
  const blocked = useAuthBlocked();
  if (!blocked) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--outline-variant)] bg-[var(--surface-2)] px-4 py-3"
    >
      <Lock size={18} className="shrink-0 text-[var(--brand)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--on-surface)]">
          Sign in to load {label}
        </p>
        <p className="text-[12px] text-[var(--on-surface-muted)]">
          Your session has expired or you are signed out. Authenticate to stream live data here.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-md bg-[var(--brand)] px-4 py-2 text-[13px] font-semibold text-[var(--on-brand)] hover:opacity-90"
      >
        Sign in
      </button>
    </div>
  );
}

/**
 * Wraps a page/section body. It only replaces the content when the user is
 * genuinely signed out, or signed in with an unconfirmed email the API
 * refuses, i.e. no request can succeed. A single gated 401 while
 * signed in no longer unmounts a whole page (that would drop in-progress form
 * state); the page-level <SignInBanner /> plus each widget's own 401 state
 * communicate that case instead.
 */
export function DataGate({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const blocked = useAuthBlocked();
  const { isSignedIn, isLoading, uid } = useUser();
  const verificationRequired = useVerificationRequired(uid);
  if (blocked && !isLoading && !isSignedIn) return <SignInEmptyState compact={compact} />;
  // Signed in, but the API refuses this account until its email is confirmed:
  // the page's own error branches would otherwise speak first ("run the
  // generation pipeline" on /signals), none of them naming the real remedy.
  if (verificationRequired && isSignedIn) return <VerifyEmailEmptyState compact={compact} />;
  return <>{children}</>;
}
