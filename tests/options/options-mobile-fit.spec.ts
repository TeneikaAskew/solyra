/**
 * E2E: /options must not bleed horizontally on phone viewports.
 *
 * Regression cover for the Heatseeker cockpit on mobile: the strike ×
 * expiration heatmap, the pivot/ROC bars and the tactical copy sit in grid
 * and flex tracks whose children default to `min-width: auto`, so a wide
 * snapshot (many expirations, many strikes — what production actually
 * returns) pushed the CARDS past the viewport instead of scrolling inside
 * them. The page then scrolled sideways and the right-hand column of every
 * card was unreachable.
 *
 * The bar here is deliberately structural rather than pixel-exact:
 *   1. the document itself never scrolls horizontally, and
 *   2. no card box extends past the viewport — wide content must live in an
 *      in-card scroller, not widen the card.
 *
 * Uses MOCK_GRID_WIDE (fixtures/options.ts), sized like a real IWM snapshot;
 * the small MOCK_GRID_POPULATED fits on a phone and would pass vacuously.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockOptionsApi, mockOptionsWideGrid } from '../helpers/fixtures/options';

const PHONES = [
  { name: 'iPhone-ish 390px', width: 390, height: 844 },
  { name: 'Pixel-ish 411px', width: 411, height: 823 },
];

/** Widest horizontal extent of the document, in CSS px. */
async function documentOverflow(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

/** Cards (and other boxed surfaces) whose right edge escapes the viewport. */
async function escapingBoxes(page: Page) {
  return page.evaluate(() => {
    const out: { cls: string; left: number; right: number }[] = [];
    document.querySelectorAll('.card-i, .card, .hs-stage, .hs-grid-card').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        out.push({
          cls: (el.className as string).slice(0, 60),
          left: Math.round(r.left),
          right: Math.round(r.right),
        });
      }
    });
    return out;
  });
}

for (const phone of PHONES) {
  test.describe(`Options page fits ${phone.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: phone.width, height: phone.height });
      await mockOptionsApi(page);
      await mockOptionsWideGrid(page);
    });

    test('Heatseeker cockpit does not overflow the viewport', async ({ page }) => {
      await page.goto('/options');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.hs-grid').first()).toBeVisible();

      const doc = await documentOverflow(page);
      expect(doc.scrollWidth, 'document must not scroll horizontally').toBeLessThanOrEqual(
        doc.clientWidth,
      );
      expect(await escapingBoxes(page), 'no card may extend past the viewport').toEqual([]);
    });

    test('the wide heatmap scrolls inside its own card', async ({ page }) => {
      await page.goto('/options');
      await page.waitForLoadState('networkidle');
      const card = page.locator('.hs-grid-card').filter({ has: page.locator('.hs-grid') }).first();
      await expect(card).toBeVisible();

      const metrics = await card.evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowX: getComputedStyle(el).overflowX,
      }));
      // Wide content stays scrollable in-card rather than widening the page.
      expect(metrics.overflowX).toBe('auto');
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
    });

    for (const tab of ['Flowseeker', 'Profiles'] as const) {
      test(`${tab} tab does not overflow the viewport`, async ({ page }) => {
        await page.goto('/options');
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: tab }).click();
        await page.waitForTimeout(800);

        const doc = await documentOverflow(page);
        expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth);
        expect(await escapingBoxes(page)).toEqual([]);
      });
    }
  });
}
