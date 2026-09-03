/**
 * E2E: Admin model-routing dashboard.
 *
 * Admin auth is role-based (no shared token): /api/me's `is_admin` decides
 * whether the dashboard renders, and the server gates /api/admin/* on the
 * same role check. Payloads live in tests/helpers/fixtures/admin.ts, typed
 * against useAdmin.ts's RouteRow / AvailableModelRow. The behaviour most
 * worth protecting: a non-admin account never reaches the table.
 */
import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/fixtures/admin';

test.describe('Admin — model routing', () => {
  test('non-admin account sees the access-denied card, never the table', async ({ page }) => {
    await mockAdminApi(page, { admin: false });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('admin-denied')).toBeVisible();
    await expect(page.getByTestId('admin-routes-table')).not.toBeVisible();
  });

  test('admin role renders the routing table directly — no token prompt exists', async ({ page }) => {
    await mockAdminApi(page);

    await page.goto('/admin');

    await expect(page.getByTestId('admin-routes-table')).toBeVisible();
    await expect(page.getByText('analyst')).toBeVisible();
    await expect(page.getByText('portfolio_manager')).toBeVisible();
    // The sessionStorage token gate is gone from the codebase entirely.
    await expect(page.getByTestId('admin-token-input')).toHaveCount(0);
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
