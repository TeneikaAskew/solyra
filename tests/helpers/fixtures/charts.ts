/**
 * Route wiring for the Charts page (`/charts`).
 *
 * Payloads live in src/mocks/charts.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes (bars, indicators and reference levels come
 * from src/mocks/live.ts rather than being duplicated).
 *
 * Mutation-only endpoints (POST /api/journal, POST /api/backtest/replay-trades)
 * are not wired: they fire on user action, and the specs that drive them want
 * to assert on the request body themselves.
 */
import type { Page } from '@playwright/test';
import type { SignalSeriesResponse } from '@/hooks/useLiveIndicators';
import type { SimilarResponse } from '@/hooks/useSimilarSetups';
import type { JournalTradesResponse } from '@/mocks/journal';
import { MOCK_BACKTEST_ALL, MOCK_BACKTEST_EQUITY, MOCK_BACKTEST_RESULTS } from '@/mocks/dashboard';
import { MOCK_LEVELS_POPULATED } from '@/mocks/options';
import {
  MOCK_JOURNAL_TRADES_EMPTY,
  MOCK_LIVE_INDICATORS,
  MOCK_MARKET_DATA,
  MOCK_MARKET_DATES,
  MOCK_REFERENCE_LEVELS,
  MOCK_SIGNAL_SERIES,
  MOCK_SIMILAR_SETUPS,
} from '@/mocks/charts';
import { M, mockCommon } from '../mocks';

export {
  LAST_BAR_TIME,
  MOCK_JOURNAL_TRADES_EMPTY,
  MOCK_JOURNAL_TRADES_ONE_CLOSED,
  MOCK_LIVE_INDICATORS,
  MOCK_MARKET_DATA,
  MOCK_MARKET_DATES,
  MOCK_REFERENCE_LEVELS,
  MOCK_SIGNAL_SERIES,
  MOCK_SIGNAL_SERIES_EMPTY,
  MOCK_SIMILAR_SETUPS,
  MOCK_SIMILAR_SETUPS_EMPTY,
} from '@/mocks/charts';

export interface ChartsMockOpts {
  trades?: JournalTradesResponse;
  signalSeries?: SignalSeriesResponse;
  similar?: SimilarResponse;
}

/**
 * Intercept every endpoint `/charts` hits on first paint, scoped to IWM.
 * Includes `mockCommon`, so callers don't need it separately.
 *
 * Registration order matters: Playwright matches newest-first, so the
 * broad `**\/api/signals/IWM*` glob goes BEFORE the more specific
 * `/similar` pattern, letting the latter win.
 */
export async function mockChartsApi(page: Page, opts: ChartsMockOpts = {}) {
  await mockCommon(page);
  const trades = opts.trades ?? MOCK_JOURNAL_TRADES_EMPTY;
  const signalSeries = opts.signalSeries ?? MOCK_SIGNAL_SERIES;
  const similar = opts.similar ?? MOCK_SIMILAR_SETUPS;

  await page.route('**/api/market/dates/IWM', (r) => r.fulfill(M.ok(MOCK_MARKET_DATES)));
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(MOCK_MARKET_DATA)));
  await page.route('**/api/market/reference/IWM/*', (r) => r.fulfill(M.ok(MOCK_REFERENCE_LEVELS)));
  await page.route('**/api/options/IWM/*/levels*', (r) => r.fulfill(M.ok(MOCK_LEVELS_POPULATED)));
  await page.route('**/api/live/indicators', (r) => r.fulfill(M.ok(MOCK_LIVE_INDICATORS)));
  await page.route('**/api/live/signal-series', (r) => r.fulfill(M.ok(signalSeries)));
  await page.route('**/api/journal/trades/IWM', (r) => r.fulfill(M.ok(trades)));
  await page.route('**/api/signals/IWM*', (r) =>
    r.fulfill(M.ok({ ticker: 'IWM', count: 0, signals: [] }))
  );
  await page.route('**/api/signals/IWM/similar*', (r) => r.fulfill(M.ok(similar)));
  // ChartsPage mounts BacktesterSection, which fetches the run list and the
  // selected run on mount. Same payloads mock mode serves (src/mocks/dashboard.ts).
  await page.route('**/api/backtest/results/IWM*', (r) => r.fulfill(M.ok(MOCK_BACKTEST_RESULTS)));
  await page.route('**/api/backtest/equity/IWM', (r) => r.fulfill(M.ok(MOCK_BACKTEST_EQUITY)));
  await page.route('**/api/backtest/all/IWM', (r) => r.fulfill(M.ok(MOCK_BACKTEST_ALL)));
}
