/**
 * Typed fixtures + route wiring for the model-routing dashboard (`/admin`).
 *
 * Endpoint fan-out, read off AdminPage.tsx:
 *   GET  /api/admin/routes            token probe + useAdminRoutes → { routes }
 *   GET  /api/admin/models            useAdminModels               → { models }
 *   PUT  /api/admin/routes/{role}     useUpdateAdminRoute          → RouteRow
 *   GET  /api/admin/users             useAdminUsers                → AdminUsersResponse
 *   PUT  /api/admin/users/{uid}/roles useUpdateUserRoles           → AdminUserRow
 *   PUT  /api/admin/users/{uid}/status useUpdateUserStatus         → AdminUserRow
 *   GET  /api/admin/data-sources      useAdminDataSources          → AdminDataSourcesResponse
 *   POST /api/admin/data-sources/{id}/refresh  useRefreshDataSource
 *   GET  /api/me                      useUser (via mockCommon, non-admin)
 *
 * The page is tabbed (users | data | models) and lands on the USERS tab
 * after auth, so /api/admin/users is the first admin call an authed visit
 * fires — leaving it unmocked breaks the hermetic-suite guarantee for every
 * admin spec, not just the ones that assert on the users table.
 *
 * The page authenticates with an `X-Admin-Token` header pulled from
 * sessionStorage, and the GET /routes call doubles as the credential probe:
 * 401 keeps the gate up, 200 unlocks the table. `mockAdminApi` reproduces
 * that conditional rather than always-200, because "wrong token is
 * rejected" is the behaviour most worth protecting here.
 *
 * AdminPage also renders <StructureBrief> (which embeds <PredictForm>) and
 * <ModelStateSnapshot>, so the strat-engine endpoints below are part of this
 * page's surface too — an earlier version of this file wrongly claimed they
 * were not.
 */
import type { Page, Route } from '@playwright/test';
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

/** The token `mockAdminApi` accepts by default. */
export const VALID_ADMIN_TOKEN = 'correct-token';

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

/**
 * Users & roles tab. One admin with full metadata, one plain user with null
 * display name / last sign-in so the em-dash branch renders (Rule 4: nulls
 * stay null to the presentation layer).
 */
export const MOCK_ADMIN_USERS = {
  users: [
    {
      uid: 'uid-admin-1',
      email: 'teneika@bictech.org',
      display_name: 'Teneika',
      roles: ['admin', 'user'],
      disabled: false,
      created_at: '2026-01-10T12:00:00Z',
      last_sign_in_at: '2026-04-25T09:30:00Z',
    },
    {
      uid: 'uid-user-2',
      email: 'trader@example.com',
      display_name: null,
      roles: ['user'],
      disabled: false,
      created_at: '2026-03-02T08:15:00Z',
      last_sign_in_at: null,
    },
  ],
  available_roles: ['admin', 'user'],
} satisfies AdminUsersResponse;

/**
 * Chart & report data tab. One refreshable healthy dataset, one stale
 * refreshable one, and one that cannot be refreshed on demand (its message
 * explains why), so the disabled-button branch is exercised.
 */
