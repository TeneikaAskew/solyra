// @vitest-environment jsdom
// FEAT-PLAYBOOK-001 done_when[2]: default useLiveHistory callers keep their request and
// cache entry, and every include_opening option or ticker change gets its own data.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { liveHistoryKey, useLiveHistory, type LiveHistory } from './useLiveHistory';

type Result = ReturnType<typeof useLiveHistory>;
const bar = { time: '2026-10-29 10:59:00', open: 100, high: 101, low: 99, close: 100, volume: 10 };
const opening = (ticker: string) => ({ status: 'unavailable', ticker, reason: 'opening_in_progress', fetched_at: '2026-10-29T14:00:00Z' });
const compact = (ticker: string): LiveHistory => ({ ticker, interval: '1min', count: 1, bars: [{ ...bar, close: ticker === 'IWM' ? 100 : 500 }] });
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const fetchMock = vi.fn();
let client: QueryClient;
let root: Root;
let container: HTMLDivElement;
const results: Record<string, Result> = {};

const report = (id: string, result: Result) => { results[id] = result; };
// The default caller passes only the ticker, exactly as existing callers do.
function DefaultProbe({ id, ticker }: { id: string; ticker: string }) { report(id, useLiveHistory(ticker)); return null; }
function OpeningProbe({ id, ticker }: { id: string; ticker: string }) { report(id, useLiveHistory(ticker, true, true)); return null; }
async function render(...probes: Array<{ id: string; ticker: string; includeOpening?: boolean }>) {
  await act(async () => root.render(createElement(QueryClientProvider, { client },
    ...probes.map(({ includeOpening, ...p }) => createElement(includeOpening ? OpeningProbe : DefaultProbe, { key: p.id, ...p })))));
}
async function settle() {
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
const urls = () => fetchMock.mock.calls.map(([url]) => url);

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string) => {
    const [, ticker, query] = /\/api\/live\/history\/([A-Z]+)(\?.*)?$/.exec(url)!;
    return json(query === '?include_opening=true' ? { ...compact(ticker), bars: [], opening: opening(ticker) } : compact(ticker));
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  for (const key of Object.keys(results)) delete results[key];
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  client.clear();
  vi.unstubAllGlobals();
});

describe('useLiveHistory default callers (no include_opening)', () => {
  it('keeps the original request, cache key, cadence and unvalidated payload', async () => {
    await render({ id: 'default', ticker: 'IWM' });
    await settle();
    expect(urls()).toEqual(['/api/live/history/IWM']);
    expect(results.default.data).toEqual(compact('IWM'));
    const query = client.getQueryCache().find({ queryKey: ['live-history', 'IWM'], exact: true });
    expect(query?.state.data).toEqual(compact('IWM'));
    expect(query?.options).toMatchObject({ refetchInterval: 60_000, staleTime: 30_000 });
    expect(client.getQueryCache().getAll().map(q => q.queryKey)).toEqual([['live-history', 'IWM']]);
  });

  it('positional enabled=false still sends nothing, as before', async () => {
    function Disabled() { report('disabled', useLiveHistory('IWM', false)); return null; }
    await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Disabled))));
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(results.disabled.data).toBeUndefined();
  });

  it('a default caller beside the Playbook opt-in keeps its own compact data', async () => {
    await render({ id: 'default', ticker: 'IWM' }, { id: 'opening', ticker: 'IWM', includeOpening: true });
    await settle();
    expect([...urls()].sort()).toEqual(['/api/live/history/IWM', '/api/live/history/IWM?include_opening=true']);
    expect(results.default.data).toEqual(compact('IWM'));
    expect(results.default.data?.opening).toBeUndefined();
    expect(results.opening.data?.bars).toEqual([]);
    expect(results.opening.data?.opening).toEqual(opening('IWM'));
    expect(client.getQueryData(liveHistoryKey('IWM'))).toEqual(compact('IWM'));
    expect(client.getQueryData(liveHistoryKey('IWM', true))).toEqual(results.opening.data);
  });
});

describe('useLiveHistory option and ticker isolation', () => {
  it('a ticker change never shows the previous ticker data, for either option', async () => {
    let releaseSpy!: () => void;
    const spyGate = new Promise<void>(r => { releaseSpy = r; });
    const base = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/SPY')) await spyGate;
      return base(url);
    });
    await render({ id: 'default', ticker: 'IWM' }, { id: 'opening', ticker: 'IWM', includeOpening: true });
    await settle();
    expect(results.default.data?.ticker).toBe('IWM');
    expect(results.opening.data?.opening?.ticker).toBe('IWM');

    await render({ id: 'default', ticker: 'SPY' }, { id: 'opening', ticker: 'SPY', includeOpening: true });
    await settle();
    // SPY is still in flight: neither option exposes IWM data under SPY.
    expect(results.default.data).toBeUndefined();
    expect(results.opening.data).toBeUndefined();
    expect(results.default.isLoading).toBe(true);
    expect(results.opening.isLoading).toBe(true);

    releaseSpy();
    await settle();
    expect(results.default.data).toEqual(compact('SPY'));
    expect(results.opening.data?.opening).toEqual(opening('SPY'));
    expect(client.getQueryData(liveHistoryKey('IWM'))).toEqual(compact('IWM'));
    expect(client.getQueryCache().getAll().map(q => JSON.stringify(q.queryKey)).sort()).toEqual([
      '["live-history","IWM","opening-v1"]', '["live-history","IWM"]',
      '["live-history","SPY","opening-v1"]', '["live-history","SPY"]',
    ]);
  });

  it.each([
    ['another ticker', () => ({ ...compact('SPY'), opening: opening('SPY') }), 'IWM'],
    ['another ticker in opening only', (t: string) => ({ ...compact(t), opening: opening('SPY') }), 'IWM'],
    ['no opening object', (t: string) => compact(t), 'IWM'],
    ['an unknown opening status', (t: string) => ({ ...compact(t), opening: { ...opening(t), status: 'partial' } }), 'IWM'],
    ['no bars array', (t: string) => ({ ticker: t, interval: '1min', count: 0, opening: opening(t) }), 'IWM'],
  ])('the opt-in refuses a response with %s instead of caching it', async (_name, body, ticker) => {
    fetchMock.mockImplementation(() => json(body(ticker)));
    await render({ id: 'opening', ticker, includeOpening: true });
    await settle();
    expect(results.opening.isError).toBe(true);
    expect(results.opening.data).toBeUndefined();
    expect(client.getQueryData(liveHistoryKey(ticker, true))).toBeUndefined();
  });

  it('the same malformed payload on the default path is passed through unchanged', async () => {
    fetchMock.mockImplementation(() => json({ ...compact('IWM'), opening: opening('SPY') }));
    await render({ id: 'default', ticker: 'IWM' });
    await settle();
    expect(results.default.isError).toBe(false);
    expect(results.default.data).toEqual({ ...compact('IWM'), opening: opening('SPY') });
  });
});
