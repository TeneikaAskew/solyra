import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { acceptsScreenWrite, getStorageMode, onStorageChange, readScoped, writeScoped } from '@/lib/authGate';

interface TickerState {
  activeTicker: string;
  /** The app's core, always-instrumented tickers — shown as one-tap chips. */
  quickPicks: string[];
  /** Most-recently-selected tickers (typed via the combobox), newest first, capped at 8. */
  recentTickers: string[];
  setTicker: (ticker: string) => void;
  pushRecent: (ticker: string) => void;
}

const STORE_KEY = 'ticker-store';
/** Per-owner home of the recent tickers (authGate.ts, FEAT-AUTH-001). */
const RECENTS_KEY = 'ticker-recents';

type Persisted = { state?: { activeTicker?: string; recentTickers?: string[] }; version?: number };

function parse(raw: string | null): Persisted | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function rawGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function rawSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota or blocked storage: the selection applies for this page only.
  }
}

/**
 * 'ticker-store' holds the active ticker per browser in every mode, as on
 * main. The recent tickers it may also hold are account-scoped: they are read
 * and written there only in shared mode. In any other mode a read hides them
 * and a write keeps whatever recentTickers the record already holds, byte for
 * byte; the per-owner recents live under `ticker-recents@uid:<uid>`.
 */
// Set while a store loads the values for the current mode and account. That
// is a read: persist's wrapped setState must not turn it into a write of
// 'ticker-store' (IMPL-314-1 R-6), which would reserialize a legacy record
// and put this tab's in-memory active ticker over another tab's newer pick.
let loading = false;

const tickerStorage: StateStorage = {
  getItem: (name) => {
    const raw = rawGet(name);
    if (getStorageMode() === 'shared') return raw;
    const parsed = parse(raw);
    if (!parsed?.state) return raw;
    const { recentTickers: _hidden, ...state } = parsed.state;
    void _hidden;
    return JSON.stringify({ ...parsed, state });
  },
  setItem: (name, value) => {
    if (loading) return;
    if (getStorageMode() === 'shared') return rawSet(name, value);
    const next = parse(value);
    // Everything the record already holds besides the active ticker stays,
    // recentTickers included.
    const state: Persisted['state'] = { ...parse(rawGet(name))?.state, activeTicker: next?.state?.activeTicker };
    rawSet(name, JSON.stringify({ ...next, state }));
  },
  removeItem: () => {
    // Never removes stored values (FEAT-AUTH-001: no deletion).
  },
};

/** The recents for the current storage state: null while pending. */
function loadRecents(): string[] | null {
  const mode = getStorageMode();
  if (mode === 'pending') return null;
  const list =
    mode === 'shared'
      ? parse(rawGet(STORE_KEY))?.state?.recentTickers
      : (() => {
          const raw = readScoped(RECENTS_KEY);
          if (!raw) return undefined;
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return undefined;
          }
        })();
  return Array.isArray(list) ? list.filter((t): t is string => typeof t === 'string') : [];
}

export const useTickerStore = create<TickerState>()(
  persist(
    (set) => ({
      activeTicker: 'IWM',
      quickPicks: ['IWM', 'SPY', 'QQQ'],
      recentTickers: [],
      setTicker: (ticker) => set({ activeTicker: ticker.toUpperCase() }),
      pushRecent: (ticker) => {
        if (!acceptsScreenWrite()) return;
        set((s) => {
          const recentTickers = [
            ticker.toUpperCase(),
            ...s.recentTickers.filter((t) => t !== ticker.toUpperCase()),
          ].slice(0, 8);
          // Per-owner recents are written for this page's own account only;
          // shared mode keeps them inside 'ticker-store' through persist.
          if (getStorageMode() === 'perOwner') writeScoped(RECENTS_KEY, JSON.stringify(recentTickers));
          return { recentTickers };
        });
      },
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => tickerStorage),
      partialize: (s) => ({ activeTicker: s.activeTicker, recentTickers: s.recentTickers }),
    },
  ),
);

// A store evaluated after the mode settled holds what an earlier one holds:
// in per-owner mode the recents come from the account's own key, not from
// the rehydrated 'ticker-store' record (shared mode already got them there).
function applyLoaded(recentTickers: string[]): void {
  loading = true;
  try {
    useTickerStore.setState({ recentTickers });
  } finally {
    loading = false;
  }
}

if (getStorageMode() === 'perOwner') {
  const atLoad = loadRecents();
  if (atLoad) applyLoaded(atLoad);
}

// Reload the recents on every storage event: the mode settling, the first
// account report and each later account change. The active ticker stays, and
// nothing is written.
onStorageChange(() => {
  const recentTickers = loadRecents();
  if (recentTickers) applyLoaded(recentTickers);
});
