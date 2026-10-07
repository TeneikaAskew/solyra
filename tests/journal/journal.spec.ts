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
import * as fs from 'node:fs';
import { perfBudgetMs } from '../helpers/perfBudget';
import { M } from '../helpers/mocks';
import {
  MOCK_EXAMPLES_UNION,
  MOCK_JOURNAL_EMPTY,
  MOCK_JOURNAL_TRADES,
  MOCK_JOURNAL_TRADES_WITH_ACTIVE,
  MOCK_MIXED_TRADES,
  mockJournalApi,
} from '../helpers/fixtures/journal';

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

// ── CSV download and Export to Pipeline (JOURNAL-10) ────────────────────
// Nothing else on main presses either button: the pure helpers behind them
// (tradesToCsv, exportableTrades) are unit-tested, and the fixture layer
// carries an `onExport` hook that no spec used until this one.
test.describe('Trade Journal — CSV download and Export to Pipeline', () => {
  test('CSV downloads the active view, and Export to Pipeline posts only the closed trades and reports the count', async ({ page }) => {
    const exportBodies: unknown[] = [];
    // One closed trade (2026-04-23) and one still open (2026-04-24, no exit).
    await mockJournalApi(page, {
      own: MOCK_JOURNAL_TRADES_WITH_ACTIVE,
      onExport: (body) => exportBodies.push(body),
    });
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    // `CSV`: one line per row of the ACTIVE view (the own journal has rows, so
    // that is My journal), in the pipeline's six-column tracker shape. The
    // open trade's exit cell is empty, never "null" or "—".
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV', exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('iwm_journal.csv');
    const csv = fs.readFileSync((await download.path())!, 'utf8');
    expect(csv.split('\n')).toEqual([
      'ID,Time,Trade_Type,Exit_Time,Stop_Loss_Time,Runner_Time',
      '1,2026-04-23 14:00:00,CALL,2026-04-23 15:30:00,,',
      '2,2026-04-24 09:31:00,PUT,,,',
    ]);

    // `Export to Pipeline` is drawn on My journal only. It leaves the open
    // trade out of the request (the server 422s an item with no exit) and says
    // how many it left out.
    expect(exportBodies).toEqual([]);
    await page.getByRole('button', { name: /Export to Pipeline/ }).click();
    await expect(
      page.getByText('Exported 1 closed trades · 1 not closed, skipped → iwm_trade_tracker.csv'),
    ).toBeVisible();
    expect(exportBodies).toEqual([
      {
        trades: [
          {
            id: '1',
            ticker: 'IWM',
            direction: 'CALL',
            entry_date: '2026-04-23',
            entry_time: '14:00',
            entry_price: 220,
            exit_date: '2026-04-23',
            exit_time: '15:30',
            exit_price: 222.5,
            notes: 'Breakout above PD high.',
          },
        ],
      },
    ]);
  });
});

