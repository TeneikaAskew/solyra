// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizePreferences, toPayload } from './usePreferences';

describe('sanitizePreferences', () => {
  it('keeps recognised enum values', () => {
    expect(
      sanitizePreferences({
        theme: 'light',
        nav_pattern: 'sidebar',
        density: 'comfy',
        accent: 'teal',
      }),
    ).toEqual({ theme: 'light', nav_pattern: 'sidebar', density: 'comfy', accent: 'teal' });
  });

  it('nulls unknown values instead of coercing them to a default', () => {
    const out = sanitizePreferences({
      theme: 'sepia',
      nav_pattern: 'rail',
      density: 'ultra',
      accent: 'chartreuse',
    });
    expect(out).toEqual({ theme: null, nav_pattern: null, density: null, accent: null });
  });

  it('treats an empty or malformed payload as "no stored opinion"', () => {
    expect(sanitizePreferences(null)).toEqual({
      theme: null, nav_pattern: null, density: null, accent: null,
    });
    expect(sanitizePreferences({ accent: 42 }).accent).toBeNull();
  });
});

describe('toPayload', () => {
  it('maps local store state to the snake_case server contract', () => {
    expect(toPayload('dark', 'top-tabs', 'dense', 'amber')).toEqual({
      theme: 'dark',
      nav_pattern: 'top-tabs',
      density: 'dense',
      accent: 'amber',
    });
  });
});

// FEAT-AUTH-001 done_when item 7 (pause): after an account change nothing is
// PUT until the new account's stored preferences have hydrated, so the
// reloaded store values (B's own keys, or the product defaults) are never
// written to B's row as if B had chosen them.
describe('usePreferencesSync across an account change', () => {
  const roots: Root[] = [];
  afterEach(async () => {
    for (const r of roots.splice(0)) await act(async () => r.unmount());
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  async function setup() {
    vi.resetModules();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    localStorage.clear();
    const gate = await import('@/lib/authGate');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const prefs = await import('./usePreferences');
    const { useThemeStore } = await import('@/stores/themeStore');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    gate.onAccountChange((next) => gate.resetAccountQueries(qc, next));

    let account = 'uid-a';
    const gets: Record<string, { resolve: (r: Response) => void }[]> = {};
    const puts: { account: string; body: unknown }[] = [];
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        puts.push({ account, body });
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      }
      return new Promise<Response>((resolve) => { (gets[account] ??= []).push({ resolve }); });
    }));
    const answer = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    // TanStack Query notifies observers on a timer, so each step lets it run.
    const step = (fn: () => void) => act(async () => { fn(); await new Promise((r) => setTimeout(r, 20)); });

    function Syncer() { prefs.usePreferencesSync(); return null; }
    const root = createRoot(document.createElement('div'));
    roots.push(root);
    await act(async () => root.render(createElement(QueryClientProvider, { client: qc }, createElement(Syncer))));
    return {
      gate, puts, gets, answer, step, useThemeStore,
      switchTo: (uid: string) => step(() => { account = uid; gate.noteSignedInAccount(uid); }),
    };
  }

  it('PUTs nothing between the switch and B hydrating, then writes B\'s own changes', async () => {
    const t = await setup();
    await t.step(() => t.gets['uid-a'][0].resolve(t.answer({ theme: 'light', nav_pattern: null, density: null, accent: null })));
    expect(t.useThemeStore.getState().theme).toBe('light');
    expect(t.puts).toEqual([]);

    await t.switchTo('uid-b');
    expect(t.useThemeStore.getState().theme).toBe('dark');
    expect(t.puts).toEqual([]);
    expect(t.gets['uid-b']).toHaveLength(1);

    await t.step(() => t.gets['uid-b'][0].resolve(t.answer({ theme: null, nav_pattern: null, density: 'dense', accent: null })));
    expect(t.puts).toEqual([]);

    await t.step(() => t.useThemeStore.getState().setTheme('light'));
    expect(t.puts).toHaveLength(1);
    expect(t.puts[0]).toMatchObject({ account: 'uid-b', body: { theme: 'light', density: 'dense' } });
  });
});
