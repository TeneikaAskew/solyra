/**
 * Typed fixtures + mock-mode routes for the structured AI insights page
 * (`/insights`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/insights.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
 *
 * Endpoint fan-out, read off InsightsPage.tsx + WatchlistPanel.tsx:
 *   GET  /api/insights/report/{ticker}          useInsightReport     → InsightReportEnvelope | 404
 *   GET  /api/insights/report/{ticker}/history  useInsightHistory    → InsightHistoryResponse
 *   POST /api/insights/report/{ticker}/refresh  useRefreshInsight    → RefreshResponse
 *   GET  /api/insights/runs/{run_id}            useRunStatus         → RunStatus
 *   GET  /api/insights/reports/{report_id}      useInsightReportById → InsightReportEnvelope
 *   GET  /api/insights/watchlist?…              useWatchlist         → WatchlistResponse
 *   GET  /api/dashboard/brief/{ticker}          useBriefDirection
 *
 * Contract note: `MOCK_WATCHLIST` is the real `WatchlistResponse` shape
 * (run_id / ranked / weights_used). The stub this replaced sent
 * `{ tickers: [...] }`, which the panel reads as `ranked === undefined` and
 * renders as empty — so watchlist assertions were passing without the panel
 * ever being exercised. `satisfies` makes that class of mismatch a build
 * error instead of a silent false green.
 */
import type {
  InsightHistoryResponse,
  InsightReportEnvelope,
  RefreshResponse,
  RunStatus,
} from '@/types/insights';
import type { WatchlistResponse } from '@/types/watchlist';
import type { RouteRow } from '@/hooks/useAdmin';
import type { MockRoute } from './types';

export const RUN_ID = '00000000-0000-0000-0000-000000000001';

/**
 * A complete long/high-conviction report. Every card on the page has
 * something to render: thesis, entry zone, bull/bear, strat, a risk flag,
 * all three persona plans, a supporting signal, and the footer cost line.
 *
 * `per_role_cost` is required by the InsightReport contract and was absent
 * from the literal this replaced — `satisfies` caught it.
 */
export const MOCK_INSIGHT_REPORT = {
  ticker: 'IWM',
  as_of: '2026-04-15T14:30:00Z',
  report: {
    ticker: 'IWM',
    as_of: '2026-04-15T14:30:00Z',
    direction: 'long',
    conviction: 'high',
    thesis: 'Breakout above prior-day high with FTFC bullish and supportive volume.',
    entry_zone: { low: 220.0, high: 221.5 },
    stop: 218.0,
    targets: [224.0, 228.0],
    invalidation: 'Close below 218 on the 1-hour chart.',
    time_horizon: 'swing',
    key_levels: { support: 218.0, resistance: 224.0, pivot: 220.0 },
    strat_status: {
      last_candle: '2U',
      in_force_combo: '212_bull_reversal',
      ftfc_score: 0.72,
      ftfc_direction: 'bullish',
      trigger_high: 221.0,
      trigger_low: 218.5,
    },
    catalysts: [{ name: 'CPI', date: '2026-04-22', impact: 'high', kind: 'economic' }],
    bull_case: 'Volume + FTFC + trigger break aligned.',
    bear_case: 'Tight stop, CPI in window.',
    risk_flags: [
      { persona: 'conservative', severity: 'warn', message: 'CPI release within holding period.' },
    ],
    persona_plans: [
      {
        persona: 'aggressive',
        entry_zone: { low: 220.0, high: 222.5 },
        stop: 215.0,
        targets: [228.0, 234.0, 240.0],
        position_size_pct: 1.5,
        rationale: 'Wider stop, extended targets on high-conviction setup.',
      },
      {
        persona: 'neutral',
        entry_zone: { low: 220.0, high: 221.5 },
        stop: 218.0,
        targets: [223.0, 226.0, 229.0],
        position_size_pct: 1.0,
        rationale: '~1 ATR stop with 1R/2R/3R targets.',
      },
      {
        persona: 'conservative',
        entry_zone: { low: 220.5, high: 221.0 },
        stop: 219.0,
        targets: [222.5, 224.0],
        position_size_pct: 0.4,
        rationale: 'Reduced size + tight stop into CPI window.',
      },
    ],
    supporting_signals: [
      { alert_ts: '2026-04-15T14:30:00Z', direction: 'CALL', strength: 'strong', score: 4.5 },
    ],
    similar_past_trades: [],
    confidence_score: 0.78,
    failed_sections: [],
    model_versions: { trader: 'vertex:gemini-2.0-flash' },
    run_cost_usd: 0.0134,
    run_latency_ms: 12500,
    per_role_cost: { 'analyst:market': 0.0041, 'risk:neutral': 0.0038, judge: 0.0055 },
  },
  model_versions: { trader: 'vertex:gemini-2.0-flash' },
  cost_usd: 0.0134,
  latency_ms: 12500,
} satisfies InsightReportEnvelope;

