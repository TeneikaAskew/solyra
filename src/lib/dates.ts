/** Market-calendar date helpers. The market lives in America/New_York;
 * `new Date().toISOString().slice(0,10)` is UTC and is WRONG for 4 hours
 * every evening (5 in winter). Always derive "today" through these. */
const ET_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD for an arbitrary instant, in Eastern Time. */
export function toETDateString(d: Date): string {
  return ET_FMT.format(d); // en-CA locale yields YYYY-MM-DD
}

/** Eastern wall clock for a datetime-local control or market-data boundary.
 * Keep the original absolute timestamp in state; this is a display/API view. */
export function toETDateTimeString(d: Date): string {
  const time = d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York', hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
  });
  return `${toETDateString(d)}T${time}`;
}

/** Present an absolute saved cutoff without changing its transport value. */
export function replayCutoffInputValue(cutoff: string): string {
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(cutoff)) return cutoff;
  const instant = new Date(cutoff);
  return Number.isFinite(instant.getTime()) ? toETDateTimeString(instant) : cutoff;
}

export interface ReplayBoundary { iso: string | null; error: string | null }

/** A market wall clock is not a browser-local Date. Resolve it against the
 * exchange timezone, refusing DST gaps/folds instead of guessing an instant.
 * Explicitly zoned saved timestamps already identify an instant: retain them. */
export function resolveReplayBoundary(cutoff: string): ReplayBoundary {
  if (!cutoff) return { iso: null, error: null };
  const invalid = { iso: null, error: 'Enter a valid Eastern date and time.' };
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(cutoff);
  if (!match) return invalid;
  const [, year, month, day, hour, minute, second = '0', fraction = '', zone] = match;
  const fields = [Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second)];
  const wall = new Date(0);
  wall.setUTCFullYear(fields[0], fields[1] - 1, fields[2]);
  wall.setUTCHours(fields[3], fields[4], fields[5], Number(fraction.padEnd(3, '0')));
  if ([wall.getUTCFullYear(), wall.getUTCMonth() + 1, wall.getUTCDate(), wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds()].some((value, i) => value !== fields[i])) return invalid;
  if (zone) return Number.isFinite(Date.parse(cutoff)) ? { iso: cutoff, error: null } : invalid;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const asWallMillis = (instant: number) => {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (name: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === name)!.value);
    const date = new Date(0);
    date.setUTCFullYear(value('year'), value('month') - 1, value('day'));
    date.setUTCHours(value('hour'), value('minute'), value('second'), 0);
    return date.getTime();
  };
  const wallMillis = wall.getTime();
  const wholeSecond = Math.floor(wallMillis / 1000) * 1000;
  // Sample both sides of a possible offset transition. Candidate instants
  // must roundtrip to the exact requested wall clock, including seconds.
  const offsets = new Set([-1, 0, 1].map(days => {
    const sample = wholeSecond + days * 86_400_000;
    return asWallMillis(sample) - sample;
  }));
  const candidates = [...offsets].map(offset => wallMillis - offset)
    .filter(instant => asWallMillis(instant) === wholeSecond);
  if (candidates.length === 0) return { iso: null, error: 'This Eastern time does not exist because clocks move forward. Choose another time.' };
  if (candidates.length !== 1) return { iso: null, error: 'This Eastern time is ambiguous because clocks move back. Choose an unambiguous time.' };
  return { iso: new Date(candidates[0]).toISOString(), error: null };
}

/** Today's date (YYYY-MM-DD) on the US market calendar. */
export function todayET(): string {
  return toETDateString(new Date());
}

/** Add days to a YYYY-MM-DD string with UTC-anchored arithmetic — immune to
 * the browser's timezone (local-midnight round-trips shift a day east of UTC). */
export function addDaysToISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * "as of Jun 13, 2026 (85d old)" for a dated server snapshot such as the
 * playbook card set (`/api/playbook` returns `analysis_date` + `age_days`).
 * Zero age reads "same day", never "today": in review mode the server judges
 * the age against the reviewed date, and a June set reviewed in September is
 * the same day as June 13, not today.
 * Returns null when the server sent no date: the label is then omitted
 * rather than fabricated (CLAUDE.md Rule 4). `ageDays` comes from the
 * server so the client never re-derives freshness against its own clock.
 */
export function snapshotAgeLabel(
  analysisDate: string | null | undefined,
  ageDays: number | null | undefined,
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(analysisDate ?? '');
  if (!m) return null;
  const pretty = new Date(`${analysisDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (ageDays === null || ageDays === undefined || !Number.isFinite(ageDays)) {
    return `as of ${pretty}`;
  }
  // ageDays is judged by the server against the reviewed date in review
  // mode, so a zero age means "same day as the date shown", not "today".
  const age = ageDays === 0 ? 'same day' : ageDays === 1 ? '1d old' : `${ageDays}d old`;
  return `as of ${pretty} (${age})`;
}
