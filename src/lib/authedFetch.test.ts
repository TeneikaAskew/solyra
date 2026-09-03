/**
 * Pins the firebase-mode header behavior of the global fetch wrapper.
 *
 * The regression this guards: /api/me sits in OPEN_PREFIXES (reachable
 * without a token so the shell and sign-in screen can boot), and the wrapper
 * used to skip token attachment entirely for open paths. But open ≠
 * anonymous — the backend's /api/me resolves a presented bearer token
 * (auth.current_user_email) to the real email + is_admin, and the role-based
 * admin gate reads exactly that flag. Without the header, a signed-in admin
 * got an anonymous /api/me forever and was locked out of /admin.
 *
 * Runs in the default node environment (no jsdom in devDeps — repo
 * convention), so a minimal `window` is stubbed before the module loads:
 * installAuthFetch only needs window.fetch to wrap and window.location for
 * path resolution.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

const getIdToken = vi.fn();
const getAuthMode = vi.fn();

vi.mock('./firebase', () => ({
  getIdToken: (forceRefresh?: boolean) => getIdToken(forceRefresh),
}));
vi.mock('./runtimeConfig', () => ({ getAuthMode: () => getAuthMode() }));

interface Installed {
  native: Mock;
  onUnauthorized: Mock;
  fetch: typeof fetch;
}

/** Fresh module + fresh fake window per test (the wrapper installs once per module). */
async function install(): Promise<Installed> {
  vi.resetModules();
  const native = vi.fn(async () => new Response('{}', { status: 200 }));
  const win = {
    fetch: native as unknown as typeof fetch,
    location: { origin: 'http://localhost:5173', hostname: 'localhost' },
  };
  vi.stubGlobal('window', win);
  const mod = await import('./authedFetch');
  const onUnauthorized = vi.fn();
  mod.setOnUnauthorized(onUnauthorized);
  mod.installAuthFetch();
  return { native, onUnauthorized, fetch: win.fetch };
}

function sentAuthHeader(native: Mock): string | null {
  const init = native.mock.calls[0]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers).get('Authorization');
}

afterEach(() => {
  vi.unstubAllGlobals();
  getIdToken.mockReset();
  getAuthMode.mockReset();
});

describe('installAuthFetch — firebase mode', () => {
  it('attaches the bearer token to OPEN-prefix paths like /api/me', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockResolvedValue('tok-123');
    const { native, fetch } = await install();

    await fetch('/api/me');

    expect(sentAuthHeader(native)).toBe('Bearer tok-123');
  });

  it('attaches the bearer token to gated paths', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockResolvedValue('tok-123');
    const { native, fetch } = await install();

    await fetch('/api/admin/routes');

    expect(sentAuthHeader(native)).toBe('Bearer tok-123');
  });

  it('sends no header when signed out (open paths stay reachable)', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockResolvedValue(null);
    const { native, fetch } = await install();

    await fetch('/api/me');

    expect(sentAuthHeader(native)).toBeNull();
  });

  it('retries token acquisition with forceRefresh on a transient failure', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken
      .mockRejectedValueOnce(new Error('refresh blip'))
      .mockResolvedValueOnce('tok-fresh');
    const { native, fetch } = await install();

    await fetch('/api/me');

    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(sentAuthHeader(native)).toBe('Bearer tok-fresh');
  });

  it('propagates a persistent token failure on the identity path instead of going anonymous', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockRejectedValue(new Error('refresh down'));
    const { native, fetch } = await install();

    await expect(fetch('/api/me')).rejects.toThrow('refresh down');
    expect(native).not.toHaveBeenCalled();
  });

  it('propagates a persistent token failure on gated paths (no guaranteed-401 send)', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockRejectedValue(new Error('refresh down'));
    const { native, fetch } = await install();

    await expect(fetch('/api/admin/routes')).rejects.toThrow('refresh down');
    expect(native).not.toHaveBeenCalled();
  });

  it('lets public open paths proceed anonymously when token acquisition fails', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockRejectedValue(new Error('refresh down'));
    const { native, fetch } = await install();

    await fetch('/api/waitlist');
    await fetch('/api/health');

    expect(native).toHaveBeenCalledTimes(2);
    expect(sentAuthHeader(native)).toBeNull();
  });

  it('a 401 from an OPEN path does not fire onUnauthorized', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockResolvedValue('tok-123');
    const { native, onUnauthorized, fetch } = await install();
    native.mockResolvedValue(new Response('{}', { status: 401 }));

    await fetch('/api/me');

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('a 401 from a gated path fires onUnauthorized', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockResolvedValue('tok-123');
    const { native, onUnauthorized, fetch } = await install();
    native.mockResolvedValue(new Response('{}', { status: 401 }));

    await fetch('/api/admin/routes');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('installAuthFetch — other modes', () => {
  it('open mode passes /api requests through untouched, no token lookup', async () => {
    getAuthMode.mockReturnValue('open');
    const { native, fetch } = await install();

    await fetch('/api/admin/routes');

    expect(getIdToken).not.toHaveBeenCalled();
    expect(native.mock.calls[0]?.[1]).toBeUndefined();
  });

  it('firebase mode leaves non-/api requests untouched', async () => {
    getAuthMode.mockReturnValue('firebase');
    const { native, fetch } = await install();

    await fetch('/assets/logo.svg');

    expect(getIdToken).not.toHaveBeenCalled();
    expect(native.mock.calls[0]?.[1]).toBeUndefined();
  });
});
