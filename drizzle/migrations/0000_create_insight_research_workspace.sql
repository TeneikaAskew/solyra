CREATE TABLE public.insight_research_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid text NOT NULL,
  ticker text NOT NULL CHECK (ticker ~ '^[A-Z][A-Z0-9.]{0,9}$'),
  mode text NOT NULL CHECK (mode IN ('live', 'replay')),
  replay_cutoff timestamptz,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((mode = 'live' AND replay_cutoff IS NULL) OR (mode = 'replay' AND replay_cutoff IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insight_research_sessions TO authenticated;
GRANT ALL ON public.insight_research_sessions TO service_role;
ALTER TABLE public.insight_research_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read research sessions" ON public.insight_research_sessions FOR SELECT TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners create research sessions" ON public.insight_research_sessions FOR INSERT TO authenticated WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners update research sessions" ON public.insight_research_sessions FOR UPDATE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub')) WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners delete research sessions" ON public.insight_research_sessions FOR DELETE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE INDEX insight_research_sessions_owner_recent_idx ON public.insight_research_sessions (owner_uid, updated_at DESC);

CREATE TABLE public.insight_research_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.insight_research_sessions(id) ON DELETE CASCADE,
  owner_uid text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  question text,
  answer jsonb,
  run_state text NOT NULL CHECK (run_state IN ('queued', 'gathering', 'synthesizing', 'completed', 'failed', 'cancelled')),
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insight_research_messages TO authenticated;
GRANT ALL ON public.insight_research_messages TO service_role;
ALTER TABLE public.insight_research_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read research messages" ON public.insight_research_messages FOR SELECT TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners create research messages" ON public.insight_research_messages FOR INSERT TO authenticated WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners update research messages" ON public.insight_research_messages FOR UPDATE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub')) WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners delete research messages" ON public.insight_research_messages FOR DELETE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE INDEX insight_research_messages_session_idx ON public.insight_research_messages (session_id, created_at);
CREATE INDEX insight_research_messages_owner_idx ON public.insight_research_messages (owner_uid, created_at DESC);

CREATE TABLE public.insight_research_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.insight_research_sessions(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.insight_research_messages(id) ON DELETE CASCADE,
  owner_uid text NOT NULL,
  citation_id text NOT NULL,
  source_type text NOT NULL,
  source_label text NOT NULL,
  source_url text NOT NULL,
  source_as_of timestamptz,
  freshness text NOT NULL CHECK (freshness IN ('current', 'stale', 'unavailable')),
  excerpt text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, citation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insight_research_sources TO authenticated;
GRANT ALL ON public.insight_research_sources TO service_role;
ALTER TABLE public.insight_research_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read research sources" ON public.insight_research_sources FOR SELECT TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners create research sources" ON public.insight_research_sources FOR INSERT TO authenticated WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners update research sources" ON public.insight_research_sources FOR UPDATE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub')) WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners delete research sources" ON public.insight_research_sources FOR DELETE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE INDEX insight_research_sources_message_idx ON public.insight_research_sources (message_id, citation_id);

CREATE TABLE public.insight_research_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.insight_research_sessions(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.insight_research_messages(id) ON DELETE CASCADE,
  owner_uid text NOT NULL,
  gateway_run_id text,
  status text NOT NULL CHECK (status IN ('queued', 'gathering', 'synthesizing', 'completed', 'failed', 'cancelled')),
  model_id text NOT NULL,
  failure_class text,
  evidence_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insight_research_runs TO authenticated;
GRANT ALL ON public.insight_research_runs TO service_role;
ALTER TABLE public.insight_research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read research runs" ON public.insight_research_runs FOR SELECT TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners create research runs" ON public.insight_research_runs FOR INSERT TO authenticated WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners update research runs" ON public.insight_research_runs FOR UPDATE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub')) WITH CHECK (owner_uid = (auth.jwt() ->> 'sub'));
CREATE POLICY "Owners delete research runs" ON public.insight_research_runs FOR DELETE TO authenticated USING (owner_uid = (auth.jwt() ->> 'sub'));
CREATE INDEX insight_research_runs_owner_recent_idx ON public.insight_research_runs (owner_uid, started_at DESC);