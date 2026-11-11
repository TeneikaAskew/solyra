// @vitest-environment jsdom
// FEAT-AUTH-001 done_when item 7 (cache): a profile save's answer is written
// to the cache only while the account that rendered the form is current.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const roots: Root[] = [];
afterEach(async () => {
  for (const r of roots.splice(0)) await act(async () => r.unmount());
  vi.unstubAllGlobals();
});

async function setup() {
  vi.resetModules();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const gate = await import('@/lib/authGate');
  gate.settleStorageMode('perOwner');
  gate.noteSignedInAccount('uid-a');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { useProfile } = await import('./useProfile');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  gate.onAccountChange((next) => gate.resetAccountQueries(qc, next));

  const profile = (name: string) => ({ display_name: name });
  const heldPuts: { body: Record<string, unknown>; resolve: (r: Response) => void }[] = [];
  vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      return new Promise<Response>((resolve) => { heldPuts.push({ body: JSON.parse(String(init.body)), resolve }); });
    }
    return Promise.resolve(new Response(JSON.stringify(profile('stored')), { status: 200 }));
  }));
  const answer = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  const step = (fn: () => void) => act(async () => { fn(); await new Promise((r) => setTimeout(r, 20)); });

  let save!: (u: Record<string, unknown>) => void;
  function Form({ uid }: { uid: string | null }) {
    save = useProfile(uid).save;
    return null;
  }
  const root = createRoot(document.createElement('div'));
  roots.push(root);
  const render = (uid: string | null) => root.render(createElement(QueryClientProvider, { client: qc }, createElement(Form, { uid })));
  await step(() => render('uid-a'));
  return {
    qc, heldPuts, answer, step,
    save: (u: Record<string, unknown>) => step(() => save(u)),
    switchTo: (uid: string) => step(() => { gate.noteSignedInAccount(uid); render(uid); }),
  };
}

describe('useProfile write-back across an account change', () => {
  it("keeps A's save answer, arriving after the switch, out of the cache", async () => {
    const t = await setup();
    await t.save({ display_name: 'A renamed' });
    expect(t.heldPuts).toHaveLength(1);
    await t.switchTo('uid-b');
    await t.step(() => t.heldPuts[0].resolve(t.answer(t.heldPuts[0].body)));
    expect(t.qc.getQueryData(['me', 'profile'])).toMatchObject({ display_name: 'stored' });
  });

  it('writes the save answer to the cache when the account has not changed', async () => {
    const t = await setup();
    await t.save({ display_name: 'A renamed' });
    await t.step(() => t.heldPuts[0].resolve(t.answer(t.heldPuts[0].body)));
    expect(t.qc.getQueryData(['me', 'profile'])).toMatchObject({ display_name: 'A renamed' });
  });
});
