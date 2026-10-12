import { expect, test } from '@playwright/test';
import { M } from '../helpers/mocks';
import { MOCK_MARKET_DATA, MOCK_MARKET_DATES } from '@/mocks/charts';
import { MOCK_INSIGHT_HISTORY, MOCK_INSIGHT_REPORT_DEGRADED, mockInsightsApi } from '../helpers/fixtures/insights';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/market/dates/IWM', (r) => r.fulfill(M.ok(MOCK_MARKET_DATES)));
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(MOCK_MARKET_DATA)));
});

test('leads with the decision bar, chart and context rail', async ({ page }, testInfo) => {
  await mockInsightsApi(page, { history: MOCK_INSIGHT_HISTORY });
  await page.goto('/ai-insights-lovable');
  const decision = page.getByRole('region', { name: 'Decision' });
  await expect(decision).toBeVisible();
  await expect(decision.getByText('Reward : risk')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy plan' })).toBeVisible();
  await expect(page.locator('section[aria-label="Price chart"] canvas').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Catalysts' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop-report.png') });

  await page.getByRole('tab', { name: /History/ }).click();
  await expect(page.getByRole('tabpanel', { name: 'History' }).getByText('Report run').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('history-tab.png') });
});

test('exposes all five tabs with one ticker selector', async ({ page }, testInfo) => {
  await mockInsightsApi(page, { history: MOCK_INSIGHT_HISTORY });
  await page.goto('/ai-insights-lovable');
  for (const name of ['Briefing', 'Agents', 'History', 'Watchlist', 'Chat']) {
    await page.getByRole('tab', { name: new RegExp(name) }).click();
    await expect(page.getByRole('tab', { name: new RegExp(name) })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name }).or(page.getByRole('region', { name: 'Decision' }))).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`tab-${name.toLowerCase()}.png`) });
  }
  await expect(page.getByPlaceholder(/Ask about IWM/)).toBeVisible();
  expect(await page.getByRole('textbox', { name: 'Research ticker' }).count()).toBe(0);
});

test('shows failed sections in the data health chip', async ({ page }, testInfo) => {
  await mockInsightsApi(page, { report: MOCK_INSIGHT_REPORT_DEGRADED });
  await page.goto('/ai-insights-lovable');
  const chip = page.getByRole('button', { name: /sections ok/ });
  await chip.click();
  await expect(page.getByRole('note').filter({ hasText: ':' }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('degraded.png') });
});

test('empty state offers one generate action', async ({ page }, testInfo) => {
  await mockInsightsApi(page, { report: null });
  await page.goto('/ai-insights-lovable');
  await expect(page.getByRole('button', { name: 'Generate report' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('empty.png') });
});

test('mobile layout has no horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockInsightsApi(page);
  await page.goto('/ai-insights-lovable');
  await expect(page.getByRole('region', { name: 'Decision' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
});
