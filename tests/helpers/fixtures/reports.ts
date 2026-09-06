/**
 * Route wiring for the phase-report viewer (`/reports`).
 *
 * Payloads live in src/mocks/reports.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer.
 *
 * Note the report-body endpoint is `r.text()`, not `r.json()` — it must be
 * fulfilled as text/plain. Fulfilling it as JSON makes the viewer render a
 * quoted string, which is the kind of mismatch a hand-inlined mock invites.
 */
import type { Page } from '@playwright/test';
import type { ReportListResponse } from '@/lib/reports';
import { MOCK_REPORT_BODY, MOCK_REPORT_LIST } from '@/mocks/reports';
import { M, mockCommon } from '../mocks';

export { MOCK_REPORT_BODY, MOCK_REPORT_LIST, MOCK_REPORT_LIST_EMPTY } from '@/mocks/reports';

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
