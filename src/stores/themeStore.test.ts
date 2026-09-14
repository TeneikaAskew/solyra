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
