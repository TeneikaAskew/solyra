import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDaysToISO, snapshotAgeLabel, todayET, toETDateString } from './dates';

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
  it('renders the server date and age', () => {
    expect(snapshotAgeLabel('2026-06-13', 85)).toBe('as of Jun 13, 2026 (85d old)');
    expect(snapshotAgeLabel('2026-09-06', 0)).toBe('as of Sep 6, 2026 (today)');
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
