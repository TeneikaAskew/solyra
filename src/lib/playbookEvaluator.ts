import type { Bar, Indicators } from './indicators';
import type { components } from '@/types/stocksOpenApi.gen';
import { resolveReplayBoundary, toETDateString, toETDateTimeString } from './dates';
export const OPENING_MAX_AGE_MS = 120_000;
export type OpeningProjection = components['schemas']['OpeningProjection'];

// ---------------------------------------------------------------------------
// This file used to host a regex-based condition evaluator. That logic lives
// in platform/api/routers/playbook.py now — the app just builds a snapshot
// and the server evaluates. See usePlaybookEvaluation / usePlaybookBatch in
// platform/src/hooks/usePlaybookEvaluation.ts.
// ---------------------------------------------------------------------------

/**
 * Snapshot of live market state sent to POST /api/playbook/evaluate.
 * Values may be null when the market is closed or history is thin.
 */
export interface MarketSnapshot {
  ticker?: string;
  orbOpening?: OpeningProjection | null;
  price: number | null;
  prevClose: number | null;
  prevHigh: number | null;
  prevLow: number | null;
  volumeToday: number | null;
  avgVolume20d: number | null;
  orbHigh: number | null;
  orbLow: number | null;
  lastBar: Bar | null;
  minutesSinceOpen: number | null;
  stochKPrev: number | null;
  indicators: Indicators;
}

/** PlaybookEvalResult on the wire: `status` is the only guaranteed key —
 *  the schema declares `detail` and `reason` optional-nullable (model_dump
 *  with null defaults fills whichever the evaluator produced). Render
 *  sites treat a missing string as "no explanation", never invent one. */
export interface EvalResult {
  status: 'met' | 'unmet' | 'unknown';
  detail?: string | null;
  reason?: string | null;
}

/** Reuse the calendar-field validator, but require an explicit offset:
 * a provider instant must never be inferred from a naive wall clock. */
function openingInstant(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const resolved = resolveReplayBoundary(value);
  return resolved.iso === null ? null : Date.parse(resolved.iso);
}

/** Qualify transport identity/time, never recompute financial levels. */
export function qualifiedOpening(opening: OpeningProjection | null | undefined, ticker: string, now = Date.now()): OpeningProjection | null {
  if (!Number.isFinite(new Date(now).getTime()) || !opening || opening.status !== 'available' || opening.ticker !== ticker
      || opening.session !== toETDateString(new Date(now)) || opening.window_minutes !== 30
      || opening.price_basis !== 'as_traded_requested' || opening.source !== 'alphavantage') return null;
  const start = openingInstant(opening.window_start);
  const end = openingInstant(opening.window_end);
  const comparison = openingInstant(opening.comparison_as_of);
  if (start === null || end === null || comparison === null) return null;
  if (start % 60_000 !== 0 || end % 60_000 !== 0 || end - start !== 30 * 60_000
      || toETDateTimeString(new Date(start)) !== `${opening.session}T09:30`
      || toETDateTimeString(new Date(end)) !== `${opening.session}T10:00`
      || end > now || comparison < end || comparison > now) return null;
  const age = now - comparison;
  if (age > OPENING_MAX_AGE_MS) return null;
  if (![opening.high, opening.low, opening.comparison_price].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0)) return null;
  if (opening.high! < opening.low!) return null;
  return opening;
}

/** Minutes since 09:30 ET for the latest bar. Null if bars empty or pre-market. */
export function minutesSinceOpen(lastBar: Bar | null): number | null {
  if (!lastBar) return null;
  const m = lastBar.time.match(/\b(\d{2}):(\d{2}):/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const t = h * 60 + min;
  const openMin = 9 * 60 + 30;
  if (t < openMin) return null;
  return t - openMin;
}

/**
 * Assemble a MarketSnapshot from the live data hooks. Pure data-shaping —
 * no math is done here; see usePlaybookEvaluation for condition checks.
 */
export function buildSnapshot(params: {
  bars: Bar[] | undefined;
  ticker?: string;
  opening?: OpeningProjection | null;
  quote: { price?: number | null; volume?: number | null } | undefined;
  avgVolume20d: number | null | undefined;
  reference: { high?: number | null; low?: number | null; close?: number | null } | undefined;
  indicators: Indicators | null | undefined;
}): MarketSnapshot | null {
  const bars = params.bars;
  if (!bars || bars.length === 0) return null;
  if (!params.indicators) return null;

  const lastBar = bars[bars.length - 1];
  const orb = qualifiedOpening(params.opening, params.ticker ?? '');

  return {
    price: params.quote?.price ?? lastBar?.close ?? null,
    prevClose: params.reference?.close ?? null,
    prevHigh: params.reference?.high ?? null,
    prevLow: params.reference?.low ?? null,
    volumeToday: params.quote?.volume ?? null,
    avgVolume20d: params.avgVolume20d ?? null,
    ticker: params.ticker,
    orbOpening: orb,
    orbHigh: orb?.high ?? null,
    orbLow: orb?.low ?? null,
    lastBar: lastBar ?? null,
    minutesSinceOpen: minutesSinceOpen(lastBar ?? null),
    stochKPrev: params.indicators.stochKPrev ?? null,
    indicators: params.indicators,
  };
}
