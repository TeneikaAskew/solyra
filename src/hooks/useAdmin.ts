import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Admin token lives in sessionStorage, NOT in a build-time env var. The
// server validates it via the X-Admin-Token header. See routers/admin.py.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'admin-token';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

function authHeaders(): HeadersInit {
  const tok = getAdminToken();
  return tok ? { 'X-Admin-Token': tok } : {};
}

export interface RouteRow {
  role: string;
  provider: string;
  model: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface AvailableModelRow {
  provider: string;
  model: string;
  has_credentials: boolean;
  input_usd_per_mtok: number;
  output_usd_per_mtok: number;
}

export function useAdminRoutes(enabled: boolean) {
  return useQuery<{ routes: RouteRow[] }>({
    queryKey: ['admin-routes'],
    queryFn: async () => {
      const r = await fetch('/api/admin/routes', { headers: authHeaders() });
      if (r.status === 401) throw new Error('unauthorized');
      if (!r.ok) throw new Error(`admin routes ${r.status}`);
      return r.json();
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminModels(enabled: boolean) {
  return useQuery<{ models: AvailableModelRow[] }>({
    queryKey: ['admin-models'],
    queryFn: async () => {
      const r = await fetch('/api/admin/models', { headers: authHeaders() });
      if (r.status === 401) throw new Error('unauthorized');
      if (!r.ok) throw new Error(`admin models ${r.status}`);
      return r.json();
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Structure brief — dev-only readout of the strat-engine type model's
// per-cell predictions. Sits behind the same admin auth as the routing
// dashboard. NOT wired into any user-facing surface; deploy is blocked
// behind Tracks B and C.
// ---------------------------------------------------------------------------

export interface StructureBriefClassProb {
  cls: '1' | '2U' | '2D' | '3';
  prob: number;
}

export interface StructureBriefCell {
  ticker: string;
  timeframe: string;
  available: boolean;
  top_class: '1' | '2U' | '2D' | '3' | null;
  top_prob: number | null;
  distribution: StructureBriefClassProb[];
  live_ece: number | null;
  ece_ceiling: number;
  muted: boolean;
  mute_reason: string | null;
  refreshed_at: string | null;
  note: string | null;
}

export interface StructureBriefResponse {
  scope_statement: string;
  cells: StructureBriefCell[];
  ece_ceiling: number;
}

export function useStructureBrief(enabled: boolean) {
  return useQuery<StructureBriefResponse>({
    queryKey: ['admin-structure-brief'],
    queryFn: async () => {
      const r = await fetch('/api/admin/structure-brief', { headers: authHeaders() });
      if (r.status === 401) throw new Error('unauthorized');
      if (!r.ok) throw new Error(`structure brief ${r.status}`);
      return r.json();
    },
    enabled,
    staleTime: 60_000,
  });
}


// ---------------------------------------------------------------------------
// Strat-engine on-demand predict — admin-gated single-bar prediction.
// ---------------------------------------------------------------------------

export interface StratPredictRequest {
  ticker: string;
  timeframe: string;
  as_of_timestamp?: string;
}

export interface StratPredictResponse {
  ticker: string;
  timeframe: string;
  ts: string | null;
  available: boolean;
  top_class: '1' | '2U' | '2D' | '3' | null;
  top_prob: number | null;
  class_probs: Record<'1' | '2U' | '2D' | '3', number>;
  model_version: string | null;
  last_train_date: string | null;
  live_ece: number | null;
  muted: boolean;
  mute_reason: string | null;
  scope_statement: string;
  note: string | null;
}

// ---------------------------------------------------------------------------
// Strat-engine model state — operator snapshot.
// ---------------------------------------------------------------------------

export interface StratEngineCellState {
  ticker: string;
  timeframe: string;
  available: boolean;
  model_version: string | null;
  last_train_date: string | null;
  live_ece: number | null;
}

export interface StratEngineStateResponse {
  cells: StratEngineCellState[];
  ece_ceiling: number;
}

export function useStratEngineState(enabled: boolean) {
  return useQuery<StratEngineStateResponse>({
    queryKey: ['admin-strat-engine-state'],
    queryFn: async () => {
      const r = await fetch('/api/admin/strat-engine/state', { headers: authHeaders() });
      if (r.status === 401) throw new Error('unauthorized');
      if (!r.ok) throw new Error(`state ${r.status}`);
      return r.json();
    },
    enabled,
    staleTime: 60_000,
  });
}


export function usePredictMutation() {
  return useMutation<StratPredictResponse, Error, StratPredictRequest>({
    mutationFn: async (body) => {
      const r = await fetch('/api/admin/strat-engine/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (r.status === 401) throw new Error('unauthorized');
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`predict failed: ${r.status} ${text}`);
      }
      return r.json();
    },
  });
}


export function useUpdateAdminRoute() {
  const qc = useQueryClient();
  return useMutation<
    RouteRow,
    Error,
    { role: string; provider: string; model: string }
  >({
    mutationFn: async ({ role, provider, model }) => {
      const r = await fetch(`/api/admin/routes/${role}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ provider, model }),
      });
      if (r.status === 401) throw new Error('unauthorized');
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`update route failed: ${r.status} ${text}`);
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-routes'] });
    },
  });
}

// ---------------------------------------------------------------------------
// User + role administration.
//
// Backed by the stocks repo's admin router:
//   GET  /api/admin/users
//   PUT  /api/admin/users/{uid}/roles    { roles: string[] }
//   PUT  /api/admin/users/{uid}/status   { disabled: boolean }
//
// Rule 4 (no silent fallbacks): every failure throws so the panel can render
// an explicit error. Nullable server fields stay null all the way to the
// presentation layer, which renders them as an em-dash.
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  uid: string;
  email: string | null;
  display_name: string | null;
  roles: string[];
  disabled: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  available_roles: string[];
}

async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (r.status === 401) throw new Error('unauthorized');
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`${init?.method ?? 'GET'} ${url} failed: ${r.status}${text ? ` ${text}` : ''}`);
  }
  return r.json() as Promise<T>;
}

export function useAdminUsers(enabled: boolean) {
  return useQuery<AdminUsersResponse>({
    queryKey: ['admin-users'],
    queryFn: () => adminJson<AdminUsersResponse>('/api/admin/users'),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateUserRoles() {
  const qc = useQueryClient();
  return useMutation<AdminUserRow, Error, { uid: string; roles: string[] }>({
    mutationFn: ({ uid, roles }) =>
      adminJson<AdminUserRow>(`/api/admin/users/${encodeURIComponent(uid)}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roles }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); },
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation<AdminUserRow, Error, { uid: string; disabled: boolean }>({
    mutationFn: ({ uid, disabled }) =>
      adminJson<AdminUserRow>(`/api/admin/users/${encodeURIComponent(uid)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ disabled }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); },
  });
}

// ---------------------------------------------------------------------------
// Data sources feeding charts + reports.
//
//   GET  /api/admin/data-sources
//   POST /api/admin/data-sources/{id}/refresh
// ---------------------------------------------------------------------------

export type DataSourceStatus = 'ok' | 'stale' | 'error' | 'unknown';

export interface AdminDataSourceRow {
  id: string;
  label: string;
  /** Which surface consumes it: charts, reports, signals, … */
  category: string;
  status: DataSourceStatus;
  row_count: number | null;
  last_refreshed_at: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
  message: string | null;
  refreshable: boolean;
}

export interface AdminDataSourcesResponse {
  sources: AdminDataSourceRow[];
}

export function useAdminDataSources(enabled: boolean) {
  return useQuery<AdminDataSourcesResponse>({
    queryKey: ['admin-data-sources'],
    queryFn: () => adminJson<AdminDataSourcesResponse>('/api/admin/data-sources'),
    enabled,
    staleTime: 30_000,
  });
}

export function useRefreshDataSource() {
  const qc = useQueryClient();
  return useMutation<{ id: string; queued: boolean; job_id: string | null }, Error, { id: string }>({
    mutationFn: ({ id }) =>
      adminJson<{ id: string; queued: boolean; job_id: string | null }>(
        `/api/admin/data-sources/${encodeURIComponent(id)}/refresh`,
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-data-sources'] }); },
  });
}
