/**
 * Route wiring for the Overview page (`/dashboard`).
 *
 * Payloads live in src/mocks/dashboard.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 *
 * Backtest routes (`/api/backtest/*`) and the intraday `/api/market/data`
 * candle bars differ meaningfully between the two dashboard specs (real
 * trade data vs. layout-focused bar counts/shapes); the shared defaults
 * below stay overridable per spec.
 */
import type { Page } from '@playwright/test';
import type { SectorsResponse } from '@/mocks/dashboard';
import {
  MOCK_BACKTEST_ALL,
  MOCK_BACKTEST_EQUITY,
  MOCK_BACKTEST_RESULTS,
  MOCK_DASHBOARD_AVG_VOLUME,
  MOCK_DASHBOARD_BRIEF,
  MOCK_DASHBOARD_HISTORY,
  MOCK_DASHBOARD_MARKET_DATA,
  MOCK_DASHBOARD_QUOTE,
  MOCK_DASHBOARD_REFERENCE,
  MOCK_MARKET_HOURS,
  MOCK_PLAYBOOK_EMPTY,
  MOCK_SECTORS,
  buildDashboardNews,
} from '@/mocks/dashboard';
import { M, mockCommon } from '../mocks';

export {
  MOCK_BACKTEST_ALL,
  MOCK_BACKTEST_EQUITY,
  MOCK_BACKTEST_RESULTS,
  MOCK_DASHBOARD_AVG_VOLUME,
  MOCK_DASHBOARD_BRIEF,
  MOCK_DASHBOARD_HISTORY,
  MOCK_DASHBOARD_MARKET_DATA,
  MOCK_DASHBOARD_QUOTE,
  MOCK_DASHBOARD_REFERENCE,
  MOCK_MARKET_HOURS,
  MOCK_PLAYBOOK_EMPTY,
  MOCK_SECTORS,
  MOCK_SECTORS_UNAVAILABLE,
  buildDashboardBars,
  buildDashboardNews,
} from '@/mocks/dashboard';

/**
 * Apply the dashboard route set shared by dashboard.spec.ts and
 * dashboard-chart-fit.spec.ts, all scoped to IWM (the app's default ticker).
 * Includes `mockCommon`, so callers don't need to call it separately.
 */
export async function mockDashboard(page: Page) {
  await mockCommon(page);
  await page.route('**/api/dashboard/brief/IWM*', (r) => r.fulfill(M.ok(MOCK_DASHBOARD_BRIEF)));
  await page.route('**/api/signals/IWM*', (r) =>
    r.fulfill(M.ok({ ticker: 'IWM', count: 0, signals: [] }))
  );
  await page.route('**/api/playbook/IWM', (r) => r.fulfill(M.ok(MOCK_PLAYBOOK_EMPTY)));
  await page.route('**/api/live/quote/IWM', (r) => r.fulfill(M.ok(MOCK_DASHBOARD_QUOTE)));
  await page.route('**/api/live/history/IWM', (r) => r.fulfill(M.ok(MOCK_DASHBOARD_HISTORY)));
  await page.route('**/api/live/avg-volume/IWM', (r) =>
    r.fulfill(M.ok(MOCK_DASHBOARD_AVG_VOLUME))
  );
  await page.route('**/api/market/reference/IWM/*', (r) =>
    r.fulfill(M.ok(MOCK_DASHBOARD_REFERENCE))
  );
  // Candlestick chart reads market-hours for its RTH window.
  await page.route('**/api/config/market-hours', (r) => r.fulfill(M.ok(MOCK_MARKET_HOURS)));
}

export interface DashboardCardOpts {
  sectors?: SectorsResponse;
  news?: ReturnType<typeof buildDashboardNews>;
}

/**
 * Layer the Overview's card/chart endpoints on top of `mockDashboard`.
 *
 * Kept OPT-IN rather than folded into `mockDashboard` because
 * movement-read.spec.ts and most-active-bar.spec.ts also call
 * `mockDashboard`, and silently adding routes there would change what those
 * cards render underneath assertions that were written against the
 * unmocked (error) state.
 */
export async function mockDashboardCards(page: Page, opts: DashboardCardOpts = {}) {
  await page.route('**/api/market/sectors', (r) => r.fulfill(M.ok(opts.sectors ?? MOCK_SECTORS)));
  await page.route('**/api/catalysts/events**', (r) =>
    r.fulfill(M.ok(opts.news ?? buildDashboardNews()))
  );
  await page.route('**/api/market/data/IWM/*', (r) =>
    r.fulfill(M.ok(MOCK_DASHBOARD_MARKET_DATA))
  );
  await page.route('**/api/backtest/results/IWM', (r) => r.fulfill(M.ok(MOCK_BACKTEST_RESULTS)));
  await page.route('**/api/backtest/equity/IWM', (r) => r.fulfill(M.ok(MOCK_BACKTEST_EQUITY)));
  await page.route('**/api/backtest/all/IWM', (r) => r.fulfill(M.ok(MOCK_BACKTEST_ALL)));
}
