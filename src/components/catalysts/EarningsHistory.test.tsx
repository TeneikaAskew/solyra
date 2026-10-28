import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MOCK_EARNINGS_HISTORY, MOCK_EARNINGS_LEAN } from '@/mocks/earnings';
import { parseEarningsHistory, parseEarningsLean, historicalPercent, closingMetricText } from './earningsContract';
import { EarningsHistoryResults } from './EarningsHistory';

describe('earnings wire and presentation contract', () => {
  it('renders the supplied historical percentages and distinct event columns', () => {
    const html = renderToStaticMarkup(<EarningsHistoryResults ticker="DEMO"
      history={parseEarningsHistory(MOCK_EARNINGS_HISTORY, 'DEMO')}
      lean={parseEarningsLean(MOCK_EARNINGS_LEAN, 'DEMO')} />);
    expect(html).toContain('75%'); expect(html).toContain('50%');
    expect(html).toContain('Native 5-day sustain');
    expect(html).toContain('Closing step 2'); expect(html).toContain('Closing step 4');
    expect(html).toContain('Not observed by');
    expect(html).not.toContain('7500%');
  });
  it('accepts the server cohort and preserves native values without deriving percentages', () => {
    const h = parseEarningsHistory(structuredClone(MOCK_EARNINGS_HISTORY), 'DEMO');
    const l = parseEarningsLean(structuredClone(MOCK_EARNINGS_LEAN), 'DEMO');
    expect(l.daily_path_summary_v1?.qualified_native_n).toBe(4);
    expect(h.rows[0].sustain_5d_pct).toBe(-8.928571428571429);
    expect(historicalPercent(l.daily_path_summary_v1?.historical_direction_consistency_pct)).toBe('75%');
    expect(historicalPercent(0)).toBe('0%');
    expect(historicalPercent(null)).toBe('—');
  });

  it('keeps step zero, closing fill, censoring and native reversal distinct', () => {
    const h = parseEarningsHistory(structuredClone(MOCK_EARNINGS_HISTORY), 'DEMO');
    expect(closingMetricText(h.rows[0].daily_path_v1, 'first_opposite_close')).toBe('Closing step 2 · 2026-01-07');
    expect(closingMetricText(h.rows[0].daily_path_v1, 'closing_gap_fill')).toBe('Closing step 4 · 2026-01-09');
    expect(closingMetricText(h.rows[1].daily_path_v1, 'closing_gap_fill')).toContain('Not observed by');
    const p = structuredClone(h.rows[0].daily_path_v1!);
    p.first_opposite_close_step = 0;
    p.first_opposite_close_date = '2026-01-05';
    expect(closingMetricText(p, 'first_opposite_close')).toContain('step 0');
  });

  it('accepts rolling missing additive fields as unavailable, never zero', () => {
    const h = structuredClone(MOCK_EARNINGS_HISTORY) as Record<string, unknown>;
    const rows = h.rows as Record<string, unknown>[];
    delete rows[0].daily_path_v1;
    const parsed = parseEarningsHistory(h, 'DEMO');
    expect(closingMetricText(parsed.rows[0].daily_path_v1, 'first_opposite_close')).toContain('Unavailable');
    expect(parseEarningsLean({ ticker: 'DEMO' }, 'DEMO').daily_path_summary_v1).toBeNull();
  });

  it('rejects another ticker, event identity, unknown version and malformed numeric data', () => {
    expect(() => parseEarningsHistory(MOCK_EARNINGS_HISTORY, 'ANGO')).toThrow(/ticker/);
    const h = structuredClone(MOCK_EARNINGS_HISTORY);
    h.rows[0].daily_path_v1.event_id = 'DEMO:2025-08-31:2025-10-02';
    expect(() => parseEarningsHistory(h, 'DEMO')).toThrow(/identity/);
    const bad = structuredClone(MOCK_EARNINGS_LEAN) as Record<string, unknown>;
    const summary = bad.daily_path_summary_v1 as Record<string, unknown>;
    summary.version = 'future-v2';
    expect(() => parseEarningsLean(bad, 'DEMO')).toThrow(/version/);
    summary.version = 'earnings-daily-path-summary-v1';
    summary.historical_direction_consistency_pct = '75';
    expect(() => parseEarningsLean(bad, 'DEMO')).toThrow(/number/);
  });

  it('does not describe an immature endpoint as a completed negative', () => {
    const p = structuredClone(MOCK_EARNINGS_HISTORY.rows[1].daily_path_v1);
    p.status = 'maturing';
    p.per_metric.closing_gap_fill!.status = 'not_yet_mature';
    p.per_metric.closing_gap_fill!.available = false;
    p.per_metric.closing_gap_fill!.censored = null;
    p.per_metric.closing_gap_fill!.reason = 'feature_not_mature';
    expect(closingMetricText(p, 'closing_gap_fill')).toContain('feature_not_mature');
    expect(closingMetricText(p, 'closing_gap_fill')).not.toContain('Not observed by');
  });

  it('refuses a non-null percentage with no qualified denominator', () => {
    const l = structuredClone(MOCK_EARNINGS_LEAN);
    l.daily_path_summary_v1.qualified_native_n = 0;
    expect(() => parseEarningsLean(l, 'DEMO')).toThrow(/denominator/);
  });
});
