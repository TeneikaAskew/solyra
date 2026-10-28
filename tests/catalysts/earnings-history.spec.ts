import { test, expect } from '@playwright/test';
import { mockCatalystsApi } from '../helpers/fixtures/catalysts';
import { MOCK_EARNINGS_HISTORY, MOCK_EARNINGS_LEAN } from '@/mocks/earnings';
import { M } from '../helpers/mocks';

test.describe('Existing-app earnings history', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ticker-store', JSON.stringify({
      state: { activeTicker: 'DEMO', recentTickers: [] }, version: 0,
    })));
    await mockCatalystsApi(page, { earningsHistory: MOCK_EARNINGS_HISTORY, earningsLean: MOCK_EARNINGS_LEAN });
  });

  test('shows actual endpoint data as historical percentages and distinct daily outcomes', async ({ page }, info) => {
    const requests: string[] = [];
    page.on('request', r => { if (r.url().includes('/api/earnings/')) requests.push(r.url()); });
    await page.goto('/catalysts');
    const panel = page.getByTestId('earnings-history');
    await expect(panel.getByRole('heading', { name: 'Earnings history — DEMO' })).toBeVisible();
    await expect(panel.getByTestId('earnings-native-percentages')).toContainText('75%');
    await expect(panel.getByTestId('earnings-native-percentages')).toContainText('50%');
    await expect(panel.getByText('Closing step 4 · 2026-01-09')).toBeVisible();
    await expect(panel.getByText('Not observed by 2025-10-09')).toBeVisible();
    await expect(panel.getByRole('columnheader', { name: 'Native 5-day sustain' })).toBeVisible();
    expect(requests.some(s => s.includes('/history/DEMO?limit=20'))).toBe(true);
    expect(requests.some(s => s.includes('/ticker/DEMO/lean'))).toBe(true);
    await page.screenshot({ path: info.outputPath('earnings-qualified-synthetic.png'), fullPage: true });
  });

  test('missing additive backend fields remain unavailable while native events stay visible', async ({ page }, info) => {
    const history = structuredClone(MOCK_EARNINGS_HISTORY);
    for (const row of history.rows) delete (row as { daily_path_v1?: unknown }).daily_path_v1;
    await page.route('**/api/earnings/history/*', r => r.fulfill(M.ok(history)));
    await page.route('**/api/earnings/ticker/*/lean', r => r.fulfill(M.ok({ ticker: 'DEMO' })));
    await page.goto('/catalysts');
    const panel = page.getByTestId('earnings-history');
    await expect(panel.getByText('Qualified historical summary unavailable.', { exact: false })).toBeVisible();
    await expect(panel.getByRole('cell', { name: '+10.00%', exact: true })).toBeVisible();
    await expect(panel.getByText('Unavailable — no qualified daily path').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath('earnings-rolling-unavailable.png'), fullPage: true });
  });

  test('503 history does not become empty success or erase an independent summary', async ({ page }) => {
    await page.route('**/api/earnings/history/*', r => r.fulfill({ status: 503,
      contentType: 'application/json', body: JSON.stringify({ detail: 'database unavailable' }) }));
    await page.goto('/catalysts');
    const panel = page.getByTestId('earnings-history');
    await expect(panel.getByRole('alert')).toContainText('503');
    await expect(panel.getByTestId('earnings-native-percentages')).toContainText('75%');
    await expect(panel.getByText('The backend returned an explicitly empty stored history.')).toHaveCount(0);
  });

  test('foreign ticker data is a visible contract error, not a mislabeled history', async ({ page }) => {
    await page.route('**/api/earnings/history/*', r => r.fulfill(M.ok({ ...MOCK_EARNINGS_HISTORY, ticker: 'OTHER' })));
    await page.goto('/catalysts');
    const panel = page.getByTestId('earnings-history');
    await expect(panel.getByRole('alert')).toContainText('ticker');
    await expect(panel.getByTestId('earnings-events')).toHaveCount(0);
  });

  for (const status of [401, 403, 404]) {
    test(`history HTTP ${status} remains explicit without erasing the summary`, async ({ page }) => {
      await page.route('**/api/earnings/history/*', r => r.fulfill({ status,
        contentType: 'application/json', body: JSON.stringify({ detail: `refused ${status}` }) }));
      await page.goto('/catalysts');
      const panel = page.getByTestId('earnings-history');
      await expect(panel.getByTestId('earnings-native-percentages')).toContainText('75%');
      await expect(panel.getByTestId('earnings-events')).toHaveCount(0);
      if (status === 401) await expect(panel.getByText('Sign in', { exact: false }).first()).toBeVisible();
      else if (status === 404) await expect(panel.getByText('Stored event history unavailable', { exact: false })).toBeVisible();
      else await expect(panel.getByRole('alert')).toContainText('403');
    });
  }

  test('unsupported summary version refuses only that endpoint', async ({ page }) => {
    const lean = structuredClone(MOCK_EARNINGS_LEAN);
    await page.route('**/api/earnings/ticker/*/lean', r => r.fulfill(M.ok({ ...lean,
      daily_path_summary_v1: { ...lean.daily_path_summary_v1, version: 'unrecognized-v2' } })));
    await page.goto('/catalysts');
    const panel = page.getByTestId('earnings-history');
    await expect(panel.getByRole('alert')).toContainText('version');
    await expect(panel.getByTestId('earnings-native-percentages')).toHaveCount(0);
    await expect(panel.getByTestId('earnings-events')).toBeVisible();
  });

  test('signed-out Firebase mode dispatches no earnings requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', r => { if (r.url().includes('/api/earnings/')) requests.push(r.url()); });
    await page.route('**/api/config/firebase', r => r.fulfill(M.ok({ authMode: 'firebase',
      firebase: { apiKey: 'AIzaSyFAKE-key-for-tests-000000000000000', authDomain: 'demo-test.firebaseapp.com',
        projectId: 'demo-test', appId: '1:1234567890:web:abcdef0123456789' } })));
    await page.goto('/catalysts');
    await expect(page.getByTestId('signin-screen')).toBeVisible();
    expect(requests).toEqual([]);
    await expect(page.getByTestId('earnings-history')).toHaveCount(0);
  });

  test('a late prior-ticker history cannot populate the newly selected ticker', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let received!: () => void;
    const started = new Promise<void>(resolve => { received = resolve; });
    await page.route('**/api/earnings/history/DEMO?*', async r => {
      received();
      await gate;
      await r.fulfill(M.ok(MOCK_EARNINGS_HISTORY));
    });
    await page.goto('/catalysts');
    await started;
    // Exercise the same production store action while the section remains mounted.
    await page.evaluate(async () => {
      const path = '/src/stores/tickerStore.ts';
      const module = await import(/* @vite-ignore */ path);
      module.useTickerStore.getState().setTicker('OTHER');
    });
    const panel = page.getByTestId('earnings-history');
    await expect(panel.getByRole('heading', { name: 'Earnings history — OTHER' })).toBeVisible();
    await expect(panel.getByText('Stored event history unavailable', { exact: false })).toBeVisible();
    release();
    await expect(panel.getByTestId('earnings-events')).toHaveCount(0);
    await expect(panel.getByTestId('earnings-native-percentages')).toHaveCount(0);
  });

  test('a verified IAP identity change does not reuse the previous account history', async ({ page }) => {
    await page.clock.install();
    let account = 'first@example.test';
    await page.route('**/api/config/firebase', r => r.fulfill(M.ok({ authMode: 'iap', firebase: null })));
    await page.route('**/api/me', r => r.fulfill(M.ok({ email: account, is_admin: false })));
    await page.route('**/api/earnings/history/*', r => r.fulfill(account.startsWith('first')
      ? M.ok(MOCK_EARNINGS_HISTORY) : M.notFound()));
    await page.route('**/api/earnings/ticker/*/lean', r => r.fulfill(account.startsWith('first')
      ? M.ok(MOCK_EARNINGS_LEAN) : M.notFound()));
    await page.goto('/catalysts');
    const panel = page.getByTestId('earnings-history');
    await expect(panel.getByTestId('earnings-events')).toBeVisible();
    account = 'second@example.test';
    // Let the existing /me cache become stale, then exercise its normal focus revalidation.
    await page.clock.fastForward(31_000);
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    await expect(panel.getByText('Stored event history unavailable', { exact: false })).toBeVisible();
    await expect(panel.getByTestId('earnings-events')).toHaveCount(0);
    await expect(panel.getByTestId('earnings-native-percentages')).toHaveCount(0);
  });
});
