/**
 * E2E: Reports ("/reports") — phase analysis reports list and viewer.
 *
 * Payloads live in tests/helpers/fixtures/reports.ts, typed against the
 * page's own ReportListResponse contract.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from './helpers/perfBudget';
import { mockReportsApi } from './helpers/fixtures/reports';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await mockReportsApi(page);
  });

  test('renders reports heading', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/reports/i).first()).toBeVisible();
  });

  test('lists available phase reports', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    // Reports live in the top-bar <select> picker; Playwright treats the
    // <option>s of a collapsed select as hidden, so assert the picker's
    // contents plus the auto-selected first report's visible header.
    const picker = page.getByLabel('Select report');
    await expect(picker).toBeVisible();
    await expect(picker.locator('option')).toHaveText([/phase 1/i, /phase 6: playbook/i]);
    // Exact match: the rendered markdown body has its own "Phase 1: IWM
    // Backtest" h1, so a loose regex resolves to two headings.
    await expect(page.getByRole('heading', { name: 'Phase 1:', exact: true })).toBeVisible();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });
});
