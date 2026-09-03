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
    // The picker is a <select> grouped by phase, and options inside a closed
    // select are never "visible" to Playwright — assert the active report's
    // rendered header plus the select state instead of bare text.
    await expect(page.getByRole('heading', { name: /phase 1/i }).first()).toBeVisible();
    const picker = page.getByLabel('Select report');
    await expect(picker).toHaveValue('phase1');
    await expect(picker.locator('option')).toHaveCount(2);
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });
});
