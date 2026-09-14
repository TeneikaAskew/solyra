/**
 * E2E: Dashboard ("/dashboard") — the app's home view anchored on activeTicker.
 *
 * Covers brief tile, latest signals, KPI grid, best/worst trades.
 * All API calls mocked; perf budget policy lives in helpers/perfBudget.ts.
 *
 * Card/chart payloads (sectors, news, bars, backtest trio) come from the
 * typed fixture layer in helpers/fixtures/dashboard.ts — the spec carries no
 * inline copies, so the shapes stay pinned by `satisfies` in one place (#18).
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { M } from '../helpers/mocks';
import {
  mockDashboard,
  mockDashboardCards,
  MOCK_PLAYBOOK_FRESH,
  MOCK_PLAYBOOK_STALE_DETAIL,
  MOCK_SECTORS,
  buildDashboardNews,
} from '../helpers/fixtures/dashboard';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboard(page);
    await mockDashboardCards(page);
  });

  test('renders Overview heading + pre-market brief for the active ticker', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Redesigned Overview: "Overview" H1, the active ticker in the header
    // micro-label + hero, and the pre-market brief panel.
    await expect(page.locator('h1', { hasText: 'Overview' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/pre-market brief/i).first()).toBeVisible();
    await expect(page.getByText('IWM').first()).toBeVisible();
  });

  test('shows daily bias card', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/daily bias/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows the daily KPI tiles (prev close / latest close / 2-day change / RSI)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Redesigned KPI row, computed from brief.daily_indicators + reference.
    await expect(page.getByText(/prev close/i)).toBeVisible();
    await expect(page.getByText(/latest close/i)).toBeVisible();
    await expect(page.getByText(/2-day change/i)).toBeVisible();
    await expect(page.getByText(/RSI \(14\)/i)).toBeVisible();
  });

  test('intraday chart exposes the Candles / Area toggle and switches', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('IWM · intraday')).toBeVisible({ timeout: 10_000 });
    const candles = page.getByRole('button', { name: 'Candles' });
    const area = page.getByRole('button', { name: 'Area' });
    await expect(candles).toBeVisible();
    await expect(area).toBeVisible();
    // Switching to Area renders the Recharts area surface without crashing.
    await area.click();
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible({ timeout: 5_000 });
  });

  test('sector rotation card ranks sectors, shows an em-dash row, and 1D/5D toggle switches values', async ({ page }) => {
    await page.route('**/api/market/sectors', (r) => r.fulfill(M.ok(MOCK_SECTORS)));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('sector-rotation-card');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // as-of caption in the header meta.
    await expect(card).toContainText(`as of ${MOCK_SECTORS.as_of}`);

    // 1D (default): ranked desc by chg_1d_pct — XLF (2.5) > XLK (1.25) > XLE (-0.75),
    // unavailable XLY sinks to the bottom.
    let rows = await card.getByTestId('sector-row').allTextContents();
    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain('Financials');
    expect(rows[1]).toContain('Technology');
    expect(rows[2]).toContain('Energy');
    expect(rows[3]).toContain('Consumer Discretionary');
    expect(rows[3]).toContain('—');

    // Toggle to 5D — ranked desc by chg_5d_pct — XLE (4.2) > XLK (3.4) > XLF (-1.1).
    await card.getByRole('button', { name: '5D' }).click();
    rows = await card.getByTestId('sector-row').allTextContents();
    expect(rows[0]).toContain('Energy');
    expect(rows[1]).toContain('Technology');
    expect(rows[2]).toContain('Financials');
    expect(rows[3]).toContain('Consumer Discretionary');
  });

  test('News card counts AV-news rows dated in the past and shows both headlines', async ({ page }) => {
    // Explicit re-registration (fixture default): this test's assertions pin
    // the news-card match condition (`source === 'AV news'` over the FULL
    // events array — see the fixture's docstring), so its dependency on the
    // payload stays visible here even though mockDashboardCards already
    // serves the same rows.
    await page.route('**/api/catalysts/events**', (r) => r.fulfill(M.ok(buildDashboardNews())));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const newsCard = page.getByTestId('news-card');
    await expect(page.getByText('2 fresh')).toBeVisible({ timeout: 10_000 });
    await expect(newsCard.getByText('Russell 2000 constituents rally on rate-cut optimism')).toBeVisible();
    await expect(newsCard.getByText('Small-cap earnings season kicks off with mixed guidance')).toBeVisible();
  });

  test('renders within perf budget (strict 7s)', async ({ page }) => {
    // Dashboard has heavy API fan-out (brief + backtest + equity + signals +
    // playbook + live quote/history/avg-vol + reference). 7s allows for the
    // first-paint waterfall before mocks fully resolve.
    const start = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(7000));
  });
  // #861 — playbook_cards went 85 days stale and the top setup rendered the
  // June card set as today's. The server now sends the set's date and
  // refuses a stale one; the tile must show the date and surface the refusal.
  test('top setup shows the card set date and age', async ({ page }) => {
    await page.route('**/api/playbook/IWM', (r) => r.fulfill(M.ok(MOCK_PLAYBOOK_FRESH)));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(MOCK_PLAYBOOK_FRESH.cards[0].name)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('playbook-age')).toHaveText(/as of Sep 5, 2026 \(1d old\)/);
  });

  test('top setup surfaces the stale-cards refusal instead of a generic empty state', async ({ page }) => {
    await page.route('**/api/playbook/IWM', (r) =>
      r.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAYBOOK_STALE_DETAIL),
      })
    );
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/playbook unavailable/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/2026-06-13 is 85 days old/)).toBeVisible();
    await expect(page.getByText(/run the pipeline to populate/i)).toHaveCount(0);
  });
});
