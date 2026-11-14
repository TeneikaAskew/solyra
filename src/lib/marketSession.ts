export function sessionLabel(session: string | undefined): string {
  const map: Record<string, string> = {
    regular: 'Market Open',
    'pre-market': 'Pre-Market',
    'after-hours': 'After Hours',
    closed: 'Market Closed',
  };
  return session ? (map[session] ?? session) : 'Market Closed';
}

export function sessionColor(session: string | undefined): string {
  if (session === 'regular') return 'bg-green-500';
  if (session === 'pre-market' || session === 'after-hours') return 'bg-amber-500';
  return 'bg-red-500';
}

export function sessionPillClasses(session: string | undefined): { pill: string; dot: string } {
  if (session === 'regular') {
    return { pill: 'bg-green-500/10 text-green-400', dot: 'bg-green-400' };
  }
  if (session === 'pre-market' || session === 'after-hours') {
    return { pill: 'bg-amber-500/10 text-amber-400', dot: 'bg-amber-400' };
  }
  return { pill: 'bg-red-500/10 text-red-400', dot: 'bg-red-400' };
}

// Eastern wall clock of an instant, through the named zone (never a fixed
// offset: EDT is UTC-4, EST is UTC-5).
const ET_WALL = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function etWallParts(instant: Date): { y: number; m: number; d: number; h: number; min: number; s: number } {
  const parts = ET_WALL.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') };
}

/** Milliseconds the Eastern wall clock is ahead of UTC at this instant (negative). */
function etOffsetMs(instant: Date): number {
  const w = etWallParts(instant);
  const wallAsUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s);
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant 00:30 Eastern on the given Eastern calendar day. 00:30 is never
 *  inside a DST transition (those happen at 02:00), so it always exists once. */
function etHalfPastMidnight(y: number, m: number, d: number): Date {
  const wallAsUtc = Date.UTC(y, m - 1, d, 0, 30);
  const guess = wallAsUtc - etOffsetMs(new Date(wallAsUtc));
  return new Date(wallAsUtc - etOffsetMs(new Date(guess)));
}

/**
 * The most recent elapsed 00:30 America/New_York instant at or before `now`:
 * the start of the nightly ingest window. A ticker added after it has not had
 * a fetch run over it yet.
 */
export function lastIngestWindowStart(now: Date): Date {
  const { y, m, d } = etWallParts(now);
  const today = etHalfPastMidnight(y, m, d);
  if (today.getTime() <= now.getTime()) return today;
  // Date.UTC normalises day 0 to the last day of the previous month.
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return etHalfPastMidnight(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
}
