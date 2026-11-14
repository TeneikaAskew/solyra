// @vitest-environment jsdom
// FEAT-INSIGHT-001 done_when[1]: the Watchlist tab shows the default list read-only
// under "Managed in Discord" and the user's own list with a remove control per row,
// with its signed-out and error states (Rule 4: neither renders as an empty list).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_ME_WATCHLIST, MOCK_WATCHLIST_DEFAULT } from '@/mocks/insights';
import type { MeWatchlistResponse } from '@/types/watchlist';
import { WatchlistPanel } from './WatchlistPanel';

const state = vi.hoisted(() => ({
  me: {} as {
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data: MeWatchlistResponse | undefined;
  },
  signedOut: false,
  activeTickers: [] as string[],
  watchlistOpts: [] as unknown[],
}));

vi.mock('@/hooks/useUserWatchlist', () => ({
  useUserWatchlist: () => ({ query: state.me, signedOut: state.signedOut, activeTickers: state.activeTickers }),
  useDefaultWatchlist: () => ({ isLoading: false, isError: false, error: null, data: MOCK_WATCHLIST_DEFAULT }),
  useAddUserTicker: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useRemoveUserTicker: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null, variables: undefined }),
}));

vi.mock('@/hooks/useWatchlist', () => ({
  useWatchlist: (opts: unknown) => {
    state.watchlistOpts.push(opts);
    return { isLoading: false, error: null, data: undefined, refetch: vi.fn() };
  },
}));

// A third row, added before the 2026-04-24 00:30 ET boundary, with no bar.
const ME_WITH_STALE_ROW: MeWatchlistResponse = {
  ...MOCK_ME_WATCHLIST,
  tickers: [
    ...MOCK_ME_WATCHLIST.tickers,
    {
      ticker: 'ZZZZ',
      added_at: '2026-04-22T15:00:00Z',
      source: 'ui',
      name: null,
      exchange: null,
      asset_type: null,
      last_daily_bar: null,
    },
  ],
};

function render(): Document {
  const html = renderToStaticMarkup(
    createElement(WatchlistPanel, { onSelectTicker: () => {}, refreshing: false, refreshingTicker: null }),
  );
  return new DOMParser().parseFromString(html, 'text/html');
}

beforeEach(() => {
  // 10:00 EDT on 2026-04-24; the most recent elapsed 00:30 ET is 2026-04-24T04:30:00Z.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-04-24T14:00:00Z'));
  state.me = { isLoading: false, isError: false, error: null, data: ME_WITH_STALE_ROW };
  state.signedOut = false;
  state.activeTickers = ['NVDA', 'ABCD', 'ZZZZ'];
  state.watchlistOpts = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WatchlistPanel default-list section', () => {
  it('is titled Managed in Discord, lists each row with its flags, and has no button', () => {
    const doc = render();
    const section = doc.querySelector('[data-testid="default-watchlist-section"]');
    expect(section).not.toBeNull();
    expect(section!.textContent).toContain('Managed in Discord');
    expect(section!.textContent).toContain('Changed in Discord with /watchlist add and /watchlist remove');
    for (const t of ['SPY', 'QQQ', 'IWM']) expect(section!.textContent).toContain(t);
    for (const badge of ['brief', 'insight', 'signals']) expect(section!.textContent).toContain(badge);
    expect(section!.querySelectorAll('button')).toHaveLength(0);
  });
});

describe('WatchlistPanel my-watchlist section', () => {
  it('renders a remove button per row and each row data state', () => {
    const doc = render();
    const section = doc.querySelector('[data-testid="my-watchlist-section"]');
    expect(section).not.toBeNull();
    for (const t of ['NVDA', 'ABCD', 'ZZZZ']) {
      const btn = section!.querySelector(`[data-testid="my-watchlist-remove-${t}"]`);
      expect(btn).not.toBeNull();
      expect(btn!.getAttribute('aria-label')).toBe(`Remove ${t} from my watchlist`);
    }
    const rowText = (t: string) => section!.querySelector(`[data-testid="my-watchlist-row-${t}"]`)!.textContent;
    expect(rowText('NVDA')).toContain('2026-04-23');
    expect(rowText('ABCD')).toContain("data arrives after tonight's fetch");
    expect(rowText('ZZZZ')).toContain('no data for this symbol');
  });

  it('ranks the user tickers through extras', () => {
    render();
    expect(state.watchlistOpts.at(-1)).toMatchObject({ extras: ['NVDA', 'ABCD', 'ZZZZ'] });
  });

  it('says Nothing yet; add a ticker for an empty list', () => {
    state.me = { ...state.me, data: { ...MOCK_ME_WATCHLIST, tickers: [] } };
    state.activeTickers = [];
    expect(render().body.textContent).toContain('Nothing yet; add a ticker');
  });

  it('says Sign in to keep a watchlist when signed out, with no rows or empty copy', () => {
    state.signedOut = true;
    state.me = { isLoading: false, isError: false, error: null, data: undefined };
    state.activeTickers = [];
    const text = render().body.textContent;
    expect(text).toContain('Sign in to keep a watchlist');
    expect(text).not.toContain('Nothing yet; add a ticker');
  });

  it('renders the API error detail verbatim, not an empty list', () => {
    state.me = { isLoading: false, isError: true, error: new Error('watchlist store unavailable'), data: undefined };
    state.activeTickers = [];
    const text = render().body.textContent;
    expect(text).toContain('watchlist store unavailable');
    expect(text).not.toContain('Nothing yet; add a ticker');
  });
});
