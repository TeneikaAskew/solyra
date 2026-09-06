/**
 * Route wiring for the model-routing dashboard (`/admin`).
 *
 * Payloads live in src/mocks/admin.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 *
 * Admin auth is role-based (no shared token): the page renders the
 * dashboard only when /api/me reports `is_admin: true`, and the server
 * gates /api/admin/* on the same role check. `mockAdminApi` therefore
 * pins /api/me to an admin identity by default (pass `admin: false` to
 * exercise the access-denied card), and the admin endpoints answer 200 —
 * "non-admin never reaches the table" is the behaviour worth protecting.
 */
import type { Page } from '@playwright/test';
import type {
  AdminDataSourcesResponse,
  AdminUserRow,
  AdminUsersResponse,
  AvailableModelRow,
  RouteRow,
  StratEngineStateResponse,
  StratPredictResponse,
  StructureBriefResponse,
} from '@/hooks/useAdmin';
import {
  MOCK_ADMIN_DATA_SOURCES,
  MOCK_ADMIN_MODELS,
  MOCK_ADMIN_ROUTES,
  MOCK_ADMIN_USERS,
  MOCK_STRAT_ENGINE_STATE,
  MOCK_STRAT_PREDICT,
  MOCK_STRUCTURE_BRIEF,
  updatedRoute,
} from '@/mocks/admin';
import { M, mockCommon } from '../mocks';

export {
  MOCK_ADMIN_DATA_SOURCES,
  MOCK_ADMIN_MODELS,
  MOCK_ADMIN_ROUTES,
  MOCK_ADMIN_USERS,
  MOCK_STRAT_ENGINE_STATE,
  MOCK_STRAT_PREDICT,
  MOCK_STRAT_PREDICT_MUTED,
  MOCK_STRUCTURE_BRIEF,
  MOCK_STRUCTURE_BRIEF_EMPTY,
  updatedRoute,
} from '@/mocks/admin';

export interface AdminMockOpts {
  /** /api/me identity: admin by default; false renders the denied card. */
  admin?: boolean;
  routes?: { routes: RouteRow[] };
  models?: { models: AvailableModelRow[] };
  users?: AdminUsersResponse;
  dataSources?: AdminDataSourcesResponse;
  /** Called with the parsed body of each PUT /api/admin/routes/{role}. */
  onRoutePut?: (role: string, body: unknown) => void;
  /** Called with the parsed body of each PUT /api/admin/users/{uid}/roles. */
  onUserRolesPut?: (uid: string, body: unknown) => void;
  /** Called with the parsed body of each PUT /api/admin/users/{uid}/status. */
  onUserStatusPut?: (uid: string, body: unknown) => void;
  /** Called with the id of each POST /api/admin/data-sources/{id}/refresh. */
  onSourceRefresh?: (id: string) => void;
  structureBrief?: StructureBriefResponse;
  stratState?: StratEngineStateResponse;
  predict?: StratPredictResponse;
}

/**
 * Intercept every endpoint `/admin` can hit. Includes `mockCommon` (which
 * pins /api/me to a non-admin user), then overrides /api/me with an admin
 * identity unless `admin: false` — the role IS the gate now, so simulating
 * auth means simulating /api/me, not a header check.
 */
export async function mockAdminApi(page: Page, opts: AdminMockOpts = {}) {
  await mockCommon(page);
  const routes = opts.routes ?? MOCK_ADMIN_ROUTES;
  const models = opts.models ?? MOCK_ADMIN_MODELS;

  // Registered AFTER mockCommon so this /api/me wins (Playwright matches
  // newest-first).
  if (opts.admin !== false) {
    await page.route('**/api/me', (r) =>
      r.fulfill(M.ok({ email: 'teneika@bictech.org', is_admin: true }))
    );
  }

  // Registered before the /routes/{role} handler below so that the more
  // specific PUT pattern, registered later, wins.
  await page.route('**/api/admin/routes', (r) => {
    if (r.request().method() !== 'GET') return r.continue();
    return r.fulfill(M.ok(routes));
  });

  await page.route('**/api/admin/models', (r) => r.fulfill(M.ok(models)));

  await page.route('**/api/admin/routes/*', (r) => {
    const req = r.request();
    if (req.method() !== 'PUT') return r.continue();
    const role = new URL(req.url()).pathname.split('/').pop() ?? '';
    const body = JSON.parse(req.postData() || '{}');
    opts.onRoutePut?.(role, body);
    return r.fulfill(M.ok(updatedRoute(role, String(body.model ?? ''))));
  });

  // Users & roles tab (default tab) + data-sources tab. General GET routes
  // first; the more specific mutation patterns registered after, so they win.
  const users = opts.users ?? MOCK_ADMIN_USERS;
  await page.route('**/api/admin/users', (r) => r.fulfill(M.ok(users)));
  await page.route('**/api/admin/users/*/roles', (r) => {
    const req = r.request();
    if (req.method() !== 'PUT') return r.continue();
    const uid = new URL(req.url()).pathname.split('/').at(-2) ?? '';
    const body = JSON.parse(req.postData() || '{}') as { roles?: string[] };
    opts.onUserRolesPut?.(uid, body);
    const row = users.users.find((u) => u.uid === uid) ?? users.users[0];
    return r.fulfill(M.ok({ ...row, roles: body.roles ?? [] } satisfies AdminUserRow));
  });
  await page.route('**/api/admin/users/*/status', (r) => {
    const req = r.request();
    if (req.method() !== 'PUT') return r.continue();
    const uid = new URL(req.url()).pathname.split('/').at(-2) ?? '';
    const body = JSON.parse(req.postData() || '{}') as { disabled?: boolean };
    opts.onUserStatusPut?.(uid, body);
    const row = users.users.find((u) => u.uid === uid) ?? users.users[0];
    return r.fulfill(M.ok({ ...row, disabled: body.disabled ?? false } satisfies AdminUserRow));
  });
  await page.route('**/api/admin/data-sources', (r) =>
    r.fulfill(M.ok(opts.dataSources ?? MOCK_ADMIN_DATA_SOURCES))
  );
  await page.route('**/api/admin/data-sources/*/refresh', (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    const id = new URL(r.request().url()).pathname.split('/').at(-2) ?? '';
    opts.onSourceRefresh?.(id);
    return r.fulfill(M.ok({ id, queued: true, job_id: 'job-e2e-1' }));
  });

  // Strat-engine surface (below the routing table) — see src/mocks/admin.ts.
  await page.route('**/api/admin/structure-brief', (r) =>
    r.fulfill(M.ok(opts.structureBrief ?? MOCK_STRUCTURE_BRIEF))
  );
  await page.route('**/api/admin/strat-engine/state', (r) =>
    r.fulfill(M.ok(opts.stratState ?? MOCK_STRAT_ENGINE_STATE))
  );
  await page.route('**/api/admin/strat-engine/predict', (r) =>
    r.fulfill(M.ok(opts.predict ?? MOCK_STRAT_PREDICT))
  );
}
