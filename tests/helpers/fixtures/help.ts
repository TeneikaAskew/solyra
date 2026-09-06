/**
 * Route wiring for the Help / glossary page (`/help`).
 *
 * Payloads live in src/mocks/help.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes. help.spec.ts previously called only
 * `mockCommon`, leaving /api/config/indicators to fall through.
 */
import type { Page } from '@playwright/test';
import type { IndicatorConfig } from '@/hooks/useConfig';
import type { WatchlistResponse } from '@/types/watchlist';
import { MOCK_INDICATOR_CONFIG } from '@/mocks/help';
import { M, mockCommon } from '../mocks';

export { MOCK_HELP_WATCHLIST, MOCK_INDICATOR_CONFIG } from '@/mocks/help';

export interface HelpMockOpts {
  indicators?: IndicatorConfig;
  watchlist?: WatchlistResponse;
}

/**
 * Intercept every endpoint `/help` hits on first paint.
 * Includes `mockCommon`, so callers don't need it separately.
 */
export async function mockHelpApi(page: Page, opts: HelpMockOpts = {}) {
  await mockCommon(page);
  await page.route('**/api/config/indicators', (r) =>
    r.fulfill(M.ok(opts.indicators ?? MOCK_INDICATOR_CONFIG))
  );
  if (opts.watchlist) {
    await page.route('**/api/insights/watchlist*', (r) => r.fulfill(M.ok(opts.watchlist!)));
  }
}
