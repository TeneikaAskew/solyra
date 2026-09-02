/**
 * E2E: Trade Journal ("/journal") — list trades, add/delete, export CSV.
 *
 * Payloads live in tests/helpers/fixtures/journal.ts, typed against
 * useJournalChartTrades.ts's JournalRow. The fixture this spec used to carry
 * for the closed trade was off-contract (`trade_id`/`shares`/`pnl`,
 * `direction: 'long'`) while its sibling in the same file used the real
 * shape; both are now the one typed fixture.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from './helpers/perfBudget';
import { M } from './helpers/mocks';
import {
  MOCK_JOURNAL_EMPTY,
  MOCK_JOURNAL_TRADES,
  MOCK_JOURNAL_TRADES_WITH_ACTIVE,
  MOCK_MIXED_TRADES,
  mockJournalApi,
} from './helpers/fixtures/journal';

test.describe('Trade Journal', () => {
  test.beforeEach(async ({ page }) => {
    // Empty dates → the chart card's honest no-data state; empty Examples →
    // the legacy own-journal assertions stay meaningful.
    await mockJournalApi(page, { own: MOCK_JOURNAL_TRADES });
  });

  test('renders journal heading', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /journal/i }).first()).toBeVisible();
  });

  test('lists existing trades', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/breakout above pd high/i)).toBeVisible();
  });

  test('shows empty state when no trades', async ({ page }) => {
    await page.route('**/api/journal/trades/IWM*', (r) => r.fulfill(M.ok(MOCK_JOURNAL_EMPTY)));
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    // Task 5 structural re-anchor: an empty own journal now DEFAULTS to the
    // Examples view (design spec "Views"), and the mocked Examples set is
    // empty too — the honest examples empty state satisfies the original
    // /no.*trade/ assertion. Toggling to My journal shows the own empty
    // state, which is the surface the original test pinned.
    await expect(page.getByText(/no.*trade|empty|add.*trade/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'My journal' }).click();
    await expect(page.getByText(/no trades logged for iwm yet/i)).toBeVisible();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });

  test('equity curve card shows a placeholder when under 2 closed trades', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');
    // .first(): both the card heading and the placeholder text match
    // /equity curve/i — strict mode would reject the bare locator.
    await expect(page.getByText(/equity curve/i).first()).toBeVisible();
    await expect(page.getByText(/close 2\+ trades to see your equity curve/i)).toBeVisible();
  });

  test('renders an active (null-exit) trade alongside a closed one without crashing', async ({ page }) => {
    await page.route('**/api/journal/trades/IWM*', (r) =>
      r.fulfill(M.ok(MOCK_JOURNAL_TRADES_WITH_ACTIVE))
    );
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    // Both trades render — the closed one and the active (null-exit) one.
    await expect(page.getByText(/breakout above pd high/i)).toBeVisible();
    await expect(page.getByText(/still open — chart-marked/i)).toBeVisible();

    // The active row shows a status chip explaining the dashes.
    await expect(page.getByText('active', { exact: true })).toBeVisible();
  });
});

// ── Task 5.3: practice-trade (bar-replay-trainer) analytics hygiene ──────
// Mixed manual + replay rows: source:'replay' entries are excluded from
// every stats aggregate by default, foldable back in via the "Include
// practice sessions" toggle.
test.describe('Trade Journal — practice-trade analytics hygiene (Task 5.3)', () => {
  test.beforeEach(async ({ page }) => {
    await mockJournalApi(page, { own: MOCK_MIXED_TRADES });
  });

  test('excludes replay trades from stats by default; toggle folds them in; exclusion note mentions practice trades', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    // Default: only the manual trade counts. avg == total == its own return
    // (a single trade), and the Trades tile sub-label reads 1W/0L.
    await expect(page.getByText('+10.00%').first()).toBeVisible();
    await expect(page.getByText('1W / 0L')).toBeVisible();
    const note = page.getByTestId('replay-exclusion-note');
    await expect(note).toBeVisible();
    await expect(note).toHaveText(/practice trade/i);

    // Toggle on -> both trades count. avg return flips to a DIFFERENT
    // specific number: (10 + -50) / 2 = -20.00%; total P&L = -40.00%;
    // Trades tile sub-label becomes 1W/1L.
    await page.getByTestId('include-replay-toggle').check();
    await expect(page.getByText('-20.00%').first()).toBeVisible();
    await expect(page.getByText('-40.00%')).toBeVisible();
    await expect(page.getByText('1W / 1L')).toBeVisible();
    await expect(note).not.toBeVisible();
  });

  // Task 7 carried item (T6 review, Important): source==='replay' rows get a
  // muted "practice" badge next to the direction cell in the trade table —
  // same visual weight as the existing "active" badge, so a practice trade
  // is visually distinguishable from a real one even when its stats are
  // folded into the aggregates via the toggle above. MOCK_MIXED_TRADES is
  // the one fixture with a real source:'replay' row rendered in the table.
  test('replay-sourced rows carry a muted "practice" badge next to the direction cell', async ({ page }) => {
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    const replayRow = page.locator('tr', { hasText: 'Practice replay trade.' });
    await expect(replayRow.getByText('practice', { exact: true })).toBeVisible();

    // The manual (non-replay) row must NOT carry the badge.
    const manualRow = page.locator('tr', { hasText: 'Manual win trade.' });
    await expect(manualRow.getByText('practice', { exact: true })).toHaveCount(0);
  });
});
