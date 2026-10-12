import { describe, expect, it } from 'vitest';
import { toChartBars } from './ResearchCandleChart';

const bar = { time: 1728600000, open: 100, high: 101, low: 99, close: 100.5 };
const vol = { time: 1728600000, value: 12345, color: '#22c55e' };

describe('toChartBars', () => {
  it('passes through a valid OHLCV payload', () => {
    expect(toChartBars({ candlestick: [bar], volume: [vol] })).toEqual({ candlestick: [bar], volume: [vol] });
  });

  it('returns null when there are no bars', () => {
    expect(toChartBars(undefined)).toBeNull();
    expect(toChartBars({ candlestick: [], volume: [] })).toBeNull();
  });

  it('rejects a bar with a non-finite price instead of manufacturing data', () => {
    expect(toChartBars({ candlestick: [{ ...bar, close: NaN }], volume: [vol] })).toBeNull();
    expect(toChartBars({ candlestick: [{ ...bar, open: Infinity }], volume: [vol] })).toBeNull();
  });

  it('rejects an inverted high/low', () => {
    expect(toChartBars({ candlestick: [{ ...bar, high: 98, low: 101 }], volume: [vol] })).toBeNull();
  });

  it('drops invalid volume points but keeps valid bars', () => {
    const result = toChartBars({ candlestick: [bar], volume: [vol, { ...vol, value: NaN }] });
    expect(result?.volume).toEqual([vol]);
  });
});
