import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { SignInEmptyState, VerifyEmailEmptyState } from '@/components/shared/SignInEmptyState';
import { useUser } from '@/hooks/useUser';
import { useVerificationRequired } from '@/lib/authGate';

/**
 * Per-widget states: each data card owns its own loading skeleton, auth
 * (401) state, verify-email (403) state, and network/error state with a retry
 * button. No fabricated
 * values are rendered in any of these branches.
 */

export function WidgetSkeleton({ rows = 3, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex w-full flex-col gap-2 ${compact ? 'py-2' : 'py-3'}`}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export function WidgetError({
  message,
  onRetry,
  compact = false,
}: {
  message?: string | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-2 text-center ${
        compact ? 'py-4' : 'py-8'
      }`}
    >
      <AlertTriangle size={compact ? 16 : 20} className="text-[var(--on-surface-muted)]" aria-hidden />
      <p className="text-[13px] font-medium text-[var(--on-surface)]">Couldn't load this data</p>
      {message && (
        <p className="max-w-[42ch] break-words text-[12px] text-[var(--on-surface-muted)]">{message}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[var(--outline-variant)] px-3 py-1.5 text-[12px] font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-2)]"
        >
          <RefreshCw size={12} aria-hidden />
          Retry
        </button>
      )}
    </div>
  );
}

/** Minimal shape shared by TanStack queries; lets any fetch hook plug in. */
export interface WidgetQueryLike {
  isLoading?: boolean;
  isPending?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  error?: unknown;
  refetch?: () => unknown;
}

/** True when an error came from a 401 gated response. */
export function isAuthError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /\b401\b/.test(msg) || /unauthor/i.test(msg);
}

export function errorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message) {
    return /^\d{3}$/.test(error.message) ? `Request failed (HTTP ${error.message})` : error.message;
  }
  if (typeof error === 'string' && error) return error;
  return null;
}

/**
 * Wraps a single widget's body. Order matters: loading, then auth, then
 * error, then content. Auth and error branches both expose a retry action so
 * a transient network failure doesn't require a full page reload.
 */
export function WidgetState({
  query,
  children,
  compact = false,
  skeletonRows = 3,
}: {
  query: WidgetQueryLike;
  children: ReactNode;
  compact?: boolean;
  skeletonRows?: number;
}) {
  const { uid } = useUser();
  const verificationRequired = useVerificationRequired(uid);
  const loading = query.isLoading ?? query.isPending ?? false;
  const retry = query.refetch ? () => void query.refetch?.() : undefined;

  if (loading) return <WidgetSkeleton rows={skeletonRows} compact={compact} />;
  if (query.isError) {
    const kind = widgetErrorKind(query.error, verificationRequired);
    if (kind === 'auth') return <SignInEmptyState compact={compact} onRetry={retry} />;
    // No Retry here: a plain refetch reuses the stale token and gets the same 403.
    if (kind === 'verify') return <VerifyEmailEmptyState compact={compact} />;
    return <WidgetError message={errorMessage(query.error)} onRetry={retry} compact={compact} />;
  }
  return <>{children}</>;
}

/**
 * Which state a failed widget shows. A 401 is always the sign-in state. While
 * the API is answering this account's gated calls with the verify-email 403
 * (tracked by the fetch layer, not read from the message, since some hooks
 * throw only the detail), any other error is that 403: an unverified account
 * cannot load gated data at all, and the flag clears on the first success.
 */
export function widgetErrorKind(error: unknown, verificationRequired: boolean): 'auth' | 'verify' | 'error' {
  if (isAuthError(error)) return 'auth';
  return verificationRequired ? 'verify' : 'error';
}
