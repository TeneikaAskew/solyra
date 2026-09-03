import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuthBlocked } from '@/lib/authGate';
import { useUser } from '@/hooks/useUser';

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
 * genuinely signed out, i.e. no request can succeed. A single gated 401 while
 * signed in no longer unmounts a whole page (that would drop in-progress form
 * state); the page-level <SignInBanner /> plus each widget's own 401 state
 * communicate that case instead.
 */
export function DataGate({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const blocked = useAuthBlocked();
  const { isSignedIn, isLoading } = useUser();
  if (blocked && !isLoading && !isSignedIn) return <SignInEmptyState compact={compact} />;
  return <>{children}</>;
}
