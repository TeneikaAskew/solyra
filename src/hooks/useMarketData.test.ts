import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryObserver, type FetchQueryOptions } from '@tanstack/react-query';
import { buildReviewQuote } from '@/lib/reviewQuote';
import { useMarketData, useReferenceLevels, type MarketDataResponse } from './useMarketData';

const state = vi.hoisted(() => ({ captured: undefined as FetchQueryOptions<MarketDataResponse> | undefined, result: {} as Record<string, unknown> }));
vi.mock('@tanstack/react-query', async importOriginal => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQuery: (options: FetchQueryOptions<MarketDataResponse>) => { state.captured = options; return state.result; },
}));
let client: QueryClient;
let current: MarketDataResponse;
let http: ReturnType<typeof vi.fn>;
const initial = (date: string, count = 1): MarketDataResponse => ({ ticker: 'IWM', date, timeframe: 5, count,
  candlestick: count ? [{ time: 1793109600, open: 100, high: 102, low: 99, close: 101 }] : [], volume: [] });
function useOptions(date: string) {
  useMarketData('IWM', date, '5');
  expect(state.captured).toBeDefined();
  return state.captured!;
}
beforeEach(() => {
  state.result = {};
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T15:00:00Z'));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  http = vi.fn(async () => new Response(JSON.stringify(current), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', http);
});
afterEach(() => { client.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('actual useMarketData policy via QueryClient; zero external I/O', () => {
  it('current-day query can revalidate after 60 seconds without requiring a new key', async () => {
    current = initial('20261027'); const opts = useOptions('20261027');
    expect((await client.fetchQuery(opts)).candlestick[0].close).toBe(101);
    current = initial('20261027'); current.candlestick[0].close = 102;
    vi.setSystemTime(new Date('2026-10-27T15:01:01Z'));
    expect((await client.fetchQuery(opts)).candlestick[0].close).toBe(102);
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('positive: legacy historical data within finite TTL remains cached without new requests', async () => {
    current = initial('20261026'); const opts = useOptions('20261026');
    await client.fetchQuery(opts); current = initial('20261026'); current.candlestick[0].close = 102;
    vi.setSystemTime(new Date('2026-10-27T15:01:01Z'));
    expect((await client.fetchQuery(opts)).candlestick[0].close).toBe(101);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('historical empty success does not permanently hide a later stored backfill', async () => {
    current = initial('20261026', 0); const opts = useOptions('20261026');
    expect((await client.fetchQuery(opts)).count).toBe(0); current = initial('20261026');
    vi.setSystemTime(new Date('2026-10-27T15:05:01Z'));
    expect((await client.fetchQuery(opts)).count).toBe(1);
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('positive: explicit cache invalidation fetches the observed current-day update', async () => {
    current = initial('20261027'); const opts = useOptions('20261027'); await client.fetchQuery(opts);
    current = initial('20261027'); current.candlestick[0].close = 102;
    await client.invalidateQueries({ queryKey: opts.queryKey });
    expect((await client.fetchQuery(opts)).candlestick[0].close).toBe(102);
    expect(http).toHaveBeenCalledTimes(2);
    expect(http.mock.calls.every(call => String(call[0]).startsWith('/api/market/data/IWM/'))).toBe(true);
  });
});

describe('legacy admission and bounded cache controls', () => {
  it.each(['20261027', '20261028', '202610', '202611'])('mutable %s expires at 60 seconds, no retry/polling', date => {
    const opts = useOptions(date); expect(typeof opts.staleTime === 'function' ? opts.staleTime(undefined as never) : opts.staleTime).toBe(60_000); expect(opts.retry).toBe(false);
    expect('refetchInterval' in opts).toBe(false);
  });
  it('ET calendar holds current day before UTC midnight and rolls at ET midnight', () => {
    vi.setSystemTime(new Date('2026-11-02T04:59:59Z'));
    expect((useOptions('20261101').staleTime as () => number)()).toBe(60_000);
    vi.setSystemTime(new Date('2026-11-02T05:00:00Z'));
    expect((useOptions('20261101').staleTime as () => number)()).toBe(300_000);
  });
  it('nonempty historical partial response admits a later backfill after finite TTL', async () => {
    current = initial('20261026'); const opts = useOptions('20261026'); await client.fetchQuery(opts);
    current.candlestick.push({ ...current.candlestick[0], time: current.candlestick[0].time + 300 }); current.count = 2;
    vi.setSystemTime(new Date('2026-10-27T15:05:01Z'));
    expect((await client.fetchQuery(opts)).count).toBe(2);
  });
  it.each(['ticker', 'date', 'timeframe', 'count', 'price', 'null', 'infinity', 'negative', 'duplicate', 'order', 'volume'])('rejects invalid %s', async fault => {
    current = initial('20261027');
    if (fault === 'ticker') current.ticker = 'SPY';
    if (fault === 'date') current.date = '20261026';
    if (fault === 'timeframe') current.timeframe = 15;
    if (fault === 'count') current.count = 2;
    if (fault === 'price') current.candlestick[0].high = 99;
    if (fault === 'null') current.candlestick[0].open = null as unknown as number;
    if (fault === 'infinity') current.candlestick[0].close = Infinity;
    if (fault === 'negative') current.candlestick[0].low = -1;
    if (fault === 'duplicate' || fault === 'order') {
      current.candlestick.push({ ...current.candlestick[0], time: current.candlestick[0].time - (fault === 'order' ? 300 : 0) }); current.count = 2;
    }
    if (fault === 'volume') current.volume = [{ time: 1793109600, value: -1, color: 'red' }];
    await expect(client.fetchQuery(useOptions('20261027'))).rejects.toThrow(/Invalid market data/);
  });
  it('accepts flat coherent candles and zero volume without certifying source', async () => {
    current = initial('20261027'); Object.assign(current.candlestick[0], { open: 100, high: 100, low: 100, close: 100 });
    current.volume = [{ time: 1793109600, value: 0, color: 'red' }];
    expect((await client.fetchQuery(useOptions('20261027'))).count).toBe(1);
  });
  it.each([401, 403, 404, 500])('reference HTTP %s stays an independent visible error', async status => {
    http.mockImplementation(async () => new Response(JSON.stringify({ detail: 'reference refused' }), { status }));
    useReferenceLevels('IWM', '20261027');
    await expect(client.fetchQuery(state.captured!)).rejects.toMatchObject({ status });
  });
});

describe('request boundaries and reference as-of semantics', () => {
  it('preserves ticker/timeframe/end-time key isolation', () => {
    useMarketData('SPY', '20261027', '15', '10:30');
    expect(state.captured!.queryKey).toEqual(['market-data', 'SPY', '20261027', '15', '10:30']);
    expect(useOptions('20261027').queryKey).toEqual(['market-data', 'IWM', '20261027', '5', 'eod']);
  });
  it('reference may legitimately identify a prior date and still has bounded caching', async () => {
    http.mockImplementation(async () => new Response(JSON.stringify({ ticker: 'IWM', date: '2026-10-26', open: 100, high: 102, low: 99, close: 101 })));
    useReferenceLevels('IWM', '20261027');
    expect(await client.fetchQuery(state.captured!)).toMatchObject({ date: '2026-10-26' });
    expect((state.captured!.staleTime as () => number)()).toBe(60_000);
  });
  it('month changes from mutable to finite-history at the actual ET month boundary', () => {
    vi.setSystemTime(new Date('2026-11-01T03:59:59Z'));
    expect((useOptions('202610').staleTime as () => number)()).toBe(60_000);
    vi.setSystemTime(new Date('2026-11-01T04:00:00Z'));
    expect((useOptions('202610').staleTime as () => number)()).toBe(300_000);
  });
});

function useBarsFixture() { return useMarketData('IWM', '20261027', '5'); }
function useReferenceFixture() { return useReferenceLevels('IWM', '20261027'); }

describe('refused cached financial inputs never reach shared consumers', () => {
  it.each(['bars', 'reference'])('%s preserves error but withholds retained prices after a failed revalidation', async kind => {
    current = initial('20261027');
    const useFixture = kind === 'bars' ? useBarsFixture : useReferenceFixture;
    if (kind === 'reference') http.mockImplementation(async () => new Response(JSON.stringify({ ticker: 'IWM', date: '20261026', open: 99, high: 102, low: 98, close: 100 })));
    useFixture(); const opts = state.captured!; await client.fetchQuery(opts);
    const observer = new QueryObserver(client, opts);
    state.result = observer.getCurrentResult() as unknown as Record<string, unknown>;
    expect(useFixture().data).toBeDefined(); // successful input is still available
    http.mockImplementation(async () => new Response(JSON.stringify({ detail: 'source refused' }), { status: 500 }));
    await client.invalidateQueries({ queryKey: opts.queryKey });
    await expect(client.fetchQuery(opts)).rejects.toMatchObject({ status: 500 });
    expect(client.getQueryData(opts.queryKey)).toBeDefined(); // actual retained cache, not a fabricated empty response
    observer.setOptions(opts);
    state.result = observer.getCurrentResult() as unknown as Record<string, unknown>;
    const refused = useFixture(); expect(refused.isError).toBe(true); expect(refused.error).toMatchObject({ status: 500 });
    expect(refused.data).toBeUndefined();
    const refusedReference = kind === 'reference' ? refused.data as { close: number } | undefined : undefined;
    const derived = buildReviewQuote([{ time: 'fixture', open: 108, high: 111, low: 107, close: 110, volume: 1 }], refusedReference?.close ?? null, 'IWM', 'fixture');
    expect(derived?.change).toBeNull(); expect(derived?.change_pct).toBeNull();
    observer.destroy();
  });
});
