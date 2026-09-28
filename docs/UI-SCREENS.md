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

##### SHARED-02 · Open prefixes kept in sync (api/auth.py and authedFetch OPEN_PREFIXES)

##### SHARED-03 · Data path: authedFetch, apiTargets, Vite proxy, staging fallback

##### SHARED-04 · Mock mode and demo-data banners

##### SHARED-05 · React Query defaults (five-minute staleness, one retry)

##### SHARED-06 · Failure lane: job log, Cloud Logging sink, Pub/Sub, failure-notifier, GitHub issue

##### SHARED-07 · Freshness watchdog and /api/health/freshness

##### SHARED-08 · Liveness: /api/health

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
| LANDING-12 | loading (waitlist submit in flight) | absent | `WaitlistSection` disables the submit button and shows "Joining…" while `status === 'submitting'`. |
| LANDING-13 | error (waitlist failure shown inline) | absent | `WaitlistSection` renders the thrown error's message in a `role="alert"` block (`data-testid="waitlist-error"`), never a silent failure. |

#### Journeys
1. First-time visitor to waitlist: Lands on / → Reads the hero and watches the agent terminal type (LANDING-02) → Scrolls the bento tiles and module deep-dives (LANDING-03, LANDING-05) → Clicks "Join the waitlist" (LANDING-10) → Submits email, an error shows inline if it fails (LANDING-12, LANDING-13)
2. Returning user to the app: Lands on / (an old /welcome link redirects here) → Clicks "Sign in" (LANDING-09) → Arrives at /dashboard → AuthGate shows the sign-in screen (firebase mode) (AUTH-01) → Signs in and lands on the Dashboard (AUTH-03, AUTH-04)
3. In-app user looking for the FAQ: Opens Support in the app nav (SHELL-01) → Clicks FAQ (/#faq) (SHELL-01) → Lands on the landing page (LANDING-08) → The page scrolls to the FAQ section on mount (LANDING-08)

#### Elements
##### LANDING-01 · LandingNav

##### LANDING-02 · Hero with the agent terminal

##### LANDING-03 · BentoGrid

##### LANDING-04 · ChartShowcase

##### LANDING-05 · ModuleDives

##### LANDING-06 · DailyRhythm

##### LANDING-07 · WaitlistSection

##### LANDING-08 · FAQ (#faq)

##### LANDING-09 · Sign in (to /dashboard)

##### LANDING-10 · Request access, join the waitlist

##### LANDING-11 · See a live day (scroll to #learn)

##### LANDING-12 · State: loading (waitlist submit in flight)

##### LANDING-13 · State: error (waitlist failure shown inline)

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

##### AUTH-05 · Sign-up mode

##### AUTH-07 · Identity and role read (email, admin, dev)

##### AUTH-03 · Google sign-in, with the new-tab variant when framed

##### AUTH-04 · Email and password sign-in with inline error

##### AUTH-06 · Forgot password: reset email, then /auth/action

##### AUTH-09 · Sign out

##### AUTH-02 · State: loading spinner while the session resolves

##### AUTH-08 · State: permission, 401 on a gated call shows "Sign in to load data"

##### AUTH-10 · State: error, config fetch failure shows the config-error screen

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

##### SHELL-02 · Header in sidebar mode (auth status, sign out, replay control, theme toggle)

##### SHELL-03 · MockModeBanner

##### SHELL-04 · AuthStatusBanner and EmailVerificationBanner

##### SHELL-05 · MostActiveBar marquee

##### SHELL-06 · RouteErrorBoundary

##### SHELL-07 · Market session badge (LIVE, PRE, AH, CLOSED)

##### SHELL-08 · Command palette (Cmd-K, Ctrl-K)

##### SHELL-09 · Replay control (historical review)

##### SHELL-10 · Theme toggle

##### SHELL-11 · Sign out

##### SHELL-12 · State: loading (marquee before the first response)

##### SHELL-13 · State: empty (marquee renders nothing on an empty list)

##### SHELL-14 · State: error (marquee absent on 500, page renders)

##### SHELL-15 · State: stale (session badge truthful when closed)

##### SHELL-16 · State: permission (auth status banner when signed out or blocked)

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
| GET /api/live/avg-volume/{ticker} | avg_volume_20d, sample_size, last_date, source (types: `useLiveHistory.ts` AvgVolume) | fetch-market-data 23:00 ET Mon-Fri → market_data_daily | 1h staleTime | `useAvgVolume` → RVOL tile |
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
2. Train on bar replay: Starts a replay session (CHARTS-11) → Steps bars forward one at a time (CHARTS-04, CHARTS-11) → Marks an entry and picks CALL, PUT or skip (CHARTS-11) → Finishes the session (CHARTS-11) → Reads the post-session scorecard against the system benchmark (CHARTS-08)
3. Backtest your own trades: Scrolls to the Backtester section (CHARTS-07) → sees results computed once in February 2026, not a live run over the trader's own journal; the seed's on-demand "Backtest my trades" button and journey no longer exist (see the matrix Charts Gaps) → the equivalent live outcome comes from finishing a replay session instead (CHARTS-11), read as the post-session scorecard (CHARTS-08)

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
| JOURNAL-07 | Mark entry on the chart | `TradeMarkingChart` drives `useTradeMarking`; clicking the entry then the exit bar posts through `useCreateChartTrade` (`source: "chart"`) and flips the view to My journal, and a later exit patches through `useCloseChartTrade`. |
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
4. Track a basket: Opens the Watchlist tab (INSIGHTS-04) → Searches and adds tickers (INSIGHTS-09) → the tab shows the ranker's score, not quotes, and is empty for every signed-in user today, since the ranking is scoped to the caller's own rows and only the shared default account holds any (see the matrix Insights Gaps) → Jumps into any ticker's report (INSIGHTS-01)

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

