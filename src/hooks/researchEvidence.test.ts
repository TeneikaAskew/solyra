import { z } from 'zod';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const source = readFileSync('supabase/functions/insights-research/index.ts', 'utf8');
const transpile = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
it('INS-FINAL-002/003 withholds unbounded Replay stats and formats percentage returns without rescaling', async () => {
  const requests: string[] = [];
  const ctx = createContext({ z, crypto: webcrypto, TextEncoder, URLSearchParams, Date, JSON, Number, Object, Array, String, encoder: new TextEncoder(), STOCKS_API: 'http://fixture', fetch: async (url: string) => {
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
  const ctx = createContext({ z, crypto: webcrypto, TextEncoder, URLSearchParams, Date, JSON, Number, Object, Array, String, encoder: new TextEncoder(), STOCKS_API: 'http://fixture', fetch: async () => response });
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

it('CODE3 4419167018 recognizes healthy quote last_updated and refuses unknown or invalid clocks', async () => {
  const instant = new Date().toISOString();
  let response = new Response(JSON.stringify({ price: 100, last_updated: instant }));
  const ctx = createContext({ z, crypto: webcrypto, TextEncoder, URLSearchParams, Date, JSON, Number, Object, Array, String, encoder: new TextEncoder(), STOCKS_API: 'http://fixture', fetch: async () => response });
  runInContext(transpile(source.slice(source.indexOf('async function digest'), source.indexOf('function citations'))), ctx);
  expect(await ctx.getEvidence('/fixture', 'Quote', 'live_quote', 'fixture', null, 1)).toMatchObject({ asOf: instant, freshness: 'current', payload: { price: 100, last_updated: instant } });
  response = new Response(JSON.stringify({ price: 100, last_updated: '2026-10-29' }));
  expect(await ctx.getEvidence('/fixture', 'Quote', 'live_quote', 'fixture', null, 1)).toMatchObject({ asOf: '2026-10-29', payload: { last_updated: '2026-10-29' } });
  for (const last_updated of [undefined, 'not-a-clock']) {
    response = new Response(JSON.stringify({ price: 100, last_updated }));
    expect(await ctx.getEvidence('/fixture', 'Quote', 'live_quote', 'fixture', null, 1)).toMatchObject({ asOf: null, freshness: 'unavailable' });
  }
});


it('CODE3 actual Edge request schema accepts zoned replay transport and rejects naive or invalid clocks', () => {
  const begin = source.indexOf('const ResearchSchema');
  const end = source.indexOf('type Evidence');
  const ctx = createContext({ z });
  runInContext(transpile(source.slice(begin, end) + '\nglobalThis.schema = BodySchema;'), ctx);
  const input = { action: 'research', ticker: 'IWM', question: 'What was knowable?', mode: 'replay', sessionId: null };
  for (const replayCutoff of ['2026-10-09T15:30:45.123Z', '2026-10-09T11:30:00-04:00', '2026-10-10T03:30:45+02:00', '2025-11-02T01:30:00-05:00']) {
    expect(ctx.schema.parse({ ...input, replayCutoff }).replayCutoff).toBe(replayCutoff);
  }
  for (const replayCutoff of ['2026-10-09T11:30', '2026-02-30T11:30:00Z', 'not-a-clock', '2026-10-09T11:30:00+25:00']) {
    expect(ctx.schema.safeParse({ ...input, replayCutoff }).success).toBe(false);
  }
});

it.each([
  ['2026-10-09T15:30:45Z', '2026-10-09', '11:30'],
  ['2026-01-09T15:30:45Z', '2026-01-09', '10:30'],
  ['2026-10-10T03:30:45+02:00', '2026-10-09', '21:30'],
])('CODE3 gather adapts absolute %s to the documented signals market wall clock and clips zoned future rows', async (cutoff, date, time) => {
  const requests: string[] = [];
  const before = new Date(Date.parse(cutoff) - 60_000).toISOString().replace('T', ' ').replace('Z', '+00:00');
  const after = new Date(Date.parse(cutoff) + 60_000).toISOString().replace('T', ' ').replace('Z', '+00:00');
  const ctx = createContext({ z, crypto: webcrypto, TextEncoder, URLSearchParams, Date, JSON, Number, Object, Array, String, encoder: new TextEncoder(), STOCKS_API: 'http://fixture', fetch: async (url: string) => {
    requests.push(url);
    return new Response(JSON.stringify(url.includes('/signals/') ? { as_of: cutoff, signals: [{ time: before, direction: 'CALL', rsi: 35, score: 4 }, { time: after, direction: 'PUT', rsi: 65, score: 4 }] } : { as_of: cutoff }));
  } });
  runInContext(transpile(source.slice(source.indexOf('async function digest'), source.indexOf('function citations'))), ctx);
  const evidence = await ctx.gather('IWM', 'Bearer fixture', 'replay', cutoff);
  const request = new URL(requests.find(url => url.includes('/signals/'))!);
  expect(request.searchParams.get('end_date')).toBe(date);
  expect(request.searchParams.get('end_time')).toBe(time);
  expect(evidence.find((row: { type: string }) => row.type === 'signals').payload.signals).toEqual([{ time: before, direction: 'CALL', rsi: 35, score: 4 }]);
});

it.each(['2026-10-09 11:00:00', '2026-10-09', 'not-a-clock', undefined])('CODE3 withholds signal replay evidence with unqualified timestamp %s rather than fabricating an empty result', async time => {
  const ctx = createContext({ z, crypto: webcrypto, TextEncoder, URLSearchParams, Date, JSON, Number, Object, Array, String, encoder: new TextEncoder(), STOCKS_API: 'http://fixture', fetch: async () => new Response(JSON.stringify({ signals: [{ time: '2026-10-09T14:00:00Z' }, { time }] })) });
  runInContext(transpile(source.slice(source.indexOf('async function digest'), source.indexOf('function citations'))), ctx);
  const evidence = await ctx.getEvidence('/fixture', 'Signals', 'signals', 'fixture', '2026-10-09T15:30:00Z', 1);
  expect(evidence).toMatchObject({ freshness: 'unavailable', payload: null });
  expect(evidence.excerpt).toContain('timezone-qualified');
  expect(evidence.excerpt).not.toContain('No matching data');
});
