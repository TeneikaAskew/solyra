/**
 * Typed fixtures + route wiring for the phase-report viewer (`/reports`).
 *
 * Endpoint fan-out, read off ReportsPage.tsx:
 *   GET /api/reports/list/{ticker}     useReportList    → ReportListResponse
 *   GET /api/reports/{ticker}/{phase}  useReportContent → raw markdown TEXT
 *
 * Note the second one is `r.text()`, not `r.json()` — it must be fulfilled
 * as text/plain. Fulfilling it as JSON makes the viewer render a quoted
 * string, which is the kind of mismatch a hand-inlined mock invites.
 */
import type { Page } from '@playwright/test';
import type { ReportListResponse } from '@/routes/ReportsPage';
import { M, mockCommon } from '../mocks';

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

export interface ReportsMockOpts {
  list?: ReportListResponse;
  body?: string;
}

/**
 * Intercept every endpoint `/reports` can hit, scoped to IWM.
 * Includes `mockCommon`, so callers don't need it separately.
 */
export async function mockReportsApi(page: Page, opts: ReportsMockOpts = {}) {
  await mockCommon(page);
  const list = opts.list ?? MOCK_REPORT_LIST;
  const body = opts.body ?? MOCK_REPORT_BODY;

  await page.route('**/api/reports/list/IWM', (r) => r.fulfill(M.ok(list)));
  await page.route('**/api/reports/IWM/*', (r) =>
    r.fulfill({ status: 200, contentType: 'text/plain', body })
  );
}
