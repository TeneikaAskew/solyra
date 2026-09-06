/**
 * Typed fixtures + mock-mode routes for the Trade Journal (`/journal`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/journal.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
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
import type { JournalRow, MineStyleSuccess, MineStyleUnavailable } from '@/hooks/useJournalChartTrades';
import type { MockRoute } from './types';
import { MOCK_MARKET_HOURS } from './common';

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
  // Wire timestamps are never Z-suffixed: Cloud SQL rows arrive as
  // 'YYYY-MM-DDTHH:MM:SS+00:00' (or naive) — journal.py AT TIME ZONE 'UTC'.
  entry_ts: '2026-04-24T14:00:00+00:00',
  exit_ts: '2026-04-24T15:30:00+00:00',
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
  entry_ts: '2026-04-25T09:31:00+00:00',
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
  entry_ts: '2026-04-24T14:00:00+00:00',
  exit_ts: '2026-04-24T15:30:00+00:00',
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
    // Pipeline rows ALWAYS carry the key (null or int) — journal.py's
    // _pipeline_rows_to_trades never omits it.
    time_stop_minutes: null,
    status: 'win',
    source: 'pipeline',
    session_id: null,
  },
]);

// ── Chart card structure ───────────────────────────────────────────────────

/** Dates come back as YYYYMMDD in production (months as YYYYMM), plus a
 *  `source` key; the page's ISO conversion assumes that. */
export const MOCK_JOURNAL_DATES = {
  ticker: 'IWM',
  source: 'cloud_sql',
  dates: ['20260425'],
  months: ['202604'],
};

/** No dates at all — renders the chart card's honest no-data state. */
export const MOCK_JOURNAL_DATES_EMPTY = {
  ticker: 'IWM',
  source: 'cloud_sql',
  dates: [],
  months: [],
};

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

/** POST /api/journal/export/{ticker} — the exact keys journal.py returns
 *  and JournalPage reads (`trades_exported`, `filename`) for its "Exported N
 *  closed trades → file" status line. */
export const MOCK_JOURNAL_EXPORT = {
  success: true,
  trades_exported: 1,
  output_path: 'data/signals/iwm_trade_tracker.csv',
  filename: 'iwm_trade_tracker.csv',
};

// ── "My style" panel (POST /api/style/mine-and-validate, issue #14) ────────
// NOT wired into the route tables: the panel only POSTs on an explicit button
// click, and its specs assert on the request body, so they register their own
// handlers — same convention as the import/commit mutations.

/** Mined + walk-forward-validated profile — the panel's full success render:
 *  direction badge, three condition chips (one parameterized), support/total
 *  sample sizes, fold count + stability, staged marker. */
export const MOCK_MINE_STYLE_SUCCESS = {
  profile: {
    direction: 'CALL',
    conditions: ['rsi_50_75', 'above_vwap', 'consec_up_ge_3'],
    support: 9,
    total: 14,
  },
  aggregate_metrics: {
    avg_expectancy_pct: 0.42, // TRUE PERCENT
    avg_win_rate: 0.57, // 0-1 fraction
    total_trades_all_folds: 63,
    total_folds: 5,
  },
  stability_score: 0.8,
  staged: true,
} satisfies MineStyleSuccess;

/** The server's honest not-enough-signal envelope (always a 200 — Rule 3.7:
 *  an expected, recoverable state, not an error). */
export const MOCK_MINE_STYLE_UNAVAILABLE = {
  status: 'unavailable',
  reason: 'Need at least 10 closed trades to mine a style profile (have 3).',
} satisfies MineStyleUnavailable;

/**
 * Mock-mode route table for `/journal` — the happy-path translation of
 * `mockJournalApi` (tests/helpers/fixtures/journal.ts) with its default
 * options: empty own journal, empty Examples, no chart-card dates.
 *
 * Import mutations (POST /api/journal/trades, /import/preview,
 * /import/commit) are not wired, mirroring the fixture — a miss is answered
 * 501 loudly by the engine, so the gap stays visible.
 */
export const journalRoutes: MockRoute[] = [
  { pattern: /^\/api\/market\/dates\/IWM$/, reply: () => ({ body: MOCK_JOURNAL_DATES_EMPTY }) },
  {
    pattern: /^\/api\/market\/data\/IWM\/([^/]+)$/,
    reply: () => ({ body: MOCK_JOURNAL_MARKET_DATA }),
  },
  { pattern: /^\/api\/config\/market-hours$/, reply: () => ({ body: MOCK_MARKET_HOURS }) },
  { pattern: /^\/api\/journal\/examples\/IWM$/, reply: () => ({ body: MOCK_JOURNAL_EMPTY }) },
  { pattern: /^\/api\/journal\/trades\/IWM$/, reply: () => ({ body: MOCK_JOURNAL_EMPTY }) },
  {
    method: 'POST',
    pattern: /^\/api\/journal\/export\/([^/]+)$/,
    reply: () => ({ body: MOCK_JOURNAL_EXPORT }),
  },
];
