// Vitest unit tests for the ticker store (Phase 1, Task 2).
//
// Covers the pushRecent invariants the TickerCombobox depends on (newest
// first, deduped, capped at 8, uppercased) and the persist partialize
// contract: quickPicks are code-owned (not user state) and must NEVER be
// persisted, otherwise a stale localStorage copy would shadow future
// quick-pick changes shipped in code.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal in-memory localStorage so zustand's persist middleware fully
// initialises in the node test environment. Its default storage is
// `window.localStorage`; without a window, persist bails out early and
// never attaches the `useTickerStore.persist` API that the partialize
// test below exercises.
const backing = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => void backing.set(k, v),
  removeItem: (k: string) => void backing.delete(k),
  clear: () => backing.clear(),
} satisfies Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;
vi.stubGlobal('localStorage', localStorageStub);
vi.stubGlobal('window', { localStorage: localStorageStub });

const { useTickerStore } = await import('./tickerStore');

const initialState = useTickerStore.getState();

beforeEach(() => {
  useTickerStore.setState({ ...initialState, recentTickers: [], activeTicker: 'IWM' });
});

describe('setTicker', () => {
  it('uppercases the active ticker', () => {
    useTickerStore.getState().setTicker('aapl');
    expect(useTickerStore.getState().activeTicker).toBe('AAPL');
  });
});

describe('pushRecent', () => {
  it('prepends (newest first) and uppercases', () => {
    useTickerStore.getState().pushRecent('aapl');
    useTickerStore.getState().pushRecent('msft');
    expect(useTickerStore.getState().recentTickers).toEqual(['MSFT', 'AAPL']);
  });

  it('dedupes: re-pushing an existing symbol moves it to the front without duplicating', () => {
    useTickerStore.getState().pushRecent('AAPL');
    useTickerStore.getState().pushRecent('MSFT');
    useTickerStore.getState().pushRecent('AAPL');
    expect(useTickerStore.getState().recentTickers).toEqual(['AAPL', 'MSFT']);
  });

  it('dedupes case-insensitively (lowercase re-push of an uppercased entry)', () => {
    useTickerStore.getState().pushRecent('AAPL');
    useTickerStore.getState().pushRecent('MSFT');
    useTickerStore.getState().pushRecent('aapl');
    expect(useTickerStore.getState().recentTickers).toEqual(['AAPL', 'MSFT']);
  });

  it('caps the list at 8, evicting the oldest', () => {
    const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (const s of symbols) useTickerStore.getState().pushRecent(s);
    const recents = useTickerStore.getState().recentTickers;
    expect(recents).toHaveLength(8);
    expect(recents).toEqual(['J', 'I', 'H', 'G', 'F', 'E', 'D', 'C']);
  });
});

describe('persist partialize', () => {
  it('persists activeTicker + recentTickers and omits quickPicks (code-owned, must not be shadowed by stale storage)', () => {
    const { partialize } = useTickerStore.persist.getOptions();
    expect(partialize).toBeTypeOf('function');
    const persisted = partialize!({
      ...useTickerStore.getState(),
      activeTicker: 'MSFT',
      recentTickers: ['MSFT', 'AAPL'],
    });
    expect(persisted).toEqual({ activeTicker: 'MSFT', recentTickers: ['MSFT', 'AAPL'] });
    expect(persisted).not.toHaveProperty('quickPicks');
  });
});

