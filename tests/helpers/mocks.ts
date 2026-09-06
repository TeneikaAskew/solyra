/**
 * Shared API mock helpers for E2E tests.
 *
 * Every page hits a few cross-cutting endpoints (live status pill, health
 * check). Each spec also tends to call the dashboard brief on first paint
 * because the header/sidebar reads it. Centralizing the boilerplate keeps
 * specs short and the mock surface explicit.
 *
 * PER-PAGE test data does NOT live here - it lives in ./fixtures/<page>.ts,
 * typed against the real contracts so schema drift fails `tsc -b`. This
 * module is only the cross-cutting `mockCommon` plus the `M` fulfil
 * helpers that every fixture module builds on.
 *
 * The cross-cutting payloads themselves live in src/mocks/common.ts, shared
 * verbatim with the app's mock-data mode so the two surfaces cannot drift.
 * The ONE deliberate divergence is /api/me: mockCommon pins an ANONYMOUS
 * identity (specs opt into roles per fixture), while mock mode answers with
 * the signed-in dev identity (MOCK_ME_DEV) — so that literal stays inline
 * here, not imported.
 */
import type { Page } from '@playwright/test';
import {
  MOCK_FIREBASE_CONFIG_OPEN,
  MOCK_HEALTH,
  MOCK_LIVE_STATUS,
  MOCK_MARKET_HOURS,
  MOCK_MOST_ACTIVE_EMPTY,
  MOCK_PREFERENCES_EMPTY,
  MOCK_WATCHLIST_EMPTY,
} from '@/mocks/common';

const ok = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const notFound = () => ({
  status: 404,
  contentType: 'application/json',
  body: JSON.stringify({ detail: 'not found' }),
});

/** Apply mocks for endpoints every page hits — call from beforeEach. */
export async function mockCommon(page: Page) {
  // index.css @imports Montserrat from the Google Fonts CDN. On a runner
  // without outbound internet that request stalls for >10s before failing —
  // blowing 5s perf budgets and logging a "Failed to load resource" console
  // error. Fulfill it with an empty stylesheet: the UI falls back to the
  // system font stack and no spec asserts rendered glyphs.
  await page.route('https://fonts.googleapis.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'font/woff2', body: '' })
  );
  await page.route('**/api/health', (r) => r.fulfill(ok(MOCK_HEALTH)));
  // Auth config probe — `open` mode keeps the gate inert (renders the app
  // directly), matching iap/local behaviour. The login page only appears in
  // `firebase` mode.
  await page.route('**/api/config/firebase', (r) => r.fulfill(ok(MOCK_FIREBASE_CONFIG_OPEN)));
  await page.route('**/api/me', (r) => r.fulfill(ok({ email: null, is_admin: false })));
  // Per-user shell preferences (usePreferencesSync, mounted in AppShell on
  // every route). 404 = "no stored preferences" — the app keeps its local
  // choice. Unmocked, this hits the proxy and logs a 500 console error that
  // trips the "renders without console errors" assertions on every page.
  // 200 with all-null fields = "nothing stored yet" without the 404 that
  // browsers log as a console error (several specs assert a clean console).
  await page.route('**/api/me/preferences', (r) => r.fulfill(ok(MOCK_PREFERENCES_EMPTY)));

  await page.route('**/api/live/status', (r) => r.fulfill(ok(MOCK_LIVE_STATUS)));
  // The brief endpoint NEVER 404s: its no-data/DB-down state is a 200
  // `source: 'unavailable'` envelope with a reason (dashboard.py) — the page
  // renders its Unavailable card off that, so the default mock must match.
  await page.route('**/api/dashboard/brief/*', (r) => {
    const ticker = new URL(r.request().url()).pathname.split('/').pop() ?? '';
    return r.fulfill(
      ok({ ticker, source: 'unavailable', reason: 'no brief for today (mockCommon default)' })
    );
  });
  // Deterministic-ranker output for WatchlistPanel (mounted on /insights and
  // /help). This used to answer `{ tickers: [...] }`, which is NOT the
  // WatchlistResponse contract — the panel read `ranked` as undefined and
  // rendered its empty branch, so watchlist assertions passed without the
  // panel ever being exercised. An honest empty ranking renders the same
  // empty state, but now for the right reason; specs wanting rows use
  // MOCK_WATCHLIST from fixtures/insights.ts.
  await page.route('**/api/insights/watchlist*', (r) => r.fulfill(ok(MOCK_WATCHLIST_EMPTY)));
  // Most-active ticker bar (mounted on Market pages + /journal via AppShell).
  // Default is an honest empty response so the bar hides itself — specs that
  // don't care about the marquee stay unaffected; most-active-bar.spec.ts
  // overrides this route per-test with real payloads.
  await page.route('**/api/market/most-active', (r) => r.fulfill(ok(MOCK_MOST_ACTIVE_EMPTY)));
  // ReplayControl (mounted on every page via the TopTabs shell) reads the
  // RTH window from /api/config/market-hours on mount, so this is a
  // cross-cutting request just like /api/live/status. Specs that need a
  // different window (e.g. fixtures/dashboard.ts) re-register and win via
  // Playwright's last-registered-first matching.
  await page.route('**/api/config/market-hours', (r) => r.fulfill(ok(MOCK_MARKET_HOURS)));
}

/** Response builders shared by every fixture module. */
export const M = { ok, notFound };
