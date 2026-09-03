import { useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  useAdminDataSources,
  useRefreshDataSource,
  type AdminDataSourceRow,
  type DataSourceStatus,
} from '@/hooks/useAdmin';

/**
 * The datasets that feed charts and reports: freshness, coverage and a
 * manual refresh trigger.
 *
 * Rule 4: row counts and timestamps are nullable end-to-end; a missing value
 * renders as an em-dash rather than a fabricated 0 or "just now".
 */

function fmtCount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return n.toLocaleString();
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function statusClass(status: DataSourceStatus): string {
  if (status === 'ok') return 'border-[var(--bull)] text-[var(--bull)]';
  if (status === 'stale') return 'border-[var(--warn,var(--color-border))] text-[var(--color-text-secondary)]';
  if (status === 'error') return 'border-[var(--bear)] text-[var(--bear)]';
  return 'border-[var(--color-border)] text-[var(--color-text-muted)]';
}

function coverage(row: AdminDataSourceRow): string {
  if (!row.coverage_start && !row.coverage_end) return '—';
  return `${row.coverage_start ?? '—'} → ${row.coverage_end ?? '—'}`;
}

export function DataSourcesPanel({ enabled }: { enabled: boolean }) {
  const query = useAdminDataSources(enabled);
  const refreshMut = useRefreshDataSource();
  const [category, setCategory] = useState<string>('all');

  const sources = query.data?.sources;
  const categories = useMemo(
    () => (sources ? Array.from(new Set(sources.map((s) => s.category))).sort() : []),
    [sources],
  );
  const rows = useMemo(
    () => (sources ? (category === 'all' ? sources : sources.filter((s) => s.category === category)) : null),
    [sources, category],
  );

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-[var(--color-text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div
        data-testid="admin-sources-error"
        className="rounded-lg border border-[var(--bear)] bg-[var(--surface-2)] p-4 text-xs text-[var(--bear)]"
      >
        Could not load data sources: {query.error.message}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-3" data-testid="admin-sources-panel">
      <div className="flex flex-wrap items-center gap-1.5">
        {['all', ...categories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            data-testid={`source-filter-${c}`}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              category === c
                ? 'border-[var(--color-accent-blue)] text-[var(--color-accent-blue)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {refreshMut.error && (
        <div className="text-xs text-[var(--bear)]" data-testid="admin-sources-refresh-error">
          {refreshMut.error.message}
        </div>
      )}

      {rows && rows.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] p-6 text-center text-xs text-[var(--color-text-muted)]">
          No data sources reported for this category.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]" data-testid="admin-sources-table">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Dataset</th>
                <th className="px-3 py-2 text-left">Feeds</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Rows</th>
                <th className="px-3 py-2 text-left">Coverage</th>
                <th className="px-3 py-2 text-left">Last refresh</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((s) => (
                <tr key={s.id} className="border-t border-[var(--color-border)] align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-[var(--color-text-primary)]">{s.label}</div>
                    <div className="font-mono text-[10px] text-[var(--color-text-muted)]">{s.id}</div>
                    {s.message && (
                      <div className="mt-0.5 break-words text-[10px] text-[var(--color-text-secondary)]">{s.message}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)]">{s.category}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--color-text-secondary)]">{fmtCount(s.row_count)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-text-muted)]">{coverage(s)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--color-text-muted)]">{fmtWhen(s.last_refreshed_at)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={!s.refreshable || refreshMut.isPending}
                      onClick={() => refreshMut.mutate({ id: s.id })}
                      data-testid={`refresh-${s.id}`}
                      title={s.refreshable ? 'Queue a refresh job' : 'This dataset cannot be refreshed on demand'}
                      className="inline-flex items-center gap-1 rounded bg-[var(--color-accent-blue)] px-2 py-1 text-[10px] text-[var(--on-brand)] disabled:opacity-40"
                    >
                      <RefreshCw size={11} className={refreshMut.isPending ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
