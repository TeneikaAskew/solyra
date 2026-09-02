/**
 * E2E: Signals ("/signals") — alert table with direction/strength filters.
 *
 * Payloads live in tests/helpers/fixtures/signals.ts, typed against the
 * page's own SignalsResponse / TradeStats contracts.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from './helpers/perfBudget';
import { M } from './helpers/mocks';
import { MOCK_SIGNALS_EMPTY, mockSignalsApi } from './helpers/fixtures/signals';

test.describe('Signal Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await mockSignalsApi(page);
  });

  test('shows the 90-day Performance P&L card', async ({ page }) => {
    await page.goto('/signals');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/performance · 90-day backtest/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/win rate/i)).toBeVisible();
    await expect(page.getByText(/profit factor/i)).toBeVisible();
    await expect(page.getByText('1.74')).toBeVisible();
  });

  test('renders signal explorer heading', async ({ page }) => {
    await page.goto('/signals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /signal/i }).first()).toBeVisible();
  });

  test('lists alert rows', async ({ page }) => {
    await page.goto('/signals');
    await page.waitForLoadState('networkidle');
    // Score column should render numeric values from the fixture
    await expect(page.getByText(/4\.5|3\.0|2\.0/).first()).toBeVisible();
  });

  test('shows CALL and PUT directions', async ({ page }) => {
    await page.goto('/signals');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/CALL/i).first()).toBeVisible();
    await expect(page.getByText(/PUT/i).first()).toBeVisible();
  });

  test('shows empty state when no alerts', async ({ page }) => {
    // Re-registered after mockSignalsApi — Playwright matches newest-first.
    await page.route('**/api/signals/IWM*', (r) => r.fulfill(M.ok(MOCK_SIGNALS_EMPTY)));
    await page.goto('/signals');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/no.*signal|empty/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 7s)', async ({ page }) => {
    // First-paint of the signals table includes initial bundle download +
    // GCS parquet fetch on cold cache. 7s budget is the post-warm target.
    const start = Date.now();
    await page.goto('/signals');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(7000));
  });
});
