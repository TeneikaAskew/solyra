/**
 * Typed fixtures + route wiring for the model-routing dashboard (`/admin`).
 *
 * Endpoint fan-out, read off AdminPage.tsx:
 *   GET /api/admin/routes         token probe + useAdminRoutes → { routes }
 *   GET /api/admin/models         useAdminModels               → { models }
 *   PUT /api/admin/routes/{role}  useUpdateAdminRoute          → RouteRow
 *   GET /api/me                   useUser (via mockCommon, non-admin)
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
import type { Page } from '@playwright/test';
import type {
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
  /** Called with the parsed body of each PUT /api/admin/routes/{role}. */
  onRoutePut?: (role: string, body: unknown) => void;
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
