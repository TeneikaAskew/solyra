/**
 * E2E: Admin role-based access control.
 *
 * Admin auth is role-based ONLY — the shared X-Admin-Token / sessionStorage
 * gate was removed (the backend stopped accepting it; see routers/admin.py
 * `_require_admin`). /api/me's server-verified `is_admin` decides both nav
 * visibility and whether /admin renders the dashboard.
 *
 * Scenarios:
 *   1. Admin role renders the routing panel; no token UI exists anywhere
 *   2. Admin can edit routes with no extra credential
 *   3. Non-admin / anonymous users see the access-denied card
 *   4. /api/me failure denies rather than granting
 *   5. Sidebar shows the Admin link only for the admin role
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'teneika@bictech.org';

const MOCK_ROUTES = {
  routes: [
    { role: 'analyst', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'bull', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'bear', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'judge', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'trader', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'risk', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'portfolio_manager', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
  ],
};

const MOCK_MODELS = {
  models: [
    { provider: 'vertex', model: 'gemini-2.0-flash', has_credentials: true, input_usd_per_mtok: 0.1, output_usd_per_mtok: 0.4 },
    { provider: 'vertex', model: 'gemini-2.5-pro', has_credentials: true, input_usd_per_mtok: 1.25, output_usd_per_mtok: 10.0 },
    { provider: 'anthropic', model: 'claude-sonnet-4-6', has_credentials: false, input_usd_per_mtok: 3.0, output_usd_per_mtok: 15.0 },
  ],
};

/** Set up common admin API mocks (routes + models always succeed). */
async function mockAdminApi(page: import('@playwright/test').Page) {
  await page.route('**/api/admin/routes', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, body: JSON.stringify(MOCK_ROUTES) });
    }
    return route.continue();
  });
  await page.route('**/api/admin/models', (route) =>
    route.fulfill({ status: 200, body: JSON.stringify(MOCK_MODELS) }),
  );
}

// The boot-time runtime-config probe must resolve to a valid config or the app
// renders its "could not load configuration" error screen instead of the app
// (main.tsx fails loud rather than silently defaulting to open mode — see
// CLAUDE.md Rule 3.7). `open` mode keeps the auth gate inert, so these
// admin/sidebar specs exercise the app exactly as before.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/config/firebase', (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ authMode: 'open', firebase: null }) }),
  );
});

// ---------------------------------------------------------------------------
// Admin email bypass
// ---------------------------------------------------------------------------

test.describe('Admin — role-based access', () => {
  test('admin role renders the routing panel; no token UI exists', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: ADMIN_EMAIL, is_admin: true }) }),
    );
    await mockAdminApi(page);

    await page.goto('/admin');

    // Routing table renders directly off the role — nothing to unlock
    await expect(page.getByTestId('admin-routes-table')).toBeVisible();
    await expect(page.getByText('analyst')).toBeVisible();
    await expect(page.getByText('portfolio_manager')).toBeVisible();

    // The token gate and its logout affordance are gone from the codebase
    await expect(page.getByTestId('admin-token-input')).toHaveCount(0);
    await expect(page.getByTestId('admin-logout')).toHaveCount(0);
  });

  test('admin role can edit a route with no extra credential', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: ADMIN_EMAIL, is_admin: true }) }),
    );
    await mockAdminApi(page);

    let putBody: unknown = null;
    await page.route('**/api/admin/routes/trader', (route) => {
      if (route.request().method() === 'PUT') {
        putBody = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            role: 'trader',
            provider: 'vertex',
            model: 'gemini-2.5-pro',
            updated_at: '2026-04-26T10:00:00Z',
            updated_by: 'admin-ui',
          }),
        });
      }
      return route.continue();
    });

    await page.goto('/admin');
    await expect(page.getByTestId('admin-routes-table')).toBeVisible();

    // Change model for trader
    await page.getByTestId('model-trader').selectOption('gemini-2.5-pro');
    await page.getByTestId('save-trader').click();

    await expect.poll(() => putBody, { timeout: 5_000 }).toEqual({
      provider: 'vertex',
      model: 'gemini-2.5-pro',
    });
  });
});

