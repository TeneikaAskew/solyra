# Test-Coverage Audit — the frontend-only migration

**Date:** 2026-09-01 · **Branch:** `feature/frontend-only` · **Status:** draft pending E2E + forensics results

This document is the durable record of the test-data audit that ran alongside the
repo split (Solyra → frontend-only SPA; `api/` + `lib/` + `gcp/` + `scripts/` →
the **stocks** repo, deployed as the `trading-platform` Cloud Run service). It
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
| `useTradeAnalytics()` POST | `d85c883` (Apr 25) *"move financial math server-side, eliminate hardcoded values"*; consumer: ChartsPage | `52acbe1` (Jul 11) Task 6 strip-down — Charts went research-only; JournalPage **reimplemented stats client-side** (`computeJournalStats` in `src/lib/journalStats.ts`) instead of consuming the POST | **Deliberate surface removal, accidental hook orphaning** — and a quiet reversal of the "no duplicate client-side financial math" rule the hook was created to enforce | alive: `analytics.py:118`, `docs/API.md:47` |
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

> **E2E RESULTS: full per-spec verdicts — pending, will be filled in below.**

Unit suite: Vitest passing at every committed point — 27 files / 253 tests at
`042d986` and `8768250`; **29 files / 263 tests** after the fixture-binding
tests landed. Those two new files (`src/hooks/journalFixtureMapping.test.ts`,
`src/routes/reportsFixtureRender.test.ts`) run the shared fixtures through the
real runtime mappers (`journalRowToTradeEntry`, `exportableTrades`,
`renderReportHtml`), covering the semantic invariants `satisfies` cannot:
active trades map to `undefined` financials (never 0), replay rows keep the
analytics-hygiene keys, the export guard drops exactly the rows the server
would 422 on, and the report fixture genuinely exercises the GFM table path.

## 7. Commit trail

| Commit | What |
| --- | --- |
| `bb773d1` (content via PR #3 squash → `33c309a`) | 7 per-page fixture modules, `tsconfig.test.json`, 7 specs rewired, 3 route-type exports |
| `042d986` | Dashboard/Options/Journal fixtures out of `mocks.ts`; market-hours + journal-shape contract fixes |
| `8768250` | Final gap closure: admin strat-engine, insights chat/agents, help indicators, landing waitlist, journal export, dashboard cards |
