import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@4';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/responses';
const MODEL = 'openai/gpt-6-astra';
const STOCKS_API = 'https://solyra-api-staging-5sjtb3yl7a-ue.a.run.app';
const encoder = new TextEncoder();

const ResearchSchema = z.object({
  action: z.literal('research'),
  ticker: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9.]{0,9}$/),
  question: z.string().trim().min(8).max(1200),
  mode: z.enum(['live', 'replay']),
  replayCutoff: z.string().datetime().nullable(),
  sessionId: z.string().uuid().nullable(),
});
const ReadSchema = z.object({ action: z.enum(['list', 'read']), sessionId: z.string().uuid().nullable() });
const BodySchema = z.discriminatedUnion('action', [ResearchSchema, ReadSchema]);

type Evidence = {
  id: string;
  type: string;
  label: string;
  path: string;
  asOf: string | null;
  freshness: 'current' | 'stale' | 'unavailable';
  excerpt: string | null;
  payload: unknown;
  hash: string;
};

function researchAnswerSchema(availableCitationIds: string[]) {
  const citationId = { type: 'string', enum: availableCitationIds };
  return {
  type: 'object', additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    facts: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { text: { type: 'string' }, citations: { type: 'array', items: citationId } }, required: ['text', 'citations'] } },
    bullCase: { type: 'string' }, bearCase: { type: 'string' }, invalidation: { type: 'string' },
    unknowns: { type: 'array', items: { type: 'string' } },
    catalystTimeline: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { date: { type: ['string', 'null'] }, event: { type: 'string' }, impact: { type: 'string' }, citations: { type: 'array', items: citationId } }, required: ['date', 'event', 'impact', 'citations'] } },
    replayContext: { type: ['string', 'null'] },
    verdict: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    keyLevels: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { label: { type: 'string' }, value: { type: 'string' }, citations: { type: 'array', items: citationId } }, required: ['label', 'value', 'citations'] } },
    followUps: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'facts', 'bullCase', 'bearCase', 'invalidation', 'unknowns', 'catalystTimeline', 'replayContext', 'verdict', 'confidence', 'keyLevels', 'followUps'],
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function safeMessage(status: number, raw: string) {
  try { const parsed = JSON.parse(raw); return typeof parsed.message === 'string' ? parsed.message : `Research service returned ${status}.`; }
  catch { return `Research service returned ${status}.`; }
}
function decodeSubject(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}
async function identity(req: Request) {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice(7);
  const check = await fetch(`${STOCKS_API}/api/me`, { headers: { Authorization: authorization } });
  if (!check.ok) return null;
  const me = await check.json();
  if (!me?.email) return null;
  const uid = decodeSubject(token);
  return uid ? { uid, authorization } : null;
}
async function digest(value: string) {
  const data = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(data)).map((n) => n.toString(16).padStart(2, '0')).join('');
}
function valueAsOf(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  for (const key of ['as_of', 'analysis_date', 'snapshot_ts', 'date', 'time']) {
    if (typeof row[key] === 'string') return row[key] as string;
  }
  return null;
}
function clipReplay(value: unknown, cutoff: string): unknown {
  if (Array.isArray(value)) return value.filter((item) => {
    const when = valueAsOf(item);
    return !when || new Date(when).getTime() <= new Date(cutoff).getTime();
  }).map((item) => clipReplay(item, cutoff));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, clipReplay(v, cutoff)]));
}
// Keeps the most recent rows of long lists so large payloads stay valid JSON instead of being cut mid-string.
function trimLists(value: unknown, keep: number): unknown {
  if (Array.isArray(value)) return value.slice(-keep).map((item) => trimLists(item, keep));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, trimLists(v, keep)]));
  return value;
}
// Builds a short human-readable summary of an evidence payload for the evidence panel.
function summarize(payload: unknown, type: string): string {
  if (!payload || typeof payload !== 'object') return 'No detail available.';
  const p = payload as Record<string, unknown>;
  const parts: string[] = [];
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const report = (p.report && typeof p.report === 'object' ? p.report : p) as Record<string, unknown>;
  const thesis = str(report.thesis) ?? str(p.thesis) ?? str(p.summary) ?? str(p.brief);
  if (thesis) parts.push(thesis.length > 220 ? `${thesis.slice(0, 220)}…` : thesis);
  const bias = str(p.bias) ?? str(report.regime);
  if (bias) parts.push(`Bias/regime: ${bias}.`);
  const price = num(p.price) ?? num(report.price);
  if (price !== null) parts.push(`Price: ${price}.`);
  const rsi = num(p.rsi);
  if (rsi !== null) parts.push(`RSI: ${rsi}.`);
  if (Array.isArray(p.cards) && p.cards.length) {
    const names = p.cards.slice(0, 3).map((c) => str((c as Record<string, unknown>).name)).filter(Boolean);
    if (names.length) parts.push(`Playbook setups: ${names.join('; ')}.`);
  }
  if (Array.isArray(p.events) && p.events.length) {
    const names = p.events.slice(0, 3).map((e) => str((e as Record<string, unknown>).title) ?? str((e as Record<string, unknown>).name)).filter(Boolean);
    if (names.length) parts.push(`Upcoming events: ${names.join('; ')}.`);
  }
  if (Array.isArray(p.signals) && p.signals.length) parts.push(`${p.signals.length} recent signals on record.`);
  const stats = p.stats && typeof p.stats === 'object' ? p.stats as Record<string, unknown> : null;
  if (stats && num(stats.count) !== null) {
    const win = num(stats.pct_profitable); const r20 = num(stats.avg_return_20min);
    parts.push(`${stats.count} similar ${str(p.direction) ?? ''} setups since ${str(stats.earliest)?.slice(0, 10) ?? 'unknown'}${win !== null ? `, ${(win * 100).toFixed(1)}% profitable` : ''}${r20 !== null ? `, avg 20-min return ${(r20 * 100).toFixed(3)}%` : ''}.`);
  }
  if (!parts.length) parts.push(`${type} data available; see the full report on its page.`);
  return parts.join(' ').slice(0, 480);
}
async function getEvidence(path: string, label: string, type: string, auth: string, cutoff: string | null, index: number): Promise<Evidence> {
  try {
    const response = await fetch(`${STOCKS_API}${path}`, { headers: { Authorization: auth } });
    if (!response.ok) throw new Error(`Solyra API returned ${response.status}`);
    const raw = await response.text();
    if (!raw.trim()) throw new Error('Solyra API returned an empty response');
    let payload: unknown = JSON.parse(raw);
    if (cutoff) payload = clipReplay(payload, cutoff);
    let serialized = JSON.stringify(payload);
    for (const keep of [120, 60, 30, 15, 8]) {
      if (serialized.length <= 45_000) break;
      payload = trimLists(payload, keep);
      serialized = JSON.stringify(payload);
    }
    if (serialized.length > 45_000) throw new Error('Response too large to use as evidence');
    const asOf = valueAsOf(payload);
    const age = asOf ? Date.now() - new Date(asOf).getTime() : null;
    return { id: `S${index}`, type, label, path, asOf, freshness: age !== null && age > 7 * 86_400_000 ? 'stale' : 'current', excerpt: summarize(payload, type), payload, hash: await digest(serialized) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unavailable';
    return { id: `S${index}`, type, label, path, asOf: null, freshness: 'unavailable', excerpt: reason, payload: null, hash: await digest(reason) };
  }
}
async function gather(ticker: string, auth: string, mode: 'live' | 'replay', cutoff: string | null) {
  const anchor = cutoff ? new Date(cutoff) : new Date();
  const from = new Date(anchor.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(anchor.getTime() + 60 * 86_400_000).toISOString().slice(0, 10);
  const asOf = mode === 'replay' && cutoff ? `?as_of=${encodeURIComponent(cutoff)}` : '';
  const signalQs = new URLSearchParams({ limit: '250' });
  if (mode === 'replay' && cutoff) { signalQs.set('end_date', cutoff.slice(0, 10)); signalQs.set('end_time', cutoff.slice(11, 19)); }
  const entries: Array<[string, string, string]> = [
    [`/api/insights/report/${ticker}${asOf}`, 'Structured insight report', 'insight_report'],
    [`/api/dashboard/brief/${ticker}`, 'House market brief', 'market_brief'],
    [`/api/playbook/${ticker}`, 'Trading playbook', 'playbook'],
    [`/api/signals/${ticker}?${signalQs}`, 'Signal history', 'signals'],
    [`/api/catalysts/events?date_from=${from}&date_to=${to}&tickers=${ticker}`, 'Catalyst calendar', 'catalysts'],
    [`/api/live/history/${ticker}`, 'Price replay history', 'price_history'],
  ];
  // Live quote is the single reference price for live answers; replay must not see it.
  if (mode === 'live') entries.push([`/api/live/quote/${ticker}`, 'Live quote (reference price)', 'live_quote']);
  const evidence = await Promise.all(entries.map(([path, label, type], i) => getEvidence(path, label, type, auth, cutoff, i + 1)));
  // Historical win rates for the newest signal's bucket (direction + score + RSI ±5).
  const rows = ((evidence.find((e) => e.type === 'signals')?.payload as { signals?: Array<Record<string, unknown>> } | null)?.signals ?? [])
    .filter((r) => (r.direction === 'CALL' || r.direction === 'PUT') && typeof r.rsi === 'number' && typeof r.score === 'number')
    .sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const idx = evidence.length + 1;
  if (rows[0]) {
    const qs = new URLSearchParams({ direction: String(rows[0].direction), rsi: String(rows[0].rsi), score: String(rows[0].score), rsi_band: '5', limit: '10' });
    evidence.push(await getEvidence(`/api/signals/${ticker}/similar?${qs}`, 'Similar historical setups (win rates)', 'similar_setups', auth, cutoff, idx));
  } else {
    evidence.push({ id: `S${idx}`, type: 'similar_setups', label: 'Similar historical setups (win rates)', path: `/api/signals/${ticker}/similar`, asOf: null, freshness: 'unavailable', excerpt: 'No recent signal with direction, RSI and score to match against.', payload: null, hash: await digest('no-signal') });
  }
  return evidence;
}
function citations(answer: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'citations' && Array.isArray(nested)) nested.forEach((id) => { if (typeof id === 'string') ids.push(id); });
      else collect(nested);
    }
  };
  collect(answer);
  return ids;
}
async function readGateway(response: Response, onDelta: (text: string) => void) {
  if (!response.body) throw new Error('AI response was empty.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const line = block.split('\n').find((entry) => entry.startsWith('data: '));
      if (!line || line === 'data: [DONE]') continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') { output += event.delta; onDelta(event.delta); }
        if (event.type === 'error') throw new Error(event.error?.message ?? 'AI stream failed.');
      } catch (error) { if (error instanceof SyntaxError) continue; throw error; }
    }
  }
  if (!output.trim()) throw new Error('AI returned no research answer.');
  return output;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const user = await identity(req);
  if (!user) return json({ error: 'Sign in to use research.' }, 401);
  let body: z.infer<typeof BodySchema>;
  try { body = BodySchema.parse(await req.json()); }
  catch (error) { return json({ error: 'Invalid research request.', details: error instanceof z.ZodError ? error.flatten().fieldErrors : undefined }, 400); }
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  if (body.action === 'list') {
    const { data, error } = await db.from('insight_research_sessions').select('id,ticker,mode,replay_cutoff,title,status,created_at,updated_at').eq('owner_uid', user.uid).order('updated_at', { ascending: false }).limit(30);
    return error ? json({ error: 'Could not load research history.' }, 500) : json({ sessions: data });
  }
  if (body.action === 'read') {
    if (!body.sessionId) return json({ error: 'Session is required.' }, 400);
    const { data: session } = await db.from('insight_research_sessions').select('*').eq('id', body.sessionId).eq('owner_uid', user.uid).maybeSingle();
    if (!session) return json({ error: 'Research session not found.' }, 404);
    const [{ data: messages }, { data: sources }] = await Promise.all([
      db.from('insight_research_messages').select('*').eq('session_id', session.id).eq('owner_uid', user.uid).order('created_at'),
      db.from('insight_research_sources').select('message_id,citation_id,source_type,source_label,source_url,source_as_of,freshness,excerpt').eq('session_id', session.id).eq('owner_uid', user.uid).order('created_at'),
    ]);
    return json({ session, messages: messages ?? [], sources: sources ?? [] });
  }
  if ((body.mode === 'replay') !== Boolean(body.replayCutoff)) return json({ error: 'Replay mode requires a cutoff; live mode cannot use one.' }, 400);

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return json({ error: 'Lovable AI is not configured.' }, 401);
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const emit = (event: unknown) => writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
  const response = new Response(stream.readable, { headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache', 'Access-Control-Expose-Headers': 'X-Lovable-AIG-Run-ID' } });
  (async () => {
    let sessionId = body.sessionId;
    let messageId: string | null = null;
    let runId: string | null = null;
    try {
      if (sessionId) {
        const { data } = await db.from('insight_research_sessions').select('id,ticker,mode,replay_cutoff').eq('id', sessionId).eq('owner_uid', user.uid).maybeSingle();
        if (!data) throw new Error('Research session not found.');
        if (data.ticker !== body.ticker || data.mode !== body.mode || data.replay_cutoff !== body.replayCutoff) throw new Error('Follow-ups must use the session ticker and evidence mode.');
      } else {
        const { data, error } = await db.from('insight_research_sessions').insert({ owner_uid: user.uid, ticker: body.ticker, mode: body.mode, replay_cutoff: body.replayCutoff, title: body.question.slice(0, 90) }).select('id').single();
        if (error || !data) throw new Error('Could not create research session.');
        sessionId = data.id;
      }
      await emit({ type: 'session', sessionId });
      const { data: message, error: messageError } = await db.from('insight_research_messages').insert({ session_id: sessionId, owner_uid: user.uid, role: 'assistant', question: body.question, run_state: 'gathering' }).select('id').single();
      if (messageError || !message) throw new Error('Could not save the research request.');
      messageId = message.id;
      const { data: run } = await db.from('insight_research_runs').insert({ session_id: sessionId, message_id: messageId, owner_uid: user.uid, status: 'gathering', model_id: MODEL }).select('id').single();
      runId = run?.id ?? null;
      await emit({ type: 'status', stage: 'gathering', label: 'Gathering approved evidence' });
      let evidence: Evidence[];
      if (body.sessionId) {
        const { data: frozen, error: frozenError } = await db
          .from('insight_research_sources')
          .select('citation_id,source_type,source_label,source_url,source_as_of,freshness,excerpt,payload_hash,metadata')
          .eq('session_id', body.sessionId)
          .eq('owner_uid', user.uid)
          .order('created_at')
          .limit(10);
        if (frozenError || !frozen || frozen.length === 0) throw new Error('The frozen evidence snapshot for this session is unavailable.');
        evidence = frozen.map((source) => ({
          id: source.citation_id,
          type: source.source_type,
          label: source.source_label,
          path: source.source_url,
          asOf: source.source_as_of,
          freshness: source.freshness as Evidence['freshness'],
          excerpt: source.excerpt,
          payload: (source.metadata as { payload?: unknown } | null)?.payload ?? null,
          hash: source.payload_hash,
        }));
      } else {
        evidence = await gather(body.ticker, user.authorization, body.mode, body.replayCutoff);
      }
      await db.from('insight_research_sources').insert(evidence.map((source) => ({ session_id: sessionId, message_id: messageId, owner_uid: user.uid, citation_id: source.id, source_type: source.type, source_label: source.label, source_url: source.path, source_as_of: source.asOf, freshness: source.freshness, excerpt: source.excerpt, payload_hash: source.hash, metadata: { available: source.payload !== null, payload: source.payload } })));
      await emit({ type: 'sources', sources: evidence.map(({ payload: _payload, hash: _hash, ...source }) => source) });
      await db.from('insight_research_messages').update({ run_state: 'synthesizing' }).eq('id', messageId).eq('owner_uid', user.uid);
      if (runId) await db.from('insight_research_runs').update({ status: 'synthesizing', evidence_count: evidence.length }).eq('id', runId).eq('owner_uid', user.uid);
      await emit({ type: 'status', stage: 'synthesizing', label: 'Synthesizing cited answer' });
      const prior = await db.from('insight_research_messages').select('question,answer').eq('session_id', sessionId).eq('owner_uid', user.uid).eq('run_state', 'completed').order('created_at').limit(8);
      const availableCitationIds = evidence.filter((source) => source.payload !== null).map((source) => source.id);
      const unavailableCitationIds = evidence.filter((source) => source.payload === null).map((source) => source.id);
      const input = [{ role: 'system', content: [{ type: 'input_text', text: 'You are Solyra Research. Answer only from the supplied evidence. Distinguish sourced facts from interpretation. Never invent a price, metric, event, timestamp, or citation. Use citations only from availableCitationIds; unavailableCitationIds must never appear in a citation array. Put missing evidence in unknowns instead. When evidence is missing, stale, or contradictory, say so. If a live_quote source is available, treat its price and prev_close as the authoritative current price and prior close; label any other price figures as snapshot values from their source. Keep answer to at most 3 short sentences. verdict is one plain-English line under 15 words. keyLevels lists up to 5 sourced prices or levels (support, resistance, last price, targets) with short value strings. followUps lists 3 short next questions a trader would ask. Keep facts to at most 5 and bull/bear cases to 2 sentences each. This is research, not financial advice.' }] }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ ticker: body.ticker, mode: body.mode, replayCutoff: body.replayCutoff, question: body.question, priorTurns: prior.data ?? [], availableCitationIds, unavailableCitationIds, evidence }) }] }];
      const ai = await fetch(GATEWAY, { method: 'POST', signal: req.signal, headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'fetch' }, body: JSON.stringify({ model: MODEL, input, stream: true, store: false, reasoning: { effort: 'medium', summary: 'auto' }, include: ['reasoning.encrypted_content'], text: { format: { type: 'json_schema', name: 'research_answer', strict: true, schema: researchAnswerSchema(availableCitationIds) } } }) });
      const gatewayRunId = ai.headers.get('X-Lovable-AIG-Run-ID');
      if (!ai.ok) { const raw = await ai.text(); throw Object.assign(new Error(safeMessage(ai.status, raw)), { status: ai.status }); }
      const rawAnswer = await readGateway(ai, (delta) => { void emit({ type: 'delta', delta }); });
      const answer = JSON.parse(rawAnswer) as Record<string, unknown>;
      const allowed = new Set(availableCitationIds);
      const unsupported = citations(answer).filter((id) => !allowed.has(id));
      if (unsupported.length > 0) throw new Error(`Answer cited unsupported evidence: ${unsupported.join(', ')}.`);
      await db.from('insight_research_messages').update({ answer, run_state: 'completed' }).eq('id', messageId).eq('owner_uid', user.uid);
      if (runId) await db.from('insight_research_runs').update({ status: 'completed', gateway_run_id: gatewayRunId, finished_at: new Date().toISOString() }).eq('id', runId).eq('owner_uid', user.uid);
      await db.from('insight_research_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId).eq('owner_uid', user.uid);
      await emit({ type: 'done', sessionId, messageId, answer });
    } catch (error) {
      const aborted = req.signal.aborted || (error instanceof Error && error.name === 'AbortError');
      const status = typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : aborted ? 499 : 500;
      const code = aborted ? 'cancelled' : status === 402 ? 'credits' : status === 429 ? 'rate_limited' : status === 403 ? 'policy' : 'dependency';
      const message = error instanceof Error ? error.message : 'Research failed.';
      if (messageId) await db.from('insight_research_messages').update({ run_state: aborted ? 'cancelled' : 'failed', error_code: code, error_message: message }).eq('id', messageId).eq('owner_uid', user.uid);
      if (runId) await db.from('insight_research_runs').update({ status: aborted ? 'cancelled' : 'failed', failure_class: code, finished_at: new Date().toISOString() }).eq('id', runId).eq('owner_uid', user.uid);
      await emit({ type: 'error', code, message, status });
    } finally { await writer.close(); }
  })();
  return response;
});
