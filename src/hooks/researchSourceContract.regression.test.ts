import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { z } from 'zod';
import { snapshotAgeLabel } from '@/lib/dates';
const edge=readFileSync('supabase/functions/insights-research/index.ts','utf8');
const page=readFileSync('src/routes/InsightsLovablePage.tsx','utf8');
const transpile=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
function adapter(payload:unknown,status=200){
 const ctx=createContext({z,crypto:webcrypto,TextEncoder,URLSearchParams,Date,JSON,Number,Object,Array,String,encoder:new TextEncoder(),STOCKS_API:'http://fixture',fetch:async()=>new Response(JSON.stringify(payload),{status})});
 runInContext(transpile(edge.slice(edge.indexOf('async function digest'),edge.indexOf('function citations'))),ctx);return ctx;
}
function panel(name:string,props:Record<string,unknown>){
 const start=page.indexOf(`function ${name}(`);const end=page.indexOf(name==='EvidencePanel'?'export type ResearchController':'function EvidencePanel',start);
 const code=page.slice(start,end);const vars:Record<string,unknown>={React,Date,snapshotAgeLabel,useEffect:()=>{},useState:()=>[false,()=>{}],sourceId:(s:any)=>s.id??s.citation_id};
 for(const tag of code.matchAll(/<([A-Z][A-Za-z0-9]*)/g))vars[tag[1]]=({children}:any)=>React.createElement('span',null,children);
 runInContext(transpile(page.slice(page.indexOf('function sourceTimeLabel'), page.indexOf('function sourceId')) + code),createContext(vars));return renderToStaticMarkup(React.createElement(vars[name] as any,props));
}
const catalyst={status:'ok',source:'database',date_range:{from:'2026-10-29',to:'2026-10-30'},total:1,events_by_date:{'2026-10-29':[{catalyst_type:'earnings',source:'fixture',date:'2026-10-29',title:'Actual contract event',ticker:'IWM'}]}};
it('REAL-CONTRACT grouped catalysts are usable',async()=>{
 const r=await adapter(catalyst).getEvidence('/api/catalysts/events','Catalyst calendar','catalysts','fixture',null,5);
 expect(r.payload).not.toBeNull();expect(r.excerpt).not.toContain('missing events list');
});
it('DATE-ONLY trading date must not display previous-day8PM',()=>{
 const html=panel('EvidencePanel',{sources:[{id:'S7',label:'Quote',asOf:'2026-10-29',freshness:'current'}]});
 expect(html).not.toContain('10/28/2026');expect(html).not.toContain('8:00:00 PM');expect(html).toMatch(/2026-10-29|10\/29\/2026|Oct(?:ober)? 29/);
});
it('TIMESTAMP-UNKNOWN successful payload is not unreachable',async()=>{
 const r=await adapter({ticker:'IWM',count:1,returned:1,source:'cloud_sql',signals:[{time:'2026-10-29T14:00:00Z',direction:'CALL'}]}).getEvidence('/api/signals/IWM','Signal history','signals','fixture',null,4);
 expect(r.payload).not.toBeNull();expect(r.asOf).toBeNull();
 const html=panel('AnswerPanel',{sources:[r],answer:{answer:'Available evidence, timing unknown',facts:[],bullCase:'',bearCase:'',invalidation:'',unknowns:[],catalystTimeline:[],replayContext:null}});
 expect(html).not.toContain('Could not reach:');
});
it('TRANSPORT error remains unusable with no fakeasof',async()=>{
 const r=await adapter({error:'unavailable'},503).getEvidence('/api/signals/IWM','Signals','signals','fixture',null,4);
 expect(r.payload).toBeNull();expect(r.asOf).toBeNull();expect(r.excerpt).toContain('503');
});
it('MALFORMED is not silently normalized to successful events',async()=>{
 for(const payload of [{},[],{...catalyst,events_by_date:'bad'}]){
 const r=await adapter(payload).getEvidence('/api/catalysts/events','Catalysts','catalysts','fixture',null,5);expect(r.payload).toBeNull();
 }
});

