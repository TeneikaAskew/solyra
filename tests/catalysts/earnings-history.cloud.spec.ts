import { test, expect } from '@playwright/test';
import { parseEarningsHistory, parseEarningsLean, historicalPercent } from '@/components/catalysts/earningsContract';

// Owner-run only after reviewed backend/frontend deployment and interactive cloud sign-in.
// No mockCommon, route fulfilment, provider calls or client financial recomputation.
test('deployed earnings section agrees with its real API responses', async ({ page }, info) => {
  test.skip(info.project.name !== 'cloud', 'Requires the owner-run deployed cloud project.');
  const historyResponse = page.waitForResponse(r => /\/api\/earnings\/history\/[^/?]+\?limit=20$/.test(r.url()));
  const leanResponse = page.waitForResponse(r => /\/api\/earnings\/ticker\/[^/]+\/lean$/.test(r.url()));
  await page.goto('/catalysts');
  await expect(page.getByTestId('signin-screen')).toHaveCount(0);
  await expect(page.getByTestId('mock-mode-banner')).toHaveCount(0);
  const [hr, lr] = await Promise.all([historyResponse, leanResponse]);
  expect(hr.status(), 'A qualified real event is required for deployed positive acceptance').toBe(200);
  expect(lr.status(), 'A qualified real summary is required for deployed positive acceptance').toBe(200);
  const ticker = decodeURIComponent(new URL(hr.url()).pathname.split('/').pop()!);
  expect(ticker).not.toBe('DEMO');
  const history = parseEarningsHistory(await hr.json(), ticker);
  const lean = parseEarningsLean(await lr.json(), ticker);
  const summary = lean.daily_path_summary_v1;
  expect(summary, 'Missing additive backend contract is a closeout blocker, not fabricated proof').toBeTruthy();
  expect(summary!.qualified_native_n).toBeGreaterThan(0);
  expect(history.rows.length).toBeGreaterThan(0);
  const panel = page.getByTestId('earnings-history');
  await expect(panel.getByRole('heading', { name: `Earnings history — ${ticker}` })).toBeVisible();
  await expect(panel.getByTestId('earnings-native-percentages')).toContainText(`${summary!.qualified_native_n}`);
  await expect(panel.getByTestId('earnings-native-percentages')).toContainText(historicalPercent(summary!.historical_direction_consistency_pct));
  await expect(panel.getByTestId('earnings-native-percentages')).toContainText(historicalPercent(summary!.historical_upward_opening_gap_pct));
  await expect(panel.getByTestId('earnings-events').locator('tbody tr')).toHaveCount(history.count);
  await page.screenshot({ path: info.outputPath('earnings-real-api-rendered.png'), fullPage: true });
});