// FEAT-AUTH-001 account transitions, done_when item 5: recent tickers follow
// the account-scoped storage state; the active ticker stays per browser.
describe('account-scoped recent tickers', () => {
  const STORE = 'ticker-store';
  const LEGACY = JSON.stringify({ state: { activeTicker: 'QQQ', recentTickers: ['NVDA'] }, version: 0 });
  async function fresh() {
    vi.resetModules();
    backing.clear();
    return await import('@/lib/authGate');
  }

  it('per-owner: no recents when the mode is set, then each account its own recents or none', async () => {
    const gate = await fresh();
    backing.set(STORE, LEGACY);
    backing.set('ticker-recents@uid:uid-a', JSON.stringify(['AAPL']));
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    gate.settleStorageMode('perOwner');
    expect(s.getState().recentTickers).toEqual([]);
    gate.noteSignedInAccount('uid-a');
    expect(s.getState().recentTickers).toEqual(['AAPL']);
    gate.noteSignedInAccount('uid-b');
    expect(s.getState().recentTickers).toEqual([]);
    gate.noteSignedInAccount('uid-a');
    expect(s.getState().recentTickers).toEqual(['AAPL']);
  });

  it('a store evaluated after the mode settled, before or after the first report, holds what an earlier one holds', async () => {
    let gate = await fresh();
    backing.set(STORE, LEGACY);
    backing.set('ticker-recents@uid:uid-a', JSON.stringify(['AAPL']));
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    let store = await import('./tickerStore');
    expect(store.useTickerStore.getState().recentTickers).toEqual([]);
    gate.noteSignedInAccount('uid-a');
    expect(store.useTickerStore.getState().recentTickers).toEqual(['AAPL']);
    vi.resetModules();
    gate = await import('@/lib/authGate');
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    store = await import('./tickerStore');
    expect(store.useTickerStore.getState().recentTickers).toEqual(['AAPL']);
    expect(store.useTickerStore.getState().activeTicker).toBe('QQQ');
  });

  it("shared: loads the recents held in 'ticker-store' when the boot settles", async () => {
    const gate = await fresh();
    backing.set(STORE, LEGACY);
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    expect(s.getState().recentTickers).toEqual([]);
    gate.settleStorageMode('shared');
    expect(s.getState().recentTickers).toEqual(['NVDA']);
  });

  it("evaluated while pending: reads only 'ticker-store', takes the active ticker but none of its recentTickers", async () => {
    const gate = await fresh();
    backing.set(STORE, LEGACY);
    backing.set('ticker-recents@uid:uid-a', JSON.stringify(['AAPL']));
    gate.markStoragePending();
    const keys: string[] = [];
    const orig = localStorageStub.getItem;
    localStorageStub.getItem = (k: string) => { keys.push(k); return orig(k); };
    try {
      const { useTickerStore: s } = await import('./tickerStore');
      expect([...new Set(keys)]).toEqual([STORE]);
      expect(s.getState().activeTicker).toBe('QQQ');
      expect(s.getState().recentTickers).toEqual([]);
    } finally {
      localStorageStub.getItem = orig;
    }
  });

  it("per-owner: the active ticker stays per browser in 'ticker-store', and its write keeps the recentTickers there byte-identical", async () => {
    const gate = await fresh();
    backing.set(STORE, LEGACY);
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    s.getState().setTicker('spy');
    s.getState().pushRecent('MSFT');
    const stored = JSON.parse(backing.get(STORE)!);
    expect(stored.state.activeTicker).toBe('SPY');
    expect(JSON.stringify(stored.state.recentTickers)).toBe(JSON.stringify(['NVDA']));
    expect(backing.get(STORE)).toContain('"recentTickers":["NVDA"]');
    expect(JSON.parse(backing.get('ticker-recents@uid:uid-a')!)).toEqual(['MSFT']);
    gate.noteSignedInAccount('uid-b');
    expect(s.getState().activeTicker).toBe('SPY');
    expect(s.getState().recentTickers).toEqual([]);
  });

  it("per-owner: with no recentTickers in 'ticker-store', an active-ticker write adds none", async () => {
    const gate = await fresh();
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    s.getState().pushRecent('AAPL');
    s.getState().setTicker('AAPL');
    expect(JSON.parse(backing.get(STORE)!).state).toEqual({ activeTicker: 'AAPL' });
  });
});

// IMPL-314-1 R-2: see settingsStore.test.ts.
describe('a change from the previous account\'s screen (IMPL-314-1 R-2)', () => {
  it('pushRecent is refused, and B keeps its own recents and key', async () => {
    vi.resetModules();
    backing.clear();
    backing.set('ticker-recents@uid:uid-a', JSON.stringify(['AAPL']));
    const gate = await import('@/lib/authGate');
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    gate.noteRenderedAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    s.getState().pushRecent('TSLA');
    expect(s.getState().recentTickers).toEqual([]);
    expect(backing.get('ticker-recents@uid:uid-b')).toBeUndefined();
    expect(backing.get('ticker-recents@uid:uid-a')).toBe(JSON.stringify(['AAPL']));
    expect(gate.isRefusedWriteNoticeShown()).toBe(true);
    gate.noteRenderedAccount('uid-b');
    s.getState().pushRecent('TSLA');
    expect(backing.get('ticker-recents@uid:uid-b')).toBe(JSON.stringify(['TSLA']));
  });
});

