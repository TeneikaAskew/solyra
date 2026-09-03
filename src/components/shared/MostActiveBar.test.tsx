import { describe, expect, it } from 'vitest';
import { hasUsableSpark, sparklinePoints, isBullishSpark } from './MostActiveBar';

describe('hasUsableSpark', () => {
  it('rejects missing, short, and constant series (would render a flat line)', () => {
    expect(hasUsableSpark(undefined)).toBe(false);
    expect(hasUsableSpark([])).toBe(false);
    expect(hasUsableSpark([10.39])).toBe(false);
    expect(hasUsableSpark([10.39, 10.39, 10.39])).toBe(false);
  });

  it('rejects series without at least two finite points', () => {
    expect(hasUsableSpark([NaN, NaN])).toBe(false);
    expect(hasUsableSpark([10, NaN])).toBe(false);
  });

  it('accepts a series with real variation', () => {
    expect(hasUsableSpark([10.2, 10.39, 10.1])).toBe(true);
  });
});

describe('sparklinePoints', () => {
  it('maps min to bottom and max to top', () => {
    const pts = sparklinePoints([1, 2], 10, 20);
    expect(pts[0]).toEqual([0, 20]);
    expect(pts[1]).toEqual([10, 0]);
  });
});

describe('isBullishSpark', () => {
  it('compares first vs last', () => {
    expect(isBullishSpark([1, 2])).toBe(true);
    expect(isBullishSpark([2, 1])).toBe(false);
  });
});
