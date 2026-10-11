export type ResearchMode = 'live' | 'replay';
export type ResearchStage = 'idle' | 'gathering' | 'synthesizing' | 'completed' | 'failed' | 'cancelled';

export interface ResearchSource {
  id?: string;
  citation_id?: string;
  type?: string;
  source_type?: string;
  label?: string;
  source_label?: string;
  path?: string;
  source_url?: string;
  asOf?: string | null;
  source_as_of?: string | null;
  freshness: 'current' | 'stale' | 'unavailable';
  excerpt: string | null;
  message_id?: string;
}
export interface CitedFact { text: string; citations: string[]; }
export interface CatalystItem { date: string | null; event: string; impact: string; citations: string[]; }
export interface ResearchAnswer {
  answer: string;
  facts: CitedFact[];
  bullCase: string;
  bearCase: string;
  invalidation: string;
  unknowns: string[];
  catalystTimeline: CatalystItem[];
  replayContext: string | null;
  verdict?: string;
  confidence?: 'low' | 'medium' | 'high';
  keyLevels?: { label: string; value: string; citations: string[] }[];
  followUps?: string[];
}
export interface ResearchSessionSummary {
  id: string; ticker: string; mode: ResearchMode; replay_cutoff: string | null; title: string; status: string; created_at: string; updated_at: string;
}
export interface ResearchMessage {
  id: string; session_id: string; question: string | null; answer: ResearchAnswer | null; run_state: ResearchStage; error_code: string | null; error_message: string | null; created_at: string;
}
export interface ResearchSessionDetail {
  session: ResearchSessionSummary;
  messages: ResearchMessage[];
  sources: ResearchSource[];
}
export type ResearchStreamEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'status'; stage: ResearchStage; label: string }
  | { type: 'sources'; sources: ResearchSource[] }
  | { type: 'delta'; delta: string }
  | { type: 'done'; sessionId: string; messageId: string; answer: ResearchAnswer }
  | { type: 'error'; code: string; message: string; status: number };
