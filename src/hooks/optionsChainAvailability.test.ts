import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient, type FetchQueryOptions } from '@tanstack/react-query';
import fixture from '../../tests/fixtures/owner-options-contract.json';
import { useOptionsChain } from './useOptionsChain';
const state=vi.hoisted(()=>({options:undefined as FetchQueryOptions<unknown>|undefined,result:{} as Record<string,unknown>}));
vi.mock('@tanstack/react-query',async original=>({...await original<typeof import('@tanstack/react-query')>(),useQuery:(options:FetchQueryOptions<unknown>)=>{state.options=options;return state.result;}}));
afterEach(()=>vi.unstubAllGlobals());
it.each([401,403,429,500,503])('chain hides retained values after HTTP%s, preserves error/cache and recovers',async status=>{
 state.result={};useOptionsChain('IWM','2026-10-27',true);const options=state.options!;
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 try{
  const fetchMock=vi.fn(async()=>new Response(JSON.stringify(fixture),{status:200}));vi.stubGlobal('fetch',fetchMock);
  await client.fetchQuery(options);
  fetchMock.mockImplementation(async()=>new Response(JSON.stringify({detail:'chain refused'}),{status}));
  await expect(client.fetchQuery({...options,staleTime:0})).rejects.toThrow('chain refused');
  const actual=client.getQueryState(options.queryKey)!;state.result={data:actual.data,error:actual.error,isError:true};
  const q=useOptionsChain('IWM','2026-10-27',true);
  expect(q.data).toBeUndefined();expect(q.error).toBe(actual.error);expect(client.getQueryData(options.queryKey)).toEqual(fixture);
  expect(fetchMock).toHaveBeenCalledTimes(2); // no live fallback for these errors, no retry
  fetchMock.mockImplementation(async()=>new Response(JSON.stringify(fixture),{status:200}));
  const recovered=await client.fetchQuery({...options,staleTime:0});state.result={data:recovered,isError:false};
  expect(useOptionsChain('IWM','2026-10-27',true).data).toEqual(fixture);
 }finally{client.clear();}
});
it('preserves healthy batch identity, units, in-flight data and retry policy',()=>{
 state.result={data:fixture,isError:false,isFetching:true};const q=useOptionsChain('IWM','2026-10-27',true);
 expect(q.data).toBe(fixture);expect(state.options?.retry).toBe(false);
 expect(q.data?.snapshot_timestamp).toBe('2026-10-27T14:00:00+00:00');expect(q.data?.options[0].implied_volatility).toBe(.35);
});
it('preserves existing stored404 fallback only; both attempts remain explicit mocked local calls',async()=>{
 state.result={};useOptionsChain('IWM','2026-10-27',true);const options=state.options!;
 const fetchMock=vi.fn().mockResolvedValueOnce(new Response('{}',{status:404})).mockResolvedValueOnce(new Response(JSON.stringify(fixture),{status:200}));
 vi.stubGlobal('fetch',fetchMock);
 if(typeof options.queryFn !== 'function') throw new Error('Expected existing query function');
 const result=await options.queryFn({} as never);
 expect(result).toEqual(fixture);expect(fetchMock.mock.calls.map(c=>c[0])).toEqual(['/api/options/IWM/2026-10-27','/api/options/live/IWM/2026-10-27']);
});
it('retains empty success without fabricating a populated dataset, with ticker/date-scoped key',()=>{
 const empty={...fixture,options:[]};state.result={data:empty,isError:false};
 expect(useOptionsChain('IWM','2026-10-27',true).data).toBe(empty);
 expect(state.options?.queryKey).toEqual(['options','IWM','2026-10-27']);
});
