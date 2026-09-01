/**
 * Typed fixtures + route wiring for the Help / glossary page (`/help`).
 *
 * Endpoint fan-out, read off HelpPage.tsx:
 *   GET /api/config/indicators   useIndicatorConfig → IndicatorConfig
 *   GET /api/insights/watchlist  <WatchlistPanel>   → WatchlistResponse
 *
 * The page renders live indicator thresholds inside its glossary entries
 * (RSI bands, EMA periods, ATR/RVOL thresholds) rather than hardcoding them,
 * so without this the numbers render as blanks. help.spec.ts previously
 * called only `mockCommon`, leaving /api/config/indicators to fall through.
 */
import type { Page } from '@playwright/test';
import type { IndicatorConfig } from '@/hooks/useConfig';
import type { WatchlistResponse } from '@/types/watchlist';
import { M, mockCommon } from '../mocks';

/**
 * Values mirror the production indicator config: RSI 14 with a fast 7,
 * 30/70 bands, the four labelled zones the glossary renders, and the
 * CALL/PUT entry ranges the signal voter uses.
 */
export const MOCK_INDICATOR_CONFIG = {
  rsi: {
    period: 14,
    fast_period: 7,
    oversold: 30,
    overbought: 70,
    zones: [
      { max: 30, label: 'Oversold' },
      { max: 50, label: 'Weak' },
      { max: 70, label: 'Strong' },
      { max: 100, label: 'Overbought' },
    ],
    call_range: [25, 50],
    put_range: [50, 75],
    call_exit: 70,
    put_exit: 30,
  },
  ema: { periods: [9, 20, 50] },
  atr: { period: 14, high_threshold: 2.0 },
  rvol: { period: 20, signal_threshold: 1.0 },
  stoch_rsi: { period: 14, k_period: 3, d_period: 3, oversold: 20, overbought: 80 },
  signal: { min_conditions: 7, consecutive_periods: 3, premarket_threshold: 0.5 },
} satisfies IndicatorConfig;

/** Ranker output for the watchlist panel this page also mounts. */
export const MOCK_HELP_WATCHLIST = {
  run_id: 'cccccccc-0000-0000-0000-000000000001',
  as_of: '2026-04-25T20:00:00Z',
  candidate_count: 0,
  excluded_count: 0,
  ranked: [],
  weights_used: { catalyst_proximity: 4.0, relative_volume: 6.0 },
  duration_ms: 900,
} satisfies WatchlistResponse;

export interface HelpMockOpts {
  indicators?: IndicatorConfig;
  watchlist?: WatchlistResponse;
}

/**
 * Intercept every endpoint `/help` hits on first paint.
 * Includes `mockCommon`, so callers don't need it separately.
 */
export async function mockHelpApi(page: Page, opts: HelpMockOpts = {}) {
  await mockCommon(page);
  await page.route('**/api/config/indicators', (r) =>
    r.fulfill(M.ok(opts.indicators ?? MOCK_INDICATOR_CONFIG))
  );
  if (opts.watchlist) {
    await page.route('**/api/insights/watchlist*', (r) => r.fulfill(M.ok(opts.watchlist!)));
  }
}
