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
    await expect(page.getByText(/phase1|phase 1/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });
});
