/**
 * E2E: Catalysts ("/catalysts") — earnings, 8-K, FDA, M&A event timeline,
 * news catalysts, insider clusters, plus the unified-feed UX
 * (Hot Now panel, impact filter, click-to-navigate, sentiment indicator).
 *
 * Payloads live in tests/helpers/fixtures/catalysts.ts, typed against the
 * page's own CatalystsResponse / CatalystTypesResponse contracts. The Hot Now
 * rows are built against the clock (today/tomorrow) inside the fixture, so
 * they can't silently stop being "hot" the day after they were written.
 */
import { test, expect, type Locator } from '@playwright/test';
import { addDaysToISO } from '@/lib/dates';
import { perfBudgetMs } from '../helpers/perfBudget';
import { M } from '../helpers/mocks';
import { buildCatalystEvents, mockCatalystsApi, todayIso } from '../helpers/fixtures/catalysts';

test.describe('Catalysts', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalystsApi(page);
  });

  test('renders catalysts heading', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').filter({ hasText: /catalysts/i })).toBeVisible();
  });

  test('lists upcoming events', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/AAPL/).first()).toBeVisible();
    await expect(page.getByText(/Q2 2026 Earnings/i)).toBeVisible();
  });

  test('shows filter chips', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/earnings/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });

  test('renders Hot Now panel for today/tomorrow high-impact events', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // Hot now header + at least one hot row visible
    await expect(page.getByText(/hot now/i).first()).toBeVisible();
    // The high-impact AVGO event should appear in Hot Now (today)
    await expect(page.getByText(/Broadcom rises on AI deals/i).first()).toBeVisible();
  });

  test('renders impact tier counters in header', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // Header summary: '<n> events <h>H/<m>M/<l>L · ...'
    await expect(page.getByText(/\d+\s*events/i).first()).toBeVisible();
    await expect(page.getByText(/\d+H\s*\/\s*\d+M\s*\/\s*\d+L/i).first()).toBeVisible();
  });

  test('Min-impact filter restricts the timeline', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // Click "High" — only High-impact items should remain.
    await page.getByRole('button', { name: 'High' }).first().click();
    // MSFT Investor Day was Medium impact; should disappear from
    // the date timeline (still allowed in Hot Now since Hot Now
    // ignores the min-impact filter — only the timeline below it
    // is filtered).
    await expect(page.getByText(/Investor Day/i)).toHaveCount(0);
    // High items still visible
    await expect(page.getByText(/Q2 2026 Earnings/i).first()).toBeVisible();
  });

  test('clicking a ticker navigates to /insights with that ticker active', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // The AVGO ticker button (in Hot Now, today's event) — click to navigate
    await page.getByRole('button', { name: 'AVGO' }).first().click();
    await page.waitForURL('**/insights');
    expect(page.url()).toMatch(/\/insights/);
  });

  test('news rows show a sentiment indicator', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // ▲ for bullish (sentiment 0.73). The element shows '▲ 0.73'.
    await expect(page.getByText('▲').first()).toBeVisible();
  });

  // The picker's labels are a CalendarDate drawn as midnight Eastern in the
  // browser's own zone, so the zone the labels are read in is pinned here.
  test.describe('date range', () => {
    test.use({ timezoneId: 'America/New_York' });

    const shortDate = (iso: string) =>
      new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${iso}T00:00:00Z`),
      );
    const cellLabel = (iso: string) =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${iso}T00:00:00Z`));
    const rangeLabel = (from: string, to: string) => `${shortDate(from)} \u2013 ${shortDate(to)}`;

    const monthTitle = (iso: string) =>
      new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${iso}T00:00:00Z`),
      );

    async function pickRange(dialog: Locator, from: string, to: string) {
      // The calendar's own heading names the month on screen, e.g. `Catalyst date range, September 2026`.
      const heading = dialog.getByRole('heading', { name: /^Catalyst date range, / });
      for (const iso of [from, to]) {
        // Page forward to the day's own month: the neighbouring months' days drawn in the
        // grid are disabled. The calendar draws two buttons named Next, the header's and a
        // hidden one for screen readers after the grid, so the first is the one to press.
        for (let i = 0; i < 3 && !(await heading.innerText()).endsWith(monthTitle(iso)); i++) {
          await dialog.getByRole('button', { name: 'Next', exact: true }).first().click();
        }
        await dialog.getByRole('button', { name: cellLabel(iso) }).click();
      }
    }

    test('OK requests the picked range, Cancel discards it and Today restores the default', async ({ page }) => {
      const requests: URLSearchParams[] = [];
      // Registered after mockCatalystsApi, so it wins and records each request.
      await page.route('**/api/catalysts/events**', (r) => {
        requests.push(new URL(r.request().url()).searchParams);
        return r.fulfill(M.ok(buildCatalystEvents()));
      });

      const defaultFrom = addDaysToISO(todayIso(), -3);
      const defaultTo = addDaysToISO(todayIso(), 14);
      const pickedFrom = addDaysToISO(todayIso(), 1);
      const pickedTo = addDaysToISO(todayIso(), 4);
      const trigger = page.getByTestId('date-range-picker');
      const dialog = page.getByRole('dialog', { name: 'Select date range' });

      await page.goto('/catalysts');
      await page.waitForLoadState('networkidle');
      expect(requests).toHaveLength(1);
      expect(requests[0].get('date_from')).toBe(defaultFrom);
      expect(requests[0].get('date_to')).toBe(defaultTo);
      await expect(trigger).toHaveText(rangeLabel(defaultFrom, defaultTo));

      // Cancel: the draft is dropped, the label and the request stay as they were.
      await trigger.getByRole('button').first().click();
      await pickRange(dialog, pickedFrom, pickedTo);
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      await expect(trigger).toHaveText(rangeLabel(defaultFrom, defaultTo));
      expect(requests).toHaveLength(1);

      // OK: the picked range is requested and shown.
      await trigger.getByRole('button').first().click();
      await pickRange(dialog, pickedFrom, pickedTo);
      await page.getByTestId('date-range-apply').click();
      await expect.poll(() => requests.length).toBe(2);
      expect(requests[1].get('date_from')).toBe(pickedFrom);
      expect(requests[1].get('date_to')).toBe(pickedTo);
      await expect(trigger).toHaveText(rangeLabel(pickedFrom, pickedTo));

      // Today: back to the default range.
      await page.getByRole('button', { name: 'Today', exact: true }).click();
      await expect(trigger).toHaveText(rangeLabel(defaultFrom, defaultTo));
    });
  });

  test('an event title toggles its own expanded state on click', async ({ page }) => {
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');
    // The today event is drawn twice, in Hot Now and in the timeline's today group,
    // as two rows that each hold their own state.
    const copies = page.getByRole('button', { name: /Broadcom rises on AI deals/ });
    await expect(copies).toHaveCount(2);
    const hotNowCopy = copies.first();
    const timelineCopy = copies.last();

    await expect(hotNowCopy).toHaveAttribute('aria-expanded', 'false');
    await expect(hotNowCopy).toHaveAttribute('title', 'Show full title');

    await hotNowCopy.click();
    await expect(hotNowCopy).toHaveAttribute('aria-expanded', 'true');
    await expect(hotNowCopy).toHaveAttribute('title', 'Collapse details');
    await expect(timelineCopy).toHaveAttribute('aria-expanded', 'false');

    await hotNowCopy.click();
    await expect(hotNowCopy).toHaveAttribute('aria-expanded', 'false');
    await expect(hotNowCopy).toHaveAttribute('title', 'Show full title');
  });

  test('opening an insight report makes that ticker active on /insights, and a MACRO row has no link', async ({
    page,
  }) => {
    // No report for AVGO: the page lands on its empty state, which is enough here.
    await page.route('**/api/insights/report/AVGO**', (r) => r.fulfill(M.notFound()));
    await page.goto('/catalysts');
    await page.waitForLoadState('networkidle');

    // Tomorrow's CPI row is a MACRO row: its ticker cell is plain text, not a button.
    await expect(page.getByText('CPI release').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'MACRO' })).toHaveCount(0);

    await page.getByRole('button', { name: 'AVGO' }).first().click();
    await page.waitForURL('**/insights');
    await expect(page.getByTestId('ticker-combobox').first()).toContainText('AVGO');
  });
});
