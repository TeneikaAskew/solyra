/**
 * E2E: Admin model-routing dashboard.
 *
 * Tests the sessionStorage-token auth flow and the routing table
 * render/update path. Backend is fully mocked.
 *
 * Payloads and the token gate itself live in tests/helpers/fixtures/admin.ts,
 * typed against useAdmin.ts's RouteRow / AvailableModelRow. `mockAdminApi`
 * reproduces the real gate — GET /api/admin/routes answers 401 unless the
 * request carries the matching X-Admin-Token — because "a wrong token is
 * rejected" is the behaviour most worth protecting here.
 */
import { test, expect } from '@playwright/test';
import { VALID_ADMIN_TOKEN, mockAdminApi } from './helpers/fixtures/admin';

/**
 * The admin page is tabbed (Users & roles | Chart & report data | Models &
 * routing) and lands on the USERS tab after auth. The routing table only
 * mounts under the models tab, so specs asserting on it click there first.
 */
const openModelsTab = async (page: import('@playwright/test').Page) => {
  await expect(page.getByTestId('admin-tab-models')).toBeVisible();
  await page.getByTestId('admin-tab-models').click();
};

test.describe('Admin — model routing', () => {
  test.beforeEach(async ({ context }) => {
    // Clear any persisted token between tests (fresh tab)
    await context.clearCookies();
  });

  test('token gate rejects invalid tokens and accepts the correct one', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Gate visible
    await expect(page.getByTestId('admin-token-input')).toBeVisible();

    // Wrong token
    await page.getByTestId('admin-token-input').fill('wrong-token');
    await page.getByTestId('admin-submit').click();
    await expect(page.getByTestId('admin-error')).toContainText(/invalid token/i);

    // Correct token
    await page.getByTestId('admin-token-input').fill(VALID_ADMIN_TOKEN);
    await page.getByTestId('admin-submit').click();

    // Unlock lands on the users tab; the routing table lives under models.
    await expect(page.getByTestId('admin-users-panel')).toBeVisible();
    await openModelsTab(page);
    await expect(page.getByTestId('admin-routes-table')).toBeVisible();
    await expect(page.getByText('analyst')).toBeVisible();
    await expect(page.getByText('portfolio_manager')).toBeVisible();
  });

  test('editing a route saves via PUT and reflects the new value', async ({ page }) => {
    let putRole: string | null = null;
    let putBody: unknown = null;
    await mockAdminApi(page, {
      onRoutePut: (role, body) => {
        putRole = role;
        putBody = body;
      },
    });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Unlock with valid token
    await page.getByTestId('admin-token-input').fill(VALID_ADMIN_TOKEN);
    await page.getByTestId('admin-submit').click();

    await openModelsTab(page);
    await expect(page.getByTestId('admin-routes-table')).toBeVisible();

    // Change trader model
    await page.getByTestId('model-trader').selectOption('gemini-2.5-pro');
    await page.getByTestId('save-trader').click();

    // PUT body should carry the new model, on the trader route
    await expect.poll(() => putBody, { timeout: 5_000 }).toEqual({
      provider: 'vertex',
      model: 'gemini-2.5-pro',
    });
    expect(putRole).toBe('trader');
  });

  test('users tab is the default and renders rows with em-dash honesty for null fields', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('admin-token-input').fill(VALID_ADMIN_TOKEN);
    await page.getByTestId('admin-submit').click();

    // No tab click: users is the landing tab.
    await expect(page.getByTestId('admin-users-table')).toBeVisible();
    await expect(page.getByText('teneika@bictech.org')).toBeVisible();
    // uid-user-2 has last_sign_in_at: null → its row renders an em-dash,
    // never a fabricated date (Rule 4).
    const row = page.locator('tr', { hasText: 'trader@example.com' });
    await expect(row).toContainText('—');
    // Role chips come from available_roles.
    await expect(page.getByTestId('role-uid-user-2-admin')).toBeVisible();
  });

  test('data tab renders freshness rows and refresh POSTs to the right dataset', async ({ page }) => {
    let refreshed: string | null = null;
    await mockAdminApi(page, { onRefreshPost: (id) => { refreshed = id; } });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('admin-token-input').fill(VALID_ADMIN_TOKEN);
    await page.getByTestId('admin-submit').click();

    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();
    await expect(page.getByText('Daily OHLCV bars')).toBeVisible();

    // Non-refreshable dataset keeps its button disabled.
    await expect(page.getByTestId('refresh-insight_reports')).toBeDisabled();

    await page.getByTestId('refresh-market_data_daily').click();
    await expect.poll(() => refreshed, { timeout: 5_000 }).toBe('market_data_daily');
  });
});
