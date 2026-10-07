/**
 * E2E: Signals ("/signals") — alert table with direction/strength filters.
 *
 * Payloads live in tests/helpers/fixtures/signals.ts, typed against the
 * page's own SignalsResponse / TradeStats contracts.
 */
import { test, expect } from '@playwright/test';
import type { SignalsResponse } from '@/routes/SignalsPage';
import { perfBudgetMs } from '../helpers/perfBudget';
import { M } from '../helpers/mocks';
import { MOCK_SIGNALS, MOCK_SIGNALS_EMPTY, mockSignalsApi } from '../helpers/fixtures/signals';

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

/**
 * Filter, sort, Clear and review mode (SIGNALS-05, SIGNALS-06, SIGNALS-07).
 *
 * The shared fixture's scores (4.5, 3.0 and 2.0) sit below every Min score
 * option (5+ to 8+), so the score filter would have nothing to bite on. These
 * tests keep its three rows and times (CALL 18:00, PUT 17:30, CALL 17:00 on
 * 2026-04-24) and give them scores of 7, 5 and 6.
 *
 * The rows are served oldest first, as the handler returns them (it reads the
 * newest N and orders them `time ASC`). The shared fixture lists them newest
 * first, which is the order the page's default sort would produce anyway, so
 * a fixture served that way cannot tell whether the default sort is there.
 */
const SCORED: SignalsResponse = {
  ...MOCK_SIGNALS,
  signals: MOCK_SIGNALS.signals.map((s, i) => ({ ...s, score: [7, 5, 6][i] })).reverse(),
};

