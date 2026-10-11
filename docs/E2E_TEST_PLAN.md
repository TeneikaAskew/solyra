<!-- Moved from the stocks repo (TeneikaAskew/stocks) when the frontend
     split out into this one. Paths were rewritten for this layout: what was
     `platform/src/...` is now `src/...`.

     Any remaining `platform/...` path is a STOCKS path and is left as-is on
     purpose — `platform/api/`, `platform/Dockerfile`, `platform/deploy.sh` and
     `platform/dist/` are the backend and its build, which stayed there. -->

# End-to-End Test Plan — Stocks Trading Platform

**Last reviewed:** unknown · **Last scanned:** 2026-09-16 · **Owner:** TBD

> Canonical test strategy for the Obsidian Analyst redesign. Three layers —
> **frontend E2E (Playwright)**, **backend (pytest)**, and **GCP data/pipeline
> validation** — each runnable independently. Frontend commands run from THIS
> repo's root (`package.json`, `playwright.config.ts` and `tests/` live here);
> the backend (`make …`) and GCP commands run from the stocks repo, which owns
> that code.

---

## 0. Layers at a glance

| Layer | What it proves | Tooling | Where | Run command |
|---|---|---|---|---|
| **Frontend E2E** | Every route renders, the redesigned surfaces show the right data, no console errors, responsive | Playwright (chromium) + network mocks | `tests/<page>/*.spec.ts` | `npm run e2e` |
| **Frontend E2E (live)** | **NOT IMPLEMENTED.** Would prove the deployed app serves real data | Playwright (`cloud` project) | `*.cloud.spec.ts` — **none exist**, so `e2e:cloud` exits `No tests found` | `npm run e2e:cloud:auth` (interactive Firebase sign-in) then `npm run e2e:cloud` |
| **Backend unit** | `lib/` math (indicators, strat, gamma, backtest), API contracts | pytest | `tests/test_*.py` | `make test` |
| **Backend E2E / scripts** | Pipeline scripts, fetchers, signal monitor | pytest | stocks repo: `tests/test_e2e.py`, `tests/test_scripts_*.py` | `make test-e2e` · `make test-scripts` |
| **GCP data/pipeline** | Real Cloud SQL data exists + is fresh; jobs/services healthy | `db_query_cr.sh`, `gcloud`, `/api/health/freshness` | `scripts/`, GCP | see §4 |

---

## 1. Frontend E2E (Playwright) — primary

