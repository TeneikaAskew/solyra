import { describe, expect, it } from 'vitest';
import { selectDashboardWindow } from './dashboardWindow';
const ts = (value: string) => Date.parse(value) / 1000;
const bar = (value: string, close = 10) => ({ time: ts(value), open: close - 1, high: close + 1, low: close - 2, close });
const bars = ['2026-10-06T04:00Z', '2026-10-26T10:00Z', '2026-10-27T04:00Z',
  '2026-10-27T15:00Z', '2026-10-28T04:00Z', '2026-10-28T14:00Z', '2026-10-28T15:00Z'].map(t => bar(t));
const volume = bars.map(b => ({ time: b.time, value: 20, color: 'original' }));
describe('shared dashboard source window', () => {
  it('keeps exactly the latest two available dates and matching volume, without mutating inputs', () => {
    const input = [...bars].reverse(); const before = [...input];
    const result = selectDashboardWindow(input, [...volume].reverse(), null);
    expect(result).toMatchObject({ status: 'ready', sessionCount: 2, candlestick: bars.slice(2), volume: volume.slice(2) });
    expect(input).toEqual(before);
  });
  it('applies the reviewed moment before selecting dates and includes the exact cutoff', () => {
    const result = selectDashboardWindow(bars, volume, ts('2026-10-27T04:00Z'));
    expect(result.candlestick).toEqual(bars.slice(1, 3));
    expect(result.volume).toEqual(volume.slice(1, 3));
  });
  it('preserves price/volume objects and discards only unmatched valid volume times', () => {
    const result = selectDashboardWindow(bars, [...volume, { time: ts('2026-10-28T08:00Z'), value: 999 }], null);
    expect(result.candlestick[0]).toBe(bars[2]); expect(result.volume[0]).toBe(volume[2]);
    expect(result.volume).toHaveLength(5);
  });
  it('retains the established 04:00 through 16:00 hour convention', () => {
    const source = ['03:00', '04:00', '16:00', '17:00'].map(t => bar(`2026-10-28T${t}Z`));
    expect(selectDashboardWindow(source, [], null).candlestick).toEqual(source.slice(1, 3));
  });
  it('does not invent a previous-month session when only one date was returned', () => {
    expect(selectDashboardWindow([bar('2026-11-02T10:00Z')], [], null)).toMatchObject({ status: 'ready', sessionCount: 1 });
  });
  it('uses actual available dates rather than assuming adjacent calendar days', () => {
    const source = [bar('2026-10-23T10:00Z'), bar('2026-10-26T10:00Z')];
    expect(selectDashboardWindow(source, [], null).candlestick).toEqual(source);
  });
  it('keeps empty or entirely post-cutoff input explicitly empty', () => {
    expect(selectDashboardWindow([], [], null)).toMatchObject({ status: 'empty', sessionCount: 0, candlestick: [] });
    expect(selectDashboardWindow(bars, volume, ts('2026-10-01T16:00Z')).status).toBe('empty');
  });
  it.each([NaN, Infinity, undefined, 1e20])('fails visibly rather than silently omitting invalid timestamp %s', value => {
    const result = selectDashboardWindow([{ ...bars[0], time: value as number }, ...bars.slice(1)], volume, null);
    expect(result).toMatchObject({ status: 'invalid', candlestick: [], volume: [], sessionCount: 0 });
    expect(result.reason).toMatch(/invalid/i);
  });
  it('refuses an invalid cutoff or duplicate source timestamps before rendering', () => {
    expect(selectDashboardWindow(bars, volume, NaN).status).toBe('invalid');
    expect(selectDashboardWindow([...bars, bars[0]], volume, null).status).toBe('invalid');
    expect(selectDashboardWindow(bars, [...volume, volume[0]], null).status).toBe('invalid');
  });
  it.each([null, undefined, 3, 'bad'])('rejects malformed source row %s without crashing the dashboard', row => {
    const malformed = [row] as unknown as typeof bars;
    expect(selectDashboardWindow(malformed, volume, null).status).toBe('invalid');
    expect(selectDashboardWindow(bars, malformed, null).status).toBe('invalid');
  });
  it('rejects malformed series containers without throwing', () => {
    const malformed = {} as typeof bars;
    expect(selectDashboardWindow(malformed, volume, null).status).toBe('invalid');
    expect(selectDashboardWindow(bars, malformed, null).status).toBe('invalid');
  });

});
