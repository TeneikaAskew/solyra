/**
 * Typed fixtures + mock-mode routes for the phase-report viewer (`/reports`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/reports.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
 *
 * Endpoint fan-out, read off ReportsPage.tsx:
 *   GET /api/reports/list/{ticker}     useReportList    → ReportListResponse
 *   GET /api/reports/{ticker}/{phase}  useReportContent → raw markdown TEXT
 *
 * Note the second one is `r.text()`, not `r.json()` — it must be fulfilled
 * as text/plain. Fulfilling it as JSON makes the viewer render a quoted
 * string, which is the kind of mismatch a hand-inlined mock invites.
 */
import type { ReportListResponse } from '@/lib/reports';
import type { MockRoute } from './types';

/** Two phases so the list renders more than one row and phaseLabel()'s
 *  "phase6_playbook" → "Phase 6: Playbook" transform is exercised. */
export const MOCK_REPORT_LIST = {
  ticker: 'IWM',
  reports: [
    { phase: 'phase1', filename: 'phase1_iwm.md', path: 'reports/phase1_iwm.md' },
    {
      phase: 'phase6_playbook',
      filename: 'phase6_playbook_iwm.md',
      path: 'reports/phase6_playbook_iwm.md',
    },
  ],
} satisfies ReportListResponse;

/** No reports for the ticker — drives the empty state. */
export const MOCK_REPORT_LIST_EMPTY = {
  ticker: 'IWM',
  reports: [],
} satisfies ReportListResponse;

/** GFM markdown: headings, a list, and a table (marked is configured with
 *  gfm: true, so the table exercises that path). Rendered through
 *  renderReportHtml → DOMPurify before it reaches the DOM. */
export const MOCK_REPORT_BODY = `# Phase 1: IWM Backtest

## Summary
Sharpe 11.05 on 1m+30m timeframe combo over 2015-2026.

## Trades
- Total: 1,234
- Win rate: 62%
- Avg return: 0.85%

| Timeframe | Trades | Win rate |
| --------- | -----: | -------: |
| 1m        |    812 |      61% |
| 30m       |    422 |      64% |
`;

/**
 * Mock-mode route table for `/reports` — the happy-path translation of
 * `mockReportsApi` (tests/helpers/fixtures/reports.ts), scoped to IWM.
 * The body route answers `text:` (text/plain), matching the viewer's
 * `r.text()` read.
 */
export const reportsRoutes: MockRoute[] = [
  { pattern: /^\/api\/reports\/list\/IWM$/, reply: () => ({ body: MOCK_REPORT_LIST }) },
  { pattern: /^\/api\/reports\/IWM\/([^/]+)$/, reply: () => ({ text: MOCK_REPORT_BODY }) },
];
