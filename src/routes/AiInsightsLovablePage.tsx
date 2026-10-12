import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Button } from '@heroui/react';
import { AlertTriangle, ChevronDown, TrendingDown, TrendingUp, Archive, ArrowUpRight, BookOpen, CalendarClock, Check, CircleStop, Clock3, Copy, History, PanelRight, Search, Sparkles, X } from 'lucide-react';
import { TickerCombobox } from '@/components/shared/TickerCombobox';
import { MicroLabel, Pill } from '@/components/primitives';
import { useTickerStore } from '@/stores/tickerStore';
import { useUser } from '@/hooks/useUser';
import { useInsightsLovable } from '@/hooks/useInsightsLovable';
import type { ResearchAnswer, ResearchMode, ResearchSource } from '@/types/insightsLovable';
import { LiveQuoteBox } from '@/components/insights/LiveQuoteBox';
import { ResearchCandleChart } from '@/components/insights/ResearchCandleChart';

const PROMPTS = [
  'What catalysts matter most over the next two weeks?',
  'What changed since the last report, and what would invalidate the setup?',
  'At this replay cutoff, what evidence supported or challenged the trade?',
];

function sourceId(source: ResearchSource) { return source.id ?? source.citation_id ?? '?'; }
function SourceTag({ id, sources, onOpen }: { id: string; sources: ResearchSource[]; onOpen?: (id: string) => void }) {
  const source = sources.find((item) => sourceId(item) === id);
  const label = source?.label ?? source?.source_label ?? 'Evidence';
  return <button type="button" onClick={() => onOpen?.(id)} title={label} aria-label={`Open source ${id}: ${label}`} className="inline-flex h-5 items-center rounded border border-[var(--outline)] bg-[var(--surface-3)] px-1.5 text-[10px] font-bold text-[var(--brand)] hover:border-[var(--brand)]">{id}</button>;
}
function Fold({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  return <details open={defaultOpen} className="group border-b border-[var(--outline-variant)] py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="flex items-center gap-2"><MicroLabel>{title}</MicroLabel>{count !== undefined && <span className="text-[10px] text-[var(--on-surface-muted)]">{count}</span>}</span><ChevronDown size={15} className="text-[var(--on-surface-muted)] transition group-open:rotate-180" /></summary><div className="mt-3">{children}</div></details>;
}
function AnswerPanel({ answer, sources, onOpenSource, onFollowUp }: { answer: ResearchAnswer; sources: ResearchSource[]; onOpenSource: (id: string) => void; onFollowUp: (q: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const long = answer.answer.length > 260;
  const unavailable = sources.filter((s) => s.freshness === 'unavailable');
  const stale = sources.filter((s) => s.freshness === 'stale');
  const tags = (ids: string[]) => <span className="ml-1 inline-flex gap-1">{ids.map((id) => <SourceTag key={id} id={id} sources={sources} onOpen={onOpenSource} />)}</span>;
  return (
    <article aria-label="Research answer" className="min-w-0 space-y-5">
      {(unavailable.length > 0 || stale.length > 0) && <div role="note" className="flex items-start gap-2 rounded-md border border-[var(--warn)]/40 bg-[var(--surface-1)] px-3 py-2.5 text-xs leading-5 text-[var(--warn)]"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{unavailable.length > 0 && <>Could not reach: {unavailable.map((s) => s.label ?? s.source_label).join(', ')}. </>}{stale.length > 0 && <>Older than a week: {stale.map((s) => s.label ?? s.source_label).join(', ')}. </>}This answer may be incomplete.</span></div>}
      <header className="space-y-3">
        {answer.verdict && <div className="flex flex-wrap items-center gap-2"><p className="text-[19px] font-bold leading-7 text-[var(--on-surface)] sm:text-[22px]">{answer.verdict}</p>{answer.confidence && <Pill tone={answer.confidence === 'high' ? 'bull' : answer.confidence === 'medium' ? 'warn' : 'bear'}>{answer.confidence} confidence</Pill>}</div>}
        {answer.keyLevels && answer.keyLevels.length > 0 && <div aria-label="Key levels" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{answer.keyLevels.map((level, i) => <div key={`${level.label}-${i}`} className="shrink-0 rounded-md border border-[var(--outline-variant)] bg-[var(--surface-1)] px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-[var(--on-surface-muted)]">{level.label}</div><div className="mt-0.5 flex items-center gap-1.5 text-sm font-bold tabular-nums text-[var(--on-surface)]">{level.value}{level.citations.slice(0, 1).map((id) => <SourceTag key={id} id={id} sources={sources} onOpen={onOpenSource} />)}</div></div>)}</div>}
        <div><p className={`text-[15px] leading-7 text-[var(--on-surface-variant)] ${long && !expanded ? 'line-clamp-3' : ''}`}>{answer.answer}</p>{long && <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-semibold text-[var(--brand)]">{expanded ? 'Show less' : 'Read more'}</button>}</div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border-l-2 border-[var(--bull)] bg-[var(--surface-1)] p-4"><div className="flex items-center gap-1.5 text-xs font-bold text-[var(--bull)]"><TrendingUp size={14} />Bull case</div><p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">{answer.bullCase}</p></div>
        <div className="rounded-md border-l-2 border-[var(--bear)] bg-[var(--surface-1)] p-4"><div className="flex items-center gap-1.5 text-xs font-bold text-[var(--bear)]"><TrendingDown size={14} />Bear case</div><p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">{answer.bearCase}</p></div>
      </section>
      <section className="rounded-md border border-[var(--warn)]/40 px-4 py-3"><MicroLabel>What would prove this wrong</MicroLabel><p className="mt-1.5 text-sm font-medium leading-6 text-[var(--warn)]">{answer.invalidation}</p></section>
      <div>
        {answer.facts.length > 0 && <Fold title="Key facts" count={answer.facts.length} defaultOpen><div className="space-y-3">{answer.facts.map((fact, index) => <div key={`${fact.text}-${index}`} className="flex items-start gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" /><p className="min-w-0 text-sm leading-6 text-[var(--on-surface-variant)]">{fact.text}{tags(fact.citations)}</p></div>)}</div></Fold>}
        {answer.catalystTimeline.length > 0 && <Fold title="Catalyst timeline" count={answer.catalystTimeline.length}><div className="divide-y divide-[var(--outline-variant)]">{answer.catalystTimeline.map((item, index) => <div key={`${item.event}-${index}`} className="grid gap-1 py-2.5 sm:grid-cols-[110px_1fr_auto] sm:items-center"><span className="text-xs tabular-nums text-[var(--on-surface-muted)]">{item.date ?? 'Date unavailable'}</span><span className="text-sm text-[var(--on-surface)]">{item.event}</span><span className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">{item.impact}{tags(item.citations)}</span></div>)}</div></Fold>}
        {answer.replayContext && <Fold title="Replay context"><p className="text-sm leading-6 text-[var(--on-surface-variant)]">{answer.replayContext}</p></Fold>}
        {answer.unknowns.length > 0 && <Fold title="Unknowns and data gaps" count={answer.unknowns.length}><ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--on-surface-muted)]">{answer.unknowns.map((item) => <li key={item}>{item}</li>)}</ul></Fold>}
      </div>
      {answer.followUps && answer.followUps.length > 0 && <section><MicroLabel>Ask next</MicroLabel><div className="mt-2 flex flex-col gap-2">{answer.followUps.map((q) => <button key={q} type="button" onClick={() => onFollowUp(q)} className="flex items-center justify-between gap-3 rounded-md border border-[var(--outline-variant)] px-3 py-2.5 text-left text-sm text-[var(--on-surface-variant)] hover:border-[var(--brand)] hover:text-[var(--on-surface)]"><span>{q}</span><ArrowUpRight size={14} className="shrink-0" /></button>)}</div></section>}
    </article>
  );
}
function EvidencePanel({ sources, onClose, focusId }: { sources: ResearchSource[]; onClose?: () => void; focusId?: string | null }) {
  useEffect(() => { if (focusId) document.getElementById(`evidence-${focusId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [focusId]);
  return <aside aria-label="Evidence used" className="space-y-1"><div className="mb-3 flex items-center justify-between"><MicroLabel>Evidence used</MicroLabel>{onClose && <Button isIconOnly size="sm" variant="ghost" onPress={onClose} aria-label="Close evidence"><X size={16} /></Button>}</div>{sources.map((source) => { const id = sourceId(source); const label = source.label ?? source.source_label ?? 'Source'; const asOf = source.asOf ?? source.source_as_of; return <div id={`evidence-${id}`} key={`${id}-${label}`} className={`border-b border-[var(--outline-variant)] px-2 py-3 ${focusId === id ? 'rounded-md bg-[var(--surface-2)] ring-1 ring-[var(--brand)]' : ''}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><SourceTag id={id} sources={sources} /><span className="truncate text-xs font-semibold text-[var(--on-surface)]">{label}</span></div><Pill tone={source.freshness === 'current' ? 'bull' : source.freshness === 'stale' ? 'warn' : 'bear'}>{source.freshness}</Pill></div><div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--on-surface-muted)]"><Clock3 size={11} />{asOf ? new Date(asOf).toLocaleString() : 'Timestamp unavailable'}</div>{source.excerpt && <p className={`mt-2 text-[11px] leading-5 text-[var(--on-surface-variant)] ${focusId === id ? '' : 'line-clamp-3'}`}>{source.excerpt}</p>}</div>; })}</aside>;
}

export default function AiInsightsLovablePage() {
  const { activeTicker, quickPicks, setTicker, pushRecent } = useTickerStore();
  const { isSignedIn, authMode } = useUser();
  const research = useInsightsLovable();
  const [mode, setMode] = useState<ResearchMode>('live');
  const [cutoff, setCutoff] = useState('');
  const [question, setQuestion] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const openSource = (id: string) => { setFocusId(id); if (!window.matchMedia('(min-width: 1280px)').matches) setEvidenceOpen(true); };
  const followUp = (q: string) => { setQuestion(q); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const [tickerDraft, setTickerDraft] = useState(activeTicker);
  const activeSession = research.detail?.session ?? null;
  const busy = research.stage === 'gathering' || research.stage === 'synthesizing';
  const promptAllowed = authMode !== 'firebase' || isSignedIn;
  const cutoffIso = useMemo(() => cutoff ? new Date(cutoff).toISOString() : null, [cutoff]);

  useEffect(() => { if (promptAllowed) void research.loadSessions(); }, [promptAllowed, research.loadSessions]);
  useEffect(() => { if (activeSession) { setMode(activeSession.mode); setCutoff(activeSession.replay_cutoff ? activeSession.replay_cutoff.slice(0, 16) : ''); } }, [activeSession]);
  useEffect(() => { setTickerDraft(activeTicker); }, [activeTicker]);

  const chooseTicker = (value: string) => {
    if (activeSession) return;
    const symbol = value.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.]{0,9}$/.test(symbol)) return;
    setTicker(symbol);
    pushRecent(symbol);
    setTickerDraft(symbol);
  };

  const submit = () => {
    const trimmed = question.trim();
    if (trimmed.length < 8 || busy || (mode === 'replay' && !cutoffIso)) return;
    void research.research({ ticker: activeSession?.ticker ?? activeTicker, question: trimmed, mode, replayCutoff: mode === 'replay' ? cutoffIso : null, sessionId: activeSession?.id ?? null });
    setQuestion('');
  };
  const chartTicker = activeSession?.ticker ?? activeTicker;
  return (
    <div className="mx-auto min-h-full max-w-[1420px]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--outline-variant)] pb-5">
        <div><div className="flex items-center gap-2"><h1 className="text-[24px] font-bold text-[var(--on-surface)]">AI Insights Lab</h1><Pill tone="brand">LAB</Pill></div><p className="mt-1 max-w-2xl text-sm text-[var(--on-surface-variant)]">A trader-grade chart, a cited answer, and the evidence behind both — in one workspace.</p></div>
        <div className="flex gap-2"><Button variant="ghost" size="sm" onPress={() => setHistoryOpen(true)}><History size={15} />History</Button><div className="hidden sm:block"><TickerCombobox /></div></div>
      </header>

      {!promptAllowed ? <div className="py-24 text-center"><Search className="mx-auto text-[var(--on-surface-muted)]" /><h2 className="mt-4 text-lg font-semibold">Sign in to research</h2><p className="mt-2 text-sm text-[var(--on-surface-muted)]">Research sessions and evidence are private to your account.</p></div> : <div className="grid min-w-0 gap-8 py-6 xl:grid-cols-[minmax(0,1fr)_290px]">
        <main className="min-w-0">
          <section aria-label="Research composer" className="border-b border-[var(--outline-variant)] pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><MicroLabel>Research target</MicroLabel><div className="mt-1 text-[30px] font-bold leading-none text-[var(--on-surface)]">{activeSession?.ticker ?? activeTicker}</div></div><div className="flex rounded-md bg-[var(--surface-2)] p-1" aria-label="Evidence mode">{(['live','replay'] as ResearchMode[]).map((value) => <Button key={value} size="sm" variant={mode === value ? 'primary' : 'ghost'} isDisabled={Boolean(activeSession)} onPress={() => setMode(value)}>{value === 'live' ? <Sparkles size={14} /> : <CalendarClock size={14} />}{value === 'live' ? 'Live' : 'Replay'}</Button>)}</div></div>
            {mode === 'replay' && <label className="mt-4 block"><span className="text-xs font-semibold text-[var(--on-surface-variant)]">Evidence cutoff</span><input type="datetime-local" value={cutoff} disabled={Boolean(activeSession)} onChange={(event) => setCutoff(event.target.value)} max={new Date().toISOString().slice(0,16)} className="mt-1 block w-full max-w-xs rounded-md border border-[var(--outline-variant)] bg-[var(--surface-lowest)] px-3 py-2 text-sm text-[var(--on-surface)] focus:border-[var(--brand)] focus:outline-none" /></label>}

            <div className="mt-5"><ResearchCandleChart ticker={chartTicker} mode={mode} replayCutoff={mode === 'replay' ? cutoffIso : null} /></div>

            <label className="mt-5 block"><span className="sr-only">Question</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit(); }} maxLength={1200} rows={4} placeholder={`Ask about ${activeSession?.ticker ?? activeTicker} catalysts, risks, or ${mode === 'replay' ? 'what was knowable then' : 'the current setup'}…`} className="w-full resize-none rounded-md border border-[var(--outline-variant)] bg-[var(--surface-lowest)] px-4 py-3 text-[15px] leading-6 text-[var(--on-surface)] outline-none transition focus:border-[var(--brand)]" /></label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => { setQuestion(prompt); if (!activeSession && prompt.startsWith('At this replay')) setMode('replay'); }} className="rounded-md border border-[var(--outline-variant)] px-2.5 py-1.5 text-left text-[11px] text-[var(--on-surface-variant)] hover:border-[var(--outline)] hover:text-[var(--on-surface)]">{prompt}</button>)}</div>{busy ? <Button variant="danger" onPress={research.stop}><CircleStop size={15} />Stop</Button> : <Button variant="primary" onPress={submit} isDisabled={question.trim().length < 8 || (mode === 'replay' && !cutoffIso)}>Research<ArrowUpRight size={15} /></Button>}</div>
          </section>

          {research.error && <div role="alert" className="my-5 border-l-2 border-[var(--warn)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--warn)]">{research.error}</div>}
          {busy && <div aria-live="polite" className="my-8"><div className="flex items-center gap-3 text-sm font-semibold text-[var(--on-surface)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand)]" />{research.stageLabel}</div><div className="mt-3 h-1 overflow-hidden rounded bg-[var(--surface-2)]"><div className={`h-full bg-[var(--brand)] transition-all ${research.stage === 'gathering' ? 'w-2/5' : 'w-4/5'}`} /></div><p className="mt-3 text-xs text-[var(--on-surface-muted)]">{research.stage === 'gathering' ? 'Reading reports, playbook, catalysts and signals…' : 'Writing a short, cited answer…'}</p></div>}
          {research.answer ? <div className="py-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Check size={15} className="text-[var(--bull)]" /><span className="text-xs font-semibold text-[var(--on-surface-variant)]">Completed · evidence frozen for this answer</span></div><div className="flex gap-1"><Button isIconOnly variant="ghost" size="sm" aria-label="Copy answer" onPress={() => navigator.clipboard.writeText(research.answer?.answer ?? '')}><Copy size={15} /></Button><Button variant="ghost" size="sm" onPress={() => setEvidenceOpen(true)} className="xl:hidden"><PanelRight size={15} />Evidence</Button></div></div>{research.question && <div className="mb-6 rounded-md border border-[var(--outline-variant)] bg-[var(--surface-1)] px-4 py-3"><MicroLabel>Question asked</MicroLabel><p className="mt-1 text-[15px] leading-6 text-[var(--on-surface)]">{research.question}</p></div>}<div className="mb-6"><LiveQuoteBox ticker={chartTicker} /></div><AnswerPanel answer={research.answer} sources={research.sources} onOpenSource={openSource} onFollowUp={followUp} /><div className="mt-8 border-t border-[var(--outline-variant)] pt-5"><p className="text-xs text-[var(--on-surface-muted)]">Follow-ups use the same ticker, mode, and evidence boundary.</p></div></div> : !busy && <div className="py-16 text-center"><BookOpen className="mx-auto text-[var(--on-surface-muted)]" /><h2 className="mt-4 text-base font-semibold text-[var(--on-surface)]">Start with a decision you need to make</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--on-surface-muted)]">Solyra gathers approved reports, catalysts, signals, playbook context, and replay history before answering.</p></div>}
        </main>
        <div className="hidden min-w-0 border-l border-[var(--outline-variant)] pl-6 xl:block"><EvidencePanel sources={research.sources} focusId={focusId} /></div>
      </div>}

      {historyOpen && <div className="fixed inset-0 z-50 flex justify-end bg-[var(--surface-0)]/70" onClick={() => setHistoryOpen(false)}><aside className="h-full w-full max-w-sm overflow-y-auto bg-[var(--surface-1)] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-base font-bold">Research history</h2><Button isIconOnly variant="ghost" size="sm" onPress={() => setHistoryOpen(false)} aria-label="Close history"><X size={17} /></Button></div><div className="mt-5 space-y-1">{research.sessions.length === 0 ? <p className="py-12 text-center text-sm text-[var(--on-surface-muted)]">No saved research yet.</p> : research.sessions.map((session) => <button key={session.id} type="button" onClick={() => { void research.openSession(session.id); setHistoryOpen(false); }} className="w-full border-b border-[var(--outline-variant)] px-2 py-4 text-left hover:bg-[var(--surface-2)]"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-[var(--on-surface)]">{session.ticker}</span><span className="flex gap-1">{session.status && session.status !== 'active' && <Pill tone={session.status === 'failed' ? 'bear' : 'warn'}>{session.status}</Pill>}<Pill tone={session.mode === 'replay' ? 'warn' : 'brand'}>{session.mode}</Pill></span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--on-surface-variant)]">{session.title}</p><span className="mt-2 block text-[10px] text-[var(--on-surface-muted)]">{new Date(session.updated_at).toLocaleString()}</span></button>)}</div><Button className="mt-5" fullWidth variant="ghost" onPress={() => { setHistoryOpen(false); window.location.reload(); }}><Archive size={14} />Start new research</Button></aside></div>}
      {evidenceOpen && <div className="fixed inset-0 z-50 bg-[var(--surface-0)]/70 xl:hidden" onClick={() => setEvidenceOpen(false)}><aside className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-lg bg-[var(--surface-1)] p-5" onClick={(event) => event.stopPropagation()}><EvidencePanel sources={research.sources} focusId={focusId} onClose={() => setEvidenceOpen(false)} /></aside></div>}
    </div>
  );
}
