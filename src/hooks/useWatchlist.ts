import { useQuery } from '@tanstack/react-query';
import type { CatalystType, WatchlistResponse } from '@/types/watchlist';

interface UseWatchlistOpts {
  catalystFilter?: CatalystType[];   // empty / undefined = no filter
  limit?: number;
  enabled?: boolean;
  /** The user's own tickers; the ranker scores them beside the default list. */
  extras?: string[];
}

/** Canonical extras list: upper-case, trimmed, deduped, sorted, comma-joined. Empty string = none. */
export function normalizeExtras(extras: string[] | undefined): string {
  const set = new Set((extras ?? []).map(t => t.trim().toUpperCase()).filter(Boolean));
  return [...set].sort().join(',');
}

// ---------------------------------------------------------------------------
// GET /api/insights/watchlist — deterministic ranker output.
// Cached for 5min by default; the ranker itself is cheap (~5s) but the
// data behind it (catalyst tables) refreshes on a 30-min granularity at
// most, so revalidating more often is wasted I/O.
// ---------------------------------------------------------------------------

export function useWatchlist(opts: UseWatchlistOpts = {}) {
  const { catalystFilter, limit = 10, enabled = true, extras } = opts;
  const extrasKey = normalizeExtras(extras);
  const filterStr = (catalystFilter ?? []).filter(Boolean).join(',');
  const params = new URLSearchParams();
  if (filterStr) params.set('catalyst', filterStr);
  if (limit) params.set('limit', String(limit));
  if (extrasKey) params.set('extras', extrasKey);

  return useQuery<WatchlistResponse>({
    queryKey: ['watchlist', filterStr, limit, extrasKey],
    queryFn: async () => {
      const r = await fetch(`/api/insights/watchlist?${params.toString()}`);
      if (!r.ok) throw new Error(`watchlist ${r.status}`);
      return r.json();
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}
