/**
 * Typed fixtures + mock-mode routes for the Overview page (`/dashboard`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/dashboard.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
 *
 * Endpoint fan-out shared by dashboard.spec.ts and dashboard-chart-fit.spec.ts:
 *   GET /api/dashboard/brief/{ticker}       → BriefResponse
 *   GET /api/signals/{ticker}               → the page's own SignalsResponse
 *   GET /api/playbook/{ticker}              → PlaybookResponse
 *   GET /api/live/quote|history|avg-volume  → LiveQuote / LiveHistory / AvgVolume
 *   GET /api/market/reference/{t}/{date}    → ReferenceResponse
 *   GET /api/config/market-hours            → MarketHours
 * plus the card/chart endpoints the Overview additionally renders (sector
 * rotation, news, intraday chart, backtest section).
 */
import type {
  BriefResponse,
  PlaybookResponse,
  ReferenceResponse,
  SectorRow,
} from '@/routes/DashboardPage';
import type { AvgVolume, LiveHistory } from '@/hooks/useLiveHistory';
import type { LiveQuote } from '@/hooks/useLiveQuote';
import type { MockRoute } from './types';
import { MOCK_MARKET_HOURS } from './common';
import { addDaysToISO, todayET } from '@/lib/dates';

/**
 * NOTE the key names of `MOCK_MARKET_HOURS`: the contract is `pre_market` /
 * `after_hours`, not `premarket` / `afterhours`, and `timezone` +
 * `holidays_2026` are required. The literal this replaced used the short
 * spellings and omitted both required fields — harmless only because the
 * sole consumer reads `.regular` for the RTH window. `satisfies` caught it.
 * The payload itself lives in ./common (the cross-cutting default); it is
 * re-exported here because the dashboard fixture layer historically owned it.
 */
export { MOCK_MARKET_HOURS };

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
    date: '2026-04-24',
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

/** `source` ('cloud_sql') is always present on the wire (playbook.py)
 *  even though the frontend type doesn't model it. The real endpoint never
 *  returns an empty `cards` list (no rows is a 404); this shape exercises
 *  the "no setups" branch of the top-setup tile. */
export const MOCK_PLAYBOOK_EMPTY = {
  ticker: 'IWM',
  source: 'cloud_sql',
  cards: [],
} satisfies PlaybookResponse & { source: string };

/** A current card set as playbook.py serves it after #861: the set's
 *  `analysis_date` and server-judged `age_days` ride along so the UI can
 *  show how old the cards are. */
export const MOCK_PLAYBOOK_FRESH = {
  ticker: 'IWM',
  source: 'cloud_sql',
  analysis_date: '2026-09-05',
  generated_at: '2026-09-05T08:41:12+00:00',
  age_days: 1,
  max_age_days: 7,
  cards: [
    {
      id: 'card_1',
      name: 'IWM CARD 1: Bullish continuation',
      direction: 'CALL',
      win_rate: 54.0,
      avg_return: 0.12,
      conditions: ['RSI 40-65', 'Above VWAP', 'EMA9 > EMA20'],
      description: 'Two-up continuation above VWAP',
      target_pct: 0.3,
      stop_pct: 0.15,
      horizons: [
        { minutes: 5, win_rate: 52.0, avg_return_bps: 1.4, sample_n: 120 },
        { minutes: 15, win_rate: 54.0, avg_return_bps: 3.1, sample_n: 120 },
      ],
      best_horizon_min: 15,
      best_horizon_win_rate: 54.0,
      best_horizon_avg_bps: 3.1,
    },
  ],
} satisfies PlaybookResponse & { source: string };

/** The 503 body playbook.py returns for a card set older than
 *  MAX_PLAYBOOK_AGE_DAYS (#861). The UI must surface this reason. */
export const MOCK_PLAYBOOK_STALE_DETAIL = {
  detail:
    'playbook_cards for IWM is stale: latest analysis_date 2026-06-13 is 85 days old ' +
    '(today; max 7). Refusing to render stale setups as current — run the phase6-playbook Cloud Run job.',
};

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
  // Bare trading-day date on the wire, not an ISO datetime (live.py).
  last_updated: '2026-04-24',
  market_session: 'closed',
  market_open: false,
} satisfies LiveQuote;

export const MOCK_DASHBOARD_HISTORY = {
  ticker: 'IWM',
  interval: '1min',
  count: 0,
  // Optional in the frontend type but ALWAYS present on the wire (live.py).
  market_session: 'closed',
  market_open: false,
  bars: [],
} satisfies LiveHistory;

export const MOCK_DASHBOARD_AVG_VOLUME = {
  ticker: 'IWM',
  avg_volume_20d: 25_000_000,
  sample_size: 20,
  last_date: '2026-04-23',
  // Real enum is 'cloud_sql' | 'alphavantage' — never 'mock' (live.py).
  source: 'cloud_sql',
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
  // YYYYMMDD of the PREVIOUS trading day — every backend path formats it
  // this way (main.py strips the dashes before returning).
  date: '20260423',
  source: 'cloud_sql',
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
    start_date: '2026-04-20',
    end_date: '2026-04-24',
    sessions: 5,
  },
} satisfies ReferenceResponse & {
  source: string;
  stale_days: number;
  open: number;
  week: { avg_rsi_14: number; start_date: string; end_date: string; sessions: number };
};

