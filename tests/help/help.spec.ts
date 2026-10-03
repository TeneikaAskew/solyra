/**
 * E2E: Help & Glossary ("/help") — static page, search-filterable terms.
 */
import { test, expect, type Page } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { mockHelpApi } from '../helpers/fixtures/help';

test.describe('Help & Glossary', () => {
  test.beforeEach(async ({ page }) => {
    await mockHelpApi(page);
  });

  test('renders Help heading', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: /help|glossary/i })).toBeVisible();
  });

  test('search input is present', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="text"], input[placeholder*="search" i]').first()).toBeVisible();
  });

  test('renders within perf budget (strict 3s, static page)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(3000));
  });

  // The glossary rows are buttons whose accessible name ends with their expand
  // marker ("+" collapsed, "−" expanded). The category pills end with their
  // count instead, so this selects the rows and nothing else on the page.
  const glossaryRows = (page: Page) => page.getByRole('button', { name: / [+−]$/ });

  /** The number in a pill label such as "The Strat (23)". */
  async function pillCount(page: Page, label: RegExp): Promise<number> {
    const text = (await page.getByRole('button', { name: label }).textContent()) ?? '';
    const count = /\((\d+)\)/.exec(text)?.[1];
    if (count === undefined) throw new Error(`no count in the pill ${label}: ${JSON.stringify(text)}`);
    return Number(count);
  }

  test('search narrows the list by term or short text, ignoring case, and says when nothing matches', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    const rows = glossaryRows(page);
    const total = await pillCount(page, /^All \(\d+\)$/);
    await expect(rows).toHaveCount(total);
    const search = page.getByPlaceholder('Search terms...');

    // The term, in any case: a row that does not contain the query (Win Rate)
    // is gone and every row left contains it.
    await search.fill('GATE NODE');
    await expect(page.getByText('Gate Node (◆)', { exact: true })).toBeVisible();
    await expect(page.getByText('Win Rate', { exact: true })).toHaveCount(0);
    const narrowed = await rows.allTextContents();
    expect(narrowed.length).toBeGreaterThan(0);
    expect(narrowed.length).toBeLessThan(total);
    for (const text of narrowed) expect(text.toLowerCase()).toContain('gate node');

    // The short text: "peak-to-trough" is in the Max Drawdown line and not
    // in its term, so a match there comes from the short text alone.
    await search.fill('peak-to-trough');
    await expect(page.getByText('Max Drawdown (Max DD)', { exact: true })).toBeVisible();
    await expect(page.getByText('Gate Node (◆)', { exact: true })).toHaveCount(0);

    // Nothing matches: the empty state replaces every row.
    await search.fill('zzzz-no-such-term');
    await expect(page.getByText('No matching terms found.')).toBeVisible();
    await expect(rows).toHaveCount(0);

    // Clearing the box brings every row back and the message goes.
    await search.fill('');
    await expect(rows).toHaveCount(total);
    await expect(page.getByText('No matching terms found.')).toHaveCount(0);
  });

  test('a category pill narrows the list, a second click returns to all, and another pill switches', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    const rows = glossaryRows(page);
    const all = /^All \(\d+\)$/;
    const strat = /^The Strat \(\d+\)$/;
    const options = /^Options \(\d+\)$/;
    const total = await pillCount(page, all);
    const stratCount = await pillCount(page, strat);
    const optionsCount = await pillCount(page, options);
    await expect(rows).toHaveCount(total);

    // A pill shows exactly the number of rows it announces, and only its own.
    await page.getByRole('button', { name: strat }).click();
    await expect(rows).toHaveCount(stratCount);
    await expect(page.getByText('Failed 2U')).toBeVisible();
    await expect(page.getByText('Win Rate', { exact: true })).toHaveCount(0);

    // Another pill replaces the first one's rows without going through All.
    await page.getByRole('button', { name: options }).click();
    await expect(rows).toHaveCount(optionsCount);
    await expect(page.getByText('Failed 2U')).toHaveCount(0);

    // A second click on the active pill returns to every row.
    await page.getByRole('button', { name: options }).click();
    await expect(rows).toHaveCount(total);
    await expect(page.getByText('Win Rate', { exact: true })).toBeVisible();

    // All resets an active category too.
    await page.getByRole('button', { name: strat }).click();
    await expect(rows).toHaveCount(stratCount);
    await page.getByRole('button', { name: all }).click();
    await expect(rows).toHaveCount(total);
  });
});
