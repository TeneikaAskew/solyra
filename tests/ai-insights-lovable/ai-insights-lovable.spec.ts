import { marketDataForRequest, MOCK_LIVE_QUOTE } from '@/mocks/live';
import { MOCK_SIGNALS } from '@/mocks/signals';
import { expect, test } from '@playwright/test';
import { M } from '../helpers/mocks';
import { MOCK_MARKET_DATA, MOCK_MARKET_DATES, MOCK_SIMILAR_SETUPS } from '@/mocks/charts';
import { MOCK_INSIGHT_HISTORY, MOCK_INSIGHT_REPORT_DEGRADED, mockInsightsApi } from '../helpers/fixtures/insights';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/signals/IWM/similar?*', r => r.fulfill(M.ok(MOCK_SIMILAR_SETUPS)));
  await page.route('**/api/market/dates/IWM', (r) => r.fulfill(M.ok(MOCK_MARKET_DATES)));
  await page.route('**/api/live/quote/IWM', (r) => r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
  await page.route('**/api/signals/IWM?*', (r) => r.fulfill(M.ok(MOCK_SIGNALS)));
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(marketDataForRequest(new URL(r.request().url()), MOCK_MARKET_DATA))));
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

  const persona = page.getByRole('region', { name: 'Plan by trader style' });
  await persona.scrollIntoViewIfNeeded();
  await expect(persona.getByText('Entry', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('persona-plan.png') });

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

for (const width of [390, 411, 768, 1440]) {
  test(`all five workspace tabs stay within ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await mockInsightsApi(page, { history: MOCK_INSIGHT_HISTORY });
    await page.route('**/functions/v1/insights-research', r => r.fulfill(M.ok({ sessions: [] })));
    await page.goto('/ai-insights-lovable');
    await expect(page.getByRole('region', { name: 'Decision' })).toBeVisible();
    for (const name of ['Briefing', 'Agents', 'History', 'Watchlist', 'Chat']) {
      await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
      await expect(page.getByRole('tab', { name: new RegExp(`^${name}`) })).toHaveAttribute('aria-selected', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`${width}-${name.toLowerCase()}.png`) });
    }
  });
}
