// FEAT-AUTH-001 done_when item 7 (send): getIdTokenFor reads a token only for
// the account named, from the same SDK user object it checked.
import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeUser = { uid: string; getIdToken: ReturnType<typeof vi.fn> };
const auth: { currentUser: FakeUser | null } = { currentUser: null };

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => auth),
  onAuthStateChanged: vi.fn(() => () => {}),
  setPersistence: vi.fn(() => Promise.resolve()),
  browserLocalPersistence: {},
  indexedDBLocalPersistence: {},
  GoogleAuthProvider: class {},
}));

const user = (uid: string): FakeUser => ({ uid, getIdToken: vi.fn(async () => `tok-${uid}`) });

async function load() {
  vi.resetModules();
  const impl = await import('./firebaseImpl');
  impl.initFirebase({ apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' });
  return impl;
}

afterEach(() => {
  auth.currentUser = null;
});

describe('getIdTokenFor', () => {
  it("returns A's token while the SDK holds A", async () => {
    const impl = await load();
    const a = user('uid-a');
    auth.currentUser = a;
    await expect(impl.getIdTokenFor('uid-a')).resolves.toBe('tok-uid-a');
    expect(a.getIdToken).toHaveBeenCalledWith(false);
  });

  it("rejects with 'account-changed', reading no token, while the SDK holds B", async () => {
    const impl = await load();
    const b = user('uid-b');
    auth.currentUser = b;
    await expect(impl.getIdTokenFor('uid-a')).rejects.toMatchObject({
      code: 'account-changed',
      message: expect.stringContaining('Nothing was saved'),
    });
    expect(b.getIdToken).not.toHaveBeenCalled();
  });

  it("rejects with 'account-changed' while the SDK holds nobody", async () => {
    const impl = await load();
    await expect(impl.getIdTokenFor('uid-a', true)).rejects.toMatchObject({ code: 'account-changed' });
  });

  it('passes a forced refresh through to the same user object', async () => {
    const impl = await load();
    const a = user('uid-a');
    auth.currentUser = a;
    await impl.getIdTokenFor('uid-a', true);
    expect(a.getIdToken).toHaveBeenCalledWith(true);
  });
});
