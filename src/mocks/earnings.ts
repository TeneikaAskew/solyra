/** Synthetic wire fixtures, not vendor captures or evaluated market outcomes. */
import type { EarningsDailyPath, EarningsHistoryResponse, EarningsTickerLean } from '@/types/earnings';
import type { MockRoute } from './types';

function path(report: string, fiscal: string, prior: string, end: string, closeHour: string, opposite: number, oppositeDate: string,
  fill: number | null, fillDate: string | null): EarningsDailyPath {
  return {
    version: 'earnings-daily-path-v1', event_id: `DEMO:${fiscal}:${report}`,
    reaction_basis: 'BMO', source_mode: 'retrospective_current_vintage',
    historical_publication_verified: false, status: 'complete', reason: null,
    basis_id: 'synthetic-raw-control', input_identity: 'a'.repeat(64),
    computed_at: '2026-01-13T14:00:00+00:00', observation_ts: '2026-01-13T14:00:00+00:00',
    mature_at: `${end}T${closeHour}:00:00+00:00`, reaction_session: report,
    pre_gap_close_session: prior, window_end_session: end,
    expected_steps: 6, observed_steps: 6,
    first_opposite_close_step: opposite, first_opposite_close_date: oppositeDate,
    closing_gap_fill_step: fill, closing_gap_fill_date: fillDate,
    censored: fill === null,
    per_metric: {
      first_opposite_close: { available: true, status: 'observed', censored: false,
        mature_at: `${oppositeDate}T${closeHour}:00:00+00:00`, reason: null },
      closing_gap_fill: { available: true, status: fill === null ? 'right_censored' : 'observed',
        censored: fill === null, mature_at: `${fillDate ?? end}T${closeHour}:00:00+00:00`, reason: null },
    },
  };
}

export const MOCK_EARNINGS_HISTORY = {
  ticker: 'DEMO', count: 4,
  rows: [
    { ticker: 'DEMO', reported_date: '2026-01-05', fiscal_date_ending: '2025-12-31',
      reaction_basis: 'BMO', reaction_gap_pct: 10, sustain_5d_pct: -8.928571428571429,
      is_reversal_5d: true, daily_path_v1: path('2026-01-05', '2025-12-31', '2026-01-02', '2026-01-12', '21', 2, '2026-01-07', 4, '2026-01-09') },
    { ticker: 'DEMO', reported_date: '2025-10-02', fiscal_date_ending: '2025-08-31',
      reaction_basis: 'BMO', reaction_gap_pct: -10, sustain_5d_pct: -4.49438202247191,
      is_reversal_5d: false, daily_path_v1: path('2025-10-02', '2025-08-31', '2025-10-01', '2025-10-09', '20', 2, '2025-10-06', null, null) },
    { ticker: 'DEMO', reported_date: '2025-07-14', fiscal_date_ending: '2025-05-31',
      reaction_basis: 'BMO', reaction_gap_pct: 5, sustain_5d_pct: 3.7735849056603774,
      is_reversal_5d: false, daily_path_v1: path('2025-07-14', '2025-05-31', '2025-07-11', '2025-07-21', '20', 2, '2025-07-16', null, null) },
    { ticker: 'DEMO', reported_date: '2025-04-02', fiscal_date_ending: '2025-02-28',
      reaction_basis: 'BMO', reaction_gap_pct: -5, sustain_5d_pct: -4.25531914893617,
      is_reversal_5d: false, daily_path_v1: path('2025-04-02', '2025-02-28', '2025-04-01', '2025-04-09', '20', 3, '2025-04-07', null, null) },
  ],
} satisfies EarningsHistoryResponse;

export const MOCK_EARNINGS_LEAN = {
  ticker: 'DEMO', total_quarters: 4, lean_score: null,
  daily_path_summary_v1: {
    version: 'earnings-daily-path-summary-v1', mode: 'retrospective_current_vintage',
    scope: 'latest_12_event_candidates_daily_closing_steps_only', point_in_time_verified: false,
    event_n: 4, qualified_native_n: 4,
    historical_direction_consistency_pct: 75, historical_upward_opening_gap_pct: 50,
    first_opposite_close: { eligible_n: 4, observed_n: 4, right_censored_n: 0,
      unavailable_n: 0, not_applicable_n: 0, observed_rate_pct: 100, median_first_observed_step: 2 },
    closing_gap_fill: { eligible_n: 4, observed_n: 1, right_censored_n: 3,
      unavailable_n: 0, not_applicable_n: 0, observed_rate_pct: 25, median_first_observed_step: 4 },
    events: [
      { event_id: 'DEMO:2025-12-31:2026-01-05', reported_date: '2026-01-05', fiscal_date_ending: '2025-12-31', status: 'complete', reason: null },
      { event_id: 'DEMO:2025-08-31:2025-10-02', reported_date: '2025-10-02', fiscal_date_ending: '2025-08-31', status: 'complete', reason: null },
      { event_id: 'DEMO:2025-05-31:2025-07-14', reported_date: '2025-07-14', fiscal_date_ending: '2025-05-31', status: 'complete', reason: null },
      { event_id: 'DEMO:2025-02-28:2025-04-02', reported_date: '2025-04-02', fiscal_date_ending: '2025-02-28', status: 'complete', reason: null },
    ],
  },
} satisfies EarningsTickerLean;

/** Existing dev mock mode only. Real tickers are never assigned DEMO's synthetic history. */
export const earningsRoutes: MockRoute[] = [
  { pattern: /^\/api\/earnings\/history\/([^/]+)$/, reply: (_request, match) => match[1] === 'DEMO'
    ? { body: MOCK_EARNINGS_HISTORY }
    : { status: 404, body: { detail: 'Synthetic earnings fixture is available only for DEMO' } } },
  { pattern: /^\/api\/earnings\/ticker\/([^/]+)\/lean$/, reply: (_request, match) => match[1] === 'DEMO'
    ? { body: MOCK_EARNINGS_LEAN }
    : { status: 404, body: { detail: 'Synthetic earnings fixture is available only for DEMO' } } },
];
