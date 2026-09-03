/**
 * Global `window.fetch` wrapper doing two things for every `/api/*` request:
 *
 *  1. Re-point it at an absolute backend origin, when one is configured.
 *  2. Attach the Firebase ID token (firebase auth mode only).
 *
 * Why a global monkeypatch: the app makes ~73 backend calls across ~30 files as
 * bare relative `fetch('/api/...')` with no central client and no
 * WebSocket/EventSource. Wrapping the one network primitive covers every call
 * site (current and future) with zero per-file edits.
 *
 * ── On the absolute origin ────────────────────────────────────────────────
 * Relative `/api/*` works wherever something maps that path to FastAPI: the
 * Vite dev proxy locally, and same-origin serving on Cloud Run (one container
 * serves the SPA and the API). It does NOT work on a host that serves a static
 * build with SPA history-fallback — there `/api/live/quote/IWM` returns
 * index.html with `200 text/html`, so `r.json()` throws and every page shows
 * as broken. A Lovable preview does exactly this (confirmed via HAR).
 *
 * Setting `VITE_API_BASE_URL` at build time rewrites those calls to an
 * absolute origin instead. Leave it UNSET for local dev and Cloud Run, where
 * same-origin is correct and cheaper — this is a strict no-op when empty.
 *
 * Lovable hosts are detected at runtime so no build-time env var has to be set
 * there. The dev-server probe in vite.config.ts cannot cover this: it runs in
 * Node when the dev server boots and only configures a proxy, whereas a static
 * build has neither. The hostname is the one signal available in the browser.
 *
 * NOTE: a cross-origin base makes these calls subject to CORS. The backend
 * must send `Access-Control-Allow-Origin` for the host serving the SPA (and
 * allow the `Authorization` header on preflight), or the browser blocks them.
 */
import { getCurrentUid, getIdToken } from './firebase';
import { getAuthMode } from './runtimeConfig';
import { STAGING_API, isStaticFrontendHost } from './apiTargets';
import { markAuthBlocked, clearAuthBlocked } from './authGate';

// Paths the backend answers WITHOUT auth (api/auth._OPEN_API_PREFIXES — keep
// in sync), so the sign-in screen, shell, and public landing page can work.
// Open ≠ anonymous: the ID token still attaches when present, because
// /api/me resolves a presented bearer token server-side
// (auth.current_user_email) to the real email + is_admin. This list decides
// which 401s mean "signed out", and (with isIdentityPath) which requests may
// still go out anonymously when token acquisition fails.
const OPEN_PREFIXES = ['/api/health', '/api/me', '/api/config/firebase', '/api/waitlist'];

/**
 * Absolute origin for `/api/*`, or '' to keep requests same-origin.
 *
 * Explicit env var wins, so any host can be pointed anywhere. Otherwise
 * `*.lovable.app` — preview and published alike — gets staging, because those
 * are static hosts that would answer `/api/*` with index.html. Everything else
 * (local dev behind the Vite proxy, Cloud Run serving SPA and API from one
 * container) stays same-origin.
 */
function resolveApiBase(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
  if (explicit) return explicit;
  if (typeof window !== 'undefined' && isStaticFrontendHost(window.location.hostname)) {
    return STAGING_API;
  }
  return '';
}

// Trailing slash trimmed so `${API_BASE}${path}` never doubles up.
const API_BASE = resolveApiBase();

let _installed = false;
let _onUnauthorized: (() => void) | null = null;

/** Register a callback invoked when a gated /api/* call returns 401. */
export function setOnUnauthorized(cb: () => void): void {
  _onUnauthorized = cb;
}

function pathOf(input: RequestInfo | URL): string {
  try {
    if (typeof input === 'string') {
      return input.startsWith('http') ? new URL(input).pathname : input;
    }
    if (input instanceof URL) return input.pathname;
    if (input instanceof Request) return new URL(input.url, window.location.origin).pathname;
  } catch {
    /* fall through */
  }
  return '';
}

