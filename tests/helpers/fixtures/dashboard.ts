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
import type {
  BriefResponse,
  PlaybookResponse,
  ReferenceResponse,
  SectorRow,
} from '@/routes/DashboardPage';
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

// ── Card / chart data ──────────────────────────────────────────────────────
// `mockDashboard` above covers the page's spine (brief, KPIs, quote). The
// Overview additionally renders a sector-rotation card, a news card, an
// intraday chart and a backtest section, each with its own endpoint. Those
// were inlined in dashboard.spec.ts, so no other spec could reuse them and
// nothing type-checked their shapes. They live here now.

interface SectorsResponse {
  as_of: string;
  status: string;
  sectors: SectorRow[];
}

/** 3 ok rows ranked DIFFERENTLY for 1D vs 5D (so the toggle is provable) plus
 *  one `unavailable` row, which must sink to the bottom and render an em-dash
 *  rather than a fabricated 0.00%. */
export const MOCK_SECTORS = {
  as_of: '2026-04-25',
  status: 'ok',
  sectors: [
    { symbol: 'XLK', name: 'Technology', close: 250.1, chg_1d_pct: 1.25, chg_5d_pct: 3.4, status: 'ok' },
    { symbol: 'XLF', name: 'Financials', close: 45.2, chg_1d_pct: 2.5, chg_5d_pct: -1.1, status: 'ok' },
    { symbol: 'XLE', name: 'Energy', close: 90.3, chg_1d_pct: -0.75, chg_5d_pct: 4.2, status: 'ok' },
    { symbol: 'XLY', name: 'Consumer Discretionary', status: 'unavailable', reason: 'stale data' },
  ],
} satisfies SectorsResponse;

/** Every sector unavailable — the card's fully-degraded state. */
export const MOCK_SECTORS_UNAVAILABLE = {
  as_of: '2026-04-25',
  status: 'degraded',
  sectors: [
    { symbol: 'XLK', name: 'Technology', status: 'unavailable', reason: 'stale data' },
    { symbol: 'XLF', name: 'Financials', status: 'unavailable', reason: 'stale data' },
  ],
} satisfies SectorsResponse;

/** Backward-dated AV-news rows + forward-dated catalysts. The news card
 *  matches on `source === 'AV news'` against the FULL events array; these
 *  rows carry an EMPTY sentiment_label on purpose, as real low-confidence
 *  articles do, so the fixture pins the match condition rather than passing
 *  by accident. */
export function buildDashboardNews() {
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);
  const t = new Date();
  t.setDate(t.getDate() + 1);
  const tomorrow = t.toISOString().slice(0, 10);
  return {
    status: 'ok',
    source: 'mock',
    date_range: { from: yesterday, to: tomorrow },
    total: 5,
    events_by_date: {
      [yesterday]: [
        {
          date: yesterday,
          ticker: 'IWM',
          catalyst_type: 'NEWS_CATALYST',
          title: 'Russell 2000 constituents rally on rate-cut optimism',
          impact: 'Medium',
          source: 'AV news',
          sentiment_label: '',
          sentiment_score: 0.31,
        },
        {
          date: yesterday,
          ticker: 'IWM',
          catalyst_type: 'NEWS_CATALYST',
          title: 'Small-cap earnings season kicks off with mixed guidance',
          impact: 'Low',
          source: 'AV news',
          sentiment_label: '',
          sentiment_score: 0.02,
        },
      ],
      [today]: [
        {
          date: today,
          ticker: 'AAPL',
          catalyst_type: 'EARNINGS',
          event: 'Q2 2026 Earnings',
          expected_impact: 'high',
          source: 'mock',
        },
        {
          date: today,
          ticker: 'MSFT',
          catalyst_type: 'CONFERENCE_CALL',
          event: 'Investor Day',
          expected_impact: 'medium',
          source: 'mock',
        },
      ],
      [tomorrow]: [
        {
          date: tomorrow,
          ticker: 'MACRO',
          catalyst_type: 'ECONOMIC',
          title: 'CPI release',
          impact: 'High',
          source: 'FRED/Calendar',
        },
      ],
    },
  };
}

/** Six hourly bars so the Overview's intraday chart (candlestick default,
 *  Area toggle) has something to draw. */
export function buildDashboardBars() {
  return [10, 11, 12, 13, 14, 15].map((h) => {
    const time = Date.UTC(2026, 3, 24, h, 0, 0) / 1000;
    const p = 219 + h * 0.1;
    return { time, open: p - 0.2, high: p + 0.3, low: p - 0.3, close: p };
  });
}

export const MOCK_DASHBOARD_MARKET_DATA = (() => {
  const bars = buildDashboardBars();
  return {
    ticker: 'IWM',
    date: '2026-04',
    count: bars.length,
    candlestick: bars,
    volume: bars.map((b) => ({ time: b.time, value: 1_000_000 })),
  };
})();

/** GET /api/backtest/results/{ticker} — empty-CSV branch. */
export const MOCK_BACKTEST_RESULTS = {
  ticker: 'IWM',
  filename: 'backtest_IWM_20260420_150000.csv',
  trade_count: 0,
  summary: {},
  trades: [],
};

/** GET /api/backtest/equity/{ticker} — the dates/values contract
 *  BacktesterSection actually reads. */
export const MOCK_BACKTEST_EQUITY = {
  ticker: 'IWM',
  filename: 'equity_IWM_20260420_150000.csv',
  summary: {},
  dates: [],
  values: [],
};

/** GET /api/backtest/all/{ticker} — run index. */
export const MOCK_BACKTEST_ALL = { ticker: 'IWM', total_runs: 0, runs: [] };

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
