import { useState } from 'react';
import { Loader2, Lock, Save } from 'lucide-react';
import {
  useAdminModels,
  useAdminRoutes,
  useUpdateAdminRoute,
  type AvailableModelRow,
} from '@/hooks/useAdmin';
import { useUser } from '@/hooks/useUser';
import { StructureBrief } from '@/components/structure_brief/StructureBrief';
import { PredictForm } from '@/components/structure_brief/PredictForm';
import { ModelStateSnapshot } from '@/components/structure_brief/ModelStateSnapshot';

// ---------------------------------------------------------------------------
// Admin page — per-role model routing dashboard.
//
// Auth is ROLE-BASED: the server-verified identity (Firebase token / IAP
// email) must hold the admin role — api/auth.is_admin_email in stocks (the
// `user_roles` table with ADMIN_EMAIL as fallback), the same check behind
// /api/me's `is_admin` flag. The old shared X-Admin-Token + sessionStorage
// gate is GONE: the backend no longer accepts a token, and a per-user,
// revocable role is the credential a shared secret never was.
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const { isAdmin, isLoading: userLoading } = useUser();

  if (userLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const authed = isAdmin;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-[22px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">Admin</h1>
      {authed ? (
        <div className="space-y-8">
          <RoutingPanel />

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
              Structure Brief
              <span className="ml-2 rounded bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[var(--color-text-muted)]">
                dev only · deploy blocked
              </span>
            </h2>
            <StructureBrief enabled={authed} />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
              On-Demand Predict
              <span className="ml-2 rounded bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[var(--color-text-muted)]">
                admin tool · single bar
              </span>
            </h2>
            <PredictForm enabled={authed} />
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-text-primary)]">
              Model State Snapshot
              <span className="ml-2 rounded bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[var(--color-text-muted)]">
                operator view · on shelf
              </span>
            </h2>
            <ModelStateSnapshot enabled={authed} />
          </section>
        </div>
      ) : (
        <div
          className="mx-auto max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6"
          data-testid="admin-denied"
        >
          <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
            <Lock size={14} />
            Admin access required
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Admin access is granted per account: the signed-in identity must hold the admin
            role (assigned server-side alongside the Firebase sign-in). This account doesn't.
            Shared admin tokens are no longer accepted.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Routing panel
//
// Audit 2026-05-08 G.P2.4 dormancy note: this dashboard is intentionally
// kept available even though all 7 roles seed at the same provider/model
// (vertex:gemini-2.0-flash) on a fresh install. The UI lets an operator
// A/B a single role without code changes — e.g. swap `judge` to
// gemini-2.5-pro for one week and compare verdict quality on
// insight_reports.report->'thesis' before deciding whether to
// permanently diversify. Until per-role evidence justifies it, this
// stays a single-model deployment by design (not a bug).
// ---------------------------------------------------------------------------

function RoutingPanel() {
  const routesQuery = useAdminRoutes(true);
  const modelsQuery = useAdminModels(true);
  const updateMut = useUpdateAdminRoute();
  const [draft, setDraft] = useState<Record<string, { provider: string; model: string }>>({});

  // No token to clear and no gate to fall back to — an auth failure here
  // means /api/me said admin but the admin routes disagreed (role drift, or
  // an expired sign-in). Say so instead of rendering an empty table.
  if (routesQuery.error) {
    return (
      <div className="p-4 text-xs text-[var(--bear)]" data-testid="admin-error">
        {routesQuery.error.message === 'unauthorized'
          ? 'The server rejected this account for admin routes — sign in again, or check the admin role assignment.'
          : `Failed to load routes: ${routesQuery.error.message}`}
      </div>
    );
  }

  const routes = routesQuery.data?.routes ?? [];
  const models = modelsQuery.data?.models ?? [];

  const getDraft = (role: string, field: 'provider' | 'model') => {
    const row = routes.find((r) => r.role === role);
    return draft[role]?.[field] ?? row?.[field] ?? '';
  };

  const setDraftField = (role: string, field: 'provider' | 'model', value: string) => {
    setDraft((d) => {
      const row = routes.find((r) => r.role === role);
      const existing = d[role] ?? {
        provider: row?.provider ?? '',
        model: row?.model ?? '',
      };
      return { ...d, [role]: { ...existing, [field]: value } };
    });
  };

  const isDirty = (role: string) => {
    const row = routes.find((r) => r.role === role);
    if (!row) return false;
    const d = draft[role];
    if (!d) return false;
    return d.provider !== row.provider || d.model !== row.model;
  };

  const onSave = async (role: string) => {
    const d = draft[role];
    if (!d) return;
    await updateMut.mutateAsync({ role, provider: d.provider, model: d.model });
    setDraft((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  };

  if (routesQuery.isLoading || modelsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-[var(--color-text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Model Routing</h2>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]" data-testid="admin-routes-table">
        <table className="w-full text-xs">
          <thead className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Provider</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Updated</th>
              <th className="px-3 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => {
              const selectedProvider = getDraft(r.role, 'provider');
              const selectedModel = getDraft(r.role, 'model');
              const providerOptions = Array.from(new Set(models.map((m) => m.provider)));
              const modelOptions = models.filter((m) => m.provider === selectedProvider);
              return (
                <tr key={r.role} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 font-mono">{r.role}</td>
                  <td className="px-3 py-2">
                    <select
                      value={selectedProvider}
                      onChange={(e) => {
                        const p = e.target.value;
                        setDraftField(r.role, 'provider', p);
                        // Reset model to first available one for that provider
                        const first = models.find((m) => m.provider === p);
                        if (first) setDraftField(r.role, 'model', first.model);
                      }}
                      data-testid={`provider-${r.role}`}
                      className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
                    >
                      {providerOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <ModelSelect
                      role={r.role}
                      value={selectedModel}
                      options={modelOptions}
                      onChange={(v) => setDraftField(r.role, 'model', v)}
                    />
                  </td>
                  <td className="px-3 py-2 text-[10px] text-[var(--color-text-muted)]">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}
                    {r.updated_by ? ` · ${r.updated_by}` : ''}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onSave(r.role)}
                      disabled={!isDirty(r.role) || updateMut.isPending}
                      data-testid={`save-${r.role}`}
                      className="inline-flex items-center gap-1 rounded bg-[var(--color-accent-blue)] px-2 py-1 text-[10px] text-[var(--on-brand)] disabled:opacity-40"
                    >
                      <Save size={11} />
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {updateMut.error && (
        <div className="text-xs text-[var(--bear)]">
          {updateMut.error.message}
        </div>
      )}
    </div>
  );
}

function ModelSelect({
  role,
  value,
  options,
  onChange,
}: {
  role: string;
  value: string;
  options: AvailableModelRow[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={`model-${role}`}
      className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)]"
    >
      {options.map((m) => (
        <option key={m.model} value={m.model} disabled={!m.has_credentials}>
          {m.model}
          {m.has_credentials ? '' : ' (no creds)'}
          {` · $${m.input_usd_per_mtok}/$${m.output_usd_per_mtok}`}
        </option>
      ))}
    </select>
  );
}