// ── Card / chart data ──────────────────────────────────────────────────────
// The routes above cover the page's spine (brief, KPIs, quote). The Overview
// additionally renders a sector-rotation card, a news card, an intraday chart
// and a backtest section, each with its own endpoint.

/**
 * Restates DashboardPage's (unexported) `SectorsResponse` verbatim. The
 * status enum is strict on purpose: the backend emits only 'ok' or
 * 'unavailable' (main.py), so a fixture value like 'degraded' must fail
 * the build rather than compile against a loosened `string`.
 */
export interface SectorsResponse {
  as_of: string | null;
  status: 'ok' | 'unavailable';
  reason?: string;
  sectors: SectorRow[];
}

/** 3 ok rows ranked DIFFERENTLY for 1D vs 5D (so the toggle is provable) plus
 *  one `unavailable` row, which must sink to the bottom and render an em-dash
 *  rather than a fabricated 0.00%. */
export const MOCK_SECTORS = {
  as_of: '2026-04-24',
  status: 'ok',
  sectors: [
    { symbol: 'XLK', name: 'Technology', close: 250.1, chg_1d_pct: 1.25, chg_5d_pct: 3.4, status: 'ok' },
    { symbol: 'XLF', name: 'Financials', close: 45.2, chg_1d_pct: 2.5, chg_5d_pct: -1.1, status: 'ok' },
    { symbol: 'XLE', name: 'Energy', close: 90.3, chg_1d_pct: -0.75, chg_5d_pct: 4.2, status: 'ok' },
    { symbol: 'XLY', name: 'Consumer Discretionary', status: 'unavailable', reason: 'stale data' },
  ],
} satisfies SectorsResponse;

/** Every sector unavailable — the card's fully-degraded state. When all
 *  rows are unavailable the backend flips the top-level status to
 *  'unavailable' and attaches a top-level `reason` (main.py). */
export const MOCK_SECTORS_UNAVAILABLE = {
  as_of: '2026-04-24',
  status: 'unavailable',
  reason: 'sector ETFs not ingested yet — run the SPDR backfill',
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
  // ET clock, matching the consumers' own date classification (see
  // ./catalysts for why UTC here drifts a day every evening).
  const today = todayET();
  const yesterday = addDaysToISO(today, -1);
  const tomorrow = addDaysToISO(today, 1);
  return {
    status: 'ok',
    // Real envelope names its providers, e.g. "Benzinga + DB (news + sec, 5)".
    source: 'Benzinga + DB (news + sec, 5)',
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
          source: 'Benzinga',
        },
        {
          date: today,
          ticker: 'MSFT',
          catalyst_type: 'CONFERENCE_CALL',
          event: 'Investor Day',
          expected_impact: 'medium',
          source: 'Benzinga',
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
    date: '202604',
    // Always present on the wire (main.py): the echoed bar timeframe in
    // minutes, and a per-bar rgba volume color.
    timeframe: 60,
    count: bars.length,
    candlestick: bars,
    volume: bars.map((b) => ({
      time: b.time,
      value: 1_000_000,
      color: 'rgba(38, 166, 154, 0.5)',
    })),
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

/**
 * Mock-mode route table for `/dashboard` — the happy-path translation of
 * `mockDashboard` + `mockDashboardCards` (tests/helpers/fixtures/dashboard.ts),
 * scoped to IWM (the app's default ticker). The card routes are included
 * unconditionally: in mock mode the cards should render, not error.
 */
export const dashboardRoutes: MockRoute[] = [
  { pattern: /^\/api\/dashboard\/brief\/IWM$/, reply: () => ({ body: MOCK_DASHBOARD_BRIEF }) },
  // The populated set, so mock mode renders the top-setup happy path (age
  // label included); MOCK_PLAYBOOK_EMPTY stays for specs that want that branch.
  { pattern: /^\/api\/playbook\/IWM$/, reply: () => ({ body: MOCK_PLAYBOOK_FRESH }) },
  {
    pattern: /^\/api\/market\/reference\/IWM\/([^/]+)$/,
    reply: () => ({ body: MOCK_DASHBOARD_REFERENCE }),
  },
  { pattern: /^\/api\/market\/sectors$/, reply: () => ({ body: MOCK_SECTORS }) },
  // The Overview intraday chart requests a COMPACT month code — DashboardPage
  // derives it as anchorDate.slice(0, 6), i.e. /IWM/202604 — not a session
  // date. Scoping the pattern to exactly six digits lets the generic
  // session-date route in ./live own every other market-data request.
  {
    pattern: /^\/api\/market\/data\/IWM\/\d{6}$/,
    reply: () => ({ body: MOCK_DASHBOARD_MARKET_DATA }),
  },
  { pattern: /^\/api\/backtest\/results\/IWM$/, reply: () => ({ body: MOCK_BACKTEST_RESULTS }) },
  { pattern: /^\/api\/backtest\/equity\/IWM$/, reply: () => ({ body: MOCK_BACKTEST_EQUITY }) },
  { pattern: /^\/api\/backtest\/all\/IWM$/, reply: () => ({ body: MOCK_BACKTEST_ALL }) },
  // MovementRead mounts on the default page; useMovementStatement treats a
  // 404 as the documented "feature flag off" state (no retries, card hides),
  // so answering 404 here is the honest representative response — a 501
  // loud-miss would spray console errors on mock mode's landing page.
  {
    pattern: /^\/api\/movement-statement$/,
    reply: () => ({ status: 404, body: { detail: 'movement statement flag off' } }),
  },
];
