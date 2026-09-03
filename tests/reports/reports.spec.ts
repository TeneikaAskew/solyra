/**
 * E2E: Reports ("/reports") — phase analysis reports picker and viewer.
 *
 * Matches the rebuilt layout (Lovable 9b5e00f): the report list lives in a
 * top picker `<select>` grouped by phase, with prev/next buttons and a
 * position counter; the active report renders below through
 * renderReportHtml. Options inside a closed <select> are not "visible", so
 * the list assertions target the select's options and value rather than
 * page text.
 *
 * Payloads live in tests/helpers/fixtures/reports.ts, typed against the
 * page's own ReportListResponse contract.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { MOCK_REPORT_LIST_EMPTY, mockReportsApi } from '../helpers/fixtures/reports';

test.describe('Reports', () => {
  test('renders reports heading', async ({ page }) => {
    await mockReportsApi(page);
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Reports — IWM')).toBeVisible();
  });

  test('picker lists every phase report and lands on the first', async ({ page }) => {
    await mockReportsApi(page);
    await page.goto('/reports');

    const picker = page.getByRole('combobox', { name: 'Select report' });
    await expect(picker).toBeEnabled();
    await expect(picker.locator('option')).toHaveText(['Phase 1:', 'Phase 6: Playbook']);
    await expect(picker).toHaveValue('phase1');

    // First report is active: header, counter, and rendered markdown body.
    // exact:true keeps the page's own header distinct from the markdown h1.
    await expect(page.getByRole('heading', { name: 'Phase 1:', exact: true })).toBeVisible();
    await expect(page.getByText('1 / 2')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phase 1: IWM Backtest' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous report' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next report' })).toBeEnabled();
  });

  test('selecting a phase from the picker switches the report', async ({ page }) => {
    await mockReportsApi(page);
    await page.goto('/reports');

    await page.getByRole('combobox', { name: 'Select report' }).selectOption('phase6_playbook');

    await expect(page.getByRole('heading', { name: 'Phase 6: Playbook' })).toBeVisible();
    await expect(page.getByText('phase6_playbook_iwm.md')).toBeVisible();
    await expect(page.getByText('2 / 2')).toBeVisible();
  });

  test('prev/next walk the pipeline order and disable at the ends', async ({ page }) => {
    await mockReportsApi(page);
    await page.goto('/reports');
    await expect(page.getByText('1 / 2')).toBeVisible();

    await page.getByRole('button', { name: 'Next report' }).click();
    await expect(page.getByText('2 / 2')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phase 6: Playbook' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next report' })).toBeDisabled();

    await page.getByRole('button', { name: 'Previous report' }).click();
    await expect(page.getByText('1 / 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous report' })).toBeDisabled();
  });

  test('a failed list load shows the error banner, not an empty picker (Rule 4)', async ({
    page,
  }) => {
    await mockReportsApi(page);
    // Registered after mockReportsApi so this 500 wins (newest-first matching).
    await page.route('**/api/reports/list/IWM', (r) =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' }),
    );
    await page.goto('/reports');

    await expect(page.getByText('Could not load the report list for IWM.')).toBeVisible();
  });

  test('an empty list shows the honest empty state', async ({ page }) => {
    await mockReportsApi(page, { list: MOCK_REPORT_LIST_EMPTY });
    await page.goto('/reports');

    await expect(
      page.getByText('No reports yet. Run the analysis pipeline to generate them.'),
    ).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Select report' })).toBeDisabled();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    await mockReportsApi(page);
    const start = Date.now();
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });
});
