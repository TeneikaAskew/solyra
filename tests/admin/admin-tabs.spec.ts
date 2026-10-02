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
import type { RouteRow } from '@/hooks/useAdmin';
import { MOCK_ADMIN_ROUTES, mockAdminApi, type AdminMockOpts } from '../helpers/fixtures/admin';
import { M } from '../helpers/mocks';

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
    await expect(table.getByText('admin@mock.solyra')).toBeVisible();
    // uid-member keeps display_name and last_sign_in_at null → em-dash cells
    const memberRow = page.locator('tr', { hasText: 'uid-member' });
    await expect(memberRow).toContainText('—');
    await expect(memberRow).not.toContainText('Invalid Date');
  });

  test('search filters rows and shows the honest empty state', async ({ page }) => {
    await mockAndOpen(page);
    await expect(page.getByTestId('admin-users-table')).toBeVisible();

    await page.getByTestId('admin-users-search').fill('admin@mock');
    await expect(page.getByTestId('admin-users-table').getByText('admin@mock.solyra')).toBeVisible();
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

test.describe('Admin · Models & routing tab', () => {
  // ADMIN-07. The route table's own spec (admin.spec.ts) changes a model
  // within one provider and asserts the PUT body; this one drives the other
  // half: a change of provider, the server's refusal of a provider with no
  // adapter, and the row after a save the server accepts.
  test('a provider change re-points the model select, a refused save shows the server reason and an accepted save updates the row', async ({
    page,
  }) => {
    // The routes list is stateful so the refetch after a save reads what the
    // PUT wrote, as the real handler's does.
    let stored: RouteRow[] = MOCK_ADMIN_ROUTES.routes.map((r) => ({ ...r }));
    const puts: unknown[] = [];
    const REFUSAL = {
      detail:
        "Provider 'anthropic' has no registered adapter — the pipeline will crash if this route is activated. Install the SDK and set credentials first.",
    };
    await mockAdminApi(page);
    // Registered after mockAdminApi, so these win (newest-first matching).
    await page.route('**/api/admin/routes', (r) => r.fulfill(M.ok({ routes: stored })));
    await page.route('**/api/admin/routes/*', (r) => {
      if (r.request().method() !== 'PUT') return r.continue();
      const role = new URL(r.request().url()).pathname.split('/').pop() ?? '';
      const body = JSON.parse(r.request().postData() || '{}') as { provider: string; model: string };
      puts.push(body);
      if (body.provider === 'anthropic') {
        return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(REFUSAL) });
      }
      stored = stored.map((x) =>
        x.role === role ? { ...x, ...body, updated_at: '2026-10-01T20:50:00Z', updated_by: 'admin-ui' } : x,
      );
      return r.fulfill(M.ok(stored.find((x) => x.role === role)));
    });

    await page.goto('/admin');
    await page.getByTestId('admin-tab-models').click();
    await expect(page.getByTestId('admin-routes-table')).toBeVisible();
    const judgeRow = page.locator('tr', { hasText: 'judge' });
    await expect(page.getByTestId('save-judge')).toBeDisabled();

    // A provider with no credentials: the model select is re-pointed at that
    // provider's first model (a disabled "(no creds)" option) and the row is
    // now a change, so Save is offered.
    await page.getByTestId('provider-judge').selectOption('anthropic');
    await expect(page.getByTestId('model-judge')).toHaveValue('claude-sonnet-4-6');
    await expect(page.getByTestId('model-judge').locator('option')).toHaveText(/claude-sonnet-4-6 \(no creds\)/);
    await expect(page.getByTestId('save-judge')).toBeEnabled();

    // The server refuses it: its reason is shown and the row is not updated.
    await page.getByTestId('save-judge').click();
    await expect(page.getByText(/update route failed: 400/)).toContainText('has no registered adapter');
    expect(puts).toEqual([{ provider: 'anthropic', model: 'claude-sonnet-4-6' }]);
    await expect(judgeRow).not.toContainText('admin-ui');

    // A credentialed pair is accepted: the refusal goes, the refetched row
    // carries the writer and the new model, and there is nothing left to save.
    await page.getByTestId('provider-judge').selectOption('vertex');
    await page.getByTestId('model-judge').selectOption('gemini-2.5-pro');
    await page.getByTestId('save-judge').click();
    await expect(judgeRow).toContainText('admin-ui');
    expect(puts[1]).toEqual({ provider: 'vertex', model: 'gemini-2.5-pro' });
    await expect(page.getByTestId('model-judge')).toHaveValue('gemini-2.5-pro');
    await expect(page.getByTestId('save-judge')).toBeDisabled();
    await expect(page.getByText(/update route failed/)).toHaveCount(0);
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Admin · permission', () => {
  // ADMIN-13. admin-auth.spec.ts and admin.spec.ts cover the denied card for
  // an identity /api/me does not call admin. This covers the other
  // presentation of the same state: /api/me says admin (so the page mounts the
  // tabs) while the admin routes disagree, as after a role is revoked. Each
  // panel must say so, and none may fall back to an empty table.
  test('an account that /api/me calls admin, whose admin routes answer 403, sees the rejection on every tab and never an empty table', async ({
    page,
  }) => {
    await mockAdminApi(page);
    const forbidden = (r: import('@playwright/test').Route) =>
      r.fulfill({ status: 403, contentType: 'application/json', body: '{"detail":"admin access required"}' });
    // Registered after mockAdminApi, so these win (newest-first matching).
    await page.route('**/api/admin/users', forbidden);
    await page.route('**/api/admin/data-sources', forbidden);
    await page.route('**/api/admin/routes', forbidden);

    await page.goto('/admin');
    await expect(page.getByTestId('admin-users-error')).toContainText('Could not load users: unauthorized');
    await expect(page.getByTestId('admin-users-table')).toHaveCount(0);
    // The page trusted /api/me, so the denied card is not what shows.
    await expect(page.getByTestId('admin-denied')).toHaveCount(0);

    await page.getByTestId('admin-tab-data').click();
    await expect(page.getByTestId('admin-sources-error')).toContainText(
      'Could not load data sources: unauthorized',
    );
    await expect(page.getByTestId('admin-sources-table')).toHaveCount(0);

    await page.getByTestId('admin-tab-models').click();
    await expect(page.getByTestId('admin-error')).toContainText(
      'The server rejected this account for admin routes',
    );
    await expect(page.getByTestId('admin-routes-table')).toHaveCount(0);
    await page.waitForLoadState('networkidle');
  });
});
