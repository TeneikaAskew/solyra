import type { InsightReport, InsightHistoryRow, Catalyst, RiskFlag } from '@/types/insights';
import { riskReward } from '@/lib/risk';
import { fmtPrice } from '@/lib/format';

/** Number guard: JSONB reports can carry missing/non-numeric fields. Never coerce to 0. */
export function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export interface PlanSummary {
  entryLow: number | null;
  entryHigh: number | null;
  entryMid: number | null;
  stop: number | null;
  targets: number[];
  rr: number | null;
}

export function planSummary(report: InsightReport): PlanSummary {
  const entryLow = num(report.entry_zone?.low);
  const entryHigh = num(report.entry_zone?.high);
  const entryMid = entryLow != null && entryHigh != null ? (entryLow + entryHigh) / 2 : entryLow ?? entryHigh;
  const stop = num(report.stop);
  const targets = Array.isArray(report.targets) ? report.targets.filter((t): t is number => num(t) != null) : [];
  return { entryLow, entryHigh, entryMid, stop, targets, rr: riskReward(entryMid, targets[0] ?? null, stop) };
}

/** Known report sections; failed ones come from the backend's failed_sections list. */
export const REPORT_SECTIONS = [
  'thesis', 'trade_plan', 'key_levels', 'strat', 'catalysts', 'debate', 'risk', 'persona_plans', 'signals', 'similar_trades',
] as const;

export interface DataHealth { total: number; ok: number; failed: { name: string; reason: string | null }[] }

export function dataHealth(report: InsightReport): DataHealth {
  const failedNames = Array.isArray(report.failed_sections) ? report.failed_sections : [];
  const reasons = report.failed_section_reasons ?? {};
  const all = new Set<string>([...REPORT_SECTIONS, ...failedNames]);
  return {
    total: all.size,
    ok: all.size - failedNames.length,
    failed: failedNames.map((name) => ({ name, reason: reasons[name] ?? null })),
  };
}

export function planText(ticker: string, report: InsightReport): string {
  const p = planSummary(report);
  return [
    `${ticker} ${String(report.direction ?? 'unknown').toUpperCase()} (${report.conviction ?? 'n/a'} conviction, ${report.time_horizon ?? 'n/a'})`,
    `Entry ${fmtPrice(p.entryLow)} - ${fmtPrice(p.entryHigh)}`,
    `Stop ${fmtPrice(p.stop)}`,
    `Targets ${p.targets.length ? p.targets.map((t) => fmtPrice(t)).join(', ') : 'unavailable'}`,
    `R:R ${p.rr != null ? p.rr.toFixed(2) : 'unavailable'}`,
    `Invalidation: ${report.invalidation || 'unavailable'}`,
  ].join('\n');
}

/** Upcoming catalysts first (soonest first), then past ones most recent first. */
export function sortCatalysts(catalysts: Catalyst[], now = Date.now()): (Catalyst & { daysAway: number | null })[] {
  const rows = (Array.isArray(catalysts) ? catalysts : []).map((c) => {
    const t = Date.parse(c.date);
    return { ...c, t: Number.isFinite(t) ? t : null };
  });
  const day = 86_400_000;
  const withDays = rows.map((r) => ({ ...r, daysAway: r.t == null ? null : Math.round((r.t - now) / day) }));
  const upcoming = withDays.filter((r) => r.t != null && r.t >= now - day).sort((a, b) => a.t! - b.t!);
  const past = withDays.filter((r) => r.t != null && r.t < now - day).sort((a, b) => b.t! - a.t!);
  const undated = withDays.filter((r) => r.t == null);
  return [...upcoming, ...past, ...undated].map(({ t: _t, ...rest }) => rest);
}

const SEV: Record<string, number> = { block: 0, warn: 1, info: 2 };
export function sortRisks(flags: RiskFlag[]): RiskFlag[] {
  return [...(Array.isArray(flags) ? flags : [])].sort((a, b) => (SEV[a.severity] ?? 3) - (SEV[b.severity] ?? 3));
}

/** For each history row (newest first), the direction of the next-older row, so the UI can show "flat to long". */
export function withDirectionChange(rows: InsightHistoryRow[]): (InsightHistoryRow & { previous: string | null })[] {
  return rows.map((r, i) => ({ ...r, previous: rows[i + 1]?.direction ?? null }));
}

export function ageLabel(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (mins < 60) return `${mins}m old`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h old`;
  return `${Math.round(hrs / 24)}d old`;
}
