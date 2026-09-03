/**
 * E2E: Admin tabbed shell — Users & roles and Chart & report data tabs.
 *
 * Auth is role-based: `mockAdminApi` pins /api/me to an admin identity, so
 * the dashboard renders straight away (the access-control matrix itself is
 * admin-auth.spec.ts's job; the routing table's flows are admin.spec.ts's).
 * This suite covers the two newer panels' behaviour: tab switching, role and
 * status mutations, search, category filters, refresh queueing, and the
 * Rule-4 branches (em-dash for null fields, visible error on load failure).
 *
 * Payloads live in tests/helpers/fixtures/admin.ts, typed against
 * useAdmin.ts's AdminUsersResponse / AdminDataSourcesResponse.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockAdminApi, type AdminMockOpts } from '../helpers/fixtures/admin';

async function mockAndOpen(page: Page, opts: AdminMockOpts = {}) {
  await mockAdminApi(page, opts);
  await page.goto('/admin');
}

test.describe('Admin — tabbed shell', () => {
  test('lands on Users & roles; tabs switch panels', async ({ page }) => {
    await mockAndOpen(page);

    // Default tab: users panel visible, other panels absent
    await expect(page.getByTestId('admin-users-table')).toBeVisible();
    await expect(page.getByTestId('admin-routes-table')).not.toBeVisible();
    await expect(page.getByTestId('admin-sources-table')).not.toBeVisible();
    await expect(page.getByTestId('admin-tab-users')).toHaveAttribute('aria-selected', 'true');

    // Data tab
    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();
    await expect(page.getByTestId('admin-users-table')).not.toBeVisible();

    // Models tab
    await page.getByTestId('admin-tab-models').click();
    await expect(page.getByTestId('admin-routes-table')).toBeVisible();
    await expect(page.getByTestId('admin-sources-table')).not.toBeVisible();
  });
});

test.describe('Admin — Users & roles tab', () => {
  test('renders users; null name/timestamps render as em-dash, never a fabricated value', async ({
    page,
  }) => {
    await mockAndOpen(page);
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    // Scoped to the table: the shell's auth-status pill shows the same email
    const table = page.getByTestId('admin-users-table');
    await expect(table.getByText('teneika@bictech.org')).toBeVisible();
    // uid-member keeps display_name and last_sign_in_at null → em-dash cells
    const memberRow = page.locator('tr', { hasText: 'uid-member' });
    await expect(memberRow).toContainText('—');
    await expect(memberRow).not.toContainText('Invalid Date');
  });

  test('search filters rows and shows the honest empty state', async ({ page }) => {
    await mockAndOpen(page);
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    await page.getByTestId('admin-users-search').fill('teneika');
    await expect(page.getByTestId('admin-users-table').getByText('teneika@bictech.org')).toBeVisible();
    await expect(page.getByText('blocked@example.com')).not.toBeVisible();

    await page.getByTestId('admin-users-search').fill('no-such-user');
    await expect(page.getByText('No users match this search.')).toBeVisible();
    await expect(page.getByTestId('admin-users-table')).not.toBeVisible();
  });

  test('toggling a role PUTs the new roles array', async ({ page }) => {
    let putUid: string | null = null;
    let putBody: unknown = null;
    await mockAndOpen(page, {
      onUserRolesPut: (uid, body) => {
        putUid = uid;
        putBody = body;
      },
    });
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    // uid-member has no roles; toggling admin ON sends ['admin']
    await page.getByTestId('role-uid-member-admin').click();
    await expect.poll(() => putBody, { timeout: 5_000 }).toEqual({ roles: ['admin'] });
    expect(putUid).toBe('uid-member');
  });

  test('disable and enable buttons PUT the flipped status', async ({ page }) => {
    const statusPuts: Array<{ uid: string; body: unknown }> = [];
    await mockAndOpen(page, {
      onUserStatusPut: (uid, body) => statusPuts.push({ uid, body }),
    });
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    // Active user shows Disable; disabled user shows Enable
    await expect(page.getByTestId('status-uid-member')).toContainText('Disable');
    await expect(page.getByTestId('status-uid-blocked')).toContainText('Enable');

    await page.getByTestId('status-uid-member').click();
    await expect.poll(() => statusPuts.length, { timeout: 5_000 }).toBeGreaterThan(0);
    expect(statusPuts[0]).toEqual({ uid: 'uid-member', body: { disabled: true } });
  });

  test('load failure surfaces a visible error, not an empty table', async ({ page }) => {
    await mockAdminApi(page);
    // Override AFTER mockAdminApi so this 500 wins (newest-first matching)
    await page.route('**/api/admin/users', (r) =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' }),
    );
    await page.goto('/admin');

    await expect(page.getByTestId('admin-users-error')).toBeVisible();
    await expect(page.getByTestId('admin-users-error')).toContainText(/could not load users/i);
    await expect(page.getByTestId('admin-users-table')).not.toBeVisible();
  });
});

test.describe('Admin — Chart & report data tab', () => {
  test('renders sources with statuses; null rows/refresh render as em-dash', async ({ page }) => {
    await mockAndOpen(page);
    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();

    await expect(page.getByText('Daily OHLCV')).toBeVisible();
    await expect(page.getByText('last fetch skipped: vendor quota')).toBeVisible();

    // gamma_snapshots keeps row_count and last_refreshed_at null → em-dash
    const unknownRow = page.locator('tr', { hasText: 'gamma_snapshots' });
    await expect(unknownRow).toContainText('unknown');
    await expect(unknownRow).toContainText('—');
    await expect(unknownRow).not.toContainText('NaN');
  });

  test('category filter narrows the table', async ({ page }) => {
    await mockAndOpen(page);
    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();

    await page.getByTestId('source-filter-reports').click();
    await expect(page.getByText('News sentiment')).toBeVisible();
    await expect(page.getByText('Daily OHLCV')).not.toBeVisible();

    await page.getByTestId('source-filter-all').click();
    await expect(page.getByText('Daily OHLCV')).toBeVisible();
  });

  test('refresh POSTs for a refreshable source; non-refreshable button is disabled', async ({
    page,
  }) => {
    let refreshedId: string | null = null;
    await mockAndOpen(page, { onSourceRefresh: (id) => (refreshedId = id) });
    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();

    await expect(page.getByTestId('refresh-gamma_snapshots')).toBeDisabled();

    await page.getByTestId('refresh-market_data_daily').click();
    await expect.poll(() => refreshedId, { timeout: 5_000 }).toBe('market_data_daily');
  });
});
