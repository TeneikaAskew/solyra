import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const source = readFileSync('supabase/functions/insights-research/index.ts', 'utf8');
const transpile = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
it('INS-FINAL-002/003 withholds unbounded Replay stats and formats percentage returns without rescaling', async () => {
  const requests: string[] = [];
  const ctx = createContext({ crypto: webcrypto, TextEncoder, URLSearchParams, Date, JSON, Number, Object, Array, String, encoder: new TextEncoder(), STOCKS_API: 'http://fixture', fetch: async (url: string) => {
    requests.push(url);
    return new Response(JSON.stringify(url.includes('/signals/') ? { signals: [{ time: '2026-10-01T14:00:00Z', direction: 'CALL', rsi: 35, score: 4 }] } : { as_of: '2026-10-01T14:00:00Z' }));
  } });
  runInContext(transpile(source.slice(source.indexOf('async function digest'), source.indexOf('function citations'))), ctx);
  const rows = await ctx.gather('IWM', 'Bearer fixture', 'replay', '2026-10-01T15:30:00Z');
  expect(rows.find((row: { type: string }) => row.type === 'similar_setups')).toMatchObject({ freshness: 'unavailable', payload: null });
  expect(requests.some(url => url.includes('/similar'))).toBe(false);
  expect(ctx.summarize({ stats: { count: 240, pct_profitable: .858, avg_return_20min: .082 } }, 'similar_setups')).toContain('85.8% profitable, avg 20-min return 0.082%');
});
it('INS-FINAL-009 keeps exactly one source message across repeated follow-ups', async () => {
  const rows = ['m1', 'm2', 'm3'].flatMap((message_id, n) => Array.from({ length: 8 }, (_, i) => ({ message_id, session_id: 's', owner_uid: 'u', created_at: n, citation_id: `S${i+1}`, metadata: { payload: { message_id } } })));
  const db = { from() {
    let filtered = [...rows];
    const q = { select() { return q; }, eq(key: string, value: unknown) { filtered = filtered.filter(row => (row as Record<string, unknown>)[key] === value); return q; }, order() { return q; }, limit(n: number) { filtered = filtered.slice(0, n); return q; }, maybeSingle() { return Promise.resolve({ data: filtered[0] ?? null, error: null }); }, then(resolve: (value: unknown) => void) { return Promise.resolve({ data: filtered, error: null }).then(resolve); } }; return q;
  } };
  const begin = source.indexOf('        const { data: snapshot, error: snapshotError }');
  const end = source.indexOf('      } else {\n        evidence = await gather', begin);
  const ctx = createContext({ db, body: { sessionId: 's' }, user: { uid: 'u' }, Set });
  runInContext(transpile('async function inspect(){let evidence;'+source.slice(begin, end)+'return evidence;}'), ctx);
  const evidence = await ctx.inspect();
  expect(evidence).toHaveLength(8);
  expect(new Set(evidence.map((row: { id: string }) => row.id)).size).toBe(8);
  expect(evidence.every((row: { payload: { message_id: string } }) => row.payload.message_id === 'm1')).toBe(true);
});
it('ACC-RESEARCH-STATUS returns latest owned message state without changing session status constraints', async () => {
  const calls: unknown[][] = [];
  const sessions = ['completed', 'failed', 'cancelled'].map(run_state => ({ id: run_state, status: 'active', insight_research_messages: [{ run_state }] }));
  const query = { select(...args: unknown[]) { calls.push(['select', ...args]); return query; }, eq(...args: unknown[]) { calls.push(['eq', ...args]); return query; }, order(...args: unknown[]) { calls.push(['order', ...args]); return query; }, limit(...args: unknown[]) { calls.push(['limit', ...args]); return query; }, then(resolve: (value: unknown) => void) { return Promise.resolve({ data: sessions, error: null }).then(resolve); } };
  const start = source.indexOf("    const { data, error } = await db.from('insight_research_sessions')", source.indexOf("if (body.action === 'list')"));
  const end = source.indexOf("  }\n  if (body.action === 'read')", start);
  const ctx = createContext({ db: { from: () => query }, user: { uid: 'owner' }, json: (body: unknown) => body });
  runInContext(transpile('async function list(){'+source.slice(start,end)+'}'),ctx);
  expect((await ctx.list()).sessions.map((item: { status: string }) => item.status)).toEqual(['completed','failed','cancelled']);
  expect(calls).toContainEqual(['eq', 'insight_research_messages.owner_uid', 'owner']);
  expect(calls).toContainEqual(['limit', 1, { referencedTable: 'insight_research_messages' }]);
});
it('ACC-SOURCE-HEALTH distinguishes missing, invalid, request failure and unknown timestamps using existing fields', async () => {
  let response = new Response(JSON.stringify({ signals: [] }));
  const ctx = createContext({ crypto: webcrypto, TextEncoder, URLSearchParams, Date, JSON, Number, Object, Array, String, encoder: new TextEncoder(), STOCKS_API: 'http://fixture', fetch: async () => response });
  runInContext(transpile(source.slice(source.indexOf('async function digest'), source.indexOf('function citations'))), ctx);
  expect(await ctx.getEvidence('/fixture','Signals','signals','fixture',null,1)).toMatchObject({freshness:'unavailable',payload:null,excerpt:'No matching data for the requested evidence boundary'});
  response = new Response(JSON.stringify({ signals: 'invalid' }));
  expect((await ctx.getEvidence('/fixture','Signals','signals','fixture',null,1)).excerpt).toContain('Invalid response');
  response = new Response('{}',{status:503});
  expect((await ctx.getEvidence('/fixture','Signals','signals','fixture',null,1)).excerpt).toContain('503');
  response = new Response(JSON.stringify({ price: 100 }));
  expect(await ctx.getEvidence('/fixture','Quote','live_quote','fixture',null,1)).toMatchObject({asOf:null,freshness:'unavailable'});
});
it('ACC-FAILED-HISTORY retries source-less sessions at their existing frozen boundary', async () => {
  const calls: unknown[][] = [];
  const q = { select() { return q; }, eq() { return q; }, order() { return q; }, limit() { return q; }, maybeSingle() { return Promise.resolve({ data: null, error: null }); } };
  const begin = source.indexOf('        const { data: snapshot, error: snapshotError }');
  const end = source.indexOf('      } else {\n        evidence = await gather', begin);
  const ctx = createContext({ db: { from: () => q }, body: { sessionId: 'failed', ticker: 'IWM', mode: 'replay', replayCutoff: '2026-10-01T15:30:00Z' }, user: { uid: 'u', authorization: 'Bearer fixture' }, gather: async (...args: unknown[]) => { calls.push(args); return []; }, Set });
  runInContext(transpile('async function retry(){let evidence;'+source.slice(begin,end)+'return evidence;}'),ctx);
  await ctx.retry();
  expect(calls).toEqual([['IWM','Bearer fixture','replay','2026-10-01T15:30:00Z']]);
});
