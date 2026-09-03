import { describe, it, expect } from 'vitest';
import { isoToEtDisplay } from './time';

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
