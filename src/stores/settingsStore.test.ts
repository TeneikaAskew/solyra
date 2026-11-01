// @vitest-environment jsdom
// Vitest unit tests for the shell-settings store (issue #32 coverage gap —
// pattern: tickerStore.test.ts).
//
// The store applies density/accent classes to <body> AT IMPORT TIME, so
// every test imports it fresh after arranging storage and the body class
// list — the module-load path and the stale-class removal are exactly what
// these pin.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'platform-shell-settings';

async function importStore() {
  vi.resetModules();
  return await import('./settingsStore');
}

beforeEach(() => {
  localStorage.clear();
  document.body.className = '';
});

describe('initialisation', () => {
  it('defaults to top-tabs / dense / dawn and applies the body classes', async () => {
    const { useSettingsStore } = await importStore();
    const s = useSettingsStore.getState();
    expect([s.navPattern, s.density, s.accent]).toEqual(['top-tabs', 'dense', 'dawn']);
    expect(document.body.classList.contains('density-dense')).toBe(true);
    // `dawn` is the brand orange from the landing gradient. A visitor with no
    // stored settings — which is everyone arriving on an emailed auth link —
    // gets the brand, not the blue fallback.
    expect(document.body.classList.contains('accent-dawn')).toBe(true);
  });

  it('merges a PARTIAL persisted object over the defaults', async () => {
    localStorage.setItem(KEY, JSON.stringify({ accent: 'rose' }));
    const { useSettingsStore } = await importStore();
    const s = useSettingsStore.getState();
    expect([s.navPattern, s.density, s.accent]).toEqual(['top-tabs', 'dense', 'rose']);
    expect(document.body.classList.contains('accent-rose')).toBe(true);
  });

  it('falls back to defaults on corrupt stored JSON (user preference, not data)', async () => {
    localStorage.setItem(KEY, '{not json');
    const { useSettingsStore } = await importStore();
    expect(useSettingsStore.getState().density).toBe('dense');
  });
});

describe('shell setters', () => {
  it('setDensity swaps the body class with NO stale residue and persists the triple', async () => {
    // Pins the snapshot-before-mutate fix documented in applyShellClasses:
    // removing classes during a live forEach skipped every other match and
    // left a stale density-* class that overrode the new one by CSS order.
    const { useSettingsStore } = await importStore();
    useSettingsStore.getState().setDensity('comfy');
    expect(document.body.classList.contains('density-comfy')).toBe(true);
    expect(document.body.classList.contains('density-dense')).toBe(false);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      navPattern: 'top-tabs',
      density: 'comfy',
      accent: 'dawn',
    });
  });

  it('setAccent swaps only the accent class and keeps the current density', async () => {
    const { useSettingsStore } = await importStore();
    useSettingsStore.getState().setDensity('comfy');
    useSettingsStore.getState().setAccent('violet');
    expect(document.body.classList.contains('accent-violet')).toBe(true);
    expect(document.body.classList.contains('accent-blue')).toBe(false);
    expect(document.body.classList.contains('density-comfy')).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      navPattern: 'top-tabs',
      density: 'comfy',
      accent: 'violet',
    });
  });

  it('setNavPattern persists without touching the body classes', async () => {
    const { useSettingsStore } = await importStore();
    const before = document.body.className;
    useSettingsStore.getState().setNavPattern('sidebar');
    expect(document.body.className).toBe(before);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      navPattern: 'sidebar',
      density: 'dense',
      accent: 'dawn',
    });
    expect(useSettingsStore.getState().navPattern).toBe('sidebar');
  });
});

// FEAT-AUTH-001 account transitions, done_when item 5: navPattern, density
// and accent follow the account-scoped storage state (authGate.ts).
describe('account-scoped shell settings', () => {
  async function freshGate() {
    vi.resetModules();
    return await import('@/lib/authGate');
  }
  const A = { navPattern: 'sidebar', density: 'comfy', accent: 'violet' };
  const cls = () => document.body.className;
  const pick = (s: { navPattern: string; density: string; accent: string }) => [s.navPattern, s.density, s.accent];

  it('per-owner: applies the defaults when the mode is set, then each account its own values or the defaults', async () => {
    localStorage.setItem(KEY, JSON.stringify(A));
    localStorage.setItem(`${KEY}@uid:uid-a`, JSON.stringify(A));
    const gate = await freshGate();
    gate.markStoragePending();
    const { useSettingsStore } = await import('./settingsStore');
    gate.settleStorageMode('perOwner');
    expect(pick(useSettingsStore.getState())).toEqual(['top-tabs', 'dense', 'dawn']);
    expect(cls()).toBe('density-dense accent-dawn');
    gate.noteSignedInAccount('uid-a');
    expect(pick(useSettingsStore.getState())).toEqual(['sidebar', 'comfy', 'violet']);
    expect(cls()).toBe('density-comfy accent-violet');
    gate.noteSignedInAccount('uid-b');
    expect(pick(useSettingsStore.getState())).toEqual(['top-tabs', 'dense', 'dawn']);
    expect(cls()).toBe('density-dense accent-dawn');
  });

  it('a store evaluated after the mode settled, before or after the first report, holds what an earlier one holds', async () => {
    localStorage.setItem(`${KEY}@uid:uid-a`, JSON.stringify(A));
    let gate = await freshGate();
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    let store = await import('./settingsStore');
    expect(pick(store.useSettingsStore.getState())).toEqual(['top-tabs', 'dense', 'dawn']);
    gate.noteSignedInAccount('uid-a');
    expect(pick(store.useSettingsStore.getState())).toEqual(['sidebar', 'comfy', 'violet']);
    document.body.className = '';
    gate = await freshGate();
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    store = await import('./settingsStore');
    expect(pick(store.useSettingsStore.getState())).toEqual(['sidebar', 'comfy', 'violet']);
    expect(cls()).toBe('density-comfy accent-violet');
  });

  it('shared: loads and applies the un-namespaced values when the boot settles', async () => {
    localStorage.setItem(KEY, JSON.stringify(A));
    const gate = await freshGate();
    gate.markStoragePending();
    const { useSettingsStore } = await import('./settingsStore');
    expect(cls()).toBe('');
    gate.settleStorageMode('shared');
    expect(pick(useSettingsStore.getState())).toEqual(['sidebar', 'comfy', 'violet']);
    expect(cls()).toBe('density-comfy accent-violet');
  });

  it('evaluated while storage is pending: reads no settings key and leaves the body classes unchanged', async () => {
    localStorage.setItem(KEY, JSON.stringify(A));
    document.body.className = 'keep-me';
    const gate = await freshGate();
    gate.markStoragePending();
    const read = vi.spyOn(Storage.prototype, 'getItem');
    try {
      const { useSettingsStore } = await import('./settingsStore');
      expect(read.mock.calls.map(([k]) => k).filter((k) => String(k).startsWith(KEY))).toEqual([]);
      expect(cls()).toBe('keep-me');
      expect(pick(useSettingsStore.getState())).toEqual(['top-tabs', 'dense', 'dawn']);
    } finally {
      read.mockRestore();
    }
  });

  it("per-owner: a change is stored under the current account's key only", async () => {
    localStorage.setItem(KEY, JSON.stringify(A));
    const gate = await freshGate();
    gate.markStoragePending();
    const { useSettingsStore } = await import('./settingsStore');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-b');
    useSettingsStore.getState().setAccent('teal');
    expect(JSON.parse(localStorage.getItem(`${KEY}@uid:uid-b`)!)).toEqual({ navPattern: 'top-tabs', density: 'dense', accent: 'teal' });
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(A));
  });
});
