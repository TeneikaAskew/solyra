/**
 * Route wiring for the Signal Explorer page (`/signals`).
 *
 * Payloads live in src/mocks/signals.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 *
 * The page also mounts <TickerCombobox>, whose two endpoints are gated on
 * the user typing (`enabled: keywords.length >= 1`) so they never fire on
 * first paint — but they DO fire the moment a test drives the combobox, and
 * an unmocked /api request falls through to the Vite proxy and 500s with
 * ECONNREFUSED when no backend is up. They're wired here with empty results
 * so interaction tests stay hermetic without re-declaring them.
 */
import type { Page } from '@playwright/test';
import type { SignalsResponse } from '@/routes/SignalsPage';
import type { TradeStats } from '@/hooks/useTradeAnalytics';
import { MOCK_SIGNALS, MOCK_TRADE_SUMMARY } from '@/mocks/signals';
import { M, mockCommon } from '../mocks';

export {
  MOCK_SIGNALS,
  MOCK_SIGNALS_EMPTY,
  MOCK_TRADE_SUMMARY,
  MOCK_TRADE_SUMMARY_EMPTY,
} from '@/mocks/signals';

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
