// @vitest-environment jsdom
// Vitest unit tests for the theme store (issue #32 coverage gap — pattern:
// tickerStore.test.ts).
//
// themeStore applies the theme to <html> AT IMPORT TIME, so the init cases
// seed storage and then import the module fresh — module-load behaviour is
// the thing under test, not an incidental detail.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'platform-theme';

async function importStore() {
  vi.resetModules();
  return await import('./themeStore');
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('initial theme', () => {
  it('defaults to dark regardless of OS preference (product default)', async () => {
    const { useThemeStore } = await importStore();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('honors an explicitly stored light choice', async () => {
    localStorage.setItem(KEY, 'light');
    const { useThemeStore } = await importStore();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('ignores a corrupt stored value and falls back to dark', async () => {
    localStorage.setItem(KEY, 'blue');
    const { useThemeStore } = await importStore();
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});

describe('setTheme / toggleTheme', () => {
  it('setTheme applies data-theme to <html> and persists', async () => {
    const { useThemeStore } = await importStore();
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(KEY)).toBe('light');
  });

  it('toggleTheme flips, applies, and persists on every flip', async () => {
    const { useThemeStore } = await importStore();
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(localStorage.getItem(KEY)).toBe('light');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(KEY)).toBe('dark');
  });
});

// FEAT-AUTH-001 account transitions, done_when item 5: the theme follows the
// account-scoped storage state (authGate.ts).
describe('account-scoped theme', () => {
  async function freshGate() {
    vi.resetModules();
    return await import('@/lib/authGate');
  }
  const theme = () => document.documentElement.getAttribute('data-theme');

  it('per-owner: applies the default when the mode is set, then each account its own theme or the default', async () => {
    localStorage.setItem(KEY, 'light');
    localStorage.setItem(`${KEY}@uid:uid-a`, 'light');
    const gate = await freshGate();
    gate.markStoragePending();
    const { useThemeStore } = await import('./themeStore');
    gate.settleStorageMode('perOwner');
    expect([useThemeStore.getState().theme, theme()]).toEqual(['dark', 'dark']);
    gate.noteSignedInAccount('uid-a');
    expect([useThemeStore.getState().theme, theme()]).toEqual(['light', 'light']);
    gate.noteSignedInAccount('uid-b');
    expect([useThemeStore.getState().theme, theme()]).toEqual(['dark', 'dark']);
    gate.noteSignedInAccount(null);
    expect([useThemeStore.getState().theme, theme()]).toEqual(['dark', 'dark']);
    gate.noteSignedInAccount('uid-a');
    expect([useThemeStore.getState().theme, theme()]).toEqual(['light', 'light']);
  });

  it('a store evaluated after the mode settled, before or after the first report, holds what an earlier one holds', async () => {
    localStorage.setItem(`${KEY}@uid:uid-a`, 'light');
    let gate = await freshGate();
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    let store = await import('./themeStore');
    expect(store.useThemeStore.getState().theme).toBe('dark');
    gate.noteSignedInAccount('uid-a');
    expect(store.useThemeStore.getState().theme).toBe('light');
    document.documentElement.removeAttribute('data-theme');
    gate = await freshGate();
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    store = await import('./themeStore');
    expect([store.useThemeStore.getState().theme, theme()]).toEqual(['light', 'light']);
  });

  it('shared: loads and applies the un-namespaced theme when the boot settles', async () => {
    localStorage.setItem(KEY, 'light');
    const gate = await freshGate();
    gate.markStoragePending();
    const { useThemeStore } = await import('./themeStore');
    expect(theme()).toBeNull();
    gate.settleStorageMode('shared');
    expect([useThemeStore.getState().theme, theme()]).toEqual(['light', 'light']);
  });

  it('evaluated while storage is pending: reads no theme key and leaves data-theme unchanged', async () => {
    localStorage.setItem(KEY, 'light');
    const gate = await freshGate();
    gate.markStoragePending();
    const read = vi.spyOn(Storage.prototype, 'getItem');
    try {
      const { useThemeStore } = await import('./themeStore');
      expect(read.mock.calls.map(([k]) => k).filter((k) => String(k).startsWith(KEY))).toEqual([]);
      expect(theme()).toBeNull();
      expect(useThemeStore.getState().theme).toBe('dark');
    } finally {
      read.mockRestore();
    }
  });

  it("per-owner: a change is stored under the current account's key only", async () => {
    localStorage.setItem(KEY, 'dark');
    const gate = await freshGate();
    gate.markStoragePending();
    const { useThemeStore } = await import('./themeStore');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    useThemeStore.getState().toggleTheme();
    expect(localStorage.getItem(`${KEY}@uid:uid-a`)).toBe('light');
    expect(localStorage.getItem(KEY)).toBe('dark');
  });
});

// IMPL-314-1 R-2: see settingsStore.test.ts.
describe('a change from the previous account\'s screen (IMPL-314-1 R-2)', () => {
  for (const [name, call] of [
    ['setTheme', (s: { setTheme: (t: 'light') => void }) => s.setTheme('light')],
    ['toggleTheme', (s: { toggleTheme: () => void }) => s.toggleTheme()],
  ] as const) {
    it(`${name} is refused, and B keeps its own theme and key`, async () => {
      localStorage.clear();
      localStorage.setItem(`${KEY}@uid:uid-a`, 'light');
      vi.resetModules();
      const gate = await import('@/lib/authGate');
      gate.markStoragePending();
      const { useThemeStore } = await import('./themeStore');
      gate.settleStorageMode('perOwner');
      gate.noteSignedInAccount('uid-a');
      gate.noteRenderedAccount('uid-a');
      gate.noteSignedInAccount('uid-b');
      (call as (s: unknown) => void)(useThemeStore.getState());
      expect([useThemeStore.getState().theme, document.documentElement.getAttribute('data-theme')]).toEqual(['dark', 'dark']);
      expect(localStorage.getItem(`${KEY}@uid:uid-b`)).toBeNull();
      expect(localStorage.getItem(`${KEY}@uid:uid-a`)).toBe('light');
      expect(gate.isRefusedWriteNoticeShown()).toBe(true);
      gate.noteRenderedAccount('uid-b');
      (call as (s: unknown) => void)(useThemeStore.getState());
      expect(localStorage.getItem(`${KEY}@uid:uid-b`)).toBe('light');
    });
  }
});