export const MOCK_ADMIN_DATA_SOURCES = {
  sources: [
    {
      id: 'market_data_daily',
      label: 'Daily OHLCV bars',
      category: 'charts',
      status: 'ok',
      row_count: 412_345,
      last_refreshed_at: '2026-04-25T20:05:00Z',
      coverage_start: '2019-01-02',
      coverage_end: '2026-04-25',
      message: null,
      refreshable: true,
    },
    {
      id: 'options_chain',
      label: 'Options chain snapshots',
      category: 'charts',
      status: 'stale',
      row_count: 98_765,
      last_refreshed_at: '2026-04-23T20:05:00Z',
      coverage_start: '2024-06-01',
      coverage_end: '2026-04-23',
      message: 'Last fetch older than 24h.',
      refreshable: true,
    },
    {
      id: 'insight_reports',
      label: 'AI insight reports',
      category: 'reports',
      status: 'unknown',
      row_count: null,
      last_refreshed_at: null,
      coverage_start: null,
      coverage_end: null,
      message: 'Produced by the scheduled pipeline; no on-demand job.',
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
  /** Token the mocked backend accepts. Defaults to VALID_ADMIN_TOKEN. */
  token?: string;
  routes?: { routes: RouteRow[] };
  models?: { models: AvailableModelRow[] };
  users?: AdminUsersResponse;
  dataSources?: AdminDataSourcesResponse;
  /** Called with the parsed body of each PUT /api/admin/routes/{role}. */
  onRoutePut?: (role: string, body: unknown) => void;
  /** Called with the id of each POST /api/admin/data-sources/{id}/refresh. */
  onRefreshPost?: (id: string) => void;
  structureBrief?: StructureBriefResponse;
  stratState?: StratEngineStateResponse;
  predict?: StratPredictResponse;
}

/**
 * Intercept every endpoint `/admin` can hit, reproducing the token gate:
 * GET /api/admin/routes answers 401 unless the request carries the matching
 * `X-Admin-Token`. Includes `mockCommon` (which pins /api/me to a non-admin
 * user, so the gate is shown rather than bypassed).
 */
export async function mockAdminApi(page: Page, opts: AdminMockOpts = {}) {
  await mockCommon(page);
  const token = opts.token ?? VALID_ADMIN_TOKEN;
  const routes = opts.routes ?? MOCK_ADMIN_ROUTES;
  const models = opts.models ?? MOCK_ADMIN_MODELS;
  const users = opts.users ?? MOCK_ADMIN_USERS;
  const dataSources = opts.dataSources ?? MOCK_ADMIN_DATA_SOURCES;

  const badToken = {
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'bad token' }),
  };
  const tokenOk = (r: Route) => r.request().headers()['x-admin-token'] === token;

  // Registered before the /routes/{role} handler below so that the more
  // specific PUT pattern, registered later, wins (Playwright matches
  // newest-first).
  await page.route('**/api/admin/routes', (r) => {
    if (r.request().headers()['x-admin-token'] !== token) {
      return r.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'bad token' }),
      });
    }
    return r.fulfill(M.ok(routes));
  });

  await page.route('**/api/admin/models', (r) => {
    if (r.request().headers()['x-admin-token'] !== token) {
      return r.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'bad token' }),
      });
    }
    return r.fulfill(M.ok(models));
  });

  await page.route('**/api/admin/routes/*', (r) => {
    const req = r.request();
    if (req.method() !== 'PUT') return r.continue();
    const role = new URL(req.url()).pathname.split('/').pop() ?? '';
    const body = JSON.parse(req.postData() || '{}');
    opts.onRoutePut?.(role, body);
    return r.fulfill(M.ok(updatedRoute(role, String(body.model ?? ''))));
  });

  // Users & roles tab (the page's default landing tab after auth).
  await page.route('**/api/admin/users', (r) =>
    tokenOk(r) ? r.fulfill(M.ok(users)) : r.fulfill(badToken)
  );
  await page.route('**/api/admin/users/*/roles', (r) => {
    if (!tokenOk(r)) return r.fulfill(badToken);
    const uid = new URL(r.request().url()).pathname.split('/').at(-2) ?? '';
    const body = JSON.parse(r.request().postData() || '{}') as { roles?: string[] };
    const row = users.users.find((u) => u.uid === uid);
    if (!row) return r.fulfill(M.notFound());
    return r.fulfill(M.ok({ ...row, roles: body.roles ?? row.roles } satisfies AdminUserRow));
  });
  await page.route('**/api/admin/users/*/status', (r) => {
    if (!tokenOk(r)) return r.fulfill(badToken);
    const uid = new URL(r.request().url()).pathname.split('/').at(-2) ?? '';
    const body = JSON.parse(r.request().postData() || '{}') as { disabled?: boolean };
    const row = users.users.find((u) => u.uid === uid);
    if (!row) return r.fulfill(M.notFound());
    return r.fulfill(M.ok({ ...row, disabled: body.disabled ?? row.disabled } satisfies AdminUserRow));
  });

  // Chart & report data tab.
  await page.route('**/api/admin/data-sources', (r) =>
    tokenOk(r) ? r.fulfill(M.ok(dataSources)) : r.fulfill(badToken)
  );
  await page.route('**/api/admin/data-sources/*/refresh', (r) => {
    if (!tokenOk(r)) return r.fulfill(badToken);
    const id = new URL(r.request().url()).pathname.split('/').at(-2) ?? '';
    opts.onRefreshPost?.(id);
    return r.fulfill(M.ok({ id, queued: true, job_id: 'exec-mock-001' }));
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
