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
import type { ReportListResponse } from '@/lib/reports';
import { perfBudgetMs } from '../helpers/perfBudget';
import { MOCK_REPORT_LIST_EMPTY, mockReportsApi } from '../helpers/fixtures/reports';

test.describe('Reports', () => {
  test('renders reports heading', async ({ page }) => {
    await mockReportsApi(page);
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Reports: IWM')).toBeVisible();
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

  test('Next and Previous show the report they step to, with both buttons enabled in between', async ({
    page,
  }) => {
    // Three reports in the order the handler sends a ticker's own reports (highest phase first). The
    // shared mock answers every phase with the same markdown, so a page that moved the header and the
    // counter but kept the first body would pass the walk test above; here each phase has its own body.
    const list = {
      ticker: 'IWM',
      reports: [
        {
          phase: 'phase3_orb_strategies',
          filename: 'phase3_orb_strategies_iwm.md',
          path: 'reports/phase3_orb_strategies_iwm.md',
        },
        {
          phase: 'phase2_indicator_confirmation',
          filename: 'phase2_indicator_confirmation_iwm.md',
          path: 'reports/phase2_indicator_confirmation_iwm.md',
        },
        {
          phase: 'phase1_strat_mining',
          filename: 'phase1_strat_mining_iwm.md',
          path: 'reports/phase1_strat_mining_iwm.md',
        },
      ],
    } satisfies ReportListResponse;
    await mockReportsApi(page, { list });
    // Registered after mockReportsApi so it wins (newest-first matching): the body names its phase.
    await page.route('**/api/reports/IWM/*', (r) => {
      const phase = new URL(r.request().url()).pathname.split('/').pop();
      return r.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: `# Body of ${phase}\n\nText of ${phase}.`,
      });
    });
    await page.goto('/reports');

    const picker = page.getByRole('combobox', { name: 'Select report' });
    const prev = page.getByRole('button', { name: 'Previous report' });
    const next = page.getByRole('button', { name: 'Next report' });

    // First entry of the list: its own body, Previous disabled.
    await expect(page.getByText('1 / 3')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Body of phase3_orb_strategies', exact: true }),
    ).toBeVisible();
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    // Middle entry: the select, the header and the body follow the step, and both buttons are enabled.
    await next.click();
    await expect(page.getByText('2 / 3')).toBeVisible();
    await expect(picker).toHaveValue('phase2_indicator_confirmation');
    await expect(
      page.getByRole('heading', { name: 'Phase 2: Indicator Confirmation', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Body of phase2_indicator_confirmation', exact: true }),
    ).toBeVisible();
    await expect(prev).toBeEnabled();
    await expect(next).toBeEnabled();

    // Last entry: Next is disabled.
    await next.click();
    await expect(page.getByText('3 / 3')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Body of phase1_strat_mining', exact: true }),
    ).toBeVisible();
    await expect(next).toBeDisabled();

    // Previous goes back to the middle entry and its body.
    await prev.click();
    await expect(page.getByText('2 / 3')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Body of phase2_indicator_confirmation', exact: true }),
    ).toBeVisible();
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

  test('a failed report body shows "Report not available." under the report header, not a blank page', async ({
    page,
  }) => {
    await mockReportsApi(page);
    // Registered after mockReportsApi so this 502 wins (newest-first matching): the handler's answer
    // when the object cannot be read from the bucket. The list still answers.
    await page.route('**/api/reports/IWM/*', (r) =>
      r.fulfill({
        status: 502,
        contentType: 'application/json',
        body: '{"detail":"Failed to download report from GCS: boom"}',
      }),
    );
    await page.goto('/reports');

    await expect(page.getByText('Report not available.')).toBeVisible();
    // The list answered, so the picker, the counter and the header of the active report stay.
    await expect(page.getByRole('combobox', { name: 'Select report' })).toBeEnabled();
    await expect(page.getByText('1 / 2')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phase 1:', exact: true })).toBeVisible();
    // The failure is neither taken for a list failure nor drawn as a report.
    await expect(page.getByText('Could not load the report list for IWM.')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Phase 1: IWM Backtest' })).toHaveCount(0);
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
