/**
 * E2E: Help & Glossary ("/help") — static page, search-filterable terms.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { mockHelpApi } from '../helpers/fixtures/help';

test.describe('Help & Glossary', () => {
  test.beforeEach(async ({ page }) => {
    await mockHelpApi(page);
  });

  test('renders Help heading', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: /help|glossary/i })).toBeVisible();
  });

  test('search input is present', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="text"], input[placeholder*="search" i]').first()).toBeVisible();
  });

  test('renders within perf budget (strict 3s, static page)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(3000));
  });
});
