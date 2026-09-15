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
import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  ImportPreviewTrade,
  JournalDeleteResponse,
  JournalMutationResponse,
  JournalRow,
  JournalTradesResponse,
  MineStyleSuccess,
  MineStyleUnavailable,
  SeedTradesOk,
} from '@/hooks/useJournalChartTrades';
import type { MockRoute } from './types';

// Re-exported so mocks/charts.ts and the E2E fixtures keep one import site.
export type { ImportPreviewResponse, ImportPreviewTrade, JournalTradesResponse };

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
  entry_ts: '2026-04-23T14:00:00+00:00',
  exit_ts: '2026-04-23T15:30:00+00:00',
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
  entry_ts: '2026-04-24T09:31:00+00:00',
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
  entry_ts: '2026-04-23T14:00:00+00:00',
  exit_ts: '2026-04-23T15:30:00+00:00',
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
  entry_ts: '2026-04-24T09:36:00',
  exit_ts: '2026-04-24T09:40:00',
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
    entry_ts: '2026-04-24T09:35:00',
    exit_ts: '2026-04-24T10:15:00',
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
    entry_ts: '2026-04-24T10:30:00',
    exit_ts: '2026-04-24T11:00:00',
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
  dates: ['20260424'],
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
  date: '2026-04-24',
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
 * Typed against the hook's `ImportPreviewResponse` (useJournalChartTrades),
 * the same type the modal's mutation parses into.
 */
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

/** Commit of the preview above with the duplicate left unchecked — kept for
 *  Playwright specs that register their own handlers; the mock-mode route
 *  below computes its totals from the submitted rows instead (Codex, #64). */
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
// Wired into journalRoutes below since issue #57 (mock mode answers the
// button click with the success profile); specs that assert on the request
// body still register their own handlers, which win over the table.

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

// ── Mutation + seed payloads (issue #57: every requested operation gets a
// route so hermetic/offline work can exercise the full flows; the loud 501
// is for genuine table GAPS, not for whole features) ───────────────────────

/** POST /api/journal/trades — the row journal.py creates for a chart entry. */
export const MOCK_JOURNAL_CREATE = {
  source: 'cloud_sql',
  id: 'mock-created-1',
  return_pct: null, // just opened — no return yet (Rule 4: null, never 0)
  status: 'active',
} satisfies JournalMutationResponse;

/** PATCH /api/journal/trades/{id} — the close of the trade above. */
export const MOCK_JOURNAL_CLOSE = {
  source: 'cloud_sql',
  id: 'mock-created-1',
  return_pct: 12.5, // PERCENT, server-computed
  status: 'win',
} satisfies JournalMutationResponse;

export const MOCK_JOURNAL_DELETED = {
  source: 'cloud_sql',
  deleted: 'mock-created-1',
} satisfies JournalDeleteResponse;

/** GET /api/journal/seed/{ticker} — replay-trainer seed trades for the
 *  MOCK_JOURNAL_DATES day the Charts card offers. */
export const MOCK_SEED_TRADES = {
  ticker: 'IWM',
  date: '2026-04-24',
  count: 2,
  trades: [
    {
      id: 'seed-1',
      direction: 'CALL',
      entry_time: '2026-04-24T13:35:00',
      entry_price: 218.4,
      exit_time: '2026-04-24T15:10:00',
      exit_price: 220.1,
      return_pct: 0.78,
      strat_combo: '2D-2U RevStrat',
      exit_reason: 'target',
    },
    {
      id: 'seed-2',
      direction: 'PUT',
      entry_time: '2026-04-24T17:05:00',
      entry_price: 221.3,
      exit_time: null,
      exit_price: null,
      return_pct: null,
      strat_combo: null,
      exit_reason: null,
    },
  ],
} satisfies SeedTradesOk;

// ── In-memory journal state (Codex, #64) ───────────────────────────────────
// The mutation routes used to answer success while every subsequent GET
// still returned MOCK_JOURNAL_EMPTY, so a created trade vanished on the
// invalidate-refetch and a replay session could never find its closed
// trades for the scorecard. Module state backs the flow instead: POST
// appends, PATCH closes, DELETE removes, import/commit appends
// non-duplicates, and the per-ticker GET reads it. Starts empty (same
// first render as before); mock mode is a per-tab dev mode, so a reload
// starts clean. Return %/status/dedupe below mirror journal.py's own
// helpers (`_return_pct`, `_import_return_pct`, `_derive_status`,
// `_dedupe_key`) so mock mode can't render a win for a loss (Codex, #64
// verification review).

const journalStore: JournalRow[] = [];
let nextMockId = 1;

/** The identity the preview flags `duplicate: true` — commit re-detects it
 *  the way the server re-checks its own journal. */
const PREVIEW_DUPLICATE = MOCK_IMPORT_PREVIEW.trades[0];

/** journal.py `_dedupe_key` compares entry_ts at MINUTE precision with a
 *  space separator — a created row stores seconds ("...T09:31:00") while a
 *  broker import arrives as "... 09:31", and the two must still collide. */
