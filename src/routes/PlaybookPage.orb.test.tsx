// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import PlaybookPage from './PlaybookPage';
import { playbookBatchKey } from '@/hooks/usePlaybookEvaluation';
import type { MarketSnapshot } from '@/lib/playbookEvaluator';
import { MOCK_LIVE_HISTORY, MOCK_LIVE_QUOTE, MOCK_LIVE_INDICATORS, MOCK_AVG_VOLUME, MOCK_REFERENCE_LEVELS } from '@/mocks/live';
const state = vi.hoisted(() => ({ current: {} as Record<string, any>, snapshot: null as MarketSnapshot | null }));
vi.mock('@tanstack/react-query', () => ({ useQuery: ({queryKey}: {queryKey: string[]}) => queryKey[0] === 'playbook' ? state.current.playbook : {data:MOCK_REFERENCE_LEVELS} }));
vi.mock('@/components/shared/SignInEmptyState', () => ({ DataGate: ({children}: {children:ReactNode}) => children }));
vi.mock('@/components/playbook/SetupCardDetails', () => ({ SetupCardDetails: () => null }));
vi.mock('@/stores/tickerStore', () => ({ useTickerStore: () => ({activeTicker:'IWM'}) }));
vi.mock('@/hooks/useLiveStatus', () => ({useLiveStatus: () => state.current.status}));
vi.mock('@/hooks/useLiveQuote', () => ({useLiveQuote: () => state.current.quote}));
vi.mock('@/hooks/useLiveHistory', () => ({useLiveHistory: (_ticker:string,_enabled:boolean,opening=false) => opening ? state.current.opening : state.current.history, useAvgVolume: () => state.current.average}));
vi.mock('@/hooks/useLiveIndicators', () => ({useLiveIndicators: () => state.current.indicators}));
vi.mock('@/hooks/usePlaybookEvaluation', async (importOriginal) => ({...await importOriginal<typeof import('@/hooks/usePlaybookEvaluation')>(),usePlaybookBatch: (_batches:unknown,snapshot:MarketSnapshot|null) => {state.snapshot=snapshot;return {data:new Map()};}}));
let root:Root, container:HTMLDivElement;
const now=Date.parse('2026-10-29T15:00:00Z');
const projection={status:'available',ticker:'IWM',session:'2026-10-29',window_minutes:30,window_start:'2026-10-29T13:30:00Z',window_end:'2026-10-29T14:00:00Z',high:131,low:99,comparison_price:140,comparison_as_of:'2026-10-29T15:00:00Z',price_basis:'as_traded_requested',source:'alphavantage',fetched_at:'2026-10-29T15:00:00Z'};
async function render(){await act(async()=>root.render(createElement(PlaybookPage)));}
const label=()=>container.querySelector('[data-testid="orb-status"]')!.textContent;
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.useFakeTimers();vi.setSystemTime(now);
 state.current={playbook:{data:{ticker:'IWM',cards:[]}},status:{data:{is_open:true,session:'regular'}},quote:{data:MOCK_LIVE_QUOTE},history:{data:MOCK_LIVE_HISTORY},opening:{data:{...MOCK_LIVE_HISTORY,opening:projection},isError:false,isFetching:false},average:{data:MOCK_AVG_VOLUME},indicators:{data:MOCK_LIVE_INDICATORS}};
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.useRealTimers();});
it.each([false,true])('expires stable objects at120s+1ms with pending refresh=%s without a response',async(pending)=>{
 state.current.opening.isFetching=pending;
 await render();const retained=state.current.opening.data;const prior=playbookBatchKey({a:['above ORB high']},state.snapshot);
 expect(state.snapshot?.orbOpening?.comparison_price).toBe(140);
 await act(async()=>vi.advanceTimersByTime(120000));expect(state.snapshot?.orbOpening).not.toBeNull();
 await act(async()=>vi.advanceTimersByTime(1));expect(state.snapshot?.orbOpening).toBeNull();
 expect(state.snapshot?.orbHigh).toBeNull();expect(state.snapshot?.orbLow).toBeNull();
 expect(label()).not.toContain('30-minute opening range');
 expect(playbookBatchKey({a:['above ORB high']},state.snapshot)).not.toEqual(prior);
 expect(state.snapshot?.lastBar).toEqual(MOCK_LIVE_HISTORY.bars.at(-1));expect(state.snapshot?.price).toBe(MOCK_LIVE_QUOTE.price);
 expect(state.current.opening.data).toBe(retained);
});
it.each([{is_open:false,session:'closed'},{is_open:false,session:'after-hours'},{is_open:false,session:'pre-market'},{is_open:true,session:'unknown'},undefined])('refuses closed or unknown current market context %j',async(status)=>{
 await render();expect(state.snapshot?.orbOpening).not.toBeNull();state.current.status={data:status};await render();
 expect(state.snapshot?.orbOpening).toBeNull();expect(label()).not.toContain('30-minute opening range');
 await act(async()=>vi.advanceTimersByTime(180001));expect(state.snapshot?.orbOpening).toBeNull();
});
it('failed refresh with retained data clears qualification without clearing unrelated inputs',async()=>{
 await render();state.current.opening.isError=true;await render();
 expect(state.snapshot?.orbOpening).toBeNull();expect(label()).toContain('request failed');
 expect(state.snapshot?.lastBar).toEqual(MOCK_LIVE_HISTORY.bars.at(-1));
});
it('a failed status refresh cannot reuse retained regular-market permission',async()=>{
 await render();expect(state.snapshot?.orbOpening).not.toBeNull();state.current.status.isError=true;await render();
 expect(state.snapshot?.orbOpening).toBeNull();expect(state.snapshot?.lastBar).toEqual(MOCK_LIVE_HISTORY.bars.at(-1));
});
it('resuming a background page rechecks wall time even before a throttled timeout fires',async()=>{
 await render();vi.setSystemTime(now+180001);
 await act(async()=>window.dispatchEvent(new Event('focus')));
 expect(state.snapshot?.orbOpening).toBeNull();expect(label()).not.toContain('30-minute opening range');
});
