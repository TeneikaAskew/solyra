import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { useAddUserTicker, useRemoveUserTicker, useUserWatchlist } from '@/hooks/useUserWatchlist';
import { useTickerSearch, type SearchMatch } from '@/hooks/useTickerSearch';
import type { MeWatchlistRow } from '@/types/watchlist';
import { rowDataText } from './watchlistCopy';

interface Props {
  onSelectTicker: (ticker: string) => Promise<void> | void;
}

/**
 * The signed-in user's own watchlist: one row per active ticker with its data
 * state and a remove control, and the ticker search to add one. Signed out
 * and the API's error are their own states, never an empty list (Rule 4).
 */
export function MyWatchlistSection({ onSelectTicker }: Props) {
  const { query, signedOut } = useUserWatchlist();
  const removeMutation = useRemoveUserTicker();
  const [showSearch, setShowSearch] = useState(false);
  // Per ticker, so a second remove in flight never re-enables the first
  // row's button, and each failure names its own ticker.
  const [pendingRemoves, setPendingRemoves] = useState<ReadonlySet<string>>(() => new Set());
  const [removeErrors, setRemoveErrors] = useState<ReadonlyMap<string, string>>(() => new Map());
  const now = new Date();

  const remove = async (ticker: string) => {
    setPendingRemoves((prev) => new Set(prev).add(ticker));
    setRemoveErrors((prev) => {
      const next = new Map(prev);
      next.delete(ticker);
      return next;
    });
    try {
      await removeMutation.mutateAsync(ticker);
    } catch (err) {
      // Shown below, per ticker: the mutation's own state holds only the
      // latest call, so an earlier failure would otherwise be lost.
      const message = err instanceof Error ? err.message : String(err);
      setRemoveErrors((prev) => new Map(prev).set(ticker, message));
    } finally {
      setPendingRemoves((prev) => {
        const next = new Set(prev);
        next.delete(ticker);
        return next;
      });
    }
  };

  return (
    <section
      data-testid="my-watchlist-section"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">My watchlist</h3>
        {!signedOut && (
          <button
            onClick={() => setShowSearch((v) => !v)}
            aria-expanded={showSearch}
            className="flex items-center gap-1 rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Plus size={10} />
            Add Ticker
          </button>
        )}
      </div>

      {!signedOut && showSearch && <TickerSearchPanel onClose={() => setShowSearch(false)} />}

      {signedOut ? (
        <div className="text-[11px] text-[var(--color-text-muted)]">Sign in to keep a watchlist</div>
      ) : query.isLoading ? (
        <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />
      ) : query.isError ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">
          {query.error.message}
        </div>
      ) : query.data ? (
        query.data.tickers.length === 0 ? (
          <div className="text-[11px] text-[var(--color-text-muted)]">Nothing yet; add a ticker</div>
        ) : (
          <div className="space-y-1">
            {query.data.tickers.map((row) => (
              <MyWatchlistRow
                key={row.ticker}
                row={row}
                now={now}
                onSelect={() => onSelectTicker(row.ticker)}
                onRemove={() => void remove(row.ticker)}
                removing={pendingRemoves.has(row.ticker)}
              />
            ))}
          </div>
        )
      ) : null}

      {[...removeErrors].map(([ticker, message]) => (
        <div
          key={ticker}
          role="alert"
          className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] text-red-300"
        >
          Couldn't remove {ticker}: {message}
        </div>
      ))}
    </section>
  );
}

function MyWatchlistRow({
  row,
  now,
  onSelect,
  onRemove,
  removing,
}: {
  row: MeWatchlistRow;
  now: Date;
  onSelect: () => Promise<void> | void;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div
      data-testid={`my-watchlist-row-${row.ticker}`}
      className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1"
    >
      <button
        onClick={() => void onSelect()}
        title={`Generate report for ${row.ticker}`}
        className="font-mono text-xs font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-accent-blue)]"
      >
        {row.ticker}
      </button>
      {row.name && <span className="truncate text-[11px] text-[var(--color-text-secondary)]">{row.name}</span>}
      <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
        {rowDataText(row, now)}
      </span>
      <button
        onClick={onRemove}
        disabled={removing}
        aria-label={`Remove ${row.ticker} from my watchlist`}
        data-testid={`my-watchlist-remove-${row.ticker}`}
        className="text-[var(--color-text-muted)] hover:text-red-400 disabled:opacity-50"
      >
        {removing ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticker search & add panel: adds to the user's own list
// ---------------------------------------------------------------------------

function TickerSearchPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce search queries
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 300);
  }, []);

  const searchQuery = useTickerSearch(debouncedQuery, debouncedQuery.length >= 1);
  const addMutation = useAddUserTicker();

  const add = async (ticker: string) => {
    try {
      await addMutation.mutateAsync({ ticker, source: 'ui' });
      // The new row appears in the list above with its own data state.
      setQuery('');
      setDebouncedQuery('');
      onClose();
    } catch {
      // error handled by mutation state
    }
  };

  const handleAdd = (match: SearchMatch) => add(match.symbol);

  const handleDirectAdd = async () => {
    if (!query.trim()) return;
    await add(query.trim().toUpperCase());
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          Add Ticker to Watchlist
        </span>
        <button
          onClick={onClose}
          aria-label="Close ticker search"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDirectAdd();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Search by name or symbol (e.g. broadcom, INTC)..."
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] pl-7 pr-3 py-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent-blue)] focus:outline-none"
          />
        </div>
        <button
          onClick={handleDirectAdd}
          disabled={!query.trim() || addMutation.isPending}
          className="flex items-center gap-1 rounded bg-[var(--color-accent-blue)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--on-brand)] disabled:opacity-50"
        >
          {addMutation.isPending ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Plus size={10} />
          )}
          Add
        </button>
      </div>

      {/* Search results dropdown */}
      {searchQuery.isLoading && debouncedQuery && (
        <div className="flex items-center gap-2 py-2 text-[10px] text-[var(--color-text-muted)]">
          <Loader2 size={10} className="animate-spin" />
          Searching...
        </div>
      )}

      {searchQuery.data && searchQuery.data.results.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {searchQuery.data.results.map((m) => (
            <button
              key={`${m.symbol}-${m.region}`}
              onClick={() => handleAdd(m)}
              disabled={addMutation.isPending}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
            >
              <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)] min-w-[60px]">
                {m.symbol}
              </span>
              <span className="flex-1 truncate text-[11px] text-[var(--color-text-secondary)]">
                {m.name}
              </span>
              <span className="text-[9px] text-[var(--color-text-muted)]">
                {m.type} · {m.region}
              </span>
              <span className="text-[9px] tabular-nums text-[var(--color-text-muted)]">
                {(m.match_score * 100).toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      )}

      {searchQuery.data && searchQuery.data.results.length === 0 && debouncedQuery && (
        <div className="py-2 text-center text-[10px] text-[var(--color-text-muted)]">
          No matches for "{debouncedQuery}". Press Enter or Add to add it directly.
        </div>
      )}

      {/* Error: the API's detail, verbatim */}
      {addMutation.isError && (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">
          {addMutation.error.message}
        </div>
      )}
    </div>
  );
}
