import { lastIngestWindowStart } from '@/lib/marketSession';
import type { MeWatchlistRow } from '@/types/watchlist';

export type DataStateCopy = "data arrives after tonight's fetch" | 'no data for this symbol';

/**
 * What a row of the user's watchlist says about its data. `null` when the row
 * has a daily bar (the caller shows that bar's date). A row with no bar says
 * its data is still to come only while it was added after the most recent
 * elapsed 00:30 ET ingest boundary; after a fetch has run over it, the honest
 * answer is that there is no data for the symbol. Reads `last_daily_bar` and
 * `added_at` only.
 */
export function dataStateCopy(row: MeWatchlistRow, now: Date): DataStateCopy | null {
  if (typeof row.last_daily_bar === 'string') return null;
  const addedAt = new Date(row.added_at).getTime();
  return addedAt > lastIngestWindowStart(now).getTime()
    ? "data arrives after tonight's fetch"
    : 'no data for this symbol';
}
