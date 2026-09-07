/**
 * E2E: the app-level auth gate.
 *
 * The gate only engages in `firebase` auth mode (the public app-login service).
 * In `open`/`iap` mode it's inert and the app renders directly — which is why
 * every other spec (open mode) is unaffected.
 *
 * Real Google/email sign-in needs a live Firebase project, so that path is
 * covered by the staging manual verification, not here. These specs assert the
 * gate's render decision + that the login UI is present in firebase mode.
 *
 * `mockAllPages` (not just `mockCommon`): these specs only look at the shell,
 * but /dashboard still fires its full fan-out, and with the E2E proxy pinned
 * to a dead backend every unmocked call was a logged ECONNREFUSED (audit
 * §10.2). The config override each test registers afterwards still wins.
 */
import { test, expect } from '@playwright/test';
import { mockAllPages } from '../helpers/fixtures/all';

// A well-formed (but fake) Firebase web config — enough for initializeApp() to
// construct without throwing; no network is needed to render the signed-out UI.
const FAKE_FIREBASE = {
  apiKey: 'AIzaSyFAKE-key-for-tests-000000000000000',
  authDomain: 'demo-test.firebaseapp.com',
  projectId: 'demo-test',
  appId: '1:1234567890:web:abcdef0123456789',
};

test.describe('Auth gate', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('open mode → app renders, no login screen', async ({ page }) => {
    await mockAllPages(page); // config → { authMode: 'open' }
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // The app shell mounted: /help now lives inside the Support dropdown
    // (navConfig.ts SUPPORT group, menu: true), so there is no bare
    // `a[href="/help"]` until that menu opens. The menu trigger itself is the
    // stable "the nav rendered" signal.
    await expect(page.getByTestId('nav-menu-support')).toBeVisible();
    await expect(page.getByTestId('signin-screen')).toHaveCount(0);
  });

  test('firebase mode, signed out → login screen blocks the app', async ({ page }) => {
    await mockAllPages(page);
    // Registered after mockCommon so it wins (Playwright: last route matches first).
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authMode: 'firebase', firebase: FAKE_FIREBASE }),
      }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('signin-screen')).toBeVisible();
    await expect(page.getByTestId('google-signin')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    // The app shell must NOT be reachable behind the gate.
    await expect(page.locator('nav a[href="/help"]')).toHaveCount(0);
  });

  // The two boot-failure specs below are the regression fence for issue #5:
  // commit 34588bc (bot edit) once swapped this exact path to a silent
  // fail-open, stripping the auth gate whenever the API was unreachable.
  // main.tsx's header comment forbids that; these make the posture executable.

  test('config fetch failure → config-error screen, app never renders', async ({ page }) => {
    await mockAllPages(page);
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('config-error')).toBeVisible();
    // Neither the ungated app shell nor the login screen may appear.
    await expect(page.getByTestId('nav-menu-support')).toHaveCount(0);
    await expect(page.getByTestId('signin-screen')).toHaveCount(0);
  });

  test('config endpoint answering HTML (static-host fallback) → config-error screen', async ({
    page,
  }) => {
    await mockAllPages(page);
    // A static host with SPA history-fallback answers /api/* with index.html
    // and a 200 — the shape guard must treat that as a failed boot, not as
    // open mode (confirmed real via HAR, see src/main.tsx).
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html></html>' }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('config-error')).toBeVisible();
    await expect(page.getByTestId('nav-menu-support')).toHaveCount(0);
  });

  test('login screen toggles between sign-in and sign-up', async ({ page }) => {
    await mockAllPages(page);
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authMode: 'firebase', firebase: FAKE_FIREBASE }),
      }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-submit')).toHaveText(/sign in/i);

    await page.getByTestId('login-toggle').click();
    await expect(page.getByTestId('login-submit')).toHaveText(/create account/i);
  });
});