it.each(['2026-10-29','2026-11-01','2026-03-08'])('DATE-ONLY %s remains exact through evidence/save/reload',async date=>{
 const ctx=adapter({analysis_date:date,thesis:'Source statement'});
 const source=await ctx.getEvidence('/brief','Brief','market_brief','fixture',null,2);
 expect(source).toMatchObject({asOf:date,available:true,freshness:'unavailable'});
 const persisted={source_as_of:ctx.sourceClock(source.asOf).kind==='instant'?source.asOf:null,metadata:{asOf:source.asOf,available:source.available,payload:source.payload}};
 expect(persisted.source_as_of).toBeNull();
 expect(ctx.storedSourceClock(JSON.parse(JSON.stringify(persisted)))).toBe(date);
 const html=panel('EvidencePanel',{sources:[{...source,asOf:undefined,source_as_of:date}]});
 expect(html).toContain('calendar date; time unavailable');expect(html).not.toContain('PM');
});
it.each(['2026-02-30','2026-10-29T12:00:00','not-time'])('INVALID source clock %s stays unknown without losing available data',async last_updated=>{
 const r=await adapter({price:123,last_updated}).getEvidence('/quote','Quote','live_quote','fixture',null,7);
 expect(r).toMatchObject({asOf:null,available:true,freshness:'unavailable'});
});
it('CATALYST actual grouped contract retains identity and truthful empty success',async()=>{
 const result=await adapter(catalyst).getEvidence('/events','Events','catalysts','fixture',null,5);
 expect(result.payload).toEqual(catalyst);expect(result.available).toBe(true);expect(result.excerpt).toContain('Actual contract event');
 const empty={...catalyst,total:0,events_by_date:{}};
 const r=await adapter(empty).getEvidence('/events','Events','catalysts','fixture',null,5);
 expect(r).toMatchObject({available:true,payload:empty,asOf:null,freshness:'unavailable'});expect(r.excerpt).toContain('0 calendar events');
});
it('CATALYST malformed groups, identities/count mismatches and non-ok states stay unavailable',async()=>{
 for(const payload of [{...catalyst,total:2},{...catalyst,status:'error'},{...catalyst,events_by_date:{'2026-02-30':[]}},{...catalyst,events_by_date:{'2026-10-29':[null]}},{...catalyst,events_by_date:{'2026-10-29':[{date:'2026-10-28'}]}}]) {
  expect(await adapter(payload).getEvidence('/events','Events','catalysts','fixture',null,5)).toMatchObject({available:false,payload:null});
 }
});
it.each(['2026-10-29T12:00:00Z', '2026-10-30T12:00:00Z'])('REVIEW Replay catalysts lack publication provenance at %s',async cutoff=>{
 const payload={...catalyst,events_by_date:{'2026-10-29':[{date:'2026-10-29',ticker:'MACRO',catalyst_type:'ECONOMIC',source:'FRED/Calendar',title:'8:30 economic release',actual:'3.0',forecast:'2.0'}]}};
 const r=await adapter(payload).getEvidence('/events','Events','catalysts','fixture',cutoff,5);
 expect(r).toMatchObject({available:false,payload:null});expect(r.excerpt).toContain('point-in-time');
});
it.each(['2026-10-30 15:59:00','2026-02-30T12:00:00Z','2026-10-29',null])('REVIEW Replay bars require qualified real instants: %s',async time=>{
 const r=await adapter({bars:[{time,close:204}]}).getEvidence('/history','History','price_history','fixture','2026-10-29T15:30:00Z',1);
 expect(r).toMatchObject({available:false,payload:null});expect(r.excerpt).toContain('timezone-qualified');
});
it('REVIEW Replay retains qualified eligible bars and rejects invalid dates in other arrays',async()=>{
 const r=await adapter({bars:[{time:'2026-10-29T15:29:00Z',close:203},{time:'2026-10-30T15:59:00Z',close:204}]}).getEvidence('/history','History','price_history','fixture','2026-10-29T15:30:00Z',1);
 expect(r.available).toBe(true);expect(r.payload.bars).toHaveLength(1);expect(r.payload.bars[0].close).toBe(203);
 for(const time of ['invalid','2026-02-30',123]) {
  const r=await adapter({events:[{time,value:1}]}).getEvidence('/brief','Brief','market_brief','fixture','2026-10-29T15:30:00Z',1);
  expect(r).toMatchObject({available:false,payload:null});
 }
});
it('REVIEW oversized grouped catalysts cannot silently lose rows or contradict total',async()=>{
 const rows=Array.from({length:150},(_,i)=>({date:'2026-10-29',ticker:'IWM',catalyst_type:'NEWS',source:'fixture',title:'Headline '+i+' '+'x'.repeat(300)}));
 const r=await adapter({...catalyst,total:150,events_by_date:{'2026-10-29':rows}}).getEvidence('/events','Events','catalysts','fixture',null,5);
 expect(r).toMatchObject({available:false,payload:null});expect(r.excerpt).toContain('too large');
});
it('AVAILABLE unknown freshness and actual failure remain separate in saved-source UI',()=>{
 const html=panel('AnswerPanel',{sources:[{citation_id:'S4',source_label:'Signals',available:true,freshness:'unavailable'},{citation_id:'S5',source_label:'Calendar',available:false,freshness:'unavailable'}],answer:{answer:'Sources',facts:[],bullCase:'',bearCase:'',invalidation:'',unknowns:[],catalystTimeline:[],replayContext:null}});
 expect(html).toContain('Evidence unavailable: Calendar');expect(html).toContain('Freshness unknown: Signals');expect(html).not.toContain('Could not reach');
});
it('READ restores projected source metadata without transferring raw payload; SAVE never casts a date to timestamptz',()=>{
 const read=edge.slice(edge.indexOf("if (body.action === 'read')"),edge.indexOf("if ((body.mode === 'replay')"));
 expect(read).toContain('available:metadata->available,asOf:metadata->>asOf');expect(read).not.toContain('excerpt,metadata');
 expect(edge).toContain("source_as_of: sourceClock(source.asOf).kind === 'instant' ? source.asOf : null");
});

it('ACTUAL source insert maps dates to JSON only and restores frozen exact evidence without changing citations',async()=>{
 const ctx=adapter({analysis_date:'2026-10-29',thesis:'Recorded evidence'});
 const evidence=[await ctx.getEvidence('/brief','Brief','market_brief','fixture',null,2)];
 let saved:any[]=[];
 ctx.evidence=evidence;ctx.sessionId='session';ctx.messageId='message';ctx.user={uid:'owner'};
 ctx.db={from:(table:string)=>{expect(table).toBe('insight_research_sources');return {insert:(rows:any[])=>{saved=rows;return Promise.resolve({error:null});}};}};
 const begin=edge.indexOf("      await db.from('insight_research_sources').insert(evidence.map");
 const end=edge.indexOf("      await emit({ type: 'sources'",begin);
 runInContext(transpile('async function persist(){'+edge.slice(begin,end)+'}'),ctx);
 await ctx.persist();expect(saved).toHaveLength(1);expect(saved[0]).toMatchObject({citation_id:'S2',source_as_of:null,metadata:{asOf:'2026-10-29',available:true,payload:{analysis_date:'2026-10-29'}}});
 expect(ctx.storedSourceClock(saved[0])).toBe('2026-10-29');
});
