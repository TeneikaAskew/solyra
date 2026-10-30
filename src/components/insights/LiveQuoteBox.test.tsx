import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LiveQuote } from '@/hooks/useLiveQuote';
import { LiveQuoteBox } from './LiveQuoteBox';

const fixture = vi.hoisted(() => ({ lastUpdated: '' }));
// Isolate the network hook, retaining the real quote component and formatting.
vi.mock('@/hooks/useLiveQuote', () => ({
  useLiveQuote: () => ({
    isLoading: false,
    isError: false,
    data: {
      ticker: 'IWM', price: 220, open: 218, high: 221, low: 217, volume: 123456,
      change: 2, change_pct: 0.92, prev_close: 218,
      last_updated: fixture.lastUpdated, market_session: 'closed', market_open: false,
    } satisfies LiveQuote,
  }),
}));

function asOfText(lastUpdated: string): string {
  fixture.lastUpdated = lastUpdated;
  const html = renderToStaticMarkup(createElement(LiveQuoteBox, { ticker: 'IWM' }));
  const paragraph = html.match(/<p\b[^>]*>(As of .*?)<\/p>/)?.[1];
  expect(paragraph).toBeDefined();
  return paragraph!;
}

describe('LiveQuoteBox source date presentation', () => {
  it('preserves a date-only quote without inventing a midnight instant', () => {
    expect(asOfText('2026-10-29')).toBe('As of 2026-10-29 · Use this as the reference price; evidence snapshots may be older.');
  });

  it.each([
    ['2026-10-29T00:00:00Z', '2026-10-28 20:00 ET'],
    ['2026-10-29T15:30:00Z', '2026-10-29 11:30 ET'],
    ['2026-10-29T11:30:00-04:00', '2026-10-29 11:30 ET'],
    ['2026-01-15T21:00:00Z', '2026-01-15 16:00 ET'],
  ])('renders the supplied instant %s in Eastern Time', (input, expected) => {
    expect(asOfText(input)).toContain(`As of ${expected} ·`);
  });

  it('keeps an unavailable timestamp as an em dash', () => {
    expect(asOfText('')).toContain('As of — ·');
  });
});
