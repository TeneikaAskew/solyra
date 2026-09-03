// @vitest-environment jsdom
/**
 * `isGatedApiPath` decides which requests MUST carry the Firebase ID token
 * and which 401s mean "session gone". Its lists must mirror the backend's
 * `_OPEN_API_EXACT` / `_OPEN_API_PREFIXES` (stocks repo, api/auth.py) — a
 * drift in either direction breaks auth.
 *
 * Two regressions pinned here:
 *  - `/api/me` used to be a prefix match, so `/api/me/preferences` (a gated,
 *    per-user endpoint) was classified open and every preferences call went
 *    out tokenless → guaranteed 401.
 *  - the token was only attached to GATED paths, so `/api/me` (open, but the
 *    server resolves identity from the bearer when present) always reported
 *    a signed-in user as anonymous (`email: null`, `is_admin: false`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({ getIdToken: vi.fn() }));
vi.mock('./runtimeConfig', () => ({ getAuthMode: vi.fn() }));

import { getIdToken } from './firebase';
import { getAuthMode } from './runtimeConfig';
import { installAuthFetch, isGatedApiPath, setOnUnauthorized } from './authedFetch';

describe('isGatedApiPath', () => {
  it('leaves the exact pre-auth probe paths open', () => {
    expect(isGatedApiPath('/api/me')).toBe(false);
    expect(isGatedApiPath('/api/health')).toBe(false);
    expect(isGatedApiPath('/api/config/firebase')).toBe(false);
  });

  it('gates /api/me sub-paths — /api/me is an EXACT entry, not a prefix', () => {
    expect(isGatedApiPath('/api/me/preferences')).toBe(true);
    expect(isGatedApiPath('/api/me/anything')).toBe(true);
  });

  it('gates siblings that merely start with the string "/api/me"', () => {
    expect(isGatedApiPath('/api/messages')).toBe(true);
  });

  it('gates ordinary API paths', () => {
    expect(isGatedApiPath('/api/live/quote/IWM')).toBe(true);
    expect(isGatedApiPath('/api/journal/trades/SPY')).toBe(true);
  });

  it('ignores non-API paths entirely', () => {
    expect(isGatedApiPath('/assets/app.js')).toBe(false);
    expect(isGatedApiPath('/')).toBe(false);
  });
});

// ── The installed wrapper ────────────────────────────────────────────────────
// The wrapper captures window.fetch ONCE at install and installs ONCE per
// module, so a stable dispatcher delegates to a per-test `nativeCalls` sink.

type NativeCall = { input: RequestInfo | URL; init?: RequestInit };
let nativeCalls: NativeCall[] = [];
let respond: () => Response = () => new Response('{}', { status: 200 });

window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  nativeCalls.push({ input, init });
  return respond();
}) as typeof fetch;
installAuthFetch();

function sentAuthHeader(): string | null {
  const init = nativeCalls[nativeCalls.length - 1]?.init;
  return new Headers(init?.headers).get('authorization');
}

describe('installAuthFetch token attachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativeCalls = [];
    respond = () => new Response('{}', { status: 200 });
    setOnUnauthorized(() => {});
    vi.mocked(getAuthMode).mockReturnValue('firebase');
    vi.mocked(getIdToken).mockResolvedValue('tok-123');
  });

  it('attaches the token to gated paths (/api/me/preferences)', async () => {
    await window.fetch('/api/me/preferences');
    expect(sentAuthHeader()).toBe('Bearer tok-123');
  });

  it('attaches the token to OPEN paths too — /api/me must report identity', async () => {
    await window.fetch('/api/me');
    expect(sentAuthHeader()).toBe('Bearer tok-123');
  });

  it('sends the request bare when signed out (getIdToken → null)', async () => {
    vi.mocked(getIdToken).mockResolvedValue(null);
    await window.fetch('/api/me/preferences');
    expect(sentAuthHeader()).toBeNull();
  });

  it('leaves non-firebase modes untouched', async () => {
    vi.mocked(getAuthMode).mockReturnValue('open');
    await window.fetch('/api/live/quote/IWM');
    expect(sentAuthHeader()).toBeNull();
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it('leaves non-API paths untouched', async () => {
    await window.fetch('/assets/app.js');
    expect(sentAuthHeader()).toBeNull();
    expect(getIdToken).not.toHaveBeenCalled();
  });

  it('fires onUnauthorized for a 401 on a GATED path only', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    respond = () => new Response('{}', { status: 401 });

    await window.fetch('/api/me'); // open — a 401 here is not "session gone"
    expect(onUnauthorized).not.toHaveBeenCalled();

    await window.fetch('/api/me/preferences'); // gated — prompt sign-in
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
