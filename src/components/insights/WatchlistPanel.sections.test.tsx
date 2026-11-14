// @vitest-environment jsdom
// FEAT-INSIGHT-001 done_when[1]: the Watchlist tab shows the default list read-only
// under "Managed in Discord" and the user's own list with a remove control per row,
// with its signed-out and error states (Rule 4: neither renders as an empty list).
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_ME_WATCHLIST, MOCK_WATCHLIST_DEFAULT } from '@/mocks/insights';
import type { MeWatchlistResponse } from '@/types/watchlist';
import { MyWatchlistSection } from './MyWatchlistSection';
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
  /** Each remove in flight, settled by the test. */
  removes: new Map<string, { resolve: () => void; reject: (e: Error) => void }>(),
}));

vi.mock('@/hooks/useUserWatchlist', () => ({
  useUserWatchlist: () => ({ query: state.me, signedOut: state.signedOut, activeTickers: state.activeTickers }),
  useDefaultWatchlist: () => ({ isLoading: false, isError: false, error: null, data: MOCK_WATCHLIST_DEFAULT }),
  useAddUserTicker: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useRemoveUserTicker: () => ({
    mutateAsync: (ticker: string) =>
      new Promise<void>((resolve, reject) => {
        state.removes.set(ticker, { resolve, reject });
      }),
  }),
}));

// The Add Ticker search panel mounts once the toggle is opened.
vi.mock('@/hooks/useTickerSearch', () => ({ useTickerSearch: () => ({ isLoading: false }) }));

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
  state.removes.clear();
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

// Each pending remove is tracked per ticker, so a second click never
// re-enables the first row's button, and each failure names its own ticker.
describe('MyWatchlistSection removes and the add toggle', () => {
  let root: Root;
  let container: HTMLDivElement;
  const removeButton = (ticker: string) =>
    container.querySelector<HTMLButtonElement>(`[data-testid="my-watchlist-remove-${ticker}"]`)!;

  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(MyWatchlistSection, { onSelectTicker: () => {} })));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('a second remove keeps the first row disabled until its own request settles', async () => {
    await act(async () => removeButton('NVDA').click());
    await act(async () => removeButton('ABCD').click());
    expect(removeButton('NVDA').disabled).toBe(true);
    expect(removeButton('ABCD').disabled).toBe(true);

    await act(async () => state.removes.get('ABCD')!.resolve());
    expect(removeButton('ABCD').disabled).toBe(false);
    expect(removeButton('NVDA').disabled).toBe(true);

    await act(async () => state.removes.get('NVDA')!.resolve());
    expect(removeButton('NVDA').disabled).toBe(false);
  });

  it('each failed remove names its ticker with the API detail', async () => {
    await act(async () => removeButton('NVDA').click());
    await act(async () => removeButton('ABCD').click());
    await act(async () => state.removes.get('NVDA')!.reject(new Error('Cloud SQL unreachable')));
    await act(async () => state.removes.get('ABCD')!.resolve());
    const alerts = [...container.querySelectorAll('[role="alert"]')].map((el) => el.textContent);
    expect(alerts).toEqual(["Couldn't remove NVDA: Cloud SQL unreachable"]);
  });

  it('the Add Ticker toggle reports whether the search is open', async () => {
    const toggle = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Ticker'))!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});