// ── Switching the view and the session (JOURNAL-11) ─────────────────────
// The existing specs assert the default view, the toggle to an EMPTY My
// journal and the scope label's text. None asserts that the tiles and the
// table follow a picked date, that Overview restores them, or that the toggle
// swaps a non-empty set of rows.
test.describe('Trade Journal — switching the view and the session', () => {
  test('a picked session narrows the tiles and the table, Overview restores them, and the toggle swaps the rows', async ({ page }) => {
    // Own: a closed win on 2026-04-23 and an open trade on 2026-04-24.
    // Examples: two wins on 2026-04-24.
    await mockJournalApi(page, { own: MOCK_JOURNAL_TRADES_WITH_ACTIVE, examples: MOCK_EXAMPLES_UNION });
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    const closedRow = page.locator('tr', { hasText: 'Breakout above PD high.' });
    const openRow = page.locator('tr', { hasText: 'Still open — chart-marked.' });
    const date = page.locator('input[type="date"]').first();
    const openNote = page.getByText('1 open/unreturned trade(s) excluded from stats');

    // Own journal has rows, so it opens on My journal in the Overview: both
    // rows, the closed win in the tiles, the open trade counted as excluded.
    await expect(page.getByTestId('scope-label')).toHaveText(/overview: all dates/i);
    await expect(closedRow).toBeVisible();
    await expect(openRow).toBeVisible();
    await expect(page.getByText('1W / 0L')).toBeVisible();
    await expect(openNote).toBeVisible();

    // The closed trade's session: only its row, the same win, nothing excluded.
    await date.fill('2026-04-23');
    await expect(page.getByTestId('scope-label')).toHaveText(/session: 04\/23\/2026/i);
    await expect(closedRow).toBeVisible();
    await expect(openRow).toHaveCount(0);
    await expect(page.getByText('1W / 0L')).toBeVisible();
    await expect(openNote).toHaveCount(0);

    // The open trade's session: only its row, no win and no loss, and it is the
    // one excluded from the statistics.
    await date.fill('2026-04-24');
    await expect(page.getByTestId('scope-label')).toHaveText(/session: 04\/24\/2026/i);
    await expect(openRow).toBeVisible();
    await expect(closedRow).toHaveCount(0);
    await expect(page.getByText('0W / 0L')).toBeVisible();
    await expect(openNote).toBeVisible();

    // Overview restores both rows and the Overview's tiles.
    await page.getByTestId('clear-date').click();
    await expect(page.getByTestId('scope-label')).toHaveText(/overview: all dates/i);
    await expect(closedRow).toBeVisible();
    await expect(openRow).toBeVisible();
    await expect(page.getByText('1W / 0L')).toBeVisible();

    // Examples replaces the rows (and the tiles) with the Examples union, and
    // My journal brings the own rows back.
    await page.getByTestId('view-toggle').getByRole('button', { name: 'Examples' }).click();
    await expect(page.locator('tr', { hasText: 'Admin-authored example.' })).toBeVisible();
    await expect(page.locator('tr', { hasText: 'target_hit' })).toBeVisible();
    await expect(closedRow).toHaveCount(0);
    await expect(openRow).toHaveCount(0);
    await expect(page.getByText('2W / 0L')).toBeVisible();

    await page.getByTestId('view-toggle').getByRole('button', { name: 'My journal' }).click();
    await expect(closedRow).toBeVisible();
    await expect(openRow).toBeVisible();
    await expect(page.locator('tr', { hasText: 'Admin-authored example.' })).toHaveCount(0);
  });
});

// ── Error states the page renders (JOURNAL-14, Rule 4) ──────────────────
// Only some failures are rendered: the Examples read and the manual form
// (these two) and, elsewhere, the style panel and the import modal. A failed
// own-journal read, mark, exit or delete renders nothing (solyra#76); this spec
// pins what the page already does say, so that the honest states stay.
test.describe('Trade Journal — rendered error states', () => {
  test('a failed Examples read says so in a banner and in the table area, and a failed manual save keeps the form open with its error', async ({ page }) => {
    // Own journal empty, so the page opens on Examples, whose read fails.
    await mockJournalApi(page);
    await page.route('**/api/journal/examples/IWM', (r) =>
      r.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'journal temporarily unavailable' }),
      }),
    );
    let posts = 0;
    await page.route('**/api/journal/trades', (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      posts += 1;
      return r.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'create exploded' }),
      });
    });
    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    // Examples view: the amber banner and the table-area card, and not the
    // quiet "no example trades" copy a successful empty answer gets.
    const banner = page.getByTestId('examples-unavailable');
    await expect(banner).toHaveText("Examples unavailable, the journal database didn't respond.");
    await expect(page.getByText('Examples unavailable.', { exact: true })).toBeVisible();
    await expect(page.getByText(/no example trades for iwm yet/i)).toHaveCount(0);

    // The banner belongs to the Examples view only.
    await page.getByTestId('view-toggle').getByRole('button', { name: 'My journal' }).click();
    await expect(banner).toHaveCount(0);

    // A manual save that fails: the page says so, nothing is added and the
    // form stays open with what was typed.
    await page.getByRole('button', { name: /Add Trade/ }).click();
    await expect(page.getByText('New Trade: IWM')).toBeVisible();
    await page.locator('input[type="number"]').nth(0).fill('220');
    await page.locator('input[type="number"]').nth(1).fill('222.5');
    await page.getByRole('button', { name: 'Save Trade' }).click();

    await expect(page.getByText('Failed to save trade, check API connection.')).toBeVisible();
    expect(posts).toBe(1);
    await expect(page.getByText('New Trade: IWM')).toBeVisible();
    await expect(page.locator('input[type="number"]').nth(0)).toHaveValue('220');
    await expect(page.locator('input[type="number"]').nth(1)).toHaveValue('222.5');
  });
});
