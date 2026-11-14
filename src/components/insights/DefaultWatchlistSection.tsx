import { Loader2 } from 'lucide-react';
import { useDefaultWatchlist } from '@/hooks/useUserWatchlist';
import { isoToEtZoned } from '@/lib/time';

const FLAG_BADGE_CLASS = 'rounded border border-zinc-500/40 bg-zinc-500/15 px-1 py-px text-[9px] font-medium text-zinc-300';

/**
 * The default watchlist, read-only. It is edited in Discord, so this section
 * carries no add or remove control.
 */
export function DefaultWatchlistSection() {
  const query = useDefaultWatchlist();

  return (
    <section
      data-testid="default-watchlist-section"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 space-y-2"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">Managed in Discord</h3>
        {query.data && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            as of {isoToEtZoned(query.data.as_of) ?? 'time unavailable'}
          </span>
        )}
      </div>

      {query.isLoading ? (
        <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />
      ) : query.isError ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">
          {query.error.message}
        </div>
      ) : query.data ? (
        <div className="flex flex-wrap gap-2">
          {query.data.rows.map((row) => (
            <div
              key={row.ticker}
              className="flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1"
            >
              <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">{row.ticker}</span>
              {row.in_brief && <span className={FLAG_BADGE_CLASS}>brief</span>}
              {row.in_insight && <span className={FLAG_BADGE_CLASS}>insight</span>}
              {row.signals && <span className={FLAG_BADGE_CLASS}>signals</span>}
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-[10px] text-[var(--color-text-muted)]">
        Changed in Discord with /watchlist add and /watchlist remove
      </p>
    </section>
  );
}
