import { describe, it, expect } from 'vitest';
import { isoToEtDisplay, isoToEtZoned } from './time';

describe('isoToEtDisplay', () => {
  it('converts an offset-bearing UTC timestamp to ET and labels it', () => {
    // 20:00 UTC on a summer date = 16:00 ET (EDT) — the exact fixture shape
    // /api/options returns for alphavantage_live snapshots.
    expect(isoToEtDisplay('2026-04-25T20:00:00+00:00')).toBe('2026-04-25 16:00 ET');
  });
  it('handles a Z suffix', () => {
    expect(isoToEtDisplay('2026-01-15T21:00:00Z')).toBe('2026-01-15 16:00 ET'); // EST
  });
  it('crosses the date line correctly', () => {
    expect(isoToEtDisplay('2026-04-26T01:30:00Z')).toBe('2026-04-25 21:30 ET');
  });
  it('falls back to date-only for a naive timestamp instead of guessing a zone', () => {
    expect(isoToEtDisplay('2026-04-25T20:00:00')).toBe('2026-04-25');
    expect(isoToEtDisplay('2026-04-25')).toBe('2026-04-25');
  });
});

describe('isoToEtZoned', () => {
  it('names EST in winter and EDT in summer', () => {
    expect(isoToEtZoned('2026-01-15T21:00:00Z')).toBe('2026-01-15 16:00 EST');
    expect(isoToEtZoned('2026-07-15T20:00:00+00:00')).toBe('2026-07-15 16:00 EDT');
  });
  it('renders midnight Eastern as 00:00 on the Eastern date', () => {
    expect(isoToEtZoned('2026-11-07T05:00:00Z')).toBe('2026-11-07 00:00 EST');
    expect(isoToEtZoned('2026-07-16T04:00:00Z')).toBe('2026-07-16 00:00 EDT');
  });
  it('follows both 2026 DST changes', () => {
    // Spring forward: 2026-03-08 02:00 EST becomes 03:00 EDT.
    expect(isoToEtZoned('2026-03-08T06:59:00Z')).toBe('2026-03-08 01:59 EST');
    expect(isoToEtZoned('2026-03-08T07:00:00Z')).toBe('2026-03-08 03:00 EDT');
    // Fall back: 2026-11-01 02:00 EDT becomes 01:00 EST.
    expect(isoToEtZoned('2026-11-01T05:59:00Z')).toBe('2026-11-01 01:59 EDT');
    expect(isoToEtZoned('2026-11-01T06:00:00Z')).toBe('2026-11-01 01:00 EST');
  });
  it('accepts the microsecond offsets Python isoformat emits', () => {
    expect(isoToEtZoned('2026-11-06T21:05:00.123456+00:00')).toBe('2026-11-06 16:05 EST');
  });
  it.each([null, undefined, '', 'bad', '2026-11-06T21:05:00', '2026-11-06', 'not-a-dateZ', 1762463100])(
    'returns null for %s rather than guessing a clock',
    (v) => expect(isoToEtZoned(v)).toBeNull(),
  );
});
