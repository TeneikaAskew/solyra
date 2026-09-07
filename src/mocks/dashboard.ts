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
 *   POST /api/playbook/evaluate             → EvalResult wire shapes
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
import type { MovementStatement } from '@/types';
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

/**
 * The REAL production playbook, copied verbatim: all 12 IWM setup cards from
 * the `playbook_cards` Cloud SQL table (analysis_date 2026-09-06), passed
 * through the exact response transforms in playbook.py::_cards_from_db
 * (win_rate fraction→%, avg_return bps→% at 2dp — which is why several read
 * -0.0 — target/stop display strings→move magnitudes, horizon sweep with
 * fraction→% win rates; the bps→% roundings that Python serializes as -0.0
 * are written as 0 here — numerically identical, and JS JSON keeps the
 * sign out of the payload). Nothing here is invented; refresh by re-running the
 * SELECT in the module history against the latest analysis_date.
 */
export const MOCK_PLAYBOOK = {
  ticker: 'IWM',
  source: 'cloud_sql',
  // Card-set date + server-judged age, as playbook.py serves them after
  // stocks #861 (the set below IS the 2026-09-06 run; generated_at is its
  // IWM upsert time). age_days is static here: the real server re-judges it.
  analysis_date: '2026-09-06',
  generated_at: '2026-09-06T20:21:19.472074+00:00',
  age_days: 0,
  max_age_days: 7,
  cards: [
  {
    id: 'card_1',
    name: 'IWM CARD 1: Bullish Continuation (2U-2U-2U)',
    description: 'Daily bar is 2U (higher high, higher low); 15m bar is 2U; 1m shows: 2U -> 2U -> 2U (three consecutive bullish bars)',
    direction: 'CALL',
    conditions: [
      'RSI between 40-65 (not overbought yet)',
      'Price above VWAP',
      'Price above EMA9',
      'ORB 30m trend is bullish',
      'EMA9 > EMA20 (bullish cross)',
    ],
    win_rate: 39.2,
    avg_return: 0,
    target_pct: 0.3,
    stop_pct: 0.15,
    horizons: [
      { minutes: 5, win_rate: 46.5, avg_return_bps: -0.22, sample_n: 58792 },
      { minutes: 15, win_rate: 42.9, avg_return_bps: -0.3, sample_n: 58792 },
      { minutes: 30, win_rate: 39.2, avg_return_bps: -0.49, sample_n: 58792 },
      { minutes: 60, win_rate: 35.9, avg_return_bps: -0.73, sample_n: 58792 },
    ],
    best_horizon_min: 5,
    best_horizon_win_rate: 46.5,
    best_horizon_avg_bps: -0.22,
  },
  {
    id: 'card_2',
    name: 'IWM CARD 2: Bearish Continuation (2D-2D-2D)',
    description: 'Daily bar is 2D (lower high, lower low); 15m bar is 2D; 1m shows: 2D -> 2D -> 2D (three consecutive bearish bars)',
    direction: 'PUT',
    conditions: [
      'RSI between 35-60 (not oversold yet)',
      'Price below VWAP',
      'Price below EMA9',
      'ORB 30m trend is bearish',
      'EMA9 < EMA20 (bearish cross)',
    ],
    win_rate: 41.1,
    avg_return: 0,
    target_pct: 0.38,
    stop_pct: 0.2,
    horizons: [
      { minutes: 5, win_rate: 46.6, avg_return_bps: -0.22, sample_n: 57062 },
      { minutes: 15, win_rate: 44.0, avg_return_bps: -0.28, sample_n: 57062 },
      { minutes: 30, win_rate: 41.1, avg_return_bps: -0.33, sample_n: 57062 },
      { minutes: 60, win_rate: 38.4, avg_return_bps: -0.37, sample_n: 57062 },
    ],
    best_horizon_min: 5,
    best_horizon_win_rate: 46.6,
    best_horizon_avg_bps: -0.22,
  },
  {
    id: 'card_3',
    name: 'IWM CARD 3: Bullish Reversal (2D-1-2U)',
    description: 'Previous bars: 2D (bearish) -> 1 (inside bar compression); Current bar: Breaking above the inside bar\'s high (2U)',
    direction: 'CALL',
    conditions: [
      'RSI < 45 (was oversold from the 2D move)',
      'Price at or near support level (prev day low, VWAP, order block)',
      'StochRSI was oversold (< 20), now turning up',
      'Volume confirming (RVOL > 1.0)',
    ],
    win_rate: 40.4,
    avg_return: 0,
    target_pct: 0.3,
    stop_pct: 0.15,
    horizons: [
      { minutes: 5, win_rate: 47.0, avg_return_bps: 0.01, sample_n: 20734 },
      { minutes: 15, win_rate: 44.1, avg_return_bps: -0.06, sample_n: 20734 },
      { minutes: 30, win_rate: 40.4, avg_return_bps: -0.3, sample_n: 20734 },
      { minutes: 60, win_rate: 36.4, avg_return_bps: -0.58, sample_n: 20734 },
    ],
    best_horizon_min: 5,
    best_horizon_win_rate: 47.0,
    best_horizon_avg_bps: 0.01,
  },
  {
    id: 'card_4',
    name: 'IWM CARD 4: Bearish Reversal (2U-1-2D)',
    description: 'Previous bars: 2U (bullish) -> 1 (inside bar compression); Current bar: Breaking below the inside bar\'s low (2D)',
    direction: 'PUT',
    conditions: [
      'RSI > 55 (was overbought from the 2U move)',
      'Price at or near resistance (prev day high, upper BB)',
      'StochRSI was overbought (> 80), now turning down',
      'Volume confirming (RVOL > 1.0)',
    ],
    win_rate: 43.2,
    avg_return: 0,
    target_pct: 0.38,
    stop_pct: 0.2,
    horizons: [
      { minutes: 5, win_rate: 46.7, avg_return_bps: -0.08, sample_n: 20410 },
      { minutes: 15, win_rate: 45.9, avg_return_bps: 0.13, sample_n: 20410 },
      { minutes: 30, win_rate: 43.2, avg_return_bps: 0.26, sample_n: 20410 },
      { minutes: 60, win_rate: 40.2, avg_return_bps: 0.32, sample_n: 20410 },
    ],
    best_horizon_min: 60,
    best_horizon_win_rate: 40.2,
    best_horizon_avg_bps: 0.32,
  },
  {
    id: 'card_5',
    name: 'IWM CARD 5: Outside Bar Breakout (Type 3 Bullish)',
    description: 'Current bar is Type 3 (higher high AND lower low than prev bar); Close is above previous bar\'s close (bullish resolution)',
    direction: 'CALL',
    conditions: [
      'RSI between 40-60 (room to run)',
      'Close in upper half of the bar\'s range',
      'Volume above average (RVOL > 1.2)',
      'Higher timeframe supports the direction',
    ],
    win_rate: 38.4,
    avg_return: -0.01,
    target_pct: 0.3,
    stop_pct: 0.15,
    horizons: [
      { minutes: 5, win_rate: 45.1, avg_return_bps: -0.24, sample_n: 29146 },
      { minutes: 15, win_rate: 41.9, avg_return_bps: -0.34, sample_n: 29146 },
      { minutes: 30, win_rate: 38.4, avg_return_bps: -0.52, sample_n: 29146 },
      { minutes: 60, win_rate: 35.1, avg_return_bps: -0.89, sample_n: 29146 },
    ],
    best_horizon_min: 5,
    best_horizon_win_rate: 45.1,
    best_horizon_avg_bps: -0.24,
  },
  {
    id: 'card_6',
    name: 'IWM CARD 6: ORB Breakout — Bullish',
    description: 'Price has broken above 30m Opening Range High; Current Strat bar confirms: 2U or 3',
    direction: 'CALL',
    conditions: [
      'RSI not overbought (< 70)',
      'Price above VWAP',
      'EMA9 > EMA20',
      'RVOL > 1.0 (volume confirming breakout)',
      'At least 30 min after market open',
    ],
    win_rate: 37.6,
    avg_return: -0.01,
    target_pct: 0.3,
    stop_pct: 0.15,
    horizons: [
      { minutes: 5, win_rate: 46.0, avg_return_bps: -0.37, sample_n: 138567 },
      { minutes: 15, win_rate: 41.9, avg_return_bps: -0.7, sample_n: 138567 },
      { minutes: 30, win_rate: 37.6, avg_return_bps: -1.1, sample_n: 138567 },
      { minutes: 60, win_rate: 33.6, avg_return_bps: -1.6, sample_n: 138567 },
    ],
    best_horizon_min: 5,
    best_horizon_win_rate: 46.0,
    best_horizon_avg_bps: -0.37,
  },
  {
    id: 'card_7',
    name: 'IWM CARD 7: ORB Breakout — Bearish',
    description: 'Price has broken below 30m Opening Range Low; Current Strat bar confirms: 2D or 3',
    direction: 'PUT',
    conditions: [
      'RSI not oversold (> 30)',
      'Price below VWAP',
      'EMA9 < EMA20',
      'RVOL > 1.0',
      'At least 30 min after market open',
    ],
    win_rate: 39.0,
    avg_return: -0.01,
    target_pct: 0.38,
    stop_pct: 0.2,
    horizons: [
      { minutes: 5, win_rate: 45.7, avg_return_bps: -0.54, sample_n: 126877 },
      { minutes: 15, win_rate: 42.4, avg_return_bps: -0.86, sample_n: 126877 },
      { minutes: 30, win_rate: 39.0, avg_return_bps: -1.2, sample_n: 126877 },
      { minutes: 60, win_rate: 35.9, avg_return_bps: -1.47, sample_n: 126877 },
    ],
    best_horizon_min: 5,
    best_horizon_win_rate: 45.7,
    best_horizon_avg_bps: -0.54,
  },
  {
    id: 'card_8',
    name: 'IWM CARD 8: ORB Failure / Mean Reversion',
    description: 'Price broke above ORB high, then FAILED and returned inside range; Current Strat shows 2D (confirming the failure)',
    direction: 'PUT',
    conditions: [
      'RSI was elevated (> 60) at breakout',
      'Volume declining on the failed breakout',
      'Strat shows reversal (2D after 2U or 3)',
      'VWAP is nearby (target)',
    ],
    win_rate: 47.6,
    avg_return: -0.01,
    target_pct: 0.2,
    stop_pct: 0.2,
    horizons: [
      { minutes: 5, win_rate: 46.9, avg_return_bps: -0.6, sample_n: 8600 },
      { minutes: 15, win_rate: 47.5, avg_return_bps: -0.56, sample_n: 8600 },
      { minutes: 30, win_rate: 47.6, avg_return_bps: -0.64, sample_n: 8600 },
      { minutes: 60, win_rate: 48.5, avg_return_bps: -0.47, sample_n: 8600 },
    ],
    best_horizon_min: 60,
    best_horizon_win_rate: 48.5,
    best_horizon_avg_bps: -0.47,
  },
  {
    id: 'card_9',
    name: 'IWM CARD 9: Support Bounce (at Historical Level)',
    description: 'Price is at previous day\'s low (support level); Current bar is 2U (bouncing off support)',
    direction: 'CALL',
    conditions: [
      'RSI < 40 (oversold at support)',
      'StochRSI crossed above 20 (turning up)',
      'Order block nearby (institutional interest)',
      'Volume increasing on bounce',
    ],
    win_rate: 41.6,
    avg_return: 0,
    target_pct: 0.3,
    stop_pct: 0.15,
    horizons: [
      { minutes: 5, win_rate: 47.2, avg_return_bps: -0.03, sample_n: 15642 },
      { minutes: 15, win_rate: 44.6, avg_return_bps: 0.14, sample_n: 15642 },
      { minutes: 30, win_rate: 41.6, avg_return_bps: 0.26, sample_n: 15642 },
      { minutes: 60, win_rate: 38.5, avg_return_bps: 0.31, sample_n: 15642 },
    ],
    best_horizon_min: 60,
    best_horizon_win_rate: 38.5,
    best_horizon_avg_bps: 0.31,
  },
  {
    id: 'card_10',
    name: 'IWM CARD 10: Resistance Rejection (at Historical Level)',
    description: 'Price is at previous day\'s high (resistance level); Current bar is 2D (rejecting off resistance)',
    direction: 'PUT',
    conditions: [
      'RSI > 60 (overbought at resistance)',
      'StochRSI crossed below 80 (turning down)',
      'Volume declining on approach to resistance',
      'Bearish divergence (price higher, RSI lower)',
    ],
    win_rate: 45.3,
    avg_return: 0.01,
    target_pct: 0.38,
    stop_pct: 0.2,
    horizons: [
      { minutes: 5, win_rate: 47.2, avg_return_bps: 0.19, sample_n: 20766 },
      { minutes: 15, win_rate: 46.9, avg_return_bps: 0.39, sample_n: 20766 },
      { minutes: 30, win_rate: 45.3, avg_return_bps: 0.85, sample_n: 20766 },
      { minutes: 60, win_rate: 42.7, avg_return_bps: 1.24, sample_n: 20766 },
    ],
    best_horizon_min: 60,
    best_horizon_win_rate: 42.7,
    best_horizon_avg_bps: 1.24,
  },
  {
    id: 'card_11',
    name: 'IWM CARD 11: Order Block Test (Institutional Zone)',
    description: 'Price is testing an identified order block zone; Current bar is 2U (bouncing off the institutional zone)',
    direction: 'CALL',
    conditions: [
      'Price is at order block high or low boundary',
      'RSI between 35-55 (not extreme)',
      'Volume increasing at the zone',
      'Strat shows reversal or continuation with direction',
    ],
    win_rate: 40.6,
    avg_return: 0,
    target_pct: 0.3,
    stop_pct: 0.15,
    horizons: [
      { minutes: 5, win_rate: 45.3, avg_return_bps: -0.06, sample_n: 7551 },
      { minutes: 15, win_rate: 44.1, avg_return_bps: -0.05, sample_n: 7551 },
      { minutes: 30, win_rate: 40.6, avg_return_bps: -0.29, sample_n: 7551 },
      { minutes: 60, win_rate: 35.5, avg_return_bps: -0.91, sample_n: 7551 },
    ],
    best_horizon_min: 15,
    best_horizon_win_rate: 44.1,
    best_horizon_avg_bps: -0.05,
  },
  {
    id: 'card_12',
    name: 'IWM CARD 12: FTFC Maximum Conviction (All Aligned)',
    description: 'ALL timeframes showing the same direction; EMAs bullish, ORB bullish, Strat 2U, RSI healthy; This is the STRONGEST possible setup',
    direction: 'CALL',
    conditions: [
      'EMA9 > EMA20 (bullish cross)',
      'ORB 30m trend is bullish',
      'Current Strat bar is 2U',
      'RSI between 40-65 (healthy, not overbought)',
      'Price above VWAP',
      'RVOL > 1.0 (volume confirms)',
    ],
    win_rate: 37.5,
    avg_return: -0.01,
    target_pct: 0.3,
    stop_pct: 0.15,
    horizons: [
      { minutes: 5, win_rate: 46.2, avg_return_bps: -0.38, sample_n: 52250 },
      { minutes: 15, win_rate: 42.1, avg_return_bps: -0.8, sample_n: 52250 },
      { minutes: 30, win_rate: 37.5, avg_return_bps: -1.23, sample_n: 52250 },
      { minutes: 60, win_rate: 33.5, avg_return_bps: -1.73, sample_n: 52250 },
    ],
    best_horizon_min: 5,
    best_horizon_win_rate: 46.2,
    best_horizon_avg_bps: -0.38,
  }
  ],
} satisfies PlaybookResponse & { source: string };

