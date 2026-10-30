import { describe, expect, it } from 'vitest';
import { replayCutoffInputValue } from './AiInsightsLovablePage';

describe('saved cutoff input presentation', () => {
  it.each(['not-a-dateZ', '2026-99-99T15:30:00+02:00'])('retains malformed evidence %s without throwing or inventing a valid cutoff', (value) => {
    expect(replayCutoffInputValue(value)).toBe(value);
  });
  it('keeps a timezone-less market input unchanged', () => {
    expect(replayCutoffInputValue('2026-10-09T11:30')).toBe('2026-10-09T11:30');
    expect(replayCutoffInputValue('')).toBe('');
  });
  it('presents an absolute saved instant once in Eastern time', () => {
    expect(replayCutoffInputValue('2026-10-10T03:30:45+02:00')).toBe('2026-10-09T21:30');
  });
});
