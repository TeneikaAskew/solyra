/**
 * Route wiring for the catalyst timeline (`/catalysts`).
 *
 * Payloads live in src/mocks/catalysts.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and for why
 * `buildCatalystEvents()` is a function evaluated against the clock.
 */
import type { Page } from '@playwright/test';
import type { CatalystsResponse, CatalystTypesResponse } from '@/routes/CatalystsPage';
import { MOCK_CATALYST_TYPES, buildCatalystEvents } from '@/mocks/catalysts';
import { M, mockCommon } from '../mocks';

export {
  MOCK_CATALYST_TYPES,
  buildCatalystEvents,
  buildCatalystEventsEmpty,
  todayIso,
  tomorrowIso,
} from '@/mocks/catalysts';

export interface CatalystsMockOpts {
  events?: CatalystsResponse;
  types?: CatalystTypesResponse;
}

/**
 * Intercept every endpoint `/catalysts` can hit.
 * Includes `mockCommon`, so callers don't need it separately.
 */
export async function mockCatalystsApi(page: Page, opts: CatalystsMockOpts = {}) {
  await mockCommon(page);
  const events = opts.events ?? buildCatalystEvents();
  const types = opts.types ?? MOCK_CATALYST_TYPES;

  await page.route('**/api/catalysts/events**', (r) => r.fulfill(M.ok(events)));
  await page.route('**/api/catalysts/types', (r) => r.fulfill(M.ok(types)));
}
