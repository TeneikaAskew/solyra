/**
 * Pins the exit marker's Rule-4 contract: a closed trade whose P&L is
 * unavailable renders the em-dash placeholder in a neutral color, never a
 * green `Exit +$0.00`. The marker spec is a pure helper (same pattern as
 * `deltaText` in primitives) so this can be asserted without mounting the
 * chart.
 */
import { describe, expect, it } from 'vitest';
import { NA } from '@/lib/format';
import {
  EXAMPLE_MARKER_COLOR,
  UNAVAILABLE_MARKER_COLOR,
  exitMarkerSpec,
} from './TradeMarkingChart';

describe('exitMarkerSpec', () => {
  it('renders an unavailable P&L as the em-dash in a neutral color, not +$0.00', () => {
    const spec = exitMarkerSpec(undefined, false);
    expect(spec.text).toBe(`Exit ${NA}`);
    expect(spec.text).not.toContain('$0.00');
    expect(spec.color).toBe(UNAVAILABLE_MARKER_COLOR);
    expect(spec.color).not.toBe('#089981');
  });

  it('keeps the signed dollar label and bull/bear color for a real P&L', () => {
    expect(exitMarkerSpec(12.5, false)).toEqual({
      position: 'aboveBar',
      color: '#089981',
      text: 'Exit +$12.50',
    });
    expect(exitMarkerSpec(-3, false)).toEqual({
      position: 'belowBar',
      color: '#f23645',
      text: 'Exit -$3.00',
    });
    // A real flat close IS a zero: it keeps the signed label.
    expect(exitMarkerSpec(0, false).text).toBe('Exit +$0.00');
  });

  it('prefixes and grays the examples layer regardless of P&L availability', () => {
    expect(exitMarkerSpec(4, true)).toMatchObject({ color: EXAMPLE_MARKER_COLOR, text: 'EX Exit +$4.00' });
    expect(exitMarkerSpec(undefined, true)).toMatchObject({
      color: EXAMPLE_MARKER_COLOR,
      text: `EX Exit ${NA}`,
    });
  });
});
