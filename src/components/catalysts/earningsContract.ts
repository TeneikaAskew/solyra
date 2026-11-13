import { NA } from '@/lib/format';
import type { ClosingMetric, ClosingMetricState, EarningsDailyPath, EarningsDailySummary,
  EarningsHistoryResponse, EarningsTickerLean } from '@/types/earnings';

function invalid(field: string, expectation: string): never {
  throw new Error(`Invalid earnings response: ${field} ${expectation}`);
}
function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(field, 'must be an object');
  return value as Record<string, unknown>;
}
function string(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) invalid(field, 'must be a nonempty string');
  return value;
}
function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : string(value, field);
}
function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(field, 'must be a finite number');
  return value;
}
function nullableNumber(value: unknown, field: string): number | null {
  return value === null ? null : number(value, field);
}
function count(value: unknown, field: string): number {
  const n = number(value, field);
  if (!Number.isInteger(n) || n < 0) invalid(field, 'must be a nonnegative integer');
  return n;
}
function nullableCount(value: unknown, field: string): number | null {
  return value === null ? null : count(value, field);
}
function nullableBoolean(value: unknown, field: string): boolean | null {
  if (value !== null && typeof value !== 'boolean') invalid(field, 'must be boolean or null');
  return value;
}
function date(value: unknown, field: string): string {
  const s = string(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s)) ||
      new Date(s).toISOString().slice(0, 10) !== s) invalid(field, 'must be an ISO calendar date');
  return s;
}
function clock(value: unknown, field: string): string | null {
  if (value === null) return null;
  const s = string(value, field);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s))) invalid(field, 'must be an aware timestamp');
  return s;
}
function percent(value: unknown, field: string): number | null {
  const n = nullableNumber(value, field);
  if (n !== null && (n < 0 || n > 100)) invalid(field, 'must be a percentage in 0..100 units');
  return n;
}
function ticker(value: unknown, expected: string): void {
  if (string(value, 'ticker') !== expected) invalid('ticker', 'does not match the requested ticker');
}

const metricKeys: ClosingMetric[] = ['first_opposite_close', 'closing_gap_fill'];
function dailyPath(value: unknown, expectedId: string): EarningsDailyPath | null {
  if (value === null || value === undefined) return null; // old additive contract
  const p = record(value, 'daily_path_v1');
  if (p.version !== 'earnings-daily-path-v1') invalid('daily_path_v1.version', 'is unsupported');
  const id = nullableString(p.event_id, 'event_id');
  if (id !== null && id !== expectedId) invalid('event identity', 'does not match the history row');
  if (!['complete', 'maturing', 'not_applicable', 'unavailable'].includes(string(p.status, 'status'))) invalid('status', 'is unsupported');
  for (const k of ['reaction_basis', 'source_mode', 'reason', 'basis_id', 'input_identity']) nullableString(p[k], k);
  for (const k of ['computed_at', 'observation_ts', 'mature_at']) clock(p[k], k);
  for (const k of ['reaction_session', 'pre_gap_close_session', 'window_end_session', 'first_opposite_close_date', 'closing_gap_fill_date']) {
    if (p[k] !== null) date(p[k], k);
  }
  for (const k of ['expected_steps', 'observed_steps', 'first_opposite_close_step', 'closing_gap_fill_step']) nullableCount(p[k], k);
  nullableBoolean(p.censored, 'censored');
  if (p.historical_publication_verified !== undefined && typeof p.historical_publication_verified !== 'boolean') invalid('historical_publication_verified', 'must be boolean');
  const perMetric = record(p.per_metric, 'per_metric');
  for (const key of metricKeys) {
    if (perMetric[key] === undefined) {
      if (p.status !== 'unavailable') invalid(key, 'is missing from the current version');
      continue;
    }
    const m = record(perMetric[key], key);
    if (typeof m.available !== 'boolean') invalid(`${key}.available`, 'must be boolean');
    string(m.status, `${key}.status`);
    nullableBoolean(m.censored, `${key}.censored`);
    if (m.mature_at !== undefined) clock(m.mature_at, `${key}.mature_at`);
    if (m.reason !== undefined) nullableString(m.reason, `${key}.reason`);
    if (p.status !== 'unavailable') {
      if (!['observed', 'right_censored', 'not_yet_mature', 'not_applicable'].includes(m.status as string)) invalid(key, 'has an unsupported status');
      if (m.status === 'observed' && (m.available !== true || m.censored !== false || p[`${key}_step`] === null || p[`${key}_date`] === null)) invalid(key, 'has inconsistent observed fields');
      if (m.status === 'right_censored' && (m.available !== true || m.censored !== true || p[`${key}_step`] !== null)) invalid(key, 'has inconsistent censoring fields');
    }
  }
  return p as unknown as EarningsDailyPath;
}

