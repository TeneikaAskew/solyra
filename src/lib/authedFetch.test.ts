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
const getCurrentUid = vi.fn();
const getAuthMode = vi.fn();

vi.mock('./firebase', () => ({
  getIdToken: (forceRefresh?: boolean) => getIdToken(forceRefresh),
  getCurrentUid: () => getCurrentUid(),
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
  getCurrentUid.mockReset();
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

  it('aborts a gated request when the account switches during the forced retry', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValueOnce('uid-A').mockResolvedValueOnce('uid-B');
    getIdToken
      .mockRejectedValueOnce(new Error('refresh blip'))
      .mockResolvedValueOnce('tok-of-B');
    const { native, fetch } = await install();

    await expect(fetch('/api/admin/routes')).rejects.toThrow(
      'signed-in account changed during token refresh',
    );
    expect(native).not.toHaveBeenCalled();
  });

  it('strips the token instead when the account switches and the path is public', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValueOnce('uid-A').mockResolvedValueOnce('uid-B');
    getIdToken
      .mockRejectedValueOnce(new Error('refresh blip'))
      .mockResolvedValueOnce('tok-of-B');
    const { native, fetch } = await install();

    await fetch('/api/health');

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

describe('installAuthFetch — stale token retry', () => {
  it('retries a gated 401 once with a force-refreshed token and does not report signed-out on success', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValue('uid-1');
    getIdToken.mockImplementation(async (force?: boolean) => (force ? 'tok-fresh' : 'tok-stale'));
    const { native, onUnauthorized, fetch } = await install();
    native
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const resp = await fetch('/api/admin/routes');

    expect(resp.status).toBe(200);
    expect(native).toHaveBeenCalledTimes(2);
    expect(new Headers((native.mock.calls[1]?.[1] as RequestInit)?.headers).get('Authorization')).toBe(
      'Bearer tok-fresh',
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('reports signed-out when the refreshed token also 401s, and retries only once', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValue('uid-1');
    getIdToken.mockImplementation(async (force?: boolean) => (force ? 'tok-fresh' : 'tok-stale'));
    const { native, onUnauthorized, fetch } = await install();
    native.mockResolvedValue(new Response('{}', { status: 401 }));

    await fetch('/api/admin/routes');

    expect(native).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('installAuthFetch — the verify-email 403', () => {
  const verify403 = () =>
    new Response(JSON.stringify({ detail: 'verify your email to continue' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });

  function signedInAs(uid: string) {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValue(uid);
    getIdToken.mockResolvedValue(`tok-${uid}`);
  }

  it('marks verification required for the signed-in uid and clears a stale auth-blocked flag', async () => {
    signedInAs('uid-a');
    const { native, fetch } = await install();
    const gate = await import('./authGate');
    gate.markAuthBlocked();
    native.mockResolvedValueOnce(verify403());

    const resp = await fetch('/api/glossary');

    expect(gate.isVerificationRequired('uid-a')).toBe(true);
    expect(gate.isVerificationRequired('uid-b')).toBe(false);
    expect(gate.isAuthBlocked()).toBe(false);
    // The caller still reads the body the server sent.
    expect(resp.status).toBe(403);
    expect(await resp.json()).toEqual({ detail: 'verify your email to continue' });
  });

  it('leaves both flags alone on a 403 with any other detail', async () => {
    signedInAs('uid-a');
    const { native, fetch } = await install();
    const gate = await import('./authGate');
    gate.markAuthBlocked();
    native.mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'this account is not allowed' }), { status: 403 }));

    await fetch('/api/glossary');

    expect(gate.isVerificationRequired('uid-a')).toBe(false);
    expect(gate.isAuthBlocked()).toBe(true);
  });

  it('clears the flag on the next successful gated response', async () => {
    signedInAs('uid-a');
    const { native, fetch } = await install();
    const gate = await import('./authGate');
    native.mockResolvedValueOnce(verify403()).mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await fetch('/api/glossary');
    expect(gate.isVerificationRequired('uid-a')).toBe(true);
    await fetch('/api/glossary');
    expect(gate.isVerificationRequired('uid-a')).toBe(false);
  });

  it("a late success from account A does not erase account B's flag", async () => {
    signedInAs('uid-a');
    const { native, fetch } = await install();
    const gate = await import('./authGate');
    // A's request is in flight when the tab switches to B, whose call 403s first.
    let releaseA: (r: Response) => void = () => {};
    native.mockImplementationOnce(() => new Promise<Response>((res) => (releaseA = res)));
    const aInFlight = fetch('/api/glossary');
    await vi.waitFor(() => expect(native).toHaveBeenCalledTimes(1));

    getCurrentUid.mockResolvedValue('uid-b');
    getIdToken.mockResolvedValue('tok-uid-b');
    native.mockResolvedValueOnce(verify403());
    await fetch('/api/glossary');
    expect(gate.isVerificationRequired('uid-b')).toBe(true);

    releaseA(new Response('{}', { status: 200 }));
    await aInFlight;
    expect(gate.isVerificationRequired('uid-b')).toBe(true);
  });

  it('treats /api/me/preferences as gated, matching the server, while /api/me stays open', async () => {
    signedInAs('uid-a');
    const { native, onUnauthorized, fetch } = await install();
    const gate = await import('./authGate');

    native.mockResolvedValueOnce(verify403());
    await fetch('/api/me/preferences');
    expect(gate.isVerificationRequired('uid-a')).toBe(true);

    native.mockResolvedValue(new Response('{}', { status: 401 }));
    await fetch('/api/me');
    expect(onUnauthorized).not.toHaveBeenCalled();
    await fetch('/api/me/preferences');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
