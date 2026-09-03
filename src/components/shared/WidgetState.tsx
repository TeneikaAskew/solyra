import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuthBlocked } from '@/lib/authGate';
import { SignInEmptyState } from '@/components/shared/SignInEmptyState';

/**
 * Per-widget states: each data card owns its own loading skeleton, auth
 * (401) state, and network/error state with a retry button. No fabricated
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
  const authBlocked = useAuthBlocked();
  const loading = query.isLoading ?? query.isPending ?? false;
  const retry = query.refetch ? () => void query.refetch?.() : undefined;

  if (loading) return <WidgetSkeleton rows={skeletonRows} compact={compact} />;
  if (authBlocked || (query.isError && isAuthError(query.error))) {
    return <SignInEmptyState compact={compact} onRetry={retry} />;
  }
  if (query.isError) {
    return <WidgetError message={errorMessage(query.error)} onRetry={retry} compact={compact} />;
  }
  return <>{children}</>;
}
