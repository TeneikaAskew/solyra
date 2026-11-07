import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, type FetchQueryOptions } from '@tanstack/react-query';
import fixture from '../../tests/fixtures/current-gamma-producer-contract.json';
import { useGammaGrid } from './useGammaGrid';
import { useGammaLevels } from './useGammaLevels';
const state = vi.hoisted(() => ({ options: undefined as FetchQueryOptions<unknown> | undefined, result: {} as Record<string, unknown> }));
vi.mock('@tanstack/react-query', async original => ({ ...await original<typeof import('@tanstack/react-query')>(), useQuery: (options: FetchQueryOptions<unknown>) => { state.options = options; return state.result; } }));
afterEach(() => vi.unstubAllGlobals());
function useGridCapture() { return useGammaGrid('IWM','2026-10-27'); }
function useLevelsCapture() { return useGammaLevels('IWM','2026-10-27'); }
for (const kind of ['grid','levels'] as const) {
  const useCapture = kind === 'grid' ? useGridCapture : useLevelsCapture;
  describe(`${kind} actual-query cache availability`, () => {
    it.each([401,403,429,500,503])('does not expose retained producer data after HTTP%s refusal', async status => {
      state.result = {}; useCapture(); const options = state.options!;
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      try {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fixture[kind]), { status: 200 })));
        const initial = await client.fetchQuery(options);
        expect(initial).toEqual(fixture[kind]);
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'data source refused' }), { status })));
        await expect(client.fetchQuery({ ...options, staleTime: 0 })).rejects.toThrow('data source refused');
        expect(client.getQueryData(options.queryKey)).toEqual(fixture[kind]);
        const actual = client.getQueryState(options.queryKey)!;
        expect(actual.status).toBe('error');
        state.result = { data: actual.data, isError: actual.status === 'error', error: actual.error };
        const query = useCapture(); expect(query.isError).toBe(true); expect(query.data).toBeUndefined();
        expect(query.error).toBe(state.result.error);
      } finally { client.clear(); }
    });
    it('preserves healthy values, units, symbol and source/asof fields unchanged', () => {
      state.result = { data: fixture[kind], isError: false };
      const query = useCapture(); expect(query.data).toBe(fixture[kind]); expect(query.data?.ticker).toBe('IWM');
      expect(state.options?.retry).toBe(false);
    });
    it('restores exact producer data after a healthy refetch without deleting cache', async () => {
      state.result = {}; useCapture(); const options = state.options!;
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      try {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(fixture[kind]), { status: 200 })));
        await client.fetchQuery(options);
        state.result = { data: client.getQueryData(options.queryKey), isError: true };
        expect(useCapture().data).toBeUndefined();
        const recovered = await client.fetchQuery({ ...options, staleTime: 0 });
        state.result = { data: recovered, isError: false };
        expect(useCapture().data).toEqual(fixture[kind]);
        expect(client.getQueryData(options.queryKey)).toEqual(fixture[kind]);
      } finally { client.clear(); }
    });
    it('preserves last successful data during an ordinary in-flight refresh', () => {
      state.result = { data: fixture[kind], isError: false, isFetching: true };
      expect(useCapture().data).toBe(fixture[kind]);
    });
    it('does not invent a dataset on an initial failure', () => {
      state.result = { data: undefined, isError: true }; expect(useCapture().data).toBeUndefined();
    });
  });
}

it('HTTP200 unavailable retains its reason and cache without exposing placeholder zero exposure', () => {
  state.result = { data: fixture.unavailable_grid, isError: false };
  const query = useGammaGrid('IWM','2026-10-27');
  expect(query.isError).toBe(false);
  expect(query.data).toBeUndefined();
  expect(query.unavailableData).toBe(fixture.unavailable_grid);
  expect(query.unavailableData?.reason).toBe('SYNTHETIC snapshot unavailable');
  expect(state.result.data).toBe(fixture.unavailable_grid);
});

it('preserves actual producer zero GEX from populated available cells', () => {
  state.result = {data: fixture.observed_zero_grid, isError: false};
  const q=useGammaGrid('IWM','2026-10-27');
  expect(q.data).toBe(fixture.observed_zero_grid);
  expect(q.data?.cells.length).toBeGreaterThan(0);
  expect(q.data?.total_gex).toBe(0);
  expect(q.unavailableData).toBeUndefined();
});
