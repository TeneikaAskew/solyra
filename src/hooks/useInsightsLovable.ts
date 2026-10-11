import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getIdToken } from '@/lib/firebase';
import { getAuthMode } from '@/lib/runtimeConfig';
import type { ResearchMode, ResearchSessionDetail, ResearchSessionSummary, ResearchSource, ResearchStage, ResearchStreamEvent, ResearchAnswer } from '@/types/insightsLovable';

const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/insights-research`;

async function request(body: unknown, signal?: AbortSignal): Promise<Response> {
  const token = await getIdToken();
  if (!token && !(import.meta.env.DEV && getAuthMode() === 'open')) {
    throw new Error('Sign in to use the research workspace.');
  }
  const response = await fetch(functionUrl, {
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

export function useInsightsLovable() {
  const [sessions, setSessions] = useState<ResearchSessionSummary[]>([]);
  const [detail, setDetail] = useState<ResearchSessionDetail | null>(null);
  const [stage, setStage] = useState<ResearchStage>('idle');
  const [stageLabel, setStageLabel] = useState('');
  const [streamText, setStreamText] = useState('');
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [answer, setAnswer] = useState<ResearchAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const loadSessions = useCallback(async () => {
    const response = await request({ action: 'list', sessionId: null });
    const payload = await response.json();
    setSessions(payload.sessions ?? []);
  }, []);
  const openSession = useCallback(async (sessionId: string) => {
    const response = await request({ action: 'read', sessionId });
    const payload: ResearchSessionDetail = await response.json();
    setDetail(payload);
    const completed = [...payload.messages].reverse().find((message) => message.answer !== null);
    setAnswer(completed?.answer ?? null);
    setSources(payload.sources.filter((source) => !completed || source.message_id === completed.id));
    setStage(completed ? 'completed' : 'idle');
    setError(null);
  }, []);
  useEffect(() => { void supabase.auth.getSession(); }, []);

  const research = useCallback(async (input: { ticker: string; question: string; mode: ResearchMode; replayCutoff: string | null; sessionId: string | null }) => {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setStage('gathering'); setStageLabel('Gathering approved evidence'); setStreamText(''); setSources([]); setError(null);
    try {
      const response = await request({ action: 'research', ...input }, nextController.signal);
      if (!response.body) throw new Error('Research stream was unavailable.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ResearchStreamEvent;
          if (event.type === 'session') setDetail((previous) => previous ? previous : { session: { id: event.sessionId, ticker: input.ticker, mode: input.mode, replay_cutoff: input.replayCutoff, title: input.question.slice(0, 90), status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, messages: [], sources: [] });
          if (event.type === 'status') { setStage(event.stage); setStageLabel(event.label); }
          if (event.type === 'sources') setSources(event.sources);
          if (event.type === 'delta') setStreamText((text) => text + event.delta);
          if (event.type === 'done') { setAnswer(event.answer); setStage('completed'); setStreamText(''); await loadSessions(); await openSession(event.sessionId); }
          if (event.type === 'error') { setError(event.message); setStage(event.code === 'cancelled' ? 'cancelled' : 'failed'); }
        }
      }
    } catch (caught) {
      if (nextController.signal.aborted) { setStage('cancelled'); setError('Research stopped. Your last completed answer is still available.'); }
      else { setStage('failed'); setError(caught instanceof Error ? caught.message : 'Research failed.'); }
    } finally { if (controller.current === nextController) controller.current = null; }
  }, [loadSessions, openSession]);

  return { sessions, detail, stage, stageLabel, streamText, sources, answer, error, loadSessions, openSession, research, stop: () => controller.current?.abort() };
}
