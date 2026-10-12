import { describe, expect, it } from 'vitest';
import type { InsightReport } from '@/types/insights';
import { dataHealth, groupKeyLevels, planSummary, sortCatalysts, sortRisks, withDirectionChange, unifiedHistory } from './decision';

const base = {
  entry_zone: { low: 100, high: 102 }, stop: 98, targets: [106, 110],
  failed_sections: [], failed_section_reasons: {},
} as unknown as InsightReport;

describe('groupKeyLevels', () => {
  it.each(['High', 'Low'])('orders previous %s levels Day through Year regardless of price', (type) => {
    const groups = groupKeyLevels({
      [`Prev Year ${type}`]: 258.20,
      [`Prev Quarter ${type}`]: 305.18,
      [`Prev Month ${type}`]: 296.18,
      [`Prev Week ${type}`]: 283.56,
      [`Prev Day ${type}`]: 277.83,
    });
    expect(groups[type === 'High' ? 0 : 1].rows.map(([key]) => key)).toEqual(
      ['Day', 'Week', 'Month', 'Quarter', 'Year'].map((period) => `Prev ${period} ${type}`),
    );
  });
  it.each(['Effective', 'Gamma'])('orders timeframe-based %s levels Day through Year', (prefix) => {
    const groups = groupKeyLevels({ [`${prefix} Year`]: 500, [`${prefix} Day`]: 100, [`${prefix} Month`]: 300, [`${prefix} Week`]: 200, [`${prefix} Quarter`]: 400 });
    expect(groups[prefix === 'Effective' ? 2 : 3].rows.map(([key]) => key)).toEqual(
      ['Day', 'Week', 'Month', 'Quarter', 'Year'].map((period) => `${prefix} ${period}`),
    );
  });
  it('puts display-label previous highs and lows into the first two groups', () => {
    const groups = groupKeyLevels({ 'Prev Quarter High': 305.18, 'Prev Month Low': 277.41 });
    expect(groups[0].rows).toEqual([['Prev Quarter High', 305.18]]);
    expect(groups[1].rows).toEqual([['Prev Month Low', 277.41]]);
    expect(groups[3].rows).toEqual([]);
  });
  it('groups averages and effective levels separately from gamma', () => {
    const groups = groupKeyLevels({ 'EMA 20': 283.05, 'Effective PDH': 277.83, 'Gamma Balance': 274.4 });
    expect(groups[2].rows).toEqual([['EMA 20', 283.05], ['Effective PDH', 277.83]]);
    expect(groups[3].rows).toEqual([['Gamma Balance', 274.4]]);
  });
  it('still accepts snake_case keys without changing their values', () => {
    expect(groupKeyLevels({ prev_day_high: 277.83 })[0].rows).toEqual([['prev_day_high', 277.83]]);
  });
});

describe('planSummary', () => {
  it('computes R:R from the entry midpoint, first target and stop', () => {
    const p = planSummary(base);
    expect(p.entryMid).toBe(101);
    expect(p.rr).toBeCloseTo(5 / 3);
  });
  it('keeps missing stop as null and never fabricates R:R', () => {
    const p = planSummary({ ...base, stop: null } as unknown as InsightReport);
    expect(p.stop).toBeNull();
    expect(p.rr).toBeNull();
  });
});

describe('dataHealth', () => {
  it('lists failed sections with their reasons', () => {
    const h = dataHealth({ ...base, failed_sections: ['catalysts'], failed_section_reasons: { catalysts: 'timeout' } } as InsightReport);
    expect(h.failed).toEqual([{ name: 'catalysts', reason: 'timeout' }]);
    expect(h.ok).toBe(h.total - 1);
  });
});

describe('ordering', () => {
  it('puts the soonest upcoming catalyst first', () => {
    const now = Date.parse('2026-10-12T00:00:00Z');
    const out = sortCatalysts([
      { name: 'Old', date: '2026-09-01', impact: 'low', kind: 'economic' },
      { name: 'Later', date: '2026-10-20', impact: 'low', kind: 'economic' },
      { name: 'Next', date: '2026-10-14', impact: 'high', kind: 'economic' },
    ], now);
    expect(out.map((c) => c.name)).toEqual(['Next', 'Later', 'Old']);
    expect(out[0].daysAway).toBe(2);
  });
  it('sorts block risks before warnings', () => {
    expect(sortRisks([
      { persona: 'neutral', severity: 'info', message: 'a' },
      { persona: 'neutral', severity: 'block', message: 'b' },
    ])[0].severity).toBe('block');
  });
  it('pairs each history row with the previous call', () => {
    expect(withDirectionChange([{ id: '2', direction: 'long' }, { id: '1', direction: 'flat' }])[0].previous).toBe('flat');
  });
});

describe('unifiedHistory', () => {
  const reports = [{ id: 'r1', as_of: '2026-10-10T10:00:00Z', direction: 'long' }, { id: 'r2', as_of: null }];
  const sessions = [{ id: 's1', ticker: 'IWM', mode: 'live', title: 'Catalysts?', status: 'active', updated_at: '2026-10-11T10:00:00Z', replay_cutoff: null }];
  it('orders newest first and puts undated rows last', () => {
    expect(unifiedHistory(reports, sessions).map((i) => i.id)).toEqual(['s1', 'r1', 'r2']);
  });
  it('labels each artifact by its source', () => {
    const items = unifiedHistory(reports, sessions);
    expect(items.find((i) => i.id === 's1')?.label).toBe('Research question');
    expect(items.find((i) => i.id === 'r1')?.label).toBe('Report run');
  });
  it('filters by artifact type', () => {
    expect(unifiedHistory(reports, sessions, 'reports').map((i) => i.id)).toEqual(['r1', 'r2']);
    expect(unifiedHistory(reports, sessions, 'research').map((i) => i.id)).toEqual(['s1']);
  });
});
