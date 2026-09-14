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
