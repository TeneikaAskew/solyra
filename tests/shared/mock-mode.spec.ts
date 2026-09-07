/**
 * E2E: mock-data mode (dev mode).
 *
 * The mode's contract: with the preference ON, every /api/* request is
 * answered from the bundled fixtures inside the page and NOTHING reaches
 * the network. These specs therefore register NO page.route mocks for the
 * mocked-world cases; instead they count real /api requests leaving the
 * page and assert the count stays zero — the strongest form of the
 * "no true api calls" guarantee.
 *
 * Activation surfaces covered: the Support-menu toggle (admins), the
 * always-visible banner with its Exit button, and the dev-role
 * auto-enable driven by /api/me's server-verified is_dev flag.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockAllPages } from '../helpers/fixtures/all';

const PREF_KEY = 'solyra-mock-mode';

/** Count /api requests that actually leave the page (network layer). */
function trackApiRequests(page: Page): { count: () => number } {
  let n = 0;
  page.on('request', (req) => {
    if (new URL(req.url()).pathname.startsWith('/api/')) n += 1;
  });
  return { count: () => n };
}

test.describe('Mock mode ON (preference seeded)', () => {
  test.beforeEach(async ({ page }) => {
    // Seed only when unset: the init script runs again on every reload, and
    // the exit flows persist 'off' + reload — unconditional seeding would
    // overwrite that and re-enter the mode forever.
    await page.addInitScript(
      ([k]) => {
        if (window.localStorage.getItem(k) === null) {
          window.localStorage.setItem(k, 'on');
        }
      },
      [PREF_KEY],
    );
    // Only the FONT requests are stubbed (non-/api, they'd stall networkidle
    // on a runner without outbound internet). No /api route is registered —
    // that absence is what the zero-requests assertion proves.
    await page.route('https://fonts.googleapis.com/**', (r) =>
      r.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    );
    await page.route('https://fonts.gstatic.com/**', (r) =>
      r.fulfill({ status: 200, contentType: 'font/woff2', body: '' }),
    );
  });

  test('banner shows, app boots, and ZERO /api requests reach the network', async ({ page }) => {
    const api = trackApiRequests(page);

    await page.goto('/dashboard');
    await expect(page.getByTestId('mock-mode-banner')).toBeVisible();
    // The shell booted from the mocked runtime config (open auth): nav renders.
    await expect(page.getByTestId('nav-menu-support')).toBeVisible();

    // Let the dashboard's full fan-out fire, then assert none escaped.
    await page.waitForLoadState('networkidle');
    expect(api.count()).toBe(0);
  });

  /**
   * Exiting reloads into the REAL world, where requests do leave the page
   * again — so the exit flows register a catch-all route to keep the suite
   * hermetic once the in-page engine stops answering.
   */
  const mockPostExitWorld = async (page: Page) => {
    await page.route('**/api/**', (r) => {
      const p = new URL(r.request().url()).pathname;
      if (p === '/api/config/firebase') {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ authMode: 'open', firebase: null }),
        });
      }
      return r.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{"detail":"not mocked"}',
      });
    });
  };

  test('Support menu shows the toggle ON (mocked identity is admin) and it exits', async ({ page }) => {
    await mockPostExitWorld(page);
    await page.goto('/dashboard');
    await expect(page.getByTestId('mock-mode-banner')).toBeVisible();

    await page.getByTestId('nav-menu-support').click();
    const toggle = page.getByTestId('mock-mode-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('ON');

    await toggle.click(); // persists 'off' + reloads
    await expect(page.getByTestId('mock-mode-banner')).not.toBeVisible();
    const pref = await page.evaluate((k) => window.localStorage.getItem(k), PREF_KEY);
    expect(pref).toBe('off');
  });

  test('the banner Exit button leaves the mode even without the menu', async ({ page }) => {
    await mockPostExitWorld(page);
    await page.goto('/dashboard');
    await page.getByTestId('mock-mode-exit').click();
    await expect(page.getByTestId('mock-mode-banner')).not.toBeVisible();
    const pref = await page.evaluate((k) => window.localStorage.getItem(k), PREF_KEY);
    expect(pref).toBe('off');
  });
});

test.describe('Mock mode OFF (real world, mocked via page.route)', () => {
  test.beforeEach(async ({ page }) => {
    // Full typed fan-out (includes the open-auth config), so /dashboard does
    // not spray ECONNREFUSED at the dead E2E proxy (audit §10.2). Each test
    // re-registers /api/me afterwards and wins.
    await mockAllPages(page);
  });

  test('admin sees the toggle OFF in the Support menu', async ({ page }) => {
    await page.route('**/api/me', (r) =>
      r.fulfill({ status: 200, body: JSON.stringify({ email: 'teneika@bictech.org', is_admin: true }) }),
    );

    await page.goto('/dashboard');
    await page.getByTestId('nav-menu-support').click();
    const toggle = page.getByTestId('mock-mode-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('OFF');
  });

  test('non-admin, non-dev gets no toggle', async ({ page }) => {
    await page.route('**/api/me', (r) =>
      r.fulfill({ status: 200, body: JSON.stringify({ email: 'user@example.com', is_admin: false }) }),
    );

    await page.goto('/dashboard');
    await page.getByTestId('nav-menu-support').click();
    await expect(page.getByTestId('nav-group-menu')).toBeVisible();
    await expect(page.getByTestId('mock-mode-toggle')).toHaveCount(0);
  });

  test('a dev-role account auto-enters mock mode on sign-in', async ({ page }) => {
    await page.route('**/api/me', (r) =>
      r.fulfill({
        status: 200,
        body: JSON.stringify({ email: 'dev@example.com', is_admin: false, is_dev: true }),
      }),
    );

    await page.goto('/dashboard');
    // AppShell's effect sets the preference and reloads into the mode.
    await expect(page.getByTestId('mock-mode-banner')).toBeVisible();
    const pref = await page.evaluate((k) => window.localStorage.getItem(k), PREF_KEY);
    expect(pref).toBe('on');
  });

  test('a dev who explicitly exited stays out (no auto re-enable loop)', async ({ page }) => {
    await page.addInitScript(
      ([k]) => window.localStorage.setItem(k, 'off'),
      [PREF_KEY],
    );
    await page.route('**/api/me', (r) =>
      r.fulfill({
        status: 200,
        body: JSON.stringify({ email: 'dev@example.com', is_admin: false, is_dev: true }),
      }),
    );

    await page.goto('/dashboard');
    await page.getByTestId('nav-menu-support').click();
    // Toggle offered (dev role), but the mode stays off.
    await expect(page.getByTestId('mock-mode-toggle')).toContainText('OFF');
    await expect(page.getByTestId('mock-mode-banner')).not.toBeVisible();
  });
});