// ---------------------------------------------------------------------------
// Non-admin users
// ---------------------------------------------------------------------------

test.describe('Admin — non-admin users', () => {
  test('anonymous user sees the access-denied card', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: null, is_admin: false }) }),
    );

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('admin-denied')).toBeVisible();
    await expect(page.getByTestId('admin-routes-table')).not.toBeVisible();
  });

  test('non-admin email sees the access-denied card', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: 'someone@example.com', is_admin: false }) }),
    );

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('admin-denied')).toBeVisible();
    await expect(page.getByTestId('admin-routes-table')).not.toBeVisible();
  });

  test('/api/me failure denies rather than granting', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' }),
    );

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('admin-denied')).toBeVisible();
    await expect(page.getByTestId('admin-routes-table')).not.toBeVisible();
  });
});
// ---------------------------------------------------------------------------
// Sidebar visibility
// ---------------------------------------------------------------------------

test.describe('Sidebar — Admin link visibility', () => {
  // The app's default nav shell is now top-tabs (settingsStore.ts DEFAULTS:
  // navPattern 'top-tabs'), where the Admin link lives inside the collapsed
  // SUPPORT dropdown and is not an always-visible <nav> anchor. This suite
  // exercises the Sidebar component specifically (AppShell.tsx renders
  // Sidebar only when navPattern === 'sidebar'), so pin the persisted shell
  // setting before the app boots — same mechanism a user pinning the sidebar
  // in Settings would produce.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'platform-shell-settings',
        JSON.stringify({ navPattern: 'sidebar', density: 'dense', accent: 'blue' }),
      );
    });
  });

  test('admin email sees Admin link in sidebar', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: ADMIN_EMAIL, is_admin: true }) }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).toBeVisible();
  });

  test('anonymous user does not see Admin link in sidebar', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: null, is_admin: false }) }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Wait for the nav to render (Help link is always visible)
    await expect(page.locator('nav a[href="/help"]')).toBeVisible();
    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).not.toBeVisible();
  });

  test('non-admin email does not see Admin link in sidebar', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: 'user@other.org', is_admin: false }) }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('nav a[href="/help"]')).toBeVisible();
    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).not.toBeVisible();
  });

  test('admin email can navigate to admin page via sidebar link', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: ADMIN_EMAIL, is_admin: true }) }),
    );
    await mockAdminApi(page);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const adminLink = page.locator('nav a[href="/admin"]');
    await expect(adminLink).toBeVisible();
    await adminLink.click();
    await page.waitForURL('**/admin');

    // Should go straight to the routing panel, no token gate
    await expect(page.getByTestId('admin-routes-table')).toBeVisible();
  });

  // Expected counts come from navConfig.ts NAV_GROUPS (the Sidebar renders
  // every group item as a NavLink): TRADING 1 (dashboard) + MARKET 4 (live,
  // charts, options, signals) + INTELLIGENCE 2 (insights, catalysts) +
  // LEARN 3 (playbook, reports, journal) + SUPPORT 4 (admin*, settings,
  // help, /#faq) = 14 links for an admin; the adminOnly /admin link is
  // filtered out for everyone else (Sidebar.tsx) → 13.
  test('sidebar nav count is 13 for non-admin (no Admin link)', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: null, is_admin: false }) }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Wait for nav to fully render before counting
    await expect(page.locator('nav a[href="/help"]')).toBeVisible();
    const nav = page.locator('nav a');
    await expect(nav).toHaveCount(13);
  });

  test('sidebar nav count is 14 for admin (includes Admin link)', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ email: ADMIN_EMAIL, is_admin: true }) }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Wait for admin link to appear before counting
    await expect(page.locator('nav a[href="/admin"]')).toBeVisible();
    const nav = page.locator('nav a');
    await expect(nav).toHaveCount(14);
  });
});
