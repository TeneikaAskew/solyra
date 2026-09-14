// Unit tests for TrinityTab's spot-row selection (issue #32: the guard was
// correct but unpinned). nearestStrike is the pure extraction of the inline
// reduce that tags the ladder row nearest spot.
import { describe, expect, it } from 'vitest';
import { nearestStrike } from './TrinityTab';

const ladder = [{ strike: 225 }, { strike: 220 }, { strike: 215 }]; // high → low

describe('nearestStrike', () => {
  it('picks the strike nearest spot', () => {
    expect(nearestStrike(ladder, 218)).toBe(220); // |220-218|=2 beats |215-218|=3
    expect(nearestStrike(ladder, 216)).toBe(215);
    expect(nearestStrike(ladder, 300)).toBe(225);
  });

  it('resolves an exact midpoint tie to the higher strike (first in the sorted ladder)', () => {
    expect(nearestStrike(ladder, 217.5)).toBe(220);
  });

  it('returns undefined when spot is missing — no row may be falsely tagged as spot', () => {
    expect(nearestStrike(ladder, null)).toBeUndefined();
    expect(nearestStrike(ladder, undefined)).toBeUndefined();
  });

  it('returns undefined for the endpoint\'s "no usable spot" signal (price 0, method none)', () => {
    expect(nearestStrike(ladder, 0)).toBeUndefined();
    expect(nearestStrike(ladder, -1)).toBeUndefined();
  });

  it('returns undefined for an empty ladder', () => {
    expect(nearestStrike([], 220)).toBeUndefined();
  });
});
