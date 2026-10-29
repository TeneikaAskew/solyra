import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResearchCandleChart } from './ResearchCandleChart';

const fixture = vi.hoisted(() => ({ dates: [] as string[], market: vi.fn(() => ({})) }));
vi.mock('@/hooks/useMarketData', () => ({ useAvailableDates: () => ({ data: { dates: fixture.dates } }), useMarketData: fixture.market }));
vi.mock('@/hooks/useLiveQuote', () => ({ useLiveQuote: () => ({}) }));
vi.mock('@/components/charts/CandlestickChart', () => ({ CandlestickChart: () => null }));
vi.mock('@/components/primitives', () => ({ MicroLabel: 'span' }));
beforeEach(() => fixture.market.mockClear());
function chart(cutoff: string, dates: string[]) {
  fixture.dates = dates;
  renderToStaticMarkup(createElement(ResearchCandleChart, { ticker: 'IWM', mode: 'replay', replayCutoff: cutoff }));
}
describe('CODE1 4413406666 absolute replay boundary uses America/New_York', () => {
  it.each([
    ['2026-10-09T15:30:00Z', '20261009', '11:30'],
    ['2026-01-09T15:30:00Z', '20260109', '10:30'],
    ['2026-10-10T01:30:00Z', '20261009', '21:30'],
    ['2026-03-08T06:30:00Z', '20260308', '01:30'],
    ['2026-03-08T07:30:00Z', '20260308', '03:30'],
    ['2026-11-01T05:30:00Z', '20261101', '01:30'],
    ['2026-11-01T06:30:00Z', '20261101', '01:30'],
    ['2026-10-09T11:30:00-04:00', '20261009', '11:30'],
  ])('%s requests session %s through %s ET', (cutoff, date, time) => {
    chart(cutoff, [date]);
    expect(fixture.market).toHaveBeenLastCalledWith('IWM', date, '15', time);
  });
  it('preserves the timezone-less Briefing market-local input contract', () => {
    chart('2026-10-09T11:30', ['20261009']);
    expect(fixture.market).toHaveBeenLastCalledWith('IWM', '20261009', '15', '11:30');
  });
});
describe('CODE1 4413406723 earlier sessions are complete', () => {
  it.each([
    ['2026-10-11T10:00', '20261009'], // weekend
    ['2026-12-25T10:00', '20261224'], // holiday
    ['2026-10-09T11:30', '20261008'], // missing session
    ['2026-10-11T14:00:00Z', '20261009'],
  ])('%s includes all of earlier session %s', (cutoff, date) => {
    chart(cutoff, [date]);
    expect(fixture.market).toHaveBeenLastCalledWith('IWM', date, '15', null);
  });
});
