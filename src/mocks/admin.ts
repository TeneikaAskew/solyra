/**
 * Typed fixtures + mock-mode routes for the model-routing dashboard
 * (`/admin`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/admin.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
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
 * gates /api/admin/* on the same role check. In mock mode /api/me answers
 * with MOCK_ME_DEV (./common) — a signed-in dev/admin — so `adminRoutes`
 * carries no /api/me override and no access-denied branch.
 *
 * AdminPage also renders <StructureBrief> (which embeds <PredictForm>) and
 * <ModelStateSnapshot>, so the strat-engine endpoints below are part of this
 * page's surface too — an earlier version of this file wrongly claimed they
 * were not.
 */
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
import type { MockRoute } from './types';

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
      // Clearly-fake domain: src/mocks ships in the production bundle
      // (unlike tests/), so no real address belongs in a fixture here.
      email: 'admin@mock.solyra',
      display_name: 'Teneika',
      roles: ['admin'],
      disabled: false,
      created_at: '2026-01-05T15:00:00Z',
      last_sign_in_at: '2026-04-24T13:10:00Z',
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
  // Mirrors admin.py _ASSIGNABLE_ROLES: 'dev' loads the mock-data mode on
  // sign-in; it grants no API access.
  available_roles: ['admin', 'user', 'dev'],
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
      last_refreshed_at: '2026-04-24T20:05:00Z',
      coverage_start: '2020-01-02',
      coverage_end: '2026-04-24',
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
      refreshed_at: '2026-04-24T20:00:00+00:00',
      note: null,
    },
    {
      ticker: 'IWM',
      timeframe: '15m',
      available: false,
      top_class: null,
      top_prob: null,
      distribution: [],
      live_ece: 0.113,
      ece_ceiling: 0.08,
      muted: true,
      mute_reason: 'live ECE 0.113 exceeds the 0.08 ceiling',
      refreshed_at: '2026-04-24T20:00:00+00:00',
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
      timeframe: '15m',
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
  ts: '2026-04-24T19:30:00+00:00',
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
  timeframe: '15m',
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

/**
 * Mock-mode route table for `/admin` — the happy-path translation of
 * `mockAdminApi` (tests/helpers/fixtures/admin.ts) with its default options.
 * The mutation replies copy the fixture's echo logic so the UI's optimistic
 * updates see the same shapes the E2E suite pins.
 */
export const adminRoutes: MockRoute[] = [
  { pattern: /^\/api\/admin\/routes$/, reply: () => ({ body: MOCK_ADMIN_ROUTES }) },
  { pattern: /^\/api\/admin\/models$/, reply: () => ({ body: MOCK_ADMIN_MODELS }) },
  {
    method: 'PUT',
    pattern: /^\/api\/admin\/routes\/([^/]+)$/,
    reply: (req, match) => {
      const body = (req.body ?? {}) as { model?: unknown };
      return { body: updatedRoute(match[1], String(body.model ?? '')) };
    },
  },
  { pattern: /^\/api\/admin\/users$/, reply: () => ({ body: MOCK_ADMIN_USERS }) },
  {
    method: 'PUT',
    pattern: /^\/api\/admin\/users\/([^/]+)\/roles$/,
    reply: (req, match) => {
      const body = (req.body ?? {}) as { roles?: string[] };
      const row =
        MOCK_ADMIN_USERS.users.find((u) => u.uid === match[1]) ?? MOCK_ADMIN_USERS.users[0];
      return { body: { ...row, roles: body.roles ?? [] } satisfies AdminUserRow };
    },
  },
  {
    method: 'PUT',
    pattern: /^\/api\/admin\/users\/([^/]+)\/status$/,
    reply: (req, match) => {
      const body = (req.body ?? {}) as { disabled?: boolean };
      const row =
        MOCK_ADMIN_USERS.users.find((u) => u.uid === match[1]) ?? MOCK_ADMIN_USERS.users[0];
      return { body: { ...row, disabled: body.disabled ?? false } satisfies AdminUserRow };
    },
  },
  { pattern: /^\/api\/admin\/data-sources$/, reply: () => ({ body: MOCK_ADMIN_DATA_SOURCES }) },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/data-sources\/([^/]+)\/refresh$/,
    reply: (_req, match) => ({ body: { id: match[1], queued: true, job_id: 'job-e2e-1' } }),
  },
  { pattern: /^\/api\/admin\/structure-brief$/, reply: () => ({ body: MOCK_STRUCTURE_BRIEF }) },
  {
    pattern: /^\/api\/admin\/strat-engine\/state$/,
    reply: () => ({ body: MOCK_STRAT_ENGINE_STATE }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/strat-engine\/predict$/,
    reply: () => ({ body: MOCK_STRAT_PREDICT }),
  },
];
