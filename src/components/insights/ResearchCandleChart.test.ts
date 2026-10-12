import { describe, expect, it } from 'vitest';
import { resolveChartDate, toChartBars } from './ResearchCandleChart';

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

describe('resolveChartDate', () => {
  const dates = ['20261009', '20261008', '20261007']; // sorted DESC, compact

  it('returns an empty string while the dates list is still loading', () => {
    expect(resolveChartDate(undefined, '20261011')).toBe('');
  });

  it('keeps the target when it is a real trading day', () => {
    expect(resolveChartDate(dates, '20261009')).toBe('20261009');
  });

  it('snaps a weekend target back to the most recent trading day', () => {
    // 2026-10-11 is a Sunday; the chart must ask for Friday's session.
    expect(resolveChartDate(dates, '20261011')).toBe('20261009');
  });

  it('snaps a replay cutoff to the nearest earlier trading day', () => {
    expect(resolveChartDate(dates, '20261008')).toBe('20261008');
    expect(resolveChartDate(dates, '20261010')).toBe('20261009');
  });

  it('falls back to the oldest available date when the target predates the list', () => {
    expect(resolveChartDate(dates, '20261001')).toBe('20261007');
  });

  it('uses the target when the dates list is empty so the error surfaces', () => {
    expect(resolveChartDate([], '20261011')).toBe('20261011');
  });
});