const minuteKey = (ts: string): string => ts.replace('T', ' ').slice(0, 16);

const isStoredDuplicate = (t: {
  ticker: string; direction: string; entry_ts: string; entry_price: number;
}): boolean => {
  const key = minuteKey(t.entry_ts);
  return (
    journalStore.some(
      (row) =>
        row.ticker === t.ticker &&
        row.direction === t.direction &&
        typeof row.entry_ts === 'string' &&
        minuteKey(row.entry_ts) === key &&
        row.entry_price === t.entry_price,
    ) ||
    (t.ticker === PREVIEW_DUPLICATE.ticker &&
      t.direction === PREVIEW_DUPLICATE.direction &&
      minuteKey(PREVIEW_DUPLICATE.entry_ts) === key &&
      t.entry_price === PREVIEW_DUPLICATE.entry_price)
  );
};

/** journal.py `_derive_status`: no exit → active; otherwise win/loss/
 *  breakeven by the sign of the server-recomputed return. Client-supplied
 *  status is never trusted. */
const deriveMockStatus = (hasExit: boolean, pct: number | null): string => {
  if (!hasExit) return 'active';
  if (pct == null) return 'closed';
  if (pct > 0) return 'win';
  if (pct < 0) return 'loss';
  return 'breakeven';
};

/**
 * Mock-mode routes OWNED by the journal domain: the journal reads, the
 * export/import/create/close/delete mutations, the replay-trainer seed, and
 * the "My style" miner (issue #57 wired the mutations; they answered 501
 * before). The chart card's market dates/candles and the RTH window are
 * served by ./charts, ./live and ./common — one canonical route per
 * endpoint across the whole engine (see src/mocks/index.ts).
 *
 * Specs that assert on request BODIES (import modal, style panel) keep
 * registering their own Playwright handlers, which win over these.
 */