test.describe('Signal Explorer: filter, sort, Clear and review mode', () => {
  test.beforeEach(async ({ page }) => {
    await mockSignalsApi(page, { signals: SCORED });
  });

  // The table's own cells, read column by column: Time is the first, Dir the
  // second and Score the third.
  const cells = (page: import('@playwright/test').Page, n: number) =>
    page.locator(`tbody tr td:nth-child(${n})`);

  test('the direction buttons, Min score, the date range and the column headers act on the fetched rows', async ({ page }) => {
    await page.goto('/signals');
    const rows = page.locator('tbody tr');
    const label = page.locator('h1 + div');
    await expect(rows).toHaveCount(3);
    // The rows arrive oldest first; the page's default sort (Time descending) shows them newest first.
    await expect(cells(page, 1)).toHaveText(['2026-04-24 18:00', '2026-04-24 17:30', '2026-04-24 17:00']);
    await expect(label).toHaveText('IWM · 3 signals');

    // Direction: PUT leaves the 17:30 row, and the label counts the rows left.
    await page.getByRole('button', { name: 'PUT', exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(cells(page, 1)).toHaveText(['2026-04-24 17:30']);
    await expect(label).toHaveText('IWM · 3 signals · 1 shown');
    await page.getByRole('button', { name: 'ALL', exact: true }).click();
    await expect(rows).toHaveCount(3);

    // Min score keeps rows at or above the chosen score: 6+ is 7 and 6, 7+ is 7, 8+ is none.
    const minScore = page.locator('select');
    await minScore.selectOption('6');
    await expect(cells(page, 3)).toHaveText(['7.0', '6.0']);
    await minScore.selectOption('7');
    await expect(cells(page, 3)).toHaveText(['7.0']);
    await minScore.selectOption('8');
    await expect(rows).toHaveCount(0);
    await expect(page.getByText('No signals match your filters')).toBeVisible();
    await minScore.selectOption('0');
    await expect(rows).toHaveCount(3);

    // Date range: the date part of the stored time against From and To, both ends inclusive.
    const [from, to] = [page.locator('input[type="date"]').nth(0), page.locator('input[type="date"]').nth(1)];
    await from.fill('2026-04-25');
    await expect(rows).toHaveCount(0);
    await from.fill('2026-04-24');
    await expect(rows).toHaveCount(3);
    await to.fill('2026-04-23');
    await expect(rows).toHaveCount(0);
    await to.fill('2026-04-24');
    await expect(rows).toHaveCount(3);

    // Sort: a first click on Score is descending, a second ascending.
    await page.getByRole('columnheader', { name: 'Score' }).click();
    await expect(cells(page, 3)).toHaveText(['7.0', '6.0', '5.0']);
    await page.getByRole('columnheader', { name: 'Score' }).click();
    await expect(cells(page, 3)).toHaveText(['5.0', '6.0', '7.0']);
    // Sort and filter compose: CALL only, still in the ascending order of Score.
    await page.getByRole('button', { name: 'CALL', exact: true }).click();
    await expect(cells(page, 2)).toHaveText(['CALL', 'CALL']);
    await expect(cells(page, 3)).toHaveText(['6.0', '7.0']);
  });

  test('Clear shows only while a filter is set and resets the direction, Min score and both dates', async ({ page }) => {
    await page.goto('/signals');
    const rows = page.locator('tbody tr');
    const clear = page.getByRole('button', { name: 'Clear', exact: true });
    const [from, to] = [page.locator('input[type="date"]').nth(0), page.locator('input[type="date"]').nth(1)];
    await expect(rows).toHaveCount(3);
    await expect(clear).toHaveCount(0);

    await page.getByRole('button', { name: 'CALL', exact: true }).click();
    await expect(clear).toBeVisible();
    await page.locator('select').selectOption('7');
    await from.fill('2026-04-01');
    await to.fill('2026-04-30');
    await expect(rows).toHaveCount(1);
    // Sorting is not a filter: Clear leaves it alone.
    await page.getByRole('columnheader', { name: 'Score' }).click();

    await clear.click();
    await expect(clear).toHaveCount(0);
    await expect(rows).toHaveCount(3);
    await expect(page.locator('select')).toHaveValue('0');
    await expect(from).toHaveValue('');
    await expect(to).toHaveValue('');
    await expect(page.locator('h1 + div')).toHaveText('IWM · 3 signals');
    await expect(page.getByRole('button', { name: 'ALL', exact: true })).toHaveClass(/bg-\[var\(--color-accent-blue\)\]/);
    await expect(page.getByRole('button', { name: 'CALL', exact: true })).not.toHaveClass(/bg-\[var\(--color-accent-blue\)\]/);
    await expect(page.locator('tbody tr td:nth-child(3)')).toHaveText(['7.0', '6.0', '5.0']);
  });

  test('review mode asks the API for the cutoff, locks the To date under a global tag and gives it back', async ({ page }) => {
    // Registered after mockSignalsApi, so it answers first: it records the query string.
    const asked: string[] = [];
    await page.route('**/api/signals/IWM*', (r) => {
      asked.push(new URL(r.request().url()).search);
      return r.fulfill(M.ok(SCORED));
    });
    // The Replay control's "Latest session close" is the last weekday before now, in Eastern time.
    await page.clock.install({ time: new Date('2026-04-24T16:30:00-04:00') });
    await page.goto('/signals');
    const to = page.locator('input[type="date"]').nth(1);
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await expect(to).toBeEnabled();
    await expect(page.getByText('global', { exact: true })).toHaveCount(0);
    expect(asked).toEqual(['?limit=5000']);

    await page.getByTestId('replay-toggle').click();
    await page.getByRole('button', { name: 'Latest session close' }).click();
    await page.getByTestId('replay-apply').click();

    await expect(to).toBeDisabled();
    await expect(to).toHaveValue('2026-04-24');
    await expect(to).toHaveAttribute('title', /Set by global historical mode/);
    await expect(page.getByText('global', { exact: true })).toBeVisible();
    await expect.poll(() => asked.at(-1)).toBe('?limit=5000&end_date=2026-04-24&end_time=16%3A00');

    await page.getByTestId('replay-clear').click();
    await expect(to).toBeEnabled();
    await expect(to).toHaveValue('');
    await expect(page.getByText('global', { exact: true })).toHaveCount(0);
  });
});
