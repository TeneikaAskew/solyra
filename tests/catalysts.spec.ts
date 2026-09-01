/**
 * E2E: Catalysts ("/catalysts") — earnings, 8-K, FDA, M&A event timeline,
 * news catalysts, insider clusters, plus the unified-feed UX
 * (Hot Now panel, impact filter, click-to-navigate, sentiment indicator).
 *
 * Payloads live in tests/helpers/fixtures/catalysts.ts, typed against the
 * page's own CatalystsResponse / CatalystTypesResponse contracts. The Hot Now
 * rows are built against the clock (today/tomorrow) inside the fixture, so
 * they can't silently stop being "hot" the day after they were written.
 */
import { test, expect } from '@playwright/test';
import { mockCatalystsApi } from './helpers/fixtures/catalysts';

test.describe('Catalysts', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalystsApi(page);
  });

  test('renders catalysts heading', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: /catalysts/i })).toBeVisible();
  });

  test('lists upcoming events', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/AAPL/).first()).toBeVisible();
    await expect(page.getByText(/Q2 2026 Earnings/i)).toBeVisible();
  });

  test('shows filter chips', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/earnings/i).first()).toBeVisible();
  });

  test('renders within 5s perf budget', async ({ page }) => {
    const start = Date.now();
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test('renders Hot Now panel for today/tomorrow high-impact events', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // Hot now header + at least one hot row visible
    await expect(page.getByText(/hot now/i).first()).toBeVisible();
    // The high-impact AVGO event should appear in Hot Now (today)
    await expect(page.getByText(/Broadcom rises on AI deals/i).first()).toBeVisible();
  });

  test('renders impact tier counters in header', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // Header summary: '<n> events <h>H/<m>M/<l>L · ...'
    await expect(page.getByText(/\d+\s*events/i).first()).toBeVisible();
    await expect(page.getByText(/\d+H\s*\/\s*\d+M\s*\/\s*\d+L/i).first()).toBeVisible();
  });

  test('Min-impact filter restricts the timeline', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // Click "High" — only High-impact items should remain.
    await page.getByRole('button', { name: 'High' }).first().click();
    // MSFT Investor Day was Medium impact; should disappear from
    // the date timeline (still allowed in Hot Now since Hot Now
    // ignores the min-impact filter — only the timeline below it
    // is filtered).
    await expect(page.getByText(/Investor Day/i)).toHaveCount(0);
    // High items still visible
    await expect(page.getByText(/Q2 2026 Earnings/i).first()).toBeVisible();
  });

  test('clicking a ticker navigates to /insights with that ticker active', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // The AVGO ticker button (in Hot Now, today's event) — click to navigate
    await page.getByRole('button', { name: 'AVGO' }).first().click();
    await page.waitForURL('**/insights');
    expect(page.url()).toMatch(/\/insights/);
  });

  test('news rows show a sentiment indicator', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // ▲ for bullish (sentiment 0.73). The element shows '▲ 0.73'.
    await expect(page.getByText('▲').first()).toBeVisible();
  });
});
