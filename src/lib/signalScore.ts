import type { components } from '@/types/stocksOpenApi.gen';

type Explanation = components['schemas']['HistoricalScoreExplanation'];
type Provenance = components['schemas']['ScoreProvenance'];
type RecordedExplanation = Explanation & {
  [K in 'base_count' | 'base_max' | 'matched_conditions' | 'bonuses' | 'bonus_total' | 'composite_strength']: NonNullable<Explanation[K]>
};
export type SignalScoreInput = {
  score?: unknown;
  conditions_met?: unknown;
  score_explanation?: unknown;
  time?: unknown;
  strategy?: unknown;
  direction?: unknown;
  run_kind?: unknown;
  inserted_at?: unknown;
};

const unavailable = 'Unavailable';
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const integer = (v: unknown): v is number => finite(v) && Number.isSafeInteger(v) && v >= 0;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const hash = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const timestamp = (v: unknown) => text(v) && /(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));

export interface SignalScorePresentation {
  status: 'recorded' | 'unavailable';
  strength: string;
  base: string | null;
  composite: string | null;
  bonuses: Explanation['bonuses'];
  bonusTotal: string | null;
  matchedConditions: string[];
  reasons: string[];
  rawConditions: string | null;
  eventTime: string;
  provenance: Record<keyof Provenance, string>;
}

/** Presentation validation only: compare recorded components, never evaluate
 * market conditions, infer a strategy maximum, or manufacture missing values. */
function isRecorded(value: Record<string, unknown>, row: SignalScoreInput): value is Record<string, unknown> & RecordedExplanation {
  const p = value.provenance;
  if (!object(p) || p.corpus !== 'historical_signals' ||
      !text(p.strategy) || !text(p.producer_definition) || !text(p.profile) ||
      !['call', 'put'].includes(String(p.direction)) ||
      !hash(p.code_sha256) || !hash(p.config_sha256) || !hash(p.input_sha256) ||
      !timestamp(p.generated_at) ||
      !(p.inserted_at === null || timestamp(p.inserted_at)) ||
      ![null, 'cloud_sql', 'gcs_parquet'].includes(p.storage_source as string | null) ||
      ![null, 'live', 'replay', 'backfill'].includes(p.run_kind as string | null)) return false;
  if ((row.strategy != null && row.strategy !== p.strategy) ||
      (row.direction != null && (!text(row.direction) || row.direction.toLowerCase() !== p.direction)) ||
      (row.run_kind != null && row.run_kind !== p.run_kind)) return false;
  if (!['condition_count', 'base_plus_bonus'].includes(String(value.kind)) ||
      !integer(value.base_count) || !integer(value.base_max) || value.base_max === 0 || value.base_count > value.base_max ||
      !strings(value.matched_conditions) || value.matched_conditions.length !== value.base_count ||
      new Set(value.matched_conditions).size !== value.matched_conditions.length ||
      !Array.isArray(value.bonuses) ||
      !value.bonuses.every(b => object(b) && text(b.name) && integer(b.value)) ||
      new Set(value.bonuses.map(b => b.name)).size !== value.bonuses.length ||
      !integer(value.bonus_total) || !integer(value.composite_strength) ||
      !(value.composite_max === null || (integer(value.composite_max) && value.composite_max >= value.composite_strength && value.composite_max >= value.base_max)) ||
      !strings(value.unavailable_reasons) || value.unavailable_reasons.length !== 0 ||
      !finite(row.score) || row.score !== value.composite_strength) return false;
  // These checks refuse contradictory transport fields; the displayed totals
  // below always come from the response, never from these sums.
  if (value.bonuses.reduce((sum, b) => sum + b.value, 0) !== value.bonus_total ||
      value.base_count + value.bonus_total !== value.composite_strength ||
      (value.kind === 'condition_count' && (value.bonuses.length !== 0 || value.bonus_total !== 0))) return false;
  return true;
}

export function presentSignalScore(row: SignalScoreInput): SignalScorePresentation {
  const e = object(row.score_explanation) ? row.score_explanation : null;
  const p = e && object(e.provenance) ? e.provenance : {};
  const display = (value: unknown) => text(value) ? value : unavailable;
  const view: SignalScorePresentation = {
    status: 'unavailable', strength: finite(row.score) ? String(row.score) : unavailable,
    base: null, composite: null, bonuses: null, bonusTotal: null, matchedConditions: [], reasons: [],
    rawConditions: typeof row.conditions_met === 'string' ? row.conditions_met : null,
    eventTime: display(row.time),
    provenance: {
      corpus: 'historical_signals', strategy: display(p.strategy ?? row.strategy),
      profile: display(p.profile), run_kind: display(p.run_kind ?? row.run_kind),
      storage_source: display(p.storage_source), producer_definition: display(p.producer_definition),
      direction: display(p.direction), code_sha256: hash(p.code_sha256) ? String(p.code_sha256) : unavailable,
      config_sha256: hash(p.config_sha256) ? String(p.config_sha256) : unavailable,
      input_sha256: hash(p.input_sha256) ? String(p.input_sha256) : unavailable,
      generated_at: timestamp(p.generated_at) ? String(p.generated_at) : unavailable,
      inserted_at: timestamp(p.inserted_at ?? row.inserted_at) ? String(p.inserted_at ?? row.inserted_at) : unavailable,
    },
  };
  if (!e) view.reasons = ['Score explanation missing'];
  else if (e.version !== 'historical-score-v1') view.reasons = ['Unsupported score explanation version'];
  else if (e.status === 'legacy_unavailable' || e.status === 'invalid_record') {
    view.reasons = strings(e.unavailable_reasons) && e.unavailable_reasons.length > 0
      ? e.unavailable_reasons : ['Score breakdown unavailable'];
  } else if (e.status !== 'recorded' || !isRecorded(e, row)) {
    view.reasons = ['Malformed or inconsistent score explanation'];
  } else {
    view.status = 'recorded';
    view.base = `${e.base_count}/${e.base_max}`;
    view.composite = e.composite_max === null ? String(e.composite_strength) : `${e.composite_strength}/${e.composite_max}`;
    view.bonuses = e.bonuses;
    view.bonusTotal = String(e.bonus_total);
    view.matchedConditions = e.matched_conditions;
  }
  return view;
}
