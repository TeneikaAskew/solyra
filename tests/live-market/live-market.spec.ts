/**
 * E2E: Live Market ("/live") — live quote, intraday bars, indicators.
 *
 * Payloads live in tests/helpers/fixtures/live.ts, typed against LiveQuote /
 * LiveHistory / AvgVolume / IndicatorsResponse / MarketDataResponse.
 *
 * The `/api/playbook/IWM` and `/api/market/dates/IWM` mocks this spec used
 * to carry are gone: LiveMarketPage calls neither (`useAvailableDates` is
 * only used by Charts and Journal), so they described a dependency that
 * doesn't exist.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { mockLiveApi } from '../helpers/fixtures/live';

test.describe('Live Market', () => {
  test.beforeEach(async ({ page }) => {
    await mockLiveApi(page);
  });

  test('navigates to /live and renders ticker context', async ({ page }) => {
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/IWM/);
  });

  test('renders live price quote', async ({ page }) => {
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/220\.45/).first()).toBeVisible();
  });

  test('shows session pill', async ({ page }) => {
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/market open|market closed|pre-market|after hours/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });
});
