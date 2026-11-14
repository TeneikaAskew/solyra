// @vitest-environment jsdom
// FEAT-INSIGHT-001 done_when[0]: the per-user watchlist hooks read and write the stocks
// /api/me/watchlist routes, and a 401 reads as signed out rather than an error (Review Focus 1).
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_ME_WATCHLIST, MOCK_WATCHLIST_DEFAULT } from '@/mocks/insights';
import {
  USER_WATCHLIST_KEY,
  useAddUserTicker,
  useDefaultWatchlist,
  useRemoveUserTicker,
  useUserWatchlist,
} from './useUserWatchlist';

const auth = vi.hoisted(() => ({ isSignedIn: true, uid: 'uid-a' as string | null, emailVerified: true as boolean | null }));
vi.mock('./useUser', () => ({
  useUser: () => ({ isSignedIn: auth.isSignedIn, uid: auth.uid, emailVerified: auth.emailVerified }),
}));

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const fetchMock = vi.fn();
let client: QueryClient;
let root: Root;
let container: HTMLDivElement;
const results: {
  list?: ReturnType<typeof useUserWatchlist>;
  add?: ReturnType<typeof useAddUserTicker>;
  remove?: ReturnType<typeof useRemoveUserTicker>;
  defaults?: ReturnType<typeof useDefaultWatchlist>;
} = {};

const report = <K extends keyof typeof results>(key: K, value: (typeof results)[K]) => { results[key] = value; };
function ListProbe() { report('list', useUserWatchlist()); return null; }
function AddProbe() { report('add', useAddUserTicker()); return null; }
function RemoveProbe() { report('remove', useRemoveUserTicker()); return null; }
function DefaultProbe() { report('defaults', useDefaultWatchlist()); return null; }

async function render(probe: () => null) {
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(probe))));
}
async function settle() {
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
const calls = () => fetchMock.mock.calls.map(([url, init]) => ({ url, method: (init as RequestInit | undefined)?.method ?? 'GET' }));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  auth.isSignedIn = true;
  auth.uid = 'uid-a';
  auth.emailVerified = true;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  for (const key of Object.keys(results)) delete results[key as keyof typeof results];
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  client.clear();
  vi.unstubAllGlobals();
});

describe('useUserWatchlist', () => {
  it('exposes the rows and the upper-cased active tickers on success', async () => {
    fetchMock.mockImplementation(() => json({
      ...MOCK_ME_WATCHLIST,
      tickers: [...MOCK_ME_WATCHLIST.tickers, { ...MOCK_ME_WATCHLIST.tickers[0], ticker: 'msft' }],
    }));
    await render(ListProbe);
    await settle();
    expect(calls()).toEqual([{ url: '/api/me/watchlist', method: 'GET' }]);
    expect(results.list?.query.data?.tickers.map(r => r.ticker)).toEqual(['NVDA', 'ABCD', 'msft']);
    expect(results.list?.activeTickers).toEqual(['NVDA', 'ABCD', 'MSFT']);
    expect(results.list?.signedOut).toBe(false);
  });

  it('a 503 is the error state with the API detail, no data and no placeholder list', async () => {
    fetchMock.mockImplementation(() => json({ detail: 'Cloud SQL unreachable' }, 503));
    await render(ListProbe);
    await settle();
    expect(results.list?.query.isError).toBe(true);
    expect(results.list?.query.error?.message).toBe('Cloud SQL unreachable');
    expect(calls()).toHaveLength(1);
    expect(results.list?.query.data).toBeUndefined();
    expect(results.list?.signedOut).toBe(false);
  });

  it('a non-OK response without a detail names the status', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('upstream', { status: 502 })));
    await render(ListProbe);
    await settle();
    expect(results.list?.query.isError).toBe(true);
    expect(results.list?.query.error?.message).toBe('Watchlist service 502');
  });

  it('a 401 (token expired after render) is the signed-out state, requested once', async () => {
    fetchMock.mockImplementation(() => json({ detail: 'Not authenticated' }, 401));
    await render(ListProbe);
    await settle();
    expect(results.list?.signedOut).toBe(true);
    expect(results.list?.query.data).toBeUndefined();
    expect(results.list?.activeTickers).toEqual([]);
    await act(async () => { await client.refetchQueries({ queryKey: USER_WATCHLIST_KEY }); });
    await settle();
    expect(calls()).toEqual([{ url: '/api/me/watchlist', method: 'GET' }]);
  });

  it('a cached 401 re-enables and fetches again when another account signs in', async () => {
    fetchMock.mockImplementationOnce(() => json({ detail: 'Not authenticated' }, 401));
    await render(ListProbe);
    await settle();
    expect(results.list?.signedOut).toBe(true);
    fetchMock.mockImplementation(() => json(MOCK_ME_WATCHLIST));
    auth.uid = 'uid-b';
    await render(ListProbe);
    await settle();
    expect(calls()).toHaveLength(2);
    expect(results.list?.signedOut).toBe(false);
    expect(results.list?.activeTickers).toEqual(['NVDA', 'ABCD']);
  });

  it('a cached 401 refetches when the same account becomes email-verified', async () => {
    auth.emailVerified = false;
    fetchMock.mockImplementationOnce(() => json({ detail: 'Not authenticated' }, 401));
    await render(ListProbe);
    await settle();
    expect(results.list?.signedOut).toBe(true);
    fetchMock.mockImplementation(() => json(MOCK_ME_WATCHLIST));
    auth.emailVerified = true;
    await render(ListProbe);
    await settle();
    expect(calls()).toHaveLength(2);
    expect(results.list?.signedOut).toBe(false);
    expect(results.list?.activeTickers).toEqual(['NVDA', 'ABCD']);
  });

  it('signing out drops the cached list', async () => {
    fetchMock.mockImplementation(() => json(MOCK_ME_WATCHLIST));
    await render(ListProbe);
    await settle();
    expect(results.list?.activeTickers).toEqual(['NVDA', 'ABCD']);
    auth.isSignedIn = false;
    auth.uid = null;
    await render(ListProbe);
    await settle();
    expect(client.getQueryCache().find({ queryKey: USER_WATCHLIST_KEY, exact: true })?.state.data).toBeUndefined();
  });

  it('signed out sends no request', async () => {
    auth.isSignedIn = false;
    await render(ListProbe);
    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(results.list?.signedOut).toBe(true);
    expect(results.list?.query.data).toBeUndefined();
  });
});