function isGatedApiPath(path: string): boolean {
  if (!path.startsWith('/api/')) return false;
  return !OPEN_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/**
 * Paths whose RESPONSE is the identity (or data keyed to it): /api/me and
 * everything under it. Open in the auth sense, but never safe to downgrade
 * to anonymous — an anonymous answer here is fabricated data, not a public
 * resource.
 */
function isIdentityPath(path: string): boolean {
  return path === '/api/me' || path.startsWith('/api/me/');
}

/**
 * Rewrite a relative `/api/*` request onto API_BASE. No-op when API_BASE is
 * empty, when the path isn't `/api/*`, or when the caller already passed an
 * absolute URL (it chose an origin deliberately — don't second-guess it).
 */
function withApiBase(input: RequestInfo | URL): RequestInfo | URL {
  if (!API_BASE) return input;

  if (typeof input === 'string') {
    return input.startsWith('/api/') ? `${API_BASE}${input}` : input;
  }
  if (input instanceof Request) {
    const path = new URL(input.url, window.location.origin).pathname;
    if (!path.startsWith('/api/')) return input;
    // Same-origin absolute already → rewrite; a Request is immutable, so clone
    // it onto the new URL, preserving method/body/headers/credentials.
    const url = new URL(input.url, window.location.origin);
    if (url.origin !== window.location.origin) return input;
    return new Request(`${API_BASE}${url.pathname}${url.search}`, input);
  }
  // URL instance
  if (input.origin === window.location.origin && input.pathname.startsWith('/api/')) {
    return new URL(`${API_BASE}${input.pathname}${input.search}`);
  }
  return input;
}

export function installAuthFetch(): void {
  if (_installed || typeof window === 'undefined') return;
  _installed = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Base rewrite happens for EVERY mode — a static host serving the SPA has
    // no /api route regardless of how auth is configured.
    const target = withApiBase(input);
    const path = pathOf(input);
    const gated = isGatedApiPath(path);

    // Track gated-call outcomes in every auth mode so data cards can show a
    // "Sign in to load data" empty state on 401 instead of rendering blank.
    const track = (resp: Response): Response => {
      if (resp.status === 401) markAuthBlocked();
      else if (resp.ok) clearAuthBlocked();
      return resp;
    };

    if (getAuthMode() !== 'firebase' || !path.startsWith('/api/')) {
      const resp = await nativeFetch(target, init);
      return gated ? track(resp) : resp;
    }

    // Attach the identity to EVERY /api request when signed in, the
    // OPEN_PREFIXES paths included — see the note on OPEN_PREFIXES. Skipping
    // the header on /api/me left the role-based admin gate reading an
    // anonymous identity forever.
    //
    // Resolving null means genuinely signed out: open paths proceed
    // anonymously, gated paths will 401 into the sign-in flow. A REJECTED
    // lookup is neither — retry once with a forced refresh (the SDK remedy
    // for a stale cached token). If that also fails, what happens depends on
    // whether anonymity changes the request's meaning:
    //  - identity paths (/api/me…): reject — an anonymous answer is
    //    fabricated data that useUser would cache for its whole staleTime;
    //  - gated paths: reject — sending without the header guarantees a 401
    //    that would bounce the user to sign-in over a transient blip;
    //  - public open paths (health, config, waitlist): proceed anonymously —
    //    the backend serves them identically without identity, and failing
    //    them would misreport a reachable server as down.
    // The uid at request initiation. A forced-refresh retry takes long enough
    // for a cross-tab account switch to land, and getIdToken(true) mints a
    // token for whoever is signed in AT RETRY TIME — without this check, a
    // request initiated as account A could go out carrying B's token.
    const uidAtStart = await getCurrentUid();
    let token: string | null;
    try {
      token = await getIdToken();
    } catch {
      try {
        token = await getIdToken(true);
      } catch (err) {
        if (isIdentityPath(path) || isGatedApiPath(path)) throw err;
        token = null;
      }
      if (token !== null && (await getCurrentUid()) !== uidAtStart) {
        if (isIdentityPath(path) || isGatedApiPath(path)) {
          throw new Error('signed-in account changed during token refresh');
        }
        token = null; // public path: proceed, but never with the other account's token
      }
    }
    const withToken = (t: string): RequestInit => {
      // Merge onto existing headers (preserve Content-Type and friends).
      const headers = new Headers(
        init?.headers ?? (target instanceof Request ? target.headers : undefined),
      );
      headers.set('Authorization', `Bearer ${t}`);
      return { ...init, headers };
    };

    const nextInit = token ? withToken(token) : init;

    let resp = await nativeFetch(target, nextInit);

    // A gated 401 while a user IS signed in usually means the cached ID token
    // went stale (hour-long expiry, a sleeping tab, clock skew) rather than a
    // real sign-out. Mint a fresh token and retry ONCE before declaring the
    // session dead: without this the user gets bounced to the sign-in screen
    // repeatedly despite a perfectly valid Firebase session.
    //
    // Only retried when a token was actually sent (so it isn't a plain
    // anonymous 401) and the body is replayable (a streamed body cannot be
    // re-sent).
    if (resp.status === 401 && gated && token && isReplayable(init, target)) {
      let fresh: string | null = null;
      try {
        fresh = await getIdToken(true);
      } catch {
        fresh = null;
      }
      if (fresh && fresh !== token && (await getCurrentUid()) === uidAtStart) {
        resp = await nativeFetch(target, withToken(fresh));
      }
    }

    // Only gated paths signal "signed out": an open path answers without auth
    // by design, so a 401 from one is a server bug, not an expired session.
    if (resp.status === 401 && gated && _onUnauthorized) _onUnauthorized();
    return gated ? track(resp) : resp;
  };
}

/** A request can only be re-sent when its body isn't a one-shot stream. */
function isReplayable(init: RequestInit | undefined, target: RequestInfo | URL): boolean {
  if (target instanceof Request) return !target.bodyUsed && !(target.body instanceof ReadableStream);
  const body = init?.body;
  if (body == null) return true;
  return !(typeof ReadableStream !== 'undefined' && body instanceof ReadableStream);
}

