/**
 * E2E: Broker CSV import (Task 7 of the journal one-stop-shop program).
 *
 * The Import button on /journal opens a 3-step modal:
 *   1. broker chip (Robinhood/Webull native; Schwab/Fidelity/IBKR/Other ->
 *      generic column-mapper) + file drop -> POST /api/journal/import/preview
 *   2. preview table (checkbox per row, duplicates pre-unchecked + labeled,
 *      active-import rows amber-labeled) + skipped list with honest reasons
 *   3. commit result ("Imported N · M duplicates skipped") -> journal
 *      queries invalidated (GET /api/journal/trades/{ticker} re-hit)
 *
 * The mocked preview/commit payloads below are grounded in
 * `platform/tests/fixtures/robinhood_sample.csv` (copy of the Task-2 fixture
 * `tests/fixtures/broker_csv/robinhood_sample.csv`): that CSV's 9 data rows
 * produce, via `lib/broker_import.py`'s real parse+FIFO-pair pipeline,
 * exactly 3 paired trades (IWM CALL closed, SPY PUT closed, QQQ CALL still
 * active — no matching STC) and 4 skips (a shares row, a short option, a
 * dividend code, a blank-ticker cash-transfer row) — see that module's
 * docstring points 1-4. The mock additionally marks the IWM row `duplicate:
 * true` to exercise the pre-unchecked/labeled duplicate path in the same
 * preview (a real duplicate would come from `_existing_entry_keys` matching
 * an already-imported IWM row — plausible on a second import of an
 * overlapping statement).
 */
import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { M } from '../helpers/mocks';
import {
  MOCK_IMPORT_COMMIT,
  MOCK_IMPORT_PREVIEW,
  mockJournalApi,
} from '../helpers/fixtures/journal';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROBINHOOD_FIXTURE = path.join(__dirname, '..', 'fixtures', 'robinhood_sample.csv');

/**
 * The import modal lives on /journal, so the page needs its full first-paint
 * surface mocked. `onOwnTradesFetch` counts GETs of the own-journal route so
 * the specs can assert the post-commit query invalidation actually refetched.
 */
async function mockJournalImportPage(
  page: import('@playwright/test').Page,
  opts: { ownTradesCounter: { count: number } }
) {
  await mockJournalApi(page, {
    onOwnTradesFetch: () => {
      opts.ownTradesCounter.count += 1;
    },
  });
}

test.describe('Broker CSV import', () => {
  test('upload -> preview (duplicate + active labels) -> commit -> success copy + journal refetch', async ({
    page,
  }) => {
    const ownTradesCounter = { count: 0 };
    await mockJournalImportPage(page, { ownTradesCounter });

    let previewRequestWasMultipart = false;
    await page.route('**/api/journal/import/preview', async (route) => {
      const req = route.request();
      previewRequestWasMultipart = (req.headers()['content-type'] ?? '').includes('multipart/form-data');
      await route.fulfill(M.ok(MOCK_IMPORT_PREVIEW));
    });

    let commitBody: unknown = null;
    await page.route('**/api/journal/import/commit', async (route) => {
      commitBody = route.request().postDataJSON();
      await route.fulfill(M.ok(MOCK_IMPORT_COMMIT));
    });

    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    // Own journal starts empty -> defaults to Examples view.
    await expect(page.getByTestId('ex-badge')).toHaveCount(0); // no examples in this fixture set either
    // React StrictMode double-invokes effects in dev, so the initial GET
    // count may be 1 or 2 — snapshot it rather than asserting an exact
    // value, then prove invalidation by an INCREASE after commit below.
    const initialOwnTradesCount = ownTradesCounter.count;
    expect(initialOwnTradesCount).toBeGreaterThanOrEqual(1);

    // Import button lives in the trades-section header, visible in every view.
    await page.getByTestId('import-trades-btn').click();
    await expect(page.getByText(/import trades from broker/i)).toBeVisible();

    // Step 1: broker chip + file.
    await page.getByRole('button', { name: 'Robinhood' }).click();
    await page.setInputFiles('[data-testid="import-file-input"]', ROBINHOOD_FIXTURE);
    await page.getByRole('button', { name: /^Preview$/ }).click();

    expect(previewRequestWasMultipart).toBe(true);

    // Step 2: preview table.
    const table = page.getByTestId('import-preview-table');
    await expect(table).toBeVisible();

    const iwmRow = table.locator('tr', { hasText: 'IWM' });
    await expect(iwmRow.getByText(/duplicate.*already in journal/i)).toBeVisible();
    await expect(iwmRow.getByRole('checkbox')).not.toBeChecked();

    const qqqRow = table.locator('tr', { hasText: 'QQQ' });
    await expect(qqqRow.getByText(/imports as active/i)).toBeVisible();
    await expect(qqqRow.getByRole('checkbox')).toBeChecked();

    const spyRow = table.locator('tr', { hasText: 'SPY' });
    await expect(spyRow.getByRole('checkbox')).toBeChecked();
    await expect(spyRow.getByText(/duplicate/i)).toHaveCount(0);
    await expect(spyRow.getByText(/imports as active/i)).toHaveCount(0);

    // Skipped list — honest per-row reasons, never a silent drop.
    const skippedList = page.getByTestId('import-skipped-list');
    await expect(skippedList).toContainText('shares — options only in v1');
    await expect(skippedList).toContainText('short options not supported');
    await expect(skippedList).toContainText('unsupported activity type: CDIV');
    await expect(skippedList).toContainText('unsupported activity type: ACH');

    // Re-check the duplicate row so the commit exercises all 3 rows and the
    // mocked server-side re-detection (skipped_duplicates: 1) is meaningful.
    await iwmRow.getByRole('checkbox').check();

    await page.getByRole('button', { name: /^Import 3 trades$/ }).click();

    // Step 3: result copy.
    await expect(page.getByText('Imported 2 · 1 duplicates skipped')).toBeVisible();

    expect(commitBody).not.toBeNull();
    const body = commitBody as { broker: string; trades: unknown[] };
    expect(body.broker).toBe('robinhood');
    expect(body.trades).toHaveLength(3);

    // Journal query was invalidated -> GET refetched (own view still empty,
    // but the fetch count proves the invalidation happened).
    await expect
      .poll(() => ownTradesCounter.count, { timeout: 10_000 })
      .toBeGreaterThan(initialOwnTradesCount);

    // Import always writes to MY journal — successful commit flips the view
    // even though the caller started in Examples (same pattern as marking).
    await expect(page.getByText(/no trades logged for iwm yet/i)).toBeVisible();

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText(/import trades from broker/i)).not.toBeVisible();
  });

  test('preview failure (422) surfaces loudly, never silently swallowed', async ({ page }) => {
    const ownTradesCounter = { count: 0 };
    await mockJournalImportPage(page, { ownTradesCounter });

    await page.route('**/api/journal/import/preview', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'could not detect broker from CSV header; specify broker + mapping' }),
      });
    });

    await page.goto('/journal');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('import-trades-btn').click();
    await page.getByRole('button', { name: 'Robinhood' }).click();
    await page.setInputFiles('[data-testid="import-file-input"]', ROBINHOOD_FIXTURE);
    await page.getByRole('button', { name: /^Preview$/ }).click();

    await expect(page.getByText(/could not detect broker from csv header/i)).toBeVisible();
    // Still on step 1 — no fabricated empty preview rendered.
    await expect(page.getByTestId('import-preview-table')).toHaveCount(0);
  });
});