// IMPL-314-1 R-6 (done_when items 4 and 18): loading values for the current
// mode and account is a read. It never writes 'ticker-store', so a legacy
// record in any serialization stays byte for byte, and an account change in
// one tab never writes its in-memory active ticker over another tab's pick.
describe("loading never rewrites 'ticker-store' (IMPL-314-1 R-6)", () => {
  const STORE = 'ticker-store';
  // Not persist's own serialization: other key order, whitespace, an extra field.
  const ODD = '{ "version": 0, "state": { "recentTickers": [ "NVDA" ], "activeTicker": "QQQ", "extra": 1 } }';
  async function fresh() {
    vi.resetModules();
    backing.clear();
    backing.set(STORE, ODD);
    const gate = await import('@/lib/authGate');
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    return { gate, s };
  }

  it('per-owner: the mode settling, the first report and later account changes leave it byte-identical', async () => {
    const { gate, s } = await fresh();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount(null);
    gate.noteSignedInAccount('uid-b');
    expect(backing.get(STORE)).toBe(ODD);
    expect(s.getState().activeTicker).toBe('QQQ');
    expect(s.getState().recentTickers).toEqual([]);
  });

  it('shared: the boot settling leaves it byte-identical and applies its recents, as on main', async () => {
    const { gate, s } = await fresh();
    gate.settleStorageMode('shared');
    expect(backing.get(STORE)).toBe(ODD);
    expect(s.getState().recentTickers).toEqual(['NVDA']);
  });

  it("an account change does not write this tab's active ticker over a newer pick another tab stored", async () => {
    const { gate } = await fresh();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    const otherTab = JSON.stringify({ state: { activeTicker: 'TSLA', recentTickers: ['NVDA'] }, version: 0 });
    backing.set(STORE, otherTab);
    gate.noteSignedInAccount('uid-b');
    expect(backing.get(STORE)).toBe(otherTab);
  });

  it('control: a real active-ticker pick still writes it, and every other byte of the record stays', async () => {
    const { gate, s } = await fresh();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    gate.noteRenderedAccount('uid-a');
    s.getState().setTicker('spy');
    expect(backing.get(STORE)).toBe(ODD.replace('"activeTicker": "QQQ"', '"activeTicker": "SPY"'));
    s.getState().setTicker('qqq');
    expect(backing.get(STORE)).toBe(ODD);
  });

  it('per-owner: a pick on a record whose state has no active ticker adds it and keeps the rest byte for byte', async () => {
    vi.resetModules();
    backing.clear();
    const noActive = '{"state":{ "recentTickers":["A\\"B", "NVDA"] , "x":{"y":[1,"}"]} },"version":0}';
    backing.set(STORE, noActive);
    const gate = await import('@/lib/authGate');
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    gate.noteRenderedAccount('uid-a');
    s.getState().setTicker('spy');
    expect(backing.get(STORE)).toBe(noActive.replace('{"state":{', '{"state":{"activeTicker":"SPY",'));
    expect(JSON.parse(backing.get(STORE)!).state.recentTickers).toEqual(['A"B', 'NVDA']);
  });
});

// IMPL-314-3 C-1 (done_when item 5, which names no record shape): a write of
// the active ticker keeps any recentTickers already in 'ticker-store' byte
// for byte, and the active ticker behaves as on main, for the two record
// shapes C-1 measured.
describe("C-1: an active-ticker write on the two shapes IMPL-314-3 measured", () => {
  const STORE = 'ticker-store';
  async function evaluate(mode: 'perOwner' | 'shared') {
    vi.resetModules();
    const gate = await import('@/lib/authGate');
    gate.markStoragePending();
    const { useTickerStore: s } = await import('./tickerStore');
    gate.settleStorageMode(mode);
    if (mode === 'perOwner') {
      gate.noteSignedInAccount('uid-a');
      gate.noteRenderedAccount('uid-a');
    }
    return s;
  }

  it.each([
    ['null', '{ "version": 0, "state": { "recentTickers": [ "NVDA" ], "activeTicker": null, "extra": 1 } }'],
    ['a number', '{"state":{"activeTicker":5,"recentTickers":["NVDA","A\\"B"],"x":{"y":"}"}},"version":0}'],
  ])('per-owner: with the active ticker held as %s, a recents write keeps every byte of the record', async (_label, record) => {
    backing.clear();
    backing.set(STORE, record);
    const s = await evaluate('perOwner');
    expect(typeof s.getState().activeTicker).not.toBe('string');
    s.getState().pushRecent('aapl');
    expect(backing.get(STORE)).toBe(record);
    expect(JSON.parse(backing.get('ticker-recents@uid:uid-a')!)).toEqual(['AAPL']);
  });

  const V1 = '{ "version": 1, "state": { "recentTickers": [ "NVDA" ], "activeTicker": "QQQ", "extra": 1 } }';

  it('per-owner: a pick on a record with a non-zero persist version survives a reload, as on main, and changes only the active ticker and that version', async () => {
    backing.clear();
    backing.set(STORE, V1);
    const s = await evaluate('perOwner');
    // Loads as on main: persist discards a record of another version.
    expect(s.getState().activeTicker).toBe('IWM');
    s.getState().setTicker('spy');
    expect(backing.get(STORE)).toBe(V1.replace('"activeTicker": "QQQ"', '"activeTicker": "SPY"').replace('"version": 1', '"version": 0'));
    const reloaded = await evaluate('perOwner');
    expect(reloaded.getState().activeTicker).toBe('SPY');
    expect(JSON.parse(backing.get(STORE)!).state.recentTickers).toEqual(['NVDA']);
  });

  it('control, shared: the same pick survives a reload, as on main', async () => {
    backing.clear();
    backing.set(STORE, V1);
    const s = await evaluate('shared');
    expect(s.getState().activeTicker).toBe('IWM');
    s.getState().setTicker('spy');
    const reloaded = await evaluate('shared');
    expect(reloaded.getState().activeTicker).toBe('SPY');
  });

  it('control, per-owner: a record of version 0, or with no version, keeps its version bytes on a pick', async () => {
    for (const record of [
      '{ "version": 0, "state": { "recentTickers": [ "NVDA" ], "activeTicker": "QQQ" } }',
      '{"state":{"activeTicker":"QQQ","recentTickers":["NVDA"]}}',
    ]) {
      backing.clear();
      backing.set(STORE, record);
      const s = await evaluate('perOwner');
      s.getState().setTicker('spy');
      expect(backing.get(STORE)).toBe(record.replace(/"activeTicker": ?"QQQ"/, (m) => m.replace('QQQ', 'SPY')));
    }
  });
});
