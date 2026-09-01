/**
 * Typed fixtures + route wiring for the Trade Journal (`/journal`).
 *
 * Endpoint fan-out, read off JournalPage.tsx + useJournalChartTrades.ts:
 *   GET  /api/journal/trades/{ticker}    own journal      → JournalTradesResponse
 *   GET  /api/journal/examples/{ticker}  Examples union   → JournalTradesResponse
 *   POST /api/journal/trades             create
 *   POST /api/journal/import/preview     broker CSV step 1
 *   POST /api/journal/import/commit      broker CSV step 3
 *   GET  /api/market/dates/{ticker}      chart card date list
 *   GET  /api/market/data/{ticker}/{d}   chart card candles
 *   GET  /api/config/market-hours        RTH window
 *
 * Contract note: journal.spec.ts previously carried TWO fixtures for the same
 * endpoint with incompatible shapes — one using `trade_id`/`shares`/`pnl` and
 * `direction: 'long'`, none of which exist on `JournalRow` (it wants
 * `id`/`return_pct`/`status`, direction 'CALL'|'PUT'). The row's id was
 * therefore undefined at render. Everything here is pinned with `satisfies`
 * so that can't recur.
 */
import type { Page } from '@playwright/test';
import type { JournalRow } from '@/hooks/useJournalChartTrades';
import { M, mockCommon } from '../mocks';
import { MOCK_MARKET_HOURS } from './dashboard';

/** `JournalTradesResponse` is internal to useJournalChartTrades.ts. */
export interface JournalTradesResponse {
  ticker: string;
  source: 'cloud_sql' | 'local';
  count: number;
  trades: JournalRow[];
}

const wrap = (trades: JournalRow[]): JournalTradesResponse => ({
  ticker: 'IWM',
  source: 'cloud_sql',
  count: trades.length,
  trades,
});

// ── Individual rows ────────────────────────────────────────────────────────

/** Closed winner, manually logged. */
export const CLOSED_TRADE = {
  id: '00000000-0000-0000-0000-000000000001',
  ticker: 'IWM',
  direction: 'CALL',
  entry_ts: '2026-04-24T14:00:00Z',
  exit_ts: '2026-04-24T15:30:00Z',
  entry_price: 220.0,
  exit_price: 222.5,
  return_pct: 1.14,
  notes: 'Breakout above PD high.',
  status: 'win',
  source: 'manual',
  session_id: null,
} satisfies JournalRow;

/** Open position drawn on the chart — null exit, so the table must render
 *  dashes plus an "active" chip rather than crashing or faking a return. */
export const ACTIVE_TRADE = {
  id: '00000000-0000-0000-0000-000000000002',
  ticker: 'IWM',
  direction: 'PUT',
  entry_ts: '2026-04-25T09:31:00Z',
  exit_ts: null,
  entry_price: 218.0,
  exit_price: null,
  return_pct: null,
  notes: 'Still open — chart-marked.',
  status: 'active',
  source: 'chart',
  take_profits: [216, 214],
  stop_loss: 220,
  session_id: null,
} satisfies JournalRow;

/** Real trade — counts toward stats by default. */
export const MANUAL_TRADE = {
  id: '00000000-0000-0000-0000-0000000000a1',
  ticker: 'IWM',
  direction: 'CALL',
  entry_ts: '2026-04-24T14:00:00Z',
  exit_ts: '2026-04-24T15:30:00Z',
  entry_price: 220.0,
  exit_price: 242.0,
  return_pct: 10.0,
  notes: 'Manual win trade.',
  status: 'win',
  source: 'manual',
  session_id: null,
} satisfies JournalRow;

/** Bar-replay-trainer practice row — excluded from stats unless the
 *  "Include practice sessions" toggle is on (Task 5.3 hygiene). */
export const REPLAY_TRADE = {
  id: '00000000-0000-0000-0000-0000000000a2',
  ticker: 'IWM',
  direction: 'PUT',
  entry_ts: '2026-04-25T09:36:00',
  exit_ts: '2026-04-25T09:40:00',
  entry_price: 220.25,
  exit_price: 330.375,
  return_pct: -50.0,
  notes: 'Practice replay trade.',
  status: 'loss',
  source: 'replay',
  session_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
} satisfies JournalRow;

