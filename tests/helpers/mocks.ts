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
 */
import type { Page } from '@playwright/test';
import type { MarketHours } from '@/hooks/useConfig';
import type { WatchlistResponse } from '@/types/watchlist';

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
  await page.route('**/api/health', (r) => r.fulfill(ok({ status: 'ok', cloud_sql: false })));
  // Auth config probe — `open` mode keeps the gate inert (renders the app
  // directly), matching iap/local behaviour. The login page only appears in
  // `firebase` mode.
  await page.route('**/api/config/firebase', (r) =>
    r.fulfill(ok({ authMode: 'open', firebase: null }))
  );
  await page.route('**/api/me', (r) => r.fulfill(ok({ email: null, is_admin: false })));
  await page.route('**/api/live/status', (r) =>
    r.fulfill(ok({ session: 'closed', is_open: false, ts: '2026-04-25T20:00:00Z' }))
  );
  await page.route('**/api/dashboard/brief/*', (r) => r.fulfill(notFound()));
  // Deterministic-ranker output for WatchlistPanel (mounted on /insights and
  // /help). This used to answer `{ tickers: [...] }`, which is NOT the
  // WatchlistResponse contract — the panel read `ranked` as undefined and
  // rendered its empty branch, so watchlist assertions passed without the
  // panel ever being exercised. An honest empty ranking renders the same
  // empty state, but now for the right reason; specs wanting rows use
  // MOCK_WATCHLIST from fixtures/insights.ts.
  await page.route('**/api/insights/watchlist*', (r) =>
    r.fulfill(
      ok({
        run_id: 'bbbbbbbb-0000-0000-0000-000000000000',
        as_of: '2026-04-25T20:00:00Z',
        candidate_count: 0,
        excluded_count: 0,
        ranked: [],
        weights_used: {},
        duration_ms: 0,
      } satisfies WatchlistResponse)
    )
  );
  // Most-active ticker bar (mounted on Market pages + /journal via AppShell).
  // Default is an honest empty response so the bar hides itself — specs that
  // don't care about the marquee stay unaffected; most-active-bar.spec.ts
  // overrides this route per-test with real payloads.
  await page.route('**/api/market/most-active', (r) =>
    r.fulfill(ok({ snapshot_ts: null, snapshot_date: null, label: null, items: [] }))
  );
  // ReplayControl (mounted on every page via the TopTabs shell) reads the
  // RTH window from /api/config/market-hours on mount, so this is a
  // cross-cutting request just like /api/live/status. Specs that need a
  // different window (e.g. fixtures/dashboard.ts) re-register and win via
  // Playwright's last-registered-first matching.
  await page.route('**/api/config/market-hours', (r) =>
    r.fulfill(
      ok({
        timezone: 'America/New_York',
        regular: { open: '09:30', close: '16:00' },
        pre_market: { open: '04:00', close: '09:30' },
        after_hours: { open: '16:00', close: '20:00' },
        holidays_2026: ['2026-01-01', '2026-07-03', '2026-12-25'],
      } satisfies MarketHours)
    )
  );
}

/** Response builders shared by every fixture module. */
export const M = { ok, notFound };
