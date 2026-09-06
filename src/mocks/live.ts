/**
 * Typed fixtures + mock-mode routes for the Live Market page (`/live`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/live.ts re-exports them for its Playwright wiring —
 * so the app's mock mode and the E2E mocks cannot drift (CLAUDE.md Rule 6).
 *
 * Endpoint fan-out, read off LiveMarketPage.tsx:
 *   GET  /api/live/quote/{ticker}          useLiveQuote       → LiveQuote
 *   GET  /api/live/history/{ticker}        useLiveHistory     → LiveHistory
 *   GET  /api/live/avg-volume/{ticker}     useAvgVolume       → AvgVolume
 *   POST /api/live/indicators              useLiveIndicators  → IndicatorsResponse
 *   GET  /api/market/data/{ticker}/{date}  useMarketData +
 *                                          useReviewQuote's historical day
 *   GET  /api/market/reference/{t}/{date}  useReferenceLevels → ReferenceLevels
 *   GET  /api/live/status                  useLiveStatus (./common)
 *
 * `MOCK_LIVE_INDICATORS` lives here (not in charts.ts) because
 * POST /api/live/indicators is a live-domain endpoint; the Charts fixtures
 * import it from here rather than keeping a second copy.
 */
import type { AvgVolume, LiveHistory } from '@/hooks/useLiveHistory';
import type { LiveQuote } from '@/hooks/useLiveQuote';
import type { IndicatorsResponse } from '@/hooks/useLiveIndicators';
import type { MarketDataResponse, ReferenceLevels } from '@/hooks/useMarketData';
import type { MockRoute } from './types';

// ── Quote ──────────────────────────────────────────────────────────────────

/**
 * Regular-session quote, up 0.65 (+0.296%) on the prior close.
 * `last_updated` on the wire is AlphaVantage's "latest trading day" — a
 * bare date, not an ISO datetime (live.py).
 */
export const MOCK_LIVE_QUOTE = {
  ticker: 'IWM',
  price: 220.45,
  open: 219.8,
  high: 221.2,
  low: 219.5,
  volume: 12_345_678,
  change: 0.65,
  change_pct: 0.296,
  prev_close: 219.8,
  last_updated: '2026-04-24',
  market_session: 'regular',
  market_open: true,
} satisfies LiveQuote;

/**
 * Quote whose prior close could not be resolved. `change`/`change_pct`/
 * `prev_close` are null rather than rebased to the day's open — the
 * contract makes them nullable precisely so the UI can say "unavailable"
 * instead of showing a fabricated move (CLAUDE.md §3.7).
 */
export const MOCK_LIVE_QUOTE_NO_PREV_CLOSE = {
  ...MOCK_LIVE_QUOTE,
  change: null,
  change_pct: null,
  prev_close: null,
} satisfies LiveQuote;

/** Closed-session quote, for the after-hours / weekend render path. */
export const MOCK_LIVE_QUOTE_CLOSED = {
  ...MOCK_LIVE_QUOTE,
  market_session: 'closed',
  market_open: false,
} satisfies LiveQuote;

// ── Intraday history ───────────────────────────────────────────────────────

/** 30 one-minute bars walking up — clears the 14-bar RSI warmup. */
function buildBars(n = 30, base = 220, step = 0.05): LiveHistory['bars'] {
  return Array.from({ length: n }, (_, i) => {
    const close = base + i * step;
    return {
      time: `2026-04-24 13:${String(i % 60).padStart(2, '0')}:00`,
      open: close - step,
      high: close + 0.2,
      low: close - step - 0.1,
      close,
      volume: 100_000,
    };
  });
}

export const MOCK_LIVE_HISTORY = {
  ticker: 'IWM',
  interval: '1min',
  count: 30,
  market_session: 'regular',
  market_open: true,
  bars: buildBars(30),
} satisfies LiveHistory;

/** No bars yet — pre-open, or a symbol with no intraday coverage. */
export const MOCK_LIVE_HISTORY_EMPTY = {
  ticker: 'IWM',
  interval: '1min',
  count: 0,
  market_session: 'closed',
  market_open: false,
  bars: [],
} satisfies LiveHistory;

export const MOCK_AVG_VOLUME = {
  ticker: 'IWM',
  avg_volume_20d: 25_000_000,
  sample_size: 20,
  last_date: '2026-04-23',
  // Real enum is 'cloud_sql' | 'alphavantage' — never 'mock' (live.py).
  source: 'cloud_sql',
} satisfies AvgVolume;

// ── Market data / reference ────────────────────────────────────────────────

