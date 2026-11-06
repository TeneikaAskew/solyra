// @vitest-environment jsdom
// FEAT-AUTH-001 § Design "Sends": a refusal recorded after the account
// changed is shown by AuthGate to the account now on screen, holds nothing of
// the composing account, never reads as saved, and goes on dismiss or on the
// next account change.
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const user = { authMode: 'firebase', isSignedIn: true, isLoading: false };
vi.mock('@/hooks/useUser', () => ({ useUser: () => user }));
vi.mock('./SignInScreen', () => ({ SignInScreen: () => createElement('div', null, 'SIGN-IN') }));

const roots: { root: Root; el: HTMLElement }[] = [];
afterEach(async () => {
  for (const { root, el } of roots.splice(0)) {
    await act(async () => root.unmount());
    el.remove();
  }
  Object.assign(user, { authMode: 'firebase', isSignedIn: true, isLoading: false });
});

async function mount() {
  vi.resetModules();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const gate = await import('@/lib/authGate');
  const { AuthGate } = await import('./AuthGate');
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  roots.push({ root, el });
  const render = () => act(async () => root.render(createElement(AuthGate, null, 'APP-FOR-B')));
  await render();
  return { gate, el, render };
}

const notice = (el: HTMLElement) => el.querySelector('[data-testid="account-change-refusal"]');

describe('AuthGate refused-write notice', () => {
  it('shows the refusal to the account now on screen, with no saved claim and nothing of the composing account', async () => {
    const { gate, el } = await mount();
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    expect(notice(el)).toBeNull();
    await act(async () => gate.noteRefusedWrite('uid-a'));
    expect(notice(el)?.textContent).toContain('Nothing was saved');
    expect(el.textContent).not.toMatch(/\bSaved\./);
    expect(el.textContent).not.toContain('uid-a');
    expect(el.textContent).toContain('APP-FOR-B');
  });

  it('goes on dismiss', async () => {
    const { gate, el } = await mount();
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    await act(async () => gate.noteRefusedWrite('uid-a'));
    await act(async () => (notice(el)!.querySelector('button') as HTMLButtonElement).click());
    expect(notice(el)).toBeNull();
  });

  it('goes on the next account change, and repeated transitions leave none behind', async () => {
    const { gate, el } = await mount();
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    await act(async () => gate.noteRefusedWrite('uid-a'));
    await act(async () => gate.noteSignedInAccount('uid-a'));
    expect(notice(el)).toBeNull();
    await act(async () => gate.noteSignedInAccount('uid-b'));
    await act(async () => gate.noteSignedInAccount('uid-a'));
    expect(notice(el)).toBeNull();
  });

  it('is shown on the sign-in screen when the account now on screen is nobody', async () => {
    const { gate, el, render } = await mount();
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount(null);
    Object.assign(user, { isSignedIn: false });
    await render();
    await act(async () => gate.noteRefusedWrite('uid-a'));
    expect(el.textContent).toContain('SIGN-IN');
    expect(notice(el)?.textContent).toContain('Nothing was saved');
  });

  it('renders nothing extra outside firebase mode', async () => {
    Object.assign(user, { authMode: 'open' });
    const { gate, el } = await mount();
    await act(async () => gate.noteRefusedWrite('uid-a'));
    expect(el.textContent).toBe('APP-FOR-B');
  });
});
