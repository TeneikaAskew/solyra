<!-- Moved from the stocks repo (TeneikaAskew/stocks) when the frontend
     split out into this one. Paths were rewritten for this layout: what was
     `platform/src/...` is now `src/...`.

     Any remaining `platform/...` path is a STOCKS path and is left as-is on
     purpose — `platform/api/`, `platform/Dockerfile`, `platform/deploy.sh` and
     `platform/dist/` are the backend and its build, which stayed there. -->

# End-to-End Test Plan — Stocks Trading Platform

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
| **Frontend E2E** | Every route renders, the redesigned surfaces show the right data, no console errors, responsive | Playwright (chromium) + network mocks | `tests/*.spec.ts` | `npm run e2e` |
| **Frontend E2E (live)** | **NOT IMPLEMENTED.** Would prove the deployed app serves real data | Playwright (`cloud` project) | `*.cloud.spec.ts` — **none exist**, so `e2e:cloud` exits `No tests found` | `npm run e2e:cloud:auth` (interactive Firebase sign-in) then `npm run e2e:cloud` |
| **Backend unit** | `lib/` math (indicators, strat, gamma, backtest), API contracts | pytest | `tests/test_*.py` | `make test` |
| **Backend E2E / scripts** | Pipeline scripts, fetchers, signal monitor | pytest | `tests/test_e2e.py`, `tests/test_scripts_*.py` | `make test-e2e` · `make test-scripts` |
| **GCP data/pipeline** | Real Cloud SQL data exists + is fresh; jobs/services healthy | `db_query_cr.sh`, `gcloud`, `/api/health/freshness` | `scripts/`, GCP | see §4 |

---

## 1. Frontend E2E (Playwright) — primary

**Config:** `playwright.config.ts` — `testDir: ./tests`, 3 projects:
- **`chromium`** (default): boots its **own** Vite on the dedicated E2E port (`:5199`, never your `:5173` dev server), all `/api/**` **mocked** per-spec → no backend needed, hermetic, fast.
- **`iap-setup`** / **`cloud`**: run against the deployed FRONTEND (`solyra-stocks.lovable.app`), not a Cloud Run URL, and **not** behind IAP — the SPA is published separately since #957 and its API is gated per request by a Firebase ID token. `iap-setup` captures a real signed-in session interactively (including Firebase's IndexedDB persistence). `cloud` matches `*.cloud.spec.ts` and **none exist yet**, so it exits `No tests found` rather than running the hermetic specs against production, which would have forced `authMode: 'open'` and measured the mocks. Writing that suite is outstanding work. Both are skipped by the default command.

**Mock strategy:** `tests/helpers/mocks.ts` `mockCommon(page)` stubs the cross-cutting endpoints (`/api/health`, `/api/live/status`, brief, watchlist); each spec adds its own `page.route('**/api/<endpoint>', …)` with realistic fixtures. **Fixtures must match the production response shape** (CLAUDE.md Rule 0.3) — e.g. the dashboard brief mock carries `daily_indicators.close`, the signals mock carries `analytics/summary`.

### Coverage matrix (one spec per route + cross-cutting)

| Spec | Route / surface | Asserts |
|---|---|---|
| `dashboard.spec.ts` | `/` Overview | "Overview" heading · pre-market brief · KPI tiles (prev/latest close, 2-day, RSI) · **Candles\|Area chart toggle** · perf budget |
| `signals.spec.ts` | `/signals` | **90-day Performance P&L card** (win rate / profit factor) · explorer rows · CALL/PUT · empty state |
| `insights.spec.ts` (+ Agents) | `/insights` | Briefing dossier · **Agents tab** (run cost/latency · per-role pipeline · model-routing roster · recent runs) |
| `journal.spec.ts` | `/journal` | **KPI tiles + equity curve** · add/delete trade · CSV export |
| `catalysts.spec.ts` | `/catalysts` | feed grouped by date · impact/type filter chips · sentiment |
| `options-flow.spec.ts` · `gamma-levels.spec.ts` | `/options` | Heatseeker grid · GEX/VEX · King/Gate fallback · live-AV badge |
| `live-market.spec.ts` · `charts-cards.spec.ts` · `phase1-charts.spec.ts` | `/live` `/charts` | hero tiles · candlestick canvas · reference levels |
| `playbook.spec.ts` · `reports.spec.ts` · `help.spec.ts` · `admin.spec.ts` · `admin-auth.spec.ts` | `/playbook` `/reports` `/help` `/admin` | cards · glossary · admin auth gate |
| `navigation.spec.ts` | every route | each route loads without a fatal error |
| `api-smoke.spec.ts` | API contracts | health/freshness, market dates, signals, options, backtest, insights as-of-replay rejects bad cutoffs |

### Run
```bash
# From this repo's root. Playwright always boots its own Vite on :5199 —
# it never adopts a running dev server (see playwright.config.ts).
npm run e2e
npx playwright test --project=chromium tests/journal.spec.ts   # a single spec
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
# the service the SPA calls and the one carrying traffic. The prod URL is
# IAP-gated, so a bare curl gets the Google SSO redirect, not JSON.
gcloud run services list --project=adept-mountain-474619-d4 --format='table(metadata.name,status.url)'
curl -s https://solyra-api-staging-5sjtb3yl7a-ue.a.run.app/api/health/freshness
```
Per-page table/job/service/secret mapping: **`platform/GCP_DATA_DICTIONARY.md`**.
Known prod caveats validated there: AV-on-request endpoints require the
`av-api-key` mount (fixed via the dedicated `trading-platform-svc@` SA); Journal
`journal_entries` starts empty until a user logs trades.

---

## 5. CI gating (recommended)
- **PR to `main`**: `npm run lint` + `npm run build` + `npm run e2e` (chromium, mocked) + `make test` must pass.
- **Pre-deploy**: add the `cloud` Playwright project against a staging revision before promoting traffic.

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
