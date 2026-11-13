/** Read-only wire fields from stocks' existing earnings routes. No market math. */
export type ClosingMetric = 'first_opposite_close' | 'closing_gap_fill';

export interface ClosingMetricState {
  available: boolean;
  status: string;
  censored: boolean | null;
  mature_at?: string | null;
  reason?: string | null;
}

export interface EarningsDailyPath {
  version: 'earnings-daily-path-v1';
  event_id: string | null;
  reaction_basis: string | null;
  source_mode: string | null;
  historical_publication_verified?: boolean;
  status: 'complete' | 'maturing' | 'not_applicable' | 'unavailable';
  reason: string | null;
  basis_id: string | null;
  input_identity: string | null;
  computed_at: string | null;
  observation_ts: string | null;
  mature_at: string | null;
  reaction_session: string | null;
  pre_gap_close_session: string | null;
  window_end_session: string | null;
  expected_steps: number | null;
  observed_steps: number | null;
  first_opposite_close_step: number | null;
  first_opposite_close_date: string | null;
  closing_gap_fill_step: number | null;
  closing_gap_fill_date: string | null;
  censored: boolean | null;
  per_metric: Partial<Record<ClosingMetric, ClosingMetricState>>;
}

export interface EarningsHistoryRow {
  ticker: string;
  reported_date: string;
  fiscal_date_ending: string | null;
  reaction_basis?: string | null;
  reaction_gap_pct: number | null;
  sustain_5d_pct: number | null;
  is_reversal_5d: boolean | null;
  daily_path_v1?: EarningsDailyPath | null;
}

export interface EarningsHistoryResponse {
  ticker: string;
  rows: EarningsHistoryRow[];
  count: number;
}

export interface ClosingMetricSummary {
  eligible_n: number;
  observed_n: number;
  right_censored_n: number;
  unavailable_n: number;
  not_applicable_n: number;
  observed_rate_pct: number | null;
  median_first_observed_step: number | null;
}

export interface EarningsCohortEvent {
  event_id: string;
  reported_date: string;
  fiscal_date_ending: string | null;
  status: string;
  reason: string | null;
}

export interface EarningsDailySummary {
  version: 'earnings-daily-path-summary-v1';
  mode: string;
  scope: string;
  point_in_time_verified?: boolean;
  event_n: number;
  qualified_native_n: number;
  historical_direction_consistency_pct: number | null;
  historical_upward_opening_gap_pct: number | null;
  first_opposite_close: ClosingMetricSummary;
  closing_gap_fill: ClosingMetricSummary;
  events: EarningsCohortEvent[];
}

export interface EarningsTickerLean {
  ticker: string;
  total_quarters?: number;
  lean_score?: number | null;
  daily_path_summary_v1?: EarningsDailySummary | null;
}
