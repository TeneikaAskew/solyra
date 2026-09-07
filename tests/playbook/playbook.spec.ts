/**
 * E2E: Playbook ("/playbook") — top setup, conditions checklist, FTFC strat.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { mockCommon, M } from '../helpers/mocks';

const SPEC_LOCAL_PLAYBOOK = {
  ticker: 'IWM',
  source: 'cloud_sql',
  // Card-set date + server-judged age (#861) — rendered next to the count.
  analysis_date: '2026-09-05',
  generated_at: '2026-09-05T08:41:12+00:00',
  age_days: 1,
  max_age_days: 7,
  cards: [
    {
      id: 'long_breakout_pd',
      name: 'Long breakout above PD high',
      direction: 'long',
      win_rate: 0.62,
      avg_return: 0.85,
      conditions: ['price > prior_high', 'volume > avg', 'EMA9 > EMA20'],
      description: 'Triggers when IWM breaks the prior-day high with above-average volume.',
    },
  ],
};

const MOCK_REFERENCE = {
  ticker: 'IWM',
  date: '2026-04-25',
  reference_levels: { prior_high: 222.0, prior_low: 218.0, vwap: 220.5 },
};

test.describe('Playbook', () => {
  test.beforeEach(async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/playbook/IWM', (r) => r.fulfill(M.ok(SPEC_LOCAL_PLAYBOOK)));
    await page.route('**/api/market/reference/IWM/*', (r) => r.fulfill(M.ok(MOCK_REFERENCE)));
    await page.route('**/api/signals/IWM*', (r) =>
      r.fulfill(M.ok({ ticker: 'IWM', count: 0, signals: [] }))
    );
  });

  test('renders ticker playbook heading', async ({ page }) => {
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /IWM.*Playbook|Playbook/i }).first()).toBeVisible();
  });

  test('shows setup with conditions', async ({ page }) => {
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/long breakout/i)).toBeVisible();
  });

  test('shows empty-state when no cards', async ({ page }) => {
    await page.route('**/api/playbook/IWM', (r) =>
      r.fulfill(M.ok({ ticker: 'IWM', cards: [] }))
    );
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/no playbook|no.*card|run.*pipeline|empty/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 7s)', async ({ page }) => {
    // Slightly looser than 5s — playbook page does signals + reference + brief
    // fanout, so it sits at the cold-warm transition boundary.
    const start = Date.now();
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(7000));
  });
  test('shows the card set date and age next to the setup count', async ({ page }) => {
    await page.goto('/playbook');
    await expect(page.getByTestId('playbook-age')).toHaveText(/1 setups · as of Sep 5, 2026 \(1d old\)/, {
      timeout: 10_000,
    });
  });

  test('a stale card set (503) is reported with the server reason, not rendered', async ({ page }) => {
    const detail =
      'playbook_cards for IWM is stale: latest analysis_date 2026-06-13 is 85 days old ' +
      '(today; max 7). Refusing to render stale setups as current — run the phase6-playbook Cloud Run job.';
    await page.route('**/api/playbook/IWM', (r) =>
      r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail }) })
    );
    await page.goto('/playbook');
    await expect(page.getByText(/playbook unavailable for IWM/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/2026-06-13 is 85 days old/)).toBeVisible();
    await expect(page.getByText('Long breakout above PD high')).toHaveCount(0);
  });
});
