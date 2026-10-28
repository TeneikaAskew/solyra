import { addDaysToISO } from '@/lib/dates';

interface DatedEvidence { date?: string | null; source?: string }
/** Valid supplied calendar date, never a publication instant or ingestion receipt. */
export function validSourceDate(date: unknown): date is string {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

export function selectEvidence<T extends DatedEvidence>(rows: readonly T[], referenceDate: string) {
  if (!validSourceDate(referenceDate)) throw new Error('Invalid dashboard reference date');
  const until = addDaysToISO(referenceDate, 7);
  const indexed = rows.map((row, order) => ({ row, order, date: validSourceDate(row.date) ? row.date : null }));
  const dated = indexed.filter(item => item.date !== null);
  const forward = dated.filter(item => item.date! >= referenceDate && item.date! <= until)
    .sort((a, b) => a.date!.localeCompare(b.date!) || a.order - b.order).slice(0, 5).map(item => item.row);
  const allNews = indexed.filter(item => item.row.source === 'AV news');
  const news = [...allNews].sort((a, b) => {
    if (a.date === null) return b.date === null ? a.order - b.order : 1;
    if (b.date === null) return -1;
    return b.date.localeCompare(a.date) || a.order - b.order;
  }).slice(0, 4).map(item => item.row);
  const newestNewsDate = allNews.map(item => item.date).filter((date): date is string => date !== null).sort().at(-1) ?? null;
  return { forward, news, newestNewsDate, unknownDateCount: indexed.length - dated.length,
    unknownNewsCount: allNews.filter(item => item.date === null).length };
}