/** The declared session's opening bell (Fri 2026-04-24 09:30 ET = 13:30
 *  UTC), so candle epochs match the `date` the payload advertises — a
 *  detached epoch (the old 1_700_000_000 was a 2023 timestamp) breaks every
 *  date-sensitive consumer: review-mode cutoffs, trade markers, fire
 *  matching. */
const SESSION_OPEN_UTC = Date.UTC(2026, 3, 24, 13, 30, 0) / 1000;

/** Candles keyed by unix seconds (lightweight-charts' `time`), matching the
 *  1-minute cadence `useReviewQuote` slices for its synthetic review quote. */
function buildCandles(n = 30, base = 220, step = 0.05) {
  return Array.from({ length: n }, (_, i) => {
    const close = base + i * step;
    return {
      time: SESSION_OPEN_UTC + i * 60,
      open: close - step,
      high: close + 0.01,
      low: close - step - 0.01,
      close,
    };
  });
}

export const MOCK_CANDLES = buildCandles(30);

export const MOCK_MARKET_DATA = {
  ticker: 'IWM',
  date: '2026-04-24',
  timeframe: 1,
  count: MOCK_CANDLES.length,
  candlestick: MOCK_CANDLES,
  // `color` is part of the VolumeBar contract — the chart reads it directly.
  volume: MOCK_CANDLES.map((c) => ({ time: c.time, value: 100_000, color: '#26a69a' })),
} satisfies MarketDataResponse;

/** No intraday bars for the day — `useReviewQuote` returns undefined here
 *  so the caller renders "no intraday for <date>" rather than a fake price. */
export const MOCK_MARKET_DATA_EMPTY = {
  ticker: 'IWM',
  date: '2026-04-24',
  timeframe: 1,
  count: 0,
  candlestick: [],
  volume: [],
} satisfies MarketDataResponse;

/** The backend also returns `source`/`stale_days`/`week`, which the
 *  frontend's ReferenceLevels doesn't model — declared in the satisfies
 *  target so the fixture stays faithful to the wire format without going
 *  unchecked. On the wire `date` is YYYYMMDD and names the PREVIOUS trading
 *  day (the levels are yesterday's OHLC), and `week` is always present,
 *  nullable (main.py). */
export const MOCK_REFERENCE_LEVELS = {
  ticker: 'IWM',
  date: '20260423',
  open: 219.8,
  high: 222.0,
  low: 218.0,
  close: 220.0,
  source: 'cloud_sql',
  stale_days: 0,
  week: null,
} satisfies ReferenceLevels & { source: string; stale_days: number; week: null };

// ── Server-computed indicators ─────────────────────────────────────────────

/**
 * POST /api/live/indicators — the 10-condition production strength panel
 * plus the 5-condition `chart_voter` teaching readout (lib/chart_voter.py).
 * CALL deliberately fires on both (strength 80; met_count 3/5) and PUT does
 * not, so the fires/badge paths render deterministically. Condition labels
 * are verbatim from the Python side.
 */