// ── Response envelopes ─────────────────────────────────────────────────────

export const MOCK_JOURNAL_TRADES = wrap([CLOSED_TRADE]);
export const MOCK_JOURNAL_TRADES_WITH_ACTIVE = wrap([CLOSED_TRADE, ACTIVE_TRADE]);
export const MOCK_JOURNAL_EMPTY = wrap([]);

/** Manual + replay in one response — drives the practice-hygiene assertions:
 *  default stats see only the manual row (+10.00%, 1W/0L); with the toggle on
 *  the aggregate becomes (10 + -50)/2 = -20.00%, total -40.00%, 1W/1L. */
export const MOCK_MIXED_TRADES = wrap([MANUAL_TRADE, REPLAY_TRADE]);

/**
 * task-examples-union: the Examples response carries BOTH an admin-authored
 * journal_entries row (source:'chart') and an automated-pipeline `trades` row
 * (source:'pipeline'). Both are wins so a 2W/0L tile is unambiguous evidence
 * the pipeline row's return_pct folds into stats like any other row — the
 * stats layer must not treat 'pipeline' specially.
 */
export const MOCK_EXAMPLES_UNION = wrap([
  {
    id: 'admin-union-1',
    ticker: 'IWM',
    direction: 'CALL',
    entry_ts: '2026-04-25T09:35:00',
    exit_ts: '2026-04-25T10:15:00',
    entry_price: 220.0,
    exit_price: 222.5,
    return_pct: 1.14,
    notes: 'Admin-authored example.',
    take_profits: [],
    stop_loss: null,
    status: 'win',
    source: 'chart',
    session_id: null,
  },
  {
    id: 'pipe-9001',
    ticker: 'IWM',
    direction: 'PUT',
    entry_ts: '2026-04-25T10:30:00',
    exit_ts: '2026-04-25T11:00:00',
    entry_price: 221.0,
    exit_price: 219.5,
    return_pct: 0.68,
    notes: 'target_hit',
    take_profits: [],
    stop_loss: null,
    status: 'win',
    source: 'pipeline',
    session_id: null,
  },
]);

// ── Chart card structure ───────────────────────────────────────────────────

/** Dates come back as YYYYMMDD in production; the page's ISO conversion
 *  assumes that. */
export const MOCK_JOURNAL_DATES = { ticker: 'IWM', dates: ['20260425'], months: ['2026-04'] };

/** No dates at all — renders the chart card's honest no-data state. */
export const MOCK_JOURNAL_DATES_EMPTY = { ticker: 'IWM', dates: [], months: [] };

export const MOCK_JOURNAL_MARKET_DATA = {
  ticker: 'IWM',
  date: '2026-04-25',
  timeframe: 1,
  count: 0,
  candlestick: [],
  volume: [],
};

// ── Broker CSV import ──────────────────────────────────────────────────────

/**
 * Grounded in tests/fixtures/robinhood_sample.csv: those 9 data rows produce,
 * via the broker-import parse+FIFO-pair pipeline, exactly 3 paired trades
 * (IWM CALL closed, SPY PUT closed, QQQ CALL still active — no matching STC)
 * and 4 skips (a shares row, a short option, a dividend code, a blank-ticker
 * cash transfer). The IWM row is additionally marked `duplicate: true` to
 * exercise the pre-unchecked/labeled duplicate path.
 *
 * No frontend type models this payload, so the shape is declared here.
 */
export interface ImportPreviewTrade {
  ticker: string;
  direction: 'CALL' | 'PUT';
  entry_ts: string;
  entry_price: number;
  exit_ts: string | null;
  exit_price: number | null;
  return_pct: number | null;
  quantity: number;
  status: 'closed' | 'active';
  duplicate: boolean;
}

export interface ImportPreviewResponse {
  broker: string;
  trades: ImportPreviewTrade[];
  skipped: { raw_index: number; reason: string }[];
}

