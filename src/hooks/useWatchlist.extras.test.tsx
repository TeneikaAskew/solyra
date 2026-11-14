// @vitest-environment jsdom
// FEAT-INSIGHT-001 Review Focus 2: the normalized extras list is part of the ranked query's key,
// so a membership change refetches and a reordering of the same set does not.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeExtras, useWatchlist } from './useWatchlist';

const fetchMock = vi.fn();
let client: QueryClient;
let root: Root;
let container: HTMLDivElement;

const seen: { latest?: ReturnType<typeof useWatchlist> } = {};
const report = (value: ReturnType<typeof useWatchlist>) => { seen.latest = value; };
function Probe({ extras }: { extras: string[] }) {
  report(useWatchlist({ extras }));
  return null;
}
async function render(extras: string[]) {
  await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Probe, { extras }))));
}
async function settle() {
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
const urls = () => fetchMock.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 })));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('normalizeExtras', () => {
  it('upper-cases, trims, dedupes and sorts', () => {
    expect(normalizeExtras(['nvda', ' AAPL', 'NVDA'])).toBe('AAPL,NVDA');
  });
  it('drops empties and treats undefined as none', () => {
    expect(normalizeExtras(['', '  '])).toBe('');
    expect(normalizeExtras(undefined)).toBe('');
  });
});

describe('useWatchlist extras', () => {
  it('refetches with extras when membership changes, not when the same set is reordered', async () => {
    await render([]);
    await settle();
    expect(urls()).toHaveLength(1);
    expect(urls()[0]).not.toContain('extras=');

    await render(['NVDA']);
    await settle();
    expect(urls()).toHaveLength(2);
    expect(new URL(urls()[1], 'http://x').searchParams.get('extras')).toBe('NVDA');

    await render(['AAPL', 'NVDA']);
    await settle();
    expect(urls()).toHaveLength(3);
    await render(['nvda', 'AAPL']);
    await settle();
    expect(urls()).toHaveLength(3);
  });

  it('keeps the previous ranking on screen, marked as placeholder, while the new extras load', async () => {
    await render([]);
    await settle();
    const first = seen.latest?.data;
    expect(first).toEqual({ items: [] });

    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    await render(['NVDA']);
    await settle();
    expect(seen.latest?.isLoading).toBe(false);
    expect(seen.latest?.isPlaceholderData).toBe(true);
    expect(seen.latest?.data).toBe(first);
  });
});
