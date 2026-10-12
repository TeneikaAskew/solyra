import { useState } from 'react';
import type React from 'react';
import { AlertTriangle, ArrowRight, Check, Copy, Network, ShieldAlert, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { InsightReport, InsightHistoryRow, PersonaPlan } from '@/types/insights';
import { fmtPrice, NA } from '@/lib/format';
import { ageLabel, dataHealth, groupKeyLevels, planSummary, planText, sortCatalysts, sortRisks, withDirectionChange } from './decision';

const DIR_TONE: Record<string, string> = {
  long: 'text-[var(--bull)] border-[var(--bull)]/50 bg-[var(--bull)]/10',
  short: 'text-[var(--bear)] border-[var(--bear)]/50 bg-[var(--bear)]/10',
};
export function dirClass(d: string | null | undefined) {
  return DIR_TONE[d ?? ''] ?? 'text-[var(--on-surface-variant)] border-[var(--outline-variant)] bg-[var(--surface-2)]';
}
function dirLabel(d: string | null | undefined) {
  return d === 'flat' ? 'Neutral' : d ? d[0].toUpperCase() + d.slice(1) : 'Unknown';
}

export function Section({ title, aside, children, className = '' }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`min-w-0 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--on-surface)]">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  const missing = value === NA;
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-[var(--on-surface-muted)]">{label}</div>
      <div className={`mt-0.5 truncate font-mono text-[15px] font-semibold tabular-nums ${missing ? 'text-[var(--on-surface-muted)]' : tone === 'bull' ? 'text-[var(--bull)]' : tone === 'bear' ? 'text-[var(--bear)]' : 'text-[var(--on-surface)]'}`} title={missing ? 'Unavailable in this report' : undefined}>
        {value}
      </div>
    </div>
  );
}

/** The call, the plan and the health of the data behind it, in one glance. */
export function DecisionBar({ ticker, report, asOf, onOpenAgents, historical }: {
  ticker: string; report: InsightReport; asOf: string | null; onOpenAgents: () => void; historical: boolean;
}) {
  const p = planSummary(report);
  const health = dataHealth(report);
  const [copied, setCopied] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const confidence = typeof report.confidence_score === 'number' ? Math.round(report.confidence_score * (report.confidence_score <= 1 ? 100 : 1)) : null;
  const age = ageLabel(asOf);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planText(ticker, report));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-label="Decision" className="rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-1)] p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={`rounded-lg border px-3 py-1 text-[15px] font-bold ${dirClass(report.direction)}`}>{dirLabel(report.direction)}</span>
        <span className="text-sm text-[var(--on-surface-variant)]"><b className="text-[var(--on-surface)]">{report.conviction ?? NA}</b> conviction</span>
        <span className="text-sm text-[var(--on-surface-variant)]"><b className="font-mono text-[var(--on-surface)]">{confidence != null ? `${confidence}%` : NA}</b> confidence</span>
        <span className="text-sm text-[var(--on-surface-variant)]">{report.time_horizon ?? NA} horizon</span>
        <span className={`text-xs ${historical ? 'text-[var(--warn)]' : 'text-[var(--on-surface-muted)]'}`}>
          {asOf ? new Date(asOf).toLocaleString() : 'Time unavailable'}{age ? ` (${age})` : ''}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Metric label="Entry zone" value={p.entryLow != null || p.entryHigh != null ? `${fmtPrice(p.entryLow)} - ${fmtPrice(p.entryHigh)}` : NA} />
        <Metric label="Stop" value={fmtPrice(p.stop)} tone="bear" />
        <Metric label="Target 1" value={fmtPrice(p.targets[0] ?? null)} tone="bull" />
        <Metric label="Target 2" value={fmtPrice(p.targets[1] ?? null)} tone="bull" />
        <Metric label="Reward : risk" value={p.rr != null ? `${p.rr.toFixed(2)}x` : NA} />
      </div>

      {report.invalidation && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--warn)]">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span><b>Wrong if:</b> {report.invalidation}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-container)] px-3 py-1.5 text-xs font-semibold text-[var(--on-brand)] hover:brightness-110 active:scale-[0.98]">
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy plan'}
        </button>
        <button type="button" onClick={onOpenAgents} className="flex items-center gap-1.5 rounded-lg border border-[var(--outline-variant)] px-3 py-1.5 text-xs font-medium text-[var(--on-surface-variant)] hover:border-[var(--brand)] hover:text-[var(--on-surface)]">
          <Network size={14} />How the AI decided
        </button>
        <button
          type="button"
          onClick={() => setHealthOpen((v) => !v)}
          aria-expanded={healthOpen}
          className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${health.failed.length ? 'border-[var(--warn)]/50 text-[var(--warn)]' : 'border-[var(--outline-variant)] text-[var(--on-surface-muted)]'}`}
        >
          {health.failed.length ? <AlertTriangle size={14} /> : <Check size={14} />}
          Data {health.ok}/{health.total} sections ok
        </button>
      </div>
      {healthOpen && (
        <div className="mt-3 rounded-lg border border-[var(--outline-variant)] p-3 text-xs" role="note">
          {health.failed.length === 0 ? (
            <span className="text-[var(--on-surface-muted)]">Every section of this report came back from the backend.</span>
          ) : (
            <ul className="space-y-1">
              {health.failed.map((f) => (
                <li key={f.name} className="text-[var(--warn)]"><b>{f.name.replace(/_/g, ' ')}</b>: {f.reason ?? 'no reason reported by the backend'}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function ThesisBlock({ thesis }: { thesis: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!thesis) return <p className="text-sm italic text-[var(--on-surface-muted)]">Thesis unavailable in this report.</p>;
  const long = thesis.length > 280;
  return (
    <div>
      <p className={`max-w-[70ch] text-[15px] leading-7 text-[var(--on-surface-variant)] ${long && !open ? 'line-clamp-3' : ''}`}>{thesis}</p>
      {long && <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs font-semibold text-[var(--brand)]">{open ? 'Show less' : 'Read full thesis'}</button>}
    </div>
  );
}

export function BullBear({ bull, bear }: { bull: string | null | undefined; bear: string | null | undefined }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border-l-2 border-[var(--bull)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--bull)]"><TrendingUp size={14} />Bull case</div>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">{bull || 'Unavailable in this report.'}</p>
      </div>
      <div className="rounded-lg border-l-2 border-[var(--bear)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--bear)]"><TrendingDown size={14} />Bear case</div>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">{bear || 'Unavailable in this report.'}</p>
      </div>
    </div>
  );
}

export function PersonaTabs({ plans }: { plans: PersonaPlan[] }) {
  const list = Array.isArray(plans) ? plans : [];
  const [active, setActive] = useState(0);
  if (list.length === 0) return <p className="text-xs text-[var(--on-surface-muted)]">No persona plans in this report.</p>;
  const p = list[Math.min(active, list.length - 1)];
  return (
    <div>
      <div role="tablist" className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-0.5">
        {list.map((pl, i) => (
          <button key={pl.persona} role="tab" aria-selected={i === active} type="button" onClick={() => setActive(i)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize ${i === active ? 'bg-[var(--surface-lowest)] text-[var(--on-surface)]' : 'text-[var(--on-surface-muted)]'}`}>
            {pl.persona}
          </button>
        ))}
      </div>
      <dl className="mt-3 max-w-md space-y-1.5 text-sm tabular-nums">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-[var(--on-surface-muted)]">Entry</dt>
          <dd className="text-right font-mono font-semibold text-[var(--on-surface)]">
            {p.entry_zone ? `${fmtPrice(p.entry_zone.low)} – ${fmtPrice(p.entry_zone.high)}` : NA}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-[var(--on-surface-muted)]">Stop</dt>
          <dd className="text-right font-mono font-semibold text-[var(--bear)]">{fmtPrice(p.stop)}</dd>
        </div>
        {(Array.isArray(p.targets) ? p.targets : []).map((t, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-[var(--on-surface-muted)]">Target {i + 1}</dt>
            <dd className="text-right font-mono font-semibold text-[var(--bull)]">{fmtPrice(t)}</dd>
          </div>
        ))}
        {(!Array.isArray(p.targets) || p.targets.length === 0) && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-[var(--on-surface-muted)]">Targets</dt>
            <dd className="text-right font-mono text-[var(--on-surface-muted)]">{NA}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-[var(--outline-variant)] pt-1.5">
          <dt className="shrink-0 text-[var(--on-surface-muted)]">Size</dt>
          <dd className="text-right font-mono font-semibold text-[var(--on-surface)]">
            {typeof p.position_size_pct === 'number' ? `${p.position_size_pct}%` : NA}
          </dd>
        </div>
      </dl>
      {p.rationale && <p className="mt-3 text-sm leading-6 text-[var(--on-surface-variant)]">{p.rationale}</p>}
    </div>
  );
}

export function CatalystRail({ report }: { report: InsightReport }) {
  const rows = sortCatalysts(report.catalysts);
  if (report.failed_sections?.includes('catalysts')) return <p role="note" className="text-xs text-[var(--warn)]">Catalyst data failed to load for this report.</p>;
  if (rows.length === 0) return <p className="text-xs text-[var(--on-surface-muted)]">No catalysts in the report window.</p>;
  return (
    <ol className="space-y-2">
      {rows.slice(0, 6).map((c, i) => (
        <li key={`${c.name}-${i}`} className="flex items-start gap-3">
          <span className={`w-14 shrink-0 font-mono text-[11px] tabular-nums ${c.daysAway != null && c.daysAway >= 0 && c.daysAway <= 3 ? 'font-bold text-[var(--warn)]' : 'text-[var(--on-surface-muted)]'}`}>
            {c.daysAway == null ? 'No date' : c.daysAway === 0 ? 'Today' : c.daysAway > 0 ? `in ${c.daysAway}d` : `${-c.daysAway}d ago`}
          </span>
          <span className="min-w-0 flex-1 text-sm text-[var(--on-surface)]">{c.name}</span>
          <span className={`shrink-0 text-[10px] font-semibold uppercase ${c.impact === 'high' ? 'text-[var(--bear)]' : 'text-[var(--on-surface-muted)]'}`}>{c.impact}</span>
        </li>
      ))}
    </ol>
  );
}

export function RiskRail({ report }: { report: InsightReport }) {
  const flags = sortRisks(report.risk_flags);
  if (flags.length === 0) return <p className="text-xs text-[var(--on-surface-muted)]">No risk flags raised.</p>;
  return (
    <ul className="space-y-2">
      {flags.slice(0, 5).map((f, i) => (
        <li key={i} className={`rounded-lg border-l-2 px-3 py-2 text-xs leading-5 ${f.severity === 'block' ? 'border-[var(--bear)] text-[var(--on-surface)]' : f.severity === 'warn' ? 'border-[var(--warn)] text-[var(--on-surface-variant)]' : 'border-[var(--outline-variant)] text-[var(--on-surface-muted)]'}`}>
          <span className="mr-1 font-semibold capitalize">{f.persona}:</span>{f.message}
        </li>
      ))}
    </ul>
  );
}

export function KeyLevelChips({ levels }: { levels: Record<string, number> | null | undefined }) {
  const columns = groupKeyLevels(levels);
  if (columns.every((column) => column.rows.length === 0)) return <p className="text-xs text-[var(--on-surface-muted)]">No key levels in this report.</p>;
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
      {columns.map((col) => (
        <div key={col.title} className="min-w-0">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--on-surface-muted)]">{col.title}</p>
          {col.rows.length === 0 ? (
            <p className="text-xs text-[var(--on-surface-muted)]">—</p>
          ) : (
            <ul className="space-y-1">
              {col.rows.map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 break-words text-[var(--on-surface-muted)]">{k.replace(/_/g, ' ')}</span>
                  <b className="shrink-0 font-mono tabular-nums text-[var(--on-surface)]">{fmtPrice(v)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[var(--surface-0)]/70" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--outline-variant)] bg-[var(--surface-1)]">
        <div className="flex items-center justify-between border-b border-[var(--outline-variant)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--on-surface)]">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="rounded p-1 text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]"><X size={16} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function HistoryList({ rows, activeId, onSelect }: { rows: InsightHistoryRow[]; activeId: string | null; onSelect: (id: string) => void }) {
  if (rows.length === 0) return <p className="text-xs text-[var(--on-surface-muted)]">No past reports for this ticker yet.</p>;
  return (
    <ul className="space-y-2">
      {withDirectionChange(rows).map((r) => {
        const changed = r.previous != null && r.previous !== r.direction;
        return (
          <li key={r.id}>
            <button type="button" onClick={() => onSelect(r.id)} className={`w-full rounded-lg border p-3 text-left hover:border-[var(--brand)] ${activeId === r.id ? 'border-[var(--brand)]' : 'border-[var(--outline-variant)]'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${dirClass(r.direction)}`}>{dirLabel(r.direction)}</span>
                {changed && <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--warn)]">changed from {dirLabel(r.previous)} <ArrowRight size={11} /></span>}
                <span className="ml-auto text-[11px] text-[var(--on-surface-muted)]">{r.as_of ? new Date(r.as_of).toLocaleString() : 'Time unavailable'}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[var(--on-surface-variant)]">{r.thesis ?? 'No summary recorded'}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
