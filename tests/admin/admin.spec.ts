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
import { VALID_ADMIN_TOKEN, mockAdminApi } from '../helpers/fixtures/admin';

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

    // Unlock lands on the tabbed admin shell (default tab: Users & roles);
    // the routing table lives under the Models & routing tab.
    await page.getByTestId('admin-tab-models').click();

    // Routing table renders
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

    // Unlock with valid token, then switch to the Models & routing tab
    await page.getByTestId('admin-token-input').fill(VALID_ADMIN_TOKEN);
    await page.getByTestId('admin-submit').click();
    await page.getByTestId('admin-tab-models').click();

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
});
