/**
 * Typed fixtures + mock-mode routes for the Help / glossary page (`/help`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/help.ts re-exports them for its Playwright wiring —
 * so the app's mock mode and the E2E mocks cannot drift.
 *
 * Endpoint fan-out, read off HelpPage.tsx:
 *   GET /api/config/indicators   useIndicatorConfig → IndicatorConfig
 *   GET /api/insights/watchlist  <WatchlistPanel>   → WatchlistResponse
 *
 * The page renders live indicator thresholds inside its glossary entries
 * (RSI bands, EMA periods, ATR/RVOL thresholds) rather than hardcoding them,
 * so without this the numbers render as blanks.
 */
import type { IndicatorConfig } from '@/hooks/useConfig';
import type { WatchlistResponse } from '@/types/watchlist';
import type { MockRoute } from './types';

/**
 * Values mirror the production indicator config (config.py): RSI 14 with a
 * fast 7, 30/70 bands, the FIVE labelled zones the glossary renders
 * (including the 45–55 Neutral band; the top zone's bound is 101 so a
 * reading of exactly 100 still classifies), and the CALL/PUT entry ranges
 * the signal voter uses.
 */
export const MOCK_INDICATOR_CONFIG = {
  rsi: {
    period: 14,
    fast_period: 7,
    oversold: 30,
    overbought: 70,
    zones: [
      { max: 30, label: 'Oversold' },
      { max: 45, label: 'Weak' },
      { max: 55, label: 'Neutral' },
      { max: 70, label: 'Strong' },
      { max: 101, label: 'Overbought' },
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

/**
 * Mock-mode route table for `/help` — the happy-path translation of
 * `mockHelpApi` (tests/helpers/fixtures/help.ts) with its default options:
 * the watchlist override is opt-in there, so here the panel falls through
 * to the shared /api/insights/watchlist defaults further down ROUTES.
 */
export const helpRoutes: MockRoute[] = [
  { pattern: /^\/api\/config\/indicators$/, reply: () => ({ body: MOCK_INDICATOR_CONFIG }) },
];
