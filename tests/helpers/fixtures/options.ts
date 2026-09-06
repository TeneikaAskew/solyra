/**
 * Route wiring for the Options Flow page (`/options`).
 *
 * Payloads live in src/mocks/options.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 *
 * All five endpoints must be intercepted for hermetic runs (an unmocked
 * /api request hits the Vite proxy and fails when the backend isn't
 * reachable).
 */
import type { Page } from '@playwright/test';
import {
  MOCK_GREEKS,
  MOCK_GRID_POPULATED,
  MOCK_GRID_WIDE,
  MOCK_LEVELS_POPULATED,
  MOCK_OPTIONS_CHAIN,
  MOCK_OPTIONS_DATES,
} from '@/mocks/options';
import { M, mockCommon } from '../mocks';

export {
  MOCK_GREEKS,
  MOCK_GRID,
  MOCK_GRID_POPULATED,
  MOCK_GRID_UNAVAILABLE,
  MOCK_GRID_WIDE,
  MOCK_LEVELS,
  MOCK_LEVELS_POPULATED,
  MOCK_OPTIONS_CHAIN,
  MOCK_OPTIONS_DATES,
} from '@/mocks/options';

/**
 * Intercept every options endpoint the /options page can hit (both the
 * default Heatseeker/Swing view and the Profiles tab), scoped to IWM.
 * Registration order matters: Playwright matches routes newest-first, so the
 * single-segment chain glob goes FIRST and the more specific /grid and
 * /levels patterns after it take precedence.
 * Includes `mockCommon`, so callers don't need to call it separately.
 */
export async function mockOptionsApi(page: Page) {
  await mockCommon(page);
  await page.route('**/api/options/dates/IWM', (r) => r.fulfill(M.ok(MOCK_OPTIONS_DATES)));
  // Chain (single-segment glob: does NOT match /grid?…, /…/levels or
  // /api/options/live/IWM/… — those are handled below / by the caller).
  await page.route('**/api/options/IWM/*', (r) => r.fulfill(M.ok(MOCK_OPTIONS_CHAIN)));
  await page.route('**/api/options/IWM/grid*', (r) => r.fulfill(M.ok(MOCK_GRID_POPULATED)));
  await page.route('**/api/options/IWM/*/levels*', (r) => r.fulfill(M.ok(MOCK_LEVELS_POPULATED)));
  await page.route('**/api/options/greeks', (r) => r.fulfill(M.ok(MOCK_GREEKS)));
}

/**
 * Swap the grid endpoint over to the wide snapshot. Call AFTER mockOptionsApi
 * — Playwright matches routes newest-first, so this registration wins.
 */
export async function mockOptionsWideGrid(page: Page) {
  await page.route('**/api/options/IWM/grid*', (r) => r.fulfill(M.ok(MOCK_GRID_WIDE)));
}
