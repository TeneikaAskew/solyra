/**
 * Warm every route before the suite runs.
 *
 * Playwright starts its own Vite (see playwright.config.ts) with
 * `reuseExistingServer` off, so every run begins against a COLD dev server.
 * All 14 routes are `lazy(() => import(...))` in App.tsx, so the first visit
 * to each one pays for Vite transforming that route's chunk and its component
 * tree on demand. Several specs assert wall-clock budgets against that first
 * visit — 3s on /help, 5s on /reports, /live and /catalysts, 7s on /signals —
 * budgets that were written when Playwright reused an already-warm dev server
 * and which a cold transform cannot meet. Without this, whichever spec happens
 * to touch a route first fails on compile time rather than on anything real.
 *
 * `mockCommon` is not optional here. The boot sequence in main.tsx fetches
 * /api/config/firebase and, on any failure, renders the config-error screen
 * INSTEAD of the app (a deliberate fail-loud). With the proxy pointed at a
 * local backend that usually isn't running, an unmocked warm-up would render
 * that error screen on every route, mount no page component, and warm nothing
 * — passing while doing exactly none of its job.
 *
 * Runs as its own project that `chromium` depends on, so it completes before
 * any spec starts. Never fails the run: a route that won't load is a real
 * spec's problem to report, with its own assertions and diagnostics.
 */
import { test } from '@playwright/test';
import { mockCommon } from './helpers/mocks';

// Mirrors the router in src/App.tsx. '/welcome' is a redirect to '/' and adds
// no chunk of its own, so it is deliberately omitted.
const ROUTES = [
  '/',
  '/dashboard',
  '/live',
  '/charts',
  '/options',
  '/playbook',
  '/reports',
  '/signals',
  '/journal',
  '/insights',
  '/catalysts',
  '/admin',
  '/help',
  '/settings',
] as const;

test('warm every route so perf budgets measure a warm server', async ({ page }) => {
  // Cold transforms of the heavier routes (charts, options) dominate this;
  // it is paid once per run, not per spec.
  test.setTimeout(300_000);

  await mockCommon(page);

  for (const route of ROUTES) {
    // 'load' — not 'commit' — so the lazy chunk is actually fetched and
    // transformed. Failures are swallowed on purpose: warming is best-effort,
    // and a genuinely broken route should surface in its own spec.
    await page
      .goto(route, { waitUntil: 'load', timeout: 60_000 })
      .catch(() => {});
    // The route component mounts inside <Suspense> after the chunk resolves,
    // so give the network a moment to settle before moving on.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }
});