export function parseEarningsHistory(value: unknown, requested: string): EarningsHistoryResponse {
  const h = record(value, 'history');
  ticker(h.ticker, requested);
  if (!Array.isArray(h.rows)) invalid('rows', 'must be an array');
  if (count(h.count, 'count') !== h.rows.length || h.rows.length > 20) invalid('count', 'does not match the bounded history');
  const seen = new Set<string>();
  const rows = h.rows.map((value, i) => {
    const r = record(value, `rows[${i}]`);
    ticker(r.ticker, requested);
    const reported = date(r.reported_date, 'reported_date');
    const fiscal = r.fiscal_date_ending === null ? null : date(r.fiscal_date_ending, 'fiscal_date_ending');
    const id = `${requested}:${fiscal}:${reported}`;
    if (seen.has(id)) invalid('event identity', 'is duplicated');
    seen.add(id);
    nullableNumber(r.reaction_gap_pct, 'reaction_gap_pct');
    nullableNumber(r.sustain_5d_pct, 'sustain_5d_pct');
    nullableBoolean(r.is_reversal_5d, 'is_reversal_5d');
    if (r.reaction_basis !== undefined) nullableString(r.reaction_basis, 'reaction_basis');
    return { ...r, daily_path_v1: dailyPath(r.daily_path_v1, id) } as unknown as EarningsHistoryResponse['rows'][number];
  });
  return { ticker: requested, rows, count: h.count as number };
}

function summary(value: unknown, requested: string): EarningsDailySummary | null {
  if (value === null || value === undefined) return null;
  const s = record(value, 'daily_path_summary_v1');
  if (s.version !== 'earnings-daily-path-summary-v1') invalid('summary.version', 'is unsupported');
  string(s.mode, 'summary.mode'); string(s.scope, 'summary.scope');
  if (s.point_in_time_verified !== undefined && typeof s.point_in_time_verified !== 'boolean') invalid('point_in_time_verified', 'must be boolean');
  const eventN = count(s.event_n, 'event_n');
  if (eventN > 12 || count(s.qualified_native_n, 'qualified_native_n') > eventN) invalid('qualified_native_n', 'exceeds the declared cohort');
  percent(s.historical_direction_consistency_pct, 'historical_direction_consistency_pct');
  percent(s.historical_upward_opening_gap_pct, 'historical_upward_opening_gap_pct');
  if (s.qualified_native_n === 0 && (s.historical_direction_consistency_pct !== null || s.historical_upward_opening_gap_pct !== null)) invalid('native percentage denominator', 'is zero');
  if (!Array.isArray(s.events) || s.events.length !== eventN) invalid('summary.events', 'must identify the declared cohort');
  const ids = new Set<string>();
  for (const value of s.events) {
    const e = record(value, 'summary.events');
    const id = string(e.event_id, 'summary.event_id');
    if (!id.startsWith(`${requested}:`) || ids.has(id)) invalid('summary event identity', 'is foreign or duplicated');
    ids.add(id); date(e.reported_date, 'summary.reported_date');
    if (e.fiscal_date_ending !== null) date(e.fiscal_date_ending, 'summary.fiscal_date_ending');
    string(e.status, 'summary.event.status'); nullableString(e.reason, 'summary.event.reason');
  }
  for (const key of metricKeys) {
    const m = record(s[key], key);
    for (const c of ['eligible_n', 'observed_n', 'right_censored_n', 'unavailable_n', 'not_applicable_n']) {
      if (count(m[c], `${key}.${c}`) > eventN) invalid(`${key}.${c}`, 'exceeds its cohort');
    }
    percent(m.observed_rate_pct, `${key}.observed_rate_pct`);
    if ((m.observed_n as number) + (m.right_censored_n as number) > (m.eligible_n as number)) invalid(key, 'observed/censored counts exceed eligible events');
    if ((m.eligible_n as number) + (m.unavailable_n as number) + (m.not_applicable_n as number) !== eventN) invalid(key, 'coverage counts do not reconcile with its cohort');
    if (m.eligible_n === 0 && m.observed_rate_pct !== null) invalid(key, 'percentage denominator is zero');
    const median = nullableNumber(m.median_first_observed_step, `${key}.median_first_observed_step`);
    if (median !== null && median < 0) invalid(key, 'has a negative step');
  }
  return s as unknown as EarningsDailySummary;
}

export function parseEarningsLean(value: unknown, requested: string): EarningsTickerLean {
  const r = record(value, 'ticker lean'); ticker(r.ticker, requested);
  if (r.total_quarters !== undefined) count(r.total_quarters, 'total_quarters');
  if (r.lean_score !== undefined) nullableNumber(r.lean_score, 'lean_score');
  return { ...r, ticker: requested, daily_path_summary_v1: summary(r.daily_path_summary_v1, requested) } as EarningsTickerLean;
}

/** Display only: values already have percentage-point units. */
export function historicalPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}%` : NA;
}

export function closingMetricText(path: EarningsDailyPath | null | undefined, key: ClosingMetric): string {
  if (!path) return 'Unavailable — no qualified daily path';
  if (path.status === 'unavailable') return `Unavailable — ${path.reason ?? 'qualification not supplied'}`;
  const metric: ClosingMetricState | undefined = path.per_metric[key];
  if (!metric) return 'Unavailable — metric not supplied';
  if (metric.status === 'observed' && metric.available) return `Closing step ${path[`${key}_step`]} · ${path[`${key}_date`]}`;
  if (metric.status === 'right_censored' && metric.available) return `Not observed by ${path.window_end_session ?? 'native endpoint'}`;
  if (metric.status === 'not_applicable') return `Not applicable — ${metric.reason ?? path.reason ?? 'no gap direction'}`;
  return `Unavailable — ${metric.reason ?? 'window not mature'}`;
}
