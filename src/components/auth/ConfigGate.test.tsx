// @vitest-environment jsdom
// FEAT-AUTH-001 account transitions, done_when item 4 (ConfigGate half):
// one boot per page load owns the account-scoped storage mode.
import { StrictMode, act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Gate = typeof import('@/lib/authGate');

const initCalls: { modeAtInit: string }[] = [];
let gateRef: Gate | null = null;
vi.mock('@/lib/firebase', () => ({
  initFirebase: vi.fn(async () => {
    initCalls.push({ modeAtInit: gateRef?.getStorageMode() ?? 'unknown' });
  }),
}));

const fetchMock = vi.fn();
const roots: { root: Root; el: HTMLElement }[] = [];

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const FIREBASE = { authMode: 'firebase', firebase: { apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' } };
const OPEN = { authMode: 'open' };
const answer = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

async function load() {
  vi.resetModules();
  const gate = await import('@/lib/authGate');
  gateRef = gate;
  const { ConfigGate } = await import('./ConfigGate');
  return { gate, ConfigGate };
}

async function mount(node: ReactNode) {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  roots.push({ root, el });
  await act(async () => root.render(node));
  return { root, el };
}

const snapshot = () => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  initCalls.length = 0;
  localStorage.clear();
  localStorage.setItem('platform-theme', 'light');
  localStorage.setItem('platform-theme@uid:uid-a', 'dark');
});

afterEach(async () => {
  for (const { root, el } of roots.splice(0)) {
    await act(async () => root.unmount());
    el.remove();
  }
  vi.unstubAllGlobals();
});

describe('ConfigGate boot and the storage mode', () => {
  it('marks storage pending before the first ConfigGate starts its preload', async () => {
    const { gate, ConfigGate } = await load();
    const config = deferred<Response>();
    fetchMock.mockReturnValue(config.promise);
    let modeAtPreload: string | null = null;
    const preload = vi.fn(async () => { modeAtPreload = gate.getStorageMode(); });
    await mount(createElement(ConfigGate, { preload, children: 'app' }));
    expect(preload).toHaveBeenCalledTimes(1);
    expect(modeAtPreload).toBe('pending');
    await act(async () => config.resolve(answer(FIREBASE)));
  });

  it('settles per-owner itself in firebase mode, before initFirebase attaches its listener', async () => {
    const { gate, ConfigGate } = await load();
    fetchMock.mockResolvedValue(answer(FIREBASE));
    const { el } = await mount(createElement(ConfigGate, { children: 'app' }));
    expect(gate.getStorageMode()).toBe('perOwner');
    expect(initCalls).toEqual([{ modeAtInit: 'perOwner' }]);
    expect(el.textContent).toBe('app');
  });

  it('settles shared when the boot resolves without initFirebase', async () => {
    const { gate, ConfigGate } = await load();
    fetchMock.mockResolvedValue(answer(OPEN));
    await mount(createElement(ConfigGate, { children: 'app' }));
    expect(gate.getStorageMode()).toBe('shared');
    expect(initCalls).toEqual([]);
  });

  it('a second ConfigGate mounted after the boot started leaves the mode and every stored value unchanged', async () => {
    const { gate, ConfigGate } = await load();
    fetchMock.mockResolvedValue(answer(FIREBASE));
    await mount(createElement(ConfigGate, { children: 'first' }));
    expect(gate.getStorageMode()).toBe('perOwner');
    const before = snapshot();
    const modes: string[] = [];
    const off = gate.onStorageChange(() => modes.push(gate.getStorageMode()));
    await mount(createElement(ConfigGate, { preload: async () => {}, children: 'second' }));
    off();
    expect(modes).toEqual([]);
    expect(gate.getStorageMode()).toBe('perOwner');
    expect(snapshot()).toEqual(before);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a StrictMode re-run of its effects leaves the mode and every stored value unchanged", async () => {
    const { gate, ConfigGate } = await load();
    fetchMock.mockResolvedValue(answer(FIREBASE));
    const before = snapshot();
    const modes: string[] = [];
    const off = gate.onStorageChange(() => modes.push(gate.getStorageMode()));
    await mount(createElement(StrictMode, null, createElement(ConfigGate, { children: 'app' })));
    off();
    expect(modes).toEqual(['pending', 'perOwner']);
    expect(snapshot()).toEqual(before);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a ConfigGate unmounted during its spinner leaves the mode to the boot, and stored values unchanged', async () => {
    const { gate, ConfigGate } = await load();
    const config = deferred<Response>();
    fetchMock.mockReturnValue(config.promise);
    const before = snapshot();
    const { root } = await mount(createElement(ConfigGate, { children: 'app' }));
    expect(gate.getStorageMode()).toBe('pending');
    await act(async () => root.unmount());
    await act(async () => config.resolve(answer(FIREBASE)));
    expect(gate.getStorageMode()).toBe('perOwner');
    expect(snapshot()).toEqual(before);
  });

  it('a failed boot leaves storage pending and renders only the config-error screen', async () => {
    const { gate, ConfigGate } = await load();
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    const { el } = await mount(createElement(ConfigGate, { children: 'CHILD-CONTENT' }));
    expect(gate.getStorageMode()).toBe('pending');
    expect(el.querySelector('[data-testid="config-error"]')).not.toBeNull();
    expect(el.textContent).not.toContain('CHILD-CONTENT');
  });
});
