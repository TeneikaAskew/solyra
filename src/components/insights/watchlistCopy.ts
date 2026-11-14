import { lastIngestWindowStart } from '@/lib/marketSession';
import type { MeWatchlistResponse, MeWatchlistRow } from '@/types/watchlist';

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

/** A transient notice about a watchlist write (the TickerCombobox auto-add). */
export type WatchlistNotice = { kind: 'success' | 'error'; message: string };

/** The error notice for an auto-add that did not land on the user's list. */
export function addFailedNotice(ticker: string, reason: string): WatchlistNotice {
  return { kind: 'error', message: `couldn't add ${ticker} to tracking, ${reason}` };
}

/**
 * The notice for an auto-add the API answered: `Added to your watchlist`
 * followed by the added row's data state (or its last bar date), read from
 * the list the POST returned. It never promises ingest. A list without the
 * ticker is a server bug, so it reads as a failure rather than a success
 * the response does not show (Rule 4).
 */
export function addedNotice(list: MeWatchlistResponse, ticker: string, now: Date): WatchlistNotice {
  const row = list.tickers.find((r) => r.ticker.toUpperCase() === ticker);
  if (!row) return addFailedNotice(ticker, `the watchlist response does not list ${ticker}`);
  const state = dataStateCopy(row, now) ?? `last bar ${row.last_daily_bar}`;
  return { kind: 'success', message: `Added to your watchlist: ${state}` };
}
