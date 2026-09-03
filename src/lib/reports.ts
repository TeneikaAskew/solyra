import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Exported so tests/helpers/fixtures/reports.ts can pin its fixtures to the
// real contract — a backend shape change then fails `tsc -b` instead of
// silently drifting past a hand-written mock.
export interface ReportEntry {
  filename: string;
  phase: string;
  path: string;
}

export interface ReportListResponse {
  ticker: string;
  reports: ReportEntry[];
}

export function phaseLabel(phase: string): string {
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

// Configure marked for GFM (tables, strikethrough, etc.)
marked.setOptions({ gfm: true, breaks: false });

/** Markdown -> sanitized HTML. Reports are pipeline-generated, but embedded
 *  third-party text (news headlines etc.) must never execute in the app. */
export function renderReportHtml(markdown: string): string {
  return DOMPurify.sanitize(marked.parse(markdown) as string);
}