/** A small one-card set with a NON-zero age, for specs that assert the
 *  "as of <date> (Nd old)" label explicitly; mock mode serves the real set
 *  above. */
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
/**
 * GET /api/movement-statement with the feature flag ON: a realistic assembled
 * statement, shape verified live against the production assembler
 * (lib/movement_statement.py) — validated 15m model, context-only expected
 * move and regime, and a levels ladder as _build_movement_level_map emits it.
 * Served by mock mode AND the Playwright `mockDashboard` fixture so the two
 * cannot drift; movement-read.spec.ts derives its variants from it.
 */
export const MOCK_MOVEMENT_STATEMENT = {
  status: 'OK',
  ticker: 'IWM',
  timeframe: '15m',
  scope_statement:
    'Structure read, not a directional or P&L edge. The headline probability ' +
    'is the calibrated chance the current candle type continues.',
  headline: {
    status: 'OK',
    probability: 0.087,
    current_type: '1',
    statement: 'IWM 15m: current structure is a 1 candle; continuation 9%.',
  },
  continuation: { status: 'OK', current_type: '1', continuation_prob: 0.087 },
  confidence_modifiers: {
    note:
      'Context only. These DO NOT change the headline probability — the ' +
      'headline is the calibrated continuation probability alone.',
    expected_move: {
      status: 'OK',
      role: 'context',
      size_class: 'TIGHT',
      pred_bucket: 0,
      probabilities: {
        p_tight: 0.69,
        p_normal: 0.24,
        p_expanded: 0.05,
        p_explosive: 0.01,
      },
      max_proba: 0.69,
      model_version: 'magnitude-recal-48njf',
      ts: '2026-07-10T19:45:00+00:00',
      usage_guidance:
        'How BIG the next move is likely to be — not which way. Sizing / ' +
        'filtering / strike-selection context only: it is NOT a directional ' +
        'signal and does not move the headline probability.',
    },
    regime: {
      status: 'OK',
      role: 'context',
      regime: 'negative_gamma',
      mood: 'trending',
      gamma_flip: null,
      total_gex: -22226013.0,
    },
  },
  // In production the endpoint builds this via _build_movement_level_map; a
  // realistic ladder (levels-to-go each way, per-tier population reach-rates).
  levels: {
    status: 'OK',
    current_price: 218.4,
    reach_rate_note:
      'Reach-rates are population statistics per tier, not per-instance predictions.',
    calls: [
      {
        price: 219.1,
        name: 'ORB 15m High',
        period: 'intraday',
        level_type: 'ORB',
        distance_pct: 0.32,
        reach_rate: { status: 'OK', reach_rate: 0.61, hits: 92, sample_n: 151, low_sample: false },
      },
      {
        price: 220.05,
        name: 'Prev Day High',
        period: 'daily',
        level_type: 'PDH',
        distance_pct: 0.76,
        reach_rate: { status: 'OK', reach_rate: 0.38, hits: 57, sample_n: 151, low_sample: false },
      },
    ],
    puts: [
      {
        price: 217.8,
        name: 'ORB 15m Low',
        period: 'intraday',
        level_type: 'ORB',
        distance_pct: -0.27,
        reach_rate: { status: 'OK', reach_rate: 0.58, hits: 88, sample_n: 151, low_sample: false },
      },
      {
        price: 216.9,
        name: 'Prev Day Low',
        period: 'daily',
        level_type: 'PDL',
        distance_pct: -0.69,
        reach_rate: { status: 'OK', reach_rate: 0.31, hits: 12, sample_n: 40, low_sample: true },
      },
    ],
  },
} satisfies MovementStatement;

