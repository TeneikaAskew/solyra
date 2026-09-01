/**
 * Typed fixtures + route wiring for the Signal Explorer page (`/signals`).
 *
 * Endpoint fan-out, read off SignalsPage.tsx rather than off what the spec
 * happened to mock before:
 *   GET /api/signals/{ticker}?limit=…      useSignals      → SignalsResponse
 *   GET /api/analytics/summary/{ticker}    useTradeSummary → TradeStats
 *
 * The page also mounts <TickerCombobox>, whose two endpoints are gated on
 * the user typing (`enabled: keywords.length >= 1`) so they never fire on
 * first paint — but they DO fire the moment a test drives the combobox, and
 * an unmocked /api request falls through to the Vite proxy and 500s with
 * ECONNREFUSED when no backend is up. They're wired here with empty results
 * so interaction tests stay hermetic without re-declaring them.
 *
 * Fixtures use `satisfies` against the real contracts, so a backend schema
 * change breaks `tsc -b` (tsconfig.test.json covers tests/) instead of
 * silently drifting past a hand-written literal.
 */
import type { Page } from '@playwright/test';
import type { SignalsResponse } from '@/routes/SignalsPage';
import type { TradeStats } from '@/hooks/useTradeAnalytics';
import { M, mockCommon } from '../mocks';

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
  winRate: 0.62,
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

export interface SignalsMockOpts {
  signals?: SignalsResponse;
  summary?: TradeStats;
}

/**
 * Intercept every endpoint `/signals` can hit, scoped to IWM (the app's
 * default ticker). Includes `mockCommon`, so callers don't need it too.
 *
 * Pass `signals`/`summary` to swap in a variant; a spec that needs a
 * one-off error shape can still re-register the route after calling this —
 * Playwright matches newest-first, so the later registration wins.
 */
export async function mockSignalsApi(page: Page, opts: SignalsMockOpts = {}) {
  await mockCommon(page);
  const signals = opts.signals ?? MOCK_SIGNALS;
  const summary = opts.summary ?? MOCK_TRADE_SUMMARY;

  await page.route('**/api/signals/IWM*', (r) => r.fulfill(M.ok(signals)));
  await page.route('**/api/analytics/summary/IWM*', (r) => r.fulfill(M.ok(summary)));

  // TickerCombobox — search + per-symbol data coverage. Empty by default;
  // ticker-combobox.spec.ts drives these with real payloads of its own.
  await page.route('**/api/insights/ticker/search*', (r) => r.fulfill(M.ok({ results: [] })));
  await page.route('**/api/market/coverage*', (r) => r.fulfill(M.ok({ coverage: [] })));
}