**Config:** `playwright.config.ts` — `testDir: ./tests`, 4 projects:
- **`warmup`**: not run directly — a dependency of `chromium` only. Warms the 14 routes in `tests/routes.warmup.ts`'s `ROUTES` against the freshly-booted Vite so the specs' wall-clock budgets measure a warm server, not a cold transform. One lazy page is outside that list: `/auth/action` (`AuthActionPage`, lazy at `src/App.tsx:28`, is not in `ROUTES`). `tests/shared/auth-gate.spec.ts` is the only spec that opens it, so its first `/auth/action` case pays for that page's cold transform and the later ones get Vite's cached result. `/welcome` is left out on purpose: it is a `<Navigate>` to `/` (`src/App.tsx:57`), not a lazy page.
- **`chromium`** (default): boots its **own** Vite on the dedicated E2E port (`:5199`, never your `:5173` dev server), all `/api/**` a test asserts on **mocked** per-spec (with `page.route`, or inside the page by mock-data mode in the mock-mode spec) → no backend needed, fast. Not fully network-isolated: `src/index.css:1` loads Montserrat from `fonts.googleapis.com`. `mockCommon` (`tests/helpers/mocks.ts:47-58`) fulfils both font hosts with empty bodies, and every spec reaches it before navigating, directly or through a fixture helper such as `mockDashboard` or `mockAllPages`, with two exceptions. The `Mock mode ON` block in `tests/shared/mock-mode.spec.ts` stubs both font hosts in its own `beforeEach` (`:45-50`) and registers no `/api` route there, because mock-data mode answers `/api` inside the page (two of its tests add a catch-all `**/api/**` route for after they leave the mode). `tests/landing/landing.spec.ts`'s `beforeEach` (`:19-23`) routes only `/api/config/firebase`, so its font request goes to the real CDN. `playwright.config.ts:143` sets `ignoreHTTPSErrors: true` for this project, which lets that request complete despite the headless shell's missing root CAs when the CDN is reachable; the landing spec asserts nothing about console errors either way. A few requests can also escape interception during teardown (`docs/TEST_COVERAGE_AUDIT.md` §10.7 counted 25 on 2026-09-07, as accepted `ECONNREFUSED` noise against Vite's dead proxy, not a fixture gap).
- **`iap-setup`** / **`cloud`**: run against the deployed FRONTEND (`solyra-stocks.lovable.app`, which now redirects to `stocks.insightscollective.org`), not a Cloud Run URL, and **not** behind IAP — the SPA is published separately since #957 and its API is gated per request by a Firebase ID token. `iap-setup` captures a real signed-in session interactively (including Firebase's IndexedDB persistence). `cloud` matches `*.cloud.spec.ts` and **none exist yet**, so it exits `No tests found` rather than running the hermetic specs against production, which would have forced `authMode: 'open'` and measured the mocks. Writing that suite is outstanding work. Both are skipped by the default command.

**Mock strategy:** `tests/helpers/mocks.ts` `mockCommon(page)` stubs the cross-cutting endpoints (`/api/health`, `/api/live/status`, brief, watchlist); each spec adds its own `page.route('**/api/<endpoint>', …)` with realistic fixtures. **Fixtures must match the production response shape** (CLAUDE.md Rule 0.3) — e.g. the dashboard brief mock carries `daily_indicators.close`, the signals mock carries `analytics/summary`.

### Coverage matrix (one spec per route + cross-cutting)

| Spec | Route / surface | Asserts |
|---|---|---|
| `landing.spec.ts` | `/` | landing page sections render signed-out (with an open-mode config route registered) · the visit requests no runtime config, no module whose path contains `firebase`, and none of `AuthGate.tsx`, `AppShell`, `AppGroup` or `SignInScreen` (issue #26; `src/lib/authGate.ts` is allowed) · still renders, with no sign-in screen, under a firebase-mode config route · waitlist rejects an invalid email · Sign in stays in bounds at 360/390/411 px |
| `dashboard.spec.ts` | `/dashboard` Overview | "Overview" heading · pre-market brief · KPI tiles (prev/latest close, 2-day, RSI) · **Candles\|Area chart toggle** · perf budget |
| `signals.spec.ts` | `/signals` | **90-day Performance P&L card** (win rate / profit factor) · explorer rows · CALL/PUT · empty state |
| `insights.spec.ts` (+ Agents) | `/insights` | Briefing dossier · **Agents tab** (run cost/latency · per-role pipeline · model-routing roster · recent runs) |
| `journal.spec.ts` | `/journal` | **KPI tiles + equity curve** · add/delete trade · CSV export |
| `catalysts.spec.ts` | `/catalysts` | feed grouped by date · impact/type filter chips · sentiment |
| `options-flow.spec.ts` · `gamma-levels.spec.ts` | `/options` | Gamma Map grid · GEX/VEX · King/Gate fallback · live-AV badge |
| `live-market.spec.ts` · `charts-cards.spec.ts` | `/live` `/charts` | hero tiles · candlestick canvas · reference levels |
| `playbook.spec.ts` · `reports.spec.ts` · `help.spec.ts` · `admin.spec.ts` · `admin-auth.spec.ts` | `/playbook` `/reports` `/help` `/admin` | cards · glossary · admin auth gate |
| `settings.spec.ts` | `/settings` | five tabs, lands on Profile · appearance write-through (`PUT /api/me/preferences`) · profile draft + Save (`PUT /api/me/profile`) · sync and save failures rendered, not swallowed |
| `navigation.spec.ts` | every route | each route loads without a fatal error |

Each spec lives in its page's folder under `tests/` (`tests/dashboard/dashboard.spec.ts`, `tests/shared/gamma-levels.spec.ts`, …); the table names the file, not the path.

There is **no Playwright spec for API contracts in this repo.** An earlier version of this table listed `api-smoke.spec.ts` and `phase1-charts.spec.ts`; the frontend-only split deleted both (`49f9710`; `docs/TEST_COVERAGE_AUDIT.md` records where each one's coverage went) and neither file exists anywhere on `main`. A related but different check, of mock payloads and request shapes against the vendored OpenAPI snapshot, is `src/mocks/contract.test.ts`, a Vitest test (CLAUDE.md Rule 6).

### Run
```bash
# From this repo's root. Playwright always boots its own Vite on :5199 —
# it never adopts a running dev server (see playwright.config.ts).
npm run e2e
npx playwright test --project=chromium tests/journal/journal.spec.ts   # a single spec
```

---

## 2. Backend (pytest)

```bash
make test          # tests/test_*.py — hermetic lib/ unit tests (indicators, strat, gamma, backtest, playbook eval)
make test-scripts  # tests/test_scripts_*.py — pipeline script smoke tests
make test-e2e      # tests/test_e2e.py — heavier integration (needs deps)
```
Most `lib/` tests are hermetic (synthetic DataFrames, no network). Tests that
touch Cloud SQL are skipped/marked when `CLOUD_SQL_CONNECTION_NAME` is unset
(see CLAUDE.md Rule 0.3 — hermetic tests are necessary but not sufficient;
production smoke tests are documented in §4).

---

## 3. Cross-cutting checks (every redesigned page)

1. **No console errors** on load (several specs assert this via a `pageerror`/`console` listener).
2. **Responsive** — no horizontal overflow at 375 / 768 / 1280px (global net in `index.css`; spot-checked with the headless-overflow harness).
3. **No fabricated values** — missing data renders the `—` placeholder / "unavailable" badge, never `0` (Rule 3.7). Specs assert empty states explicitly.
4. **Theme** — dark is the default; light toggles via `data-theme`.

---

## 4. GCP data / pipeline validation

Run before trusting the live app. The deployed UI is NOT behind IAP — it is
published on Lovable and its API is gated per request by a Firebase ID token:

```bash
# Data freshness for the tables behind each page (over 443, CR-native):
bash scripts/db_query_cr.sh -q "SELECT 'intraday' t, COUNT(*) n, MAX(ts)::text FROM market_data_intraday;
  SELECT 'insights', COUNT(*), MAX(as_of)::text FROM insight_reports;
  SELECT 'options', COUNT(*), MAX(snapshot_ts)::text FROM etf_options_snapshots;
  SELECT 'news', COUNT(*), MAX(published_ts)::text FROM news_sentiment"

# Service + freshness endpoint (routers/health.py). Aim it at STAGING: that is
# the service the SPA calls and the only API service: solyra-api-prod was
# retired on 2026-10-10 (TeneikaAskew/stocks#1366).
gcloud run services list --project=adept-mountain-474619-d4 --format='table(metadata.name,status.url)'
curl -s https://solyra-api-staging-5sjtb3yl7a-ue.a.run.app/api/health/freshness
```
Per-page table/job/service/secret mapping: **`platform/GCP_DATA_DICTIONARY.md`**.
Known prod caveats validated there: AV-on-request endpoints require the
`av-api-key` mount (fixed via the dedicated `trading-platform-svc@` SA); Journal
`journal_entries` starts empty until a user logs trades.

---

## 5. CI gating

Four workflows in `.github/workflows/` run on pull requests, each on its own
triggers; none waits for another:

- **`ci.yml` → `checks` (types · unit · build):** every pull request to `main`
  and every push to `main`. `npx tsc -b` (type-checks the E2E fixtures against
  the real API contracts), then `npm test`, then `npm run build`, then
  `npm run contract:check` (the vendored OpenAPI snapshot against stocks
  `main` — CLAUDE.md Rule 6).
- **`e2e.yml` → `e2e` (chromium, mocked):** `npm run e2e`, on pull requests to
  `main` and pushes to `main` except those whose changed files all match
  `paths-ignore: ['docs/**', '**/*.md']`, so a docs-only or Markdown-only
  change does not run it. That is why it is a workflow of its own.
- **`spec-gate.yml` → `gate`, then `base-suite`:** every pull request, whatever
  its base (`pull_request_target`: opened, synchronize, reopened, edited,
  ready_for_review). It judges the PR with the base branch's gate and runs the
  base's gate suite against the gate the PR proposes; it does not run on
  pushes.
- **`registry-check.yml` → `registry`:** every pull request, whatever its base
  (opened, synchronize, reopened). It runs the PR's own gate and gate suite; it
  does not run on pushes.

The other two workflows run on neither: `gh-api.yml` is `workflow_dispatch`
only, and `update-superpowers.yml` runs on a Monday schedule and on dispatch.

Two deliberate deviations from what this section used to prescribe, both
explained in `ci.yml`'s header comment: `npm run lint` is not gated (the header
records it exiting 1 on `main` with 32 errors when it was written, 27 of them on
a pattern this codebase uses on purpose), and `make test` is gone, since it
exercised the Python backend, which no longer lives in this repo.

- **Pre-deploy:** the `cloud` Playwright project is the intended check against
  the deployed frontend, but it has no specs (§1), so no such gate exists yet.

---

## 6. Staging without IAP (passcode gate) — RETIRED, DO NOT RUN

> **This whole section describes a flow that no longer exists.** The passcode
> middleware and its endpoint were deleted; staging is gated by a Firebase ID
> token now. The commands under "Historical record" below are kept for
> archaeology only and **must not be run** — they create a secret and an IAM
> binding for a gate nothing reads, and invoke a deploy path that has been
> replaced. It is described rather than deleted because the `staging-passcode`
> secret may still exist and someone will otherwise try to use it.

Why it stopped working, on three counts (corrected 2026-09-05):

1. `POST /api/auth/bypass` is gone. `platform/api/auth.py` opens with
   "Replaces the staging passcode bypass (the former `auth_bypass.py`)" — one
   middleware with `AUTH_MODE` superseded it. Staging is gated by a Firebase ID
   token now, not a passcode cookie.
2. `CLOUD_RUN_URL` is not read by `playwright.config.ts` any more, and could not
   have helped: the deployed SPA resolves `/api/*` through the `STAGING_API`
   value compiled into its bundle, so no environment variable at test time can
   redirect it.
3. Pointing the `cloud` project at an API URL would break it regardless. Since
   #957 the API services serve no SPA, so `/dashboard` there answers
   `404 {"detail":"Not Found"}`. That project's `baseURL` is the published
   frontend.

**What works today:** `e2e:cloud:auth` captures a real signed-in Firebase
session, including the IndexedDB persistence the SDK uses, and the `cloud`
project restores it against `https://solyra-stocks.lovable.app`.

**What does not:** `cloud` has no specs. It matches `*.cloud.spec.ts` and none
exist, so `npm run e2e:cloud` exits with "No tests found". It previously ran the
29 hermetic specs, which is worse than nothing: each reaches `mockCommon`, which
intercepts `/api/*` and fulfils `/api/config/firebase` with `authMode: 'open'`,
making the auth gate inert and discarding the restored session. A green run
measured the mocks, not the deployment.

Writing deployment specs — no `mockCommon`, live responses, assertions that
tolerate real data — is the outstanding work. To aim a run at a different
backend, rebuild the frontend with `VITE_API_BASE_URL` and serve that build;
there is deliberately no runtime origin override.

### Historical record (not runnable)

How it was meant to work, before `AUTH_MODE` replaced it. IAP on Cloud Run is
service-level and can't be dropped per revision, so staging was its own service
(`solyra-api-staging`) deployed `--allow-unauthenticated`, with an app-level
passcode gate re-protecting the API:

- `api/auth_bypass.py` — middleware + `POST /api/auth/bypass` + `/api/auth/logout`. Inert unless `ALLOW_AUTH_BYPASS=1` (set only on the staging service), so prod/local were untouched. **This file no longer exists.**
- `/api/me` returned `auth_bypass_allowed: true` on staging → the React `<AuthGate>` showed a passcode screen. A correct passcode set an HttpOnly cookie and the app rendered as a guest. **`/api/me` no longer returns that field**; `<AuthGate>` now renders `SignInScreen` (Firebase).

The operator steps, commented out so a copy-paste cannot execute them:

```bash
# RETIRED — these commands provision a gate that no longer exists. Do not run.
#
# 1. Create the passcode secret + let the runtime SA read it (one-time)
# printf '%s' 'YOUR_PASSCODE' | gcloud secrets create staging-passcode \
#   --data-file=- --project=adept-mountain-474619-d4
# gcloud secrets add-iam-policy-binding staging-passcode \
#   --member="serviceAccount:trading-platform-svc@adept-mountain-474619-d4.iam.gserviceaccount.com" \
#   --role=roles/secretmanager.secretAccessor --project=adept-mountain-474619-d4
# 2. Deploy the public, passcode-gated staging service (prod untouched)
# DB_USER=trading_user DB_NAME=trading STAGING_SERVICE=1 ./platform/deploy.sh
```
