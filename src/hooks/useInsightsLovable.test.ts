import { describe, expect, it } from 'vitest';
import { researchContext, savedResearchArtifact } from './useInsightsLovable';
import type { ResearchSessionDetail } from '@/types/insightsLovable';

const session = { id: 'saved', ticker: 'IWM', mode: 'replay' as const, replay_cutoff: '2026-10-09T15:30:45.000Z', title: 'Saved question', status: 'active', created_at: '2026-10-09T15:30:00Z', updated_at: '2026-10-09T15:31:00Z' };
const answer = { answer: 'Saved answer', facts: [], bullCase: '', bearCase: '', invalidation: '', unknowns: [], catalystTimeline: [], replayContext: null };
const detail: ResearchSessionDetail = { session, messages: [
  { id: 'completed', session_id: 'saved', question: 'Original question', answer, run_state: 'completed', error_code: null, error_message: null, created_at: session.created_at },
  { id: 'failed', session_id: 'saved', question: 'Failed follow-up', answer: null, run_state: 'failed', error_code: 'provider_error', error_message: 'Provider unavailable', created_at: session.updated_at },
], sources: [
  { message_id: 'completed', citation_id: 'S1', freshness: 'current', excerpt: 'Saved evidence' },
  { message_id: 'failed', citation_id: 'S1', freshness: 'unavailable', excerpt: 'Failed evidence' },
] };

describe('researchContext', () => {
  it('preserves saved Replay mode, ticker and exact cutoff including seconds', () => {
    expect(researchContext(session, 'AAPL', 'live', null)).toEqual({ ticker: 'IWM', mode: 'replay', replayCutoff: session.replay_cutoff });
  });
  it('preserves saved Live mode without importing the shared replay cutoff', () => {
    expect(researchContext({ ...session, mode: 'live', replay_cutoff: null }, 'AAPL', 'replay', '2026-10-10T14:00:00Z')).toEqual({ ticker: 'IWM', mode: 'live', replayCutoff: null });
  });
  it('uses shared context only when no saved session is selected', () => {
    expect(researchContext(null, 'AAPL', 'replay', session.replay_cutoff)).toEqual({ ticker: 'AAPL', mode: 'replay', replayCutoff: session.replay_cutoff });
  });
});
describe('savedResearchArtifact', () => {
  it('restores the last completed question and only its source pair after a failed follow-up', () => {
    expect(savedResearchArtifact(detail)).toMatchObject({ answer, question: 'Original question', sources: [detail.sources[0]] });
  });
  it('keeps a failed session selectable without fabricating an answer', () => {
    expect(savedResearchArtifact({ ...detail, messages: [detail.messages[1]], sources: [detail.sources[1]] })).toMatchObject({ answer: null, question: 'Failed follow-up', sources: [detail.sources[1]], stage: 'failed' });
  });
  it('does not fabricate an answer or financial evidence for an empty session', () => {
    expect(savedResearchArtifact({ ...detail, messages: [], sources: [] })).toMatchObject({ answer: null, question: session.title, sources: [], stage: 'idle' });
  });
});
