// @vitest-environment jsdom
/**
 * Fixture ↔ runtime binding for the report viewer.
 *
 * reportsSanitize.test.ts already pins the XSS-stripping guarantee with an
 * adversarial ad-hoc string. This file instead renders the SHARED report
 * fixture (tests/helpers/fixtures/reports.ts) through the real pipeline, so
 * the fixture is proven to exercise the GFM features it claims to — the
 * table extension in particular, which `marked` only renders because
 * ReportsPage configures `gfm: true`. An E2E spec asserting on text alone
 * would pass even if the table silently degraded to a paragraph.
 */
import { describe, expect, it } from 'vitest';
import { renderReportHtml } from '@/lib/reports';
import { MOCK_REPORT_BODY } from '../../tests/helpers/fixtures/reports';

describe('renderReportHtml on MOCK_REPORT_BODY', () => {
  const html = renderReportHtml(MOCK_REPORT_BODY);

  it('renders the headings hierarchy', () => {
    expect(html).toContain('<h1');
    expect(html).toContain('Phase 1: IWM Backtest');
    expect(html).toContain('<h2');
  });

  it('renders the GFM table (the reason marked is configured with gfm: true)', () => {
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
    // Header + 2 data rows survive the sanitizer intact.
    expect(html).toContain('Timeframe');
    expect(html).toContain('61%');
  });

  it('renders the list items with their metric text intact', () => {
    expect(html).toContain('<li');
    expect(html).toContain('Win rate: 62%');
  });

  it('emits no script-capable content even from a trusted fixture', () => {
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
  });
});
