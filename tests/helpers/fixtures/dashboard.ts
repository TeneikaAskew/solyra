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
  MOCK_MOVEMENT_STATEMENT,
  MOCK_PLAYBOOK_EMPTY,
  MOCK_SECTORS,
  buildDashboardNews,
} from '@/mocks/dashboard';
import { MOCK_INSIGHT_REPORT } from '@/mocks/insights';
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
  MOCK_MOVEMENT_STATEMENT,
  MOCK_PLAYBOOK,
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
  // Two endpoints DashboardPage requests on EVERY mount that no fixture used
  // to register, so every /dashboard load in the suite fell through to the
  // dead E2E proxy (docs/TEST_COVERAGE_AUDIT.md §10.2). Both answer with the
  // payload mock mode serves (src/mocks/dashboard.ts, src/mocks/insights.ts)
  // so the two surfaces cannot drift. The statement is served as a 200, not
  // the flag-OFF 404: Chrome logs every 404 as a console error, and the
  // navigation smoke asserts a clean console on /dashboard (the same reason
  // mockCommon answers /api/me/preferences with 200-nulls). movement-read
  // .spec.ts re-registers the statement per test and wins.
  await page.route('**/api/movement-statement*', (r) =>
    r.fulfill(M.ok(MOCK_MOVEMENT_STATEMENT))
  );
  await page.route('**/api/insights/report/IWM', (r) => r.fulfill(M.ok(MOCK_INSIGHT_REPORT)));
  // The Overview's card/chart endpoints with their default payloads, so a
  // spec that only needs the page to mount (movement-read, most-active-bar,
  // dashboard-chart-fit) no longer leaves sectors / news / intraday bars /
  // backtest to the dead proxy. Specs wanting other payloads call
  // `mockDashboardCards(page, opts)` afterwards; the later registration wins.
  await mockDashboardCards(page);
}

export interface DashboardCardOpts {
  sectors?: SectorsResponse;
  news?: ReturnType<typeof buildDashboardNews>;
}

/**
 * The Overview's card/chart endpoints. `mockDashboard` registers these with
 * their defaults; call this again with `opts` to swap the sectors or news
 * payload for one spec (Playwright matches newest-first, so the later call
 * wins). Until 2026-09-07 this layer was opt-in, on the theory that
 * movement-read.spec.ts and most-active-bar.spec.ts had assertions written
 * against the unmocked error state; neither does — they assert on the
 * movement card and the marquee only — and the opt-in left every one of
 * their dashboard loads spraying ECONNREFUSED at the dead proxy (audit §10.2).
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
