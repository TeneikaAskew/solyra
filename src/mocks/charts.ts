/**
 * Typed fixtures + mock-mode routes for the Charts page (`/charts`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/charts.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
 *
 * Endpoint fan-out, read off ChartsPage.tsx:
 *   GET  /api/market/dates/{ticker}          useAvailableDates    → DatesResponse
 *   GET  /api/market/data/{ticker}/{date}    useMarketData        → MarketDataResponse
 *   GET  /api/market/reference/{t}/{date}    useReferenceLevels   → ReferenceLevels
 *   GET  /api/options/{t}/{date}/levels      useGammaLevels       → GammaLevelsResponse
 *   POST /api/live/indicators                useLiveIndicators    → IndicatorsResponse
 *   POST /api/live/signal-series             useSignalSeries      → SignalSeriesResponse
 *   GET  /api/journal/trades/{ticker}        useJournalChartTrades
 *   GET  /api/signals/{ticker}/similar       useSimilarSetups     → SimilarResponse
 *   GET  /api/signals/{ticker}               (sibling signal reads)
 *
 * Bars, indicators and reference levels are imported from ./live rather than
 * duplicated — POST /api/live/indicators and /api/market/* are the same
 * endpoints the Live page uses, and two copies of a 60-line indicator
 * payload is exactly the drift this module exists to remove.
 *
 * Mutation-only endpoints (POST /api/journal, POST /api/backtest/replay-trades)
 * are not wired: they fire on user action, and the specs that drive them want
 * to assert on the request body themselves.
 */
import type { SignalSeriesResponse } from '@/hooks/useLiveIndicators';
import type { SimilarResponse } from '@/hooks/useSimilarSetups';
import type { MockRoute } from './types';
import type { JournalTradesResponse } from './journal';
import {
  MOCK_CANDLES,
  MOCK_LIVE_INDICATORS,
  MOCK_MARKET_DATA,
  MOCK_REFERENCE_LEVELS,
} from './live';

export { MOCK_LIVE_INDICATORS, MOCK_MARKET_DATA, MOCK_REFERENCE_LEVELS };

/** The chart's last bar, as ChartsPage stringifies it when matching fires. */
export const LAST_BAR_TIME = String(MOCK_CANDLES[MOCK_CANDLES.length - 1].time);

/**
 * `DatesResponse` is internal to useMarketData.ts, so the shape is restated
 * here (plus `source`, which the backend always sends and the hook ignores).
 * `months` is required and the literal this replaced omitted it — the sort
 * of silent contract gap a typed fixture is meant to surface.
 */
interface DatesResponse {
  ticker: string;
  source: string;
  dates: string[];
  months: string[];
}

/**
 * Wire format is YYYYMMDD, not ISO — ChartsPage's converter slices
 * `d.slice(0,4)-d.slice(4,6)-d.slice(6,8)`, so ISO dates here would feed
 * the picker garbage like "2026--4-2-5". Months are YYYYMM.
 */
export const MOCK_MARKET_DATES = {
  ticker: 'IWM',
  source: 'cloud_sql',
  dates: ['20260424', '20260423', '20260422'],
  months: ['202604'],
} satisfies DatesResponse;

/**
 * One CALL fire on the LAST bar, so SimilarSetupsCard's populated branch is
 * exercised deterministically. `time` must equal `LAST_BAR_TIME` exactly —
 * ChartsPage matches fires to bars by stringified time.
 */
export const MOCK_SIGNAL_SERIES = {
  fires: [{ time: LAST_BAR_TIME, direction: 'CALL', score: 4, bar_index: MOCK_CANDLES.length - 1 }],
} satisfies SignalSeriesResponse;

/** No fires — the card falls back to its "waits for the voter" placeholder. */
export const MOCK_SIGNAL_SERIES_EMPTY = {
  fires: [],
} satisfies SignalSeriesResponse;

/** Historical setups matching the fired CALL bar. */
export const MOCK_SIMILAR_SETUPS = {
  ticker: 'IWM',
  direction: 'CALL',
  rsi: 35,
  score: 4,
  rsi_band: 5,
  stats: {
    count: 240,
    avg_mfe_pct: 0.094,
    median_mfe_pct: 0.077,
    p25_mfe_pct: 0.012,
    p75_mfe_pct: 0.18,
    avg_return_5min: 0.04,
    avg_return_20min: 0.082,
    pct_profitable: 0.858,
    // str(pd.Timestamp) on the wire: space separator, not "T".
    earliest: '2015-01-15 14:00:00+00:00',
    latest: '2026-04-07 20:00:00+00:00',
  },
  matches: [
    {
      time: '2026-04-07 14:44:00+00:00',
      direction: 'CALL',
      price: 250.41,
      score: 4,
      rsi: 35.8,
      return_pct: 0.012,
      return_5min: 0.012,
      return_20min: 0.012,
    },
  ],
} satisfies SimilarResponse;

/**
 * No historical matches. The backend's zero-match branch sends stats with
 * ONLY `count` (signals.py) — the other keys are absent on the wire, not
 * null, so a fixture supplying them as null would mask any UI branch that
 * distinguishes `undefined` from `null`.
 */
export const MOCK_SIMILAR_SETUPS_EMPTY = {
  ticker: 'IWM',
  direction: 'CALL',
  rsi: 35,
  score: 4,
  rsi_band: 5,
  stats: { count: 0 },
  matches: [],
} satisfies SimilarResponse;

export const MOCK_JOURNAL_TRADES_EMPTY = {
  ticker: 'IWM',
  source: 'cloud_sql',
  count: 0,
  trades: [],
} satisfies JournalTradesResponse;

/**
 * One CLOSED trade. Used by the strip-down test to prove the Trades panel is
 * genuinely gone rather than just empty — an empty list would prove nothing.
 */
export const MOCK_JOURNAL_TRADES_ONE_CLOSED = {
  ticker: 'IWM',
  source: 'cloud_sql',
  count: 1,
  trades: [
    {
      id: 'closed-trade-1',
      ticker: 'IWM',
      direction: 'CALL',
      entry_ts: '2026-04-24T09:31:00',
      exit_ts: '2026-04-24T10:15:00',
      entry_price: 220.0,
      exit_price: 222.5,
      return_pct: 1.1364,
      notes: '',
      take_profits: [223, 225],
      stop_loss: 218.5,
      status: 'win',
      source: 'chart',
      session_id: null,
      created_at: '2026-04-24T09:31:01',
    },
  ],
} satisfies JournalTradesResponse;

/**
 * Mock-mode routes OWNED by the charts domain. Every endpoint appears in
 * exactly ONE domain's table (the engine asserts this): the market-data
 * candles, indicators, quote and reference this page also consumes are
 * owned by ./live and ./dashboard, and the journal/options reads by their
 * own modules — one canonical payload per endpoint, so no page's fixture
 * can shadow a richer one (Codex P2 on PR #46).
 */
export const chartsRoutes: MockRoute[] = [
  { pattern: /^\/api\/market\/dates\/IWM$/, reply: () => ({ body: MOCK_MARKET_DATES }) },
  {
    method: 'POST',
    pattern: /^\/api\/live\/signal-series$/,
    reply: () => ({ body: MOCK_SIGNAL_SERIES }),
  },
  { pattern: /^\/api\/signals\/IWM\/similar$/, reply: () => ({ body: MOCK_SIMILAR_SETUPS }) },
];
