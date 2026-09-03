/**
 * E2E: Admin tabbed shell — Users & roles and Chart & report data tabs.
 *
 * The Admin page now splits into three tabs (users | data | models); the
 * routing table's own flows stay in admin.spec.ts / admin-auth.spec.ts. This
 * suite covers what those don't: the default-tab landing, tab switching, and
 * the two new panels' interactions (role toggles, enable/disable, category
 * filters, refresh) plus their Rule-4 branches (em-dash for null fields,
 * visible error on load failure).
 *
 * Payloads live in tests/helpers/fixtures/admin.ts, typed against
 * useAdmin.ts's AdminUsersResponse / AdminDataSourcesResponse.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { VALID_ADMIN_TOKEN, mockAdminApi, type AdminMockOpts } from '../helpers/fixtures/admin';

async function unlock(page: Page) {
  await page.goto('/admin');
  await page.getByTestId('admin-token-input').fill(VALID_ADMIN_TOKEN);
  await page.getByTestId('admin-submit').click();
}

async function mockAndUnlock(page: Page, opts: AdminMockOpts = {}) {
  await mockAdminApi(page, opts);
  await unlock(page);
}

test.describe('Admin — tabbed shell', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('unlock lands on Users & roles; tabs switch panels', async ({ page }) => {
    await mockAndUnlock(page);

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
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('renders users; null email/timestamps render as em-dash, never a fabricated value', async ({
    page,
  }) => {
    await mockAndUnlock(page);
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    await expect(page.getByText('alice@example.com')).toBeVisible();
    // The all-null user's row: identity cell and both date cells fall back to —
    const nullRow = page.locator('tr', { hasText: 'uid-null-fields' });
    await expect(nullRow).toContainText('—');
    await expect(nullRow).not.toContainText('Invalid Date');
  });

  test('search filters rows and shows the honest empty state', async ({ page }) => {
    await mockAndUnlock(page);
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    await page.getByTestId('admin-users-search').fill('alice');
    await expect(page.getByText('alice@example.com')).toBeVisible();
    await expect(page.getByText('blocked@example.com')).not.toBeVisible();

    await page.getByTestId('admin-users-search').fill('no-such-user');
    await expect(page.getByText('No users match this search.')).toBeVisible();
    await expect(page.getByTestId('admin-users-table')).not.toBeVisible();
  });

  test('toggling a role PUTs the new roles array', async ({ page }) => {
    let putUid: string | null = null;
    let putBody: unknown = null;
    await mockAndUnlock(page, {
      onUserRolesPut: (uid, body) => {
        putUid = uid;
        putBody = body;
      },
    });
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    // Alice has ['trader']; toggling admin ON should send both roles
    await page.getByTestId('role-uid-alice-admin').click();
    await expect.poll(() => putBody, { timeout: 5_000 }).toEqual({ roles: ['trader', 'admin'] });
    expect(putUid).toBe('uid-alice');
  });

  test('disable and enable buttons PUT the flipped status', async ({ page }) => {
    const statusPuts: Array<{ uid: string; body: unknown }> = [];
    await mockAndUnlock(page, {
      onUserStatusPut: (uid, body) => statusPuts.push({ uid, body }),
    });
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    // Active user shows Disable; disabled user shows Enable
    await expect(page.getByTestId('status-uid-alice')).toContainText('Disable');
    await expect(page.getByTestId('status-uid-disabled')).toContainText('Enable');

    await page.getByTestId('status-uid-alice').click();
    await expect.poll(() => statusPuts.length, { timeout: 5_000 }).toBeGreaterThan(0);
    expect(statusPuts[0]).toEqual({ uid: 'uid-alice', body: { disabled: true } });
  });

  test('load failure surfaces a visible error, not an empty table', async ({ page }) => {
    await mockAdminApi(page);
    // Override AFTER mockAdminApi so this 500 wins (newest-first matching)
    await page.route('**/api/admin/users', (r) =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' }),
    );
    await unlock(page);

    await expect(page.getByTestId('admin-users-error')).toBeVisible();
    await expect(page.getByTestId('admin-users-error')).toContainText(/could not load users/i);
    await expect(page.getByTestId('admin-users-table')).not.toBeVisible();
  });
});

test.describe('Admin — Chart & report data tab', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('renders sources with statuses; null rows/refresh render as em-dash', async ({ page }) => {
    await mockAndUnlock(page);
    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();

    await expect(page.getByText('Daily OHLCV bars')).toBeVisible();
    await expect(page.getByText('vendor feed lagging')).toBeVisible();

    // The error-status row keeps row_count and last_refreshed_at null → em-dash
    const errorRow = page.locator('tr', { hasText: 'insight-reports' });
    await expect(errorRow).toContainText('error');
    await expect(errorRow).toContainText('—');
    await expect(errorRow).not.toContainText('NaN');
  });

  test('category filter narrows the table', async ({ page }) => {
    await mockAndUnlock(page);
    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();

    await page.getByTestId('source-filter-reports').click();
    await expect(page.getByText('Insight reports')).toBeVisible();
    await expect(page.getByText('Daily OHLCV bars')).not.toBeVisible();

    await page.getByTestId('source-filter-all').click();
    await expect(page.getByText('Daily OHLCV bars')).toBeVisible();
  });

  test('refresh POSTs for a refreshable source; non-refreshable button is disabled', async ({
    page,
  }) => {
    let refreshedId: string | null = null;
    await mockAndUnlock(page, { onSourceRefresh: (id) => (refreshedId = id) });
    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-table')).toBeVisible();

    await expect(page.getByTestId('refresh-insight-reports')).toBeDisabled();

    await page.getByTestId('refresh-ohlcv-daily').click();
    await expect.poll(() => refreshedId, { timeout: 5_000 }).toBe('ohlcv-daily');
  });
});
