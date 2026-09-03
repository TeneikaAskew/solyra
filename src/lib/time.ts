/** Convert "HH:MM:SS" (24h) to "H:MM:SS AM/PM" (12h). */
export function to12h(hms: string | null | undefined): string {
  if (!hms) return '';
  const parts = hms.split(':');
  if (parts.length < 2) return hms;
  const h = Number(parts[0]);
  const m = parts[1];
  const s = parts[2];
  if (Number.isNaN(h)) return hms;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return s ? `${h12}:${m}:${s} ${period}` : `${h12}:${m} ${period}`;
}

/** Render an ISO timestamp in ET ("YYYY-MM-DD HH:MM ET") for display beside
 *  the app's other ET times. Only timestamps carrying explicit zone info
 *  (trailing Z or ±hh[:]mm) are converted — a naive string would be
 *  misparsed as viewer-local time, so it falls back to date-only rather
 *  than guessing (Rule 4: no fabricated wall-clock). */
export function isoToEtDisplay(iso: string): string {
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(iso)) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const date = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const time = d.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/New_York',
      });
      return `${date} ${time} ET`;
    }
  }
  return iso.slice(0, 10);
}
