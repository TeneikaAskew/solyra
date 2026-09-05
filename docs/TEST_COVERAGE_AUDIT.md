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
