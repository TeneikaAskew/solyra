import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bot, FileText, History as HistoryIcon, ListChecks, Loader2, MessageSquare, RefreshCw, LayoutDashboard } from 'lucide-react';
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
import { BriefVsInsightsCard, SimilarTradesCard, StratCard } from '@/components/insights/ReportCards';
import { MarketSignals } from '@/components/insights/redesign/MarketSignals';
import { AgentsPanel } from '@/components/insights/AgentsPanel';
import { WatchlistPanel } from '@/components/insights/WatchlistPanel';
import { ResearchCandleChart, type PriceLine } from '@/components/insights/ResearchCandleChart';
import { chartTheme } from '@/lib/chartTheme';
import { ResearchWorkspace } from '@/routes/InsightsLovablePage';
import { useInsightsLovable } from '@/hooks/useInsightsLovable';
import { useUser } from '@/hooks/useUser';
import {
  BullBear, CatalystRail, DecisionBar, KeyLevelChips, PersonaTabs, RiskRail, Section, ThesisBlock, dirClass,
} from '@/components/insights/redesign/Panels';
import { planSummary, unifiedHistory, type HistoryFilter } from '@/components/insights/redesign/decision';

type Tab = 'briefing' | 'agents' | 'history' | 'watchlist' | 'chat';
const TABS: { id: Tab; label: string; icon: typeof Bot }[] = [
  { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'watchlist', label: 'Watchlist', icon: ListChecks },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

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
  const [tab, setTab] = useState<Tab>('briefing');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const research = useInsightsLovable();
  const { isSignedIn, authMode } = useUser();
  const researchAllowed = authMode !== 'firebase' || isSignedIn;

  const reportQuery = useInsightReport(activeTicker);
  const historyQuery = useInsightHistory(activeTicker, 20);
  const historicalQuery = useInsightReportById(historicalId);
  const briefQuery = useBriefDirection(activeTicker);
  const refreshMut = useRefreshInsight();
  const runStatus = useRunStatus(runId, activeTicker);

  useEffect(() => { setHistoricalId(null); }, [activeTicker]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  useEffect(() => {
    if (!researchAllowed) return;
    research.loadSessions().then(() => setSessionsError(null), (e: unknown) => setSessionsError(e instanceof Error ? e.message : 'Could not load saved research.'));
  }, [researchAllowed, research.loadSessions]);
  const timeline = useMemo(() => unifiedHistory(historyQuery.data?.reports ?? [], research.sessions, historyFilter), [historyQuery.data, research.sessions, historyFilter]);
  const askResearch = (text: string) => { research.startNew(); setPrefill({ text, nonce: Date.now() }); setTab('chat'); };
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
      </div>

      <nav role="tablist" aria-label="AI Insights sections" onKeyDown={(event) => {
        const index = TABS.findIndex(item => item.id === tab);
        const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : null;
        if (next === null) return;
        event.preventDefault(); setTab(TABS[next].id); document.getElementById(`insights-tab-${TABS[next].id}`)?.focus();
      }} className="-mx-1 flex gap-1 overflow-x-auto border-b border-[var(--outline-variant)] px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" id={`insights-tab-${id}`} aria-controls={`insights-panel-${id}`} tabIndex={tab === id ? 0 : -1} aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${tab === id ? 'border-[var(--brand)] text-[var(--on-surface)]' : 'border-transparent text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'}`}>
            <Icon size={14} /><span id={`insights-label-${id}`}>{label}</span>
            {id === 'history' && <span className="text-[10px] font-normal text-[var(--on-surface-muted)]">{timeline.length || ''}</span>}
          </button>
        ))}
      </nav>

      {tab === 'briefing' && <section role="tabpanel" id="insights-panel-briefing" aria-labelledby="insights-label-briefing"><DataGate>
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

            <DecisionBar ticker={activeTicker} report={report} asOf={envelope?.as_of ?? report.as_of ?? null} historical={!!historicalId} onOpenAgents={() => setTab('agents')} />

            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-6">
                <ResearchCandleChart ticker={activeTicker} mode={asOf ? 'replay' : 'live'} replayCutoff={asOf || null} planLines={planLines} />
                <Section title="Key levels"><KeyLevelChips levels={report.key_levels} /></Section>
                <Section title="Thesis"><ThesisBlock thesis={report.thesis} /></Section>
                <Section title="STRAT and FTFC">{report.strat_status ? <StratCard strat={report.strat_status} /> : <p role="note">STRAT and FTFC unavailable for this report.</p>}</Section>
                <Section title="Bull vs bear"><BullBear bull={report.bull_case} bear={report.bear_case} /></Section>
                <Section title="Plan by trader style"><PersonaTabs plans={report.persona_plans} /></Section>
              </div>

              <aside className="min-w-0 space-y-6" aria-label="Context">
                <BriefVsInsightsCard ticker={activeTicker} brief={briefQuery.data ?? null} briefError={briefQuery.isError} insightDirection={report.direction} />
                <Section title="Catalysts"><CatalystRail report={report} /></Section>
                <Section title="Risk flags"><RiskRail report={report} /></Section>
                <MarketSignals ticker={activeTicker} replayCutoff={asOf || null} historical={Boolean(historicalId)} reportSignals={report.supporting_signals ?? []} />
                <SimilarTradesCard trades={report.similar_past_trades ?? []} />
              </aside>
            </div>

            <Section title="Report provenance">
              <p className="text-xs text-[var(--on-surface-muted)]">As of {envelope?.as_of ?? report.as_of ?? 'unavailable'}</p>
              {Object.entries(report.model_versions ?? {}).length > 0 ? <ul className="mt-2 space-y-1 text-xs">{Object.entries(report.model_versions).map(([role, model]) => <li key={role}>{role}: {model}</li>)}</ul> : <p role="note" className="text-xs">Model provenance unavailable.</p>}
            </Section>

            <button type="button" onClick={() => askResearch(`What would invalidate the ${report.direction} call on ${activeTicker}?`)} className="flex w-full items-center justify-between rounded-xl border border-[var(--outline-variant)] px-4 py-3 text-left text-sm text-[var(--on-surface-variant)] hover:border-[var(--brand)]"><span>Pressure-test this call with cited research</span><MessageSquare size={15} /></button>
          </div>
        )}
      </DataGate></section>}

      {tab === 'agents' && (
        <section role="tabpanel" id="insights-panel-agents" aria-labelledby="insights-label-agents" aria-label="Agents" className="space-y-4">
          {active.error ? <p role="alert" className="text-sm text-[var(--bear)]">Agent provenance unavailable: {(active.error as Error).message}</p>
            : <AgentsPanel envelope={envelope} ticker={activeTicker} />}
          {report && <button type="button" onClick={() => setTab('briefing')} className="text-xs font-semibold text-[var(--brand)]">Back to the decision this run produced</button>}
        </section>
      )}

      {tab === 'history' && (
        <section role="tabpanel" id="insights-panel-history" aria-labelledby="insights-label-history" aria-label="History" className="space-y-3">
          <div className="flex gap-1" role="group" aria-label="Filter history">
            {(['all', 'reports', 'research'] as HistoryFilter[]).map((f) => (
              <button key={f} type="button" aria-pressed={historyFilter === f} onClick={() => setHistoryFilter(f)}
                className={`rounded-md border px-2.5 py-1 text-xs capitalize ${historyFilter === f ? 'border-[var(--brand)] text-[var(--on-surface)]' : 'border-[var(--outline-variant)] text-[var(--on-surface-muted)]'}`}>{f}</button>
            ))}
          </div>
          {historyQuery.error && <p role="alert" className="text-xs text-[var(--bear)]">Report history unavailable: {(historyQuery.error as Error).message}</p>}
          {sessionsError && <p role="alert" className="text-xs text-[var(--bear)]">Saved research unavailable: {sessionsError}</p>}
          {!researchAllowed && <p className="text-xs text-[var(--on-surface-muted)]">Sign in to include your saved research questions.</p>}
          {historyQuery.isLoading ? <Loader2 size={18} className="animate-spin" /> : timeline.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--on-surface-muted)]">Nothing saved for {activeTicker} yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--outline-variant)] rounded-xl border border-[var(--outline-variant)]">
              {timeline.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button type="button" className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-[var(--surface-1)]"
                    onClick={() => {
                      if (item.kind === 'report') { setHistoricalId(item.id); setTab('briefing'); }
                      else { setAsOf(item.session.replay_cutoff ? item.session.replay_cutoff.slice(0, 16) : ''); void research.openSession(item.id); setTab('chat'); }
                    }}>
                    <span className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--on-surface-muted)]">
                      <span className={item.kind === 'report' ? 'text-[var(--brand)]' : 'text-[var(--warn)]'}>{item.label}</span>
                      {item.kind === 'research' && <span>{item.session.ticker} · {item.session.mode}{item.session.status !== 'active' ? ` · ${item.session.status}` : ''}</span>}
                      {item.kind === 'report' && item.previous && item.previous !== item.row.direction && <span>changed from {item.previous === 'flat' ? 'Neutral' : item.previous}</span>}
                      {item.kind === 'report' && item.row.cost_usd != null && <span>${item.row.cost_usd.toFixed(4)}</span>}
                      {item.kind === 'report' && item.row.direction && <span className={dirClass(item.row.direction)}>{item.row.direction}{item.row.conviction ? ` · ${item.row.conviction}` : ''}</span>}
                      <span className="ml-auto normal-case">{item.at ? new Date(item.at).toLocaleString() : 'time unavailable'}</span>
                    </span>
                    <span className="line-clamp-2 text-sm text-[var(--on-surface)]">{item.kind === 'report' ? (item.row.thesis ?? 'Thesis unavailable') : item.session.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'watchlist' && (
        <section role="tabpanel" id="insights-panel-watchlist" aria-labelledby="insights-label-watchlist" aria-label="Watchlist">
          <WatchlistPanel
            refreshing={busy}
            refreshingTicker={refreshingTicker}
            onSelectTicker={async (t) => { setTicker(t); setAsOf(''); setHistoricalId(null); setTab('briefing'); await refreshFor(t, ''); }}
            onAskResearch={(t) => { research.startNew(); setAsOf(''); setTicker(t); askResearch(`What catalysts and risks matter most for ${t} right now?`); }}
          />
        </section>
      )}

      {(
        <section role="tabpanel" hidden={tab !== 'chat'} id="insights-panel-chat" aria-labelledby="insights-label-chat" aria-label="Chat">
          <ResearchWorkspace research={research} embedded sharedCutoff={asOf} prefill={prefill} sessionsError={sessionsError} onOpenSession={(s) => setAsOf(s.replay_cutoff ? s.replay_cutoff.slice(0, 16) : '')} />
        </section>
      )}
    </div>
  );
}