export const MOCK_LIVE_INDICATORS = {
  indicators: {
    ema9: 220.5,
    ema20: 220.0,
    ema50: 219.0,
    rsi: 55,
    stochK: 72,
    stochD: 65,
    atr: 1.2,
    vwap: 220.2,
    stochKPrev: 70,
  },
  signals: {
    call: {
      direction: 'CALL',
      strength: 80,
      fired: true,
      conditions: [
        { id: 'c_p_ema9', label: 'Price > EMA9', met: true, current: 221.5, threshold: 220.5, operator: '>' },
        { id: 'c_p_ema20', label: 'Price > EMA20', met: true, current: 221.5, threshold: 220.0, operator: '>' },
        { id: 'c_p_ema50', label: 'Price > EMA50', met: true, current: 221.5, threshold: 219.0, operator: '>' },
        { id: 'c_p_vwap', label: 'Price > VWAP', met: true, current: 221.5, threshold: 220.2, operator: '>' },
        { id: 'c_rsi50', label: 'RSI > 50', met: true, current: 55, threshold: 50, operator: '>' },
        { id: 'c_rsi60', label: 'RSI > 60', met: false, current: 55, threshold: 60, operator: '>' },
        { id: 'c_stoch70', label: 'StochRSI > 70', met: true, current: 72, threshold: 70, operator: '>' },
        { id: 'c_rvol', label: 'RVOL > 1.0', met: true, current: 1.4, threshold: 1.0, operator: '>' },
        { id: 'c_cross', label: 'EMA9 > EMA20', met: true, current: 220.5, threshold: 220.0, operator: '>' },
        { id: 'c_atr', label: 'ATR > 2.0', met: false, current: 1.2, threshold: 2.0, operator: '>' },
      ],
    },
    put: {
      direction: 'PUT',
      strength: 20,
      fired: false,
      conditions: [
        { id: 'p_p_ema9', label: 'Price < EMA9', met: false, current: 221.5, threshold: 220.5, operator: '<' },
        { id: 'p_p_ema20', label: 'Price < EMA20', met: false, current: 221.5, threshold: 220.0, operator: '<' },
        { id: 'p_p_ema50', label: 'Price < EMA50', met: false, current: 221.5, threshold: 219.0, operator: '<' },
        { id: 'p_p_vwap', label: 'Price < VWAP', met: false, current: 221.5, threshold: 220.2, operator: '<' },
        { id: 'p_rsi50', label: 'RSI < 50', met: false, current: 55, threshold: 50, operator: '<' },
        { id: 'p_rsi40', label: 'RSI < 40', met: false, current: 55, threshold: 40, operator: '<' },
        { id: 'p_stoch30', label: 'StochRSI < 30', met: false, current: 72, threshold: 30, operator: '<' },
        { id: 'p_rvol', label: 'RVOL > 1.0', met: true, current: 1.4, threshold: 1.0, operator: '>' },
        { id: 'p_cross', label: 'EMA9 < EMA20', met: false, current: 220.5, threshold: 220.0, operator: '<' },
        { id: 'p_atr', label: 'ATR > 2.0', met: false, current: 1.2, threshold: 2.0, operator: '>' },
      ],
    },
  },
  chart_voter: {
    call: {
      direction: 'CALL',
      met_count: 3,
      total_count: 5,
      fires: true,
      conditions: [
        { id: 'call_consec_up', label: '3 consecutive up moves', met: true, detail: '3/3 last bars up' },
        { id: 'call_rsi_band', label: 'RSI 25–50 (bullish band)', met: false, detail: 'RSI 55.0' },
        { id: 'call_stoch_room', label: 'StochRSI K < 80 (room to run)', met: true, detail: 'K 72.0' },
        { id: 'call_above_vwap', label: 'Price > VWAP', met: true, detail: '221.50 > VWAP 220.20' },
        { id: 'call_above_ema9', label: 'Price > EMA9', met: false, detail: '220.50 < EMA9 221.50' },
      ],
    },
    put: {
      direction: 'PUT',
      met_count: 1,
      total_count: 5,
      fires: false,
      conditions: [
        { id: 'put_consec_down', label: '3 consecutive down moves', met: false, detail: '0/3 last bars down' },
        { id: 'put_rsi_band', label: 'RSI 50–75 (bearish band)', met: true, detail: 'RSI 55.0' },
        { id: 'put_stoch_room', label: 'StochRSI K > 20 (room to fall)', met: false, detail: 'K 72.0' },
        { id: 'put_below_vwap', label: 'Price < VWAP', met: false, detail: '221.50 < VWAP 220.20' },
        { id: 'put_below_ema9', label: 'Price < EMA9', met: false, detail: '221.50 > EMA9 220.50' },
      ],
    },
    firing: 'CALL',
  },
} satisfies IndicatorsResponse;

/**
 * Mock-mode route table for `/live` — the happy-path translation of
 * `mockLiveApi` (tests/helpers/fixtures/live.ts), scoped to IWM like the
 * fixture. Patterns match the pathname only; queries pass through.
 */
export const liveRoutes: MockRoute[] = [
  { pattern: /^\/api\/live\/quote\/IWM$/, reply: () => ({ body: MOCK_LIVE_QUOTE }) },
  { pattern: /^\/api\/live\/history\/IWM$/, reply: () => ({ body: MOCK_LIVE_HISTORY }) },
  { pattern: /^\/api\/live\/avg-volume\/IWM$/, reply: () => ({ body: MOCK_AVG_VOLUME }) },
  {
    method: 'POST',
    pattern: /^\/api\/live\/indicators$/,
    reply: () => ({ body: MOCK_LIVE_INDICATORS }),
  },
  {
    pattern: /^\/api\/market\/data\/IWM\/([^/]+)$/,
    reply: () => ({ body: MOCK_MARKET_DATA }),
  },
  // /api/market/reference is owned by ./dashboard (its payload carries the
  // populated `week` block); MOCK_REFERENCE_LEVELS stays exported for the
  // Playwright fixtures.
];
