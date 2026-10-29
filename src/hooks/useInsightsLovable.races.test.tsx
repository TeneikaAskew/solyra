// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInsightsLovable } from './useInsightsLovable';
vi.mock('@/lib/firebase', () => ({ getIdToken: async () => 'fixture-token' }));
vi.mock('@/lib/runtimeConfig', () => ({ getAuthMode: () => 'open' }));
const input = { ticker: 'IWM', question: 'Explain this setup', mode: 'live' as const, replayCutoff: null, sessionId: null };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function pendingRequest(signal: AbortSignal) { return new Promise<Response>((_, reject) => { signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }); }); }
let current: ReturnType<typeof useInsightsLovable>;
let root: Root;
let container: HTMLDivElement;
const fetchMock = vi.fn();
function Harness() { current = useInsightsLovable(); return null; }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.invalid');
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(Harness)));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('CODE1 4413406689 controller ownership across final history await', () => {
  it.each(['failed', 'stopped'] as const)('keeps the new run stoppable after the old %s refresh resolves', async (terminal) => {
    const history = deferred<Response>(); let listCalls = 0; let runs = 0; let secondSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, options) => {
      const body = JSON.parse(options.body);
      if (body.action === 'list') return ++listCalls === 1 ? history.promise : Promise.resolve(json({ sessions: [] }));
      runs++;
      if (runs === 1 && terminal === 'failed') return Promise.resolve(json({ error: 'First request failed' }, 503));
      if (runs === 2) secondSignal = options.signal;
      return pendingRequest(options.signal);
    });
    let first!: Promise<void>; await act(async () => { first = current.research(input); });
    if (terminal === 'stopped') await act(async () => current.stop());
    expect(current.stage).toBe(terminal === 'failed' ? 'failed' : 'cancelled');
    expect(listCalls).toBe(1);
    let second!: Promise<void>; await act(async () => { second = current.research({ ...input, question: 'Second independent request' }); });
    expect(current.stage).toBe('gathering');
    await act(async () => { history.resolve(json({ sessions: [] })); await first; });
    await act(async () => current.stop());
    expect(secondSignal?.aborted).toBe(true);
    await act(async () => { await second; });
    expect(current.stage).toBe('cancelled');
    expect(current.error).toContain('Research stopped');
  });
});
describe('CODE1 4413406708 saved selection abort independently settles active run', () => {
  it.each(['gathering', 'synthesizing'] as const)('allows another research after saved read fails during %s', async (stage) => {
    const selected = deferred<Response>(); let runs = 0; let activeSignal: AbortSignal | undefined;
    fetchMock.mockImplementation((_url, options) => {
      const body = JSON.parse(options.body);
      if (body.action === 'list') return Promise.resolve(json({ sessions: [] }));
      if (body.action === 'read') return selected.promise;
      runs++; activeSignal = options.signal;
      if (stage === 'synthesizing' && runs === 1) {
        return Promise.resolve(new Response(new ReadableStream({ start(stream) {
          stream.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'status', stage, label: 'Writing answer' }) + '\n'));
          options.signal.addEventListener('abort', () => stream.error(new DOMException('Aborted', 'AbortError')));
        } })));
      }
      return pendingRequest(options.signal);
    });
    let first!: Promise<void>; await act(async () => { first = current.research(input); });
    expect(current.stage).toBe(stage);
    let read!: Promise<void>; await act(async () => { read = current.openSession('saved'); });
    expect(activeSignal?.aborted).toBe(true);
    await act(async () => { selected.resolve(json({ error: 'Saved read failed' }, 503)); await read; await first; });
    expect(['gathering', 'synthesizing']).not.toContain(current.stage);
    expect(current.error).toContain('Could not open this research');
    let retry!: Promise<void>; await act(async () => { retry = current.research(input); });
    expect(current.stage).toBe('gathering');
    await act(async () => { current.stop(); await retry; });
    expect(current.stage).toBe('cancelled');
  });
});
