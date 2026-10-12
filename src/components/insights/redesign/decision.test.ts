import { describe, expect, it } from 'vitest';
import type { InsightReport } from '@/types/insights';
import { dataHealth, planSummary, sortCatalysts, sortRisks, withDirectionChange } from './decision';

const base = {
  entry_zone: { low: 100, high: 102 }, stop: 98, targets: [106, 110],
  failed_sections: [], failed_section_reasons: {},
} as unknown as InsightReport;

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
