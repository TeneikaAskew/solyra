import type { AdminDataSourceRow, DataSourceStatus } from '@/hooks/useAdmin';

// Presentation-boundary formatters for the admin data-source table. Rule 4
// allows an em-dash here — and only here — for a genuinely missing value.

export function fmtCount(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return n.toLocaleString();
}

export function fmtWhen(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export function statusClass(status: DataSourceStatus): string {
  if (status === 'ok') return 'border-[var(--bull)] text-[var(--bull)]';
  if (status === 'stale') return 'border-[var(--warn,var(--color-border))] text-[var(--color-text-secondary)]';
  if (status === 'error') return 'border-[var(--bear)] text-[var(--bear)]';
  return 'border-[var(--color-border)] text-[var(--color-text-muted)]';
}

export function coverage(row: AdminDataSourceRow): string {
  if (!row.coverage_start && !row.coverage_end) return '—';
  return `${row.coverage_start ?? '—'} → ${row.coverage_end ?? '—'}`;
}
