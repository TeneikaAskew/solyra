# Test-Coverage Audit — the frontend-only migration

**Date:** 2026-09-01 · **Branch:** `feature/frontend-only` · **Status:** final. All three fixed specs re-verified solo with no concurrent runner: `auth-gate` 4/4, `gamma-levels` 13/13, `navigation` 15/15.

This document is the durable record of the test-data audit that ran alongside the
repo split (Solyra → frontend-only SPA; `api/` + `lib/` + `gcp/` + `scripts/` →
the **stocks** repo, deployed as the `solyra-api-prod` and `solyra-api-staging`
Cloud Run services; this SPA calls `solyra-api-staging`). It
answers three questions the migration raised:

1. Does every page, and every view/chart within every page, have typed mock data?
2. Why did the "missing coverage" numbers keep changing during the effort?
3. Why does the app now contain components and hooks with **zero consumers**?

---

## 1. The coverage architecture that came out of this

- **`tests/helpers/mocks.ts`** — only the cross-cutting `mockCommon` (health,
  auth probe, live status, watchlist, most-active, market-hours) plus the `M`
  fulfil helpers. 101 lines, down from 427.
- **`tests/helpers/fixtures/<page>.ts`** — one module per page (12 total:
  landing, dashboard, live, charts, options, signals, reports, insights,
  catalysts, journal, admin, help). Each exports typed payloads, empty/degraded
  variants, and one `mockXxxApi(page)` covering that page's **full endpoint
  fan-out**, derived from the page's hooks — not from whatever a spec happened
  to mock historically.
- **`tsconfig.test.json`** — `tests/` was previously outside every tsconfig
  project, so type annotations there were decorative. It is now a referenced
  project: every fixture is pinned with `satisfies` against the real frontend
  contract, and a backend schema change **fails `tsc -b`** instead of silently
  drifting past a hand-written literal. Verified by fault injection (a wrong
  type in a fixture produces TS2322).
- **Settings** needs no fixtures (pure Zustand, no fetches). The Options page's
  Flowseeker / contract-drilldown / heatseeker views run on deliberate static
  placeholder datasets in `src/data/*Mock.ts` with a demo banner — that is
  their mock data, by design, until a flow-tape endpoint exists.

### Endpoint coverage (audited by script, not by eye)

A script extracts every `/api` literal in `src/` (63 endpoints) and every
`page.route()` glob in `tests/`, then matches them glob-to-endpoint.

| Result | Count | Notes |
| --- | --- | --- |
| Called and mocked | 54 | every live page + view + chart |
| Called by **dead code only** | 4 | see §3 — endpoints unexercised because their frontend callers are orphaned (all four still alive and pytest-covered in the stocks backend) |
| Comment strings / regex artifacts | 5 | `src/data/*Mock.ts` future-endpoint notes, `authedFetch` glob docs, one normaliser artifact |
| **Live, unmocked** | **0** | |

## 2. Why the numbers kept changing

The counts were never one number moving — they were different measures taken
while the tree itself was being migrated. In sequence:

