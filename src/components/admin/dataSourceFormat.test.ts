import { describe, expect, it } from 'vitest';
import { coverage, fmtCount, fmtWhen } from './dataSourceFormat';
import type { AdminDataSourceRow } from '@/hooks/useAdmin';

const base: AdminDataSourceRow = {
  id: 'x', label: 'X', category: 'charts', status: 'ok',
  row_count: null, last_refreshed_at: null,
  coverage_start: null, coverage_end: null, message: null, refreshable: true,
};

describe('data source formatting (Rule 4: no fabricated zeros)', () => {
  it('renders a missing row count as an em-dash, never 0', () => {
    expect(fmtCount(null)).toBe('—');
    expect(fmtCount(0)).toBe('0');
    expect(fmtCount(1234)).toBe((1234).toLocaleString());
  });

  it('renders a missing or invalid timestamp as an em-dash', () => {
    expect(fmtWhen(null)).toBe('—');
    expect(fmtWhen('not-a-date')).toBe('—');
  });

  it('renders coverage honestly when one bound is missing', () => {
    expect(coverage(base)).toBe('—');
    expect(coverage({ ...base, coverage_start: '2020-01-01' })).toBe('2020-01-01 → —');
    expect(coverage({ ...base, coverage_start: '2020-01-01', coverage_end: '2026-09-02' }))
      .toBe('2020-01-01 → 2026-09-02');
  });
});
