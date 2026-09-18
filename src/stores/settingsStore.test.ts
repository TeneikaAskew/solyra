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