export const dashboardRoutes: MockRoute[] = [
  { pattern: /^\/api\/dashboard\/brief\/IWM$/, reply: () => ({ body: MOCK_DASHBOARD_BRIEF }) },
  // The real populated set, so mock mode renders the top-setup happy path
  // (age label included); MOCK_PLAYBOOK_EMPTY stays for specs wanting that branch.
  { pattern: /^\/api\/playbook\/IWM$/, reply: () => ({ body: MOCK_PLAYBOOK }) },
  {
    // POST /api/playbook/evaluate — contract-complete but currently DORMANT
    // in mock mode: the canonical world is a closed session, PlaybookPage
    // gates snapshot-building on isMarketOpenish, and usePlaybookBatch never
    // fires without a snapshot (the page renders its honest "evaluation
    // paused" state instead). The route exists so the day the mock session
    // opens, the POST resolves instead of 501ing. Only usePlaybookBatch
    // (PlaybookPage) consumes the endpoint today; the flat `conditions`
    // shape is served for wire completeness. The real evaluator stays
    // server-side (playbook.py — Rule 5); this fixture answers a
    // deterministic met/unmet/unknown cycle with self-labelled details.
    // Note: like every route here, the pattern is pathname-only, so a
    // historical `?date=` playbook request gets today's cards too.
    method: 'POST',
    pattern: /^\/api\/playbook\/evaluate$/,
    reply: (req) => {
      const body = (req.body ?? {}) as {
        conditions?: string[];
        batches?: Record<string, string[]>;
      };
      // The wire always carries BOTH keys per result (_EvalResult.model_dump
      // with detail/reason defaulting to null) — mirror that exactly so
      // consumers distinguishing absent-vs-null see production shapes.
      const clip = (c: string) => (c.length > 40 ? `${c.slice(0, 40)}…` : c);
      const evalOne = (c: string, i: number) =>
        i % 3 === 0
          ? { status: 'met' as const, detail: `fixture: "${clip(c)}" holds in the mock snapshot`, reason: null }
          : i % 3 === 1
            ? { status: 'unmet' as const, detail: `fixture: "${clip(c)}" does not hold in the mock snapshot`, reason: null }
            : { status: 'unknown' as const, detail: null, reason: 'fixture: input not in the mock snapshot' };
      if (!body.conditions && !body.batches) {
        // Mirrors the real 400 — a bodyless POST must not fabricate success.
        return {
          status: 400,
          body: { detail: 'Supply either `conditions` (flat) or `batches` (per-key).' },
        };
      }
      const payload: Record<string, unknown> = {};
      if (body.conditions) payload.results = body.conditions.map(evalOne);
      if (body.batches) {
        payload.results_by_key = Object.fromEntries(
          Object.entries(body.batches).map(([k, conds]) => [k, conds.map(evalOne)]),
        );
      }
      return { body: payload };
    },
  },
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
  // MovementRead mounts on the default page. Until 2026-09-07 this answered
  // the flag-OFF 404 (card hides); it now serves the assembled statement so
  // the demo landing page shows the card, matching every other populated
  // fixture here, and so the Playwright fixture that shares this payload
  // does not put a 404 — which Chrome logs as a console error — under the
  // navigation smoke's clean-console assertion.
  {
    pattern: /^\/api\/movement-statement$/,
    reply: () => ({ body: MOCK_MOVEMENT_STATEMENT }),
  },
];
