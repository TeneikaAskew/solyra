/**
 * One call that mocks EVERY page's endpoint fan-out at once.
 *
 * For a spec that walks many routes (navigation smoke, cross-page journeys)
 * the question is not "is this page's data right" but "does any route emit a
 * network error at all" — and with the E2E proxy pinned to a dead
 * 127.0.0.1:8000, every unmocked /api call is a 500 that Chrome logs as a
 * console error. Composing the per-page helpers here means such a spec
 * inherits every fixture the page specs use, instead of re-listing them.
 *
 * ORDER MATTERS. Each per-page helper calls `mockCommon`, and Playwright
 * matches routes newest-first, so a later helper's `mockCommon` can shadow an
 * earlier helper's specific override. The order below is arranged so the
 * "must win" registrations come last:
 *   - `mockDashboard` last of the mockCommon-callers: `mockCommon` 404s
 *     /api/dashboard/brief by default (correct for specs that want the empty
 *     brief; a console error for a smoke walk); mockDashboard's 200 for
 *     brief/IWM is registered after its own mockCommon, so it wins.
 *   - Admin identity re-asserted at the very end: the /admin gate is
 *     role-based (/api/me `is_admin` — the shared-token gate is gone), and
 *     every mockCommon call after `mockAdminApi` shadows its admin /api/me
 *     override with the anonymous default. Re-registering the admin identity
 *     and the admin data routes last means /admin renders its table rather
 *     than the denied card.
 *
 * Per-test overrides still work the usual way: register after this call.
 */
import type { Page } from '@playwright/test';
import { M } from '../mocks';
import { MOCK_ADMIN_MODELS, MOCK_ADMIN_ROUTES, mockAdminApi } from './admin';
import { mockCatalystsApi } from './catalysts';
import { mockChartsApi } from './charts';
import { mockDashboard, mockDashboardCards } from './dashboard';
import { mockHelpApi } from './help';
import { mockInsightsApi } from './insights';
import { mockJournalApi } from './journal';
import { mockLandingApi } from './landing';
import { mockLiveApi } from './live';
import { mockOptionsApi } from './options';
import { mockReportsApi } from './reports';
import { mockSignalsApi } from './signals';

export async function mockAllPages(page: Page) {
  await mockLandingApi(page);
  await mockHelpApi(page);
  await mockCatalystsApi(page);
  await mockReportsApi(page);
  await mockSignalsApi(page);
  await mockOptionsApi(page);
  await mockLiveApi(page);
  await mockChartsApi(page);
  await mockJournalApi(page);
  await mockAdminApi(page);
  await mockInsightsApi(page);
  await mockDashboard(page);
  await mockDashboardCards(page);

  // Cross-page smoke wants /admin to render, not to deny — see header. The
  // gate reads /api/me's `is_admin`, which the later mockCommon calls reset
  // to anonymous, so the admin identity is re-asserted here.
  await page.route('**/api/me', (r) =>
    r.fulfill(M.ok({ email: 'teneika@bictech.org', is_admin: true })),
  );
  await page.route('**/api/admin/models', (r) => r.fulfill(M.ok(MOCK_ADMIN_MODELS)));
  await page.route('**/api/admin/routes', (r) => r.fulfill(M.ok(MOCK_ADMIN_ROUTES)));
}
