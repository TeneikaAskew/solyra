import { describe, expect, it } from 'vitest';
import { selectEvidence, validSourceDate } from './evidenceLabels';
import { toETDateString } from '@/lib/dates';
const rows = [
  { date: '2026-10-25', source: 'AV news', title: 'old' },
  { date: '2026-10-27', source: 'calendar', title: 'today' },
  { date: '2026-10-28', source: 'calendar', title: 'next' },
  { date: '2026-10-26', source: 'AV news', title: 'newer' },
  { date: '2026-02-30', source: 'AV news', title: 'invalid' },
  { source: 'AV news', title: 'missing' },
];
describe('date-only dashboard evidence selection', () => {
  it('excludes past rows from forward list, keeps newest-first news separate and visible unknowns', () => {
    const result = selectEvidence(rows, '2026-10-27');
    expect(result.forward.map(r => r.title)).toEqual(['today', 'next']);
    expect(result.news.map(r => r.title)).toEqual(['newer', 'old', 'invalid', 'missing']);
    expect(result.newestNewsDate).toBe('2026-10-26');
    expect(result.unknownDateCount).toBe(2); expect(result.unknownNewsCount).toBe(2);
  });
  it('is inclusive through seven calendar days and stable for same dates', () => {
    const data = ['2026-11-04', '2026-11-03', '2026-10-27', '2026-11-03'].map((date, n) => ({ date, n }));
    expect(selectEvidence(data, '2026-10-27').forward.map(r => r.n)).toEqual([2, 1, 3]);
  });
  it.each(['', '2026-02-29', '2026-10-27T12:00:00Z', 'x', '2026-13-01'])('does not invent date for %s', date => {
    expect(validSourceDate(date)).toBe(false);
    expect(selectEvidence([{ date }], '2026-10-27').unknownDateCount).toBe(1);
  });
  it('accepts real leap days and explicit selected review dates', () => {
    expect(validSourceDate('2024-02-29')).toBe(true);
    expect(selectEvidence(rows, '2026-10-25').forward.map(r => r.title)).toEqual(['old', 'newer', 'today', 'next']);
  });
  it('uses existing ET date convention at midnight and DST', () => {
    expect(toETDateString(new Date('2026-11-02T04:59:59Z'))).toBe('2026-11-01');
    expect(toETDateString(new Date('2026-11-02T05:00:00Z'))).toBe('2026-11-02');
  });
  it('empty supplied rows remain explicit zero matching rows with no invented source date', () => {
    expect(selectEvidence([], '2026-10-27')).toMatchObject({ forward: [], news: [], newestNewsDate: null, unknownDateCount: 0 });
  });
});
