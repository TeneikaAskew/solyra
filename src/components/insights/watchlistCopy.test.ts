// FEAT-INSIGHT-001 done_when[1]: a row's data state under a fixed clock. Each of
// the three outcomes is asserted, so an implementation that always says the
// data is pending, or renders a blank, fails.
import { describe, expect, it } from 'vitest';
import type { MeWatchlistResponse, MeWatchlistRow } from '@/types/watchlist';
import { addedNotice, addFailedNotice, dataStateCopy } from './watchlistCopy';

// 09:00 EST; the most recent elapsed 00:30 ET is 2026-11-13T05:30:00Z.
const NOW = new Date('2026-11-13T14:00:00Z');

const row = (added_at: string, last_daily_bar: string | null): MeWatchlistRow => ({
  ticker: 'ABCD',
  added_at,
  source: 'ui',
  name: null,
  exchange: null,
  asset_type: null,
  last_daily_bar,
});

describe('dataStateCopy', () => {
  it('a null-bar row added after the boundary waits for tonight', () => {
    expect(dataStateCopy(row('2026-11-13T06:00:00Z', null), NOW)).toBe("data arrives after tonight's fetch");
  });

  it('a null-bar row added before the boundary has no data', () => {
    expect(dataStateCopy(row('2026-11-12T20:00:00Z', null), NOW)).toBe('no data for this symbol');
  });

  it('a row with a bar has no data-state copy; the bar date shows instead', () => {
    expect(dataStateCopy(row('2026-11-13T06:00:00Z', '2026-11-12'), NOW)).toBeNull();
  });
});

// FEAT-INSIGHT-001 Review Focus 4: the TickerCombobox auto-add notice says the ticker is on
// the user's list and shows that row's data state; it never promises ingest.
describe('addedNotice', () => {
  const listRow = (ticker: string, added_at: string, last_daily_bar: string | null): MeWatchlistRow => ({
    ticker,
    added_at,
    source: 'combobox-auto-add',
    name: null,
    exchange: null,
    asset_type: null,
    last_daily_bar,
  });
  const list = (...tickers: MeWatchlistRow[]): MeWatchlistResponse => ({
    as_of: '2026-11-13T14:00:00Z',
    owner_email: 'trader@example.com',
    tickers,
  });

  it('a row added after the boundary waits for tonight', () => {
    expect(addedNotice(list(listRow('AAPL', '2026-11-13T13:59:00Z', null)), 'AAPL', NOW)).toEqual({
      kind: 'success',
      message: "Added to your watchlist: data arrives after tonight's fetch",
    });
  });

  it('a row with no bar after a fetch has run says there is no data', () => {
    expect(addedNotice(list(listRow('AAPL', '2026-11-12T20:00:00Z', null)), 'AAPL', NOW)).toEqual({
      kind: 'success',
      message: 'Added to your watchlist: no data for this symbol',
    });
  });

  it('a row that already has a bar shows its date', () => {
    expect(addedNotice(list(listRow('AAPL', '2026-11-12T20:00:00Z', '2026-11-12')), 'AAPL', NOW)).toEqual({
      kind: 'success',
      message: 'Added to your watchlist: last bar 2026-11-12',
    });
  });

  it('reads the chosen ticker\'s row, not another one', () => {
    const notice = addedNotice(
      list(listRow('NVDA', '2026-11-12T20:00:00Z', '2026-11-12'), listRow('aapl', '2026-11-13T13:59:00Z', null)),
      'AAPL',
      NOW,
    );
    expect(notice.message).toBe("Added to your watchlist: data arrives after tonight's fetch");
  });

  it('a response that does not list the ticker is an error, never a success', () => {
    expect(addedNotice(list(listRow('NVDA', '2026-11-12T20:00:00Z', '2026-11-12')), 'AAPL', NOW)).toEqual({
      kind: 'error',
      message: "couldn't add AAPL to tracking, the watchlist response does not list AAPL",
    });
  });
});

describe('addFailedNotice', () => {
  it('carries the API detail verbatim', () => {
    expect(addFailedNotice('AAPL', 'watchlist write to Cloud SQL failed: connection refused')).toEqual({
      kind: 'error',
      message: "couldn't add AAPL to tracking, watchlist write to Cloud SQL failed: connection refused",
    });
  });
});
