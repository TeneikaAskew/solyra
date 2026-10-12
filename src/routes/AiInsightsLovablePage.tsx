import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, History as HistoryIcon, ListChecks, Loader2, RefreshCw } from 'lucide-react';
import { DataGate } from '@/components/shared/SignInEmptyState';
import { TickerCombobox } from '@/components/shared/TickerCombobox';
import { useTickerStore } from '@/stores/tickerStore';
import {
  useBriefDirection,
  useInsightHistory,
  useInsightReport,
  useInsightReportById,
  useRefreshInsight,
  useRunStatus,
} from '@/hooks/useInsights';
import { BriefVsInsightsCard, SignalsCard, SimilarTradesCard } from '@/components/insights/ReportCards';
import { AgentsPanel } from '@/components/insights/AgentsPanel';
import { WatchlistPanel } from '@/components/insights/WatchlistPanel';
import { ResearchCandleChart, type PriceLine } from '@/components/insights/ResearchCandleChart';
import { chartTheme } from '@/lib/chartTheme';
import { ChatView } from '@/routes/InsightsPage';
import {
  BullBear, CatalystRail, DecisionBar, HistoryList, KeyLevelChips, PersonaTabs, RiskRail, Section, Sheet, ThesisBlock,
} from '@/components/insights/redesign/Panels';
import { planSummary } from '@/components/insights/redesign/decision';

type SheetKind = 'history' | 'agents' | 'watchlist' | null;

/**
 * AI Insights Lab: a decision-first redesign of /insights. Same stocks
 * endpoints and multi-agent report; the layout leads with the call and the
 * plan, then the chart with those levels drawn, then the reasoning.
 */