export const journalRoutes: MockRoute[] = [
  { pattern: /^\/api\/journal\/examples\/IWM$/, reply: () => ({ body: MOCK_JOURNAL_EMPTY }) },
  {
    pattern: /^\/api\/journal\/trades\/([^/]+)$/,
    reply: (_req, match) => {
      const ticker = match[1].toUpperCase();
      const trades = journalStore.filter((t) => t.ticker === ticker);
      const body = {
        ticker,
        source: 'cloud_sql',
        count: trades.length,
        trades,
      } satisfies JournalTradesResponse;
      return { body };
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/journal\/export\/([^/]+)$/,
    reply: () => ({ body: MOCK_JOURNAL_EXPORT }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/journal\/trades$/,
    reply: (req) => {
      const b = (req.body ?? {}) as Partial<{
        ticker: string; direction: string; entry_date: string;
        entry_time: string; entry_price: number; stop_loss: number;
        take_profits: number[]; source: string; session_id: string;
        exit_date: string; exit_time: string; exit_price: number;
      }>;
      const id = `mock-created-${nextMockId++}`;
      if (
        typeof b.ticker === 'string' &&
        typeof b.direction === 'string' &&
        typeof b.entry_date === 'string' &&
        typeof b.entry_time === 'string' &&
        typeof b.entry_price === 'number'
      ) {
        // JournalTradeCreate accepts optional exit_* — JournalPage's manual
        // form logs already-closed trades in one POST. Dropping them stored
        // every such trade as active (Codex, #64 verification review).
        const hasExit =
          typeof b.exit_date === 'string' &&
          typeof b.exit_time === 'string' &&
          typeof b.exit_price === 'number';
        // journal.py `_return_pct`: UNDERLYING price convention — a PUT
        // profits when the underlying falls, so the sign flips. (Imports
        // use premium math WITHOUT the flip — see import/commit below.)
        const raw = hasExit && b.entry_price !== 0
          ? ((b.exit_price! - b.entry_price) / b.entry_price) * 100
          : hasExit ? 0 : null;
        const pct = raw == null
          ? null
          : Number((b.direction === 'PUT' ? -raw : raw).toFixed(2));
        const status = deriveMockStatus(hasExit, pct);
        journalStore.push({
          id,
          ticker: b.ticker.toUpperCase(),
          direction: b.direction,
          // journal.py's local-row shape: `${date}T${time}:00`, naive-ET.
          entry_ts: `${b.entry_date}T${b.entry_time}:00`,
          exit_ts: hasExit ? `${b.exit_date}T${b.exit_time}:00` : null,
          entry_price: b.entry_price,
          exit_price: hasExit ? b.exit_price! : null,
          return_pct: pct,
          take_profits: b.take_profits,
          stop_loss: typeof b.stop_loss === 'number' ? b.stop_loss : null,
          status,
          source: typeof b.source === 'string' ? b.source : 'chart',
          session_id: typeof b.session_id === 'string' ? b.session_id : null,
        });
        const body = {
          ...MOCK_JOURNAL_CREATE, id, return_pct: pct, status,
        } satisfies JournalMutationResponse;
        return { body };
      }
      return { body: { ...MOCK_JOURNAL_CREATE, id } };
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/journal\/trades\/([^/]+)$/,
    reply: (req, match) => {
      const id = match[1];
      const b = (req.body ?? {}) as Partial<{
        exit_date: string; exit_time: string; exit_price: number;
      }>;
      const row = journalStore.find((t) => t.id === id);
      if (
        row &&
        typeof row.entry_price === 'number' &&
        typeof b.exit_price === 'number' &&
        typeof b.exit_date === 'string' &&
        typeof b.exit_time === 'string'
      ) {
        row.exit_ts = `${b.exit_date}T${b.exit_time}:00`;
        row.exit_price = b.exit_price;
        // Chart trades carry UNDERLYING prices: CALL wins when exit >
        // entry, PUT when exit < entry — the sign-corrected return_pct
        // convention journal.py documents on JournalRow.
        const raw = ((b.exit_price - row.entry_price) / row.entry_price) * 100;
        const pct = Number((row.direction === 'PUT' ? -raw : raw).toFixed(2));
        row.return_pct = pct;
        // journal.py `_derive_status`: a flat close is breakeven, not a win.
        row.status = deriveMockStatus(true, pct);
        const body = {
          source: 'cloud_sql',
          id,
          return_pct: pct,
          status: row.status,
        } satisfies JournalMutationResponse;
        return { body };
      }
      // Unknown id (e.g. the contract suite's synthesized sample): keep the
      // static close fixture so the typed-200 validation stays exercised.
      return { body: { ...MOCK_JOURNAL_CLOSE, id } };
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/journal\/trades\/([^/]+)$/,
    reply: (_req, match) => {
      const idx = journalStore.findIndex((t) => t.id === match[1]);
      if (idx !== -1) journalStore.splice(idx, 1);
      return { body: { ...MOCK_JOURNAL_DELETED, deleted: match[1] } };
    },
  },
  { method: 'POST', pattern: /^\/api\/journal\/import\/preview$/, reply: () => ({ body: MOCK_IMPORT_PREVIEW }) },
  {
    method: 'POST',
    pattern: /^\/api\/journal\/import\/commit$/,
    // Totals derive from the SUBMITTED subset (the modal lets the user
    // check any rows), not a fixed 2/1 summary that contradicted the
    // "Import 1 trade" button (Codex, #64). Non-duplicates land in the
    // store so the journal read reflects the import.
    reply: (req) => {
      const b = (req.body ?? {}) as Partial<{ broker: string; trades: unknown[] }>;
      const submitted = Array.isArray(b.trades) ? b.trades : [];
      const source = typeof b.broker === 'string'
        ? `import:${b.broker.toLowerCase()}`
        : 'import:robinhood';
      let imported = 0;
      let skipped = 0;
      for (const raw of submitted) {
        const t = raw as Partial<ImportPreviewTrade>;
        if (
          typeof t.ticker !== 'string' ||
          typeof t.direction !== 'string' ||
          typeof t.entry_ts !== 'string' ||
          typeof t.entry_price !== 'number'
        ) {
          continue;
        }
        const key = {
          ticker: t.ticker.toUpperCase(),
          direction: t.direction,
          // Stored VERBATIM at the preview's minute precision — exactly
          // what the server's shared insert path does; the chart parser
          // (isoNaiveToEpoch) accepts the missing seconds.
          entry_ts: t.entry_ts,
          entry_price: t.entry_price,
        };
        if (isStoredDuplicate(key)) {
          skipped += 1;
          continue;
        }
        // import_commit NEVER trusts the client's return_pct/status: it
        // recomputes via `_import_return_pct` — PREMIUM math, a long-only
        // BTO→STC round trip where a rising premium is always a gain, so
        // NO CALL/PUT sign flip (unlike create/close's underlying math) —
        // and re-derives status. The old `? 'active' : 'win'` mapping
        // stored losing closed trades as wins (Codex, #64 verification).
        const hasExit = typeof t.exit_ts === 'string' && typeof t.exit_price === 'number';
        const pct = hasExit && t.entry_price !== 0
          ? Number((((t.exit_price! - t.entry_price) / t.entry_price) * 100).toFixed(4))
          : hasExit ? 0 : null;
        journalStore.push({
          id: `mock-import-${nextMockId++}`,
          ...key,
          exit_ts: hasExit ? t.exit_ts! : null,
          exit_price: hasExit ? t.exit_price! : null,
          return_pct: pct,
          status: deriveMockStatus(hasExit, pct),
          source,
          session_id: null,
        });
        imported += 1;
      }
      const body = {
        imported,
        skipped_duplicates: skipped,
      } satisfies ImportCommitResponse;
      return { body };
    },
  },
  {
    pattern: /^\/api\/journal\/seed\/([^/]+)$/,
    reply: (_req, match) => ({ body: { ...MOCK_SEED_TRADES, ticker: match[1] } }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/style\/mine-and-validate$/,
    reply: () => ({ body: MOCK_MINE_STYLE_SUCCESS }),
  },
];
