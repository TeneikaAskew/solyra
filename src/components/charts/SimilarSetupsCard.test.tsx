// @vitest-environment jsdom
// FEAT-CHART-001 similar-setups realized sync: the % profitable tile is the realized win share
// (stocks FEAT-SIGNAL-001), so it shows its own denominator rather than reading against Matches.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SimilarSetupsCard } from './SimilarSetupsCard';
import { MOCK_SIMILAR_SETUPS } from '@/mocks/charts';
import type { SimilarResponse, SimilarStats } from '@/hooks/useSimilarSetups';

let root: Root;
let container: HTMLDivElement;
let client: QueryClient;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  client.clear();
  vi.unstubAllGlobals();
});

async function renderWith(stats: Partial<SimilarStats>) {
  const body: SimilarResponse = { ...MOCK_SIMILAR_SETUPS, stats: { ...MOCK_SIMILAR_SETUPS.stats, ...stats } };
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body)))));
  await act(async () => root.render(createElement(QueryClientProvider, { client },
    createElement(SimilarSetupsCard, { ticker: 'IWM', direction: 'CALL', rsi: 35, score: 4 }))));
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
const tile = (label: string) =>
  [...container.querySelectorAll('div')].find(d => d.firstElementChild?.textContent === label && d.children.length >= 2)!;
const tileText = (label: string) => [...tile(label).children].slice(1).map(c => c.textContent);

it('shows the realized win share with the number of realized matches under it', async () => {
  await renderWith({ count: 240, pct_profitable: 0.496, realized_count: 236 });
  expect(tileText('% profitable')).toEqual(['49.60%', 'of 236 realized']);
  expect(tileText('Matches')).toEqual(['240']);
});

it('says none are realized yet when no match has a realized result', async () => {
  await renderWith({ count: 240, pct_profitable: null, realized_count: 0 });
  expect(tileText('% profitable')).toEqual(['--', 'none realized yet']);
  expect(tileText('Matches')).toEqual(['240']);
});

it('adds no line when the answer carries no realized count', async () => {
  await renderWith({ count: 240, pct_profitable: 0.858, realized_count: undefined });
  expect(tileText('% profitable')).toEqual(['85.80%']);
});

it('names no number of minutes in the tiles', async () => {
  await renderWith({ count: 240, pct_profitable: 0.496, realized_count: 236 });
  const tiles = container.querySelector('.grid')!.textContent!;
  expect(tiles).not.toMatch(/\d+\s*-?\s*min/i);
});
