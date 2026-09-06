/**
 * E2E regression: every popover/dropdown in the app must stay fully inside
 * the viewport on phone widths — no bleeding off either edge.
 *
 * This spec guards the SHARED positioning mechanism
 * (src/components/shared/popoverPosition.ts). The bug class it killed:
 * each popup used to invent its own CSS anchoring (`absolute right-0`,
 * centered-fixed hacks), so a trigger near a screen edge pushed its panel
 * off-screen (the ticker combobox on the Dashboard was the last instance).
 * All popups now compute a viewport-clamped fixed position from one helper.
 *
 * The bar is structural, not pixel-exact: an open panel's bounding box must
 * satisfy left >= 0 and right <= innerWidth.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { mockDashboard, mockDashboardCards } from '../helpers/fixtures/dashboard';
import { mockCatalystsApi } from '../helpers/fixtures/catalysts';

const PHONES = [
  { name: 'iPhone-ish 390px', width: 390, height: 844 },
  { name: 'Pixel-ish 411px', width: 411, height: 823 },
];

async function expectInViewport(panel: Locator, page: Page, label: string) {
  await expect(panel, `${label} should be visible`).toBeVisible();
  const box = await panel.boundingBox();
  expect(box, `${label} should have a layout box`).not.toBeNull();
  const vw = await page.evaluate(() => window.innerWidth);
  expect(box!.x, `${label} must not bleed off the left edge`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${label} must not bleed off the right edge`).toBeLessThanOrEqual(
    vw + 1,
  );
}

for (const phone of PHONES) {
  test.describe(`Popovers fit ${phone.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: phone.width, height: phone.height });
    });

    test('ticker combobox dropdown stays on screen (Dashboard)', async ({ page }) => {
      await mockDashboard(page);
      await mockDashboardCards(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('ticker-combobox').first().click();
      // The panel is the combobox's dropdown container: it holds the search input.
      const panel = page.getByTestId('ticker-combobox-input').locator('xpath=ancestor::div[3]');
      await expectInViewport(panel, page, 'ticker dropdown');
    });

    test('replay picker stays on screen', async ({ page }) => {
      await mockDashboard(page);
      await mockDashboardCards(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('replay-toggle').click();
      const panel = page.getByRole('button', { name: 'Latest session close' }).locator('xpath=ancestor::div[2]');
      await expectInViewport(panel, page, 'replay picker');
    });

    test('date-range picker stays on screen (Catalysts)', async ({ page }) => {
      await mockCatalystsApi(page);
      await page.goto('/catalysts');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('date-range-picker').getByRole('button').first().click();
      const panel = page.getByRole('dialog', { name: 'Select date range' });
      await expectInViewport(panel, page, 'date-range picker');
    });

    test('mobile hamburger menu stays on screen', async ({ page }) => {
      await mockDashboard(page);
      await mockDashboardCards(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Open menu' }).click();
      const panel = page.locator('nav.fixed').first();
      await expectInViewport(panel, page, 'hamburger menu');
    });
  });
}

test.describe('Popovers fit desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mockDashboard(page);
    await mockDashboardCards(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('nav group dropdown clamps at the right edge', async ({ page }) => {
    const triggers = page.locator('[data-testid^="nav-menu-"]');
    const count = await triggers.count();
    test.skip(count === 0, 'no dropdown nav groups configured');
    // Right-most trigger is the worst case for right-edge bleed.
    await triggers.last().click();
    const panel = page.locator('nav.fixed').first();
    await expectInViewport(panel, page, 'nav group dropdown');
  });

  test('ticker combobox dropdown stays on screen at desktop width', async ({ page }) => {
    await page.getByTestId('ticker-combobox').first().click();
    const panel = page.getByTestId('ticker-combobox-input').locator('xpath=ancestor::div[3]');
    await expectInViewport(panel, page, 'ticker dropdown');
  });
});
