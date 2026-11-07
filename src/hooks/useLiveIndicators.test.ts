import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient, type FetchQueryOptions } from '@tanstack/react-query';
import { useLiveIndicators, useSignalSeries } from './useLiveIndicators';
import { useMarketData } from './useMarketData';
import { liveRoutes } from '@/mocks/live';
import type { Bar } from '@/lib/indicators';

const state = vi.hoisted(() => ({ options: undefined as FetchQueryOptions<unknown> | undefined }));
vi.mock('@tanstack/react-query', async original => ({
  ...await original<typeof import('@tanstack/react-query')>(),
  useQuery: (options: FetchQueryOptions<unknown>) => { state.options = options; return {}; },
}));
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
afterEach(() => { client.clear(); vi.unstubAllGlobals(); });
const bars = (): Bar[] => Array.from({ length: 15 }, (_, i) => ({
  time: String(1000 + i), open: 100, high: 102, low: 99, close: 101, volume: 100,
}));
function QueryOptions(kind: string, rows: Bar[], ticker = 'IWM') {
  useLiveIndicators({ bars: rows, current_price: 101, current_volume: 100 }, true);
  const indicators = state.options!;
  useSignalSeries(rows, `${ticker}:20261027`, true);
  return kind === 'indicators' ? indicators : state.options!;
}
it.each(['indicators', 'series'])('%s derives again after interior OHLCV correction with unchanged endpoints', async kind => {
  const send = vi.fn(async (_url: unknown, init: RequestInit) => new Response(init.body as string));
  vi.stubGlobal('fetch', send);
  const original = bars();
  await client.fetchQuery(QueryOptions(kind, original));
  await client.fetchQuery(QueryOptions(kind, structuredClone(original)));
  expect(send).toHaveBeenCalledTimes(1);
  const corrected = structuredClone(original); corrected[4].high = 103; corrected[4].volume = 200;
  expect(await client.fetchQuery(QueryOptions(kind, corrected))).toMatchObject({ bars: corrected });
  expect(send).toHaveBeenCalledTimes(2);
});
it.each(['indicators', 'series'])('%s late old-input response cannot populate corrected-input cache', async kind => {
  let finishOld!: () => void;
  let first = true;
  vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init: RequestInit) => {
    if (first) { first = false; await new Promise<void>(resolve => { finishOld = resolve; }); }
    return new Response(init.body as string);
  }));
  const original = bars(); const pending = client.fetchQuery(QueryOptions(kind, original));
  const corrected = structuredClone(original); corrected[3].close = 100.5;
  const revised = QueryOptions(kind, corrected); const revisedPending = client.fetchQuery(revised);
  finishOld(); const response = await revisedPending; await pending;
  expect(response).toMatchObject({ bars: corrected });
  expect(client.getQueryData(revised.queryKey)).toMatchObject({ bars: corrected });
});
it('series retains ticker isolation for equal bar content', async () => {
  const send = vi.fn(async (_url: unknown, init: RequestInit) => new Response(init.body as string));
  vi.stubGlobal('fetch', send);
  await client.fetchQuery(QueryOptions('series', bars(), 'IWM'));
  await client.fetchQuery(QueryOptions('series', bars(), 'SPY'));
  expect(send).toHaveBeenCalledTimes(2);
});
it('bundled mock route satisfies actual market-data validation for requested date/timeframe', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    const route = liveRoutes.find(r => r.pattern.test(url.pathname))!;
    const reply = route.reply({ method: 'GET', url, body: undefined }, url.pathname.match(route.pattern)!);
    return new Response(JSON.stringify(reply.body));
  }));
  useMarketData('IWM', '20261027', '5');
  await expect(client.fetchQuery(state.options!)).resolves.toMatchObject({ ticker: 'IWM', date: '20261027', timeframe: 5 });
});