export const MOCK_IMPORT_PREVIEW = {
  broker: 'robinhood',
  trades: [
    {
      ticker: 'IWM',
      direction: 'CALL',
      entry_ts: '2026-06-01 00:00',
      entry_price: 1.42,
      exit_ts: '2026-06-03 00:00',
      exit_price: 1.71,
      return_pct: 20.42,
      quantity: 2,
      status: 'closed',
      duplicate: true,
    },
    {
      ticker: 'SPY',
      direction: 'PUT',
      entry_ts: '2026-06-02 00:00',
      entry_price: 3.1,
      exit_ts: '2026-06-05 00:00',
      exit_price: 2.95,
      return_pct: -4.84,
      quantity: 1,
      status: 'closed',
      duplicate: false,
    },
    {
      ticker: 'QQQ',
      direction: 'CALL',
      entry_ts: '2026-06-04 00:00',
      entry_price: 5.2,
      exit_ts: null,
      exit_price: null,
      return_pct: null,
      quantity: 1,
      status: 'active',
      duplicate: false,
    },
  ],
  skipped: [
    { raw_index: 5, reason: 'shares — options only in v1' },
    { raw_index: 6, reason: 'short options not supported' },
    { raw_index: 7, reason: 'unsupported activity type: CDIV' },
    { raw_index: 8, reason: 'unsupported activity type: ACH' },
  ],
} satisfies ImportPreviewResponse;

/** Commit of the preview above with the duplicate left unchecked. */
export const MOCK_IMPORT_COMMIT = { imported: 2, skipped_duplicates: 1 };

/** POST /api/journal/export/{ticker} — pipeline acknowledgement. */
export const MOCK_JOURNAL_EXPORT = { ticker: 'IWM', exported: 1, status: 'ok' };

export interface JournalMockOpts {
  /** Called with the parsed POST body of an export, to assert that only
   *  closed trades were sent. */
  onExport?: (body: unknown) => void;
  exportResponse?: unknown;
  /** The user's own journal. Default: empty. */
  own?: JournalTradesResponse;
  /** The Examples union. Default: empty. */
  examples?: JournalTradesResponse;
  /** Trading-date list for the chart card. Default: empty (no-data state). */
  dates?: { ticker: string; dates: string[]; months: string[] };
  /** Invoked on each GET of the own-journal route — for refetch assertions. */
  onOwnTradesFetch?: () => void;
}

/**
 * Intercept every endpoint `/journal` hits on first paint, scoped to IWM.
 * Includes `mockCommon`, so callers don't need it separately.
 *
 * Mutation endpoints (POST /api/journal/trades, /import/preview, /import/commit)
 * are NOT wired: the specs that drive them assert on the request body, so they
 * register their own handlers.
 */
export async function mockJournalApi(page: Page, opts: JournalMockOpts = {}) {
  await mockCommon(page);
  const own = opts.own ?? MOCK_JOURNAL_EMPTY;
  const examples = opts.examples ?? MOCK_JOURNAL_EMPTY;
  const dates = opts.dates ?? MOCK_JOURNAL_DATES_EMPTY;

  await page.route('**/api/market/dates/IWM', (r) => r.fulfill(M.ok(dates)));
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(MOCK_JOURNAL_MARKET_DATA)));
  await page.route('**/api/config/market-hours', (r) => r.fulfill(M.ok(MOCK_MARKET_HOURS)));
  await page.route('**/api/journal/examples/IWM', (r) => r.fulfill(M.ok(examples)));
  await page.route('**/api/journal/trades/IWM*', (r) => {
    opts.onOwnTradesFetch?.();
    return r.fulfill(M.ok(own));
  });

  // CSV export. The page filters to CLOSED trades before posting (an active
  // row has no exit and the server 422s on a partial item), so a spec can use
  // `onExport` to assert that filtering actually happened.
  await page.route('**/api/journal/export/*', (r) => {
    try {
      opts.onExport?.(JSON.parse(r.request().postData() || '{}'));
    } catch {
      opts.onExport?.(null);
    }
    return r.fulfill(M.ok(opts.exportResponse ?? MOCK_JOURNAL_EXPORT));
  });
}
