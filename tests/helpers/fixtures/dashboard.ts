/**
 * Typed fixtures + route wiring for the Overview page (`/dashboard`).
 *
 * Moved out of helpers/mocks.ts so every page's test data lives under
 * fixtures/ and mocks.ts stays what its name promises: the cross-cutting
 * `mockCommon` and the `M` fulfil helpers.
 *
 * Endpoint fan-out shared by dashboard.spec.ts and dashboard-chart-fit.spec.ts:
 *   GET /api/dashboard/brief/{ticker}       → BriefResponse
 *   GET /api/signals/{ticker}               → the page's own SignalsResponse
 *   GET /api/playbook/{ticker}              → PlaybookResponse
 *   GET /api/live/quote|history|avg-volume  → LiveQuote / LiveHistory / AvgVolume
 *   GET /api/market/reference/{t}/{date}    → ReferenceResponse
 *   GET /api/config/market-hours            → MarketHours
 *
 * Backtest routes (`/api/backtest/*`) and the intraday `/api/market/data`
 * candle bars differ meaningfully between the two specs (real trade data vs.
 * layout-focused bar counts/shapes) and stay local to each spec's per-call
 * overrides.
 */
import type { Page } from '@playwright/test';
import type { BriefResponse, PlaybookResponse, ReferenceResponse } from '@/routes/DashboardPage';
import type { AvgVolume, LiveHistory } from '@/hooks/useLiveHistory';
import type { LiveQuote } from '@/hooks/useLiveQuote';
import type { MarketHours } from '@/hooks/useConfig';
import { M, mockCommon } from '../mocks';

/** Brief the redesigned Overview consumes (bias bullets + KPI close/RSI). */
export const MOCK_DASHBOARD_BRIEF = {
  ticker: 'IWM',
  source: 'cloud_sql',
  bias: 'bullish',
  rsi: 58.4,
  strat_candle: '2U',
  strat_combo: 'Failed 2D → 2U',
  ftfc_score: 0.72,
  ftfc_direction: 'bullish',
  signal_status: '0DTE call flow leading',
  daily_indicators: {
    date: '2026-04-25',
    close: 220.5,
    rsi_14: 58.4,
    rvol: 1.4,
    strat_candle: '2U',
    strat_combo: 'Failed 2D → 2U',
    ftfc_score: 0.72,
    ftfc_direction: 'bullish',
  },
  live: { price: 220.45, session: 'closed' },
} satisfies BriefResponse;

export const MOCK_PLAYBOOK_EMPTY = {
  ticker: 'IWM',
  cards: [],
} satisfies PlaybookResponse;

export const MOCK_DASHBOARD_QUOTE = {
  ticker: 'IWM',
  price: 220.45,
  open: 219.8,
  high: 221.2,
  low: 219.5,
  volume: 1_234_567,
  change: 0.65,
  change_pct: 0.296,
  prev_close: 219.8,
  last_updated: '2026-04-25T19:55:00Z',
  market_session: 'closed',
  market_open: false,
} satisfies LiveQuote;

export const MOCK_DASHBOARD_HISTORY = {
  ticker: 'IWM',
  interval: '1min',
  count: 0,
  bars: [],
} satisfies LiveHistory;

export const MOCK_DASHBOARD_AVG_VOLUME = {
  ticker: 'IWM',
  avg_volume_20d: 25_000_000,
  sample_size: 20,
  last_date: '2026-04-24',
  source: 'mock',
} satisfies AvgVolume;

/**
 * The reference endpoint is read by two consumers with different views of it:
 * DashboardPage's `ReferenceResponse` (close/high/low + `week`) and
 * useMarketData's `ReferenceLevels` (open/high/low/close, no week). The
 * backend sends the union plus `source`/`stale_days`, which neither models —
 * declared in the satisfies target so the payload stays faithful to the wire
 * format without going unchecked.
 */
export const MOCK_DASHBOARD_REFERENCE = {
  ticker: 'IWM',
  date: '2026-04-25',
  source: 'mock',
  stale_days: 0,
  open: 220.0,
  high: 222.0,
  low: 218.0,
  close: 220.5,
  week: {
    high: 224.0,
    low: 216.0,
    avg_close: 220.0,
    avg_rsi_14: 55.0,
    start_date: '2026-04-21',
    end_date: '2026-04-25',
    sessions: 5,
  },
} satisfies ReferenceResponse & {
  source: string;
  stale_days: number;
  open: number;
  week: { avg_rsi_14: number; start_date: string; end_date: string; sessions: number };
};

/**
 * NOTE the key names: the contract is `pre_market` / `after_hours`, not
 * `premarket` / `afterhours`, and `timezone` + `holidays_2026` are required.
 * The literal this replaced used the short spellings and omitted both
 * required fields — harmless only because the sole consumer reads
 * `.regular` for the RTH window. `satisfies` caught it.
 */
export const MOCK_MARKET_HOURS = {
  timezone: 'America/New_York',
  regular: { open: '09:30', close: '16:00' },
  pre_market: { open: '04:00', close: '09:30' },
  after_hours: { open: '16:00', close: '20:00' },
  holidays_2026: ['2026-01-01', '2026-07-03', '2026-12-25'],
} satisfies MarketHours;

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
