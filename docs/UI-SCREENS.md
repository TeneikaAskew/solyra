<!-- Moved from the stocks repo (TeneikaAskew/stocks) when the frontend
     split out into this one. Paths were rewritten for this layout: what was
     `platform/src/...` is now `src/...`.

     Any remaining `platform/...` path is a STOCKS path and is left as-is on
     purpose — `platform/api/`, `platform/Dockerfile`, `platform/deploy.sh` and
     `platform/dist/` are the backend and its build, which stayed there. -->

# UI Screen Inventory

**Last reviewed:** 2026-08-30 · **Last scanned:** 2026-09-16 · **Owner:** TBD

**VERIFIED — CODE.** 15 routes declared in `src/App.tsx:44-72`. `/` is public;
`/welcome` redirects; the other 13 are children of `<AuthGate><AppShell/></AppShell>`.
All page components are `lazy()`-loaded behind `<Suspense fallback={<PageLoader/>}>` with a
shared `RouteErrorBoundary`. React Query defaults to five-minute staleness and one retry.
**Authentication is an in-route sign-in state (`SignInScreen`), not a `/login` route.**

State columns below are **detected in the page source**, not assumed: `load` = a loading or
skeleton branch, `err` = an error branch, `empty` = an empty-result branch, `stale` = any
freshness/as-of/demo-data affordance. A missing marker is a concrete gap to close, not a
statement that the screen is broken.

## Live URLs

**CORRECTED 2026-09-05.** This table previously listed every screen under
`solyra-api-prod-…run.app` and carried a VERIFIED badge. That was wrong, and the badge
covered less than the claim: the 2026-08-30 probe only established that an unauthenticated
request redirects to Google SSO, which IAP answers at the edge before the app is reached. It
never established that those URLs serve these screens.

They do not. Since the #957 split the API image contains no `dist/` — `platform/Dockerfile`
copies none and `main.py` mounts the SPA only when `platform/dist` exists — so the API
services serve `/api/*` only. Probed 2026-09-05 against `solyra-api-staging`, which runs the
same image without IAP in front:

```
/           HTTP 404  {"detail":"Not Found"}
/dashboard  HTTP 404  {"detail":"Not Found"}
/charts     HTTP 404  {"detail":"Not Found"}
/api/health HTTP 200
```

The SPA is served by Lovable at `https://solyra-stocks.lovable.app` (HTTP 200, probed
2026-09-05), which calls the API cross-origin at `STAGING_API` via `authedFetch`. Full
environment inventory is in
[05](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/05-INFRASTRUCTURE.md#environments-and-urls).

| Screen | Route | Published URL (Lovable) | Local dev |
|---|---|---|---|
| Landing | `/` | `https://solyra-stocks.lovable.app/` | `http://localhost:5173/` |
| Welcome redirect | `/welcome` | `https://solyra-stocks.lovable.app/welcome` | `http://localhost:5173/welcome` |
| Dashboard | `/dashboard` | `https://solyra-stocks.lovable.app/dashboard` | `http://localhost:5173/dashboard` |
| Live Market | `/live` | `https://solyra-stocks.lovable.app/live` | `http://localhost:5173/live` |
| Charts | `/charts` | `https://solyra-stocks.lovable.app/charts` | `http://localhost:5173/charts` |
| Options Flow | `/options` | `https://solyra-stocks.lovable.app/options` | `http://localhost:5173/options` |
| Playbook | `/playbook` | `https://solyra-stocks.lovable.app/playbook` | `http://localhost:5173/playbook` |
| Reports | `/reports` | `https://solyra-stocks.lovable.app/reports` | `http://localhost:5173/reports` |
| Signals | `/signals` | `https://solyra-stocks.lovable.app/signals` | `http://localhost:5173/signals` |
| Journal | `/journal` | `https://solyra-stocks.lovable.app/journal` | `http://localhost:5173/journal` |
| AI Insights | `/insights` | `https://solyra-stocks.lovable.app/insights` | `http://localhost:5173/insights` |
| Catalysts | `/catalysts` | `https://solyra-stocks.lovable.app/catalysts` | `http://localhost:5173/catalysts` |
| Admin | `/admin` | `https://solyra-stocks.lovable.app/admin` | `http://localhost:5173/admin` |
| Help & Glossary | `/help` | `https://solyra-stocks.lovable.app/help` | `http://localhost:5173/help` |
| Settings | `/settings` | `https://solyra-stocks.lovable.app/settings` | `http://localhost:5173/settings` |

Operational endpoints are served by the API, not the frontend host, so they live on the Cloud Run
services: `/dev` (the unauthenticated-on-staging page — see
[09](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/09-SECURITY-AUTH.md)),
`/api/health` and `/api/health/freshness`, on
`https://solyra-api-staging-5sjtb3yl7a-ue.a.run.app` (public, Firebase-gated) or
`https://solyra-api-prod-5sjtb3yl7a-ue.a.run.app` (behind IAP).
In local development the Vite server proxies `/api` to `http://localhost:8000`
(`vite.config.ts:21,27`), so the API is reachable at both ports.

## Screen inventory

| Screen | Route | Component | LOC | APIs | Child cmpts | load | err | empty | stale | E2E specs | Status |
|---|---|---|---|---|---|:--:|:--:|:--:|:--:|---|---|
| Landing | `/` | `LandingPage` | 40 | 0 | 8 | — | — | — | — | 2 | Production |
| Navigate | `/welcome` | `Navigate` | 0 | 0 | 0 | — | — | — | — | **0** | Production |
| Dashboard | `/dashboard` | `DashboardPage` | 843 | 7 | 14 | ✓ | ✓ | ✓ | ✓ | 4 | Production but needs remediation |
| LiveMarket | `/live` | `LiveMarketPage` | 411 | 1 | 1 | — | ✓ | ✓ | ✓ | 2 | Production but needs remediation |
| Charts | `/charts` | `ChartsPage` | 967 | 0 | 8 | ✓ | ✓ | ✓ | ✓ | 3 | Production but needs remediation |
| OptionsFlow | `/options` | `OptionsFlowPage` | 68 | 0 | 1 | — | — | — | — | 2 | Production but needs remediation |
| Playbook | `/playbook` | `PlaybookPage` | 355 | 2 | 2 | ✓ | ✓ | ✓ | ✓ | 1 | Broken |
| Reports | `/reports` | `ReportsPage` | 153 | 2 | 0 | ✓ | ✓ | ✓ | ✓ | 2 | Production but needs remediation |
| Signals | `/signals` | `SignalsPage` | 341 | 1 | 3 | ✓ | ✓ | ✓ | ✓ | 1 | Production but needs remediation |
| Journal | `/journal` | `JournalPage` | 945 | 2 | 10 | ✓ | ✓ | ✓ | ✓ | 3 | Production but needs remediation |
| Insights | `/insights` | `InsightsPage` | 587 | 1 | 14 | ✓ | ✓ | ✓ | ✓ | 1 | Experimental |
| Catalysts | `/catalysts` | `CatalystsPage` | 625 | 2 | 0 | ✓ | ✓ | — | ✓ | 1 | Production but needs remediation |
| Admin | `/admin` | `AdminPage` | 369 | 1 | 3 | ✓ | ✓ | — | — | 2 | Production but needs remediation |
| Help | `/help` | `HelpPage` | 296 | 0 | 0 | — | — | ✓ | — | 1 | Production |
| Settings | `/settings` | `SettingsPage` | 131 | 0 | 0 | — | — | ✓ | — | **0** | Incomplete |

### Gaps visible from this table

- **`/settings` has zero E2E coverage and zero API calls.** It reads `useThemeStore` and
  `useSettingsStore`, which persist to **`localStorage`** (`src/stores/settingsStore.ts:48,68`)
  — the page header comment says so at line 8. It is **device-local, not user-owned server state**.
  Any ownership, sync or backend-test work planned against `/api/config` or `watchlists` for this
  screen would target the wrong layer.
- **`/options` is a 68-line wrapper** with no loading, error, empty or stale branch of its own;
  all behavior lives in child components. Its states must be verified there, not here.
- **`/admin` has no empty or stale affordance**, and **`/help` has only an empty branch**.
- `/welcome` is a one-line `<Navigate to="/" replace />` — it is a redirect, not a screen, and
  carries no independent requirements.

### Cross-cutting specs

Five specs cover behavior spanning screens rather than one route:
`auth-gate.spec.ts`, `navigation.spec.ts`, `api-smoke.spec.ts`, `data-pipeline-status.spec.ts`,
`dev.spec.ts`. Note `dev.spec.ts` does **not** exercise the public-staging configuration in which
`/dev` is unauthenticated — see [09](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/09-SECURITY-AUTH.md).
Plus **27 Vitest component tests** under `src/**/*.test.*`. Both suites run in CI on pull
requests and on pushes to `main`, the `checks` and `e2e` jobs in `.github/workflows/ci.yml`.

The matrix's [SHARED area](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#00--shared-under-every-page) traces the infrastructure every screen inherits and this document does not repeat per screen: the API service and auth middleware, the authedFetch data path, mock mode, React Query defaults, the failure lane and the freshness watchdog.

#### Elements
##### SHARED-01 · API service and auth middleware (solyra-api-staging, solyra-api-prod, AUTH_MODE)

**Shows or does:** No UI of its own. `platform/api/auth.py` is global ASGI middleware
(`app.middleware("http")(auth_middleware)`, `platform/api/main.py:97`) that gates every
`/api/*` request except the open prefixes (SHARED-02). Three modes, set by the `AUTH_MODE`
env var and validated once at process start: `open` (local dev, a no-op), `firebase` (bearer
token verified per request, the public `solyra-api-staging` service), `iap` (pass-through,
identity read from the `X-Goog-Authenticated-User-Email` header IAP injects at the edge, the
`solyra-api-prod` service). On the frontend, `ConfigGate` fetches `GET /api/config/firebase`
once at boot and blocks every gated route behind it: `loading` while the fetch is in flight,
`ready` once a valid `authMode` is parsed, or the fail loud `ConfigErrorScreen`
(`data-testid="config-error"`) on any network error, non 2xx status or unparseable body.

**Needs:**
- `GET /api/config/firebase` returning `RuntimeConfigResponse { authMode: "open" | "firebase" | "iap", firebase?: { apiKey, authDomain, projectId, appId } }` (`platform/api/schemas.py:200-207`)
- env `AUTH_MODE` on the Cloud Run service (`solyra-api-staging` firebase, `solyra-api-prod` iap)
- env `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` (firebase mode only)

**States:**
- `open`: every request passes through unchecked (local dev only)
- `firebase`, no or invalid token on a gated path: 401 `{"detail":"sign in to continue"}` or `{"detail":"invalid or expired sign-in"}`
- `firebase`, valid token, disallowed email: 403 `{"detail":"this account is not allowed"}`
- `iap`: pass-through, identity trusted from the edge header
- frontend boot: `loading`, then `ready` or `error` (`ConfigGate.tsx`)

**Acceptance criteria:**
- Given `AUTH_MODE=open`, when any `/api/*` request arrives, then `auth_middleware` calls through without checking a token and `request.state.user_email` stays `None` (`test_open_mode_is_noop`).
- Given `AUTH_MODE=firebase` and no `Authorization` header, when a gated path such as `/api/market/most-active` is requested, then the response is 401 with `{"detail":"sign in to continue"}` (`test_firebase_requires_valid_token`; confirmed live 2026-09-28, see V evidence).
- Given `AUTH_MODE=firebase` and a valid bearer token for an allowed email, when a gated path is requested, then the response is 200 and `request.state.user_email` is the verified, lower cased email (`test_firebase_requires_valid_token`).
- Given an `AUTH_MODE` value outside `("open", "firebase", "iap")`, when the API process starts, then `_validated_auth_mode` raises `RuntimeError` and the service refuses to boot rather than silently serving every route ungated (`platform/api/auth.py:44-53`).
- Given `GET /api/config/firebase` fails, returns a non 2xx status, or returns a body whose `authMode` is not one of the three literals, when `ConfigGate` awaits `fetchRuntimeConfig`, then it renders `ConfigErrorScreen` (`data-testid="config-error"`) instead of any gated route (`ConfigGate.tsx`, `describeBootFailure`, `fetchRuntimeConfig`).

**Tests:** `tests/api/test_platform_auth.py::test_open_mode_is_noop`, `::test_iap_mode_reads_header_and_does_not_enforce`, `::test_firebase_requires_valid_token`; `tests/api/test_route_coverage.py`; solyra `tests/shared/auth-gate.spec.ts` runs hermetically in ci.yml's `e2e (chromium, mocked)` job, but this citation names no specific assertion of this row's own behavior (see AUTH-01 for the narrower, named tests that do), so it stays presence-only here.

**Code:** `platform/api/auth.py:41-55` (`_VALID_AUTH_MODES`, `_validated_auth_mode`, `AUTH_MODE`), `:180-213` (`_path_requires_auth`, `auth_middleware`); `platform/api/main.py:97` (middleware registration); `platform/api/routers/config.py:45-68` (`get_firebase_config`); solyra `src/components/auth/ConfigGate.tsx` (`bootOnce`, `fetchRuntimeConfig`, `ConfigErrorScreen`); `src/lib/runtimeConfig.ts`.

##### SHARED-02 · Open prefixes kept in sync (api/auth.py and authedFetch OPEN_PREFIXES)

**Shows or does:** Two independent lists decide which `/api/*` paths work without a signed in
user, one per side of the split, and they are deliberately not identical. Backend
(`platform/api/auth.py:62-70`): `_OPEN_API_EXACT = ("/api/me",)` matches the literal path
only, so `/api/me` itself is open but every sub-path (`/api/me/preferences`) is gated;
`_OPEN_API_PREFIXES = ("/api/health", "/api/config/firebase", "/api/waitlist")` matches the
path or anything starting with it. Frontend (`src/lib/authedFetch.ts:45`):
`OPEN_PREFIXES = ['/api/health', '/api/me', '/api/config/firebase', '/api/waitlist']` is one
list, prefix matched for all four entries including `/api/me`, broader than the backend's
exact match rule for that one path. The frontend closes the gap with a second, narrower
check: `isIdentityPath` (`/api/me` or `/api/me/*`) forces the wrapper to throw rather than
send anonymously when token acquisition fails, regardless of what `OPEN_PREFIXES` says, and
the wrapper attaches a present token to every `/api/*` request (open or gated) when one is
available, so a signed in caller's `/api/me` reply is never anonymous. The same gated/open
classification also decides which 401s mean anything: `authedFetch` only runs a response
through `track()` (`src/lib/authedFetch.ts:156-158`) when `isGatedApiPath` called the request
gated, so a 401 from a gated path calls `markAuthBlocked()` and may trigger the registered
`onUnauthorized` callback, while a 401 from an open path such as `/api/me` never reaches
`track()` at all, so neither fires; an open path answering without a token is expected, not a
sign the session is blocked.

**Needs:** no endpoint of its own; every `/api/*` route depends on this classification
agreeing closely enough that a legitimate call is never mistakenly 401'd and no sub-path is
accidentally opened.

**States:**
- exact-open (backend `/api/me` only, sub-paths gated): `test_firebase_open_me_is_exact_match_and_subpaths_are_gated`
- prefix-open (backend `/api/health*`, `/api/config/firebase*`, `/api/waitlist*`)
- frontend open-classified with a token present (still attaches `Authorization`)
- frontend open-classified with no token (sent anonymously, except identity paths, which throw instead)
- gated path returns 401: `track()` calls `markAuthBlocked()`, session marked auth-blocked
- open path returns 401: `track()` never runs, `markAuthBlocked()` and `onUnauthorized` both stay silent

**Acceptance criteria:**
- Given `AUTH_MODE=firebase`, when `GET /api/me` is requested with no token, then the backend answers 200, open by exact match (`test_firebase_open_me_is_exact_match_and_subpaths_are_gated`).
- Given `AUTH_MODE=firebase`, when `GET /api/me/preferences` is requested with no token, then the backend answers 401, the sub-path is gated and not covered by the exact match (`test_firebase_open_me_is_exact_match_and_subpaths_are_gated`).
- Given `AUTH_MODE=firebase`, when `GET /api/messages` is requested (a path that merely starts with the string `/api/me`) with no token, then the backend answers 401, proving the exact match does not degrade into a prefix match (`test_firebase_open_me_is_exact_match_and_subpaths_are_gated`).
- Given a signed in user with a resolvable token, when the frontend fetches `/api/me` (an `OPEN_PREFIXES` entry), then `authedFetch` still attaches `Authorization: Bearer <token>` (`attaches the bearer token to OPEN-prefix paths like /api/me`).
- Given token acquisition fails persistently, when the frontend fetches `/api/me` or any `/api/me/*` path, then the wrapper throws instead of sending the request anonymously (`propagates a persistent token failure on the identity path instead of going anonymous`).
- Given a gated path (`isGatedApiPath` true), when the response status is 401, then `track()` calls `markAuthBlocked()`, marking the session auth-blocked (`src/lib/authedFetch.ts:156-158`).
- Given an open path such as `/api/me`, when the response status is 401, then the request never reaches `track()`, so `markAuthBlocked()` is not called and the registered `onUnauthorized` callback does not fire either (`a 401 from an OPEN path does not fire onUnauthorized`).

**Tests:** `tests/api/test_platform_auth.py::test_firebase_open_me_is_exact_match_and_subpaths_are_gated`; solyra `src/lib/authedFetch.test.ts` (`attaches the bearer token to OPEN-prefix paths like /api/me`, `propagates a persistent token failure on the identity path instead of going anonymous`, `a 401 from an OPEN path does not fire onUnauthorized`).

**Code:** `platform/api/auth.py:56-70` (the `_OPEN_API_EXACT`/`_OPEN_API_PREFIXES` comment and definitions), `:180-185` (`_path_requires_auth`); solyra `src/lib/authedFetch.ts:39-45` (`OPEN_PREFIXES`), `:89-102` (`isGatedApiPath`, `isIdentityPath`), `:156-158` (`track`, `markAuthBlocked`).

##### SHARED-03 · Data path: authedFetch, apiTargets, Vite proxy, staging fallback

**Shows or does:** Decides, per environment, what absolute origin (if any) a relative
`fetch('/api/...')` call actually reaches, so the same bundle works unmodified on Cloud Run
(same origin), local dev (Vite proxy) and Lovable's static hosting (cross origin to
staging). `src/lib/apiTargets.ts` is the single source for both origins (`LOCAL_API`,
`STAGING_API`) and the static-host detector (`isStaticFrontendHost`, matching `.lovable.app`
and `.lovableproject.com` suffixes), imported by both the Node side dev proxy
(`vite.config.ts`) and the browser side rewrite (`src/lib/authedFetch.ts`). In the browser,
`resolveApiBase()` picks, in order: an explicit build-time `VITE_API_BASE_URL`, then
`STAGING_API` when the hostname is a known static host, then same origin (`''`).
`withApiBase()` rewrites a relative `/api/*` call onto that base for the `string`, `Request`
and `URL` call shapes `window.fetch` accepts. In the dev server, `resolveApiTarget()` probes
`localhost:8000` with a raw TCP connect (300 ms timeout) and proxies to it when something
answers, else falls back to `STAGING_API`; `VITE_API_PROXY_TARGET` overrides the probe
unconditionally.

**Needs:**
- every `/api/*` call site in the app (about 73 bare `fetch('/api/...')` calls across about 30 files, per `CLAUDE.md`)
- `STAGING_API = 'https://solyra-api-staging-5sjtb3yl7a-ue.a.run.app'` (`src/lib/apiTargets.ts:29`)
- `LOCAL_API = 'http://localhost:8000'` (`src/lib/apiTargets.ts:22`)
- optional env `VITE_API_BASE_URL` (browser rewrite), `VITE_API_PROXY_TARGET` (dev server proxy only)

**States:**
- same origin (Cloud Run serving SPA and API from one container, or local dev behind the Vite proxy): `API_BASE = ''`
- static host fallback (a `*.lovable.app` / `*.lovableproject.com` visit): `API_BASE = STAGING_API`
- explicit override: `VITE_API_BASE_URL` set at build time
- dev server, local backend reachable: proxy target is `LOCAL_API`
- dev server, local backend unreachable: proxy target is `STAGING_API`, with a console warning that writes from that session hit staging

**Acceptance criteria:**
- Given the app is served from a `*.lovable.app` host, when a component calls `fetch('/api/health')`, then `resolveApiBase()` returns `STAGING_API` and the request that reaches the network is `STAGING_API + '/api/health'` (`resolveApiBase`, `withApiBase`, `src/lib/authedFetch.ts:52-129`).
- Given the app is served same origin, when a component calls `fetch('/api/health')`, then the request stays relative (`API_BASE` is `''`, `withApiBase` no-ops).
- Given `VITE_API_BASE_URL` is set at build time, when `resolveApiBase()` runs, then that value wins over the static host detection.
- Given nothing is listening on `localhost:8000` when the Vite dev server starts, when `resolveApiTarget()` probes it, then the proxy falls back to `STAGING_API` and logs the staging writes warning (`vite.config.ts:42-46`, `:99-102`).
- Given `VITE_API_PROXY_TARGET` is set, when the dev server starts, then that URL is used unconditionally without probing `localhost:8000` (`vite.config.ts:43-44`).

**Tests:** solyra `src/lib/authedFetch.test.ts` (`attaches the bearer token to gated paths` and the rest of the `installAuthFetch — firebase mode` suite exercise `withApiBase` and token attachment together). `vite.config.ts`'s dev proxy probe and `apiTargets.ts`'s suffix list have no colocated unit test; their only coverage today is this task's V evidence against the deployed staging service and the E2E `webServer` boot in `playwright.config.ts`, which depends on the same probe succeeding against its own dedicated port.

**Code:** `src/lib/apiTargets.ts` (`LOCAL_API`, `STAGING_API`, `STATIC_FRONTEND_HOST_SUFFIXES`, `isStaticFrontendHost`); `src/lib/authedFetch.ts:49-65` (`resolveApiBase`), `:109-129` (`withApiBase`); `vite.config.ts:19-46` (`localApiIsUp`, `resolveApiTarget`), `:71-102` (`VITE_NO_BACKEND` stub and logging).

##### SHARED-04 · Mock mode and demo-data banners

**Shows or does:** A per-browser, tri-state preference (`'on' | 'off' | unset`,
`localStorage['solyra-mock-mode']`) that, when `'on'`, makes `authedFetch` answer every
`/api/*` call from bundled fixtures instead of the network (`src/lib/authedFetch.ts:145-148`,
a dynamic `import('@/mocks')` resolving to `mockApiResponse`). An always visible amber banner
(`MockModeBanner.tsx`, `data-testid="mock-mode-banner"`) renders whenever the mode is active,
reading only `localStorage` so it stays available even if a fixture elsewhere breaks; it
states plainly that data is fixture only and offers an `Exit` button
(`data-testid="mock-mode-exit"`). A `dev` role account (server verified through `/api/me`'s
`is_dev` flag) auto-enters mock mode exactly once, the first time the preference is unset; an
explicit exit persists `'off'` and is never overridden by the auto-enable again. Toggling
reloads the page, and a `storage` event listener reloads sibling tabs so every open tab
converges on the same world.

**Needs:**
- `localStorage` key `solyra-mock-mode` (`'on'`, `'off'`, or absent)
- `/api/me`'s `is_dev` boolean (drives `autoEnableMockModeForDev`, not fetched by this module itself)
- the fixture engine under `src/mocks/` (`mockApiResponse`)

**States:**
- unset (default): `isMockModeActive()` is `false`, no banner, `authedFetch` behaves normally
- on: banner visible, every `/api/*` call short circuited to a fixture or a 501 for an unmatched route
- off (explicit exit): banner hidden, `autoEnableMockModeForDev` will not fire again in this browser
- storage write failure (private mode or blocked storage): `setMockMode` logs an error and does not reload, so the mode never silently half flips

**Acceptance criteria:**
- Given no stored preference, when `mockModePreference()` reads `localStorage`, then it returns `null` and `isMockModeActive()` is `false` (`is unset by default and inactive`).
- Given a `dev` role account signs in with the preference unset, when `autoEnableMockModeForDev()` runs, then it persists `'on'` and reloads the page (`enables once while the preference is unset`).
- Given mock mode is `'on'`, when any component calls `fetch('/api/...')`, then `authedFetch` returns `mockApiResponse()`'s result and no request reaches the network (`src/lib/authedFetch.ts:145-148`).
- Given mock mode is `'on'` and AppShell renders, then `MockModeBanner` shows the fixture only text and an `Exit` button (`MockModeBanner.tsx`, mounted at `src/components/layout/AppShell.tsx:67`).
- Given a user clicks `Exit`, when `setMockMode(false)` persists, then the page reloads and the preference stays `'off'`, so `autoEnableMockModeForDev` will not re-enable it for that browser (`never overrides an explicit exit`).
- Given mock mode is on and a requested path matches no fixture route, when `mockApiResponse()` runs, then it answers 501 with the offending path in the body (`src/mocks/index.ts:132`).

**Tests:** `src/lib/mockMode.test.ts` (`is unset by default and inactive`, `setMockMode(true) persists and reloads`, `setMockMode(false) persists the explicit exit`, `enables once while the preference is unset`, `never overrides an explicit exit`); `tests/shared/mock-mode.spec.ts` (Playwright, banner visibility and exit) runs hermetically in ci.yml's `e2e (chromium, mocked)` job; the matrix's Te entry for this row cites that job on main run 36361217691.

**Code:** `src/lib/mockMode.ts` (`mockModePreference`, `isMockModeActive`, `setMockMode`, `autoEnableMockModeForDev`); `src/lib/authedFetch.ts:139-148`; `src/components/shared/MockModeBanner.tsx`; `src/components/layout/AppShell.tsx:67`; `src/mocks/index.ts:132`.

##### SHARED-05 · React Query defaults (five-minute staleness, one retry)

**Shows or does:** One module-level `QueryClient` (`src/App.tsx:30-37`), created with
`defaultOptions.queries.staleTime = 5 * 60 * 1000` and `retry: 1`, wraps the whole router
through `QueryClientProvider` (`:103-105`). Every `useQuery` call in the app inherits these
unless it overrides them locally, so a query result is treated as fresh for five minutes (no
automatic refetch on remount or refocus inside that window) and a failed request is retried
exactly once before the query settles into its error state.

**Needs:** no endpoint or store of its own; it is configuration consumed by every other
data-fetching element in every area.

**States:**
- fresh (resolved less than five minutes ago): served from cache, no network request on remount
- stale (five minutes or older): eligible for a background refetch per TanStack Query's normal triggers
- failed, retrying: one automatic retry before the query reports `isError`
- failed, exhausted: `isError` true after the single retry also fails

**Acceptance criteria:**
- Given a query resolved less than five minutes ago, when a component using the same query key remounts, then TanStack Query serves the cached value without issuing a new request (`staleTime: 5 * 60 * 1000`, `src/App.tsx:33`).
- Given a query request fails, when TanStack Query's default retry logic runs, then it retries exactly once before the query surfaces as errored (`retry: 1`, `src/App.tsx:34`).
- Given no page creates its own `QueryClient`, when any route under `AppGroup` mounts, then it reads and writes the single client created in `App.tsx` (`QueryClientProvider`, `:103-105`).

**Tests:** none found. No test in `src/` imports `QueryClient`, asserts on `staleTime` or
`retry`, or otherwise exercises this configuration directly; this element does not tick Te in
this task.

**Code:** `src/App.tsx:1-3` (imports), `:30-37` (`queryClient`), `:103-105` (`QueryClientProvider`).

##### SHARED-06 · Failure lane: job log, Cloud Logging sink, Pub/Sub, failure-notifier, GitHub issue

**Shows or does:** Turns a Cloud Run Job's own failure into a Discord message and a tracked
GitHub issue without any job needing to know about either. Any Cloud Run Job execution that
logs a severity `ERROR` or higher (excluding the notifier's own job name and the
`CreateJob`/`UpdateJob` audit log noise every deploy produces) matches the Cloud Logging sink
`gcp-job-failures-sink`, which forwards the entry to the Pub/Sub topic `gcp-job-failures`. A
push subscription (`gcp-job-failures-push`, OIDC authenticated, five attempt dead letter to
`gcp-job-failures-dlq`) delivers it to the `failure-notifier` Cloud Run service
(`gcp/failure_notifier.py`), which posts to a dedicated Discord channel and creates or
updates a GitHub issue labelled `gcp-job-failure,<job_name>`; a second failure for the same
job comments on the existing open issue instead of opening a duplicate. A known benign
SQLAlchemy/pg8000 connection cleanup traceback is filtered out before either channel fires,
on the reasoning that the job's own exit code, not this log line, is the source of truth for
success. An hourly Cloud Scheduler trigger (`reconcile-failure-notifier-hourly`, `0 * * * *`
America/New_York) posts to the service's `/reconcile` endpoint, which closes any open
`gcp-job-failure` issue whose job's latest execution has since succeeded.

**Needs:**
- Cloud Logging sink `gcp-job-failures-sink` to Pub/Sub topic `gcp-job-failures` (verified live 2026-09-28, see V evidence)
- Pub/Sub push subscription `gcp-job-failures-push`, dead letter topic `gcp-job-failures-dlq`
- Cloud Run service `failure-notifier` (verified live 2026-09-28, `https://failure-notifier-5sjtb3yl7a-ue.a.run.app`)
- secrets `discord-webhook-gcp`, `github-pat`, `github-repo`
- Cloud Scheduler trigger `reconcile-failure-notifier-hourly`

**States:**
- healthy: no matching `ERROR` severity log, nothing published, silence
- new failure, first occurrence for that job: Discord message and a new GitHub issue
- new failure, an issue is already open for that job: Discord message and a comment on the existing issue, no new issue
- benign pool cleanup traceback: suppressed on both channels
- the notifier's own failure: suppressed (self-loop guard)
- recovered job: the hourly reconcile closes the open issue with a comment

**Acceptance criteria:**
- Given a Cloud Run Job execution logs a severity `ERROR` entry that is not a benign pool cleanup traceback and not the notifier's own job, when the sink's filter matches it, then the entry is published to the `gcp-job-failures` topic (`gcp/deploy.sh:4003-4015`, the sink filter and creation) and delivered to `failure-notifier` by the `gcp-job-failures-push` subscription (`gcp/deploy.sh:3950-3963`, its OIDC push endpoint and five-attempt dead letter to `gcp-job-failures-dlq`).
- Given no open issue exists yet for a failing job, when `handle_notification` runs, then it posts to Discord and creates a new issue labelled `gcp-job-failure,<job_name>` (`test_create_or_update_creates_new_issue_when_none_exists`).
- Given an open issue already exists for that job, when `handle_notification` runs again, then it posts to Discord and comments on the existing issue rather than opening a new one (`test_create_or_update_comments_on_existing_issue`).
- Given the log entry's innermost frame matches a benign pool cleanup marker, when `handle_notification` runs, then neither Discord nor GitHub is called (`test_handle_notification_suppresses_benign_pool_cleanup`).
- Given `reconcile-failure-notifier-hourly` fires `POST /reconcile`, when a previously failing job's latest execution has since succeeded, then `reconcile_closures` closes its open issue with a comment (`test_reconcile_closures_closes_recovered_jobs`).

**Tests:** `tests/gcp/test_failure_notifier.py` (`test_create_or_update_creates_new_issue_when_none_exists`, `test_create_or_update_comments_on_existing_issue`, `test_handle_notification_suppresses_benign_pool_cleanup`, `test_handle_notification_skips_self_loop`, `test_reconcile_closures_closes_recovered_jobs`, and the rest of the file).

**Code:** `gcp/failure_notifier.py:61` (`is_benign_pool_cleanup`), `:85` (`extract_failure_details`), `:206` (`send_discord`), `:256` (`close_issue`), `:451` (`reconcile_closures`), `:522` (`handle_notification`), `:580` (`handle_reconcile`); `gcp/deploy.sh:3805-3808` (service, topic, sub and sink names), `:3879` (`deploy_notifier`), `:3950-3963` (push subscription and dead letter), `:4003-4015` (sink filter and creation), `:4062` (scheduler trigger).

##### SHARED-07 · Freshness watchdog and /api/health/freshness

**Shows or does:** Two independent paths read the same freshness signal and must not be
conflated. First, the standalone `freshness-watchdog` Cloud Run Job runs
`scripts/audit_data_freshness.py --strict` on a schedule (`freshness-watchdog-hourly`,
`0 9-19 * * 1-5`; `freshness-watchdog-nightly`, `30 19 * * *`) and exits non-zero on any
stale table, which the failure lane (SHARED-06) turns into a Discord message and a GitHub
issue. Second, `GET /api/health/freshness` (`platform/api/routers/health.py:158`,
`get_freshness`) wraps the same `audit_data_freshness.audit_all()` behind a 300 second
in-process cache with a single-flight claim: the request that claims a stale or empty cache
runs the audit and returns the fresh report; every other concurrent request answers
immediately, either the previous report labelled `stale: true` with its age, or a 503
(`{"detail":"Freshness audit in progress and no cached report is available yet. Retry
shortly."}`) when nothing is cached yet. `GET /api/health/freshness` itself has no direct
solyra consumer today: the old Dashboard "data pipeline" widget that used to poll it was
retired in the stocks/solyra split, and a regression test pins its absence
(`tests/dashboard/data-pipeline-widget.spec.ts`, `dashboard renders without the
data-pipeline widget`). The same cached audit does reach the UI through a sibling endpoint:
`platform/api/routers/admin.py:1391-1402` imports `freshness_report_dict` from the health
router and serves it as `GET /api/admin/data-sources`, which solyra's `useAdminDataSources`
hook (`src/hooks/useAdmin.ts:347`) and `DataSourcesPanel.tsx` (mounted on the Admin page,
area 14) consume.

**Needs:**
- `GET /api/health/freshness` returning `FreshnessResponse { checked_at, expected_market_close, overall_status, tables: FreshnessRow[], stale?, stale_age_seconds? }` (`platform/api/schemas.py:1411-1434`)
- every tracked Cloud SQL table `scripts/audit_data_freshness.py` checks (see 05-c)
- Cloud Run job `freshness-watchdog`, triggers `freshness-watchdog-hourly`, `freshness-watchdog-nightly`
- secret `DB_PASS` (`db-trading-pass:latest`)

**States:**
- fresh cache hit (under 300 s old): returns immediately, no audit run
- cache miss, this request claims the audit: runs `audit_all()` synchronously, then caches and returns
- cache miss or expired, another request already claimed it: returns the previous report with `stale: true` and `stale_age_seconds`, or 503 if nothing was ever cached
- audit failure, external (Cloud SQL unreachable): 503 (`is_infrastructure_error`, CLAUDE.md rule 4 EXTERNAL)
- audit failure, internal defect: 500

**Acceptance criteria:**
- Given the cache is empty and no request currently holds the claim, when `GET /api/health/freshness` is requested, then the caller runs the audit synchronously and receives the fresh `FreshnessResponse` (`_run_audit_and_cache`, `platform/api/routers/health.py:127-155`; confirmed live 2026-09-28, see V evidence).
- Given the cache is empty and another request already holds the claim, when a second `GET /api/health/freshness` arrives concurrently, then it answers 503 with `{"detail":"Freshness audit in progress and no cached report is available yet. Retry shortly."}` rather than blocking or fabricating a report (confirmed live 2026-09-28, see V evidence).
- Given a cached report exists but is expired and this request does not hold the claim, when `GET /api/health/freshness` is requested, then it answers the previous report with `stale: true` and a computed `stale_age_seconds` (`health.py:113-119`).
- Given `scripts/audit_data_freshness.py` cannot reach Cloud SQL, when the audit fails, then `get_freshness` answers 503, not 500, distinguishing an external outage from an internal defect (`health.py:139-151`, `is_infrastructure_error`).
- Given the Admin page's Data Sources panel mounts, when `useAdminDataSources` fetches `GET /api/admin/data-sources`, then it receives the same cached freshness report this element produces, because both endpoints share `freshness_report_dict()` (`platform/api/routers/admin.py:1391-1402`).

**Tests:** `tests/api/test_platform_api.py`, `tests/api/test_route_coverage.py` (both exercise `GET /api/health/freshness` reachability; no dedicated freshness-cache unit test covering the claim, stale and 503 branches was found in `tests/api/` under this task's search). solyra `tests/dashboard/data-pipeline-widget.spec.ts` runs hermetically in ci.yml's `e2e (chromium, mocked)` job, but it pins the retired `DataPipelineStatus` widget's absence, not this row's own freshness-cache behavior, so it does not lift Te here.

**Code:** `platform/api/routers/health.py:40-64` (`_CACHE_TTL`, `_cache`, `_AUDIT_FLIGHT`), `:67-125` (`freshness_report_dict`), `:127-155` (`_run_audit_and_cache`), `:158-184` (`get_freshness`); `platform/api/routers/admin.py:1391-1402` (`GET /api/admin/data-sources`); `gcp/deploy.sh:2525-2554` (`deploy_freshness_watchdog`), `:4447-4448` (scheduler triggers); solyra `src/hooks/useAdmin.ts:312-364`, `src/components/admin/DataSourcesPanel.tsx`.

##### SHARED-08 · Liveness: /api/health

**Shows or does:** The liveness probe every uptime check and the SPA's pre-auth boot can hit
unconditionally: `GET /api/health` (`platform/api/main.py:271-279`, `health_check`). It is
declared `async def`, deliberately the only handler in this file that is
(`platform/api/main.py:249-271`): every other handler here is synchronous `def` on purpose,
so FastAPI dispatches it to a threadpool and a blocking call there cannot stall the event
loop. That threadpool is itself the failure mode this handler exists to survive: a burst of
DB requests queued behind the SQLAlchemy pool can hold every AnyIO worker token for up to
the pool's 30 second timeout, and a threadpooled (`def`) health check would wait in that same
worker-token queue, going silent exactly when the answer matters most (Codex, PR #991).
Staying `async def` with no blocking call inside it keeps it on the event loop instead, where
the threadpool's saturation cannot reach it; it touches no database, filesystem or network at
request time, and `cloud_sql` and `lib_dir_exists` are both booleans resolved once at import
specifically so the handler has nothing left to block on.

**Needs:**
- `GET /api/health` returning `HealthResponse { status, project_root, cloud_sql, gcs_bucket, lib_dir_exists }` (`platform/api/schemas.py:280-285`)
- module-level `_CLOUD_SQL` (`is_cloud_sql_configured()` at import, `main.py:61-64`) and `_LIB_DIR_EXISTS` (`(PROJECT_ROOT / "lib").is_dir()` at import, `main.py:248`)

**States:** one. The handler has exactly one return path and no error branch of its own; if
the process can execute it at all the response is always `status: "ok"` with the three
booleans reflecting configuration, not runtime health. The meaningful states live one layer
up, at the infrastructure boundary: the Cloud Run service answers (200) or does not
(unreachable, not observed in this task).

**Acceptance criteria:**
- Given any `AUTH_MODE` (open, firebase or iap), when `GET /api/health` is requested with no `Authorization` header, then the response is 200 with `status: "ok"`, because the path is in `_OPEN_API_PREFIXES` (`TestHealth::test_health_returns_ok`; `test_firebase_requires_valid_token`'s `c.get("/api/health").status_code == 200` assertion; confirmed live 2026-09-28, see V evidence).
- Given the handler runs, when it builds its response, then it makes no database call, filesystem call or network call, only reading the two module-level booleans computed at import (`main.py:271-279`).
- Given Cloud SQL is configured for the running service, when `GET /api/health` returns, then `cloud_sql` is `true` (`TestHealth::test_health_returns_ok` asserts the key is present; live probe 2026-09-28 returned `cloud_sql: true`).

**Tests:** `tests/api/test_platform_api.py::TestHealth::test_health_returns_ok`, `tests/api/test_platform_auth.py::test_firebase_requires_valid_token`, `tests/api/test_route_coverage.py`.

**Code:** `platform/api/main.py:61-64` (`_CLOUD_SQL`), `:248` (`_LIB_DIR_EXISTS`), `:249-271` (why this handler alone stays on the event loop as `async def`), `:271-279` (`health_check`); `platform/api/schemas.py:280-285` (`HealthResponse`).

## Per-screen records

### SCREEN-LANDING — `/`

- **Purpose:** Public marketing entry and waitlist capture — the only route reachable signed-out in every auth mode.
- **Matrix:** [03 § 01](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#01--landing)
- **Status:** Production · **Blocking issue:** — · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/LandingPage.tsx` (40 lines)
- **Child components:** `BentoGrid`, `ChartShowcase`, `DailyRhythm`, `Hero`, `LandingFAQ`, `LandingNav`, `ModuleDives`, `WaitlistSection`
- **API calls (from source):** none found in the page component — issued by child components or hooks
- **E2E specs:** `tests/options/demo-banners.spec.ts`, `tests/landing/landing.spec.ts`
- **PR lineage:** [#684](https://github.com/TeneikaAskew/stocks/pull/684) origin · [#686](https://github.com/TeneikaAskew/stocks/pull/686) real walk-forward proof tile · [#683](https://github.com/TeneikaAskew/stocks/issues/683) perf open
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| POST /api/waitlist | email, source, website (request body); detail (error response) (types: `waitlist.ts`; fixture: none) |  |  | `submitWaitlist` (`waitlist.ts`) → `WaitlistSection` |
| static content | agent terminal lines, gamma ladder, bento tiles, module deep-dive copy (types: `fixtures.ts`; fixture: `tests/helpers/fixtures/landing.ts`) | bundled in `src/components/landing/fixtures.ts` |  | `Hero`, `BentoGrid`, `ChartShowcase`, `ModuleDives`, `DailyRhythm` |

#### Displayed
| ID | Element | Component |
|---|---|---|
| LANDING-01 | LandingNav | `LandingNav` |
| LANDING-02 | Hero with the agent terminal | `Hero` |
| LANDING-03 | BentoGrid | `BentoGrid` |
| LANDING-04 | ChartShowcase | `ChartShowcase` |
| LANDING-05 | ModuleDives | `ModuleDives` |
| LANDING-06 | DailyRhythm | `DailyRhythm` |
| LANDING-07 | WaitlistSection | `WaitlistSection` |
| LANDING-08 | FAQ (#faq) | `LandingFAQ` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| LANDING-09 | Sign in (to /dashboard) | `LandingNav`'s `<a href="/dashboard">` navigates there; AuthGate then shows the sign-in screen (firebase mode) or the app directly (iap/open). |
| LANDING-10 | Request access, join the waitlist | `LandingNav`'s `<a href="#waitlist">` scrolls to the form; `WaitlistSection` validates the email client-side, then `submitWaitlist` POSTs to `/api/waitlist`. |
| LANDING-11 | See a live day (scroll to #learn) | `Hero`'s `<a href="#learn">` scrolls the page to the `DailyRhythm` section. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| LANDING-12 | loading (waitlist submit in flight) | present | `WaitlistSection` disables the submit button and shows "Joining…" while `status === 'submitting'`. |
| LANDING-13 | error (waitlist failure shown inline) | present | `WaitlistSection` renders the thrown error's message in a `role="alert"` block (`data-testid="waitlist-error"`), never a silent failure. |

#### Journeys
1. First-time visitor to waitlist: Lands on / → Reads the hero and watches the agent terminal type (LANDING-02) → Scrolls the bento tiles and module deep-dives (LANDING-03, LANDING-05) → Clicks "Join the waitlist" (LANDING-10) → Submits email, an error shows inline if it fails (LANDING-12, LANDING-13)
2. Returning user to the app: Lands on / (an old /welcome link redirects here) → Clicks "Sign in" (LANDING-09) → Arrives at /dashboard → AuthGate shows the sign-in screen (firebase mode) (AUTH-01) → Signs in and lands on the Dashboard (AUTH-03, AUTH-04)
3. In-app user looking for the FAQ: Opens Support in the app nav (SHELL-01) → Clicks FAQ (/#faq) (SHELL-01) → Lands on the landing page (LANDING-08) → The page scrolls to the FAQ section on mount (LANDING-08)

#### Elements
##### LANDING-01 · LandingNav

**Shows or does:** The nav bar, the first section rendered on `/` (`LandingPage.tsx:29`):
the SOLYRA wordmark linking home (`LandingNav.tsx:7-10`), three in-page anchors, Modules
`#modules`, Learn `#learn`, FAQ `#faq` (`:12-14`), and two CTAs, "Sign in" to `/dashboard`
and "Request access" to `#waitlist` (`:17-18`; these two links are also LANDING-09 and half
of LANDING-10 in their own right, as Actions). Plain `<a>` tags, not a client-side router
`<Link>`: every link is a normal browser navigation or same-page anchor scroll.

**Needs:** nothing; no props, no store, no endpoint.

**States:** one; the nav is identical on every render.

**Acceptance criteria:**
- Given `/` is rendered, when `LandingNav` mounts, then it is the first child under
  `data-testid="landing-page"` (`LandingPage.tsx:28-29`) and holds links to `#modules`,
  `#learn`, `#faq`, `/dashboard`, `#waitlist` (`LandingNav.tsx:12-18`); no assertion in
  `renders all key sections at /` targets the nav specifically, only its "Sign in" link is
  directly asserted, by the mobile regression specs (see LANDING-09).
- Given a phone-width viewport (360, 390 or 411px), when the nav renders, then neither
  `.sl-nav-signin` nor `.sl-nav-cta` overflows the viewport and the page has no horizontal
  scroll (`tests/landing/landing.spec.ts:83-100`, the `Sign in stays reachable and
  in-bounds at Npx` regression specs).

**Tests:** solyra `tests/landing/landing.spec.ts` (the three `Sign in stays reachable and
in-bounds at Npx` specs cover the nav's layout directly; every other spec in the file
mounts it too, so a runtime error here would fail them, but none asserts its content).

**Code:** `src/components/landing/LandingNav.tsx`.

##### LANDING-02 · Hero with the agent terminal

**Shows or does:** The hero header (`Hero.tsx:9-82`): a kicker, the "Know why the market
moves. / Before it moves." headline (`:22-33`), a two-CTA row (`#waitlist`, `#learn`,
`:39-42`), and a terminal-styled panel that types out seven scripted `AGENT_LINES` one at a
time via `useTypingLines(AGENT_LINES.length)` (`:6`, `useTypingLines.ts:8-27`), 650ms apart,
revealing a "3 signals armed" badge once every line is visible (`Hero.tsx:58-79`).
`useTypingLines` honors `prefers-reduced-motion` by revealing every line immediately
instead of animating (`useTypingLines.ts:12-15`).

**Needs:** `AGENT_LINES`, a bundled, static 7-entry array (`src/components/landing/
fixtures.ts:10-18`); no endpoint, no store.

**States:**
- typing in progress: fewer than 7 lines visible, no "signals armed" badge
- typing complete, or `prefers-reduced-motion: reduce`: all 7 lines visible immediately,
  "3 signals armed · watching every 1-min bar" badge shown (`Hero.tsx:66-78`)

**Acceptance criteria:**
- Given `/` is rendered, when `Hero` mounts, then the "Know why the market moves." heading
  is visible (`renders all key sections at /`, matching `/know why the market moves/i` by
  role); no test asserts the "Join the waitlist" or "See a live day ↓" CTAs themselves,
  confirmed by searching both `tests/landing/landing.spec.ts` and
  `src/components/landing/*.test.ts*` for their text.
- Given the OS reports `prefers-reduced-motion: reduce`, when `useTypingLines(7)` runs,
  then it returns 7 immediately and starts no interval (`useTypingLines.ts:12-15`; verified
  by reading the hook directly, no test exercises this branch).
- Given normal motion preference, when the component mounts, then one additional
  `AGENT_LINES` entry becomes visible every 650ms until all 7 show (`useTypingLines.ts:
  16-23`; no test exercises the timing itself).

**Tests:** solyra `tests/landing/landing.spec.ts` (`renders all key sections at /` asserts
the rendered heading; neither the typing animation nor the reduced-motion branch is
asserted by any test found in `src/` or `tests/`).

**Code:** `src/components/landing/Hero.tsx`; `src/components/landing/useTypingLines.ts`;
`src/components/landing/fixtures.ts:10-18` (`AGENT_LINES`).

##### LANDING-03 · BentoGrid

**Shows or does:** A six-tile grid, `id="modules"` (`BentoGrid.tsx:69`, the target of
`LandingNav`'s and the footer's `#modules` links), under "Everything that moves the
market. One surface.": a two-row Gamma Map ladder tile (`GammaLadderTile`, `:4-61`),
Council verdict, Catalysts, Movement Read, Signals, and a Proof tile that shows a real
number when present or a placeholder when it is not (`:115-125`).

**Needs:** `BENTO`, `GAMMA_LADDER`, `SPOT_LABEL` (`fixtures.ts:10-55`), bundled static
objects; no endpoint.

**States:** one rendered state per tile; the Proof tile alone branches on
`proof.hitRatePct !== null` (`BentoGrid.tsx:117-123`), currently `50` in the fixture,
never `null`, so the "Results published at launch" placeholder branch is unexercised by
any test (`fixtures.ts:51-54`).

**Acceptance criteria:**
- Given `/` is rendered, when `BentoGrid` mounts, then "Everything that moves the market.
  One surface." is visible (`renders all key sections at /`, exact text, `BentoGrid.
  tsx:70`).
- Given `BENTO.proof.hitRatePct` is a number, when the Proof tile renders, then it shows
  `{hitRatePct}% hit rate` and the caption, not the "Results published at launch"
  placeholder (`BentoGrid.tsx:117-124`); the fixture's own header comment records the
  number's provenance, a trade-weighted `avg_win_rate` queried 2026-07-05 via db-query,
  50% over 2,980 out-of-sample trades across 3 tickers (`fixtures.ts:1-9`).

**Tests:** solyra `tests/landing/landing.spec.ts` (`renders all key sections at /`).

**Code:** `src/components/landing/BentoGrid.tsx`; `src/components/landing/fixtures.
ts:10-55`.

##### LANDING-04 · ChartShowcase

**Shows or does:** A static inline SVG sample chart (`ChartShowcase.tsx:26-73`) under
"Charts that show the *why*." (`:14-16`): 24 fixed candles (`CANDLES`, `fixtures.
ts:58-85`), a VWAP path, and three gamma level lines styled to match the real Charts
page's own line styles exactly, per the component's own comment: King solid gold
`#f59e0b` width 2, Gate dotted blue `#3b82f6`, Flip dashed violet `#a78bfa` (`:6-9,
31-44`), plus one signal marker and one rejection annotation.

**Needs:** `CANDLES` (`fixtures.ts:58-85`); no endpoint.

**States:** one; fully static SVG.

**Acceptance criteria:**
- Given `/` is rendered, when `ChartShowcase` mounts, then "Charts that show the why." is
  visible (`renders all key sections at /`, matching `/charts that show the/i`).
- Given the component renders, then the three level lines carry the colors and dash
  patterns the component's own comment names (`ChartShowcase.tsx:6-9`; verified by reading
  the SVG `stroke`/`strokeDasharray` attributes at `:32,37,42` directly; no test asserts
  the styling itself).

**Tests:** solyra `tests/landing/landing.spec.ts` (`renders all key sections at /`).

**Code:** `src/components/landing/ChartShowcase.tsx`; `src/components/landing/fixtures.
ts:58-85` (`CANDLES`).

##### LANDING-05 · ModuleDives

**Shows or does:** Three stacked two-column deep-dive sections (`ModuleDives.tsx:154-161`):
`GammaMapDive`, a strike-by-expiry heat grid (`:4-62`); `FlowDive`, a filtered
options-flow tape table (`:65-109`); `CouncilDive`, bull/bear/verdict cards plus
scalper/swing/income persona chips (`:112-152`). All copy and numbers come from bundled
fixtures (`HEAT_ROWS`, `HEAT_EXPIRIES`, `FLOW_ROWS`, `COUNCIL`, `fixtures.ts:87-116`).

**Needs:** `HEAT_ROWS`, `HEAT_EXPIRIES`, `FLOW_ROWS`, `COUNCIL` (`fixtures.ts:87-116`); no
endpoint.

**States:** one; fully static.

**Acceptance criteria:**
- Given `/` is rendered, when the three dives mount as part of the page, then a runtime
  error in any of them would fail `renders all key sections at /`'s initial `landing-page`
  visibility assertion, but no assertion in that test, or in any other test found in
  `tests/landing/`, targets this section's own headings ("See the wall before price hits
  it.", "Flow without the firehose.", the Council quotes) or content specifically.
  Presence-only coverage, confirmed by reading the full spec file.

**Tests:** solyra `tests/landing/landing.spec.ts` (presence-only, see above).

**Code:** `src/components/landing/ModuleDives.tsx`; `src/components/landing/fixtures.
ts:87-116`.

##### LANDING-06 · DailyRhythm

**Shows or does:** `DailyRhythm`, `id="learn"` (`DailyRhythm.tsx:6`), headed "One market
day with Solyra.": three phase cards, LEARN 07:00, DO 09:30, ACT 16:00, from `RHYTHM`
(`fixtures.ts:118-131`). This section is the scroll target of `Hero`'s "See a live day ↓"
(LANDING-11) and of the `#learn` links in `LandingNav` and the footer.

**Needs:** `RHYTHM` (`fixtures.ts:118-131`); no endpoint.

**States:** one; fully static.

**Acceptance criteria:**
- Given `/` is rendered, when `DailyRhythm` mounts, then "One market day with Solyra." is
  visible (`renders all key sections at /`, exact text) and the section carries
  `id="learn"` (`DailyRhythm.tsx:6`); no test asserts the anchor is actually reachable by
  scroll (see LANDING-11).

**Tests:** solyra `tests/landing/landing.spec.ts` (`renders all key sections at /`).

**Code:** `src/components/landing/DailyRhythm.tsx`; `src/components/landing/fixtures.
ts:118-131` (`RHYTHM`).

##### LANDING-07 · WaitlistSection

**Shows or does:** The waitlist capture section, `id="waitlist"` (`WaitlistSection.
tsx:30-89`), headed "Be there at first light." (`:43`): an email input
(`data-testid="waitlist-email"`, `:64-76`), a hidden honeypot text input (`tabIndex={-1}`,
positioned off-screen, `aria-hidden`, `:54-63`), and a submit button
(`data-testid="waitlist-submit"`, `:77-79`), all replaced by a success message once
`status === 'done'` (`:48-51`). This is the element LANDING-10's action operates on, and
LANDING-12/LANDING-13 are two of its four possible states.

**Needs:** `POST /api/waitlist` (full request/response contract under LANDING-10); no
store, no other endpoint.

**States:** idle (default), submitting (LANDING-12), success
(`data-testid="waitlist-success"`, `:48-51`), error (LANDING-13).

**Acceptance criteria:**
- Given `/` is rendered, when `WaitlistSection` mounts, then "Be there at first light." is
  visible (`renders all key sections at /`, exact heading text, `WaitlistSection.tsx:43`);
  no assertion in that test targets the email input. It is exercised, though not explicitly
  asserted visible, by a different test's fill action
  (`tests/landing/landing.spec.ts:74`, `page.getByTestId('waitlist-email').fill(...)` inside
  `waitlist form rejects an invalid email with a visible error`), which requires the input
  to be present and actionable to succeed.
- Given the honeypot input, when a sighted person fills the form with a mouse or keyboard,
  then it stays empty, because it is visually and semantically hidden
  (`aria-hidden="true"`, off-screen absolute positioning, `tabIndex={-1}`, `:54-63`); only
  a bot's blind form-filler is expected to populate it (see LANDING-10).
- Given a successful submission, when `status` becomes `'done'`, then the form is replaced
  by "You're on the list. One email when your cohort opens." (`:48-51`); no test observes
  this branch end to end: `waitlist.test.ts` tests `submitWaitlist` in isolation and
  `landing.spec.ts` only exercises the client-validation rejection path, so the success UI
  itself is untested, only the data layer beneath it is (`test_valid_email_upserts_and_
  returns_ok`, `waitlist.test.ts`'s `POSTs email + source + empty honeypot and resolves on
  200`).

**Tests:** solyra `tests/landing/landing.spec.ts` (`renders all key sections at /`, heading
only); `src/components/landing/waitlist.test.ts` (data layer only, see above). stocks
`tests/api/test_waitlist_router.py`.

**Code:** `src/components/landing/WaitlistSection.tsx`.

##### LANDING-08 · FAQ (#faq)

**Shows or does:** `LandingFAQ`, `id="faq"` (`LandingFAQ.tsx:6`): three question/answer
pairs from `FAQ` (`fixtures.ts:133-146`), plus the page footer, wordmark, Modules/Learn/
FAQ/Privacy/Terms/Disclosures links, copyright line (`:16-45`). It is the scroll target of
three separate links: `LandingNav`'s own `#faq` (`LandingNav.tsx:14`), the footer's own
`#faq` (`LandingFAQ.tsx:37`), and the in-app Support menu's `/#faq` entry
(`src/components/layout/navConfig.ts:92`).

**Needs:** `FAQ` (`fixtures.ts:133-146`); no endpoint.

**States:** one; fully static.

**Acceptance criteria:**
- Given a reader follows `/#faq` (e.g. from the in-app Support menu), when `LandingPage`
  mounts, then its mount effect reads `window.location.hash` and calls `scrollIntoView()`
  on the element whose id matches (`LandingPage.tsx:22-25`), landing on this section; no
  test asserts the scroll itself.
- Given `/` is rendered without a hash, when the page mounts, then `LandingFAQ`'s three
  questions and the footer render as part of the static tree; a runtime error here would
  fail every assertion in `renders all key sections at /` (since `landing-page` would
  never become visible), but no assertion in that test targets this section's own text
  specifically. Presence-only coverage, same as LANDING-05.

**Tests:** solyra `tests/landing/landing.spec.ts` (presence-only; no assertion targets
this section's content or the hash-scroll behaviour).

**Code:** `src/components/landing/LandingFAQ.tsx`; `src/components/landing/fixtures.
ts:133-146` (`FAQ`); `src/routes/LandingPage.tsx:22-25` (hash scroll); `src/components/
layout/navConfig.ts:92` (Support menu entry).

##### LANDING-09 · Sign in (to /dashboard)

**Shows or does:** `LandingNav`'s "Sign in" anchor, `<a href="/dashboard"
className="sl-mut sl-nav-signin">Sign in</a>` (`LandingNav.tsx:17`). A plain link, not a
client-side router element: clicking it performs a normal browser navigation to
`/dashboard`.

**Needs:** nothing; no props, no store, no endpoint. What renders after navigation belongs
to AuthGate (AUTH-01), not to this element.

**States:** one.

**Acceptance criteria:**
- Given `/` is rendered, when the reader looks at the nav, then a link with the accessible
  name "Sign in" and `href="/dashboard"` is present (`LandingNav.tsx:17`; asserted
  directly: `tests/landing/landing.spec.ts:84-89`,
  `page.getByRole('link', { name: 'Sign in' })`, `toHaveAttribute('href', '/dashboard')`).
- Given a phone-width viewport (360, 390 or 411px), when the nav renders, then the "Sign
  in" link's bounding box stays within the viewport and the page has no horizontal scroll
  (`tests/landing/landing.spec.ts:90-98`; a regression for a mobile CSS fix that once hid
  `.sl-nav-signin` with `display: none` below 720px and removed the only route to
  `/dashboard` on a phone, per the spec's own comment at `:79-82`).
- Given the link is followed, when `/dashboard` loads, then AuthGate decides what renders
  there, the sign-in screen in firebase mode or the app directly in open/iap mode; out of
  this element's own scope, traced under AUTH-01, not observed by any test in this area.

**Tests:** solyra `tests/landing/landing.spec.ts` (the three `Sign in stays reachable and
in-bounds at Npx` specs).

**Code:** `src/components/landing/LandingNav.tsx:17`.

##### LANDING-10 · Request access, join the waitlist

**Shows or does:** Two cooperating pieces: `LandingNav`'s "Request access" anchor,
`<a href="#waitlist" className="sl-cta sl-nav-cta">Request access</a>`
(`LandingNav.tsx:18`), a same-page scroll to `WaitlistSection`'s `id="waitlist"`
(`WaitlistSection.tsx:33`); and the form submit itself, `WaitlistSection`'s `onSubmit`
handler (`:13-28`): client-side `validateEmail` first, then `submitWaitlist(email,
'landing', website)` (`waitlist.ts:10-31`) POSTs to `/api/waitlist`, handled by
`join_waitlist` (`platform/api/routers/waitlist.py:84-130`).

**Needs:** `POST /api/waitlist` (`WaitlistBody { email, source, website }`,
`platform/api/routers/waitlist.py:45-48`) returning `WaitlistResponse { status: "ok" }`
(`platform/api/schemas.py:1382-1383`) on success, or an `HTTPException` with a `detail`
string on failure; table `waitlist_signups` (`email UNIQUE, source, user_agent,
created_at, updated_at`, `gcp/schema.sql:4755-4762`), written by a single `INSERT ...
ON CONFLICT (email) DO UPDATE` (`waitlist.py:108-121`, no separate `lib/` module).

**States:**
- idle: form visible, submit enabled, reads "Join the waitlist"
- submitting: see LANDING-12
- success: form replaced by the `data-testid="waitlist-success"` message (see LANDING-07)
- error: see LANDING-13
- honeypot tripped (bot traffic): the hidden `website` field is non-empty; the backend
  returns the same 200 `{"status":"ok"}` WITHOUT writing a row, so from the browser this
  state is indistinguishable from success (`waitlist.py:86-92`, "the one sanctioned
  anti-bot fake success", the router's own docstring)

**Acceptance criteria:**
- Given the nav's "Request access" link is clicked, when the browser follows `#waitlist`,
  then it scrolls to `WaitlistSection`'s matching `id` (`LandingNav.tsx:18`,
  `WaitlistSection.tsx:33`); no test asserts the scroll itself, only that the anchor and
  its target exist in source.
- Given a syntactically valid, previously-unseen email and an empty honeypot, when the
  form is submitted, then the browser POSTs `{email (trimmed, lowercased), source:
  "landing", website: ""}` to `/api/waitlist`, the backend inserts a new
  `waitlist_signups` row and returns `{"status":"ok"}` (`test_valid_email_upserts_and_
  returns_ok`; `waitlist.test.ts`'s `POSTs email + source + empty honeypot and resolves on
  200`).
- Given the app is served from a `*.lovable.app` host (Lovable, the production SPA host
  for this area), when `submitWaitlist` calls the bare global `fetch('/api/waitlist',
  ...)`, then `installAuthFetch`'s wrapper, installed unconditionally at boot before
  ConfigGate specifically because "the landing page's own waitlist POST needs that
  rewrite too" (`src/main.tsx:14-25`), rewrites it onto `STAGING_API`
  (`src/lib/apiTargets.ts:29,37`, `authedFetch.ts:56-63,109-129`), because a static host
  would otherwise answer `/api/*` with `index.html` and break `r.json()`. `/api/waitlist`
  is itself one of the `OPEN_PREFIXES` (`authedFetch.ts:45`) that both the frontend and
  `platform/api/auth.py:70`'s `_OPEN_API_PREFIXES` agree needs no bearer token (SHARED-02);
  since the landing route never runs `ConfigGate`, `getAuthMode()` reads its module
  default, `'open'` (`src/lib/runtimeConfig.ts:22`), so the request takes the
  no-token branch (`authedFetch.ts:163-166`) unconditionally.
- Given the honeypot `website` field is filled (bot traffic), when `join_waitlist` runs,
  then it returns 200 `{"status":"ok"}` and never opens a DB connection, checked BEFORE
  email-format validation so a bot never learns this is a validation endpoint
  (`waitlist.py:86-92`; `test_honeypot_returns_fake_success_without_db_call`,
  `test_honeypot_checked_before_email_validation`).
- Given the reader has dev-role mock mode active (SHARED-04), when the same submit runs,
  then `authedFetch` intercepts it before the network, checked before the base rewrite
  (`authedFetch.ts:145-148`), and the fixture engine has NO route for `/api/waitlist` on
  this page, on purpose (`landingRoutes: MockRoute[] = []`, `src/mocks/landing.ts:36`), so
  the loud 501 "no fixture" miss (`src/mocks/index.ts:132-140`) flows into
  `submitWaitlist`'s own error branch and the form shows an honest failure rather than a
  mocked fake "you're on the list" (`src/mocks/landing.ts:27-35`, citing CLAUDE.md Rule 4
  by name).

**Tests:** stocks `tests/api/test_waitlist_router.py` (`test_valid_email_upserts_and_
returns_ok`, `test_honeypot_returns_fake_success_without_db_call`, `test_honeypot_
checked_before_email_validation`). solyra `src/components/landing/waitlist.test.ts`
(`submitWaitlist > POSTs email + source + empty honeypot and resolves on 200`, `>
sends a filled honeypot value through to the server`). solyra `tests/landing/
landing.spec.ts` (`waitlist form rejects an invalid email with a visible error` exercises
the same submit handler's client-validation branch, not the network branch).

**Code:** `src/components/landing/LandingNav.tsx:18`; `src/components/landing/
WaitlistSection.tsx:13-28`; `src/components/landing/waitlist.ts`; `platform/api/routers/
waitlist.py:84-130`; `platform/api/schemas.py:1382-1383`; `gcp/schema.sql:4755-4762`;
`src/main.tsx:14-25`; `src/lib/authedFetch.ts:45,56-63,109-129,145-166`;
`src/lib/runtimeConfig.ts:22`; `src/mocks/landing.ts`.

##### LANDING-11 · See a live day (scroll to #learn)

**Shows or does:** `Hero`'s "See a live day ↓" anchor, `<a href="#learn"
className="sl-cta2">See a live day ↓</a>` (`Hero.tsx:41`), a same-page scroll to
`DailyRhythm`'s `id="learn"` section (`DailyRhythm.tsx:6`).

**Needs:** nothing; no props, no store, no endpoint.

**States:** one.

**Acceptance criteria:**
- Given `/` is rendered, when the reader looks at the hero, then a link with the visible
  text "See a live day ↓" and `href="#learn"` is present (`Hero.tsx:41`), and `DailyRhythm`
  renders a section with `id="learn"` (`DailyRhythm.tsx:6`) as the matching anchor target.
- Given the link is clicked, when the browser follows the `#learn` fragment, then it
  scrolls to that section by native browser anchor behaviour; no test asserts the scroll
  itself, since no test in `src/` or `tests/` references `#learn` or "See a live day"
  (confirmed by search).

**Tests:** none. No Vitest, pytest or Playwright test references this link or the
`#learn` anchor.

**Code:** `src/components/landing/Hero.tsx:41`; `src/components/landing/
DailyRhythm.tsx:6`.

##### LANDING-12 · State: loading (waitlist submit in flight)

**Shows or does:** While `submitWaitlist` is in flight, `WaitlistSection`'s local `status`
state is `'submitting'` (`WaitlistSection.tsx:20`, set right after client-side email
validation passes and before `submitWaitlist` is awaited): the submit button is disabled
and its text changes from "Join the waitlist" to "Joining…"
(`:77-79`, `disabled={status === 'submitting'}`, `data-testid="waitlist-submit"`). This
presentation genuinely exists in the current source; UI-SCREENS.md's States table
previously marked it "absent", which this task corrects after reading `WaitlistSection.
tsx` directly rather than trusting the earlier marking.

**Needs:** nothing beyond the component's own `status` state; no endpoint of its own, it
is a presentation of the LANDING-10 request's lifecycle.

**States:** this row is itself one of `WaitlistSection`'s four states (idle, submitting,
success, error; see LANDING-10). It has no further sub-states.

**Acceptance criteria:**
- Given a valid email and an empty honeypot, when the reader clicks "Join the waitlist",
  then `status` becomes `'submitting'` before `submitWaitlist` is awaited, the button
  becomes `disabled`, and its text reads "Joining…" (`WaitlistSection.tsx:19-23,77-79`;
  verified by reading the component directly, no test exercises this branch, see Tests).
- Given the request resolves, success or a thrown error, when the handler's `try`/`catch`
  completes, then `status` leaves `'submitting'` (`'done'` on success, back to `'idle'` on
  error, `:22-27`), so the disabled/"Joining…" presentation is never stuck.

**Tests:** none. Searched `src/` and `tests/` for `submitting`, `Joining` and the
`waitlist-submit` testid: the only two references outside this component are in
`tests/landing/landing.spec.ts`'s invalid-email test, which returns before `status` ever
becomes `'submitting'` (`validateEmail` fails first, `WaitlistSection.tsx:16-19`), so no
test, Vitest or Playwright, ever observes this state.

**Code:** `src/components/landing/WaitlistSection.tsx:19-23` (state transition), `:77-79`
(presentation).

##### LANDING-13 · State: error (waitlist failure shown inline)

**Shows or does:** On any thrown error, from `submitWaitlist` or from client-side
`validateEmail`, `WaitlistSection` sets `error` to the error's `message` and renders it
inline in a `role="alert"` block, `data-testid="waitlist-error"` (`:24-27,82-86`), never a
silent failure; the component's own header comment cites CLAUDE.md Rule 3.7 by name
(`:6`). `submitWaitlist` itself never resolves to a fabricated success: a non-2xx response
throws the server's `detail` string when present, else a `signup failed (<status>)`
fallback; a network failure throws "Could not reach the server, check your connection and
retry." (`waitlist.ts:10-31`).

**Needs:** the thrown `Error`'s `message`; no endpoint of its own (see LANDING-10).

**States:** one of `WaitlistSection`'s four states (see LANDING-10); the message itself
has three distinct sources: client-side format rejection, a non-2xx HTTP response, and a
network failure.

**Acceptance criteria:**
- Given an invalid email is submitted, when `validateEmail` rejects it, then the handler
  sets `error` to "Enter a valid email address." without calling `submitWaitlist` at all
  (`WaitlistSection.tsx:16-19`; `tests/landing/landing.spec.ts`'s `waitlist form rejects
  an invalid email with a visible error`: fills `not-an-email`, clicks submit, asserts
  `waitlist-error` contains `/valid email/i`).
- Given the backend responds 400/429/503 with a JSON `{"detail": "..."}` body, when
  `submitWaitlist` parses it, then it throws an `Error` whose message IS that `detail`
  string, which `WaitlistSection` then renders verbatim (`waitlist.ts:21-29`;
  `waitlist.test.ts`'s `throws the server detail on a non-2xx response (loud failure)`,
  backed on the server side by `test_invalid_email_is_400_and_no_db_call`, `test_rate_
  limit_429_after_five_requests`, `test_db_failure_is_loud_503`, each of which returns a
  `detail` string `join_waitlist` puts in the response, `waitlist.py:96,100,127`).
- Given the backend responds non-2xx with a body that is not JSON, or whose `detail` is
  not a string (e.g. a FastAPI validation error shaping `detail` as a list), when
  `submitWaitlist` parses it, then it falls back to `signup failed (<status>)` rather than
  surfacing the raw structure (`waitlist.ts:21-29`; `waitlist.test.ts`'s `falls back to
  the status-code message when detail is not a string`).
- Given `fetch` itself rejects (offline, DNS failure), when `submitWaitlist` catches it,
  then it throws "Could not reach the server, check your connection and retry."
  (`waitlist.ts:12-19`; `waitlist.test.ts`'s `throws a readable message on network
  failure`).

**Tests:** solyra `src/components/landing/waitlist.test.ts` (`throws the server detail on
a non-2xx response (loud failure)`, `falls back to the status-code message when detail is
not a string`, `throws a readable message on network failure`). stocks
`tests/api/test_waitlist_router.py` (`test_invalid_email_is_400_and_no_db_call`,
`test_rate_limit_429_after_five_requests`, `test_db_failure_is_loud_503`). solyra
`tests/landing/landing.spec.ts` (`waitlist form rejects an invalid email with a visible
error`, the client-validation branch only).

**Code:** `src/components/landing/WaitlistSection.tsx:6` (Rule 3.7 citation), `:13-28`
(`onSubmit`), `:82-86` (rendering); `src/components/landing/waitlist.ts:10-31`;
`platform/api/routers/waitlist.py:84-130`.

### SCREEN-NAVIGATE — `/welcome`

- **Purpose:** Legacy alias; permanently redirects to `/`.
- **Matrix:** [03 § 01](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#01--landing)
- **Status:** Production · **Blocking issue:** — · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/App.tsx (inline)` (0 lines)
- **API calls (from source):** none found in the page component — issued by child components or hooks
- **States present:** none detected
- **E2E specs:** **none**
- **PR lineage:** [#684](https://github.com/TeneikaAskew/stocks/pull/684)
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

### SCREEN-AUTH — sign-in (in-route)

- **Purpose:** In-route auth surface guarding every app route: boots the runtime auth config, renders Google or email/password sign-in and sign-up until a session exists, and handles sign-out and the /auth/action password-reset and email-verification links.
- **Matrix:** [03 § 02](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#02--authgate-and-sign-in)
- **Status:** Infrastructure · **Blocking issue:** — · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-09-28
- **Component:** `src/components/auth/AuthGate.tsx` (30 lines), `src/components/auth/ConfigGate.tsx` (176 lines), `src/components/auth/SignInScreen.tsx` (302 lines), `src/components/auth/SignOutButton.tsx` (38 lines), `src/routes/AuthActionPage.tsx` (550 lines)
- **Child components:** `Brand`, `LoadingSpinner`, `SignInScreen`
- **API calls (from source):** `/api/config/firebase`, `/api/me`
- **E2E specs:** `tests/shared/auth-gate.spec.ts`, `tests/admin/admin-auth.spec.ts`
- **PR lineage:** not traced
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/config/firebase | authMode, firebase.apiKey/authDomain/projectId/appId (types: `runtimeConfig.ts` RuntimeConfig) |  | one boot fetch per page load (module-level `bootPromise`) | `ConfigGate` (`fetchRuntimeConfig`) |
| GET /api/me | email, is_admin, is_dev (types: `useUser.ts` MeResponse) |  | 30s staleTime; a role granted or revoked converges on the next mount/focus refetch | `useUser` |

#### Displayed
| ID | Element | Component |
|---|---|---|
| AUTH-01 | Auth-mode bootstrap (firebase, iap, open) | `ConfigGate` |
| AUTH-05 | Sign-up mode | `SignInScreen` |
| AUTH-07 | Identity and role read (email, admin, dev) | `useUser` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| AUTH-03 | Google sign-in, with the new-tab variant when framed | `SignInScreen` calls `signInWithGoogle`; inside a cross-origin preview iframe it opens a new top-level tab to complete SSO instead of a popup. |
| AUTH-04 | Email and password sign-in with inline error | `SignInScreen` calls `signInWithEmail`; a rejected promise renders `friendlyError` inline rather than failing silently. |
| AUTH-06 | Forgot password: reset email, then /auth/action | `SignInScreen` calls `sendPasswordReset`; the emailed link lands on `AuthActionPage`, which completes the reset. |
| AUTH-09 | Sign out | `SignOutButton` calls `firebaseSignOut`, then clears the React Query cache so no cached data from the previous identity survives. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| AUTH-02 | loading spinner while the session resolves | present | `AuthGate` renders `LoadingSpinner` while `useUser().isLoading`; `ConfigGate` renders its own spinner while the boot config fetch is in flight. |
| AUTH-08 | permission, 401 on a gated call shows "Sign in to load data" | not tracked (new category); present | `authGate.ts`'s `markAuthBlocked` flips a global flag on any gated 401; `SignInEmptyState`/`DataGate` on the data pages then render "Sign in to load data" in place of the card body. |
| AUTH-10 | error, config fetch failure shows the config-error screen | present | `ConfigGate` renders `ConfigErrorScreen` (`data-testid="config-error"`) on a non-OK status, a network failure, or an unparseable body; it fails loud and never falls back to open mode silently. |

#### Journeys
1. Firebase mode, email sign-in: Hits any app route signed out (AUTH-01) → AuthGate reads authMode from /api/config/firebase (AUTH-01) → SignInScreen renders in place of the app (AUTH-02) → Enters email and password (AUTH-04) → Auth state flips, the requested page renders with no redirect
2. Google SSO inside a preview iframe: SignInScreen detects it is framed (AUTH-03) → Offers "Continue with Google", opens a new tab (AUTH-03) → User completes SSO at top level (AUTH-03) → Returns to the app already signed in (AUTH-07)
3. Session expires mid-session: A gated /api/* call returns 401 (AUTH-08) → authedFetch marks the session auth-blocked (AUTH-08) → Data cards swap to "Sign in to load data" (AUTH-08) → User signs in again (AUTH-04) → The next successful gated call clears the flag (AUTH-08)

#### Elements
##### AUTH-01 · Auth-mode bootstrap (firebase, iap, open)

**Shows or does:** On the first route that needs it, `ConfigGate` fetches `GET /api/config/firebase`
once per page load (`bootPromise`, a module-level singleton so every mounted gate settles on the
same outcome) and stores the result via `setRuntimeConfig`. In `firebase` mode it then dynamically
imports the Firebase facade and awaits `initFirebase` before rendering children, so `AuthGate`
never reads auth state before the SDK exists. `AuthGate` itself renders children unchanged in
`iap`/`open` mode (`authMode !== 'firebase'` short-circuits to `<>{children}</>`, `AuthGate.tsx:17`).

**Needs:** `GET /api/config/firebase`, served by `platform/api/routers/config.py:46
get_firebase_config`, which reads `api.auth.AUTH_MODE` (validated at import, `auth.py:52
_validated_auth_mode`, refusing to start on an unrecognized value) and, only in firebase mode
with `FIREBASE_API_KEY` set, the four Firebase web-config env vars.

**States:** loading (AUTH-02), signed-out login screen (AUTH-03 through AUTH-06), error (AUTH-10).
Covered as separate rows.

**Acceptance criteria:**
- Given the backend answers `{"authMode":"open", ...}`, when `ConfigGate` boots, then no Firebase
  SDK chunk is imported and `AuthGate` renders the app directly (`ConfigGate.tsx:79`,
  `AuthGate.tsx:17`; `open mode → app renders, no login screen`, `tests/shared/auth-gate.spec.ts`).
- Given the backend answers `{"authMode":"firebase", firebase: {...}}`, when the config fetch
  resolves, then `ConfigGate` awaits `initFirebase` before rendering, and a signed-out visitor sees
  `SignInScreen`, not the app shell (`firebase mode, signed out → login screen blocks the app`,
  asserting `nav a[href="/help"]` has zero count).
- Given `AUTH_MODE` at the API is anything other than `open`, `firebase`, or `iap`, when the process
  starts, then `_validated_auth_mode` raises `RuntimeError` and the deploy fails rather than
  silently no-opping the middleware (`TestValidatedAuthMode::test_refuses_unknown_mode`,
  `tests/api/test_platform_auth.py`), which guarantees the value `/api/config/firebase` ever
  reports is one of the three literals `RuntimeConfigResponse` declares.
- Given a cold app-route visit, when `ConfigGate` mounts, then the routed page's lazy chunk (its
  `preload` prop) downloads in parallel with the config fetch rather than after it (`gated chunk
  downloads in parallel with the config fetch`, the regression fence for #64).
- Given a real, unauthenticated request against `GET /api/config/firebase` on staging, when issued
  from this session, then it answers 200 with `authMode: "firebase"` (verified 2026-09-28, see the
  V-gate evidence comment).

**Tests:** `tests/shared/auth-gate.spec.ts` (`open mode → app renders, no login screen`; `gated
chunk downloads in parallel with the config fetch`; `firebase mode, signed out → login screen
blocks the app`) runs hermetically in ci.yml's `e2e (chromium, mocked)` job; the matrix's Te entry
for this row cites that job on main run 36361217691.
`tests/api/test_route_coverage.py`'s `GET /api/config/firebase` case issues a real request and
asserts a 200 JSON envelope, and `tests/api/test_platform_auth.py::TestValidatedAuthMode` tests
the `AUTH_MODE` validation the endpoint's value depends on, both pytest and CI-run, backing the
`AUTH_MODE` half of this row independently of the Playwright evidence above.

**Code:** `src/components/auth/ConfigGate.tsx`, `src/components/auth/AuthGate.tsx`,
`src/lib/runtimeConfig.ts`; test ids `signin-screen`, `config-error` (the sibling states' own
markers; this row renders no distinct DOM beyond the app/login decision itself).

##### AUTH-05 · Sign-up mode

**Shows or does:** `login-toggle` switches `mode` between `signin` and `signup`; in `signup` mode
the same form submits through `signUpWithEmail` (`createUserWithEmailAndPassword`,
`firebaseImpl.ts:81-96`), which also fires a verification email and records the outcome in the
`authGate` store (`recordVerificationEmail`) for `EmailVerificationBanner` to read, since
`onAuthStateChanged` has already swapped the screen for the app shell by the time that send
resolves.

**Needs:** the server-side access policy: `_is_allowed` (`auth.py:169`) permits any email when
`AUTH_OPEN_SIGNUP=1` (the default) or checks `AUTH_ALLOWED_EMAILS` otherwise. This runs on every
*subsequent* gated API call, not the sign-up itself (Firebase-SDK-only), so a disallowed account
can create a Firebase user and still 403 on every gated request afterward.

**States:** shared `busy`/`error` state; the heading and submit-button copy swap ("Create your
account" / "Create account") with `mode`.

**Acceptance criteria:**
- Given the sign-in screen, when `login-toggle` is clicked, then `mode` becomes `signup` and
  `login-submit`'s text becomes "Create account" (`SignInScreen.tsx:275-284`; `login screen
  toggles between sign-in and sign-up`, asserting `login-submit` text before and after the click).
- Given `AUTH_OPEN_SIGNUP=0` and an email outside `AUTH_ALLOWED_EMAILS`, when that email later
  makes a gated `/api/*` call, then the backend answers 403 `"this account is not allowed"`, never
  a silent pass-through (`auth.py:169, 209-210`; `test_firebase_allowlist_switch`,
  `tests/api/test_platform_auth.py`, asserting 200 for allow-listed emails and 403 for one that
  is not).
- Given a successful sign-up, when the verification-email send is still in flight or fails, then
  the outcome is recorded per-uid in the `authGate` store rather than shown on a screen that has
  already unmounted (`firebaseImpl.ts:84-96`; the store itself is unit-tested by
  `src/lib/authGate.test.ts`, independent of sign-up).

**Tests:** `tests/shared/auth-gate.spec.ts` (`login screen toggles between sign-in and sign-up`)
runs hermetically in ci.yml's `e2e (chromium, mocked)` job; the matrix's Te entry for this row
cites that job on main run 36361217691. `tests/api/test_platform_auth.py::test_firebase_allowlist_switch`
is real, CI-run pytest coverage of this row's access-policy half (`_is_allowed`); together the two
suites back the Te tick, though the verification-email bookkeeping itself remains untested by any
suite.

**Code:** `src/components/auth/SignInScreen.tsx:29, 275-284`, `src/lib/firebaseImpl.ts:81-96`,
`platform/api/auth.py:169`; test ids `login-toggle`, `login-submit`.

##### AUTH-07 · Identity and role read (email, admin, dev)

**Shows or does:** `useUser()` is the app's single identity hook. In firebase mode it subscribes
to `onAuthStateChanged` for `isSignedIn`/`uid`/`emailVerified`, and once signed in (or
unconditionally in `iap`/`open` mode) queries `GET /api/me`, keyed by `uid` so an account switch
across tabs cannot serve a cached `is_admin` for the wrong identity. The backend's
`get_current_user` resolves the verified email (bearer token in firebase mode, the IAP header in
iap mode), looks up `stored_role_for(email)` once, and derives both `is_admin` (`ADMIN_EMAIL` env
fallback OR a stored `'admin'` role) and `is_dev` (a stored `'dev'` role) from that single query.

**Needs:** `GET /api/me`; the `user_roles` table (one row per email, written through
`PUT /api/admin/users/{uid}/roles`, ADMIN-04).

**States:** the query's own `isLoading` feeds AUTH-02; a query error leaves `email`/`isAdmin`/
`isDev` at their safe defaults (`null`/`false`/`false`) rather than caching a fabricated anonymous
answer; the query function throws on a non-OK response so React Query keeps it refetchable.

**Acceptance criteria:**
- Given a stored role of `'dev'`, when `/api/me` is read, then the response is
  `is_admin: false, is_dev: true` (`test_me_dev_role_sets_is_dev_not_is_admin`).
- Given a stored role of `'admin'`, when `/api/me` is read, then `is_admin: true, is_dev: false`
  (`test_me_admin_role_sets_is_admin_not_is_dev`).
- Given no stored role but an email matching `ADMIN_EMAIL`, when `/api/me` is read, then
  `is_admin` is still `true` via the env fallback
  (`test_me_env_fallback_admin_without_table_row`).
- Given no identity at all (anonymous), when `/api/me` is read, then the response is
  `{"email": null, "is_admin": false, "is_dev": false}`, never `0`/`''` standing in for "unknown"
  (`test_me_plain_user_and_anonymous`).
- Given a real, unauthenticated request against `GET /api/me` on staging, when issued from this
  session, then it answers 200 with `{"email":null,"is_admin":false,"is_dev":false}`, matching
  `test_me_plain_user_and_anonymous`'s anonymous case field for field (verified 2026-09-28, see
  the V-gate evidence comment).

**Tests:** `tests/api/test_platform_auth.py`'s `_me`-keyed tests
(`test_me_dev_role_sets_is_dev_not_is_admin`, `test_me_admin_role_sets_is_admin_not_is_dev`,
`test_me_env_fallback_admin_without_table_row`, `test_me_plain_user_and_anonymous`) exercise
`get_current_user` through a real FastAPI `TestClient`, covering every role/anonymous combination
this row claims: pytest, CI-run (`python -m pytest tests/ -x -q --ignore=tests/integration`, the
Backtest Pipeline workflow on `main`), so this row ticks Te on that evidence.
`tests/api/test_route_coverage.py` also requests `GET /api/me` as part of its full-surface sweep
(200, JSON envelope). The client side (`useUser.ts`'s consumption of the response) has no Vitest
of its own; `tests/admin/admin-auth.spec.ts` exercises the admin-gating consequence of `is_admin`
end to end and runs hermetically in ci.yml's `e2e (chromium, mocked)` job; the matrix's Te entry
for this row appends that job on main run 36361217691 to the pytest evidence above.

**Code:** `platform/api/main.py:282-304 get_current_user`, `platform/api/auth.py:229-264
stored_role_for`, `platform/api/auth.py:224-226 configured_admin_email`, `src/hooks/useUser.ts`.

##### AUTH-03 · Google sign-in, with the new-tab variant when framed

**Shows or does:** `SignInScreen` computes `isFramed()` once at mount (`window.self !==
window.top`, catching a cross-origin throw as "framed too") and branches: framed renders an
`<a target="_blank" data-testid="google-signin-newtab">` that reopens the current URL in a new
top-level tab (Google's popup handshake cannot complete inside a cross-origin iframe, since storage
partitioning blocks the `postMessage` back); not framed renders a
`<button data-testid="google-signin">` that calls `signInWithGoogle()` →
`signInWithPopup(auth, new GoogleAuthProvider())`.

**Needs:** Firebase Auth's Google provider and the project's authorized-domains list (whatever
origin the popup or new tab completes on must be authorized).

**States:** framed / not framed, the two branches above; otherwise the shared `busy`/`error`
state `run()` manages for every sign-in method on this screen.

**Acceptance criteria:**
- Given the sign-in screen is embedded in an iframe, when it mounts, then it renders
  `google-signin-newtab` (visible, `target="_blank"`) and `google-signin` is absent
  (`SignInScreen.tsx:182-198`; `framed preview: the Google button opens a new tab instead of a
  popup`, new test, driven by loading `/dashboard` inside a real `<iframe>` via `page.setContent`
  so the real top-level page is genuinely a different browsing context from the iframe).
- Given the sign-in screen is not framed, when it mounts, then it renders `google-signin`, and
  clicking it calls `run(signInWithGoogle)` (`firebase mode, signed out → login screen blocks the
  app` asserts `google-signin` visible in the ordinary, unframed test harness).
- Given `signInWithGoogle()` rejects (popup closed, blocked, network failure), when the promise
  settles, then `friendlyError` maps the SDK code to sign-in-screen copy and `run()` sets it as
  `login-error`, never leaving the screen in a stuck `busy` state (`SignInScreen.tsx:45-56`); the
  Google-specific codes (`auth/popup-closed-by-user`, `auth/popup-blocked`,
  `auth/cancelled-popup-request`) are unit-tested as pure mappings in `src/lib/authAction.test.ts`,
  though no test drives this specific rejection through `SignInScreen` itself.

**Tests:** `tests/shared/auth-gate.spec.ts` (`firebase mode, signed out → login screen blocks the
app`, asserting the unframed `google-signin` button, pre-existing) runs hermetically in ci.yml's
`e2e (chromium, mocked)` job and genuinely covers the not-framed branch, but this row's own title
names the framed new-tab variant, and the only test that asserts it
(`framed preview: the Google button opens a new tab instead of a popup`) is one this branch added;
the cited main run (36361217691) is on commit eca7078, this branch's base, so it predates that
test. Te waits for a CI run that includes it (see Gaps).
`src/lib/authAction.test.ts`'s `friendlyError` suite covers the Google-specific error codes as
pure-function mappings (Vitest, CI-run), but no test wires that mapping through this component,
so it does not lift Te for this row either way.

**Code:** `src/components/auth/SignInScreen.tsx:180-209`, `src/lib/firebase.ts` (`isFramed`,
`signInWithGoogle`), `src/lib/firebaseImpl.ts:71-74`; test ids `google-signin`,
`google-signin-newtab`.

##### AUTH-04 · Email and password sign-in with inline error

**Shows or does:** `SignInScreen`'s email/password form (`onEmailSubmit`) calls
`signInWithEmail(email, password)` in `signin` mode (`signInWithEmailAndPassword` under the hood,
`firebaseImpl.ts:76-78`); `run()` wraps the call, and a rejection sets `error` from
`friendlyError(err.code, err.message)`, rendered inline as `data-testid="login-error"` directly
under the password field, never a silent failure or a redirect away from the form.

**Needs:** Firebase Auth's password provider. The sign-in call itself is client-SDK-only, nothing
to our backend; only `/api/*` calls made once signed in attach the resulting ID token
(`authedFetch.ts`).

**States:** the shared `busy`/`error` state `run()` manages for every method on this screen.

**Acceptance criteria:**
- Given valid credentials, when the form is submitted, then `signInWithEmail` resolves,
  `onAuthStateChanged` (via `useUser`) flips `isSignedIn`, and `AuthGate` renders the app with no
  explicit navigation call (`SignInScreen.tsx:58-66`; `sign out returns to the sign-in screen`,
  new test, whose setup signs in this way before exercising sign-out).
- Given the identity call rejects (Identity Toolkit answers `accounts:signInWithPassword` with a
  400 `INVALID_PASSWORD` body), when the promise settles, then `login-error` becomes visible and
  reads "Incorrect email or password."; `friendlyError` maps `auth/invalid-credential` /
  `auth/wrong-password` / `auth/user-not-found` to that one message (`authAction.ts:16-23`,
  unit-tested by `src/lib/authAction.test.ts`'s `friendlyError` suite); proved end to end through
  the real form by `email sign-in shows the inline error when the identity call fails`, new test,
  which routes the Identity Toolkit call to that exact 400 body and asserts the rendered text;
  the app stays on `signin-screen` throughout, never rendering behind a failed attempt.
- Given the submit button, when `email`/`password` are empty or a request is in flight, then it is
  `disabled` (`SignInScreen.tsx:266`), so no empty or duplicate submission reaches the SDK.

**Tests:** `tests/shared/auth-gate.spec.ts` (`login screen toggles between sign-in and sign-up`,
pre-existing, toggles the UI mode only and asserts nothing about an inline error;
`email sign-in shows the inline error when the identity call fails`, the only test that actually
asserts this row's own behavior, is one this branch added) runs hermetically in ci.yml's
`e2e (chromium, mocked)` job, but the cited main run (36361217691, commit eca7078) predates that
test, so Te waits for a CI run that includes it (see Gaps).
`src/lib/authAction.test.ts`'s `friendlyError` describe block is real, CI-run (Vitest) coverage of
the error-copy mapping this row's "with inline error" half depends on, but it tests the pure
function in isolation, not the form submission itself, so it does not on its own satisfy Te for
the row.

**Code:** `src/components/auth/SignInScreen.tsx:58-66, 218-273`, `src/lib/authAction.ts`
(`friendlyError`), `src/lib/firebaseImpl.ts:76-78`; test ids `login-email`, `login-password`,
`login-submit`, `login-error`.

##### AUTH-06 · Forgot password: reset email, then /auth/action

**Shows or does:** `login-forgot` switches `SignInScreen` to `reset` mode; submitting `reset-email`
calls `sendPasswordReset` (`onResetSubmit`, `SignInScreen.tsx:68-87`). Success, or the
enumeration-safe `auth/user-not-found` case (`resetLooksSent`), shows the neutral `reset-sent`
confirmation naming the address, never confirming or denying the account exists. The emailed
link's `%LINK%` points at this project's `callbackUri`, set by `gcp/auth_email_templates.py` to
`https://solyra-stocks.lovable.app/auth/action` rather than Google's generic action page, so it
lands on `AuthActionPage`, whose state machine (`parseAuthAction` → `checkAuthActionCode` →
mode-specific apply) verifies the code, checks the SDK-reported operation actually matches the
link's `mode` (`operationMatchesMode`, refusing a mismatched code before applying it), and renders
the reset form, a destructive-action confirmation, or the success/error card.

**Needs:** Firebase Auth action links; the branded email templates (`gcp/auth_email_templates/`)
rendered by `gcp/auth_email_templates.py`, whose `callbackUri` is the one fact about the email
this app's own route depends on.

**States:** the reset request itself (idle → sending → sent/error); `/auth/action`'s own view
machine: loading, invalid-link, unavailable (open mode), reset-form, confirm-apply, success, error.

**Acceptance criteria:**
- Given a reset request for an existing address, when it resolves, then `reset-sent` shows the
  address and "if an account exists" copy, and the actual `sendOobCode` call carries
  `requestType: PASSWORD_RESET` (`requests a reset link and shows the neutral confirmation`).
- Given Identity Toolkit answers `TOO_MANY_ATTEMPTS_TRY_LATER`, when the request is submitted,
  then `login-error` shows the rate-limit message and `reset-sent` never renders (`a rate-limit
  failure is shown, not swallowed`).
- Given `gcp/auth_email_templates.py`'s PATCH body, when it is built, then `callbackUri` is
  `https://solyra-stocks.lovable.app/auth/action` (`test_build_patch_covers_all_templates_and_callback_uri`,
  `tests/test_auth_email_templates.py`), so the emailed button lands on this app's own route, not
  Google's generic one.
- Given a `resetPassword` link with a valid code, when `/auth/action` loads it, then it shows
  `auth-action-reset-form` with the email the code carries, rejects a password/confirmation
  mismatch client-side before any network call, and on success shows `auth-action-success`
  (`password reset: verifies the code, validates the form, confirms, succeeds`;
  `validateNewPassword`, unit-tested by `src/lib/authAction.test.ts`).
- Given a link whose `mode` query param disagrees with the operation the code actually carries,
  when the page checks it, then it refuses to apply the code and shows the mismatch error
  (`operationMatchesMode`; `a code whose operation disagrees with mode is refused before it is
  applied`; the matching function itself unit-tested in `src/lib/authAction.test.ts`).
- Given `authMode` is not `firebase`, when `/auth/action` loads, then it shows
  `auth-action-unavailable` rather than attempting an SDK call that cannot succeed (`open mode →
  email sign-in unavailable card`).

**Tests:** `tests/shared/auth-gate.spec.ts` (`Forgot password` describe block, `/auth/action`
describe block, 10 tests total) runs hermetically in ci.yml's `e2e (chromium, mocked)` job; the
matrix's Te entry for this row appends that job on main run 36361217691. Two CI-run suites already
cover this row's own logic closely enough to tick Te independently: `src/lib/authAction.test.ts` (Vitest, 15 tests
passed) unit-tests `parseAuthAction`, `operationMatchesMode`, `validateNewPassword`,
`friendlyActionError`, `successCopy`, and `resetLooksSent`, effectively the entire client-side
decision logic this row exercises, independent of DOM rendering; `tests/test_auth_email_templates.py`
(pytest, 26 tests passed) asserts the rendered templates and, specifically, `callbackUri`, the one
backend fact this row depends on. Both confirmed passing in this task.

**Code:** `src/components/auth/SignInScreen.tsx:68-87, 108-168` (reset request),
`src/routes/AuthActionPage.tsx` (the full state machine), `src/lib/authAction.ts`,
stocks `gcp/auth_email_templates.py`, [docs/AUTH_EMAILS.md](https://github.com/TeneikaAskew/stocks/blob/main/docs/AUTH_EMAILS.md); test ids `login-forgot`, `reset-email`,
`reset-submit`, `reset-sent`, `reset-back`, `auth-action-*` (see `AuthActionPage.tsx`).

##### AUTH-09 · Sign out

**Shows or does:** `SignOutButton` (rendered only in firebase mode for a signed-in user) calls
`firebaseSignOut()` then `qc.clear()` on the React Query cache (`SignOutButton.tsx:18-24`), so no
data tied to the previous identity survives into the next session; `onAuthStateChanged` then
flips `useUser().isSignedIn` to false and `AuthGate` renders `SignInScreen` again. A second,
independently implemented sign-out control exists for the mobile account menu,
`AuthStatusIndicator.tsx`'s `account-menu-sign-out` button (`AuthStatusIndicator.tsx:96-103`),
with the same `firebaseSignOut` + `qc.clear()` body duplicated rather than shared.

**Needs:** nothing from our backend; `firebaseSignOut` is `signOut(auth)` against the Firebase SDK
only.

**States:** none beyond signed-in/signed-out.

**Acceptance criteria:**
- Given a signed-in firebase-mode session, when `sign-out` is clicked, then `firebaseSignOut()`
  resolves, the query cache is cleared, and `AuthGate` renders `signin-screen` again with no page
  reload (`SignOutButton.tsx:18-24`; `sign out returns to the sign-in screen`, new test: signs in
  via a mocked `accounts:signInWithPassword` success, confirms `signin-screen` is absent and
  `sign-out` is visible, clicks it, then confirms `signin-screen` reappears).
- Given `open`/`iap` mode, when `SignOutButton` renders, then it renders nothing
  (`authMode !== 'firebase' || !isSignedIn` returns `null`, `SignOutButton.tsx:16`); the mobile
  account-menu variant is asserted absent under open mode by `tests/shared/navigation.spec.ts`
  (`account-menu-sign-out` has zero count), which covers the *absence* of the mobile control
  outside firebase mode, not the sign-out *action* itself, which only the new test above exercises
  end to end.

**Tests:** `tests/shared/auth-gate.spec.ts` (`sign out returns to the sign-in screen`, the only
test that actually asserts this row's own action, is one this branch added),
`tests/shared/navigation.spec.ts` (`auth status lives at the menu bottom, not the bar`,
pre-existing, the negative open-mode case, asserts absence of a different control, not this row's
action). Both run hermetically in ci.yml's `e2e (chromium, mocked)` job, but the cited main run
(36361217691, commit eca7078) predates the new test, so Te waits for a CI run that includes it
(see Gaps).

**Code:** `src/components/auth/SignOutButton.tsx`, `src/components/shared/AuthStatusIndicator.tsx:96-103, 132`;
test ids `sign-out`, `account-menu-sign-out`.

##### AUTH-02 · State: loading spinner while the session resolves

**Shows or does:** Two independent spinners cover two different waits. `AuthGate` renders
`LoadingSpinner` (`size={28}`) centered on a full-height screen while `useUser().isLoading` is
true, while the Firebase SDK has not yet reported an auth state (`!fbReady`) or, once signed
in, while the `/api/me` query is still in flight (`AuthGate.tsx:19-25`). `ConfigGate` renders its
own `LoadingSpinner` (`size={32}`) while its own boot promise (`bootOnce`) is still pending, before
either the app or `AuthGate` mounts at all (`ConfigGate.tsx:168-174`).

**Needs:** nothing of its own; it renders while AUTH-01's config fetch or AUTH-07's `/api/me`
query is outstanding.

**States:** this row is itself a state of AUTH-01/AuthGate; it has no further sub-states.

**Acceptance criteria:**
- Given `useUser().isLoading` is true, when `AuthGate` renders, then it shows `LoadingSpinner`
  instead of `SignInScreen` or the app (`AuthGate.tsx:19-25`).
- Given the config boot promise has not yet settled, when `ConfigGate` renders, then it shows its
  own `LoadingSpinner` instead of children (`ConfigGate.tsx:168-174`).
- Given the app boots in `open`/`iap` mode, when `useUser` runs, then `isLoading` starts `false`
  (`!firebaseMode`, `useUser.ts:26`) and this spinner is never reachable there; no
  `auth-gate.spec.ts` open-mode test ever needs to wait it out.

**Tests:** none. No Vitest or Playwright test isolates this render: every hermetic mock in
`tests/shared/auth-gate.spec.ts` fulfills `/api/config/firebase` and `/api/me` synchronously, so
the spinner, if it paints at all, is gone before any assertion runs. See Gaps.

**Code:** `src/components/auth/AuthGate.tsx:19-25`, `src/components/auth/ConfigGate.tsx:168-174`,
`src/components/shared/LoadingSpinner.tsx`.

##### AUTH-08 · State: permission, 401 on a gated call shows "Sign in to load data"

**Shows or does:** Two mechanisms working together. Server: `auth_middleware` answers any gated
`/api/*` request with 401 when no/invalid token is presented, in firebase mode only
(`auth.py:188-213`). Client: `authedFetch.ts`'s `track()` calls `markAuthBlocked()` on any
gated-path 401 and `clearAuthBlocked()` on the next gated-path success (`authedFetch.ts:157-165,
249-250`); `markAuthBlocked` flips a module-level flag and notifies subscribers
(`authGate.ts:14-47`). `useAuthBlocked()` (a `useSyncExternalStore` hook) is read by
`SignInEmptyState`, `AuthStatusIndicator`, and `MostActiveBar` (`MostActiveBar.tsx:179`), which
render "Sign in to load data" (or the equivalent banner/marquee-suppression) instead of a blank or
stale card, never a fabricated value (Rule 4).

**Needs:** nothing beyond the gated endpoint being called; this row is the shared consequence of
every 401, not a request of its own.

**States:** this row is itself the "permission" state for every data-bearing page; it has no
further sub-states.

**Acceptance criteria:**
- Given firebase mode and no token, when a gated path like `/api/secret` is requested, then the
  backend answers 401, while `/api/health`, `/api/me`, and `/api/waitlist` (the open paths) still
  answer normally (`test_firebase_requires_valid_token`, `tests/api/test_platform_auth.py`).
- Given the fetch wrapper is installed in firebase mode, when a gated path answers 401, then
  `onUnauthorized` (the callback `authedFetch.ts` exposes via `setOnUnauthorized`) fires exactly
  once, and does not fire for a 401 from an open path. This is a distinct, adjacent signal from
  `markAuthBlocked`/`isAuthBlocked`; the same 401 handling code path runs `markAuthBlocked()` for
  real as a side effect in this suite, but no assertion in it reads the resulting flag (`a 401 from
  a gated path fires onUnauthorized`, `a 401 from an OPEN path does not fire onUnauthorized`,
  `src/lib/authedFetch.test.ts`).
- Given a stale token, when a gated call first 401s, then the wrapper retries once with a
  force-refreshed token before giving up, so a merely-expired token does not trip this state
  unnecessarily (`retries a gated 401 once with a force-refreshed token and does not report
  signed-out on success`, `src/lib/authedFetch.test.ts`).
- Given `isAuthBlocked()` is true, when `MostActiveBar` renders, then it shows the signed-out
  presentation rather than an empty or stale marquee (`MostActiveBar.tsx:179`, read directly); no
  test in `tests/shared/most-active-bar.spec.ts` exercises this branch (its six tests cover
  rendering with data, non-mount on other routes, reduced motion, the empty list, a 500 response
  and horizontal overflow only, none mocking a 401 or referencing auth), matching the untested
  status this same branch carries under SHELL-05.
- Given a real, unauthenticated request against `GET /api/market/most-active` on staging, when
  issued from this session, then it answers 401 (verified 2026-09-28, see the V-gate evidence
  comment).

**Tests:** `src/lib/authedFetch.test.ts` (15 tests, Vitest, CI-run) is real, passing coverage of
the 401-on-gated-path mechanics and the token-retry behavior, though its assertions target the
`onUnauthorized` callback and the `Authorization` header, not `isAuthBlocked()` directly;
`markAuthBlocked`/`clearAuthBlocked` run for real as an unmocked side effect, but no assertion in
that file reads the resulting flag. `tests/api/test_platform_auth.py::test_firebase_requires_valid_token`
covers the server-side 401 half. Together these back the Te tick for this row.
`tests/shared/most-active-bar.spec.ts` does **not** cover this row: an earlier version of this
line claimed it exercised the `isAuthBlocked` → "Sign in to load data" rendering, but reading the
file directly shows its six tests (data rendering, non-mount, reduced motion, the empty list, a
500 response, horizontal overflow) never mock a 401 or mention auth at all. Corrected 2026-09-28.
The `isAuthBlocked` branch itself remains untested by any suite, Vitest or Playwright.

**Code:** `platform/api/auth.py:188-213 auth_middleware`, `src/lib/authedFetch.ts:157-165,
249-250`, `src/lib/authGate.ts:14-47 markAuthBlocked/clearAuthBlocked/useAuthBlocked`,
`src/components/shared/SignInEmptyState.tsx`, `src/components/shared/AuthStatusIndicator.tsx`,
`src/components/shared/MostActiveBar.tsx:179`.

##### AUTH-10 · State: error, config fetch failure shows the config-error screen

**Shows or does:** `fetchRuntimeConfig` throws on a non-OK status, a network failure, or a body
that parses but doesn't carry a recognized `authMode` literal (guarding against a static host's
SPA-fallback `index.html` answering `/api/config/firebase` with 200 `text/html`).
`ConfigGate` catches that in its boot effect and renders `ConfigErrorScreen`
(`data-testid="config-error"`) instead of falling back to any default mode; this is the regression fence
for issue #5, where a bot edit once swapped this path to silently fail open.

**Needs:** `GET /api/config/firebase` failing or answering an unrecognized shape; no data need of
its own beyond that.

**States:** this row is itself the `error` state for AUTH-01; it has no further sub-states.

**Acceptance criteria:**
- Given `/api/config/firebase` answers 500, when `ConfigGate` boots, then `config-error` is
  visible and neither the app shell nor `signin-screen` ever renders (`config fetch failure →
  config-error screen, app never renders`).
- Given `/api/config/firebase` answers 200 with `text/html` (a static host's SPA fallback), when
  `ConfigGate` boots, then the JSON-shape guard still rejects it and shows `config-error`, rather
  than reading the fallback HTML as `authMode` (`config endpoint answering HTML (static-host
  fallback) → config-error screen`).
- Given a `Failed to fetch` message on a known static-frontend host, when `describeBootFailure`
  builds the shown message, then it appends a CORS-allow-list hint rather than the bare browser
  error (`ConfigGate.tsx:58-65`); no test exercises `describeBootFailure` directly (see Gaps).

**Tests:** `tests/shared/auth-gate.spec.ts` (`config fetch failure → config-error screen, app
never renders`, `config endpoint answering HTML (static-host fallback) → config-error screen`)
runs hermetically in ci.yml's `e2e (chromium, mocked)` job; the matrix's Te entry for this row
cites that job on main run 36361217691. No pytest or Vitest covers a failure response from this
endpoint, or
`describeBootFailure` itself.

**Code:** `src/components/auth/ConfigGate.tsx:27-65, 94-123`; test id `config-error`.

### SCREEN-SHELL — app shell

- **Purpose:** Shared layout for the 13 authenticated app routes: sidebar or top-tab navigation, header, command palette, status banners and the most-active marquee around the routed page.
- **Matrix:** [03 § 03](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#03--appshell)
- **Status:** Infrastructure · **Blocking issue:** — · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-09-28
- **Component:** `src/components/layout/AppShell.tsx` (80 lines)
- **Child components:** `Sidebar`, `TopTabs`, `Header`, `CommandPalette`, `MostActiveBar`, `AuthStatusBanner`, `EmailVerificationBanner`, `MockModeBanner`, `Outlet`
- **API calls (from source):** `/api/market/most-active`, `/api/live/status`, `/api/me/preferences`, `/api/config/market-hours`
- **Stores:** `useSettingsStore`
- **E2E specs:** `tests/shared/navigation.spec.ts`, `tests/shared/most-active-bar.spec.ts`, `tests/shared/mock-mode.spec.ts`
- **PR lineage:** not traced
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/me | email, is_admin, is_dev (types: `useUser.ts` MeResponse) |  | 30s staleTime; a role granted or revoked converges on the next mount/focus refetch | `useUser` (via `AppShell`, `AuthStatusIndicator`) |
| GET /api/market/most-active | items[].symbol/price/change_pct/volume (types: `MostActiveBar.tsx` MostActiveItem/MostActiveResponse) | fetch-top-movers 16:15 ET Mon-Fri → top_movers_intraday | 10min staleTime, 15min refetch | `MostActiveBar` |
| GET /api/live/status | is_open, session, next_open, current_time_et (types: `useLiveStatus.ts` LiveStatus) |  | 60s refetch, 30s staleTime | `MarketSessionBadge` (`useLiveStatus`) |
| GET/PUT /api/me/preferences | theme, nav_pattern, density, accent (types: `preferences.ts` UserPreferences) |  | hydrated once per session, written through on every change | `usePreferencesSync` (`usePreferences.ts`), mounted in `AppShell` |
| GET /api/config/market-hours | timezone, regular/pre_market/after_hours windows, holidays_2026 (types: `useConfig.ts` MarketHours) |  | static config, cached for the session | `ReplayControl` |

#### Displayed
| ID | Element | Component |
|---|---|---|
| SHELL-01 | Sidebar or TopTabs navigation | `Sidebar` / `TopTabs` |
| SHELL-02 | Header in sidebar mode (auth status, sign out, replay control, theme toggle) | `Header` |
| SHELL-03 | MockModeBanner | `MockModeBanner` |
| SHELL-04 | AuthStatusBanner and EmailVerificationBanner | `AuthStatusBanner`, `EmailVerificationBanner` |
| SHELL-05 | MostActiveBar marquee | `MostActiveBar` |
| SHELL-06 | RouteErrorBoundary | `RouteErrorBoundary` |
| SHELL-07 | Market session badge (LIVE, PRE, AH, CLOSED) | `MarketSessionBadge` |
| SHELL-08 | Command palette (Cmd-K, Ctrl-K) | `CommandPalette` |
| SHELL-09 | Replay control (historical review) | `ReplayControl` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| SHELL-10 | Theme toggle | `Header`/`TopTabs` call `toggleTheme`, which flips `themeStore` (persisted to `localStorage` as `platform-theme`) and writes through to `PUT /api/me/preferences` via `usePreferencesSync`. |
| SHELL-11 | Sign out | `SignOutButton` calls `firebaseSignOut`, then clears the React Query cache; renders only in firebase mode for a signed-in user. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| SHELL-12 | loading (marquee before the first response) | absent (none in the shell itself) | `MostActiveBar` has no loading branch: `items = data?.items ?? []`, and it renders `null` until the first response arrives. |
| SHELL-13 | empty (marquee renders nothing on an empty list) | absent (none in the shell itself) | Same `items.length === 0` guard in `MostActiveBar` returns `null` for a genuinely empty list, indistinguishable in source from the loading case. |
| SHELL-14 | error (marquee absent on 500, page renders) | absent (none in the shell itself) | A failed `/api/market/most-active` leaves `data` undefined, so `items` is still `[]` and the marquee renders nothing while the rest of the shell renders fine. |
| SHELL-15 | stale (session badge truthful when closed) | absent (none in the shell itself) | `MarketSessionBadge` renders CLOSED/PRE/AH from `useLiveStatus().session`; it never shows LIVE when the market is shut. |
| SHELL-16 | permission (auth status banner when signed out or blocked) | not tracked (new category); present | `AuthStatusBanner` renders "You are signed out, so live data is not loading." (or the expired-session variant) with a Sign in button whenever `useUser().isSignedIn` is false. |

#### Journeys
1. Jump to a page by keyboard: Presses ⌘K anywhere in the app (SHELL-08) → CommandPalette opens (SHELL-08) → Types a page or ticker (SHELL-08) → Enter navigates, the shell never unmounts
2. Switch to historical review: Opens the replay control in the nav row (SHELL-09) → Picks a date and time (SHELL-09) → Review-aware pages re-fetch as-of that moment → Live-only widgets hide themselves → Clears the date to return to live (SHELL-09)
3. Change the nav pattern: Support then Settings (SHELL-01) → Appearance tab then Navigation → Picks Sidebar instead of Tabs (SHELL-01) → Shell re-renders with a sidebar and the separate header strip (SHELL-01, SHELL-02) → Preference is written through to the account

#### Elements
##### SHELL-01 · Sidebar or TopTabs navigation

**Shows or does:** AppShell picks one of two nav shells by `useSettingsStore().navPattern`:
`Sidebar` when `'sidebar'`, `TopTabs` (the default, `'top-tabs'`) otherwise (`AppShell.tsx:57,61`).
Both read the same `NAV_GROUPS` from `navConfig.ts`: TRADING (Dashboard, inline), MARKET
(Live/Charts/Options Flow/Signals, a dropdown in TopTabs, always expanded in Sidebar),
INTELLIGENCE (AI Insights/Catalysts, inline), LEARN (Playbook/Reports/Journal, dropdown),
SUPPORT (Admin/Settings/Help & Glossary/FAQ, dropdown; Admin filtered by `adminOnly` unless
`useUser().isAdmin`). TopTabs additionally collapses to a hamburger menu under 640px
(`sm:hidden`/`sm:flex`), grouping the same items plus `AccountMenuSection`.

**Needs:** `navConfig.ts`'s `NAV_GROUPS`/`FLAT_NAV` (client-only, no API); `useSettingsStore().navPattern`
(persisted `localStorage['platform-shell-settings']`, hydrated from the server by
`usePreferencesSync`, SHELL-10); `useUser().isAdmin` to filter the Admin link.

**States:** covered by the general loading/empty/error/stale/permission rows (SHELL-12 to
SHELL-16); the nav itself has no distinct loading state (renders immediately from the static
`NAV_GROUPS`, only the admin filter depends on `/api/me`).

**Acceptance criteria:**
- Given the default (unset) shell preference, when AppShell mounts, then `navPattern` reads
  `'top-tabs'` (`settingsStore.ts:45`'s `DEFAULTS`) and `TopTabs` renders, not `Sidebar`
  (`top nav renders inline tabs + Market/Learn/Support dropdowns for non-admin`,
  `tests/shared/navigation.spec.ts`).
- Given the SUPPORT dropdown for a non-admin (`/api/me` → `is_admin: false`), when it opens,
  then `a[href="/admin"]` has zero count (same test).
- Given `navPattern: 'sidebar'` is seeded in `localStorage['platform-shell-settings']` before
  boot, when AppShell mounts, then `Sidebar` renders and an admin email sees
  `nav a[href="/admin"]` (`admin email sees Admin link in sidebar`, `tests/admin/admin-auth.spec.ts`).
- Given a click on a top-nav link, when the route changes, then the corresponding group's
  trigger gains the `active` class (`can navigate between routes via top-nav clicks`,
  `tests/shared/navigation.spec.ts`).

**Tests:** `tests/shared/navigation.spec.ts` (`top nav renders inline tabs...`, `can navigate
between routes via top-nav clicks`), `tests/admin/admin-auth.spec.ts` (sidebar rendering and the
Admin-link filter), `tests/settings/settings.spec.ts` (`navigation toggle persists the shell
choice and writes through` exercises the SAME `navPattern` store from the Settings side). All
Playwright; no colocated Vitest test of `Sidebar.tsx`/`TopTabs.tsx`/`navConfig.ts` was found.

**Code:** `src/components/layout/AppShell.tsx:57,61`, `src/components/layout/Sidebar.tsx`,
`src/components/layout/TopTabs.tsx`, `src/components/layout/navConfig.ts`; test ids
`nav-menu-market`, `nav-menu-learn`, `nav-menu-support`, `nav-group-menu`.

##### SHELL-02 · Header in sidebar mode (auth status, sign out, replay control, theme toggle)

**Shows or does:** A thin utility strip rendered only when `isSidebar` is true (`AppShell.tsx:66`,
`{isSidebar && <Header />}`); in top-tabs mode the same controls fold into `TopTabs`'s single row
instead (`Header.tsx`'s own doc comment). Left to right: `AuthStatusIndicator` (identity pill),
`SignOutButton`, `ReplayControl`, then a dark/light toggle button.

**Needs:** `useThemeStore()` for the toggle (SHELL-10); `useAuthStatus()` (`useAuthBlocked` +
`useUser`) for the identity pill (SHELL-04/16); `useUser()` for `SignOutButton`'s render gate;
`ReplayControl`'s own `/api/config/market-hours` read (SHELL-09).

**States:** none of its own; composes SHELL-04's identity pill, SHELL-09's replay control and
SHELL-10's toggle, each with its own state handling.

**Acceptance criteria:**
- Given `navPattern !== 'sidebar'`, when AppShell renders, then no `<header>` strip mounts at
  all: `TopTabs` carries the same controls inline instead (`AppShell.tsx:61-77`, read directly).
- Given `navPattern === 'sidebar'`, when AppShell renders, then the header mounts with a
  `Switch to light theme`/`Switch to dark theme` button, visible at the default (≥640px)
  Playwright viewport (`theme toggle flips the document theme attribute`,
  `tests/shared/navigation.spec.ts`, new in this task, the first test that seeds sidebar mode
  and asserts against this specific component rather than `TopTabs`'s identical-looking inline
  control).

**Tests:** `tests/shared/navigation.spec.ts` (`theme toggle flips the document theme attribute`,
new in this task). The pre-existing Chain citation here (`auth status lives at the menu bottom,
not the bar`) was wrong: that test drives `TopTabs`'s mobile hamburger menu at the default
`top-tabs` nav pattern and never mounts `Header` at all, corrected in the T-gate commit (see
Gaps).

**Code:** `src/components/layout/Header.tsx`.

##### SHELL-03 · MockModeBanner

**Shows or does:** `if (!isMockModeActive()) return null;` else an amber strip ("Mock data mode:
IWM fixture data only...") with an Exit button. Mounted unconditionally in `AppShell.tsx:67`,
above the routed page on every route (not just the Market group).

**Needs:** `src/lib/mockMode.ts`'s `isMockModeActive()`/`setMockMode()`, reading/writing
`localStorage['solyra-mock-mode']` only, no API. Its own doc comment: the banner reads only
`localStorage` (not the mocked `/api/me`) specifically so Exit stays reachable even if a fixture
breaks the shell.

**States:** on/off is itself the state; no loading/error (a synchronous `localStorage` read).

**Acceptance criteria:**
- Given `solyra-mock-mode` is unset, when AppShell renders, then the banner is absent and zero
  `/api/*` requests are intercepted by the mock engine (verified indirectly: every other spec's
  clean run assumes the OFF default).
- Given the preference is `'on'`, when AppShell renders, then `mock-mode-banner` is visible and
  the mocked identity is used (`banner shows, app boots, and ZERO /api requests reach the
  network`, `tests/shared/mock-mode.spec.ts`).
- Given the Exit button is clicked, when `setMockMode(false)` persists, then the page reloads and
  the banner disappears, even with no Support-menu access (`the banner Exit button leaves the
  mode even without the menu`, same file).

**Tests:** `tests/shared/mock-mode.spec.ts` (all six tests exercise `mock-mode-banner` directly).
`src/lib/mockMode.test.ts` (Vitest, CI-run) tests the underlying `isMockModeActive`/`setMockMode`/
`mockModePreference`/`autoEnableMockModeForDev` functions this component calls, but never renders
`MockModeBanner` itself: the banner's own conditional render is Playwright-only.

**Code:** `src/components/shared/MockModeBanner.tsx`, `src/lib/mockMode.ts`; test ids
`mock-mode-banner`, `mock-mode-exit`.

##### SHELL-04 · AuthStatusBanner and EmailVerificationBanner

**Shows or does:** Two independent full-width strips, both mounted unconditionally in
`AppShell.tsx:68-69`, above the routed page on every route. `AuthStatusBanner` (`role="status"`,
`data-testid="auth-status-banner"`) renders only when `useAuthStatus().status` is `'blocked'` or
`'signed-out'` (hidden while `'loading'` or `'signed-in'`), with a Sign in button that reloads the
page. `EmailVerificationBanner` renders only for a signed-in email/password account whose
`emailVerified === false`, keyed by `uid` so a same-session account switch does not inherit the
previous account's Resend/confirmed state (its own doc comment).

**Needs:** `useAuthStatus()` = `useAuthBlocked()` (client-only, set by any gated 401,
`src/lib/authGate.ts`) combined with `useUser()`, which calls `GET /api/me`, served by
`platform/api/main.py:282 get_current_user`. `EmailVerificationBanner` needs no API at all:
`emailVerified` comes from the Firebase client SDK's `onAuthStateChanged`, not from `/api/me`.

**States:** both banners ARE state presentations (loading/blocked/signed-out for the first,
unverified for the second); the specific "blocked or signed-out" combination is SHELL-16.

**Acceptance criteria:**
- Given `useAuthStatus().status === 'loading'`, when `AuthStatusBanner` would render, then it
  returns `null` (`AuthStatusIndicator.tsx:158`; the same `useAuthStatus()` gate also hides the
  identity pill at `:40` and the account menu at `:81`, neither of which is a "banner" this row
  names, but both share the citation; no test isolates this transient render, see Gaps).
- Given `useUser()`'s Firebase auth state has resolved (`fbReady`, set inside the SAME
  `onAuthStateChanged` callback that sets `emailVerified`, `useUser.ts:36-45`) while the separate
  `/api/me` round trip is still in flight, when `EmailVerificationBannerFor` reads `emailVerified`,
  then it can render even though `useAuthStatus().status` is still `'loading'`: its hide
  condition (`emailVerified !== false || confirmed`, `AuthStatusIndicator.tsx:221`) never reads
  `useAuthStatus()` at all, only `useUser()`'s own `emailVerified`, which is independent of the
  `/api/me` query's own loading state (`isLoading = !fbReady || (meEnabled && query.isLoading)`,
  `useUser.ts:82`). Corrected in this task's fix round; the original bullet wrongly implied both
  banners share one loading gate.
- Given an anonymous open-mode session, when `GET /api/me` answers
  `{"email":null,"is_admin":false,"is_dev":false}`, then `isSignedIn` is `true` in open mode
  regardless (`useUser.ts:81`, `isSignedIn = firebaseMode ? signedIn : true`), so
  `AuthStatusBanner` stays hidden, matching production: verified 2026-09-28, `GET /api/me` on
  staging answers 200 with exactly that anonymous body (see the V-gate evidence comment).
- Given a firebase-mode email/password account with `emailVerified === false`, when
  `EmailVerificationBannerFor` mounts, then it shows "Confirm your email address." plus
  Resend/"I've confirmed" actions, and re-checks verification via `refreshEmailVerified()` rather
  than trusting a stale SDK snapshot (`AuthStatusIndicator.tsx:240-253`, read directly).

**Tests:** `platform/api/main.py`'s `get_current_user` (the identity half) is pytest-covered by
`test_me_dev_role_sets_is_dev_not_is_admin`, `test_me_admin_role_sets_is_admin_not_is_dev`,
`test_me_env_fallback_admin_without_table_row`, `test_me_plain_user_and_anonymous`
(`tests/api/test_platform_auth.py`, CI-run, reused from AUTH-07's own citation, same endpoint).
No Vitest or Playwright test anywhere in solyra targets `AuthStatusBanner` or
`EmailVerificationBanner` by name or test id (grepped both repos for the component names and for
`auth-status-banner`/`email-verification-banner`; zero matches); the Gaps note this precisely
rather than crediting the generic navigation smoke tests with coverage they don't have.

**Code:** `src/components/shared/AuthStatusIndicator.tsx` (`AuthStatusBanner`,
`EmailVerificationBanner`/`EmailVerificationBannerFor`, `useAuthStatus`); test ids
`auth-status-banner`, `email-verification-banner`, `verification-resend`, `verification-check`,
`verification-error`.

##### SHELL-05 · MostActiveBar marquee

**Shows or does:** A horizontally-scrolling ticker strip, mounted once in `AppShell.tsx:70` and
gated by `showMostActiveBar(pathname)`, only on `/live`, `/charts`, `/options`, `/signals`,
`/journal` (`MOST_ACTIVE_BAR_ROUTES`, `AppShell.tsx:22`), so it persists across navigation within
that group instead of unmounting per route. Each chip shows ticker, price (or `—`), change %
(colored, or `—`), compact volume, and a sparkline when the series has ≥2 usable points
(`hasUsableSpark`); the strip duplicates its items and CSS-marquees them unless
`prefers-reduced-motion` is set, in which case a single static, horizontally-scrollable strip
renders instead.

**Needs:** `GET /api/market/most-active`, served by `platform/api/main.py:1510
market_most_active`, which reads only `top_movers_intraday` (one SQL,
`WHERE snapshot_date = (SELECT MAX(snapshot_date)...)`, ordered `snapshot_ts, rank`);
`market_data_intraday` is not touched by this handler (verified by reading the full function;
corrected in the T-gate commit, see Gaps). `useAuthBlocked()` for the "Sign in to load data"
branch (a second, independent instance of that copy, distinct from SHELL-16's `AuthStatusBanner`).

**States:** SHELL-12 (loading), SHELL-13 (empty), SHELL-14 (error) are this component's three
`null`-returning branches, indistinguishable from each other in source; the auth-blocked branch
(`MostActiveBar.tsx:182-191`) is a fourth, distinct, non-null branch.

**Acceptance criteria:**
- Given a signed-out/blocked session, when `useAuthBlocked()` is true, then the strip renders its
  label with "Sign in to load data" instead of `null` (`MostActiveBar.tsx:182-191`, read
  directly; no test isolates this branch specifically, see Gaps).
- Given the API returns a non-empty `items` array, when the strip renders, then volume renders
  via `formatCompactVolume` (e.g. `312_000_000` → `"312M"`) and change via `formatChangePct`
  (e.g. `2.31` → `"+2.31%"`), both returning `—` for `null`/`undefined`, never a fabricated `0`
  (Rule 3.7; `formats hundreds of millions with an M suffix`, `renders an em dash for missing
  volume`, `src/components/shared/MostActiveBar.test.ts`).
- Given a ticker's price series has fewer than two finite points, when the item renders, then
  `hasUsableSpark` returns `false` and no sparkline draws, never a synthesized flat line
  (`rejects missing, short, and constant series`, `MostActiveBar.test.tsx`).
- Given a real backend response, when the handler groups rows in memory, then a ticker with ≥2
  snapshots on the latest date carries an ordered `spark` array and a ticker with exactly one
  point omits the key entirely (`test_spark_present_and_ordered_for_multi_snapshot_ticker`,
  `test_spark_omitted_when_fewer_than_two_points`, `tests/api/test_most_active_endpoint.py`).
- Given the underlying table, when queried in production, then it holds fresh, growing rows:
  verified 2026-09-28, `max(snapshot_ts) = 2026-09-28 19:30:16+00:00`, `count(*) = 8920` (see the
  V-gate evidence comment).

**Tests:** `src/components/shared/MostActiveBar.test.ts` and `MostActiveBar.test.tsx` (Vitest,
CI-run): both are pure-helper tests of `formatCompactVolume`/`formatChangePct`/
`sparklinePoints`/`isBullishSpark`/`hasUsableSpark`, the exact formatting/geometry math the
marquee renders with; neither renders `<MostActiveBar/>` or exercises `useMostActive()`, so the
component's own fetch/branch-selection logic (loading vs. empty vs. error vs. auth-blocked, and
the reduced-motion item-duplication) is Playwright-only (`tests/shared/most-active-bar.spec.ts`).
`tests/api/test_most_active_endpoint.py` (pytest, CI-run) covers the backend shape, sparkline
grouping, empty-table 200, and DB-failure 503 in full.

**Code:** `src/components/shared/MostActiveBar.tsx`; test ids `most-active-bar`,
`most-active-track`, `most-active-spark`.

##### SHELL-06 · RouteErrorBoundary

**Shows or does:** React Router `errorElement`, attached to every app route individually and to
their shared `AppGroup` parent (`src/App.tsx:49` the const, `:82` the parent route's assignment,
`:84-96` each of the 13 child routes' own repeated assignment), so a
render crash on one page shows a contained card ("Page crashed... rest of the app is unaffected")
with Reload/Go to dashboard buttons and a collapsible technical-details panel, while the
sidebar/header stay mounted. Distinguishes a thrown React Router response (`isRouteErrorResponse`,
e.g. a 404) from a thrown `Error` from any other thrown value (`describeError`).

**Needs:** nothing: it reads only `useRouteError()`/`useNavigate()` from React Router's own
state; no API, no store.

**States:** it IS the app's page-level error state; no further states apply to it.

**Acceptance criteria:**
- Given a page component throws during render, when React Router catches it, then
  `RouteErrorBoundary` renders in place of that page only: the sidebar/header/banners from
  `AppShell` stay rendered around it (`RouteErrorBoundary.tsx`'s own doc comment; wiring verified
  at `App.tsx:49,82,84-96`).
- Given the thrown value is a React Router response object, when `describeError` runs, then the
  title is `"{status} {statusText}"`; given any other `Error`, the title is `"Page error"` and the
  stack is available behind "Show technical details" (`RouteErrorBoundary.tsx:82-94`, read
  directly).

**Tests:** none found. Grepped both repos for `RouteErrorBoundary` and for a test that forces a
page-render throw; no colocated Vitest test and no Playwright spec exercise this component at all
(matches the pre-existing Gaps note).

**Code:** `src/components/shared/RouteErrorBoundary.tsx`, wired at `src/App.tsx:49,82,84-96`.

##### SHELL-07 · Market session badge (LIVE, PRE, AH, CLOSED)

**Shows or does:** `data-testid="market-session-badge"`, next to the MARKET nav trigger
(`liveBadge`, `navConfig.ts`) and inside its dropdown items. Renders `null` while
`useLiveStatus()` has no data yet or reports an unrecognized session, never a fabricated default
(its own doc comment cites Rule 3.7 by number). Otherwise one of LIVE (green, `regular`), PRE, AH,
or CLOSED.

**Needs:** `GET /api/live/status`, served by `platform/api/routers/live.py:174
get_market_status`, itself computed purely from `datetime.now(ET_TZ)` against `_is_market_open`
(weekday/holiday/09:30-16:00/04:00-09:30/16:00-20:00 windows), no database read, no external
vendor call.

**States:** SHELL-15 is this same badge's "truthful when closed" state, specifically.

**Acceptance criteria:**
- Given the market is closed, when `useLiveStatus()` resolves `{session: 'closed', is_open:
  false, ...}`, then the badge reads "CLOSED" and never carries the `live` class (`market session
  badge is truthful — CLOSED when the market is closed`, `tests/shared/navigation.spec.ts`).
- Given `useLiveStatus()` has not yet resolved, when `MarketSessionBadge` renders, then it
  returns `null` rather than a placeholder (`MarketSessionBadge.tsx:19-20`, read directly).
- Given a real backend request, when issued without a token, then it answers 401 on staging,
  confirming the endpoint is real and gated (verified 2026-09-28, see the V-gate evidence
  comment); the actual session VALUE needs a signed-in session to observe in production (see
  Gaps).

**Tests:** `tests/shared/navigation.spec.ts` (`market session badge is truthful...`, Playwright,
asserts against a directly-mocked response, not the live backend computation).
`tests/api/test_platform_api.py::test_live_status` (pytest, CI-run) asserts only that the
response has `is_open`/`session`/`current_time_et` keys; it does not assert `_is_market_open`'s
actual classification for any specific time, so it is real but shallow backend coverage (see
Gaps). No Vitest test of `MarketSessionBadge.tsx` exists; `src/lib/marketSession.test.ts` tests a
different, unrelated module (`src/lib/marketSession.ts`'s `sessionLabel`/`sessionColor`/
`sessionPillClasses`, which this badge does not import, verified by reading
`MarketSessionBadge.tsx`, which defines its own inline `SESSION_CHIP` map).

**Code:** `src/components/layout/MarketSessionBadge.tsx`, `src/hooks/useLiveStatus.ts`; test id
`market-session-badge`.

##### SHELL-08 · Command palette (Cmd-K, Ctrl-K)

**Shows or does:** `AppShell.tsx:45-54` attaches a `window`-level `keydown` listener;
`(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'` toggles `paletteOpen` (line 47).
`CommandPalette` (`AppShell.tsx:77`) renders `null` while closed; open, it shows a search input
(placeholder "Search pages, tickers, actions…") and three filtered groups: "Jump to" (every page
in `FLAT_NAV`), "Tickers" (`useTickerStore`'s quick picks + recent tickers, selecting one
navigates to `/charts` and calls `setTicker`), "Actions" (three fixed shortcuts: New journal
entry, Open today's brief, Dealer gamma). Arrow keys move the highlighted row, Enter selects it,
Escape or a backdrop click closes it.

**Needs:** `navConfig.ts`'s `FLAT_NAV` and `useTickerStore()` only, no API.

**States:** none beyond open/closed; an empty filtered result renders "No results"
(`CommandPalette.tsx:133-137`).

**Acceptance criteria:**
- Given the shell has mounted, when Ctrl-K (or Cmd-K) is pressed anywhere, then the palette
  opens with its search input focused and visible (`command palette opens with the keyboard
  shortcut and navigates to a page`, `tests/shared/navigation.spec.ts`, new in this task).
- Given "Journal" is typed, when the filtered list narrows, then both the "Jump to → Journal"
  row and the "Actions → New journal entry" row match (both routes to `/journal`,
  `CommandPalette.tsx:38-66`, read directly), and pressing Enter selects the first (`sel` defaults
  to `0`) and navigates to `/journal` (same new test).
- Given the palette is open, when Escape is pressed or the backdrop is clicked, then `onClose`
  fires and the palette unmounts (`CommandPalette.tsx:73,82-83,99`, read directly; not asserted
  by any test, see Gaps).

**Tests:** `tests/shared/navigation.spec.ts` (`command palette opens with the keyboard shortcut
and navigates to a page`, the only test for this component, is one this branch added) runs
hermetically in ci.yml's `e2e (chromium, mocked)` job, but the cited main run (36361217691,
commit eca7078) predates it, so Te waits for a CI run that includes it (see Gaps). No prior test
of any kind existed for this component (confirmed the pre-existing Gaps
note before adding this test).

**Code:** `src/components/layout/AppShell.tsx:45-54,77`, `src/components/layout/CommandPalette.tsx`.
No data-testid anywhere in `CommandPalette.tsx`; selected by placeholder text and role in the new
test.

##### SHELL-09 · Replay control (historical review)

**Shows or does:** A compact "Replay" button in the shared utility cluster (`Header.tsx` in
sidebar mode, inline in `TopTabs.tsx`), gated to `/dashboard`, `/live`, `/charts`, `/signals`
(`REPLAY_ROUTES`), renders `null` on every other route. Opens a TradingView-style popover: a
visual calendar (weekends, market holidays, and future dates disabled) plus a segmented time
field, draft-only until "OK" is pressed so the screen never flips modes mid-edit. While a review
moment is pinned, the trigger turns into an amber chip showing it, with an inline "back to live"
(✕).

**Needs:** `GET /api/config/market-hours` (only for `holidays_2026`, to gray out calendar days),
served by `platform/api/routers/config.py:131 get_market_hours`, a static dict
(`MARKET_OPEN`/`MARKET_CLOSE`/`MARKET_HOLIDAYS_2026` constants), no database, no vendor call.
`useReviewDateStore()` (client store) holds the committed `reviewDate`/`reviewTime`.

**States:** none of its own beyond open/closed and live/replay, both covered above;
review-aware pages (not this row) re-fetch as-of the pinned moment.

**Acceptance criteria:**
- Given the current route is not in `REPLAY_ROUTES`, when `ReplayControl` renders, then it
  returns `null` (`ReplayControl.tsx:112`, read directly).
- Given no review date is set, when the trigger renders, then it reads "Replay" with a History
  icon; given one is set, it reads `"Replay · {formatted date/time}"` with an amber border and a
  Calendar icon (`ReplayControl.tsx:174-179`, read directly).
- Given a date/time is picked and "OK" is pressed, when `canApply` is true (the draft differs
  from the committed value), then `setReviewDate`/`setReviewTime` commit and the popover closes;
  "Cancel" discards the draft instead (`ReplayControl.tsx:123-136`, read directly).

**Tests:** `tests/shared/popover-fit.spec.ts` (`replay picker stays on screen`), Playwright.
Clicks `replay-toggle` (`ReplayControl.tsx:166`) at two phone widths (390px, 411px) and asserts
the open popover's bounding box stays inside the viewport (`left >= 0`, `right <= innerWidth`),
a structural fit regression guard, not a test of the replay behavior itself: it never picks a
date, applies, or asserts anything about `reviewDate`/`reviewTime`. No test anywhere exercises
the picking/applying/clearing flow (`ReplayControl.tsx:123-141`), only that the panel is fully
on-screen when open. Corrected in this task's fix round; the row's Gaps citation is removed
accordingly (see Gaps).

**Code:** `src/components/shared/ReplayControl.tsx`, `src/stores/reviewDateStore.ts`; test ids
`replay-toggle`, `replay-clear`, `replay-apply`.

##### SHELL-10 · Theme toggle

**Shows or does:** A Sun/Moon icon button in `Header.tsx` (sidebar mode) and `TopTabs.tsx`
(top-tabs mode, same behavior, two separate elements), `aria-label`/`title` reading "Switch to
light theme" while dark and vice versa. Calls `useThemeStore().toggleTheme()`, which flips
`dark`↔`light`, writes `document.documentElement`'s `data-theme` attribute (`src/index.css` keys
light styles off `[data-theme="light"]`), and persists to `localStorage['platform-theme']`.
`usePreferencesSync` (mounted once in `AppShell.tsx:32`) then writes the new theme through to the
server on the next render.

**Needs:** no read API for the toggle itself (client store only); the write-through is
`PUT /api/me/preferences`, served by `platform/api/routers/preferences.py:149 put_preferences`
(one upsert, `ON CONFLICT (user_email) DO UPDATE` on only the changed columns, 503 on a real DB
failure, never a silent no-op).

**States:** dark is the product default regardless of OS preference, applied at module-load time
before the preference hydrates from the server (`themeStore.ts:7-14,27-28`); a corrupt stored
value falls back to dark rather than throwing.

**Acceptance criteria:**
- Given no stored theme, when `themeStore` loads, then `theme` is `'dark'` and
  `document.documentElement` carries `data-theme="dark"` (`defaults to dark regardless of OS
  preference`, `src/stores/themeStore.test.ts`).
- Given the toggle is clicked twice, when each click resolves, then the theme flips light then
  back to dark, the `data-theme` attribute follows each flip, and `localStorage` persists each
  value (`toggleTheme flips, applies, and persists on every flip`, same file).
- Given `navPattern: 'sidebar'` is seeded, when the page loads and the Header's toggle is
  clicked, then `html[data-theme]` changes from `dark` to `light` (`theme toggle flips the
  document theme attribute`, `tests/shared/navigation.spec.ts`, new in this task).
- Given the server holds a stored `theme` value, when `usePreferencesSync` hydrates, then it maps
  the raw payload through `sanitizePreferences`, nulling any value outside the known enum rather
  than coercing it to a default (`nulls unknown values instead of coercing them to a default`,
  `src/hooks/usePreferences.test.ts`).
- Given a `PUT /api/me/preferences` body with only `theme` set, when the handler runs, then the
  SQL `SET` list contains only the provided columns and the full stored row (including
  `theme: "dark"` from `FULL_ROW`) returns (`test_put_partial_sets_only_provided_fields`,
  `tests/api/test_preferences_router.py`).

**Tests:** `src/stores/themeStore.test.ts` (Vitest, CI-run, the toggle's own client logic),
`src/hooks/usePreferences.test.ts` (Vitest, CI-run, the write-through payload shaping),
`tests/api/test_preferences_router.py` (pytest, CI-run, the server contract, including `theme`
explicitly in its fixture rows), `tests/shared/navigation.spec.ts` (`theme toggle flips the
document theme attribute`, new in this task, Playwright). `tests/settings/settings.spec.ts:97`
(`theme toggle applies data-theme and writes through`) is adjacent, not this row's own control:
it drives the SAME `useThemeStore()` through a Settings-page radio button calling `setTheme(k)`
directly (`SettingsPage.tsx:310`), not the Header/TopTabs icon button's `toggleTheme()` this row
is about, the way SHELL-02 and SHELL-11 handle a similarly-named near miss.

**Code:** `src/components/layout/Header.tsx:24`, `src/components/layout/TopTabs.tsx:228`,
`src/stores/themeStore.ts`, `src/hooks/usePreferences.ts:192-210`.

##### SHELL-11 · Sign out

**Shows or does:** `SignOutButton` (`data-testid="sign-out"`, a LogOut icon) renders only when
`authMode === 'firebase' && isSignedIn`, absent in `iap`/`open` modes and while signed out.
Calls `firebaseSignOut()`, then clears the whole React Query cache (`qc.clear()`) so no
identity-tied data survives the switch. `AccountMenuSection`'s `account-menu-sign-out` is a
second, independently-implemented control for the mobile hamburger menu, duplicating the same
`firebaseSignOut()` + `qc.clear()` body rather than sharing it (`AuthStatusIndicator.tsx:96-103`).

**Needs:** no read API; `firebaseSignOut()` is a Firebase client-SDK call, no backend round trip.

**States:** none of its own; signing out is what drives SHELL-16's "signed-out" half.

**Acceptance criteria:**
- Given `authMode !== 'firebase'` or the session is signed out, when `SignOutButton` renders,
  then it returns `null` (`SignOutButton.tsx:15`, read directly).
- Given a signed-in firebase session, when `sign-out` is clicked, then `firebaseSignOut()`
  resolves, the query cache clears, and the app returns to `SignInScreen` (`sign out returns to
  the sign-in screen`, `tests/shared/auth-gate.spec.ts`, added in Task 13, the only real test of
  this control anywhere).

**Tests:** `tests/shared/auth-gate.spec.ts` (`sign out returns to the sign-in screen`),
Playwright. The pre-existing Chain citation here ("solyra navigation.spec.ts") was wrong: every
`navigation.spec.ts` test runs in open mode (`MOCK_FIREBASE_CONFIG_OPEN`), in which
`SignOutButton` always returns `null`, so no test in that file can render it at all. That file's
one sign-out-adjacent assertion (`account-menu-sign-out` has zero count, `auth status lives at
the menu bottom, not the bar`) tests the second control's absence under open mode, not this one's
action, corrected in the T-gate commit (see Gaps).

**Code:** `src/components/auth/SignOutButton.tsx`,
`src/components/shared/AuthStatusIndicator.tsx:96-103` (`AccountMenuSection`); test ids
`sign-out`, `account-menu-sign-out`.

##### SHELL-12 · State: loading (marquee before the first response)

**Shows or does:** `MostActiveBar` has no dedicated loading branch: `items = data?.items ?? []`,
so before `useMostActive()`'s first response the array is empty and the component returns `null`
via the same `items.length === 0` guard as the empty state (SHELL-13), indistinguishable from it
in source (the pre-existing States table entry, confirmed by reading
`MostActiveBar.tsx:176-178,195`).

**Needs:** same as SHELL-05 (`GET /api/market/most-active`).

**States:** this row IS the loading state.

**Acceptance criteria:**
- Given the query has not yet resolved, when `MostActiveBar` renders, then `data` is
  `undefined`, `items` is `[]`, and the component returns `null` rather than a skeleton
  (`MostActiveBar.tsx:176-178,195`, read directly; Rule 3.7: "no skeleton flash, just hidden
  until there's real data to show", the component's own comment).
- Given the table holds real, recently-written rows in production, when the first request
  resolves, then the loading window is bounded by real pipeline freshness, not an indefinite
  stall: verified 2026-09-28, `max(snapshot_ts) = 2026-09-28 19:30:16+00:00`, `8920` rows (see
  the V-gate evidence comment); this validates the pipeline is live, not the loading render
  itself, which needs a timing capture no production request can provide (see Gaps).

**Tests:** none isolate this branch specifically: it is not visually distinguishable from
SHELL-13 in the DOM, and no test asserts the pre-first-response instant. See Gaps.

**Code:** `src/components/shared/MostActiveBar.tsx:176-178,195`.

##### SHELL-13 · State: empty (marquee renders nothing on an empty list)

**Shows or does:** Same `items.length === 0` guard as SHELL-12, reached when the API genuinely
returns `{"items": []}` rather than merely not having answered yet.

**Needs:** same as SHELL-05.

**States:** this row IS the empty state.

**Acceptance criteria:**
- Given `GET /api/market/most-active` answers `{"items": [], ...}`, when `MostActiveBar`
  renders, then it returns `null` (`renders nothing when the API returns an empty item list`,
  `tests/shared/most-active-bar.spec.ts`).
- Given the source table has no rows for the latest `snapshot_date`, when the handler runs, then
  it returns the honest empty envelope rather than an error
  (`test_empty_table_returns_honest_empty_200`, `tests/api/test_most_active_endpoint.py`).

**Tests:** `tests/shared/most-active-bar.spec.ts` (`renders nothing when the API returns an
empty item list`, Playwright),
`tests/api/test_most_active_endpoint.py::TestEmptyTable::test_empty_table_returns_honest_empty_200`
(pytest, CI-run, backend shape only; the client's own `null`-return branch stays
Playwright-only).

**Code:** `src/components/shared/MostActiveBar.tsx:195`.

##### SHELL-14 · State: error (marquee absent on 500, page renders)

**Shows or does:** `useMostActive()`'s `queryFn` throws on a non-OK response
(`MostActiveBar.tsx:107`, `if (!r.ok) throw...`); React Query then leaves `data` undefined, so
`items` stays `[]` and the SAME `null`-return branch as SHELL-12/13 fires: the marquee simply is
not there, while the rest of the shell (nav, banners, routed page) renders normally.

**Needs:** same as SHELL-05.

**States:** this row IS the error state.

**Acceptance criteria:**
- Given `GET /api/market/most-active` answers 500, when the query rejects, then the marquee is
  absent and the page otherwise renders fine (`bar is absent and the page otherwise renders fine
  when the API returns 500`, `tests/shared/most-active-bar.spec.ts`).
- Given a real query exception in the handler, when it is raised, then the endpoint answers 503
  with no `items` key at all, never a fabricated empty success
  (`test_query_exception_surfaces_as_503`, `tests/api/test_most_active_endpoint.py`).

**Tests:** `tests/shared/most-active-bar.spec.ts` (`bar is absent...when the API returns 500`,
Playwright), `tests/api/test_most_active_endpoint.py::TestDbUnavailable::test_query_exception_surfaces_as_503`
(pytest, CI-run, backend shape only, same caveat as SHELL-13).

**Code:** `src/components/shared/MostActiveBar.tsx:102-113,195`.

##### SHELL-15 · State: stale (session badge truthful when closed)

**Shows or does:** `MarketSessionBadge` never shows LIVE unless `useLiveStatus().session ===
'regular'`; the badge's data goes stale after 30s (`staleTime`) and refetches every 60s, so a
session change (e.g. the close) converges within that window rather than staying pinned to a
load-time snapshot.

**Needs:** same as SHELL-07.

**States:** this row IS the "truthful when closed" state.

**Acceptance criteria:**
- Given a mocked closed session, when the badge renders, then it reads "CLOSED" and never
  carries the `live` class (`market session badge is truthful — CLOSED when the market is
  closed`, `tests/shared/navigation.spec.ts`).
- Given the query is older than its 30s `staleTime`, when the component is focused or refetches
  on its 60s interval, then a session change is reflected without a manual reload
  (`useLiveStatus.ts:20-21`, read directly; not independently asserted by any test, the
  Playwright test mocks a single static response).

**Tests:** same as SHELL-07 (`tests/shared/navigation.spec.ts`,
`tests/api/test_platform_api.py::test_live_status`).

**Code:** `src/components/layout/MarketSessionBadge.tsx`, `src/hooks/useLiveStatus.ts:20-21`.

##### SHELL-16 · State: permission (auth status banner when signed out or blocked)

**Shows or does:** `AuthStatusBanner` renders "Your session expired, so live data is not
loading." when `status === 'blocked'`, or "You are signed out, so live data is not loading." when
`status === 'signed-out'`, both with a Sign in button. The trigger is NOT `GET /api/me`
specifically: `blocked` is set by `markAuthBlocked()`, called from `authedFetch.ts`'s `track()`
helper on ANY gated `/api/*` 401, "in every auth mode" (`authedFetch.ts:155-159,163-166,250`,
read directly), the same universal mechanism AUTH-08 documents. `signed-out` is a pure
Firebase-client-SDK state in firebase mode (`useUser.ts`'s `subscribeAuth` listener); in
`iap`/`open` mode `isSignedIn` is hardcoded `true`, so this half never fires there.

**Needs:** `platform/api/auth.py`'s middleware (401 on a gated path without a valid identity)
plus the client `src/lib/authGate.ts` (`markAuthBlocked`/`useAuthBlocked`). `GET /api/me`
(`main.py:282`) is fetched by the same `useUser()` hook but its VALUES are not read by this
banner: only its loading timing matters here (see Gaps, correcting the pre-existing Chain
citation).

**States:** this row is itself a state of SHELL-04.

**Acceptance criteria:**
- Given a gated call answers 401, when `track()` runs, then `markAuthBlocked()` fires and every
  subscribed component (including this banner) re-renders as `'blocked'` on the next tick
  (`authedFetch.ts:157-159`, read directly).
- Given a real, unauthenticated request, when issued against any of the gated AppShell endpoints
  on staging, then each answers 401 `{"detail":"sign in to continue"}`: verified 2026-09-28 for
  `/api/market/most-active`, `/api/live/status`, `/api/config/market-hours`,
  `/api/me/preferences` (see the V-gate evidence comment); this is the production trigger for
  `blocked`, reproduced directly.
- Given `AUTH_MODE=firebase` and no token at all, when any gated path (e.g. `/api/secret`) is
  requested, then it answers 401, while `/api/health`, `/api/me`, `/api/waitlist` stay open
  (`test_firebase_requires_valid_token`, `tests/api/test_platform_auth.py`), the backend half of
  the same mechanism.

**Tests:** `tests/api/test_platform_auth.py::test_firebase_requires_valid_token` (pytest,
CI-run, the general gated-401 mechanism, reused from AUTH-08's own citation) plus the four
`_me`-keyed tests reused from SHELL-04. `src/lib/authedFetch.test.ts` exercises `track()`'s 401
path for real (unmocked `markAuthBlocked`/`clearAuthBlocked` calls), but every assertion in that
file targets `onUnauthorized`/the `Authorization` header, never `isAuthBlocked()`/
`useAuthBlocked()` directly (grepped both repos for those four names inside any test file: zero
matches), matching Task 13's AUTH-08 finding for the identical mechanism. No test targets
`AuthStatusBanner`'s own render of this state.

**Code:** `src/components/shared/AuthStatusIndicator.tsx` (`AuthStatusBanner`, `useAuthStatus`),
`src/lib/authGate.ts`, `src/lib/authedFetch.ts:155-166,249-250`; test id `auth-status-banner`.

### SCREEN-DASHBOARD — `/dashboard`

- **Purpose:** Daily starting point: the pre-market brief with the top playbook setup, daily KPIs, the intraday chart, live signals, upcoming catalysts, sector rotation, the AI take, news and the feature-flagged Movement Read. The most-active marquee is not mounted on this route.
- **Matrix:** [03 § 04](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#04--dashboard)
- **Status:** Production but needs remediation · **Blocking issue:** [#861](https://github.com/TeneikaAskew/stocks/issues/861) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/DashboardPage.tsx` (948 lines)
- **Child components:** `CandlestickChart`, `Card`, `CardHeader`, `Delta`, `DirTag`, `KpiTile`, `Metric`, `MicroLabel`, `MovementRead`, `Pill`, `PriceAreaChart`, `ScoreStars`, `SetupCardDetails`, `TickerCombobox`, `WidgetState`
- **API calls (from source):** `/api/catalysts/events`, `/api/dashboard/brief/`, `/api/market/data/`, `/api/market/reference/`, `/api/market/sectors`, `/api/playbook/`, `/api/signals/`
- **Stores:** `useReviewDateStore`, `useTickerStore`
- **E2E specs:** `tests/dashboard/dashboard-chart-fit.spec.ts`, `tests/dashboard/dashboard.spec.ts`, `tests/dashboard/movement-read.spec.ts`, `tests/dashboard/ticker-combobox.spec.ts`; two more only assert that something is absent from this route: `tests/shared/most-active-bar.spec.ts` (the marquee) and `tests/dashboard/data-pipeline-widget.spec.ts` (the retired data-pipeline widget)
- **PR lineage:** [#649](https://github.com/TeneikaAskew/stocks/pull/649)/[#650](https://github.com/TeneikaAskew/stocks/pull/650) movement statement · [#729](https://github.com/TeneikaAskew/stocks/pull/729) enable + e2e · [#732](https://github.com/TeneikaAskew/stocks/pull/732) most-active bar · [#733](https://github.com/TeneikaAskew/stocks/pull/733) expected-move card (disabled by [#810](https://github.com/TeneikaAskew/stocks/pull/810))
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/dashboard/brief/{ticker} | bias, reason, rsi, strat_candle, strat_combo, ftfc_score, ftfc_direction, signal_status, daily_indicators, live.price/session (types: `DashboardPage.tsx` BriefResponse; fixture: `tests/helpers/fixtures/dashboard.ts`) | premarket-brief 08:30 ET Mon-Fri → premarket_analysis; fetch-market-data 23:00 ET Mon-Fri → market_data_daily, into which fetch-premarket-refresh 08:20 ET Mon-Fri first inserts today's row without a close | the newest `premarket_analysis` row (`run_kind = 'live'`) and the newest `market_data_daily` row, served as stored with no date floor, so from 08:20 ET until the 23:00 ET fetch the daily row is today's placeholder with no close; `source: 'unavailable'` only when Cloud SQL is not configured, otherwise HTTP 200, and when both reads fail or find nothing the bias is `neutral` with empty `daily_indicators` (a premarket read that fails alone still returns the daily row's bias, executed 2026-09-30 against the real handler with faked reads); re-requested every 15s while the market is open in live mode | `briefQ` (`useFetch`) → briefing strip, top setup |
| GET /api/live/quote/{ticker} | price, change, change_pct, open/high/low, volume, prev_close (types: `useLiveQuote.ts` LiveQuote) |  | 15s poll while the tab is open | `useLiveQuote` → briefing strip hero price |
| GET /api/live/status | is_open, session, next_open, current_time_et (types: `useLiveStatus.ts` LiveStatus) |  | 60s refetch, 30s staleTime | `useLiveStatus` → briefing strip market pill |
| GET /api/playbook/{ticker} | cards[].name/direction/win_rate/avg_return/conditions/target_pct/stop_pct/horizons, analysis_date, age_days, max_age_days (types: `DashboardPage.tsx` PlaybookResponse) | phase6-playbook 04:30 ET Mon-Fri → playbook_cards | server refuses (503) a card set older than max_age_days; re-polled every 15min in live mode | `playbookQ` (`useFetch`) → top setup |
| GET /api/signals/{ticker}?limit=20 | signals[].time/direction/score/conditions_met/return_pct (types: `DashboardPage.tsx` SignalsResponse) | historical-signals-watchlist 01:00 ET Tue-Sat → historical_signals |  | `signalsQ` (`useFetch`) → live signals table |
| GET /api/catalysts/events?date_from&date_to | events_by_date[date][].ticker/title/catalyst_type/impact/sentiment_label/sentiment_score/source (types: `DashboardPage.tsx` CatalystsResponse/CatalystEvent) | news_sentiment ← fetch-news-sentiment and fetch-news-sentiment-topics hourly 08:00-17:05 ET Mon-Fri; economic_events ← fetch-economic-events 07:00 ET; earnings_calendar ← fetch-earnings-calendar 19:00 ET; insider_transactions ← fetch-insider-transactions 07:00 ET; sec_filings ← fetch-sec-filings 07:00, 10:00, 13:00, 17:00 ET (all Mon-Fri); no Benzinga key on either service | news: the last 48 hours from now with relevance 0.7 or more, whatever `date_from` and `date_to` say; the other four: rows dated inside the requested range; the page lists events oldest date first, so backward-dated news sorts ahead of upcoming events | `catalysts` (`useFetch`) → catalysts list, News |
| GET /api/market/sectors | sectors[].symbol/name/status/close/chg_1d_pct/chg_5d_pct/reason (types: `DashboardPage.tsx` SectorRow/SectorsResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily | the 10 calendar days before the newest date in `market_data_daily`, non-null closes only; cached 10 minutes; a database failure is a 503 | `sectorsQ` (`useFetch`) → sector rotation |
| GET /api/market/reference/{ticker}/{date} | close (the only field the page reads; the response also carries open, high, low, source, stale_days and week.high/low/avg_close/avg_rsi_14) (types: `DashboardPage.tsx` ReferenceResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily; AlphaVantage TIME_SERIES_DAILY for dates under 30 days old | the trading day before `{date}`, which is the brief's latest daily date (the review date in review mode); AlphaVantage first, then Cloud SQL, then the GCS parquet listing, with `source` and `stale_days` set and never read by the page | `referenceQ` (`useFetch`) → daily KPIs |
| GET /api/market/data/{ticker}/{date}?timeframe=60 | candlestick[].time/open/high/low/close, volume[].time/value (types: `DashboardPage.tsx` MarketDataResponse) | fetch-market-data 23:00 ET Mon-Fri and fetch-alphavantage-intraday 21:00 ET Mon-Sat → market_data_intraday | `{date}` is the month code YYYYMM of the brief's latest daily date; enabled only after the brief has resolved; a Cloud SQL failure falls through to the GCS parquet files with no signal in the response | `hourlyQ` (`useFetch`) → intraday chart |
| GET /api/market/data/{ticker}/{date}?timeframe=1 | candlestick[].time/open/high/low/close, volume[].time/value (types: `useReviewQuote.ts` HistoricalDayResponse) | fetch-market-data 23:00 ET Mon-Fri and fetch-alphavantage-intraday 21:00 ET Mon-Sat → market_data_intraday | review mode only; `{date}` is the review day YYYYMMDD; 1 hour staleTime | `useReviewQuote` → briefing strip hero price |
| GET /api/insights/report/{ticker} | report.thesis, direction, conviction, time_horizon, confidence_score (types: `src/types/insights.ts` InsightReportEnvelope) | insight-pipeline 08:45 ET Mon-Fri → insight_reports | 60s staleTime; `?as_of=` in review mode; a 404 is read as no report and any other failure is ignored by the page | `useInsightReport` (`useInsights.ts`) → AI take |
| GET /api/movement-statement | headline, levels, expected_move, regime, continuation (types: `src/types/index.ts` MovementStatement) | premarket-brief 08:30 ET Mon-Fri → premarket_analysis (one of several inputs assembled server-side; see matrix DASHBOARD-21) | feature-flagged (MOVEMENT_STATEMENT_ENABLED); hidden in review mode | `useMovementStatement` → `MovementRead` |
| store: ticker, review date, chart style |  | Zustand `useTickerStore` (persisted as `ticker-store`), `useReviewDateStore` (in memory, lost on reload), `localStorage` `overview-chart` |  | every card |

#### Displayed
| ID | Element | Component |
|---|---|---|
| DASHBOARD-01 | Briefing strip | inline in `DashboardPage` (`briefQ`, `useLiveQuote`, `useLiveStatus`) |
| DASHBOARD-02 | Top setup | `SetupCardDetails` |
| DASHBOARD-03 | Daily KPIs | `KpiTile` (inline in `DashboardPage`) |
| DASHBOARD-04 | Intraday chart | `CandlestickChart` / `PriceAreaChart` |
| DASHBOARD-05 | Live signals table | inline in `DashboardPage` (`Pill`, `DirTag`) |
| DASHBOARD-06 | Catalysts list | inline in `DashboardPage` |
| DASHBOARD-07 | Sector rotation | inline in `DashboardPage` |
| DASHBOARD-08 | AI take | inline in `DashboardPage` (`useInsightReport`) |
| DASHBOARD-09 | News | inline in `DashboardPage` (same catalysts fetch, `AV news`-sourced rows) |
| DASHBOARD-21 | Movement Read card (feature-flagged) | `MovementRead` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| DASHBOARD-10 | Switch ticker | `TickerCombobox` writes `useTickerStore` (persisted as `ticker-store`); the ticker-scoped queries (brief, playbook, signals, AI take, quote, reference, hourly bars, Movement Read) are asked again for the new symbol, while Sector rotation, Catalysts and News are market-wide and keep their data. |
| DASHBOARD-11 | Refresh | The Refresh button calls `window.location.reload()`, which reloads the whole document, asks for every request again and drops review mode and the 1D or 5D choice. |
| DASHBOARD-12 | Candles or Area toggle | `pickChart` sets `chartStyle` state and persists the choice to `localStorage` (`overview-chart`). |
| DASHBOARD-13 | 1D or 5D sector period | Toggles in-memory `sectorPeriod` state (not persisted), which re-derives the ranked sector rows from the same `/api/market/sectors` response. |
| DASHBOARD-14 | Click a card (signals, catalysts, news, AI take) | `Card interactive` `onClick` calls `navigate()`: Live signals → `/signals`; Catalysts and News → `/catalysts`; AI take → `/insights`. The cards are plain `div` elements with no role or tabindex, so they are not keyboard operable. |
| DASHBOARD-15 | Review mode | The Replay control in the header (`ReplayControl`, shown on `/dashboard`, `/live`, `/charts` and `/signals`) sets a review date and time in memory; `DashboardPage` then adds `date` to the brief and playbook requests, `end_date` and `end_time` to signals, `as_of` to the AI take and a seven-day window from the review date to catalysts, anchors the reference and hourly bars on that date and rebuilds the hero price from that day's 1-minute bars. Sector rotation and News are not review aware, and the Movement Read card is not mounted. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| DASHBOARD-16 | loading | present | `WidgetState.tsx`'s `WidgetSkeleton` renders per wrapper (brief, reference, hourly bars, signals, sectors) while its query is in flight; the playbook, catalysts, AI take, quote and status queries have no loading state. |
| DASHBOARD-17 | empty | present | Each card words its own empty line (`Unavailable`, `No signals yet for this ticker.` and so on); the KPI row is absent, without a message, when a close is missing; the brief handler answers HTTP 200 with a neutral bias when it has no data. |
| DASHBOARD-18 | error | present | `WidgetState.tsx`'s `WidgetError` renders per wrapper on a failed fetch; the playbook shows its own `Playbook unavailable` line, and the catalysts, AI take, quote and status queries fail silently. |
| DASHBOARD-19 | stale | present | `DashboardPage.tsx` computes `playbookAge`/`snapshotAgeLabel` from the response's own age fields and shows it under the Top setup; nothing else on the page is marked stale. |
| DASHBOARD-20 | permission | not tracked (new category); present | `WidgetState.tsx`'s `SignInEmptyState` renders in a wrapper when that wrapper's own query failed with a 401 (`isAuthError` on the message); `authGate.ts` only keeps the intraday card mounted. |

#### Journeys
1. Morning brief to a trade idea: Opens /dashboard (DASHBOARD-01) → Reads the pre-market brief bullets and market pill (DASHBOARD-01) → Checks the Top setup, win rate, conditions, levels (DASHBOARD-02) → Clicks Live signals to go to /signals (DASHBOARD-05, DASHBOARD-14) → Opens /playbook from the navigation for the full card set, since the Top setup has no link to it (DASHBOARD-02)
2. Follow the ticker across the app: Switches ticker in the TickerCombobox (DASHBOARD-10) → The ticker-scoped cards ask again for the new symbol, while Sector rotation, Catalysts and News stay as they were → Scans KPIs and the intraday chart (DASHBOARD-03, DASHBOARD-04) → Clicks AI take to go to /insights for that ticker (DASHBOARD-08, DASHBOARD-14) → Ticker focus persists on the next page
3. Review a past session: Sets a review date in the replay control (DASHBOARD-15) → Market pill switches to HISTORICAL (DASHBOARD-01) → Brief, playbook, signals, AI take and the catalysts window re-resolve as-of that date and the Area chart is cut at the time, while Sector rotation, News and the Candles chart are not as-of (DASHBOARD-15) → Movement Read hides so live data cannot leak in (DASHBOARD-21) → Compares the brief against what actually happened (DASHBOARD-01) → Refresh returns the page to live (DASHBOARD-11)
4. Data is missing: Opens the page before the pipeline has run → With Cloud SQL not configured the strip shows the server's unavailable reason, and with no rows it reads Daily bias NEUTRAL (DASHBOARD-01, DASHBOARD-17) → Top setup shows "No playbook setups yet" (DASHBOARD-02, DASHBOARD-17) → The KPI row is absent when a close is missing, and only the RSI tile can read an em-dash (DASHBOARD-03, DASHBOARD-17)

#### Elements
##### DASHBOARD-01 · Briefing strip

**Shows or does:** The first block of the page (`src/routes/DashboardPage.tsx:559-691`, one
`WidgetState` around `briefQ`). Its left half carries the title "Pre-market brief" under the label
`Today` or, in review mode, `As of` plus the date (`:571-577`), the market pill (`:576`, decided at
`:525-533`: `HISTORICAL` in review mode, `OPEN` while `useLiveStatus` says `is_open`,
`PRE-MARKET` or `AFTER HOURS` by `session`, otherwise `CLOSED`), the hero row (the ticker, the live
price through `fmtPrice`, and a `Delta`, `:580-584`) and up to five bullets built by `briefBullets`
(`:194-222`): `Daily bias <BIAS>` followed by `live $<price> (<session>)` when the response carries
`live`, else `<date> close` when the daily row has a date; `FTFC <direction> · score <n>`;
`Strat <candle> · <combo>`; `RSI(14) <n> · overbought | oversold | neutral` (70 and 30 inclusive);
`Signal status: <text>`. A response with `source: 'unavailable'` or no body shows the `Unavailable`
line with the server's `reason` (`:588-603`). The right half is the Top setup (DASHBOARD-02). The
brief is re-requested every 15 seconds only while the market is open and not in review mode
(`:325`); the hero price polls `/api/live/quote` every 15 seconds whatever the session
(`useLiveQuote.ts:22-34`) and the pill polls `/api/live/status` every 60 seconds
(`useLiveStatus.ts:12-23`). In review mode the hero price is rebuilt from the review day's 1-minute
bars up to the review time (`useReviewQuote`, `:316-317`) instead of the quote.

**Needs:** `GET /api/dashboard/brief/{ticker}` (`platform/api/routers/dashboard.py:82`; `?date=` in
review mode), `GET /api/live/status`, `GET /api/live/quote/{ticker}`. The brief handler reads the
newest `premarket_analysis` row with `run_kind = 'live'` and the newest `market_data_daily` row with
no date floor and no filter on a missing close (`dashboard.py:104-203`); during the regular session,
without `date`, it also recomputes RSI14, EMA9, EMA20 and SMA200 with a synthetic bar at the live
quote's price (`_apply_live_overlay`, `dashboard.py:257-331`, through `lib/indicators.py`).

**States:** DASHBOARD-16 (skeleton while `briefQ` loads), DASHBOARD-18 (the error box replaces the
strip and the Top setup together), DASHBOARD-20 (sign-in card), DASHBOARD-17 (the `Unavailable`
line). The hero price and the pill have no state of their own: a failed or unanswered quote reads
`—`, a failed or unanswered status reads `CLOSED` (executed 2026-09-30, see Gaps).

**Acceptance criteria:**
- Given Cloud SQL is not configured, when the handler is called, then it answers `source:
  'unavailable'` with a `reason` (`test_brief_unavailable_source`, `tests/api/test_platform_api.py`);
  the strip then shows that reason instead of bullets (`DashboardPage.tsx:588-603`, read directly; no
  test asserts the strip's text). This is the only path to the `Unavailable` line: a configured
  database with no row or a failing read is a 200 (see below).
- Given a live-mode response with `bias`, `ftfc_direction`, `strat_candle` and `rsi`, when the page
  renders, then the first bullet reads `Daily bias <BIAS>` (`shows daily bias card`, `renders
  Overview heading + pre-market brief for the active ticker`, `tests/dashboard/dashboard.spec.ts`:
  presence of the text only; the other bullets, the pill and the hero price are asserted by no
  test).
- Given `premarket_analysis` carries `ftfc_direction` `bullish`, when the handler builds the
  response, then `bias` is `bullish` and `has_premarket` is true (`test_brief_live`,
  `tests/api/test_platform_api.py`); without it `bias` derives from RSI and the price against EMA20
  (`dashboard.py:226-244`, read directly, no test).
- Given `?date=`, when the handler reads, then both reads are bounded by that date
  (`analysis_date <= :date` and `date <= :date`, `dashboard.py:111,157`, read directly, not asserted):
  `test_brief_with_historical_date` and `test_review_brief_returns_correct_date` feed a fixed frame
  through a fake `_query_fn` that ignores the SQL and its parameters and assert that the answer is
  `source: 'cloud_sql'` (`tests/api/test_platform_api.py:857,2086`) and that it carries a daily date at
  or before the requested date, which holds for that fixture whatever the SQL says.
- Given the market is in its regular session and `date` is absent, when the brief is requested,
  then the overlay replaces `close`, `rsi_14`, the EMAs and `stale_days` with live-derived values
  (`dashboard.py:257-331`, read directly; no test runs `_apply_live_overlay`).
- Given both reads return no row or raise, when the handler answers, then it is HTTP 200 with
  `source: 'cloud_sql'`, `bias: 'neutral'` and `daily_indicators: {}`, and the strip reads
  `Daily bias NEUTRAL` alone (executed 2026-09-30 against the real handler with faked query
  results, and against the page with that body). The sweep row
  `Req("GET", f"/api/dashboard/brief/{T}", 200)` (`tests/api/test_route_coverage.py:321`) pins the
  status only: `_query_fn` is bound at import, so that row answers `source: 'unavailable'` when no
  Cloud SQL variables are set at import (executed 2026-09-30 in this sandbox) and the neutral body
  when they are (executed with `DB_*` set), and no committed test asserts the neutral body (see Gaps).
- Given the newest daily row is the premarket placeholder (production read 2026-09-30 09:26 ET:
  IWM `date` 2026-09-30 with `close`, `rsi_14` and `atr_14` NULL, `updated_at` 12:24 UTC, execution
  `db-query-2s56t`), when the handler answers, then `daily_indicators.close` is null and the strip
  reads `Daily bias <BIAS> · 2026-09-30 close` (executed 2026-09-30; see Gaps).

**Tests:** `tests/dashboard/dashboard.spec.ts` (the two presence tests above; the file's `beforeEach`
serves the brief, quote and status). `tests/api/test_platform_api.py` (`TestDashboardBriefAPI`,
`TestReviewModeIntegration`, `TestLiveMarketAPI`, `test_live_status`, which asserts only that the
keys are present); `tests/api/test_route_coverage.py` pins each route's exact status with no backend
and a JSON content type (`Req.expect`, `:191-194`: the brief at 200, `:321`, the live status at 200
and the quote at 503, `:225-226`) and asserts no body (the brief's answer depends on whether Cloud
SQL variables are set at import, see the criteria above). `briefBullets`, the pill, the hero price
and the overlay have no test of their own, so Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:194-222,316-327,525-533,559-691`,
`src/hooks/useLiveStatus.ts`, `src/hooks/useLiveQuote.ts`, `src/hooks/useReviewQuote.ts`,
`src/components/primitives/index.tsx` (`Pill`, `Metric`, `Delta`, `MicroLabel`); no test ids.

##### DASHBOARD-02 · Top setup

**Shows or does:** The right half of the briefing block (`DashboardPage.tsx:607-688`). `topCard`
(`:471-482`) picks one card from `playbook.cards`: with a bullish brief bias only `CALL` cards are
candidates, with a bearish one only `PUT` cards, otherwise all (and all when no card has the wanted
direction); among candidates the highest non-null `win_rate` wins (first on a tie), and when no
candidate has a win rate the first candidate is shown with `—`. The card shows the name, the age
line `Cards <as of Sep 5, 2026 (1d old)>` (test id `playbook-age`, `:618-625`), a `DirTag`, the
win rate as stars (`round(win_rate / 20)`) and `<n>%`, the average return through
`topSetupAvgReturn` (percent units, no re-multiplying, `:225-228`), up to five string conditions and
`SetupCardDetails` (`src/components/playbook/SetupCardDetails.tsx:48-124`): trade levels (target and
stop from `target_pct` and `stop_pct` off the price `heroQuote?.price ?? brief.live.price ??
brief.daily_indicators.close`, direction-aware, needing a positive price) and the win rate and
average bps by hold window with the best window starred. With no card it shows `Unavailable`:
`Playbook unavailable: <server reason>` after a failed request, else `No playbook setups yet, run
the pipeline to populate.` (`:674-687`). `dataUnlessError` (`:341`) drops the old payload when a
refetch is refused, so a set the server has since called stale is not shown.

**Needs:** `GET /api/playbook/{ticker}` (`platform/api/routers/playbook.py:306`; `?date=` in review
mode; 60 second staleTime, re-polled every 15 minutes in live mode, `:136,328-337`) and the brief's
`bias` for the direction filter. The handler reads `playbook_cards` for the newest `analysis_date`
(bounded by `date`), refuses a set older than 7 days with a 503 that names the date and the
`phase6-playbook` job, answers 404 when the ticker has no rows, and returns `analysis_date`,
`generated_at`, `age_days` and `max_age_days` (`playbook.py:136-303,306-364`; one-hour cache whose
age is re-judged on every hit).

**States:** DASHBOARD-16 to DASHBOARD-20. The strip's `WidgetState` wraps this block, so a failed
brief request replaces it with the error box (executed 2026-09-30); the playbook request has its own
failure wording inside the card and no loading state (read directly: while it loads, the card reads
`No playbook setups yet`).

**Acceptance criteria:**
- Given a fresh card set (`analysis_date` 2026-09-05, `age_days` 1), when the page renders, then the
  card name shows and `playbook-age` reads `as of Sep 5, 2026 (1d old)` (`top setup shows the card
  set date and age`, `tests/dashboard/dashboard.spec.ts`).
- Given the server answers 503 with the stale-set detail, when the page renders, then the card
  reads `Playbook unavailable` with the detail and never the empty-state copy (`top setup surfaces
  the stale-cards refusal instead of a generic empty state`).
- Given `avg_return` 0.29 (percent units), when formatted, then `+0.29%`; a null or undefined value
  renders `—` (`topSetupAvgReturn`, `src/routes/DashboardPage.avgReturn.test.ts`).
- Given a set exactly 7 days old, then it is served; one day older it is refused with a 503; a
  cached set is re-judged on every hit; a `date` is judged against the requested date; no rows is a
  404 and Cloud SQL not configured is a 503 (`test_playbook_age_boundary`,
  `test_playbook_stale_set_is_refused_not_rendered`,
  `test_playbook_cached_set_is_rechecked_on_every_hit`,
  `test_playbook_as_of_is_judged_against_the_requested_date`,
  `test_playbook_no_rows_is_404_never_markdown`, `test_playbook_cloud_sql_not_configured_is_503`,
  `tests/api/test_playbook_evaluate.py`).
- Given bullish or bearish bias and several cards, when `topCard` runs, then the highest win rate of
  the matching direction is shown (`DashboardPage.tsx:471-482`, read directly; the default fixture
  serves twelve cards but no test asserts which is chosen).
- Given the newest set exists, when queried on 2026-09-30, then IWM, SPY and QQQ each hold 240 rows
  for `analysis_date` 2026-09-30, `generated_at` 08:38 to 08:46 UTC (see the V-gate evidence comment).

**Tests:** `tests/dashboard/dashboard.spec.ts` (the two tests above);
`src/routes/DashboardPage.avgReturn.test.ts`; `tests/api/test_playbook_evaluate.py`;
`tests/api/test_platform_api.py` (`TestPlaybookAPI.test_playbook`). The card choice, the star and
percent rendering and `SetupCardDetails` (including its `direction ?? 'CALL'` default and its
`live price` label on a price that may be the last close) have no test.

**Code:** `src/routes/DashboardPage.tsx:225-228,328-344,471-482,607-688`,
`src/components/playbook/SetupCardDetails.tsx`, `src/lib/dates.ts` (`snapshotAgeLabel`),
`src/lib/queryData.ts`; test id `playbook-age`.

##### DASHBOARD-03 · Daily KPIs

**Shows or does:** A row of four `KpiTile`s (`DashboardPage.tsx:693-713`) inside a `WidgetState` on
`referenceQ`: `Prev close` (`reference.close`), `Latest close` (`brief.daily_indicators.close`),
`2-day change` (`fmtPct` of `(latest - prev) / prev * 100`, with `±$x/sh` underneath, green or red by
sign) and `RSI (14)` (`brief.rsi`, else `daily_indicators.rsi_14`; red strictly above 70, green
strictly below 30, else amber, with the zone word underneath, which switches at 70 and 30
inclusive; `—` and a neutral tone when missing). `kpiCards` (`:410-417`) is null when either close is
missing, and then the whole row is absent with no message (executed 2026-09-30). The reference
request is anchored on `daily_indicators.date` of the brief (else today; the review date in review
mode, `:393-401`), and the endpoint returns the trading day before that date, so `Prev close` is the
close before the latest daily row. While the market is open the brief's `close` is replaced by the
live quote (the overlay of DASHBOARD-01), so `Latest close` then holds a live price (read in
`dashboard.py:316-324`, no test runs it).

**Needs:** `GET /api/market/reference/{ticker}/{date}` (`platform/api/main.py:1061`) and the
brief's `daily_indicators.close`, `rsi_14` and `date`. For dates under 30 days old the handler asks
AlphaVantage `TIME_SERIES_DAILY` first (`_fetch_av_daily_reference`, `main.py:200-241`; the handler
is `main.py:1061-1205`), falls back to Cloud SQL `market_data_daily` and then to the GCS parquet
listing, and returns `source`, `stale_days` and a five-session `week` block that this row does not
read.

**States:** DASHBOARD-16, DASHBOARD-18, DASHBOARD-20 through the `referenceQ` wrapper; a missing
close is the absent row, not the empty state.

**Acceptance criteria:**
- Given the brief and the reference both answer, when the page renders, then the four labels `Prev
  close`, `Latest close`, `2-day change` and `RSI (14)` are visible (`shows the daily KPI tiles`,
  `tests/dashboard/dashboard.spec.ts`: labels only; no value or tone is asserted).
- Given a date within 30 days and an AlphaVantage answer, when the handler runs, then the previous
  session's OHLC comes from AlphaVantage; given an older date it comes from Cloud SQL
  (`test_reference_recent_uses_alphavantage`, `test_reference_historical_uses_cloud_sql`,
  `test_reference_returns_prev_day`, `tests/api/test_platform_api.py`).
- Given the brief's newest daily row has no close, when the page renders, then no tile shows
  (executed 2026-09-30: `Prev close`, `Latest close` and `RSI (14)` all absent). This is the
  state of the page from the 08:20 ET premarket insert until the session opens (production read
  2026-09-30 09:26 ET: the IWM row for that day had no close), and by the same code path after the
  close until the 23:00 ET fetch fills the row (not observed; see Gaps).
- Given a missing RSI with both closes present, when the row renders, then the RSI tile reads
  `—` with a neutral tone (`DashboardPage.tsx:705-710`, read directly; no test).
- Given `market_data_daily` on 2026-09-30, then IWM, SPY and QQQ each hold 2,619 rows with the last
  real close on 2026-09-29 (see the V-gate evidence comment).

**Tests:** `tests/dashboard/dashboard.spec.ts` (labels only); `tests/api/test_platform_api.py`
(`TestReferenceAPI`, three tests, plus `test_reference_for_review_date`);
`tests/api/test_route_coverage.py` (a 404 for an unknown date). The tile values, `2-day change` and
the RSI tone are not asserted by any test, so Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:95-102,393-417,693-713`,
`src/components/primitives/index.tsx` (`KpiTile`), `src/lib/format.ts` (`fmtPrice`, `fmtPct`,
`fmtNum`).

##### DASHBOARD-04 · Intraday chart

**Shows or does:** A card headed `<ticker> · intraday` with the caption `60-min bars · last 2
sessions` and a Candles or Area switch (DASHBOARD-12), mounted only when hourly bars exist or the
request is loading, failed or the session is auth-blocked (`DashboardPage.tsx:731-764`, the
condition at `:732`). Bars come from `hourlyQ`, `GET /api/market/data/{ticker}/{YYYYMM}?timeframe=60`
(the month of the anchor date), enabled only once the brief has answered (`:402-407`). Candles
render `CandlestickChart` with every bar of the response, all sessions, no volume, in a fixed
260 px slot (test id `intraday-chart-slot`, `:745-753`). Area renders `PriceAreaChart` with
`pricePoints` (`:422-450`): bars whose ET-labelled hour is 4 to 16 (the times are ET wall clock
carried as UTC seconds, so the code reads UTC getters), reduced to the last two calendar days
present, cut at the review time in review mode, plus a dashed boundary at the start of the last day
(`sessionBoundary`, `:452-468`); with no points it reads `No price data available`
(`PriceAreaChart.tsx:113-122`). The caption's "last 2 sessions" therefore describes the Area style;
the Candles style receives the whole month (see Gaps).

**Needs:** `GET /api/market/data/{ticker}/{date}` (`platform/api/main.py:905`), reading
`market_data_intraday` 1-minute rows through `_load_date_data` and resampling to the requested
timeframe (`main.py:1595-1696`); the conversion to Eastern wall clock reads both stored
conventions through `lib/eastern_time.py` (`stored_intraday_to_eastern`). A Cloud SQL failure or an
empty month falls through to the GCS parquet files (`main.py:1667-1696`) with no signal in the
response.

**States:** DASHBOARD-16, DASHBOARD-18, DASHBOARD-20 through the `hourlyQ` wrapper; the card is
absent until the brief request resolves and, when the brief fails, absent unless the session is
auth-blocked, in which case it is mounted with no bars (executed 2026-09-30: the card was present
with the brief and the market data refused with 401).

**Acceptance criteria:**
- Given 32 hourly bars, when the page renders with Candles, then the canvas stays inside the 260 px
  slot (`candle chart stays inside its 260px card slot`,
  `tests/dashboard/dashboard-chart-fit.spec.ts`).
- Given Area is chosen, when the page renders, then a Recharts surface shows without a crash
  (`intraday chart exposes the Candles / Area toggle and switches`,
  `tests/dashboard/dashboard.spec.ts`).
- Given a full day of 1-minute rows, when the endpoint runs, then the bars are returned, with
  `end_time` cutting them and an invalid `end_time` a 400 (`test_market_data_full_day`,
  `test_market_data_end_time_filter`, `test_market_data_end_time_invalid_format`); no rows is a 404
  (`test_market_data_404_when_no_rows`).
- Given rows stored in either time convention, when a session or a month is read, then the bars
  come back as the same Eastern session and a month excludes its neighbour's spill
  (`tests/api/test_intraday_loader_conventions.py`).
- Given `timeframe=60`, then `_aggregate_timeframe` groups the 1-minute rows into hourly bars
  (`main.py`, read directly); no test requests `timeframe=60` through the endpoint or calls
  `_aggregate_timeframe`.
- Given `market_data_intraday` on 2026-09-30, then IWM 1-minute rows run to 2026-09-30 00:00 UTC
  (20:00 ET on 2026-09-29), 28,561 rows in the last 40 days (see the V-gate evidence comment).

**Tests:** as above. No test asserts the bars a chart receives, the two-session trimming or the
boundary line, so Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:402-407,422-468,731-764`,
`src/components/charts/CandlestickChart.tsx`, `src/components/charts/PriceAreaChart.tsx`; test id
`intraday-chart-slot`.

##### DASHBOARD-05 · Live signals table

**Shows or does:** The left card of the signals and catalysts row (`DashboardPage.tsx:767-803`),
headed `Live signals` with `<ticker> · <total count>` (the count is the ticker's whole signal
history, `signalsResp.count.toLocaleString()`), showing the five most recent signals
(`recentSignals`, `:485-488`: the response reversed, because the handler returns ascending order)
as a four-column table: `Time` (`time.slice(5, 16)`, the raw string with no zone label), `Dir`
(`DirTag`), `Score` (`conditions_met`, else `score/5`) and `Return` (`fmtPct(return_pct * 100)`,
green when `>= 0`). With no signals it shows `No signals yet for this ticker.` The whole card is
clickable (DASHBOARD-14). The request is `?limit=20`, plus `&end_date` and `&end_time` in review mode
(`:345-348`).

**Needs:** `GET /api/signals/{ticker}` (`platform/api/routers/signals.py:221`), which counts and
reads `historical_signals` for the ticker (all `run_kind`s, disclosed on each row), newest 20 by
`entry_time`, returned ascending; a failed read is a 503 (`signals.py:140-218,222-252`).

**States:** DASHBOARD-16, DASHBOARD-18, DASHBOARD-20 through the `signalsQ` wrapper, which also
holds the Catalysts card; DASHBOARD-17 for no rows.

**Acceptance criteria:**
- Given the ticker has signals, when the handler answers, then the response carries the ticker's
  `count`, `source: 'cloud_sql'` and the rows with `time` stringified and `ticker` set
  (`test_signals_live`, `tests/api/test_platform_api.py`); given a count of zero, then it answers
  `signals: []` and never runs the rows query (`test_signals_empty_for_old_date`, `calls["n"] == 1`);
  a Cloud SQL failure is a 503, not the parquet (`TestSignalsAPIFailsLoud`). The newest-N read
  (`signals.py:206-207`), the ascending order (`ORDER BY time ASC`, `signals.py:209`) and the
  direction and end-date filters (`signals.py:165-174`) are in the SQL and read directly: the class
  returns pre-filtered mock rows (`_patch_query`), so `test_signals_with_direction_filter`,
  `test_signals_end_date_filter` and `test_signals_end_date_and_time_filter` assert that the returned
  rows are all `CALL` (the first) or at or before the cutoff (the other two), which holds for those
  fixtures whatever the SQL says; no test asserts the filters or the order.
- Given a signal with `return_pct` 0.5, when the table renders, then the Return cell reads
  `+50.00%`; given `null`, it reads `+0.00%` in green (executed 2026-09-30 in the page; see Gaps:
  the column stores percentage points, so a 0.5 reading is +0.5%).
- Given the newest production rows, when read on 2026-09-30, then IWM's latest `entry_time` is
  2026-09-29 23:21 UTC, 190,159 rows, and the newest 500 `return_pct` values run from -0.34 to 4.53
  with a mean absolute value of 0.13 (see the V-gate evidence comment).
- Given rows before and after the writer's convention change, when the Time column prints, then it
  mixes Eastern wall clock and UTC (production hour histogram, IWM, last 10 days; see Gaps).

**Tests:** `tests/api/test_platform_api.py` as above. No Dashboard test renders a row: every
Dashboard spec serves `signals: []`, so the table, its score column and its return column are
untested at the page layer, and Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:86-93,345-349,485-488,767-803`; no test id.

##### DASHBOARD-06 · Catalysts list

**Shows or does:** The right card of the signals and catalysts row (`DashboardPage.tsx:805-827`),
headed `Catalysts` with `<n> upcoming` (n is at most 5). `allEvents` (`:494-499`) flattens the
response's `events_by_date` in ascending date order, and `catalystFeed` (`:502`) is its first five,
whatever their source. Each row shows `MM-DD`, a title (`title`, else `event`, else `<ticker>
<type>`, clamped to two lines), `<ticker> · <type>` and an impact pill (`high` for `very high` or
`high`, `med` for `medium`, `med` or an unknown or missing impact, `low`, `:153-164`). With none it
shows `No catalysts in the next 7 days.` The request is `date_from` today (ET) and `date_to` seven
days on (the review date and seven days after it in review mode, `:351-356`). The whole card is
clickable to `/catalysts`.

**Needs:** `GET /api/catalysts/events` (`platform/api/routers/catalysts.py:158`). With no
`BENZINGA_API_KEY` in the environment of either service (read 2026-09-30) the handler serves only its
five Cloud SQL reads (`_db_catalyst_events`, `catalysts.py:334-572`): `news_sentiment` (last 48 hours from now,
relevance 0.7 or more, seven topics, `_news_sql` at `:101-124`, ignoring `date_from` and `date_to`),
`economic_events` (high or medium), `earnings_calendar`, `insider_transactions` (three or more
insiders on one side) and `sec_filings` (8-K items 1.01, 2.01, 5.02, 7.01, 8.01), the latter four
within the requested dates. Each read catches its own failure, logs it and contributes no events,
so a failed read is not visible in the response.

**States:** DASHBOARD-16, DASHBOARD-18, DASHBOARD-20 through the `signalsQ` wrapper (the card
belongs to the signals request, not to its own). The catalysts request itself has no state: while it
loads and after it fails the card reads `0 upcoming` and `No catalysts in the next 7 days.`
(executed 2026-09-30, see Gaps).

**Acceptance criteria:**
- Given the response holds news dated before today, when the card renders, then those rows come
  first: with the default fixture the card reads `5 upcoming` and its first two rows are the two
  `AV news` rows of yesterday, ahead of the AAPL earnings row (executed 2026-09-30; no committed
  test asserts this card).
- Given the news query, when written, then it is backward-looking (48 hours from now), matches
  topics case-insensitively and does not depend on the requested window (`test_news_sql_is_backward_
  looking_and_case_insensitive`, `test_news_topics_constant_covers_fetcher_topics`,
  `tests/api/test_catalysts_news_filter.py`).
- Given production data on 2026-09-30, when the five reads run for the page's window, then the news
  filter returns 203, 382 and 79 rows for the UTC dates 09-28, 09-29 and 09-30, 22 high or medium
  economic events and 173 earnings rows fall in the next 7 days, and 59 8-Ks were filed in the last
  7 days (see the V-gate evidence comment). The first five rows of the date-ascending list are therefore news
  dated 09-28, not upcoming events.
- Given the page's window of today to seven days on, when the insider and 8-K reads run, then the
  insider read cannot match, because the newest `transaction_date` is 2026-09-23, before the window,
  and the 8-K read matches only the filings dated inside it, the newest `filing_date` being
  2026-09-30 (see the V-gate evidence comment).

**Tests:** `tests/api/test_catalysts_news_filter.py` (two tests on the SQL text and the topic list);
`tests/api/test_route_coverage.py` (`Req("GET", "/api/catalysts/events", 200)`, `:325`, pins the
route's exact status against a dead backend and asserts no body). `tests/dashboard/dashboard.spec.ts`
serves this payload but asserts nothing on this card, so the row's ordering, labels and impact pills
are untested and Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:108-113,153-164,351-356,494-502,805-827`; no test id.

##### DASHBOARD-07 · Sector rotation

**Shows or does:** The first card of the third row (`DashboardPage.tsx:835-893`, test id
`sector-rotation-card`), headed `Sector rotation` with `SPDRs · as of <date>` and the 1D or 5D
control (DASHBOARD-13). Rows are the eleven SPDR sectors ranked descending by the active period's
change, rows with no value last (`sectorRows`, `:369-379`); each shows the sector name, a bar whose
width is the value's magnitude over the largest magnitude in the period (`sectorBarWidthPct`,
`:237-241`; green for `>= 0`, red below, zero width and a muted colour for a missing value) and
`fmtPct(value)`. A row with `status: 'unavailable'` shows the name, an empty bar and `—`, with the
server's reason as its tooltip (`:857-865`). A whole-payload `status: 'unavailable'` shows the
`Unavailable` line with the server's reason (`:852-853`). The `Loading sector data…` text (`:850-851`)
cannot render, because `WidgetState` shows its skeleton first.

**Needs:** `GET /api/market/sectors` (`platform/api/main.py:1402`): one batched query of the 10
calendar days before the newest date in `market_data_daily`, closes for the eleven ETFs, non-null only, ranked
in `_sector_rotation_from_df` (`main.py:1345-1399`): `chg_1d_pct` from the last two closes and
`chg_5d_pct` from the last six (null under six rows), a symbol with no row or one row is
`unavailable`; a database failure is a 503; the response is cached for ten minutes
(`main.py:1402-1454`).

**States:** DASHBOARD-16, DASHBOARD-18, DASHBOARD-20 through the `sectorsQ` wrapper, which also
holds the AI take and News cards.

**Acceptance criteria:**
- Given four sectors (three ok, one unavailable), when the card renders at 1D, then the rows rank
  Financials, Technology, Energy and the unavailable Consumer Discretionary last with `—`, and the
  header reads `as of <as_of>` (`sector rotation card ranks sectors, shows an em-dash row, and 1D/5D
  toggle switches values`, `tests/dashboard/dashboard.spec.ts`).
- Given a magnitude of 2 over a maximum of 4, when the bar width is computed, then 50; a negative
  value is scaled by magnitude; a zero maximum gives 0, never `NaN`
  (`src/routes/DashboardPage.sectorBarWidthPct.test.ts`).
- Given closes for a symbol, when the handler computes, then the changes come only from real prior
  closes, a partial window omits the 5-day value, a null close degrades the symbol to `unavailable`,
  a database failure is a 503 and a crash does not poison the cache
  (`tests/api/test_market_sectors.py`, nine tests).
- Given the table on 2026-09-30, then each of the eleven ETFs has 7 non-null closes in the 10-day
  window with the latest on 2026-09-29 (see the V-gate evidence comment).

**Tests:** the three files above; together they assert the ranking, the em-dash row, the caption,
the bar width and the handler math, so the row is covered at every layer it crosses.

**Code:** `src/routes/DashboardPage.tsx:118-130,237-247,361-387,832-945`,
`platform/api/main.py:1320-1454`; test ids `sector-rotation-card`, `sector-row`.

##### DASHBOARD-08 · AI take

**Shows or does:** A card headed `AI take` with `conf <n>%` (`confidence_score * 100`) when a report
exists (`DashboardPage.tsx:895-912`): a `DirTag` (`long` green, `short` red, else neutral),
`<conviction> conviction · <time_horizon>` and the thesis clamped to four lines; without a report
`No insight report for <ticker>, generate one on the AI Insights page.` The card shows no date and no
age. The request is `useInsightReport(ticker, reviewDate)` (`:358`,
`src/hooks/useInsights.ts:68-81`): a 404 becomes `null`, any other failure throws and is ignored by
the page. The whole card is clickable to `/insights`.

**Needs:** `GET /api/insights/report/{ticker}` (`platform/api/routers/insights.py:764`; `?as_of=`
in review mode), which reads the newest `insight_reports` row with `run_kind = 'live'` (as of the
end of the given day when `as_of` is present), answers 404 with the ticker and cutoff when there is
none and 503 through `_db_call` on an infrastructure failure (`insights.py:204-250,764-791`).

**States:** DASHBOARD-16, DASHBOARD-18, DASHBOARD-20 through the `sectorsQ` wrapper. The report
request has no state of its own: while it loads, after a 404, after a 500 and after a 401 the card
reads the same `No insight report for IWM` line (executed 2026-09-30; see Gaps).

**Acceptance criteria:**
- Given the report route with no row, when requested, then it is a 404, and with a row `insights.py`
  returns the envelope (`test_get_insight_report_404_when_missing` and
  `test_get_insight_report_returns_latest`, `tests/lib/test_routers_insights_admin.py`, whose module
  skips without a test Postgres). Given no reachable database, then it is a 503 with a JSON body:
  `Req("GET", f"/api/insights/report/{T}", 503)` (`tests/api/test_route_coverage.py:293`) pins that
  exact status against a dead backend (`Req.expect`, `:191-194`), and
  `test_insight_report_lookups_are_503_not_a_bare_500` injects a driver error and asserts the 503, a
  JSON content type and the error type in the detail. A defect in the lookup stays a 500
  (`test_an_internal_defect_is_not_reported_as_an_outage`).
- Given `as_of`, when the handler reads, then it never returns a report after the cutoff
  (`_fetch_latest_report`, `insights.py:204-250`; asserted by
  `test_get_insight_report_as_of_includes_same_day_morning_report` in
  `tests/lib/test_routers_insights_admin.py`, which finds the same-day report and none for an earlier
  cutoff, but that module skips without a test Postgres).
- Given production on 2026-09-30, then IWM, SPY and QQQ each have a live report from 12:55 UTC
  (08:55 ET), 123, 113 and 117 live rows (see the V-gate evidence comment).

**Tests:** no Dashboard test looks at the card: the Playwright fixtures serve the report and
`ticker-combobox.spec.ts` serves a 404 for AAPL, and none looks at the text. The hook is driven on
`/insights` by `tests/insights/insights.spec.ts` (`renders a full report with all cards`;
`shows empty-state CTA when no report exists` for the 404 answered as no report;
`refresh runs the queued -> running -> done polling loop` for a 404 followed by a report), which assert
that page and not this card. No test sends the hook's `as_of` request, which only the Dashboard makes in
review mode (`DashboardPage.tsx:358`; `InsightsPage.tsx:49` passes no cutoff), or reaches its failure
branch. Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:358,513,895-912`, `src/hooks/useInsights.ts:68-81`,
`src/types/insights.ts`; no test id.

##### DASHBOARD-09 · News

**Shows or does:** The third card of the third row (`DashboardPage.tsx:914-943`, test id
`news-card`), headed `News` with `<n> fresh` (n at most 4). `newsFeed` (`:508-511`) is the first
four events of the same date-ascending list that feeds the Catalysts card whose `source` is
`AV news`. Each row shows the title, `<ticker> · <source> · <today | yesterday | Mon D>` (day
granularity only, `relativeDayLabel`, `:172-185`, computed in ET) and, only when the row has a
non-empty `sentiment_label` (`:936`), a pill with that label coloured by score (above 0.15 green,
below -0.15 red, else neutral, a missing score counted as 0, `:924-925`). With none it shows
`No tagged news right now.` The whole card is clickable to `/catalysts`.

**Needs:** the same `GET /api/catalysts/events` request as DASHBOARD-06; the `AV news` rows are the
handler's `news_sentiment` read (`catalysts.py:101-124,353-410`: relevance 0.7 or more, seven
topics, deduped per ticker, day and title, `source: 'AV news'`, `date` the UTC date of
`published_ts`).

**States:** DASHBOARD-16, DASHBOARD-18, DASHBOARD-20 through the `sectorsQ` wrapper; a failed
catalysts request reads `0 fresh` and `No tagged news right now.` (executed 2026-09-30, see Gaps).

**Acceptance criteria:**
- Given two `AV news` rows dated yesterday among other sources, when the page renders, then the meta
  reads `2 fresh` and both headlines show (`News card counts AV-news rows dated in the past and
  shows both headlines`, `tests/dashboard/dashboard.spec.ts`, which pins the `source === 'AV news'`
  match over the whole events array).
- Given today, yesterday and an older date, when a row is labelled, then `today`, `yesterday` and
  `Mon D`, in ET across the UTC day roll and never an hour (`relativeDayLabel`,
  `src/routes/DashboardPage.relativeDayLabel.test.ts`, five tests).
- Given the window, when the news is picked, then the four rows shown are the first four of the
  oldest date, not the newest: in production on 2026-09-30 that is 203 rows dated 09-28 against 382
  and 79 later (see the V-gate evidence comment and Gaps).
- Given an article published after 20:00 ET, when its row is labelled, then the label is a date that
  has not begun in ET: at 22:30 ET on 2026-07-07 a row carrying the UTC date `2026-07-08` (published
  21:00 ET) reads `Jul 8` while `2026-07-07` reads `today` (executed 2026-09-30 through
  `relativeDayLabel` in a scratch Vitest run; the row's `date` is `published_ts::date`, which is the
  UTC calendar date on this database's UTC session; see Gaps).

**Tests:** the Playwright test and the Vitest file above; `tests/api/test_catalysts_news_filter.py`
covers only `_news_sql` and the topic list, and no test runs the handler's news mapping (the source
tag, the dedupe, the impact). Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:172-185,494-511,914-943`,
`platform/api/routers/catalysts.py:101-124,353-410`; test id `news-card`.

##### DASHBOARD-21 · Movement Read card (feature-flagged)

**Shows or does:** `<MovementRead ticker={activeTicker} timeframe="15m" />`, mounted only outside
review mode (`DashboardPage.tsx:729`; `MovementRead.test.tsx` asserts the mount is guarded). It
renders nothing while disabled, loading, absent (a 404 means the flag is off), errored or without a
statement (`MovementRead.tsx:123-144`). With a statement it shows a card `Movement Read` with
`<ticker> · <timeframe>`: the headline (test id `movement-headline`) when its status is `OK`, else
an em dash with an `unavailable` badge and the reason; the levels ladder, `Call levels` and `Put
levels`, each rung with its price and `<rate>% (n=<sample>)` and a `low confidence` badge for a small
sample, or the badge when the rung has no rate; a `Context` block (`context-modifiers`) with the
expected-move size class and the regime mood; and, when the expected move is `OK`, the size light
(`size-light-chip`: green at `p_expanded + p_explosive` 0.20 or more, amber from 0.10, else red), the
ATR label, the line `Direction: not predicted`, a risk hint, an options idea at `p_explosive` 0.10 or
more and a size calculator (`size-calculator`, inputs kept in `localStorage` `em.account` and
`em.riskPct`), then the scope statement.

**Needs:** `GET /api/movement-statement?ticker=&timeframe=`
(`platform/api/routers/dashboard.py:530`), off unless `MOVEMENT_STATEMENT_ENABLED` is true (a 404
otherwise; true on both services, read 2026-09-30), IWM, SPY and QQQ at 5m or 15m only (a 400
otherwise), a 503 on an infrastructure failure, and otherwise the assembler's dict passed through
with its per-field `UNAVAILABLE` envelopes (`dashboard.py:530-638`,
`lib/movement_statement.py`). The hook retries any failure other than a 404 twice
(`src/hooks/useMovementStatement.ts:58-63`).

**States:** none of the shared states: a 404, a 400 (a ticker picked outside IWM, SPY and QQQ) or a
500 all hide the card with no message, after two retries for the latter two (executed 2026-09-30:
three requests, no badge; see Gaps). Field-level `UNAVAILABLE` shows the em dash and badge.

**Acceptance criteria:**
- Given a statement with a headline, both levels and an expected move, when the page renders, then
  the headline, the `TIGHT` size class, `Call levels` and `Put levels` with `70% (n=115)` and
  `45% (n=94)`, and no low-sample badge show (`movement-read card renders TYPE + validated SIZE +
  regime (flag ON)`, `tests/dashboard/movement-read.spec.ts`); a young slot carries the badge on
  that rung only; an untracked rung and a withheld expected move degrade only their own fields to
  two `unavailable` badges; the big-move, tight and no-ATR affordance states and the calculator
  work (the five other tests in the file).
- Given a review date, when the page renders, then no `<MovementRead` mount is unguarded
  (`Review-mode mount guard`, `src/components/dashboard/MovementRead.test.tsx`, a source-level
  check; the executed page run 2026-09-30 also showed the card absent in review mode).
- Given a picked ticker, when the statement is requested, then the fixture answers 501 for a
  non-IWM ticker and the card does not show IWM's headline (`picking AAPL does not render the IWM
  movement statement`, `tests/dashboard/ticker-combobox.spec.ts`).
- Given the helpers, when formatting, then a null probability or rate is an em dash and never `0%`,
  the size light, ATR label, risk hint, options idea and size calculator follow their thresholds
  (`MovementRead.test.tsx`, `expectedMove.test.ts`).
- Given the endpoint, then a flag off is a 404, a bad ticker or `30m` a 400, the assembler output is
  passed through unchanged and a NaN close degrades levels to `UNAVAILABLE`
  (`tests/api/test_movement_statement_router.py`, 22 tests: 144 passed together with
  `tests/api/test_route_coverage.py`, and the module skips when it runs alone; its NaN-close test
  fails when selected with `-k`, stocks#1225). That file asserts no 503:
  `test_level_map_propagates_a_backend_outage` (`:602`) checks that the level-map builder re-raises a
  driver error and that a data gap gives `None` (`:617-621`). With the flag on and `get_engine`
  failing, a backend outage is a 503 and an internal defect a 500 (`tests/api/test_route_coverage.py`:
  `test_the_feature_gated_handlers_survive_a_backend_outage`, `:1234`, and
  `test_an_internal_defect_is_not_reported_as_an_outage`). The
  assembler's own tests (`tests/lib/test_movement_statement.py`) fail alone in this sandbox (41 of 65,
  no lightgbm) and pass after `tests/api/test_route_coverage.py` has run (187 passed together); all of
  these executed 2026-09-30.
- Given production on 2026-09-30, then the flag is on for both services, IWM has 15m magnitude
  predictions to 19:45 UTC on 09-29, `strat_features_15m` and its levels table to the same bar (see
  the V-gate evidence comment), and the served IWM, SPY and QQQ 15m models list `vix_close` and
  `vix_tercile_*` as features (`features.txt` read from GCS, see the
  [follow-up comment](https://github.com/TeneikaAskew/stocks/issues/1234#issuecomment-5914245540)).

**Tests:** the files named above. The FE layer (Playwright on main, Vitest), the handler and the
assembler each assert the row's behaviour with real assertions.

**Code:** `src/components/dashboard/MovementRead.tsx`, `src/components/dashboard/expectedMove.ts`,
`src/hooks/useMovementStatement.ts`, `src/routes/DashboardPage.tsx:715-729`; test ids
`movement-headline`, `context-modifiers`, `unavailable-badge`, `low-sample-badge`,
`size-light-chip`, `expected-move-atr`, `direction-line`, `risk-hint`, `options-idea`,
`size-calculator`, `calc-account`, `calc-risk`, `calc-result`.

##### DASHBOARD-10 · Switch ticker

**Shows or does:** `TickerCombobox` (`src/components/shared/TickerCombobox.tsx`, mounted at
`DashboardPage.tsx:547`) is a trigger button that shows `activeTicker` and opens a popover with the
quick picks (IWM, SPY, QQQ), up to eight recent picks and, once one character is typed and 300 ms
have passed, a live symbol search (`GET /api/insights/ticker/search?keywords=&limit=8`) whose rows
carry a coverage badge (`full` for daily plus intraday, `daily`, `new`; a symbol with no coverage
entry, or a failed lookup, reads `new`, and a failed lookup adds an inline hint). Enter picks the top
search hit, or the highlighted row after an arrow key; a click picks a row; Escape or an outside click
closes it (`:259-291`, `choose`). A pick upper-cases the symbol, writes `activeTicker` and the recents in `useTickerStore`
(persisted as `ticker-store`, `src/stores/tickerStore.ts`), and closes the popover. A pick of a search
row badged `new`, with a healthy coverage lookup, also posts the symbol to the watchlist and shows
`Tracking <SYM>: daily data lands after tonight's fetch` for eight seconds, or `couldn't add <SYM> to
tracking, <error>` when the write fails; the ticker is set in both cases. Every ticker-scoped query on
the page is keyed by `activeTicker`, so the brief, playbook, signals, AI take, quote, reference,
hourly bars and Movement Read are asked again for the new symbol (executed 2026-09-30 by a scratch
page run picking AAPL: those eight requests, and no new request for the sector or catalyst cards,
which are market-wide). The chosen ticker survives a reload (the trigger read AAPL after
`page.reload()`); the review date is a separate store and is not touched.

**Needs:** `GET /api/insights/ticker/search`, `GET /api/market/coverage?symbols=`,
`POST /api/insights/watchlist/add` (body `{ticker}`), plus the whole ticker-scoped fan-out of
DASHBOARD-01 to 09 and 21. The Movement Read endpoint answers only IWM, SPY and QQQ, so any other
ticker gets a 400 there (see DASHBOARD-21).

**States:** the popover has its own inline states (`ticker-search-error`, `ticker-coverage-error`,
`ticker-ingest-notice`); the page's cards show DASHBOARD-16 to DASHBOARD-20 for the new symbol.

**Acceptance criteria:**
- Given the page has loaded, when the trigger is pressed, then the popover opens with the input
  focused and IWM, SPY and QQQ offered (`trigger shows the active ticker and opens the popover`,
  `quick picks (IWM/SPY/QQQ) render in the popover`, `tests/dashboard/ticker-combobox.spec.ts`).
- Given `aa` is typed, then AAPL shows with its name and a `daily` badge (`typing "aa" surfaces AAPL
  with a "daily" coverage badge`).
- Given a pick by Enter after arrow keys, by Enter straight after typing, or by click, then the
  panel closes and the trigger reads AAPL (`Enter picks the highlighted result and sets the header
  ticker`, `Enter with no arrow-navigation picks the top search hit, not the first quick pick`,
  `clicking the AAPL result directly sets the header ticker`); Escape closes without a change
  (`Escape closes the popover without changing the ticker`).
- Given the pick, then the Movement Read card does not show IWM's statement under AAPL (`picking AAPL
  does not render the IWM movement statement`).
- Given the search request fails, then an inline error shows, never a `No matches` line; given the
  coverage request fails, then suggestions still show with the `new` badge and a hint (`search
  failure renders an inline error, never an empty "no matches" lie`, `coverage failure still renders
  suggestions plus an inline hint that badges may be inaccurate`).
- Given a `new` pick, then the watchlist is posted with `{ticker: 'AAPL'}` and the tracking notice
  shows; given a `full` pick, then nothing is posted; given a failed post, then the notice carries the
  status and detail and the ticker is still set (`picking a "new"-badged suggestion auto-adds it to
  the watchlist with an honest ingest notice`, `picking a "full"-badged suggestion does NOT auto-add
  to the watchlist`, `watchlist-add failure shows a loud inline error but still sets the active
  ticker`, and the coverage-error and bare-Enter variants in the same file).
- Given the store, then the symbol is upper-cased, recents are newest first without duplicates and
  capped at eight, and only `activeTicker` and `recentTickers` are persisted
  (`src/stores/tickerStore.test.ts`); the row helpers (badge, merge, dedupe, default highlight,
  debounce) are pure and tested (`src/components/shared/tickerCombobox.test.ts`).
- Given the pick, then the ticker-scoped requests are asked again for the new symbol and the
  market-wide ones are not (executed 2026-09-30, scratch run; no committed test asserts the
  requests).

**Tests:** `tests/dashboard/ticker-combobox.spec.ts` (twenty tests, all asserting the combobox and
its consequences), `src/components/shared/tickerCombobox.test.ts`, `src/stores/tickerStore.test.ts`.
The set covers picking, the failure paths and the store; the request fan-out after a pick is the
part no test asserts.

**Code:** `src/components/shared/TickerCombobox.tsx`, `src/hooks/useTickerSearch.ts`,
`src/stores/tickerStore.ts`, `src/routes/DashboardPage.tsx:277,319-358,547`; test ids
`ticker-combobox`, `ticker-combobox-panel`, `ticker-combobox-input`, `ticker-option-<SYM>`,
`ticker-search-error`, `ticker-coverage-error`, `ticker-ingest-notice`.

##### DASHBOARD-11 · Refresh

**Shows or does:** A ghost button labelled `Refresh` with a refresh icon, to the right of the ticker
combobox (`DashboardPage.tsx:548-555`). Its handler is `window.location.reload()`: it loads the whole
document again, so every request of the page is asked for again, the market-wide cards included, and
all in-memory state is lost. What survives a reload: the ticker (`ticker-store`) and the chart style
(`overview-chart`). What does not: review mode (the review store is in memory, so a reload returns to
live; executed 2026-09-30: the header chip read `Replay · Sep 30, 4:00 PM` before and `Replay` after,
and the Movement Read card came back), the 1D or 5D choice (back to 1D) and any popover state.

**Needs:** nothing of its own. The reload re-issues the page's full fan-out.

**States:** none of its own; after the reload the cards show DASHBOARD-16 again.

**Acceptance criteria:**
- Given the page has loaded, when Refresh is pressed, then the document loads a second time and the
  brief endpoint is requested again (`Refresh reloads the document and asks for the data again`,
  `tests/dashboard/dashboard.spec.ts`; added on the branch in solyra commit 589cd30; with the button
  made a no-op the test failed `Expected: 2 Received: 1`, and with the real button it passed: 12
  passed in the file, counting the warmup, the nine earlier tests and the two new ones).
- Given review mode, when Refresh is pressed, then the page returns to live mode (executed
  2026-09-30, scratch run; no committed test).

**Tests:** the one test above, which exists only on this branch, so Te stays unticked until a CI run
includes it.

**Code:** `src/routes/DashboardPage.tsx:548-555`; no test id (the button is found by its role and
name `Refresh`).

##### DASHBOARD-12 · Candles or Area toggle

**Shows or does:** A two-button segmented control, `Candles` and `Area`, in the header of the
intraday card (`DashboardPage.tsx:739-742`, classes `segctrl` and `active`). `chartStyle` starts from
`localStorage` key `overview-chart` (`area` gives Area; a missing `localStorage` or any other value
gives Candles, `:282-284`; the read has no `try`/`catch`, so a storage that throws on access throws
out of the initializer, see Gaps); `pickChart` sets the state and writes the key (`candle` or `area`,
`:285-288`). A failing write is caught (`:287`) and the choice then lasts only until the next
reload, with no message. The control exists only while the intraday card is mounted (DASHBOARD-04).
Switching does not request bars again: both styles read the same `hourlyQ` response.

**Needs:** browser storage only.

**States:** none of its own.

**Acceptance criteria:**
- Given a first visit, when the card renders, then Candles is active, the fixed candle slot is
  present and nothing is stored (`the Candles or Area choice is stored and survives a reload`,
  `tests/dashboard/dashboard.spec.ts`, branch only).
- Given Area is pressed, then the candle slot is removed, a Recharts surface shows and `overview-chart`
  is `area` (same test; the surface alone is asserted on main by `intraday chart exposes the Candles /
  Area toggle and switches`).
- Given a reload, then Area is still active and the candle slot is still absent (same test).
- Given Candles is pressed again, then the slot returns and `candle` is stored (same test; with the
  storage write removed the test failed `Expected: "area" Received: null`, and with the real code it
  passed).

**Tests:** the two tests above. The main test asserts that both buttons show and that the Area
surface appears after the click; the memory is asserted only by the branch test, so Te stays
unticked until a CI run includes it.

**Code:** `src/routes/DashboardPage.tsx:282-288,731-764`; test id `intraday-chart-slot`.

##### DASHBOARD-13 · 1D or 5D sector period

**Shows or does:** A two-button segmented control, `1D` and `5D`, in the header of the Sector rotation
card (`DashboardPage.tsx:843-846`), next to the `SPDRs · as of <date>` caption. `sectorPeriod` is
component state, default `1d`, not persisted (a reload returns to 1D). `sectorRows` re-sorts the
rows descending by `chg_1d_pct` or `chg_5d_pct` with missing values last, and `sectorMaxAbs`
rescales the bars for the active period (`:369-387`). The response is the one already fetched, so
switching sends no request.

**Needs:** the `GET /api/market/sectors` response of DASHBOARD-07, which carries both changes per
symbol; the 5-day change is null when the symbol has fewer than six closes in the window.

**States:** as DASHBOARD-07; a row with no value in the active period shows `—` with no bar.

**Acceptance criteria:**
- Given four sectors, when 1D is active, then Financials (2.5), Technology (1.25), Energy (-0.75) and
  the unavailable Consumer Discretionary rank in that order with `—` last; when 5D is pressed, then
  Energy (4.2), Technology (3.4), Financials (-1.1) and Consumer Discretionary rank in that order
  (`sector rotation card ranks sectors, shows an em-dash row, and 1D/5D toggle switches values`,
  `tests/dashboard/dashboard.spec.ts`).
- Given a symbol with a 1-day change and no 5-day change, when 5D is active, then its row reads `—`
  and sinks (executed 2026-09-30 in the page: 1D showed Real Estate +2.00% and Technology +1.00%, 5D
  showed Technology +3.00% and Real Estate `—`); the handler returns a null 5-day change under six
  closes (`test_sector_rotation_partial_window_no_5d`, `tests/api/test_market_sectors.py`).
- Given a period's largest magnitude, then bar widths scale to it and never reach `NaN`
  (`src/routes/DashboardPage.sectorBarWidthPct.test.ts`).

**Tests:** the Playwright test on main and the Vitest file above; both assert the ranking and the
scaling of the row.

**Code:** `src/routes/DashboardPage.tsx:237-247,361-387,843-846`; test ids `sector-rotation-card`,
`sector-row`.

##### DASHBOARD-14 · Click a card (signals, catalysts, news, AI take)

**Shows or does:** Four cards are wrapped in `Card interactive onClick={() => navigate(...)}`: Live
signals goes to `/signals` (`DashboardPage.tsx:770`), Catalysts to `/catalysts` (`:806`), AI take to
`/insights` (`:896`) and News to `/catalysts` (`:915`). No query string is added: `/signals` and
`/insights` read the ticker from the persisted ticker store (`/catalysts` lists every ticker and only
writes it), and `/signals` also reads the review date from the review store. `Card` renders a plain
`div` with an `onClick`, a pointer cursor and a hover border, no `role`, no `tabindex` and no key
handler (`src/components/primitives/index.tsx:248-271`), so the four cards cannot be reached or
activated from the keyboard (executed 2026-09-30, scratch run: all four are `DIV` with `tabindex` and
`role` unset and a pointer cursor). The Top setup card, the Movement Read
card, the intraday card and the sector card do not navigate anywhere; the Top setup has no link to
`/playbook`.

**Needs:** nothing from the API.

**States:** none of its own.

**Acceptance criteria:**
- Given a click on the Live signals card, then the location becomes `/signals`; on Catalysts,
  `/catalysts`; on AI take, `/insights`; on News, `/catalysts` (executed 2026-09-30, scratch run;
  no committed test).
- Given the four cards, when their elements are inspected, then each is a `DIV` with no `tabindex`
  and no `role`, so none can take keyboard focus (executed 2026-09-30, scratch run: tag, `tabindex`,
  `role` and cursor read from the DOM). The record's own target of keyboard operability is not met
  (see Gaps).

**Tests:** none. No spec clicks a card, so Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:770,806,896,915`, `src/components/primitives/index.tsx:248-271`
(`Card`); no test ids.

##### DASHBOARD-15 · Review mode

**Shows or does:** The `Replay` control in the app header (`src/components/shared/ReplayControl.tsx`,
test ids `replay-toggle` and `replay-clear`) is shown only on `/dashboard`, `/live`, `/charts` and
`/signals` (`REPLAY_ROUTES`, `:11`). Its popover offers a calendar with weekends, listed market
holidays and future dates disabled, a `Latest session close` shortcut and a `Time (ET)` field
(default 16:00); Apply writes `reviewDate` (`YYYY-MM-DD`) and `reviewTime` (`HH:MM`) to
`useReviewDateStore` (`src/stores/reviewDateStore.ts`, in memory only) and the chip turns amber
`Replay · <date time>`; the cross clears it. On the Dashboard `isReview` (`DashboardPage.tsx:298`)
changes the page as follows: the label reads `As of` with the date and the pill `HISTORICAL`; the
brief, playbook, signals, AI take and catalysts requests carry the date (`?date=`, `?date=`,
`&end_date=&end_time=`, `?as_of=`, and `date_from` on the review date with `date_to` seven days
later); the reference and hourly bars are anchored on the review date; the hero price is rebuilt from
that day's 1-minute bars up to the review time with its change against the prior session close, or
`—` when the day has no bars (`useReviewQuote`, `src/lib/reviewQuote.ts`); the Area chart is cut at
the review cutoff (`reviewCutoffTs`); the brief and playbook polling stops; the Movement Read card
is not mounted (`:729`). Two cards are not review aware: Sector rotation (`/api/market/sectors`
takes no date) and News (the news read looks back from now and ignores the requested dates), and the
Candles style is given the whole month of bars with no cutoff (`:747`). See Gaps.

**Needs:** `GET /api/dashboard/brief/{t}?date=`, `GET /api/playbook/{t}?date=`,
`GET /api/signals/{t}?limit=20&end_date=&end_time=`, `GET /api/insights/report/{t}?as_of=`,
`GET /api/catalysts/events?date_from=&date_to=`, `GET /api/market/reference/{t}/{YYYYMMDD}`,
`GET /api/market/data/{t}/{YYYYMM}?timeframe=60` and `GET /api/market/data/{t}/{YYYYMMDD}?timeframe=1`.

**States:** DASHBOARD-16 to DASHBOARD-20 per card. There is no banner telling the reader that the
sector and news cards are live.

**Acceptance criteria:**
- Given Apply of 2026-09-30 at 16:00, when the page's queries re-key, then the new requests are
  exactly brief `?date=2026-09-30`, playbook `?date=2026-09-30`,
  signals `?limit=20&end_date=2026-09-30&end_time=16:00`, insights `?as_of=2026-09-30`, reference
  `/20260930`, hourly `/202609?timeframe=60` and the 1-minute day `/20260930?timeframe=1` (executed
  2026-09-30, scratch run; no committed test). The catalysts request was not repeated in that run
  because the review date equalled the fixture's today and the query key was unchanged; its
  `date_from` is the review date and its `date_to` seven days later (`:351-356`, read directly).
- Given review mode, then the pill reads `HISTORICAL`, the label reads `As of`, and the Movement Read
  card is absent (same run; `Review-mode mount guard` in
  `src/components/dashboard/MovementRead.test.tsx` asserts the guard in the source).
- Given a review date without a time, then the cutoff is 16:00 ET, and an explicit time is honoured
  (`reviewCutoffTs`, `src/hooks/useReviewQuote.test.ts`).
- Given a prior close, then the review quote's change is against it; given none, then change and
  change percent are null and never rebased on the open; given no bars, then no quote
  (`buildReviewQuote`, `src/routes/reviewQuote.test.ts`).
- Given `date`, then the brief handler bounds both reads by it (`dashboard.py:111,157`), the signals
  handler honours `end_date` and `end_time` (`signals.py:171-174`), the playbook age is judged
  against the requested date, and the report never comes from after the cutoff. The playbook age is
  asserted (`test_playbook_as_of_is_judged_against_the_requested_date`: a set 2 days old is served
  for 2026-06-15 and one 80 days old is refused as of 2026-09-01), and so is the report bound
  (`insights.py:204-250`; `test_get_insight_report_as_of_includes_same_day_morning_report` in
  `tests/lib/test_routers_insights_admin.py`, whose module skips without a test Postgres). The brief
  bound and the signals filter are read directly, not asserted: `test_brief_with_historical_date` and
  `test_review_brief_returns_correct_date` feed a fixed frame through a fake `_query_fn` that ignores
  the SQL and assert that the answer is `source: 'cloud_sql'` (`test_platform_api.py:857,2086`) and
  that it carries a daily date at or before the requested date, and
  `test_signals_end_date_and_time_filter` returns pre-filtered mock rows and asserts that their times
  are at or before the cutoff, which holds for that fixture whatever the SQL says.
- Given Refresh or a reload, then review mode is gone (see DASHBOARD-11).

**Tests:** the Vitest files above cover the helpers (`reviewCutoffTs`, `buildReviewQuote`),
`test_playbook_as_of_is_judged_against_the_requested_date` the playbook age and, in a module that
skips without a test Postgres, `test_get_insight_report_as_of_includes_same_day_morning_report` the
report bound; the brief and signals date bounds are read, not asserted (see the criteria above). No
test drives the Dashboard through the Replay control, so the page-level wiring is unasserted and Te
stays unticked.

**Code:** `src/components/shared/ReplayControl.tsx`, `src/stores/reviewDateStore.ts`,
`src/hooks/useReviewQuote.ts`, `src/lib/reviewQuote.ts`,
`src/routes/DashboardPage.tsx:297-317,345-358,393-407,422-450,547-555,729`; test ids `replay-toggle`,
`replay-clear`.

##### DASHBOARD-16 · State: loading

**Shows or does:** Five queries are wrapped in `WidgetState`: the brief (the strip and the Top setup,
4 rows), the reference (the KPI row, compact, 2 rows), the hourly bars (inside the intraday card,
compact, 5 rows), the signals (the Live signals and Catalysts cards, compact, 4 rows) and the
sectors (Sector rotation, AI take and News, compact, 4 rows) (`DashboardPage.tsx:560,694,734,767,832`).
While a wrapped query has no data and is fetching, `WidgetSkeleton` (`src/components/shared/WidgetState.tsx:11-27`)
renders in place of the body: pulsing bars of decreasing width in a `role="status"` region labelled
`Loading`. A failing request keeps the skeleton through its one retry (`retry: 1`, `src/App.tsx:34`)
before the error or sign-in state replaces it. The intraday card is not mounted until the brief has
resolved, because `hourlyQ` is enabled only then (`:402-407`), and then mounts with its own skeleton.
Five queries have no loading state: the playbook, the catalysts, the AI take, the live quote and the
live status. Once their wrapper has resolved they read as their empty or absent form while still
in flight: `No playbook setups yet`, `0 upcoming`, `No insight report for IWM`, `—` and `CLOSED`
(executed 2026-09-30 for the AI take while its request was held; see Gaps).

**Needs:** none of its own.

**States:** this row is the state.

**Acceptance criteria:**
- Given the brief, reference, signals and sectors requests are held, when the page loads, then four
  skeletons are visible and the Movement Read card, which is not wrapped, is already shown; the
  intraday card is absent (executed 2026-09-30, scratch run; one skeleton, the intraday card's, was
  visible right after the brief resolved).
- Given the request resolves, then the skeleton is replaced by the card body (same run).
- Given a failing request, then the skeleton stays through the retry and is then replaced by
  DASHBOARD-18 or DASHBOARD-20 (executed 2026-09-30 for the 401 and 503 cases).
- No committed test asserts a skeleton on the Dashboard.

**Tests:** none for the state. The `WidgetState` unit tests (`src/components/shared/WidgetState.test.ts`)
cover the error helpers only. Te stays unticked.

**Code:** `src/components/shared/WidgetState.tsx:11-27,93-115`,
`src/routes/DashboardPage.tsx:402-407,560,694,734,767,832`, `src/App.tsx:30-37`.

##### DASHBOARD-17 · State: empty

**Shows or does:** There is no single empty state. Each card words its own: the strip shows the
`Unavailable` line with the server's `reason` when the brief's `source` is `unavailable` (`:588-603`,
fallback text `Pre-market brief unavailable, Cloud SQL not connected or no brief for today.`); the KPI
row is absent, with no message, when either close is missing (`kpiCards`, `:410-417`), and only the
RSI tile can read `—`; the Top setup reads `No playbook setups yet, run the pipeline to populate.`
(`:674-687`); Live signals reads `No signals yet for this ticker.` (`:776`); Catalysts reads `No
catalysts in the next 7 days.` (`:812`); Sector rotation reads `Unavailable` with the reason for a
whole-payload `unavailable`, and a row `—` with the reason as a tooltip (`:852-865`); AI take reads
`No insight report for <ticker>, generate one on the AI Insights page.` (`:910`); News reads `No tagged
news right now.` (`:920`); the Area chart reads `No price data available`
(`src/components/charts/PriceAreaChart.tsx:113-122`). The intraday card is not mounted at all when the
request succeeded with no bars. Nothing renders a fabricated zero for a missing daily value; the
brief handler, however, answers a 200 `neutral` brief when it has no data (see DASHBOARD-01), and the
AI take, Catalysts and News cards use their empty line for a failed request too (see Gaps).

**Needs:** none of its own.

**States:** this row is the state.

**Acceptance criteria:**
- Given a sector row with `status: 'unavailable'`, then it renders its name with `—` and no bar and
  sinks to the bottom (`sector rotation card ranks sectors, shows an em-dash row, and 1D/5D toggle
  switches values`, `tests/dashboard/dashboard.spec.ts`).
- Given a playbook set the server refuses, then the refusal is worded in the card, not the empty
  line (`top setup surfaces the stale-cards refusal instead of a generic empty state`, which asserts
  the empty line is absent when the refusal shows).
- Given a null average return, then `—` and never `0.00%` (`topSetupAvgReturn`,
  `src/routes/DashboardPage.avgReturn.test.ts`).
- Given no close on the newest daily row, then no KPI tile shows (executed 2026-09-30, scratch run).
- The other empty lines listed above are read from the code; no committed test asserts them.

**Tests:** the tests named above cover the sector row, the refusal and the average return. The
empty lines of the strip, Top setup, signals, catalysts, AI take, news and chart have no test, so
Te stays unticked.

**Code:** `src/routes/DashboardPage.tsx:225-228,266-270,410-417,588-603,674-687,776,812,852-865,910,920`,
`src/components/charts/PriceAreaChart.tsx:113-122`.

##### DASHBOARD-18 · State: error

**Shows or does:** When a wrapped query fails with anything other than a 401, `WidgetError`
(`src/components/shared/WidgetState.tsx:29-62`) replaces the card body: a `role="alert"` box with the
text `Couldn't load this data`, the message (the server's `detail` with `(HTTP <status>)` appended
by `responseErrorMessage`, `src/lib/format.ts:98-109`; a bare status code reads `Request failed
(HTTP <status>)`) and a `Retry` button that refetches that query. The wrapper granularity decides
what disappears: a failed brief takes the strip and the Top setup with it, a failed sectors request
takes Sector rotation, AI take and News, a failed signals request takes Live signals and Catalysts
(executed 2026-09-30: 503 on the brief and on the sectors gave two alerts, with the Top setup, AI
take and News cards gone). Five requests sit outside a wrapper: the playbook shows its own
`Playbook unavailable: <reason>` line, and the catalysts, AI take, quote and status fail silently
as their empty or closed form (see Gaps). The Movement Read card hides on any error after two
retries.

**Needs:** none of its own.

**States:** this row is the state.

**Acceptance criteria:**
- Given a 503 on a wrapped request, when the retry has failed, then the card shows `Couldn't load
  this data` with the server's detail and status, and `Retry` (executed 2026-09-30, scratch run: `database
  query failed: RuntimeError (HTTP 503)`).
- Given a FastAPI `{detail}` body, then the message carries the detail and the status; given a body
  without a string detail, then the bare status (`responseErrorMessage`, `src/lib/format.test.ts`,
  three tests); a bare three-digit message expands to `Request failed (HTTP <n>)`, a real message
  passes through and an empty one gives null (`errorMessage`, `src/components/shared/WidgetState.test.ts`).
- Given the playbook is refused (503), then the Top setup shows `Playbook unavailable` with the
  detail (`top setup surfaces the stale-cards refusal instead of a generic empty state`).
- No committed test renders `WidgetError` on the Dashboard.

**Tests:** the unit tests above cover the message helpers, the Playwright test covers the playbook
refusal. The error box itself is asserted by no test, so Te stays unticked.

**Code:** `src/components/shared/WidgetState.tsx:29-62,80-86,111-113`, `src/lib/format.ts:98-109`,
`src/routes/DashboardPage.tsx:143,560,674-687,694,734,767,832`.

##### DASHBOARD-19 · State: stale

**Shows or does:** Under the Top setup title the card set's age reads `Cards as of <Mon D, YYYY>
(<n>d old)`, `(same day)` for 0, only the date when the age is missing, and nothing when the date is
missing or malformed (`snapshotAgeLabel`, `src/lib/dates.ts`; test id `playbook-age`,
`DashboardPage.tsx:344,618-625`). The server refuses a set older than seven days with a 503 naming the
date and the job, and the page reads the payload through `dataUnlessError` so a refused refetch
drops the previously fetched set instead of rendering it (`:341`, `src/lib/queryData.ts`). In live
mode the playbook is asked again every 15 minutes, so a dashboard left open across the boundary
picks up the refusal (`PLAYBOOK_REFETCH_MS`, `:136`). Nothing else on the page is marked stale: the
brief's `stale_days` (`test_brief_stale_days_present`) is not declared in the page's types, the
reference's `source` and `stale_days` are declared (`:97`) but never read, the quote's `last_updated` is
not shown, and the strip's `· <date> close` is the only age cue for the daily row
(and reads a placeholder day as a close, see DASHBOARD-01).

**Needs:** `analysis_date`, `age_days` and `max_age_days` from `GET /api/playbook/{ticker}`.

**States:** this row is the state.

**Acceptance criteria:**
- Given a set of 2026-09-05 with age 1, then the card reads `as of Sep 5, 2026 (1d old)`
  (`top setup shows the card set date and age`, `tests/dashboard/dashboard.spec.ts`;
  `snapshotAgeLabel` formats 85 days, same day, 1 day, a missing age and an invalid date,
  `src/lib/dates.test.ts`).
- Given the server refuses with 503, then the old set is not rendered and the refusal shows
  (`top setup surfaces the stale-cards refusal instead of a generic empty state`; `dataUnlessError`,
  `src/lib/queryData.test.ts`, three tests).
- Given a set exactly 7 days old, then it is served, and one day older it is refused; a cached set is
  judged again on every hit; a set is judged against the requested date in review mode
  (`test_playbook_age_boundary`, `test_playbook_stale_set_is_refused_not_rendered`,
  `test_playbook_cached_set_is_rechecked_on_every_hit`,
  `test_playbook_as_of_is_judged_against_the_requested_date`, `tests/api/test_playbook_evaluate.py`).
- Given production on 2026-09-30, then the newest set for IWM, SPY and QQQ is dated 2026-09-30,
  generated 08:38 to 08:46 UTC (see the V-gate evidence comment).

**Tests:** the Playwright tests on main, the Vitest files and the pytest tests above all assert the row.

**Code:** `src/routes/DashboardPage.tsx:136,328-344,618-625`, `src/lib/dates.ts`,
`src/lib/queryData.ts`, `platform/api/routers/playbook.py:136-303,306-364`; test id `playbook-age`.

##### DASHBOARD-20 · State: permission

**Shows or does:** When a wrapped query fails with a message containing `401` or `unauthor`
(`isAuthError`, `src/components/shared/WidgetState.tsx:75-78`), the card body is replaced by
`SignInEmptyState` (`src/components/shared/SignInEmptyState.tsx:12-51`): a lock icon, `Sign in to load
data`, a sentence saying the session has expired or the user is signed out (omitted in the compact
cards), a `Sign in` button that reloads the document so the auth gate can show the sign-in screen, and a
`Retry` link that refetches. `responseErrorMessage` keeps the status in the message (`Not authenticated
(HTTP 401)`), which is what `isAuthError` matches. The trigger is each query's own error, not the
global auth flag: `useAuthBlocked` (`src/lib/authGate.ts:45`) only keeps the intraday card mounted while
gated calls answer 401 (`DashboardPage.tsx:732`). Executed 2026-09-30: with 401 on the brief, sectors,
signals, reference and market-data requests, four `Sign in to load data` cards showed after the one
retry (the strip block, the KPI row, the signals row and the sectors row) and the intraday card was
mounted with no bars. The unwrapped requests give no sign-in state: the AI take reads `No insight report for
IWM` on a 401 (executed the same day), and the catalysts, live quote and status read as their empty
or closed forms.

**Needs:** gated endpoints answering 401 without a token.

**States:** this row is the state.

**Acceptance criteria:**
- Given no token, when the gated endpoints the page calls are requested, then each answers 401
  `{"detail":"sign in to continue"}` (11 endpoints on the staging service, 2026-09-30; see the V-gate
  evidence comment).
- Given a 401 body `{detail: 'Not authenticated'}`, then the message is `Not authenticated (HTTP 401)`
  and `isAuthError` is true for it (`keeps a 401 recognisable as an auth failure after detail
  extraction`, `src/lib/format.test.ts`); a 401 status message and an `unauthorized` message are
  detected and other failures are not (`src/components/shared/WidgetState.test.ts`).
- Given a wrapped card answers 401, then `Sign in to load data` shows in that card after the retry
  (executed 2026-09-30, scratch run; no committed test renders it).
- Given the AI take request answers 401, then the card reads its empty line (executed 2026-09-30;
  see Gaps).

**Tests:** the unit tests above cover the message composition and the detector. No test renders the
state, so Te stays unticked.

**Code:** `src/components/shared/WidgetState.tsx:75-78,93-115`,
`src/components/shared/SignInEmptyState.tsx`, `src/lib/authGate.ts:45`, `src/lib/format.ts:98-109`,
`src/routes/DashboardPage.tsx:368,560,694,732,734,767,832`.

### SCREEN-LIVEMARKET — `/live`

- **Purpose:** Intraday monitoring of the active ticker: the market session, a quote card, six indicator tiles and CALL and PUT setup cards of ten conditions each, refreshed on a 15 second poll, with a sound alert when a setup fires and a historical review mode. The page shows no STRAT state and does not cover the watchlist.
- **Matrix:** [03 § 05](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#05--live-market)
- **Status:** Production but needs remediation · **Blocking issue:** [#928](https://github.com/TeneikaAskew/stocks/issues/928) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/LiveMarketPage.tsx` (417 lines)
- **Child components:** `ConditionRow`, `DataGate`, `MetricCard`, `SignalCard`
- **API calls (from source):** `/api/live/avg-volume/`, `/api/live/history/`, `/api/live/indicators`, `/api/live/quote/`, `/api/live/status`, `/api/market/data/`, `/api/market/reference/`
- **Stores:** `useReviewDateStore`, `useTickerStore`
- **E2E specs:** `tests/live-market/live-market.spec.ts`; two more only reach the route: `tests/shared/navigation.spec.ts` (its route loop asserts that `/live` mounts the shell without console errors) and `tests/shared/most-active-bar.spec.ts` (the marquee on `/live`); `tests/dashboard/movement-read.spec.ts`, which the seed lists, visits only `/dashboard`
- **PR lineage:** [#690](https://github.com/TeneikaAskew/stocks/pull/690) market dropdown + truthful session badge · [#700](https://github.com/TeneikaAskew/stocks/pull/700) one-source-of-truth signals
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/live/status | session, current_time_et (types: `useLiveStatus.ts` LiveStatus; `is_open` and `next_open` are fetched and not read; fixture: `MOCK_LIVE_STATUS` in `src/mocks/common.ts`) | computed on each request from the Eastern clock and `MARKET_HOLIDAYS_2026` (`live.py:104-186`); no table, no job | 60s refetch (a visible tab only), 30s staleTime, whatever Live, Paused or review mode say; a pending or failed request reads `Market Closed`; gated, 401 without a token | `useLiveStatus` → session bar |
| GET /api/live/quote/{ticker} | price, change, change_pct, open, high, low, prev_close, volume (types: `useLiveQuote.ts` LiveQuote; `last_updated`, `market_session` and `market_open` are not read; fixture: `tests/helpers/fixtures/live.ts`) | AlphaVantage GLOBAL_QUOTE, called on each request; no table, no job; 503 without `AV_API_KEY` (secret `av-api-key`) | 15s poll (a visible tab only, 10s staleTime) while `livePolling`, in every session | `useLiveQuote` → quote card, `Updated:` |
| GET /api/live/history/{ticker} | bars[] time/open/high/low/close/volume (types: `useLiveHistory.ts` LiveHistory; `count`, `interval` and the session flags are not read) | AlphaVantage TIME_SERIES_INTRADAY 1min compact (the last 100 bars), called on each request; a bar that fails to parse is dropped | 60s poll (a visible tab only, 30s staleTime) while `livePolling` | `useLiveHistory` → indicator tiles, setup cards |
| GET /api/live/avg-volume/{ticker} | avg_volume_20d (types: `useLiveHistory.ts` AvgVolume; `sample_size`, `last_date` and `source` are not read) | the newest 20 `market_data_daily` rows with a volume, at least 5, ← fetch-market-data 23:00 ET Mon-Fri and fetch-earnings-history 19:15 ET Mon-Fri and Sun; AlphaVantage TIME_SERIES_DAILY when Cloud SQL is not configured, fails or has fewer than 5 rows | 1h staleTime and no refetch interval (asked on mount, then on a later mount, window focus or reconnect once stale), in live and review mode; no date bound, so review mode uses the latest 20 sessions; production 2026-09-30: 20 rows to 2026-09-29 for IWM, SPY and QQQ | `useAvgVolume` → the RVOL condition of the setup cards |
| POST /api/live/indicators | request: bars, current_price, current_volume, avg_volume_20d; read: indicators ema9/ema20/ema50/rsi/stochK/atr and signals.call/put (types: `useLiveIndicators.ts` IndicatorsResponse; `vwap`, `stochD`, `stochKPrev` and `chart_voter` are not read) | computed on each request by `lib/indicators.py` and `_build_signals` from the bars in the request; no table | 10s staleTime, keyed on bar count, last bar time, price, volume and avg-volume; asked only with at least one bar; not polled | `useLiveIndicators` → indicator tiles, setup cards |
| GET /api/market/data/{ticker}/{date}?timeframe=1 | candlestick[] time/open/high/low/close, volume[].value (types: `LiveMarketPage.tsx` HistoricalData; fixture: `MOCK_MARKET_DATA` in `src/mocks/live.ts`) | `market_data_intraday` ← fetch-market-data 23:00 ET Mon-Fri and fetch-alphavantage-intraday 21:00 ET Mon-Sat | review mode only; `{date}` is the review day YYYYMMDD; 1h staleTime; the whole day, extended hours included, is returned and cut in the browser; a Cloud SQL failure falls through to the GCS parquet files with no signal | `useHistoricalDay` (in `LiveMarketPage.tsx`) → review-mode bars and quote |
| GET /api/market/reference/{ticker}/{date} | close, the prior session's close (types: `useMarketData.ts` ReferenceLevels; `open`, `high`, `low`, `source`, `stale_days` and `week` are not read) | AlphaVantage TIME_SERIES_DAILY for dates under 30 days old, then `market_data_daily` ← fetch-market-data 23:00 ET Mon-Fri | review mode only; staleTime Infinity; a non-OK answer becomes null and is kept | `useReferenceLevels` → review-mode prior close |
| store: ticker, review date |  | Zustand `useTickerStore` (persisted as `ticker-store`), `useReviewDateStore` (in memory, set by the Replay control, cleared by a reload) |  | every request |
| browser: Web Audio and the clock |  | `AudioContext` for the sound alert; `Date` and `toLocaleTimeString` for `Updated:` and `Last signal`, in the viewer's locale and zone |  | LIVE-06, LIVE-12 |

#### Displayed
| ID | Element | Component |
|---|---|---|
| LIVE-01 | Session bar | inline in `LiveMarketPage` (`sessionLabel`, `useLiveStatus`) |
| LIVE-02 | Quote card | inline in `LiveMarketPage` (`useLiveQuote`) |
| LIVE-03 | Six indicator tiles | `MetricCard` |
| LIVE-04 | CALL and PUT setup cards | inline in `LiveMarketPage` (`useLiveIndicators`) |

#### Actions
| ID | Action | What happens |
|---|---|---|
| LIVE-05 | Live (15s) or Paused toggle | Toggles the `polling` state, which with review mode gives `livePolling`, the `enabled` flag of `useLiveQuote` and `useLiveHistory` (the 15s and 60s polls); the session status, the average volume and the review-day requests do not follow it; disabled, and labelled `Historical`, in review mode. |
| LIVE-06 | Sound alert | Turns the alert on and off (off on load). While on and not in review mode, a change of the CALL or PUT `fired` flag sounds 880Hz (CALL) or 440Hz (PUT) through `playAlert` and prints `Last signal`, unless the last alert had the same direction less than two minutes earlier. |
| LIVE-07 | Switch ticker | The page has no ticker control of its own; it follows `tickerStore`, which is set elsewhere (`TickerCombobox` on Dashboard, Options Flow, Signals, Insights and Journal, the Catalysts and Insights pages, or the command palette, which navigates to `/charts`). |
| LIVE-08 | Review mode | The Replay control in the header sets `reviewDate` and `reviewTime` in `useReviewDateStore`; the page then fetches that day's 1-minute bars (`useHistoricalDay`) and the prior close, cuts the bars at the chosen time in the browser, rebuilds the quote with `buildReviewQuote` and stops the live polling. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| LIVE-09 | loading | present | `LiveMarketPage.tsx` shows "Fetching live quote…" and "Loading historical bars for indicators…" (or the review-date variant) while the first quote and bars resolve, and keeps showing them when those requests fail; there is no skeleton. |
| LIVE-10 | empty | present | `EMPTY_INDICATORS`/`EMPTY_SIGNALS` (`src/lib/indicators.ts`) render tiles as `--` and setup cards as `0/0 met` until the indicators response arrives (in review mode, until the day's bars arrive), and when it fails; the quote slot is empty while Paused with no quote. |
| LIVE-11 | error | present | The `quoteError` banner renders on any non-OK quote status, with one text for every status, and replaces the last good quote on a failed poll. |
| LIVE-12 | stale | present | An "Updated:" timestamp reads the quote query's `dataUpdatedAt` in the viewer's local time with no zone; the quote's own `last_updated` is not shown. In review mode a "Historical:" label replaces the session label in the session bar and "Updated:" stays. |
| LIVE-13 | permission | not tracked (new category); present | `SignInEmptyState`'s `DataGate` replaces everything below the toolbar with "Sign in to load data" only when a gated call has answered 401 and the user is signed out; no path was found on which that happens on this route, and a 401 while signed in shows the quote box instead, and a 401 on the status route or on a review route changes only that row's display (`Market Closed`, the review loading lines). |

#### Journeys
1. Watch for a setup to fire: Opens /live during the session (LIVE-01) → Confirms the session bar reads Market Open (LIVE-01) → Leaves polling on (15s) (LIVE-05) → Enables Sound (LIVE-06) → A card reaches 7 of its 10 conditions (70%), its SIGNAL badge pulses and a tone sounds, 880Hz for CALL and 440Hz for PUT (LIVE-04, LIVE-06)
2. Check why nothing is firing: Scans the CALL and PUT strength bars (LIVE-04) → Reads each condition row, live value against threshold (LIVE-04) → Spots the RVOL row, which needs RVOL above 1.0, as the blocker (LIVE-04) → Pauses polling to study the numbers (LIVE-05)
3. Replay a past intraday session: Sets a review date and time in the Replay control in the header (LIVE-08) → Polling is disabled, the toggle reads Historical and the session bar reads Historical with the date and time (LIVE-05, LIVE-01) → Bars are cut at the review time and the tiles and cards are recomputed on them (LIVE-08, LIVE-03, LIVE-04) → A synthetic quote is rebuilt from that day, with the change taken against the prior close (LIVE-08, LIVE-02) → Applies a later time in the Replay control to watch conditions evolve (LIVE-08) → Back to live returns the page to the live quote (LIVE-08)

#### Elements
##### LIVE-01 · Session bar

**Shows or does:** The first block of the toolbar row (`src/routes/LiveMarketPage.tsx:259-270`): a
filled dot, one label, and the Eastern clock. In live mode the label is
`sessionLabel(status?.session)` (`:250`): `Market Open` for `regular`, `Pre-Market`, `After Hours`,
`Market Closed`, any other session string as it is, and `Market Closed` when there is no status
(`src/lib/marketSession.ts:1-9`). The dot is green for `regular`, amber for `pre-market` and
`after-hours` and red for everything else, no status included (`:251-254`). The clock is
`to12h(current_time_et)` and ` ET` (`:267-269`, for example `8:00:00 PM ET`), shown only once a
status has arrived and never in review mode. In review mode the dot is amber and the label reads
`Historical: <date>` and, when a time is set, ` @ <HH:MM> ET`, with no clock (`:261-266`, LIVE-08).
The status is requested every 60 s while the tab is visible (see LIVE-02), with a 30 s stale time,
whatever the Live or Paused toggle says, and in review mode too
(`src/hooks/useLiveStatus.ts:12-23`).

**Needs:** `GET /api/live/status` (`platform/api/routers/live.py:174-186`, a plain `def`). It reads
the container clock in Eastern time and answers `is_open`, `session`, `next_open` and
`current_time_et` with no table and no vendor call: `regular` from 09:30 up to but not including
16:00 (the only session with `is_open` true), `pre-market` from 04:00, `after-hours` from 16:00 up
to but not including 20:00, `closed` otherwise, and `closed` on weekends and on the dates in
`MARKET_HOLIDAYS_2026` (`:104-148`). The page reads only `session` and `current_time_et`; `is_open`
and `next_open` are fetched and not used. The route is gated: staging answers 401 without a token
(see the V-gate evidence comment).

**States:** The bar has no loading or error state of its own. While the first status request is
pending, and after it has failed, it reads `Market Closed` with a red dot and no clock, which is
also what a closed market reads (executed 2026-09-30 in the page with the request held and with a
500; see Gaps). LIVE-13 for the gated 401.

**Acceptance criteria:**
- Given a weekday that is not a listed holiday, when `_is_market_open` runs at 09:30:00, then it
  returns `(True, 'regular')`; at 09:29:59 `(False, 'pre-market')`; at 15:59:59 `(True, 'regular')`;
  at 16:00:00 `(False, 'after-hours')`; at 20:00:00 and at 03:59:59 `(False, 'closed')`; and on a
  Saturday `(False, 'closed')` (executed 2026-09-30 against the real function; no test asserts these
  strings).
- Given the status `regular` at `10:15:30`, when the bar renders, then it reads `Market Open`,
  `10:15:30 AM ET` and a green dot; given the status request still pending, it reads `Market Closed`
  with a red dot and no clock (executed 2026-09-30 in the page, the request held and then answered).
- Given a session string the page does not know, when `sessionLabel` runs, then the string is shown,
  and given no status it returns `Market Closed` (`unknown string passes through` and `undefined →
  Market Closed`, `src/lib/marketSession.test.ts`).
- Given 2026-06-19 (Juneteenth, absent from `MARKET_HOLIDAYS_2026`) at 10:00 ET, when
  `_is_market_open` runs, then it returns `(True, 'regular')` for a day on which production holds no
  daily row and one intraday bar in the handler's window against 1,147 on 2026-06-18 and 1,121 on
  2026-06-22 (executed 2026-09-30, V-gate evidence statements 8 and 9; see Gaps).
- Given a request with no token, when `GET /api/live/status` is issued against staging, then it
  answers 401 `{"detail":"sign in to continue"}` (V-gate evidence, 2026-09-30).

**Tests:** `tests/api/test_platform_api.py::TestHealth::test_live_status` asserts status 200 and the
three keys `is_open`, `session` and `current_time_et`, no classification.
`tests/api/test_route_coverage.py` pins the route at 200 against a dead backend and asserts no body.
`tests/api/test_most_active_endpoint.py` (`TestLabel`) reaches `_is_market_open` through the
most-active label in five cases (a Monday at 11:00 ET, the same Monday at 12:30 ET, after the close,
a Saturday and the 2026-07-03 holiday) and asserts that helper's `live` or date label, never a
pre-market or after-hours string. Vitest `src/lib/marketSession.test.ts` covers `sessionLabel` (six
cases); its `sessionColor` and `sessionPillClasses` cases test helpers this page does not import,
since it colours the dot inline (`:251-254`). Playwright `shows session pill` asserts that one of
four labels is visible; the mocked status is `closed` and the default for no status reads the same
`Market Closed`, so the test cannot tell a working status from a failed one. No test on main asserts
the dot colour, the clock, the review-mode label or the holiday list (the review-mode test added on
this branch asserts the label `Historical: 2026-04-24 @ 09:45 ET`, LIVE-08), so Te stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:161,245-254,259-270`, `src/hooks/useLiveStatus.ts`,
`src/lib/marketSession.ts:1-9`, `src/lib/time.ts:2-13`, `platform/api/routers/live.py:104-186`,
`platform/api/schemas.py:52-56`; no test id.

##### LIVE-02 · Quote card

**Shows or does:** The quote slot of the page (`src/routes/LiveMarketPage.tsx:306-343`), inside the
sign-in gate (LIVE-13): the ticker symbol in small type, the price as `$` and two decimals in large
type, the change as a signed amount and a signed percentage with two decimals and `vs prior close`
(green at zero or above and red below, muted when `change` is null, and an em-dash in place of the
numbers when `change` or `change_pct` is null), then `Open`, `High` (green), `Prev` (an em-dash when
null) and `Low` (red), then `Vol:` in millions with two decimals. In live mode the data is the quote
query's (`:162`); in review mode it is the synthetic quote of LIVE-08 (`:197-205`). The page never
shows the quote's `last_updated`, `market_session` or `market_open`. While `livePolling` (LIVE-05)
the quote is requested every 15 s with a 10 s stale time, in every session, closed ones included,
but only while the tab is visible: TanStack Query skips an interval fetch while the document is
hidden, and `refetchIntervalInBackground` is unset (`src/hooks/useLiveQuote.ts:22-34`,
`src/App.tsx:30-37`; `@tanstack/query-core` 5.102.8, `queryObserver.js:163` and
`focusManager.js:48-51`). Executed 2026-09-30 with a fake clock and `document.visibilityState`
forced to `hidden`: over 120 s of clock no quote, history or status request went out, and with the
document visible they resumed.

**Needs:** `GET /api/live/quote/{ticker}` (`platform/api/routers/live.py:189-312`), which calls
AlphaVantage `GLOBAL_QUOTE` on every request and reads no table. It answers 503 without `AV_API_KEY`
(`:194-195`, the `av-api-key` secret, `platform/deploy.sh:185,371`), maps `05. price`, `02. open`,
`03. high`, `04. low` and `06. volume` as required numbers (a missing, unparseable or non-finite one
is a 502, never a 0.0), and `09. change`, `10. change percent` (the `%` stripped, so percentage
points) and `08. previous close` as nullable numbers (`:248-312`). `market_open` is true only in the
regular session (`:123-148`). Production is unobserved: the route is gated and the only path to real
data is the vendor.

**States:** LIVE-09 (`Fetching live quote…` while pending), LIVE-10 (nothing while Paused with no
quote), LIVE-11 (the amber box replaces the card on any failure), LIVE-12 (`Updated:`), LIVE-13.

**Acceptance criteria:**
- Given a GLOBAL_QUOTE payload with price 205.80, change 1.60, change percent `0.7835%` and volume
  31,000,000, when the route answers, then the body carries those four values with `change_pct`
  0.7835 (`test_live_quote`, `tests/api/test_platform_api.py`).
- Given a payload with no price, open, high, low or volume, then the route answers 502 and not a 200
  (`test_live_quote_missing_required_field_is_502_not_zero`, five parametrized fields); given a
  price of `N/A`, `NaN`, `Infinity` or `-inf`, then 502 too
  (`test_live_quote_unparseable_price_is_502_not_zero`,
  `test_live_quote_non_finite_price_is_502_not_a_500_from_the_encoder`; the other four required
  fields are tested for absence only).
- Given a payload with no change, change percent and previous close, then the three are null and the
  price survives (`test_live_quote_missing_optional_fields_are_null_not_zero`); given a change of
  `--`, then `change` is null (`test_live_quote_unparseable_optional_field_is_null_not_zero`); given
  a change of `NaN` and a previous close of `Infinity`, then both are null and the answer is 200
  (`test_live_quote_non_finite_optional_field_is_null_not_a_500`).
- Given the fixture quote (price 220.45, change 0.65, change percent 0.296, previous close 219.80,
  volume 12,345,678), when the card renders, then it reads `$220.45`, `+0.65 (+0.30%) vs prior
  close`, `Open: $219.80`, `High: $221.20`, `Prev: $219.80`, `Low: $219.50` and `Vol: 12.35M`
  (executed 2026-09-30 in the page). Only the text `220.45` is asserted by a test.
- Given no prior close, when the card renders, then the change and `Prev` read as an em-dash
  (executed 2026-09-30 through review mode with the reference request failing, the same branch;
  `MOCK_LIVE_QUOTE_NO_PREV_CLOSE` exists and no spec uses it).
- Given a schema check, then `change`, `change_pct` and `prev_close` stay required and nullable in
  the OpenAPI snapshot and `price` a plain number
  (`test_the_live_quote_nullable_fields_stay_required`, `tests/lib/test_silent_fallback_fixes.py`).
- Given a request with no token, when it is issued against staging, then it answers 401 (V-gate
  evidence, 2026-09-30).

**Tests:** `tests/api/test_platform_api.py::TestLiveMarketAPI` covers the mapping and the null and
502 rules above and the 503 without a key, with the AlphaVantage client faked.
`tests/api/test_route_coverage.py` pins the route at 503 (no key) against a dead backend and asserts
no body. `tests/lib/test_silent_fallback_fixes.py` covers the schema. Playwright `renders live price
quote` asserts `getByText(/220\.45/)` is visible and nothing else of the card: on main the change,
the OHLC, the volume and the em-dash are asserted by no test (the review-mode test added on this
branch asserts the price, change, `Prev`, `Open` and `Vol` of the synthetic quote, LIVE-08), so Te
stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:28,162,197-205,297-349`, `src/hooks/useLiveQuote.ts`,
`platform/api/routers/live.py:189-312`, `platform/api/schemas.py:59-86`; no test id.

##### LIVE-03 · Six indicator tiles

**Shows or does:** A grid of six `MetricCard` tiles (`src/routes/LiveMarketPage.tsx:352-368`, two
columns on a phone, three from `sm`, six from `lg`): `EMA 9`, `EMA 20` and `EMA 50` (`$` and two
decimals), `RSI (14)` (one decimal, with a zone line), `StochRSI` (the %K line, one decimal) and
`ATR (14)` (`$` and two decimals); a missing value reads `--`. The RSI zone line reads `Overbought`
above 70 (red, down arrow), `Oversold` below 30 (green, up arrow) and `Neutral` otherwise, also with
a green up arrow (`MetricCard.tsx:32`, see Gaps). VWAP and the StochRSI %D line are returned but not
shown here, and RVOL appears only as a condition row in LIVE-04. Values are
`indicatorsQuery.data?.indicators`, or the all-null `EMPTY_INDICATORS` until the query has answered
(`:218`, LIVE-10).

**Needs:** `POST /api/live/indicators` (`platform/api/routers/live.py:527-607`, a plain `def`) with
the bars, the quote's price and volume and the average volume in the body. `lib/indicators.py`
computes EMA 9, 20 and 50, RSI 14, StochRSI (14, 3, 3), Wilder ATR 14 and a VWAP that restarts on
each calendar date of the bar times; `_last` returns the final value, or null for a NaN
(`:498-504,554-590`). The bars are the last 100 one-minute bars of `GET /api/live/history/{ticker}`
(`:315-382`, AlphaVantage `TIME_SERIES_INTRADAY`, sorted ascending, a bar that fails to parse
dropped without a count) in live mode (`src/hooks/useLiveHistory.ts:13-25`, every 60 s while
`livePolling` and the tab is visible), and the review-day bars cut at the review time in review mode
(LIVE-08). The indicators request is asked only while there is at least one bar and is keyed on the
bar count, the last bar time, the price, the volume and the average volume with a 10 s stale time,
so it is asked again whenever a new bar or price arrives and is never polled
(`src/hooks/useLiveIndicators.ts:26-50`). Both routes are gated: 401 on staging without a token
(V-gate evidence).

**States:** LIVE-09 and LIVE-10 (`--` until the answer, and after a failure), LIVE-13.

**Acceptance criteria:**
- Given the fixture values EMA 9 220.5, EMA 20 220.0, EMA 50 219.0, RSI 55, StochRSI K 72 and ATR
  1.2, when the tiles render, then they read `$220.50`, `$220.00`, `$219.00`, `55.0` with `Neutral`,
  `72.0` and `$1.20` (executed 2026-09-30 in the page).
- Given the indicators request failing or not yet answered, then all six tiles read `--` (executed
  2026-09-30; a failure is not distinguishable from waiting, see Gaps).
- Given the history request failing, then the tiles stay `--` beside `Loading historical bars for
  indicators…` (executed 2026-09-30 with a 503), and the indicators query, enabled only with at
  least one bar, is not asked (`:216`, read directly).
- Given 30 rising closes, when the route answers, then the body has the `signals` key and a
  `chart_voter` block with `call.total_count` 5 and a first condition `3 consecutive up moves` met
  (`test_indicators_response_includes_chart_voter`); given no bars, then a `chart_voter` with
  `firing` null and `call.met_count` 0 (`test_empty_bars_returns_empty_voter`).
- Given 20 bars stamped with epoch seconds, then VWAP is a session value and not each bar's own
  typical price (`test_indicators_endpoint_vwap_sessionizes_epoch_times`); given 13-digit
  millisecond epochs, then the route answers 422 naming milliseconds
  (`test_indicators_endpoint_rejects_ms_epoch_bar_times`).
- Given two bars, when `GET /api/live/history/IWM` answers, then `count` is 2, the bars are in
  ascending time order and the second close is 205.80 (`test_live_history`).

**Tests:** `tests/api/test_platform_api.py::TestLiveMarketAPI::test_live_history`,
`tests/api/test_live_chart_voter.py` (two tests) and two tests of
`tests/api/test_live_signal_series.py` cover the route and its bar-time handling as above;
`tests/api/test_route_coverage.py` pins history at 503 without a key and indicators at 200 for a
request with no bars, which the page never sends. `tests/lib/test_indicators.py` asserts properties
of the functions the route calls (RSI within 0 to 100, above 70 on a 50-bar uptrend and below 30 on
a downtrend; ATR non-negative and 0 on flat input; the EMA of 1 to 5 with period 3 between 1 and 5;
VWAP between the day's low and high; StochRSI within 0 to 100), not the route's values. No solyra
test asserts a tile, so Te stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:163,177-190,209-219,352-368`,
`src/hooks/useLiveHistory.ts:13-25`, `src/hooks/useLiveIndicators.ts:26-50`,
`src/components/shared/MetricCard.tsx:22-70`, `src/lib/indicators.ts:18-30,50-60`,
`platform/api/routers/live.py:315-382,498-504,527-607`; no test id.

##### LIVE-04 · CALL and PUT setup cards

**Shows or does:** Two cards, `CALL SETUP` and `PUT SETUP`
(`src/routes/LiveMarketPage.tsx:74-137,377-390`, side by side from `lg`). Each shows a trend icon,
the title, a pulsing `SIGNAL` badge when `fired`, `<met>/<total> met`, a strength bar (green for
CALL and red for PUT from 70%, muted below) with the percentage, and one row per condition: a dot,
the label and `<current> <operator> <threshold>` with two decimals, `--` for a null (`ConditionRow`,
`:49-72`); a fired card has a tinted border. The ten conditions per card come from `_build_signals`
(`platform/api/routers/live.py:680-722`), evaluated on the server at the price the page sent: CALL
is Price above EMA 9, EMA 20, EMA 50 and VWAP, RSI above 50 and above 60, StochRSI above 70, RVOL
above 1.0, EMA 9 above EMA 20 and ATR above 2.0; PUT is the mirror (Price below the four averages,
RSI below 50 and below 40, StochRSI below 30, EMA 9 below EMA 20) with the same two conditions `RVOL
> 1.0` and `ATR > 2.0`. Strength is the met share of ten, rounded, and `fired` is strength 70 or
more, seven of ten (`:707-721`). A condition whose value or threshold is null is not met
(`:507-524`). RVOL is the quote's volume over the 20-session average volume, null when either is
missing or the average is not above zero (`:592-596`). Until the indicators answer the cards read
`0/0 met` and `0%` with no rows (`EMPTY_SIGNALS`, LIVE-10).

**Needs:** The four requests of LIVE-02, LIVE-03 and `GET /api/live/avg-volume/{ticker}`
(`platform/api/routers/live.py:385-477`): the newest 20 `market_data_daily` rows with a volume, at
least five of them, averaged (`:395-426`), else AlphaVantage `TIME_SERIES_DAILY` when Cloud SQL is
not configured, fails or has fewer than five rows, with the source in the response and the fallback
silent (`:428-477`, see Gaps). It is asked when the page mounts and, having no `refetchInterval`,
again only on a later mount, window focus or reconnect once its 3,600,000 ms stale time has passed
(`useAvgVolume`, `src/hooks/useLiveHistory.ts:35-46`), in review mode too. Production 2026-09-30:
IWM, SPY and QQQ each give 20 rows from 2026-09-01 to 2026-09-29, none from the one-minute fallback,
with averages of 23.16 million, 43.95 million and 33.28 million shares (V-gate evidence, statement
2); today's row is the placeholder with no volume, which the query skips.

**States:** LIVE-09 and LIVE-10, LIVE-13. A failed avg-volume request shows nothing: the indicators
request then carries `avg_volume_20d: null` and the RVOL rows read `--` and unmet (the body sent was
executed 2026-09-30, the rows not).

**Acceptance criteria:**
- Given 8 of 10 CALL conditions met and 1 of 10 PUT conditions, when the cards render, then the CALL
  card reads `8/10 met` and `80%` with the `SIGNAL` badge and a tinted border, and the PUT card
  `1/10 met` and `20%` without them (executed 2026-09-30, the fixture).
- Given a condition with current 1.40, operator `>` and threshold 1.00, then its row reads `1.40 >
  1.00`; given a null current or threshold, then `--` for that side (`ConditionRow`, `:68`, read
  directly).
- Given strength 70 or more, then the handler marks the side `fired` (`live.py:714,720`, read
  directly; no test asserts it).
- Given IWM's one-minute bars of the last seven days, then the mean true range is 0.15, 7 of 4,251
  bars exceed 2.0 and the largest is 12.75, so an ATR(14) above the `ATR > 2.0` threshold needs the
  recent ranges to average about thirteen times that mean (production, 2026-09-30, V-gate evidence
  statement 10; see Gaps).
- Given no token, then every route above answers 401 on staging (V-gate evidence, 2026-09-30).

**Tests:** No test asserts `_build_signals`: a search of `tests/` finds no reference to it or to the
condition ids (`c_p_ema9` to `p_atr`), and the label `Price > EMA9` appears only in the chart
voter's own tests (`tests/lib/test_chart_voter.py`). `tests/api/test_live_chart_voter.py` asserts
that the `signals` key is present and nothing in it; the two `/api/live/indicators` tests of
`tests/api/test_live_signal_series.py` assert VWAP sessions and the 422;
`tests/api/test_platform_api.py` covers quote and history; avg-volume has no test beyond its row in
`tests/api/test_route_coverage.py` (503 with no key and no database). No solyra test on main asserts
a setup card: the four tests of `live-market.spec.ts` on main and the route loop of
`navigation.spec.ts` (through `mockAllPages`, `tests/helpers/fixtures/all.ts:50`) mount the page
with `MOCK_LIVE_INDICATORS` (the CALL setup fired, `src/mocks/live.ts:199-246`, served by
`mockLiveApi`, `tests/helpers/fixtures/live.ts:62,67`), so both cards render in each, but none reads
one (the Sound test added on this branch asserts only that the `SIGNAL` badge shows, LIVE-06), so Te
stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:49-137,219,376-390`, `src/hooks/useLiveHistory.ts:35-46`,
`platform/api/routers/live.py:385-477,498-524,592-596,680-722`; no test id.

##### LIVE-05 · Live (15s) or Paused toggle

**Shows or does:** The second control of the toolbar row (`src/routes/LiveMarketPage.tsx:272-284`).
It reads `Live (15s)` with a spinning refresh icon in the brand colour while polling, `Paused` with
a still icon in a neutral colour when paused, and `Historical`, disabled with the tooltip `Disabled
in historical view`, in review mode. `polling` is component state that starts true and is not stored
(`:154`), so a reload, or a visit to another page, returns it to Live. `livePolling = polling &&
!isReview` (`:159`) is the `enabled` flag of the quote and history queries and of nothing else
(`:162-163`): Paused stops the 15 s quote poll and the 60 s history poll, while the session status
(60 s), the average volume, the review-day bars and the reference are unaffected, and a request
already in flight still completes. The last quote, the tiles and the cards stay on screen while
Paused and `Updated:` keeps its time. Resuming asks again at once when the cached answers are stale
(executed 2026-09-30 with a fake clock: over 120 s of Paused no quote or history request went out
while the status refetched; pressing Live asked for the quote and the history again immediately).
Leaving review mode returns the button to what it held before, since review mode never writes
`polling` (read directly).

**Needs:** No endpoint of its own: it gates the quote and history requests of LIVE-02 and LIVE-03.

**States:** LIVE-10 (Paused before the first quote has answered: the quote slot renders nothing,
executed 2026-09-30), LIVE-09 (`Fetching live quote…` shows only while `polling`, `:344`).

**Acceptance criteria:**
- Given Live, when 60 s of clock pass, then at least one more quote request and one more history
  request have gone out (`the Live (15s) toggle pauses the quote and history polling and resumes
  it`, new test, which asserts the second request of each within the 60 s and not the 15 s and 60 s
  intervals themselves).
- Given Live, when the button is pressed, then it reads `Paused`, the icon stops spinning and, over
  a further 120 s, neither the quote nor the history is requested again while the session status
  still refetches, and the last quote, `$220.45`, stays on screen (same test).
- Given Paused, when the button is pressed, then it reads `Live (15s)` and the quote and history are
  requested again without the fake clock advancing (same test).
- Given review mode, then the button reads `Historical`, is disabled and no live request is made
  (LIVE-08, `review mode rebuilds the quote from that day's bars up to the chosen time and stops the
  live polling`, new test).
- Given Paused before the first quote has answered, then nothing shows in the quote slot, not even
  `Fetching live quote…` (executed 2026-09-30 with the quote request held).
- Given the button, then neither it nor the Sound button carries `aria-pressed` or `aria-label`
  (executed 2026-09-30; the state is in the label, the icon and the colour only, see Gaps).

**Tests:** The new Playwright test `the Live (15s) toggle pauses the quote and history polling and
resumes it` (`tests/live-market/live-market.spec.ts`, solyra commit 0e9ab73) asserts the first three
criteria; it was added on this branch, so the solyra CI run the matrix cites (commit eca7078)
predates it, and no test on main touches the toggle. Te stays unticked: it waits for a CI run that
includes the branch's tests.

**Code:** `src/routes/LiveMarketPage.tsx:153-154,159,162-163,272-284`,
`src/hooks/useLiveQuote.ts:22-34`, `src/hooks/useLiveHistory.ts:13-25`; no test id (the test finds
the button by role and name).

##### LIVE-06 · Sound alert

**Shows or does:** A text button `Sound` with a speaker icon
(`src/routes/LiveMarketPage.tsx:286-294`): `Volume2` and the primary text colour when on, `VolumeX`
and the muted colour when off; the word does not change. It is off on load (`:153`). `toggleSound`
(`:236-241`) creates the page's `AudioContext` inside the click when turning on, so the browser's
gesture rule is met. While on, and not in review mode, an effect (`:222-234`) runs whenever
`signals.call.fired`, `signals.put.fired`, the Sound flag or review mode changes. With neither setup
fired it returns; it takes CALL when the CALL setup is fired and PUT only when it is not; it returns
when the last alert had the same direction less than 120 s ago; otherwise it records the alert,
shows `Last signal: <CALL or PUT> at <time>` and calls `playAlert` (`:406-417`): a sine tone at 880
Hz for CALL and 440 Hz for PUT, gain 0.3 falling to 0.001 over half a second, stopped at 0.5 s.
Because the effect depends on the flags and not on a timer, a setup that stays fired does not sound
again, and the two-minute rule suppresses only a same-direction repeat of the last alert: CALL, PUT
and CALL again within two minutes sound three times (executed 2026-09-30 with a recording audio
context and a fake clock, see Gaps). The `Last signal` line (`:392-400`) prints the viewer's local
time with no zone and stays until the page unmounts or reloads: after Sound is turned off (executed
2026-09-30) and in review mode (read directly, nothing clears `lastFired`).

**Needs:** The `fired` flags of LIVE-04 (the server's strength of 70 or more) and the browser's Web
Audio API. There is no state for a browser that refuses or suspends the context: `playAlert` never
calls `resume()` and the page says nothing (read directly, not executed).

**States:** LIVE-04 for what fires; none of its own.

**Acceptance criteria:**
- Given Sound is off and the CALL setup is firing, when the page loads, then no tone plays and there
  is no `Last signal` line (`Sound is silent until enabled, then a firing CALL sounds 880 Hz and a
  firing PUT 440 Hz`, new test), and no audio context is created (executed 2026-09-30 with a
  counting stub: the test's own recording stub counts tones, not contexts).
- Given the CALL setup is firing, when Sound is pressed, then one 880 Hz tone plays and `Last
  signal: CALL at <time>` shows (same test).
- Given the next quote carries another price and only the PUT setup fires, then one 440 Hz tone
  plays and the line reads `Last signal: PUT at <time>` (same test).
- Given both setups fire, then only CALL sounds (executed 2026-09-30).
- Given Sound is turned off and on again within two minutes with CALL still firing, then no second
  tone and no second context (executed 2026-09-30).
- Given CALL, then PUT, then CALL again within 30 s, then three tones and not two (executed
  2026-09-30, see Gaps).
- Given review mode, then no tone (`:223`, read directly; no test).

**Tests:** The new Playwright test above (`tests/live-market/live-market.spec.ts`, solyra commit
0e9ab73) asserts the tones and the `Last signal` line of the first three criteria and nothing about
the audio context count, the two-minute rule, the both-fired rule, review-mode silence or the
persistence of the `Last signal` line. It was added on this branch, so no test on main touches the
control, and Te stays unticked: it waits for a CI run that includes the branch's tests.

**Code:** `src/routes/LiveMarketPage.tsx:153,155-157,221-241,286-294,392-400,406-417`; no test id
(the test finds the button by role and name).

##### LIVE-07 · Switch ticker

**Shows or does:** Nothing of its own: the page has no ticker control, and the only place it prints
the symbol is the small heading of the quote card (`src/routes/LiveMarketPage.tsx:310`), which
exists only while a quote shows, so neither `Fetching live quote…` nor the error box names the
symbol (executed 2026-09-30). `activeTicker` comes from `useTickerStore` (`:148`, default `IWM`,
persisted as `ticker-store` together with `recentTickers`, `src/stores/tickerStore.ts:14-34`) and is
set elsewhere: by `TickerCombobox` on Dashboard, Options Flow, Signals, Insights and Journal, by the
Catalysts and Insights pages, or by a ticker row of the command palette, which also navigates to
`/charts` (`src/components/layout/CommandPalette.tsx:44-51`). The page follows whatever the store
holds: with `SPY` persisted it asked for `/api/live/quote/SPY`, `/api/live/history/SPY` and
`/api/live/avg-volume/SPY` and posted the indicators request, and the card read `SPY` and its price
(executed 2026-09-30).

**Needs:** The persisted `ticker-store` entry in `localStorage`; no endpoint.

**States:** none of its own.

**Acceptance criteria:**
- Given `setTicker('aapl')`, then the active ticker is `AAPL` (`uppercases the active ticker`,
  `src/stores/tickerStore.test.ts`); given `pushRecent`, then the list is newest first, deduplicated
  without regard to case and capped at 8; given persistence, then `activeTicker` and `recentTickers`
  are stored and `quickPicks` is not (`persist partialize`).
- Given the default store, when `/live` opens, then it asks for IWM and the quote card reads `IWM`
  (`navigates to /live and renders ticker context`, which asserts only that `IWM` appears in the
  page text).
- Given another ticker in the store, when `/live` opens, then every request names that symbol
  (executed 2026-09-30; no test).

**Tests:** `src/stores/tickerStore.test.ts` covers the store and not this page. `navigates to /live
and renders ticker context` asserts the text `IWM` is present and nothing about switching. No test
changes the ticker and watches this page ask for another symbol, so Te stays unticked.

**Code:** `src/stores/tickerStore.ts:14-34`, `src/routes/LiveMarketPage.tsx:148,162-172,310`,
`src/components/layout/CommandPalette.tsx:44-51`; no test id.

##### LIVE-08 · Review mode

**Shows or does:** The page has no date control of its own. The Replay control in the header
(`ReplayControl`, SHELL-09, shown on `/dashboard`, `/live`, `/charts` and `/signals`,
`src/components/shared/ReplayControl.tsx:11`) sets `reviewDate` (YYYY-MM-DD) and `reviewTime` (HH:MM
Eastern) in `useReviewDateStore`, in memory only (`src/stores/reviewDateStore.ts:13-19`): the chip
reads `Replay · <date time>` and Back to live clears both (`ReplayControl.tsx:123-141,161-192`). The
store is shared: the date stayed set when the user left `/live` by client-side navigation and came
back, and a reload cleared it (executed 2026-09-30). Review mode is `reviewDate !== null`
(`LiveMarketPage.tsx:149-151`). Then the session bar reads `Historical: <date> @ <time> ET`
(LIVE-01), the toggle reads `Historical` and is disabled (LIVE-05), `livePolling` is false so the
live quote and history stop, and the page asks once for the day: `useHistoricalDay` requests `GET
/api/market/data/<T>/<YYYYMMDD>?timeframe=1`, the whole day with no `end_time`, stale after an hour
(`:35-47`), and `useReferenceLevels` requests `GET /api/market/reference/<T>/<YYYYMMDD>`, whose
`close` is the prior session's close, never stale (`src/hooks/useMarketData.ts:82-93`). The bars are
cut in the browser to those with `time <= reviewCutoffTs(date, time)`, the 16:00 close when no time
is set (`:139-145,187`, `src/hooks/useReviewQuote.ts:38-44`; the bar times are Eastern wall clock
labelled as UTC epoch seconds). The quote is `buildReviewQuote` (`src/lib/reviewQuote.ts:21-42`):
price is the last kept bar's close, open the first bar's open, high and low the extremes and volume
the sum, over every kept bar, so with the day starting at 04:00 ET (see Needs) `Open`, `High`, `Low`
and `Vol` include the premarket session (read directly, see Gaps). `change` and `change_pct` are
taken against the prior close, or null, shown as an em-dash, when it is unavailable. The indicators
are requested with the kept bars and the synthetic quote's price and volume (`:209-217`), so the
tiles and cards follow the review time; the average volume is still the latest 20 sessions (see
Gaps). Applying a later time in the Replay control re-cuts the same day's bars without a new
request, since the query key holds the date and not the time (read directly, not executed).

**Needs:** `GET /api/market/data/{ticker}/{date}` (`platform/api/main.py:905-1016`), which reads
`market_data_intraday` for the day's window `[D 00:00Z, D+1 02:00Z)` through `_load_date_data`
(`:1595-1696`), converts both stored conventions to Eastern wall clock with
`stored_intraday_to_eastern` and keeps only the rows whose Eastern date is `D` (`:1653-1666`); `GET
/api/market/reference/{ticker}/{date}` (`:1061-1204`), which asks AlphaVantage `TIME_SERIES_DAILY`
first for dates under 30 days old and then reads the newest `market_data_daily` row before the date,
and the GCS parquet files when that fails; and the avg-volume and indicators requests of LIVE-04.
Production 2026-09-30 (V-gate evidence, statements 5 to 7): the window for 2026-09-29 holds 883 IWM
one-minute rows: 882 from 04:00 ET (08:00Z) to the 20:00 ET bar at 00:00Z of the next day, and one,
at 00:00Z on the 29th, that is the previous evening's 20:00 ET bar and is cut by the Eastern-date
filter, so the day the page receives is the extended-hours session; the window for 2026-08-14 holds
1,036 rows and its prior-session row is 2026-08-13 (open 304.04, high 305.05, low 302.72, close
303.5). Both data routes are gated (401 on staging without a token).

**States:** LIVE-09 (`Loading <date> intraday bars…`), LIVE-10, LIVE-11 and LIVE-13 as the live page
has them; a day with no bars, or a failed request, keeps the loading lines on screen for ever
(executed 2026-09-30 with a 404, see Gaps).

**Acceptance criteria:**
- Given the clock on Friday 2026-04-24 and the Replay control applying the latest session at 9:45
  AM, when `/live` renders, then the bar reads `Historical: 2026-04-24 @ 09:45 ET`, the toggle reads
  `Historical` and is disabled, the page has asked once for
  `/api/market/data/IWM/20260424?timeframe=1` and `/api/market/reference/IWM/20260424`, 16 of the 30
  bars are kept, the card reads `$220.75`, `+0.75 (+0.34%)`, `Prev: $220.00`, `Open: $219.95` and
  `Vol: 1.60M`, the last indicators request carried 16 bars, no live quote or history request goes
  out over a further 120 s, and Back to live restores `Live (15s)`, `Market Closed` and `$220.45`
  (`review mode rebuilds the quote from that day's bars up to the chosen time and stops the live
  polling`, new test).
- Given bars and a prior close of 100.5, then change is last close minus 100.5 and `change_pct` is
  against it; given no prior close, then both are null and never rebased to the open; given no bars,
  then the quote is undefined (`src/routes/reviewQuote.test.ts`, three tests).
- Given no review time, then the cutoff is 16:00 Eastern; given a time, then that time
  (`src/hooks/useReviewQuote.test.ts`, two tests).
- Given the reference request failing, then the price still reads `$221.45` while the change before
  `vs prior close` and `Prev` read as an em-dash (executed 2026-09-30 with a 404).
- Given 120 one-minute bars in the store for the day, then the route returns all 120 with equal
  candle and volume arrays (`test_market_data_full_day`); given no rows and no parquet, then 404
  (`test_market_data_404_when_no_rows`); given either stored convention and `end_time=09:30`, then
  the last candle is the 09:30 bar and the query window is `[2026-09-24 00:00Z, 2026-09-25 02:00Z)`
  (`test_chart_endpoint_opens_at_0930_for_both_conventions`, which sends an `end_time` this page
  does not).
- Given a window that also holds the previous session's evening bars, then the day the loader
  returns holds session D only, 04:00 to 20:00 ET
  (`test_a_single_date_load_excludes_the_prior_sessions_spill`, which calls `_load_date_data` and
  not the route).
- Given a date under 30 days old, then the prior day comes from AlphaVantage
  (`test_reference_recent_uses_alphavantage`); given an old date, then from Cloud SQL and dated
  before it (`test_reference_historical_uses_cloud_sql`, which asserts the source `cloud_sql` and a
  date below the requested one); given the old review date, then a row dated before it
  (`test_reference_for_review_date`); and given an old date, then a row that is not the requested
  date (`test_reference_returns_prev_day`, which asserts `!=` only).

**Tests:** Vitest covers the two pure helpers and pytest the routes, as above;
`tests/api/test_route_coverage.py` pins both routes at 404 against a dead backend and asserts no
body. The new Playwright test (`tests/live-market/live-market.spec.ts`, solyra commit 0e9ab73)
drives the page end to end, and it was added on this branch. The Vitest file
`src/hooks/useReviewQuote.test.ts` tests only `reviewCutoffTs`: this page imports that function and
does not call the `useReviewQuote` hook. Te stays unticked: it waits for a CI run that includes the
branch's tests.

**Code:** `src/routes/LiveMarketPage.tsx:35-47,139-151,164-205,209-217,262-268,283`,
`src/lib/reviewQuote.ts:21-42`, `src/hooks/useReviewQuote.ts:38-44`,
`src/stores/reviewDateStore.ts`, `src/components/shared/ReplayControl.tsx`,
`src/hooks/useMarketData.ts:82-93`, `platform/api/main.py:905-1016,1061-1204,1595-1696`; test ids
`replay-toggle`, `replay-apply`, `replay-clear`.

##### LIVE-09 · State: loading

**Shows or does:** Two lines and no skeleton. `Fetching live quote…` with a pulsing activity icon
fills the quote slot while there is no quote, no error and `polling` is true
(`src/routes/LiveMarketPage.tsx:344-348`; the test is `polling`, not `livePolling`, so it also shows
in review mode until the day's bars build a quote). `Loading historical bars for indicators…`, or
`Loading <date> intraday bars…` in review mode, is centred under the tiles while there are no bars
and `polling || isReview` (`:370-374`). Meanwhile the tiles read `--` and the cards `0/0 met` and
`0%` (LIVE-10). The design seed's "no loading state" issue does not hold: both lines exist. Nothing
ends either line on a failure: a failed history request, or a review day with no bars or a failed
day request, keeps them on screen (executed 2026-09-30 with a 503 on the history and a 404 on the
day, see Gaps). The session bar has no loading state (LIVE-01).

**Needs:** The quote, history and review-day requests of LIVE-02, LIVE-03 and LIVE-08; none of its
own.

**States:** This row is a state.

**Acceptance criteria:**
- Given the quote and history requests pending, when the page renders, then it shows `Fetching live
  quote…` and `Loading historical bars for indicators…` with the tiles `--` and the cards `0/0 met`,
  and when they answer both lines go (executed 2026-09-30 with the two requests held and then
  released).
- Given review mode and the day's bars missing, then the lines read `Fetching live quote…` and
  `Loading 2026-04-24 intraday bars…`, and they were still there four seconds later, after the
  query's one retry would have run (executed 2026-09-30 with a 404).
- Given Paused and no quote, then `Fetching live quote…` is absent (LIVE-10).

**Tests:** None. No test asserts either line: none holds a request to observe them, and the first
test of `tests/shared/most-active-bar.spec.ts` (`renders on /journal and on a Market page with a
spark ticker and a no-spark ticker`) mounts this page with a history of no bars, which leaves
`Loading historical bars for indicators…` on screen (executed 2026-09-30 with that test's mocks)
while it asserts only the marquee. Te stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:344-348,370-374`; no test id.

##### LIVE-10 · State: empty

**Shows or does:** `EMPTY_INDICATORS` and `EMPTY_SIGNALS` (`src/lib/indicators.ts:50-65`) stand in
for the indicators answer until one exists (`src/routes/LiveMarketPage.tsx:218-219`): the six tiles
read `--` and both cards read `0/0 met` with a `0%` strength bar and no condition rows. They stand
in for a failed indicators request as well, with no error text anywhere on the page (executed
2026-09-30 with a 500 and the bars and the quote in hand; filed as
[solyra#75](https://github.com/TeneikaAskew/solyra/issues/75)). In review mode they stay until the
day's bars arrive, because the indicators query is enabled only with at least one bar (`:216`;
executed 2026-09-30 with the day's route answering 401: `--` tiles and `0/0 met` cards beside
`Loading <date> intraday bars…`). The quote slot is empty, with no message, while Paused and no
quote has arrived (`:344-349`, executed 2026-09-30 with the quote request held). The server never
gives the page an empty set: the history route raises 404 or 503 for an empty series
(`platform/api/routers/live.py:352-358`), and a response with `bars: []` happens only when every bar
failed to parse (`:360-373`), which the page reads as loading. There is no empty state for a ticker
without data: a quote failure reads as LIVE-11 and a history failure as LIVE-09.

**Needs:** The indicators request of LIVE-03; none of its own.

**States:** This row is a state.

**Acceptance criteria:**
- Given bars and a quote but no indicators answer, or a failed one, when the page renders, then the
  tiles read `--`, the cards `0/0 met` and `0%` with no row, and no text says the request failed
  (executed 2026-09-30).
- Given Paused before the first quote answers, then the quote slot is empty (executed 2026-09-30).
- Given no bars, then the indicators query is not enabled (`:216`, read directly).
- Given review mode and the day's bars not yet arrived or failed, then the tiles read `--` and the
  cards `0/0 met` (executed 2026-09-30 with the day's route answering 401).

**Tests:** None: no test asserts the empty tiles or cards. The same test of
`tests/shared/most-active-bar.spec.ts` leaves the six tiles at `--` and both cards at `0/0 met`,
with no indicators request, and asserts only the marquee (executed 2026-09-30 with that test's
mocks), so Te stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:216-219,344-349`, `src/lib/indicators.ts:50-65`; no test
id.

##### LIVE-11 · State: error

**Shows or does:** `quoteError`, the quote query's `isError` (`src/routes/LiveMarketPage.tsx:162`),
replaces the quote card with an amber box reading `Live data unavailable, API key not configured or
rate limited. Indicators will populate once history loads.` (`:302-305`); the tiles and cards below
it stay. The query fails on any non-OK answer (`src/hooks/useLiveQuote.ts:27`) or network error once
the app's single retry has failed (`src/App.tsx:30-37`), so the same words cover a 401, 404, 429,
500, 502 and 503, and on a failed poll the box replaces the last good quote until a later poll
succeeds while `Updated:` keeps the last good time (executed 2026-09-30 with a 401 and with a 429
after a good quote). Only the quote has this branch: a failed history request reads as loading
(LIVE-09), a failed indicators request as empty (LIVE-10), a failed status request as `Market
Closed` (LIVE-01) and a failed avg-volume request as nothing.

**Needs:** `GET /api/live/quote/{ticker}` (`platform/api/routers/live.py:189-312`). Its failures
are: 503 without `AV_API_KEY` (`:194-195`) or on a vendor timeout (`:211-212`); 502 on another
request failure (`:213-214`) or a malformed required field (`:248-273`); 429 when the vendor sends a
`Note` or `Information` (`:217-220`); 400 for a vendor `Error Message` (`:221-222`); and for an
empty `Global Quote` 503 outside the regular session and 404 during it (`:224-227`, `is_open` is
true only in `regular`).

**States:** This row is a state.

**Acceptance criteria:**
- Given no `AV_API_KEY`, then the route answers 503 (`test_live_quote_503_without_api_key`,
  `tests/api/test_platform_api.py`; `tests/api/test_route_coverage.py` pins the same 503 in its
  sweep).
- Given a payload with no price, open, high, low or volume, or an unparseable or non-finite price,
  then the route answers 502 and not a quote with zeros (the tests listed under LIVE-02).
- Given a vendor note or information, a vendor error message, a timeout, another request failure or
  an empty quote, then the route answers 429, 400, 503, 502 and 503 outside or 404 during the
  regular session (read directly; no test).
- Given any of those answers, when the page renders, then the quote card is replaced by the amber
  box and nothing names the status (executed 2026-09-30).
- Given a 401 in open mode, then the same box shows and the sign-in card does not (LIVE-13, executed
  2026-09-30).

**Tests:** `tests/api/test_platform_api.py::TestLiveMarketAPI` covers the 503 without a key and the
502 and null rules for malformed payloads, and `tests/api/test_route_coverage.py` the sweep row; the
429, 400, timeout, request-failure and empty-quote branches have no test, and no test renders the
box. Te stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:162,302-305`, `src/hooks/useLiveQuote.ts:22-34`,
`src/App.tsx:30-37`, `platform/api/routers/live.py:189-312`; no test id.

##### LIVE-12 · State: stale

**Shows or does:** `Updated: <time>` at the right end of the toolbar
(`src/routes/LiveMarketPage.tsx:297`), from `new Date(dataUpdatedAt).toLocaleTimeString()` (`:243`):
the moment of the last successful quote fetch for this ticker, in the viewer's locale and zone with
no zone label (the session bar's clock is Eastern and labelled), and `--` until the first success.
It moves on every successful 15 s poll whether or not the vendor's number changed (read directly),
and the quote's own `last_updated`, the vendor's latest trading day, is never shown (executed
2026-09-30: the fixture's `2026-04-24` appears nowhere in the page text), so a stale vendor quote
reads as fresh. A failed poll keeps the last time and review mode keeps the last live time beside
`Historical: ...` (each executed 2026-09-30), and so does Paused, which fetches nothing (read
directly). In review mode the `Historical:` label belongs to the session bar (`:261-266`, LIVE-01)
and `Updated:` stays. `Last signal: ... at <time>` (LIVE-06) uses the same local clock. Nothing else
on the page marks data as stale.

**Needs:** The quote query's `dataUpdatedAt` (LIVE-02) and the review state (LIVE-08); no request of
its own.

**States:** This row is a state.

**Acceptance criteria:**
- Given the first quote answered at 5:02:09 PM in the viewer's zone, then the toolbar reads
  `Updated: 5:02:09 PM`; given a later failed poll, then it still reads that time; given a later
  success, then the new time (executed 2026-09-30).
- Given a quote whose `last_updated` is `2026-04-24`, then that date appears nowhere on the page
  (executed 2026-09-30).
- Given review mode entered after a live fetch at 8:30:01 PM, then the toolbar reads `Historical:
  2026-04-24 @ 16:00 ET` and `Updated: 8:30:01 PM` (executed 2026-09-30).

**Tests:** None on main: no test asserts `Updated:` or the `Historical:` label. The review-mode test
added on this branch asserts the `Historical: 2026-04-24 @ 09:45 ET` label in the session bar
(LIVE-08) and nothing asserts `Updated:`, so Te stays unticked.

**Code:** `src/routes/LiveMarketPage.tsx:162,243,261-266,297`; no test id.

##### LIVE-13 · State: permission

**Shows or does:** `DataGate` (`src/components/shared/SignInEmptyState.tsx:93-98`) wraps everything
below the toolbar (`src/routes/LiveMarketPage.tsx:301-401`): the quote slot, the tiles, the loading
line, the setup cards and the last-signal line; the toolbar stays outside it. It swaps that body for
`SignInEmptyState` (a lock, `Sign in to load data`, an explanation and a `Sign in` button that
reloads the page) when `blocked && !isLoading && !isSignedIn`. `blocked` is the global flag
`markAuthBlocked()` sets when any gated `/api/*` call answers 401 and a later successful gated
answer clears (`src/lib/authedFetch.ts:155-166,250`, `src/lib/authGate.ts:14-47`); `isSignedIn` is
the Firebase state in firebase mode and always true in `iap` and `open` mode
(`src/hooks/useUser.ts:81`). In firebase mode a signed-out visitor never reaches the page, because
`AuthGate` (`src/components/auth/AuthGate.tsx:27`) wraps every app route (`src/App.tsx:70-85`) and
shows the sign-in screen instead, so no path was found on which the sign-in card renders on `/live`
(executed 2026-09-30: a 401 on the quote in open mode left the body and the LIVE-11 box in place and
`Sign in to load data` appeared only in the shell's most-active bar; the branch table of `DataGate`
executed with a scratch Vitest render). A 401 on one route changes only what that route feeds
(executed 2026-09-30 in open mode, the other routes answering): a 401 on the status route leaves the
session bar reading `Market Closed` with a red dot and no clock (LIVE-01); in review mode a 401 on
the market-data route leaves `Fetching live quote…`, `Loading <date> intraday bars…`, `--` tiles and
`0/0 met` cards (LIVE-08, LIVE-09, LIVE-10), and a 401 on the reference route leaves the price with
an em-dash for the change and for `Prev` (LIVE-08); none of them puts a sign-in prompt in the page,
although the shell's most-active bar, outside it, read `Sign in to load data` after the status and
market-data 401s and not after the reference one. The page has no `SignInBanner`.

**Needs:** The 401 of a gated route (`platform/api/auth.py:180-185,208`, where `/api/live/*` is not
among the open paths); every route this page calls answers 401 without a token on staging (V-gate
evidence).

**States:** This row is a state.

**Acceptance criteria:**
- Given no token, when each request of this page is issued against staging (`GET /api/live/status`,
  `/api/live/quote/IWM`, `/api/live/history/IWM`, `/api/live/avg-volume/IWM`, `POST
  /api/live/indicators`, `GET /api/market/data/IWM/20260929?timeframe=1`, `GET
  /api/market/reference/IWM/20260929`), then each answers 401 `{"detail":"sign in to continue"}`,
  while `GET /api/config/firebase` answers 200 with `authMode: firebase` (V-gate evidence,
  2026-09-30).
- Given `blocked` and a signed-in user, then `DataGate` renders its body; given `blocked`, signed
  out and loaded, then it renders `SignInEmptyState`; given `blocked` with the sign-in state still
  loading, or not `blocked`, then the body (executed 2026-09-30, five cases).
- Given firebase mode and a signed-out user, then the sign-in screen shows and no shell link renders
  (`firebase mode, signed out → login screen blocks the app`, `tests/shared/auth-gate.spec.ts`,
  which visits `/dashboard`).
- Given a gated 401, then `authedFetch` marks the session blocked and calls `onUnauthorized` if one
  is registered (`src/lib/authedFetch.ts:247-250`); `setOnUnauthorized` is called only by
  `src/lib/authedFetch.test.ts:47`, so nothing registers a callback in the app (read directly, a
  search of `src`, `tests` and `scripts`).

**Tests:** `src/lib/authedFetch.test.ts` (`a 401 from a gated path fires onUnauthorized`) asserts
that the callback fires for a 401 on `/api/admin/routes` with the callback registered by the test;
no test reads `markAuthBlocked` or `useAuthBlocked`, asserts what `DataGate` renders or loads this
page with a 401. The AuthGate spec asserts the sign-in screen on `/dashboard`. Te stays unticked.

**Code:** `src/components/shared/SignInEmptyState.tsx:93-98`, `src/lib/authGate.ts:14-47`,
`src/lib/authedFetch.ts:155-166,247-250`, `src/hooks/useUser.ts:81-82`,
`src/components/auth/AuthGate.tsx:14-30`, `src/routes/LiveMarketPage.tsx:301,401`; no test id.

### SCREEN-CHARTS — `/charts`

- **Purpose:** Instrument and timeframe chart analysis with strategy conditions and level overlays.
- **Matrix:** [03 § 06](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#06--charts)
- **Status:** Production but needs remediation · **Blocking issue:** [#912](https://github.com/TeneikaAskew/stocks/issues/912) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/ChartsPage.tsx` (1003 lines)
- **Child components:** `BacktesterSection`, `DataGate`, `LoadingSpinner`, `Modal`, `ReplaySessionControls`, `SignInBanner`, `SimilarSetupsCard`, `StrategyConditionsCard`, `TradeMarkingChart`, `WidgetState`, and in the same file `ScorecardRow` and `ScorecardFooter`
- **API calls (from source):** `/api/backtest/all/`, `/api/backtest/equity/`, `/api/backtest/replay-trades`, `/api/backtest/results/`, `/api/config/market-hours`, `/api/journal/trades`, `/api/live/indicators`, `/api/live/signal-series`, `/api/market/data/`, `/api/market/dates/`, `/api/market/reference/`, `/api/options/`, `/api/signals/`, all issued by hooks and child components, none by the page component; `PATCH /api/journal/trades/` is wired (`useCloseChartTrade`) and nothing on this page triggers it
- **Stores:** `useReviewDateStore`, `useSettingsStore`, `useTickerStore`
- **E2E specs:** `tests/charts/charts-cards.spec.ts`, `tests/charts/replay-trainer.spec.ts`, `tests/shared/gamma-levels.spec.ts` (its `Gamma Levels: ChartsPage overlay` tests); `tests/shared/navigation.spec.ts` only reaches the route (its route loop asserts that `/charts` shows the nav and `main` and logs no fatal console error); `tests/dashboard/ticker-combobox.spec.ts`, which the seed lists, visits only `/dashboard`, since this page has no ticker control
- **PR lineage:** [#715](https://github.com/TeneikaAskew/stocks/pull/715) restore charts UI · [#703](https://github.com/TeneikaAskew/stocks/pull/703) ticker type-ahead · [#700](https://github.com/TeneikaAskew/stocks/pull/700)
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/market/dates/{ticker} | dates[] newest first (types: `useMarketData.ts` DatesResponse; `source` and `months` are fetched and not read; fixture: `MOCK_MARKET_DATES` in `src/mocks/charts.ts`) | `market_data_intraday` ← fetch-market-data 23:00 ET Mon-Fri and fetch-alphavantage-intraday 21:00 ET Mon-Sat; one `SELECT DISTINCT` over the ticker's 1-minute rows, each raw stamp shifted back four hours, weekdays only (`platform/api/main.py:745-764`) | 5 minute staleTime; server-side one hour behind a `MAX(ts)` probe, so a new bar shows at once and a backfill of an older date after the hour; an answer served stale during a refresh is labelled only in `source`, which the page does not read; a failure is 503 and the page reads `Select a date to load chart data`; production 2026-09-30: IWM 2,943 dates, 2015-01-02 to 2026-09-29; gated, 401 without a token | `useAvailableDates` → Toolbar date input |
| GET /api/market/data/{ticker}/{date}?timeframe=N[&end_time=HH:MM] | count, candlestick[] time/open/high/low/close, volume[] time/value/color (types: `useMarketData.ts` MarketDataResponse; `ticker`, `date` and `timeframe` are not read; fixture: `MOCK_MARKET_DATA` in `src/mocks/live.ts`) | `market_data_intraday` ← fetch-market-data 23:00 ET Mon-Fri and fetch-alphavantage-intraday 21:00 ET Mon-Sat, both stored time conventions read as Eastern wall clock through `lib/eastern_time.py` and resampled on the clock to the timeframe; a Cloud SQL failure or an empty window falls through to the GCS parquet files with no signal in the answer | staleTime Infinity per ticker, date, timeframe and end time, so each combination is fetched once per tab; `end_time` (review mode) cuts after the resample on the bar's open time; production 2026-09-30: IWM rows to 2026-09-30 00:00 UTC, 883 in the handler's window for 2026-09-29; gated | `useMarketData` → Candlestick chart, Crosshair bar, replay, the indicators and signal requests |
| GET /api/market/reference/{ticker}/{date} | open, high, low, close of the prior session (types: `useMarketData.ts` ReferenceLevels; `week`, `source` and `stale_days` are fetched and not read; fixture: `MOCK_REFERENCE_LEVELS` in `src/mocks/live.ts`) | AlphaVantage TIME_SERIES_DAILY for dates under 30 days old (8 s timeout; nothing without `AV_API_KEY`), then `market_data_daily` ← fetch-market-data 23:00 ET Mon-Fri and fetch-earnings-history 19:15 ET Mon-Fri and Sun, then the GCS minute parquets | staleTime Infinity; any non-OK answer becomes `null` and is kept; requested on every load whatever `Ref` says; production 2026-09-30: `market_data_daily` 2,619 rows each for IWM, SPY and QQQ, newest dated 2026-09-30 (2026-09-29 with a close); gated | `useReferenceLevels` → Crosshair bar `Prev: H / L`, reference lines |
| GET /api/journal/trades/{ticker} | id, direction, entry_ts, entry_price, exit_ts, exit_price, return_pct, tp1 to tp3, stop_loss, status, source, session_id (types: `useJournalChartTrades.ts` JournalRow) | `journal_entries`, the signed-in user's own rows (user write: the Journal page, and Mark Entry in a replay session) | 10 s staleTime; one request per ticker for every date, the page keeps the chart date's rows; a failure is 503 and the page draws no trade and says nothing; production 2026-09-30: 2 rows, none from a replay session; gated | `useJournalChartTrades` → trade markers, TP and SL lines, the hidden-trade count, the scorecard's eligibility |
| POST /api/journal/trades | request: ticker, direction, entry_date, entry_time, entry_price, stop_loss, take_profits, source `replay`, session_id; the answer is not read (types: `useJournalChartTrades.ts` CreateChartTradeVars) | `journal_entries` (user write) | only in a replay session, the trade is `active` (no exit); a failed post shows nothing; gated | `useCreateChartTrade` → Mark Entry |
| POST /api/live/indicators | request: bars (time, open, high, low, close, volume), current_price, current_volume, avg_volume_20d sent as null; read: `chart_voter` call, put and firing, and `indicators.rsi` (types: `useLiveIndicators.ts` IndicatorsResponse; `signals`, the averages, `stoch*`, `atr` and `vwap` are not read; fixture: `MOCK_LIVE_INDICATORS` in `src/mocks/live.ts`) | computed on each request by `lib/indicators.py` and `lib/chart_voter.py` from the bars in the request; no table | 10 s staleTime, keyed on bar count, last bar time, price and volume; asked with at least 14 bars, with the whole day's bars, extended hours included, whatever `RTH` says; one request per reveal step in a replay session (105 in 5.5 s at 20x on a 120 bar day, executed); a failure reads as `No setup`; gated | `useLiveIndicators` → Strategy conditions card, the similar card's RSI |
| POST /api/live/signal-series | request: bars; read: fires[] time, direction, score, bar_index (types: `useLiveIndicators.ts` SignalSeriesResponse; fixture: `MOCK_SIGNAL_SERIES` in `src/mocks/charts.ts`) | computed on each request by `lib/indicators.py` `add_signal_indicators` and `lib/signals.py` `generate_signals(df)` with no ticker, so the per-ticker overrides of `exit_config_overrides` that production applies are not; no table | 10 s staleTime, keyed on the day, bar count, first and last bar time; asked with at least 14 bars (422 under), never in a replay session, and whatever `Sig` says; gated | `useSignalSeries` → Sig chart markers, the similar card's trigger |
| GET /api/signals/{ticker}/similar | direction, rsi, score, stats count, pct_profitable, median_mfe_pct, p25_mfe_pct, p75_mfe_pct, matches[] time, rsi, return_pct, return_5min, return_20min (types: `useSimilarSetups.ts` SimilarResponse; the other fields are not read; fixture: `MOCK_SIMILAR_SETUPS` in `src/mocks/charts.ts`) | `historical_signals` ← historical-signals-watchlist 01:00 ET Tue-Sat; every IWM row is labelled `momentum` ([#912](https://github.com/TeneikaAskew/stocks/issues/912)) | 60 s staleTime; asked only after the voter fired on the series' last bar; the stats query measured 1.6 to 2.0 s in production; 2026-09-30: IWM 190,159 rows to 2026-09-29, strengths 3 and 4 end 2026-05-01; a failure shows its status in red; gated | `useSimilarSetups` → Similar setups card |
| GET /api/backtest/all/{ticker} · results/{ticker}?run= · equity/{ticker}?run= | runs[] timestamp and has_equity_curve; summary total_trades, win_rate, avg_return_pct, avg_win_pct, avg_loss_pct and trades[]; equity dates, values and summary total_return_pct, max_drawdown_pct (types: `BacktesterSection.tsx`; the other fields are not read) | none (GCS CSV objects under `raw/data/backtest_results/`, no table; nothing writes them and the newest was uploaded 2026-02-23) | 30 s staleTime; server-side results and equity one hour, the run list ten minutes; `/all` downloads and parses every CSV of the ticker (IWM: 17 files, 19.62 MiB); a storage failure or an empty prefix reads 404; gated | `BacktesterSection` → Backtester |
| POST /api/backtest/replay-trades | request: ticker and session_id (trade_ids is supported and not sent); read: trades[] id, status, reason, actual_return_pct, fill_check, system_signal_at_entry, system_exit, exit_edge_bps, and aggregate n, scored_n, win_rate, avg_return_pct, system_resolved_n, system_no_signal_n, system_agreement_rate, avg_exit_edge_bps (types: `useJournalChartTrades.ts` ReplayTradesResponse) | computed on each request by `lib/backtest.py` `replay_labeled_trades` from the user's `journal_entries`, the day's `market_data_intraday` bars and `exit_config_overrides` ← param-sweep (manual, no trigger) | on demand, once when a replay session stops with a closed trade of its own, which this page cannot produce (CHARTS-12); a failed journal read answers 404; gated | `useReplayTrades` → Post-session scorecard |
| GET /api/options/{ticker}/{date}/levels | kings[].strike, gates[].strike, gamma_flip, gamma_balance (types: `useGammaLevels.ts` GammaLevelsResponse; `spot`, `regime`, `total_gex`, `levels` and `warnings` are not read; fixture: `MOCK_LEVELS_POPULATED` in `src/mocks/options.ts`) | `etf_options_snapshots` ← fetch-av-options-realtime every 5 min 09:00-15:55 ET Mon-Fri and fetch-av-options-backfill 21:00 ET Mon-Fri, the date's latest snapshot; `daily_rates` ← fetch-fred-rates 06:30 ET daily for the flip | shown only for SPY, IWM, QQQ and SPX, though Cloud SQL holds no SPX bars to select a date from (matrix Charts Gaps); asked only with `Gamma` on; 1 h staleTime, no retry; server-side the chain is cached 12 h; a failure, a date with no chain (404) included, draws nothing and says nothing; production 2026-09-30: IWM, SPY and QQQ snapshots at 19:40 UTC, SPX 2026-09-29 with no `gamma` on any of its 4,871 contracts; gated | `useGammaLevels` → Gamma overlay |
| GET /api/config/market-hours | regular.open, regular.close (types: `useConfig.ts` MarketHours; the pre-market, after-hours and holiday fields are not read; fixture: `MOCK_MARKET_HOURS` in `src/mocks/common.ts`) | constants in `platform/api/routers/live.py` (`MARKET_OPEN`, `MARKET_CLOSE`); no table, no job | 24 h staleTime; the browser's 09:30 and 16:00 stand in while it is pending or after a failure; gated | `useMarketHours` → the `RTH` filter of the chart |
| store: ticker, review date, timeframe |  | Zustand: `tickerStore` (persisted as `ticker-store`), `reviewDateStore` (in memory, set by the Replay control), `settingsStore` timeframe (in memory, default `5`) |  | Toolbar, every card |
| component state: date, Vol, RTH, Ref, Gamma, Sig |  | `useState` in `ChartsPage`, lost when the page unmounts |  | Toolbar, chart |

#### Displayed
| ID | Element | Component |
|---|---|---|
| CHARTS-01 | Toolbar | inline in `ChartsPage` |
| CHARTS-02 | Candlestick chart | `TradeMarkingChart` |
| CHARTS-03 | Crosshair bar | inline in `ChartsPage` |
| CHARTS-04 | Replay session controls | `ReplaySessionControls` |
| CHARTS-05 | Strategy conditions card | `StrategyConditionsCard` |
| CHARTS-06 | Similar setups card | `SimilarSetupsCard` |
| CHARTS-07 | Backtester | `BacktesterSection` |
| CHARTS-08 | Post-session scorecard | inline modal in `ChartsPage` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| CHARTS-09 | Change date or timeframe | The date input is bounded by `useAvailableDates`'s list (a typed date outside it is still requested) and disabled in historical review mode; timeframe buttons set `settingsStore`'s in-memory `timeframe`, which resamples the `/api/market/data` request on the clock. |
| CHARTS-10 | Toggle overlays | `Vol`, `RTH`, `Ref`, `Gamma` and `Sig` are component state that decides what is drawn: `RTH` filters the drawn bars to the window of `GET /api/config/market-hours`; `Ref` draws the reference levels, which are requested on every load; `Gamma` (SPY, IWM, QQQ, SPX only; SPX has no date to ask for, see the matrix Charts Gaps) is the one toggle that gates its request, `useGammaLevels`; `Sig` draws the markers of a signal series that is requested on every load, and is disabled in a replay session. |
| CHARTS-11 | Run a replay session | `useReplaySession` reveals the loaded bars one at a time (a 15-bar warm start); Mark Entry during a session POSTs `/api/journal/trades` with `source: 'replay'`, the session id and an entry time pinned to the last revealed bar, and a failed post shows nothing. |
| CHARTS-12 | Backtest my trades | The seed's on-demand button no longer exists. The replay-trades endpoint is reached only from a finished replay session, which on this page ends with no closed trades to score, so the scorecard never opens (see the matrix Charts Gaps). |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| CHARTS-13 | loading | present | `WidgetState.tsx`'s `WidgetSkeleton` on the chart; "Querying historical signals…" (Similar setups); "Loading backtest data…" (Backtester); "Scoring your trades against the system benchmark…" (scorecard). |
| CHARTS-14 | empty | present | "No market data available for this date" (only for an answer with no bars, which the handler never sends: an empty day is a 404) / "Select a date to load chart data"; "Session ended: no closed trades to score"; Similar setups' placeholder text; "No backtest results found". |
| CHARTS-15 | error | present | `WidgetState.tsx`'s `WidgetError` ("Couldn't load this data") on the chart; Similar setups shows the raw error message; Backtester shows "No backtest results for…"; a failed replay shows "Replay failed:…". |
| CHARTS-16 | stale | present | "Snapped to…" when the review date was not a trading day (not when it is older than every listed date), and "N trades hidden" past the review or replay cutoff; the backtester prints its run timestamp raw; nothing else on the page marks data as stale. |
| CHARTS-17 | permission | not tracked (new category); present | `SignInBanner` ("Sign in to load chart data"), shown while the last gated answer was a 401, plus a compact `DataGate` around the cards that swaps them only for a signed-out user, which `AuthGate` keeps out of the page; a 401 on the chart's own query shows `WidgetError` with "sign in to continue", because `isAuthError` does not match the server's text. |

#### Journeys
1. Analyse a level: Opens /charts and picks a date and timeframe (CHARTS-09) → Turns on the Ref and Gamma overlays (CHARTS-10); Gamma draws nothing, with no message, for a date with no stored chain (CHARTS-10) → Reads King, Gate and Flip against price (CHARTS-10) → Checks the Strategy conditions card for the voter read, which describes the last bar of the day's series (CHARTS-05) → Reads the Similar setups card, which asks about that last bar only and otherwise waits for the voter to fire (CHARTS-06)
2. Train on bar replay: Starts a replay session (CHARTS-11) → Steps bars forward one at a time (CHARTS-04, CHARTS-11) → Marks an entry, picks CALL or PUT, clicks up to three take profits and a stop or presses Esc to skip them (CHARTS-11) → Finishes the session (CHARTS-11) → the session always ends "Session ended: no closed trades to score" (CHARTS-14); nothing on this page can close a marked trade, so the post-session scorecard never opens here (see the matrix Charts Gaps)
3. Backtest your own trades: Scrolls to the Backtester section (CHARTS-07) → sees results computed once in February 2026, not a live run over the trader's own journal; the seed's on-demand "Backtest my trades" button and journey no longer exist (see the matrix Charts Gaps) → Finishing a replay session here (CHARTS-11) always ends "Session ended: no closed trades to score" (CHARTS-14); nothing on the page can close a trade to score, so the scorecard the seed expects never opens (see the matrix Charts Gaps)

#### Elements
##### CHARTS-01 · Toolbar

**Shows or does:** The toolbar row above the chart (`src/routes/ChartsPage.tsx:507-686`, a wrapping
flex row), left to right: a date input (`:509-521`); the amber notes `ⓘ Snapped to <date>`
(`:522-526`) and `N trade(s) hidden` (`:527-531`) and the end-of-session note (`:532-536`,
CHARTS-14); the five timeframe buttons `1m 5m 15m 30m 1h` (`:538-553`, CHARTS-09); the toggles
`Vol`, `RTH`, `Ref`, `Gamma` and `Sig` (`:555-611`, CHARTS-10); the replay controls (`:613-626`,
CHARTS-04); and, at the right and only while a replay session runs, the Mark Entry chrome
(`:639-685`, CHARTS-11). The row has no ticker control: the page follows `tickerStore`, which is set
elsewhere (the command palette, or another page's ticker control). The date input holds
`YYYY-MM-DD`, is empty until the dates list arrives, then takes the newest date of the list once per
list (`:129-133`, only while no date was chosen), and its `min` and `max` are the oldest and newest
dates of that list (`:123-124`). In review mode it is disabled with the title
`Controlled by global historical mode, clear review mode to edit` (`:514,520`) and the page shows
the review date, or the nearest earlier listed date (`:136-150`, CHARTS-16). A typed date outside
`min` and `max` is requested all the same: the handler at `:515-518` only drops an empty value, and
the list bounds only the browser's picker.

**Needs:** `GET /api/market/dates/{ticker}` (`platform/api/main.py:607-902`, a plain `def`), which
answers `{ticker, source, dates, months}` with `dates` as `YYYYMMDD` newest first; the page reads
`dates` only (`src/hooks/useMarketData.ts:52-63`, 5 minute stale time). The list is one
`SELECT DISTINCT` over the ticker's 1-minute rows of `market_data_intraday` that shifts every raw
stamp back four hours and keeps weekdays (`platform/api/main.py:745-764`), which puts each bar on
its session's date in both stored conventions (true UTC, and Eastern wall clock stamped as UTC); it
is cached for one hour behind a `MAX(ts)` probe (`:578-581,617-658`). A database failure, in the
probe or in the list, is a 503 and never a fallback (`:627-644,826-848`); the GCS staging parquets
answer only when Cloud SQL is not configured (`:850-902`, local development). A ticker with no rows
answers 200 with empty lists and is not cached (`:820-825`). While another request refreshes a stale
entry the old list is served with `source` set to `cloud_sql (stale, refresh in flight)`
(`:717-718`), which the page never reads; with nothing cached and a refresh in flight it answers 503
with `Retry-After: 2` (`:725-735`). Production 2026-09-30: 2,943 dates for IWM from 2015-01-02 to
2026-09-29, the newest eight being 09-29, 09-28, 09-25, 09-24, 09-23, 09-22, 09-21 and 09-18, and
the list query took 1.4 to 1.6 s (V-gate evidence, dispatch A statements 2 and 3). The route is
gated: it answers 401 without a token (V-gate evidence).

**States:** The row is a container; its states are CHARTS-13 to CHARTS-17. A failed, empty or
pending dates request leaves the input empty with no `min` or `max`, and the chart card reads
`Select a date to load chart data` with no error text for the dates call (executed 2026-09-30 with
the request held, with a 503 and with an empty list; with a 401 the page banner also shows,
CHARTS-17).

**Acceptance criteria:**
- Given the dates `20260424`, `20260423` and `20260422`, when the page loads, then the input reads
  `2026-04-24` with `min` `2026-04-22` and `max` `2026-04-24`, and the first market-data request is
  `/api/market/data/IWM/20260424?timeframe=5`
  (`the timeframe buttons and the date input ask for bars at that resolution and on that day`,
  `tests/charts/charts-cards.spec.ts`, added on this branch).
- Given a typed `2026-04-10`, which is outside the list, then `/api/market/data/IWM/20260410` is
  requested (the same test).
- Given review mode, then the input is disabled with the title above (executed 2026-09-30 with the
  Replay control's review date and time set).
- Given the ticker changes to SPY, then the dates of SPY are requested and the date already chosen
  is kept and requested for SPY (executed 2026-09-30 through the command palette: IWM on
  `2026-04-23`, then `/api/market/data/SPY/20260423`).
- Given the dates query, when the list is asked for twice with no new bar, then the scan runs once;
  a newer bar invalidates the entry at once; a backfill of an older date is seen only after the
  hour; an empty result never reaches GCS and is not cached
  (`tests/api/test_market_dates_cache_expiry.py`, seven tests, the query stubbed).
- Given a failing database, then the answer is 503 with no driver text, and given an unconfigured
  Cloud SQL and a failing GCS listing, then 503 too
  (`test_market_dates_db_failure_is_503_not_a_gcs_downgrade`,
  `test_market_dates_gcs_failure_is_503_not_an_empty_200`, `tests/api/test_platform_api.py`).
- Given a request with no token, then staging answers 401 `{"detail":"sign in to continue"}` (V-gate
  evidence, 2026-09-30).

**Tests:** `tests/api/test_market_dates_cache_expiry.py` and `TestMarketDataAPI` in
`tests/api/test_platform_api.py` (`test_market_dates`: the list, its source and its months;
`test_market_dates_gcs_answer_is_never_cached`) pin the handler's caching and failure answers with
the query stubbed. `test_date_list_counts_sessions_not_the_winter_spill`
(`tests/api/test_intraday_loader_conventions.py`) reads the handler's source text for the four hour
shift and the `isodow` predicate and runs no query, so no test executes the framing against rows.
`tests/api/test_route_coverage.py` pins 503 for the route against a dead backend. Playwright
`Sig overlay toggle is in the toolbar and is clickable` (`tests/charts/charts-cards.spec.ts`)
asserts only that the `Sig` button is visible and presses it twice. The toolbar's own assertions are
the new test named above (solyra commit cd2c08b), added on this branch; the solyra CI run the matrix
cites (commit eca7078) predates it, so Te stays unticked.

**Code:** `src/routes/ChartsPage.tsx:74-88,116-150,507-553`, `src/hooks/useMarketData.ts:52-63`,
`src/stores/settingsStore.ts:85,103-104`, `platform/api/main.py:578-902`; no test id.

##### CHARTS-02 · Candlestick chart

**Shows or does:** The chart card (`src/routes/ChartsPage.tsx:712-777`, test id `chart-card`, height
`clamp(400px, calc(100vh - 340px), 900px)`). `WidgetState` over the market-data query (`:717`,
CHARTS-13, CHARTS-15) wraps, once bars exist (`count > 0`, `:734`), a `TradeMarkingChart`
(`:735-764`, test id `trade-marking-chart`), which draws a lightweight-charts canvas through
`CandlestickChart`: the day's candles and, under `Vol`, the volume histogram, with the RTH filter on
by default (CHARTS-10). Over the candles it draws the user's own trades for this ticker and date
(`currentTrades`, `:300-309`): an entry arrow labelled `CALL @ $220.25` or `PUT @ $…` (below the bar
for CALL, above for PUT), an exit circle labelled `Exit +$…` or `Exit —` when the return is not
computable, and one horizontal line per take profit and stop loss titled `TP1`, `TP2`, `TP3` and
`SL` (`src/components/journal/TradeMarkingChart.tsx:36-53,215-248,269-301`); the wrapper carries
`data-price-lines`, the count of those lines, and `data-highlighted-trade`. The signal arrows of
`Sig` (CHARTS-10) go into the marker list ahead of the trade markers, and the `Ref` and `Gamma`
lines after the trade lines (`:250-253,303-306`). While a replay session runs the chart gets only
the revealed bars and their volume and is remounted on each start and stop (`key chart-<session id>`
or `chart-live`, `src/routes/ChartsPage.tsx:746-748`, CHARTS-04). Times are the day's Eastern wall
clock carried as epoch seconds, so the axis reads Eastern whatever the viewer's zone. With the `RTH`
toggle on, the canvas draws only bars whose open time lies in `[09:30, 16:00)`, the window from
`GET /api/config/market-hours` with the browser's 09:30 and 16:00 as the answer to a failed or
pending request (`src/components/charts/CandlestickChart.tsx:173-178,279-282`,
`src/hooks/useConfig.ts:68-78`). That filter is on the open time, so on the `1h` timeframe the bar
that opens at 09:00 and holds the session's first half hour is dropped and the chart starts at 10:00
(executed 2026-09-30 with hourly bars 04:00 to 20:00: with `RTH` on the bars opening 10:00 to 15:00
showed, with it off the bars from 04:00; see Gaps). The other timeframes open their first bar at
09:30.

**Needs:** `GET /api/market/data/{ticker}/{date}?timeframe=N` (`platform/api/main.py:905-1016`, a
plain `def`). It reads the day's 1-minute rows of `market_data_intraday` through `_load_date_data`
(`:1595-1696`): the window `[D 00:00Z, D+1 02:00Z)`, which holds session D in both stored
conventions (`:1609-1624`), is converted to Eastern wall clock by `stored_intraday_to_eastern`
(`lib/eastern_time.py`, applied at `platform/api/main.py:1654`) and cut to the Eastern date
(`:1661-1663`); then `_aggregate_timeframe` (`:1699-1709`) resamples to `timeframe` minutes on the
clock (a 5 minute bar opens at :00, :05 and so on, empty bins are dropped). An empty day answers 404
(`:927-928,973-974`), volume that is NaN is sent as `0` (`:1004`), and a Cloud SQL failure or an
empty window falls through, with no signal in the answer, to the GCS parquet files (`:1667-1696`)
and then to 404 `No data found in Cloud SQL or GCS` (`:1696`). The response has no `source` field.
Production 2026-09-30: IWM holds 2,020,871 one-minute rows to 2026-09-30 00:00 UTC, and the
handler's window holds 883 rows for 2026-09-29 and 856 for 2026-09-28 (V-gate evidence, dispatch A
statements 1 and 4); `fetch-market-data` ran at 03:00 UTC and `fetch-alphavantage-intraday` at 01:00
UTC on 2026-09-30, both successful (V-gate evidence). `GET /api/journal/trades/{ticker}`
(`platform/api/routers/journal.py:882-922`) returns the signed-in user's whole journal for the
ticker, newest first, with no date filter; the page keeps the rows whose entry date is the chart
date (`src/hooks/useJournalChartTrades.ts:289-303`, 10 second stale time). A failed read is 503
`journal temporarily unavailable` (`platform/api/routers/journal.py:917`), and the page reads
`data: trades = []` (`src/routes/ChartsPage.tsx:222`), so a failed journal read draws no trade and
says nothing (executed 2026-09-30 with a 500). Both routes are gated and answered 401 without a
token (V-gate evidence).

**States:** CHARTS-13 (skeleton), CHARTS-14 (`No market data available for this date`,
`Select a date to load chart data`), CHARTS-15 (`Couldn't load this data` with the error text and a
Retry button), CHARTS-17 (a 401 shows the page banner and, on the chart, the same error card
carrying `sign in to continue`).

**Acceptance criteria:**
- Given a 1600 by 900 viewport and a day of bars, when the page loads, then the canvas is taller
  than 450 px, not wider than its card, and the page has no horizontal scroll
  (`chart fills the viewport height without horizontal overflow`,
  `tests/charts/charts-cards.spec.ts`).
- Given one closed trade with two take profits and a stop loss on the chart date, then
  `data-price-lines` reads `3`; given the journal read failing with a 500, then it reads `0` and no
  message shows (executed 2026-09-30; the same attribute is asserted on `/journal` by
  `tests/journal/journal-onestop.spec.ts`, not on this page).
- Given 192 five minute bars from 04:00 to 19:55 and `RTH` on, then the pointer at the left edge
  reads the 09:30 bar and at 93 % of the width the 15:30 bar; with `RTH` off it reads the 04:05 bar
  and the 18:50 bar (executed 2026-09-30 with bars whose open encodes their position).
- Given 961 one minute rows from 04:00 to 20:00 ET stored as true UTC, when `timeframe` is 5, 15, 30
  and 60, then the handler returns 193, 65, 33 and 17 bars, the hourly ones opening on the hour
  (executed 2026-09-30 through the real handler with the query stubbed; no test requests a
  `timeframe` above 1 or calls `_aggregate_timeframe`).
- Given rows stored either as true UTC or as Eastern labels, then the chart endpoint opens at 09:30
  and queries `[D 00:00Z, D+1 02:00Z)`, and a date read excludes the prior session's spill
  (`test_chart_endpoint_opens_at_0930_for_both_conventions`,
  `test_a_single_date_load_excludes_the_prior_sessions_spill`,
  `tests/api/test_intraday_loader_conventions.py`, with the rest of that file).
- Given 120 one minute bars, then `timeframe=1` returns them whole and `end_time=10:30` returns 61,
  an invalid `end_time` is 400 and no rows is 404 (`test_market_data_full_day`,
  `test_market_data_end_time_filter`, `test_market_data_end_time_invalid_format`,
  `test_market_data_404_when_no_rows`, `tests/api/test_platform_api.py`).
- Given a request with no token, then staging answers 401 for both routes (V-gate evidence).

**Tests:** as above. The Playwright test asserts the canvas geometry only: no test on main asserts
the bars the canvas receives, a marker or a price line on this page, the RTH filter or the
timeframe. The pytest files assert the loader, the conventions and the handler's cutting with
stubbed queries; `tests/api/test_route_coverage.py` pins 404 for the market-data route against a
dead backend. The frontend helpers have Vitest cases: `isAppendExtension` in
`src/components/charts/candlestickIncremental.test.ts` (eight), `exitMarkerSpec` in
`src/components/journal/TradeMarkingChart.test.ts` (the `Exit —` label for an unavailable return, a
signed label otherwise) and the row mapping in `src/hooks/journalChartTrades.test.ts`. The journal
read is asserted for its nulls (`test_get_list_emits_real_null_not_nat_for_active_trade`,
`test_get_list_cloud_sql_emits_real_null_not_nat`, `tests/api/test_journal_phase2.py`) for an
imported active trade (`test_commit_active_trade_has_null_exit_and_get_shows_active`,
`tests/api/test_journal_import_endpoints.py`) and for its gate
(`test_examples_requires_auth_like_trades_get`, `tests/api/test_journal_examples.py`). Te stays
unticked: nothing asserts the drawn candles, markers or lines.

**Code:** `src/routes/ChartsPage.tsx:157-163,222,300-309,712-777`,
`src/components/journal/TradeMarkingChart.tsx:36-53,215-322`,
`src/components/charts/CandlestickChart.tsx:60-86,173-178,279-282`,
`src/hooks/useMarketData.ts:34-50`, `src/hooks/useConfig.ts:68-78`,
`src/hooks/useJournalChartTrades.ts:289-303`, `platform/api/main.py:905-1016,1595-1709`,
`platform/api/routers/journal.py:882-922`, `platform/api/routers/config.py:131-143`; test ids
`chart-card`, `trade-marking-chart`.

##### CHARTS-03 · Crosshair bar

**Shows or does:** A one-line bar between the toolbar and the chart card
(`src/routes/ChartsPage.tsx:688-709`), present only while the pointer is over a bar of the chart. It
reads `O`, `H`, `L` and `C`, each to two decimals (`H` green, `L` red), from the bar under the
crosshair: the chart's own subscription passes the bar to the page, and passes `null` when there is
no time under the pointer, which removes the bar
(`src/components/charts/CandlestickChart.tsx:444-467`, `src/routes/ChartsPage.tsx:109-113`). It
shows the bar as drawn: the selected timeframe, the RTH filter applied, and during a replay only the
revealed bars (CHARTS-04). While `Ref` is on (CHARTS-10) and the reference levels have arrived it
adds a fifth piece, `Prev: H <high> / L <low>`, the prior session's high and low (`:703-707`,
`refLevels` from `:193`). With `Ref` off, or with no reference answer, the piece is absent, and a
failed reference request says nothing (executed 2026-09-30 with a 401 and a 404 on the reference
route and `Ref` on: the OHLC showed, no `Prev`, no alert).

**Needs:** The bars of CHARTS-02 and `GET /api/market/reference/{ticker}/{date}`
(`platform/api/main.py:1061-1204`, a plain `def`), which answers the OHLC of the session before
`{date}` and a `week` block. Three branches, in order: for a date less than 30 days old,
AlphaVantage `TIME_SERIES_DAILY` through `_fetch_av_daily_reference` (`:200-239`, an 8 second
timeout; nothing without the `AV_API_KEY` secret or on any failure), with the week from
`_fetch_week_range` (`:1019-1058`, `None` on any failure); then `market_data_daily` (`:1101-1136`,
the newest row with `date` below the request, `source: cloud_sql`, `stale_days` only when the row is
more than three days old for a recent date); then the GCS minute parquets through `_load_date_data`
and a hard-coded 09:30 to 16:00 window (`:1138-1204`). A Cloud SQL failure in the second branch is
only logged and falls to the third. The page reads `open`, `high`, `low` and `close`; `source`,
`stale_days` and `week` are fetched and not read (`src/hooks/useMarketData.ts:65-93`).
`useReferenceLevels` turns any non-OK answer into `null` and keeps it: a stale time of Infinity, no
retry of the `null` (`:82-93`). Production 2026-09-30: `market_data_daily` holds 2,619 rows for IWM,
SPY and QQQ, the newest dated 2026-09-30 and the newest with a close 2026-09-29; the prior session
of 2026-04-24 reads as the 2026-04-23 row (276.73, 277.87, 271.95, 275.52) and its five session week
as 2026-04-17 to 2026-04-23 (V-gate evidence, dispatch A statements 5, 6 and 7). A date under 30
days old is answered by AlphaVantage, live, which no read without a token can show, so V stays
unticked. The route is gated and answered 401 without a token (V-gate evidence).

**States:** The bar has no state of its own: absent with the pointer off a bar, absent while the
chart is loading, empty or in error (CHARTS-13 to CHARTS-15), and the `Prev` piece is the only part
that can be missing for a reason (a failed or pending reference call).

**Acceptance criteria:**
- Given thirty bars and the pointer over one, then `O`, `H`, `L` and `C` read that bar's values to
  two decimals, all four from the same bar, and over a later bar the close is higher (the fixture's
  closes rise); given the pointer moved off the chart, then the bar is gone
  (`the crosshair bar shows the OHLC of the hovered bar, adds Prev H / L while Ref is on, and leaves with the mouse`,
  `tests/charts/charts-cards.spec.ts`, added on this branch).
- Given `Ref` off, then no `Prev` piece shows, and given `Ref` on and a reference of high 222 and
  low 218, then it reads `Prev: H 222.00 / L 218.00` (the same test).
- Given a reference answer that is 401 or 404, then the bar has no `Prev` piece and no message shows
  (executed 2026-09-30).
- Given a date under 30 days old and a working key, then the prior day comes from AlphaVantage with
  `source: alphavantage`; given an older date, then from `market_data_daily` with
  `source: cloud_sql` and a date before the request; and the day returned is never the requested one
  (`test_reference_recent_uses_alphavantage`, `test_reference_historical_uses_cloud_sql`,
  `test_reference_returns_prev_day`, `test_reference_for_review_date`,
  `tests/api/test_platform_api.py`, with the query and the vendor call stubbed).
- Given a request with no token, then staging answers 401 (V-gate evidence).

**Tests:** No test on main asserts the crosshair bar: the only Playwright test that reads the chart
(`chart fills the viewport height without horizontal overflow`) measures the canvas. The bar's
assertions are the new test above (solyra commit cd2c08b), added on this branch; the solyra CI run
the matrix cites (commit eca7078) predates it. The pytest tests above assert the first two branches
of the reference route, the vendor and the query stubbed, and none asserts the GCS branch;
`tests/api/test_route_coverage.py` pins 404 for the route against a dead backend, and
`tests/api/test_intraday_loader_conventions.py` covers the bar loader the third branch reuses. Te
stays unticked.

**Code:** `src/routes/ChartsPage.tsx:109-113,193,688-709`,
`src/components/charts/CandlestickChart.tsx:444-467`, `src/hooks/useMarketData.ts:65-93`,
`platform/api/main.py:197-239,1019-1204`; no test id.

##### CHARTS-04 · Replay session controls

**Shows or does:** The control that sits in the toolbar after the toggles
(`src/routes/ChartsPage.tsx:613-626`, `src/components/charts/ReplaySessionControls.tsx:30-117`).
Idle, it is one `Start replay` button (test id `replay-start-btn`), disabled with the title
`Load a trading day before starting a replay` while the page holds no bars and titled
`Start bar-replay trainer session` otherwise (`:43-56`). Active, it is a group (`replay-controls`)
of a Play or Pause button (`replay-play-pause-btn`, disabled at the end of the day), a
`Step one bar` button (`replay-step-btn`, disabled at the end), the speeds `1x`, `5x` and `20x`
(`replay-speed-<n>x`, one bar per 1000 / n ms), a Stop button (`replay-stop-btn`) and the readout
`<revealed>/<total>` (`replay-revealed-count`). `useReplaySession`
(`src/hooks/useReplaySession.ts:135-195`) starts a session with a fresh `crypto.randomUUID()` and a
warm start of 15 bars, clamped to the day (`:30,51-59`); a step pauses and reveals one bar; play
reveals on a timer and pauses itself at the last bar (`:68-74,143-149`); Stop resets to idle and
leaves a summary for the scorecard (CHARTS-08, `:88-99,168-171`). While a session runs, everything
downstream sees only `revealedBars`: the chart and its volume (CHARTS-02), the crosshair bar
(CHARTS-03), the indicators request and so the Strategy conditions card (CHARTS-05)
(`src/routes/ChartsPage.tsx:341-344,356-370`); the Sig request is not made and the Sig toggle is
disabled with the title `unavailable during replay` (`:415-419,600-611`); the similar card is forced
to its no-setup text (`:799`); the user's own trades timed after the last revealed bar are hidden
and counted in `N trade(s) hidden` (`:295-318`, CHARTS-16). The session is not tied to the day it
was started on: a timeframe change or a date change leaves `revealedCount` as it was, so a session
at 40 of 78 five minute bars switched to `15m` reads `40/26` with all 26 bars drawn, and a date
change keeps the count for the new day's bars (executed 2026-09-30; see Gaps). A session can be
started in review mode (executed, `15/30`).

**Needs:** The day's bars (CHARTS-02); nothing of its own. Each step sends the revealed bars to
`POST /api/live/indicators` (CHARTS-05): a 20x playback of a 120 bar day sent 105 requests in 5.5 s,
about 19 a second, each carrying every bar revealed so far (executed 2026-09-30, one hermetic page,
the answer mocked); the handler took a median of 13 to 31 ms for 30 to 961 bars in process (executed
2026-09-30 through the real handler with `TestClient`; an earlier run read 17 to 29 ms).

**States:** Idle, active, playing, paused and at the end (Play and Step disabled) are the row's own
states (executed 2026-09-30: `15/30`, `16/30`, `30/30` with both disabled, idle again after Stop).
With no bars Start is disabled (executed with a zero bar day). No error state: a failed bar request
leaves Start disabled as it was.

**Acceptance criteria:**
- Given a day of 30 bars, when `Start replay` is pressed, then the readout reads `15/30` and
  `1 trade hidden` for a trade timed after the 15th bar; when Step is pressed twice, then `17/30`;
  and Sig is disabled with the title `unavailable during replay`
  (`start -> warm-start reveal -> step x2 -> Sig disabled -> future trade hidden -> Mark Entry POSTs source:replay pinned to the last revealed bar`,
  `tests/charts/replay-trainer.spec.ts`).
- Given an active session, when Stop is pressed, then `Start replay` is back, the controls are gone
  and Sig is enabled (`Stop resets to the idle "Start replay" button and re-fits the full day`, same
  file; the test's title promises a re-fit that it does not assert).
- Given the reducers, then a start reveals the warm start or the whole short day, a step never
  passes the last bar and pauses at it, Play does nothing at the end or when idle, Pause does
  nothing when paused, the idle state that Stop resets to is fully reset, and the summary says
  whether the day was played through (`src/hooks/replaySession.test.ts`, 22 cases; its `stop` case
  compares that constant with itself, so the hook's `stop()` is asserted only by the Playwright test
  above).
- Given Play at `20x`, then one bar is revealed about every 50 ms (executed 2026-09-30: 15 to 120 in
  5.5 s); the timer, the speed buttons and the Play and Pause buttons are asserted by no test.
- Given a timeframe or date change during a session, then the count is kept, and above the new total
  the readout exceeds it (executed 2026-09-30, `40/26`).

**Tests:** The two Playwright tests and the Vitest file above are the row's assertions; the two
Playwright tests exist on main at eca7078. They assert Start, the warm start, Step, the hidden-trade
count, the disabled Sig and Stop, and the reducers behind Play, Pause and the end of the day. No
test asserts the speed buttons, the playback timer, the Play and Pause buttons themselves, the
disabled Start or what a timeframe or date change does to a session. The bars the session reveals
come from the loader that `tests/api/test_intraday_loader_conventions.py` and `TestMarketDataAPI` in
`tests/api/test_platform_api.py` assert (CHARTS-02), and `tests/api/test_route_coverage.py` pins 404
for the route against a dead backend. Te is ticked on that coverage: the two Playwright tests exist
on main at eca7078, where the e2e job of the cited solyra run passed 242 tests, the 22 cases of
`replaySession.test.ts` passed in that run's Vitest job, and the loader tests exist at the head of
the cited stocks run, whose `tests/` passed; what no test asserts is recorded in the matrix Charts
Gaps.

**Code:** `src/routes/ChartsPage.tsx:165-190,295-318,341-344,415-419,599-626`,
`src/components/charts/ReplaySessionControls.tsx:30-117`, `src/hooks/useReplaySession.ts:30-195`;
test ids `replay-start-btn`, `replay-controls`, `replay-play-pause-btn`, `replay-step-btn`,
`replay-speed-1x`, `replay-speed-5x`, `replay-speed-20x`, `replay-stop-btn`,
`replay-revealed-count`.

##### CHARTS-05 · Strategy conditions card

**Shows or does:** A card headed `Live Strategy Conditions` under the chart
(`src/components/charts/StrategyConditionsCard.tsx:27-64`, mounted at
`src/routes/ChartsPage.tsx:784-786` inside the compact `DataGate`, only with at least 14 bars in the
series). The heading's badge reads `CALL · n/5` or `PUT · n/5` when one side fires and `No setup`
otherwise (`src/components/charts/StrategyConditionsCard.tsx:68-97`). Below it are two columns,
`CALL` and `PUT`, each with `<met>/5`, ` ✓ fires` when that side fires, and five rows: a check or a
cross, the label, and the current value in monospace (`:99-159`). The rows are the chart teaching
voter of `lib/chart_voter.py`, not the production alerting voter and not the Live page's ten
conditions (Backend notes): CALL is `3 consecutive up moves` (the last three closes each above the
one before), `RSI 25–50 (bullish band)`, `StochRSI K < 80 (room to run)`, `Price > VWAP` and
`Price > EMA9`; PUT mirrors them with `3 consecutive down moves`, `RSI 50–75 (bearish band)`,
`StochRSI K > 20 (room to fall)`, `Price < VWAP` and `Price < EMA9`. A side fires with at least
three conditions met and strictly more than the other side (`lib/chart_voter.py:33-101`). The series
sent is the page's whole bar list for the day, extended hours included: the `RTH` toggle only
filters what the canvas draws, so the card describes the last bar of the day, not the last bar drawn
(executed 2026-09-30: with 192 five minute bars from 04:00 to 19:55 the request carried all 192
ending 19:55 and did not repeat when `RTH` was switched off; see Gaps). While a replay session runs
the series is the revealed bars (CHARTS-04).

**Needs:** `POST /api/live/indicators` (`platform/api/routers/live.py:527-607`, a plain `def`) with
`{bars, current_price, current_volume, avg_volume_20d}`: the page sends every bar as
`{time, open, high, low, close, volume}`, the last close as the price, the last bar's volume or
`null` and no 20 day average, and asks only with at least 14 bars
(`src/routes/ChartsPage.tsx:356-393`, `src/hooks/useLiveIndicators.ts:26-50`, 10 second stale time,
keyed on the bar count, the last bar's time, the price and the volume). The handler computes EMA 9,
20 and 50, RSI, StochRSI, ATR and a session VWAP from the bars with `lib/indicators.py` and returns
`indicators`, the Live page's `signals` and the `chart_voter` slice; the page reads `chart_voter`
only and the last RSI for CHARTS-06. A volume of `0` stands in for a candle with no matching volume
bar (`src/routes/ChartsPage.tsx:364-368`, the `AUDIT-2026-05-13` marker). No table is read: the bars
come from CHARTS-02. Production 2026-09-30: IWM one minute rows run to 2026-09-30 00:00 UTC and the
nightly jobs that write them succeeded (V-gate evidence, dispatch A statement 1). The route is gated
and answered 401 without a token (V-gate evidence).

**States:** While the request is pending, and after it has failed (a 401 included), the card is
rendered from `EMPTY_CHART_VOTER` (`src/routes/ChartsPage.tsx:60-64,393`): `No setup` and `0/5` in
both columns with no rows, the same as a live answer of no setup, and no error text (executed
2026-09-30 with the request held, with a 500 and with a 401; with the 401 the page banner also
showed, CHARTS-17). With fewer than 14 bars the card is absent (executed: 13 bars hid it, 14 showed
it). CHARTS-13 to CHARTS-15 name the loading and error text of the other cards; this one has none of
its own.

**Acceptance criteria:**
- Given at least 14 bars and an answer in which CALL fires with 3 of 5, when the page loads, then
  the heading, both columns' condition labels (`3 consecutive up moves`, `RSI 25–50 (bullish band)`,
  `3 consecutive down moves`, `RSI 50–75 (bearish band)`), the badge `CALL · 3/5` and the column
  suffix `3/5 ✓ fires` show (`Strategy Conditions card renders both CALL and PUT columns`,
  `tests/charts/charts-cards.spec.ts`; the mocked answer's shape is checked against the vendored
  OpenAPI schema by `src/mocks/contract.test.ts`).
- Given 30 rising closes, then the route answers a `chart_voter` with `total_count` 5 whose first
  CALL condition is `3 consecutive up moves` and met, and given no bars it answers `firing: null`
  with nothing met (`test_indicators_response_includes_chart_voter`,
  `test_empty_bars_returns_empty_voter`, `tests/api/test_live_chart_voter.py`).
- Given three conditions met against fewer on the other side, then the side fires; given two, or a
  tie, then neither does; a missing RSI counts as unmet; a short series counts the moves it has
  (`tests/lib/test_chart_voter.py`, seven cases).
- Given 13 bars, then the card is absent, and given 14 it shows (executed 2026-09-30); given the
  request held or failing, then `No setup` with `0/5` twice (executed 2026-09-30).
- Given bar times as epoch seconds, then the VWAP is computed per session and a millisecond epoch is
  rejected (`test_indicators_endpoint_vwap_sessionizes_epoch_times`,
  `test_indicators_endpoint_rejects_ms_epoch_bar_times`, `tests/api/test_live_signal_series.py`).
- Given a request with no token, then staging answers 401 (V-gate evidence).

**Tests:** The Playwright test above exists on main at eca7078 and asserts the card's labels, the
`CALL` badge and the firing suffix from a mocked answer; the pytest files above assert the route's
slice and the voter's rules, and `tests/api/test_route_coverage.py` pins 200 for an empty series
against a dead backend. No test asserts the PUT badge, `No setup`, the empty voter of a pending or
failed request, or the 14 bar threshold (executed only). Te is ticked on that coverage.

**Code:** `src/components/charts/StrategyConditionsCard.tsx:27-159`,
`src/routes/ChartsPage.tsx:56-64,329-393,780-786`, `src/hooks/useLiveIndicators.ts:6-50`,
`platform/api/routers/live.py:480-607`, `lib/chart_voter.py:33-101`; no test id.

##### CHARTS-06 · Similar setups card

**Shows or does:** A card headed `Similar Past Setups` under the Strategy conditions card
(`src/components/charts/SimilarSetupsCard.tsx:23-90`, mounted at
`src/routes/ChartsPage.tsx:792-816`, only with at least 14 bars). It asks one question about one
bar, the last bar of the series the page holds: did the mean-reversion voter fire on it
(`fires.find(f => f.bar_index === chartBars.length - 1)`, `:799-807`), and with which direction and
score. The series is the day's whole bar list, extended hours included, or the bars up to the review
time in review mode (executed 2026-09-30: the signal-series request ends at the day's last bar,
19:55 in the probe), so outside review mode the card is asking about the day's final bar. With no
fire, and during a replay session (the fires are forced empty, `:799`), it reads
`Waits for the voter to fire, no setup currently active.` With a fire it shows the badge
`CALL · score 4 · RSI ~55.0 (±5)` (the RSI is the last bar's RSI from the indicators answer,
CHARTS-05; the band is fixed at 5), then `Querying historical signals…` while the first answer is
pending (`src/components/charts/SimilarSetupsCard.tsx:60-65`), then four tiles, `Matches`,
`% profitable` (the 0 to 1 fraction times 100, two decimals), `Median MFE` and `IQR (p25–p75)` as
`+0.012% → +0.180%` (three decimals, `--` for a missing value; `:94-124`), and `Most recent matches`
as a table of `When` (the first 16 characters of the stored time, `2026-04-07 14:44`), `RSI`, `MFE`,
`+5 min` and `+20 min` (`:126-180`). An empty bucket reads
`No historical matches in this bucket yet. Try widening the RSI band or wait for the backfill to finish for this ticker.`
(`:69-73`); a failed request shows the error text in red, `similar-setups 503` for example
(`:83-87`).

**Needs:** `GET /api/signals/{ticker}/similar?direction&rsi&score&rsi_band=5&limit=10`
(`platform/api/routers/signals.py:321-442`, a plain `def`), asked only with a direction, an RSI and
a score (`src/hooks/useSimilarSetups.ts:54-82`, 60 second stale time). It counts
`historical_signals` rows for the ticker, `UPPER(trade_type)` equal to the direction,
`signal_strength` equal to the score and `entry_rsi` within the band
(`platform/api/routers/signals.py:354-356`), in one aggregate query and one newest-first list, both
strict through `_query_or_503`; there is no predicate on `strategy`. The answer is 503 without Cloud
SQL, 400 for a direction other than CALL and PUT, and 422 for a score outside 3 to 5, a band outside
0.5 to 20 or a limit outside 1 to 100. The table is written by `historical-signals-watchlist` (01:00
ET Tue to Sat) and read on 2026-09-30: IWM holds 190,159 rows to 2026-09-29 23:21 UTC, every one
labelled `momentum`, so the card reports the other voter's outcomes
([#912](https://github.com/TeneikaAskew/stocks/issues/912), Backend notes). Strengths 3 and 4 end on
2026-05-01 for IWM (backfill to 2026-04-13, live 2026-04-24 to 2026-05-01), strengths 5 and 6 run to
2026-09-29 (V-gate evidence, dispatch A statements 8 and 9); the handler's own predicate matched 242
rows for a CALL of score 4 at RSI 35 (earliest 2015-01-15, newest 2026-05-01) and 14,725 for a PUT
of score 3 at RSI 60 (newest 2026-05-01), and 679 for a PUT of score 5 with its newest on 2026-09-29
(dispatch A statement 10). The stored `entry_time` mixes both conventions (IWM `live` rows sit at
UTC hours 4 to 7, which only an Eastern stamp explains, 2,321 rows, and at hours 21 to 23, which
only a true UTC stamp explains, 1,516 rows; dispatch C statement 2), so the `When` column, which
prints the stored string with no zone, is in neither frame reliably. The handler's docstring
promises sub-100ms regardless of total row count (`:330-336`); `EXPLAIN (ANALYZE, BUFFERS)` measured
the stats query at 2,001 ms for the CALL of score 4 (an index scan of 18,984 rows for 242) and 1,592
ms for the PUT of score 3 (153,793 rows read for 14,725), and the match lists at 120 ms and 330 ms
(V-gate evidence, dispatch B). The route is gated and answered 401 without a token (V-gate
evidence).

**States:** The placeholder is the no-setup state; `Querying historical signals…`, the red error
line and the empty-bucket text are the card's own loading, error and empty states (executed
2026-09-30 with the request held, with a 503, with a 401 and with `stats.count` 0; the 401 also
raised the page banner, CHARTS-17). With fewer than 14 bars the card is absent.

**Acceptance criteria:**
- Given the page loads with a fire on the last bar, then the heading shows with either the stats
  grid or the placeholder (`Similar Setups card renders heading and either matches or placeholder`,
  `tests/charts/charts-cards.spec.ts`; either branch passes, and with the default mock the stats
  grid is the one that shows).
- Given a fire of CALL, score 4, RSI 55 and 240 matches, then the badge, the `Matches` tile 240,
  `% profitable` 85.80%, the median and the IQR show (executed 2026-09-30 against the default
  fixture; no test asserts them).
- Given `direction=BUY`, then 400; given `score=6` or `2`, or `rsi_band=25`, then 422; given no
  Cloud SQL, then 503; given an empty bucket, then `stats: {count: 0}` and no matches; given stats
  and two matches, then the direction is upper-cased and `time` is a string
  (`TestSimilarSignalsAPI` and `test_similar_is_503_when_the_cloud_sql_query_fails`,
  `tests/api/test_platform_api.py`). The newest-first order comes from the handler's
  `ORDER BY entry_time DESC` (`platform/api/routers/signals.py:425`), and the test only reads the
  order of the two rows its stub returns (`tests/api/test_platform_api.py:344-346`), so with the
  query stubbed no test asserts the ordering or the `WHERE` clause.
- Given the request held, failing or empty, then the loading line, the red error text or the
  empty-bucket text shows (executed 2026-09-30).
- Given a request with no token, then staging answers 401 (V-gate evidence).

**Tests:** The Playwright test above is the only test of the card and is either-or: it passes on the
stats grid and on the placeholder, and asserts neither the tiles nor the table, so it earns nothing.
The pytest class asserts the route's validation, shaping and failure answers with the query stubbed;
`tests/api/test_route_coverage.py` pins the route's status against a dead backend.
`tests/api/test_live_signal_series.py` asserts the `POST /api/live/signal-series` contract, the 14
bar minimum and the epoch-second times that decide the fire. No test asserts the `WHERE` clause, the
`When` column or the stale rows. Te stays unticked.

**Code:** `src/components/charts/SimilarSetupsCard.tsx:23-180`,
`src/routes/ChartsPage.tsx:392-393,792-816`, `src/hooks/useSimilarSetups.ts:54-82`,
`platform/api/routers/signals.py:321-442`, `gcp/schema.sql:2137-2177`; no test id.

##### CHARTS-07 · Backtester

**Shows or does:** The section at the foot of the page
(`src/components/backtest/BacktesterSection.tsx:344-467`, mounted at `src/routes/ChartsPage.tsx:819`
inside the compact `DataGate`, for any bar count). A heading `<ticker> Backtester` with the line
`N backtest run(s): viewing: <run timestamp>` (the raw `YYYYMMDD_HHMMSS`,
`src/components/backtest/BacktesterSection.tsx:385-395`) or `No backtest results found`; a select of
the run timestamps when there is more than one, newest first (`:396-408`); five metric cards from
the run's summary, `Total Trades`, `Win Rate` (the 0 to 1 fraction times 100, one decimal),
`Avg Return`, `Avg Win` and `Avg Loss`, each `—` for a missing field (`:425-453`); an `Equity Curve`
card with `Total: +1.2%` and `Max DD: -0.8%` and an area chart of the run's equity series
(`:150-223`), shown only when the run has an equity curve (`:367-371`); and a `Trade Log (N trades)`
table of `Entry`, `Dir`, `Entry $`, `Exit $`, `Return %`, `Exit` and `Score`, sortable, the first
200 rows with `Showing first 200 of N trades` (`:227-340,457-464`). The run selection is reset when
the ticker changes (`:347-353`). The equity chart's x axis formats its dates `MM/DD/YY` through
`fmtRunDate` (`:145-148,195`); that is the series' dates, not the run's age, which the section shows
only as the raw timestamp. The runs are not live: the newest object for any ticker was uploaded on
2026-02-23 and nothing writes them (Gaps), so the page shows results computed once, not a run over
the trader's own journal.

**Needs:** Three routes, all reading GCS through `platform/api/gcs_reader.py` and no table:
`GET /api/backtest/all/{ticker}` (`platform/api/routers/backtest.py:355-458`) lists the ticker's
`backtest_<TICKER>_<YYYYMMDD>_<HHMMSS>.csv` objects under `raw/data/backtest_results/`, newest
first, and for each run downloads and parses the whole CSV for its trade count, win rate and average
return, and checks for the matching `equity_` object; `GET /api/backtest/results/{ticker}?run=`
(`:188-254`) reads one run's CSV, converts the engine's fractional `return_pct` to percent (win rate
stays a fraction) and returns the summary and the rows; `GET /api/backtest/equity/{ticker}?run=`
(`:257-352`) reads the equity CSV and computes the start, end, peak, total return and maximum
drawdown. Results and equity are cached for one hour, the run list for ten minutes, and a concurrent
cold read is declined with 503 and `Retry-After: 5` (`:116-128,209-216,277-285,364-386`); a `run`
that is not `YYYYMMDD_HHMMSS` is 422 (`:183-185`). A listing that fails reads as an empty one, so a
GCS outage answers 404 (`platform/api/gcs_reader.py:75-95`; Gaps). A cold `/all/IWM` downloads 17
CSVs of 19.62 MiB in all to return 17 short rows; the listing is of the whole prefix, 111 objects
and 53.41 MiB, all uploaded between 2026-02-23T01:36:50Z and 10:40:04Z (read 2026-09-30, V-gate
evidence). The three routes are gated and answered 401 without a token (V-gate evidence).

**States:** `Loading backtest data…` while the list or a run is pending; `No backtest results found`
under the heading with no runs; an amber banner
`No backtest results for <ticker>. Run scripts/run_backtest.py --ticker <ticker> first.` for any
list or results error of any status (`src/components/backtest/BacktesterSection.tsx:411-417`;
executed 2026-09-30 with a 404 and a 401, and with the request held); no error state of its own for
a failed equity read, which only leaves the chart out. Its states are CHARTS-13 to CHARTS-15 and
CHARTS-17.

**Acceptance criteria:**
- Given two runs and a result of three trades with an equity curve, when the section renders, then
  it reads `2 backtest runs: viewing: 20260223_013654`, offers both timestamps, shows
  `Total Trades 3`, `Win Rate 66.7%`, `Total: +1.2%`, `Max DD: -0.8%` and `Trade Log (3 trades)`,
  and choosing the other run asks `GET /api/backtest/results/IWM?run=20260222_231417` (executed
  2026-09-30 against mocked answers; no test asserts the section).
- Given the list answering 404, then the banner and `No backtest results found` show, and given it
  held, `Loading backtest data…` (executed 2026-09-30).
- Given a fractional `return_pct` of 0.003, -0.002, 0.004 and -0.001, then the average is 0.1, the
  average win 0.35 and the average loss -0.15, in percent, and the win rate 0.5; the run pattern
  takes a timestamp, a malformed `run` is 422 and the `latest` and run cache entries do not collide
  (`tests/api/test_backtest_router_units.py`, five tests).
- Given a CSV of four trades, then the summary counts four with a win rate of 0.75; given an equity
  CSV, then the values come back whole and the maximum drawdown is -4.0; given one run, then `/all`
  counts one run of three trades; given no blobs, then 404 (`TestBacktestAPI`,
  `tests/api/test_platform_api.py`, GCS stubbed).
- Given an account-scale range, then the equity tick has no decimals, and a normalised range keeps
  decimals; given `2023-04-21`, then the axis label is `04/21/23` (`fmtEquityTick` and `fmtRunDate`,
  `src/components/backtest/BacktesterSection.format.test.ts`).
- Given a request with no token, then staging answers 401 for the three routes (V-gate evidence).

**Tests:** The pytest files above assert the router's units, cache keys, validation and shaping, and
`tests/api/test_route_coverage.py` pins 404 for the three routes against a dead backend (no GCS).
Vitest asserts two axis formatters; no test on main mounts the section, asserts a metric card, the
run select, the equity card, the table or any of its states, so its solyra coverage is
formatter-only. The replay-trainer specs mount the section with mocked answers and assert nothing
about it. Te stays unticked.

**Code:** `src/components/backtest/BacktesterSection.tsx:96-132,143-223,344-467`,
`src/routes/ChartsPage.tsx:819`, `platform/api/routers/backtest.py:101-458`,
`platform/api/gcs_reader.py:69-135`; no test id.

##### CHARTS-08 · Post-session scorecard

**Shows or does:** A modal titled `Backtest my trades, <ticker>`
(`src/routes/ChartsPage.tsx:827-858`, content test id `replay-scorecard`) that opens by itself when
a replay session ends. `useReplaySession.stop()` leaves a summary (CHARTS-04); the effect at
`:238-252` counts the page's journal trades for this ticker and date that carry the session's id and
whose status is not `active`; with at least one it opens the modal and posts `{ticker, session_id}`
to `POST /api/backtest/replay-trades` (no `trade_ids`,
`src/hooks/useJournalChartTrades.ts:572-600`), and with none it shows the note
`Session ended: no closed trades to score` and posts nothing (CHARTS-14). The modal shows
`Scoring your trades against the system benchmark…` while pending
(`src/routes/ChartsPage.tsx:833-837`), `Replay failed: <message>` in a red box on an error, with the
server's `detail` when there is one (`:838-842`), and otherwise one row per trade and a footer
(`:843-857`). A row (`ScorecardRow`, `:876-957`, test id `scorecard-row-<trade id>`) is, for a trade
the scorer could not price, a dashed box with the id and the server's `reason`; for a scored trade,
the id, an amber warning icon titled `Entry price was outside the entry bar's high/low range` when
the fill check says so, one badge of four (`system unavailable`, `no setup`, `match`, `differed`,
from the system's signal at the entry against the trade's own direction, which the page looks up
because the answer does not carry it), `Your return: +0.23%`, `System exit: time_stop +0.10%` and
`Edge: +13.00 bps`, each `—` when null (`:894-955`). The footer (`:974-1003`) reads
`<scored> / <n> scored · Win rate <x>%`, `Avg return: … · Avg edge: … bps` and
`Agreement: <x>%: system had a setup on <r> of <scored> entries` with ` · no setup on <k>` when the
system had none, the rates `—` when they are null. Changing the ticker closes the modal and clears
its answer (`:266-277`). The modal cannot be reached from this page as it stands: Mark Entry posts
no exit, so a session's trade is `active`
(`test_create_active_trade_without_exit_returns_null_return_pct`,
`tests/api/test_journal_phase2.py`), and the only caller of `startExitMode` is
[JournalPage.tsx:627](https://github.com/TeneikaAskew/solyra/blob/main/src/routes/JournalPage.tsx#L627),
on a page that unmounts this one and its session (Gaps). Production holds no trainer row to score:
`journal_entries` has two rows, one `chart` and active and one `manual` and closed, and none with
source `replay` (V-gate evidence, dispatch A statement 14).

**Needs:** `POST /api/backtest/replay-trades` (`platform/api/routers/backtest.py:512-594`, a plain
`def`, gated: 401 without a token, V-gate evidence). It answers 422 without `trade_ids` or
`session_id`, 503 `journal database not configured` without Cloud SQL, and reads the signed-in
user's rows of `journal_entries` for the ticker (`:526-550`), 404 `no matching trades found` for
none. It loads the 1-minute bars of every distinct entry date through `_load_date_data` (the loader
of CHARTS-02, `:572-592`; a date with no bars is left out and its trades are `unavailable` with a
reason) and hands the rows and bars to `lib/backtest.py` `replay_labeled_trades` (`:1128-1245`),
which scores each closed trade against the bars and benchmarks it: the system's signal at the entry
comes from the same ticker-agnostic mean-reversion voter as `POST /api/live/signal-series`
(`:1196-1203`), and its exit from `BacktestEngine.simulate_exit`, whose thresholds come from
`load_config(ticker=...)` and the per-ticker rows of `exit_config_overrides` (`:846-856,1211-1223`,
`lib/strategies/exit_config_overrides.py`). It returns the cards and an aggregate whose rates are
`null` when nothing was scored. A failed journal read is not the 500 the docstring promises:
`_replay_journal_query` forwards to the swallowing `query_to_dataframe`, so a probe with the
connection failing answered 404 `no matching trades found` (executed 2026-09-30, real handler;
Gaps). `exit_config_overrides` holds one row each for IWM, QQQ and SPY dated 2026-05-08 (V-gate
evidence, dispatch A statement 15).

**States:** Pending, error, the unavailable card and the null rates are the modal's states. Executed
2026-09-30 with mocked answers: a 404 read `Replay failed: no matching trades found`, a 401 read
`Replay failed: sign in to continue` with the page banner (CHARTS-17), and a held request read the
pending line. The session note is CHARTS-14.

**Acceptance criteria:**
- Given a session that ends with one closed trade tagged with its id, when Stop is pressed, then the
  post body is `{ticker: 'IWM', session_id: <id>}` with no `trade_ids`, and the modal opens with the
  row `scorecard-row-replay-closed-1`
  (`stop() with >=1 closed session trade POSTs {ticker, session_id} and opens the Task 3.3 scorecard modal`,
  `tests/charts/replay-trainer.spec.ts`).
- Given an active session trade only, when Stop is pressed, then `replay-session-end-note` reads
  `Session ended: no closed trades to score`, no request is sent and no modal opens
  (`stop() with zero closed session trades does not POST and shows an end-of-session note instead of the modal`,
  same file).
- Given five cards (a match, a differed, a no setup, a system unavailable and an open trade), then
  each row shows its badge, return, system exit and edge, the fill warning shows on the one flagged,
  and the footer reads `3 / 5 scored · Win rate 67%`, `Avg return: -0.06% · Avg edge: -3.50 bps` and
  `Agreement: 50%: system had a setup on 2 of 3 entries · no setup on 1` (executed 2026-09-30 with
  mocked answers; no test asserts the rows or the footer).
- Given closed and active trades, then the closed ones are scored and the active one is
  `unavailable`; given no ids, then 422; given no rows, then 404
  (`tests/lib/test_replay_labeled_trades.py`, the endpoint tests); given a clean win, an entry
  outside its bar, a date with no bars, a NaN entry price and all trades unavailable, then the card
  or the aggregate is scored, flagged, `unavailable` or null, never zero (the nine
  `TestReplayLabeledTradesLib` tests, same file).
- Given 120, -45.3, 0, and null or undefined, then `+120.00 bps`, `-45.30 bps`, `+0.00 bps` and
  the em dash placeholder (`formatEdgeBps`, four cases, `src/hooks/journalChartTrades.test.ts`).
- Given a request with no token, then staging answers 401 (V-gate evidence).

**Tests:** Both Playwright tests exist on main at eca7078. The first asserts the trigger, a closed
session trade posting `{ticker, session_id}` with no `trade_ids`, and the modal's opening with an
element carrying the trade's row test id, which the unavailable card and the scored card share; the
second asserts that with no closed trade the note shows, nothing is posted and no modal opens. The
scorer and the endpoint are asserted by `tests/lib/test_replay_labeled_trades.py` (twelve tests, the
bars and the journal stubbed; the endpoint ones send `trade_ids` and no pytest test passes
`session_id`, so the `WHERE` on the owner and the session,
`platform/api/routers/backtest.py:526-550`, is asserted by none); `tests/api/test_route_coverage.py`
pins 422 for the route. No test asserts what a row or the footer shows, the pending or error texts,
or the route's failure mode. Te stays unticked: the tests on main prove the trigger and the scoring
math, not the scorecard the trader reads, and a row test id shared by both card kinds is presence
only.

**Code:** `src/routes/ChartsPage.tsx:226-277,827-1003`,
`src/hooks/useJournalChartTrades.ts:493-611`, `platform/api/routers/backtest.py:461-594`,
`lib/backtest.py:846-856,1029-1245`; test ids `replay-scorecard`, `scorecard-row-<id>`,
`replay-session-end-note`.

##### CHARTS-09 · Change date or timeframe

**Shows or does:** Two controls of the toolbar (CHARTS-01). The date input
(`src/routes/ChartsPage.tsx:509-521`) sets the page's local date from a typed or picked
`YYYY-MM-DD`; an empty value is ignored, a value outside the list is accepted, and the input is
disabled in review mode, where the review date decides (CHARTS-16). The timeframe buttons `1m`,
`5m`, `15m`, `30m` and `1h` (`:66-72,538-553`) set `timeframe` in `settingsStore` to `'1'`, `'5'`,
`'15'`, `'30'` or `'60'` (`src/stores/settingsStore.ts:85,103-104`): the store's own state, not
persisted, so the default `5m` returns on a reload but survives in-app navigation (executed
2026-09-30: `15m` kept across a round trip to `/live` and back, `5m` after a reload). The active
button is the blue one. A change sends a new market-data request for the ticker, the date and the
timeframe (`/api/market/data/IWM/20260423?timeframe=30`, `src/hooks/useMarketData.ts:34-50`); each
combination is fetched once and then kept, because the query's stale time is Infinity. A new date
also asks for its reference levels (CHARTS-03), the gamma levels when `Gamma` is on (CHARTS-10) and,
for the new bars, the indicators and signal series (CHARTS-05, CHARTS-06); the journal trades are
one request per ticker and are not asked again (`useJournalChartTrades.ts:289-303`). The date
survives a ticker change: the local date is kept and asked for the new ticker. A typed date with no
bars answers 404 with `No data found in Cloud SQL or GCS for iwm date=20260425` (or
`No data for IWM on 20260425` when only the prior evening's last bar falls in the window; executed
2026-09-30 through the real handler), which the chart card shows under `Couldn't load this data`. A
timeframe or date change during a replay session leaves the session's count as it was (CHARTS-04).

**Needs:** `GET /api/market/dates/{ticker}` for the input's bounds (CHARTS-01) and
`GET /api/market/data/{ticker}/{date}?timeframe=N` (`platform/api/main.py:905-1016`), which
resamples the day's 1-minute rows on the clock (`_aggregate_timeframe`, `:1699-1709`): a 5 minute
bar opens at :00, :05 and so on, a 1 hour bar on the hour, so the hourly bar that opens at 09:00
holds 09:30 to 09:59 and the bars before it (executed 2026-09-30 through the real handler with 961
rows from 04:00 to 20:00 ET stored as true UTC: 193, 65, 33 and 17 bars for 5, 15, 30 and 60). An
`end_time` (review mode) is applied after the resample and keeps bars by their open time
(`:980-987`), so on `5m` a cutoff of 09:45 returns the 09:45 bar, whose close is that of 09:49; with
`15m` the bar that opens 09:45 closes at 09:59 and with `1h` a cutoff of 10:30 returns the 10:00 bar
through 10:59 (executed 2026-09-30 through the real handler: the closes were 103.492, 103.592 and
104.192 against 103.452 and 103.902 for the 1-minute bars at the cutoff; `1m` was exact; see Gaps).
The `timeframe` parameter takes any integer and treats 1 or less as no resample (`:909,977-978`).
Both routes are gated and answered 401 without a token (V-gate evidence).

**States:** The date input is disabled in review mode and empty until the list arrives; a failed day
request shows CHARTS-15; nothing else changes. Its states are CHARTS-13 to CHARTS-17.

**Acceptance criteria:**
- Given the dates `20260424`, `20260423` and `20260422`, when `15m`, `1h`, `1m` and `30m` are
  pressed in turn, then each request carries `timeframe=15`, `60`, `1` and `30`, and given
  `2026-04-23` typed, then the path carries `20260423`, and given `2026-04-10`, which is outside the
  list, then it carries `20260410`
  (`the timeframe buttons and the date input ask for bars at that resolution and on that day`,
  `tests/charts/charts-cards.spec.ts`, added on this branch).
- Given a ticker switch after a date was chosen, then the same date is asked for the new ticker
  (executed 2026-09-30 through the command palette).
- Given review mode, then the date input is disabled, the timeframe buttons are not
  (`src/routes/ChartsPage.tsx:538-553`) and the request carries `end_time` (executed 2026-09-30 for
  the default `5m`: `timeframe=5&end_time=09:45`).
- Given 120 one minute bars, then `timeframe=1` returns them whole and `end_time=10:30` returns 61;
  an invalid `end_time` is 400 (`test_market_data_full_day`, `test_market_data_end_time_filter`,
  `test_market_data_end_time_invalid_format`, `tests/api/test_platform_api.py`). No test requests a
  `timeframe` above 1 or calls `_aggregate_timeframe`.
- Given the list query run twice with no new bar, then it scans once, and a new bar invalidates the
  entry (`tests/api/test_market_dates_cache_expiry.py`).

**Tests:** The row's UI assertions are the new Playwright test above (solyra commit cd2c08b), added
on this branch and not yet run in CI; none on main asserts a timeframe button, the date input or the
store. The pytest files assert the dates caching and the `timeframe=1` path of the handler with
stubbed queries, and `tests/api/test_intraday_loader_conventions.py` the loader;
`tests/api/test_route_coverage.py` pins the two routes against a dead backend. Te stays unticked: it
waits for a CI run that includes the branch's tests.

**Code:** `src/routes/ChartsPage.tsx:66-76,129-133,509-553`,
`src/stores/settingsStore.ts:85,103-104`, `src/hooks/useMarketData.ts:34-63`,
`platform/api/main.py:905-1016,1699-1709`; no test id.

##### CHARTS-10 · Toggle overlays

**Shows or does:** Five toggle buttons in the toolbar (`src/routes/ChartsPage.tsx:555-611`), each a
piece of component state that is lost when the page unmounts: `Vol` (on, `:556-564`) shows the
volume histogram under the candles; `RTH` (on, `:566-574`) draws only bars whose open lies in the
regular session window (CHARTS-02); `Ref` (off, `:576-584`) draws four lines titled `Prev High`,
`Prev Low`, `Prev Open` and `Prev Close` from the reference levels (`:442-450`) and adds
`Prev: H / L` to the crosshair bar (CHARTS-03); `Gamma` (off, `:586-598`, rendered only for SPY,
IWM, QQQ and SPX, `:54,586`, though for SPX there is nothing to draw, see States) draws the chain's
levels for the chart date, `★ King <strike>` (gold), `◆ Gate <strike>` (blue),
`⇅ Gamma Flip <level>` and `≈ Gamma Balance <level>`, the last two only when the answer has them
(`:455-491`); `Sig` (off, `:600-611`, disabled with the title
`unavailable during replay` in a session) draws one arrow per fire of the mean-reversion voter,
green and below the bar for CALL, red and above for PUT, labelled `CALL 4` or `PUT 3` (`:420-430`).
An active toggle has the raised background. The toggles gate what is drawn, not what is asked: the
reference request and the signal series are requested on first paint whatever the toggles say
(executed 2026-09-30), the indicators and the signal series carry the whole day's bars and no new
request followed switching `RTH` off (executed: 192 bars ending 19:55), and only `Gamma` gates its
request (`:203-207`). A gamma request that fails draws nothing and says nothing: the page reads
`data` only, so a 404 for a date without a stored chain leaves the toggle active and the chart as it
was (executed 2026-09-30 with a 404). The `Sig` button's title says
`Production alert signals (lib/signals mean-reversion voter)`, which is true of the voter and not of
the configuration: the signal series is evaluated without a ticker, so the per-ticker overrides that
`gcp/signal_monitor.py` applies are not (Needs; Gaps).

**Needs:** The `RTH` window comes from `GET /api/config/market-hours`
(`platform/api/routers/config.py:131-143`, constants from `live.py`, no table; gated; 24 hour stale
time, and the browser's 09:30 to 16:00 when it fails, `src/hooks/useConfig.ts:68-78`). `Ref`:
`GET /api/market/reference/{ticker}/{date}` (CHARTS-03; `useReferenceLevels`, asked on every load).
`Gamma`: `GET /api/options/{ticker}/{YYYY-MM-DD}/levels` (`platform/api/routers/options.py:809-848`,
a plain `def`), which validates the ticker against SPY, IWM, QQQ and SPX (400), requires Cloud SQL
(503), loads the chain of the date's latest `etf_options_snapshots` row set with
`data_source = 'alphavantage'` (`:524-580`, cached 12 hours, 404 with the nearest date for none; the
query selects `gamma` and no `*_computed` column, `:562-579`) and builds the summary with
`lib/gamma.py` `build_summary`, whose flip uses the `daily_rates` row at or
before the date, at most seven days old, and is `null` without one (`lib/gamma.py:1076-1100`,
`lib/options_greeks.py:56-96,148-214`). The page sends no `window_pct` or `spot` and keeps the
answer for an hour with no retry (`src/hooks/useGammaLevels.ts:74-98`). `Sig`:
`POST /api/live/signal-series` (`platform/api/routers/live.py:610-669`, a plain `def`), 422 under 14
bars, which runs `lib.indicators.add_signal_indicators` and `lib.signals.generate_signals(df)` over
the bars with no ticker, so the per-ticker rows of `exit_config_overrides` (`disabled_conditions`,
`disabled_directions`, read through `evaluate_signal(ticker=...)`) do not apply, as they do in
`gcp/signal_monitor.py:1107-1113`. Production 2026-09-30: `exit_config_overrides` has IWM and QQQ
with `stoch_rsi_overbought` and `rsi_overbought_zone` disabled and QQQ's PUT side switched off, all
dated 2026-05-08, so the overlay can draw a PUT fire on QQQ that production never fires (V-gate
evidence, dispatch C statement 1); `etf_options_snapshots` holds an `alphavantage` snapshot for IWM,
SPY and QQQ at 19:40 UTC (the 5 minute job ran at 19:41), for SPX on 2026-09-29, whose 4,871
contracts carry no `gamma`, `delta`, `implied_volatility` or `gamma_computed` (executed 2026-09-30,
execution `db-query-gv8xf`), and IWM's newest chain has 5,600 contracts, all with gamma;
`daily_rates` runs to 2026-09-28 (dispatch A statements 11 to 13). Cloud SQL holds no SPX bars
(`market_data_intraday` and `market_data_daily` have no row for `SPX`, `^SPX` or `SPXW`, same
execution), so the dates list for SPX is empty and the toggle has no date to ask for unless one is
typed, and the legacy GCS files that the market-data loader falls to hold SPX minute files for
2025-09-02 to 2025-12-17 and a year file of daily rows for 2025-08-25 to 2025-12-17 (matrix Charts
Gaps). All routes are gated and answered 401 without a token (V-gate evidence).

**States:** `Sig` is disabled in a session; `Gamma` is absent for other tickers and present for SPX,
where it cannot draw: with no SPX bars in Cloud SQL the dates list is empty, no date is selected and
the toggle does nothing and says nothing (executed 2026-09-30 with SPX chosen in the combobox), a
typed date that the legacy GCS files do not hold, which is any outside 2025-08-25 to 2025-12-17 and
each weekend or holiday inside it, ends in the chart card's `Couldn't load this data` with no
canvas, a typed date they do hold draws a daily bar that the default `RTH` window hides or a day
stamped in UTC that the window cuts, and the newest SPX chain has no `gamma`, so the levels answer
would be the unavailable summary, which the page does not read (matrix Charts Gaps). `Ref` and
`Gamma` have no loading, empty or error text, and a failed read is indistinguishable from an empty
one: a Cloud SQL outage reads as a 404 that claims the ticker was never ingested,
`No AlphaVantage options data for IWM on 2026-09-04. No earlier data ingested for this ticker.`
(executed 2026-09-30 through the real handler with the connection refused), because the chain is
read with the swallowing `query_to_dataframe` (`platform/api/routers/options.py:580,591`). A
`daily_rates` lookup that raises leaves the flip `null` with no entry in the answer's `warnings`
(`lib/gamma.py:1086-1095`, read; executed 2026-09-30 through the real library), so the
`⇅ Gamma Flip` line is missing and nothing says why (matrix Charts Gaps). Its states are CHARTS-13
to CHARTS-17.

**Acceptance criteria:**
- Given the page loads, then `Vol` and `RTH` are active and `Ref`, `Gamma` and `Sig` are not, each
  press flips its own button, no levels request is sent until `Gamma` is on, then exactly
  `/api/options/IWM/2026-04-24/levels` is, and switching `Gamma` off and on again sends no second
  one; given the active ticker AAPL, then `Gamma` is not rendered and `Ref` is
  (`the overlay toggles flip their state, Gamma asks for the levels only once it is on, and it is absent for a non-ETF ticker`,
  `tests/charts/charts-cards.spec.ts`, added on this branch).
- Given IWM, then `Gamma` is visible, and pressing it changes its class
  (`Gamma toggle is visible for ETF tickers`, `clicking Gamma toggle changes its active styling`,
  `tests/shared/gamma-levels.spec.ts`); the third test of that file,
  `Gamma toggle is hidden for non-ETF tickers`, asserts only that the toggle is visible for IWM and
  says so in its comment.
- Given `Sig` pressed twice, then the button is visible and clickable and nothing more is asserted
  (`Sig overlay toggle is in the toolbar and is clickable`, `tests/charts/charts-cards.spec.ts`).
- Given a gamma request answering 404, then no message shows (executed 2026-09-30).
- Given SPX chosen in the combobox, then `Gamma` is rendered, the date input is empty and the chart
  card reads `Select a date to load chart data`, and pressing `Gamma` changes its class and sends no
  request (executed 2026-09-30 on a hermetic page; no test asserts it).
- Given the signal series, then the route's contract holds, under 14 bars is 422, epoch-second times
  are accepted and millisecond ones rejected (`tests/api/test_live_signal_series.py`); no test
  asserts that the overlay matches production's configuration.
- Given a chain, then the library summarises its levels, regime and flip (`tests/lib/test_gamma.py`,
  with `get_rate_and_yield` stubbed to a fixed rate and yield, `:19-23`); given a chain whose gamma
  is missing on every contract, then the summary is the unavailable one, regime `unknown` with a
  warning (`test_build_summary_all_gamma_missing_is_unavailable_not_zero`, same file); given a
  `daily_rates` lookup with no table, no row, a NULL column or a row more than seven days old, then
  the lookup raises `RateLookupError` (`tests/lib/test_options_greeks.py:352-396`). That
  `build_summary` then leaves the flip `null`, through the catch at `lib/gamma.py:1087-1095`, is
  asserted by no test (executed 2026-09-30 with the lookup raising: the flip `null`, the regime and
  the balance still resolved).
- Given a request with no token, then staging answers 401 for the four routes (V-gate evidence).

**Tests:** The two Playwright tests of `tests/shared/gamma-levels.spec.ts` that assert something and
the Sig presence test exist on main at eca7078; they assert that `Gamma` is visible and that a press
changes its class, and that `Sig` is clickable, which earns nothing for the toggles' behaviour. The
toggle states, the request gating and the non-ETF case are asserted only by the new test (solyra
commit cd2c08b), added on this branch and not yet run in CI. No test reads a drawn line or marker
(the canvas), the reference or levels routes through the page, or the `/levels` handler beyond
`tests/api/test_route_coverage.py`, which pins 404 for it and 200 for market-hours against a dead
backend; the reference route's branches are asserted by `TestReferenceAPI` as in CHARTS-03. Te stays
unticked: it waits for a CI run that includes the branch's tests.

**Code:** `src/routes/ChartsPage.tsx:54,81-85,203-207,415-494,555-611`,
`src/hooks/useGammaLevels.ts:41-98`, `src/hooks/useLiveIndicators.ts:79-97`,
`src/hooks/useMarketData.ts:82-93`, `platform/api/routers/options.py:524-580,809-848`,
`platform/api/routers/live.py:610-669`, `lib/signals.py:178-416`, `lib/gamma.py:1014-1112`; no test
id.

##### CHARTS-11 · Run a replay session

**Shows or does:** The action of a bar-replay practice session, from `Start replay` to Stop
(CHARTS-04), with the trade marking that only exists inside one. The Mark Entry button appears in
the toolbar's right-hand end only while a session is active (`src/routes/ChartsPage.tsx:639-685`);
pressing it starts the state machine of `useTradeMarking` (`src/hooks/useTradeMarking.ts:67-213`),
and the toolbar text walks the steps: `Click chart to set entry price`, then, after the click,
`Select CALL or PUT` with a `CALL` and a `PUT` button, then `Click TP1 (ESC to skip)`, `Click TP2`,
`Click TP3` and `Click Stop Loss (ESC to skip)`, with an `X` button to cancel at any step. The
clicks choose prices only: the entry's time is the open time of the last revealed bar, wherever on
the chart the click landed, so a practice trade can never carry a bar the reveal has not reached
(`:108-125`). `Esc` cancels at the entry and the direction step, skips the remaining take profits at
a take-profit step and skips the stop at the stop step, which completes the trade (`:181-196`). A
completed trade is posted by `useCreateChartTrade` (`src/hooks/useJournalChartTrades.ts:390-417`) to
`POST /api/journal/trades` with `ticker`, `direction`, `entry_date`, `entry_time` (the Eastern wall
clock of the pinned bar), `entry_price`, `stop_loss` and `take_profits` when set, `source: 'replay'`
and the session's id, and the journal list is fetched again so the trade appears as an entry arrow
and its lines (CHARTS-02). The trade has no exit, so it is `active`: nothing on this page closes it
and Stop therefore ends without a scorecard (CHARTS-08, CHARTS-14). The post has no failure path in
the page: `onTradeCreated` calls `mutate` with no error handler and nothing reads the mutation's
state, so a refused post drops the trade silently and the toolbar returns to `Mark Entry` as after a
success (executed 2026-09-30 with a 503: no alert, no message; see Gaps).

**Needs:** `POST /api/journal/trades` (`platform/api/routers/journal.py:1088-1143`, a plain `def`),
which builds `entry_ts` from `entry_date` and `entry_time` as a naive Eastern wall clock, derives
`status` (`active` with no exit) and inserts the row for the signed-in owner with `source` and
`session_id` into `journal_entries`; a Cloud SQL outage is 503 `journal temporarily unavailable`,
and a defect is a 500, never a local-file write in an authenticated deployment (`:1111-1128`). The
day's bars and the trades read are those of CHARTS-02; the reveal is CHARTS-04. The route is gated
and answered 401 without a token (V-gate evidence). Production 2026-09-30: `journal_entries` holds
two rows, one `chart` and active (2026-07-13) and one `manual` and closed, and none with source
`replay`, so the trainer's write has never landed in production (V-gate evidence, dispatch A
statement 14).

**States:** The chrome is one of five: absent (no session), `Mark Entry`, a prompt, the `CALL` and
`PUT` pair, and back. Mark Entry is absent outside a session
(`no Mark Entry button and no Trades (N) side panel outside an active replay session`,
`tests/charts/charts-cards.spec.ts`). CHARTS-16 names the hidden-trade count.

**Acceptance criteria:**
- Given a session with 17 of 30 bars revealed and a trade timed after them, when Start, two Steps
  and Mark Entry are pressed, then `1 trade hidden` shows, Sig is disabled, the prompts appear in
  order and, after the entry click, CALL, a take profit click and two `Esc`, the post body has
  `ticker: 'IWM'`, `direction: 'CALL'`, `source: 'replay'`, a session UUID,
  `entry_date: '2026-04-25'` and `entry_time: '09:47'`, the last revealed bar, wherever the entry
  was clicked
  (`start -> warm-start reveal -> step x2 -> Sig disabled -> future trade hidden -> Mark Entry POSTs source:replay pinned to the last revealed bar`,
  `tests/charts/replay-trainer.spec.ts`; the post is mocked).
- Given no session, then there is no Mark Entry button even with a closed trade on the day (the
  `charts-cards.spec.ts` test above).
- Given `Esc` at the entry step, then the drawing is cancelled and `Mark Entry` returns (executed
  2026-09-30).
- Given a post answering 503, then no message shows and the prompt chrome resets (executed
  2026-09-30).
- Given a posted trade without an exit, then the route answers `status: active` and a null return
  (`test_create_active_trade_without_exit_returns_null_return_pct`,
  `tests/api/test_journal_phase2.py`); given a fourth take profit, then the route refuses the
  request with 422, because the validator raises and does not truncate
  (`platform/api/routers/journal.py:225-230`; `test_take_profits_capped_at_three` posts four levels
  and asserts the 422, `tests/api/test_journal_phase2.py`), and the page sends at most three, its
  steps being `tp1` to `tp3` (`src/hooks/useTradeMarking.ts:126-132`); given an application defect,
  then the local file is not written
  (`test_post_does_not_fall_back_to_local_on_an_application_defect`,
  `tests/api/test_platform_api.py`); no test posts `source: 'replay'` or a `session_id` to the
  route.
- Given an epoch, then the journal date and time are the Eastern wall clock without a zone
  conversion, and the create body round-trips to the same minute
  (`src/hooks/journalChartTrades.test.ts`).
- Given a request with no token, then staging answers 401 (V-gate evidence).

**Tests:** The first Playwright test exists on main at eca7078 and asserts the flow above with the
request mocked; the reducers of `src/hooks/replaySession.test.ts` back the reveal. The server's
persistence of the replay source and session id is asserted by no test (the schema test only checks
that the `session_id` column is nullable, `tests/gcp/test_schema_journal_migration.py`), and no test
asserts a failed post; `tests/api/test_route_coverage.py` pins 200 for the post against a dead
backend, which is the open-dev local file redirected to a tmp directory. Te stays unticked.

**Code:** `src/routes/ChartsPage.tsx:105-106,223,639-685,750`,
`src/hooks/useTradeMarking.ts:67-213`, `src/hooks/useJournalChartTrades.ts:114-140,390-417`,
`src/hooks/useReplaySession.ts:135-195`, `platform/api/routers/journal.py:1088-1143`; test ids as
CHARTS-04.

##### CHARTS-12 · Backtest my trades

**Shows or does:** Nothing on the page offers it. The design seed's on-demand `Backtest my trades`
button, which scored chosen journal trades, went with the side panel it lived in; what remains is
the modal it opened, now titled `Backtest my trades, <ticker>`
(`src/routes/ChartsPage.tsx:827-831`), and a code path for it: `useReplayTrades` still accepts
`tradeIds` beside `sessionId` (`src/hooks/useJournalChartTrades.ts:552-562`), but its only caller is
this page, and the only call sends `sessionId` from the effect that runs when a replay session stops
(`src/routes/ChartsPage.tsx:238-252`, `:226-229` says so). So the action exists only as the
post-session scorecard of CHARTS-08, and that path is closed on this page: a session's trade is
`active` because Mark Entry posts no exit (CHARTS-11), and nothing here closes a trade
(`startExitMode` is called only from JournalPage, `:218-221`, see Gaps). So from this page alone a
session ends with `Session ended: no closed trades to score` (CHARTS-14) and the modal never opens.
The seed's journey 3 (Backtest your own trades) cannot be walked: the Backtester section (CHARTS-07)
shows runs computed once in February 2026, not a scoring of the trader's own journal.

**Needs:** The same route as CHARTS-08, `POST /api/backtest/replay-trades`, which accepts
`trade_ids`, a `session_id` or both (`platform/api/routers/backtest.py:471-474,520-550`); it is
reachable from a browser session only through the scorecard. The route is gated and answered 401
without a token (V-gate evidence).

**States:** None of its own; the modal's states are CHARTS-08's.

**Acceptance criteria:**
- Given the page outside a replay session, even with a closed trade on the day, then there is no
  button named `Backtest my trades`, no `Mark Entry`, no `Trades (N)` panel and no `My style` tab
  (`no Mark Entry button and no Trades (N) side panel outside an active replay session`,
  `tests/charts/charts-cards.spec.ts`).
- Given a session whose trades are all `active`, when Stop is pressed, then no request is sent and
  the note shows
  (`stop() with zero closed session trades does not POST and shows an end-of-session note instead of the modal`,
  `tests/charts/replay-trainer.spec.ts`).
- Given a closed trade tagged with the session's id, which no action of this page can produce, then
  the scorecard opens (CHARTS-08; the test seeds the trade and stubs the session id).
- Given `trade_ids` or `session_id`, then the route scores the trades, and given neither, 422
  (`tests/lib/test_replay_labeled_trades.py`).

**Tests:** The first test of `tests/charts/charts-cards.spec.ts` named above exists on main at
eca7078 and asserts that the button, `Mark Entry`, the panel and the tab are absent; it does not
assert that the scorecard is reachable or unreachable. The two scorecard tests and the scorer's
pytest file are CHARTS-08's. No test drives a session to a scorecard without a seeded closed trade,
so the path the row describes is asserted nowhere. Te stays unticked.

**Code:** `src/routes/ChartsPage.tsx:218-229,238-252,827-831`,
`src/hooks/useJournalChartTrades.ts:552-600`, `platform/api/routers/backtest.py:471-474,512-594`; no
test id.

##### CHARTS-13 · State: loading

**Shows or does:** Four pieces of loading text and a skeleton, each owned by one element. The chart
card (CHARTS-02) shows `WidgetSkeleton` while the market-data query is loading: six grey pulse bars
in a `role="status"` block labelled `Loading` (`src/routes/ChartsPage.tsx:717`,
`src/components/shared/WidgetState.tsx:11-27,93-107`). The query is disabled until a ticker and a
date exist, so while the dates list is still pending, or after it failed, the card is not loading:
it reads `Select a date to load chart data` (CHARTS-14; executed 2026-09-30 with the dates request
held for four seconds: no skeleton, the text, then the chart when the list arrived). The Similar
setups card shows a spinner and `Querying historical signals…` while its first answer is pending and
a direction is known (`src/components/charts/SimilarSetupsCard.tsx:60-65`). The Backtester shows
`Loading backtest data…` while the run list or the run's results are pending and neither has failed
(`src/components/backtest/BacktesterSection.tsx:419-423`). The scorecard modal shows
`Scoring your trades against the system benchmark…` while its request is pending
(`src/routes/ChartsPage.tsx:833-837`). Four places show nothing or something else while their
request is pending: the dates input is empty; the Strategy conditions card reads `No setup` with
`0/5` in both columns, the same as a real answer of no setup (CHARTS-05); the `Prev` piece, the
gamma lines and the Sig markers are absent; and the Strategy and Similar cards are absent until the
series holds 14 bars.

**Needs:** The requests of CHARTS-01 to CHARTS-03, CHARTS-05 to CHARTS-08 and CHARTS-10; none of its
own.

**States:** This row is a state.

**Acceptance criteria:**
- Given the market-data request held, when the page renders, then the chart card holds the skeleton
  and no canvas, and when the request answers the skeleton goes and the chart shows (executed
  2026-09-30).
- Given the dates request held, then the date input is empty and the card reads
  `Select a date to load chart data`, with no skeleton (executed 2026-09-30).
- Given the similar request held after a fire, then `Querying historical signals…` shows; given the
  run list held, then `Loading backtest data…` shows; given the scorecard request held, then
  `Scoring your trades against the system benchmark…` shows (executed 2026-09-30 with mocked, held
  answers).
- Given the indicators request held, then the Strategy conditions card reads `No setup` (executed
  2026-09-30; see CHARTS-05 and Gaps).

**Tests:** None. No test holds a request to observe a loading state:
`src/components/shared/WidgetState.test.ts` asserts `isAuthError` and `errorMessage` only, and the
Playwright specs answer every request at once. No test reads a loading line or the skeleton. Te
stays unticked.

**Code:** `src/routes/ChartsPage.tsx:717,833-837`,
`src/components/shared/WidgetState.tsx:11-27,93-115`,
`src/components/charts/SimilarSetupsCard.tsx:60-65`,
`src/components/backtest/BacktesterSection.tsx:419-423`; no test id.

##### CHARTS-14 · State: empty

**Shows or does:** The page's empty texts. The chart card reads
`No market data available for this date` with `Markets may be closed (weekend or holiday)` when a
day's answer has no bars (`src/routes/ChartsPage.tsx:765-770`), and
`Select a date to load chart data` when there is no answer at all, which covers a date not yet
chosen, a dates request that is pending, failed or empty, and a query not yet enabled (`:771-775`;
executed 2026-09-30 with a 503, an empty list and a 401 on the dates request). The real handler
never sends a 200 with no bars: an empty day is a 404
(`platform/api/main.py:927-928,973-974,989-990`), so a day with no rows reads as an error,
`Couldn't load this data` with `No data found in Cloud SQL or GCS for iwm date=20260425` (executed
2026-09-30 through the real handler, CHARTS-15), and the two-line empty text is reached only by an
answer with `count` 0 (executed with a mocked one; Gaps). The toolbar note
`Session ended: no closed trades to score` (`src/routes/ChartsPage.tsx:245-247`, test id
`replay-session-end-note`, CHARTS-08) follows a session that ends with no closed trade of its own,
which from this page alone is every session. The Similar setups card reads
`Waits for the voter to fire, no setup currently active.` without a fire and
`No historical matches in this bucket yet. Try widening the RSI band or wait for the backfill to finish for this ticker.`
for an empty bucket (`SimilarSetupsCard.tsx:27-38,69-73`). The Backtester reads
`No backtest results found` under its heading with no runs (`BacktesterSection.tsx:390-394`), with
the amber banner of CHARTS-15 when the request failed. The Strategy conditions and Similar cards are
absent below 14 bars (`src/routes/ChartsPage.tsx:784,792`). A trade list with no trades draws
nothing and says nothing.

**Needs:** The requests of CHARTS-01, CHARTS-02 and CHARTS-05 to CHARTS-08; none of its own.

**States:** This row is a state.

**Acceptance criteria:**
- Given an answer with no bars, then the card reads `No market data available for this date` and
  `Markets may be closed (weekend or holiday)`, and given a failed dates request, then
  `Select a date to load chart data` (executed 2026-09-30 with mocked answers).
- Given a session whose only trade is active, when Stop is pressed, then the note shows, no request
  is sent and no modal opens
  (`stop() with zero closed session trades does not POST and shows an end-of-session note instead of the modal`,
  `tests/charts/replay-trainer.spec.ts`; exists on main at eca7078).
- Given a bucket of no matches, then the empty-bucket text shows, and given no fire, the placeholder
  (executed 2026-09-30 with mocked answers).
- Given 13 bars, then the Strategy conditions and Similar cards are absent, and given 14 they show
  (executed 2026-09-30).
- Given no run, then `No backtest results found` shows (executed 2026-09-30).

**Tests:** One test on main asserts one of these texts, the session note, in
`tests/charts/replay-trainer.spec.ts`.
`Similar Setups card renders heading and either matches or placeholder`
(`tests/charts/charts-cards.spec.ts`) passes on the stats grid or on the placeholder and, with the
default mock, shows the stats grid, so it asserts no empty text. Nothing asserts the chart's two
empty texts, the empty-bucket text or the backtester's. Te stays unticked.

**Code:** `src/routes/ChartsPage.tsx:245-247,765-775,784,792`,
`src/components/charts/SimilarSetupsCard.tsx:27-38,69-73`,
`src/components/backtest/BacktesterSection.tsx:390-394`,
`platform/api/main.py:927-928,973-974,989-990`; test id `replay-session-end-note`.

##### CHARTS-15 · State: error

**Shows or does:** Four error presentations, and a longer list of failures that have none. The chart
card (`src/routes/ChartsPage.tsx:717`, `src/components/shared/WidgetState.tsx:29-62,93-115`) shows
`WidgetError`, a `role="alert"` block with `Couldn't load this data`, the error's text and a `Retry`
button that refetches: the market-data hook throws the server's `detail`, so the text is the
handler's own, `No data found in Cloud SQL or GCS for iwm date=20260425` for a day with no rows
(executed 2026-09-30 through the real handler), or the server's words for a 500 (executed with
mocked answers). The error branch written inside the card at `src/routes/ChartsPage.tsx:722-733`,
which would show `No market data available for this date` for a message containing `No data`, can
never render, because `WidgetState` answers an error first (executed 2026-09-30 with a mocked error;
Gaps). The Similar setups card prints the raw error, `similar-setups 503`, in red
(`src/components/charts/SimilarSetupsCard.tsx:83-87`). The Backtester shows one amber banner,
`No backtest results for <ticker>. Run scripts/run_backtest.py --ticker <ticker> first.`, for a
failed run list or a failed results request whatever the status (`BacktesterSection.tsx:411-417`;
executed with a 404 and a 401; a 503 or a storage outage reads the same, CHARTS-07). The scorecard
modal shows `Replay failed: <message>` with the server's `detail` or
`replay-trades failed: <status>` (`ChartsPage.tsx:838-842`, `useJournalChartTrades.ts:583-596`;
executed with a 404 and a 401). These reads fail without any text: the dates list (the card reads
`Select a date to load chart data`), the reference levels (no `Prev`), the journal trades (no trade
is drawn, and Stop then says `no closed trades to score`), the gamma levels (no lines), the
indicators (the Strategy card reads `No setup`), the signal series (no markers, no similar setup),
the equity curve, the market-hours window (the browser's 09:30 to 16:00 stands in), and the post of
a Mark Entry trade (CHARTS-11). Executed 2026-09-30 with a 503 or a 404 on each: no alert and no
message appeared for the dates, the reference, the journal, the gamma levels and the Mark Entry
post; for the indicators, `No setup`.

**Needs:** The requests of CHARTS-01 to CHARTS-03, CHARTS-05 to CHARTS-08, CHARTS-10 and CHARTS-11
and the error texts their handlers send (each row's Needs). The query client retries a failed query
once (`src/App.tsx:30-36`), so an error shows after one retry.

**States:** This row is a state. A 401 is CHARTS-17.

**Acceptance criteria:**
- Given the market data answering 404 or 500, then the chart card shows `Couldn't load this data`,
  the server's text and `Retry` (executed 2026-09-30 with mocked answers); the helper that turns an
  error into the text expands a bare status code, passes a message through and returns nothing for
  an empty one (`errorMessage`, `src/components/shared/WidgetState.test.ts`).
- Given the similar request answering 503, then `similar-setups 503` shows in red (executed
  2026-09-30).
- Given the run list answering 404, then the amber banner shows (executed 2026-09-30).
- Given the scorecard answering 404, then `Replay failed: no matching trades found` shows (executed
  2026-09-30).
- Given the journal read answering 500, then no trade is drawn and no message shows (executed
  2026-09-30).

**Tests:** `src/components/shared/WidgetState.test.ts` asserts the two helpers: three cases for
`isAuthError` and three for `errorMessage`. No test renders `WidgetError`, asserts any of the other
presentations, or asserts a silent failure. Te stays unticked.

**Code:** `src/routes/ChartsPage.tsx:222,717-733,838-842`,
`src/components/shared/WidgetState.tsx:29-115`, `src/components/charts/SimilarSetupsCard.tsx:83-87`,
`src/components/backtest/BacktesterSection.tsx:411-417`,
`src/hooks/useJournalChartTrades.ts:583-596`, `src/App.tsx:30-36`; no test id.

##### CHARTS-16 · State: stale

**Shows or does:** The page has no stale badge. It tells the reader that what is on screen is not
what was asked for in three places, and says nothing about age anywhere else. `ⓘ Snapped to <date>`
(amber, title `<review date> was not a trading day`, `src/routes/ChartsPage.tsx:522-526`) shows in
review mode when the review date is not in the dates list and the page fell back to the nearest
earlier date (`:136-150`; executed 2026-09-30: a review date of 2026-04-27 read
`Snapped to 2026-04-24`). The note is missing in one case: a review date older than every listed
date falls to the oldest listed one and `snappedFromReview` stays false, so the page shows a day
other than the one asked for with no note (executed 2026-09-30: a review date of 2026-04-20 showed
2026-04-22 with no note; Gaps). `N trade(s) hidden` (amber, title
`Trades after review cutoff are hidden`, `:527-531`) counts the user's trades timed after the review
cutoff or after the last revealed bar of a replay session, which the chart and the scorecard do not
see (`:279-318`; executed: `1 trade hidden` in a session and in review mode). The Backtester prints
the run it shows as a raw `YYYYMMDD_HHMMSS` in `viewing: <timestamp>` and in its select
(`BacktesterSection.tsx:390-408`), with no age. Nothing else is marked: the bars carry no as-of, the
dates list's `source`, which reads `cloud_sql (stale, refresh in flight)` while a refresh runs
(`platform/api/main.py:717-718`), is not read, the reference's `stale_days` is fetched and not read
(`src/hooks/useMarketData.ts:65-80`), the similar card's newest match is not dated as stale, and the
equity curve's `MM/DD/YY` axis (`fmtRunDate`, `BacktesterSection.tsx:143-148,195`) formats the
series' dates, not the run's age. The page's own freshness rules are the stale times of its queries:
the bars and the reference never (Infinity), the dates list five minutes, the journal, indicators
and signal series ten seconds, the similar setups a minute, the backtester thirty seconds and the
gamma levels an hour.

**Needs:** The review date and time of `reviewDateStore` (`src/stores/reviewDateStore.ts:13-19`, set
by the Replay control in the header, in memory) and the dates list (CHARTS-01); for the hidden
count, the journal trades (CHARTS-02) and the last revealed bar (CHARTS-04); for the run timestamp,
the list of CHARTS-07. Production 2026-09-30: the dates list ends at 2026-09-29 and the nightly jobs
that write the bars succeeded (V-gate evidence); the similar card's rows for strengths 3 and 4 end
on 2026-05-01 (CHARTS-06).

**States:** This row is a state.

**Acceptance criteria:**
- Given one trade timed after the 15th revealed bar, when a session starts, then `1 trade hidden`
  shows and stays after two Steps
  (`start -> warm-start reveal -> step x2 -> Sig disabled -> future trade hidden -> Mark Entry POSTs source:replay pinned to the last revealed bar`,
  `tests/charts/replay-trainer.spec.ts`; exists on main at eca7078).
- Given review mode with a review time before a trade, then the trade is hidden and counted
  (executed 2026-09-30 with a review time of 09:45).
- Given a review date that is not in the list, then the page shows the nearest earlier listed date
  with `Snapped to <date>`, and given one older than the oldest listed date, then it shows the
  oldest with no note (executed 2026-09-30).
- Given a run list, then the run timestamp is shown as stored (executed 2026-09-30).

**Tests:** The first replay test asserts the hidden-trade count in a session; no test asserts
`Snapped to`, the hidden count in review mode or the run timestamp.
`BacktesterSection.format.test.ts`'s `fmtRunDate` test asserts an axis label (`2023-04-21` to
`04/21/23`) and says nothing about a run's age. Te stays unticked.

**Code:** `src/routes/ChartsPage.tsx:136-150,279-318,522-531`,
`src/components/backtest/BacktesterSection.tsx:143-148,385-408`,
`src/stores/reviewDateStore.ts:13-19`; no test id.

##### CHARTS-17 · State: permission

**Shows or does:** Three sign-in surfaces, and a fourth that looks like one and is not.
`SignInBanner` with the label `chart data` heads the page (`src/routes/ChartsPage.tsx:501`,
`src/components/shared/SignInEmptyState.tsx:58-84`): a `role="alert"` bar reading
`Sign in to load chart data` and
`Your session has expired or you are signed out. Authenticate to stream live data here.` with a
`Sign in` button that reloads the page. It renders while `useAuthBlocked()` is true and has no
signed-in check. `blocked` is the global flag that `authedFetch` sets when a gated `/api/*` call
answers 401, after one retry with a freshly minted token when a token was sent, and clears when any
later gated call succeeds (`src/lib/authedFetch.ts:155-166,226-250`, `src/lib/authGate.ts:14-47`),
so it reflects the last gated answer, not any 401: a 401 on the market data, the dates, the
indicators, the signal series or the similar request left the banner up, while a 401 on the
reference or on the backtest list did not, because later successful answers cleared it (executed
2026-09-30 in open mode, the other routes answering). The compact `DataGate` around the Strategy
conditions, Similar setups and Backtester cards (`src/routes/ChartsPage.tsx:780-820`) swaps them for
`SignInEmptyState` (`Sign in to load data`) only when `blocked && !isLoading && !isSignedIn`
(`SignInEmptyState.tsx:93-98`); `isSignedIn` is the Firebase state in firebase mode and always true
in `iap` and `open` mode (`src/hooks/useUser.ts:81`), and in firebase mode a signed-out visitor
never reaches the page, because `AuthGate` wraps every app route
(`src/components/auth/AuthGate.tsx:14-30`, `src/App.tsx:70-90`, `/charts` at `:86`), so no path was
found on which the card-level sign-in state renders here. The chart card is the look-alike: a 401 on
the market data shows `WidgetError`, `Couldn't load this data` with `sign in to continue` and
`Retry`, not `SignInEmptyState`, because `WidgetState` routes to the sign-in state only when the
error text matches `/\b401\b/` or `/unauthor/i` (`WidgetState.tsx:75-78,108-113`) and the hook
throws the server's `detail`, `sign in to continue` (the server's other 401 text,
`invalid or expired sign-in`, misses it too; executed 2026-09-30; Gaps). The other widgets say it
their own way: the similar card prints `similar-setups 401`, the scorecard
`Replay failed: sign in to continue`, the backtester its amber `No backtest results for <ticker>`
banner, and the dates, reference, journal, gamma, indicators and signal-series reads fail silently
(CHARTS-15).

**Needs:** The 401 of a gated route (`platform/api/auth.py:69-70,180-185,205-208`): only `/api/me`
itself, `/api/health`, `/api/config/firebase` and `/api/waitlist` are open, so every route this page
calls is gated. Staging answered 401 `{"detail":"sign in to continue"}` without a token for all
fourteen requests of the page: `GET /api/market/dates/IWM`,
`/api/market/data/IWM/20260929?timeframe=5`, `/api/market/reference/IWM/20260929`,
`/api/journal/trades/IWM`, `POST /api/journal/trades`, `POST /api/live/indicators`,
`POST /api/live/signal-series`,
`GET /api/signals/IWM/similar?direction=CALL&rsi=35&score=4&rsi_band=5&limit=10`,
`/api/backtest/all/IWM`, `/api/backtest/results/IWM`, `/api/backtest/equity/IWM`,
`POST /api/backtest/replay-trades`, `GET /api/options/IWM/2026-09-29/levels` and
`/api/config/market-hours`, while `GET /api/config/firebase` answered 200 with `authMode: firebase`
(V-gate evidence, 2026-09-30).

**States:** This row is a state.

**Acceptance criteria:**
- Given no token, when each request above is issued against staging, then each answers 401
  `{"detail":"sign in to continue"}` (V-gate evidence, 2026-09-30).
- Given a 401 on the market data, then the page banner `Sign in to load chart data` and, in the
  chart card, `Couldn't load this data` with `sign in to continue` show; given a 401 on the
  scorecard, then `Replay failed: sign in to continue` shows (executed 2026-09-30 in open mode).
- Given a 401 on a route while the others answer, then the banner shows or not by which answer came
  last (executed 2026-09-30: up for the market data, the dates, the indicators, the signal series
  and the similar request; down for the reference and the backtest list).
- Given the journal route and no token in firebase mode, then it answers 401, and with a valid one
  200 (`test_examples_requires_auth_like_trades_get`, `tests/api/test_journal_examples.py`).
- Given an error message, then `isAuthError` is true for a 401 status text and for `unauthorized`
  and false for other failures (`src/components/shared/WidgetState.test.ts`, three cases); the
  test's cases include no `sign in to continue`.
- Given a gated 401, then `authedFetch` calls `onUnauthorized` if one is registered
  (`a 401 from a gated path fires onUnauthorized`, `src/lib/authedFetch.test.ts`); nothing in the
  app registers one, and no test reads `markAuthBlocked` or `useAuthBlocked`.
- Given firebase mode and a signed-out user, then the sign-in screen shows instead of the shell
  (`tests/shared/auth-gate.spec.ts`, on `/dashboard`).

**Tests:** As above. No test loads this page with a 401, asserts the banner, `DataGate` or the chart
card's text, or asserts that `isAuthError` fits the server's real 401 text. The helper's cases pass
for the strings they carry and miss the string the server sends. Te stays unticked.

**Code:** `src/components/shared/SignInEmptyState.tsx:12-98`,
`src/components/shared/WidgetState.tsx:74-115`, `src/lib/authedFetch.ts:155-166,226-250`,
`src/lib/authGate.ts:14-47`, `src/hooks/useUser.ts:81`, `src/components/auth/AuthGate.tsx:14-30`,
`src/routes/ChartsPage.tsx:501,780-820`, `platform/api/auth.py:69-70,180-185,205-208`; no test id.

### SCREEN-OPTIONSFLOW — `/options`

- **Purpose:** Options flow, Greeks and the 2-D strike x expiration gamma grid.
- **Matrix:** [03 § 07](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#07--options-flow)
- **Status:** Production but needs remediation · **Blocking issue:** [#826](https://github.com/TeneikaAskew/stocks/issues/826) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/OptionsFlowPage.tsx` (71 lines)
- **Child components:** `TickerCombobox`, `GammaMapSection` (`SwingMode`, `TrinityTab`), `FlowSection` (`FlowTab`, `ContractDrilldown`), `ProfilesTab`, `SignInBanner`, `DataGate`
- **API calls (from source):** none found in the page component — issued by child components or hooks
- **Stores:** `useTickerStore`
- **E2E specs:** `tests/options/options-flow.spec.ts`, `tests/options/demo-banners.spec.ts`, `tests/options/options-mobile-fit.spec.ts`, `tests/shared/gamma-levels.spec.ts`, `tests/shared/navigation.spec.ts` (the `Refresh` and `Glossary` test)
- **PR lineage:** [#255](https://github.com/TeneikaAskew/stocks/pull/255) Cloudflare→FastAPI cutover · [#540](https://github.com/TeneikaAskew/stocks/pull/540)/[#541](https://github.com/TeneikaAskew/stocks/pull/541) grid math + endpoints · [#645](https://github.com/TeneikaAskew/stocks/pull/645) wire Swing Mode to real /grid
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/options/dates/{ticker} | dates[] (types: `useOptionsDates.ts` OptionsDatesResponse; fixture: `tests/helpers/fixtures/options.ts`); Swing and Trinity ask with `?limit=1` and read the first date, Profiles asks for the whole list | fetch-av-options-realtime every 5min 09:00-15:55 ET Mon-Fri (SPY IWM QQQ) and fetch-av-options-backfill 21:00 ET Mon-Fri (SPY IWM QQQ SPX) → etf_options_snapshots | 5min staleTime; the server holds a list for 12h behind a newest-date probe | `useLatestOptionsDate` → Swing Mode and Trinity Mode (the newest date); `useAllOptionsDates` → the Profiles date stepper |
| GET /api/options/{ticker}/grid (live) · GET /api/options/{ticker}/{date}/grid (historical) | data_source, snapshot_ts, spot, gamma_balance, gamma_flip, regime, total_gex, total_vex, cells[] (strike, expiration, gex, vex), expirations, strikes, warnings, reason (types: `useGammaGrid.ts` GammaGridCell/GammaGridSummary) | etf_options_snapshots (the newest REALTIME snapshot within 20 days, else the newest EOD one; an on-demand AlphaVantage fetch for a ticker outside SPY IWM QQQ) and daily_rates | live grid refetches every 60s (50s staleTime); historical holds 1h | `useGammaGrid` → Swing Mode |
| GET /api/options/{ticker}/{date}/levels | spot, kings, gates, levels, gamma_balance, gamma_balance_levels, gamma_flip, regime, total_gex, warnings, chain_size (types: `useGammaLevels.ts` GammaLevelsResponse) | etf_options_snapshots (the date's newest snapshot) and daily_rates | 1h staleTime | `useGammaLevels` → Swing Mode legend, Trinity Mode, Profiles taxonomy |
| GET /api/options/{ticker}/{date} · GET /api/options/live/{ticker}/{date} | options[] chain records, snapshot_timestamp, metadata.source (types: `ProfilesTab.tsx` OptionsResponse) | etf_options_snapshots (the date's newest snapshot, written by fetch-av-options-backfill 21:00 ET Mon-Fri or fetch-av-options-realtime) · AlphaVantage HISTORICAL_OPTIONS for the live proxy, asked after a 404 | 1h staleTime | `useOptionsData` (inline in `ProfilesTab`) → Profiles chain |
| POST /api/options/greeks | aggregated[], gex_by_strike[] (gex, call_gex, put_gex), metrics (total_gex, total_vex, zero_gamma, max_pain, implied_move, put_call_ratio), nodes, config (types: `useOptionsGreeks.ts` GreeksResponse) | computed in `lib/gamma.py` from the chain rows in the request body; no table is read | 60s staleTime, keyed on the contract count and the spot, not on the date or the ticker (a date step can leave the previous date's Greeks on the cards, matrix Gaps) | `useOptionsGreeks` → Profiles Greeks and gamma profile |
| GET /api/insights/ticker/search · GET /api/market/coverage · POST /api/insights/watchlist/add | matches[], coverage flags, watchlist add result (types: `useTickerSearch.ts` TickerSearchResult/CoverageResult/WatchlistAddResult) | AlphaVantage SYMBOL_SEARCH (search); market_data_daily and market_data_intraday (coverage); watchlists (add) | 60s staleTime on search and coverage | `TickerCombobox` (`useTickerSearch.ts`) → Symbol picker |
| mock fixture: optionsFlowMock.ts | flow tape rows (no server type; `DemoDataBanner` marks it mock) | bundled in `src/data/optionsFlowMock.ts` |  | `FlowTab` → Flow Live Feed |
| mock fixture: contractDrilldownMock.ts | per-contract tape rows (no server type; `DemoDataBanner` marks it mock) | bundled in `src/data/contractDrilldownMock.ts` |  | `ContractDrilldown` → Flow Contract Drilldown |
| store: ticker |  | Zustand, persisted in localStorage as `ticker-store` |  | Swing Mode, Profiles and the picker (Trinity and Flow ignore it) |

#### Displayed
| ID | Element | Component |
|---|---|---|
| OPTIONS-01 | Gamma Map: Swing Mode | `SwingMode` |
| OPTIONS-02 | Gamma Map: Trinity Mode | `TrinityTab` |
| OPTIONS-03 | Flow: Live Feed | `FlowTab` |
| OPTIONS-04 | Flow: Contract Drilldown | `ContractDrilldown` |
| OPTIONS-05 | Profiles | `ProfilesTab` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| OPTIONS-06 | Symbol picker | `TickerCombobox` writes `tickerStore`'s `activeTicker`, which drives Swing Mode and Profiles; Trinity's three symbols and the Flow views are fixed. |
| OPTIONS-07 | View switcher | `OptionsFlowPage`'s `TABS` state switches Gamma Map, Flow and Profiles; each of `GammaMapSection` (Swing/Trinity) and `FlowSection` (Live Feed/Contract Drilldown) has its own inner mode toggle. |
| OPTIONS-08 | Pick an expiration date | No view picks an expiration. `ProfilesTab` steps through snapshot dates with a chevron stepper (`dateIdx`) and loads that date's chain and levels; `SwingMode`'s expiry chips (`expiryFilter`) change only their own highlight and reach neither the request nor the grid. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| OPTIONS-09 | loading | present | "Loading live grid…" (`SwingMode`); "Loading {symbol} levels…" (`TrinityTab`); "Loading available dates…" / "Loading options chain…" (`ProfilesTab`). |
| OPTIONS-10 | empty | present | "No options dates available for…" with the server's text and `Retry`, "No options data returned for…" and `Couldn't estimate spot from this chain` (`ProfilesTab`); "No gamma levels available for…" and "Chain too thin to build a ladder for…" (`TrinityTab`); "Data unavailable:…" with the server's reason (`SwingMode`). |
| OPTIONS-11 | error | present | "Options chain unavailable" with the server's text and `Retry` (`ProfilesTab`); Swing and Trinity reuse their empty copy for a failed request; a failed levels or dates request shows no notice; the Profiles metrics bar falls back to `EMPTY_GREEKS` when the Greeks POST fails (solyra#74). |
| OPTIONS-12 | stale | present | A `SourcePill` in `SwingMode` labels the snapshot `LIVE`, `EOD`, `STALE` or `UNAVAILABLE` from `realtime`, `eod_fallback`, `stale_fallback` or `unavailable` (`classify_gamma_freshness`), and the banner repeats it; the Profiles source footer labels a Cloud SQL chain `AlphaVantage EOD` with its date and a live-proxy chain `AlphaVantage Live` with its ET time (`isoToEtDisplay`). |
| OPTIONS-13 | permission | not tracked (new category); present | `SignInBanner` ("Sign in to load options data") while a gated call answers 401; `DataGate` replaces the views only for a signed-out user. |

#### Journeys
1. Find the level that matters: Opens /options on the Gamma Map view in Swing Mode (OPTIONS-01) → the expiry chips only change their own highlight here; picking an expiration does not refetch the grid in Swing Mode (see the matrix Options Gaps) → Reads the strike by expiry grid for the largest positive GEX (OPTIONS-01) → Notes King, Gate and Flip from the legend and node list (OPTIONS-01) → Carries those levels to /charts as an overlay (CHARTS-10)
2. Check index positioning: Switches the Gamma Map view to Trinity Mode (OPTIONS-02, OPTIONS-07) → Compares SPX, SPY and QQQ strike ladders (OPTIONS-02) → Identifies where dealer hedging concentrates (OPTIONS-02)
3. Inspect flow (demo data): Switches to the Flow view, Live Feed (OPTIONS-03, OPTIONS-07) → Demo-data banner states this view is mock (OPTIONS-03) → Opens Contract Drilldown for a per-contract tape (OPTIONS-04) → Switches to Profiles for real Greeks and gamma (OPTIONS-05, OPTIONS-07)

#### Elements
##### OPTIONS-01 · Gamma Map: Swing Mode

**Shows or does:** The page opens on the Gamma Map view (`src/routes/OptionsFlowPage.tsx:32,65`) and
`GammaMapSection` opens that view on Swing Mode (`src/components/options/GammaMapSection.tsx:26,48`),
which mounts `SwingMode` (`src/components/options/SwingMode.tsx:791-968`) for the page's active
ticker (`focusSymbol`, a leading `^` stripped, `SwingMode.tsx:799`). From top to bottom:

- A banner (`.hs-demo-banner`, `SwingMode.tsx:913-934`). With a grid whose source is not
  `unavailable` it reads `Heatmap grid & pivot rail show live <SYM> dealer exposure. Tactical read
  is illustrative.` for `realtime`, `... <SYM> dealer exposure (end-of-day close) ...` for
  `eod_fallback` and `... <SYM> dealer exposure (delayed snapshot) ...` for every other source,
  `stale_fallback` and an unrecognized one alike. With no grid, or an `unavailable` one, it reads
  `Live <SYM> grid unavailable, tactical read is illustrative.`
- A toolbar (`SwingMode.tsx:241-319`): `Live` and `Historical` (live asks for `GET
  /api/options/{sym}/grid`, historical for `GET /api/options/{sym}/{latestDate}/grid`), `GEX` and
  `VEX` (which per-cell value the heatmap prints), the five expiry chips `All`, `0DTE`, `Weekly`,
  `Monthly` and `Quarterly` (`SwingMode.tsx:47,285-293`; they change only their own highlight,
  matrix Gaps), the source pill (`SourcePill`, `SwingMode.tsx:213-238`, OPTIONS-12), `Refresh`
  (invalidates every `gamma-grid` query, `SwingMode.tsx:298-306`) and `Glossary` (navigates to
  `/help`, `SwingMode.tsx:307-315`).
- A legend strip (`Legend`, `SwingMode.tsx:322-447`), drawn only when the overlay is real
  (`SwingMode.tsx:946`): Spot (the price or `—`), Spot method (`parity`, `delta`, ...), King, Gate
  above and Gate below (each only when the server classified one), Flip, Hedge (only with the
  levels taxonomy), Regime (`POSITIVE`, `NEGATIVE` or `UNCLEAR`), Total GEX and Total VEX
  (`fmtBigGex`, `—` for a null).
- A three-column stage (`SwingMode.tsx:948-965`): the Tactical read card on the left, the `Strike ×
  Expiration heatmap` in the centre and, on the right, `Nodes & pivots` (drawn only when the overlay
  is real, `SwingMode.tsx:510-570,962`) above `Pivot build · ranked` (`SwingMode.tsx:753-784`: the
  ten strikes with the largest |net GEX|, each summed over the expirations).

The heatmap (`RealHeatmapGrid`, `SwingMode.tsx:578-750`) lists strikes high to low and up to twelve
expirations left to right (`buildGrid(summary, metric, 'net', 12)`, `SwingMode.tsx:596`;
`src/components/options/swingGridUtils.ts:38-82`). A cell is coloured on the 75th percentile of the
non-zero magnitudes, so one outlier does not flatten the rest (`SwingMode.tsx:634-640`), and prints
its value only at intensity 0.04 or more (`SwingMode.tsx:721`). The King row is the levels' King, or
else the grid's largest |net GEX| strike, and the Spot and Flip rows are tagged
(`SwingMode.tsx:644-699`). The header of a `realtime` grid adds `badge = intraday Δ vs prior
snapshot` (`SwingMode.tsx:642,669`), but no badge can appear: the grid cell the API emits has no
`pct_change` (`lib/gamma.py:138-175`, and the vendored OpenAPI `GammaGridCell`; the hook says so,
`src/hooks/useGammaGrid.ts:10-16`).

Which pieces are measured and which are not. The grid, the pivot rail, and (with `/levels`) the
legend and the node list come from the API. Three things on the view are the Gamma Map design
mock (`src/data/gammaMapMock.ts`) whatever the ticker: the Tactical read card
(`SwingMode.tsx:450-499`: heading `Tactical read · SPY` from `HS.ticker`, text about a 593.42 spot, a
588.50 flip and a 600 anchor, and `Confidence 72%`), the legend's Hedge chip
(`HS.nodes.hedge[0]`, `SwingMode.tsx:415`) and the node list's Midpoint and Hedge rows
(`SwingMode.tsx:524-533`). Executed 2026-10-01 (hermetic render of IWM with the populated fixtures):
the heading read `Tactical read · SPY`, the legend `HEDGE 580` and the list `591 MIDPOINT +$273.0M`
and `580 HEDGE FOMC 2026-06-12` beside the real `220 KING +$1.9M`. The banner says only that the
tactical read is illustrative; nothing marks the Hedge chip or the two node rows (matrix Gaps).

**Needs:** In order (`SwingMode.tsx:799-809`): `GET /api/options/dates/{sym}?limit=1`
(`useLatestOptionsDate`, `src/hooks/useOptionsDates.ts:42-53`: one index descent, five minute stale
time, no retry), whose first date becomes `latestDate`; `GET /api/options/{sym}/{latestDate}/levels`
(`src/hooks/useGammaLevels.ts:74-98`, enabled only once a date exists, one hour stale time); and the
grid (`src/hooks/useGammaGrid.ts:88-122`): live, `GET /api/options/{sym}/grid?strike_window_pct=6`,
refetched every 60 seconds and stale after 50, or historical, `GET
/api/options/{sym}/{latestDate}/grid?strike_window_pct=6`, stale after an hour and enabled only once a
date exists. The grid's query key includes the date, so the live grid is asked for a second time
when the dates answer lands (executed 2026-10-01: the opening load issued `GET
/api/options/IWM/grid?strike_window_pct=6` twice). Historical mode asks for the newest listed date
and offers no way to pick another (OPTIONS-08).

Server side. The dates handler (`platform/api/routers/options.py:318-521`) answers 400 outside SPY,
IWM, QQQ and SPX, 503 when the database is unreachable (never a fallback) and 404 when no snapshot
was ever ingested. `/levels` (`platform/api/routers/options.py:809-847`) reads the chain through
`get_options` (twelve hour cache per ticker and date, `options.py:524-630`; the Gaps say what that
pins), selects `gamma` and no `*_computed` column (`options.py:562-579`), and returns
`build_summary` (`lib/gamma.py:1014-1137`): the "GEX unavailable" summary when no contract carries
gamma, and a null `gamma_flip` with one log line when the rate lookup raises
(`lib/gamma.py:1086-1095`). The live grid (`platform/api/routers/grid.py:618-735`) is cached 60
seconds and reads, in order: the newest REALTIME snapshot dated within 20 days (called `realtime`
whatever its age, `grid.py:232-263`), else the newest EOD snapshot, labelled by
`classify_gamma_freshness` (`eod_fallback` up to two trading days behind, `stale_fallback` up to
five, `unavailable` beyond, `lib/agents/summarizers.py:160-177`), else, for a ticker outside SPY,
IWM and QQQ, an on-demand AlphaVantage fetch that is written back (`grid.py:440-613`); an empty
result is a 200 `unavailable` envelope (`grid.py:192-217`). The historical grid
(`grid.py:738-811`) reads the newest EOD snapshot at or before the date and never calls the vendor.
`build_grid_summary` (`lib/gamma.py:1156-1296`) has no gamma coverage gate (the `AUDIT-2026-09-07`
marker, `grid.py:550`).

How the overlay is built (`SwingMode.tsx:814-908`). With a levels answer that carries levels, the
legend and nodes read it: the King is `kings[0]`, the first entry of the list, which `build_summary`
fills in strike order (`lib/gamma.py:1115`), so it is the lowest-strike King and not the largest
one, which the gold cell (the largest single |net GEX| cell among the visible expirations), the
pivot rail (the strike with the largest |net GEX| summed over the expirations) and `/help`
(`src/routes/HelpPage.tsx:123`, the strike with the largest absolute net GEX) each take for the word
(matrix Gaps); the two gates are the nearest classified gate above and below the spot, the Flip is
`levels.gamma_balance` and only when that is absent the grid's `gamma_flip` (`SwingMode.tsx:843`),
and Total VEX is the grid's, `null` when there is no grid.
Without levels but with a grid that has cells, the grid supplies the spot, the Flip, the regime and
the totals, and the King is the strike with the largest |net GEX|; gates are omitted. With neither,
the placeholder is mock and the legend and node list are hidden. The Flip chip, the node row `Flip
zero-gamma` and the dashed flip row are therefore the gamma balance, "the OI-weighted gamma-median
balance price ... NOT a true dealer-gamma regime flip" that the API renamed on 2026-06-09
(`lib/gamma.py:108-115,567-620`), and not `gamma_flip`, the Black-Scholes zero-gamma level
(`lib/gamma.py:623-850`); `/help` defines the two apart (`src/routes/HelpPage.tsx:119-126`) and the
Charts page draws both. Executed 2026-10-01 on the real IWM chain of 2026-09-30 (5600 contracts, read
from Cloud SQL) through the real handlers: spot 277.995, `gamma_balance` 275.74 and `gamma_flip`
290.44, and the rendered legend read `FLIP 275.74`; the second figure, 14.7 points higher, appears
nowhere on the view (matrix Gaps). The fixtures show the same split: the Flip chip read `219.50`, the
fixture's `gamma_balance`, while its `gamma_flip` is 219.75.

What the view shows on the production chains of 2026-09-30 (executed 2026-10-01: the real handlers
run on the chains read from Cloud SQL that day, and their answers rendered in the page; the V evidence
comment in the matrix has the reads).

- IWM, 2800 calls and 2800 puts: the banner `... IWM dealer exposure (end-of-day close) ...`, the
  pill `EOD 07:00 PM ET` (the `23:00:00Z` stamp of the EOD rows) and the legend `SPOT 277.99 SPOT
  METHOD parity KING 275 GATE ↑ 279 GATE ↓ 277 FLIP 275.74 HEDGE 580 REGIME NEGATIVE TOTAL GEX
  −$54.8M TOTAL VEX −$420.2M`. Total GEX is the levels answer's (`total_gex` −54.79M, the whole
  chain) and Total VEX the grid's (−420.2M, the strikes within six percent of the spot); the
  Profiles view reads −970.0M for the same chain's Total VEX, computed at the spot it posts to the
  Greeks handler (the handler answers −929.9M at the parity spot the levels use; OPTIONS-05), two
  figures under one name (matrix Gaps). The King read 275 (−$7.1M), the first of three kings (275,
  278 and 280); the largest, 278 at −$9.9M, is where the gold cell, the first bar of the pivot rail
  and the spot row sit, while the row tagged `king` is 275 (matrix Gaps).
- SPY, whose EOD chain holds calls only (matrix Gaps): the live grid answered from the REALTIME snapshot
  of 19:55:25Z (`realtime`, the pill `LIVE 03:55 PM ET`, its own `total_gex` −38.2M and regime
  `negative_gamma`), while `/levels` answered from the day's newest snapshot, the calls-only EOD
  chain, so the legend read `SPOT 775.00 SPOT METHOD delta KING 760 ... REGIME POSITIVE TOTAL GEX
  +$221.1M` beside a heatmap of the other snapshot.
- SPX, whose chain carries no gamma at all (calls only, open interest 0 on every contract): the grid
  is 1091 cells that are all zero, the spot is the median strike (`SPOT 7240.00 SPOT METHOD
  median_strike`), and the legend read `KING 6810 FLIP — REGIME UNCLEAR TOTAL GEX +$0K TOTAL VEX +$0K`
  with `6810 KING +$0K` in the node list: a King and two zero totals drawn from no gamma (matrix
  Gaps).

**States:** OPTIONS-09 to OPTIONS-13 describe each state on the page; what Swing shows is as follows
(all executed 2026-10-01 in hermetic renders). Pending: the card reads `Loading live grid…`, and,
because the pill and the banner read the grid's source with a default of `unavailable` (the pill at
`SwingMode.tsx:943`, the banner at `:916`), the pill reads `UNAVAILABLE` (hint `No snapshot
available`) and the banner `Live IWM grid unavailable, tactical read is illustrative.` while the
request is still in flight (matrix Gaps).
In Historical mode, with the dates request pending or failed, the grid query is disabled
(`SwingMode.tsx:807`), so the card reads `Data unavailable: No options grid available for this
symbol.` and not a loading line. An `unavailable` envelope, or a grid with no cells, reads `Data
unavailable: <reason>` (the envelope's `reason`, else its first warning, else the default text,
`SwingMode.tsx:616-625`). A failed grid request (a 503, a 429) reads the same default text and the
server's `detail` is dropped. The legend and node list still draw from `/levels` when that answers,
so beside an unavailable grid they show a King, gates and totals, and Total VEX reads `+$0K`, the
envelope's `total_vex` of 0.0 (a failed grid request shows `—` there; matrix Gaps). A failed or
pending dates or levels request has no presentation of its own: neither query's error is read
(`SwingMode.tsx:800-803`).

**Acceptance criteria:**
- Given IWM, the populated levels and a grid with `data_source` `eod_fallback`, when `/options`
  loads, then the banner reads `Heatmap grid & pivot rail show IWM dealer exposure (end-of-day
  close). Tactical read is illustrative.`, the pill `EOD` with a time in ET, the legend `SPOT 220.00`,
  `SPOT METHOD parity`, `KING 220`, `GATE ↑ 221`, `GATE ↓ 218`, `FLIP 219.50`, `REGIME POSITIVE`,
  `TOTAL GEX +$1.3M` and `TOTAL VEX −$350K`, and the heatmap header `Strike × Expiration heatmap ·
  IWM` (executed 2026-10-01; no committed test asserts these values).
- Given the page opens, then the dates request carries `limit=1` and the Profiles request none
  (`the Swing view asks for one date; the Profiles picker asks for all`,
  `tests/options/options-flow.spec.ts`, on main at eca7078).
- Given the toolbar, when `Refresh` is pressed, then the live grid is requested again, and when
  `Glossary` is pressed the URL becomes `/help` (`Refresh refetches the grid and Glossary navigates
  to /help`, `tests/shared/navigation.spec.ts`, on main).
- Given a grid, then strikes run high to low, columns are the expirations capped at twelve, the King
  cell is the largest |net GEX|, the spot row is the strike nearest a real spot and no row is tagged
  without one (`buildGrid`, `buildGrid — spot row honesty`, `selectValue`,
  `src/components/options/swingGridUtils.test.ts`); values print as `+1.2M`, `-48K`, `+312`
  (`formatGex`, the same file).
- Given `data_source` `realtime` and `eod_fallback`, then the live grid is served with
  `Cache-Control: public, max-age=60`, the historical one with `max-age=43200`, and an empty
  database answers an `unavailable` envelope with HTTP 200 (`TestGridLive`, `TestGridHistorical`,
  `tests/api/test_grid_router.py`).
- Given a levels answer with `gamma_balance` 219.5 and `gamma_flip` 219.75, then the Flip chip
  reads `219.50` (executed 2026-10-01; matrix Gaps).
- Given a levels answer with levels, then the Hedge chip and the Midpoint and Hedge rows read the
  mock's 580, 591 and 580, and the Tactical read card reads `Tactical read · SPY` whatever the
  ticker (executed 2026-10-01; matrix Gaps).
- Given the live grid and `/levels` come from different snapshots, then the legend reads `/levels`
  and the heatmap the grid (executed 2026-10-01 on the SPY chains above; matrix Gaps).
- Given a levels answer with several kings, then the legend, the node list and the row tagged `king`
  read the first, the lowest strike, while the outlined cell is the largest single |net GEX| cell
  (one strike and one expiration, among the visible expirations) and the first bar of the pivot rail
  is the strike with the largest |net GEX| summed over the expirations (executed 2026-10-01 on the
  real IWM answers: the legend 275, the cell and the rail 278; matrix Gaps).
- Given a chain with no vendor gamma, then the grid answers 200 with every cell at zero and no
  coverage warning, and the view draws a King and totals of `+$0K` (executed 2026-10-01 on the SPX
  chain above; matrix Gaps).
- Given an unrecognized source string, then the pill reads `UNAVAILABLE` with the hint
  `Unrecognized data source`, and the banner `(delayed snapshot)` (executed 2026-10-01).
- Given the grid request is held, then the pill reads `UNAVAILABLE` and the card `Loading live
  grid…` (executed 2026-10-01; matrix Gaps).

**Tests:** Main asserts three things about this view and a few helpers. `demo-banners.spec.ts`
(`Gamma Map Swing Mode shows the demo banner`) asserts that the first `.hs-demo-banner` element is
visible and no text in it; `options-mobile-fit.spec.ts` asserts, on two phone widths, that `.hs-grid`
is visible, the document does not scroll sideways, no card box passes the viewport and the wide
heatmap card is an `overflow-x: auto` scroller wider than its box; `navigation.spec.ts` and the
dates-limit test of `options-flow.spec.ts` assert the toolbar buttons and the request URL as in the
criteria. The pure helpers are asserted by `swingGridUtils.test.ts`, and the grid and levels
handlers and the library by `tests/api/test_grid_router.py` (live and historical tiers, the
unavailable envelope, the on-demand dispatch and its rate limit, route order),
`tests/api/test_route_coverage.py` (the live and historical grid answer 503 with no database
configured, which stops at `_require_cloud_sql`, and the dates route 503 against an unreachable one),
and `tests/lib/test_gamma.py`
(`TestBuildGridSummary`, `TestBuildSummary`, `TestComputeGammaBalance`, `TestComputeGammaFlipBS`,
`test_differs_from_gamma_balance`, the coverage gate of `build_summary`). No test asserts a rendered
cell, a legend chip, the pill, the node list, the pivot rail, the Historical, GEX and VEX buttons,
or what the view shows with no grid; no test runs `build_grid_summary` on a chain with no gamma.

**Code:** `src/routes/OptionsFlowPage.tsx:30-70`, `src/components/options/GammaMapSection.tsx:20-50`,
`src/components/options/SwingMode.tsx:44-968`, `src/components/options/swingGridUtils.ts:1-112`,
`src/hooks/useOptionsDates.ts:31-67`, `src/hooks/useGammaLevels.ts:74-98`,
`src/hooks/useGammaGrid.ts:88-122`, `src/data/gammaMapMock.ts`, `src/lib/formatGex.ts:6-24`;
`platform/api/routers/options.py:318-521,809-847`, `platform/api/routers/grid.py:192-613,618-811`,
`lib/gamma.py:1014-1296`; no test id (the view is found by the classes `hs-demo-banner`,
`hs-toolbar`, `hs-legend`, `hs-grid-card`, `hs-grid`, `hs-pill`).

##### OPTIONS-02 · Gamma Map: Trinity Mode

**Shows or does:** The second toggle of the Gamma Map view, `Trinity Mode`
(`src/components/options/GammaMapSection.tsx:43-45`), replaces Swing with `TrinityTab`
(`src/components/options/TrinityTab.tsx:174-201`): the heading `Trinity · synced index gamma` with
`SPX · SPY · QQQ, strike ladders aligned`, three panels in a one, two or three column grid
(`TrinityTab.tsx:186-190`) and a closing note card (`TrinityTab.tsx:192-199`). The symbols are fixed
(`TRINITY_SYMBOLS`, `TrinityTab.tsx:13`) and independent of the page's picker; each panel asks for
its own newest date and levels (`TrinityPanel`, `TrinityTab.tsx:47-172`). A panel's header shows the
symbol, the spot when it is positive and a `King <strike>` chip when the server named a King, the
first entry of `kings`, the lowest-strike King (`TrinityTab.tsx:63,77-94`). Its body is a ladder of
the response's `levels`, strikes high to low in a 520 pixel scroller
(`TrinityTab.tsx:64-66,115-168`): a column header `Strike · Put GEX · Call GEX`, and per strike a
red bar growing left for a negative `net_gamma` and a green bar growing right for a positive one,
both scaled to the largest |net gamma| of the panel, the King row gold with a `♔` and the row
nearest the spot tinted (`nearestStrike`, `TrinityTab.tsx:36-44`), and a hover title `Net GEX
<value> · OI <calls>c / <puts>p`. Nothing on a panel is a mock. The levels array holds the strikes
within eight percent of the spot (`classify_levels`, `lib/gamma.py:943-1011`), so an index with five
point strikes draws a long ladder.

Executed 2026-10-01 (hermetic render, the populated fixtures): the panels read `SPY 220 King 220
STRIKE PUT GEX CALL GEX 222 221 220 ♔ 219 218` and the same for QQQ; choosing SPY in the picker
issued no new Trinity request for SPY (its dates and levels were already cached from Swing) and left
the three headers as they were, while the Swing heading changed to SPY (OPTIONS-06).

**Needs:** For each of SPX, SPY and QQQ: `GET /api/options/dates/{SYM}?limit=1`
(`useLatestOptionsDate`, `src/hooks/useOptionsDates.ts:42-53`) and,
once a date exists, `GET /api/options/{SYM}/{date}/levels` with no parameter
(`src/hooks/useGammaLevels.ts:74-98`; the server's window is eight percent). The panel reads
`spot.price`, `kings[0].strike` and each level's `strike`, `net_gamma`, `gex`, `call_oi` and `put_oi`;
it reads no `warnings`, `regime` or `total_gex`. The handlers are the ones OPTIONS-01 describes
(`platform/api/routers/options.py:318-521,809-847`). SPX has no realtime producer, only the nightly
EOD fetch (matrix Backend notes), so its newest date is the last close. Production on 2026-10-01
(the V evidence comment in the matrix): the SPX chain of every date from 2026-09-15 to 2026-09-30
carries no vendor gamma and, but for 2026-09-21, no puts, and open interest on three of the twelve
dates; the newest, 2026-09-30, is 4871 calls with open interest 0 on all of them. The real handler's
answer to that chain is a 200 with `regime` `unknown`, empty `levels` and `kings`, a `spot` of 7240.0
with `method` `median_strike`, and two warnings: `Spot estimated from median strike ...` and `Vendor
gamma missing on ALL 4871 contracts ...`. Rendered, the SPX panel read `SPX 7,240` over `Chain too
thin to build a ladder for SPX.`: the header's 7,240 is that median strike, shown as a spot with no
mark. The SPY panel draws from the day's newest snapshot, the EOD chain of 2026-09-30, which holds
calls only: `regime` `positive_gamma`, a ladder of 125 levels none of them negative, King 760, the first
of ten kings (760 to 800) where 764 has the largest GEX (matrix Gaps).

**States:** OPTIONS-09 to OPTIONS-13 describe each state on the page; the panel's own (executed
2026-10-01): pending reads `Loading <SYM> levels…` (`TrinityTab.tsx:97-101`); a failed dates request,
a dates answer with no date, or a failed levels request (`datesQuery.isError || levelsQuery.isError ||
(!loading && !latestDate)`, `TrinityTab.tsx:57`) reads `No gamma levels available for <SYM>.`
(`TrinityTab.tsx:103-107`), whatever the status or the server's text (executed with a 503 on the SPX
dates request and a 404 on the SPY levels one; QQQ still drew its ladder); an answer whose `levels`
is empty reads `Chain too thin to build a ladder for <SYM>.` (`TrinityTab.tsx:109-113`). The last
text states a cause the panel does not know: `/levels` also answers an empty `levels` list when the
chain carries no vendor gamma, with a warning that says so (`lib/gamma.py:1057-1069`), and the panel
never reads `warnings`, so a chain of thousands of contracts reads as too thin (executed 2026-10-01:
the real handler's answer for the production SPX chain of 2026-09-30, 4871 contracts with no gamma,
rendered in the page, read `Chain too thin to build a ladder for SPX.`; matrix Gaps).

**Acceptance criteria:**
- Given the populated levels for the three symbols, when Trinity Mode is chosen, then three panels
  show in the order SPX, SPY, QQQ, each with its symbol, its spot, `King 220`, strikes high to low
  and the King row marked `♔` (executed 2026-10-01; no committed test asserts a panel).
- Given Trinity Mode is chosen, then each of SPX, SPY and QQQ asks for its newest date with
  `limit=1`, and every options request is answered by a fixture route
  (`Trinity Mode is intercepted too — none of SPX/SPY/QQQ reaches a real backend`,
  `tests/options/options-flow.spec.ts`, on main at eca7078; it asserts the requests are issued and
  none escapes, not what the panels draw).
- Given a ladder and a spot, then the strike nearest the spot is tagged, an exact tie goes to the
  higher strike, and a missing, zero or negative spot or an empty ladder tags nothing
  (`nearestStrike`, five cases, `src/components/options/TrinityTab.test.ts`, on main).
- Given a failed dates request, a missing date or a failed levels request, then the panel reads
  `No gamma levels available for <SYM>.`; given an empty `levels`, `Chain too thin to build a ladder
  for <SYM>.`; given a pending request, `Loading <SYM> levels…` (executed 2026-10-01).
- Given a chain on which no contract carries gamma, then `/levels` answers 200 with empty `levels`
  and `kings`, `regime` `unknown`, `total_gex` 0.0 and the warning `Vendor gamma missing on ALL <n>
  contracts — GEX unavailable for this snapshot (feed outage?), not zero.` (executed 2026-10-01
  through the real handler on the production SPX chain of 2026-09-30; the library half is asserted
  by `test_build_summary_all_gamma_missing_is_unavailable_not_zero`,
  `tests/lib/test_gamma.py:1090-1099`, which checks `regime`, `total_gex` and a warning naming ALL
  and `unavailable`, and neither the empty `levels` and `kings` nor the route's 200), and the SPX
  panel then reads `Chain too thin to build a ladder for SPX.` (executed 2026-10-01, rendered).
- Given the picker is changed, then the three panels do not change (executed 2026-10-01).

**Tests:** `src/components/options/TrinityTab.test.ts` (`nearestStrike` only) and the Trinity test of
`options-flow.spec.ts` above, whose assertion is about the requests. On the server: the dates and
levels handlers and the library as OPTIONS-01 credits them (`tests/api/test_route_coverage.py` pins
the dates route to 503 and the levels route to 404 against an unreachable database, and
`test_levels_actually_awaits_the_chain` that a stubbed chain answers 200 with its `chain_size`;
`tests/lib/test_gamma.py` the classification and the coverage gate). No test renders a panel or reads
the King chip, a ladder row or any of the three texts.

**Code:** `src/components/options/TrinityTab.tsx:1-202`, `src/components/options/GammaMapSection.tsx:20-50`,
`src/hooks/useOptionsDates.ts:42-53`, `src/hooks/useGammaLevels.ts:74-98`;
`platform/api/routers/options.py:318-521,809-847`, `lib/gamma.py:943-1137`; no test id.

##### OPTIONS-03 · Flow: Live Feed

**Shows or does:** The Flow view (`src/routes/OptionsFlowPage.tsx:66`) opens on its `Live Feed` toggle
(`src/components/options/FlowSection.tsx:20,48-49`), which mounts `FlowTab`
(`src/components/options/FlowTab.tsx:98-346`). Every number on it is a bundled placeholder
(`src/data/optionsFlowMock.ts`, whose header says it is not live and is to be deleted once a
flow-tape endpoint exists); no endpoint of that name is in the API snapshot, and the three Flow files
make no request and read no mock-mode switch (`grep` for `fetch` and `import.meta.env` finds nothing
in them). Production therefore renders this view from the mock always, and the only disclosure is the
`DemoDataBanner` (`role="status"`) at the top: `Demo data, not live.` and `No live flow feed
connected, placeholder tape until an options flow-tape endpoint exists.`
(`FlowTab.tsx:114`, `src/components/shared/DemoDataBanner.tsx:16-27`). Below it:

- A scanner strip of five buckets (`FlowTab.tsx:120-132`): Sweeps 142 at $18.4M, Blocks 38 at $42.1M,
  Splits 96 at $12.8M, Repeated strikes 28 at $8.2M and Golden sweeps 6 at $24.6M.
- The `Live options feed` table (`FlowTab.tsx:135-280`): sixteen rows with the columns Time, Sym,
  Strike, C/P, OTM, Exp, DTE, Spread (a bid, mark and ask mini bar), Side, Sentiment, Size, Chain
  (a fill ratio bar) and Premium, and eight filter chips, `All`, `Sweeps`, `Calls`, `Puts`,
  `Bullish`, `Bearish`, `> $100K` and `0–2 DTE` (`FlowTab.tsx:20,85-96`). The chips filter the
  sixteen rows in the browser and no chip empties the table (executed 2026-10-01: `Sweeps` 7 rows, `>
  $100K` 5 of 16).
- A row click drills into the contract (`FlowTab.tsx:182-195`): `FlowSection` stores the row's
  `{sym, strike, cp, expiry, dte}` and flips the inner toggle to `Contract Drilldown`
  (`FlowSection.tsx:23-26`), OPTIONS-04.
- A right rail (`FlowTab.tsx:283-344`): `Flow sentiment · today` (Bullish prem $142.4M, Bearish prem
  $48.2M, C/P ratio 2.34, Net delta +$1.2B) and `Top tickers · premium` (SPY, NVDA, TSLA, QQQ, PLTR,
  AAPL).

Executed 2026-10-01 (hermetic render): the first row read `12:49:25 DVN 38 C +5.0% 01/23 4 0.10 0.13
0.13 ASK BULLISH 328 Ask 90% $4K`. The times are a fixed morning, the expirations fall in January and
the rail says `today`; none of it moves with the clock or with the page's ticker (picking SPY left the
first row as DVN). Nothing on the view but the banner says it is a placeholder.

**Needs:** Nothing: no request, no store, no setting. The Chain's `none (mock fixture ...)` cells are
right: the view reads `FLOW_FEED`, `SCANNER_BUCKETS`, `FLOW_SENTIMENT` and `TOP_TICKERS` from the mock
module (`FlowTab.tsx:4-13,105-109`).

**States:** The view has no loading, empty or error state, because it has no data source; the banner
is its only state. A `FlowTab` rendered without `onSelectContract` makes the rows inert, but
`FlowSection` always passes it.

**Acceptance criteria:**
- Given Flow is chosen, then the banner `Demo data, not live.` is visible
  (`Flow tab shows the demo banner text`, `tests/options/demo-banners.spec.ts`, on main at eca7078).
- Given Flow is chosen, then the sixteen placeholder rows, the five scanner buckets and the rail
  show, and `Sweeps` leaves seven rows and `> $100K` five (executed 2026-10-01; no committed test
  asserts a row, a chip or the rail).
- Given a row is clicked, then the Contract Drilldown opens for that row's contract (executed
  2026-10-01; asserted on this branch by `the view switcher mounts one view at a time and each inner
  toggle swaps its own view`, `tests/options/options-flow.spec.ts`, solyra commit `d82c20b`, which
  has not run in CI).
- Given the page's ticker changes, then the view does not change (executed 2026-10-01).

**Tests:** On main, `demo-banners.spec.ts` asserts the banner text is visible after the click on the
Flow button, and `options-mobile-fit.spec.ts` (`Flow tab does not overflow the viewport`, two phone
widths) asserts that the document does not scroll sideways and no card passes the viewport. Neither
asserts what the feed shows or does. The test added on this branch asserts the inner toggle and the
drill-through, not the values. Te stays unticked.

**Code:** `src/components/options/FlowTab.tsx:1-348`, `src/components/options/FlowSection.tsx:12-55`,
`src/data/optionsFlowMock.ts`, `src/components/shared/DemoDataBanner.tsx`; no test id (the banner is
found by its text, the table by its role).

##### OPTIONS-04 · Flow: Contract Drilldown

**Shows or does:** The second toggle of the Flow view, `Contract Drilldown`
(`src/components/options/FlowSection.tsx:43-45`), mounts `ContractDrilldown`
(`src/components/options/ContractDrilldown.tsx:77-246`). It is a placeholder like the Live Feed
(OPTIONS-03): the banner at the top reads `Demo data, not live.` and `No contract-tape endpoint
connected, placeholder drilldown until a per-contract tape exists.` (`ContractDrilldown.tsx:111`), and
every figure comes from `src/data/contractDrilldownMock.ts`, a single SPY 605 call that expires
2026-01-17. The view, top to bottom:

- A header row (`ContractDrilldown.tsx:114-131`): the symbol, `$<strike>`, a `CALL` or `PUT` pill,
  the expiry, `<n> DTE` and the contract id `<sym> <strike> <cp> <expiry>`.
- A stats strip (`ContractDrilldown.tsx:87-94,134-141`): Volume 48,213, Open Int 31,905, Avg Fill
  $1.42, Total Premium $6.85M, OTM % +0.3% and Multi % 34%.
- A chain ratio bar (`ContractDrilldown.tsx:144-159`): Bid 28% with $1.92M, Ask 62% with $4.24M and
  the middle as the remainder.
- A `Volume over time · avg fill overlay` chart (`ContractDrilldown.tsx:162-201`, recharts): stacked
  Ask, Mid, Bid and No-side counts per half hour with the average fill and the price as two lines, and
  the day's totals as a legend.
- A `Time-bucket detail` table (`ContractDrilldown.tsx:204-244`): fourteen half hours from 09:30 to
  16:00 with Bid, Mid, Ask, Avg Fill, IV, RVOL, Volume and the three premiums.

Which contract. With no selection the header is the mock's SPY 605 call, with the ISO expiry
`2026-01-17`. Reached from a Live Feed row, `FlowSection` hands over that row's `{sym, strike, cp,
expiry, dte}` (`FlowTab.tsx:187-193`) and only the header row and the contract id use it
(`ContractDrilldown.tsx:82-84`); the stats, the ratio, the chart and the table stay the SPY 605 call's,
as the file's own comment says (`ContractDrilldown.tsx:79-81`). Executed 2026-10-01 (hermetic render):
after the first Live Feed row, `DVN 38 C 01/23` with 328 contracts at $0.13, the header read `DVN $38
CALL 01/23 4 DTE` and the strip `VOLUME 48,213 OPEN INT 31,905 AVG FILL $1.42 TOTAL PREMIUM $6.85M OTM
% +0.3% MULTI % 34%`, the SPY call's figures. The banner calls the drilldown a placeholder, but the
header names the clicked contract above another contract's numbers (matrix Gaps).

**Needs:** Nothing: no request, no store. The Chain's `none (mock fixture ...)` cells are right
(`ContractDrilldown.tsx:11,78`). The selected contract lives in `FlowSection`'s state
(`FlowSection.tsx:21`), so it is lost when another top view is chosen and Flow is mounted again.

**States:** None of its own; the banner is the only state, as in OPTIONS-03.

**Acceptance criteria:**
- Given the toggle `Contract Drilldown` is chosen with no row picked, then the banner shows and the
  header names SPY 605 CALL 2026-01-17 with 1 DTE (`src/data/contractDrilldownMock.ts:60-62`, and the
  executed render of 2026-10-01 read `SPY $605 CALL 2026-01-17 1 DTE`).
- Given a Live Feed row is clicked, then the toggle moves to `Contract Drilldown` and the header and
  contract id name that row's contract, while the figures stay the placeholder's (executed
  2026-10-01; the toggle move and the contract id are asserted on this branch by `the view switcher
  mounts one view at a time and each inner toggle swaps its own view`,
  `tests/options/options-flow.spec.ts`, solyra commit `d82c20b`, not yet run in CI).

**Tests:** None on main: `demo-banners.spec.ts` opens the Flow tab on its Live Feed, and
`options-mobile-fit.spec.ts` does not leave it, so no test on main mounts this view. The test added on
this branch asserts the toggle and the contract id and no figure, so Te stays unticked.

**Code:** `src/components/options/ContractDrilldown.tsx:1-247`,
`src/components/options/FlowSection.tsx:12-55`, `src/data/contractDrilldownMock.ts`,
`src/components/shared/DemoDataBanner.tsx`; no test id.

##### OPTIONS-05 · Profiles

**Shows or does:** The Profiles view (`src/routes/OptionsFlowPage.tsx:67`) mounts `ProfilesTab`
(`src/components/options/ProfilesTab.tsx:255-646`) for the page's active ticker. Top to bottom:

- A toolbar (`ProfilesTab.tsx:350-425`): `GEX` and `VEX` (which Greek the first metric card shows and
  the heatmap's header names; the bars stay GEX, below), `Net`, `Calls` and `Puts` (which side of each
  strike the heatmap draws), the date
  stepper (OPTIONS-08) and a `Spot:` number input. The input shows the typed override, else the
  resolved spot to two decimals, with a chip naming the estimation method (`parity`, `delta`,
  `median_strike` or `none`) while there is no override (`ProfilesTab.tsx:406-424`).
- Notices (`ProfilesTab.tsx:428-501`): the dates error and the chain error (OPTIONS-11), the loading
  line (OPTIONS-09), `Couldn't estimate spot from this chain` with the advice to enter a spot when
  the chain has rows and no spot resolves (`ProfilesTab.tsx:479-491`), and a blue box listing the
  levels answer's `warnings` (`ProfilesTab.tsx:494-501`).
- A metrics bar of four cards, drawn whenever a spot is known (`finalSpot > 0`,
  `ProfilesTab.tsx:503-528`): `Total GEX` or `Total VEX` (the Greeks answer's
  `metrics.total_gex` or `total_vex` through `formatGEX`, with `Positive` or `Negative`), `Gamma Flip`
  (`$<level>` from `/levels`'s `gamma_balance`, else the Greeks `zero_gamma`, else `--`, with the
  regime's description under it), `Max Pain` (`$<strike>` or `--`) and `Put/Call OI` (two decimals,
  `Bearish skew` above 1, else `Bullish skew`).
- A levels row (`ProfilesTab.tsx:530-578`), drawn once `/levels` answered and a spot is known: the
  regime chip (`Positive gamma`, `Negative gamma`, hidden when `unknown`), one `★ King $<strike>
  (<distance>%)` per entry of `kings` (three on the real IWM answer below), one `◆ Gate $<strike>` per
  gate and one `⇅ Flip $<strike>` per strike bracketing the gamma balance. Before `/levels` has answered, a fallback row shows the Greeks answer's King,
  gatekeepers and midpoints (`ProfilesTab.tsx:580-597`).
- The heatmap (`GEXHeatmap`, `ProfilesTab.tsx:72-235,599-620`): a D3 SVG of one horizontal bar per
  strike inside the Greeks answer's range of the spot (`strike_range_pct`, fifteen percent), positive
  green and negative purple, strike labels amber near the spot, a value label where a bar passes five
  percent of the largest, a dashed zero line, a red spot line labelled `$<spot>`, and per strike a
  `★` (the King), a `◆` (a gatekeeper) or a `●` (inside a midpoint band) from the Greeks `nodes`
  (`ProfilesTab.tsx:126-131,173-184`). Its header reads `<GEX|VEX> by Strike, <Net|Calls Only|Puts
  Only>: ±15% range (<n> strikes)`.
- A footer (`ProfilesTab.tsx:631-645`): `Source: AlphaVantage EOD · Cloud SQL · <n> contracts ·
  snapshot <date>` for a Cloud SQL chain and `Source: AlphaVantage Live · <n> contracts · snapshot
  <date> <time> ET` for the live proxy, or `time unavailable` with no timestamp (OPTIONS-12).

Executed 2026-10-01 (hermetic render, the populated fixtures): the date `2026-04-24`, `Spot: parity`
with `220.00`, the cards `TOTAL GEX -23K Negative`, `GAMMA FLIP $219.50 Above gamma flip, pinning /
range-bound`, `MAX PAIN $220` and `PUT/CALL OI 1.06 Bearish skew`, the chips `Positive gamma ★ King
$220.00 (+0.0%) ◆ Gate $218.00 ◆ Gate $221.00 ⇅ Flip $219.00`, the header `GEX by Strike, Net: ±15%
range (5 strikes)` and the EOD footer. `Gamma Flip` and the `⇅ Flip` chips are the gamma balance and
its bracketing strikes (matrix Gaps, and the Flip paragraph of OPTIONS-01); the fixture's
`gamma_flip` of 219.75 appears nowhere on the view.

The `VEX` button changes the first card (`TOTAL VEX -506K Negative`) and the header (`VEX by Strike,
...`) and not the bars: `GEXHeatmap` is given no metric (`ProfilesTab.tsx:612-618`), and the Greeks
answer's `gex_by_strike` rows hold `gex`, `call_gex` and `put_gex` only (executed 2026-10-01: the bars
and their labels were identical in the two modes, on the fixtures and on the real answer below;
matrix Gaps).

**Needs:** In order (`ProfilesTab.tsx:271-335`):

- `GET /api/options/dates/{ticker}` with no `limit`, the full history up to a thousand dates
  (`useAllOptionsDates`, `src/hooks/useOptionsDates.ts:56-67`: five minute stale time, no retry). The
  chosen date is `dates[dateIdx]`, newest first, and `dateIdx` returns to 0 when the ticker changes
  (`ProfilesTab.tsx:261-269`).
- `GET /api/options/{ticker}/{date}`, the Cloud SQL chain, and on a 404 only `GET
  /api/options/live/{ticker}/{date}`, the AlphaVantage proxy; any other status is an error
  (`useOptionsData`, `ProfilesTab.tsx:40-61`: one hour stale time, no retry).
- `GET /api/options/{ticker}/{date}/levels`, with `?spot=<override>` when an override is typed
  (`ProfilesTab.tsx:302-305`, `src/hooks/useGammaLevels.ts:74-98`; the query key holds the override).
  The input has no debounce, so each keystroke that changes the number asks again.
- `POST /api/options/greeks` with the chain's `type`, `strike`, `open_interest`, `gamma`, `vega`,
  `delta` and `volume` and a `spot_price` (`src/hooks/useOptionsGreeks.ts:104-143`), sent only when
  the chain has rows and that spot is positive. The spot it is given is the override, else the local
  delta proxy (`estimateSpotStrikeFromDeltas`, the strike of the contract whose delta is nearest
  plus or minus 0.5, `src/components/options/swingGridUtils.ts:93-112`), else the server's spot
  (`ProfilesTab.tsx:317-321`), while the toolbar's `Spot` input, the spot line and the range use the
  server's spot first (`ProfilesTab.tsx:333-335`), so the bars and the line can rest on two
  estimates. Executed 2026-10-01 on the real IWM chain: the proxy chose the 2027-06-30 290 call
  (delta 0.49984, open interest 12) and the page posted `spot_price` 290.0 while the toolbar read
  `Spot: parity` over `277.99` (matrix Gaps). The hook retries once on failure (the app default),
  keys the query on the chain's contract count and the spot only (`useOptionsGreeks.ts:111`) and
  keeps an answer for 60 seconds (`useOptionsGreeks.ts:141`). Stepping to a date whose chain has the
  same count and spot therefore asks for nothing new inside that time, and the cards keep the
  previous date's Greeks beside the new chain. After it, a step asks again only when it changes the
  query the hook holds or finds it disabled (`@tanstack/query-core` 5.102.8,
  `queryObserver.js:330-332`): a chain not yet fetched is `[]` while it loads, so the key's count is
  0 and `enabled` false (the cards read `TOTAL GEX +0 Positive` meanwhile), and when the chain
  arrives the query changes again, so a stale answer on that key is asked for again while it stays
  on the cards until the new one arrives; a cached chain with the same count and spot keeps the key
  and `enabled`, so nothing is asked, however old the answer is (executed 2026-10-01: with two
  fixture chains of ten contracts and a spot of 220, the step issued the chain and levels requests
  and no second POST, and with each POST answered by a different Total GEX the card kept the first
  answer; after 64 seconds two steps to cached chains issued no POST and left `+1.0M`, and a step to
  a chain not yet fetched read `+0` while it loaded and then posted at once, the card reading
  `+1.0M` until the second answer, `+2.0M`, arrived; matrix Gaps).
- With no Greeks answer the page uses `EMPTY_GREEKS`, a zeroed object (`ProfilesTab.tsx:326`,
  `useOptionsGreeks.ts:145-158`): OPTIONS-11.

Server side (`platform/api/routers/options.py`): the chain handler (`:524-630`) selects the newest
`snapshot_ts` of the date for `data_source = 'alphavantage'`, maps `calls` and `puts` to `call` and
`put` and NaN to null, caches the answer twelve hours per ticker and date and, through the swallowing
`query_to_dataframe`, answers 404 for an empty frame whether the table has no rows or the database is
unreachable (`tests/api/test_route_coverage.py` pins that 404 with no backend); it selects `gamma` and
no `*_computed` column (`options.py:562-579`). The live proxy (`:633-712`) calls AlphaVantage
`HISTORICAL_OPTIONS` for the date, answers 503 without a key or on a timeout, 502 on a failed request,
429 on the vendor's limit notice, 400 on its error message and 404 for no contracts, caches five
minutes, and stamps `snapshot_timestamp` with its own clock at the request, not a vendor time
(executed 2026-10-01 through the real handler: `snapshot_timestamp` 2026-10-01T00:38:42Z for a request
for the date 2026-09-29, `metadata.source` `alphavantage_live`). `/levels` is OPTIONS-01's. The Greeks
handler (`:753-806`) answers from `lib/gamma.py` and, for a non-positive `spot_price` or no options, a
200 of zeros (`:767-781`) that the page never asks for. The vendored OpenAPI declares a typed 200 for
all five routes. Run on the real IWM chain of 2026-09-30 (5600 contracts, 2800 calls and 2800
puts, read from Cloud SQL on 2026-10-01): the chain handler answered 200 with `metadata` `{source:
cloud_sql, data_source: alphavantage, row_count: 5600}`; `/levels` with spot 277.995 (`parity`,
`K=278.0 C=0.09 P=0.10 exp=2026-09-30`), `negative_gamma`, `total_gex` −54.79M, `gamma_flip` 290.44,
`gamma_balance` 275.74, three kings, five gates and 54 levels; and the Greeks handler, given that
chain and the parity spot 277.995, `total_gex` −54.79M, `total_vex` −929.87M, `zero_gamma` 216.82,
`max_pain` 285.0, `implied_move` 14.98, `put_call_ratio` 2.28 and a King node at 278. That is not
the spot the page gives it: the page posts the delta proxy's 290.0, and at 290.0 the same handler
answers `total_gex` −59.63M, `total_vex` −970.02M and `implied_move` 14.89, the other four figures
unchanged (executed 2026-10-01; matrix Gaps).

**States:** OPTIONS-09 to OPTIONS-13 describe each state on the page. Executed 2026-10-01: while the
dates are pending the stepper reads `No dates` and the page `Loading available dates…`; while the chain
is pending, `Loading options chain…` with a skeleton, and, because the levels already gave a spot, the
metrics bar and levels row show at once, the cards as `TOTAL GEX +0 Positive` and `PUT/CALL OI 0.00
Bullish skew` (the zeroed Greeks; OPTIONS-11); a chain with no rows reads `No options data returned for
<ticker> on <date>` and `Try navigating to a different date using the chevrons above.`, which the real
chain handler cannot produce (it answers 404 for an empty frame), and a dates answer with an empty list
renders `No dates` and nothing else, which the real dates handler cannot produce either (it answers
404); a chain with no deltas and levels with no spot (`method` `none`) reads `Couldn't estimate spot
from this chain` with the advice to enter one, the server's warning in the blue box, no metrics bar,
no heatmap and no Greeks request.

Executed 2026-10-01 with the real handlers' answers on the production chains of 2026-09-30, rendered
in the page, the Greeks answers being the handler's at the spot the page posted. IWM, complete:
`TOTAL GEX -59.6M Negative` (`TOTAL VEX -970.0M` under `VEX`), `GAMMA FLIP $275.74 Below gamma flip,
trending / vol-amplifying`, `MAX PAIN $285`, `PUT/CALL OI 2.28 Bearish skew`, three `★ King` chips,
five `◆ Gate`, two `⇅ Flip`, the header `GEX by Strike, Net: ±15% range (95 strikes)` and the footer
`Source: AlphaVantage EOD · Cloud SQL · 5600 contracts · snapshot 2026-09-30`. The Greeks request
carried `spot_price` 290.0, the delta proxy's strike, while the toolbar read `Spot: parity` over
`277.99`; at the parity spot the card would read `-54.8M`, Swing's figure for the same chain (matrix
Gaps). SPX (4871 calls, no gamma, open interest 0): `Spot: median_strike`, the blue box listing both
warnings (`Spot estimated from median strike ...`, `Vendor gamma missing on ALL 4871 contracts
...`), and under it the cards `TOTAL GEX +0 Positive`, `GAMMA FLIP --`, `MAX PAIN $200` and
`PUT/CALL OI 0.00 Bullish skew`, over 365 strikes with no bar value: a zero, the lowest strike and a
skew read from no data, beneath a warning that says there is none. SPY (the EOD chain holds calls
only): `TOTAL GEX +221.1M Positive`, `GAMMA FLIP $770.42`, `MAX PAIN $50`, `PUT/CALL OI 0.00 Bullish
skew`, ten `★ King` chips and no warning (the proxy and the server's `delta` spot agree on 775.0, so
this one is not shifted; matrix Gaps).

**Acceptance criteria:**
- Given the populated fixtures, when Profiles is chosen, then the view shows the date, the spot, the
  four cards, the levels row, the heatmap header and the footer listed above (executed 2026-10-01;
  the pieces a test on main asserts follow).
- Given a Greeks answer with a King at 220, gatekeepers at 219 and 222 and a midpoint band of 220.5
  to 221.5, then the heatmap draws one `★`, two `◆` and one `●`
  (`renders King/Gatekeeper/Midpoint badges when the taxonomy is populated (Profiles tab)`,
  `tests/options/options-flow.spec.ts`, on main at eca7078).
- Given the levels fixture, then the spot-method chip, the `★ King $` and `◆ Gate $` chips, the
  `Total GEX` and `Gamma Flip` labels and the regime label `Positive gamma` show
  (`options page shows spot method chip when /levels resolves`, `options page shows King/Gate taxonomy
  chips`, `options page renders the metrics bar`, `regime chip uses Positive/Negative/Unclear
  wording`, `tests/shared/gamma-levels.spec.ts`, on main; the metrics test asserts the two labels and
  no value).
- Given the Cloud SQL chain answers 404 and the proxy answers with `metadata.source`
  `alphavantage_live`, then the footer reads `AlphaVantage Live` (`falls back to live endpoint and
  shows AlphaVantage Live badge`, `options-flow.spec.ts`, on main); executed 2026-10-01 with a
  proxy timestamp of 20:00:05Z: `Source: AlphaVantage Live · 10 contracts · snapshot 2026-09-30 16:00
  ET`.
- Given a spot is typed, then `/levels` is asked with `?spot=<value>`, the Greeks are posted with that
  `spot_price` and the chain is not asked again, the chip is hidden and the heatmap's spot line reads
  the typed value (executed 2026-10-01 with 225).
- Given a chain with usable deltas and no typed spot, then the Greeks are posted at the local delta
  proxy's spot and not at the server's parity spot (executed 2026-10-01 on the real IWM chain:
  `spot_price` 290.0 against 277.995, `TOTAL GEX -59.6M` against Swing's −$54.8M; matrix Gaps).
- Given a step to a date whose chain has the same contract count and spot, within 60 seconds, then
  no Greeks are requested and the cards keep the previous date's answer (executed 2026-10-01; matrix
  Gaps).
- Given a chain with no usable delta, then no contract is taken as the spot
  (`estimateSpotStrikeFromDeltas`, four cases, `src/components/options/swingGridUtils.test.ts`).
- Given a request for the Greeks, then the response keeps the keys `aggregated`, `gex_by_strike`,
  `metrics`, `nodes` and `config`, the total equals the per-strike sum, a call-heavy strike is positive
  and a put-heavy one negative, the King sits at the largest |gamma| and the put/call ratio is put OI
  over call OI (`TestGreeksContractShape`, `TestGreeksMath`, `tests/api/test_options_router.py`,
  which call the handler function directly).
- Given the live proxy, then it maps AlphaVantage's rows to the Cloud SQL shape, answers the second
  call from the cache and answers 503, 400, 429 or 404 as listed above (`tests/api/test_options_live.py`,
  eleven handler tests and five on `_av_to_contracts`).
- Given a failed Greeks request with a spot known, then the cards read `Total GEX +0` and `Put/Call
  OI 0.00` (executed 2026-10-01; solyra#74; encoded as an expected failure on this branch, OPTIONS-11).
- Given `VEX` is pressed, then the first card reads `Total VEX` and the header `VEX by Strike`, and
  the bars keep their GEX values (executed 2026-10-01; matrix Gaps).
- Given a chain with no gamma and no open interest, then the page lists the API's warnings and the
  cards read `+0`, `--`, `$200` and `0.00` (executed 2026-10-01 on the production SPX chain; matrix
  Gaps).

**Tests:** On main, the Playwright tests above (page) and the pytest files above (handlers):
`options-flow.spec.ts` and `gamma-levels.spec.ts` assert the badges, the chips, the labels and the
live badge from mocked answers, `swingGridUtils.test.ts` the spot helper, `test_options_router.py`
the Greeks handler, `test_options_live.py` the proxy, and `tests/lib/test_gamma.py` the aggregation
behind both. The renders-strike-values and chart-axes tests of `options-flow.spec.ts` assert that
a `/220/` text and the words `calls` and `puts` are visible, which is presence only and earns nothing
on its own. No test on main asserts a metric value, the Greeks and levels requests' parameters, the spot
input, the metric and side toggles, the EOD footer, the `Couldn't estimate spot` notice or the Cloud SQL
chain handler's response body (it is reached only through `/levels` and answers 404 against a dead
backend, `tests/api/test_route_coverage.py`); the dates handler's query is asserted only through its
cache and its 503 (`tests/api/test_threadpool_races.py`, `test_options_dates_is_not_a_500`). The plain
test added on this branch, `a failed Greeks request leaves the EOD footer and the King chip on screen and
is attempted twice` (`tests/options/options-flow.spec.ts`, solyra commit `9543894`, not yet run in CI),
asserts the footer's text on the fixture chain, and earns nothing at Te until a CI run includes it.

**Code:** `src/components/options/ProfilesTab.tsx:1-648`, `src/hooks/useOptionsDates.ts:56-67`,
`src/hooks/useGammaLevels.ts:74-145`, `src/hooks/useOptionsGreeks.ts:1-158`,
`src/components/options/swingGridUtils.ts:84-112`, `src/lib/time.ts:20-35`;
`platform/api/routers/options.py:318-847`, `lib/gamma.py:232-460,548-620,852-935`; no test id (the
view is found by its text and the placeholder `price`).

##### OPTIONS-06 · Symbol picker

**Shows or does:** The page's first control (`src/routes/OptionsFlowPage.tsx:37-41`): the label
`Symbol` and the shared `TickerCombobox` (`src/components/shared/TickerCombobox.tsx`), a trigger
button (`aria-label="Active ticker"`, test id `ticker-combobox`) that shows `activeTicker` and opens a
popover with the quick picks IWM, SPY and QQQ, the recent picks and, once a character has been typed
for 300 ms, a symbol search whose rows carry a coverage badge (`full`, `daily` or `new`). The
component is the one DASHBOARD-10 describes in full (keyboard, the popover's own search, coverage and
watchlist states, the `Tracking <SYM>: daily data lands after tonight's fetch` notice). A pick writes
the upper-cased symbol to `activeTicker` and the recents in `useTickerStore`
(`src/stores/tickerStore.ts:14-34`, persisted as `ticker-store`), and a pick of a search row badged
`new`, with a healthy coverage lookup, also posts the symbol to the watchlist
(`TickerCombobox.tsx:259-291`).

What a pick does on this page (executed 2026-10-01, hermetic render, SPY then AAPL):

- Gamma Map, Swing Mode and Profiles follow it. Swing reads `activeTicker` through `focusSymbol`
  (`OptionsFlowPage.tsx:65`) and asked for `GET /api/options/dates/SPY?limit=1`, the live grid and
  the levels for SPY; Profiles asks for `GET /api/options/dates/SPY`, the SPY chain and the Greeks
  (`OptionsFlowPage.tsx:67`).
- Trinity does not follow it: its three symbols are fixed (`TrinityTab.tsx:13`), and after the pick it
  asked for SPX and QQQ only, SPY's dates and levels coming from the cache (OPTIONS-02).
- The Flow view does not follow it: the placeholder tape's first row was still the DVN row
  (OPTIONS-03).
- Any symbol the search offers can be chosen, and the options routes accept only SPY, IWM, QQQ and SPX
  (`VALID_TICKERS`, `platform/api/routers/options.py:86,150-157`). After the pick of AAPL from the
  search, Profiles asked for `GET /api/options/dates/AAPL`, the route answered 400 `Ticker must be one
  of ['IWM', 'QQQ', 'SPX', 'SPY'], got 'AAPL'`, and the view read `No options dates available for AAPL`
  with that text and a `Retry` button. Swing asked for `GET /api/options/dates/AAPL?limit=1` (the same
  400, unread) and `GET /api/options/AAPL/grid?strike_window_pct=6`: the grid router accepts any
  alphanumeric symbol of ten characters or fewer (`platform/api/routers/grid.py:120-124`) and, with
  nothing in Cloud SQL, fetches the chain from AlphaVantage on demand, at most ten distinct symbols per
  client IP per minute, and writes it back (`grid.py:408-613,678-711`). With the on-demand fetch
  refused (503, as in the render) the card read `Data unavailable: No options grid available for this
  symbol.`; with it answering, Swing draws a grid but no gates (no levels request without a date) and
  the legend's Hedge chip and the node list's mock Midpoint and Hedge rows do not appear, because
  they need the levels taxonomy (`SwingMode.tsx:526-533`; executed with a populated grid and a 400 on
  the dates). The vendor answer itself was not requested.

**Needs:** `GET /api/insights/ticker/search?keywords=&limit=8` (`src/hooks/useTickerSearch.ts:55-68`,
60 seconds stale), `GET /api/market/coverage?symbols=<the result symbols>`
(`useTickerSearch.ts:84-95`) and, for a `new` pick, `POST /api/insights/watchlist/add` with
`{ticker}` (`useTickerSearch.ts:101-125`). All three are gated; no endpoint serves a symbol filter for
the options routes, so the picker cannot tell which symbols the page's views can show. Server side:

- The search (`platform/api/routers/insights.py:544-556`) passes the keywords to AlphaVantage
  `SYMBOL_SEARCH` with no filter on type or region (`lib/ticker_info.py:403-446`, at most 20 rows) and
  answers an empty list, with a 200, when no key is configured or the vendor call fails
  (`ticker_info.py:414-433`), so the picker reads `No matches for ...` for an outage (matrix Gaps).
- Coverage (`platform/api/main.py:1231-1266`) runs two batched statements, `SELECT DISTINCT ticker`
  from `market_data_daily` and from `market_data_intraday` with `ticker = ANY(<symbols>)`, through the
  strict helper (503 on any failure, `main.py:1218-1228`), truncating the symbols to the first 50. The
  intraday statement reads every row of the matching tickers before it removes duplicates
  (CLAUDE.md 3.8, shape A). Executed 2026-10-01 against production for `SPY, IWM, QQQ, SPX, AAPL`: the daily statement
answered AAPL, IWM, QQQ and SPY in 4,438 ms and the intraday one the same four in 4,344 ms; the
`EXPLAIN (ANALYZE, BUFFERS)` of the intraday statement reports `Execution Time: 4671.042 ms` and
`rows=4` from a parallel append that reads about 7.35 million rows (sequential scans of the `spy`,
`qqq` and `iwm` partitions, an index-only scan of `other`). The handler has no cache and the hook
holds an answer for 60 seconds, so each distinct set of search results pays that (matrix Gaps). SPX
has no row in either table, so a search row for SPX carries the `new` badge (`coverageBadge`,
`src/components/shared/TickerCombobox.tsx:24-28`).
- The watchlist add (`insights.py:599-674`) writes the symbol to `watchlists` for the caller
  (`gcp/fetchers/_watchlist.py`; a 503 with the database's text on a failed write), then, with the
  vendors answering or not, reads AlphaVantage OVERVIEW and GLOBAL_QUOTE and FinViz peers for the
  response, and re-reads the caller's list, answering an empty list when that read fails
  (`insights.py:641-643`); the picker reads none of the response, only success or failure. Production
on 2026-10-01: `watchlists` holds 18 rows from three sources (`avgo-peer` 9, `discord-replay` 3, `seed`
6) and none from `ui`, the source the add writes (`insights.py:629`), and `ticker_info` holds no row at
all, the cache `lib/ticker_info.py:61-98` fills (matrix Gaps).

**States:** The popover's inline states are DASHBOARD-10's (`ticker-search-error`,
`ticker-coverage-error`, `ticker-ingest-notice`); on this page a 401 on any of the three calls reads
there too (`search unavailable (search 401)`, the coverage hint, `couldn't add <SYM> to tracking,
HTTP 401: sign in to continue`). The page's views show OPTIONS-09 to OPTIONS-13 for the new symbol.

**Acceptance criteria:**
- Given the page has loaded, when the trigger is pressed, then the popover offers IWM, SPY and QQQ,
  and a pick sets the trigger, the store and the recents (`tests/dashboard/ticker-combobox.spec.ts`,
  the same component mounted on `/dashboard`, on main at eca7078, with the other criteria of
  DASHBOARD-10; `src/stores/tickerStore.test.ts` and `src/components/shared/tickerCombobox.test.ts`).
- Given SPY is picked on this page, then Swing and Profiles ask for SPY, Trinity and Flow do not
  change (executed 2026-10-01; no committed test mounts the picker on `/options`).
- Given a symbol outside SPY, IWM, QQQ and SPX is picked, then Profiles reads `No options dates
  available for <SYM>` with the route's 400 text (executed 2026-10-01).
- Given a request for `symbols=SPY,AAPL,IWM,QQQ,XLK`, then coverage runs two statements and answers
  `{intraday, daily}` per symbol, and given a failing database it answers 503 with no coverage
  (`test_coverage_endpoint_batches_queries`, `test_coverage_endpoint_503s_loud_on_db_failure`,
  `test_coverage_from_frames_shapes`, `tests/api/test_market_coverage.py`).
- Given keywords, the search answers the vendor's matches, and given empty keywords it answers 400
  (`test_search_endpoint`, `test_search_endpoint_rejects_empty_keywords`, `TestSearchTickers`,
  `tests/api/test_ticker_info.py`); given no key it returns an empty list
  (`test_returns_empty_without_key`, the same file).
- Given a watchlist add, then the router passes the owner, the signed-in user or `default`, to the
  write, two users reach it with two owners, and the response carries the enrichment, all with the
  write itself patched out (`TestWatchlistMutationAPI`, `tests/api/test_platform_api.py`;
  `test_watchlist_add_endpoint`, `tests/api/test_ticker_info.py`); no test asserts the write.
- Given no token, then each of the three routes answers 401 on staging (V-gate evidence,
  2026-10-01).

**Tests:** On main, the component is asserted by twenty tests of
`tests/dashboard/ticker-combobox.spec.ts` and the two Vitest files named above, and the three
handlers by the pytest files named above: the add by tests that patch its write out, and, in
`tests/api/test_route_coverage.py`, the search at 200, the coverage at 503 and the watchlist add at
503 against a dead backend, where the real write is entered and raises (executed 2026-10-01 with a
spy that calls through: the real function was entered and raised the harness's `_BackendDown`);
`tests/shared/popover-fit.spec.ts` asserts the popover stays inside two phone viewports (on the
Dashboard). The write itself, `add_to_watchlist` (`gcp/fetchers/_watchlist.py:492-557`), is asserted
by no test: `tests/gcp/test_watchlist_helper.py` covers the loader, its helpers, the fallback alert
and the membership lookup and never calls it, `tests/api/test_platform_api.py` and
`tests/api/test_ticker_info.py` patch it out, `tests/api/test_route_coverage.py` enters it against a
dead backend and asserts only the router's 503, and `tests/gcp/test_backfill_ticker.py` tests the
CLI's own function of that name (`gcp/backfill_ticker.py:308`). No test mounts the picker on
`/options` or asserts that Swing and Profiles follow a pick, that the other two views do not, or
what a symbol outside the four reads; no test asserts the coverage statements' cost.

**Code:** `src/routes/OptionsFlowPage.tsx:30-41`, `src/components/shared/TickerCombobox.tsx:147-513`,
`src/hooks/useTickerSearch.ts:55-125`, `src/stores/tickerStore.ts:14-34`;
`platform/api/routers/insights.py:544-674`, `platform/api/main.py:1218-1266`,
`lib/ticker_info.py:403-446`; test ids `ticker-combobox`, `ticker-combobox-panel`,
`ticker-combobox-input`, `ticker-option-<SYM>`, `ticker-search-error`, `ticker-coverage-error`,
`ticker-ingest-notice`.

##### OPTIONS-07 · View switcher

**Shows or does:** The segmented control at the right of the page toolbar
(`src/routes/OptionsFlowPage.tsx:44-60`): three buttons, `Gamma Map`, `Flow` and `Profiles`, each
with an icon, built from `TABS` (`OptionsFlowPage.tsx:24-28`). The chosen view is the `tab` state
(`OptionsFlowPage.tsx:32`, initially `gamma-map`); the active button takes a brand tint and a pressed
click calls `setTab` (`OptionsFlowPage.tsx:49-54`). Below the sign-in banner and `DataGate`, exactly
one view is mounted: `GammaMapSection`, `FlowSection` or `ProfilesTab` (`OptionsFlowPage.tsx:63-68`).
Two of the views hold a second switcher of their own, a HeroUI single-selection `ToggleButtonGroup`
with `disallowEmptySelection`, which reads as a `radiogroup` of two `radio`s with `aria-checked`
(executed 2026-10-01): Gamma Map has `Swing Mode` (the default) and `Trinity Mode`
(`src/components/options/GammaMapSection.tsx:26-48`), and Flow has `Live Feed` (the default) and
`Contract Drilldown` (`src/components/options/FlowSection.tsx:20-52`); a click on a feed row also
moves Flow's toggle to the drilldown (`FlowSection.tsx:23-26`).

A view is unmounted when another is chosen, so its local state is lost (executed 2026-10-01):
Swing set to `Historical`, `VEX` and `0DTE`, then Trinity and back, read `Live`, `GEX` and `All`; the
Profiles stepper moved two dates back read the newest date again after a visit to Flow; and Flow and
Gamma Map return to their default toggle. React Query keeps the fetched data, so a return inside the
stale times asks for nothing again. The three buttons are plain `button`s with no `aria-pressed`,
`aria-selected` or `role`, and the container has no role or label, so the chosen view is shown by colour
alone (executed 2026-10-01); Enter on a focused button changes the view, as on any button.

**Needs:** Nothing: client state only. The Chain's `none (client state)` cells are right
(`OptionsFlowPage.tsx:32,49`).

**States:** None of its own. The control sits above `SignInBanner` and `DataGate`
(`OptionsFlowPage.tsx:63-68`), so it stays usable in every state of the views below it.

**Acceptance criteria:**
- Given the page opens, then `Gamma Map` is the chosen view, Swing Mode shows, and Trinity, Flow and
  Profiles are not mounted (executed 2026-10-01; asserted on this branch by `the view switcher mounts
  one view at a time and each inner toggle swaps its own view`, `tests/options/options-flow.spec.ts`,
  solyra commit `d82c20b`, not yet run in CI).
- Given a button is pressed, then its view replaces the one shown and no other view is mounted; given
  an inner toggle is pressed, then that section swaps its own two views; given a Live Feed row is
  clicked, then the drilldown opens for that row's contract; given `Gamma Map` is pressed again, then
  Swing shows (the same branch test; for each step the other four views are asserted absent).
- Given the page opens, then the `Symbol` label and the three buttons are visible (`navigates to
  /options`, `tests/options/options-flow.spec.ts`, on main at eca7078).
- Given `Flow` is pressed, then `Demo data, not live.` is visible (`Flow tab shows the demo banner
  text`, `tests/options/demo-banners.spec.ts`, on main); given `Profiles` is pressed, then its heatmap
  content shows (the Profiles tests of `options-flow.spec.ts` and `gamma-levels.spec.ts`, on main);
  given `Trinity Mode` is pressed, then the three Trinity requests are issued (the Trinity test of
  `options-flow.spec.ts`, on main).
- Given a phone viewport, then pressing `Flow` or `Profiles` leaves the document no wider than the
  viewport (`Flow tab does not overflow the viewport`, `Profiles tab does not overflow the viewport`,
  `tests/options/options-mobile-fit.spec.ts`, on main, two phone widths).
- Given a view is left and entered again, then its local state is back to the default (executed
  2026-10-01; no test).

**Tests:** On main, each button is pressed by some test, to reach the view's content, and the page's
landmarks are asserted, but no test on main asserts that a switch replaces the view, which view is
chosen, either inner toggle's second view other than Trinity's requests, or the drill-through; those
assertions exist only in the test added on this branch, so Te stays unticked until a CI run includes
it.

**Code:** `src/routes/OptionsFlowPage.tsx:22-70`, `src/components/options/GammaMapSection.tsx:15-50`,
`src/components/options/FlowSection.tsx:15-55`; no test id (the buttons are found by role and name,
the inner toggles by role `radio`).

##### OPTIONS-08 · Pick an expiration date

**Shows or does:** The seed's `Pick an expiration date` does not exist as such: no view of the page
picks an expiration. Two controls stand in its place.

- The Profiles date stepper (`src/components/options/ProfilesTab.tsx:385-404`): two icon-only
  chevron buttons around a monospaced date, in the Profiles toolbar. The date is `dates[dateIdx]`
  from `GET /api/options/dates/{ticker}`, newest first, and `No dates` while there is none
  (`ProfilesTab.tsx:271-279,395`). The left chevron steps to the previous snapshot date, an older one
  (`ProfilesTab.tsx:388`), and is disabled on the oldest; the right one steps to a newer date and is
  disabled on the newest, where the view opens (`ProfilesTab.tsx:398`). It steps snapshot dates, the
  days on which a chain was ingested, not expirations. The chosen date drives the chain
  (`GET /api/options/{ticker}/{date}`, the live proxy on a 404), `/levels` and, through the chain, the
  Greeks (OPTIONS-05). The buttons have no accessible name, no `aria-label` and no title (executed
  2026-10-01), so a screen reader announces two unlabelled buttons and the date.
- Swing's expiry chips (`src/components/options/SwingMode.tsx:47,285-293`): `All`, `0DTE`, `Weekly`,
  `Monthly` and `Quarterly`. `expiryFilter` is read only to set the pressed chip's `active` class
  (`SwingMode.tsx:288`) and reaches neither the grid request nor `RealHeatmapGrid`
  (`SwingMode.tsx:794,941-942,952-960`). Executed 2026-10-01: pressing each chip changed only the
  highlight, issued no request, and left the grid's text and its two expiration columns (`04/24 0DTE`,
  `05/15 21d`) as they were (matrix Gaps).

Swing and Trinity cannot choose a date at all: both use the newest listed date (`dates[0]`), and
Swing's `Historical` button asks for that same date (`GET /api/options/IWM/2026-04-24/grid`, executed
2026-10-01, `SwingMode.tsx:799-808`), so it is the EOD grid of the newest date and not a way to look back.

**Needs:** The stepper uses OPTIONS-05's calls: `GET /api/options/dates/{ticker}` without `limit`,
then, for the chosen date, `GET /api/options/{ticker}/{date}` (and `GET
/api/options/live/{ticker}/{date}` on a 404) and `GET /api/options/{ticker}/{date}/levels`, and the
Greeks POST when the step gives the hook a key it holds no answer for (a contract count and spot not
asked for before; `src/hooks/useOptionsGreeks.ts:111`: the key holds neither date nor ticker) and,
once the answer it holds is more than 60 seconds old (`:141`), when the step goes to a chain not yet
fetched. `@tanstack/query-core` 5.102.8 re-requests a stale answer on a step only when the hook's
query changes or `enabled` was false (`queryObserver.js:330-332`): a chain not yet fetched is `[]`
while it loads, so the key's count is 0 and `enabled` false, and the query changes again when the
chain arrives, whereas a cached chain with the same count and spot keeps both and nothing is asked,
however old the answer. Executed 2026-10-01: from the newest of three dates, one step back issued
`GET /api/options/IWM/2026-04-23` and `GET /api/options/IWM/2026-04-23/levels` and no Greeks POST,
because both fixture chains held ten contracts at a spot of 220; a step forward to a date already
visited issued nothing. With each Greeks POST answered by a different Total GEX, the card kept the
first answer, `+1.0M`, after the step, so the previous date's Greeks sat beside the new date's
chain, and it read `TOTAL GEX +0 Positive` while the chain of a date not yet visited loaded. After
64 seconds, two steps to cached chains issued no POST and left `+1.0M`, and a step to a chain not
yet fetched posted at once, the card reading `+1.0M` until the second answer, `+2.0M`, arrived
(matrix Gaps). The date index is state of the Profiles view: it returns to the newest date when the
ticker changes (`ProfilesTab.tsx:261-269`) and when another view is chosen and Profiles is mounted
again (executed 2026-10-01: two steps back, a visit to Flow and back read the newest date).
The chips need nothing. The Chain's API cell is OPTIONS-05's and its Backend cell is right to say the
chips are client state only; its wording that the stepper refetches "the chain, levels and Greeks per
step" overstated the Greeks, corrected in the Chain.

**States:** The stepper has none of its own. With no dates it reads `No dates` and both chevrons are
disabled (`dates.length - 1` is below zero, `ProfilesTab.tsx:389,399`); the dates error, the chain error
and the loading lines are OPTIONS-11 and OPTIONS-09.

**Acceptance criteria:**
- Given three snapshot dates, when Profiles is chosen, then the stepper reads the newest, the newer
  chevron is disabled and the older one enabled; when the older chevron is pressed, then the stepper
  reads the previous date, both chevrons are enabled, and that date's chain and levels are requested;
  when it is pressed again, then the oldest date shows, the older chevron is disabled and its chain and
  levels are requested; when the newer chevron is pressed, then the previous date shows again (executed
  2026-10-01; asserted on this branch by `the Profiles date stepper walks the snapshot dates and loads
  the chain and levels of the date it lands on`, `tests/options/options-flow.spec.ts`, solyra commit
  `d82c20b`, not yet run in CI).
- Given the page opens, then Swing asks for one date (`limit=1`) and Profiles for the whole list (`the
  Swing view asks for one date; the Profiles picker asks for all`, `tests/options/options-flow.spec.ts`,
  on main at eca7078).
- Given an expiry chip is pressed, then only the chip's highlight changes: no request, no change to the
  grid (executed 2026-10-01; no test).
- Given the live grid, then it takes a `strike_window_pct` and an optional `expirations` list of ISO
  dates that the page never sends (`platform/api/routers/grid.py:619-632`), so a real expiry filter
  would need a request change as well as a handler (read; not executed).

**Tests:** None on main asserts the stepper or the chips: the dates-limit test asserts the request
URLs only. The test added on this branch asserts the stepper and not the chips, so Te stays unticked
until a CI run includes it. The server side of the dates is asserted by `test_options_dates_is_not_a_500`
and `test_the_final_four_guards_keep_the_split` (`tests/api/test_route_coverage.py`) and the cache tests
of `tests/api/test_threadpool_races.py`, none of which runs the walk's SQL.

**Code:** `src/components/options/ProfilesTab.tsx:255-293,385-404`,
`src/components/options/SwingMode.tsx:47,241-319,791-808`, `src/hooks/useOptionsDates.ts:56-67`,
`src/hooks/useOptionsGreeks.ts:104-143`; `platform/api/routers/options.py:318-521`; no test id (the
chevrons are found through the date label they flank).

##### OPTIONS-09 · State: loading

**Shows or does:** A state, not a control: what each of the three data views shows while its requests
are in flight. The page itself has no loading state (`src/routes/OptionsFlowPage.tsx:22-70`) and the
Flow view makes no request, so it has none either. The state is three separate pieces of copy:

- Swing (`src/components/options/SwingMode.tsx:606-613`): the heatmap card keeps its header `Strike
  × Expiration heatmap · <SYM>` and reads `Loading live grid…`. The banner and the source pill read
  the grid's source with a default of `unavailable` (the pill at `SwingMode.tsx:943`, the banner at
  `:916`), so while the request is in flight the banner says `Live <SYM> grid unavailable, tactical
  read is illustrative.` and the pill reads `UNAVAILABLE` (hint `No snapshot available`; matrix
  Gaps). With `/levels` also pending, the legend and the node list are not drawn
  (`SwingMode.tsx:946`) and the pivot rail is absent.
- Trinity (`src/components/options/TrinityTab.tsx:97-101`): each of the three panels reads `Loading
  <SYM> levels…` under its header, until its own dates and levels requests both settle.
- Profiles (`src/components/options/ProfilesTab.tsx:468-475`): with the dates pending, the stepper reads
  `No dates` and a box reads `Loading available dates…` over a five-row skeleton (`WidgetSkeleton`);
  with the chain pending, `Loading options chain…` over the same skeleton.

What the pending views draw beside the loading line (executed 2026-10-01, hermetic renders, the
request held open in each case):

- Profiles, chain pending while `/levels` has answered: the metrics bar and the levels row are already
  on screen, with the cards `TOTAL GEX +0 Positive`, `MAX PAIN --` and `PUT/CALL OI 0.00 Bullish skew`
  beside `GAMMA FLIP $219.50`. The zeros are `EMPTY_GREEKS` (`ProfilesTab.tsx:326`,
  `src/hooks/useOptionsGreeks.ts:145-158`), shown because a spot is known (`ProfilesTab.tsx:503`);
  with the Greeks pending and no heatmap yet, the same zero cards stay (OPTIONS-11, matrix Gaps).
- Swing in Historical mode with the dates pending: the grid query is disabled until a date exists
  (`SwingMode.tsx:807`), so the card reads `Data unavailable: No options grid available for this
  symbol.` and not a loading line (OPTIONS-10).

**Needs:** Nothing of its own: the requests in flight are OPTIONS-01's, OPTIONS-02's and OPTIONS-05's.
The app's query defaults hold an answer for five minutes and retry a failed request once
(`src/App.tsx:30-36`), the dates and chain hooks opt out of the retry (`useOptionsDates.ts:56-67`,
`ProfilesTab.tsx:40-61`), so a failing Greeks request is asked a second time before it counts as
failed (executed 2026-10-01: a failing Greeks POST was issued twice).

**States:** This is the loading state of the page's data views. Nothing marks it for assistive
technology: the lines are plain text with no `role` or `aria-busy` (read, `SwingMode.tsx:608-612`,
`TrinityTab.tsx:98-100`, `ProfilesTab.tsx:468-475`).

**Acceptance criteria:**
- Given the live grid request is held, then the card reads `Loading live grid…`, the pill
  `UNAVAILABLE` and the banner `Live <SYM> grid unavailable, tactical read is illustrative.`
  (executed 2026-10-01; no test; matrix Gaps).
- Given the Trinity requests are held, then each panel reads `Loading <SYM> levels…` (executed
  2026-10-01; no test).
- Given the dates request is held, then the Profiles stepper reads `No dates` and the view `Loading
  available dates…`; given the chain request is held, then it reads `Loading options chain…` (executed
  2026-10-01; no test).
- Given the chain is pending and `/levels` has answered, then the cards read `+0`, `--` and `0.00`
  beside a real Gamma Flip (executed 2026-10-01; matrix Gaps).

**Tests:** None. No test asserts a loading text: a search of `tests/` and `src/` for the three Profiles
and Swing lines and the Trinity one finds them only in the components. Every Playwright test that opens
`/options` passes through the state while its fixture routes answer, and none waits on or reads it.

**Code:** `src/components/options/SwingMode.tsx:606-613,916,943`,
`src/components/options/TrinityTab.tsx:56-60,97-101`,
`src/components/options/ProfilesTab.tsx:271-279,468-475`, `src/hooks/useOptionsGreeks.ts:145-158`;
no test id (the lines are found by their text).

##### OPTIONS-10 · State: empty

**Shows or does:** A state, not a control: what each data view says when there is nothing to draw. The
page has none of its own, and Flow cannot be empty. Six lines of copy, in three components:

- Swing (`src/components/options/SwingMode.tsx:616-625`): `Data unavailable: <reason>` in the heatmap
  card when the grid request failed, the envelope's `data_source` is `unavailable`, or the grid has no
  columns. The reason is the envelope's `reason`, else its first warning, else `No options grid
  available for this symbol.`. Executed 2026-10-01: an `unavailable` envelope with its reason read
  `Data unavailable: no realtime or EOD chain found within the lookup window`; a 200 grid with no
  cells and the warning `Could not estimate spot from this chain.` read `Data unavailable: Could not
  estimate spot from this chain.`. The banner and pill follow the source (OPTIONS-09, OPTIONS-12), and
  the legend and node list still draw when `/levels` answered, so beside the unavailable card they
  show a King, gates and totals (matrix Gaps).
- Trinity (`src/components/options/TrinityTab.tsx:103-113`): `No gamma levels available for <SYM>.`
  when a dates or levels request failed or no date came back, and `Chain too thin to build a ladder for
  <SYM>.` when `levels` is empty. The second states a cause the panel does not know: an empty `levels`
  is also what a chain with no vendor gamma produces (OPTIONS-02; executed 2026-10-01 on the
  production SPX chain of 2026-09-30, which read `SPX 7,240` over that text).
- Profiles, no dates (`src/components/options/ProfilesTab.tsx:428-446`): `No options dates available
  for <ticker>`, the server's `detail` beneath it and a `Retry` button. The box serves every failure
  of the dates request, so a 404 for a ticker with no snapshots, the 400 for a symbol outside SPY, IWM,
  QQQ and SPX and a 503 all read alike (OPTIONS-11). A 200 with an empty list reads only `No dates` in
  the stepper and nothing else, which the real dates handler cannot answer (it answers 404 when no
  snapshot was ever ingested, `platform/api/routers/options.py:318-521`).
- Profiles, no contracts (`ProfilesTab.tsx:622-629`): `No options data returned for <ticker> on <date>`
  and `Try navigating to a different date using the chevrons above.` when the chain answers 200 with no
  rows. The real chain handler cannot answer it: it answers 404 for an empty frame
  (`options.py:580-604`), and Profiles then asks the live proxy.
- Profiles, no spot (`ProfilesTab.tsx:479-491`): `Couldn't estimate spot from this chain` with the
  advice to enter a spot, when the chain has rows and no spot resolves (OPTIONS-05).

Executed 2026-10-01 (hermetic renders): AAPL picked from the search read `No options dates available
for AAPL` with the route's 400 text on Profiles, `Data unavailable: No options grid available for this
symbol.` on Swing (grid 503) and `Live AAPL grid unavailable, ...` in the banner (OPTIONS-06).

**Needs:** Nothing of its own: the answers are OPTIONS-01's, OPTIONS-02's and OPTIONS-05's.

**States:** This is the empty state of the page's data views. Of the six lines, `No options data
returned for ...` is not reachable through the real handlers, and neither is a dates answer with an empty
list, which reads only `No dates`; the other five are reached by 404, 400, 503, an `unavailable` envelope
or a chain with no gamma.

**Acceptance criteria:**
- Given the dates request answers an error, then Profiles reads `No options dates available for
  <ticker>` with the server's `detail` and a `Retry` button (executed 2026-10-01 with the 404, 400 and
  503 texts the real handler sends; no test).
- Given the dates answer is 200 with no date, then the stepper reads `No dates` and nothing else
  explains it (executed 2026-10-01; no test).
- Given the chain answers 200 with no contracts, then Profiles reads `No options data returned for
  <ticker> on <date>` and the advice (executed 2026-10-01; no test).
- Given an `unavailable` grid envelope, then the card reads `Data unavailable: <reason>` (executed
  2026-10-01; the server side: `TestGridLive`, `tests/api/test_grid_router.py`, asserts the envelope
  and its HTTP 200).
- Given a Trinity panel whose request failed or whose ladder is empty, then it reads `No gamma levels
  available for <SYM>.` or `Chain too thin to build a ladder for <SYM>.` (executed 2026-10-01; no
  test).

**Tests:** None on the page: no test asserts any of the six lines (a search of `tests/` and `src/`
finds the texts only in the components). The grid handler's `unavailable` envelope is asserted by
`tests/api/test_grid_router.py` and `tests/api/test_route_coverage.py` pins the dates route at 503
against an unreachable database, which is the status the Profiles box then reads. Every Playwright
test that opens `/options` answers its requests with data, so none mounts these branches.

**Code:** `src/components/options/SwingMode.tsx:606-625`,
`src/components/options/TrinityTab.tsx:56-58,103-113`,
`src/components/options/ProfilesTab.tsx:428-446,479-491,622-629`;
`platform/api/routers/options.py:318-521,580-604`, `platform/api/routers/grid.py:192-217`; no test id.

##### OPTIONS-11 · State: error

**Shows or does:** A state, not a control: what each data view does when a request fails. The page has
none of its own. What each view reads, with the request that fails (executed 2026-10-01, hermetic
renders; the response texts are the ones the real handlers send):

- Profiles, the chain (`src/components/options/ProfilesTab.tsx:448-466`): a box `Options chain
  unavailable`, the server's `detail` and a `Retry` button. The chain hook asks the live proxy only
  after a 404 and throws the server's text for any other failure (`ProfilesTab.tsx:40-61`), so a 500
  read `chain exploded` and a 404 whose live fallback answered 503 read `AlphaVantage API key not
  configured. Set AV_API_KEY (or ALPHA_VANTAGE_API_KEY) in the environment / Secret Manager.`, the
  operational text shown to the user verbatim. `Retry` asks again: a 503 `The options chain is being
  computed now; retry shortly.` followed by a 200 drew the full view on the second request.
- Profiles, the dates (`ProfilesTab.tsx:428-446`): the box of OPTIONS-10, `No options dates available
  for <ticker>`, with `Could not read option snapshot dates for IWM: the database is unavailable.`
  for a 503, and a `Retry` that recovered the same way.
- Profiles, the Greeks (`ProfilesTab.tsx:326`): nothing. With a spot known from `/levels` a failed
  request, asked twice, leaves the metrics bar on `EMPTY_GREEKS` (`src/hooks/useOptionsGreeks.ts:145-158`):
  `TOTAL GEX +0 Positive`, `MAX PAIN --`, `PUT/CALL OI 0.00 Bullish skew` beside the real `GAMMA FLIP`,
  and no heatmap, no box, no alert. A flat reading that cannot be told from a measured one
  (CLAUDE.md Rule 4); filed as solyra#74 and encoded below.
- Profiles, the levels: nothing. With `/levels` answering 503 the levels row and the regime chip are
  absent, `GAMMA FLIP` falls back to the Greeks' `zero_gamma` (`--` in the fixture) and the rest of
  the view draws as usual, with no notice.
- Swing, the grid (`SwingMode.tsx:616-625`): `Data unavailable: No options grid available for this
  symbol.`, the text of a symbol with no grid; the server's `detail` is dropped. The banner and pill
  read `unavailable`, and the legend and node list still draw when `/levels` answered, with Total VEX
  as `—` (a failed grid has no value to show; an `unavailable` envelope shows `+$0K`, OPTIONS-10).
- Swing, the levels or the dates: nothing. With `/levels` 503 the legend and nodes draw from the grid
  (the King the strike of largest |net GEX|, no gates, no Hedge chip); with the dates request 503 the
  grid is asked for once and `/levels` not at all (executed: `GET /api/options/dates/IWM?limit=1`, then
  `GET /api/options/IWM/grid?strike_window_pct=6`), and the view draws without a notice.
- Trinity (`src/components/options/TrinityTab.tsx:57,103-107`): `No gamma levels available for <SYM>.`
  for any failure of either request, whatever the status or the server's text (a 503 on the SPX dates
  request and a 404 on the SPY levels one, with QQQ still drawing its ladder).
- The 401 is OPTIONS-13.

**Needs:** Nothing of its own: the failing requests are OPTIONS-01's, OPTIONS-02's and OPTIONS-05's.
Server side, a database failure is not always a failure: the chain handler and the live grid read
through the swallowing `query_to_dataframe`, so an unreachable database answers 404 `No earlier data
ingested for this ticker` (and Profiles then asks the live proxy) and 200 `unavailable` with the
no-chain reason; only the dates and coverage handlers answer 503 (matrix Gaps; `tests/api/
test_route_coverage.py` pins the 404 and the 503 against a dead backend).

**States:** This is the error state of the page's data views; OPTIONS-13 is the 401 and OPTIONS-10 the
empty state, and several failures land in one of those two lines.

**Acceptance criteria:**
- Given the chain request fails with a status other than 404, then Profiles reads `Options chain
  unavailable`, the server's `detail` and `Retry`, and `Retry` asks again (executed 2026-10-01; no
  test).
- Given the chain answers 404 and the live proxy fails, then the same box reads the proxy's `detail`
  (executed 2026-10-01; no test; `test_options_live.py` asserts the proxy's statuses).
- Given the Greeks request fails after a spot is known, then the view shows the Greeks as
  unavailable and not `Total GEX +0` and `Put/Call OI 0.00`: it does not today (executed 2026-10-01,
  solyra#74). `a failed Greeks request is reported as unavailable, not shown as a measured zero
  (solyra#74)` (`tests/options/options-flow.spec.ts`, solyra commit `d82c20b`, restructured in
  `9543894`, not yet run in CI) asserts that neither `+0` nor `0.00` is on the page and the word
  `unavailable` is, retried until all three hold at once. It is declared `test.fail`, so it is
  expected to fail until #74 is fixed and flags the fix by passing; its RED is the real failure on
  `+0`. The state it examines, the EOD footer and the King chip on screen and two Greeks attempts,
  is asserted by a plain test, `a failed Greeks request leaves the EOD footer and the King chip on
  screen and is attempted twice` (same file, solyra commit `9543894`, not yet run in CI), so that an
  unrelated failure cannot pass for the expected one.
- Given the grid request fails, then Swing reads the no-grid text and the server's reason is lost
  (executed 2026-10-01; no test).
- Given a failed levels or dates request, then Swing and Profiles draw without a notice (executed
  2026-10-01; no test).
- Given a failed Trinity request, then the panel reads `No gamma levels available for <SYM>.` whatever
  the failure (executed 2026-10-01; no test).

**Tests:** None on main asserts an error text. One test on main answers requests with a failure:
`falls back to live endpoint and shows AlphaVantage Live badge`
(`tests/options/options-flow.spec.ts:124-142,155-160`) answers the chain and `/levels` with 404 and
asserts the live footer that follows, not an error text. A search of `tests/` finds the error texts
only in the components, and `EMPTY_GREEKS` only in the comments of the tests added on this branch.
Two of those tests concern the Greeks failure above: a plain test asserts the state the failure
leaves the page in, and the other asserts what the page should say and is an expected failure, so Te
stays unticked, and it can pass only after a product change this task does not make. On the server
side `tests/api/test_route_coverage.py` pins the dates route at 503 and the chain route at 404
against a dead backend.

**Code:** `src/components/options/ProfilesTab.tsx:40-61,326,428-466`,
`src/hooks/useOptionsGreeks.ts:104-158`, `src/components/options/SwingMode.tsx:616-625,799-808`,
`src/components/options/TrinityTab.tsx:57,103-107`; `platform/api/routers/options.py:524-630`,
`platform/api/routers/grid.py:192-285`; no test id.

##### OPTIONS-12 · State: stale

**Shows or does:** A state, not a control: how the page tells the user which snapshot it is showing and
how old it is. Two surfaces, one per data path.

- Swing's source pill and banner (`src/components/options/SwingMode.tsx:213-238,913-934`). The pill
  reads the grid's `data_source` through `SOURCE_PILL_META` (`SwingMode.tsx:213-218`) and, when the grid
  has a `snapshot_ts`, the time in ET (`fmtTime`): `realtime` is `LIVE` (hint `Realtime · 5-min
  snapshot`, with a pulsing dot, the only source that pulses), `eod_fallback` is `EOD` (`Realtime
  missed · using yesterday close`), `stale_fallback` is `STALE` (`EOD > 2 sessions behind`),
  `unavailable` is `UNAVAILABLE` (`No snapshot available`) and any other string is `UNAVAILABLE` with
  the hint `Unrecognized data source`, so a renamed server value cannot read as a green `LIVE`. The
  banner repeats the source in words (OPTIONS-01): `live <SYM> dealer exposure`, `(end-of-day close)`,
  `(delayed snapshot)` for `stale_fallback` and every other string, or `grid unavailable`. Executed
  2026-10-01 with each source in turn: `LIVE 03:55 PM ET`, `EOD 07:00 PM ET`, `STALE 07:00 PM ET`,
  `UNAVAILABLE` and `UNAVAILABLE 03:55 PM ET` (hint `Unrecognized data source`).
- Profiles' source footer (`src/components/options/ProfilesTab.tsx:631-645`): `Source: AlphaVantage
  EOD · Cloud SQL · <n> contracts · snapshot <date>` for any chain the Cloud SQL handler answered, with
  the snapshot's date only, and `Source: AlphaVantage Live · <n> contracts · snapshot <date> <time> ET`
  for the live proxy (`metadata.source` `alphavantage_live`, converted by `isoToEtDisplay`,
  `src/lib/time.ts:20-35`), or `time unavailable` with no timestamp. Executed 2026-10-01: the proxy
  with a timestamp of 20:00:05Z read `snapshot 2026-09-30 16:00 ET`.

How the server chooses the source for the live grid (`platform/api/routers/grid.py:232-285`): the
newest REALTIME snapshot dated within 20 days is `realtime` whatever its age; with none, the newest
EOD snapshot is classified by `classify_gamma_freshness` (`lib/agents/summarizers.py:160-177`):
`eod_fallback` up to two trading days behind, `stale_fallback` up to five, `unavailable` beyond. The
historical grid is always an EOD read.

What the production data shows (executed 2026-10-01: the real handlers on the chains read from Cloud SQL,
rendered in the page; the V evidence comment in the matrix has the reads):

- The last REALTIME snapshot of 2026-09-30 is 19:55:25Z (15:55 ET, 84 snapshots on the session for
  SPY and IWM, 83 for QQQ), and the nightly EOD rows for 2026-09-30 landed at 01:06Z, stamped
  23:00:00Z. With both on file and the clock on 2026-10-01, the live grid answered `realtime` and the
  pill read `LIVE 03:55 PM ET`; with only the EOD rows on file it answered `eod_fallback` and the pill
  read `EOD 07:00 PM ET`. A `LIVE` pill that is a day old is the matrix Gaps' stocks#1211.
- A REALTIME snapshot served by the Cloud SQL chain handler (the 15:55 ET SPY snapshot, 13,274
  contracts, `metadata.source` `cloud_sql`) read `Source: AlphaVantage EOD · Cloud SQL · 13274 contracts
  · snapshot 2026-09-30` in Profiles: labelled end-of-day, with the date and no time (matrix Gaps).

**Needs:** The grid's `data_source` and `snapshot_ts` (OPTIONS-01) and the chain's `metadata.source` and
`snapshot_timestamp` (OPTIONS-05); nothing of its own. The live proxy's `snapshot_timestamp` is the
handler's own clock at the request, not a vendor time (OPTIONS-05).

**States:** This is the stale state: `EOD`, `STALE` and `UNAVAILABLE` on the pill, `(end-of-day close)`
and `(delayed snapshot)` in the banner, and the two footers. There is no staleness notice on Trinity
or on the Flow views, and nothing marks a levels answer (the legend's source) as older than the grid
beside it (OPTIONS-01).

**Acceptance criteria:**
- Given a grid whose `data_source` is each of `realtime`, `eod_fallback`, `stale_fallback` and
  `unavailable`, then the pill reads `LIVE`, `EOD`, `STALE` and `UNAVAILABLE` with their hints and the
  banner its wording (executed 2026-10-01; no test).
- Given an unrecognized `data_source`, then the pill reads `UNAVAILABLE` with the hint `Unrecognized
  data source` (executed 2026-10-01; no test).
- Given the live proxy answers with `metadata.source` `alphavantage_live`, then the footer reads
  `AlphaVantage Live` and the snapshot's ET time (`falls back to live endpoint and shows AlphaVantage
  Live badge`, `tests/options/options-flow.spec.ts`, on main at eca7078; it asserts the words, and the
  time was read in the 2026-10-01 render).
- Given an ISO string with a zone, then `isoToEtDisplay` renders `YYYY-MM-DD HH:MM ET` and a string
  without one falls back to its date (`isoToEtDisplay`, `src/lib/time.test.ts`, on main).
- Given REALTIME rows, then the live grid answers `realtime`, and given EOD rows one day old, `eod_fallback`
  (`test_realtime_path_returns_data_source_realtime`, `test_eod_fallback_when_no_realtime`,
  `tests/api/test_grid_router.py`); given a chain three trading days behind, then the classifier answers
  `stale_fallback`, and `unavailable` beyond five (`test_gamma_levels_stale_eod_returns_stale_fallback`,
  `test_gamma_levels_hard_stale_returns_unavailable`, `tests/agents/test_agent_summarizers.py`, which
  run the classifier through its other consumer, `summarize_gamma_levels`); no test runs `stale_fallback`
  through the grid handler.
- Given the live proxy, then it answers 400 for a ticker or a date it does not accept and for the
  vendor's error message, 503 without a key or on a timeout, 429 on the vendor's limit notice or
  information envelope and 404 for no contracts, answers a second call from its cache and sets
  `max-age=300` (`test_invalid_ticker_returns_400`, `test_invalid_date_returns_400`,
  `test_av_error_message_returns_400`, `test_missing_api_key_returns_503`,
  `test_timeout_returns_503`, `test_av_rate_limit_note_returns_429`,
  `test_av_information_envelope_returns_429`, `test_empty_av_data_returns_404`,
  `test_second_call_is_cache_hit` and `test_happy_path_returns_normalized_chain`,
  `tests/api/test_options_live.py`); its 502 for a failed vendor request
  (`platform/api/routers/options.py:678`) is asserted by no test.

**Tests:** On main: `time.test.ts` asserts `isoToEtDisplay` only. `options-flow.spec.ts` asserts the
footer's `AlphaVantage Live` words from a mocked proxy answer, with no time and no pill. The server side
is asserted by `test_grid_router.py` (`realtime`, `eod_fallback` and the envelope),
`test_agent_summarizers.py` (the classifier's three tiers) and `test_options_live.py` (the proxy).
No test on main asserts the pill, a hint, the banner wording, the EOD footer, a `STALE` source on
the grid handler or the `realtime` labelling of an old snapshot; the plain test added on this branch
(`a failed Greeks request leaves the EOD footer and the King chip on screen and is attempted twice`,
`tests/options/options-flow.spec.ts`, solyra commit `9543894`, not yet run in CI) asserts the EOD
footer's text on the fixture chain.

**Code:** `src/components/options/SwingMode.tsx:205-238,913-945`,
`src/components/options/ProfilesTab.tsx:631-645`, `src/lib/time.ts:20-35`;
`platform/api/routers/grid.py:232-285`, `platform/api/routers/options.py:524-712`,
`lib/agents/summarizers.py:160-177`; no test id (the pill is `.hs-pill`).

##### OPTIONS-13 · State: permission

**Shows or does:** A state, not a control: what the page does when the API refuses the user. Two pieces,
both above the views in `src/routes/OptionsFlowPage.tsx:63-68`, both driven by one flag.

- The flag. The fetch wrapper `installAuthFetch` (`src/lib/authedFetch.ts:130-252`) sees every
  response to a gated `/api/*` path: a 401 sets the flag (`markAuthBlocked`, `src/lib/authGate.ts`) and
  any successful gated response clears it (`clearAuthBlocked`, `authedFetch.ts:156-160`). The paths in
  `OPEN_PREFIXES` (`authedFetch.ts:45`) are open and never set it. Every options route and the three
  picker routes are gated (V evidence: 401 on each without a token).
- `SignInBanner` (`src/components/shared/SignInEmptyState.tsx:58-84`), a `role="alert"` strip while the
  flag is set: `Sign in to load options data`, `Your session has expired or you are signed out.
  Authenticate to stream live data here.` and a `Sign in` button that reloads the page, which routes
  through the app's sign-in gate. It renders nothing while the flag is clear.
- `DataGate` (`SignInEmptyState.tsx:93-98`) replaces the views with `SignInEmptyState` (`role="status"`,
  `Sign in to load data`) only when the flag is set and the user is not signed in. In the open mode the
  hermetic suite runs in, `useUser` reports signed in always (`src/hooks/useUser.ts:26-27,81`), so that
  branch is reached only in Firebase mode by a signed-out user the app's sign-in gate has not yet
  intercepted.

What the views show under a 401 (executed 2026-10-01, hermetic render with the options routes answering
401 `sign in to continue`, the user signed in): the banner, and in each view its own failure copy, with
no word about signing in except the server's `detail` where a view prints it. Swing reads `Data
unavailable: No options grid available for this symbol.`, the three Trinity panels `No gamma levels
available for <SYM>.`, and Profiles `No options dates available for IWM` with `sign in to continue` and
`Retry` (OPTIONS-10, OPTIONS-11). Only the banner says why.

**Needs:** The 401 itself: the Chain names no call of its own. Staging answers 401 to each gated route
the page calls with no token (the V evidence comment in the matrix: `GET /api/options/dates/{ticker}`
with and without `limit`, `GET /api/options/{ticker}/{date}`, `GET /api/options/live/{ticker}/{date}`,
`GET /api/options/{ticker}/{date}/levels`, both grids, `POST /api/options/greeks`, the symbol search,
the coverage lookup and `POST /api/insights/watchlist/add`). The `OPEN_PREFIXES` list must match the
backend's `_OPEN_API_PREFIXES` (CLAUDE.md, Auth).

**States:** This is the permission state of the page. It cannot be rehearsed with a token: no staging
test account exists, so the signed-in 401 (an expired session) is the case reached here.

**Acceptance criteria:**
- Given a gated call answers 401, then `Sign in to load options data` shows in an alert with a `Sign in`
  button, and the views show their own failure copy (executed 2026-10-01; no test).
- Given a gated call succeeds again, then the banner is gone (read, `authedFetch.ts:156-160`; no test).
- Given no token, then each gated route the page calls answers 401 on staging (V evidence,
  2026-10-01).
- Given a 401 from a gated path, then the wrapper calls the callback registered with
  `setOnUnauthorized`, and a 401 from an open path does not (`a 401 from a gated path fires
  onUnauthorized`, `a 401 from an OPEN path does not fire onUnauthorized`, `src/lib/authedFetch.test.ts`,
  on main). The callback is the wrapper's second hook, called in Firebase mode only
  (`authedFetch.ts:249`): no code outside the tests registers one, and the banner's flag is set by
  `markAuthBlocked` on the next line, which that test does not read.

**Tests:** On main, `src/lib/authedFetch.test.ts` asserts the wrapper's callback on a gated and on an
open 401; `tests/api/test_platform_auth.py` (`test_firebase_requires_valid_token`) asserts that the
auth middleware answers 401 to a gated path without a token in firebase mode and 200 to the open paths,
on a synthetic `/api/secret` route and not on an options route; and `tests/shared/auth-gate.spec.ts`
(`firebase mode, signed out → login screen blocks the app`) asserts the sign-in screen for a signed-out
user in firebase mode, on `/dashboard`. No test asserts the flag, the banner, `DataGate` or the views'
copy under a 401: no test on main sets a 401 on an options route, and a search of `tests/` finds no
assertion of `Sign in to load`. Te stays unticked.

**Code:** `src/routes/OptionsFlowPage.tsx:63-68`, `src/components/shared/SignInEmptyState.tsx:58-98`,
`src/lib/authGate.ts`, `src/lib/authedFetch.ts:68-75,130-252`, `src/hooks/useUser.ts:25-27,81`; no test id
(the banner is found by role `alert` and its text).

### SCREEN-PLAYBOOK — `/playbook`

- **Purpose:** The day’s structured setups — trigger, invalidation, targets — with as-of review mode.
- **Matrix:** [03 § 11](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#11--playbook)
- **Status:** Broken · **Blocking issue:** [#861](https://github.com/TeneikaAskew/stocks/issues/861) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/PlaybookPage.tsx` (355 lines)
- **Child components:** `SetupCardDetails`, `type SetupHorizon`
- **API calls (from source):** `/api/market/reference/`, `/api/playbook/`
- **Stores:** `useTickerStore`
- **E2E specs:** `tests/playbook/playbook.spec.ts`
- **PR lineage:** [#444](https://github.com/TeneikaAskew/stocks/pull/444) EOD outcome tracking + as-of cutoff · [#620](https://github.com/TeneikaAskew/stocks/pull/620) as-of review mode · [#774](https://github.com/TeneikaAskew/stocks/pull/774) silent resolver outage fix
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/playbook/{ticker} | ticker, cards[].id/name/description/direction/conditions/win_rate/avg_return/target_pct/stop_pct/horizons/best_horizon_min/best_horizon_win_rate/best_horizon_avg_bps, analysis_date, age_days (types: `PlaybookPage.tsx` PlaybookCard/PlaybookResponse) | phase6-playbook 04:30 ET Mon-Fri → playbook_cards | one-hour staleTime, refetched every 15min; 503 past `max_age_days` | `usePlaybook` (inline in `PlaybookPage.tsx`) → Header, Setup cards, Trade levels |
| GET /api/market/reference/{ticker}/{date} | ticker, date, open, high, low, close (types: `PlaybookPage.tsx` ReferenceResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily | one-hour staleTime | `useReference` (inline in `PlaybookPage.tsx`) → evaluation snapshot's prior close |
| GET /api/live/status | is_open, session, next_open, current_time_et (types: `useLiveStatus.ts` LiveStatus) |  | 60s refetch, 30s staleTime | `useLiveStatus` → Header evaluation line, snapshot |
| GET /api/live/quote/{ticker} | price, open, high, low, volume, change, change_pct, prev_close, last_updated (types: `useLiveQuote.ts` LiveQuote) |  | fetched only while the session is open, pre-market or after-hours | `useLiveQuote` → Trade levels (target/stop off the live price), snapshot |
| GET /api/live/history/{ticker} | ticker, interval, count, market_session, market_open, bars[] (types: `useLiveHistory.ts` LiveHistory) |  | 60s refetch, 30s staleTime; fetched only while the session is open, pre-market or after-hours | `useLiveHistory` → evaluation snapshot |
| GET /api/live/avg-volume/{ticker} | ticker, avg_volume_20d, sample_size, last_date, source (types: `useLiveHistory.ts` AvgVolume) | fetch-market-data 23:00 ET Mon-Fri and fetch-earnings-history 19:15 ET Mon-Fri → market_data_daily | one-hour staleTime | `useAvgVolume` → evaluation snapshot |
| POST /api/live/indicators | indicators, signals.call/put, chart_voter (types: `useLiveIndicators.ts` IndicatorsResponse) |  | keyed on bar count, last bar time and current price, not time-based | `useLiveIndicators` → evaluation snapshot |
| POST /api/playbook/evaluate | results_by_key keyed by card id (types: `usePlaybookEvaluation.ts` PlaybookEvaluateResponse, `lib/playbookEvaluator.ts` EvalResult) |  | 30s staleTime | `usePlaybookBatch` (`usePlaybookEvaluation.ts`) → Setup cards condition rows, progress bar |
| store: ticker |  | Zustand, per session |  | every card |

#### Displayed
| ID | Element | Component |
|---|---|---|
| PLAYBOOK-01 | Header | inline in `PlaybookPage.tsx` (`usePlaybook`, `useLiveStatus`) |
| PLAYBOOK-02 | Setup cards | `PlaybookCardUI` (inline in `PlaybookPage.tsx`) |
| PLAYBOOK-03 | Trade levels | `SetupCardDetails` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| PLAYBOOK-04 | Switch ticker | The page has no picker of its own: `usePlaybook` re-keys on `useTickerStore`'s `activeTicker`, set elsewhere (the header combobox); the command palette's ticker entries navigate to `/charts` instead. |
| PLAYBOOK-05 | Watch conditions fill | `buildSnapshot` (`lib/playbookEvaluator.ts`) assembles bars, quote and indicators into a `MarketSnapshot`; `usePlaybookBatch` posts one batched evaluation per snapshot and cards tint brighter as more conditions come back met. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| PLAYBOOK-06 | loading | present | "Loading playbook…" |
| PLAYBOOK-07 | empty | present | "No playbook cards found for {ticker}", reached only by a 200 with no cards, which the handler never sends; a ticker without rows gets a 404, shown as the error state instead. |
| PLAYBOOK-08 | error | present | "Playbook unavailable for {ticker}: {server reason}"; an evaluation failure is not read, so every condition falls back to "no data" rather than showing the failure. |
| PLAYBOOK-09 | stale | present | The card set's `analysis_date` and age (`snapshotAgeLabel`) render next to the setup count; a refused (503) set is dropped rather than shown as current. |
| PLAYBOOK-10 | permission | not tracked (new category); present | `DataGate` wraps the page body. |

#### Journeys
1. Wait for a card to light up: Opens /playbook during the session (PLAYBOOK-01) → Cards tint as conditions fill in (PLAYBOOK-05, PLAYBOOK-02) → Watches the progress bar reach every auto-evaluable condition (PLAYBOOK-05) → Reads trade levels and win rate by hold window (PLAYBOOK-03) → Acts on the fully lit setup (PLAYBOOK-02)
2. Outside market hours: Opens the page with the market closed (PLAYBOOK-01) → Header reads "No live data, evaluation paused" (PLAYBOOK-01) → Every condition shows unknown (PLAYBOOK-05) → Uses the cards as a reference rather than a live signal (PLAYBOOK-02)
3. Nothing generated yet: Switches to an unprocessed ticker (PLAYBOOK-04) → An amber card explains the playbook was not found (PLAYBOOK-08) → Points at the phase 6 playbook generation step (PLAYBOOK-08)

#### Elements
##### PLAYBOOK-01 · Header

##### PLAYBOOK-02 · Setup cards

##### PLAYBOOK-03 · Trade levels

##### PLAYBOOK-04 · Switch ticker

##### PLAYBOOK-05 · Watch conditions fill

##### PLAYBOOK-06 · State: loading

##### PLAYBOOK-07 · State: empty

##### PLAYBOOK-08 · State: error

##### PLAYBOOK-09 · State: stale

##### PLAYBOOK-10 · State: permission

### SCREEN-REPORTS — `/reports`

- **Purpose:** Backtest, walk-forward and replay-trainer results; analytics summaries.
- **Matrix:** [03 § 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#12--reports)
- **Status:** Production but needs remediation · **Blocking issue:** [#813](https://github.com/TeneikaAskew/stocks/issues/813) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/ReportsPage.tsx` (153 lines)
- **API calls (from source):** `/api/reports/`, `/api/reports/list/`
- **Stores:** `useTickerStore`
- **E2E specs:** `tests/charts/replay-trainer.spec.ts`, `tests/reports/reports.spec.ts`
- **PR lineage:** [#513](https://github.com/TeneikaAskew/stocks/pull/513) backtest→Cloud Run · [#548](https://github.com/TeneikaAskew/stocks/pull/548) walk-forward stage · [#706](https://github.com/TeneikaAskew/stocks/pull/706) backtest my trades · [#710](https://github.com/TeneikaAskew/stocks/pull/710) bar-replay trainer
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/reports/list/{ticker} | ticker, reports[].filename/phase/path (types: `lib/reports.ts` ReportEntry/ReportListResponse) |  | 24-hour server cache; 60s client staleTime | `useReportList` (inline in `ReportsPage.tsx`) → Picker bar |
| GET /api/reports/{ticker}/{phase} | plain-text markdown body, rendered through `renderReportHtml` (`lib/reports.ts`; marked, then DOMPurify) |  | 24-hour server cache; 5min client staleTime | `useReportContent` (`ReportViewer`, inline in `ReportsPage.tsx`) → Report header, Report body |
| store: ticker |  | Zustand, per session |  | every element |

No table backs either endpoint: both read markdown objects from the GCS bucket `adept-mountain-474619-d4-trading-data` prefix `raw/reports/`, so the Produced by column is blank rather than naming a Cloud Run job.

#### Displayed
| ID | Element | Component |
|---|---|---|
| REPORTS-01 | Picker bar | inline in `ReportsPage.tsx` (grouped `<select>`, two `NavButton`, `useReportList`) |
| REPORTS-02 | Report header | inline in `ReportsPage.tsx` (`phaseLabel`, the active report's filename) |
| REPORTS-03 | Report body | `ReportViewer` (inline in `ReportsPage.tsx`) |

#### Actions
| ID | Action | What happens |
|---|---|---|
| REPORTS-04 | Select a report | The grouped `<select>` calls `setSelectedPhase`. |
| REPORTS-05 | Previous or Next | `NavButton` calls `go(delta)`, which steps through `reports` in the order the server returned them (reverse of the picker's own ascending groups). |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| REPORTS-06 | loading | present | "Loading report…" in `ReportViewer`; the picker `<select>` stays disabled while the list loads. |
| REPORTS-07 | empty | present | "No reports yet. Run the analysis pipeline to generate them.", reached only by a 200 with an empty list, which the handler never sends; an empty listing is a 404, shown as the error state instead. |
| REPORTS-08 | error | present | "Could not load the report list for {ticker}." for a failed list; "Report not available." in `ReportViewer` for a failed or missing report body. |
| REPORTS-09 | stale | present | Nothing shows a report's age: the header renders the phase label and filename only, no generated-at time. |
| REPORTS-10 | permission | not tracked (new category); present | `DataGate` wraps the list error, empty state, report header and body; the picker bar itself sits outside it and still renders, with an empty list, when signed out. |

#### Journeys
1. Read the pipeline end to end: Opens /reports (REPORTS-01) → The first report loads automatically (REPORTS-01, REPORTS-03); it is Phase 6, the server's reverse order, not Phase 1 as the seed describes (see the matrix Reports Gaps) → Steps through with Next, which walks backward through the pipeline from there (REPORTS-05) → Reads the walk-forward tables (REPORTS-03) → Notes which setups degraded out-of-sample (REPORTS-03)
2. Jump to one phase: Opens the grouped dropdown (REPORTS-01) → Picks the phase by name (REPORTS-04) → Reads the body; the filename shows the source (REPORTS-03, REPORTS-02)
3. No reports yet: Switches ticker → The list comes back empty as a 404, shown as "Could not load the report list for {ticker}." (REPORTS-08); the seed's "no reports yet" empty-state copy is never reached in code (see the matrix Reports Gaps)

#### Elements
##### REPORTS-01 · Picker bar

##### REPORTS-02 · Report header

##### REPORTS-03 · Report body

##### REPORTS-04 · Select a report

##### REPORTS-05 · Previous or Next

##### REPORTS-06 · State: loading

##### REPORTS-07 · State: empty

##### REPORTS-08 · State: error

##### REPORTS-09 · State: stale

##### REPORTS-10 · State: permission

### SCREEN-SIGNALS — `/signals`

- **Purpose:** Signal discovery and live alert monitoring.
- **Matrix:** [03 § 08](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#08--signals)
- **Status:** Production but needs remediation · **Blocking issue:** [#1206](https://github.com/TeneikaAskew/stocks/issues/1206) (replaces [#905](https://github.com/TeneikaAskew/stocks/issues/905), closed as a duplicate on 2026-09-28) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/SignalsPage.tsx` (356 lines)
- **Child components:** `KpiTile`, `MicroLabel`, `TickerCombobox`, `DataGate`
- **API calls (from source):** `/api/signals/` in the page and `/api/analytics/summary/` through `useTradeSummary`; the picker's `/api/insights/ticker/search`, `/api/market/coverage` and `/api/insights/watchlist/add` are issued by `TickerCombobox`
- **Stores:** `useReviewDateStore`, `useTickerStore`
- **E2E specs:** `tests/signals/signals.spec.ts`
- **PR lineage:** [#184](https://github.com/TeneikaAskew/stocks/pull/184) lib/strategies origin · [#504](https://github.com/TeneikaAskew/stocks/pull/504) dedicated Discord channel · [#803](https://github.com/TeneikaAskew/stocks/pull/803) RVOL shadow metric on `signal_alerts` (it left scoring, `historical_signals` and this page's data as they were)
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/signals/{ticker}?limit=5000 (review mode adds `&end_date=&end_time=`) | count, signals[].time/direction/score/close/rsi/ema9/volume; the response also carries returned, source and signals[].ema20/conditions_met/return_pct/run_kind/ticker, which the page does not read (types: `SignalsPage.tsx` SignalRow/SignalsResponse; fixture: `tests/helpers/fixtures/signals.ts`) | historical-signals-watchlist 01:00 ET Tue-Sat → historical_signals | 5min staleTime; the newest row is the prior session's (the writer runs at 01:00 and not on Sunday or Monday, so up to three days old by Monday evening) | `useSignals` (inline in `SignalsPage`) → Header label, Signals table |
| GET /api/analytics/summary/{ticker}?days=90 | closedTrades, winCount, lossCount, winRate, totalPnL, avgPnL, profitFactor, callCount, putCount; totalTrades, activeTrades, maxWin and maxLoss are returned and not read (types: `useTradeAnalytics.ts` TradeStats) | signal-monitor 09:25 ET Mon-Fri and signal-monitor-eod-resolver 16:30 ET Mon-Fri → trades (rows with run_kind 'live' only) | 5min staleTime; the 90 days run back from now and do not follow review mode | `useTradeSummary` (`useTradeAnalytics.ts`) → Performance KPIs |
| GET /api/insights/ticker/search · GET /api/market/coverage · POST /api/insights/watchlist/add | matches[], coverage flags, watchlist add result; the picker reads only the success or failure of the add (types: `useTickerSearch.ts`) | AlphaVantage SYMBOL_SEARCH (search); market_data_daily and market_data_intraday (coverage, ticker presence); the add writes watchlists, owned by the signed-in user's email or by `default` | 60s staleTime on search and coverage | `TickerCombobox` → Header ticker picker |
| store: ticker, review date | | ticker: Zustand `ticker-store`, persisted in the browser (`activeTicker`, `recentTickers`); review date: Zustand, memory only, set by the shell's Replay control | | the signals and summary requests, the Header label, the To date |

#### Displayed
| ID | Element | Component |
|---|---|---|
| SIGNALS-01 | Header | inline in `SignalsPage` (`TickerCombobox`) |
| SIGNALS-02 | Performance KPIs | `KpiTile` (`useTradeSummary`) |
| SIGNALS-03 | Filter bar | inline in `SignalsPage` |
| SIGNALS-04 | Signals table | inline `useReactTable` in `SignalsPage` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| SIGNALS-05 | Filter and sort | Direction, minimum score and date-range filters, plus column-header sort, all applied client-side over the fetched 5,000-row window; the table draws the first 500 rows of the result. |
| SIGNALS-06 | Clear filters | Resets the direction, the minimum score and both dates; the button shows only while one of them is set (a locked review-mode To date does not count) and the sort is left alone. |
| SIGNALS-07 | Review mode | The shell's global replay control takes over the To date, which locks and shows a `global` tag; the page asks the API for rows up to the review date and time. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| SIGNALS-08 | loading | present | "Loading signals…" in place of the table; the label reads "signal explorer" and the Performance block is absent until its own request answers. |
| SIGNALS-09 | empty | present | "No signals match your filters", for filters that exclude everything and for a ticker the table holds no rows for; the Performance block hides itself entirely when there are no closed trades. |
| SIGNALS-10 | error | present | "Signal data not found for {ticker}. Run the signals generation pipeline first." is rendered the same way for a 503 outage, a 500 defect, a 404 and a 401, after one retry, and a failed refetch of a cached key puts it in place of the table while the label keeps the cached count; a failed Performance summary with no cached answer instead renders nothing, and a failed refetch of a cached summary leaves its tiles on screen. |
| SIGNALS-11 | stale | present only in review mode | The `global` tag on the To date in review mode is the page's only as-of marker; in live mode nothing states the age of the rows or of the summary. |
| SIGNALS-12 | permission | not tracked (new category); present but unreachable | `SignInEmptyState`'s `DataGate` replaces the body only for a signed-out user, whom the app's sign-in gate never lets reach the page; a signed-in user's 401 reads as SIGNALS-10 under the shell's expired-session strip. |

#### Journeys
1. Find the highest-quality setups: Opens /signals (SIGNALS-01) → Reads the Performance KPIs, labelled 90-day backtest and computed from live trades (SIGNALS-02) → Filters to CALL and min score 7+ (SIGNALS-05; 14 of the newest 5,000 IWM rows score 7) → Sorts by score (SIGNALS-05) → Notes the times to check on /charts (SIGNALS-04; stored strings in two zones, no zone shown)
2. Audit a period: Sets a From and To date (SIGNALS-05; only the newest 5,000 rows can match) → Sees that the KPIs do not follow the dates (SIGNALS-02; the last 90 days from now, live trades) → Sees "Showing first 500 of N" (SIGNALS-04; N counts the filtered window) and narrows the filters further (SIGNALS-05)
3. Ticker has no signals: Switches to a ticker the pipeline has not processed (SIGNALS-01) → The label reads "<T> · 0 signals" and the table area reads "No signals match your filters" (SIGNALS-09) → No amber card appears, because the handler answers 200 with no rows (SIGNALS-10 is for failures only)
4. The signals request fails: Opens /signals during an outage (SIGNALS-10) → After one retry an amber card reads "Signal data not found for IWM. Run the signals generation pipeline first.", the same for a 503, a 500 and a 401 (SIGNALS-10) → The table is gone and the Performance block stays if its own request answered (SIGNALS-02)

#### Elements

In every body below, "executed 2026-10-01" means that the production rows were read through the stocks repo's
`db_query_cr.sh` job script and passed through the real `get_signals` and `get_trade_summary` handlers with only the
database read replaced, and that the page was rendered hermetically with those answers, while "read" marks what was
only read in the code. A run on other input is named where it is used: a held or failed request or a pinned clock; a
variant payload (the refetch cases of SIGNALS-10 and SIGNALS-11 used the shared three-row fixture, `MOCK_SIGNALS` and
`MOCK_TRADE_SUMMARY` in `src/mocks/signals.ts`, not production rows); or code other than the two handlers run with the
database replaced (`TradeLogger` and the monitor's persist step, SIGNALS-02). SIGNALS-01 lists the production
executions.

##### SIGNALS-01 · Header

**Shows or does:** The first row of the page (`src/routes/SignalsPage.tsx:188-198`): the title `Signals`
(`h1`, `:190`), a label under it and, at the right, the shared ticker picker (`TickerCombobox`, `:197`, the
component DASHBOARD-10 and OPTIONS-06 describe). The label reads `<ticker> · <count> signals` (`:191-195`):
`<ticker>` is `activeTicker` of `useTickerStore`, `<count>` is `count` of the signals response formatted with
`toLocaleString()`, and ` · <n> shown` follows when the filters leave fewer rows than the response returned
(`filtered.length !== allSignals.length`, `:194`). The label's own style draws it in capitals (`MicroLabel`,
`uppercase`); the text in the DOM is `IWM · 190,159 signals`. Until the first answer, and after a failed first
request, the count is replaced by `signal explorer` (`:193` tests `data`, so this holds only while the key has no
cached answer: when a refetch of a cached key fails the label keeps the cached count, SIGNALS-10). The header sits
outside `DataGate`, so it stays on screen in every state of the body.

The production reads behind "executed 2026-10-01" (defined at the head of Elements) are the `db_query_cr.sh`
executions `db-query-gslsl`, `db-query-28vss`, `db-query-wxq9f`, `db-query-7qttr` and `db-query-zjf94`, and
`db-query-wcvmt` for the reads after the 01:00 ET run; the V evidence comment in the matrix lists the statements.

What the figures count (executed 2026-10-01, IWM): `count` is the number of rows for the ticker, with the review
cutoff when there is one, before the 5,000 limit: 190,159 for IWM (read at 04:28 UTC; the 01:00 ET run of
`historical-signals-watchlist` then took it to 190,259 by 05:27 UTC), so the label read `IWM · 190,159 signals` while
the table's source is the newest 5,000 rows (`returned` 5000, 2026-07-21 04:02 to 2026-09-29 23:21 stored time)
and the table says `Showing first 500 of 5,000 signals` (SIGNALS-04). ` · <n> shown` counts the filtered rows of
that 5,000-row window and never of the 190,159: `CALL` read `· 2,543 shown` and `6+` read `· 822 shown` (matrix
Gaps, stocks#1213). A ticker with no rows reads `IWM · 0 signals`.

A pick in the picker (executed, SPY): it sets `activeTicker` and the recents of `useTickerStore`
(`src/stores/tickerStore.ts:14-34`, persisted as `ticker-store`), and both requests of the page re-key,
`GET /api/signals/SPY?limit=5000` and `GET /api/analytics/summary/SPY?days=90`. The filters, the sort and the
review state live in `SignalsPage` and the review store, so they survive the pick: a direction of PUT, `6+` and a
Score sort still applied to SPY's rows. A pick of a search row badged `new`, with a healthy coverage lookup, also
posts the symbol to the watchlist (`src/components/shared/TickerCombobox.tsx:259-291`). That write is owned by the signed-in user's
email, or by `default` when the request carries no identity (`platform/api/routers/insights.py:57-67,621,629`),
and `historical-signals-watchlist` reads only the `default` owner (`scripts/run_historical_signals.py:129-140`
calls `load_watchlist()` with no argument, whose owner defaults to `default`, `gcp/fetchers/_watchlist.py:411-412,457-458`).
Executed 2026-10-01: the job's ticker resolution called `load_watchlist()` with no arguments, and the owner an add
by a signed-in request resolves to was that user's email, `default` without one. So a signed-in user's pick gets
signals only if something else adds the ticker to the `default` list (matrix Gaps). Production holds 16 active
`watchlists` rows, all owned by `default` (`avgo-peer` 9, `discord-replay` 3, `seed` 4 of 6), and
`historical_signals` holds rows for 16 tickers (read 2026-10-01).

**Needs:** `GET /api/signals/{ticker}?limit=5000` for the count (`data.count`, the request of SIGNALS-04). The
picker adds `GET /api/insights/ticker/search?keywords=&limit=8`, `GET /api/market/coverage?symbols=` and, for a
`new` pick, `POST /api/insights/watchlist/add`, all gated (V evidence: 401 on each without a token), and all as
OPTIONS-06 describes them: the search proxies AlphaVantage `SYMBOL_SEARCH` and answers an empty list with a 200
when the key is missing or the vendor fails, coverage reads `market_data_daily` and `market_data_intraday` for the
result symbols (4.3 s for four tickers on 2026-10-01, matrix Gaps of area 07) and the add writes `watchlists` and
then reads AlphaVantage OVERVIEW and GLOBAL_QUOTE and FinViz peers for a response the picker does not read.
`historical-signals-watchlist` runs `scripts/run_historical_signals.py --from-watchlist` at 01:00 ET Tue to Sat
and refuses to run (exit 1) when the `default` list holds more than 25 tickers (`:87,503-509`).

**States:** The popover's own states are DASHBOARD-10's (`ticker-search-error`, `ticker-coverage-error`,
`ticker-ingest-notice`). The label has the states of the request it reads: `signal explorer` while it loads or
after it fails with no cached answer (SIGNALS-08, SIGNALS-10), the cached count when a refetch fails (SIGNALS-10),
`0 signals` when it answers no rows (SIGNALS-09).

**Acceptance criteria:**
- Given the handler answers 200 with `count` 190,159 and 5,000 rows, when the page renders, then the title reads
  `Signals` and the label reads `IWM · 190,159 signals` (executed 2026-10-01; the title only is asserted on main, by
  `renders signal explorer heading`, `tests/signals/signals.spec.ts`, at eca7078; the label is asserted on this
  branch, see Tests).
- Given filters that leave 2,543 of the 5,000 returned rows, then the label adds ` · 2,543 shown` (executed; the
  form ` · 1 shown` is asserted on this branch, see Tests).
- Given the request is pending or has failed with no cached answer (503, 500, 404 or 401), then the label reads
  `IWM · signal explorer` (executed); given a cached answer whose refetch then fails, the label keeps the cached
  count, `IWM · 3 signals` (executed, SIGNALS-10, on the shared three-row fixture).
- Given a ticker the handler holds no rows for, then the label reads `IWM · 0 signals` and no error shows
  (executed, `count` 0).
- Given a pick of SPY, then `GET /api/signals/SPY?limit=5000` and `GET /api/analytics/summary/SPY?days=90` are
  requested and the filters and the sort stay (executed; no test mounts the picker on `/signals`).
- Given the shared component, then the picker is asserted by the twenty tests of
  `tests/dashboard/ticker-combobox.spec.ts` (on `/dashboard`, on main at eca7078), `src/components/shared/tickerCombobox.test.ts`
  and `src/stores/tickerStore.test.ts`, and its three handlers by `tests/api/test_market_coverage.py`,
  `tests/api/test_ticker_info.py` and `TestWatchlistMutationAPI`.
- Given a signed-in user's add, then the router passes that user's email to the write
  (`test_add_scopes_to_signed_in_user`, `tests/api/test_platform_api.py`, with the write patched out), and the
  nightly job does not read that owner (executed 2026-10-01); no test asserts that a signed-in user's pick reaches
  signals.
- Given no token, then `GET /api/signals/IWM?limit=5000` and the three picker routes answer 401 on staging (V
  evidence, 2026-10-01).

**Tests:** On main, `renders signal explorer heading` asserts that an `h1` or `h2` containing `signal` is visible,
which is the title, and the `route /signals loads without fatal errors` case of `tests/shared/navigation.spec.ts`
asserts the nav, `main` and a clean console, nothing about the label. No test on main asserts the label, the count
or the `shown` figure; the filter and sort test added on this branch in solyra commit 8ffbb54 asserts `IWM · 3 signals`
and, after a PUT, `IWM · 3 signals · 1 shown` (it has not run in CI). The picker is covered as above (the same component run on the Dashboard, never on this page). On
the handler side `test_signals_live` asserts `count`, `source`, the stringified `time` and `ticker` of the
envelope, `test_signals_empty_for_old_date` the empty envelope, `TestSignalsAPIFailsLoud` the 503 and the 500, and
`tests/api/test_route_coverage.py` pins `GET /api/signals/IWM` at 503, the search at 200, coverage at 503 and the
watchlist add at 503 against a dead backend. Te stays unticked: the label, the count and the picker's wiring on
this page are asserted by no test on main.

**Code:** `src/routes/SignalsPage.tsx:51-64,134-198`, `src/components/shared/TickerCombobox.tsx:147-513`,
`src/hooks/useTickerSearch.ts:55-125`, `src/stores/tickerStore.ts:14-34`;
`platform/api/routers/signals.py:221-251`, `platform/api/routers/insights.py:57-67,544-560,599-674`,
`platform/api/main.py:1218-1266`, `scripts/run_historical_signals.py:87,129-140,495-509`,
`gcp/fetchers/_watchlist.py:344-387,411-474`; test ids `ticker-combobox`, `ticker-combobox-panel`,
`ticker-combobox-input`, `ticker-option-<SYM>`; the title and the label carry none.

##### SIGNALS-02 · Performance KPIs

**Shows or does:** A block above the filter bar (`src/routes/SignalsPage.tsx:209-220`), drawn only when the summary
has answered and counts at least one closed trade (`pnl && pnl.closedTrades > 0`). Under the label
`Performance · 90-day backtest` (`:211`) it shows five `KpiTile`s in a grid of two, three or five columns:
`Win rate` (`winRate.toFixed(1)` and `%`, bull at 50 or more and bear below, sub `<winCount>W / <lossCount>L`,
`:213`), `Σ return` (`fmtPct(totalPnL)`, bull at 0 or more, `:214`), `Avg return / trade` (`fmtPct(avgPnL)`, `:215`),
`Profit factor` (`fmtNum(profitFactor, 2)`, an em dash when null in the neutral tone, bull at 1 or more and bear
below, `:216`) and `Closed trades` (`closedTrades.toLocaleString()`, sub `<callCount> call · <putCount> put`,
`:217`). `fmtPct` takes percent units (`src/lib/format.ts:47-51`), and the sums are of `trades.return_pct`, which is
in percentage points: all 189 production IWM trades of the window match the direction-aware move computed from
their stored entry and exit prices to the last digit (read 2026-10-01), so `+3.70%` is 3.70 percentage points
added up, not a compounded, dollar or account figure.

What it holds (executed 2026-10-01, the real handler on the 189 production IWM trades of the last 90 days, rendered
in the page): `WIN RATE 52.9% 100W / 89L`, `Σ RETURN +3.70%`, `AVG RETURN / TRADE +0.02%`, `PROFIT FACTOR 1.26`,
`CLOSED TRADES 189` over `189 call · 0 put`. One of the 89 losses is a trade that closed at exactly 0.00%: the
handler calls every closed trade that is not above zero a loss (`platform/api/routers/analytics.py:173-174`).

The label says backtest and the rows are live trades (matrix Gaps): the handler reads `trades` with
`run_kind = 'live'` for the last 90 days from now (`platform/api/routers/analytics.py:146-152`), which are the
monitor's logged fires, one row per fire whose `trades` write reached Cloud SQL and at most five per ticker per day
(`lib/config.py:240`, `max_daily_trades: int = 5`). A fire can have a `signal_alerts` row and no `trades` row, and the
block, which sums `trades`, then undercounts it; the monitor counts only one of the two ways that happens. A defect in
the write (a dropped column, a bad type, a `KeyError`) is raised by `TradeLogger.log_trade`, caught at the call site,
added to `persist_trade_failure_count` and logged with `the signal_alerts row exists without its trades row`
(`gcp/signal_monitor.py:1792-1797`). An infrastructure error (a `ConnectionError`) is swallowed inside `log_trade`:
`_outage_or_raise` logs a `Cloud SQL trade write failed, falling back to Parquet` warning and returns
(`gcp/trade_logger.py:29-49,117`), and the call falls through to a Parquet file under `data/trades` in the job's own
container (`gcp/trade_logger.py:119-129`), so `log_trade` returns, the monitor logs
`Trade logged for <ticker> <direction>` and the counter stays at 0. Executed 2026-10-01 on the real
`SignalMonitor._persist_signal_alert` and `TradeLogger` with only `gcp.database.upsert_dataframe` replaced (no
database, a temporary working directory): a `ConnectionError` on the `trades` upsert left
`persist_trade_failure_count` at 0, wrote the Parquet file and logged `Trade logged`; a `KeyError` set it to 1, wrote
no file and logged the failure. No job path reads the counter (only `tests/gcp/test_signal_monitor_persist.py:295`
does), so whether any fire in the window was lost either way is not checked (matrix Gaps).

Four properties of the block that the label does not say (executed 2026-10-01):

- It is not review aware. With review mode set to 2026-09-29 10:30 the page asked for no new summary (the request
  stays `GET /api/analytics/summary/IWM?days=90`, the 90 days run back from now) and the five tiles did not
  change while the table was cut at the review time (SIGNALS-07).
- `Closed trades` counts open trades in its call and put split. The handler counts `callCount` and `putCount` over
  every trade the query returned, open ones included (`platform/api/routers/analytics.py:116-117`): with three closed calls and two open
  puts the real handler answered `closedTrades` 3, `callCount` 3 and `putCount` 2, and the tile read `3` over
  `3 call · 2 put`. The production window has no open trade (189 of 189 closed), so it does not show today.
- It exists for three tickers. The monitor's live trades of the last 90 days are IWM (189 calls), QQQ (242 calls)
  and SPY (166 calls and 144 puts), while `historical_signals` holds rows for 16 tickers; for the other 13 the
  summary answers zero closed trades and the block is absent with no word on the page.
- A summary that fails with no cached answer also leaves the block out with no message (503: no text anywhere on the
  page, SIGNALS-10); a failed refetch of a cached summary leaves its tiles on screen with no marker (SIGNALS-11).

**Needs:** `GET /api/analytics/summary/{ticker}?days=90` (`useTradeSummary`, `src/hooks/useTradeAnalytics.ts:36-47`,
enabled with a ticker, five minutes stale), answered by `get_trade_summary` (`platform/api/routers/analytics.py:131-178`): it reads
`direction`, `return_pct`, `exit_time` and `entry_time` of `trades` for the ticker with `run_kind = 'live'` and an
`entry_time` inside the window, strictly (503 on an outage, 500 on a defect, `:153-160`), calls a trade closed when
it has an `exit_time` and a `return_pct` that is not NaN and active otherwise (`:164-176`), and aggregates in
`_compute_stats` (`:76-118`): `winRate` is wins over closed times 100, `totalPnL` and `avgPnL` are the sum and mean
of `return_pct` over the closed trades, and `profitFactor` is gross wins over gross losses, null when there is no
loss (`:99-102`). Producers: `signal-monitor` (09:25 ET Mon to Fri; each fire is logged as a `trades` row through
`TradeLogger.log_trade`, `gcp/signal_monitor.py:1773-1797`, and its exit written at `:2427-2437`) and
`signal-monitor-eod-resolver` (16:30 ET Mon to Fri, which closes what is left open, `gcp/signal_monitor_eod_resolver.py:415-425`);
the monitor polls AlphaVantage `TIME_SERIES_INTRADAY` (`gcp/signal_monitor.py:321-340`). Production on 2026-10-01
(00:28 ET): `trades` held live rows for IWM, QQQ and SPY up to 2026-09-30 (IWM's newest entry 13:34 UTC and exit
13:55 UTC, SPY's newest exit 20:00 UTC), both schedulers `ENABLED` with their last attempts on 2026-09-30, the
resolver's execution of that day completed and the monitor's `signal-monitor-nwmlx` ended at 10:11 ET with
`failed with exit code: 0 and message: Internal error` after its log showed `cap_diag: SKIP ... (cap reached)` for
IWM and SPY (the session before it ran to 16:00 and succeeded).

**States:** SIGNALS-08 (the block is absent until the summary answers: no skeleton, no text), SIGNALS-09 (absent with
no closed trades), SIGNALS-10 (a summary that fails with no cached answer leaves it out silently), SIGNALS-11 (a
failed refetch leaves the cached tiles, unmarked) and SIGNALS-12.

**Acceptance criteria:**
- Given a summary of 189 closed trades with 100 wins, then the tiles read `52.9%` over `100W / 89L`, `+3.70%`,
  `+0.02%`, `1.26` and `189` over `189 call · 0 put` (executed 2026-10-01); the page test asserts the label,
  `win rate`, `profit factor` and the one value `1.74` on the shared fixture (`shows the 90-day Performance P&L
  card`, on main at eca7078).
- Given a win rate below 50, then `Win rate` takes the bear tone, and given a null profit factor it reads `—` in
  the neutral tone (executed: `33.3%` bear, `PROFIT FACTOR —` for two winning trades and no loss).
- Given a closed trade at 0.00%, then it counts as a loss (`lossCount`), and given open trades, then they count in
  `callCount` and `putCount` but not in `closedTrades` (executed through the real handler).
- Given no closed trades, or a failed request with no cached answer, then the block is not drawn (executed for both);
  given a cached summary older than five minutes and a refetch that fails, then its tiles stay with no marker
  (executed 2026-10-01, the shared three-row fixture, SIGNALS-11).
- Given review mode, then the block is unchanged (executed).
- Given the handler, then it reads only live trades and answers a defect with 500 and an outage with 503
  (`test_summary_restricts_to_live_trades`, `test_summary_is_not_a_flat_zero_when_the_query_fails`,
  `test_summary_is_503_when_cloud_sql_is_unreachable`, `tests/api/test_analytics_summary.py`, on main); no test
  asserts `_compute_stats` through the route, the win and loss classification, the profit factor or the call and
  put counts.
- Given no token, then `GET /api/analytics/summary/IWM?days=90` answers 401 on staging (V evidence).

**Tests:** On main, the page test above asserts three labels and one value, not the other tiles, the sub-lines, the
tones or the units. `tests/api/test_analytics_summary.py` asserts the query's `from trades` and `run_kind = 'live'` and its
parameters on an empty frame (status 200 only), the 500 and the 503 and, by source inspection, the strict reader;
`tests/api/test_route_coverage.py` pins the route at 503 against a dead backend and `POST /api/analytics/trade-stats`
at 200 for an empty list. No test asserts a computed figure of the summary. Te stays unticked.

**Code:** `src/routes/SignalsPage.tsx:159-160,209-220`, `src/hooks/useTradeAnalytics.ts:16-47`,
`src/lib/format.ts:47-51,80-84`, `src/components/primitives/index.tsx:153-185`;
`platform/api/routers/analytics.py:76-118,131-178`, `gcp/signal_monitor.py:1773-1797,2427-2437`,
`gcp/trade_logger.py:29-49,117-129`, `gcp/signal_monitor_eod_resolver.py:415-425`, `lib/config.py:240`,
`gcp/schema.sql:1167-1191`; no test id.

##### SIGNALS-03 · Filter bar

**Shows or does:** The strip of controls between the KPI block and the table (`src/routes/SignalsPage.tsx:222-292`),
a filter icon followed by: the direction buttons `ALL`, `CALL` and `PUT` (`:226-241`, the active one in the blue fill
`bg-[var(--color-accent-blue)]`), `Min score:` with a select of `Any`, `5+`, `6+`, `7+` and `8+` (`:243-257`, values
0, 5, 6, 7 and 8), `From:` and `To:` date inputs (`:259-282`) and, while a filter is set, `Clear` (`:284-291`,
SIGNALS-06). In review mode the `To` input shows the review date, is disabled, carries the title `Set by global
historical mode, clear review mode to edit` and is followed by an amber `global` tag (`:269-282`, SIGNALS-07). The
bar's state is local to the page (`useState`, `:139-144`): not persisted, kept across a ticker pick and across
review mode (executed 2026-10-01). What each control does to the rows is SIGNALS-05; this row is the bar itself.

The bar is drawn in every state of the body below the KPI block, the loading box, the failure card and the empty
message included, and it works in them (executed with the signals request held: `CALL` was clickable, `Clear`
appeared and the label stayed `signal explorer`; with the request failed the bar was on screen beside the card).
It sits inside `DataGate`, so a signed-out user would not see it (SIGNALS-12).

Executed 2026-10-01 against the accessibility tree and the test ids: the controls carry no accessible names. The
text beside each of them is a `span`, not a `label`, so `getByLabel` finds none of From, To or Min score; the date
inputs have no `aria-label` or `id`; the direction buttons have no `aria-pressed`, so the active direction is
conveyed by colour only; and the page's own elements have no test ids (the only ones on the page are the shell's
and the picker's, `brand`, `nav-menu-market`, `replay-toggle`, `auth-status`, `ticker-combobox`). The direction
buttons, the select and the date inputs are native elements; the sortable headers are `th` elements with a click
handler and no role, `tabindex` or `aria-sort` (SIGNALS-05). Against REQ-UX-001's keyboard and
assistive-technology target this is recorded in the matrix Gaps.

The Min score options do not match the data: IWM's `signal_strength` runs from 3 to 7 in production (3: 153,793
rows, 4: 18,984, 5: 14,731, 6: 2,596, 7: 55, no 8) and the newest 5,000 rows, the only ones the page holds, score 5
(4,178 rows), 6 (808) and 7 (14). So `5+` removes nothing from the page's window although `Clear` appears for it,
`7+` leaves 14 rows and `8+` empties the table whatever the ticker (executed on the real window; matrix Gaps).

**Needs:** Nothing of its own: the controls act on the rows SIGNALS-04's request returned. The `To` lock reads
`reviewDate` of `useReviewDateStore` (`src/stores/reviewDateStore.ts:13-19`), set by the Replay control
(SIGNALS-07). The `Min score` options are constants. The meaning of the score is the producer's: the watchlist job
writes `momentum` signals only, where `signal_strength` counts up to seven conditions met (four core: three
consecutive bars, the RSI band, price against VWAP and EMA9; three confirming: relative volume, ATR expansion, RSI
thrust), needs at least five of them and two core ones (`generate_technical_signals`,
`lib/trading_analysis.py:784,822-916`), and stores `conditions_met` as `<score>/5` whatever the score (`:970`, `7/5` on
the window's 14 top rows).

**States:** The bar has none of its own. `To` and the `global` tag are its review-mode state (SIGNALS-07); it is
replaced by `DataGate` for a signed-out user (SIGNALS-12).

**Acceptance criteria:**
- Given the page, then the bar offers `ALL`, `CALL` and `PUT`, `Min score` with `Any`, `5+`, `6+`, `7+` and `8+`,
  and `From` and `To` (executed 2026-10-01; the new test `the direction buttons, Min score, the date range and the
  column headers act on the fetched rows`, added on this branch, drives each control).
- Given the signals request is held or has failed, then the bar is on screen and usable (executed).
- Given review mode, then `To` shows the review date, is disabled, carries the title and the `global` tag, and
  `From` stays editable (executed; the new review-mode test on this branch asserts the lock, the value, the title
  and the tag).
- Given a ticker pick, then the direction, the minimum score, the dates and the sort stay (executed).
- Given the window of the newest 5,000 IWM rows, then `5+` leaves 5,000 rows, `6+` 822, `7+` 14 and `8+` none
  (executed).
- Given the controls, then none has an accessible name or an `aria-pressed` (executed; no test asserts accessibility).

**Tests:** None on main asserts the bar. `shows CALL and PUT directions` finds the text `CALL` and `PUT`, which the
direction buttons contain, but its two locators are satisfied by the KPI tile's `168 call · 132 put` line, the first
match in the page, so it asserts neither the buttons nor the table (executed with an empty signals response: both
assertions passed with no row). On this branch, the three tests added in solyra commit 8ffbb54 (the filter and sort
test, the Clear test and the review-mode test, `tests/signals/signals.spec.ts`) drive every control of the bar; they
have not run in CI. Te stays unticked.

**Code:** `src/routes/SignalsPage.tsx:139-148,222-292`, `src/stores/reviewDateStore.ts:13-19`,
`lib/trading_analysis.py:784,822-970`; no test id on the bar's controls.

##### SIGNALS-04 · Signals table

**Shows or does:** The table of signals (`src/routes/SignalsPage.tsx:307-352`), drawn once the request is neither
loading nor failed. A bordered table with the headers `Time`, `Dir`, `Score`, `Price`, `RSI`, `EMA9` and `Volume`
(`:310-328`, columns `:69-131`), each clickable to sort (SIGNALS-05) with a chevron on the sorted one, and a body of
the first 500 rows after the filters and the sort (`displayRows`, `:183`). Under the table: `No signals match your
filters` when no row is left (`:341-345`, SIGNALS-09) and `Showing first 500 of <N> signals` when more than 500 are
left (`:346-350`), `<N>` being the filtered rows of the fetched window, not of the table in the database.

Cell formats (read): `Time` is `String(time).slice(0, 16)`, the stored string's date and minute with no zone
(`:70-73`); `Dir` is the direction in the bull colour for `CALL` and the bear colour for anything else (`:74-83`);
`Score` is `Number(score).toFixed(1)`, bull at 7 or more, warn at 5 or more, else muted (`:84-94`); `Price` is the
close as `$` and two decimals (`:95-101`); `RSI` has one decimal, bear above 70 and bull below 30 (`:102-114`);
`EMA9` is `$` and two decimals (`:115-121`); `Volume` is millions with one decimal from a million up and otherwise
thousands rounded to a whole number (`:122-130`). Price, RSI, EMA9 and Volume print `--` for a null. The response
also carries `ema20`, `conditions_met`, `return_pct`, `run_kind` and `ticker`, which no column shows.

What it holds (executed 2026-10-01, the real handler on the newest 5,000 production IWM rows, rendered in the
page): after the load the first rows read `2026-09-29 23:21 | PUT | 5.0 | $279.56 | 50.6 | $279.56 | 0K`,
`2026-09-29 23:14 | CALL | 5.0 | $279.58 | 56.1 | $279.53 | 0K` and `2026-09-29 22:20 | CALL | 5.0 | $279.86 | 74.3 |
$279.68 | 2K`, 500 rows are drawn, newest first, and the footnote reads `Showing first 500 of 5,000 signals`. The window
is 5,000 live rows over 50 dates, 2026-07-21 to 2026-09-29, 2,543 calls and 2,457 puts.

Four things the table does that the page does not say (executed on the same window):

- The Time column prints two conventions with no zone. Of the window's 5,000 rows 966 sit in UTC hours 4 to 7 (2026-07-21
  to 2026-09-25), which true UTC cannot hold for regular and extended hours (00:00 to 03:59 ET) and so are Eastern wall
  clock stamped as UTC, and 427 sit in hours 21 to 0, which Eastern labels cannot hold (21:00 to 23:59 ET) and so are
  true UTC. `2026-07-21 04:02` is a 04:02 ET bar and `2026-09-29 23:21` a 19:21 ET bar, printed side by side. This page
  has its own renderers (the Dashboard's table prints `time.slice(5, 16)` and a return multiplied by 100, DASHBOARD-05):
  it never reads `return_pct` or `conditions_met`, so the Dashboard's return finding does not carry over, and the time
  finding does (matrix Gaps, stocks#1210).
- `Volume` reads `0K` for any bar under 500 shares: 695 of the window's 5,000 rows, among them the newest row (171
  shares). A thin bar and a bar with no volume read the same.
- A null cell does not always read as missing. On a payload with nulls (production's IWM rows have none: no null
  score, RSI, EMA9, volume or price among 190,159 rows) a null `Score` printed `0.0`, an absent one `NaN`, a null
  direction `null` and an absent time or direction `undefined`, while Price, RSI, EMA9 and Volume printed `--`,
  although the page's own type says the render sites em-dash the gaps (`:26-27`). A zero score is a value, not a gap.
- The count above the table is the table's size in the database and the table is the newest 5,000 of it (SIGNALS-01,
  SIGNALS-05).

**Needs:** `GET /api/signals/{ticker}?limit=5000`, plus `end_date` and `end_time` in review mode, answered by
`get_signals` (`platform/api/routers/signals.py:221-251`) through `_query_signals_sql` (`:140-218`) on Cloud SQL: it
counts the ticker's `historical_signals` rows matching the filters (`:178-186`, answering `(0, [])` with no second
query on a zero count) and reads the newest `limit` by `entry_time` and returns them oldest first (`ORDER BY
entry_time DESC LIMIT` inside, `ORDER BY time ASC` outside, `:188-212`), with `time` as a string, `ticker` added and
NaN as null (`:214-218`). `run_kind` is selected and not filtered, deliberately (`:151-161`): IWM holds 175,370
backfill rows (2015-01-02 to 2026-06-01) and 14,789 live rows (2026-04-24 to 2026-09-29), and the page's window is
all live. `strategy` is neither selected nor filtered, and every one of the 1,725,574 rows in the table is
`momentum` (read 2026-10-01), so no minute carries two rows. The route is a plain `def` (the threadpool), a failed
query is a 503 for an outage and a 500 for a defect (`:59-83`), and only with Cloud SQL unconfigured does it read the
legacy GCS parquets (`:90-137,253-308`), never as a fallback. Producer: `historical-signals-watchlist`
(01:00 ET Tue to Sat) resumes each active `default`-owner watchlist ticker from its latest `entry_time` (a 30-day
bootstrap when it has none, `scripts/run_historical_signals.py:167-245`) and inserts with `ON CONFLICT (ticker, entry_time,
strategy) DO NOTHING` (`gcp/historical_signals.py:233-236`). Production on 2026-10-01 (00:28 ET): IWM's newest `entry_time` 2026-09-29 23:21
UTC, written 2026-09-30 05:03 UTC, 190,159 rows (QQQ 1,327,360 rows to 23:38, SPY 30,065 to 23:39); the scheduler
`ENABLED` with its last attempt 2026-09-30 05:00 UTC and its newest execution `historical-signals-watchlist-tqxh5`
completed 05:04 UTC on 2026-09-30. At that hour the 2026-09-30 session was not yet ingested, which is the one-session
lag the page assumes. Read again at 05:27 UTC, after the 01:00 ET run (execution `historical-signals-watchlist-pgvpp`,
completed 05:01 UTC): IWM's newest `entry_time` 2026-09-30 22:34 UTC, written 05:00 UTC, 190,259 rows, and 1,330 rows
across 16 tickers written in the two hours before.

**States:** SIGNALS-08 (the box replaces the table), SIGNALS-09 (the message under the header row), SIGNALS-10 (the
card replaces the table), SIGNALS-11 and SIGNALS-12.

**Acceptance criteria:**
- Given a 200 with rows, then the table draws the first 500 rows newest first with the cell formats above and the
  footnote `Showing first 500 of <N> signals` when more are left (executed 2026-10-01).
- Given the handler, then it answers `count`, `source` `cloud_sql`, the rows with `time` as a string and `ticker`
  set (`test_signals_live`, `tests/api/test_platform_api.py`, on main), an empty envelope with one query for a zero
  count (`test_signals_empty_for_old_date`) and a 503 or 500 for a failed query (`TestSignalsAPIFailsLoud`). The
  newest-N read, the ascending order and the direction filter (`platform/api/routers/signals.py:165-170,188-212`) are in the SQL and are
  read here, not asserted: the test class returns pre-filtered mock rows, so `test_signals_with_direction_filter`
  holds for any SQL.
- Given the stored time `2026-09-29 23:21:00+00:00`, then the cell reads `2026-09-29 23:21` whatever zone the row
  was stamped in (executed).
- Given a bar of 171 shares, then `Volume` reads `0K` (executed).
- Given a null score, then the cell reads `0.0` (executed on a payload with nulls; no production row has one).
- Given no token, then `GET /api/signals/IWM?limit=5000` answers 401 on staging (V evidence, 2026-10-01).

**Tests:** On main, no test asserts a table row. `lists alert rows` looks for `4.5`, `3.0` or `2.0` and
`shows CALL and PUT directions` for `CALL` and `PUT`: both are satisfied by the KPI block (the Win rate tile's `62.0%`
contains `2.0`, and `168 call · 132 put` contains both words), so they pass with an empty table (executed with an
empty signals response) and with a failed request. `route /signals loads without fatal errors`
(`tests/shared/navigation.spec.ts`) asserts the nav, `main` and a clean console. The handler tests are as above.
On this branch the filter and sort test, with the rows served oldest first as the handler returns them, reads the
three Time cells at load and the one after PUT, the Score cells after `6+`, `7+` and each Score sort, the Dir cells of
the two CALL rows and the count label at load and after PUT (not yet run in CI). Te stays unticked: no test on main
asserts what the table draws.

**Code:** `src/routes/SignalsPage.tsx:25-64,66-131,163-183,307-352`, `src/components/primitives/index.tsx:60-68`;
`platform/api/routers/signals.py:59-83,140-251`, `platform/api/schemas.py:607-632`,
`scripts/run_historical_signals.py:167-245`, `gcp/historical_signals.py:121-124,233-236`, `gcp/schema.sql:2137-2180`; no
test id on the table.

##### SIGNALS-05 · Filter and sort

**Shows or does:** The four filters and the column sort act on the rows the page fetched, in the browser; none of them
sends a request (`src/routes/SignalsPage.tsx:163-181`). The filters run in this order over the response's rows
(`:163-170`): the direction buttons keep the rows whose `direction` equals the chosen one (`:165`), `Min score` keeps
the rows with `Number(score) >= minScore` (`:166`), `From` keeps rows whose stored time's first ten characters are
at or after the date (`:167`) and `To` those at or before it (`:168`), both ends inclusive. The comparison is of the
stored string's date part, in whatever zone that row was stamped, so a bar stored at 00:30 UTC belongs to the next
date and a bar stored as Eastern wall clock to its own. The sort is TanStack Table's, driven by the headers
(`:172-181,314-323`), and starts as Time descending (`:139`); the 500-row cap of SIGNALS-04 applies after the filters
and the sort, so the table shows the top 500 of the filtered, sorted window. `columnFilters` and the `Dir` column's
`filterFn` (`:81-82,140`) are never set: dead code.

What a header click does (executed 2026-10-01, the real window, the rows in the order the handler returns them, oldest
first): the table starts sorted by `Time` descending (`:139`), so the first row reads `2026-09-29 23:21` and `Time`
carries a down chevron. A click on a numeric column (`Score`, `Price`, `RSI`, `EMA9`, `Volume`) sorts descending, a
second click ascending and a third removes the sort, a fourth sorts descending again; a click on a string column
(`Time`, `Dir`) sorts ascending, then descending, then removes the sort. With no sort the table shows the response's
order, oldest first, with no chevron. From the initial state `Time` is already at its descending step, so its clicks
run: 1 removes the sort (first row `2026-07-21 04:02`, no chevron), 2 ascending (the same first row, chevron up), 3
descending (`2026-09-29 23:21`, chevron down), 4 removes the sort again. After another column has been sorted, or when
the table has no sort, `Time` starts at its ascending step (Score descending, then `Time`: ascending, descending, no
sort, ascending). `Dir` runs ascending (`CALL` first), descending (`PUT` first), none. These runs hold while a row is
in view: TanStack reads a string column's first direction from the first row of the filtered set (`getAutoSortDir`,
`node_modules/@tanstack/table-core/src/features/RowSorting.ts:335-346`) and an empty set reads as descending, so with
`8+` on this window (no row in view, executed 2026-10-01) the first `Time` click goes straight to ascending (an up
chevron, and the rows oldest first once the filter is cleared) and the first `Dir` click to descending (`PUT` first
once it is cleared). Filter and sort compose: `CALL` over a Score sort kept the sort.

Scope: the window is the newest 5,000 rows (SIGNALS-01, SIGNALS-04). The handler accepts `direction` and `min_score`
and applies them in SQL (`platform/api/routers/signals.py:224-226,165-170`), but the page sends neither, and
sends `end_date` and `end_time` only in review mode. So `Min score 7+` and a Score sort look at the newest 5,000
rows of the 190,159, and a `From` earlier than the window's first date (2026-07-21 for IWM) finds nothing outside
it, while the label above keeps counting the whole table (matrix Gaps, stocks#1213).

Counts on the real window (executed): `CALL` 2,543 of 5,000 and `PUT` 2,457; `5+` 5,000, `6+` 822, `7+` 14 and `8+`
none; `PUT` with `6+` 417; `From` 2026-09-01 2,110; `From` 2026-09-01 with `To` 2026-09-10 746 (the newest row
`2026-09-10 23:57`); `From` 2026-06-01 with `To` 2026-09-10 3,636, which is all of the window up to that date, since
the window starts on 2026-07-21.

**Needs:** Only the rows of SIGNALS-04's request; `reviewDate` for the `To` bound in review mode (SIGNALS-07).

**States:** A filter that leaves nothing reads SIGNALS-09's message and the label's ` · 0 shown` (executed with `8+`);
the cap shows the footnote of SIGNALS-04.

**Acceptance criteria:**
- Given the window, when `PUT` is pressed, then only put rows stay and the label adds ` · <n> shown` (executed:
  2,457 shown); when `ALL` is pressed, then all return.
- Given `Min score` of 6, then rows scoring 6 or more stay (executed: 822), and given 8 then none (executed: the
  empty message).
- Given a `From` and a `To`, then rows whose stored date is inside the range, ends included, stay (executed: 746).
- Given the initial state, then the newest row is first and `Time` carries a down chevron; given clicks on `Time` with
  a row in view, then they give the response order with no chevron, ascending, descending and the response order
  again; given clicks on `Score`, descending, ascending and the response order; given clicks on `Dir`, ascending,
  descending and the response order; given no row in view, then the first click on `Time` gives ascending and the
  first on `Dir` descending (executed, the chevron following each step).
- Given a filter and a sort together, then both apply and the first 500 rows of the result show (executed).
- Given the new test `the direction buttons, Min score, the date range and the column headers act on the fetched
  rows`, added on this branch, then on the three-row fixture, served oldest first as the handler returns it, it asserts
  the Time cells and the count label at load and after `PUT`, the Score cells after `6+` and `7+` and after each Score
  sort, the row count after `PUT`, `8+` and each `From` and `To` step on either side of the rows' date, the message at
  `8+`, and the Dir and Score cells of the two CALL rows when CALL is combined with the sort; its mutations of the
  product (direction filter ignored, `>` for `>=`, From ignored, To exclusive, sorting removed, default sort emptied)
  each failed it.

**Tests:** No test on main asserts a filter or the sort: the existing specs never press a direction button, choose
a score, fill a date or click a header. The one test, added on this branch in solyra commit 8ffbb54 and changed in the
commit `test(signals): serve rows oldest first to pin the default sort`, passed as written (the behaviour was already
there) and is RED against each of six mutations of `src/routes/SignalsPage.tsx` made in a scratch copy: the direction
filter removed (`expected 1 row, received 3`), `Number(score) > minScore` (`6+` left only `7.0`), the From filter
removed (`expected 0 rows, received 3`), the To filter made exclusive (`expected 3 rows, received 0`),
`getSortedRowModel` removed (the Time cells at load read `17:00, 17:30, 18:00` for `18:00, 17:30, 17:00`, the order the
rows arrive in) and the default sort emptied (`useState<SortingState>([])`, the same Time cells). The first version
served the fixture newest first, the order the default sort produces, so it passed with the default sort emptied and
its `getSortedRowModel` mutation failed only at the Score sort (Score cells `7.0, 5.0, 6.0` for `7.0, 6.0, 5.0`); the
later commit serves the rows oldest first, as the handler returns them, and all six fail it. It has not run in CI. Te
stays unticked and the matrix Gaps say it waits for a CI run that includes the branch's tests.

**Code:** `src/routes/SignalsPage.tsx:67-131,139-183,226-257,311-323`; `platform/api/routers/signals.py:165-170,224-226`;
test: `tests/signals/signals.spec.ts` (the filter and sort test of the second describe block); no test id on the
controls.

##### SIGNALS-06 · Clear filters

**Shows or does:** A `Clear` text button at the end of the filter bar (`src/routes/SignalsPage.tsx:284-291`), drawn only
while one of the four filters is set: `dirFilter !== 'ALL' || minScore > 0 || dateFrom || (!isReview && dateTo)`.
A click runs `setDirFilter('ALL'); setMinScore(0); setLocalDateFrom(''); setLocalDateTo('')` (`:286`): the direction
returns to `ALL`, `Min score` to `Any` and both dates to empty. It does not touch the sort (executed 2026-10-01: a
Score sort and a `CALL` filter, then `Clear`: the sort stayed, the 7.0 rows of every direction showed), the review
state or the ticker.

Three details (executed on the real window):

- `5+` counts as a filter: `Clear` appears for it although it removes no row of the newest 5,000 (every row scores 5
  to 7), and the label gives no ` · <n> shown`.
- In review mode the `To` date, which shows the review date, does not count: with a `From` unset and `To` locked,
  `Clear` is not drawn (`!isReview`), and with a `From` set it clears the `From` and leaves `To` locked on the review
  date.
- A `To` date typed before review mode is held in `localDateTo` while the input shows the review date. Leaving review
  mode without pressing `Clear` brings it back: `To` typed as 2026-09-20, review mode entered and left, and the page
  read `To 2026-09-20`, `Clear` visible and ` · 4,256 shown` again, with no sign that it had been waiting. Pressing
  `Clear` inside review mode empties that held value (the click sets `localDateTo('')`).

**Needs:** Nothing: client state only (the page's `useState` cells, `:141-144`).

**States:** None of its own. It is part of the bar's state in review mode (SIGNALS-07).

**Acceptance criteria:**
- Given no filter is set, then `Clear` is not drawn (executed: initial render and after `Clear`).
- Given `CALL`, `Min score` 7 and a From and a To, then `Clear` is drawn, and when it is pressed, then `ALL` is
  active, `Min score` reads `Any`, both dates are empty, `Clear` is gone and every row is back (executed; the new
  test `Clear shows only while a filter is set and resets the direction, Min score and both dates`, added on this
  branch, asserts each of them, and that a Score sort made before it survives).
- Given review mode with a locked `To`, then `To` alone does not draw `Clear` (executed).
- Given a `To` typed before review mode, then it re-applies after review mode ends unless `Clear` was pressed in
  review mode (executed; no test).

**Tests:** None on main asserts `Clear`. The new test, added on this branch in solyra commit 8ffbb54, passed as
written and was RED against six mutations made in a scratch copy: `Clear` leaving the minimum score, the From, the To
or the direction (each failed at `expected Clear count 0, received 1`, since a filter left set keeps the button
drawn), `Clear` also resetting the sort (Score cells `6.0, 5.0, 7.0` for `7.0, 6.0, 5.0`, the order the rows arrive in) and `Clear` always drawn
(`expected 0, received 1` on the first render). It has not run in CI. Te stays unticked and the matrix Gaps say it
waits for a CI run that includes the branch's tests. No test covers the held `To` value.

**Code:** `src/routes/SignalsPage.tsx:139-148,284-291`; test: `tests/signals/signals.spec.ts` (the Clear test of the
second describe block); no test id on the button.

##### SIGNALS-07 · Review mode

**Shows or does:** Review mode is entered from the shell's Replay control, not from this page: a button in the top
bar (`src/components/shared/ReplayControl.tsx`, test id `replay-toggle`, mounted by `src/components/layout/TopTabs.tsx:203` and the
sidebar-mode `src/components/layout/Header.tsx:21`) that renders only on `/dashboard`, `/live`, `/charts` and `/signals` (`:11,112`). Its
popover has a calendar with weekends, listed market holidays and future dates disabled (`:112-118,208-214`), `Latest
session close` (`:143-146`, the latest weekday on or before today in Eastern time at 16:00), a `Time (ET)` field and
`OK` (`replay-apply`, enabled when the draft differs from the committed moment); `OK` writes `reviewDate`
(`YYYY-MM-DD`) and `reviewTime` (`HH:MM`) to `useReviewDateStore` (`:123-128`; `src/stores/reviewDateStore.ts:13-19`,
memory only), the chip turns amber `Replay · <date time>` and the ✕ (`replay-clear`) or `Back to live` clears both
(SHELL-09 describes the control).

With `reviewDate` set (`isReview`, `src/routes/SignalsPage.tsx:137`) the page changes in four ways. (1) The signals request
carries the moment: `GET /api/signals/{ticker}?limit=5000&end_date=<date>&end_time=<HH:MM>` (`:51-64,152-156`);
the query key holds the date and time, so each moment is cached for five minutes and leaving review mode returns the
cached live answer with no request. (2) The `To` input shows the review date, disabled, with the title `Set by
global historical mode, clear review mode to edit` and an amber `global` tag after it (`:147,269-282`); the date is
also applied as the client `To` bound (`:168`), which the server cutoff makes redundant. (3) `From` stays editable
and `Clear` does not count the `To` date (SIGNALS-06). (4) Nothing else changes: the Performance block asks for the
same last 90 days from now and reads the same (SIGNALS-02).

Executed 2026-10-01 (clock pinned to Tuesday 2026-09-29 17:00 ET; Replay: `Latest session close`, then 10:30 AM,
`OK`; the real handler's answer for the cutoff on the production IWM rows): the request was `?limit=5000&end_date=2026-09-29&end_time=10%3A30`,
the chip read `Replay · Sep 29, 10:30 AM`, `To` read `2026-09-29`, disabled, with the title and `global`, the label
read `IWM · 190,084 signals` (75 of the 190,159 rows cut), the table's newest row read `2026-09-29 10:30` and the five
tiles were unchanged with no summary request. `Back to live` made no request, enabled `To`, emptied it and removed
the tag.

The cutoff's zone is wrong for recent rows. The handler casts `<end_date> <end_time>:00` with `CAST(... AS timestamptz)`
in the database session (`platform/api/routers/signals.py:171-174`), whose zone is UTC (executed: `CAST('2026-09-25
10:30:00' AS timestamptz)` returned `2026-09-25 10:30:00+00:00` with `TimeZone` `UTC`), while its docstring and the
Replay control both say Eastern (`platform/api/routers/signals.py:228`, `src/components/shared/ReplayControl.tsx:246`). For rows stored as true UTC, as those of
2026-09-29 are (the day's first row is 08:00 UTC, 04:00 ET), a review time of 10:30 ET cuts at 06:30 ET: the live
answer holds 87 rows stamped 2026-09-29, 44 of them stored at or before 10:30 ET (14:30 UTC), and the review showed
12, none from after 06:30 ET, so the first hour of the regular session (09:30 ET, 13:30 UTC) was missing. For rows stored as Eastern wall clock
(up to 2026-09-25, from the hour histogram) the same cast lands where the reviewer expects (inferred, not executed;
matrix Gaps, stocks#1210).

**Needs:** The signals handler with `end_date` and optionally `end_time` (`platform/api/routers/signals.py:171-174,227-228`): the
predicate `entry_time <= CAST(:cutoff AS timestamptz)` is in both the count and the rows query, and the cutoff is
`<date> 23:59:59` without a time (`:172`); the page always has a time, since `OK` sets one. The Replay control
itself reads `GET /api/config/market-hours` for the holiday list (`src/components/shared/ReplayControl.tsx:47-58`, SHELL-09).

**States:** The `To` lock and the `global` tag are this row's presentation (SIGNALS-11 names the tag the page's only
as-of marker). A failed or empty review request reads SIGNALS-10 or SIGNALS-09: a review date before the table's first row
returns `count` 0 (the handler's zero-count short circuit, `test_signals_empty_for_old_date`) and the page reads
SIGNALS-09's message (executed with a zero-row answer).

**Acceptance criteria:**
- Given `OK` at 2026-09-29 10:30, then the page requests `end_date=2026-09-29&end_time=10%3A30` and the label counts the
  rows up to the cutoff (executed: 190,084).
- Given review mode, then `To` shows the review date, is disabled with the title, and the amber `global` tag shows;
  given `Back to live`, then `To` is enabled and empty and the tag is gone (executed; the new test `review mode asks
  the API for the cutoff, locks the To date under a global tag and gives it back`, added on this branch, asserts the
  request's query string for 2026-04-24 at 16:00, the lock, the value, the title, the tag and the give-back).
- Given review mode, then the five tiles and their request are unchanged (executed).
- Given a time stored as true UTC, then the cutoff reads it as UTC (executed: 12 of the day's 44 rows by 10:30 ET).
- Given the handler, then a cutoff keeps the rows at or before it: `test_signals_end_date_filter`,
  `test_signals_end_date_and_time_filter` and `TestReviewModeIntegration::test_signals_review_all_before_cutoff` return
  rows already at or before the cutoff from a mock and assert that they are (true whatever the SQL says); no test
  asserts the predicate, its zone or the page's request.
- Given no token, then `GET /api/signals/IWM?limit=5000&end_date=2026-09-30&end_time=16:00` answers 401 on staging
  (V evidence, 2026-10-01).

**Tests:** On main, only the three handler tests above and `tests/api/test_route_coverage.py` (no date parameters, 503
against a dead backend); no test drives the Replay control on this page. The new test, added on this branch in
solyra commit 8ffbb54, passed as written and was RED against five mutations made in a scratch copy: `end_date` not
sent (the query read `?limit=5000&end_time=16%3A00`), `end_time` not sent (`?limit=5000&end_date=2026-04-24`), `To`
not locked (`expected disabled, received enabled`), the `global` tag removed (`element not found`) and `To` showing
the local value instead of the review date (`expected 2026-04-24, received an empty value`). It has not run in CI. Te
stays unticked and the matrix Gaps say it waits for a CI run that includes the branch's tests.

**Code:** `src/routes/SignalsPage.tsx:51-64,136-156,168,269-282`, `src/components/shared/ReplayControl.tsx:11,47-58,112-146,
236-289`, `src/stores/reviewDateStore.ts:13-19`; `platform/api/routers/signals.py:171-174,221-251`; test:
`tests/signals/signals.spec.ts` (the review-mode test of the second describe block); test ids `replay-toggle`,
`replay-apply`, `replay-clear`; the `To` input and the tag carry none.

##### SIGNALS-08 · State: loading

**Shows or does:** A state, not a control: while the signals request has no data (`isLoading`,
`src/routes/SignalsPage.tsx:152`), a box reading `Loading signals…` takes the table's place (`:301-305`, centred muted text
in a `--surface-2` card); it has no spinner and no `role` or `aria-live`. Around it: the label reads `<ticker> ·
signal explorer` in place of the count (`:193`, SIGNALS-01); the Performance block is absent until its own request
answers, with no skeleton and no text (`:209`, SIGNALS-02); and the filter bar is drawn and usable (SIGNALS-03).
`isLoading` is TanStack Query's first-load flag, true only for a key with no data: the first visit, a ticker not
fetched yet (a pick of SPY) or a review moment not fetched yet; a refetch of a stale key keeps the table on screen
with no indicator (read).

Executed 2026-10-01 (hermetic render, the signals request held open): the box read `Loading signals…` (no `role`), no
table was in the page, the label read `IWM · signal explorer`, the five tiles showed (the summary had answered), and
`CALL` could be pressed: `Clear` appeared and the label stayed `signal explorer`. When the request was released the
table replaced the box with the filter already applied (`IWM · 190,159 signals · 2,543 shown`, 500 rows).

**Needs:** Nothing of its own: the wait is the signals request of SIGNALS-04. The production database ran the 5,000-row read in 170 ms (statement time in the replay
dispatch); the box shows for the request's whole round trip.

**States:** This is the loading state of the table, the label and, by absence, the Performance block. It ends in
SIGNALS-04, SIGNALS-09 or SIGNALS-10.

**Acceptance criteria:**
- Given the signals request is pending with no cached answer, then `Loading signals…` shows in place of the table
  and the label reads `signal explorer` (executed).
- Given the same, then the filter bar works and its filters apply when the rows arrive (executed).
- Given the Performance request is pending, then no block, skeleton or text shows for it (read: the block is guarded
  by `pnl` and nothing else renders for it).
- Given a cached or stale key, then no loading box shows (read).

**Tests:** None. Every Playwright spec that opens `/signals` answers its routes at once and waits for
`networkidle`; none holds a request or looks for `Loading signals…`. Te stays unticked.

**Code:** `src/routes/SignalsPage.tsx:51-64,152-157,191-195,209,301-305`; no test id and no `role` on the box.

##### SIGNALS-09 · State: empty

**Shows or does:** A state: when no row is left after the filters (`filtered.length === 0`,
`src/routes/SignalsPage.tsx:341-345`) the table's box shows the header row and, under it, `No signals match your filters`
in small muted text. When the Performance summary has no closed trade the block is not drawn (`:209`, SIGNALS-02). The
label reads `<ticker> · 0 signals` when the response had no rows and ` · 0 shown` when the filters took them all
(SIGNALS-01).

The same message covers three causes (executed 2026-10-01): filters that exclude everything (`8+` on the real window:
`IWM · 190,159 signals · 0 shown` and the message), a ticker the table holds no rows for (a 200 answer with `count` 0:
`IWM · 0 signals` and the message, no filter set), and a review moment before the first row. It names filters even
when none is set.

A ticker with no rows is a 200, not an error: the handler answers `(0, [])` on a zero count with no second query
(`platform/api/routers/signals.py:185-186`), so the amber card of SIGNALS-10 does not appear for it. Today 16 tickers
have rows in `historical_signals` and the picker offers any symbol the vendor search returns (SIGNALS-01), so a pick of
any other ticker lands here, and a signed-in user's pick of a new symbol never gets rows, because the nightly job
reads only the `default` list (matrix Gaps).

**Needs:** Nothing of its own: the empty rows of SIGNALS-04's request, and for the hidden block the summary of
SIGNALS-02 with `closedTrades` 0 (`_compute_stats([])` for no `trades` rows, `platform/api/routers/analytics.py:161-162`).

**States:** This is the empty state of the table (SIGNALS-04) and of the Performance block (SIGNALS-02). The table's
header row stays and so does the sort chevron on `Time` (executed).

**Acceptance criteria:**
- Given a 200 with no rows, then the label reads `IWM · 0 signals`, the table shows its header row and `No signals
  match your filters`, and no error card shows (executed 2026-10-01; the message is asserted by `shows empty state
  when no alerts`, `tests/signals/signals.spec.ts`, on main at eca7078).
- Given filters that exclude every row, then the same message shows with ` · 0 shown` in the label (executed; the
  message is asserted on this branch by the filter and sort test at `8+`).
- Given no closed trades, then the Performance block is not drawn (executed with the zero-trade summary).
- Given a count of zero, then the handler answers `signals: []` and runs one query (`test_signals_empty_for_old_date`,
  `tests/api/test_platform_api.py`, on main).

**Tests:** On main, `shows empty state when no alerts` answers `**/api/signals/IWM*` with `MOCK_SIGNALS_EMPTY` and
asserts that text matching `/no.*signal|empty/i` is visible: exactly one element matches today (executed), the
message; the pattern would also match the failure card's `not found ... signals` text, and the test leaves the
default summary in place, so the block stays visible and its hiding is not asserted. On the handler side
`test_signals_empty_for_old_date` asserts the empty envelope, `count` 0 and a single query; the summary handler's
answer for no trades is asserted by no test (`test_summary_restricts_to_live_trades` returns an empty frame and
asserts only the status and the SQL). Te is ticked on these two (matrix Gaps list what they leave unasserted).

**Code:** `src/routes/SignalsPage.tsx:163-170,209,341-345`; `platform/api/routers/signals.py:178-186`,
`platform/api/routers/analytics.py:161-162`; no test id on the message.

##### SIGNALS-10 · State: error

**Shows or does:** A state: when the signals request fails (`isError`, `src/routes/SignalsPage.tsx:294-299`) an amber card
with an alert-triangle icon reads `Signal data not found for <ticker>. Run the signals generation pipeline first.`
and the table is not drawn; with no cached answer the label reads `<ticker> · signal explorer` (`:193` tests
`data`), and the filter bar and the Performance block stay (SIGNALS-03, SIGNALS-02). The card is the same for every failure of the request, an outage, a
defect, a missing route, a refused token or a network error (executed 2026-10-01, the signals route answering 503, 500,
404 and 401): after about two seconds and one retry (`src/App.tsx:30-37`, `retry: 1`: two signals requests were logged for
each), the same text appeared, with no status, no server `detail`, no `Retry` button
and no `role` (`getByRole('alert')` found nothing).

A failed refetch of a cached key shows the same card over rows the page still holds (executed 2026-10-01 on the shared
three-row fixture: the signals route answered 200 and then 503, the clock was moved six minutes past the five-minute
`staleTime` and the tab was given focus back, so the library refetched, tried once more and gave up, two 503 answers
in all): the card appeared, the table was gone (`:307` draws it only while `!isError`), the label kept the cached
count, `IWM · 3 signals`, and the Performance block and the filter bar stayed. The cached rows are held and hidden
behind `Run the signals generation pipeline first`, and nothing says that they are old or that the refresh is what
failed.

The advice is wrong for what it follows. The server's own text is unused (`signals temporarily unavailable` for an
outage), and the case the card describes, a ticker the pipeline has not processed, is not an error at all: the handler
answers 200 with no rows and the page reads SIGNALS-09 (executed). The card therefore shows only for failures,
where `Run the signals generation pipeline first` points at the wrong cause.

A failed summary with no cached answer is silent: with `GET /api/analytics/summary/IWM` answering 503 and the signals
request fine, the page showed the table and the label and no block and no text at all about it, after the retry too
(executed; `useTradeSummary` throws, `pnl` stays undefined and `:209` draws nothing). A failed refetch of a cached
summary is silent in another way: the cached tiles stay on screen with no marker (executed 2026-10-01 on the shared
three-row fixture: the summary route answered 200 and then 503, the clock was moved six minutes past `staleTime` and
the tab was given focus back, and `Win rate` still read `62.0%`, with no card and no text), because `pnl` keeps the
cached `data` and `:209` draws from it.

**Needs:** The failing routes. `get_signals` answers 503 `signals temporarily unavailable` for an infrastructure error
(`_query_or_503`, `platform/api/routers/signals.py:59-83`, through `lib.infra_errors.is_infrastructure_error`), lets
any other exception propagate as a 500, and only with Cloud SQL unconfigured reads the legacy parquets and answers
404, 502, 503 or 400 from there (`:90-137,257-264`). `get_trade_summary` answers 503 `Cloud SQL not configured; cannot
query trades table.` without Cloud SQL (`platform/api/routers/analytics.py:140-144`), 503 `trade summary temporarily
unavailable` for an outage and a 500 for a defect (`:153-160`, `platform/api/http_errors.py`). Both read through the
strict reader, so no empty frame is served for a failed query.

**States:** This is the error state of the table and the label (SIGNALS-04, SIGNALS-01) and, silently, of the
Performance block (SIGNALS-02). A 401 reads the same and adds the shell's strip (SIGNALS-12). On a failed refetch it
is the error state of a table the page still holds data for (SIGNALS-11).

**Acceptance criteria:**
- Given the signals request fails with 503, 500, 404 or 401 and no answer is cached, then after the retry the card
  reads `Signal data not found for IWM. Run the signals generation pipeline first.`, no table is drawn and the label
  reads `IWM · signal explorer` (executed 2026-10-01).
- Given a cached answer older than five minutes and a refetch that fails with a 503 after its retry, then the same
  card shows, no table is drawn, the label keeps the cached count `IWM · 3 signals` and the Performance block and the
  filter bar stay (executed 2026-10-01, the shared three-row fixture).
- Given the signals request fails and the summary answers, then the five tiles and the filter bar stay (executed).
- Given the summary request fails with no cached answer, then the block is absent and no text mentions it (executed);
  given a cached summary older than five minutes and a refetch that fails, then its tiles stay with no marker
  (executed 2026-10-01, the shared three-row fixture).
- Given an infrastructure failure of the read, then the handler answers 503, given a defect then 500, and given no
  database it answers 503 and never serves the parquets (`test_signals_is_503_when_the_cloud_sql_query_fails`,
  `test_signals_query_defect_is_500_not_a_fabricated_503`, `test_router_reads_through_the_strict_query_only`,
  `tests/api/test_platform_api.py`; `test_summary_is_not_a_flat_zero_when_the_query_fails` and
  `test_summary_is_503_when_cloud_sql_is_unreachable`, `tests/api/test_analytics_summary.py`; all on main), and
  `tests/api/test_route_coverage.py` pins both routes at 503 against a dead backend.
- Given a failed request, then the card carries neither the status nor the server's reason (executed; matrix Gaps).

**Tests:** On main, the handler tests above and the route-coverage rows. No test asserts the card, the label's
fallback, the failed refetch, the silent summary or the retry: no spec fails a request on this page, and the regex of `shows empty
state when no alerts` would match the card's text only if the response failed. Te stays unticked: the page layer of
this state is asserted by nothing.

**Code:** `src/routes/SignalsPage.tsx:51-64,152,191-195,294-299,307`, `src/hooks/useTradeAnalytics.ts:36-47`,
`src/App.tsx:30-37`; `platform/api/routers/signals.py:59-83,90-137`, `platform/api/routers/analytics.py:131-178`,
`platform/api/http_errors.py`; no test id and no `role` on the card.

##### SIGNALS-11 · State: stale

**Shows or does:** A state the page has almost no presentation for. In live mode nothing on the page says how old the
rows are: the label counts them, the table prints each row's stored time, and no line gives the newest row's age or
the time of the last pipeline run. The one as-of marker is the amber `global` tag after the `To` input in review mode
(`src/routes/SignalsPage.tsx:279-281`, SIGNALS-07), and it names the source of the date, not the age of the data. The
Performance block is not marked at all: it keeps showing the last 90 days from now in review mode (SIGNALS-02).

What the reader is not told (executed 2026-10-01 against production, 00:28 ET, and read from the schedule):

- The table lags by design. `historical-signals-watchlist` runs Tuesday to Saturday at 01:00 ET
  (`0 1 * * 2-6`, `America/New_York`, `ENABLED`), so the rows of a session arrive after the next midnight: IWM's newest
  `entry_time` was 2026-09-29 23:21 UTC, written 2026-09-30 05:03 UTC, while the 2026-09-30 session had closed and
  waited for the 05:00 UTC run (which landed it: read again at 05:27 UTC, IWM's newest `entry_time` was 2026-09-30
  22:34 UTC, written 05:00 UTC). From Saturday's run to Tuesday's the newest rows are Friday's session, up to three
  calendar days old by Monday evening (read from the cron).
- The two blocks can be a session apart. The Performance block already counted `trades` entered on 2026-09-30 (IWM's
  newest entry 13:34 UTC, exit 13:55 UTC) while the table's newest row was 2026-09-29.
- The client keeps an answer for five minutes (`staleTime`, `:62` and `src/hooks/useTradeAnalytics.ts:45`) and has no
  `refetchInterval`, so a stale key is fetched again only when the library's defaults call for it, such as the window
  regaining focus (executed on the shared three-row fixture: a `visibilitychange` event after a six-minute clock jump
  refetched both requests), and the response carries no timestamp of its own (`SignalsResponse` has none).
- A refresh that fails leaves rows the page cannot vouch for under an error card. Executed 2026-10-01 on the shared
  three-row fixture (the signals route answered 200 and then 503, the clock was moved six minutes past `staleTime` and
  the tab was given focus back): SIGNALS-10's card replaced the table while the label kept the cached count,
  `IWM · 3 signals`, so the cached rows were held and hidden and nothing said that they were old. A failed refresh of
  the summary instead leaves the cached tiles on screen unmarked (the same run with the summary route answering 503:
  `Win rate` still read `62.0%`, no card, no text).

**Needs:** Nothing of its own. The facts above come from `historical_signals.inserted_at` and `entry_time`, the
scheduler and the job executions the V evidence lists (`historical-signals-watchlist-tqxh5` completed
2026-09-30 05:04 UTC); the page reads none of them.

**States:** This is the stale state of the table (SIGNALS-04) and of the Performance block (SIGNALS-02), and the
`global` tag is the review-mode marker of the filter bar's `To` date (SIGNALS-03). A failed refetch of the table's key
turns it into SIGNALS-10's card over cached data.

**Acceptance criteria:**
- Given review mode, then the `To` date shows the review date with an amber `global` tag (executed; the new review-mode
  test on this branch asserts the tag).
- Given live mode, then nothing on the page states the age of the rows or of the summary (executed: the text of
  `main` outside the table's rows, on the real-window render, holds no date, `ago`, `updated` or `as of`).
- Given production at 00:28 ET on 2026-10-01, then IWM's newest row is from the session before the last one closed
  (read: `max(entry_time)` 2026-09-29 23:21 UTC, `max(inserted_at)` 2026-09-30 05:03 UTC).
- Given a cached signals answer older than five minutes and a failed refetch, then SIGNALS-10's card replaces the
  table and the label keeps the cached count; given a failed refetch of the summary, then the cached tiles stay with
  no marker (executed 2026-10-01, the shared three-row fixture).

**Tests:** None on main asserts the tag or any age presentation, and no test could assert an age marker the page does
not have. Te stays unticked.

**Code:** `src/routes/SignalsPage.tsx:62,152-156,193,279-281,294-299,307`, `src/hooks/useTradeAnalytics.ts:45`;
`gcp/deploy.sh:5060` (the schedule), `scripts/run_historical_signals.py:167-245`; no test id on the tag.

##### SIGNALS-12 · State: permission

**Shows or does:** A state with two presentations, one of them out of reach. (1) `DataGate` wraps everything from the
Performance block to the table (`src/routes/SignalsPage.tsx:200,353`) and, when a gated call has answered 401 and the user
is signed out (`blocked && !isLoading && !isSignedIn`), replaces it with `SignInEmptyState`, a `role="status"` block
reading `Sign in to load data` with a `Sign in` button that reloads the page (`src/components/shared/SignInEmptyState.tsx:12-51,93-98`).
The title, the label and the picker sit outside it. This page does not use `SignInBanner`. (2) For a signed-in user whose
token is refused, `DataGate` does nothing, because `isSignedIn` is true.

The replacement is unreachable in practice. In `firebase` mode a signed-out user never sees the page: `AuthGate`
renders the sign-in screen in place of the whole app (`src/components/auth/AuthGate.tsx:14-30`; executed 2026-10-01 with
`/signals` opened signed out: the sign-in screen showed, there was no `Signals` heading and no table, and the only API
request was `GET /api/config/firebase`). In `open` and `iap` modes `useUser` reports signed in always
(`src/hooks/useUser.ts:25-27,81`), so `DataGate`'s condition cannot hold.

What a signed-in user sees on a 401 (executed 2026-10-01, `open` mode as the hermetic suite runs, the signals and
summary routes answering 401 `sign in to continue` from the first request): the shell's strip `Your session expired, so live data is not
loading.` with a `Sign in` button, `role="status"`, and the nav pill `Session expired`
(`src/components/shared/AuthStatusIndicator.tsx:23-33,156-182`, SHELL-16); on the page itself the SIGNALS-10 card
`Signal data not found for IWM. Run the signals generation pipeline first.`, the label `IWM · signal explorer` and no
Performance block. The page says nothing about signing in, and its text points at the pipeline. The flag behind the strip is
set by the fetch wrapper on any gated 401 and cleared by any later gated success (`src/lib/authedFetch.ts:155-166,247-250`,
`src/lib/authGate.ts:14-47`), so it follows the last answer (read): when the page's two requests answer
differently, the order in which they settle decides whether the strip is up.

**Needs:** The 401 itself. Every route the page calls is gated: staging answered 401 without a token to `GET
/api/signals/IWM?limit=5000`, the same with `end_date` and `end_time`, `GET /api/analytics/summary/IWM?days=90` and the
three picker routes (V evidence, 2026-10-01), and `GET /api/health` answered 200 in the same run. The wrapper's
`OPEN_PREFIXES` must match the backend's `_OPEN_API_PREFIXES` (CLAUDE.md, Auth).

**States:** This is the permission state of the Performance block, the filter bar and the table (SIGNALS-02, SIGNALS-03,
SIGNALS-04), of the label's count (SIGNALS-01) and of review mode's request (SIGNALS-07), whose calls the 401 blanks.

**Acceptance criteria:**
- Given no token, then each gated route above answers 401 on staging (V evidence, 2026-10-01).
- Given a signed-in user and a 401 on the signals request, then the shell shows its expired-session strip and the page
  shows the SIGNALS-10 card with no `Sign in to load data` and no sign-in prompt of its own (executed).
- Given a signed-out user in `firebase` mode, then the sign-in screen replaces the page and the page requests nothing
  (executed; `firebase mode, signed out → login screen blocks the app`, `tests/shared/auth-gate.spec.ts`, asserts the
  screen on `/dashboard`, on main at eca7078).
- Given a gated 401, then the wrapper calls the callback registered with `setOnUnauthorized` and a 401 from an open
  path does not (`a 401 from a gated path fires onUnauthorized`, `a 401 from an OPEN path does not fire onUnauthorized`,
  `src/lib/authedFetch.test.ts`, on main); no code outside the tests registers one, so no behaviour hangs on it, and the
  flag behind the strip, set on the next line, is not read by that test.

**Tests:** On main: `src/lib/authedFetch.test.ts` as above, `tests/api/test_platform_auth.py`
(`test_firebase_requires_valid_token`: a gated path answers 401 without a token in `firebase` mode and the open paths 200,
on a synthetic `/api/secret` route and not on a signals route) and the sign-in screen test above. No test asserts
`DataGate`, the strip on this page, the page's 401 presentation or a 401 on a signals route. Te stays unticked.

**Code:** `src/routes/SignalsPage.tsx:152-160,200,294-299,353`, `src/components/shared/SignInEmptyState.tsx:12-98`,
`src/components/auth/AuthGate.tsx:14-30`, `src/lib/authGate.ts:14-47`, `src/lib/authedFetch.ts:45,155-166,247-250`,
`src/hooks/useUser.ts:25-27,81-82`, `src/components/shared/AuthStatusIndicator.tsx:23-33,156-182`; test ids `auth-status`,
`auth-status-banner` (the shell's); the page's own state has none.

### SCREEN-JOURNAL — `/journal`

- **Purpose:** One-stop trade cockpit: interactive chart marking, examples, broker CSV import, per-user trades.
- **Matrix:** [03 § 13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#13--journal)
- **Status:** Production but needs remediation · **Blocking issue:** [#717](https://github.com/TeneikaAskew/stocks/issues/717) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/JournalPage.tsx` (945 lines)
- **Child components:** `Card`, `CardHeader`, `ImportTradesModal`, `KpiTile`, `LoadingSpinner`, `PriceAreaChart`, `TickerCombobox`, `TradeMarkingChart`, `TradeRailCard`, `type TradeMarkingChartHandle`
- **API calls (from source):** `/api/journal/export/`, `/api/journal/trades`
- **Stores:** `useSettingsStore`, `useTickerStore`
- **E2E specs:** `tests/journal/journal-import.spec.ts`, `tests/journal/journal-onestop.spec.ts`, `tests/journal/journal.spec.ts`
- **PR lineage:** [#626](https://github.com/TeneikaAskew/stocks/pull/626) per-user scoping · [#705](https://github.com/TeneikaAskew/stocks/pull/705) chart trades persist · [#718](https://github.com/TeneikaAskew/stocks/pull/718) one-stop cockpit · [#764](https://github.com/TeneikaAskew/stocks/pull/764) tz guard
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/journal/trades/{ticker} | ticker, source, count, trades[].id/direction/entry_ts/exit_ts/entry_price/exit_price/return_pct/notes/take_profits/stop_loss/status/source/session_id/created_at/time_stop_minutes (types: `useJournalChartTrades.ts` JournalRow/JournalTradesResponse) |  | 10s staleTime | `useJournalTradesFull` → Header row source label, Cockpit row, KPI tiles, Trade table |
| GET /api/journal/examples/{ticker} | same shape as above, `source` `pipeline` rows read-only (types: `useJournalChartTrades.ts` JournalTradesResponse) | signal-monitor 09:25 ET Mon-Fri and signal-monitor-eod-resolver 16:30 ET Mon-Fri → trades | 30s staleTime | `useJournalExamples` → Cockpit row, KPI tiles, Trade table (Examples view) |
| GET /api/market/data/{ticker}/{date} | ticker, date, timeframe, count, candlestick[].time/open/high/low/close, volume[].time/value/color (types: `useMarketData.ts` MarketDataResponse) | fetch-market-data 23:00 ET Mon-Fri and fetch-alphavantage-intraday 21:00 ET Mon-Sat → market_data_intraday | staleTime Infinity (historical bars do not change) | `useMarketData` → Cockpit row chart |
| GET /api/market/dates/{ticker} | ticker, source, dates[], months[] (types: `useMarketData.ts` DatesResponse) | fetch-market-data 23:00 ET Mon-Fri and fetch-alphavantage-intraday 21:00 ET Mon-Sat → market_data_intraday | 5min staleTime | `useAvailableDates` → Header row trading-date picker |
| POST /api/journal/trades | source, id, return_pct, status (types: `useJournalChartTrades.ts` JournalMutationResponse) |  |  | `useCreateChartTrade` (chart) / `useAddTrade` (inline in `JournalPage.tsx`, manual form) → Mark entry on the chart, Add trade manually |
| PATCH /api/journal/trades/{trade_id} | source, id, return_pct, status (types: `useJournalChartTrades.ts` JournalMutationResponse) |  |  | `useCloseChartTrade` → Mark entry on the chart (exit) |
| DELETE /api/journal/trades/{trade_id} | source, deleted (types: `useJournalChartTrades.ts` JournalDeleteResponse) |  |  | `useDeleteChartTrade` → Trade table delete button |
| POST /api/style/mine-and-validate | profile.direction/conditions/support/total, aggregate_metrics.avg_expectancy_pct/avg_win_rate/total_trades_all_folds/total_folds, stability_score, staged, or status "unavailable"/reason (types: `useJournalChartTrades.ts` MineStyleResponse) |  |  | `useMineMyStyle` → My style panel |
| POST /api/journal/import/preview | broker, trades[].ticker/direction/entry_ts/entry_price/exit_ts/exit_price/return_pct/quantity/status/duplicate, skipped[].raw_index/reason (types: `useJournalChartTrades.ts` ImportPreviewResponse) |  |  | `useImportPreview` → Import CSV modal (preview step) |
| POST /api/journal/import/commit | imported, skipped_duplicates (types: `useJournalChartTrades.ts` ImportCommitResponse) |  |  | `useImportCommit` → Import CSV modal (commit step) |
| POST /api/journal/export/{ticker} | success, trades_exported, output_path, filename (types: `useJournalChartTrades.ts` JournalExportResponse) |  |  | `exportPipeline` (inline in `JournalPage.tsx`) → Export to Pipeline |
| GET /api/insights/ticker/search · GET /api/market/coverage · POST /api/insights/watchlist/add | matches[], coverage flags, watchlist add result (types: `useTickerSearch.ts`) |  | 60s staleTime (search) | `TickerCombobox` → Header row ticker picker |
| store: ticker, chart timeframe |  | Zustand, per session |  | every card |
| browser localStorage: import mapper presets |  | per browser |  | `ImportTradesModal` |

#### Displayed
| ID | Element | Component |
|---|---|---|
| JOURNAL-01 | Header row | inline in `JournalPage.tsx` (ticker title, `source` label, `TickerCombobox`, trading-date picker, view toggle) |
| JOURNAL-02 | Cockpit row | inline in `JournalPage.tsx` (`PriceAreaChart` / `TradeMarkingChart`, mini-toolbar, `TradeRailCard`, `journalStats.ts` equity curve) |
| JOURNAL-03 | KPI tiles | `KpiTile` (inline in `JournalPage.tsx`; `journalStats.ts` `computeJournalStats`) |
| JOURNAL-04 | My style panel | `MyStylePanel` |
| JOURNAL-05 | Add-trade form | inline in `JournalPage.tsx` |
| JOURNAL-06 | Trade table | inline in `JournalPage.tsx` (`risk.ts`) |

#### Actions
| ID | Action | What happens |
|---|---|---|
| JOURNAL-07 | Mark entry on the chart | `TradeMarkingChart` drives `useTradeMarking`; clicking the entry bar, then picking CALL or PUT, then optional targets and a stop, posts through `useCreateChartTrade` (`source: "chart"`) and flips the view to My journal; the exit comes later, from the rail card, through `useCloseChartTrade`. |
| JOURNAL-08 | Add trade manually | The Add-trade form's Save Trade button posts through `useAddTrade` (`source` defaults to `manual`), then clears the form and flips the view to My journal. |
| JOURNAL-09 | Import CSV | `ImportTradesModal`: pick broker and file, then `useImportPreview` → review the preview and uncheck rows → `useImportCommit`, which refetches every ticker's journal. |
| JOURNAL-10 | Export CSV | "CSV" downloads the active view through `tradesToCsv`; "Export to Pipeline" posts through `exportPipeline` (`POST /api/journal/export/{ticker}`), reporting the count on success and falling back to a local CSV download on failure. |
| JOURNAL-11 | Switch view or session | The My journal / Examples toggle and the session-date input (`Overview` on clear) re-scope every card above. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| JOURNAL-12 | loading | present | The chart's spinner; "Loading journal…" while the active view loads with no rows; `MyStylePanel`'s "Mining…"; "Saving…"; the import modal's "Parsing…" and "Importing…". |
| JOURNAL-13 | empty | present | "No example trades for {ticker} yet." / "Log Your First Trade" depending on view; "No trades on this session, clear the date for the Overview."; an empty rail; "Close 2+ trades to see your equity curve."; "No market data available for this date". |
| JOURNAL-14 | error | present | The manual form's "Failed to save trade, check API connection." is the only rendered mutation error; a failed own-journal read shows no error text (the source label falls back to "Local storage"); Examples, chart and style-mining each render their own message; the import preview and commit errors render; marks, exits and deletes render nothing on failure. |
| JOURNAL-15 | stale | present | No element shows a row's age; the own journal and Examples queries hold 10s and 30s respectively before refetching. |
| JOURNAL-16 | permission | not tracked (new category); present | `DataGate` wraps the page body; `AuthGate`'s `SignInScreen` renders for a signed-out visitor; every signed-in user sees the same Examples. |

#### Journeys
1. Log a trade from the chart: Opens /journal and picks the session date (JOURNAL-01, JOURNAL-11) → Clicks Mark entry (JOURNAL-07) → Clicks the entry bar, then picks CALL or PUT (JOURNAL-07) → Optionally sets up to three targets and a stop (JOURNAL-07) → The trade appears in the rail, tiles and table (JOURNAL-02, JOURNAL-03, JOURNAL-06) → Exits later from the rail card (JOURNAL-07); the seed describes entry, then exit, then CALL or PUT, which is not the code's order (see the matrix Journal Gaps)
2. Bring in broker history: Clicks Import CSV (JOURNAL-09) → Picks the broker and file, Robinhood and Webull skip the mapper (JOURNAL-09) → Reviews the preview table and unchecks rows (JOURNAL-09) → Commits; result reads "Imported N · M duplicates skipped" (JOURNAL-09) → Trades land in My journal (JOURNAL-06, JOURNAL-11)
3. Review performance: Clears the session date for the Overview (JOURNAL-11) → Reads the KPI tiles across all dates (JOURNAL-03) → Follows the cumulative equity curve (JOURNAL-02) → Opens "My style" to mine patterns from closed trades (JOURNAL-04) → Exports the view as CSV (JOURNAL-10)
4. Learn from examples: Switches the view toggle to Examples (JOURNAL-11) → Studies curated trades on the same chart (JOURNAL-02) → Compares their levels with their own (JOURNAL-06) → Switches back to My journal (JOURNAL-11)

#### Elements
##### JOURNAL-01 · Header row

##### JOURNAL-02 · Cockpit row

##### JOURNAL-03 · KPI tiles

##### JOURNAL-04 · My style panel

##### JOURNAL-05 · Add-trade form

##### JOURNAL-06 · Trade table

##### JOURNAL-07 · Mark entry on the chart

##### JOURNAL-08 · Add trade manually

##### JOURNAL-09 · Import CSV

##### JOURNAL-10 · Export CSV

##### JOURNAL-11 · Switch view or session

##### JOURNAL-12 · State: loading

##### JOURNAL-13 · State: empty

##### JOURNAL-14 · State: error

##### JOURNAL-15 · State: stale

##### JOURNAL-16 · State: permission

### SCREEN-INSIGHTS — `/insights`

- **Purpose:** AI-generated per-ticker insight reports, history and chat.
- **Matrix:** [03 § 09](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#09--ai-insights)
- **Status:** Experimental · **Blocking issue:** [#916](https://github.com/TeneikaAskew/stocks/issues/916) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/InsightsPage.tsx` (605 lines)
- **Child components:** `AgentsPanel`, `BriefVsInsightsCard`, `CatalystsCard`, `DataGate`, `DebateCard`, `DegradationBanner`, `HeaderCard`, `KeyLevelsCard`, `MicroLabel`, `PersonaPlansCard`, `RiskFlagsCard`, `SignalsCard`, `SimilarTradesCard`, `StratCard`, `TickerCombobox`, `TradePlanCard`, `WatchlistPanel`
- **API calls (from source):** `/api/insights/chat` in the page; through hooks `/api/dashboard/brief/`, `/api/insights/report/` (the report, its `/history` and its `/refresh`), `/api/insights/reports/`, `/api/insights/runs/`, `/api/admin/routes`, `/api/insights/watchlist`, `/api/insights/ticker/search` and `/api/insights/watchlist/add`; the header picker's `/api/market/coverage` (and its own search and add) is issued by `TickerCombobox`
- **Stores:** `useTickerStore`
- **E2E specs:** `tests/insights/insights.spec.ts`
- **PR lineage:** [#353](https://github.com/TeneikaAskew/stocks/pull/353) divergence card · [#344](https://github.com/TeneikaAskew/stocks/pull/344) reflection memory · [#451](https://github.com/TeneikaAskew/stocks/pull/451) break feedback loop
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/dashboard/brief/{ticker} | ticker, bias, signal_status, ftfc_direction (types: `useInsights.ts` BriefDirection); `bias` is derived by the handler and is not a stored column | premarket-brief 08:30 ET Mon-Fri → premarket_analysis (`signal_status`, `ftfc_direction`), with market_data_daily as the fallback for `bias` and, in the regular session, a live AlphaVantage quote overlaid on the daily row | 60s staleTime; `source: 'unavailable'` or a 404 reads as no brief and an available answer without a bias as an error, but the handler answers `bias: 'neutral'` with `source: 'cloud_sql'` when both reads are empty or fail, which the card shows as a flat brief (matrix Gaps) | `useBriefDirection` (`useInsights.ts`) → Report cards' brief-vs-insights divergence card |
| GET /api/insights/report/{ticker} (optional as_of, which this page never sends) · GET /api/insights/reports/{report_id} | ticker, as_of, report.{direction, conviction, thesis, entry_zone, stop, targets, invalidation, time_horizon, key_levels, strat_status, catalysts, bull_case, bear_case, risk_flags, persona_plans, supporting_signals, similar_past_trades, confidence_score, failed_sections, model_versions, run_cost_usd, run_latency_ms, per_role_cost}, cost_usd, latency_ms (types: `src/types/insights.ts` InsightReportEnvelope/InsightReport; the envelope's `run_kind` is declared but never set by these two routes, `platform/api/routers/insights.py:783-790,819-826`, and the page does not read it) | insight-pipeline 08:45 ET Mon-Fri and auto-refresh-top-n 08:10 ET Mon-Fri → insight_reports, plus the API's own refresh write (INSIGHTS-07); the by-id route also serves `replay` and `backfill` rows | 60s staleTime (live report); 5min staleTime (a historical report opened by id) | `useInsightReport` / `useInsightReportById` (`useInsights.ts`) → Report cards |
| GET /api/insights/report/{ticker}/history?limit=20 (the Agents tab asks `limit=8`) | ticker, count, reports[].id/as_of/direction/conviction/thesis/cost_usd (types: `src/types/insights.ts` InsightHistoryRow/InsightHistoryResponse); each row also carries `run_kind`, which the page does not read, and `count` is the number of rows returned, not the ticker's total | insight-pipeline 08:45 ET Mon-Fri and auto-refresh-top-n 08:10 ET Mon-Fri → insight_reports, every `run_kind` | 60s staleTime | `useInsightHistory` (`useInsights.ts`) → History tab, and the Agents tab's `Recent runs` |
| POST /api/insights/report/{ticker}/refresh (optional as_of) · GET /api/insights/runs/{run_id} | run_id, ticker, status (refresh); id, status, trigger, started_at, finished_at, error, report_id (run status) (types: `src/types/insights.ts` RefreshResponse/RunStatus) | the API itself: an insight_runs row and the upserted insight_reports row (`run_kind` `live`, or `replay` with a cutoff), run in the API process on the deployed services today (trigger `local_dev`) or by the insight-pipeline job through Cloud Tasks in production | run status polled every 3s while `queued` or `running`, with no limit and no stop on an error | `useRefreshInsight` / `useRunStatus` (`useInsights.ts`) → Generate or refresh a report, Set a point-in-time cutoff |
| GET /api/admin/routes | routes[].role/provider/model/updated_at/updated_by (types: `useAdmin.ts` RouteListResponse) | model_routing: seed rows in `gcp/schema.sql` and `PUT /api/admin/routes/{role}`; read here through the admin gate | 30s staleTime | `useAdminRoutes` (`useAdmin.ts`) → Agents tab (`AgentsPanel`) |
| GET /api/insights/watchlist | run_id, as_of, candidate_count, excluded_count, ranked[].ticker/score/pct_of_max/catalyst_types/catalyst_metadata/score_breakdown, weights_used, duration_ms (types: `src/types/watchlist.ts` WatchlistResponse) | the caller's own watchlists rows (the candidates, written by the adds of INSIGHTS-09), tagged and scored from earnings_calendar, sec_filings, insider_transactions, top_movers_daily, economic_events, market_data_daily, etf_options_snapshots, news_sentiment and earnings_history by their fetch jobs; each call also writes a ranker_runs row | 5min staleTime; the newest four `ranker_runs` rows, written in the minutes of the 08:10 ET `auto-refresh-top-n` job's executions, record 10.8 s to 46.1 s for 16 candidates, and the endpoint's own latency was not measured | `useWatchlist` (`useWatchlist.ts`) → Watchlist tab (`WatchlistPanel`) |
| GET /api/insights/ticker/search · POST /api/insights/watchlist/add | results[].symbol/name/type/region/currency/match_score (search); ticker/added/info/quote/peers/watchlist (add; the page reads `added`, `info` and `quote`) (types: `useTickerSearch.ts` TickerSearchResult/WatchlistAddResult) | AlphaVantage SYMBOL_SEARCH (search), OVERVIEW and GLOBAL_QUOTE and FinViz peers (add) on the request path; the add writes the caller's watchlists row (`source` `ui`) and the ticker_info cache | 60s staleTime (search) | `useTickerSearch` / `useAddToWatchlist` (`useTickerSearch.ts`) → Watchlist tab's `TickerSearchPanel` |
| POST /api/insights/chat | message, mode, ticker, history (request, the last six turns); streamed plain-text reply, no `response_model` | Vertex AI Gemini `gemini-3.1-flash-lite`, streamed on the request path; no table is read |  | `ChatView` (inline in `InsightsPage.tsx`) → Chat tab |
| store: ticker |  | Zustand `useTickerStore`, persisted as `ticker-store` in localStorage (`activeTicker`, `recentTickers`) | | every tab |

#### Displayed
| ID | Element | Component |
|---|---|---|
| INSIGHTS-01 | Report cards | `ReportView` (inline in `InsightsPage.tsx`); `HeaderCard`, `KeyLevelsCard`, `StratCard`, `CatalystsCard`, `DebateCard`, `PersonaPlansCard`, `RiskFlagsCard`, `SignalsCard`, `SimilarTradesCard`, `TradePlanCard`, `BriefVsInsightsCard`, `DegradationBanner` (`ReportCards.tsx`) |
| INSIGHTS-02 | Agents tab | `AgentsPanel` |
| INSIGHTS-03 | History tab | `HistoryView` (inline in `InsightsPage.tsx`) |
| INSIGHTS-04 | Watchlist tab | `WatchlistPanel` |
| INSIGHTS-05 | Chat tab | `ChatView` (inline in `InsightsPage.tsx`) |
| INSIGHTS-06 | Degradation banner | `DegradationBanner` (`ReportCards.tsx`) |

#### Actions
| ID | Action | What happens |
|---|---|---|
| INSIGHTS-07 | Generate or refresh a report | `onRefresh` (the main button and the empty state's `Generate Report`) and a Watchlist row's `Generate report` call `useRefreshInsight`, which posts the refresh: today the API runs the pipeline as a background task of its own process (trigger `local_dev`), and production settings would enqueue it on Cloud Tasks; `useRunStatus` polls it every 3s until `done` or `failed`, invalidating the active ticker's report and history queries on `done`; a `failed` run and a failed request show nothing on the page (matrix Gaps). |
| INSIGHTS-08 | Set a point-in-time cutoff | The `datetime-local` input (its `max` is the UTC clock) sets `asOf`; the next refresh from the main button or the empty state sends it as `as_of`, which the server reads as UTC when it carries no zone, so the pipeline runs against data available at that moment and stores a `replay` report the Briefing tab never shows; a Watchlist row's `Generate report` ignores it; the × button clears it back to live. |
| INSIGHTS-09 | Add or remove watchlist tickers | `TickerSearchPanel` searches (`GET /api/insights/ticker/search`, debounced 300 ms) and posts through `useAddToWatchlist` (`POST /api/insights/watchlist/add`, the caller's own row), draws the added ticker's card and refetches the ranking; `useRemoveFromWatchlist` exists in `useTickerSearch.ts` but no control on the page calls it. |
| INSIGHTS-10 | Chat | `ChatView`'s `send` streams `POST /api/insights/chat` with the message, the mode, the ticker and the last six turns, and appends the response to the last assistant message as it arrives; HTTP and network failures, and Vertex errors the server streams as `Gemini error:` text, appear as assistant bubbles. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| INSIGHTS-11 | loading | present | Spinners for the Briefing and History bodies, the Watchlist ranking and the Chat stream, `Searching...` and the `Add` button's spinner in the ticker search, and `queued…` or `running…` beside the cutoff while a run is polled; the Agents tab has no spinner (it shows `—`, `No per-agent breakdown yet...` and `Loading routing…` until each request answers) and the House Views card reads `Brief unavailable` while its request is pending. |
| INSIGHTS-12 | empty | present | "No report yet" with a Generate Report button; each card's own empty copy; "No history yet."; the Agents and Watchlist panels' own empty copy; the Chat tab's `Ask a question about ...`; the search's no-matches line. |
| INSIGHTS-13 | error | present | "Failed to load report: {message}"; the red brief card; the Agents tab's one admin message for any roster failure; "Failed to load watchlist:"; "Failed to add:"; a failed chat send as an `Error:` bubble in the transcript; History has no error branch (a failure reads "No history yet."), and a failed refresh, a failed run and a failed status poll show nothing on the page. |
| INSIGHTS-14 | stale | present | "Viewing historical report, not the current latest." while a History entry is open; the live report carries only its time, with no stale marker, and the Agents tab shows that time in UTC. |
| INSIGHTS-15 | permission | not tracked (new category); present | `DataGate` wraps every tab body but cannot trigger in practice (`firebase` mode keeps a signed-out user off the page, `open` and `iap` modes are always signed in); a signed-in user's 401 shows the shell's expired-session strip and each tab's own error form, an add's `Failed to add: HTTP 401: ...` and nothing for a refresh; the Agents tab reads any failure of `/api/admin/routes` as its admin-required message. |

#### Journeys
1. Read the day's council report: Opens /insights (INSIGHTS-01) → Reads the thesis, direction, conviction and confidence (INSIGHTS-01) → Compares the House Views card's brief with the insight's direction (INSIGHTS-01) → Checks key levels and risk flags (INSIGHTS-01) → Reads the bull and bear cases (INSIGHTS-01), since the page has no card for the judge's verdict → Picks the persona plan matching their style (INSIGHTS-01)
2. Generate a fresh report: Switches ticker → No report exists yet (INSIGHTS-12) → Clicks Generate Report (INSIGHTS-07) → `queued…` and `running…` are polled (INSIGHTS-07, INSIGHTS-11) → Report cards populate; a degradation banner appears if part of the pipeline was unavailable (INSIGHTS-01, INSIGHTS-06); a failed run or request shows nothing (INSIGHTS-13)
3. Point-in-time replay: Sets a cutoff date and time (INSIGHTS-08) → Replay re-runs the pipeline (INSIGHTS-07), though three reads (the catalysts news slice, reflection memory, the trade planner's blue-sky offset) ignore the cutoff, the server reads a cutoff with no zone as UTC, and the result is stored as a `replay` report that the Briefing tab never shows and History lists with nothing to mark it (see the matrix Insights Gaps) → Opens the run from History, where it sits among the other rows if its time is within the newest 20 (INSIGHTS-03) → Clears the cutoff to return to live (INSIGHTS-08)
4. Track a basket: Opens the Watchlist tab (INSIGHTS-04), which ranks only the signed-in user's own tickers, so it reads `No candidates ranked.` until the user has added one (see the matrix Insights Gaps) → Searches and adds tickers (INSIGHTS-09) → the added ticker's card shows its quote with no click-through, and the ranking refetches (INSIGHTS-04) → runs `Generate report` on a ranked row, which switches to that ticker's Briefing tab (INSIGHTS-04, INSIGHTS-07), or picks the ticker from the header combobox (INSIGHTS-01)

#### Elements

In every body below, "executed 2026-10-01" means that the production rows were read through the stocks repo's
`db_query_cr.sh` job script and passed through the real handlers (`get_insight_report`, `get_insight_report_by_id`,
`get_insight_history`, `get_run_status`, `admin_list_routes` and `dashboard_brief`) with only the database connection
or read function replaced by one that returns those rows, and that the page was rendered hermetically with those
answers, while "read" marks what was only read in the code. A run on other input is named where it is used: a held or
failed request, a pinned time zone, a variant payload (`MOCK_WATCHLIST` and `MOCK_WATCHLIST_ADD` from
`src/mocks/insights.ts`, a production row with one list emptied, or an answer written for the case), or code other
than those handlers run with its writes and vendor calls replaced (the refresh, add, search and chat handlers, and the
ranker with its signal reads replaced, INSIGHTS-04, INSIGHTS-07, INSIGHTS-09 and INSIGHTS-10). INSIGHTS-01 lists the
production executions.

##### INSIGHTS-01 · Report cards

**Shows or does:** The Briefing tab, the page's first (`tab` starts as `report`, `src/routes/InsightsPage.tsx:37`):
`ReportView` (`:284-389`) draws the newest live report of the active ticker as a stack of blocks, top to bottom: the
warn strip of an open History entry (INSIGHTS-14) and the partial-report banner (INSIGHTS-06) when they apply; the
header card (`HeaderCard`, `src/components/insights/ReportCards.tsx:66-103`): the ticker in an `h2`, a
`<direction> · <conviction>` badge (`DirectionBadge`, `:28-43`, drawn in capitals by CSS), the report time as
`new Date(as_of).toLocaleString()` in the browser's zone, `$<cost> · <n>s` when the envelope carries a cost (`—` for a
missing latency), the thesis, the time horizon and `Confidence <n>%`; the House Views card (`BriefVsInsightsCard`,
`:504-613`); a two-column grid of Trade Plan (entry zone, stop, targets and invalidation, `:109-144`), Key Levels (one
`name value` pair per level, `:195-213`), Strat Status (candle, FTFC direction and score, the combo when set, the
trigger high and low when either is set, `:150-189`) and Catalysts (an impact dot, the name and the date, `:242-270`);
Bull Case and Bear Case (`:219-236`); Persona Plans (`:361-384`); a grid of Risk Review (`:276-308`) and Supporting
Signals (`:390-424`); Similar Past Trades (`:426-461`); and a footer line of `<role>: <model>` pairs joined by ` · `
(`InsightsPage.tsx:382-386`). Every figure goes through `fmt`, which draws a null or NaN as `—`
(`ReportCards.tsx:23-26`); the cards only format what the report holds (a percentage, seconds, `sim` as one minus the
cosine distance) and only the House Views card derives a verdict. The report is `useInsightReport(activeTicker)`
(`InsightsPage.tsx:49`) and the brief `useBriefDirection(activeTicker)` (`:54`), so a pick in the header picker
(`TickerCombobox`, `:117`, described at DASHBOARD-10, OPTIONS-06 and SIGNALS-01) re-keys both.

The House Views card compares two directions: the brief's `bias` mapped to `long` (bullish), `short` (bearish) or
`flat` (anything else, `ReportCards.tsx:498-502`) and the report's `direction`. Equal reads
`House Views, Houses Agree`, unequal `House Views, Houses DIVERGE` with a note (`:540-548,602-610`); each side shows
its direction badge and, for the brief, `bias`, `signal_status` and `FTFC` when they are non-empty strings
(`:560-583`). A 404 or a `source: 'unavailable'` answer reads
`Brief unavailable for IWM, insight pipeline shipping standalone.`, and a failed or malformed request the red
`Brief lookup failed for IWM: ...` card (`data-testid="brief-error"`, `:519-537`, `src/hooks/useInsights.ts:24-58`).

The production reads behind "executed 2026-10-01" (defined at the head of Elements) are the `db_query_cr.sh`
executions `db-query-m5sb8`, `db-query-qwwjw`, `db-query-hw76g`, `db-query-sv5tv`, `db-query-qkwz6` and
`db-query-7vlmp`; the V evidence comment in the matrix lists the statements.

What the real handlers answered (executed 2026-10-01): `get_insight_report` answered 200 for IWM, SPY, QQQ, AVGO and
TXN from their newest live rows (IWM: `as_of` 2026-09-30 12:55:36 UTC, `cost_usd` 0.0107, `latency_ms` 25626), each
envelope carrying `run_kind: null` because the route never sets it (`platform/api/routers/insights.py:783-790`), and
404 for ARM, which has no live row. The page drew the IWM row as eight blocks: the header `IWM`, `LONG · LOW`,
`9/30/2026, 8:55:36 AM` (browser in America/New_York), `$0.0107 · 26s`, the thesis, `swing` and `Confidence 65%`;
House Views `HOUSES DIVERGE` (the brief's `bias` is `bearish`, the insight `long`); Trade Plan with entry `281.05` to
`281.93`, stop `277.99` and targets `284.99 288.49 291.99`; 19 key levels; Strat Status `CANDLE 1`,
`FTFC bearish · -1.00`, `COMBO none` (the stored combo is the string `none`) and `H 281.05 · L 277.41`; the two cases;
three persona plans (the conservative one with `Size 0.00× normal` and
`Stand aside: FTFC alignment -1.00 below +0.30 threshold.`); four risk flags, one of them the raw code
`ftfc_misaligned`; Supporting Signals and Similar Past Trades in their empty copy; and the footer of seven
`vertex:gemini-3.1-flash-lite` pairs. The AVGO row drew the same stack under the banner of INSIGHTS-06.

The House Views card in other states (executed): while the brief request was held it read `Brief unavailable`; with
`source: 'unavailable'` the same; with a 503, or an available answer carrying no `bias`, the red failure card; with
the handler's answer for a ticker with no row in either table (`source: 'cloud_sql'`, `bias: 'neutral'`,
`has_premarket: false`, replayed on empty reads and on reads that raise) it drew a `FLAT` brief and a verdict,
`HOUSES DIVERGE` against a `long` insight and `HOUSES AGREE` against a `flat` one. The card reads today's brief
whatever report is open: the IWM backfill report of 2026-05-22, opened from History, read `HOUSES DIVERGE` against
today's `bearish` brief (matrix Gaps).

**Needs:** `GET /api/insights/report/{ticker}` (`platform/api/routers/insights.py:764-790`): the newest
`insight_reports` row with `run_kind = 'live'` by `as_of` (`_fetch_latest_report`, `:204-249`), 404 when there is none
(`:774-782`), 503 when Cloud SQL is unreachable (`_db_call`, `:159-201`); 60 s staleTime
(`src/hooks/useInsights.ts:68-81`). `GET /api/insights/reports/{report_id}` for a History entry (`:803-826`): any
`run_kind`, 400 for an id that is not a UUID and 404 for an unknown one (executed), 5 min staleTime
(`useInsights.ts:88-100`). `GET /api/dashboard/brief/{ticker}` (`platform/api/routers/dashboard.py:82-254`), sent with
no `date`: `bias` is not stored, the handler derives it from the newest live `premarket_analysis` row's
`ftfc_direction`, else the newest `market_data_daily` row's, else from RSI and the price against its EMA20 (RSI above
55 with price above is bullish, RSI below 45 with price below is bearish), else `neutral` (`:226-244`); in the regular
session it first recomputes the daily row's RSI, EMAs and SMA200 from a live AlphaVantage quote (`:205-224`;
`_apply_live_overlay` imports `lib/indicators.py` at `:297`), which the card never reads. The handler answers
`source: 'unavailable'` only when Cloud SQL is not configured (`:96-101`); a read that raises is logged and skipped
(`:139-140,202-203`). All three routes are gated: 401 without a token on staging (V evidence).

Freshness (V evidence, read 2026-10-01 at 04:06 ET): the newest live reports of IWM, SPY and QQQ are the 2026-09-30
08:55 ET ones, written by `insight-pipeline` (08:45 ET Mon-Fri, `ENABLED`, its 2026-09-30 execution succeeded), which
is the previous session's report and what the page assumes until the day's run lands (INSIGHTS-14);
`premarket_analysis` holds `analysis_date` 2026-09-30 as its newest live row (`premarket-brief`, 08:30 ET, succeeded)
and `market_data_daily` `date` 2026-09-30.

**States:** Loading (INSIGHTS-11): a centred spinner replaces the whole stack while the report, or for a History entry
the by-id read, is pending; the House Views card has no loading state of its own (above). Empty (INSIGHTS-12):
`No report yet` with a `Generate Report` button for a 404. Error (INSIGHTS-13): `Failed to load report: insights 503`
in a red box, the hook's message with the status (`useInsights.ts:75`), `insights by-id 404` for a History entry; the
header, the tabs and the run controls stay. Stale (INSIGHTS-14): a live report shows only its time, and only an open
History entry carries a strip. Permission (INSIGHTS-15). The banner (INSIGHTS-06) and the brief card (above) have
their own forms.

**Acceptance criteria:**
- Given the handler answers 200 with the IWM row of 2026-09-30, then the stack draws the header, House Views, Trade
  Plan, Key Levels, Strat Status, Catalysts, Bull Case and Bear Case, Persona Plans, Risk Review, Supporting Signals,
  Similar Past Trades and the footer in that order, each figure as the answer gave it and a null or NaN as `—`
  (executed 2026-10-01; on main `renders a full report with all cards` asserts the header, the thesis, the entry zone,
  the two cases, a combo, a risk flag, the three persona plans and the footer on the shared fixture).
- Given the brief's `bias` is `bearish` and the insight direction is `long`, then the card reads `Houses DIVERGE` with
  the note; given equal directions, `Houses Agree` (executed on IWM and AVGO).
- Given a 404, a `source: 'unavailable'` answer or a pending request, then the card reads
  `Brief unavailable for IWM, insight pipeline shipping standalone.`; given a failed request or an available answer
  without a `bias`, the red `Brief lookup failed` card (executed).
- Given an empty or failed read in the brief handler, then it answers `bias: 'neutral'` and the card compares a flat
  brief (executed; matrix Gaps).
- Given a History entry is open, then the same stack draws that row and the House Views card still compares today's
  brief with it (executed; INSIGHTS-03, INSIGHTS-14).
- Given a ticker with no live row, then the route answers 404 and the tab reads `No report yet` (executed with ARM,
  INSIGHTS-12).
- Given no token, then the three routes answer 401 on staging (V evidence, 2026-10-01).

**Tests:** On main, `renders a full report with all cards` (`tests/insights/insights.spec.ts`, at eca7078) asserts the
`IWM` heading, `long · high`, the thesis, the entry zone `220.00` to `221.50`, `Bull Case` and `Bear Case` with one
case's text, the combo `212_bull_reversal`, one risk flag, `Persona Plans` with the three personas, the aggressive
plan's `$220.00` to `$222.50`, `1.50× normal` and its rationale, and the footer `trader: vertex:gemini-2.0-flash`, all
on `MOCK_INSIGHT_REPORT`; it does not look at the House Views card, Key Levels, Catalysts, Supporting Signals, Similar
Past Trades, the Trade Plan's stop, targets or invalidation, or the header's time, cost and latency. On the handler
side `tests/api/test_route_coverage.py` holds the report route at 503 against a dead backend,
`test_insight_report_lookups_are_503_not_a_bare_500` and `test_an_internal_defect_is_not_reported_as_an_outage` check
the 503 and a defect's 500, and the by-id route is held at 503 only; the 200 envelope, the 404 and the date cutoff are
asserted only by `tests/lib/test_routers_insights_admin.py`, which skips in CI (no `DB_HOST`: 16 skipped when run
without one, executed) and whose four report and history tests, run against a real Postgres 16 with the module's own
table definition, failed with `column "run_kind" does not exist` (executed; matrix Gaps). The brief handler:
`TestDashboardBriefAPI` (`tests/api/test_platform_api.py`) asserts a bullish `bias` from `ftfc_direction`,
`has_premarket`, the as-of lookup, `stale_days` and the unavailable source; the sweep pins the brief at 200 against a
dead backend, the status the neutral answer above carries; no test asserts the `neutral`, RSI or overlay branches.
`tests/agents/test_agent_orchestrator.py` asserts how the pipeline assembles the report. Te stays unticked: the
handler's primary behaviour is asserted only by a module that skips in CI, and the page layer leaves most cards
unasserted.

**Code:** `src/routes/InsightsPage.tsx:36-62,202-224,284-389`, `src/components/insights/ReportCards.tsx:23-613`,
`src/hooks/useInsights.ts:24-100`, `src/types/insights.ts:61-109`; `platform/api/routers/insights.py:159-272,764-826`,
`platform/api/routers/dashboard.py:82-330`; test id `brief-error` (the brief card's failure form); the other blocks
carry none.

##### INSIGHTS-02 · Agents tab

**Shows or does:** The Agents tab (`AgentsPanel`, `src/components/insights/AgentsPanel.tsx:23-150`, chosen at
`src/routes/InsightsPage.tsx:234-238`) holds four blocks. (1) Four tiles from the open report's envelope, the live one
or the History entry while one is open (`InsightsPage.tsx:236`): `Run cost` (`report.run_cost_usd`, else the
envelope's `cost_usd`, as `$0.0107`), `Latency` (`run_latency_ms`, else `latency_ms`, as `25.6s`), `Agent calls` (the
number of keys of `per_role_cost`) and `As of` (the first ten characters of the envelope's `as_of`, so the UTC date);
a missing figure reads `—` (`AgentsPanel.tsx:17-21,29-35,41-44`). (2) `Multi-agent pipeline`,
`this run · cost by role`: one row per `per_role_cost` key, largest first, with the role title (`analyst:gamma` as
`Analyst Gamma`), the model that role used from the report's `model_versions`, a bar scaled to the largest cost and
the cost (`:47-77`); with no keys it reads `No per-agent breakdown yet, generate an insight report for this ticker.`
(`:53-56`). (3) `Model routing`, `model_routing · edit in Admin`: a Role, Provider, Model table of the roster from
`GET /api/admin/routes` (`:79-113`), the configuration today and not the models of the open report; it reads
`Admin access required to view per-agent routing.` when that request errored for any reason and `Loading routing…`
while the roster is empty (`:85-90`). (4) `Recent runs`: the ticker's newest eight reports as `As of` (the first 16
characters of the timestamp with the `T` replaced by a space, so UTC with no zone), a direction tag (`CALL`, `PUT` or
`NEUT`), the conviction and the cost, under the heading `<shown> of <count>` (`:115-147`).

What the real handlers answered and the page drew (executed 2026-10-01, the production executions are listed at
INSIGHTS-01): for the live IWM report the tiles read `RUN COST $0.0107`, `LATENCY 25.6s`, `AGENT CALLS 14` and
`AS OF 2026-09-30`, with 14 cost rows from Bull `$0.0018`, Bear `$0.0017`, Portfolio Manager `$0.0011` and Trader
`$0.0008` down to Analyst Sentiment `$0.0003`, each with `vertex:gemini-3.1-flash-lite`; the real `admin_list_routes`
answered the seven roles of `model_routing` for an admin identity, in the order
`analyst, bull, bear, judge, trader, risk, portfolio_manager`, all `vertex` `gemini-3.1-flash-lite`; and
`Recent runs 8 of 8` listed 2026-09-30 12:55 down to 2026-09-21 12:46. The `8 of 8` is `shown of count` where `count`
is the number of rows the handler returned (`len(rows)`, `platform/api/routers/insights.py:800`), not the ticker's
total: IWM holds 150 reports, 123 of them live (V evidence). Opened on the IWM report of 2026-04-24, which stores no
`per_role_cost` (450 live rows and 472 rows in all store none, V evidence), the tab kept its tiles
(`RUN COST $0.0020`, `LATENCY 11.9s`) and read
`No per-agent breakdown yet, generate an insight report for this ticker.` for a report that exists, and its roster
listed `gemini-3.1-flash-lite` while that report's footer names `vertex:gemini-2.0-flash`. For ARM, which has no live
row, every tile read `—` and `Recent runs 4 of 4` listed the four backfill rows.

**Needs:** The open report (INSIGHTS-01) for the tiles and the cost rows.
`GET /api/insights/report/{ticker}/history?limit=8` through `useInsightHistory(ticker, 8)` (`AgentsPanel.tsx:26`), a
cache entry of its own beside the History tab's 20-row one (`platform/api/routers/insights.py:793-800`,
`src/hooks/useInsights.ts:106-117`). `GET /api/admin/routes` through `useAdminRoutes(true)`
(`src/hooks/useAdmin.ts:37-49`, 30 s staleTime): `_require_admin` answers 401 with no identity and 403 for a signed-in
non-admin (`platform/api/routers/admin.py:52-67`, executed), 503 when Cloud SQL is unreachable (`:129-154`); the page
reads every failure as the admin message. Production (V evidence, 2026-10-01): `model_routing` holds 7 rows, newest
`updated_at` 2026-05-12 00:34 UTC, `updated_by` `claude-code/ab-test-restore-2026-05-12`, all `vertex`
`gemini-3.1-flash-lite`; the live IWM report stores 14 `per_role_cost` keys (400 of 872 reports carry them, and the
newest live report without them is from 2026-05-01); the history read is the freshness of INSIGHTS-03. Both routes
answer 401 without a token on staging, and the roster is read by an admin session only, which this run did not have.

**States:** Loading: the tab has no spinner. While the report is pending the tiles read `—` and the cost block reads
`No per-agent breakdown yet...` (executed with the report request held); while the roster is pending the block reads
`Loading routing…` (executed with the request held), the same text a 200 with an empty roster shows for good
(executed); while the history is pending `Recent runs` reads `No prior runs for IWM.` (executed). Empty (INSIGHTS-12):
the three copies above. Error (INSIGHTS-13): a roster failure of any kind reads
`Admin access required to view per-agent routing.` (executed with 403 and with 503); a failed history reads
`No prior runs for IWM.` and a failed report leaves the tiles at `—` (executed 503). Stale (INSIGHTS-14): the `As of`
tile and the `Recent runs` times are UTC, unlike the localized times of the Briefing and History tabs. Permission
(INSIGHTS-15).

**Acceptance criteria:**
- Given the IWM live report, then the tiles read `$0.0107`, `25.6s`, `14` and `2026-09-30` and the 14 roles list
  largest cost first, each with its model (executed 2026-10-01).
- Given a report with no `per_role_cost`, then the cost block reads
  `No per-agent breakdown yet, generate an insight report for this ticker.` although the report is open, and the tiles
  keep the cost and latency (executed on the 2026-04-24 row).
- Given an admin, then the roster lists the roles the handler returned in its order (executed with the real handler on
  the seven production rows); given a 403, a 401 or a 503, then the block reads
  `Admin access required to view per-agent routing.` (executed with 403 and 503 on the page, 403 and 401 on the
  handler).
- Given the roster is pending or empty, then it reads `Loading routing…` (executed).
- Given the history answers 8 rows, then `Recent runs` reads `8 of 8` and each row shows the first 16 characters of
  the stored time (executed).
- Given no token, then both routes answer 401 on staging (V evidence, 2026-10-01).

**Tests:** On main nothing asserts the tab: no Playwright test opens it (`mockInsightsApi` serves `MOCK_AGENT_ROUTES`
for it and nothing reads the answer), and no unit test imports `AgentsPanel`. On the handler side
`tests/lib/test_routers_insights_admin.py` asserts `test_admin_requires_sign_in` (401),
`test_admin_non_admin_user_403`, `test_admin_list_routes` (200, seven roles, the set of `ALL_ROLES`) and
`test_admin_closed_in_open_mode`, and `tests/agents/test_agent_model_routing.py` asserts the store
(`test_list_routes_has_all_seven_roles`, `test_list_routes_ordered_by_canonical_sequence`); both modules skip in CI,
which has no test Postgres (the first run without one: 16 skipped, executed). `tests/api/test_route_coverage.py` holds
`GET /api/admin/routes` at 503 against a dead backend, with the admin gate opened. Nothing asserts the tiles, the cost
rows, the roster's states or `Recent runs`. Te stays unticked.

**Code:** `src/components/insights/AgentsPanel.tsx:17-150`, `src/routes/InsightsPage.tsx:50,234-238`,
`src/hooks/useAdmin.ts:12-49`, `src/hooks/useInsights.ts:106-117`; `platform/api/routers/admin.py:52-67,129-154`,
`platform/api/routers/insights.py:290-322,793-800`; no test ids.

##### INSIGHTS-03 · History tab

**Shows or does:** The History tab (`HistoryView`, `src/routes/InsightsPage.tsx:395-460`, chosen at `:225-233`) lists
the ticker's newest 20 reports of any kind, newest `as_of` first (`useInsightHistory(activeTicker, 20)`, `:50`), one
button per row: a badge with `<direction> · <conviction>` coloured by direction (green for `long`, red for `short`,
grey otherwise, and the `—` marker when both are missing, `:428-441`), the time as `new Date(as_of).toLocaleString()`
in the browser's zone (`:442-444`), the cost as `$0.0107` when it is not null (`:446-450`) and the thesis in full,
with no line clamp, or `No summary recorded` when it is null (`:452-455`). A click calls `onSelect(id)`: the page
stores the id, switches to the Briefing tab and draws that row through `GET /api/insights/reports/{id}` under the warn
strip of INSIGHTS-14 (`:229-232`); the strip's `Back to latest`, the Briefing tab button and a change of ticker clear
it (`:58-62,123-135,220`). The payload of every row also carries `run_kind`, and the tab draws nothing from it.

What the real handler answered and the page drew (executed 2026-10-01, the production executions are listed at
INSIGHTS-01): for IWM the 20 newest rows, all live, from 2026-09-30 12:55 to 2026-09-03 12:46, each with the keys
`as_of`, `conviction`, `cost_usd`, `direction`, `id`, `run_kind` and `thesis`; for SPY 20 rows of which one is a
replay (`076bd14e`, `as_of` 2026-09-11 00:00 UTC, `run_kind` `replay`), which sat between the live rows of 2026-09-14
and 2026-09-10 and read like them: a `SHORT · LOW` badge, `9/11/2026, 12:00:00 AM` and its thesis, with no mark that
it is not a live report; for ARM, which has no live row, 4 rows, all `backfill`, under a Briefing tab that reads
`No report yet`. A click on an IWM row opened the Briefing tab with the strip
`Viewing historical report, not the current latest.` and `Back to latest`, and the by-id read answered the row's own
report (executed). `limit=500` answers 400 `limit must be between 1 and 100` (executed).

**Needs:** `GET /api/insights/report/{ticker}/history?limit=20` (`platform/api/routers/insights.py:793-800`): inline
SQL over `insight_reports` for the ticker, every `run_kind`, newest first, bounded by `limit` (1 to 100, else 400),
the direction, conviction and thesis read from the stored report's JSON (`_fetch_report_history`, `:290-322`), 503
when Cloud SQL is unreachable; `count` is `len(rows)`. 60 s staleTime (`src/hooks/useInsights.ts:106-117`). The by-id
read for a click (INSIGHTS-01). Production (V evidence, 2026-10-01): `insight_reports` holds 872 rows, newest `as_of`
2026-09-30 12:55:47 UTC, 785 `live` (2026-04-15 to 2026-09-30), 85 `backfill` (2025-11-15 to 2026-05-22) and 2
`replay` (QQQ 2026-05-06 12:45 and SPY 2026-09-11 00:00); `insight-pipeline` (08:45 ET Mon-Fri) and
`auto-refresh-top-n` (08:10 ET Mon-Fri) are `ENABLED` and their 2026-09-30 executions succeeded. No row has a null
thesis, direction or conviction. The route answers 401 without a token on staging.

**States:** Loading (INSIGHTS-11): a centred spinner (`:404-410`). Empty (INSIGHTS-12): `No history yet.` for an empty
list. Error (INSIGHTS-13): none of its own: a failed read (executed 503) reads `No history yet.` too, because the view
tests only `!data || data.reports.length === 0` (`:411-417`). Stale (INSIGHTS-14): every row carries its time; nothing
marks a replay or a backfill row. Permission (INSIGHTS-15).

**Acceptance criteria:**
- Given 20 rows, then 20 buttons draw newest first, each with the badge, the localized time, the cost and the whole
  thesis (executed on IWM and SPY).
- Given a replay or backfill row among them, then it draws exactly as a live row does (executed on the SPY replay row
  and the ARM backfill rows; matrix Gaps).
- Given a row's click, then the Briefing tab shows that report with
  `Viewing historical report, not the current latest.` and `Back to latest`; given `Back to latest`, a click on the
  Briefing tab or a pick of another ticker, then the live report returns (executed).
- Given a missing direction and conviction, then the badge reads `—`; given a null thesis, `No summary recorded`
  (read; no production row has either).
- Given an empty list or a failed request, then `No history yet.` shows (executed with 503; matrix Gaps).
- Given `limit` outside 1 to 100, then the handler answers 400 (executed;
  `test_get_insight_history_rejects_bad_limit`, which skips in CI).
- Given no token, then the route answers 401 on staging (V evidence, 2026-10-01).

**Tests:** On main nothing asserts the tab: no Playwright test opens it (the history mock is the empty list) and no
unit test imports `HistoryView`. On the handler side `tests/lib/test_routers_insights_admin.py` asserts
`test_get_insight_history_returns_list` (the count and the first row's direction) and
`test_get_insight_history_rejects_bad_limit`; it skips in CI, and its history test failed against a real Postgres 16
with `column "run_kind" does not exist` because the module's table definition has no `run_kind` (executed; matrix
Gaps). `tests/api/test_route_coverage.py` holds the route at 503 against a dead backend
(`test_insight_report_lookups_are_503_not_a_bare_500` injects the driver error). Te stays unticked.

**Code:** `src/routes/InsightsPage.tsx:50,58-62,225-233,395-460`, `src/hooks/useInsights.ts:106-117`,
`src/types/insights.ts:111-134`; `platform/api/routers/insights.py:159-201,290-322,793-800`; no test ids.

##### INSIGHTS-04 · Watchlist tab

**Shows or does:** The Watchlist tab (`WatchlistPanel`, `src/components/insights/WatchlistPanel.tsx:61-203`, chosen at
`src/routes/InsightsPage.tsx:239-244`) shows the deterministic ranker's output for the signed-in user's own tickers: a
filter bar of seven catalyst buttons, `Earnings`, `8-K`, `Insider`, `Top mover`, `Macro`, `Watchlist` and `Manual`,
any combination of which narrows the ranking and none of which means all (`:25-53,97-116`), the `Add Ticker` button
(INSIGHTS-09) and a `Limit:` select of 5, 10, 20 and 50 with 10 the default (`:118-139`). Under it a run line,
`<n> ranked of <candidates> candidates · <excluded> excluded by liquidity gate` and
`<duration_ms>ms · run <the first 8 characters of run_id>` (`:176-184`), and one row per ranked ticker (`RankedRow`,
`:483-552`): a chevron that expands the score breakdown, the ticker, the score to two decimals with `(<pct_of_max>%)`,
the catalyst tags and a `Generate report` button. The expanded breakdown (`ScoreBreakdown`, `:558-607`) lists every
signal with its 0 to 1 score, its weight, the points it contributed and the ranker's reason, largest points first, and
an unavailable signal shows `—` for score and points. `Generate report` runs `onWatchlistGenerate`
(`InsightsPage.tsx:98-105`): it sets the active ticker, switches to the Briefing tab, clears any open History entry
and starts a live refresh of that ticker, deliberately ignoring the cutoff (INSIGHTS-07, INSIGHTS-08). The tab's
state, the filters, the limit and the expanded rows, is local to the panel, so leaving the tab clears it.

Executed on the page (2026-10-01, the shared fixture `MOCK_WATCHLIST`, two rows): the run line read
`2 ranked of 42 candidates · 12 excluded by liquidity gate` and `4820ms · run bbbbbbbb`, the rows `IWM 8.40 (100%)`
with `Macro` and `Top mover` and `AAPL 5.10 (61%)` with `Earnings`; the first request was
`GET /api/insights/watchlist?limit=10`, then a click on `Earnings` sent `catalyst=earnings&limit=10`, a click on `8-K`
`catalyst=earnings%2Csec_8k&limit=10` and the select at 20 `limit=20`; the chevron opened a table with the rows
`relative_volume 0.80 6.0 4.80 RVOL 1.4x 20-day average` and
`catalyst_proximity 0.90 4.0 3.60 CPI release within 3 sessions`, and closed it again. A click on `Generate report` of
the AAPL row, with the cutoff `2026-09-29T10:30` set, switched the page to `AAPL · multi-agent dossier`, posted
`POST /api/insights/report/AAPL/refresh` with no query string, left the cutoff input at `2026-09-29T10:30` and the
main button reading `Replay`, and the Briefing tab read `No report yet`. The panel unmounts when the Briefing tab
opens, so the row's spinner (`isGenerating`, `WatchlistPanel.tsx:195`) can draw only if the user returns to the tab
while the run is in flight (read).

Executed on the handler (the real `get_watchlist` and `rank_tickers`, with the watchlist read replaced by the 16
production tickers of the `default` owner and the signal reads replaced by three fixed signals, so the scores are not
production's): for the `default` owner (open mode, no identity) 16 candidates and the 10 rows asked for by default,
the response carrying `weights_used` with `strat_alignment` 3.0, `historical_earnings_reaction` 2.0, `iv_signals` 2.0,
`has_recent_8k` 2.0, `insider_buying` 1.5, `insider_selling` -1.5, `news_topic_score` 1.5, `sentiment_shift` 1.0,
`is_top_mover_today` 1.0 and `liquidity` 0.0; for a signed-in user who owns no row 0 candidates and `ranked: []`; for
a signed-in user who owns one row (`MU`) 1 candidate; `limit=999` ranked all 16, the route clamping `limit` to 50
(`platform/api/routers/insights.py:752`); a database outage inside the swallowing watchlist read answered 200 with 0
candidates; and every call wrote one `ranker_runs` row, the zero-candidate ones included
(`lib/agents/ranker/rank.py:145-174`).

**Needs:** `GET /api/insights/watchlist?catalyst=&limit=` (`platform/api/routers/insights.py:709-756`), 5 min
staleTime (`src/hooks/useWatchlist.ts:17-34`); the add refetches it (`WatchlistPanel.tsx:146-148`). The ranker
(`lib/agents/ranker/rank.py:66-148`) builds its candidates from the caller's own `watchlists` rows, the signed-in
email or `default` when the request carries no identity (`_watchlist_owner`, `insights.py:57-67,755`;
`lib/agents/ranker/candidates.py:233-250`; `gcp/fetchers/_watchlist.py:411-473`), tags each with the catalyst sources
it finds (`earnings_calendar`, `sec_filings`, `insider_transactions`, `top_movers_daily`, `economic_events`) and
scores it with the signals of `lib/agents/ranker/signals.py` over `market_data_daily`, `etf_options_snapshots`,
`news_sentiment` and `earnings_history`, dropping the candidates whose liquidity gate fails; every read goes through
the swallowing `query_to_dataframe` (`candidates.py:60-63`, `signals.py:29-35`) and the watchlist read returns an
empty list on any error (`_watchlist.py:344-387`), and returns exactly the user's own rows, empty included, for a
non-default owner (`:457-458`). Production (V evidence, 2026-10-01): `watchlists` holds 16 active rows, all owned by
`default` (3 `in_insight`, 3 `in_brief`, none with source `ui`), the newest added 2026-05-04; `ranker_runs` holds 112
rows from 2026-04-25 to 2026-09-30, 109 with 16 candidates, 3 with 5 and none with 0, the newest written at 12:17:30
UTC on 2026-09-30, inside that morning's `auto-refresh-top-n` execution (created 12:10:02, started 12:16:40, completed
12:17:35 UTC, succeeded), and the newest four, written in the minutes of that job's executions, record 10.8 s to 46.1 s
(executions `db-query-m5sb8` and `db-query-7vlmp`). The tables behind the tags and
the scores were fresh: `earnings_calendar` fetched 2026-09-30 23:00 UTC, `sec_filings` newest filing 2026-09-30,
`insider_transactions` newest transaction 2026-09-23, `top_movers_daily` 2026-09-30, `economic_events` through
2026-10-30, `market_data_daily` 2026-09-30, `news_sentiment` 2026-09-30 20:25 UTC and `earnings_history` 2026-09-30,
while `etf_options_snapshots` newest is 2026-09-30 for SPY, IWM and QQQ and 2026-04-24 for AVGO (the table's full
count timed out at 120 s; the planner estimates 135.6 million rows). The route answers 401 without a token on staging.

**States:** Loading (INSIGHTS-11): a spinner in a box under the filter bar, which stays (executed with the request
held). Empty (INSIGHTS-12): `No candidates ranked.` with
`Either no catalyst tickers met the liquidity gate, or the catalyst data tables are empty. Once Phase 2 fetchers have run a full day, this list will populate.`
(`:164-173`), which is what a signed-in user who owns no row sees, and what a database outage shows (executed on the
page and on the handler; matrix Gaps). Error (INSIGHTS-13): `Failed to load watchlist: watchlist 503` in a red box
with the filter bar kept (executed with 503 and 401). Stale (INSIGHTS-14): none; the response's `as_of` is never
drawn, only the run id and the duration. Permission (INSIGHTS-15): a 401 reads as the error.

**Acceptance criteria:**
- Given the handler answers 200 with two ranked rows, then the tab shows the run line, each row's ticker, score,
  percentage, catalyst tags and a `Generate report` button (executed on `MOCK_WATCHLIST`).
- Given a click on a catalyst button or a different limit, then the request is re-issued with
  `catalyst=<types joined by commas>` and the new `limit` (executed).
- Given a click on a row's chevron, then its breakdown table opens and a second click closes it (executed).
- Given the user owns no `watchlists` row, then the handler answers 200 with `candidate_count` 0 and the tab shows the
  empty copy (executed with the real handler); given one row, then that row is ranked (executed).
- Given `limit` above 50, then the handler ranks at most 50 (`test_watchlist_clamps_limit_to_50`,
  `tests/api/test_platform_api.py`); given a signed-in request, then the ranker receives that user's email as
  `user_id`, and `default` without identity (`test_watchlist_threads_signed_in_user`,
  `test_watchlist_threads_default_owner_when_no_auth`).
- Given a click on `Generate report` with a cutoff set, then the page switches to that ticker's Briefing tab and posts
  the refresh with no `as_of`, and the cutoff input keeps its value (executed). The test added on this branch,
  `a watchlist row's Generate report runs live even while a cutoff is set`, asserts that the first request to the
  row's ticker's refresh route has that path and an empty query string, that none reached the IWM refresh route (the
  ticker active before the click, and the one route the helper's `onRefresh` recorder watches,
  `tests/helpers/fixtures/insights.ts:74-75`), that text matching `/no report yet/i` shows and that the cutoff input
  holds its value with the `Replay` button still shown; it does not assert the request's method.
- Given no token, then the route answers 401 on staging (V evidence, 2026-10-01).

**Tests:** On main no Playwright test opens the tab. On the handler side `TestInsightsWatchlistAPI`
(`tests/api/test_platform_api.py`, hermetic, `rank_tickers` patched) asserts the ranked rows are returned, the limit
clamp, the catalyst CSV, the uppercased extras, `expand_universe` defaulting to false and the owner threaded as
`default` or as the signed-in email; `tests/agents/test_ranker.py` asserts the scoring, each signal on patched
queries, `rank_tickers` sorting and excluding, the candidate gate, and `load_watchlist` threading `user_id`;
`tests/gcp/test_watchlist_helper.py` asserts the layers of `load_watchlist` including
`test_load_watchlist_user_scoped_empty_does_not_use_global_fallback`; `tests/api/test_route_coverage.py` pins the
route at 200 against a dead backend, which is the empty ranking of the Gaps. Nothing asserts the tab's rendering, the
empty ranking for an owner with no rows through the handler, or the `ranker_runs` write. On this branch
`a watchlist row's Generate report runs live even while a cutoff is set` (`tests/insights/insights.spec.ts`) asserts
that the row's refresh carries no `as_of` while the cutoff input stays set; of the tab itself it only waits for the
ranking's count line and clicks the row's button; it has not run in CI. Te stays unticked.

**Code:** `src/components/insights/WatchlistPanel.tsx:25-203,483-607`, `src/routes/InsightsPage.tsx:98-105,239-244`,
`src/hooks/useWatchlist.ts:17-34`, `src/types/watchlist.ts:1-40`; `platform/api/routers/insights.py:57-67,709-756`,
`lib/agents/ranker/rank.py:66-174`, `lib/agents/ranker/candidates.py:60-63,233-250`,
`lib/agents/ranker/signals.py:29-35`, `gcp/fetchers/_watchlist.py:344-387,411-473`; no test ids.

##### INSIGHTS-05 · Chat tab

**Shows or does:** The Chat tab (`ChatView`, `src/routes/InsightsPage.tsx:470-605`, chosen at `:245-247`) is a
conversation box for the active ticker. At the top four mode buttons, `chat`, `market`, `strategy` and `trade`, the
active one tinted, with `chat` the initial mode (`:468,473,539-553`); a transcript box (`:556-578`) that reads
`Ask a question about <ticker> in <mode> mode.` while it is empty, shows each user message as a right-aligned bubble
and each reply as a left-aligned one, as plain text with line breaks kept and no markup rendered
(`prose-report whitespace-pre-wrap`, `:562-573`), scrolls to the newest bubble (`:477-479`) and shows a small spinner
after the last bubble while a reply streams (`:574-576`); and under it a text input `Ask about <ticker>...` with an
icon-only send button, the button disabled while the input is blank and both disabled while a reply streams
(`:581-602`). Enter in the input submits the form (`:582-585`). The mode only picks the server's system prompt; the
ticker only prefixes the user's message as `[Ticker: IWM | Mode: market]`; no report, signal or quote is sent with it
(INSIGHTS-10, matrix Gaps). The conversation, the input and the mode are local to `ChatView`: choosing another tab
unmounts it, so they are lost (executed: after Briefing and back the box read the empty text and the mode was `chat`
again) and a reload loses them too (executed); a change of the active ticker keeps the conversation, because
`ChatView` stays mounted, and the next request carries the new ticker (read).

Executed (2026-10-01, replies stubbed by the test): the first view read `Ask a question about IWM in chat mode.` with
the send button disabled; a click on `market` changed the text to `... in market mode.`; four sends produced eight
bubbles in order, `hello there`, `r1`, `second`, `r2`, `third`, `r3`, `fourth`, `r4`.

**Needs:** The request of INSIGHTS-10, `POST /api/insights/chat`, and nothing else: no table is read and no other call
is made. The route calls Vertex AI Gemini on the request path (`platform/api/routers/insights.py:1005-1059`) as the
service's account, `trading-platform-svc@`, which holds `roles/aiplatform.user` (read 2026-09-28); the model is
`gemini-3.1-flash-lite`, hard-coded at `:1042` rather than read from `model_routing`. The route answers 401 without a
token on staging (V evidence, 2026-10-01); a reply needs a signed-in session and a live Vertex call, which this run
did not have, so V stays unticked.

**States:** Loading (INSIGHTS-11): the spinner and the disabled input while a reply streams (executed with the
response held: one spinner, the input and the button disabled, one request, and a second send ignored). Empty
(INSIGHTS-12): `Ask a question about <ticker> in <mode> mode.`. Error (INSIGHTS-13): an `Error: ...` bubble, or a
`Gemini error: ...` reply that the page draws as an answer (INSIGHTS-10). Stale (INSIGHTS-14): none; a bubble carries
no time. Permission (INSIGHTS-15): a 401 reads as an `Error: 401 Unauthorized` bubble (executed).

**Acceptance criteria:**
- Given the tab opens, then the four mode buttons draw with `chat` active, the empty text names the ticker and the
  mode, and the send button is disabled (executed).
- Given a click on a mode, then the empty text and the next request's `mode` change (executed).
- Given the user chooses another tab and returns, then the conversation and the mode are gone (executed).
- Given a reply is streaming, then a spinner shows and the input and the send button are disabled (executed).
- Given a change of the active ticker, then the conversation stays and the next request carries the new ticker (read;
  nothing asserts it).
- Given no token, then the route answers 401 on staging (V evidence, 2026-10-01).

**Tests:** On main no test opens the tab: `mockInsightsApi` serves the stream route with `MOCK_CHAT_REPLY` and no spec
reads it. `tests/api/test_route_coverage.py` pins `POST /api/insights/chat` with an empty message at 400 only, and
solyra `src/mocks/contract.test.ts` validates a sample chat request body against the vendored snapshot (the shape of
the request, not the page). Nothing on main asserts the tab's layout, the modes, the transcript or the streaming
state. On this branch `a failed report, ranking or chat request says so on the page with its status`
(`tests/insights/insights.spec.ts`) clicks the Chat tab, sends one message to a route answering 503 and asserts that the
message text and text beginning `Error: 503` are each visible on the page, in no asserted order; it asserts nothing
about the layout, the modes, the empty text, the streaming state or a successful reply, and it has not run in CI. Te
stays unticked.

**Code:** `src/routes/InsightsPage.tsx:466-605` (the tab: `:468,473,536-603`; no hook, the call is inline in `send`);
`platform/api/routers/insights.py:930-972,1005-1074`; no test ids.

##### INSIGHTS-06 · Degradation banner

**Shows or does:** `DegradationBanner` (`src/components/insights/ReportCards.tsx:467-476`) renders nothing when the
report's `failed_sections` is empty and otherwise one amber strip at the top of the card stack, above the header card
and below an open History entry's strip (`src/routes/InsightsPage.tsx:345-356`): a warning icon,
`Partial report: the following sections were unavailable:` and the section names joined by `, ` in monospace, for
example `options, gamma`. The names are the pipeline's: the context bundle's unavailable sections, `market`, `strat`,
`options`, `gamma`, `backtest`, `catalysts` and `sentiment` (`lib/agents/summarizers.py:1958-2003`), the analyst
sections whose model call raised, `market`, `strat`, `options`, `gamma`, `catalyst` and `sentiment`
(`lib/agents/orchestrator.py:320-348`), and `persona_plans` when the deterministic planner raised (`:592-604`). The
report also stores `failed_section_reasons`, the cause of each, and the type declares it
(`src/types/insights.ts:83-85`); the banner never reads it. A report whose trader or portfolio-manager step failed
lists nothing (INSIGHTS-01, matrix Gaps).

Executed (2026-10-01, the production executions are listed at INSIGHTS-01): the real `get_insight_report` answered the
AVGO live row of 2026-09-30 12:20:51 UTC with `failed_sections: ['options', 'gamma']` and reasons
`gamma: chain hard-stale: 113 trading days behind 2026-09-30 (snapshot_date=2026-04-24)` and
`options: chain stale: 113 trading days behind 2026-09-30 (snapshot_date=2026-04-24)`; the page drew the banner
`Partial report: the following sections were unavailable: options, gamma` as the first block, above the header, with
no reason, and the rest of the stack complete (the thesis itself says that the options and gamma analysis sections
were unavailable). The IWM row, with an empty list, drew no banner: its first block was the header. An IWM report of
2026-04-24 opened from History drew `Partial report: the following sections were unavailable: sentiment` under the
historical strip.

**Needs:** The report envelope of INSIGHTS-01 (`GET /api/insights/report/{ticker}` or the by-id route), nothing more.
Production (V evidence, 2026-10-01, executions `db-query-hw76g` and `db-query-qwwjw`): of 157 reports in the last 60
days 28 list sections, all of them `options` and `gamma` (28 each), the first written 2026-09-15 21:23 UTC and the
newest 2026-09-30 12:20 UTC; the three newest are AVGO, TXN and TSM, whose reasons read
`no etf_options_snapshots for TXN` and `... for TSM`, and `etf_options_snapshots` for AVGO ends at 2026-04-24 while
SPY, IWM and QQQ end at 2026-09-30.

**States:** Hidden for an empty list, one strip for any non-empty list; no loading, empty or error form of its own,
because it draws only with a report (INSIGHTS-11 to INSIGHTS-13). Stale (INSIGHTS-14): the strip says nothing about
how old a section is. Permission (INSIGHTS-15).

**Acceptance criteria:**
- Given `failed_sections` is empty, then nothing renders and the header is the first block (executed on the IWM row;
  on this branch
  `a degraded report shows the partial-report banner and its section name, a complete one shows none`,
  `tests/insights/insights.spec.ts`, asserts that no `Partial report` text shows once the complete fixture has loaded,
  and not that the header is then the first block).
- Given `['options', 'gamma']`, then one strip reads
  `Partial report: the following sections were unavailable: options, gamma` above the header (executed on the AVGO
  row; the test added on this branch uses the one-section fixture `['judge']` and asserts the sentence and that name,
  not the join of two names or the position of the strip).
- Given `failed_section_reasons` holds causes, then the page draws none of them (executed on AVGO).
- Given a History entry with failed sections, then the banner draws under the historical strip (executed on the
  2026-04-24 row).
- Given a trader or portfolio-manager failure, then no banner draws, because the fallback plan adds no failed section
  (executed on the QQQ replay row of 2026-05-06, INSIGHTS-01; matrix Gaps).
- Given the pipeline's analyst, planner or bundle failures, then the names are recorded in `failed_sections`
  (`test_pipeline_marks_failed_analysts`, `test_pipeline_isolates_individual_analyst_failures`,
  `test_pipeline_marks_persona_plans_when_the_deterministic_plan_fails`, `test_build_context_bundle_marks_failures`).

**Tests:** On main no test asserts the banner: `renders a full report with all cards` mounts a complete report whose
list is empty and does not look for it. On this branch
`a degraded report shows the partial-report banner and its section name, a complete one shows none` asserts, for
`MOCK_INSIGHT_REPORT_DEGRADED` (the one section `judge`), the sentence, that name and the `IWM` heading on the page
and, after a reload on the complete fixture, no `Partial report` text (`tests/insights/insights.spec.ts`; it has not
run in CI); it does not assert the position of the strip, the join of several names or that the stored reasons are
not drawn. The data side is asserted by
`tests/agents/test_agent_orchestrator.py` (`test_pipeline_marks_failed_analysts`, five parametrised
`test_pipeline_isolates_individual_analyst_failures` cases, `test_pipeline_isolates_multiple_partial_failures`,
`test_pipeline_marks_persona_plans_when_the_deterministic_plan_fails`,
`test_pipeline_leaves_persona_plans_unflagged_on_the_happy_path`) and `tests/agents/test_agent_summarizers.py`
(`test_build_context_bundle_marks_failures`, `test_build_context_bundle_catches_exceptions`, with the reasons). No
test asserts the reasons reaching the page or the fallback plan's missing marker. Te stays unticked: the page side
waits for a CI run that includes the branch's tests.

**Code:** `src/components/insights/ReportCards.tsx:467-476`, `src/routes/InsightsPage.tsx:345-356`,
`src/types/insights.ts:61-93`; `lib/agents/orchestrator.py:320-348,592-604`, `lib/agents/summarizers.py:1931-2003`; no
test ids.

##### INSIGHTS-07 · Generate or refresh a report

**Shows or does:** Three controls start a run, and they share `refreshFor` (`src/routes/InsightsPage.tsx:78-90`): the
main button, labelled `Re-analyze`, or `Replay` while a cutoff is set (`:183-194`), runs `onRefresh` for the active
ticker (`:92`); the `Generate Report` button of the empty Briefing state does the same (`:331-338`); and a Watchlist
row's `Generate report` switches to that ticker and runs it live (`:98-105`, INSIGHTS-04). `refreshFor` posts
`POST /api/insights/report/{ticker}/refresh`, with `?as_of=<cutoff>` when a cutoff is set (INSIGHTS-08), through
`useRefreshInsight` (`src/hooks/useInsights.ts:131-156`), which invalidates that ticker's history on success; the
answer's `run_id` becomes `currentRunId` and `useRunStatus` (`:163-187`) polls `GET /api/insights/runs/{run_id}` at
once and then every 3 s while the status is `queued`, `running` or not yet known. While it runs the page shows
`queued…` or `running…` with a small spinner beside the cutoff (`InsightsPage.tsx:153-158`), and the main button and
the empty-state button are disabled with a spinning icon (`:185-192,333,336`). A `done` answer invalidates the active
ticker's report and history queries (`useInsights.ts:174-177`), so the cards refetch, and the label goes; a `done` or
`failed` status clears the run id 1.5 s later (`InsightsPage.tsx:64-76`). A `failed` status only stops the label: the
run's `error` is never drawn. A refresh request that fails with any non-2xx status is logged with
`console.error('refresh failed', ...)` and nothing is drawn (`:86-89`).

The server (`platform/api/routers/insights.py:841-898`, a plain `def` so the blocking database calls run in the
threadpool, `:829-840`) parses `as_of` (INSIGHTS-08), records the trigger `local_dev` when `ENV` is unset or is
`local`, `dev` or `development` and `on_demand` otherwise (`:870`, `_is_local_dev`, `:489-490`), inserts an
`insight_runs` row in status `queued` (`_insert_run`, `:325-340`; 503 when the insert fails) and then, in local mode,
schedules `_sync_run` as a background task of the API process (`:873-874`), which marks the run `running`, runs the
pipeline, upserts the report with `run_kind` `live`, or `replay` with a cutoff (`:411-464`), and marks the run `done`
with its `report_id`, or `failed` with the error text (`:472-486`). Otherwise it enqueues a Cloud Tasks message
(`gcp/insight_tasks.py`), falls back to the same background task when the enqueue is refused, and does neither when
the outcome is unknown, because a child may already be running it (`:875-891`). It answers
`{run_id, ticker, status: 'queued', as_of}` at once (`:893-898`). `GET /api/insights/runs/{run_id}` returns the run's
row, 400 for a non-UUID and 404 for an unknown id (`:913-923`).

Executed on the refresh handler (2026-10-01, the real handler with the run insert, the enqueue and `_sync_run`
replaced): with `ENV` unset the response was 200 `status: 'queued'`, the run was inserted with the trigger
`local_dev`, the background task was scheduled with the run id, the ticker and the parsed cutoff, and nothing was
enqueued; with `ENV=production` and an enqueue that succeeded the trigger was `on_demand`, no background task was
scheduled and the enqueue received the run id, the ticker and the cutoff string as typed (`2026-09-29T10:30`); with a
refused enqueue the handler logged `Cloud Tasks enqueue refused` and scheduled the background task; with an unknown
outcome it logged `no BackgroundTasks fallback, a child may be running it` and scheduled nothing. On the status
handler (the real `get_run_status` on four production rows, the executions are listed at INSIGHTS-01): a scheduled SPY
run `done` with its `report_id` (started 2026-09-30 12:55:10, finished 12:55:47 UTC), a manual NVDA run `failed` with
an `error` that names a 4Gi memory limit during a 2026-09-15 as-of replay, an on-demand AMD run still `running` since
2026-09-25 12:11:17 with no `finished_at`, and a `local_dev` AVGO run `done` in 22 s (2026-04-25).

Executed on the page (the refresh and status routes stubbed): after a click on `Re-analyze` the POST, the history
refetch and the first status poll went out together, the label read `queued…` and the button was disabled with a
spinner; the polls at 3 s and 6 s answered `running` and `done`; the label read `running…` after the second and was
gone after the third, the report and history were refetched and the button was enabled again (the polls came at 0, 3
and 6 s after the POST). A `failed` answer removed the label and re-enabled the button with no message; only a `done`
answer invalidates the report and history queries (read). A refresh answered 503 (`run insert failed`) logged
`refresh failed Error: refresh failed: 503 {"detail":"run insert failed: OperationalError"}` to the console and drew
nothing, with the button usable at once. A status poll that itself failed left `queued…` and the disabled button in
place for as long as the page stayed open, six polls in the 10 s observed, each failed poll retried once. A switch to
another ticker while a run was `running` kept the `running…` label (and, by `isRunning`, the disabled buttons), and
when the run finished the page refetched the new ticker's report and history, not those of the ticker that was run
(matrix Gaps).

**Needs:** The routes above, gated: 401 on both without a token on staging (V evidence, 2026-10-01). The run reads
what the nightly pipeline reads (INSIGHTS-01's producers): `model_routing`, `market_data_daily`,
`etf_options_snapshots`, `earnings_calendar`, `economic_events`, `news_sentiment`, `sec_filings`, `journal_entries`
embeddings, `exit_config_overrides` and `watchlist_history`, and calls Vertex AI Gemini for each of the seven roles
(14 calls) and `text-embedding-005` as the service's account `trading-platform-svc@` (`roles/aiplatform.user`), inside
a service of 1 CPU and 2Gi with `run.googleapis.com/cpu-throttling=true` (read 2026-09-28). Neither service sets `ENV`
(read 2026-09-28), so a request today takes the background-task branch (matrix Gaps). Production (V evidence,
2026-10-01): `insight_runs` holds 1041 rows (`done` 935 and `failed` 100 and `running` 6, none `queued`), the 10
`local_dev` rows all `done` in 17 to 23 s, the newest created 2026-04-25 16:37 UTC, and the six `running` rows from
2026-09-17 to 2026-09-25; the tables the run reads were current: `market_data_daily` newest `date` 2026-09-30,
`earnings_calendar` fetched 2026-09-30 23:00 UTC, `sec_filings` newest filing 2026-09-30, `news_sentiment` newest
2026-09-30 20:25 UTC, `economic_events` holding events to 2026-10-30 and `etf_options_snapshots` newest 2026-09-30 for
SPY, IWM and QQQ (AVGO's ends 2026-04-24); `journal_entries` holds 2 rows, the newest from 2026-07-13. Whether a run
finishes inside the API process after the response is sent was not checked against the deployed service.

**States:** Loading (INSIGHTS-11): `queued…` or `running…`, the spinner and the disabled buttons while the run id is
held. Empty: none. Error (INSIGHTS-13): console only, for the request; nothing for a `failed` run or a failing poll.
Stale: the report's time is the only sign that a run has landed (INSIGHTS-14). Permission (INSIGHTS-15): a 401 on the
POST is logged like any failure.

**Acceptance criteria:**
- Given a click on `Re-analyze` with no cutoff, then one `POST /api/insights/report/IWM/refresh` with no query string
  goes out, `queued…` shows and the button is disabled (executed; the URL is asserted on main by
  `clicking Re-analyze with no cutoff sends a query-string-free URL`).
- Given the status answers `queued`, `running`, then `done`, then the label follows, the report and history refetch on
  `done` and the button re-enables (executed; on main `refresh runs the queued -> running -> done polling loop`
  asserts only that the finished report appears from a 404 start, within 15 s, not the label or the polling).
- Given a `failed` status, then the label goes, the button re-enables and the `error` is not drawn (executed).
- Given the POST answers a non-2xx status, then nothing is drawn and the console logs `refresh failed` (executed with
  503 and with the 400 of INSIGHTS-08).
- Given the poll itself fails, then `queued…` and the disabled button stay while polling continues every 3 s
  (executed; matrix Gaps).
- Given `ENV` unset, then the handler inserts a `local_dev` run and schedules the pipeline as a background task,
  enqueuing nothing; given production settings, then it enqueues, falls back only on a refusal and does nothing more
  on an unknown outcome (executed with the real handler).
- Given a run id, then the status route returns the run's row (executed on four production rows).
- Given no token, then both routes answer 401 on staging (V evidence, 2026-10-01).

**Tests:** On main, in `tests/insights/insights.spec.ts`: `refresh runs the queued -> running -> done polling loop` (a
404 report, a click on `Generate Report`, a status route answering `running` and then `done`, and the assertion that
the `IWM` heading and the thesis appear within 15 s) and
`clicking Re-analyze with no cutoff sends a query-string-free URL` (the refresh URL's path and an empty query string);
neither asserts the label, the disabled button or a `failed` run. On the handler side
`tests/lib/test_routers_insights_admin.py::test_refresh_inserts_run` is the only test of the handler's success path:
it skips in CI, and run against a real Postgres 16 it failed with
`TypeError: test_refresh_inserts_run.<locals>.fake_sync_run() takes 2 positional arguments but 3 were given`, because
the handler passes the cutoff as a third argument (executed; matrix Gaps); `test_run_status_rejects_invalid_uuid` and
`test_run_status_404` in the same module skip too. `tests/api/test_route_coverage.py` holds the refresh route and the
status route at 503 against a dead backend (the refresh row is noted as covered before only by the skipped module);
`tests/gcp/test_insight_tasks.py` asserts the enqueue helper (the child environment, the deterministic task name, a
transport failure being unknown and never retried, a refusal permitting the fallback);
`tests/agents/test_agent_orchestrator.py` and `tests/agents/test_agent_summarizers.py` assert the pipeline the run
executes. Nothing asserts the handler's choice between the background task and the queue, the `insight_runs`
transitions, or the page's label. Te stays unticked.

**Code:** `src/routes/InsightsPage.tsx:64-107,153-195,331-338`, `src/hooks/useInsights.ts:119-187`,
`src/types/insights.ts:136-155`; `platform/api/routers/insights.py:325-370,373-408,411-486,489-490,829-923`,
`gcp/insight_tasks.py`; no test ids.

##### INSIGHTS-08 · Set a point-in-time cutoff

**Shows or does:** In the run controls a label `Replay as of` (its tooltip reads
`Point-in-time replay, runs the pipeline against data available at this date/time`) wraps a `datetime-local` input
(`aria-label` `Point-in-time cutoff`, `src/routes/InsightsPage.tsx:159-170`) whose `max` is
`new Date().toISOString().slice(0, 16)`, the current UTC date and time to the minute, written into a field that reads
local time (`:167`). While a value is set a `×` button (`aria-label` `Clear cutoff`, title `Clear cutoff (run live)`)
empties it (`:171-181`) and the main button reads `Replay` instead of `Re-analyze` (`:193`). The value is page state,
`asOf`, and is not persisted (`:47`); `refreshFor` appends it to the refresh URL as `?as_of=<value>`, URL-encoded and
as typed with no zone, for example `2026-09-29T10%3A30` (`:81-84`, `src/hooks/useInsights.ts:139`). It governs the
main button and the empty state's `Generate Report` button; a Watchlist row's `Generate report` passes an empty cutoff
and runs live (`InsightsPage.tsx:98-105`). The input keeps its value after a run, so the next click replays again.

The server parses it with `_parse_as_of_param` (`platform/api/routers/insights.py:102-133`): blank means no cutoff; a
ten-character value with two hyphens is a date; anything else goes through `datetime.fromisoformat`, a trailing `Z`
accepted and a zone-less value read as UTC (`:115-116`); a malformed value is a 400
`as_of must be ISO date or datetime: ...` and a moment after now a 400 `as_of '<value>' is in the future`
(`:123-132`). The run executes the pipeline with the cutoff (`_execute_pipeline`, `:472-486`; each summarizer reads as
of the cutoff, and three reads ignore it, matrix Gaps) and stores the report with `as_of` set to the cutoff's moment
(`lib/agents/orchestrator.py:660-661`) and `run_kind` `replay` (`insights.py:455`). The Briefing tab reads live rows
only (`:228,240`), so a replay never replaces the report on screen, and History lists it among the other rows with
nothing to mark it (INSIGHTS-03).

Executed on the handler (2026-10-01, the real refresh handler with the run insert and `_sync_run` replaced):
`as_of=2026-09-29T10:30` answered 200 with `as_of` `2026-09-29 10:30:00+00:00`, a zone-less value read as UTC, and the
background task received that moment; `2026-09-29` answered `2026-09-29` as a date; `2026-09-29T10:30Z` read as
`10:30:00+00:00`; `2026-09-29T10:30:00-04:00` kept its offset; `2027-01-01T10:00` answered 400
`as_of '2027-01-01T10:00' is in the future` and `not-a-date` 400
`as_of must be ISO date or datetime: Invalid isoformat string: 'not-a-date'`, neither inserting a run; a blank value
(`%20`) ran live with `as_of` null. On the page (the refresh stubbed): with a cutoff set the empty state's
`Generate Report` posted `?as_of=2026-09-29T10%3A30`; after a replay finished the report and history were refetched,
the page still showed the live `IWM` report, the input still read `2026-09-29T10:30` and the button `Replay`; a value
typed past `max` (`2027-01-01T10:00`) made the field invalid (`rangeOverflow`) and was sent anyway, and the 400
reached only the console
(`refresh failed Error: refresh failed: 400 {"detail":"as_of '2027-01-01T10:00' is in the future"}`), with nothing
drawn; and with the browser in America/New_York and the clock pinned to 14:00 UTC (10:00 local) the `max` read
`2026-09-30T14:00`, a local time three hours ahead (`13:00`) passed the cap and `14:30` did not, so the picker accepts
local times up to the UTC reading.

**Needs:** `POST /api/insights/report/{ticker}/refresh?as_of=` (INSIGHTS-07), gated: 401 without a token on staging (V
evidence, 2026-10-01). The run reads each table as of the cutoff, bounded as the Chain's Data cell states:
`market_data_daily`, `etf_options_snapshots`, `earnings_calendar`, `economic_events`, `news_sentiment` and
`sec_filings` take the cutoff, while `model_routing`, the reflection memory of `journal_entries` and the planner's
`exit_config_overrides` do not. In the production branch the handler would forward the cutoff to the queue as
`INSIGHT_AS_OF` (`gcp/insight_tasks.py:103-104`); the branch is not taken today (INSIGHTS-07). Production (V evidence,
2026-10-01): `insight_reports` holds 2 `replay` rows, QQQ of 2026-05-06 12:45 UTC and SPY of 2026-09-11 00:00 UTC, and
no `local_dev` run, the trigger a refresh from this page records while `ENV` is unset, has been recorded since
2026-04-25.

**States:** Loading (INSIGHTS-11): the run's `queued…` label. Empty: none. Error (INSIGHTS-13): a rejected cutoff,
malformed or in the future, is a 400 that only the console shows. Stale (INSIGHTS-14): the replay's result is not on
screen unless opened from History. Permission (INSIGHTS-15).

**Acceptance criteria:**
- Given no cutoff, then the button reads `Re-analyze` and the refresh carries no query string (asserted on main by
  `clicking Re-analyze with no cutoff sends a query-string-free URL`).
- Given a value typed into the input, then the button reads `Replay` and a `×` shows; given a click on `×`, then it
  reads `Re-analyze` again (asserted on main by
  `button label flips between Re-analyze and Replay based on picker state`), and the next refresh carries no `as_of`
  (`clearing the cutoff after setting it sends a live (no-as_of) refresh`).
- Given the cutoff `2026-04-26T13:15`, then the refresh URL's path is `/api/insights/report/IWM/refresh` and `as_of`
  equals the typed value (asserted on main by `clicking Replay sends ?as_of= encoded in the refresh URL`).
- Given the page, then the input's `max` parses as a datetime within a day of now (asserted on main by
  `picker is rendered with a max-now cap on the input`); it is the UTC clock (executed with New York as the browser's
  zone).
- Given a zone-less cutoff, then the server reads it as UTC, so `10:30` means 06:30 EDT (executed on the handler).
- Given a cutoff in the future or malformed, then the handler answers 400 and the page draws nothing (executed).
- Given a Watchlist row's `Generate report` with a cutoff set, then the refresh is live (executed; the test added on
  this branch, `a watchlist row's Generate report runs live even while a cutoff is set`, asserts that the row's refresh
  request has no query string while the cutoff input stays set).
- Given no token, then the route answers 401 on staging (V evidence, 2026-10-01).

**Tests:** On main, `tests/insights/insights.spec.ts` holds five tests for the control: the cap on the input, the
label flip, the encoded `as_of`, the query-string-free live refresh and the clear-then-live refresh, all against a
stubbed refresh route; they assert the control and the URL it builds, not the run or its result. On the handler and
pipeline side: `tests/gcp/test_insight_pipeline_job.py` asserts the Cloud Run job's parser
(`test_parse_as_of_iso_datetime_naive_treated_as_utc`, the future date and datetime, the malformed value), which the
router's `_parse_as_of_param` mirrors but does not share, so no test that runs in CI asserts the router's parser;
`tests/agents/test_agent_summarizers.py` asserts the cutoff-bounded reads (the options chain's freshness at `as_of`,
the gamma levels, the news window, the backtest's excluded as-of bar); `tests/gcp/test_canonical_provenance.py`
asserts that the job stamps `replay` or `live` on its canonical row, and `tests/meta/test_production_writers.py`
checks by source text that the router's upsert carries `run_kind` through the conflict (presence only). Nothing
asserts the API's replay write, its response or the three reads that ignore the cutoff. On this branch
`a watchlist row's Generate report runs live even while a cutoff is set` (`tests/insights/insights.spec.ts`) asserts
that exception, the row's refresh carrying no `as_of` while the cutoff input stays set; it has not run in CI. Te stays
unticked.

**Code:** `src/routes/InsightsPage.tsx:47,78-105,159-194`, `src/hooks/useInsights.ts:124-156`;
`platform/api/routers/insights.py:95-133,411-486,841-898`, `lib/agents/orchestrator.py:660-661`,
`gcp/insight_tasks.py:103-104`; no test ids (the input and the clear button carry their `aria-label`).

##### INSIGHTS-09 · Add or remove watchlist tickers

**Shows or does:** The `Add Ticker` button of the Watchlist tab toggles `TickerSearchPanel`
(`src/components/insights/WatchlistPanel.tsx:119-125,143-150,209-361`). The input takes focus when the panel opens;
300 ms after the last keystroke (`:228-235`) the page requests `GET /api/insights/ticker/search?keywords=<q>&limit=8`
(`useTickerSearch`, `src/hooks/useTickerSearch.ts:55-68`) and lists the matches as the symbol, the name,
`<type> · <region>` and the match score as a percentage (`:318-342`), with `Searching...` while it loads (`:311-316`)
and `No matches for "<q>". Press Enter or Add to add it directly.` for an empty answer (`:344-348`). A click on a
match, or Enter or `Add` on the typed text, which is upper-cased (`:252-263`), posts
`POST /api/insights/watchlist/add` with `{ticker}` (`useAddToWatchlist`, `useTickerSearch.ts:101-125`), clears the
input, draws `AddedTickerCard` (`WatchlistPanel.tsx:367-477`) and refetches the ranking (`:146-148`). The card reads
`ADDED` or `ALREADY ON WATCHLIST`, the ticker and name, then the exchange, sector, industry, market cap (as `$1.2T`,
`$3.0B` or `$120M`) and asset type when present, and, when a quote came back, the price, the change with its percent,
the volume and the latest trading day, and two lines of the description. A failed add draws `Failed to add: <message>`
under the input, the message being `HTTP <status>: <the server's detail>` (`:354-358`, `useTickerSearch.ts:109-121`);
Escape or the `X` closes the panel (`:288-291`). Removal has no control: `useRemoveFromWatchlist`
(`DELETE /api/insights/watchlist/{ticker}`, `useTickerSearch.ts:137-147`) and the route exist
(`platform/api/routers/insights.py:676-701`), and nothing on the page calls them (executed: the tab holds no remove or
delete control). The header picker's `new`-badged pick posts the same add (SIGNALS-01, OPTIONS-06).

The server: the search (`insights.py:544-556`) answers 400 for a blank query, asks AlphaVantage `SYMBOL_SEARCH` for at
most `min(limit, 20)` matches (`lib/ticker_info.py:403-446`) and answers an empty list with 200 when the key is
missing, the call fails or the vendor answers a notice instead of matches (`:416-418,431-435`). The add (`:599-673`)
takes the owner from the request, the signed-in email or `default` (`:621`), answers 400 for a blank ticker, writes
the row with `source` `ui` through `gcp/fetchers/_watchlist.py` and turns any failure into a 503 carrying the error
text (`:626-637`), reads the list back with any failure turned into an empty list (`:639-643`), then asks for
AlphaVantage OVERVIEW through `get_ticker_info` (Cloud SQL `ticker_info`, then the local cache, then the vendor;
`lib/ticker_info.py:306-376`), GLOBAL_QUOTE through `get_quote` (`:449-499`, `None` on any failure) and FinViz peers
through `get_peers` (`:515-559`, an empty list on failure), and answers
`{ticker, added, info, quote, peers, watchlist}` (`:666-673`); the page reads `added`, `info` and `quote` only.

Executed (2026-10-01): on the page, with the search and add routes stubbed, typing `broad` sent one request
`keywords=broad&limit=8` and listed two matches; a click on the first sent the body `{"ticker":"AVGO"}`, drew the card
with `ADDED` and refetched the ranking once; `mu` then Enter sent `{"ticker":"MU"}` and drew `ADDED MU`; an add
answered 503 drew `Failed to add: HTTP 503: watchlist write to Cloud SQL failed: connection refused`; a search
answered 500 drew nothing (the panel stayed at its header and input) after two requests, the retry included; an empty
answer drew `No matches for "zzzz". Press Enter or Add to add it directly.`. On the handlers (the real
`search_tickers` and `add_to_watchlist` with the writes and vendor calls replaced): a signed-in add answered 200 with
`added: True`, and the write and the read-back received the signed-in user's email, the write with `source` `ui`; a
read-back that raised answered 200 with `watchlist: []`; a write that raised answered 503
`watchlist write to Cloud SQL failed: connection refused`; a blank ticker answered 400 `ticker required`; the search
answered 200 with `results: []` for a vendor that raised and for a vendor that answered a rate-limit notice, 200 with
the match for a vendor that answered, and 400 `keywords required` for a blank query.

**Needs:** `GET /api/insights/ticker/search` and `POST /api/insights/watchlist/add`, gated: 401 without a token on
staging (V evidence, 2026-10-01); the secret `av-api-key` on the service (`platform/deploy.sh`) for AlphaVantage,
FinViz for the peers, Cloud SQL `watchlists` and `ticker_info`. Production (V evidence, 2026-10-01): `watchlists`
holds 16 active rows, all owned by `default` and none with source `ui`, so no active row belongs to a signed-in user;
`ticker_info` holds 0 rows. A search and an add call vendors live, which this run did not do: V stays unticked.

**States:** Loading (INSIGHTS-11): `Searching...`, and the `Add` button's spinner while the add is pending. Empty
(INSIGHTS-12): the no-matches line. Error (INSIGHTS-13): `Failed to add: ...` for the add, nothing for a failed
search, which reads the same as no matches when the handler swallowed the vendor failure (matrix Gaps). Stale: none.
Permission (INSIGHTS-15): a 401 on the add reads `Failed to add: HTTP 401: sign in to continue` (read) and a failed
search shows nothing (executed).

**Acceptance criteria:**
- Given text typed into the input, then one search request goes out 300 ms after the last keystroke with `keywords`
  and `limit=8`, and the matches list (executed).
- Given a click on a match, then the add posts that symbol, the card shows `ADDED` or `ALREADY ON WATCHLIST` and the
  ranking refetches (executed).
- Given the typed text and Enter or `Add`, then the add posts it upper-cased (executed).
- Given the add fails, then `Failed to add: HTTP <status>: <detail>` shows (executed with 503).
- Given the search fails or the vendor is down, then no error shows: a 500 draws nothing and the handler answers 200
  with an empty list for a vendor failure (executed; matrix Gaps).
- Given a signed-in user, then the write and the read-back use that user's email, and two users do not see each
  other's list (`test_add_scopes_to_signed_in_user`, `test_two_users_do_not_share_watchlist`,
  `tests/api/test_platform_api.py`, with the writes patched).
- Given no remove control on the page, then no remove request can be sent from it (executed).
- Given no token, then both routes answer 401 on staging (V evidence, 2026-10-01).

**Tests:** On main no Playwright or unit test opens the panel. On the handler side
`tests/api/test_ticker_info.py::TestTickerInfoAPI` asserts the search route (`test_search_endpoint`,
`test_search_endpoint_rejects_empty_keywords`) and the add route's response with the write, the vendor lookups and the
peers patched (`test_watchlist_add_endpoint`), `TestWatchlistMutationAPI` (`tests/api/test_platform_api.py`) asserts
the default owner, the signed-in owner, the remove's scoping and the separation of two users with the writes patched,
and `tests/api/test_route_coverage.py` pins the search at 200, the add and the remove at 503 against a dead backend.
Nothing asserts the panel, the debounce, the card, the error text, the empty search, or that an add reaches the
ranking. Te stays unticked.

**Code:** `src/components/insights/WatchlistPanel.tsx:119-150,209-477`, `src/hooks/useTickerSearch.ts:55-68,101-147`;
`platform/api/routers/insights.py:544-556,599-701`, `lib/ticker_info.py:306-376,403-559`,
`gcp/fetchers/_watchlist.py:344-473`; no test ids (the input's placeholder is
`Search by name or symbol (e.g. broadcom, INTC)...`).

##### INSIGHTS-10 · Chat

**Shows or does:** The send action of the Chat tab (`send`, `src/routes/InsightsPage.tsx:481-534`). It trims the input
and does nothing for an empty one or while a reply is streaming (`:482-483`), clears the input, appends the user's
bubble and starts streaming (`:484-488`), then posts `POST /api/insights/chat` with `{message, mode, ticker, history}`
where `history` is the last six messages before this one, user and assistant turns alike (`:491-500`,
`messages.slice(-6)`). A response that is not OK, or has no body, appends `Error: <status> <statusText>` as the
assistant's bubble (`:502-508`); otherwise it appends an empty assistant bubble and fills it with each decoded chunk
as it arrives (`:510-525`); an exception, a refused or aborted request included, appends `Error: <message>`
(`:526-530`); the spinner and the input come back when it ends (`:531-533`).

The route (`platform/api/routers/insights.py:1062-1074`) answers 400 for a blank message or an unknown mode, and 422
when `message` is missing; otherwise it streams `text/plain` from `_stream_gemini` (`:1005-1059`): the last six of the
history turns as user and model contents (`:1030`), then `[Ticker: <ticker> | Mode: <mode>]` and a blank line before
the message (`:1034-1037`), the mode's system prompt (`:930-960`), the model `gemini-3.1-flash-lite` (`:1041-1042`,
hard-coded), temperature 0.7 and at most 2048 output tokens; each chunk's text is yielded as it comes. Any exception,
the Vertex or quota errors and a missing SDK included, is yielded as the body text `Gemini error: ...` (or the install
hint) with status 200 (`:1053-1059`).

Executed on the route (2026-10-01, the real handler with the google-genai client replaced): a request with a history
of eight turns reached the client with the model `gemini-3.1-flash-lite`, temperature 0.7, 2048 output tokens, the
system prompt of its mode, and the last six history turns followed by the new message; the default request, without
`mode` or `ticker`, used the `chat` prompt and `[Ticker: IWM | Mode: chat]`; a stream that raised
`429 RESOURCE_EXHAUSTED` answered 200 with the body `Gemini error: 429 RESOURCE_EXHAUSTED`; `{"message": "   "}`
answered 400 `Message cannot be empty`, `{"message": "x", "mode": "nope"}` 400 `Unknown mode: nope` and a body without
`message` 422. Executed on the page (replies stubbed): four sends, in modes `market` and then `trade`, posted bodies
with `history` of 0, 2, 4 and 6 entries (`u:hello there`, `a:r1`, ...), the mode and the ticker `IWM` in each; a 503
drew `Error: 503 Service Unavailable`, an aborted request `Error: Failed to fetch`, and a 200 whose body was
`Gemini error: 429 RESOURCE_EXHAUSTED. Quota exceeded` drew exactly that text as the assistant's answer, with nothing
to tell it from one; the next request's history carried those bubbles as assistant turns
(`a:Error: 503 Service Unavailable`, `a:Error: Failed to fetch`,
`a:Gemini error: 429 RESOURCE_EXHAUSTED. Quota exceeded`); a whitespace-only message, and Enter on an empty box, sent
nothing; during a held response a second send was ignored.

**Needs:** Vertex AI Gemini streamed on the request path, nothing else: the request carries the message, the mode, the
ticker and up to six prior turns, and no table is read (`:1029-1037`). GCP: the service's account
`trading-platform-svc@` with `roles/aiplatform.user`, `GCP_PROJECT_ID` (default `adept-mountain-474619-d4`) and
`VERTEX_GEMINI_LOCATION` (default `global`, read at `:975-1002`); no secret. A reply needs a signed-in session and a
live Vertex call, which this run did not have: V stays unticked, and the route answers 401 without a token on staging
(V evidence, 2026-10-01).

**States:** Loading (INSIGHTS-11): the spinner and disabled input while streaming. Empty: INSIGHTS-05's text. Error
(INSIGHTS-13): HTTP errors and network failures as `Error: ...` bubbles; Vertex failures as a `Gemini error: ...`
answer with status 200, which is what the page then shows as the reply. Permission (INSIGHTS-15):
`Error: 401 Unauthorized`.

**Acceptance criteria:**
- Given a non-blank message, then one `POST /api/insights/chat` goes out with `message`, `mode`, `ticker` and the
  previous messages, at most six (executed on the page and on the handler).
- Given a streamed reply, then the assistant bubble fills as chunks arrive and the spinner shows until the stream ends
  (executed with a held then released response).
- Given a blank or whitespace-only message, or a send while a reply streams, then nothing is sent (executed).
- Given HTTP 503, then the bubble reads `Error: 503 Service Unavailable`; given a network failure,
  `Error: Failed to fetch` (executed).
- Given Vertex fails, then the route answers 200 with `Gemini error: <error>` and the page draws it as the assistant's
  reply (executed; matrix Gaps).
- Given a blank message or an unknown mode, then the route answers 400 (executed; `tests/api/test_route_coverage.py`
  asserts the blank message at 400).
- Given no token, then the route answers 401 on staging (V evidence, 2026-10-01).

**Tests:** On main no Playwright or unit test sends a message. `tests/api/test_route_coverage.py` asserts only that
`POST /api/insights/chat` with `{"message": ""}` answers 400 before touching Gemini, and solyra
`src/mocks/contract.test.ts` validates a sample request body against the vendored snapshot. Nothing on main asserts
the stream, the model, the six-turn window, the error bubbles or the `Gemini error:` body. On this branch
`a failed report, ranking or chat request says so on the page with its status` (`tests/insights/insights.spec.ts`)
sends a message to a route answering 503 and asserts that the message text and text beginning `Error: 503` are each
visible on the page; both are found by text over the whole page, so neither their order nor their place in the
transcript is asserted; it has not run in CI. Te stays unticked.

**Code:** `src/routes/InsightsPage.tsx:466-534`; `platform/api/routers/insights.py:930-1074`; no test ids.

##### INSIGHTS-11 · State: loading

**Shows or does:** A state with no request of its own: it is what the page draws while the requests of INSIGHTS-01,
INSIGHTS-03, INSIGHTS-04, INSIGHTS-05, INSIGHTS-07 and INSIGHTS-09 are pending, and the Agents tab's placeholder text
while INSIGHTS-02's are. Briefing: `ReportView` returns a centred spinner in place of the whole stack while the report,
or for a History entry the by-id read, is loading (`src/routes/InsightsPage.tsx:204-206,307-313`). History: the same
spinner while the history is loading (`:227,404-410`). Watchlist: a spinner in a box under the filter bar, which stays
(`src/components/insights/WatchlistPanel.tsx:153-156`). Chat: a spinner after the last bubble, with the input and the
send button disabled (`InsightsPage.tsx:574-576,592,597`). Add: `Searching...` under the input while a search loads and
a spinner in the `Add` button while an add is pending (`src/components/insights/WatchlistPanel.tsx:301-305,311-316`,
read). A run: `queued…` or `running…` with a small spinner beside
the cutoff, and a spinning icon on the main button and the empty state's button (`:153-158,188-192,333,336`). The
Agents tab has no spinner: until each request answers its tiles read `—`, the cost block reads
`No per-agent breakdown yet, generate an insight report for this ticker.`, the roster reads `Loading routing…` and
`Recent runs` reads `No prior runs for <ticker>.`
(`src/components/insights/AgentsPanel.tsx:41-44,53-56,89-90,121-123`). The House Views card has no loading form: while
the brief request is pending it reads `Brief unavailable for <ticker>, insight pipeline shipping standalone.`
(`src/components/insights/ReportCards.tsx:529-537`, `src/hooks/useInsights.ts:24-58`). A spinner shows only for a key
with no cached answer (`isLoading`), so a refetch of a held answer, after 60 s or after a run finishes, redraws
silently, and a pick of another ticker shows the spinner again unless that ticker is cached.

Executed (2026-10-01, with the request held in each case): the report held, the body held only the spinner while the
heading `AI Insights`, the five tab buttons and the run controls stayed; the brief held, the House Views card read
`Brief unavailable for IWM, insight pipeline shipping standalone.` and, released, drew `HOUSES DIVERGE` with the two
views; the history held, the History tab drew only its spinner; the ranking held, the Watchlist tab drew one spinner
under the filter bar; a chat reply held, one spinner, the input and the button disabled and a second send ignored; a
status of `queued` then `running`, the label followed (INSIGHTS-07); on the Agents tab the report held left the tiles
at `—` and the cost block at `No per-agent breakdown yet...` while the roster listed its seven roles, the roster held
read `Loading routing…`, and the history held read `No prior runs for IWM.`.

**Needs:** Nothing of its own: the pending requests of the rows above. How long they stay pending in production was
not measured, and three nearby measurements are not that. The newest four `ranker_runs` rows, written in the minutes of
the 08:10 ET `auto-refresh-top-n` job's executions by the same `rank_tickers` the Watchlist tab calls, record 10.8 s to
46.1 s for 16 candidates, against a hook comment that calls the ranker cheap at about 5 s
(`src/hooks/useWatchlist.ts:11-15`, V evidence); the endpoint's own latency was not measured. The newest live IWM
report records `latency_ms` 25626, the pipeline's own time for that report (V evidence). The ten `local_dev` runs, the
kind a click on the page creates under the current settings (read), took 17.4 s to 22.8 s from `started_at` to
`finished_at`, the newest from 2026-04-25 (V evidence). None of the three times a click today. The browser requests
carry no timeout, so a request that never answers keeps its spinner (read).

**States:** This is the loading state of the Briefing, History, Watchlist, Chat, run and search surfaces (INSIGHTS-01,
INSIGHTS-03, INSIGHTS-04, INSIGHTS-05, INSIGHTS-07, INSIGHTS-09) and, as placeholder text, of the Agents tab
(INSIGHTS-02).

**Acceptance criteria:**
- Given the report request is pending with no cached answer, then a spinner replaces the card stack and the heading,
  the tabs and the run controls stay (executed).
- Given the history request is pending, then the History tab draws a spinner; given the ranking is pending, the
  Watchlist tab draws a spinner under its filter bar (executed).
- Given a chat reply is streaming, then a spinner shows and the input and the send button are disabled (executed).
- Given a search is loading, then `Searching...` shows under the input, and given an add is pending, the `Add` button
  shows a spinner (read).
- Given a run is `queued` or `running`, then the label and the disabled buttons show (executed; INSIGHTS-07).
- Given the brief request is pending, then the House Views card reads `Brief unavailable`, the text of the unavailable
  state (executed; matrix Gaps).
- Given the Agents tab's requests are pending, then it draws its placeholder text and no spinner (executed).

**Tests:** None on main asserts it: no test looks for a spinner, and
`refresh runs the queued -> running -> done polling loop` (`tests/insights/insights.spec.ts`) runs the status through
`running` and asserts only the finished report. No unit test mounts the page or any of these components. Te stays
unticked.

**Code:** `src/routes/InsightsPage.tsx:153-158,188-192,204-206,227,307-313,404-410,574-576`,
`src/components/insights/WatchlistPanel.tsx:153-156,301-305,311-316`,
`src/components/insights/AgentsPanel.tsx:41-123`, `src/components/insights/ReportCards.tsx:529-537`,
`src/hooks/useInsights.ts:24-58`; no test ids (the spinners are `animate-spin` icons).

##### INSIGHTS-12 · State: empty

**Shows or does:** A state with no request of its own: what the page draws when a read succeeds with nothing in it.
Briefing, no live report: a 404 from `GET /api/insights/report/{ticker}` is read as no report
(`src/hooks/useInsights.ts:74`) and `ReportView` draws a centred icon, `No report yet`,
`Generate the first AI insight report for this ticker.` and a `Generate Report` button that runs INSIGHTS-07
(`src/routes/InsightsPage.tsx:321-340`). Inside a report, each card has its own empty copy
(`src/components/insights/ReportCards.tsx`): Trade Plan targets `—` (`:126-128`), Key Levels `No key levels supplied.`
(`:199-200`), Catalysts `No upcoming events flagged.` (`:245-246`), Persona Plans
`No persona plans available, risk debate did not produce concrete trade plans.` (`:362-368`), Risk Review
`No risk flags raised.` (`:277-282`), Supporting Signals `No recent signal alerts for this ticker.` with
`Signal monitor tracks breakouts within the last 30 days.` (`:393-401`) and Similar Past Trades
`No matching journal entries yet.` with `Log trades in the Journal to build similarity memory.` (`:429-437`). History:
`No history yet.` (`InsightsPage.tsx:411-417`). Agents:
`No per-agent breakdown yet, generate an insight report for this ticker.`, `Loading routing…` for an empty roster and
`No prior runs for <ticker>.` (`AgentsPanel.tsx:53-56,89-90,121-123`). Watchlist: `No candidates ranked.` with
`Either no catalyst tickers met the liquidity gate, or the catalyst data tables are empty. Once Phase 2 fetchers have run a full day, this list will populate.`
(`WatchlistPanel.tsx:164-173`). Chat: `Ask a question about <ticker> in <mode> mode.` while the transcript is empty
(`InsightsPage.tsx:557-561`). Search: `No matches for "<query>". Press Enter or Add to add it directly.` when a query
returns nothing (`WatchlistPanel.tsx:344-348`).

Executed (2026-10-01, the production executions are listed at INSIGHTS-01): ARM, which has no live row, drew
`No report yet` and `Generate Report` on the Briefing tab (the real handler answered 404
`No insight report for ARM. Call POST /api/insights/report/{ticker}/refresh to generate one.`) while its History tab
listed four backfill rows and its Agents tab `Recent runs 4 of 4`. The IWM report with its lists emptied drew every
empty copy above, word for word, and an empty history drew `No history yet.` and, on the Agents tab,
`No prior runs for IWM.`. The empty copies are not rare in production: of the 46 reports of the last 10 days, none
carries a supporting signal or a similar past trade, so those two cards always draw their empty copy (V evidence;
matrix Gaps). The same `No candidates ranked.` text is what a signed-in user who owns no watchlist row sees, and what
a database outage shows (INSIGHTS-04; executed on the handler and the page). The Chat tab with no message drew
`Ask a question about IWM in chat mode.` and, after a click on `market`, the same sentence with `market`; a search for
`zzzz` that returned no matches drew `No matches for "zzzz". Press Enter or Add to add it directly.` (executed).

**Needs:** Nothing of its own: a 404 from the report route, and 200 answers with empty lists from the history route,
the roster route and the ranking route. Production (V evidence, 2026-10-01): 164 tickers have at least one report and
785 live reports exist; ARM and CARS have reports and no live one.

**States:** This is the empty state of the Briefing tab, its cards, the History tab, the Agents tab, the Watchlist tab
and the Chat tab (INSIGHTS-01 to INSIGHTS-05), and of the add's search (INSIGHTS-09).

**Acceptance criteria:**
- Given a 404 from the report route, then the tab reads `No report yet` with a `Generate Report` button (executed;
  asserted on main by `shows empty-state CTA when no report exists`).
- Given a report whose lists are empty, then each card draws its own copy and the targets draw `—` (executed).
- Given an empty history, then `No history yet.` shows; given an empty roster, then `Loading routing…` shows and stays
  (executed).
- Given a ranking of no rows, then `No candidates ranked.` and its sentence show (executed).
- Given a Chat tab with no message, then `Ask a question about <ticker> in <mode> mode.` shows, with the selected mode
  (executed); given a search with no results, then `No matches for "<query>". Press Enter or Add to add it directly.`
  shows (executed).
- Given the handler holds no live row, then it answers 404 with a detail naming the refresh route (executed on ARM).

**Tests:** On main `shows empty-state CTA when no report exists` (`tests/insights/insights.spec.ts`) serves a 404 for
the report and asserts that text matching `/no report yet/i` and a button matching `/generate report/i` are visible;
it does not look at the other copies. On the handler side the 404 is asserted only by
`test_get_insight_report_404_when_missing` in `tests/lib/test_routers_insights_admin.py`, which skips in CI, and
`tests/api/test_route_coverage.py` holds the report route at 503, not 404. No test asserts the card copies,
`No history yet.`, the Agents, Watchlist, Chat or search text. Te stays unticked: the handler's 404 is asserted only by
a module that skips in CI.

**Code:** `src/routes/InsightsPage.tsx:321-340,411-417,557-561`, `src/hooks/useInsights.ts:68-81`,
`src/components/insights/ReportCards.tsx:126-128,199-200,245-246,277-282,362-368,393-401,429-437`,
`src/components/insights/AgentsPanel.tsx:53-56,89-90,121-123`, `src/components/insights/WatchlistPanel.tsx:164-173,344-348`;
`platform/api/routers/insights.py:764-782`; no test ids.

##### INSIGHTS-13 · State: error

**Shows or does:** A state that each surface draws differently; most failures reach the page only after one retry,
about a second later, because every query retries once (`src/App.tsx:30-37`). Briefing: a red box
`Failed to load report: <message>`, the message being the hook's `insights <status>` for the live read
(`src/hooks/useInsights.ts:75`) and `insights by-id <status>` for a History entry (`:94`), with the header, the tabs
and the run controls kept (`src/routes/InsightsPage.tsx:314-320`); a 404 on the live read is the empty state instead
(INSIGHTS-12). House Views: a failed brief request, or an available answer with no `bias`, draws the red
`Brief lookup failed for <ticker>: the response was malformed or the request errored. Comparison withheld rather than fabricated.`
card (`src/components/insights/ReportCards.tsx:519-528`, `useInsights.ts:28-43`). History: no error branch, so a
failure reads `No history yet.` (`InsightsPage.tsx:404-417`). Agents: a failed roster reads
`Admin access required to view per-agent routing.` whatever the status, a failed history `No prior runs for <ticker>.`
and a failed report leaves the tiles at `—` (`AgentsPanel.tsx:85-88,121-123`). Watchlist: a red box
`Failed to load watchlist: <message>`, for example `watchlist 503`, with the filter bar kept
(`WatchlistPanel.tsx:157-163`). A refresh that fails is logged to the console and nothing is drawn, a run that ends
`failed` only loses its label and a status poll that fails leaves `queued…` for good (`InsightsPage.tsx:64-76,86-89`,
INSIGHTS-07). Chat: an assistant bubble `Error: <status> <statusText>` for a non-OK response and `Error: <message>`
for a thrown one (`:502-508,526-530`, INSIGHTS-10); a Vertex failure arrives as a 200 body `Gemini error: ...` and
draws as an answer. Add: `Failed to add: HTTP <status>: <detail>` under the input, and nothing for a failed search
(`WatchlistPanel.tsx:354-358`, INSIGHTS-09).

Executed (2026-10-01): the report route answering 503 drew `Failed to load report: insights 503` (after the retry,
within 15 s) with the heading and the cutoff input still on screen; a History entry whose by-id read answered 404 drew
`Failed to load report: insights by-id 404` and no strip; the history route 503 drew `No history yet.`; the roster 403
and the roster 503 both drew `Admin access required to view per-agent routing.`; the ranking 503 drew
`Failed to load watchlist: watchlist 503`; the brief 503 drew the red brief card and an available brief answer without
`bias` drew the same; the chat route 503 drew `Error: 503 Service Unavailable`, an aborted request
`Error: Failed to fetch` and a 200 `Gemini error: 429 RESOURCE_EXHAUSTED. Quota exceeded` that same text as the
answer. What the handlers do when Cloud SQL is down (`tests/api/test_route_coverage.py`, a dead connection layer): the
report, by-id, history, runs and refresh routes and the roster answer 503 through `_db_call`
(`platform/api/routers/insights.py:159-201`) or the roster's own guard (`platform/api/routers/admin.py:129-154`); the
ranking and the brief answer 200 with nothing (the swallowing reads of INSIGHTS-04 and INSIGHTS-01, both pinned at 200
by the same sweep), so a database outage never reaches this state for them (executed on both handlers; matrix Gaps).

**Needs:** Nothing of its own: the failing requests of the rows above, and the statuses their handlers choose. A
defect in a handler, as opposed to an outage, stays a 500 (`_db_call` re-raises what `is_infrastructure_error` does
not recognise, `insights.py:191-201`; `test_an_internal_defect_is_not_reported_as_an_outage`).

**States:** This is the error state of the Briefing, History, Agents, Watchlist, Chat and Add surfaces and of the run
controls (INSIGHTS-01 to INSIGHTS-05, INSIGHTS-07, INSIGHTS-09). The permission case, a 401, is INSIGHTS-15.

**Acceptance criteria:**
- Given the report route answers 503, then `Failed to load report: insights 503` shows in a red box and the page's
  heading, tabs and run controls stay (executed: the text, the `AI Insights` heading, the five tab buttons, the cutoff
  input and the `Re-analyze` button were on the page). The test added on this branch,
  `a failed report, ranking or chat request says so on the page with its status` (`tests/insights/insights.spec.ts`),
  asserts that text, the `AI Insights` heading and the cutoff input, and clicks the Watchlist and Chat tab buttons
  afterwards.
- Given the ranking route answers 503, then `Failed to load watchlist: watchlist 503` shows and the filter bar stays
  (executed; the same test asserts the text and not the filter bar).
- Given the chat route answers 503, then the transcript shows the user's message and `Error: 503` (executed; the same
  test finds both texts on the page, in no asserted order).
- Given a History entry's by-id read answers 404, then `Failed to load report: insights by-id 404` shows (executed).
- Given the brief request fails, then the red `Brief lookup failed` card shows (executed).
- Given the history route fails, then `No history yet.` shows, and given any roster failure
  `Admin access required to view per-agent routing.` shows (executed; matrix Gaps).
- Given a refresh fails or a run ends `failed`, then nothing is drawn (executed; INSIGHTS-07).
- Given Cloud SQL is unreachable, then the report, by-id, history, runs, refresh and roster routes answer 503, not a
  bare 500 (`tests/api/test_route_coverage.py`).

**Tests:** On main no Playwright or unit test drives a failure on this page. `tests/api/test_route_coverage.py` pins
the 503 of the report, history, by-id, runs, refresh and roster routes against a dead connection layer, with
`test_insight_report_lookups_are_503_not_a_bare_500` injecting the driver error and
`test_an_internal_defect_is_not_reported_as_an_outage` checking that a defect stays a 500. On this branch
`a failed report, ranking or chat request says so on the page with its status` (`tests/insights/insights.spec.ts`)
asserts `Failed to load report: insights 503` with the `AI Insights` heading and the cutoff input still on screen,
`Failed to load watchlist: watchlist 503`, and, after a chat send answered 503, the message text and text beginning
`Error: 503`, each found by text on the page with no order or place asserted; it clicks the Watchlist and Chat tab
buttons to reach the last two and asserts nothing about the other tabs, the `Re-analyze` button or the filter bar; it
has not run in CI. The forms of the Agents tab, History, the
brief card, the refresh, the status poll and the add are asserted by no test. Te stays unticked: the page side waits
for a CI run that includes the branch's tests.

**Code:** `src/routes/InsightsPage.tsx:64-76,86-89,314-320,404-417,502-508,526-530`,
`src/components/insights/ReportCards.tsx:519-528`, `src/components/insights/AgentsPanel.tsx:85-88,121-123`,
`src/components/insights/WatchlistPanel.tsx:157-163,354-358`, `src/hooks/useInsights.ts:24-117`, `src/App.tsx:30-37`;
`platform/api/routers/insights.py:159-201`, `platform/api/routers/admin.py:129-154`; test id `brief-error`.

##### INSIGHTS-14 · State: stale

**Shows or does:** A state the page barely has: it never compares a report's age with anything. Two things stand for
it. While a History entry is open the Briefing tab shows a warn strip above the stack,
`Viewing historical report, not the current latest.`, with a `Back to latest` button
(`src/routes/InsightsPage.tsx:345-355`). And every report carries its time: the header card draws
`new Date(as_of).toLocaleString()` in the browser's zone (`src/components/insights/ReportCards.tsx:85-86`), the
History rows the same (`InsightsPage.tsx:442-444`), while the Agents tab draws the UTC date as its `As of` tile and
`YYYY-MM-DD HH:MM` in UTC for each recent run (`src/components/insights/AgentsPanel.tsx:44,137`). Nothing else marks
age (read): the live Briefing serves the newest live row whatever its age, with no `stale` badge, no relative time and
no check against the session (`InsightsPage.tsx:357-362` hands the header the report, its `as_of`, the cost and the
latency; matrix Gaps); the brief behind House Views returns a `stale_days` the card never reads
(`platform/api/routers/dashboard.py:171-183`).

Executed (2026-10-01, the production executions are listed at INSIGHTS-01): the IWM report of 2026-04-24, served as if
it were the live report, drew the header `4/24/2026, 1:16:21 PM` and the rest of the stack with no stale marker; the
same report time, with the browser in America/New_York, read `9/30/2026, 8:55:36 AM` in the Briefing header and the
first History row, `2026-09-30` in the Agents tab's `As of` tile and `2026-09-30 12:55` in its first recent run. The
previous session's report stays on screen under its timestamp alone until the day's run lands (08:10 ET for the
tickers `auto-refresh-top-n` picks, 08:45 ET for the `in_insight` ones): at 04:06 ET the newest live reports of IWM,
SPY and QQQ were the 2026-09-30 08:55 ET ones, and MU's newest live report was from 2026-09-24 12:11 UTC, a week old,
with nothing to say so (V evidence).

**Needs:** Nothing of its own: the report's `as_of` (INSIGHTS-01), which `insight-pipeline` (08:45 ET Mon-Fri) and
`auto-refresh-top-n` (08:10 ET Mon-Fri) write, `ENABLED`, their 2026-09-30 executions succeeded (V evidence);
`GET /api/insights/reports/{id}` for the strip. The freshness the page assumes is one session behind until the morning
run lands.

**States:** This is the stale state of the Briefing tab (INSIGHTS-01) and its History view (INSIGHTS-03). Loading,
empty and error of the by-id read are INSIGHTS-11 to INSIGHTS-13; permission INSIGHTS-15.

**Acceptance criteria:**
- Given a History entry is open, then the strip `Viewing historical report, not the current latest.` shows with
  `Back to latest`; given a click on it, on the Briefing tab or a pick of another ticker, then the strip goes and the
  live report returns (executed; INSIGHTS-03).
- Given a live report of any age, then the header shows its time and no stale marker (executed on the production
  report of 2026-04-24 served as the live one, and read at `InsightsPage.tsx:357-362` and `ReportCards.tsx:85-86`;
  matrix Gaps, `A report of any age is served as current`).
- Given the same report on the Briefing, History and Agents tabs, then the Briefing and History times are in the
  browser's zone and the Agents tab's in UTC (executed with America/New_York).

**Tests:** None asserts it: no test opens a History entry or looks at a report's time, and
`renders a full report with all cards` (`tests/insights/insights.spec.ts`) mounts a report without asserting the
timestamp. Te stays unticked.

**Code:** `src/routes/InsightsPage.tsx:58-62,345-355,357-362,442-444`,
`src/components/insights/ReportCards.tsx:77,85-86`, `src/components/insights/AgentsPanel.tsx:44,137`;
`platform/api/routers/dashboard.py:166-203`; no test ids.

##### INSIGHTS-15 · State: permission

**Shows or does:** A state with three presentations, one of them out of reach. (1) `DataGate` wraps the body of every
tab (`src/routes/InsightsPage.tsx:199,248`) and, when a gated call has answered 401 and the user is signed out
(`blocked && !isLoading && !isSignedIn`), replaces it with `SignInEmptyState`, a `role="status"` block reading
`Sign in to load data` with a `Sign in` button that reloads the page
(`src/components/shared/SignInEmptyState.tsx:12-51,93-98`). The title, the tabs, the cutoff and the run controls sit
outside it (`InsightsPage.tsx:112-195`), and the page does not use `SignInBanner`. (2) The Agents tab reads a failure
of its own roster request, a 401 or 403 from the admin gate and every other status as well, as
`Admin access required to view per-agent routing.` (`src/components/insights/AgentsPanel.tsx:85-88`). (3) For a
signed-in user whose token is refused, `DataGate` does nothing, because `isSignedIn` is true.

The replacement is unreachable in practice. In `firebase` mode a signed-out user never sees the page: `AuthGate`
renders the sign-in screen in place of the app (`src/components/auth/AuthGate.tsx:14-30`; executed 2026-10-01 with
`/insights` opened signed out: the sign-in screen showed, there was no `AI Insights` heading and the only API request
was `GET /api/config/firebase`). In `open` and `iap` modes `useUser` reports signed in always
(`src/hooks/useUser.ts:25-27,81`), so `DataGate`'s condition cannot hold.

What a signed-in user sees on a 401 (executed 2026-10-01, `open` mode as the hermetic suite runs, every gated route
the page calls answering 401 `sign in to continue`): the shell's strip
`Your session expired, so live data is not loading.` with a `Sign in` button, `role="status"`, and the nav pill
`Session expired` (`src/components/shared/AuthStatusIndicator.tsx:23-33,156-182`, SHELL-16); on the page the Briefing
tab reads `Failed to load report: insights 401`, History `No history yet.`, Agents
`Admin access required to view per-agent routing.`, Watchlist `Failed to load watchlist: watchlist 401` and Chat,
after a message, `Error: 401 Unauthorized`; `Sign in to load data` appears nowhere. A refresh from the run controls
logs its 401 to the console only (INSIGHTS-07, `InsightsPage.tsx:86-89`, read). An add answered 401 reads
`Failed to add: HTTP 401: sign in to continue` under the search input (INSIGHTS-09, read: the message is built at
`src/hooks/useTickerSearch.ts:109-120` and drawn at `WatchlistPanel.tsx:353-358`, the same form executed with a 503),
and a search that fails shows nothing (executed with a 500). The flag behind the strip is set by the fetch wrapper on
any gated 401 and cleared by any later gated success (`src/lib/authedFetch.ts:155-166,247-250`,
`src/lib/authGate.ts:14-47`), so it follows the last answer (read).

**Needs:** The 401 itself. Every route the page calls is gated: staging answered 401 without a token to
`GET /api/insights/report/IWM`, `GET /api/insights/reports/{id}`, `GET /api/dashboard/brief/IWM`,
`GET /api/admin/routes`, `GET /api/insights/report/IWM/history?limit=20`, `GET /api/insights/watchlist?limit=10`,
`POST /api/insights/chat`, `POST /api/insights/report/IWM/refresh`, `GET /api/insights/runs/{id}`,
`GET /api/insights/ticker/search` and `POST /api/insights/watchlist/add`, and `GET /api/health` answered 200 in the
same run (V evidence, 2026-10-01). The admin gate: `_require_admin` answers 401 when the request carries no identity
and 403 for a signed-in user without the admin role (`platform/api/routers/admin.py:52-67`; executed with the real
handler: 401 with no identity, 403 for a signed-in non-admin, 200 for the admin). The wrapper's `OPEN_PREFIXES` must
match the backend's `_OPEN_API_PREFIXES` (CLAUDE.md, Auth).

**States:** This is the permission state of the Briefing, History, Agents, Watchlist and Chat bodies (INSIGHTS-01 to
INSIGHTS-05), whose gated calls the 401 blanks, of the run controls, whose refresh it fails silently (INSIGHTS-07), and
of the add, whose error line it fills (INSIGHTS-09).

**Acceptance criteria:**
- Given no token, then each gated route above answers 401 on staging and `GET /api/health` 200 (V evidence,
  2026-10-01).
- Given a signed-in user and a 401 on every call, then the shell shows its expired-session strip and each tab its
  error form, with no `Sign in to load data` and no sign-in prompt of its own (executed).
- Given an add answered 401, then `Failed to add: HTTP 401: sign in to continue` shows under the search input, and
  given a refresh answered 401, only the console logs it (read for the two statuses; the add's form executed with 503).
- Given a signed-out user in `firebase` mode, then the sign-in screen replaces the page and the page requests nothing
  (executed; the screen is asserted on `/dashboard` by `firebase mode, signed out → login screen blocks the app`,
  `tests/shared/auth-gate.spec.ts`, on main at eca7078).
- Given a gated 401, then the wrapper calls the callback registered with `setOnUnauthorized` and a 401 from an open
  path does not (`a 401 from a gated path fires onUnauthorized`,
  `a 401 from an OPEN path does not fire onUnauthorized`, `src/lib/authedFetch.test.ts`, on main); no code outside the
  tests registers one, so no behaviour hangs on it, and the flag behind the strip, set on the next line, is not read
  by that test.
- Given a request with no identity, then `GET /api/admin/routes` answers 401, and 403 for a signed-in non-admin
  (executed on the handler; `test_admin_requires_sign_in` and `test_admin_non_admin_user_403`, which skip in CI).

**Tests:** On main: `src/lib/authedFetch.test.ts` as above, `tests/api/test_platform_auth.py`
(`test_firebase_requires_valid_token`: a gated path answers 401 without a token in `firebase` mode and the open paths
200, on a synthetic `/api/secret` route and not on an insights route) and the sign-in screen test above. The admin
gate's 401 and 403 are asserted only in `tests/lib/test_routers_insights_admin.py`, which skips in CI. No test asserts
`DataGate`, the strip on this page, the page's 401 forms or a 401 on an insights route. Te stays unticked.

**Code:** `src/routes/InsightsPage.tsx:86-89,112-195,199,248`, `src/components/shared/SignInEmptyState.tsx:12-98`,
`src/components/auth/AuthGate.tsx:14-30`, `src/lib/authGate.ts:14-47`, `src/lib/authedFetch.ts:45,155-166,247-250`,
`src/hooks/useUser.ts:25-27,81-82`, `src/components/insights/AgentsPanel.tsx:85-88`,
`src/components/insights/WatchlistPanel.tsx:353-358`, `src/hooks/useTickerSearch.ts:109-120`,
`src/components/shared/AuthStatusIndicator.tsx:23-33,156-182`; `platform/api/routers/admin.py:52-67`; test ids
`auth-status`, `auth-status-banner` (the shell's); the page's own state has none.

### SCREEN-CATALYSTS — `/catalysts`

- **Purpose:** Earnings, economic events, news and SEC filings as trade context.
- **Matrix:** [03 § 10](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#10--catalysts)
- **Status:** Production but needs remediation · **Blocking issue:** [#863](https://github.com/TeneikaAskew/stocks/issues/863) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/CatalystsPage.tsx` (635 lines)
- **Child components:** `DateRangePicker`, `DataGate`
- **API calls (from source):** `/api/catalysts/events`, `/api/catalysts/types`
- **Stores:** `useThemeStore`, `useTickerStore`
- **E2E specs:** `tests/catalysts/catalysts.spec.ts`; the picker's viewport fit is also asserted by `tests/shared/popover-fit.spec.ts`
- **PR lineage:** [#624](https://github.com/TeneikaAskew/stocks/pull/624) earnings router origin · [#220](https://github.com/TeneikaAskew/stocks/pull/220) catalyst proximity · [#532](https://github.com/TeneikaAskew/stocks/pull/532) $-attribution
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/catalysts/events?date_from&date_to | source and events_by_date[date][].date/ticker/catalyst_type/title/event/impact/expected_impact/source/sentiment_score/sentiment_label are drawn; status, date_range, total and, per event, company_name/confirmed/details/relevance_score/url/items/primary_doc/accession_number/insiders/total_value/country/actual/forecast/previous are typed and never drawn (types: `CatalystsPage.tsx` CatalystEvent/CatalystsResponse; sample payload `buildCatalystEvents` in `src/mocks/catalysts.ts`) | the five reads of `_db_catalyst_events`, with no Benzinga (no key on either service): news_sentiment ← fetch-news-sentiment hourly 08:00-17:00 ET, fetch-news-sentiment-topics hourly at :05 and fetch-news-sentiment-earnings 06:00 ET, Mon-Fri, AlphaVantage NEWS_SENTIMENT; economic_events ← fetch-economic-events 07:00 ET Mon-Fri, ForexFactory and FRED; earnings_calendar ← fetch-earnings-calendar 19:00 ET Mon-Fri and Sun, AlphaVantage, Unusual Whales, Earnings Whispers and Yahoo, kept only to the fetch date plus 7 days; insider_transactions ← fetch-insider-transactions 07:00 ET Mon-Fri, AlphaVantage INSIDER_TRANSACTIONS; sec_filings ← fetch-sec-filings 07:00, 10:00, 13:00 and 17:00 ET Mon-Fri, SEC EDGAR | 5min staleTime, no polling; a range fetched under five minutes ago is served from the cache and only Refresh refetches it; news bounded to the last 48 hours regardless of the requested range; the answer carries no write time for any source | `useCatalystEvents` (inline in `CatalystsPage.tsx`) → Hot Now, Impact tier filter, Type chips, Event timeline |
| GET /api/catalysts/types | wsh_only_types[].label is drawn; benzinga_types, upgrade_note and each type's color and icon are typed and never drawn (types: `CatalystsPage.tsx` CatalystTypesResponse; `MOCK_CATALYST_TYPES` in `src/mocks/catalysts.ts`, whose `wsh_only_types` is empty) | static: the `BENZINGA_TYPES` and `WSH_ONLY_TYPES` dictionaries and a fixed note in `platform/api/routers/catalysts.py`, no table and no producer | 1hr staleTime | `useCatalystTypes` (inline in `CatalystsPage.tsx`) → WSH upgrade banner only; the type chips are built from the events and `TYPE_CONFIG` |
| store: ticker, theme | activeTicker (written by Open insight report), theme (the tones of badges and chips) | Zustand, persisted in the browser's localStorage: `ticker-store` (activeTicker and recentTickers) and `platform-theme` |  | Open insight report, Type chip colors |

#### Displayed
| ID | Element | Component |
|---|---|---|
| CATALYSTS-01 | Hot Now | inline in `CatalystsPage.tsx` (`hotEvents`) |
| CATALYSTS-02 | Impact tier filter | inline in `CatalystsPage.tsx` (`Min impact:` buttons, header H/M/L counters) |
| CATALYSTS-03 | Type chips | inline in `CatalystsPage.tsx` (`TYPE_CONFIG` and the types of the fetched events) |
| CATALYSTS-04 | Event timeline | inline in `CatalystsPage.tsx` (`DateGroup`, `EventRow`) |
| CATALYSTS-05 | WSH upgrade banner | `WSHUpgradeBanner` (inline in `CatalystsPage.tsx`, fed by `useCatalystTypes`) |

#### Actions
| ID | Action | What happens |
|---|---|---|
| CATALYSTS-06 | Change date range | `DateRangePicker`, default today−3 to today+14, with a `Today` reset and a Refresh button that refetches the same request. |
| CATALYSTS-07 | Filter by impact or type | Client-side `passes`: type, then minimum impact, applied to the timeline only; Hot Now ignores both filters. |
| CATALYSTS-08 | Expand an event | The title button toggles truncation; nothing else opens. |
| CATALYSTS-09 | Open insight report | `handleOpenTicker` sets `useTickerStore` and navigates to `/insights`, from the ticker button or the hover `View` button; `MACRO` rows have neither. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| CATALYSTS-10 | loading | present | A spinner with no label while `isLoading`; the header meanwhile reads "0 events", and Hot Now, the chips and the timeline are absent. |
| CATALYSTS-11 | empty | absent | No empty branch among the loading, error and timeline blocks: a range with no events shows only "0 events" and the filter bars. |
| CATALYSTS-12 | error | present | "Failed to load catalysts: Failed to fetch catalysts", the hook's one fixed message whatever the actual status. |
| CATALYSTS-13 | stale | absent | No stale branch: the header's `source` string (`Benzinga + DB (news + sec, <n>)`, `Benzinga` when absent) is the only provenance; the response carries no write time for any source. |
| CATALYSTS-14 | permission | not tracked (new category); present | `DataGate` wraps the body below the header and range controls; it cannot trigger in practice, and a signed-in user's 401 shows the shell's expired-session strip and the error box. |

#### Journeys
1. Plan the week: Opens /catalysts (CATALYSTS-01) → Reads Hot Now for today and tomorrow, ten rows at most, with news ahead of scheduled events (CATALYSTS-01) → Widens or narrows the range from its default of today minus 3 to today plus 14 (CATALYSTS-06), though the earnings calendar ends a week ahead → Filters to high impact only (CATALYSTS-02, CATALYSTS-07), which removes news, economic and 8-K rows and no earnings → Notes the dates to avoid holding through (CATALYSTS-04), past the cards dated before today
2. Investigate one event: Filters by type, earnings (CATALYSTS-03, CATALYSTS-07) → Expands an event, which shows its whole title and nothing more; the sentiment is on the row already (CATALYSTS-08) → Clicks the ticker, or the hover `View` button (CATALYSTS-09) → Lands on /insights with that ticker active, or on `No report yet` when the pipeline has none (CATALYSTS-09)
3. Range with nothing in it: Narrows the range to a quiet week (CATALYSTS-06) → The last 48 hours of news is still listed under its own dates, so the timeline is empty only when that news is empty too or a filter hides every row (CATALYSTS-04, CATALYSTS-07) → The header reads `0 events`, or still counts events over an empty timeline, and no explicit empty state is shown, a known gap (CATALYSTS-11)

#### Elements

In every body below, "executed 2026-10-01" means that the production rows were read through the stocks repo's
`db_query_cr.sh` job script (the handler's own five SELECTs for the page's default range, 2026-09-28 to 2026-10-15, and for
2026-09-18 to 2026-09-25, execution `db-query-5hlkw`, 08:14 ET; the freshness reads are `db-query-256dl`, 08:12 ET, and
`db-query-tzdxz`, 08:36 ET) and passed through the real `get_catalyst_events` and `get_catalyst_types` handlers on a starlette
`TestClient`, with only the database connection replaced by a function that returns those rows as a frame built the way
`pd.read_sql` builds one (`DataFrame.from_records`), the cached Benzinga file absent and `BENZINGA_API_KEY` unset as on the
deployed services, and that the page was rendered hermetically with those answers in a scratch copy of solyra at the
`8f76116` source, in a browser whose time zone was UTC unless a body says otherwise. "Executed on a throwaway Postgres 16"
means that the real SQL ran through the real `query_to_dataframe` over `pg8000` against tables with the real column types
holding rows written for the case. A variant payload (a held, failed, empty or 401 answer, an event with its optional fields
absent, the e2e fixture) is named where it is used; "mutation" means one product line changed in that scratch copy and the
committed specs run; "read" marks what was only read in the code, "counted in the response" what was computed from an answer
the page received, and "V evidence" the comment on stocks issue 1234 that the matrix links.

##### CATALYSTS-01 · Hot Now

**Shows or does:** A panel above the filters headed `Hot now` with the caption `high-impact, today + tomorrow`, drawn only
when it has a row (`hotEvents.length > 0`, `src/routes/CatalystsPage.tsx:520-541`; the selection is `:446-458`). It takes
every event of the answer dated today or tomorrow in Eastern time (`todayET()` and one day on, compared as strings with
the event's `date`), keeps those with impact High or Very High, sorts them by impact and then by date, and shows the
first ten as the same `EventRow` the timeline uses (CATALYSTS-04: dot, ticker button, badge, expandable title, arrow,
source, `View`). Both filters are ignored: neither Min impact nor a type chip changes it (executed, with each setting of
CATALYSTS-02 and CATALYSTS-03). Ties on impact and date keep the order the handler appended the events in, news first,
then economic, earnings, insider and 8-K (`platform/api/routers/catalysts.py:353-570`; JavaScript's sort is stable). With
no such event nothing is drawn, no message either; the panel is part of what `DataGate` replaces (CATALYSTS-14).

What the production answer draws (executed 2026-10-01): 61 events dated today (45) or tomorrow (16) are High
(counted in the response: today 30 earnings rows, 12 `EARNINGS_NEWS`, 2 `MERGER_ACQUISITION` and 1 `IPO`; tomorrow 12
earnings rows and 4 High economic events, `Employment Situation`, `Non-Farm Employment Change`, `Average Hourly
Earnings m/m` and `Unemployment Rate`). The panel drew ten, all of them `AV news` rows dated
today (GOOGL, NVDA, BSET, GNS, JBL, ADSE, ANSS, SNPS, MCK and CALM): none of today's 30 earnings reporters, none of
tomorrow's events. The same Synopsys headline fills two of the ten, once for ANSS and once for SNPS. The panel says
neither how many qualifying events there are nor that it stops at ten, and the dates it compares are not all ET days:
a news row is dated by the UTC day of its `published_ts`, so 19 of the 54 news rows dated 2026-10-01 were published
between 20:20 ET and midnight on 09-30 (V evidence).

**Needs:** The events request of CATALYSTS-04 (`GET /api/catalysts/events`), in particular the rows the handler tiers
High: every `earnings_calendar` row of the day (`catalysts.py:475`), news at relevance 0.9 and absolute sentiment 0.4
(`:394-398`), a high-importance `economic_events` row, an 8-K with item 1.01 or 2.01, and never an insider cluster
(Medium, `:519`). Production (V evidence, 2026-10-01, executions `db-query-256dl` and `db-query-5hlkw`): `earnings_calendar`
holds 49 rows for today (30 tickers; the table's newest `fetched_at` is the 19:00 ET run of 09-30) and 12 for tomorrow, `economic_events` four
high events for 10-02, and `news_sentiment` 54 qualifying rows dated 10-01, 15 of them High, newest 10:02 UTC.

**States:** Absent while the request loads, after it fails and for an answer with nothing High today or tomorrow, with no
message in any of the three (CATALYSTS-10 to CATALYSTS-12); no stale marker (CATALYSTS-13); inside `DataGate`
(CATALYSTS-14).

**Acceptance criteria:**
- Given High events dated today or tomorrow, when the page renders, then `Hot now` and its caption show at most ten of
  them (executed: 10 of 61; `renders Hot Now panel for today/tomorrow high-impact events` asserts that the header text
  and the AVGO headline are visible).
- Given more than ten, then the ten are the first by impact and date with ties in the handler's order, so news rows
  before scheduled events (executed: all ten were news rows dated today; matrix Gaps).
- Given Min impact or a type chip, then the panel does not change (executed with `High`, `Medium`, `Earnings`, `Economic`,
  `8-K` and `IPO`: ten rows each time).
- Given only Medium or Low events today and tomorrow, then no panel (read, `:451`; the executed run drew only High rows,
  and the Medium rows of today were not among them).
- Given an answer with no events, a failed request or a request still loading, then no panel (executed).
- Given a news row published after 20:00 ET, then it is dated the next day, so it can be listed as tomorrow's before
  the day has begun (read from the date rule, `catalysts.py:111`; counted in the production rows, V evidence).

**Tests:** On main one page test, `renders Hot Now panel for today/tomorrow high-impact events`
(`tests/catalysts/catalysts.spec.ts`), asserts that text matching `hot now` is visible and that the AVGO headline is
visible. The headline also sits in the timeline's today card, so `.first()` is satisfied without the panel's rows:
in a scratch copy of the page (2026-10-01) removing the panel failed it, keeping the header and removing the rows passed,
ignoring the today-and-tomorrow window passed it (`lists upcoming events` failed instead, because AAPL's headline then
appeared twice) and admitting Medium events passed. No test asserts the ten-row cap, the order, the exclusion of Medium events, that the
filters leave it alone or any handler-side tiering (`tests/api/test_catalysts_news_filter.py` covers `_news_sql` and the
topic list, `tests/api/test_route_coverage.py` the route's 200 against a dead backend). Te stays unticked.

**Code:** `src/routes/CatalystsPage.tsx:446-458,520-541`; `platform/api/routers/catalysts.py:353-570`; no test ids.

##### CATALYSTS-02 · Impact tier filter

**Shows or does:** Two things the Displayed table groups under one row. (1) The `Min impact:` bar, three buttons `All`,
`Medium` and `High` (`src/routes/CatalystsPage.tsx:543-561`, state `minImpact`, default `All`): `High` keeps events whose
impact is High or Very High, `Medium` keeps Medium and above (so it hides only Low), `All` keeps everything
(`passes`, `:431-436`). It filters the timeline only (CATALYSTS-04); Hot Now ignores it (CATALYSTS-01), and so does the
header. The selected button is told apart by colour alone: no `aria-pressed`. (2) The counters in the header line under
the title, `<n> events <h>H / <m>M / <l>L · <source>` (`:461-471,483-488`, drawn in capitals by the `label-micro` class):
`n` is every event of the answer, `h` those whose impact is High or Very High, `m` Medium and `l` every other label.
An event with no impact at all counts as Medium (`impactKey` defaults to `Medium`, `:67-73`), a label the page does not
know counts as `l` while the filter ranks it as Medium (`impactScore`, `:75-77`). The counters cover every fetched
event, independent of both filters, and include the news dated outside the range (CATALYSTS-04).

What the production answer draws (executed 2026-10-01): `1565 events 1113H / 287M / 165L ·
Benzinga + DB (news + sec, 1565)`, which equals the tiers in the answer (counted: 1,113 High, of which 897 are earnings
rows, 197 news rows, 14 economic and 5 8-K rows; 287 Medium; 165 Low, all news). `High` left 1,113 rows over 10 of the 13
cards, `Medium` 1,400 rows over 13 cards and `All` 1,565, and each click took 0.9 s to 1.6 s to redraw (sandbox
figures); the header and Hot Now did not change under any setting. Two events with no impact, drawn in the hermetic page,
read `2M`. Because every earnings row is High, `High` removes only news, economic and 8-K rows: 452 of 1,565.

**Needs:** The `impact` of each event, as the handler tiers it (CATALYSTS-04, CATALYSTS-01): earnings High; news High at
relevance 0.9 and absolute sentiment 0.4, Medium at 0.7 and 0.2, else Low (a NULL sentiment fails both and reads Low, executed on
a throwaway Postgres 16: the row is sent with `sentiment_score` null and impact `Low`); economic by importance; 8-K High
with item 1.01 or 2.01; insider always Medium. Production (V evidence, 2026-10-01): 638 news rows pass the page's filter,
206 of them High and 262 Medium by the same thresholds in SQL (the handler's dedupe leaves 197 and 255), none with a
NULL sentiment or relevance in the last 30 days (14,301 rows); the freshness of the five tables is in CATALYSTS-04.

**States:** The counters read `0 events 0H / 0M / 0L` while the request loads, after it fails and for an empty answer
(CATALYSTS-10 to CATALYSTS-12, executed); the buttons stay. No stale marker (CATALYSTS-13). The bar sits inside `DataGate`,
the header outside it (CATALYSTS-14).

**Acceptance criteria:**
- Given the production answer, then the header reads `1565 events 1113H / 287M / 165L` and the three numbers add up to
  the first (executed).
- Given `High`, then the timeline holds the High and Very High rows only and the header and Hot Now are unchanged
  (executed: 1,113 rows; `Min-impact filter restricts the timeline` asserts that the Medium `Investor Day` row leaves
  the timeline and `Q2 2026 Earnings` stays).
- Given `Medium`, then only Low rows leave (executed: 1,400 rows; asserted by no test).
- Given `All`, then every row returns (executed).
- Given an event with no impact, then it counts as Medium in the header (executed: two such events read `2M`) and passes
  `Medium` (read, `impactScore`); the handler always sets an impact for the events it builds.

**Tests:** On main two page tests in `tests/catalysts/catalysts.spec.ts`: `renders impact tier counters in header`
asserts that text matching `\d+\s*events` and `\d+H\s*/\s*\d+M\s*/\s*\d+L` is visible, a shape and no number
(in a scratch copy of the page, 2026-10-01, counting every High event as zero passed it), and `Min-impact filter
restricts the timeline` asserts that after `High` is clicked the Medium `Investor Day` row is gone from the timeline
and `Q2 2026 Earnings` is visible (ignoring the `High` setting in a scratch copy failed it, ignoring the `Medium`
setting passed). Nothing asserts the counters' values or the `Medium` setting. The
tiering is asserted on the handler side by no test (the handler's mapping is not run by `tests/api/test_catalysts_news_filter.py`,
and `tests/api/test_route_coverage.py` pins only the route's 200 against a dead backend). Te stays unticked.

**Code:** `src/routes/CatalystsPage.tsx:60-77,403-404,431-436,461-471,483-488,543-561`;
`platform/api/routers/catalysts.py:394-398,434,475,519,559-565`; no test ids.

##### CATALYSTS-03 · Type chips

**Shows or does:** A row of chips under the Min impact bar, drawn only when the answer has an event with a type
(`allTypes.size > 0`, `src/routes/CatalystsPage.tsx:474-475,563-604`): `All Types` and one chip per `catalyst_type`
present in the fetched events, sorted by the raw type key and not by label, each labelled `TYPE_CONFIG[type]?.label`
or, for a type the table does not list, the raw key (`INSIDER_BUY` and `INSIDER_SELL` have no entry,
`TYPE_CONFIG` `:120-145`). A click selects that type (`activeFilter`), a second click on it or a click on `All Types`
clears it; one type at a time, and it combines with Min impact (CATALYSTS-02, CATALYSTS-07). The chips are built from the
events and the page's own table: `useCatalystTypes` (`GET /api/catalysts/types`) feeds only the Wall Street Horizon
banner (CATALYSTS-05), and the chips draw nothing from it. A selected chip takes the type's tone as its background with
white text; the selection is shown by colour alone, no `aria-pressed`.

What the production answer draws (executed 2026-10-01): `All Types`, `Earnings`, `Earnings News`, `Economic`,
`IPO`, `M&A`, `News` and `8-K`, in the order of the raw keys `EARNINGS`, `EARNINGS_NEWS`, `ECONOMIC`, `IPO`,
`MERGER_ACQUISITION`, `NEWS_CATALYST`, `SEC_8K`, over 897, 393, 44, 4, 48, 163 and 16 events (counted in the response).
`Economic` mixes the 35 calendar rows, which show `MACRO`, with 9 news rows typed `ECONOMIC` by their topic, which show a
ticker. `Earnings` left 897 rows over 8 cards, `Economic` with `High` 18 rows over 5 cards, `8-K` 16 rows over 3 and
`8-K` with `High` 5; the header and Hot Now did not change. For the range 2026-09-18 to 2026-09-25 a chip `INSIDER_BUY`
appears with the raw key. A selection outlives its type: with `INSIDER_BUY` selected and the range set back to the
default, which has no cluster, no chip was selected, `All Types` was not highlighted, the timeline held no row and the header
still counted 1,565 events (executed). A selected chip of a type with no `TYPE_CONFIG` entry has white text and no
background (executed in the light theme: `rgb(255, 255, 255)` on a transparent button over a near-white page, where a
selected `Earnings` chip is white on red).

**Needs:** The `catalyst_type` of each event as the handler sets it (CATALYSTS-04): `EARNINGS`, `EARNINGS_NEWS`,
`MERGER_ACQUISITION`, `IPO`, `ECONOMIC`, `NEWS_CATALYST`, `INSIDER_BUY`, `INSIDER_SELL` and `SEC_8K` (`catalysts.py:384-393`, `:432`, `:473`, `:507`, `:563`), plus Benzinga's own types when a key is set (none is). Production (V
evidence, 2026-10-01): the same five tables as CATALYSTS-04; seven of the nine types occur in the default range.

**States:** No chips while the request loads, after it fails and for an empty answer (CATALYSTS-10 to CATALYSTS-12,
executed); no stale marker (CATALYSTS-13); inside `DataGate` (CATALYSTS-14).

**Acceptance criteria:**
- Given the production answer, then the chips are `All Types, Earnings, Earnings News, Economic, IPO, M&A, News, 8-K`
  (executed; `shows filter chips` asserts only that text matching `earnings` is visible, which the AAPL row's badge and
  title also satisfy).
- Given a type chip, when it is clicked, then the timeline keeps that type's rows and the header and Hot Now stay
  (executed: `Earnings` 897 rows; asserted by no test).
- Given the active chip, when it is clicked again or `All Types` is, then every row returns (executed).
- Given a type with no label in `TYPE_CONFIG`, then its chip and badge show the raw key (executed: `INSIDER_BUY` shows
  as its raw key; matrix Gaps).
- Given a selected type that the next answer lacks, then the selection stays with no visible sign (executed; matrix Gaps).

**Tests:** None asserts the row: `shows filter chips` (`tests/catalysts/catalysts.spec.ts`) mounts the page and
asserts that text matching `earnings` is visible (first match), and in a scratch copy of the page (2026-10-01) removing the
whole chip row left every test of the spec passing; ignoring the type filter in `passes` passed too
(the page tests never click a chip). The handler's types are asserted by no test. Te stays unticked.

**Code:** `src/routes/CatalystsPage.tsx:97-145,403,431-441,474-475,563-604`; `platform/api/routers/catalysts.py:384-393`;
no test ids.

##### CATALYSTS-04 · Event timeline

**Shows or does:** The list below the filters: one card per date in the answer's `events_by_date`, oldest date first,
each with its rows (`filteredDates`, `src/routes/CatalystsPage.tsx:438-441`; `DateGroup`, `:313-352`; `EventRow`,
`:255-311`). The page never reads the requested range: it draws every date the answer holds. A card is headed by the
date as `Mon, Sep 28, 2026` (`formatDate`, `:190-193`), a `TODAY` pill and a ring on today's card (ET,
`getRelativeLabel`, `:195-205`) and `<relative> · <n> events` (`3 days ago`, `YESTERDAY`, `TODAY`, `TOMORROW`,
`in 4 days`; the noun is always `events`, so a card of one reads `1 events`). Rows inside a card sort by impact (Very
High, High, Medium, Low), then by ticker (`:320-325`). A row shows, left to right, an impact dot (colour by tier, with
a title and an `aria-label` of `<tier> impact`), the ticker as a button or the text `MACRO` for a macro or tickerless
event (CATALYSTS-09), a type badge (`TYPE_CONFIG`; an unlisted type shows its raw key, an absent one `other`), the title
as a button that expands it (CATALYSTS-08; `title`, else `event`, else `<ticker> <type>`), a sentiment arrow and its
absolute value when `sentiment_score` is a number of 0.1 or more in size (`▲` green above zero, `▼` red below, tooltip
`Sentiment 0.80 (Somewhat-Bullish)`, `:239-253`), the event's `source` string from the `md` breakpoint up, and a `View`
button that appears on hover (CATALYSTS-09). Everything sits inside `DataGate` (CATALYSTS-14).

What the production answer draws (executed 2026-10-01, the default range 2026-09-28 to 2026-10-15): 1,565
events in 13 cards, 299 on 09-28, 521 on 09-29, 583 on 09-30, 88 today, 17 tomorrow, then 17, 21, 8, 2, 1, 1, 2 and 5
on the later dates. 1,403 of the 1,565 (90%) are dated before today, so today's card is the fourth and the page does
not scroll to it. All 1,565 rows are in the page at once, with no paging or virtualisation (1,575 `EventRow`s with the
ten of Hot Now); in the hermetic page the first paint of that answer took 3.4 s and a filter click 0.9 s to 1.6 s
(sandbox figures, not production latency). By source: 897 earnings rows (`AV earnings_calendar`), 617 news rows
(`AV news`), 35 economic rows (`FRED/Calendar`, `MACRO`) and 16 8-Ks (`SEC EDGAR`), no insider cluster.

- **An earnings row** reads `<company> earnings (<time>, est <eps>)` (`catalysts.py:467-474`): 785 of the 897 titles read
  `est nan` (a NULL `eps_estimate` reaches the title as NaN, see the matrix Gaps) and 323 read `unknown` as the time.
- **A news row** carries the headline cut at 200 characters, the arrow when the score is 0.1 or more in size (550 of the 617; the
  other 67 show none) and the source `AV news`; a headline tagged to several tickers is one row per ticker (111
  headlines fill 262 of the 617 rows).
- **An economic row** is `MACRO` with the event name and the source `FRED/Calendar`; nine news rows typed `ECONOMIC`
  carry a ticker instead.
- **An 8-K row** is a title that starts `8-K` and lists the item labels (`Material Definitive Agreement`,
  `Officer Departure / Election`, `Reg-FD Disclosure`, ...), 5 High and 11 Medium.
- **An insider row** exists only when the range reaches a cluster: none for 2026-09-28 to 2026-10-15, and for
  2026-09-18 to 2026-09-25 three rows, `10 insiders buying ~$0.0M`, `3 insiders buying ~$nanM` and
  `8 insiders buying ~$0.0M` with the raw badge `INSIDER_BUY` (`TYPE_CONFIG` has no entry for it).

The answer also carries `url`, `relevance_score`, `items`, `primary_doc`, `accession_number`, `insiders`,
`total_value`, `country`, `actual`, `forecast` and `previous`, typed at `:21-58` and never drawn: no row links to its
article or filing (executed: the page's only anchors are the three navigation links and the Wall Street Horizon link),
and an economic row shows no actual, forecast or previous.

**Needs:** `GET /api/catalysts/events?date_from=<today minus 3>&date_to=<today plus 14>` (ET dates computed once when the
page mounts, `:396-397`), cached for five minutes and never polled (`useCatalystEvents`, `:159-174`), answered by
`get_catalyst_events` (`platform/api/routers/catalysts.py:158-328`). Neither service has a `BENZINGA_API_KEY` variable (read
2026-10-01) and the image holds no cached Benzinga file (`platform/Dockerfile:40-45`), so the answer is
the five reads of `_db_catalyst_events` (`:334-572`), each caught on its own and merged after the Benzinga list:

| read | filter | rows become | tier |
|---|---|---|---|
| `news_sentiment` (`:353-410`) | `published_ts` in the last 48 hours from now, relevance 0.7 or more, one of seven topics (case-insensitive, `_news_sql` `:101-121`), the range ignored | one per ticker, day (`published_ts::date`, a UTC day) and headline; type by topic (`MERGER_ACQUISITION`, `IPO`, `ECONOMIC`, `EARNINGS_NEWS`, else `NEWS_CATALYST`) | High at relevance 0.9 and absolute sentiment 0.4, Medium at 0.7 and 0.2, else Low (`:394-398`) |
| `economic_events` (`:412-440`) | `event_date` in the range, importance high or medium | `MACRO`, type `ECONOMIC`, with country, actual, forecast and previous | High for `high`, else Medium |
| `earnings_calendar` (`:442-477`) | `earnings_date` in the range; one row per ticker and day, the first one read | `EARNINGS`, `<company> earnings (<time>, est <eps>)` | always High (`:475`) |
| `insider_transactions` (`:479-523`) | `transaction_date` in the range, three or more distinct insiders on one side of one ticker and day | `INSIDER_BUY` (`A`) or `INSIDER_SELL`, `<n> insiders buying ~$<x>M` | always Medium (`:519`) |
| `sec_filings` (`:525-570`) | `filing_date` in the range, form 8-K, an item among 1.01, 2.01, 5.02, 7.01, 8.01 | `SEC_8K`, `8-K` plus the item labels | High with item 1.01 or 2.01, else Medium |

Within a date the events keep the order of those reads, news first, then economic, earnings, insider and 8-K; the answer
names its provenance as `Benzinga + DB (news + sec, <n>)` (CATALYSTS-13). Producers (read in `gcp/deploy.sh` and the
fetchers, and each trigger and the latest execution of each job read from GCP on 2026-10-01, V evidence):
`news_sentiment` by `fetch-news-sentiment` (`news-sentiment-hourly`, `0 8-17 * * 1-5`), `fetch-news-sentiment-topics`
(`news-topics-hourly`, `5 8-17 * * 1-5`) and `fetch-news-sentiment-earnings` (`news-sentiment-earnings-0600`,
`0 6 * * 1-5`), all `gcp.fetchers.fetch_news_sentiment` against AlphaVantage NEWS_SENTIMENT, plus the unscheduled
`backfill-ticker`, `gcp/fetchers/fetch_rss_news.py` (no job and no trigger) and `scripts/backfill_news_sentiment.py`;
`economic_events` by `fetch-economic-events` (`economic-events-daily`, `0 7 * * 1-5`; ForexFactory's weekly feeds and
the FRED release dates); `earnings_calendar` by `fetch-earnings-calendar` (`daily-earnings-refresh-calendar`
`0 19 * * 1-5` and `weekly-earnings-refresh-calendar` `0 19 * * 0`; AlphaVantage EARNINGS_CALENDAR, Unusual Whales,
Earnings Whispers and Yahoo, and it keeps only `today minus 1` to `today plus 7`,
`scripts/fetch_earnings_calendar.py:1534-1549`), with `evaluate-ew-strikes` writing only its `ew_*` columns;
`insider_transactions` by `fetch-insider-transactions` (`insider-transactions-daily`, `0 7 * * 1-5`; AlphaVantage
INSIDER_TRANSACTIONS); `sec_filings` by `fetch-sec-filings` (`sec-filings-intraday`, `0 7,10,13,17 * * 1-5`; SEC EDGAR
submissions). Every trigger runs in America/New_York and was ENABLED.

Production (V evidence, 2026-10-01 08:12 ET, executions `db-query-256dl`, `db-query-5hlkw` and `db-query-tzdxz`):
`news_sentiment` 225,356 rows, newest `published_ts` 10:02:50 UTC and newest `inserted_at` 12:01:22 UTC, the minute the
08:00 ET job finished (638 rows pass the page's filter, 247, 337 and 54 for the UTC dates 09-29, 09-30 and 10-01);
`economic_events` 3,042 rows to 2026-10-30, 35 high or medium in the range (14 high, 21 medium); `earnings_calendar`
63,647 rows, newest `fetched_at` 2026-09-30 23:00:38 UTC (the 19:00 ET run) and `earnings_date` to 2026-10-07, 1,022
rows in the range over 8 dates; `insider_transactions` 1,814,432 rows, newest `transaction_date` 2026-09-23 and newest
`inserted_at` 11:03:50 UTC today, no cluster in the range (the newest is 2026-09-23); `sec_filings` 4,730 rows, newest
`filing_date` 2026-10-01, 16 8-Ks with a material item in the range (2, 8 and 6 on 09-28, 09-29 and 09-30).

**States:** Loading, empty, error, stale and permission are CATALYSTS-10 to CATALYSTS-14: the timeline is blank while the
request loads and after it fails (CATALYSTS-10, CATALYSTS-12), draws nothing and no message for an answer with no events
(CATALYSTS-11), carries no marker of how old any source is (CATALYSTS-13), and is replaced by `Sign in to load data` in
the one case CATALYSTS-14 describes.

**Acceptance criteria:**
- Given the production answer, when the page renders, then 13 cards sit oldest first with the labels `3 days ago`,
  `2 days ago`, `YESTERDAY`, `TODAY`, `TOMORROW` and `in 4 days` to `in 14 days`, the `TODAY` pill on the fourth
  (executed; the 1,403 events before today are counted in the response).
- Given a card, then its rows sort by impact and then ticker (read, `:320-325`; the first row of today's card was
  `ACN`, the first High ticker, executed).
- Given a news row with a score of 0.1 or more in size, then an arrow and the score show, `▲` for a positive one, and none
  shows below 0.1 (`news rows show a sentiment indicator` asserts that a `▲` is visible for the fixture's one bullish
  row; executed on 617 production rows: 550 with an arrow, 67 without).
- Given an event with no ticker or `MACRO`, then the ticker cell is the text `MACRO` and offers no link (executed;
  CATALYSTS-09).
- Given the answer holds news dated outside the requested range, then those cards are drawn (executed: for the range
  2026-09-18 to 2026-09-25 the same 617 news rows, dated 09-29 to 10-01, were drawn after the range's last day; matrix
  Gaps).
- Given an earnings row whose estimate is NULL, then the title should say the estimate is missing; it reads `est nan`
  (executed on a throwaway Postgres 16 through `pg8000` and on 785 of 897 production rows; matrix Gaps).
- Given an insider cluster with no traded value, then the title reads `~$0.0M`, and `~$nanM` when every value is NULL
  (executed on production clusters and on a throwaway Postgres 16; matrix Gaps).
- Given a range that no cluster falls in, then no insider row shows (executed: none for 2026-09-28 to 2026-10-15, whose
  window the newest cluster, 2026-09-23, precedes; matrix Gaps).

**Tests:** On main two page tests, both from `tests/catalysts/catalysts.spec.ts`: `lists upcoming events` asserts that text
matching `AAPL` (first match) and `Q2 2026 Earnings` are visible, the fixture's earnings row four days ahead, and `news
rows show a sentiment indicator` that a `▲` is visible (first match). Mutations of a scratch copy of the page
(2026-10-01) show what that buys: removing the timeline fails the first (and `Min-impact filter restricts the timeline`), reversing the
arrows fails the second, and drawing the cards newest first passed. The mapping of the five
reads (tiers, titles, the dedupe, the order) is asserted by no test: `tests/api/test_catalysts_news_filter.py` covers
`_news_sql` and the topic list (`test_news_sql_is_backward_looking_and_case_insensitive`,
`test_news_topics_constant_covers_fetcher_topics`), `tests/api/test_route_coverage.py` pins the route's 200 against a dead
backend (`:325`, no body) and the threadpool tests replace `_db_catalyst_events` altogether. The producers have their
own tests (`tests/gcp/test_fetch_economic_events.py`, `tests/gcp/test_fetch_earnings_calendar_persist.py`,
`tests/gcp/test_fetch_earnings_calendar_yahoo.py`, `tests/gcp/test_fetch_news_sentiment_args.py`,
`tests/gcp/test_fetch_news_sentiment_explode.py`, `tests/gcp/test_fetch_news_sentiment_incremental.py`,
`tests/gcp/test_sec_filings_retry.py`, `tests/gcp/test_phase2_fetchers.py`), none of which reads this route.
`tests/api/test_earnings_router.py` tests `/api/earnings/*`, which no solyra source calls and this page does not read.
Te stays unticked: the page tests assert one row and one arrow and nothing asserts the handler's mapping.

**Code:** `src/routes/CatalystsPage.tsx:21-58,67-81,159-174,190-205,226-253,255-352,396-397,425-441,618-628`;
`platform/api/routers/catalysts.py:101-121,158-328,334-572`; no test ids.

##### CATALYSTS-05 · WSH upgrade banner

**Shows or does:** A dashed-border card under the timeline (`WSHUpgradeBanner`, `src/routes/CatalystsPage.tsx:354-390`,
mounted at `:630-631`): a lock, the heading `Wall Street Horizon Upgrade`, the sentence
`These event types require WSH via IBKR TWS API ($49-149/mo):`, one locked, theme-neutral chip per entry of the answer's
`wsh_only_types` (the server's hex colours are not used, `:367-369`) and a `Learn more about WSH` link to
`https://www.wallstreethorizon.com/ibkr-wsh` (`target="_blank"`, `rel="noopener noreferrer"`). It draws whenever the
types request has answered, whether or not the events have (`if (!types) return null`, `:355`), so it also shows while the
events load, after they fail and for an empty answer (executed). The price and the product name are written in the page,
not read from the answer: `upgrade_note`, `benzinga_types` and each type's `color` and `icon` are typed
(`CatalystTypesResponse`, `:91-95`) and never drawn. It is inside `DataGate` (CATALYSTS-14).

What the real handler's answer draws (executed 2026-10-01: `get_catalyst_types` through a starlette `TestClient`, the page
rendered with it): the three chips `Production Update`, `Interim Statement` and `Sales Update`, the link as above. The
e2e fixture's `MOCK_CATALYST_TYPES` has `wsh_only_types: {}`, which draws the card with the sentence and the link and no
chip (`src/mocks/catalysts.ts:121-130`, executed). When the types request fails (a 500 or a 401) the card is absent,
with no error and nothing else on the page changed (executed: two requests, the retry, then nothing).

**Needs:** `GET /api/catalysts/types`, cached for an hour (`useCatalystTypes`, `:176-186`), answered by
`get_catalyst_types` (`platform/api/routers/catalysts.py:773-787`) from the module's `BENZINGA_TYPES` and `WSH_ONLY_TYPES`
dictionaries (`:50-78`) and a fixed note: no table and no producer, no vendor on the request path. The link goes to the
vendor's site, and the vendor's own wording of the price ($49-149/mo) is copied into the page without a check: not checked
here. The link answered HTTP 200 from the sandbox on 2026-10-01 (`curl`, no redirect). Staging answers the types route 401
without a token (V evidence, 2026-10-01); the route is gated, so the static answer cannot be read without a session.

**States:** Absent until the types request answers and when it fails, with no message; unaffected by the events request
(CATALYSTS-10 to CATALYSTS-12); no stale marker, the content being static (CATALYSTS-13); inside `DataGate` (CATALYSTS-14).

**Acceptance criteria:**
- Given the types request has answered, then the card shows the heading, the sentence, one chip per `wsh_only_types`
  entry and the link, with the events loading, failed or empty as well as loaded (executed).
- Given the real answer, then the chips read `Production Update`, `Interim Statement` and `Sales Update` (executed on
  `get_catalyst_types`).
- Given the link, then it opens `https://www.wallstreethorizon.com/ibkr-wsh` in a new tab with `rel="noopener noreferrer"`
  (executed in the page; the target answered 200).
- Given the types request fails, then no card and no error text (executed).
- Given `upgrade_note`, then the page does not draw it (executed: the note is absent from the card; matrix Gaps).

**Tests:** None asserts the card. On main `GET /api/catalysts/types` is pinned at 200 against a dead backend by
`tests/api/test_route_coverage.py` (`Req("GET", "/api/catalysts/types", 200)`, `:329`, no body asserted), and removing the
card from a scratch copy of the page (2026-10-01) left every test of `tests/catalysts/catalysts.spec.ts` passing. Te stays
unticked.

**Code:** `src/routes/CatalystsPage.tsx:91-95,176-186,354-390,630-631`; `platform/api/routers/catalysts.py:50-78,773-787`;
`src/mocks/catalysts.ts:121-130`; no test ids.

##### CATALYSTS-06 · Change date range

**Shows or does:** Three controls in the header, right of the title (`src/routes/CatalystsPage.tsx:491-516`), all outside
`DataGate`. (1) `DateRangePicker` (`src/components/shared/DateRangePicker.tsx`, test id `date-range-picker`): one button
that shows `Sep 28` and `Oct 15` with an en dash between them and opens a dialog (`role="dialog"`, `aria-label="Select date range"`) holding a one-month
`RangeCalendar` (`aria-label` `Catalyst date range, <month>`), with `Cancel` and `OK` (test id `date-range-apply`). Clicking two days makes a draft; `OK` applies it, `Cancel`, Escape or a click outside
drop it. The default is today minus 3 to today plus 14 in Eastern time, taken once when the page mounts
(`:396-397`). (2) `Today` (`:500-506`), title `Reset to default range (today-3 → today+14)`, which sets that default again
from the current ET date. (3) `Refresh` (`:507-514`), which refetches the request of the range in force
(`handleRefresh`, `:416-420`), is disabled while that runs or while the first load is pending (`:509`) and spins its icon.

A new range is a new request, `GET /api/catalysts/events?date_from=<from>&date_to=<to>`, and a new cache key
(`['catalysts', from, to, false]`, `:161`): the page keeps no earlier answer on screen while it loads, so Hot Now, the chips
and the timeline vanish, the header reads `0 events 0H / 0M / 0L · Benzinga` and a spinner shows until the answer comes
(executed: held request, CATALYSTS-10). `Today` back to a range that is cached and under five minutes old makes no
request (executed: the default range, left and returned to, with zero new requests); `Refresh` always does, with the same
parameters and never `refresh=true` (the hook is called with `false`, `:406`, so the handler's Benzinga refresh cannot be
reached from the page, stocks#1223). The range bounds the Benzinga list and four of the five database reads, not the
news (CATALYSTS-04), and the page draws whatever dates come back.

The trigger and the dialog's header label each day as `<month> <day>` from a `CalendarDate` turned into midnight Eastern
and formatted in the browser's own zone (`fmtShort`, `DateRangePicker.tsx:10-15`), so in a browser west of New York the
label is a day early: for the request `date_from=2026-09-28&date_to=2026-10-15` a Los Angeles browser showed `Sep 27` and `Oct 14`
(executed with `timezoneId: 'America/Los_Angeles'`; the calendar's own cells stay right). Nothing limits the range's
length.

**Needs:** The events request of CATALYSTS-04 for the picked dates. A range after the calendar's reach returns the news
and economic events and no earnings: `earnings_calendar` holds rows only to the fetch date plus 7 days
(`scripts/fetch_earnings_calendar.py:1534-1549`; the newest is 2026-10-07), so the default range's second week held 11
events, all economic (executed 2026-10-01, V evidence). The insider read returned three clusters for 2026-09-18 to
2026-09-25 and none for the default range (executed).

**States:** While a new range loads: CATALYSTS-10; after it fails: CATALYSTS-12; for a range with no events:
CATALYSTS-11. A type chip selected before the change stays selected whether or not the new answer has that type
(CATALYSTS-03, executed). `Refresh` is disabled while a request runs and enabled after a failure (executed).

**Acceptance criteria:**
- Given the page just mounted, then the range is today minus 3 to today plus 14 and the request carries those dates
  (executed: `?date_from=2026-09-28&date_to=2026-10-15`; asserted on this branch).
- Given two days picked and `OK`, then the trigger shows the new range and exactly one request carries it (executed:
  `?date_from=2026-10-05&date_to=2026-10-09`; asserted on this branch).
- Given a draft and `Cancel`, then the range, the label and the requests stay as they were (executed; asserted on this
  branch).
- Given a changed range and `Today`, then the default range returns, and no request is made while its answer is cached
  and fresh (executed: zero requests; the label is asserted on this branch).
- Given `Refresh`, then the same range is requested again without `refresh` (executed).
- Given a browser west of New York, then the trigger's label should name the requested days; it names the day before
  (executed in Los Angeles; matrix Gaps).

**Tests:** On main `tests/shared/popover-fit.spec.ts` (`date-range picker stays on screen (Catalysts)`, at 390 px and
411 px, on main at eca7078) opens the picker and asserts that the dialog is visible and inside the viewport; it picks
nothing. In a scratch copy of the page (2026-10-01) making `onChange` do nothing, or `Today` do nothing, left every test of
`tests/catalysts/catalysts.spec.ts` and that test passing. On this branch (solyra commit 7690974, not yet run in CI)
`OK requests the picked range, Cancel discards it and Today restores the default`
(`tests/catalysts/catalysts.spec.ts`, browser pinned to America/New_York) asserts the default range's two dates in the
first request and the trigger's label, that a picked range followed by `Cancel` leaves the label and the request count
alone, that `OK` sends one request with the picked `date_from` and `date_to` and shows them, and that `Today` restores
the default label; it does not assert `Refresh`, the loading blank or the label in another time zone. Te stays unticked:
the row's only range-changing assertion is a test added on this branch, which waits for a CI run that includes it.

**Code:** `src/routes/CatalystsPage.tsx:159-174,396-406,416-420,491-516`;
`src/components/shared/DateRangePicker.tsx:10-15,29-151`; `scripts/fetch_earnings_calendar.py:1534-1549`; test ids `date-range-picker`, `date-range-apply`.

##### CATALYSTS-07 · Filter by impact or type

**Shows or does:** The two filters of CATALYSTS-02 and CATALYSTS-03 acting together on the fetched events. `passes`
(`src/routes/CatalystsPage.tsx:431-436`) rejects an event whose `catalyst_type` is not the selected chip, then one whose
impact is below the Min impact setting; `filteredDates` (`:438-441`) applies it to each date's events, drops a date left
with none and keeps the dates in ascending order, and the timeline draws what is left (CATALYSTS-04). The filters change the
timeline and nothing else: Hot Now (`:446-458`), the header counters (`:461-471`) and the chips (`:474-475`) are computed
from every event. The two settings are page state (`:403-404`), not stored and not in the URL: they survive a change of
range (CATALYSTS-03, executed) and are lost when the page is left (executed: once the Insights page had rendered, the browser's back button returned
to `All` and `All Types` with the cached answer and no request; the range, held in the same kind of state, `:396-404`,
is read as back at its default).

What a combination does on the production answer (executed 2026-10-01): `High` 1,113 of 1,565 rows; `Medium`
1,400; `Earnings` 897 over 8 cards; `Economic` with `High` 18 rows over 5 cards; `8-K` 16 rows over 3 cards, with `High`
5; `IPO` with `High` 2. Every click redrew the timeline in 0.9 s to 1.6 s (sandbox figures). A combination that excludes
every row draws no row and no message while the header still counts all 1,565 events.

**Needs:** The fetched events (CATALYSTS-04); no request of its own.

**States:** Always available once the page has mounted: the bars show while the request loads and after it fails
(CATALYSTS-10, CATALYSTS-12); a combination with no row is the empty timeline of CATALYSTS-11 without its header change;
inside `DataGate` (CATALYSTS-14).

**Acceptance criteria:**
- Given a Min impact setting and a chip, when both are set, then a row must pass both (executed: `Economic` and `High`,
  18 rows).
- Given only a chip, then the timeline holds that type's rows (executed: `Earnings`, 897).
- Given only `High` or `Medium`, then the timeline holds the events at or above it (executed: 1,113 and 1,400; `Min-impact
  filter restricts the timeline` asserts that `High` removes the Medium `Investor Day` row and keeps `Q2 2026 Earnings`).
- Given `All` and `All Types`, then every row returns (executed).
- Given any setting, then Hot Now, the header counters and the chips are unchanged (executed).
- Given a combination that leaves nothing, then the timeline is empty, without a message (executed; matrix Gaps).
- Given the range changed, then the settings stay, and given the page left and re-entered, then they reset to `All` and
  `All Types` (executed, here and in CATALYSTS-03).

**Tests:** On main one page test, `Min-impact filter restricts the timeline` (`tests/catalysts/catalysts.spec.ts`):
it clicks `High`, asserts that no element matches `Investor Day` (the fixture's one Medium row, in the timeline only) and
that `Q2 2026 Earnings` is visible (first match). In a scratch copy of the page (2026-10-01) ignoring the `High` setting
failed it, ignoring the `Medium` setting passed, and so did ignoring the type filter (no page test clicks a chip), and
the `High` test cannot see Hot Now or the counters not changing. Nothing asserts a chip filter, the combination, the
`Medium` setting or the empty combination. Te stays unticked: half of the row, the type filter, has no assertion.

**Code:** `src/routes/CatalystsPage.tsx:403-404,431-441,446-458,461-475,543-604`; no test ids.

##### CATALYSTS-08 · Expand an event

**Shows or does:** In every row the title is a button (`type="button"`, `aria-expanded`, `title` `Show full title` or
`Collapse details`, `src/routes/CatalystsPage.tsx:278-292`) that toggles that row's `expanded` state (`:260`). Collapsed,
the title is one truncated line (`truncate`); expanded, it wraps over as many lines as it needs (`break-words`) and the
chevron turns 180 degrees. Nothing else opens: no panel, no link, no field the row did not already show (the `url`,
`actual`, `forecast`, `previous`, the insider value and the 8-K items the answer carries are never drawn, matrix Gaps),
so `Collapse details` promises more than the control does. On a title that fits its row, expanding changes nothing you can
see (executed: a row's height was 37 px before and after, for two titles that fit at 1280 px); below the `sm` breakpoint the
title takes a line of its own at the end of the row (`order-last basis-full`, `:283`).

The state belongs to one rendered row. The same event appears in Hot Now and in its date card as two rows that toggle
independently (executed: expanding the Hot Now copy of GOOGL left the timeline copy collapsed), and a row that a filter
removes and restores comes back collapsed (executed: an expanded McKesson row after `Economic` and then `All Types`).

**Needs:** Nothing: client state over the title the row already has.

**States:** None of its own. Rows exist only with data, so loading, empty and error (CATALYSTS-10 to CATALYSTS-12) have
none to expand, and under permission (CATALYSTS-14) they are replaced.

**Acceptance criteria:**
- Given a collapsed title, when it is clicked, then `aria-expanded` is `true`, the `title` reads `Collapse details`, the text
  wraps (`break-words`) and the chevron turns (executed; `an event title toggles its own expanded state on click`, added
  on this branch, asserts `aria-expanded` and the `title`, not the wrapping or the chevron).
- Given an expanded title, when it is clicked again, then it collapses (executed; asserted on this branch).
- Given the same event in Hot Now and in the timeline, then expanding one leaves the other collapsed (executed; asserted on
  this branch).
- Given a row removed by a filter and restored, then it is collapsed (executed).
- Given an expansion, then nothing but the title changes: no link and no new field appears (executed; matrix Gaps).

**Tests:** None on main: in a scratch copy of the page (2026-10-01) making the toggle do nothing left every test of
`tests/catalysts/catalysts.spec.ts` passing, so nothing asserts the control, only the rendering of the rows that hold it. On
this branch (solyra commit 7690974, not yet run in CI) `an event title toggles its own expanded state on click` asserts the above on the
fixture's AVGO row, which shows twice; it asserts nothing about truncation, the chevron or the other rows. Te stays
unticked: the only assertion is a test added on this branch, which waits for a CI run that includes it.

**Code:** `src/routes/CatalystsPage.tsx:255-311`; test ids none (`aria-expanded` and the `title` are the hooks).

##### CATALYSTS-09 · Open insight report

**Shows or does:** Two controls in every row that has a ticker open that ticker's insight report: the ticker button (`title`
`Open <ticker> insight report`, `src/routes/CatalystsPage.tsx:269-276`) and a `View` button at the row's end (`title` `Open
insight report`, `:299-308`) that is transparent until the row is hovered and stays transparent under keyboard focus
(executed: opacity 0 focused, 1 hovered), so a keyboard user can tab to it and cannot see it. Both call `handleOpenTicker`
(`:410-414`), which does nothing for an empty ticker or `MACRO` and otherwise sets the ticker store's `activeTicker` to the
upper-cased ticker and navigates to `/insights`. A `MACRO` or tickerless row draws the text `MACRO` and neither control
(executed, and the handler's economic rows are all `MACRO`). The store accepts any string, persists `activeTicker` in the
browser's localStorage under `ticker-store` (`src/stores/tickerStore.ts:14-33`) and is not told about the page's other
state: `recentTickers` is not updated, and the filters of this page are lost when it is left (executed, CATALYSTS-07).

What the destination shows (executed 2026-10-01, with no report mocked): the AI Insights header combobox reads the
clicked ticker (GOOGL from Hot Now, ACN from the `View` button of a timeline row) and the page its empty state
(INSIGHTS-01, INSIGHTS-12); a lower-case ticker reaches the store upper-cased (`brk.b` as `BRK.B`). The change is global:
`activeTicker` is the ticker every ticker-scoped page reads (matrix Dashboard and Insights areas).

**Needs:** Nothing from the API on this page. The destination loads INSIGHTS-01's chain for the ticker; the tickers on this
page come from news, earnings, 8-K and insider rows and need not be ones the pipeline reports on (the report is a 404
and `No report yet` for those).

**States:** None of its own: absent for `MACRO` rows and wherever the rows are (CATALYSTS-10 to CATALYSTS-12), replaced under
permission (CATALYSTS-14).

**Acceptance criteria:**
- Given a row with a ticker, when its ticker button is clicked, then the URL becomes `/insights` and `activeTicker` is that
  ticker (executed; `clicking a ticker navigates to /insights with that ticker active` asserts the URL only, and
  `opening an insight report makes that ticker active on /insights, and a MACRO row has no link`, added on this branch,
  asserts the combobox).
- Given a row with a ticker, when its `View` button is clicked, then the same (executed: ACN).
- Given a `MACRO` row, then no ticker button and no `View` button (executed; asserted on this branch for the CPI row).
- Given a ticker in lower case, then the store holds it upper-cased (executed).
- Given a keyboard user, then the `View` button is reachable and not visible (executed; matrix Gaps).

**Tests:** On main one page test, `clicking a ticker navigates to /insights with that ticker active`
(`tests/catalysts/catalysts.spec.ts`), clicks the first `AVGO` button and asserts that the URL matches `/insights`; its
title claims the active ticker, which it does not assert (in a scratch copy of the page, 2026-10-01, removing the
`setTicker` call passed it, and pointing `navigate` at `/dashboard` failed it). The store's half is asserted on main by
`src/stores/tickerStore.test.ts` (`uppercases the active ticker`, `persists activeTicker + recentTickers and omits quickPicks`),
which never calls `handleOpenTicker`. On this branch (solyra commit 7690974, not yet
run in CI) `opening an insight report makes that ticker active on /insights, and a MACRO row has no link` asserts that
tomorrow's `CPI release` row has no button named `MACRO` and that, after the AVGO ticker button is clicked, the URL becomes
`/insights` and the header combobox contains `AVGO`; it asserts nothing about the `View` button, lower-case tickers or the
page's own state. Te stays unticked: the row's assertion of the active ticker is a test added on this branch, which waits
for a CI run that includes it.

**Code:** `src/routes/CatalystsPage.tsx:255-311,394-414`; `src/stores/tickerStore.ts:14-33`; no test ids (the buttons'
`title` attributes are the hooks).

##### CATALYSTS-10 · State: loading

**Shows or does:** While the events request has no answer for the range in force (`isLoading`: the first load, and each
range with no cached answer), a centred spinning icon (`RefreshCw`, `animate-spin`, `py-12`) sits where the timeline
starts, below the filter bars (`src/routes/CatalystsPage.tsx:606-611`). It carries no text, no role and no accessible name
(executed: no `status` or `alert` element on the page). The state blanks the rows that need the answer: Hot Now
(CATALYSTS-01), the header's counters, which read `0 events 0H / 0M / 0L · Benzinga` (CATALYSTS-02), the type chips
(CATALYSTS-03) and the timeline (CATALYSTS-04). The title, the range controls, the Min impact bar and, once the types
request has answered, the Wall Street Horizon card (CATALYSTS-05) stay, and `Refresh` is disabled (`:509`; executed with
the request held). The page keeps no earlier answer while a new range loads: an answer that was on screen vanishes at
once (executed: Hot Now, chips and rows gone, one spinner, with the new request held). A range whose answer is cached
and under five minutes old has no loading state and sends no request (CATALYSTS-06, executed), and past five minutes the
old answer stays on screen while a refetch runs, with no spinner (read: `isLoading` is false once data exists). A failing
request keeps `isLoading` true through the one retry the client's default allows (`retry: 1`, `src/App.tsx:30-36`; read) and
then becomes CATALYSTS-12 (executed: two requests and the error box after 2.4 s in the hermetic page).

**Needs:** The latency of `GET /api/catalysts/events`, which was not measured for the endpoint. The five statements the
handler issues took 23 ms to 75 ms each in the `db-query` job (223 ms together, dispatch B, V evidence); that is the SQL,
not the request, which adds the connection, the five frames and the response.

**States:** This is the loading state of CATALYSTS-01 to CATALYSTS-04, the rows it blanks, and the types request has none of
its own (the card is simply absent until it answers, CATALYSTS-05).

**Acceptance criteria:**
- Given a first load or an uncached range, then a spinner shows, the header reads zeros, and Hot Now, the chips and the
  timeline are absent (executed with the request held).
- Given the request held, then `Refresh` is disabled and the Min impact bar and the range controls are present (executed).
- Given the answer arrives, then the spinner goes and the rows appear (executed).
- Given a cached, fresh range, then no spinner and no request (executed: `Today` back to the default range).
- Given a failing request, then the spinner stays until the retry fails (read; executed: the error box after 2.4 s, two
  requests).
- Given the spinner, then it names itself to assistive technology (it does not; matrix Gaps).

**Tests:** None asserts it. Every test of `tests/catalysts/catalysts.spec.ts` waits for `networkidle` and asserts the loaded
page (the loading state shows for a moment before that), and removing the spinner from a scratch copy of the page
(2026-10-01) left every test passing. Te stays unticked.

**Code:** `src/routes/CatalystsPage.tsx:159-174,406,461-471,483-488,509,606-611`; `src/App.tsx:30-36`; no test ids.

##### CATALYSTS-11 · State: empty

**Shows or does:** There is no empty branch (`src/routes/CatalystsPage.tsx:606-628` holds the spinner, the error box and
the timeline, and the timeline maps over zero cards). An answer with no events draws the header `0 events 0H / 0M / 0L ·
<source>`, the range controls, the Min impact bar, no chips (the row needs a type), no Hot Now, no timeline and the Wall
Street Horizon card; no sentence says that the range holds nothing and no element has a role (executed: the real handler's
answer for a range whose reads all returned nothing, `{"status":"ok","source":"Benzinga","date_range":{...},"total":0,
"events_by_date":{}}`, rendered in the hermetic page). The rows replaced are the ones loading and error also replace:
CATALYSTS-01 to CATALYSTS-04. The record's seed journey, a quiet week with an empty timeline, does not happen on a live range:
the news read ignores the range, so the timeline is empty only when the last 48 hours of news is empty too (a weekend or a
Monday morning, matrix Gaps) or when every read fails.

A filter combination that excludes every row is a second empty with a different look: the header still counts every event
and the timeline is blank with no message (CATALYSTS-07, executed).

**Needs:** An answer with `events_by_date` empty. Production returned 1,565 events on 2026-10-01 (V evidence), so the state
was not observed there; the matrix Gaps record the Monday 2026-09-28 04:48 ET read in which the 48-hour news window held
no row. A database outage produces the same answer and the same page (executed: the real handler with every read raising or
returning an empty frame answered 200, `source: Benzinga`, total 0), so a failed read cannot be told from a quiet range
(CATALYSTS-12, matrix Gaps).

**States:** This is the empty state of CATALYSTS-01 to CATALYSTS-04; there is no stale or error variant of it.

**Acceptance criteria:**
- Given an answer with no events, when the page renders, then it draws the zero header, the controls, the Min impact bar
  and the Wall Street Horizon card and nothing else (executed).
- Given every read failing, then the same page (executed).
- Given an empty answer, then a message should say that nothing falls in the range; none does (matrix Gaps).
- Given a filter combination with no row, then an empty timeline under a header that still counts events (executed).

**Tests:** None asserts it: `buildCatalystEventsEmpty` is exported by `src/mocks/catalysts.ts` and re-exported by
`tests/helpers/fixtures/catalysts.ts` and no spec uses it (its comment says it drives "the page's empty state", which the
page does not have). Te stays unticked.

**Code:** `src/routes/CatalystsPage.tsx:425-441,483-488,564,606-628`; `src/mocks/catalysts.ts:105-117`; no test ids.

##### CATALYSTS-12 · State: error

**Shows or does:** When the events request answers with a non-2xx status or fails (`useCatalystEvents` throws
`Failed to fetch catalysts` for any `!r.ok`, `src/routes/CatalystsPage.tsx:168-169`, after the one retry of the client's
default), a red box reads `Failed to load catalysts: Failed to fetch catalysts` (`:612-616`): one fixed message whatever
the status, with no code, no reason and no retry button (executed with a 500 and with a 401). It has no `role`. The
header keeps its zeros (`0 events 0H / 0M / 0L · Benzinga`), Hot Now, the chips and the timeline are absent, and the title,
the range controls, the Min impact bar and the Wall Street Horizon card (when the types request succeeded) stay. `Refresh`
is enabled and a successful one removes the box (executed). The types request has no error branch at all: its failure draws
nothing (CATALYSTS-05).

The box is reachable only by a transport failure, a gated 401 or an unhandled 5xx. The handler turns a database outage into
a 200 with no events (`catalysts.py:358-362` and its four siblings, over `gcp/database.py:239-241`), which the page draws as
the empty page of CATALYSTS-11 (executed: every read raising or returning an empty frame answered 200, `source: Benzinga`).
The rows replaced are CATALYSTS-01 to CATALYSTS-04.

**Needs:** A non-2xx answer from `GET /api/catalysts/events`. On staging the gated route answers 401 without a token
(V evidence), which in `open` mode draws this box (CATALYSTS-14); production does not produce a 5xx on demand and none was
observed.

**States:** This is the error state of CATALYSTS-01 to CATALYSTS-04; the stale and permission states are CATALYSTS-13 and
CATALYSTS-14.

**Acceptance criteria:**
- Given a 500 on the events request, when the page renders, then after one retry (two requests, 2.4 s in the hermetic
  page) the box shows with the fixed message, the zero header stays and the Wall Street Horizon card still shows (executed).
- Given a 401 on both routes in `open` mode, then the same box shows, the card is absent and no `Sign in to load data`
  appears (executed; CATALYSTS-14).
- Given a later successful `Refresh`, then the box is gone and the rows are back (executed).
- Given a database outage, then no box: the handler answers 200 and the page draws the empty page (executed; matrix Gaps).
- Given any failure, then the message should say what failed; it does not (matrix Gaps).

**Tests:** On main `tests/api/test_route_coverage.py` pins `GET /api/catalysts/events` at 200 against a dead backend
(`Req("GET", "/api/catalysts/events", 200)`, `:325`, no body asserted), which is the quiet-range defect and not an error
state; no page test renders the box, and removing it from a scratch copy of the page (2026-10-01) left every
test of `tests/catalysts/catalysts.spec.ts` passing. Te stays unticked.

**Code:** `src/routes/CatalystsPage.tsx:159-174,406,612-616`;
`platform/api/routers/catalysts.py:358-362,421-425,450-454,494-498,535-539`; `gcp/database.py:239-241`; no test ids.

##### CATALYSTS-13 · State: stale

**Shows or does:** There is no stale state. The page's only provenance is the `source` string at the end of the header line,
`{data?.source ?? 'Benzinga'}` (`src/routes/CatalystsPage.tsx:488`): while no answer has arrived, after a failure and
for an answer without a `source` it reads `Benzinga`, and for an answer the handler built it reads what the handler
wrote (`catalysts.py:318-328`): `Benzinga`, `Benzinga + DB (news + sec, <n>)`, or `Benzinga (fetch in flight)` while another
request's Benzinga batch is running. The response carries no write time, as-of or age for any source, and the page compares
no data with the clock: the only clock use is the cards' `TODAY` label and Hot Now's window. The label names a source that
contributed nothing (neither service has a Benzinga key) and miscounts the others: on 2026-10-01 it read
`Benzinga + DB (news + sec, 1565)`, where 1,565 is every database event, 897 of them earnings rows, 617 news, 35 economic and
16 8-Ks (executed, counted in the response); `news + sec` names two of the four. The stale state would cover CATALYSTS-01 to
CATALYSTS-04; its one trace, the source string, is part of the header of CATALYSTS-02.

What a reader cannot see (V evidence, 2026-10-01): the calendar's last run was the 19:00 ET job of 09-30 and its rows end
at 2026-10-07; the newest news row was published 06:02 ET and the last hourly job finished at 08:01 ET; the insider table
ingests daily (07:03 ET today) but its newest transaction is dated 2026-09-23, so no cluster matched the range; the 48-hour
news window is empty over a weekend (matrix Gaps).

**Needs:** The envelope's `source` (CATALYSTS-04). No other field could carry freshness today.

**States:** The state of CATALYSTS-02's header line. It has no loading form beyond the `Benzinga` default, and the permission
and error states draw the same default.

**Acceptance criteria:**
- Given the production answer, then the header ends `Benzinga + DB (news + sec, 1565)` (executed).
- Given an answer with no database event, then it ends `Benzinga` (executed with the real handler's empty answer).
- Given no answer yet or a failed request, then it ends `Benzinga` (executed).
- Given a source older than the session expects, then a marker should show; none does, and the response has nothing to
  mark it with (matrix Gaps).

**Tests:** None asserts it. `renders impact tier counters in header` matches the counts and not the source, and replacing
the string with a constant in a scratch copy of the page (2026-10-01) left every test passing. `tests/api/test_threadpool_races.py`
(`test_a_pending_catalyst_fetch_is_not_reported_as_a_source`) asserts that the handler's source `Benzinga (fetch in flight)`
is written, by reading the source text of the router, for a branch the deployed services cannot reach with no key. Te stays
unticked.

**Code:** `src/routes/CatalystsPage.tsx:483-488`; `platform/api/routers/catalysts.py:305-328`; no test ids.

##### CATALYSTS-14 · State: permission

**Shows or does:** A state with three presentations, one of them out of reach. (1) `DataGate` wraps everything below the
header and the range controls (`src/routes/CatalystsPage.tsx:519-632`: Hot Now, the Min impact bar, the chips, the spinner,
the error box, the timeline and the Wall Street Horizon card) and, when a gated call has answered 401 and the user is
signed out (`blocked && !isLoading && !isSignedIn`), replaces it with `SignInEmptyState`, a `role="status"` block reading
`Sign in to load data` with a `Sign in` button that reloads the page (
`src/components/shared/SignInEmptyState.tsx:12-51,93-98`); the title, the counters and the range controls stay. (2) For a signed-in user whose token is refused, `DataGate`
does nothing, because `isSignedIn` is true. (3) The page does not use `SignInBanner`.

The replacement is unreachable in practice. In `firebase` mode a signed-out visitor never sees the page: `AuthGate`
renders the sign-in screen in its place (`src/components/auth/AuthGate.tsx:14-30`; executed 2026-10-01 with `/catalysts`
opened signed out: the sign-in screen showed, there was no `Catalysts` heading and the only API request was
`GET /api/config/firebase`). In `open` and `iap` modes `useUser` reports signed in always
(`src/hooks/useUser.ts:22-27,81`), so the condition cannot hold.

What a signed-in user sees on a 401 (executed 2026-10-01, `open` mode as the hermetic suite runs, both routes answering 401
`sign in to continue`): the shell's strip `Your session expired, so live data is not loading.` with a `Sign in` button,
`role="status"`, and the nav pill `Session expired` (`src/components/shared/AuthStatusIndicator.tsx:23-33,156-182`,
SHELL-16); on the page the header zeros, the filter bar, the red box `Failed to load catalysts: Failed to fetch catalysts`
(CATALYSTS-12) and no Wall Street Horizon card (its request is the second 401); `Sign in to load data` appears nowhere. The
flag behind the strip is set by the fetch wrapper on any gated 401 and cleared by any later gated success
(`src/lib/authedFetch.ts:155-166,247-250`, `src/lib/authGate.ts:14-47`), so it follows the last answer (read).

**Needs:** The 401 itself. Both routes the page calls are gated: staging answered 401 without a token to
`GET /api/catalysts/events?date_from=2026-09-28&date_to=2026-10-15` and `GET /api/catalysts/types`, and 200 to
`GET /api/health` and `GET /api/config/firebase` (`authMode: firebase`) in the same run (V evidence, 2026-10-01).
`solyra-api-prod` runs `AUTH_MODE=iap` and answered 302 (`Invalid IAP credentials: empty token`) to the same two catalysts paths and to
`/api/health`, so the 401 proof is staging's. The wrapper's `OPEN_PREFIXES` must match the backend's
`_OPEN_API_PREFIXES` (CLAUDE.md, Auth).

**States:** This is the permission state of Hot Now, the filters, the chips, the timeline and the Wall Street Horizon card
(CATALYSTS-01 to CATALYSTS-05) and of the spinner and the error box that share their block, and the actions CATALYSTS-07 to
CATALYSTS-09 live inside it; the header and the range controls (CATALYSTS-06) stay.

**Acceptance criteria:**
- Given no token, then each gated route answers 401 on staging and `GET /api/health` 200 (V evidence).
- Given a signed-in user and a 401 on both routes, then the shell shows its expired-session strip and the page its error
  box, with no `Sign in to load data` and no sign-in prompt of its own (executed).
- Given a signed-out user in `firebase` mode, then the sign-in screen replaces the page and no catalysts request is sent
  (executed; the screen is asserted on `/dashboard` by `firebase mode, signed out → login screen blocks the
  app`, `tests/shared/auth-gate.spec.ts`, on main at eca7078).
- Given a gated 401, then the wrapper calls the callback registered with `setOnUnauthorized`, and a 401 from an open path
  does not (`a 401 from a gated path fires onUnauthorized`, `a 401 from an OPEN path does not fire onUnauthorized`,
  `src/lib/authedFetch.test.ts`, on main); no code outside the tests registers one, so no behaviour hangs on it, and the flag
  behind the strip, set on the next line, is not read by that test.

**Tests:** On main: `src/lib/authedFetch.test.ts` as above, `tests/api/test_platform_auth.py`
(`test_firebase_requires_valid_token`: a gated path answers 401 without a token in `firebase` mode and the open paths 200,
on a synthetic `/api/secret` route and not on a catalysts route) and the sign-in screen test above. No test asserts
`DataGate`, the strip on this page, the page's 401 form or a 401 on a catalysts route. Te stays unticked.

**Code:** `src/routes/CatalystsPage.tsx:519-632`, `src/components/shared/SignInEmptyState.tsx:12-98`,
`src/components/auth/AuthGate.tsx:14-30`, `src/lib/authGate.ts:14-47`, `src/lib/authedFetch.ts:45,155-166,247-250`,
`src/hooks/useUser.ts:22-27,81-82`, `src/components/shared/AuthStatusIndicator.tsx:23-33,156-182`; test ids `auth-status`,
`auth-status-banner` (the shell's); the page's own state has none.

### SCREEN-ADMIN — `/admin`

- **Purpose:** Operator surface: model routing, strat-engine state, structure brief, route config.
- **Matrix:** [03 § 14](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#14--admin)
- **Status:** Production but needs remediation · **Blocking issue:** [#838](https://github.com/TeneikaAskew/stocks/issues/838) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/AdminPage.tsx` (369 lines)
- **Child components:** `ModelStateSnapshot`, `PredictForm`, `StructureBrief`
- **API calls (from source):** `/api/admin/routes`
- **E2E specs:** `tests/admin/admin-auth.spec.ts`, `tests/admin/admin-tabs.spec.ts`, `tests/admin/admin.spec.ts`
- **PR lineage:** [#567](https://github.com/TeneikaAskew/stocks/pull/567)/[#568](https://github.com/TeneikaAskew/stocks/pull/568) strat_engine state dashboard · [#635](https://github.com/TeneikaAskew/stocks/pull/635) platform audit
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/admin/users | users[].uid/email/display_name/roles/disabled/created_at/last_sign_in_at, available_roles (types: `useAdmin.ts` AdminUserRow/AdminUsersResponse) |  | 30s staleTime | `useAdminUsers` (`useAdmin.ts`) → Users and roles tab |
| GET /api/admin/data-sources | sources[].id/label/category/status/row_count/last_refreshed_at/coverage_start/coverage_end/message/refreshable (types: `useAdmin.ts` AdminDataSourceRow/AdminDataSourcesResponse) |  | 5-minute audit cache, shared with `/api/health/freshness`; 30s client staleTime | `useAdminDataSources` (`useAdmin.ts`) → Chart and report data tab |
| GET /api/admin/routes | routes[].role/provider/model/updated_at/updated_by (types: `useAdmin.ts` RouteRow/RouteListResponse) |  | 30s staleTime | `useAdminRoutes` (`useAdmin.ts`) → Models and routing tab (Model Routing panel) |
| GET /api/admin/models | models[].provider/model/has_credentials/input_usd_per_mtok/output_usd_per_mtok (types: `useAdmin.ts` AvailableModelRow/AvailableModelsResponse) |  | 5min staleTime | `useAdminModels` (`useAdmin.ts`) → Models and routing tab (provider/model selects) |
| GET /api/admin/structure-brief | scope_statement, cells[].ticker/timeframe/available/top_class/top_prob/distribution/live_ece/ece_ceiling/muted/mute_reason/refreshed_at/note (types: `useAdmin.ts` StructureBriefResponse) |  | 60s staleTime | `useStructureBrief` (`useAdmin.ts`) → `StructureBrief` panel |
| GET /api/admin/strat-engine/state | cells[].ticker/timeframe/available/model_version/last_train_date/live_ece, ece_ceiling (types: `useAdmin.ts` StratEngineStateResponse) |  | 60s staleTime | `useStratEngineState` (`useAdmin.ts`) → `ModelStateSnapshot` panel |
| PUT /api/admin/users/{uid}/roles | uid, roles[] (types: `useAdmin.ts` AdminUserRow) |  |  | `useUpdateUserRoles` (`useAdmin.ts`) → Grant or revoke roles |
| PUT /api/admin/users/{uid}/status | uid, disabled (types: `useAdmin.ts` AdminUserRow) |  |  | `useUpdateUserStatus` (`useAdmin.ts`) → Disable a user |
| POST /api/admin/data-sources/{source_id}/refresh | id, queued, job_id (types: `useAdmin.ts` DataSourceRefreshResult) |  |  | `useRefreshDataSource` (`useAdmin.ts`) → Refresh a data source |
| PUT /api/admin/routes/{role} | role, provider, model (types: `useAdmin.ts` RouteRow) |  |  | `useUpdateAdminRoute` (`useAdmin.ts`) → Change provider or model per role and save |
| POST /api/admin/strat-engine/predict | ticker, timeframe, ts, available, top_class, top_prob, class_probs, model_version, last_train_date, live_ece, muted, mute_reason, scope_statement, note (types: `useAdmin.ts` StratPredictRequest/StratPredictResponse) | strat-engine 23:35 ET Mon-Fri → strat_features_5m/15m/30m |  | `usePredictMutation` (`useAdmin.ts`) → Run a predict |
| GET /api/me | email, is_admin, is_dev (types: `useUser.ts` MeResponse) |  | 30s staleTime | `useUser` (`useUser.ts`) → the admin access gate |

#### Displayed
| ID | Element | Component |
|---|---|---|
| ADMIN-01 | Users and roles tab | `UsersPanel` |
| ADMIN-02 | Chart and report data tab | `DataSourcesPanel` |
| ADMIN-03 | Models and routing tab | inline `RoutingPanel` (`AdminPage.tsx`); `StructureBrief`, `ModelStateSnapshot`, `PredictForm` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| ADMIN-04 | Grant or revoke roles | `toggleRole` (`UsersPanel.tsx`) sends the account's current roles plus or minus the clicked one through `useUpdateUserRoles`. A grant succeeds only for an account with no role; the server answers 422 for any other combination (see the matrix Admin Gaps). |
| ADMIN-05 | Disable a user | Disable / Enable buttons call `useUpdateUserStatus`; refused (409) wherever `AUTH_MODE` is `iap`, for the caller's own account, and for the `ADMIN_EMAIL` account. |
| ADMIN-06 | Refresh a data source | The Refresh button calls `useRefreshDataSource`, which dispatches the registered Cloud Run job for that dataset and refetches the list; disabled with a tooltip when `refreshable` is false. |
| ADMIN-07 | Change provider or model per role and save | Provider and model selects (`(no creds)` models disabled); Save calls `useUpdateAdminRoute` for the one changed row only. |
| ADMIN-08 | Run a predict | `PredictForm` posts ticker, timeframe and an optional as-of timestamp through `usePredictMutation`. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| ADMIN-09 | loading | present | A spinner while `/api/me` loads; `UsersPanel`, `DataSourcesPanel`, the routing panel, `StructureBrief`'s `SkeletonGrid`, `ModelStateSnapshot` and `PredictForm`'s "Predicting…" each show their own. |
| ADMIN-10 | empty | absent | No page-level empty state; per-panel copy exists ("No users match this search.", "No data sources reported for this category.", `ModelStateSnapshot`'s "0 / 0 models trained · 0 muted", `StructureBrief`'s nine "unavailable" cells). |
| ADMIN-11 | error | present | "Could not load users:", "Could not load data sources:", "The server rejected this account for admin routes" (401/403) or "Failed to load routes:", plus each panel's own mutation error; a failed `GET /api/admin/models` renders nothing and the selects show empty. |
| ADMIN-12 | stale | absent | The data-sources report's own `stale` and `stale_age_seconds` fields are dropped by the response type; `ModelStateSnapshot` shows `Last Trained` per cell with no age flag. |
| ADMIN-13 | permission | not tracked (new category); present | `AdminPage.tsx` renders an "Admin access required" card from `useUser`'s `isAdmin` before mounting any tab. |

#### Journeys
1. Onboard a teammate: Opens /admin, Users & roles (ADMIN-01) → Finds the account (ADMIN-01) → Toggles a role, which succeeds only for an account with no role and 422s for any other combination (see the matrix Admin Gaps) (ADMIN-04) → Disables an account later without deleting its history (ADMIN-05); on prod, where AUTH_MODE is iap, the request always 409s, so disable only works on staging today (see the matrix Admin Gaps)
2. Chase stale data: Opens Chart & report data (ADMIN-02) → Spots a dataset behind on freshness (ADMIN-02) → Clicks Refresh to queue a pipeline job (ADMIN-06) → Re-checks coverage after the job runs (ADMIN-02)
3. A/B one agent role: Opens Models & routing (ADMIN-03) → Changes the judge role to a stronger model (ADMIN-07) → Saves that row only (ADMIN-07) → Compares report quality over the week → Reverts or keeps the change (ADMIN-07)
4. Non-admin hits the page: Navigates to /admin without the admin role (ADMIN-13) → An "Admin access required" card renders (ADMIN-13) → Explains access is per account, not a shared token (ADMIN-13)

#### Elements
##### ADMIN-01 · Users and roles tab

##### ADMIN-02 · Chart and report data tab

##### ADMIN-03 · Models and routing tab

##### ADMIN-04 · Grant or revoke roles

##### ADMIN-05 · Disable a user

##### ADMIN-06 · Refresh a data source

##### ADMIN-07 · Change provider or model per role and save

##### ADMIN-08 · Run a predict

##### ADMIN-09 · State: loading

##### ADMIN-10 · State: empty

##### ADMIN-11 · State: error

##### ADMIN-12 · State: stale

##### ADMIN-13 · State: permission

### SCREEN-HELP — `/help`

- **Purpose:** Glossary and cross-framework term reference.
- **Matrix:** [03 § 16](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#16--help-and-glossary)
- **Status:** Production · **Blocking issue:** — · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/HelpPage.tsx` (296 lines)
- **API calls (from source):** none found in the page component — issued by child components or hooks
- **E2E specs:** `tests/help/help.spec.ts`
- **PR lineage:** [#539](https://github.com/TeneikaAskew/stocks/pull/539) gamma glossary + endpoint · [#546](https://github.com/TeneikaAskew/stocks/pull/546) TermHover · [#423](https://github.com/TeneikaAskew/stocks/pull/423) 11 Strat entries
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/config/indicators | rsi.{period, fast_period, oversold, overbought, zones, call_range, put_range, call_exit, put_exit}, ema.periods, atr.{period, high_threshold}, rvol.{period, signal_threshold}, stoch_rsi.{period, k_period, d_period, oversold, overbought}, signal.min_conditions (types: `useConfig.ts` IndicatorConfig) |  | 24hr staleTime; the documented `lib/config.py` defaults substitute while the query is loading or failed, with no visible marker | `useIndicatorConfig` (`useConfig.ts`) → `buildGlossary` → the six entries whose detail reads the live thresholds |
| static content: 131 glossary entries in 11 categories |  |  |  | `buildGlossary` (inline in `HelpPage.tsx`) → Search box, Category pills, Glossary entries |

#### Displayed
| ID | Element | Component |
|---|---|---|
| HELP-01 | Search box | inline in `HelpPage.tsx` |
| HELP-02 | Category pills | inline in `HelpPage.tsx` (`categories`) |
| HELP-03 | Glossary entries | inline in `HelpPage.tsx` (`buildGlossary`) |
| HELP-08 | TermHover links from other pages | none on this page; the Options Gamma Map's `Term` spans (`SwingMode.tsx`) show their own tooltip from a mock glossary and its `Glossary` button opens `/help` with no term or anchor |

#### Actions
| ID | Action | What happens |
|---|---|---|
| HELP-05 | Search | `filtered`: the term or short text contains the query, ignoring case, within the active category. |
| HELP-06 | Filter by category | A pill selects its category; a second click on the same pill returns to all. |
| HELP-07 | Expand an entry | The row toggles one expanded entry, showing its detail text; six entries render the config's live values there. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| HELP-04 | empty | present | "No matching terms found." |

#### Journeys
1. Look up a term: Opens /help (HELP-01) → Types "gamma" in the search box (HELP-01, HELP-05) → Expands the King Node (★) entry (HELP-07, HELP-03) → Reads the definition and its cross-references to Gate and Flip (HELP-03)
2. Browse one framework: Clicks the category pill labeled "The Strat" (HELP-02, HELP-06) → Scans the entries for that framework (HELP-03) → Expands 2-1-2 and FTFC to learn the vocabulary (HELP-07, HELP-03)
3. Arrive from elsewhere: Hovers a Term span on the Options Gamma Map (HELP-08) → its tooltip reads a separate mock glossary and the Glossary button opens /help with no term or anchor carried over; no link into a specific entry exists today (see the matrix Help Gaps) → Searches for the term manually (HELP-01, HELP-05)

#### Elements
##### HELP-01 · Search box

##### HELP-02 · Category pills

##### HELP-03 · Glossary entries

##### HELP-08 · TermHover links from other pages

##### HELP-05 · Search

##### HELP-06 · Filter by category

##### HELP-07 · Expand an entry

##### HELP-04 · State: empty (no entry matches)

### SCREEN-SETTINGS — `/settings`

- **Purpose:** Device-local appearance and layout preferences.
- **Matrix:** [03 § 15](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/03-SITE-TRACEABILITY.md#15--settings)
- **Status:** Incomplete · **Blocking issue:** [#685](https://github.com/TeneikaAskew/stocks/issues/685) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/SettingsPage.tsx` (131 lines)
- **API calls (from source):** none found in the page component — device-local state only
- **Stores:** `useSettingsStore`, `useThemeStore`
- **E2E specs:** **none**
- **PR lineage:** [#611](https://github.com/TeneikaAskew/stocks/pull/611) platform redesign · [#589](https://github.com/TeneikaAskew/stocks/pull/589) app shell
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET/PUT /api/me/preferences | theme, nav_pattern, density, accent (types: `src/types/preferences.ts` UserPreferences/UserPreferencesUpdate) |  | hydrated once per session, then writes through on every change | `usePreferencesSync` (mounted once in `AppShell.tsx`) / `usePreferencesStatus` (read-only, `SettingsPage.tsx`) → Appearance tab, Toggle appearance |
| GET/PUT /api/me/profile | display_name, timezone, default_ticker, default_timeframe, account_size, risk_per_trade_pct, notify_daily_digest, notify_catalyst_alerts, notify_signal_alerts, number_format, date_format, show_extended_hours (types: `src/types/profile.ts` UserProfile/UserProfileUpdate) |  | 5min staleTime, one retry | `useProfile` (`useProfile.ts`) → Profile tab, Trading tab, Notifications tab, Save changes or Discard |
| GET /api/me | email, is_admin, is_dev (types: `useUser.ts` MeResponse) |  | 30s staleTime | `useUser` (`useUser.ts`) → Account tab |
| store: theme, nav pattern, density, accent | | Zustand, mirrored in `localStorage` keys `platform-theme` and `platform-shell-settings` | | `themeStore.ts`, `settingsStore.ts` → every Appearance control, AppShell nav pattern |

#### Displayed
| ID | Element | Component |
|---|---|---|
| SETTINGS-01 | Profile tab | inline in `SettingsPage.tsx` (`useProfile`) |
| SETTINGS-02 | Appearance tab | inline in `SettingsPage.tsx` (`useThemeStore`, `useSettingsStore`) |
| SETTINGS-03 | Trading tab | inline in `SettingsPage.tsx` (`useProfile`, `profileDiff`) |
| SETTINGS-04 | Notifications tab | inline in `SettingsPage.tsx` (`useProfile`) |
| SETTINGS-05 | Account tab | inline in `SettingsPage.tsx` (`useUser`, `runtimeConfig.ts` `getAuthMode`) |

#### Actions
| ID | Action | What happens |
|---|---|---|
| SETTINGS-06 | Toggle appearance | Each control calls its store's setter directly; `usePreferencesSync` (mounted once in `AppShell.tsx`) writes it through via `PUT /api/me/preferences`, skipping the pass right after hydration and any value the server already holds. |
| SETTINGS-07 | Save changes or Discard | `Save changes` sends `profileDiff` (changed fields only) through `useProfile`'s `save`; `Discard` resets the draft to the stored values without persisting anything. |
| SETTINGS-08 | Sign out | Enabled only when signed in with `AUTH_MODE` `firebase`; calls `firebaseSignOut` (`lib/firebase.ts`); otherwise disabled with a note that the session is managed outside the app. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| SETTINGS-09 | loading | absent | "Loading your saved settings…" while either the profile or preferences read is pending; "Saving…" in the save bar. |
| SETTINGS-10 | empty | present | A 404 on either read is treated as nothing stored yet: profile fields show "Not set" and the local appearance values stand. |
| SETTINGS-11 | error | absent | "Appearance not synced" with "Changes still apply on this device." for a failed preferences read, then the profile read error; the save error renders in the save bar; every exception on either router, a defect included, answers 503. |
| SETTINGS-12 | stale | absent | The page cannot show staleness: the stores take the stored appearance once per session and later reads do not re-apply it; the header reads "Synced to your account." with no time. |
| SETTINGS-13 | permission | not tracked (new category); present | `AuthGate`'s `SignInScreen` renders for a signed-out visitor in firebase mode; both routers 401 without a verified identity in firebase mode. |

#### Journeys
1. Make the app fit the desk: Opens /settings, Appearance (SETTINGS-02) → Switches Tabs to Sidebar (SETTINGS-06) → Sets Density to Dense (SETTINGS-06) → Picks an accent color (SETTINGS-06) → Every change applies instantly and syncs to the account (SETTINGS-06)
2. Set trading defaults: Opens the Trading tab (SETTINGS-03) → Enters a default ticker and timeframe (SETTINGS-03) → Adds account size and risk per trade (SETTINGS-03) → Clicks Save changes (SETTINGS-07) → the values are stored in user_profile; the journal and playbook pre-fill the seed describes is not implemented (see the matrix Settings Gaps)
3. Abandon an edit: Starts typing an account size (SETTINGS-03) → The save bar reads "Unsaved changes" (SETTINGS-07) → Clicks Discard (SETTINGS-07) → The draft resets to the stored values, nothing half-typed was persisted (SETTINGS-07)

#### Elements
##### SETTINGS-01 · Profile tab

##### SETTINGS-02 · Appearance tab

##### SETTINGS-03 · Trading tab

##### SETTINGS-04 · Notifications tab

##### SETTINGS-05 · Account tab

##### SETTINGS-06 · Toggle appearance

##### SETTINGS-07 · Save changes or Discard

##### SETTINGS-08 · Sign out

##### SETTINGS-09 · State: loading

##### SETTINGS-10 · State: empty

##### SETTINGS-11 · State: error

##### SETTINGS-12 · State: stale

##### SETTINGS-13 · State: permission