| When | What was measured | Result | Why it differed from the last number |
| --- | --- | --- | --- |
| Session start | Pages without a *centralized* fixture (estimate from a readout) | "5-ish" | Estimate; Vitest coverage misstated; one claimed gap (`/signals` similar-setups) turned out not to exist |
| First verification | Pages whose specs inlined payloads | 7 | Verified against hooks, not the readout |
| First fixture pass (`bb773d1`, landed via PR #3 squash → `33c309a`) | Those 7 pages | closed | |
| Second pass (`042d986`) | Dashboard/Options/Journal still living in `mocks.ts` | closed, 2 contract bugs found | Different measure: *where* data lives, not *whether* it exists |
| Endpoint audit (script) | Endpoints called vs mocked | 17 unmocked | First exhaustive measure; superset of everything before |
| Triage | Same 17 | 8 live gaps + 9 non-live | Dead code and comment-strings separated out |
| Gap closure (`8768250`) | The 8 live gaps | closed → **0** | |
| Concurrently | Spec files on disk | 29 → 25 | The split deleted 4 backend-facing specs (`api-smoke`, `data-pipeline-status`, `dev`, `phase1-charts`) — deliberate, not lost coverage (see §4) |

Two further forces made it feel like a moving target:

- **Concurrent migration.** Branch grafts, resets and the frontend-only split
  ran in the same working tree as the audit. Uncommitted audit work was wiped
  three times by branch operations (`reset --hard`, checkouts) before being
  recreated and committed. Mitigation adopted: commit immediately after each
  verified pass.
- **Each deeper measure exposes the next layer.** Inline payloads → untyped
  payloads → off-contract payloads → endpoints mocked nowhere → endpoints whose
  *callers* are dead. The orphan list (§3) is the bottom of that stack; a full
  dead-code sweep has now been run so it stops growing incrementally.

## 3. Zero-consumer items (orphans)

The audit found five frontend items nothing imports or calls, which in turn
leaves four backend endpoints unexercised from this app:

| Orphan | Endpoint it called | How it was verified dead |
| --- | --- | --- |
| `src/components/dashboard/DataPipelineStatus.tsx` | `GET /api/health/freshness` | zero importers; its spec (`data-pipeline-status.spec.ts`) deleted in the split |
| `src/components/shared/TermHover.tsx` | `GET /api/glossary/gamma` | zero importers |
| `src/hooks/useGammaGlossary.ts` | `GET /api/glossary/gamma` | zero consumers outside `TermHover` |
| `useTradeAnalytics()` in `src/hooks/useTradeAnalytics.ts` | `POST /api/analytics/trade-stats` | only `useTradeSummary` from that module is consumed (SignalsPage) |
| `useMineMyStyle` in `src/hooks/useJournalChartTrades.ts` | `POST /api/style/mine-and-validate` | zero consumers |

Git forensics (run against the true per-commit history on
`origin/platform-history` — the graft merge `33c309a` is a squash, so the
archaeology lives on that ref) established the following. A full dead-code
sweep of all 100 files under `src/components` + `src/hooks` also turned up
**two further orphans**, bringing the roster to seven; the sweep is exhaustive,
so this list is final rather than another increment.

| Orphan | Introduced | Orphaned by | Intent | Backend endpoint |
| --- | --- | --- | --- | --- |
| `DataPipelineStatus.tsx` | `911ec69` (Apr 26) freshness widget, wired into Dashboard | `8829f0b` (Jun 5) briefing-first Dashboard **rewrite** — dropped the mount silently; message even claims nothing else was touched | **Accidental** (whole-page rewrite debris) | alive: `health.py:43` + pytest |
| `TermHover.tsx` | `e1ce147` (May 31) — shipped explicitly *"not yet wired into any page"*, awaiting Phases C2–C5 | never had a consumer — the planned heatmap consumers were **superseded** by the Swing Mode design (`7526031`, *"supersedes #642"*) | **Build-ahead, superseded** | alive: `glossary.py:30` + pytest |
| `useGammaGlossary.ts` | `e1ce147` (same) | transitively dead — only importer is `TermHover` | same | same |
| `useTradeAnalytics()` POST | `d85c883` (Apr 25) *"move financial math server-side, eliminate hardcoded values"*; consumer: ChartsPage | `52acbe1` (Jul 11) Task 6 strip-down — Charts went research-only; JournalPage **reimplemented stats client-side** (`computeJournalStats` in `src/lib/journalStats.ts`) instead of consuming the POST | **Deliberate surface removal, accidental hook orphaning** — and a quiet reversal of the "no duplicate client-side financial math" rule the hook was created to enforce | alive: `analytics.py:118`, [`docs/API.md:47`](https://github.com/TeneikaAskew/stocks/blob/main/docs/API.md) |
| `useMineMyStyle` | `0721eec` (Jul 8) Phase-4 style mining, "My style" panel on Charts; polished `56f40b1` (Jul 10) | `52acbe1` (Jul 11) — **one day later**, the panel was swept away with the strip-down; no bullet mentions style mining; never re-homed to JournalPage | **Accidental** at the message level (hook knowingly kept, panel silently dropped) | alive: `backtest.py:597` + walk-forward pytest |
| `DataTable.tsx` | initial platform squash `5d8f08a` (Feb 24) | never imported by anything, ever (pickaxe over all 167 commits) | Prototype scaffolding | n/a |
| `Tabs.tsx` | `5d8f08a` (same) | same | same | n/a |

All four orphaned endpoints are **BACKEND-ALIVE-FRONTEND-DEAD**: defined,
mounted in `platform/api/main.py` and pytest-covered in the stocks repo.
(Whether the *deployed* staging build contains them was not verified.)

Correction for the record: commit `8768250`'s message attributes all five
original orphans to the Task 6 strip-down; forensics shows Task 6 orphaned only
`useTradeAnalytics` and `useMineMyStyle` — the other three predate it and have
the distinct causes above.

### Why the orphan rot was invisible until this migration

Until August, the backend-hitting Playwright specs (`api-smoke`,
`data-pipeline-status`, …) still **exercised** the dead endpoints against a
live `localhost:8000`, so nothing looked unused. The frontend-only split
removed the backend (`f86bb0e`) and those specs (`49f9710`), deleting the last
things in this repo that touched those endpoints — which is exactly when the
endpoint-coverage audit could finally see the frontend callers had been dead
for months. The migration didn't create the gaps; it **exposed** them.

### Disposition (decision needed per item)

| Orphan | Recommendation |
| --- | --- |
| `DataTable.tsx`, `Tabs.tsx` | **Delete.** Never used in 6 months of history; nothing references them. |
| `TermHover.tsx` + `useGammaGlossary.ts` | **Delete.** The design that was meant to consume them shipped differently; the glossary endpoint remains available server-side if a future surface wants it. |
| `DataPipelineStatus.tsx` | **Delete, unless ops visibility is wanted back.** The Dashboard redesign dropped it in June and nobody missed it; reviving it is a product call, not a cleanup. |
| `useTradeAnalytics()` POST | **Real decision.** Either (a) accept that journal stats are now client-side and delete the hook — which quietly ratifies duplicated financial math in `journalStats.ts`, contradicting `d85c883`'s stated architecture — or (b) rewire JournalPage's stats to the still-alive POST endpoint and delete `computeJournalStats`. (b) honors the one-source-of-truth rule; (a) is less work. Don't leave it limbo. |
| `useMineMyStyle` | **Real decision.** The style-mining feature (backend + walk-forward tests) is fully alive and was dropped from the UI by accident one day after its last polish. Either re-home the "My style" panel in the Journal one-stop cockpit, or delete the hook and accept the feature as backend-only. |

## 4. The four deleted specs

All four were deleted by a single commit, `49f9710` ("finish the frontend-only
split"), whose rationale is on record: *"they made live requests to
localhost:8000 and asserted API response shapes, so they test code this repo no
longer contains and can never pass here."* Forensics confirmed where each one's
coverage now lives:

| Spec | What it covered | Where that coverage lives now |
| --- | --- | --- |
| `api-smoke.spec.ts` | live smoke of every mounted router | **stocks repo** — `platform/tests/api-smoke.spec.ts` + hermetic pytest `tests/test_platform_api.py` |
| `phase1-charts.spec.ts` | `:8000` connectivity + Charts UI smoke whose "Mark Entry renders" assertions contradicted the Task 6 strip-down | API half: stocks repo. UI half: superseded by the mocked `charts-cards.spec.ts` |
| `data-pipeline-status.spec.ts` | `/api/health/freshness` shapes + "dashboard renders *without* the widget" | endpoint half: stocks repo (copy + pytest). The mocked absence-check is genuinely lost — trivially, since it pinned only the absence of an unmounted component |
| `dev.spec.ts` | the FastAPI-served `/dev` page | **stocks repo** — `platform/tests/dev.spec.ts` |

`gamma-levels.spec.ts` was split rather than deleted: the `:8000` "API
contract" describe went, the mocked UI describes stayed.

**Cross-repo action item:** the contradiction `49f9710` fixed here still exists
in the stocks repo — its copy of `phase1-charts.spec.ts` (last touched Jul 6)
carries six "Mark Entry" assertions while its own `ChartsPage.tsx` is
post-Task-6. That spec is stale where it now lives and should be pruned there
too.

## 5. Contract bugs the typed fixtures caught

All fixed; each was passing silently before:

1. **Watchlist envelope** — `mockCommon` and `insights.spec.ts` served
   `{tickers:[...]}`; `useWatchlist` expects `WatchlistResponse`
   (`run_id`/`ranked`/`weights_used`). The panel read `ranked === undefined`
   and rendered empty, so watchlist assertions passed without the panel ever
   being exercised.
2. **Market hours** — mocks sent `premarket`/`afterhours` and omitted required
   `timezone`/`holidays_2026`; the contract is `pre_market`/`after_hours`.
   Harmless only because the sole consumer reads `.regular`.
3. **Journal trade shape** — `journal.spec.ts` carried two fixtures for the
   same endpoint with incompatible shapes; one used `trade_id`/`shares`/`pnl`/
   `direction:'long'`, none of which exist on `JournalRow`.
4. **Insights report** — fixture omitted the required `per_role_cost`.
5. **Market data / dates** — fixtures omitted required `timeframe` and `months`.
6. **Dead mocks** — `live-market.spec.ts` mocked `/api/playbook` (twice, with
   contradictory bodies) and `/api/market/dates`; LiveMarketPage calls neither.
7. **Streaming chat** — `/api/insights/chat` must be fulfilled as `text/plain`
   (the page reads `resp.body` through a reader); a JSON fulfilment renders the
   raw envelope into the chat bubble.

## 6. E2E verification

Infra note: as of `d530ff3`, Playwright boots its **own** Vite on port 5199
(`reuseExistingServer: false`) with a route-warmup project, and pins the API
proxy to `127.0.0.1:8000` so unmocked calls fail fast instead of silently
succeeding against staging — which is exactly the failure mode the typed
fixtures exist to expose. This removes the two big confounds from earlier runs
(cold-compile blowing perf budgets; a shared mutable dev server).

### Full-suite run (25 specs, 161 tests, chromium)

Method: batches of ~6 spec files, then every spec with any batch failure
re-run **alone** to separate machine contention from real defects. Verdicts
rest only on conclusive runs.

**Result: 152 of 161 tests healthy. 13 real failures in 3 files — all
test-side (two fixture gaps, one stale selector); no app regressions.**

| Spec | Tests | Solo verdict |
| --- | --- | --- |
| admin-auth, admin, catalysts, dashboard, dashboard-chart-fit, demo-banners, help, insights, journal, journal-import, journal-onestop, landing, live-market, most-active-bar, movement-read, options-flow, playbook, replay-trainer, reports, signals, ticker-combobox, charts-cards | 148 | **PASS** — every batch failure in these files cleared when run alone (e.g. `dashboard` 1/7 in batch → 7/7 solo, perf budget met in 1.8s vs 25s under contention) |
| `auth-gate.spec.ts` | 3 | **1 real failure** — `nav a[href="/help"]` no longer exists: `/help` moved into the Support dropdown (`navConfig.ts` SUPPORT group, `menu: true`). Stale selector; the behaviour it guards (open mode → no login screen) holds. |
| `gamma-levels.spec.ts` | 12 | **7 real failures** — the ChartsPage-overlay and Help-glossary describes registered **no mocks at all**, so the boot probe `/api/config/firebase` 500'd through the dead proxy and `main.tsx` rendered its config-error screen instead of the app. Fixture gap. |
| `navigation.spec.ts` | 14 | **~5 race-flaky failures** — the route-smoke loop mocked only `/api/config/firebase`; every other `/api` call 500'd and Chrome's "Failed to load resource" console error raced the test's `expect(fatal).toEqual([])`. Different routes failed each run; `/help` failed every run. Fixture gap. |

**Fixes applied** (same commit as this section):
- `auth-gate`: assert on the `nav-menu-support` trigger — the stable "shell mounted" signal — instead of a link that only exists once the menu opens.
- `gamma-levels`: the two describes now call `mockChartsApi` / `mockHelpApi`.
- `navigation`: new `tests/helpers/fixtures/all.ts` exports `mockAllPages()`, which composes every per-page helper in a deliberate order (later `mockCommon` calls shadow earlier specific routes, so the "must win" registrations go last — documented in the file). The smoke loop now sees 200s on every route it walks.

**Re-verification (final):** with no concurrent runner on the machine, `gamma-levels` **13/13** (2.6 min incl. warmup; every test 2.4–4.5 s) and `navigation` **15/15** (3.0 min; route-smoke tests 2.1–4.6 s each), on top of `auth-gate` 4/4. The same `gamma-levels` tests had hung at the 30 s `page.goto` budget minutes earlier while a second full-suite runner was live — a direct A/B on contention as the cause (infra item 4).

### Infrastructure findings from the run

These explain why batch numbers overstated real problems by an order of
magnitude, and are worth knowing for anyone reading future CI output:

1. **A second Playwright runner was active on this repo during the run**
   (`--retries=1` invocations and `-retry1` artifact dirs the verifier never
   produced). With `reuseExistingServer: false` on a strict port, two runners
   fight over `:5199` and CPU: this caused a 23-failure batch meltdown,
   mid-run `ERR_CONNECTION_REFUSED` server deaths, and "port already used"
   aborts. Any E2E result taken while another runner is live is suspect.
2. **Roving ~30s navigation stalls** — one random test per run would eat a
   `page.goto` timeout while siblings on the same route passed in 1–5s; solo
   re-runs always cleared it. Consistent with the OneDrive-synced working tree
   blocking Vite file I/O under load. One captured failure showed Vite's HMR
   overlay reporting a **Unicode-mangled read** of `src/lib/firebase.ts`
   (`Unexpected "→"`) while the file on disk is valid — i.e. the filesystem,
   not the app.
3. Batch runs use 4 workers against one Vite; under contention that amplified
   stalls. Solo runs are the trustworthy signal in this environment.
4. **A `vite --port 5199 --strictPort` holding the port is usually a LIVE
   run's server, not an orphan - check the parent chain before killing it.**
   During this audit a second full-suite run (`--workers=1 --retries=1`,
   started 08:50, launched from a Git Bash shell) was in progress; its Vite
   was misread as a leftover - only one parent level was checked, the
   `cmd.exe` that spawned it, not the Playwright CLI above that - and killed
   at ~09:31. From then on both runs shared whichever server was up,
   contended for CPU (54 headless Chrome processes at one point), and each
   saw the other's teardown as `ERR_CONNECTION_REFUSED`. Results from *both*
   runs in that window are contaminated. The correct check is
   `Get-CimInstance Win32_Process -Filter "ProcessId=<pid>"` walked up two
   levels: a live `@playwright/test/cli.js` ancestor means leave it alone.
   Clear a true orphan with `Stop-Process -Id <pid> -Force`; under Git Bash,
   `taskkill /PID ...` silently does nothing (MSYS rewrites `/PID` as a
   path). Better still: a global-setup step that refuses to start when
   another Playwright CLI is already active against the repo.
5. **`[WebServer] Error: connect ECONNREFUSED 127.0.0.1:8000` spam is
   expected.** It is Vite's proxy logging every unmocked `/api` request from
   the warmup project (which mounts each route with only `mockCommon`)
   hitting the deliberately dead backend pin. It is not a test failure and
   not a sign the proxy is misconfigured — it is the hermetic setup working.

Recommendation: run E2E from a non-synced checkout (or exclude the repo from
OneDrive sync), never with a second runner live, and check port 5199 is free
before starting.

Unit suite: Vitest passing at every committed point — 27 files / 253 tests at
`042d986` and `8768250`; **29 files / 263 tests** after the fixture-binding
tests landed. Those two new files (`src/hooks/journalFixtureMapping.test.ts`,
`src/routes/reportsFixtureRender.test.ts`) run the shared fixtures through the
real runtime mappers (`journalRowToTradeEntry`, `exportableTrades`,
`renderReportHtml`), covering the semantic invariants `satisfies` cannot:
active trades map to `undefined` financials (never 0), replay rows keep the
analytics-hygiene keys, the export guard drops exactly the rows the server
would 422 on, and the report fixture genuinely exercises the GFM table path.

## 7. Open items → GitHub issues

Everything this audit left open is tracked; nothing lives only in this file.

| Item | Issue |
| --- | --- |
| Journal stats math: delete `useTradeAnalytics` POST client or rewire JournalPage to the server endpoint | [solyra#13](https://github.com/TeneikaAskew/solyra/issues/13) |
| "My style" panel: re-home in the Journal cockpit or delete `useMineMyStyle` | [solyra#14](https://github.com/TeneikaAskew/solyra/issues/14) |
| Delete never-used `DataTable.tsx`, `Tabs.tsx` | [solyra#15](https://github.com/TeneikaAskew/solyra/issues/15) |
| Delete superseded `TermHover.tsx` + `useGammaGlossary.ts` | [solyra#16](https://github.com/TeneikaAskew/solyra/issues/16) |
| `DataPipelineStatus.tsx`: delete or revive (product call) | [solyra#17](https://github.com/TeneikaAskew/solyra/issues/17) |
| `dashboard.spec.ts` still inlines card payloads — rewire to `mockDashboardCards()` | [solyra#18](https://github.com/TeneikaAskew/solyra/issues/18) |
| stocks: stale `platform/tests/phase1-charts.spec.ts` asserts pre-Task-6 UI | [stocks#958](https://github.com/TeneikaAskew/stocks/issues/958) |
| `/help` nav link vs `auth-gate.spec` — spec side fixed here; product half still open | [solyra#8](https://github.com/TeneikaAskew/solyra/issues/8) (commented) |
| E2E port hardening — orphaned strict-port Vite, second-runner contention, OneDrive I/O stalls | [solyra#9](https://github.com/TeneikaAskew/solyra/issues/9) (commented) |
| `admin-auth` logout-button flake — passed 13/13 solo on this run | [solyra#10](https://github.com/TeneikaAskew/solyra/issues/10) (commented) |

## 8. Commit trail

| Commit | What |
| --- | --- |
| `bb773d1` (content via PR #3 squash → `33c309a`) | 7 per-page fixture modules, `tsconfig.test.json`, 7 specs rewired, 3 route-type exports |
| `042d986` | Dashboard/Options/Journal fixtures out of `mocks.ts`; market-hours + journal-shape contract fixes |
| `8768250` | Final gap closure: admin strat-engine, insights chat/agents, help indicators, landing waitlist, journal export, dashboard cards |
| `2108f0e` | Fixture-binding Vitest tests (29 files / 263 tests); first version of this document |
| `a7476c8` | `mockAllPages()` composer; fixes for the three real E2E failures (`auth-gate`, `gamma-levels`, `navigation`) |
| `df0f633` | Final audit document: E2E section, infra findings, open-items → issues index |
| *(this)* | Clean re-verification numbers for the three fixed specs |

---

## 9. 2026-09-03 re-audit — full page/component/control inventory, per-page spec layout

**Date:** 2026-09-03 · **Branch:** `claude/lovable-commits-review-7gjnal` · Follows the
Lovable commit batch through `ac3efae` (tabbed Admin, rebuilt Reports layout,
`usePreferences` sync, new Playwright specs) and PR #37's commit index.

### 9.1 The tests/ directory is now grouped by page

Every Playwright spec lives in a folder named for the page it drives; anything
that spans pages or the shell lives in the single `tests/shared/` folder.

| Folder | Specs |
| --- | --- |
| `tests/admin/` | `admin.spec.ts`, `admin-auth.spec.ts`, `admin-tabs.spec.ts` (new) |
| `tests/catalysts/` | `catalysts.spec.ts` |
| `tests/charts/` | `charts-cards.spec.ts`, `replay-trainer.spec.ts` |
| `tests/dashboard/` | `dashboard.spec.ts`, `dashboard-chart-fit.spec.ts`, `data-pipeline-widget.spec.ts`, `movement-read.spec.ts`, `ticker-combobox.spec.ts` |
| `tests/help/` | `help.spec.ts` |
| `tests/insights/` | `insights.spec.ts` |
| `tests/journal/` | `journal.spec.ts`, `journal-import.spec.ts`, `journal-onestop.spec.ts` |
| `tests/landing/` | `landing.spec.ts` |
| `tests/live-market/` | `live-market.spec.ts` |
| `tests/options/` | `options-flow.spec.ts`, `options-mobile-fit.spec.ts`, `demo-banners.spec.ts` |
| `tests/playbook/` | `playbook.spec.ts` |
| `tests/reports/` | `reports.spec.ts` (rewritten for the picker layout) |
| `tests/settings/` | `settings.spec.ts` (new — closed the last page with zero E2E) |
| `tests/signals/` | `signals.spec.ts` |
| `tests/shared/` | `navigation.spec.ts`, `auth-gate.spec.ts`, `gamma-levels.spec.ts` (spans options+charts+help), `most-active-bar.spec.ts` (spans dashboard+journal+live) |
| `tests/` root | infrastructure only: `routes.warmup.ts` (warmup project), `auth.setup.ts` (interactive Firebase sign-in for the cloud project; its `iap-setup` project name and `.auth/iap-state.json` output are legacy names, no IAP is involved since #957), `helpers/`, `fixtures/` (binary fixtures) |

`playwright.config.ts` needed no change: `testDir` recurses and both special
`testMatch` patterns are suffix regexes. Classification rule: a spec whose
`goto()`s all target one page sits in that page's folder; multi-page and
shell-level suites sit in `tests/shared/`.

### 9.2 What this change set closed

1. **Admin, tabbed** — the 7 specs broken by the users|data|models restructure
   now switch tabs; `admin-tabs.spec.ts` covers the two new panels end-to-end
   (role/status PUTs, search, category filter, refresh POST, em-dash null
   rendering, visible load-failure). `fixtures/admin.ts` grew typed payloads
   for all five new `/api/admin` endpoints.
2. **Settings** — was the only page with no E2E at all. `settings.spec.ts` now
   drives all four control groups, asserts the PUT write-through payload, and
   pins the Rule-4 sync banner (error state announced, never swallowed).
3. **`usePreferences` StrictMode fix** — the sync ownership claim moved from
   render to an effect; a render-phase claim left dev builds (incl. the E2E
   server) with no live owner, so preferences never loaded or saved. The
   Settings spec's "Synced to your account." assertion is the regression fence.
4. **`src/lib/format.ts`** — the canonical Rule-4 formatter file finally has
   `format.test.ts`: every formatter's missing-input → `—` path pinned,
   plus zero-vs-missing disambiguation.
5. **Reports, rebuilt** — the spec was asserting list text that the new picker
   `<select>` layout no longer renders visibly; rewritten against the picker,
   and the previously-untested interactions (select switch, prev/next bounds,
   error banner, empty state) are now covered.
6. **`/api/me/preferences` mock** in `mocks.ts` is pinned with
   `satisfies UserPreferences` (was `unknown` — contract drift passed tsc).

### 9.3 Outstanding gaps (ranked; the single to-do list)

Verified by a full-repo sweep (34 unit files, 30 specs) — each item names the
untested surface, not a guess:

1. **Review mode (global)** — `ReplayControl.tsx` testids `replay-toggle` /
   `replay-clear` / `replay-apply` appear nowhere in `tests/`; every page's
   `isReview` branch is exercised only via pure-function unit tests. Highest
   value: one `tests/shared/review-mode.spec.ts` driving the picker and
   asserting review UI on Live + Charts.
2. **SignalsPage filters** — direction ALL/CALL/PUT, min-score select, date
   from/to, clear button, column sorting: five interactive surfaces, zero
   click-driven assertions.
3. **Options inner modes** — Heatseeker→"Trinity Mode" and
   Flowseeker→"Contract Drilldown" toggles are never clicked;
   `TrinityTab.tsx` (real-data, contains a Rule-4-shaped `?? 0` on spot at
   line 56) and `ContractDrilldown.tsx` have no coverage of any kind.
4. **InsightsPage tabs** — agents/history/watchlist/chat are never clicked
   into; `AgentsPanel.tsx`/`WatchlistPanel.tsx` fully untested. Latent trap:
   `AgentsPanel` calls `GET /api/admin/routes`, which `mockInsightsApi` does
   not register — the first tab-click spec will hang unless it's added.
5. **CatalystsPage** — event-type filter pills, row expand/collapse, date
   range (`DateRangePicker.tsx`, sole consumer), and Refresh are untested;
   min-impact filter and ticker-click navigation are covered.
6. **CommandPalette.tsx** — global ⌘K search/navigate, mounted on every page,
   zero coverage.
7. **Admin models-tab panels** — `PredictForm.tsx` and
   `ModelStateSnapshot.tsx` have no tests of any kind (predates the tab work;
   `StructureBrief.tsx` has a unit test).
8. **usePreferences hydration overwrite** (Codex P2, open) — edits made while
   the initial GET is pending are replaced by older server values when it
   resolves; needs dirty-field tracking or disabled controls during
   hydration, plus a test.
9. Smaller: LiveMarketPage Live/Paused + sound toggles and quote-error
   banner; ChartsPage Vol/RTH/Ref toggles; Dashboard card-click navigation;
   Help glossary entry expand/collapse; Journal `examples-unavailable` error
   state; `useTradeMarking.ts` drawing state machine (213 lines, indirect
   coverage only); `RouteErrorBoundary.tsx` never forced to fire.

### 9.4 Correction to §3

§3's orphan list is a 2026-09-01 snapshot: `useMineMyStyle` / the "My style"
panel is no longer an orphan — `MyStylePanel` is mounted at
`JournalPage.tsx` and thoroughly covered by `tests/journal/journal-onestop.spec.ts`.

---

## 10. 2026-09-07 — what the E2E CI job actually proves (and the `[WebServer]` ECONNREFUSED noise)

**Date:** 2026-09-07 · **Branch:** `claude/e2e-ci-behavior-1cr1g6` · **Status:** findings
only, no code changed. Written up for review before any of the §10.6 options
is started. Prompted by the `[WebServer] http proxy error: ... ECONNREFUSED
127.0.0.1:8000` wall in the `e2e (chromium, mocked)` job log, and the follow-up
question "how do I know the suite is actually testing anything".

### 10.1 The proxy errors are expected, and the job that logs them is green

The run inspected (CI run 34073480519 on PR #49, job `e2e (chromium, mocked)`)
ended `220 passed (6.4m)`. Its log contains **438** `http proxy error` lines.
None failed a test.

Mechanism, all of it deliberate and already documented in-file:

- `playwright.config.ts` pins `VITE_API_PROXY_TARGET` to `http://127.0.0.1:8000`
  for the E2E Vite. Nothing listens there on a GitHub runner (or on most dev
  machines).
- Every `/api/*` request that no `page.route` handler intercepts falls through
  to Vite's proxy, which gets ECONNREFUSED, logs it to stderr, and answers the
  browser with a 500.
- `scripts/e2e-server.mjs` spawns Vite with `stdio: 'inherit'`, and Playwright
  prefixes the webServer's stderr with `[WebServer]`. That is why the lines
  appear in the job log at all.

So each line is one unmocked request from one spec. The config chose a dead
backend over the staging fallback precisely so that a miss is loud and fails
fast rather than silently succeeding against real infrastructure.

### 10.2 Which requests miss, and from where

Breakdown of the 438 misses in that run, by endpoint (query strings stripped):

| Endpoint | Misses |
|---|---|
| `/api/movement-statement` | 69 |
| `/api/insights/report/IWM` | 62 |
| `/api/catalysts/events` | 44 |
| `/api/market/sectors` | 43 |
| `/api/market/data/IWM/202604` | 39 |
| `/api/market/reference/IWM/20260425` | 34 |
| `/api/market/reference/IWM/20260906` | 22 |
| `/api/backtest/all/IWM` | 17 |
| `/api/live/status` | 13 |
| `/api/config/market-hours` | 13 |
| `/api/me/preferences` | 10 |
| `/api/insights/report/AAPL`, `/api/market/reference/AAPL/20260906`, `/api/market/data/AAPL/202609` | 10 each |
| `/api/live/avg-volume/IWM` | 9 |
| `/api/backtest/results/IWM` | 6 |
| 16 other endpoints | 1–4 each |

The top block is the Dashboard page's fan-out. Two different things produce
it, and the first is the larger one (corrected after Codex review on #52):

**No shared fixture registers two of the Dashboard's endpoints.**
`DashboardPage.tsx` calls `/api/movement-statement` (via `MovementRead`) and
`/api/insights/report/<ticker>` (via `useInsightReport`) on every mount, but
`mockDashboard` / `mockDashboardCards` in `tests/helpers/fixtures/dashboard.ts`
register neither, and `mockAllPages` inherits that gap. The only spec that
mocks `/api/movement-statement` is `tests/dashboard/movement-read.spec.ts`;
the only fixture that mocks the IWM insight report is `fixtures/insights.ts`,
which the dashboard helpers do not call. So **every** `/dashboard` load in the
suite misses both, including the fully-fixtured ones:
`tests/dashboard/dashboard.spec.ts` (7 navigations), `popover-fit.spec.ts`
(4), `mock-mode.spec.ts` (7), `dashboard-chart-fit.spec.ts`,
`most-active-bar.spec.ts` and `ticker-combobox.spec.ts` (1 each). That is
where the 69 and 62 in the table come from, not from the shell-only specs
alone.

**Shell-only specs that skip the page fixtures entirely.** These add the
rest of the Dashboard rows (`sectors`, `catalysts/events`, `reference`,
`market/data`, `backtest/*`):

- `tests/shared/auth-gate.spec.ts` — `mockCommon` only, asserts nav / sign-in
  screen / config-error screen.
- `tests/admin/admin-auth.spec.ts` sidebar tests — mock only
  `/api/config/firebase` and `/api/me`, not even `mockCommon`. These also
  explain the `live/status`, `market-hours` and `me/preferences` rows: those
  three are in `mockCommon`, so only a spec that skips `mockCommon` can miss
  them. The `Mock mode OFF` block in `tests/shared/mock-mode.spec.ts` does
  the same (config + `/api/me` only).
- `tests/dashboard/data-pipeline-widget.spec.ts` — `mockCommon` plus the
  freshness route only.
- `tests/routes.warmup.ts` — visits all 14 routes with `mockCommon` only and
  swallows every failure by design (its header explains why).
- `/api/backtest/*` is registered by `mockDashboardCards`, not by
  `mockDashboard` (the cards layer is opt-in, see the fixture header), so the
  shell-only specs above and any spec that calls only `mockDashboard`
  (`movement-read`, `most-active-bar`) miss it.

**The AAPL rows are a glob bug, not a missing route.**
`tests/dashboard/ticker-combobox.spec.ts` switches ticker and registers
`**/api/market/reference/*` and `**/api/market/data/*`. In Playwright's URL
globs a single `*` compiles to `([^/]*)` and does not span `/`
(`playwright-core` `globToRegexPattern`), so those patterns match
`/api/market/reference/AAPL` but not `/api/market/reference/AAPL/20260906`
or `/api/market/data/AAPL/202609?timeframe=60`. The 20 AAPL reference/data
misses fall through because of the globs; the 10 AAPL insight-report misses
fall through because no route exists. The IWM fixtures use
`**/api/market/reference/IWM/*`, which has the right depth.

None of these misses reach an assertion. The specs that *do* assert a clean
console (`tests/shared/navigation.spec.ts`) already use `mockAllPages`, which
covers everything except the two Dashboard endpoints above.

### 10.3 What the mocked suite proves, and what it cannot

This is the honest answer to "is it a real test".

**It proves** (narrowed after Codex review on #52):

- For the interactions and missing-value branches that a spec actually
  asserts on, the page renders correctly given a response of the shape the
  fixture was written to. That is not "each page's interactions work": §9.3
  lists the unexercised surfaces (Signals filters, Options inner modes,
  Insights tabs, Catalysts controls, the command palette, and more), and a
  regression confined to any of them leaves the 220 tests green.
- Payloads in `src/mocks/*.ts` are mostly written with `satisfies` against
  the `src/types/` contracts (11 in `dashboard.ts`, 12 in `live.ts`, 10 in
  `insights.ts`, …), and `npx tsc -b` type-checks the `tests` project, so
  *those* fixtures cannot drift from the types. The guarantee is not
  universal: `M.ok` takes `unknown`, inline object literals in specs
  (`ticker-combobox.spec.ts`, the `/api/me` overrides) carry no contract, and
  `MOCK_HEALTH`, `MOCK_FIREBASE_CONFIG_OPEN`, `MOCK_PREFERENCES_EMPTY` and
  `MOCK_MOST_ACTIVE_EMPTY` in `src/mocks/common.ts` have no `satisfies`. A
  contract change on any of those passes `tsc -b` while the mock drifts.

**It cannot prove:**

- That the FastAPI backend in `TeneikaAskew/stocks` returns those shapes.
  Nothing mechanical ties `src/types/` to the Pydantic response models. This
  is CLAUDE.md Rule 6 verbatim: a renamed or removed field in a stocks router
  passes CI in both repos and breaks Solyra at runtime. The PR template asks
  the author to attest to the pairing by hand; that is the only guard.
- That the deployed frontend and backend work together. The `cloud`
  Playwright project exists for this, matches `*.cloud.spec.ts`, and no such
  spec exists, so `npm run e2e:cloud` exits "No tests found".

So the job tests the frontend in isolation, against a contract the frontend
wrote for itself. That is a real test of one component and not a test of the
system. The job name `e2e (chromium, mocked)` is at least honest about which.

### 10.4 Rejected: a catch-all `**/api/**` 404 in `mockCommon`

Considered and rejected. It would make the log quiet by hiding exactly what
the log is currently reporting: which specs leave endpoints unmocked. The
ECONNREFUSED noise is the signal; a catch-all would be the cheat. If the noise
is a problem, the fix is to close the misses (§10.6 item 2), not to route them
to a silent 404.

### 10.5 The stocks side, for comparison

The stocks repo does not show this pattern because it has no Vite E2E job.
Its only Playwright use is `tests/e2e/test_e2e.py`, which starts a plain
`http.server` over two archived static sites under `archive/` and checks the
pages load. The one `GET /data/sample-report.json` access-log line in that
job is that file server. The backend is tested through the FastAPI TestClient
suite in `tests/api/`, not through a browser.

The `--ignore=tests/integration` on the `Run Tests` step is not a skip: the
integration tests run in a separate job in the same workflow,
`Integration Tests (ephemeral Postgres)`, which pulls `pgvector/pgvector:pg15`,
applies `gcp/schema.sql` with `ON_ERROR_STOP=1`, and runs `pytest
tests/integration/`. On the latest `main` push (run 34073775067) all three
jobs were green. The caveat is thinness, not absence: `tests/integration/`
holds four files (earnings-calibration persistence, journal timestamptz
round-trip, param-sweep persistence, schema query contract) and the test step
completes in 4 s, so most of the query surface in `gcp/database.py` and the
routers is not exercised against a real schema.

### 10.6 Options, ranked by value per cost — decision requested

None started. Listed for review before any work begins.

1. **Cross-repo contract check.** Have stocks CI publish the FastAPI OpenAPI
   document as an artifact (or commit it), and have Solyra CI either validate
   every fixture payload against it or generate TS types from it and diff
   them against `src/types/`. Closes the Rule 6 gap mechanically, needs no
   live backend, and turns the PR-template attestation into a check. Highest
   value; the open design question is where the schema lives and which side
   owns the diff.
2. **Close the leaking specs and the typing holes.** *Landed 2026-09-07,
   see §10.7.* In order of misses
   removed: register `/api/movement-statement` and
   `/api/insights/report/IWM` in `mockDashboard` (every dashboard load
   misses both today); switch `auth-gate.spec.ts`, the `admin-auth.spec.ts`
   sidebar tests, the `Mock mode OFF` block and `data-pipeline-widget.spec.ts`
   to `mockAllPages`; fix the ticker-combobox globs to
   `**/api/market/reference/*/*` and `**/api/market/data/*/*` and add its
   AAPL insight-report route; register `/api/backtest/*` where a spec loads
   the dashboard without it. Separately, add `satisfies` to the four untyped
   `src/mocks/common.ts` constants and lift the inline spec literals into
   typed fixtures, so the §10.3 typing claim becomes true rather than mostly
   true. Removes nearly all of the 438 misses without hiding anything,
   because every endpoint is then answered with a typed fixture. Small,
   mechanical.
3. **Real backend in CI.** One job that checks out stocks, boots the API
   against its mock-data mode or a seeded ephemeral Postgres, and runs the
   Solyra suite with `VITE_API_PROXY_TARGET` pointed at it. The only option
   that tests the two repos together before deploy. Expensive to build and
   to keep green; would run on a schedule or a label, not every PR.
4. **Cloud specs against staging.** Write the first `*.cloud.spec.ts` files:
   no `mockCommon`, real responses, assertions that tolerate live data.
   Tests the deployment as users see it; slower and inherently flakier.
5. **Integration coverage on stocks.** A coverage report scoped to
   `gcp/database.py` and `lib/data_loader.py` from just the
   `Integration Tests (ephemeral Postgres)` job, to size how much of the SQL
   surface the four files touch. Read-only; informs whether to extend that
   job.

Questions for review:

- Is item 1 the right first move, and which repo should own the schema
  artifact?
- Should item 2 land as part of item 1 or on its own, given it changes what
  the shell-only specs are exercising (they would now render fully mocked
  widgets rather than error states)?
- Is the ECONNREFUSED noise worth suppressing at the *log* level (Playwright
  `webServer.stderr: 'ignore'`) once item 2 lands, or should it stay visible
  as a standing signal?

### 10.7 2026-09-07 — item 2 landed: 440 → 25 proxy misses, all teardown races

**Branch:** `claude/e2e-ci-behavior-1cr1g6-fixtures`. Measured locally with
the same `--project=chromium` run CI uses (216 tests on this tree; CI's 220
on PR #52 is the merge ref, which carries four specs `main` gained since this
branch forked).

| Run | Proxy misses | Result |
|---|---|---|
| Baseline, CI job on `d7dd947` (PR #52 head, no fixture changes) | 440 | 220 passed |
| After round 1 (dashboard routes, globs, shell-only specs, typing) | 90 | 216 passed |
| After round 2 (charts/playbook/help/admin gaps, profile in `mockCommon`) | 30 | 216 passed |
| After round 3 (statement served 200, see below) | **25** | 216 passed |

What changed, by miss count removed:

- `mockDashboard` now registers `/api/movement-statement` and
  `/api/insights/report/IWM`, and includes the card layer
  (`mockDashboardCards`) by default; the opt-in rationale in its header was
  checked and did not hold (neither `movement-read` nor `most-active-bar`
  asserts on the unmocked state).
- `ticker-combobox.spec.ts` builds on `mockDashboard` and registers its
  AAPL fan-out with `*/*`-depth globs and typed payloads; the inline
  literals are gone.
- `auth-gate`, the `admin-auth` sidebar block, `Mock mode OFF`,
  `data-pipeline-widget` and the warm-up use `mockAllPages`; the
  `admin-auth` non-admin block calls `mockCommon`.
- `mockChartsApi` and `replay-trainer` register `/api/backtest/*`
  (`ChartsPage` mounts `BacktesterSection`); `playbook.spec` registers
  `/api/live/avg-volume/IWM`; `help.spec` uses `mockHelpApi`; `mockCommon`
  serves `/api/me/profile` as mock mode already did.
- Typing: `MOCK_FIREBASE_CONFIG_OPEN`, `MOCK_ME_DEV`,
  `MOCK_PREFERENCES_EMPTY` and `MOCK_MOST_ACTIVE_EMPTY` now `satisfies`
  their contracts (`MeResponse` exported from `useUser.ts` for the purpose);
  `MOCK_HEALTH` has no frontend consumer and says so. The `/api/me` literal
  in `mockCommon` is typed.

**The residual 25 are teardown races, not fixture gaps.** Every remaining
miss is on an endpoint the test *has* registered, and every one lands in a
test that either ends immediately after a mutation whose success triggers a
refetch (`admin-tabs` role/status PUTs → `/api/admin/users`; `admin`,
`admin-auth` route PUT → `/api/admin/routes`; the three `insights` replay
tests → run poll + history invalidation; `replay-trainer` Mark Entry →
`/api/journal/trades/IWM`) or asserts on the shell straight after a
`domcontentloaded` navigation while the page's fan-out is still in flight
(the `navigation` route loop, the `admin-auth` sidebar tests,
`data-pipeline-widget`, all on `/api/me/preferences` or
`/api/config/market-hours`). Playwright stops intercepting when the context
tears down, so a request issued in that window reaches Vite's proxy.
Verified by experiment: adding `await page.waitForLoadState('networkidle')`
before the `navigation` route tests end took that spec's misses from 9 to 0
(reverted; it is not a change worth shipping for log hygiene alone).

**What the experiment also found.** With the fan-out allowed to settle, the
`/dashboard` smoke test *failed* on a 404 console error: the
movement-statement route this branch had first added as the flag-OFF 404.
Chrome logs every 404 response as a console error, so that test's
clean-console assertion had only been passing because the response arrived
after the assertion ran, with the ECONNREFUSED 500 before this branch just
as with the 404 after it. Resolution: the statement is now served as a 200
from a typed `MOCK_MOVEMENT_STATEMENT` in `src/mocks/dashboard.ts` (the
payload `movement-read.spec.ts` carried inline, now `satisfies
MovementStatement`), by both the fixture and mock mode — the same reasoning
`mockCommon` already applied to `/api/me/preferences`. **This is the one
product-visible change in the branch:** mock mode's landing page now shows
the Movement Read card instead of hiding it. `src/mocks/index.test.ts`
asserts the new behaviour.

**What this does and does not prove.** The suite now answers its own
fan-out with typed fixtures, so a new ECONNREFUSED line in the CI log
outside the residual pattern above is a real gap. It says nothing new about
the cross-repo contract (§10.6 item 1), which is unchanged.
