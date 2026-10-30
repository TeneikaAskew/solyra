import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDaysToISO, snapshotAgeLabel, todayET, toETDateString, toETDateTimeString, resolveReplayBoundary } from './dates';

afterEach(() => vi.useRealTimers());

describe('todayET', () => {
  it('is still "today" in ET when UTC has rolled past midnight', () => {
    // 2026-07-08T02:30:00Z == 2026-07-07 22:30 ET
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T02:30:00Z'));
    expect(todayET()).toBe('2026-07-07');
  });
  it('matches UTC date during the overlapping hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-07T15:00:00Z'));
    expect(todayET()).toBe('2026-07-07');
  });
});

describe('toETDateString', () => {
  it('formats an arbitrary Date in ET', () => {
    expect(toETDateString(new Date('2026-01-01T03:00:00Z'))).toBe('2025-12-31');
  });
});

describe('addDaysToISO', () => {
  it('adds days without timezone drift', () => {
    expect(addDaysToISO('2026-07-07', 1)).toBe('2026-07-08');
    expect(addDaysToISO('2026-07-07', -3)).toBe('2026-07-04');
    expect(addDaysToISO('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('snapshotAgeLabel', () => {
  it('keeps October 27 as the market day at 02:20Z and preserves the server age', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-28T02:20:00Z'));
    expect(todayET()).toBe('2026-10-27');
    expect(snapshotAgeLabel('2026-10-27', 0)).toBe('as of Oct 27, 2026 (same day)');
    // The client must not hide a server-side age error by overriding its value.
    expect(snapshotAgeLabel('2026-10-27', 1)).toBe('as of Oct 27, 2026 (1d old)');
  });

  it('renders the server date and age', () => {
    expect(snapshotAgeLabel('2026-06-13', 85)).toBe('as of Jun 13, 2026 (85d old)');
    // Zero age is relative to the date shown (review mode judges against
    // the reviewed date), so it must not claim "today".
    expect(snapshotAgeLabel('2026-09-06', 0)).toBe('as of Sep 6, 2026 (same day)');
    expect(snapshotAgeLabel('2026-09-05', 1)).toBe('as of Sep 5, 2026 (1d old)');
  });

  it('omits the age when the server did not send one, never fabricating it', () => {
    expect(snapshotAgeLabel('2026-06-13', null)).toBe('as of Jun 13, 2026');
    expect(snapshotAgeLabel('2026-06-13', undefined)).toBe('as of Jun 13, 2026');
  });

  it('returns null without a valid date so callers render nothing rather than a guess', () => {
    expect(snapshotAgeLabel(null, 3)).toBeNull();
    expect(snapshotAgeLabel('', 3)).toBeNull();
    expect(snapshotAgeLabel('13/06/2026', 3)).toBeNull();
  });
});


describe('toETDateTimeString', () => {
  it.each([
    ['2026-10-09T15:30:45Z', '2026-10-09T11:30'],
    ['2026-01-09T15:30:45Z', '2026-01-09T10:30'],
    ['2026-10-10T03:30:45+02:00', '2026-10-09T21:30'],
    ['2026-03-08T06:30:00Z', '2026-03-08T01:30'],
    ['2026-03-08T07:30:00Z', '2026-03-08T03:30'],
    ['2026-11-01T05:30:00Z', '2026-11-01T01:30'],
    ['2026-11-01T06:30:00Z', '2026-11-01T01:30'],
    ['2026-10-09T04:00:00Z', '2026-10-09T00:00'],
  ])('formats %s as %s without using the viewer timezone', (instant, expected) => {
    expect(toETDateTimeString(new Date(instant))).toBe(expected);
  });
});

describe('CODE3 market replay transport', () => {
  it.each([
    ['2026-10-09T11:30', '2026-10-09T15:30:00.000Z'],
    ['2026-01-09T11:30', '2026-01-09T16:30:00.000Z'],
    ['2026-10-09T23:30', '2026-10-10T03:30:00.000Z'],
    ['2026-03-08T01:59:59.123', '2026-03-08T06:59:59.123Z'],
    ['2026-03-08T03:00', '2026-03-08T07:00:00.000Z'],
    ['2025-11-02T00:30', '2025-11-02T04:30:00.000Z'],
    ['2025-11-02T02:30', '2025-11-02T07:30:00.000Z'],
  ])('resolves Eastern %s to %s', (wall, iso) => {
    expect(resolveReplayBoundary(wall)).toEqual({ iso, error: null });
  });
  it.each(['2025-11-02T01:30:00-04:00', '2025-11-02T01:30:00-05:00', '2026-10-10T03:30:45+02:00', '2026-10-09T15:30:45.123Z'])('retains the explicit saved instant %s exactly', iso => {
    expect(resolveReplayBoundary(iso)).toEqual({ iso, error: null });
  });
  it.each([['2026-03-08T02:30', 'does not exist'], ['2025-11-02T01:30', 'ambiguous']])('refuses %s instead of guessing', (wall, reason) => {
    expect(resolveReplayBoundary(wall).iso).toBeNull();
    expect(resolveReplayBoundary(wall).error).toContain(reason);
  });
  it.each(['not-a-dateZ', '2026-02-30T11:30', '2026-13-01T00:00', '2026-10-09T25:00', '2026-10-09T12:61', '2026-10-09T11:30:00+25:00'])('rejects invalid cutoff %s', cutoff => {
    expect(resolveReplayBoundary(cutoff)).toEqual({ iso: null, error: 'Enter a valid Eastern date and time.' });
  });
});
