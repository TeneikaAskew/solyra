import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useTickerStore } from '@/stores/tickerStore';
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// Exported so tests/helpers/fixtures/reports.ts can pin its fixtures to the
// real contract — a backend shape change then fails `tsc -b` instead of
// silently drifting past a hand-written mock.
export interface ReportEntry {
  filename: string;
  phase: string;
  path: string;
}

function phaseLabel(phase: string): string {
  // "phase1_strat_mining_iwm" → "Phase 1: Strat Mining"
  // "phase6_playbook" → "Phase 6: Playbook"
  return phase
    .replace(/^phase(\d+)/, 'Phase $1:')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export interface ReportGroup {
  /** Numeric phase parsed from "phaseN_*"; null when unparseable. */
  phaseNum: number | null;
  label: string;
  reports: ReportEntry[];
}

/** Group the flat report list into pipeline phases so the picker reads as
 *  the pipeline it is: Phase 1 (Mining) … Phase 6 (Playbook) … rather than
 *  ten near-identical "Phase N: …" rows. Order is numeric; unparseable
 *  phases sort last, preserving their original relative order. */
export function groupReportsByPhase(reports: ReportEntry[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  for (const r of reports) {
    const m = /^phase(\d+)/.exec(r.phase);
    const key = m ? m[1] : `_${r.phase}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        phaseNum: m ? Number(m[1]) : null,
        label: m ? `Phase ${m[1]}` : r.phase,
        reports: [],
      };
      groups.set(key, g);
    }
    g.reports.push(r);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.phaseNum === null) return 1;
    if (b.phaseNum === null) return -1;
    return a.phaseNum - b.phaseNum;
  });
}

export interface ReportListResponse {
  ticker: string;
  reports: ReportEntry[];
}

function useReportList(ticker: string) {
  return useQuery<ReportListResponse>({
    queryKey: ['report-list', ticker],
    queryFn: async () => {
      const r = await fetch(`/api/reports/list/${ticker}`);
      if (!r.ok) throw new Error('Failed to fetch report list');
      return r.json();
    },
    staleTime: 60_000,
  });
}

function useReportContent(ticker: string, phase: string, enabled: boolean) {
  return useQuery<string>({
    queryKey: ['report-content', ticker, phase],
    queryFn: async () => {
      const r = await fetch(`/api/reports/${ticker}/${phase}`);
      if (!r.ok) throw new Error('Report not found');
      return r.text();
    },
    enabled: enabled && !!ticker && !!phase,
    staleTime: 300_000,
  });
}

// Configure marked for GFM (tables, strikethrough, etc.)
marked.setOptions({ gfm: true, breaks: false });

/** Markdown -> sanitized HTML. Reports are pipeline-generated, but embedded
 *  third-party text (news headlines etc.) must never execute in the app. */
export function renderReportHtml(markdown: string): string {
  return DOMPurify.sanitize(marked.parse(markdown) as string);
}

function ReportViewer({ ticker, phase }: { ticker: string; phase: string }) {
  const { data: content, isLoading, isError } = useReportContent(ticker, phase, true);

  const html = useMemo(() => {
    if (!content) return '';
    return renderReportHtml(content);
  }, [content]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
        Loading report…
      </div>
    );
  }

  if (isError || !content) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-[var(--warn)]">
        <AlertTriangle size={16} />
        Report not available.
      </div>
    );
  }

  return (
    <div
      className="prose-report mx-auto w-full max-w-[75ch] p-4 sm:p-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const label = direction === 'prev' ? 'Previous report' : 'Next report';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon size={14} />
    </button>
  );
}

export default function ReportsPage() {
  const { activeTicker } = useTickerStore();
  const [selectedPhase, setSelectedPhase] = useState<string>('');

  const { data: listData, isLoading: listLoading, isError: listError } = useReportList(activeTicker);
  const reports = useMemo(() => listData?.reports ?? [], [listData]);
  const groups = useMemo(() => groupReportsByPhase(reports), [reports]);

  const activePhase = selectedPhase || (reports[0]?.phase ?? '');
  const activeIndex = reports.findIndex(r => r.phase === activePhase);
  const activeReport = activeIndex >= 0 ? reports[activeIndex] : undefined;

  const go = (delta: number) => {
    const next = reports[activeIndex + delta];
    if (next) setSelectedPhase(next.phase);
  };

  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      {/* Picker bar: report selection lives at the top so the report body
          keeps the full page width on every screen size. */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Reports — {activeTicker}
        </span>
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <FileText
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <select
            aria-label="Select report"
            className="w-full appearance-none truncate rounded-lg border border-[var(--color-border)] bg-[var(--surface-2)] py-2 pl-8 pr-8 text-sm text-[var(--color-text-primary)]"
            value={activePhase}
            disabled={listLoading || reports.length === 0}
            onChange={e => setSelectedPhase(e.target.value)}
          >
            {reports.length === 0 && <option value="">No reports</option>}
            {groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.reports.map(r => (
                  <option key={r.phase} value={r.phase}>
                    {phaseLabel(r.phase)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <NavButton direction="prev" disabled={activeIndex <= 0} onClick={() => go(-1)} />
          <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
            {activeIndex >= 0 ? `${activeIndex + 1} / ${reports.length}` : '—'}
          </span>
          <NavButton
            direction="next"
            disabled={activeIndex < 0 || activeIndex >= reports.length - 1}
            onClick={() => go(1)}
          />
        </div>
      </div>

      {listError && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--warn)]/40 p-3 text-sm text-[var(--warn)]">
          <AlertTriangle size={14} />
          Could not load the report list for {activeTicker}.
        </div>
      )}
      {!listLoading && !listError && reports.length === 0 && (
        <div className="text-sm text-[var(--color-text-muted)]">
          No reports yet. Run the analysis pipeline to generate them.
        </div>
      )}

      {/* Report header: what you're reading, in pipeline order. */}
      {activeReport && (
        <div className="min-w-0">
          <h1 className="break-words text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
            {phaseLabel(activeReport.phase)}
          </h1>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{activeReport.filename}</p>
        </div>
      )}

      {/* Content: full width, prose capped for readability. */}
      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl bg-[var(--surface-2)]">
        {activePhase ? (
          <ReportViewer ticker={activeTicker} phase={activePhase} />
        ) : (
          !listLoading && (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
              Select a report above
            </div>
          )
        )}
      </div>
    </div>
  );
}
