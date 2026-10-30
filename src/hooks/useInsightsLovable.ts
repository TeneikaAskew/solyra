import { useCallback, useRef, useState } from 'react';
import { getIdToken } from '@/lib/firebase';
import { getAuthMode } from '@/lib/runtimeConfig';
import type { ResearchMode, ResearchSessionDetail, ResearchSessionSummary, ResearchSource, ResearchStage, ResearchStreamEvent, ResearchAnswer } from '@/types/insightsLovable';

// Resolved per request so a slow-to-load env never crashes the page at import
// time. Falls back to the project ID when the full URL wasn't baked into the
// bundle (stale preview builds), so the research service stays reachable.
function functionUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL
    || (import.meta.env.VITE_SUPABASE_PROJECT_ID ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : '');
  if (!base) throw new Error('Research service is still loading. Try again in a moment.');
  return `${base}/functions/v1/insights-research`;
}

async function request(body: unknown, signal?: AbortSignal): Promise<Response> {
  const token = await getIdToken();
  if (!token && !(import.meta.env.DEV && getAuthMode() === 'open')) {
    throw new Error('Sign in to use the research workspace.');
  }
  const response = await fetch(functionUrl(), {
    method: 'POST', signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.error === 'string' ? payload.error : `Research service ${response.status}`);
  }
  return response;
}

/** Saved research owns its immutable context; global controls only configure new work. */
export function researchContext(session: ResearchSessionSummary | null, ticker: string, mode: ResearchMode, replayCutoff: string | null) {
  return session
    ? { ticker: session.ticker, mode: session.mode, replayCutoff: session.replay_cutoff }
    : { ticker, mode, replayCutoff: mode === 'replay' ? replayCutoff : null };
}

/** Restore an answer and its own evidence without mixing a later failed attempt. */
export function savedResearchArtifact(payload: ResearchSessionDetail) {
  const latest = payload.messages[payload.messages.length - 1] ?? null;
  const completed = [...payload.messages].reverse().find(message => message.answer !== null);
  const failed = latest?.run_state === 'failed' || latest?.run_state === 'cancelled';
  return {
    answer: completed?.answer ?? null,
    question: completed?.question ?? latest?.question ?? payload.session.title,
    sources: payload.sources.filter(source => !completed || source.message_id === completed.id),
    stage: (completed ? 'completed' : failed ? latest.run_state : 'idle') as ResearchStage,
    error: failed ? `“${latest.question ?? payload.session.title}” did not finish: ${latest.error_message ?? 'no answer was saved.'} Ask it again to retry.` : null,
  };
}

export function useInsightsLovable() {
  const [sessions, setSessions] = useState<ResearchSessionSummary[]>([]);
  const [detail, setDetail] = useState<ResearchSessionDetail | null>(null);
  const [stage, setStage] = useState<ResearchStage>('idle');
  const [stageLabel, setStageLabel] = useState('');
  const [streamText, setStreamText] = useState('');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [answer, setAnswer] = useState<ResearchAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const selection = useRef(0);
  const readController = useRef<AbortController | null>(null);

  const loadSessions = useCallback(async () => {
    const generation = selection.current;
    const response = await request({ action: 'list', sessionId: null });
    const payload = await response.json();
    if (generation === selection.current) setSessions(payload.sessions ?? []);
  }, []);
  const openSession = useCallback(async (sessionId: string, expectedGeneration?: number) => {
    if (expectedGeneration !== undefined && expectedGeneration !== selection.current) return;
    const generation = expectedGeneration ?? ++selection.current;
    if (expectedGeneration === undefined) {
      controller.current?.abort(); controller.current = null;
      // Selection owns cancellation even if its read fails: the old run can
      // no longer settle state after losing controller ownership.
      setStage(previous => previous === 'gathering' || previous === 'synthesizing' ? 'cancelled' : previous);
      setStageLabel(''); setStreamText('');
    }
    readController.current?.abort();
    const read = new AbortController(); readController.current = read;
    try {
      const response = await request({ action: 'read', sessionId }, read.signal);
      const payload: ResearchSessionDetail = await response.json();
      if (generation !== selection.current || read.signal.aborted) return;
      setDetail(payload);
      const artifact = savedResearchArtifact(payload);
      setAnswer(artifact.answer);
      setQuestion(artifact.question);
      setSources(artifact.sources);
      setStage(artifact.stage);
      setError(artifact.error);
    } catch (cause) {
      if (generation !== selection.current || read.signal.aborted) return;
      setError(cause instanceof Error ? `Could not open this research: ${cause.message}` : 'Could not open this research.');
    }
  }, []);

  const research = useCallback(async (input: { ticker: string; question: string; mode: ResearchMode; replayCutoff: string | null; sessionId: string | null }) => {
    const generation = ++selection.current;
    readController.current?.abort();
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setStage('gathering'); setStageLabel('Gathering approved evidence'); setStreamText(''); setError(null);
    // Keep the completed question, answer and evidence together while a new
    // attempt is pending. A failed or stopped attempt must not relabel it.
    let pendingSources: ResearchSource[] = [];
    const refreshHistory = async () => {
      try { await loadSessions(); }
      catch (cause) {
        if (generation === selection.current) setError(previous => `${previous ? previous + ' ' : ''}History refresh failed: ${cause instanceof Error ? cause.message : 'unavailable'}`);
      }
    };
    try {
      const response = await request({ action: 'research', ...input }, nextController.signal);
      if (controller.current !== nextController) return;
      if (!response.body) throw new Error('Research stream was unavailable.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (controller.current !== nextController) return;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ResearchStreamEvent;
          if (event.type === 'session') setDetail((previous) => previous ? previous : { session: { id: event.sessionId, ticker: input.ticker, mode: input.mode, replay_cutoff: input.replayCutoff, title: input.question.slice(0, 90), status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, messages: [], sources: [] });
          if (event.type === 'status') { setStage(event.stage); setStageLabel(event.label); }
          if (event.type === 'sources') pendingSources = event.sources;
          if (event.type === 'delta') setStreamText((text) => text + event.delta);
          if (event.type === 'done') { setQuestion(input.question); setSources(pendingSources); setAnswer(event.answer); setStage('completed'); setStreamText(''); await refreshHistory(); if (generation === selection.current) await openSession(event.sessionId, generation); }
          if (event.type === 'error') { setError(event.message); setStage(event.code === 'cancelled' ? 'cancelled' : 'failed'); await refreshHistory(); }
        }
      }
    } catch (caught) {
      if (controller.current !== nextController) return;
      if (nextController.signal.aborted) { setStage('cancelled'); setError('Research stopped. Your last completed answer is still available.'); }
      else { setStage('failed'); setError(caught instanceof Error ? caught.message : 'Research failed.'); }
    } finally {
      if (controller.current === nextController) {
        await refreshHistory();
        // A new run can start while terminal history is loading.
        if (controller.current === nextController) controller.current = null;
      }
    }
  }, [loadSessions, openSession]);

  const startNew = useCallback(() => {
    ++selection.current; readController.current?.abort();
    controller.current?.abort();
    controller.current = null;
    setDetail(null); setQuestion(null); setAnswer(null); setSources([]);
    setError(null); setStage('idle'); setStageLabel(''); setStreamText('');
  }, []);

  return { sessions, detail, question, stage, stageLabel, streamText, sources, answer, error, loadSessions, openSession, research, startNew, stop: () => controller.current?.abort() };
}