export default function AiInsightsLovablePage() {
  const { activeTicker, setTicker } = useTickerStore();
  const [historicalId, setHistoricalId] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [refreshingTicker, setRefreshingTicker] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);

  const reportQuery = useInsightReport(activeTicker);
  const historyQuery = useInsightHistory(activeTicker, 20);
  const historicalQuery = useInsightReportById(historicalId);
  const briefQuery = useBriefDirection(activeTicker);
  const refreshMut = useRefreshInsight();
  const runStatus = useRunStatus(runId, activeTicker);

  useEffect(() => { setHistoricalId(null); }, [activeTicker]);
  useEffect(() => {
    const s = runStatus.data?.status;
    if (s === 'done' || s === 'failed') {
      const t = setTimeout(() => { setRunId(null); setRefreshingTicker(null); }, 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [runStatus.data]);

  const refreshFor = async (ticker: string, cutoff: string) => {
    try {
      setRefreshingTicker(ticker);
      const res = await refreshMut.mutateAsync(cutoff ? { ticker, asOf: cutoff } : ticker);
      setRunId(res.run_id);
    } catch (e) {
      console.error('refresh failed', e);
      setRefreshingTicker(null);
    }
  };

  const isRunning = !!runId && runStatus.data?.status !== 'done' && runStatus.data?.status !== 'failed';
  const busy = refreshMut.isPending || isRunning;
  const active = historicalId ? historicalQuery : reportQuery;
  const envelope = active.data ?? null;
  const report = envelope?.report ?? null;

  const planLines = useMemo<PriceLine[]>(() => {
    if (!report) return [];
    const p = planSummary(report);
    const lines: PriceLine[] = [];
    if (p.entryLow != null) lines.push({ price: p.entryLow, color: chartTheme.brand, title: 'Entry low' });
    if (p.entryHigh != null && p.entryHigh !== p.entryLow) lines.push({ price: p.entryHigh, color: chartTheme.brand, title: 'Entry high' });
    if (p.stop != null) lines.push({ price: p.stop, color: chartTheme.bear, title: 'Stop' });
    p.targets.slice(0, 3).forEach((t, i) => lines.push({ price: t, color: chartTheme.bull, title: `T${i + 1}` }));
    return lines;
  }, [report]);

  const prompts = report ? [
    `What would invalidate the ${report.direction} call on ${activeTicker}?`,
    `How do the next catalysts change the ${activeTicker} plan?`,
    `Is the entry zone still valid at the current price?`,
  ] : [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">AI Insights Lab</h1>
          <p className="text-xs text-[var(--on-surface-muted)]">{activeTicker} multi-agent trade dossier</p>
        </div>
        <TickerCombobox />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-lg border border-[var(--outline-variant)] px-2 py-1 text-xs text-[var(--on-surface-muted)]">
          Replay as of
          <input type="datetime-local" value={asOf} onChange={(e) => setAsOf(e.target.value)} max={new Date().toISOString().slice(0, 16)} aria-label="Point-in-time cutoff" className="bg-transparent text-xs text-[var(--on-surface)]" />
          {asOf && <button type="button" onClick={() => setAsOf('')} aria-label="Clear cutoff" className="px-1 hover:text-[var(--on-surface)]">x</button>}
        </label>
        <button type="button" onClick={() => refreshFor(activeTicker, asOf)} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-container)] px-3 py-1.5 text-xs font-semibold text-[var(--on-brand)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {asOf ? 'Run replay' : 'Re-analyze'}
        </button>
        {isRunning && <span className="text-xs text-[var(--on-surface-muted)]" role="status">Agents {runStatus.data?.status ?? 'queued'}...</span>}
        {runStatus.data?.status === 'failed' && <span className="text-xs text-[var(--bear)]" role="alert">Run failed. Try again.</span>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => setSheet('history')} className="flex items-center gap-1.5 rounded-lg border border-[var(--outline-variant)] px-3 py-1.5 text-xs text-[var(--on-surface-variant)] hover:border-[var(--brand)]">
            <HistoryIcon size={14} />History{historyQuery.data ? ` (${historyQuery.data.reports.length})` : ''}
          </button>
          <button type="button" onClick={() => setSheet('watchlist')} className="flex items-center gap-1.5 rounded-lg border border-[var(--outline-variant)] px-3 py-1.5 text-xs text-[var(--on-surface-variant)] hover:border-[var(--brand)]">
            <ListChecks size={14} />Watchlist
          </button>
        </div>
      </div>

      <DataGate>
        {active.isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-1)]" />
            <div className="h-80 animate-pulse rounded-xl bg-[var(--surface-1)]" />
          </div>
        ) : active.error ? (
          <div role="alert" className="rounded-xl border border-[var(--bear)]/40 bg-[var(--bear)]/10 p-5 text-sm text-[var(--bear)]">
            Could not load the report: {(active.error as Error).message}
          </div>
        ) : !report ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-1)] p-6">
            <FileText size={24} className="text-[var(--on-surface-muted)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--on-surface)]">No report for {activeTicker} yet</h2>
              <p className="mt-1 text-sm text-[var(--on-surface-muted)]">The agents will build a trade plan, levels, catalysts and risks.</p>
            </div>
            <button type="button" onClick={() => refreshFor(activeTicker, asOf)} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-container)] px-4 py-2 text-xs font-semibold text-[var(--on-brand)] disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}Generate report
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {historicalId && (
              <div className="flex items-center justify-between rounded-lg border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-4 py-2 text-xs text-[var(--warn)]" role="note">
                <span>Viewing a past report, not the latest.</span>
                <button type="button" onClick={() => setHistoricalId(null)} className="flex items-center gap-1 font-semibold"><ArrowLeft size={12} />Back to latest</button>
              </div>
            )}

            <div className="sticky top-0 z-10">
              <DecisionBar ticker={activeTicker} report={report} asOf={envelope?.as_of ?? report.as_of ?? null} historical={!!historicalId} onOpenAgents={() => setSheet('agents')} />
            </div>

            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-6">
                <ResearchCandleChart ticker={activeTicker} mode={asOf ? 'replay' : 'live'} replayCutoff={asOf || null} planLines={planLines} />
                <Section title="Key levels"><KeyLevelChips levels={report.key_levels} /></Section>
                <Section title="Thesis"><ThesisBlock thesis={report.thesis} /></Section>
                <Section title="Bull vs bear"><BullBear bull={report.bull_case} bear={report.bear_case} /></Section>
                <Section title="Plan by trader style"><PersonaTabs plans={report.persona_plans} /></Section>
              </div>

              <aside className="min-w-0 space-y-6" aria-label="Context">
                <BriefVsInsightsCard ticker={activeTicker} brief={briefQuery.data ?? null} briefError={briefQuery.isError} insightDirection={report.direction} />
                <Section title="Catalysts"><CatalystRail report={report} /></Section>
                <Section title="Risk flags"><RiskRail report={report} /></Section>
                <SignalsCard signals={(report.supporting_signals ?? []).slice(0, 5)} />
                <SimilarTradesCard trades={report.similar_past_trades ?? []} />
              </aside>
            </div>

            <Section title={`Ask about this ${activeTicker} report`} className="rounded-xl border border-[var(--outline-variant)] p-4">
              <div className="h-[380px]"><ChatView ticker={activeTicker} suggestions={prompts} /></div>
            </Section>
          </div>
        )}
      </DataGate>

      {sheet === 'history' && (
        <Sheet title={`${activeTicker} report history`} onClose={() => setSheet(null)}>
          {historyQuery.isLoading ? <Loader2 size={18} className="animate-spin" /> : historyQuery.error ? (
            <p role="alert" className="text-xs text-[var(--bear)]">History unavailable: {(historyQuery.error as Error).message}</p>
          ) : (
            <HistoryList rows={historyQuery.data?.reports ?? []} activeId={historicalId} onSelect={(id) => { setHistoricalId(id); setSheet(null); }} />
          )}
        </Sheet>
      )}
      {sheet === 'agents' && (
        <Sheet title="How the AI decided" onClose={() => setSheet(null)}>
          <AgentsPanel envelope={envelope} ticker={activeTicker} />
        </Sheet>
      )}
      {sheet === 'watchlist' && (
        <Sheet title="Watchlist" onClose={() => setSheet(null)}>
          <WatchlistPanel
            refreshing={busy}
            refreshingTicker={refreshingTicker}
            onSelectTicker={async (t) => { setTicker(t); setSheet(null); await refreshFor(t, ''); }}
          />
        </Sheet>
      )}
    </div>
  );
}
