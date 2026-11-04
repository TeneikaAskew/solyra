import { afterEach, expect, it, vi } from 'vitest';
import { buildSnapshot, qualifiedOpening, type OpeningProjection } from './playbookEvaluator';
import { liveHistoryKey } from '@/hooks/useLiveHistory';
import { playbookBatchKey } from '@/hooks/usePlaybookEvaluation';
import type { Indicators } from './indicators';
const now = Date.parse('2026-10-29T15:00:00Z');
const opening: OpeningProjection = { status:'available',ticker:'IWM',session:'2026-10-29',window_minutes:30,window_start:'2026-10-29T13:30:00Z',window_end:'2026-10-29T14:00:00Z',high:131,low:99,comparison_price:140,comparison_as_of:'2026-10-29T15:00:00Z',price_basis:'as_traded_requested',source:'alphavantage',fetched_at:'2026-10-29T15:00:00Z' };
afterEach(()=>vi.useRealTimers());
it('transports server projection, never derives extremes from compact bars or overwrites quote',()=>{
  vi.useFakeTimers();vi.setSystemTime(now);
  const s=buildSnapshot({ticker:'IWM',opening,bars:[{time:'2026-10-29 10:59:00',open:900,high:999,low:1,close:950,volume:10}],quote:{price:200},avgVolume20d:100,reference:undefined,indicators:{} as Indicators})!;
  expect(s.orbHigh).toBe(131);expect(s.orbLow).toBe(99);expect(s.price).toBe(200);expect(s.orbOpening?.comparison_price).toBe(140);
  expect(playbookBatchKey({a:['above ORB high']},s)).not.toEqual(playbookBatchKey({a:['above ORB high']},{...s,orbOpening:{...opening,comparison_price:141}}));
});
it.each(['unavailable','partial','loading'])('does not accept %s projection',status=>{
  expect(qualifiedOpening({...opening,status},'IWM',now)).toBeNull();
});
it.each([
 {ticker:'SPY'}, {session:'2026-10-28'}, {price_basis:'adjusted'}, {comparison_as_of:'2026-10-29'},
 {comparison_as_of:'2026-10-29T15:00:01Z'}, {comparison_as_of:'2026-10-29T14:57:59Z'},
 {high:NaN}, {comparison_price:null}, {high:98},
])('refuses malformed/unknown/mismatched identity %j',delta=>expect(qualifiedOpening({...opening,...delta},'IWM',now)).toBeNull());
it('accepts exact 120s boundary and aware offset equivalent',()=>{
 expect(qualifiedOpening({...opening,comparison_as_of:'2026-10-29T10:58:00-04:00'},'IWM',now)).not.toBeNull();
});
it('cache keys preserve default callers and isolate option and ticker',()=>{
 expect(liveHistoryKey('IWM')).toEqual(['live-history','IWM']);
 expect(liveHistoryKey('IWM',true)).not.toEqual(liveHistoryKey('IWM'));
 expect(liveHistoryKey('IWM',true)).not.toEqual(liveHistoryKey('SPY',true));
});
it('missing history and missing opening cannot synthesize levels',()=>{
 vi.useFakeTimers();vi.setSystemTime(now);
 const input={ticker:'IWM',bars:[{time:'2026-10-29 09:30:00',open:100,high:999,low:1,close:100,volume:10}],quote:{price:100},avgVolume20d:100,reference:undefined,indicators:{} as Indicators};
 expect(buildSnapshot(input)?.orbHigh).toBeNull();expect(buildSnapshot({...input,bars:undefined})).toBeNull();
});

it.each([
 {window_start:null},{window_end:null},{window_start:'bad'},{window_end:'bad'},
 {window_start:'2026-10-29T13:30:00'},{window_end:'2026-10-29T14:00:00'},
 {window_start:'2026-10-29T14:30:00Z'},{window_end:'2026-10-29T15:01:00Z'},
 {window_start:'2026-10-28T13:30:00Z'},{window_end:'2026-10-29T13:59:00Z'},
 {window_start:'2026-10-29T14:00:00Z',window_end:'2026-10-29T14:30:00Z'},
])('refuses missing/invalid/reversed/future/inconsistent window %j',delta=>expect(qualifiedOpening({...opening,...delta},'IWM',now)).toBeNull());
it('refuses a comparison before window completion even within the age bound',()=>{
 expect(qualifiedOpening({...opening,comparison_as_of:'2026-10-29T13:59:00Z'},'IWM',Date.parse('2026-10-29T14:00:00Z'))).toBeNull();
});
it.each(['comparison_as_of','window_start','window_end'] as const)('refuses normalized impossible calendar date in %s',field=>{
 const valid={...opening,session:'2026-03-02',window_start:'2026-03-02T14:30:00Z',window_end:'2026-03-02T15:00:00Z',comparison_as_of:'2026-03-02T15:00:00Z'};
 expect(qualifiedOpening({...valid,[field]:valid[field].replace('2026-03-02','2026-02-30')},'IWM',Date.parse('2026-03-02T15:00:00Z'))).toBeNull();
});
it('accepts valid leap-day/offset instants without changing the server values',()=>{
 const leap={...opening,session:'2024-02-29',window_start:'2024-02-29T09:30:00-05:00',window_end:'2024-02-29T10:00:00-05:00',comparison_as_of:'2024-02-29T10:00:00-05:00'};
 expect(qualifiedOpening(leap,'IWM',Date.parse('2024-02-29T15:00:00Z'))).toBe(leap);
});
