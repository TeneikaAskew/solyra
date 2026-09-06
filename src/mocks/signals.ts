/**
 * Typed fixtures + mock-mode routes for the Signal Explorer page
 * (`/signals`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/signals.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
 *
 * Endpoint fan-out, read off SignalsPage.tsx:
 *   GET /api/signals/{ticker}?limit=…      useSignals      → SignalsResponse
 *   GET /api/analytics/summary/{ticker}    useTradeSummary → TradeStats
 *
 * The page also mounts <TickerCombobox>, whose two endpoints are gated on
 * the user typing (`enabled: keywords.length >= 1`) so they never fire on
 * first paint — but they DO fire the moment someone drives the combobox, so
 * they're wired with empty results to keep the surface hermetic.
 */
import type { SignalsResponse } from '@/routes/SignalsPage';
import type { TradeStats } from '@/hooks/useTradeAnalytics';
import type { MockRoute } from './types';

/** Three alerts spanning both directions and a wide score range, so
 *  direction filters and score-threshold styling both have something to
 *  bite on (>=7 bull, >=5 warn, else muted — see SignalsPage columns). */
export const MOCK_SIGNALS = {
  ticker: 'IWM',
  count: 3,
  signals: [
    {
      time: '2026-04-25 18:00:00',
      ticker: 'IWM',
      direction: 'CALL',
      score: 4.5,
      rsi: 62.0,
      ema9: 220.5,
      ema20: 220.0,
      close: 220.4,
      volume: 1_200_000,
    },
    {
      time: '2026-04-25 17:30:00',
      ticker: 'IWM',
      direction: 'PUT',
      score: 3.0,
      rsi: 38.0,
      ema9: 219.7,
      ema20: 220.1,
      close: 219.9,
      volume: 950_000,
    },
    {
      time: '2026-04-25 17:00:00',
      ticker: 'IWM',
      direction: 'CALL',
      score: 2.0,
      rsi: 55.0,
      ema9: 219.6,
      ema20: 219.8,
      close: 219.5,
      volume: 800_000,
    },
  ],
} satisfies SignalsResponse;

/** Honest empty response — drives the page's "no signals" state. */
export const MOCK_SIGNALS_EMPTY = {
  ticker: 'IWM',
  count: 0,
  signals: [],
} satisfies SignalsResponse;

/** 90-day backtest summary behind the Performance P&L card. */
export const MOCK_TRADE_SUMMARY = {
  totalTrades: 312,
  closedTrades: 300,
  activeTrades: 12,
  winCount: 186,
  lossCount: 114,
  // 0-100 percent, matching analytics.py _compute_stats (wins/closed × 100).
  // This fixture previously said 0.62 — the fraction drift (Rule 6) that
  // motivated the page's unit-sniffing heuristic.
  winRate: 62,
  // Summed / mean `return_pct` (percent) — the trades table stores no
  // dollar P&L; GET /summary uses return_pct as the per-trade pnl proxy.
  totalPnL: 41.8,
  avgPnL: 0.139,
  maxWin: 3.4,
  maxLoss: -1.9,
  profitFactor: 1.74,
  callCount: 168,
  putCount: 132,
} satisfies TradeStats;

/** Zero-trade summary. `profitFactor: null` is deliberate — the contract
 *  makes it nullable precisely so an undefined ratio isn't faked as 0. */
export const MOCK_TRADE_SUMMARY_EMPTY = {
  totalTrades: 0,
  closedTrades: 0,
  activeTrades: 0,
  winCount: 0,
  lossCount: 0,
  winRate: 0,
  totalPnL: 0,
  avgPnL: 0,
  maxWin: 0,
  maxLoss: 0,
  profitFactor: null,
  callCount: 0,
  putCount: 0,
} satisfies TradeStats;

/**
 * Mock-mode route table for `/signals` — the happy-path translation of
 * `mockSignalsApi` (tests/helpers/fixtures/signals.ts), scoped to IWM.
 */
export const signalsRoutes: MockRoute[] = [
  { pattern: /^\/api\/signals\/IWM$/, reply: () => ({ body: MOCK_SIGNALS }) },
  {
    pattern: /^\/api\/analytics\/summary\/IWM$/,
    reply: () => ({ body: MOCK_TRADE_SUMMARY }),
  },
  // TickerCombobox — search + per-symbol data coverage, empty by default.
  // `coverage` is an OBJECT map keyed by symbol ({"IWM": {intraday, daily}}),
  // never an array — main.py's _coverage_from_frames returns a dict.
  { pattern: /^\/api\/insights\/ticker\/search$/, reply: () => ({ body: { results: [] } }) },
  { pattern: /^\/api\/market\/coverage$/, reply: () => ({ body: { coverage: {} } }) },
];