/**
 * A partially-degraded report: the judge section failed, so `failed_sections`
 * and `failed_section_reasons` are populated and conviction drops. Exercises
 * the diagnostic banner rather than the all-green path.
 */
export const MOCK_INSIGHT_REPORT_DEGRADED = {
  ...MOCK_INSIGHT_REPORT,
  report: {
    ...MOCK_INSIGHT_REPORT.report,
    direction: 'flat',
    conviction: 'low',
    confidence_score: 0.31,
    failed_sections: ['judge'],
    failed_section_reasons: { judge: 'upstream model returned a 429 after 3 retries' },
  },
} satisfies InsightReportEnvelope;

export const MOCK_INSIGHT_HISTORY_EMPTY = {
  ticker: 'IWM',
  count: 0,
  reports: [],
} satisfies InsightHistoryResponse;

export const MOCK_INSIGHT_HISTORY = {
  ticker: 'IWM',
  count: 2,
  reports: [
    {
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      as_of: '2026-04-15T14:30:00Z',
      direction: 'long',
      conviction: 'high',
      thesis: 'Breakout above prior-day high with FTFC bullish and supportive volume.',
      cost_usd: 0.0134,
    },
    {
      id: 'aaaaaaaa-0000-0000-0000-000000000002',
      as_of: '2026-04-14T14:30:00Z',
      direction: 'flat',
      conviction: 'low',
      thesis: 'Chop between 218 and 221; no FTFC alignment.',
      cost_usd: 0.0119,
    },
  ],
} satisfies InsightHistoryResponse;

export const MOCK_REFRESH_QUEUED = {
  run_id: RUN_ID,
  ticker: 'IWM',
  status: 'queued',
} satisfies RefreshResponse;

/** Build a RunStatus in any of the pipeline's four states. */
export function runStatus(status: RunStatus['status']): RunStatus {
  const terminal = status === 'done' || status === 'failed';
  return {
    id: RUN_ID,
    ticker: 'IWM',
    status,
    trigger: 'local_dev',
    started_at: '2026-04-15T14:30:05Z',
    finished_at: terminal ? '2026-04-15T14:30:17Z' : null,
    error: status === 'failed' ? 'analyst stage timed out after 120s' : null,
    report_id: status === 'done' ? 'aaaaaaaa-0000-0000-0000-000000000001' : null,
  };
}

/** Deterministic ranker output — two ranked tickers with score breakdowns. */
export const MOCK_WATCHLIST = {
  run_id: 'bbbbbbbb-0000-0000-0000-000000000001',
  as_of: '2026-04-24T20:00:00Z',
  candidate_count: 42,
  excluded_count: 12,
  ranked: [
    {
      ticker: 'IWM',
      score: 8.4,
      pct_of_max: 1.0,
      catalyst_types: ['economic_event', 'top_mover'],
      catalyst_metadata: { economic_event: [{ name: 'CPI', date: '2026-04-22' }] },
      score_breakdown: [
        {
          name: 'catalyst_proximity',
          available: true,
          score_0_to_1: 0.9,
          weight: 4.0,
          points: 3.6,
          reason: 'CPI release within 3 sessions',
          raw: { days_out: 3 },
        },
        {
          name: 'relative_volume',
          available: true,
          score_0_to_1: 0.8,
          weight: 6.0,
          points: 4.8,
          reason: 'RVOL 1.4x 20-day average',
          raw: { rvol: 1.4 },
        },
      ],
    },
    {
      ticker: 'AAPL',
      score: 5.1,
      pct_of_max: 0.607,
      catalyst_types: ['earnings'],
      catalyst_metadata: { earnings: [{ date: '2026-04-28', confirmed: true }] },
      score_breakdown: [
        {
          name: 'catalyst_proximity',
          available: true,
          score_0_to_1: 0.85,
          weight: 4.0,
          points: 3.4,
          reason: 'Q2 earnings confirmed for 2026-04-28',
          raw: { days_out: 3 },
        },
        {
          name: 'relative_volume',
          available: false,
          score_0_to_1: 0,
          weight: 6.0,
          points: 0,
          reason: 'no intraday volume for session',
          raw: {},
        },
      ],
    },
  ],
  weights_used: { catalyst_proximity: 4.0, relative_volume: 6.0 },
  duration_ms: 4820,
} satisfies WatchlistResponse;

