import { describe, it, expect } from 'vitest';
import { clampAutoscaleRange } from './CandlestickChart';

// IWM-like bars: ~$290–295 action with a median bar range of ~$0.30.
const normalBars = Array.from({ length: 60 }, (_, i) => {
  const base = 290 + Math.sin(i / 8) * 2 + (i % 5) * 0.1;
  return { time: 1000 + i * 300, open: base, high: base + 0.35, low: base - 0.25, close: base + 0.05 };
});

describe('clampAutoscaleRange', () => {
  it('leaves a normal range essentially unchanged', () => {
    const range = { minValue: 287, maxValue: 294 };
    const out = clampAutoscaleRange(range, normalBars);
    // 12x median bar range (0.3) = $3.6 half-span around the median (~291),
    // so the tight honest range stays well inside the clamp window.
    expect(out.minValue).toBeLessThanOrEqual(range.minValue + 0.5);
    expect(out.maxValue).toBeGreaterThanOrEqual(range.maxValue - 0.5);
    expect(out.minValue).toBeLessThan(out.maxValue);
  });

  it('clips an outlier wick that would otherwise flatten the candles', () => {
    const bars = [...normalBars, { time: 9999, open: 291, high: 291.5, low: 220, close: 291.2 }];
    const out = clampAutoscaleRange({ minValue: 220, maxValue: 294 }, bars);
    // The 220 low must NOT survive: the clamp re-anchors near the median.
    expect(out.minValue).toBeGreaterThan(285);
    expect(out.maxValue).toBeLessThanOrEqual(294);
  });

  it('never returns an inverted or degenerate range', () => {
    const one = [{ time: 1, open: 100, high: 100.5, low: 99.5, close: 100.2 }];
    const out = clampAutoscaleRange({ minValue: 10, maxValue: 500 }, one);
    expect(out.minValue).toBeLessThan(out.maxValue);
  });

  it('passes the range through untouched when there are no candles', () => {
    const range = { minValue: 1, maxValue: 2 };
    expect(clampAutoscaleRange(range, [])).toBe(range);
  });
});
