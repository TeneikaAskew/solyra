import { isoToEtDisplay, isoToEtZoned } from '@/lib/time';
import { formatGex } from '@/lib/formatGex';
/** Presentation only: the backend owns both financial definitions. */
export function gammaPrices(source?: { gamma_balance?: unknown; gamma_flip?: unknown } | null) {
 const finite=(v:unknown)=>typeof v==='number' && Number.isFinite(v)?v:null;
 return {balance:finite(source?.gamma_balance),flip:finite(source?.gamma_flip)};
}
/** Collector batch clock, never a provider-quote or completion clock. */
export function batchSnapshotLabel(value: unknown): string {
 if(typeof value!=='string') return 'time unavailable';
 if(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) && Number.isFinite(Date.parse(value))) return isoToEtDisplay(value);
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value} (time unavailable)`;
 return 'time unavailable';
}

/** The one label for present options snapshot data (stocks FEAT-OPTION-001
 *  snapshot-labels spec, "Design: visible consumer"). Wording is the spec's. */
export const STORED_SNAPSHOT_LABEL = 'Stored options snapshot — freshness and completeness unverified';

export interface StoredSnapshotClock {
  /** Recorded snapshot time, "YYYY-MM-DD HH:MM EST|EDT", or "unavailable". */
  recorded: string;
  /** Server display age with the response time it was measured at, or null. */
  age: string | null;
  /** Origin of the selected rows in plain words, or null when not known. */
  origin: string | null;
  /** Diagnostic note (a recorded time later than the response time), or null. */
  note: string | null;
}

function fmtAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function sessionOrigin(session: unknown): string {
  if (session === 'REALTIME') return 'realtime origin';
  if (session === 'EOD') return 'end-of-day origin';
  return typeof session === 'string' && session ? `${session} origin` : 'origin unknown';
}

/** The route's selection label, for an older payload with no provenance. */
function dataSourceOrigin(source: unknown): string | null {
  if (source === 'realtime') return 'realtime origin';
  if (source === 'eod_fallback') return 'end-of-day origin';
  if (source === 'stale_fallback') return 'end-of-day origin, more than 2 sessions behind';
  return null;
}

/** Presentation only, for PRESENT snapshot data (unavailable, loading and error
 *  states never reach this). With a provenance object, its `snapshot_ts` is the
 *  recorded time and its server-computed age is shown only with its own
 *  `observed_at`, only for `legacy_snapshot_unqualified`. Without one (an older
 *  server or old cached body) the existing aware timestamp is kept, with no age.
 *  Never computes an age from the client clock and never invents a zero. */
export function storedSnapshotClock(
  provenance: unknown,
  legacyTs: unknown,
  dataSource?: unknown,
): StoredSnapshotClock {
  if (provenance && typeof provenance === 'object') {
    const p = provenance as Record<string, unknown>;
    const recorded = isoToEtZoned(p.snapshot_ts);
    const observed = isoToEtZoned(p.observed_at);
    const ageSeconds = p.snapshot_age_seconds;
    const age =
      recorded && observed && p.reason === 'legacy_snapshot_unqualified' &&
      typeof ageSeconds === 'number' && Number.isInteger(ageSeconds) && ageSeconds >= 0
        ? `age ${fmtAge(ageSeconds)} as of ${observed}`
        : null;
    return {
      recorded: recorded ?? 'unavailable',
      age,
      origin: sessionOrigin(p.market_session),
      note: recorded && p.reason === 'timestamp_future'
        ? 'later than the response time, so no age is shown'
        : null,
    };
  }
  return {
    recorded: isoToEtZoned(legacyTs) ?? 'unavailable',
    age: null,
    origin: dataSourceOrigin(dataSource),
    note: null,
  };
}

/** One line of clock detail: "Recorded snapshot time X · origin · age …". */
export function storedSnapshotDetail(clock: StoredSnapshotClock): string {
  return [
    `Recorded snapshot time ${clock.recorded}`,
    clock.note,
    clock.origin,
    clock.age,
  ].filter(Boolean).join(' · ');
}

// ── Unavailable values (stocks PR 1916, FEAT-OPTION-001) ───────────────────
// A one-sided, empty or spotless chain makes the backend return null for the
// exposure totals, the put/call ratio, max pain and the gamma prices. Rule 4:
// null renders as the em-dash (with an unavailable badge beside it, which the
// caller adds), never as a zero, and draws no direction or skew conclusion
// (REQ-UX-001). These helpers format only; the numbers are the backend's.

const EM_DASH = '—';

const finiteNumber = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** The backend's number when it reported one, else null (unavailable). */
export const reportedNumber = finiteNumber;

/** A GEX or VEX total in the Profiles notation (+1.2M, -988K, and +0 for a
 *  reported zero), or the em-dash when the backend reports none. */
export function exposureTotalText(value: unknown): string {
  const v = finiteNumber(value);
  return v == null ? EM_DASH : formatGex(v);
}

/** The sign label of a reported total; undefined (no label) when unavailable. */
export function exposureDirection(value: unknown): { change: 1 | -1; label: 'Positive' | 'Negative' } | undefined {
  const v = finiteNumber(value);
  if (v == null) return undefined;
  return v >= 0 ? { change: 1, label: 'Positive' } : { change: -1, label: 'Negative' };
}

/** The put/call open-interest ratio to two decimals, or the em-dash. */
export function putCallRatioText(value: unknown): string {
  const v = finiteNumber(value);
  return v == null ? EM_DASH : v.toFixed(2);
}

/** The skew label of a reported ratio; undefined (no label) when unavailable. */
export function putCallSkew(value: unknown): { change: 1 | -1; label: 'Bearish skew' | 'Bullish skew' } | undefined {
  const v = finiteNumber(value);
  if (v == null) return undefined;
  return v > 1 ? { change: -1, label: 'Bearish skew' } : { change: 1, label: 'Bullish skew' };
}

/** A backend strike price as dollars, or the em-dash (never a dollar zero
 *  standing in for a missing level). */
export function strikePriceText(value: unknown, digits: number): string {
  const v = finiteNumber(value);
  return v == null ? EM_DASH : `$${v.toFixed(digits)}`;
}

export type PartialChainReason = 'puts_missing' | 'calls_missing';

/** The one-sided reason, if `reason` is one; null for anything else. */
export function asPartialChainReason(reason: unknown): PartialChainReason | null {
  return reason === 'puts_missing' || reason === 'calls_missing' ? reason : null;
}

/** A levels, grid or nodes summary built from a one-sided chain, by the stocks
 *  PR 1916 rule: regime `unknown`, `total_gex` null and a side reason. A
 *  missing snapshot (the unavailable envelope) or an older payload is not. */
export function summaryPartialChain(
  summary?: { regime?: unknown; total_gex?: unknown; reason?: unknown } | null,
): PartialChainReason | null {
  if (!summary || summary.regime !== 'unknown' || summary.total_gex !== null) return null;
  return asPartialChainReason(summary.reason);
}

/** Why the backend says a chain response cannot be aggregated: its `reason`
 *  when `chain_state` is `unavailable`, else the side `sides_present` lacks.
 *  Null when the response says neither (a complete chain, or an older server
 *  that sends neither field). */
export function chainUnavailableReason(
  chain?: { chain_state?: unknown; reason?: unknown; metadata?: unknown } | null,
): string | null {
  if (!chain) return null;
  const meta = chain.metadata;
  const sides = meta && typeof meta === 'object' ? (meta as { sides_present?: unknown }).sides_present : undefined;
  const fromSides = sides === 'calls_only' ? 'puts_missing' : sides === 'puts_only' ? 'calls_missing' : null;
  if (chain.chain_state === 'unavailable') {
    return typeof chain.reason === 'string' && chain.reason.trim() ? chain.reason : fromSides ?? 'chain_unavailable';
  }
  return fromSides;
}

const REASON_TEXT: Record<string, string> = {
  puts_missing: 'the stored chain has no put contracts',
  calls_missing: 'the stored chain has no call contracts',
  empty_chain: 'the chain has no contracts',
  spot_unavailable: 'no spot price is available for this chain',
  chain_unavailable: 'the backend marks this chain unavailable',
};

/** A backend reason in words for the reader. A reason this client does not
 *  know is shown as sent; a missing one says so rather than guessing. */
export function unavailableReasonText(reason: unknown): string {
  if (typeof reason === 'string' && reason.trim()) return REASON_TEXT[reason] ?? reason;
  return 'not reported by the backend';
}
