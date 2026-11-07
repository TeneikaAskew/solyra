import { isoToEtDisplay, isoToEtZoned } from '@/lib/time';
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