describe('useUserWatchlist retry policy', () => {
  it('follows the client default retry for a 503 but never retries a 401', async () => {
    client = new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });
    fetchMock.mockImplementation(() => json({ detail: 'Cloud SQL unreachable' }, 503));
    await render(ListProbe);
    await settle();
    expect(results.list?.query.isError).toBe(true);
    expect(calls()).toHaveLength(2);
    client.clear();
    fetchMock.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 0 } } });
    fetchMock.mockImplementation(() => json({ detail: 'Not authenticated' }, 401));
    await render(ListProbe);
    await settle();
    expect(results.list?.signedOut).toBe(true);
    expect(calls()).toHaveLength(1);
  });
});

describe('useAddUserTicker', () => {
  it('posts {ticker, source} and invalidates both watchlist keys', async () => {
    fetchMock.mockImplementation(() => json(MOCK_ME_WATCHLIST));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await render(AddProbe);
    await act(async () => { await results.add?.mutateAsync({ ticker: 'NVDA', source: 'ui' }); });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/me/watchlist');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ ticker: 'NVDA', source: 'ui' });
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: USER_WATCHLIST_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlist'] });
  });

  it('a non-OK response rejects with the API detail and invalidates nothing', async () => {
    fetchMock.mockImplementation(() => json({ detail: 'ticker not found' }, 404));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await render(AddProbe);
    await act(async () => {
      await expect(results.add?.mutateAsync({ ticker: 'ZZZZ', source: 'combobox-auto-add' })).rejects.toThrow('ticker not found');
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useRemoveUserTicker', () => {
  it('sends DELETE /api/me/watchlist/NVDA and invalidates both watchlist keys', async () => {
    fetchMock.mockImplementation(() => json({ ...MOCK_ME_WATCHLIST, removed: true, tickers: [MOCK_ME_WATCHLIST.tickers[1]] }));
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await render(RemoveProbe);
    await act(async () => { await results.remove?.mutateAsync('NVDA'); });
    expect(calls()).toEqual([{ url: '/api/me/watchlist/NVDA', method: 'DELETE' }]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: USER_WATCHLIST_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['watchlist'] });
  });
});

describe('useDefaultWatchlist', () => {
  it('reads the default list under the [watchlist, default] key', async () => {
    fetchMock.mockImplementation(() => json(MOCK_WATCHLIST_DEFAULT));
    await render(DefaultProbe);
    await settle();
    expect(calls()).toEqual([{ url: '/api/insights/watchlist/default', method: 'GET' }]);
    expect(results.defaults?.data).toEqual(MOCK_WATCHLIST_DEFAULT);
    const cached = client.getQueryCache().find({ queryKey: ['watchlist', 'default'], exact: true });
    expect(cached?.state.data).toEqual(MOCK_WATCHLIST_DEFAULT);
    expect(cached?.isStale()).toBe(false);
  });
});
