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
Plus **27 Vitest component tests** under `src/**/*.test.*`. Neither suite runs in CI
([#868](https://github.com/TeneikaAskew/stocks/issues/868)).

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

**Tests:** `tests/api/test_platform_auth.py::test_open_mode_is_noop`, `::test_iap_mode_reads_header_and_does_not_enforce`, `::test_firebase_requires_valid_token`; `tests/api/test_route_coverage.py`; solyra `tests/shared/auth-gate.spec.ts` (Playwright, not yet part of Te, solyra#28 is open).

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

**Tests:** `src/lib/mockMode.test.ts` (`is unset by default and inactive`, `setMockMode(true) persists and reloads`, `setMockMode(false) persists the explicit exit`, `enables once while the preference is unset`, `never overrides an explicit exit`); `tests/shared/mock-mode.spec.ts` (Playwright, banner visibility and exit; not yet part of Te, solyra#28 is open).

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

**Tests:** `tests/api/test_platform_api.py`, `tests/api/test_route_coverage.py` (both exercise `GET /api/health/freshness` reachability; no dedicated freshness-cache unit test covering the claim, stale and 503 branches was found in `tests/api/` under this task's search). solyra `tests/dashboard/data-pipeline-widget.spec.ts` (Playwright, pins the retired widget's absence; not part of Te, solyra#28 is open).

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
- **Status:** Infrastructure · **Blocking issue:** — · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-09-28
- **Component:** `src/components/auth/AuthGate.tsx` (30 lines), `src/components/auth/ConfigGate.tsx` (176 lines), `src/components/auth/SignInScreen.tsx` (302 lines), `src/components/auth/SignOutButton.tsx` (38 lines), `src/routes/AuthActionPage.tsx` (550 lines)
- **Child components:** `Brand`, `LoadingSpinner`, `SignInScreen`
- **API calls (from source):** `/api/config/firebase`, `/api/me`
- **E2E specs:** `tests/shared/auth-gate.spec.ts`, `tests/admin/admin-auth.spec.ts`
- **PR lineage:** UNKNOWN / NEEDS HISTORY TRACE
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
blocks the app`), Playwright, not run in CI (solyra#28), so does not tick Te here.
`tests/api/test_route_coverage.py`'s `GET /api/config/firebase` case issues a real request and
asserts a 200 JSON envelope, and `tests/api/test_platform_auth.py::TestValidatedAuthMode` tests
the `AUTH_MODE` validation the endpoint's value depends on, both pytest and CI-run, but neither
exercises the client-side mode-bootstrap decision this row is actually about, so Te stays
unticked here (see Gaps).

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

**Tests:** `tests/shared/auth-gate.spec.ts` (`login screen toggles between sign-in and sign-up`),
Playwright, no Te. `tests/api/test_platform_auth.py::test_firebase_allowlist_switch` is real,
CI-run pytest coverage of this row's access-policy half (`_is_allowed`), but the sign-up
submission and the verification-email bookkeeping remain untested by any CI-run suite, so Te
stays unticked for the row as a whole.

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
end to end, Playwright, no Te of its own.

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
app`, asserting the unframed `google-signin` button; `framed preview: the Google button opens a
new tab instead of a popup`, new, asserting the framed variant), both Playwright, no Te.
`src/lib/authAction.test.ts`'s `friendlyError` suite covers the Google-specific error codes as
pure-function mappings (Vitest, CI-run), but no test wires that mapping through this component,
so it does not lift Te for this row.

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

**Tests:** `tests/shared/auth-gate.spec.ts` (`login screen toggles between sign-in and sign-up`;
`email sign-in shows the inline error when the identity call fails`, new), Playwright, no Te.
`src/lib/authAction.test.ts`'s `friendlyError` describe block is real, CI-run (Vitest) coverage of
the error-copy mapping this row's "with inline error" half depends on, but it tests the pure
function in isolation, not the form submission itself, so it does not on its own satisfy Te for
the row; the submission path stays Playwright-only (see Gaps).

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
describe block, 10 tests total), Playwright, no Te on their own. Two CI-run suites cover this
row's own logic closely enough to tick Te here: `src/lib/authAction.test.ts` (Vitest, 15 tests
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

**Tests:** `tests/shared/auth-gate.spec.ts` (`sign out returns to the sign-in screen`, new),
`tests/shared/navigation.spec.ts` (`auth status lives at the menu bottom, not the bar`, the
negative open-mode case), both Playwright, no Te (solyra#28).

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
  presentation rather than an empty or stale marquee (`MostActiveBar.tsx:179`); exercised by
  `tests/shared/most-active-bar.spec.ts`, Playwright.
- Given a real, unauthenticated request against `GET /api/market/most-active` on staging, when
  issued from this session, then it answers 401 (verified 2026-09-28, see the V-gate evidence
  comment).

**Tests:** `src/lib/authedFetch.test.ts` (15 tests, Vitest, CI-run) is real, passing coverage of
the 401-on-gated-path mechanics and the token-retry behavior, though its assertions target the
`onUnauthorized` callback and the `Authorization` header, not `isAuthBlocked()` directly;
`markAuthBlocked`/`clearAuthBlocked` run for real as an unmocked side effect, but no assertion in
that file reads the resulting flag. `tests/api/test_platform_auth.py::test_firebase_requires_valid_token`
covers the server-side 401 half. Together these back the Te tick for this row.
`tests/shared/most-active-bar.spec.ts` covers the actual `isAuthBlocked` → "Sign in to load data"
rendering, Playwright, no Te of its own.

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
never renders`, `config endpoint answering HTML (static-host fallback) → config-error screen`),
Playwright, no Te. No pytest or Vitest covers a failure response from this endpoint, or
`describeBootFailure` itself.

**Code:** `src/components/auth/ConfigGate.tsx:27-65, 94-123`; test id `config-error`.

### SCREEN-SHELL — app shell

- **Purpose:** Shared layout for the 13 authenticated app routes: sidebar or top-tab navigation, header, command palette, status banners and the most-active marquee around the routed page.
- **Status:** Infrastructure · **Blocking issue:** — · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-09-28
- **Component:** `src/components/layout/AppShell.tsx` (80 lines)
- **Child components:** `Sidebar`, `TopTabs`, `Header`, `CommandPalette`, `MostActiveBar`, `AuthStatusBanner`, `EmailVerificationBanner`, `MockModeBanner`, `Outlet`
- **API calls (from source):** `/api/market/most-active`, `/api/live/status`, `/api/me/preferences`, `/api/config/market-hours`
- **Stores:** `useSettingsStore`
- **E2E specs:** `tests/shared/navigation.spec.ts`, `tests/shared/most-active-bar.spec.ts`, `tests/shared/mock-mode.spec.ts`
- **PR lineage:** UNKNOWN / NEEDS HISTORY TRACE
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
- Given `useAuthStatus().status === 'loading'`, when either banner would render, then both
  return `null` (`AuthStatusIndicator.tsx:40`, `:81`, `:158`, read directly; no test isolates
  this transient render, see Gaps).
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
their shared `AppGroup` parent (`src/App.tsx:49,78` and each child route, e.g. `:80-86`), so a
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
  at `App.tsx:49-86`).
- Given the thrown value is a React Router response object, when `describeError` runs, then the
  title is `"{status} {statusText}"`; given any other `Error`, the title is `"Page error"` and the
  stack is available behind "Show technical details" (`RouteErrorBoundary.tsx:82-94`, read
  directly).

**Tests:** none found. Grepped both repos for `RouteErrorBoundary` and for a test that forces a
page-render throw; no colocated Vitest test and no Playwright spec exercise this component at all
(matches the pre-existing Gaps note).

**Code:** `src/components/shared/RouteErrorBoundary.tsx`, wired at `src/App.tsx:49`.

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
and navigates to a page`, new in this task; Playwright, not run in CI, solyra#28, so ticks no
Te here). No prior test of any kind existed for this component (confirmed the pre-existing Gaps
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

**Tests:** none found. Grepped both repos for `ReplayControl`, `replay-toggle`, `replay-apply`;
no colocated Vitest test and no Playwright spec exercise this component (the pre-existing Chain
Tests cell was blank; the pre-existing Gaps note lists it, confirmed still accurate).

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
document theme attribute`, new in this task, Playwright).

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

- **Purpose:** Daily starting point: market brief, movement read, expected move, most-active marquee, sector rotation.
- **Status:** Production but needs remediation · **Blocking issue:** [#861](https://github.com/TeneikaAskew/stocks/issues/861) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/DashboardPage.tsx` (843 lines)
- **Child components:** `CandlestickChart`, `Card`, `CardHeader`, `Delta`, `DirTag`, `KpiTile`, `Metric`, `MicroLabel`, `MovementRead`, `Pill`, `PriceAreaChart`, `ScoreStars`, `SetupCardDetails`, `TickerCombobox`
- **API calls (from source):** `/api/catalysts/events`, `/api/dashboard/brief/`, `/api/market/data/`, `/api/market/reference/`, `/api/market/sectors`, `/api/playbook/`, `/api/signals/`
- **Stores:** `useReviewDateStore`, `useTickerStore`
- **E2E specs:** `tests/dashboard/dashboard-chart-fit.spec.ts`, `tests/dashboard/dashboard.spec.ts`, `tests/shared/most-active-bar.spec.ts`, `tests/dashboard/movement-read.spec.ts`
- **PR lineage:** [#649](https://github.com/TeneikaAskew/stocks/pull/649)/[#650](https://github.com/TeneikaAskew/stocks/pull/650) movement statement · [#729](https://github.com/TeneikaAskew/stocks/pull/729) enable + e2e · [#732](https://github.com/TeneikaAskew/stocks/pull/732) most-active bar · [#733](https://github.com/TeneikaAskew/stocks/pull/733) expected-move card (disabled by [#810](https://github.com/TeneikaAskew/stocks/pull/810))
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/dashboard/brief/{ticker} | bias, reason, rsi, strat_candle, strat_combo, ftfc_score, ftfc_direction, signal_status, daily_indicators, live.price/session (types: `DashboardPage.tsx` BriefResponse; fixture: `tests/helpers/fixtures/dashboard.ts`) | premarket-brief 08:30 ET Mon-Fri → premarket_analysis | today's brief by 08:30 ET, else "unavailable" | `briefQ` (`useFetch`) → briefing strip |
| GET /api/live/quote/{ticker} | price, change, change_pct, open/high/low, volume, prev_close (types: `useLiveQuote.ts` LiveQuote) |  | 15s poll while the tab is open | `useLiveQuote` → briefing strip hero price |
| GET /api/live/status | is_open, session, next_open, current_time_et (types: `useLiveStatus.ts` LiveStatus) |  | 60s refetch, 30s staleTime | `useLiveStatus` → briefing strip market pill |
| GET /api/playbook/{ticker} | cards[].name/direction/win_rate/avg_return/conditions/target_pct/stop_pct/horizons, analysis_date, age_days, max_age_days (types: `DashboardPage.tsx` PlaybookResponse) | phase6-playbook 04:30 ET Mon-Fri → playbook_cards | server refuses (503) a card set older than max_age_days; re-polled every 15min in live mode | `playbookQ` (`useFetch`) → top setup |
| GET /api/signals/{ticker}?limit=20 | signals[].time/direction/score/conditions_met/return_pct (types: `DashboardPage.tsx` SignalsResponse) | historical-signals-watchlist 01:00 ET Tue-Sat → historical_signals |  | `signalsQ` (`useFetch`) → live signals table |
| GET /api/catalysts/events?date_from&date_to | events_by_date[date][].ticker/title/catalyst_type/impact/sentiment_label/sentiment_score/source (types: `DashboardPage.tsx` CatalystsResponse/CatalystEvent) | fetch-news-sentiment hourly 08:00-17:00 ET Mon-Fri → news_sentiment | last 48 hours within the requested range | `catalysts` (`useFetch`) → catalysts list, News |
| GET /api/market/sectors | sectors[].symbol/name/status/close/chg_1d_pct/chg_5d_pct/reason (types: `DashboardPage.tsx` SectorRow/SectorsResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily |  | `sectorsQ` (`useFetch`) → sector rotation |
| GET /api/market/reference/{ticker}/{date} | open, close, high, low, week.high/low/avg_close/avg_rsi_14 (types: `DashboardPage.tsx` ReferenceResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily |  | `referenceQ` (`useFetch`) → daily KPIs |
| GET /api/market/data/{ticker}/{date}?timeframe=60 | candlestick[].time/open/high/low/close, volume[].time/value (types: `DashboardPage.tsx` MarketDataResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_intraday |  | `hourlyQ` (`useFetch`) → intraday chart |
| GET /api/insights/report/{ticker} | thesis, direction, conviction, key levels (types: `src/types/insights.ts` InsightReportEnvelope) | insight-pipeline 08:45 ET Mon-Fri → insight_reports | 60s staleTime | `useInsightReport` (`useInsights.ts`) → AI take |
| GET /api/movement-statement | headline, levels, expected_move, regime, continuation (types: `src/types/index.ts` MovementStatement) | premarket-brief 08:30 ET Mon-Fri → premarket_analysis (one of several inputs assembled server-side; see matrix DASHBOARD-21) | feature-flagged (MOVEMENT_STATEMENT_ENABLED); hidden in review mode | `useMovementStatement` → `MovementRead` |
| store: ticker, review date |  | Zustand, per session |  | every card |

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
| DASHBOARD-10 | Switch ticker | `TickerCombobox` writes `useTickerStore`; every card on the page re-keys to the new symbol. |
| DASHBOARD-11 | Refresh | The Refresh button calls `window.location.reload()`. |
| DASHBOARD-12 | Candles or Area toggle | `pickChart` sets `chartStyle` state and persists the choice to `localStorage` (`overview-chart`). |
| DASHBOARD-13 | 1D or 5D sector period | Toggles in-memory `sectorPeriod` state (not persisted), which re-derives the ranked sector rows from the same `/api/market/sectors` response. |
| DASHBOARD-14 | Click a card (signals, catalysts, news, AI take) | `Card interactive` `onClick` calls `navigate()`: Live signals → `/signals`; Catalysts and News → `/catalysts`; AI take → `/insights`. |
| DASHBOARD-15 | Review mode | The shell's replay control sets a review date/time; `DashboardPage` appends `date`/`end_date`/`end_time` to the brief, playbook and signals requests and reconstructs the chart and reference reads for that as-of moment. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| DASHBOARD-16 | loading | present | `WidgetState.tsx`'s `WidgetSkeleton` renders per card while its query is in flight. |
| DASHBOARD-17 | empty | present | `DashboardPage.tsx` renders an `Unavailable` presentation rather than a fabricated zero when a card's data is genuinely absent. |
| DASHBOARD-18 | error | present | `WidgetState.tsx`'s `WidgetError` renders per card on a failed fetch. |
| DASHBOARD-19 | stale | present | `DashboardPage.tsx` computes `playbookAge`/`snapshotAgeLabel` from the response's own age fields and shows it rather than presenting old data as current. |
| DASHBOARD-20 | permission | not tracked (new category); present | `WidgetState.tsx`'s `SignInEmptyState` renders per card when `authGate.ts` reports the session is auth-blocked. |

#### Journeys
1. Morning brief to a trade idea: Opens /dashboard (DASHBOARD-01) → Reads the pre-market brief bullets and market pill (DASHBOARD-01) → Checks the Top setup, win rate, conditions, levels (DASHBOARD-02) → Clicks Live signals to go to /signals (DASHBOARD-05, DASHBOARD-14) → Or follows the setup to /playbook for the full card (DASHBOARD-02)
2. Follow the ticker across the app: Switches ticker in the TickerCombobox (DASHBOARD-10) → Every card re-keys to the new symbol → Scans KPIs and the intraday chart (DASHBOARD-03, DASHBOARD-04) → Clicks AI take to go to /insights for that ticker (DASHBOARD-08, DASHBOARD-14) → Ticker focus persists on the next page
3. Review a past session: Sets a review date in the replay control (DASHBOARD-15) → Market pill switches to HISTORICAL (DASHBOARD-01) → Brief, playbook, signals, catalysts and chart re-resolve as-of that date (DASHBOARD-15) → Movement Read hides so live data cannot leak in (DASHBOARD-21) → Compares the brief against what actually happened (DASHBOARD-01)
4. Data is missing: Opens the page before the pipeline has run → Brief card shows an explicit "unavailable" reason (DASHBOARD-17) → Top setup shows "No playbook setups yet" (DASHBOARD-02, DASHBOARD-17) → KPIs render an em-dash instead of a fabricated zero (DASHBOARD-03, DASHBOARD-17)

#### Elements
##### DASHBOARD-01 · Briefing strip

##### DASHBOARD-02 · Top setup

##### DASHBOARD-03 · Daily KPIs

##### DASHBOARD-04 · Intraday chart

##### DASHBOARD-05 · Live signals table

##### DASHBOARD-06 · Catalysts list

##### DASHBOARD-07 · Sector rotation

##### DASHBOARD-08 · AI take

##### DASHBOARD-09 · News

##### DASHBOARD-21 · Movement Read card (feature-flagged)

##### DASHBOARD-10 · Switch ticker

##### DASHBOARD-11 · Refresh

##### DASHBOARD-12 · Candles or Area toggle

##### DASHBOARD-13 · 1D or 5D sector period

##### DASHBOARD-14 · Click a card (signals, catalysts, news, AI take)

##### DASHBOARD-15 · Review mode

##### DASHBOARD-16 · State: loading

##### DASHBOARD-17 · State: empty

##### DASHBOARD-18 · State: error

##### DASHBOARD-19 · State: stale

##### DASHBOARD-20 · State: permission

### SCREEN-LIVEMARKET — `/live`

- **Purpose:** Intraday monitoring of quotes, indicators and STRAT state for the watchlist.
- **Status:** Production but needs remediation · **Blocking issue:** [#928](https://github.com/TeneikaAskew/stocks/issues/928) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/LiveMarketPage.tsx` (411 lines)
- **Child components:** `MetricCard`
- **API calls (from source):** `/api/market/data/`
- **Stores:** `useReviewDateStore`, `useTickerStore`
- **E2E specs:** `tests/live-market/live-market.spec.ts`, `tests/dashboard/movement-read.spec.ts`
- **PR lineage:** [#690](https://github.com/TeneikaAskew/stocks/pull/690) market dropdown + truthful session badge · [#700](https://github.com/TeneikaAskew/stocks/pull/700) one-source-of-truth signals
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/live/status | is_open, session, next_open, current_time_et (types: `useLiveStatus.ts` LiveStatus) |  | 60s refetch, 30s staleTime | `useLiveStatus` → session bar |
| GET /api/live/quote/{ticker} | price, change, change_pct, open/high/low, volume, prev_close (types: `useLiveQuote.ts` LiveQuote; fixture: `tests/helpers/fixtures/live.ts`) |  | 15s poll (10s staleTime), only while `livePolling` | `useLiveQuote` → quote card |
| GET /api/live/history/{ticker} | bars[] OHLCV, count, market_session (types: `useLiveHistory.ts` LiveHistory) |  | 60s poll (30s staleTime), only while `livePolling` | `useLiveHistory` → indicator tiles, setup cards |
| GET /api/live/avg-volume/{ticker} | avg_volume_20d, sample_size, last_date, source (types: `useLiveHistory.ts` AvgVolume) | fetch-market-data 23:00 ET Mon-Fri and fetch-earnings-history 19:15 ET Mon-Fri → market_data_daily | 1h staleTime | `useAvgVolume` → RVOL tile |
| POST /api/live/indicators | indicators (EMA9/20/50, RSI, StochRSI, ATR), signals.call/put, chart_voter (types: `useLiveIndicators.ts` IndicatorsResponse) |  | 10s staleTime, keyed on bar count/last bar time/price/volume/avg-volume | `useLiveIndicators` → indicator tiles, CALL/PUT setup cards |
| GET /api/market/data/{ticker}/{date} | candlestick[]/volume[] bars (types: `useMarketData.ts` MarketDataResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_intraday |  | `buildReviewQuote`/`useReviewQuote` → review mode |
| GET /api/market/reference/{ticker}/{date} | open, close, high, low (types: `useMarketData.ts` ReferenceLevels) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily |  | `useReferenceLevels` → review mode prior close |
| store: ticker, review date |  | Zustand, per session |  | every card |

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
| LIVE-05 | Live (15s) or Paused toggle | Toggles the `livePolling` state, which gates `useLiveQuote`'s and `useLiveHistory`'s `refetchInterval`; disabled in historical review. |
| LIVE-06 | Sound alert | `playAlert` sounds an 880Hz tone on a CALL fire and 440Hz on a PUT fire, throttled to one per direction per two minutes; never in review mode. |
| LIVE-07 | Switch ticker | The page has no ticker control of its own; `tickerStore` is set elsewhere (`TickerCombobox` on other pages, or the command palette, which navigates to `/charts`). |
| LIVE-08 | Review mode | `useReviewQuote`/`reviewDateStore` rebuild a synthetic quote from that day's bars via `buildReviewQuote`, sliced to the chosen cutoff time. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| LIVE-09 | loading | absent | `LiveMarketPage.tsx` shows "Fetching live quote…" and "Loading historical bars for indicators…" (or the review-date variant) while the first quote and bars resolve. |
| LIVE-10 | empty | present | `EMPTY_INDICATORS`/`EMPTY_SIGNALS` (`src/lib/indicators.ts`) render tiles as `--` and setup cards as `0/0 met` until the indicators response arrives. |
| LIVE-11 | error | present | The `quoteError` banner renders on any non-OK quote status. |
| LIVE-12 | stale | present | An "Updated:" timestamp reads the quote query's `dataUpdatedAt`; an "Historical:" label replaces it in review mode. |
| LIVE-13 | permission | not tracked (new category); present | `SignInEmptyState`'s `DataGate` replaces the body with "Sign in to load data" only when signed out. |

#### Journeys
1. Watch for a setup to fire: Opens /live during the session (LIVE-01) → Confirms the session badge reads Regular (LIVE-01) → Leaves polling on (15s) (LIVE-05) → Enables Sound (LIVE-06) → CALL card fills to 5/5 and the SIGNAL badge pulses with an audio alert (LIVE-04, LIVE-06)
2. Check why nothing is firing: Scans the CALL and PUT strength bars (LIVE-04) → Reads each condition row, live value against threshold (LIVE-04) → Spots RVOL below 1.2 as the blocker (LIVE-03) → Pauses polling to study the numbers (LIVE-05)
3. Replay a past intraday session: Sets a review date and time (LIVE-08) → Polling is disabled and the badge reads Historical (LIVE-05, LIVE-01) → Bars are sliced to the review cutoff (LIVE-08) → A synthetic quote is rebuilt from that day, rebased to the prior close (LIVE-08) → Steps the time forward to watch conditions evolve (LIVE-08)

#### Elements
##### LIVE-01 · Session bar

##### LIVE-02 · Quote card

##### LIVE-03 · Six indicator tiles

##### LIVE-04 · CALL and PUT setup cards

##### LIVE-05 · Live (15s) or Paused toggle

##### LIVE-06 · Sound alert

##### LIVE-07 · Switch ticker

##### LIVE-08 · Review mode

##### LIVE-09 · State: loading

##### LIVE-10 · State: empty

##### LIVE-11 · State: error

##### LIVE-12 · State: stale

##### LIVE-13 · State: permission

### SCREEN-CHARTS — `/charts`

- **Purpose:** Instrument and timeframe chart analysis with strategy conditions and level overlays.
- **Status:** Production but needs remediation · **Blocking issue:** [#912](https://github.com/TeneikaAskew/stocks/issues/912) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/ChartsPage.tsx` (967 lines)
- **Child components:** `LoadingSpinner`, `Modal`, `ReplaySessionControls`, `SimilarSetupsCard`, `StrategyConditionsCard`, `TradeMarkingChart`, `type PriceLineConfig`, `type TradeMarkingChartHandle`
- **API calls (from source):** none found in the page component — issued by child components or hooks
- **Stores:** `useReviewDateStore`, `useSettingsStore`, `useTickerStore`
- **E2E specs:** `tests/charts/charts-cards.spec.ts`, `tests/dashboard/ticker-combobox.spec.ts`
- **PR lineage:** [#715](https://github.com/TeneikaAskew/stocks/pull/715) restore charts UI · [#703](https://github.com/TeneikaAskew/stocks/pull/703) ticker type-ahead · [#700](https://github.com/TeneikaAskew/stocks/pull/700)
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/market/dates/{ticker} | dates[] (types: `useMarketData.ts` DatesResponse; fixture: `tests/helpers/fixtures/charts.ts`) | fetch-market-data 23:00 ET Mon-Fri → market_data_intraday |  | `useAvailableDates` → Toolbar date picker |
| GET /api/market/data/{ticker}/{date} | candlestick[]/volume[] bars (types: `useMarketData.ts` MarketDataResponse) | fetch-market-data 23:00 ET Mon-Fri → market_data_intraday |  | `useMarketData` → Candlestick chart |
| GET /api/market/reference/{ticker}/{date} | open, close, high, low, week (types: `useMarketData.ts` ReferenceLevels) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily |  | `useReferenceLevels` → Crosshair bar prev H/L, reference lines |
| GET/POST /api/journal/trades/{ticker} | direction, entry_ts/price, exit_ts/price, return_pct, take_profits, stop_loss (types: `useJournalChartTrades.ts` JournalRow) |  |  | `useJournalChartTrades` → trade markers, Mark Entry |
| POST /api/live/indicators | indicators, signals.call/put, chart_voter (types: `useLiveIndicators.ts` IndicatorsResponse) |  |  | `useLiveIndicators` → Strategy conditions card |
| POST /api/live/signal-series | fires[] (types: `useLiveIndicators.ts` SignalSeriesResponse) |  |  | `useSignalSeries` → Sig chart markers, Similar setups voter |
| GET /api/signals/{ticker}/similar | direction, rsi, score, stats, matches[] (types: `useSimilarSetups.ts` SimilarResponse) | historical-signals-watchlist 01:00 ET Tue-Sat → historical_signals |  | `useSimilarSetups` → Similar setups card |
| GET /api/backtest/all/{ticker} · results/{ticker} · equity/{ticker} | strategies list, per-trade results, equity curve points (types: `BacktesterSection.tsx`) | none (GCS CSV objects under raw/data/backtest_results/, no table) |  | `BacktesterSection` → Backtester |
| POST /api/backtest/replay-trades | per-trade edge_bps, win/loss vs. system benchmark |  |  | `useReplayTrades` (`useJournalChartTrades.ts`) → Post-session scorecard, Backtest my trades |
| GET /api/options/{ticker}/{date}/levels | king/gate/flip strikes, spot (types: `useGammaLevels.ts` GammaLevel/GammaLevelsResponse) | fetch-av-options-realtime every 5min 09:00-15:55 ET Mon-Fri → etf_options_snapshots | shown only for SPY, IWM, QQQ, SPX | `useGammaLevels` → Gamma overlay |
| store: ticker, review date, timeframe |  | Zustand (`tickerStore`, `reviewDateStore`), `settingsStore` timeframe in memory |  | Toolbar, every card |

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
| CHARTS-09 | Change date or timeframe | The date input is bounded by `useAvailableDates`'s list and disabled in historical review mode; timeframe buttons set `settingsStore`'s in-memory `timeframe`, which resamples the `/api/market/data` request. |
| CHARTS-10 | Toggle overlays | Volume and RTH-only are client state; the reference-levels toggle drives `useReferenceLevels`; the gamma toggle drives `useGammaLevels` (SPY, IWM, QQQ, SPX only); the signals toggle drives `useSignalSeries` markers. |
| CHARTS-11 | Run a replay session | `useReplaySession` reveals the loaded bars one at a time (a 15-bar warm start); Mark Entry during a session POSTs `/api/journal/trades` with `source: 'replay'` and the session id. |
| CHARTS-12 | Backtest my trades | POSTs `/api/backtest/replay-trades` for the ticker's journal trades and opens the scorecard modal (titled "Backtest my trades"). |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| CHARTS-13 | loading | present | `WidgetState.tsx`'s `WidgetSkeleton` on the chart; "Querying historical signals…" (Similar setups); "Loading backtest data…" (Backtester); "Scoring your trades against the system benchmark…" (scorecard). |
| CHARTS-14 | empty | present | "No market data available for this date" / "Select a date to load chart data"; "Session ended: no closed trades to score"; Similar setups' placeholder text; "No backtest results found". |
| CHARTS-15 | error | present | `WidgetState.tsx`'s `WidgetError` ("Couldn't load this data") on the chart; Similar setups shows the raw error message; Backtester shows "No backtest results for…"; a failed replay shows "Replay failed:…". |
| CHARTS-16 | stale | present | "Snapped to…" when the review date was not a trading day, and "N trades hidden" past the review or replay cutoff; `BacktesterSection` formats run dates through `fmtRunDate`. |
| CHARTS-17 | permission | not tracked (new category); present | `SignInBanner` ("Sign in to load chart data") plus a compact `DataGate` around the cards; `WidgetState.tsx`'s `SignInEmptyState` on a 401 from the chart's own query. |

#### Journeys
1. Analyse a level: Opens /charts and picks a date and timeframe (CHARTS-09) → Turns on Levels and Gamma overlays (CHARTS-10) → Reads King, Gate and Flip against price (CHARTS-10) → Checks the Strategy conditions card for the voter read (CHARTS-05) → Opens Similar setups to see how the pattern resolved before (CHARTS-06)
2. Train on bar replay: Starts a replay session (CHARTS-11) → Steps bars forward one at a time (CHARTS-04, CHARTS-11) → Marks an entry and picks CALL, PUT or skip (CHARTS-11) → Finishes the session (CHARTS-11) → the session always ends "Session ended: no closed trades to score" (CHARTS-14); nothing on this page can close a marked trade, so the post-session scorecard never opens here (see the matrix Charts Gaps)
3. Backtest your own trades: Scrolls to the Backtester section (CHARTS-07) → sees results computed once in February 2026, not a live run over the trader's own journal; the seed's on-demand "Backtest my trades" button and journey no longer exist (see the matrix Charts Gaps) → Finishing a replay session here (CHARTS-11) always ends "Session ended: no closed trades to score" (CHARTS-14); nothing on the page can close a trade to score, so the scorecard the seed expects never opens (see the matrix Charts Gaps)

#### Elements
##### CHARTS-01 · Toolbar

##### CHARTS-02 · Candlestick chart

##### CHARTS-03 · Crosshair bar

##### CHARTS-04 · Replay session controls

##### CHARTS-05 · Strategy conditions card

##### CHARTS-06 · Similar setups card

##### CHARTS-07 · Backtester

##### CHARTS-08 · Post-session scorecard

##### CHARTS-09 · Change date or timeframe

##### CHARTS-10 · Toggle overlays

##### CHARTS-11 · Run a replay session

##### CHARTS-12 · Backtest my trades

##### CHARTS-13 · State: loading

##### CHARTS-14 · State: empty

##### CHARTS-15 · State: error

##### CHARTS-16 · State: stale

##### CHARTS-17 · State: permission

### SCREEN-OPTIONSFLOW — `/options`

- **Purpose:** Options flow, Greeks and the 2-D strike x expiration gamma grid.
- **Status:** Production but needs remediation · **Blocking issue:** [#826](https://github.com/TeneikaAskew/stocks/issues/826) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/OptionsFlowPage.tsx` (68 lines)
- **Child components:** `TickerCombobox`
- **API calls (from source):** none found in the page component — issued by child components or hooks
- **Stores:** `useTickerStore`
- **E2E specs:** `tests/shared/gamma-levels.spec.ts`, `tests/options/options-flow.spec.ts`
- **PR lineage:** [#255](https://github.com/TeneikaAskew/stocks/pull/255) Cloudflare→FastAPI cutover · [#540](https://github.com/TeneikaAskew/stocks/pull/540)/[#541](https://github.com/TeneikaAskew/stocks/pull/541) grid math + endpoints · [#645](https://github.com/TeneikaAskew/stocks/pull/645) wire Swing Mode to real /grid
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/options/dates/{ticker} | dates[] (types: `useOptionsDates.ts` OptionsDatesResponse; fixture: `tests/helpers/fixtures/options.ts`) | fetch-av-options-realtime every 5min 09:00-15:55 ET Mon-Fri → etf_options_snapshots | 5min staleTime | `useLatestOptionsDate`/`useAllOptionsDates` → date pickers across all views |
| GET /api/options/{ticker}/grid (live) · GET /api/options/{ticker}/{date}/grid (historical) | cells[].strike/gex/net_gamma, summary (types: `useGammaGrid.ts` GammaGridCell/GammaGridSummary) | fetch-av-options-realtime every 5min 09:00-15:55 ET Mon-Fri → etf_options_snapshots | live grid refetches every 60s (50s staleTime); historical holds 1h | `useGammaGrid` → Swing Mode |
| GET /api/options/{ticker}/{date}/levels | king/gate/flip strikes, spot (types: `useGammaLevels.ts` GammaLevelsResponse) | fetch-av-options-realtime every 5min 09:00-15:55 ET Mon-Fri → etf_options_snapshots | 1h staleTime | `useGammaLevels` → Swing Mode legend, Trinity Mode, Profiles taxonomy |
| GET /api/options/{ticker}/{date} · GET /api/options/live/{ticker}/{date} | options[] chain records, snapshot_timestamp, metadata.source (types: `ProfilesTab.tsx` OptionsResponse) | fetch-av-options-backfill 21:00 ET Mon-Fri → etf_options_snapshots | 1h staleTime | `useOptionsData` (inline in `ProfilesTab`) → Profiles chain |
| POST /api/options/greeks | per-strike delta/gamma/theta/vega, GEX by strike (types: `useOptionsGreeks.ts` GreeksResponse) | fetch-av-options-realtime every 5min 09:00-15:55 ET Mon-Fri and fetch-av-options-backfill 21:00 ET Mon-Fri → etf_options_snapshots |  | `useOptionsGreeks` → Profiles Greeks and gamma profile |
| GET /api/insights/ticker/search · GET /api/market/coverage · POST /api/insights/watchlist/add | matches[], coverage flags, watchlist add result (types: `useTickerSearch.ts` TickerSearchResult/CoverageResult/WatchlistAddResult) |  |  | `TickerCombobox` (`useTickerSearch.ts`) → Symbol picker |
| mock fixture: optionsFlowMock.ts | flow tape rows (no server type; `DemoDataBanner` marks it mock) | bundled in `src/data/optionsFlowMock.ts` |  | `FlowTab` → Flowseeker Live Feed |
| mock fixture: contractDrilldownMock.ts | per-contract tape rows (no server type; `DemoDataBanner` marks it mock) | bundled in `src/data/contractDrilldownMock.ts` |  | `ContractDrilldown` → Flowseeker Contract Drilldown |
| store: ticker |  | Zustand, per session |  | every view |

#### Displayed
| ID | Element | Component |
|---|---|---|
| OPTIONS-01 | Heatseeker: Swing Mode | `SwingMode` |
| OPTIONS-02 | Heatseeker: Trinity Mode | `TrinityTab` |
| OPTIONS-03 | Flowseeker: Live Feed | `FlowTab` |
| OPTIONS-04 | Flowseeker: Contract Drilldown | `ContractDrilldown` |
| OPTIONS-05 | Profiles | `ProfilesTab` |

#### Actions
| ID | Action | What happens |
|---|---|---|
| OPTIONS-06 | Symbol picker | `TickerCombobox` writes `tickerStore`'s `activeTicker`, which drives every view on the page. |
| OPTIONS-07 | View switcher | `OptionsFlowPage`'s `TABS` state switches Gamma Map, Flow and Profiles; each of `GammaMapSection` (Swing/Trinity) and `FlowSection` (Live Feed/Contract Drilldown) has its own inner mode toggle. |
| OPTIONS-08 | Pick an expiration date | Re-fetches the grid, levels and chain for the picked date; `ProfilesTab` steps through snapshot dates with a chevron stepper (`dateIdx`), `SwingMode`'s expiry chips (`expiryFilter`) filter client-side only. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| OPTIONS-09 | loading | present | "Loading live grid…" (`SwingMode`); "Loading {symbol} levels…" (`TrinityTab`); "Loading available dates…" / "Loading options chain…" (`ProfilesTab`). |
| OPTIONS-10 | empty | present | "No options dates available for…" / "No options data returned for…" (`ProfilesTab`); "No gamma levels available for…" (`TrinityTab`); "Data unavailable:…" with the server's reason (`SwingMode`). |
| OPTIONS-11 | error | present | "Options chain unavailable" (`ProfilesTab`); Swing and Trinity reuse their empty copy for a failed request; the Profiles metrics bar falls back to `EMPTY_GREEKS` when the Greeks POST fails. |
| OPTIONS-12 | stale | present | A `SourcePill` in `SwingMode` labels the snapshot `realtime`, `eod_fallback`, `stale_fallback` or `unavailable` (`classify_gamma_freshness`); the Profiles source footer shows the snapshot time via `isoToEtDisplay`. |
| OPTIONS-13 | permission | not tracked (new category); present | `SignInBanner` ("Sign in to load options data") plus `DataGate` around the tab content. |

#### Journeys
1. Find the level that matters: Opens /options with Heatseeker in Swing Mode (OPTIONS-01) → the expiry chips only change their own highlight here; picking an expiration does not refetch the grid in Swing Mode (see the matrix Options Gaps) → Reads the strike by expiry grid for the largest positive GEX (OPTIONS-01) → Notes King, Gate and Flip from the legend and node list (OPTIONS-01) → Carries those levels to /charts as an overlay (CHARTS-10)
2. Check index positioning: Switches Heatseeker to Trinity Mode (OPTIONS-02, OPTIONS-07) → Compares SPX, SPY and QQQ strike ladders (OPTIONS-02) → Identifies where dealer hedging concentrates (OPTIONS-02)
3. Inspect flow (demo data): Switches to Flowseeker, Live Feed (OPTIONS-03, OPTIONS-07) → Demo-data banner states this view is mock (OPTIONS-03) → Opens Contract Drilldown for a per-contract tape (OPTIONS-04) → Switches to Profiles for real Greeks and gamma (OPTIONS-05, OPTIONS-07)

#### Elements
##### OPTIONS-01 · Heatseeker: Swing Mode

##### OPTIONS-02 · Heatseeker: Trinity Mode

##### OPTIONS-03 · Flowseeker: Live Feed

##### OPTIONS-04 · Flowseeker: Contract Drilldown

##### OPTIONS-05 · Profiles

##### OPTIONS-06 · Symbol picker

##### OPTIONS-07 · View switcher

##### OPTIONS-08 · Pick an expiration date

##### OPTIONS-09 · State: loading

##### OPTIONS-10 · State: empty

##### OPTIONS-11 · State: error

##### OPTIONS-12 · State: stale

##### OPTIONS-13 · State: permission

### SCREEN-PLAYBOOK — `/playbook`

- **Purpose:** The day’s structured setups — trigger, invalidation, targets — with as-of review mode.
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
- **Status:** Production but needs remediation · **Blocking issue:** [#905](https://github.com/TeneikaAskew/stocks/issues/905) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/SignalsPage.tsx` (341 lines)
- **Child components:** `KpiTile`, `MicroLabel`, `TickerCombobox`
- **API calls (from source):** `/api/signals/`
- **Stores:** `useReviewDateStore`, `useTickerStore`
- **E2E specs:** `tests/signals/signals.spec.ts`
- **PR lineage:** [#184](https://github.com/TeneikaAskew/stocks/pull/184) lib/strategies origin · [#504](https://github.com/TeneikaAskew/stocks/pull/504) dedicated Discord channel · [#803](https://github.com/TeneikaAskew/stocks/pull/803) RVOL respecification
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/signals/{ticker}?limit=5000 | signals[].time/direction/score/rsi/ema9/ema20/close/volume, count, returned, source (types: `SignalsPage.tsx` SignalRow/SignalsResponse; fixture: `tests/helpers/fixtures/signals.ts`) | historical-signals-watchlist 01:00 ET Tue-Sat → historical_signals | 5min staleTime; the newest row is the prior session's (the writer runs at 01:00) | `useSignals` (inline in `SignalsPage`) → Signals table |
| GET /api/analytics/summary/{ticker}?days=90 | totalTrades, closedTrades, winCount, lossCount, winRate, totalPnL, avgPnL, profitFactor, callCount, putCount (types: `useTradeAnalytics.ts` TradeStats) | signal-monitor 09:25 ET Mon-Fri and signal-monitor-eod-resolver 16:30 ET Mon-Fri → trades | 5min staleTime | `useTradeSummary` (`useTradeAnalytics.ts`) → Performance KPIs |
| GET /api/insights/ticker/search · GET /api/market/coverage · POST /api/insights/watchlist/add | matches[], coverage flags, watchlist add result (types: `useTickerSearch.ts`) |  |  | `TickerCombobox` → Header ticker picker |
| store: ticker, review date |  | Zustand, per session |  | every card |

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
| SIGNALS-05 | Filter and sort | Direction, minimum score and date-range filters, plus column-header sort, all applied client-side over the fetched 5,000-row window. |
| SIGNALS-06 | Clear filters | Resets every filter; the button shows only while at least one is active. |
| SIGNALS-07 | Review mode | The shell's global replay control takes over the To date, which locks and shows a `global` tag. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| SIGNALS-08 | loading | present | "Loading signals…" |
| SIGNALS-09 | empty | present | "No signals match your filters"; the Performance block hides itself entirely when there are no closed trades. |
| SIGNALS-10 | error | present | "Signal data not found for {ticker}. Run the signals generation pipeline first." is rendered the same way for both a 503 outage and a 500 defect; a failed Performance summary instead renders nothing. |
| SIGNALS-11 | stale | present | The `global` tag on the To date in review mode is the page's only as-of marker. |
| SIGNALS-12 | permission | not tracked (new category); present | `SignInEmptyState`'s `DataGate` replaces the body when signed out. |

#### Journeys
1. Find the highest-quality setups: Opens /signals (SIGNALS-01) → Reads the 90-day backtest KPIs (SIGNALS-02) → Filters to CALL and min score 7+ (SIGNALS-05) → Sorts by score (SIGNALS-05) → Notes the times to check on /charts
2. Audit a period: Sets a From and To date (SIGNALS-05) → Compares win rate against the headline KPI (SIGNALS-02) → Sees "Showing first 500 of N" and narrows the filters further (SIGNALS-04, SIGNALS-05)
3. Ticker has no signals: Switches to a ticker the pipeline has not processed (SIGNALS-01) → An amber card explains signals were not found (SIGNALS-10) → Prompts running the signals generation pipeline first (SIGNALS-10)

#### Elements
##### SIGNALS-01 · Header

##### SIGNALS-02 · Performance KPIs

##### SIGNALS-03 · Filter bar

##### SIGNALS-04 · Signals table

##### SIGNALS-05 · Filter and sort

##### SIGNALS-06 · Clear filters

##### SIGNALS-07 · Review mode

##### SIGNALS-08 · State: loading

##### SIGNALS-09 · State: empty

##### SIGNALS-10 · State: error

##### SIGNALS-11 · State: stale

##### SIGNALS-12 · State: permission

### SCREEN-JOURNAL — `/journal`

- **Purpose:** One-stop trade cockpit: interactive chart marking, examples, broker CSV import, per-user trades.
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
- **Status:** Experimental · **Blocking issue:** [#916](https://github.com/TeneikaAskew/stocks/issues/916) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/InsightsPage.tsx` (587 lines)
- **Child components:** `AgentsPanel`, `BriefVsInsightsCard`, `CatalystsCard`, `DebateCard`, `DegradationBanner`, `HeaderCard`, `KeyLevelsCard`, `MicroLabel`, `PersonaPlansCard`, `RiskFlagsCard`, `SignalsCard`, `SimilarTradesCard`, `StratCard`, `TickerCombobox`
- **API calls (from source):** `/api/insights/chat`
- **Stores:** `useTickerStore`
- **E2E specs:** `tests/insights/insights.spec.ts`
- **PR lineage:** [#353](https://github.com/TeneikaAskew/stocks/pull/353) divergence card · [#344](https://github.com/TeneikaAskew/stocks/pull/344) reflection memory · [#451](https://github.com/TeneikaAskew/stocks/pull/451) break feedback loop
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/dashboard/brief/{ticker} | ticker, bias, signal_status, ftfc_direction (types: `useInsights.ts` BriefDirection) | premarket-brief 08:30 ET Mon-Fri → premarket_analysis | 60s staleTime; a missing bias reads as no brief, never a fabricated "neutral" | `useBriefDirection` (`useInsights.ts`) → Report cards' brief-vs-insights divergence card |
| GET /api/insights/report/{ticker} (optional as_of) · GET /api/insights/reports/{report_id} | ticker, as_of, report.{direction, conviction, thesis, entry_zone, stop, targets, invalidation, time_horizon, key_levels, strat_status, catalysts, bull_case, bear_case, risk_flags, persona_plans, supporting_signals, similar_past_trades, confidence_score, failed_sections, model_versions, run_cost_usd, run_latency_ms, per_role_cost}, cost_usd, latency_ms, run_kind (types: `src/types/insights.ts` InsightReportEnvelope/InsightReport) | insight-pipeline 08:45 ET Mon-Fri and auto-refresh-top-n 08:10 ET Mon-Fri → insight_reports | 60s staleTime (live report); 5min staleTime (a historical report opened by id) | `useInsightReport` / `useInsightReportById` (`useInsights.ts`) → Report cards |
| GET /api/insights/report/{ticker}/history?limit=20 | ticker, count, reports[].id/as_of/direction/conviction/thesis/cost_usd (types: `src/types/insights.ts` InsightHistoryRow/InsightHistoryResponse) | insight-pipeline 08:45 ET Mon-Fri and auto-refresh-top-n 08:10 ET Mon-Fri → insight_reports | 60s staleTime | `useInsightHistory` (`useInsights.ts`) → History tab |
| POST /api/insights/report/{ticker}/refresh (optional as_of) · GET /api/insights/runs/{run_id} | run_id, ticker, status (refresh); id, status, trigger, started_at, finished_at, error, report_id (run status) (types: `src/types/insights.ts` RefreshResponse/RunStatus) |  | run status polled every 3s while `queued` or `running` | `useRefreshInsight` / `useRunStatus` (`useInsights.ts`) → Generate or refresh a report, Set a point-in-time cutoff |
| GET /api/admin/routes | routes[].role/provider/model/updated_at/updated_by (types: `useAdmin.ts` RouteListResponse) |  | 30s staleTime | `useAdminRoutes` (`useAdmin.ts`) → Agents tab (`AgentsPanel`) |
| GET /api/insights/watchlist | run_id, as_of, candidate_count, excluded_count, ranked[].ticker/score/pct_of_max/catalyst_types/catalyst_metadata/score_breakdown, weights_used, duration_ms (types: `src/types/watchlist.ts` WatchlistResponse) | fetch-earnings-calendar 19:00 ET Mon-Fri → earnings_calendar (one of several candidate-tag tables the ranker reads) | 5min staleTime | `useWatchlist` (`useWatchlist.ts`) → Watchlist tab (`WatchlistPanel`) |
| GET /api/insights/ticker/search · POST /api/insights/watchlist/add | results[].symbol/name/type/region/currency/match_score (search); ticker/added/info/quote/peers/watchlist (add) (types: `useTickerSearch.ts` TickerSearchResult/WatchlistAddResult) |  | 60s staleTime (search) | `useTickerSearch` / `useAddToWatchlist` (`useTickerSearch.ts`) → Watchlist tab's `TickerSearchPanel` |
| POST /api/insights/chat | message, mode, ticker, history (request); streamed plain-text reply, no `response_model` |  |  | `ChatView` (inline in `InsightsPage.tsx`) → Chat tab |
| store: ticker |  | Zustand, per session |  | every tab |

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
| INSIGHTS-07 | Generate or refresh a report | `onRefresh` calls `useRefreshInsight`, which enqueues a run; `useRunStatus` polls it every 3s until `done` or `failed`, then invalidates the report and history queries. |
| INSIGHTS-08 | Set a point-in-time cutoff | The `datetime-local` input (capped at now) sets `asOf`; the next refresh sends it as `as_of` so the pipeline runs against data available at that moment; the × button clears it back to live. |
| INSIGHTS-09 | Add or remove watchlist tickers | `TickerSearchPanel` posts through `useAddToWatchlist`, which re-reads the list server-side; `useRemoveFromWatchlist` exists in `useTickerSearch.ts` but no control on the page calls it. |
| INSIGHTS-10 | Chat | `ChatView`'s `send` streams `POST /api/insights/chat` and appends the response to the last assistant message as it arrives. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| INSIGHTS-11 | loading | present | Spinners per surface: report, history, run status ("queued…"/"running…"), watchlist ranking, chat. |
| INSIGHTS-12 | empty | present | "No report yet" with a Generate Report button; "No history yet."; the Agents and Watchlist panels' own empty copy. |
| INSIGHTS-13 | error | present | "Failed to load report: {message}"; the Agents tab's one admin message for any roster failure; "Failed to load watchlist:"; a failed refresh or chat send logs to the console only, with no rendered banner. |
| INSIGHTS-14 | stale | present | "Viewing historical report, not the current latest." while a History entry is open; the live report carries no age marker of its own. |
| INSIGHTS-15 | permission | not tracked (new category); present | `DataGate` wraps every tab body; the Agents tab separately reads a 401/403 from `/api/admin/routes` as its own admin-required message. |

#### Journeys
1. Read the day's council report: Opens /insights (INSIGHTS-01) → Reads the thesis, direction, conviction and confidence (INSIGHTS-01) → Checks key levels and risk flags (INSIGHTS-01) → Reads the agent debate and the judge's verdict (INSIGHTS-01) → Picks the persona plan matching their style (INSIGHTS-01)
2. Generate a fresh report: Switches ticker → No report exists yet (INSIGHTS-12) → Clicks Regenerate (INSIGHTS-07) → Run progress is polled (INSIGHTS-07) → Report cards populate; a degradation banner appears if part of the pipeline was unavailable (INSIGHTS-01, INSIGHTS-06)
3. Point-in-time replay: Sets a cutoff date and time (INSIGHTS-08) → the pipeline re-runs, though three reads (the catalysts news slice, reflection memory, the trade planner's blue-sky offset) ignore the cutoff, and the result is never labeled as a replay in the Report or History views (see the matrix Insights Gaps) → Opens the run from History to see it (INSIGHTS-03) → Clears the cutoff to return to live (INSIGHTS-08)
4. Track a basket: Opens the Watchlist tab (INSIGHTS-04) → Searches and adds tickers (INSIGHTS-09) → the tab shows the ranker's score, not quotes, and is empty for every signed-in user today, since the ranking is scoped to the caller's own rows and only the shared default account holds any (see the matrix Insights Gaps) → the added ticker's card shows its quote with no click-through; switches to the Report tab and picks the ticker from the header combobox instead (INSIGHTS-01)

#### Elements
##### INSIGHTS-01 · Report cards

##### INSIGHTS-02 · Agents tab

##### INSIGHTS-03 · History tab

##### INSIGHTS-04 · Watchlist tab

##### INSIGHTS-05 · Chat tab

##### INSIGHTS-06 · Degradation banner

##### INSIGHTS-07 · Generate or refresh a report

##### INSIGHTS-08 · Set a point-in-time cutoff

##### INSIGHTS-09 · Add or remove watchlist tickers

##### INSIGHTS-10 · Chat

##### INSIGHTS-11 · State: loading

##### INSIGHTS-12 · State: empty

##### INSIGHTS-13 · State: error

##### INSIGHTS-14 · State: stale

##### INSIGHTS-15 · State: permission

### SCREEN-CATALYSTS — `/catalysts`

- **Purpose:** Earnings, economic events, news and SEC filings as trade context.
- **Status:** Production but needs remediation · **Blocking issue:** [#863](https://github.com/TeneikaAskew/stocks/issues/863) · **Owner:** TBD · **Target phase:** see [13](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/13-ROADMAP.md) · **Last reviewed:** 2026-08-30
- **Component:** `src/routes/CatalystsPage.tsx` (625 lines)
- **API calls (from source):** `/api/catalysts/events`, `/api/catalysts/types`
- **Stores:** `useThemeStore`, `useTickerStore`
- **E2E specs:** `tests/catalysts/catalysts.spec.ts`
- **PR lineage:** [#624](https://github.com/TeneikaAskew/stocks/pull/624) earnings router origin · [#220](https://github.com/TeneikaAskew/stocks/pull/220) catalyst proximity · [#532](https://github.com/TeneikaAskew/stocks/pull/532) $-attribution
- **Target:** meet REQ-UX-001 — explicit stale/unavailable presentation, keyboard operability,
  WCAG 2.1 AA contrast, and acceptance tests for every state listed absent above.

#### Data it needs
| Endpoint | Fields read | Produced by | Freshness assumed | Consumer |
|---|---|---|---|---|
| GET /api/catalysts/events?date_from&date_to | status, source, date_range, total, events_by_date[date][].ticker/company_name/catalyst_type/event/title/expected_impact/impact/confirmed/source/sentiment_score/sentiment_label/relevance_score/url/items/insiders/total_value/country/actual/forecast/previous (types: `CatalystsPage.tsx` CatalystEvent/CatalystsResponse) | fetch-news-sentiment hourly 08:00-17:00 ET Mon-Fri → news_sentiment | 5min staleTime; news bounded to the last 48 hours regardless of the requested range | `useCatalystEvents` (inline in `CatalystsPage.tsx`) → Hot Now, Impact tier filter, Type chips, Event timeline |
| GET /api/catalysts/types | benzinga_types, wsh_only_types, upgrade_note (types: `CatalystsPage.tsx` CatalystTypesResponse) |  | 1hr staleTime | `useCatalystTypes` (inline in `CatalystsPage.tsx`) → Type chips, WSH upgrade banner |
| store: ticker, theme |  | Zustand, per session |  | Open insight report, Type chip colors |

#### Displayed
| ID | Element | Component |
|---|---|---|
| CATALYSTS-01 | Hot Now | inline in `CatalystsPage.tsx` (`hotEvents`) |
| CATALYSTS-02 | Impact tier filter | inline in `CatalystsPage.tsx` (`Min impact:` select, header H/M/L counters) |
| CATALYSTS-03 | Type chips | inline in `CatalystsPage.tsx` (`TYPE_CONFIG`, `useCatalystTypes`) |
| CATALYSTS-04 | Event timeline | inline in `CatalystsPage.tsx` (`DateGroup`, `EventRow`) |
| CATALYSTS-05 | WSH upgrade banner | `WSHUpgradeBanner` (inline in `CatalystsPage.tsx`) |

#### Actions
| ID | Action | What happens |
|---|---|---|
| CATALYSTS-06 | Change date range | `DateRangePicker`, default today−3 to today+14, with a `Today` reset and a Refresh button that refetches the same request. |
| CATALYSTS-07 | Filter by impact or type | Client-side `passes`: type, then minimum impact, applied to the timeline only; Hot Now ignores both filters. |
| CATALYSTS-08 | Expand an event | The title button toggles truncation; nothing else opens. |
| CATALYSTS-09 | Open insight report | `handleOpenTicker` sets `useTickerStore` and navigates to `/insights`. |

#### States
| ID | State | Present in source | Presentation |
|---|---|---|---|
| CATALYSTS-10 | loading | present | A spinner while `isLoading`; the header meanwhile reads "0 events". |
| CATALYSTS-11 | empty | absent | No empty branch among the loading, error and timeline blocks: a range with no events shows only "0 events" and the filter bars. |
| CATALYSTS-12 | error | present | "Failed to load catalysts: Failed to fetch catalysts", the hook's one fixed message whatever the actual status. |
| CATALYSTS-13 | stale | present | The header's `source` string (`Benzinga` when absent) is the only provenance; the response carries no write time for any source. |
| CATALYSTS-14 | permission | not tracked (new category); present | `DataGate` wraps the body below the header and range controls. |

#### Journeys
1. Plan the week: Opens /catalysts (CATALYSTS-01) → Reads Hot Now for today and tomorrow (CATALYSTS-01) → Sets the range to cover the coming week (CATALYSTS-06) → Filters to high impact only (CATALYSTS-02, CATALYSTS-07) → Notes the dates to avoid holding through (CATALYSTS-04)
2. Investigate one event: Filters by type, earnings (CATALYSTS-03, CATALYSTS-07) → Expands an event for detail and sentiment (CATALYSTS-08) → Clicks "Open insight report" (CATALYSTS-09) → Lands on /insights for that ticker (CATALYSTS-09)
3. Range with nothing in it: Narrows the range to a quiet week (CATALYSTS-06) → The timeline has no rows (CATALYSTS-11) → No explicit empty state is shown, a known gap (CATALYSTS-11)

#### Elements
##### CATALYSTS-01 · Hot Now

##### CATALYSTS-02 · Impact tier filter

##### CATALYSTS-03 · Type chips

##### CATALYSTS-04 · Event timeline

##### CATALYSTS-05 · WSH upgrade banner

##### CATALYSTS-06 · Change date range

##### CATALYSTS-07 · Filter by impact or type

##### CATALYSTS-08 · Expand an event

##### CATALYSTS-09 · Open insight report

##### CATALYSTS-10 · State: loading

##### CATALYSTS-11 · State: empty

##### CATALYSTS-12 · State: error

##### CATALYSTS-13 · State: stale

##### CATALYSTS-14 · State: permission

### SCREEN-ADMIN — `/admin`

- **Purpose:** Operator surface: model routing, strat-engine state, structure brief, route config.
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
| ADMIN-04 | Grant or revoke roles | `toggleRole` (`UsersPanel.tsx`) sends the account's current roles plus or minus the clicked one through `useUpdateUserRoles`; applies immediately. |
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
1. Onboard a teammate: Opens /admin, Users & roles (ADMIN-01) → Finds the account (ADMIN-01) → Toggles a role, it applies immediately (ADMIN-04) → Disables an account later without deleting its history (ADMIN-05); on prod, where AUTH_MODE is iap, the request always 409s, so disable only works on staging today (see the matrix Admin Gaps)
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

