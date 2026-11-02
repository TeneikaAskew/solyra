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

// Set while a store loads the values for the current mode and account. That
// is a read: persist's wrapped setState must not turn it into a write of
// 'ticker-store' (IMPL-314-1 R-6), which would reserialize a legacy record
// and put this tab's in-memory active ticker over another tab's newer pick.
let loading = false;

// Set while setTicker runs. In a mode other than shared, only an explicit pick
// writes 'ticker-store': a recents push keeps the recents under the account's
// own key and leaves the record as it is, so a record nobody picked on is
// never rewritten (IMPL-314-3 C-1).
let picking = false;

/** The end of the JSON string whose opening quote is at `i`. */
function stringEnd(text: string, i: number): number {
  let j = i + 1;
  while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
  return j + 1;
}

/** The end of the JSON value that starts at `i`. */
function valueEnd(text: string, i: number): number {
  if (text[i] === '"') return stringEnd(text, i);
  if (text[i] !== '{' && text[i] !== '[') {
    let j = i;
    while (j < text.length && !/[\s,}\]]/.test(text[j])) j++;
    return j;
  }
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    if (text[j] === '"') j = stringEnd(text, j) - 1;
    else if (text[j] === '{' || text[j] === '[') depth++;
    else if ((text[j] === '}' || text[j] === ']') && --depth === 0) return j + 1;
  }
  return text.length;
}

/** Where `key`'s value sits in the object starting at `open`: its last
 *  occurrence (the one JSON.parse keeps), or null. */
function memberSpan(text: string, open: number, key: string): [number, number] | null {
  let found: [number, number] | null = null;
  let j = open + 1;
  for (;;) {
    while (/\s|,/.test(text[j] ?? '')) j++;
    if (text[j] !== '"') return found;
    const keyEnd = valueEnd(text, j);
    const name = JSON.parse(text.slice(j, keyEnd)) as string;
    j = keyEnd;
    while (/\s|:/.test(text[j] ?? '')) j++;
    const end = valueEnd(text, j);
    if (name === key) found = [j, end];
    j = end;
  }
}

/** 'ticker-store' with only its active ticker changed: every other byte of
 *  the record stays, so its recentTickers and any field persist does not
 *  know are kept exactly. The active ticker is written as persist holds it,
 *  a string or not (IMPL-314-3 C-1). Null when the record holds no `state`
 *  object. */
function withActiveTicker(raw: string, activeTicker: unknown): string | null {
  const parsed = parse(raw) as { state?: unknown } | null;
  const held = parsed?.state;
  if (typeof held !== 'object' || held === null || Array.isArray(held)) return null;
  const state = memberSpan(raw, raw.indexOf('{'), 'state');
  if (!state) return null;
  const value = JSON.stringify(activeTicker);
  const current = memberSpan(raw, state[0], 'activeTicker');
  if (current) return raw.slice(0, current[0]) + value + raw.slice(current[1]);
  const sep = Object.keys(held).length > 0 ? ',' : '';
  return `${raw.slice(0, state[0] + 1)}"activeTicker":${value}${sep}${raw.slice(state[0] + 1)}`;
}

/** The record with its numeric persist `version` set to the one persist
 *  writes, its only other change. Persist discards a record of another
 *  version when it loads, so without this a pick on such a record would not
 *  survive a reload, where main's whole-record write keeps it (IMPL-314-3
 *  C-1). A record of persist's version, or with no numeric version, is
 *  returned unchanged. */
function withPersistVersion(raw: string, version: unknown): string {
  const held = (parse(raw) as { version?: unknown } | null)?.version;
  if (typeof held !== 'number' || typeof version !== 'number' || held === version) return raw;
  const span = memberSpan(raw, raw.indexOf('{'), 'version');
  return span ? raw.slice(0, span[0]) + JSON.stringify(version) + raw.slice(span[1]) : raw;
}

/**
 * 'ticker-store' holds the active ticker per browser in every mode, as on
 * main. The recent tickers it may also hold are account-scoped: they are read
 * and written there only in shared mode. In any other mode a read hides them
 * and a write keeps whatever recentTickers the record already holds, byte for
 * byte; the per-owner recents live under `ticker-recents@uid:<uid>`.
 */
const tickerStorage: StateStorage = {
  getItem: (name) => {
    const raw = rawGet(name);
    if (getStorageMode() === 'shared') return raw;
    const parsed = parse(raw);
    if (!parsed?.state) return raw;
    const { recentTickers: _hidden, ...state } = parsed.state;
    void _hidden;
    // A version JSON cannot write back (1e400 parses to Infinity) must still
    // differ from persist's, so persist discards the record as main does.
    const version = typeof parsed.version === 'number' && !Number.isFinite(parsed.version) ? Number.MAX_VALUE : parsed.version;
    return JSON.stringify({ ...parsed, state, version });
  },
  setItem: (name, value) => {
    if (loading) return;
    if (getStorageMode() === 'shared') return rawSet(name, value);
    if (!picking) return;
    const next = parse(value);
    const activeTicker = next?.state?.activeTicker;
    const raw = rawGet(name);
    const kept = raw !== null && activeTicker !== undefined ? withActiveTicker(raw, activeTicker) : null;
    if (kept !== null) return rawSet(name, withPersistVersion(kept, next?.version));
    rawSet(name, JSON.stringify({ ...next, state: { activeTicker } }));
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
      setTicker: (ticker) => {
        picking = true;
        try {
          set({ activeTicker: ticker.toUpperCase() });
        } finally {
          picking = false;
        }
      },
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