/** Ranker ran but nothing cleared the bar — the panel's honest empty state. */
export const MOCK_WATCHLIST_EMPTY = {
  run_id: 'bbbbbbbb-0000-0000-0000-000000000002',
  as_of: '2026-04-24T20:00:00Z',
  candidate_count: 0,
  excluded_count: 0,
  ranked: [],
  weights_used: { catalyst_proximity: 4.0, relative_volume: 6.0 },
  duration_ms: 1100,
} satisfies WatchlistResponse;

/** Model-routing rows behind <AgentsPanel> on this page. */
export const MOCK_AGENT_ROUTES = {
  routes: [
    { role: 'analyst', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'bull', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'bear', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'judge', provider: 'vertex', model: 'gemini-2.5-pro', updated_at: null, updated_by: null },
  ],
} satisfies { routes: RouteRow[] };

/** Streamed assistant reply. Multi-sentence so the incremental-append path
 *  has more than one decode to concatenate. */
export const MOCK_CHAT_REPLY =
  'IWM is holding above the prior-day high with FTFC bullish. ' +
  'The 220 strike carries the largest positive gamma, so expect it to act as a magnet into the close. ' +
  'Invalidation is a 1-hour close below 218.';

/**
 * Mock-mode route table for `/insights` — the happy-path translation of
 * `mockInsightsApi` (tests/helpers/fixtures/insights.ts) with its default
 * options: report present, empty history, empty watchlist, runs 'done'.
 *
 * Chat is a STREAMING endpoint: the page reads resp.body via a reader and
 * concatenates decoded chunks, so it is answered as plain text, not JSON —
 * a JSON envelope would render verbatim into the bubble.
 */
export const insightsRoutes: MockRoute[] = [
  { pattern: /^\/api\/insights\/report\/IWM$/, reply: () => ({ body: MOCK_INSIGHT_REPORT }) },
  {
    pattern: /^\/api\/insights\/report\/IWM\/history$/,
    reply: () => ({ body: MOCK_INSIGHT_HISTORY_EMPTY }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/insights\/report\/IWM\/refresh$/,
    reply: () => ({ body: MOCK_REFRESH_QUEUED }),
  },
  { pattern: /^\/api\/insights\/runs\/.+$/, reply: () => ({ body: runStatus('done') }) },
  {
    pattern: /^\/api\/insights\/reports\/([^/]+)$/,
    reply: () => ({ body: MOCK_INSIGHT_REPORT }),
  },
  // Owns the endpoint app-wide (the panel mounts on /insights AND /help):
  // the POPULATED ranking, so mock mode shows real-looking rows.
  { pattern: /^\/api\/insights\/watchlist$/, reply: () => ({ body: MOCK_WATCHLIST }) },
  // AgentsPanel (rendered on this page) reads the model-routing table. It is
  // NOT admin-gated in the UI here, so it needs an answer on /insights too.
  // GET /api/admin/routes is owned by ./admin (its table is the superset
  // of these agent roles); MOCK_AGENT_ROUTES stays exported for Playwright.
  {
    method: 'POST',
    pattern: /^\/api\/insights\/chat$/,
    reply: () => ({ text: MOCK_CHAT_REPLY, contentType: 'text/plain; charset=utf-8' }),
  },
];
