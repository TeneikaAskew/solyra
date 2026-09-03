/**
 * Typed fixtures + route wiring for the model-routing dashboard (`/admin`).
 *
 * Endpoint fan-out, read off AdminPage.tsx:
 *   GET /api/admin/routes         useAdminRoutes    → { routes }
 *   GET /api/admin/models         useAdminModels    → { models }
 *   PUT /api/admin/routes/{role}  useUpdateAdminRoute → RouteRow
 *   GET /api/admin/users          useAdminUsers     → { users, available_roles }
 *   PUT /api/admin/users/{uid}/…  role/status mutations → AdminUserRow
 *   GET /api/admin/data-sources   useAdminDataSources → { sources }
 *   POST /api/admin/data-sources/{id}/refresh → { id, queued, job_id }
 *   GET /api/me                   useUser — THE auth decision
 *
 * Admin auth is role-based (no shared token): the page renders the
 * dashboard only when /api/me reports `is_admin: true`, and the server
 * gates /api/admin/* on the same role check. `mockAdminApi` therefore
 * pins /api/me to an admin identity by default (pass `admin: false` to
 * exercise the access-denied card), and the admin endpoints answer 200 —
 * "non-admin never reaches the table" is the behaviour worth protecting.
 *
 * AdminPage also renders <StructureBrief> (which embeds <PredictForm>) and
 * <ModelStateSnapshot>, so the strat-engine endpoints below are part of this
 * page's surface too — an earlier version of this file wrongly claimed they
 * were not.
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
import { M, mockCommon } from '../mocks';

/** All seven routable agent roles, so the table renders its full height. */
export const MOCK_ADMIN_ROUTES = {
  routes: [
    { role: 'analyst', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'bull', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'bear', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'judge', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'trader', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    { role: 'risk', provider: 'vertex', model: 'gemini-2.0-flash', updated_at: null, updated_by: null },
    {
      role: 'portfolio_manager',
      provider: 'vertex',
      model: 'gemini-2.0-flash',
      updated_at: null,
      updated_by: null,
    },
  ],
} satisfies { routes: RouteRow[] };

/** Mixed providers, and one row with `has_credentials: false` so the
 *  uncredentialed-model branch is represented. */
export const MOCK_ADMIN_MODELS = {
  models: [
    {
      provider: 'vertex',
      model: 'gemini-2.0-flash',
      has_credentials: true,
      input_usd_per_mtok: 0.1,
      output_usd_per_mtok: 0.4,
    },
    {
      provider: 'vertex',
      model: 'gemini-2.5-pro',
      has_credentials: true,
      input_usd_per_mtok: 1.25,
      output_usd_per_mtok: 10.0,
    },
    {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      has_credentials: false,
      input_usd_per_mtok: 3.0,
      output_usd_per_mtok: 15.0,
    },
  ],
} satisfies { models: AvailableModelRow[] };

/** Users & roles tab — one admin, one plain user, one disabled account, so
 *  the toggle, empty-role, and disabled branches all render. */
export const MOCK_ADMIN_USERS = {
  users: [
    {
      uid: 'uid-admin',
      email: 'teneika@bictech.org',
      display_name: 'Teneika',
      roles: ['admin'],
      disabled: false,
      created_at: '2026-01-05T15:00:00Z',
      last_sign_in_at: '2026-04-25T13:10:00Z',
    },
    {
      uid: 'uid-member',
      email: 'member@example.com',
      display_name: null,
      roles: [],
      disabled: false,
      created_at: '2026-03-11T09:30:00Z',
      last_sign_in_at: null,
    },
    {
      uid: 'uid-blocked',
      email: 'blocked@example.com',
      display_name: 'Blocked',
      roles: [],
      disabled: true,
      created_at: null,
      last_sign_in_at: null,
    },
  ],
  available_roles: ['admin'],
} satisfies AdminUsersResponse;

/** Data tab — one healthy source, one stale-with-message, one unrefreshable. */
export const MOCK_ADMIN_DATA_SOURCES = {
  sources: [
    {
      id: 'market_data_daily',
      label: 'Daily OHLCV',
      category: 'charts',
      status: 'ok',
      row_count: 125_000,
      last_refreshed_at: '2026-04-25T20:05:00Z',
      coverage_start: '2020-01-02',
      coverage_end: '2026-04-25',
      message: null,
      refreshable: true,
    },
    {
      id: 'news_sentiment',
      label: 'News sentiment',
      category: 'reports',
      status: 'stale',
      row_count: 4_812,
      last_refreshed_at: '2026-04-20T06:00:00Z',
      coverage_start: '2025-06-01',
      coverage_end: '2026-04-19',
      message: 'last fetch skipped: vendor quota',
      refreshable: true,
    },
    {
      id: 'gamma_snapshots',
      label: 'Options gamma snapshots',
      category: 'signals',
      status: 'unknown',
      row_count: null,
      last_refreshed_at: null,
      coverage_start: null,
      coverage_end: null,
      message: null,
      refreshable: false,
    },
  ],
} satisfies AdminDataSourcesResponse;

/** The row a successful PUT /api/admin/routes/{role} echoes back. */
export function updatedRoute(role: string, model: string): RouteRow {
  return {
    role,
    provider: 'vertex',
    model,
    updated_at: '2026-04-15T14:30:00Z',
    updated_by: 'admin-ui',
  };
}

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

  // Strat-engine surface (below the routing table) — see note above.
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

// ── Strat-engine surface ───────────────────────────────────────────────────
// AdminPage renders <StructureBrief> and <ModelStateSnapshot> below the
// routing table, and <PredictForm> inside the brief. All three hit
// admin-gated endpoints, so an unmocked /admin visit leaves them erroring.

const SCOPE = 'Type-model probabilities only. Not a directional forecast.';

/** One available cell and one muted cell, so both the populated distribution
 *  and the "muted, here's why" branch render. */
export const MOCK_STRUCTURE_BRIEF = {
  scope_statement: SCOPE,
  ece_ceiling: 0.08,
  cells: [
    {
      ticker: 'IWM',
      timeframe: '30m',
      available: true,
      top_class: '2U',
      top_prob: 0.41,
      distribution: [
        { cls: '1', prob: 0.19 },
        { cls: '2U', prob: 0.41 },
        { cls: '2D', prob: 0.28 },
        { cls: '3', prob: 0.12 },
      ],
      live_ece: 0.052,
      ece_ceiling: 0.08,
      muted: false,
      mute_reason: null,
      refreshed_at: '2026-04-25T20:00:00+00:00',
      note: null,
    },
    {
      ticker: 'IWM',
      timeframe: '1h',
      available: false,
      top_class: null,
      top_prob: null,
      distribution: [],
      live_ece: 0.113,
      ece_ceiling: 0.08,
      muted: true,
      mute_reason: 'live ECE 0.113 exceeds the 0.08 ceiling',
      refreshed_at: '2026-04-25T20:00:00+00:00',
      note: 'calibration drift — retrain pending',
    },
  ],
} satisfies StructureBriefResponse;

/** Nothing trained yet — the brief's honest empty state. */
export const MOCK_STRUCTURE_BRIEF_EMPTY = {
  scope_statement: SCOPE,
  ece_ceiling: 0.08,
  cells: [],
} satisfies StructureBriefResponse;

export const MOCK_STRAT_ENGINE_STATE = {
  ece_ceiling: 0.08,
  cells: [
    {
      ticker: 'IWM',
      timeframe: '30m',
      available: true,
      model_version: 'strat-30m-2026.04.20',
      last_train_date: '2026-04-20',
      live_ece: 0.052,
    },
    {
      ticker: 'IWM',
      timeframe: '1h',
      available: false,
      model_version: null,
      last_train_date: null,
      live_ece: null,
    },
  ],
} satisfies StratEngineStateResponse;

export const MOCK_STRAT_PREDICT = {
  ticker: 'IWM',
  timeframe: '30m',
  ts: '2026-04-25T19:30:00+00:00',
  available: true,
  top_class: '2U',
  top_prob: 0.41,
  class_probs: { '1': 0.19, '2U': 0.41, '2D': 0.28, '3': 0.12 },
  model_version: 'strat-30m-2026.04.20',
  last_train_date: '2026-04-20',
  live_ece: 0.052,
  muted: false,
  mute_reason: null,
  scope_statement: SCOPE,
  note: null,
} satisfies StratPredictResponse;

/** Muted prediction — probabilities suppressed, reason surfaced. */
export const MOCK_STRAT_PREDICT_MUTED = {
  ...MOCK_STRAT_PREDICT,
  timeframe: '1h',
  available: false,
  top_class: null,
  top_prob: null,
  class_probs: { '1': 0, '2U': 0, '2D': 0, '3': 0 },
  model_version: null,
  last_train_date: null,
  live_ece: 0.113,
  muted: true,
  mute_reason: 'live ECE 0.113 exceeds the 0.08 ceiling',
} satisfies StratPredictResponse;
