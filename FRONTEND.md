<!-- Moved from the stocks repo (TeneikaAskew/stocks) when the frontend
     split out into this one. Paths were rewritten for this layout: what was
     `platform/src/...` is now `src/...`.

     Any remaining `platform/...` path is a STOCKS path and is left as-is on
     purpose — `platform/api/`, `platform/Dockerfile`, `platform/deploy.sh` and
     `platform/dist/` are the backend and its build, which stayed there. -->

# FRONTEND ARCHITECTURE

**Last reviewed:** unknown · **Last scanned:** 2026-09-16 · **Owner:** TBD

> **Companion to** [`ARCHITECTURE.md`](https://github.com/TeneikaAskew/stocks/blob/main/ARCHITECTURE.md) (in the stocks repo) — that doc covers the GCP/Cloud-Run/Cloud-SQL backbone; this doc covers the React + Vite single-page app. Since the #957 split it no longer ships inside the API image: `platform/Dockerfile` in stocks copies no `dist/`, so the API serves `/api/*` only.
> **Last refreshed:** 2026-05-22.
> **Companion diagram:** [`Frontend.drawio`](Frontend.drawio).

## TL;DR

- **Stack:** React 19 + TypeScript 5.9 + Vite 7 + Tailwind 4, Zustand for client state, TanStack Query for server state, TanStack Table for tables, Recharts + lightweight-charts for visualisations, react-router-dom v7 with a single nested layout route.
- **Layout:** one `createBrowserRouter` tree with an `AppShell` (the `TopTabs` nav by default, or `Sidebar` + `Header` when the user picks the sidebar layout) wrapping **13 route-level pages**, each lazy-loaded with `React.lazy` + `Suspense` and isolated by a per-route `RouteErrorBoundary` so a single page crash doesn't take down the chrome.
- **API surface:** 70 distinct `/api/*` paths, all served by the FastAPI service in the stocks repo (`solyra-api-staging`, the only API service since `solyra-api-prod` was retired on 2026-10-10, TeneikaAskew/stocks#1366). Counted from the `/api/...` request literals in app code under `src/` (tests, `src/mocks/` and generated types excluded), with path parameters collapsed and query strings dropped, so `GET /api/journal/trades/{ticker}` and `PATCH`/`DELETE /api/journal/trades/{id}` count once. Dev uses Vite on 5173 proxying to FastAPI on 8000, falling back to `solyra-api-staging` when nothing is listening locally.
- **Build/deploy:** `npm run build` → `dist/`, deployed as a static frontend (Lovable-published). It is NOT bundled into the API image any more. `api.stocks.insightscollective.org` maps to `solyra-api-staging` (since 2026-09-06); `stocks.insightscollective.org` is the Firebase auth-email sending domain and, since solyra#242, the Lovable custom domain that serves this SPA (`solyra-stocks.lovable.app` redirects there), which is not on Cloud Run.
- **Backend deploy (stocks repo):** merging to `main` auto-deploys `solyra-api-staging`, the only API service. `solyra-api-prod` and its manual `deploy-solyra-api-prod` Cloud Build trigger were retired on 2026-10-10 (TeneikaAskew/stocks#1366).

## Directory map

This is the solyra repo root. The backend deployment files it used to list
(`Dockerfile`, `cloudbuild.yaml`, `deploy.sh`) are NOT here — they live in
stocks under [`platform/`](https://github.com/TeneikaAskew/stocks/tree/main/platform),
and the tree below was still showing the pre-#957 layout.

```
solyra/
├─ index.html                   # Vite HTML entry (dark mode default)
├─ package.json                 # React 19, Vite 7, Tailwind 4, Zustand, TanStack Query/Table, Recharts
├─ vite.config.ts               # @ → src alias, proxies /api + /dev to FastAPI :8000
├─ tsconfig.json + tsconfig.{app,node}.json
├─ eslint.config.js
├─ playwright.config.ts         # E2E
├─ screenshot_pages.mjs         # Playwright util for capturing each page
├─ src/
│  ├─ main.tsx                  # ReactDOM.createRoot(...).render(<App />)
│  ├─ App.tsx                   # QueryClientProvider + RouterProvider (16 paths: 15 lazy pages + the /welcome redirect)
│  ├─ routes/                   # 15 lazy-loaded pages (13 in the app shell + landing + auth action)
│  │  ├─ LandingPage.tsx        # /         — public marketing/landing (all auth modes)
│  │  ├─ AuthActionPage.tsx     # /auth/action — where the Firebase auth emails land (outside the shell)
│  │  ├─ DashboardPage.tsx      # /dashboard— briefing-first Overview (brief, KPIs, cards)
│  │  ├─ LiveMarketPage.tsx     # /live     — real-time quote + indicators
│  │  ├─ ChartsPage.tsx         # /charts   — candlestick chart + strategy conditions
│  │  ├─ OptionsFlowPage.tsx    # /options  — Greeks, GEX, options table
│  │  ├─ PlaybookPage.tsx       # /playbook — pre-market playbook evaluator
│  │  ├─ ReportsPage.tsx        # /reports  — per-ticker research reports by phase
│  │  ├─ SignalsPage.tsx        # /signals  — historical signals + trade summary
│  │  ├─ JournalPage.tsx        # /journal  — trade journal entries
│  │  ├─ InsightsPage.tsx       # /insights — AI insight cards + watchlist + refresh
│  │  ├─ CatalystsPage.tsx      # /catalysts— Benzinga catalysts calendar
│  │  ├─ AdminPage.tsx          # /admin    — admin-only (user role grants, data sources, per-role model routing)
│  │  ├─ HelpPage.tsx           # /help     — glossary, Strat methodology refs
│  │  └─ SettingsPage.tsx       # /settings — user preferences
│  ├─ components/
│  │  ├─ layout/                # among them AppShell, TopTabs (default nav), Sidebar + Header (sidebar layout), CommandPalette; navConfig.ts has 14 nav items (Admin only for admins, one is the /#faq anchor)
│  │  ├─ shared/                # among them MetricCard, Modal, LoadingSpinner, RouteErrorBoundary,
│  │  │                         # TickerCombobox, ReplayControl, MostActiveBar (no shared DataTable:
│  │  │                         # SignalsPage and BacktesterSection use TanStack Table directly)
│  │  ├─ dashboard/             # MovementRead, expectedMove
│  │  ├─ insights/              # ReportCards, WatchlistPanel
│  │  ├─ charts/                # CandlestickChart, PriceAreaChart,
│  │  │                         # StrategyConditionsCard, SimilarSetupsCard
│  │  └─ backtest/              # BacktesterSection
│  ├─ hooks/                    # 23 TanStack-Query-backed hook MODULES (see hook map below). Several export more than one hook (e.g. useJournalChartTrades.ts exports 11), so this is a module count, not an exported-hook count
│  ├─ stores/                   # Zustand client state (4 stores; usePreferences.ts keeps a fifth, module-private one for sync status)
│  │  ├─ tickerStore.ts         # activeTicker + quickPicks (IWM/SPY/QQQ) + recentTickers
│  │  ├─ themeStore.ts          # dark/light toggle
│  │  ├─ settingsStore.ts       # nav pattern, density, accent, sidebar collapsed, chart timeframe, sound
│  │  └─ reviewDateStore.ts     # review (replay) date + time, set by ReplayControl
│  ├─ lib/                      # helpers (clock, formatting, snapshot building) plus browser-runtime modules such as authedFetch.ts (patches window.fetch), firebase.ts and runtimeConfig.ts; the indicator and playbook math lives in the backend lib/
│  │  ├─ indicators.ts          # indicator types only (math: lib/indicators.py behind POST /api/live/indicators)
│  │  ├─ playbookEvaluator.ts   # builds the MarketSnapshot sent to POST /api/playbook/evaluate; the server evaluates
│  │  ├─ marketSession.ts       # pre/RTH/post-market clock
│  │  ├─ chartTheme.ts          # Recharts + lightweight-charts colors
│  │  ├─ time.ts                # ET-aware date helpers
│  │  └─ *.test.ts              # Vitest unit tests
│  └─ types/                    # Ticker, Insight, Watchlist type defs
└─ tests/                       # Playwright E2E specs
   └─ helpers/                  # shared E2E utilities
```

## Routing model

`App.tsx` builds a single `createBrowserRouter` tree with four top-level
entries: the public **`LandingPage` at `/`** (rendered in every auth mode),
a **`/welcome` → `/` redirect**, the public **`AuthActionPage` at
`/auth/action`** (where the Firebase auth emails' buttons land: password
reset form, email confirmation, email recovery; the project's Identity
Platform action URL points here, set from the stocks repo's
`gcp/auth_email_templates.py`), and one **layout route**
(`AuthGate` wrapping `AppShell`) with **13 child routes** — in firebase mode a
signed-out visitor hitting any app route sees the sign-in screen, then the app.
Each child:

- is `React.lazy`-loaded, so the initial bundle is only the shell + the active page;
- is wrapped in a `<Suspense fallback={<PageLoader />}>` for the lazy-load handoff;
- carries its own `errorElement={<RouteErrorBoundary />}` — when a page crashes during render, the boundary catches it, keeps the nav chrome rendered, and shows a card with the error + a refresh button. The crash does **not** unmount the chrome.

The 16 routes (15 pages plus the `/welcome` redirect). *Primary API surface* lists what the page's own code and hooks request. The calls the app shell makes are listed under the table instead; a row repeats one only where the page also requests it itself.

| Path        | Page                 | Purpose | Primary API surface |
|-------------|----------------------|---------|---------------------|
| `/`         | `LandingPage`        | Public marketing/landing — the site's default page in every auth mode | `/api/waitlist` (POST, the waitlist signup form) |
| `/welcome`  | —                    | Redirect to `/` | — |
| `/auth/action` | `AuthActionPage`  | Where the Firebase auth emails land — password reset, email confirmation, recovery | none of its own (Firebase SDK; the `ConfigGate` around it loads `/api/config/firebase`) |
| `/dashboard`| `DashboardPage`      | Briefing-first Overview — pre-market brief, hero ticker + top setup, live signals, today's catalysts, sector rotation, AI take, news feed | `/api/dashboard/brief/{ticker}`, `/api/playbook/{ticker}`, `/api/signals/{ticker}`, `/api/catalysts/events`, `/api/market/sectors`, `/api/market/reference/{ticker}/{date}`, `/api/market/data/{ticker}/{date}`, `/api/insights/report/{ticker}`, `/api/movement-statement`, `/api/live/quote/{ticker}`, `/api/live/status`, `/api/config/market-hours` |
| `/live`     | `LiveMarketPage`     | Real-time quote, intraday indicators | `/api/live/quote/{ticker}`, `/api/live/indicators` (POST), `/api/live/history/{ticker}`, `/api/live/avg-volume/{ticker}`, `/api/live/status`, `/api/market/data/{ticker}/{date}` (review mode), `/api/market/reference/{ticker}/{date}` |
| `/charts`   | `ChartsPage`         | Candlestick chart + strategy-conditions card, gamma levels, signal overlay, similar setups, trade marking, backtester | `/api/market/data/{ticker}/{date}`, `/api/market/dates/{ticker}`, `/api/market/reference/{ticker}/{date}`, `/api/options/{ticker}/{date}/levels`, `/api/live/indicators` (POST), `/api/live/signal-series` (POST), `/api/signals/{ticker}/similar`, `/api/journal/trades/{ticker}` (GET), `/api/journal/trades` (POST), `/api/journal/trades/{id}` (PATCH), `/api/backtest/replay-trades` (POST), `/api/backtest/{all,results,equity}/{ticker}`, `/api/config/market-hours` |
| `/options`  | `OptionsFlowPage`    | Greeks, GEX, options chain | `/api/options/greeks` (POST), `/api/options/dates/{ticker}`, `/api/options/{ticker}/{date}` (404 falls back to `/api/options/live/{ticker}/{date}`), `/api/options/{ticker}/{date}/levels`, `/api/options/{ticker}/grid` and `/{date}/grid` |
| `/playbook` | `PlaybookPage`       | Pre-market playbook trigger/target/stop evaluator | `/api/playbook/{ticker}`, `/api/playbook/evaluate` (POST), `/api/live/quote/{ticker}`, `/api/live/indicators` (POST), `/api/live/history/{ticker}`, `/api/live/avg-volume/{ticker}`, `/api/live/status`, `/api/market/reference/{ticker}/{date}`. Client-side `playbookEvaluator.ts` only builds the snapshot; the server evaluates the conditions |
| `/reports`  | `ReportsPage`        | Per-ticker research reports by phase (markdown) | `/api/reports/list/{ticker}`, `/api/reports/{ticker}/{phase}` |
| `/signals`  | `SignalsPage`        | Historical signals (`historical_signals`) in a sortable table, plus the ticker's trade summary | `/api/signals/{ticker}` (`?limit=5000`, `?end_date=`, `?end_time=`), `/api/analytics/summary/{ticker}` |
| `/journal`  | `JournalPage`        | Trade journal CRUD | `/api/journal/*` (trades GET/POST/PATCH/DELETE, examples, import preview/commit, export), `/api/style/mine-and-validate` (POST), `/api/market/data/{ticker}/{date}` + `/api/market/dates/{ticker}` for the chart, `/api/config/market-hours` |
| `/insights` | `InsightsPage`       | AI insight cards, refresh button (Cloud Tasks enqueue) | `/api/insights/report/{ticker}` (+ `/history`, `/refresh` POST), `/api/insights/reports/{id}`, `/api/insights/runs/{id}`, `/api/dashboard/brief/{ticker}`, `/api/insights/watchlist`, `/api/insights/chat` (POST), `/api/admin/routes` (`AgentsPanel`) |
| `/catalysts`| `CatalystsPage`      | Benzinga catalysts calendar | `/api/catalysts/events`, `/api/catalysts/types` |
| `/admin`    | `AdminPage`          | Admin-only, three tabs — users & role grants, chart/report data sources, models & per-role model routing | `/api/admin/users` (+ `/{uid}/roles`, `/{uid}/status` PUT), `/api/admin/data-sources` (+ `/{id}/refresh` POST), `/api/admin/models`, `/api/admin/routes` (+ `/routes/{role}` PUT: model routing, not access control), `/api/admin/structure-brief`, `/api/admin/strat-engine/state`, `/api/admin/strat-engine/predict` (POST) |
| `/help`     | `HelpPage`           | Glossary + Strat methodology refs (static text) | `/api/config/indicators` (indicator periods and thresholds) |
| `/settings` | `SettingsPage`       | Profile and appearance preferences | `/api/me/profile` (GET/PUT) |

Shell calls: `/api/config/firebase` (`ConfigGate`, which wraps the shell and `/auth/action`); `/api/me` (`useUser`, which `AuthGate`, `AppShell` and the nav call); `/api/me/preferences` (GET, and PUT on a change, from `usePreferencesSync` in `AppShell`); `/api/config/market-hours` (`ReplayControl`, which sits in `TopTabs`, the default nav, or in the sidebar layout's `Header`, and fetches it on every app page although it renders only on `/dashboard`, `/live`, `/charts` and `/signals`); `/api/live/status` (`MarketSessionBadge` → `useLiveStatus`, mounted by `TopTabs` and by the expanded `Sidebar`); and `/api/market/most-active` (`MostActiveBar`, shown on `/live`, `/charts`, `/options`, `/signals` and `/journal`). `/dashboard`, `/options`, `/signals`, `/journal` and `/insights` also mount `TickerCombobox`, which calls `/api/insights/ticker/search`, `/api/market/coverage` and, when a ticker is added, `POST /api/insights/watchlist/add`.

Both navs (`TopTabs` and `Sidebar`) filter `/admin` out for non-admin users (server-resolved via `useUser` → `/api/me`).

## Data flow

Three concentric loops:

1. **Server state — TanStack Query.** The 23 data-fetching hook modules under `src/hooks/use*.ts` read through `useQuery`, keyed by `[resource, ...params]`; that includes the `POST` endpoints that only compute (`useLiveIndicators`, `useSignalSeries`, `useOptionsGreeks`, `usePlaybookEvaluation`, `usePlaybookBatch`), whose keys are a digest of the request they send rather than the whole body (for example bar count and last-bar time; contract count, spot and strike range; a snapshot signature plus the conditions), with `useSignalSeries` adding the ticker and date. Their writes go through `useMutation` with no `mutationKey`: nothing in `src/` sets one. (`useDebouncedValue`, `useReplaySession` and `useTradeMarking` are plain React state hooks with no request.) The `QueryClient` in `App.tsx` sets query defaults only, `staleTime: 5 min` and `retry: 1` — most market data is "fresh enough for 5 minutes," and a single retry catches transient Cloud Run cold-starts without thrashing on real outages. It configures no mutation defaults.
2. **Client state — Zustand.** Four stores in `src/stores/` hold client state: the active ticker plus quick picks and recent tickers (`tickerStore`), dark/light (`themeStore`), nav pattern, density, accent, sidebar collapsed, chart timeframe and sound (`settingsStore`), and the review (replay) date and time (`reviewDateStore`); `usePreferences.ts` keeps a fifth, module-private store for its sync status. Server responses stay in the query cache, with one exception: `usePreferencesSync` applies the account's saved theme, nav pattern, density and accent to `themeStore` and `settingsStore`.
3. **Local computation — helpers in `src/lib/`:** market-session clock (`marketSession.ts`), ET date helpers (`time.ts`), display formatting, and the playbook snapshot builder (`playbookEvaluator.ts`). `src/lib/` is not only pure helpers: it also holds browser-runtime modules such as `authedFetch.ts`, which patches `window.fetch`, `firebase.ts` and `runtimeConfig.ts`. The indicator and playbook math is not here: it lives in the backend `lib/*.py` and is reached through `POST /api/live/indicators` and `POST /api/playbook/evaluate` (`indicators.ts` holds types only). **Tested with Vitest:** 14 of the 22 modules have a `*.test.ts` alongside.

### Hook → endpoint map

Every `use*` function exported by a hook module that makes a request has its own row (check with `grep -n "^export function use" src/hooks/<module>.ts`). `useDebouncedValue`, `useReplaySession` and `useTradeMarking` make no request and have no row.

| Hook                       | Endpoint(s) hit                                            | Reads                              |
|----------------------------|------------------------------------------------------------|------------------------------------|
| `useUser`                  | `/api/me`                                                  | Identity + server-computed `is_admin`. Source: a verified Firebase token on staging, the only API service (the trusted IAP header applied only to `solyra-api-prod`, retired 2026-10-10) |
| `useTickerSearch`          | `/api/insights/ticker/search`                              | Keyword ticker search              |
| `useTickerCoverage`        | `/api/market/coverage`                                     | Full / daily / new data-coverage badges (same module as `useTickerSearch`) |
| `useAddToWatchlist`        | `/api/insights/watchlist/add` (POST)                       | Watchlist add (same module)        |
| `useRemoveFromWatchlist`   | `/api/insights/watchlist/{ticker}` (DELETE)                | Watchlist remove (same module; defined, no caller in `src/` yet) |
| `useLiveQuote`             | `/api/live/quote/{ticker}`                                 | Latest 1-min bar                   |
| `useLiveIndicators`        | `/api/live/indicators` (POST)                              | Wilder RSI/EMA/ATR/VWAP            |
| `useSignalSeries`          | `/api/live/signal-series` (POST)                           | Per-bar CALL/PUT signal fires for the Charts "Sig" overlay (same module as `useLiveIndicators`) |
| `useLiveHistory`           | `/api/live/history/{ticker}`                               | Intraday history window            |
| `useAvgVolume`             | `/api/live/avg-volume/{ticker}`                            | 20-day average volume, the RVOL denominator (same module as `useLiveHistory`) |
| `useLiveStatus`            | `/api/live/status`                                         | Market open/closed, session name, next open |
| `useMarketData`            | `/api/market/data/{ticker}/{date}`                         | Intraday OHLCV candles + volume for one date (`?timeframe=` 1/5/15/30/60) |
| `useAvailableDates`        | `/api/market/dates/{ticker}`                               | Dates with data (same module as `useMarketData`) |
| `useReferenceLevels`       | `/api/market/reference/{ticker}/{date}`                    | Reference OHLC + week stats for the date (same module) |
| `useGammaLevels`           | `/api/options/{ticker}/{date}/levels`                      | King/Gate/Spot/Flip                |
| `useOptionsGreeks`         | `/api/options/greeks` (POST)                               | BSM delta/gamma/theta/vega         |
| `usePlaybookEvaluation`    | `/api/playbook/evaluate` (POST)                            | trigger/target/stop for a flat condition list (defined, no caller in `src/` yet: PlaybookPage calls `usePlaybookBatch`) |
| `usePlaybookBatch`         | `/api/playbook/evaluate` (POST)                            | Per-card batches (same module; this is the one PlaybookPage calls) |
| `useInsightReport`         | `/api/insights/report/{ticker}` (`?as_of=`)                | Latest AI insight report           |
| `useInsightReportById`     | `/api/insights/reports/{reportId}`                         | A past report (same module)        |
| `useInsightHistory`        | `/api/insights/report/{ticker}/history` (`?limit=`)        | Report history list (same module)  |
| `useRefreshInsight`        | `/api/insights/report/{ticker}/refresh` (POST)             | Enqueues a pipeline run (same module) |
| `useRunStatus`             | `/api/insights/runs/{runId}`                               | Run status, polled every 3 s while queued/running (same module) |
| `useBriefDirection`        | `/api/dashboard/brief/{ticker}`                            | Brief bias + FTFC direction (same module) |
| `useWatchlist`             | `/api/insights/watchlist` (`?catalyst=`, `?limit=`)        | Ranked watchlist, read-only (add/remove are the `useTickerSearch` module rows above) |
| `useSimilarSetups`         | `/api/signals/{ticker}/similar`                            | Historical near-neighbours         |
| `useTradeSummary`          | `/api/analytics/summary/{ticker}` (`?days=`)               | Per-ticker analytics (module `useTradeAnalytics.ts`; `/api/analytics/trade-stats` has no frontend caller) |
| `useAdminModels`           | `/api/admin/models`                                        | Priced model catalog + whether credentials exist (module `useAdmin.ts`) |
| `useAdminRoutes`           | `/api/admin/routes`                                        | Per-role model routing: the provider and model each role runs on (same module) |
| `useUpdateAdminRoute`      | `/api/admin/routes/{role}` (PUT `{ provider, model }`)     | Sets one role's provider/model and invalidates `['admin-routes']` (same module). Model routing, not access control |
| `useAdminUsers`            | `/api/admin/users`                                         | Users, their roles, and the assignable roles (same module) |
| `useUpdateUserRoles`       | `/api/admin/users/{uid}/roles` (PUT `{ roles }`)           | Role grants: grant or revoke roles for a user, the access-control write (same module) |
| `useUpdateUserStatus`      | `/api/admin/users/{uid}/status` (PUT `{ disabled }`)       | Disable or re-enable a user's sign-in (same module) |
| `useAdminDataSources`      | `/api/admin/data-sources`                                  | Status of the datasets behind charts and reports (same module) |
| `useRefreshDataSource`     | `/api/admin/data-sources/{id}/refresh` (POST)              | Queues that dataset's refresh job (same module) |
| `useStructureBrief`        | `/api/admin/structure-brief`                               | Strat-engine structure brief, dev readout (same module) |
| `useStratEngineState`      | `/api/admin/strat-engine/state`                            | Strat-engine model state per ticker/timeframe (same module) |
| `usePredictMutation`       | `/api/admin/strat-engine/predict` (POST)                   | On-demand single-bar prediction (same module) |
| `useIndicatorConfig`       | `/api/config/indicators`                                   | Server-resolved config (module `useConfig.ts`) |
| `useMarketHours`           | `/api/config/market-hours`                                 | Server-resolved config (same module) |
| `useGammaGrid`             | `/api/options/{ticker}/grid` (live) or `/api/options/{ticker}/{date}/grid` | Strike × expiration GEX/VEX/OI grid for Swing |
| `useJournalChartTrades`    | `/api/journal/trades/{ticker}`                             | The ticker's trades for the chart's date (module `useJournalChartTrades.ts`) |
| `useJournalTradesFull`     | `/api/journal/trades/{ticker}`                             | Every trade for the ticker (same module) |
| `useJournalExamples`       | `/api/journal/examples/{ticker}`                           | Admin teaching examples (same module) |
| `useCreateChartTrade`      | `/api/journal/trades` (POST)                               | Records a trade marked on the chart (same module) |
| `useCloseChartTrade`       | `/api/journal/trades/{id}` (PATCH)                         | Closes a trade (same module) |
| `useDeleteChartTrade`      | `/api/journal/trades/{id}` (DELETE, `?ticker=`)            | Deletes a trade (same module) |
| `useSeedTrades`            | `/api/journal/seed/{ticker}` (`?date=`)                    | Seed trades for a date (same module; defined, no caller in `src/` yet) |
| `useReplayTrades`          | `/api/backtest/replay-trades` (POST)                       | Scores trades by replay; writes nothing (same module) |
| `useMineMyStyle`           | `/api/style/mine-and-validate` (POST)                      | Mines and validates the trader's style (same module) |
| `useImportPreview`         | `/api/journal/import/preview` (POST, multipart)            | Parses an import file; writes nothing (same module) |
| `useImportCommit`          | `/api/journal/import/commit` (POST)                        | Writes the previewed import (same module) |
| `useMovementStatement`     | `/api/movement-statement` (`?ticker=`, `?timeframe=`)      | Dashboard movement read |
| `useLatestOptionsDate`     | `/api/options/dates/{ticker}` (`?limit=1`)                 | Latest options date (module `useOptionsDates.ts`) |
| `useAllOptionsDates`       | `/api/options/dates/{ticker}`                              | Every options date, for the picker (same module) |
| `usePreferencesSync`       | `/api/me/preferences` (GET, PUT)                           | Loads and saves theme, nav, density and accent (module `usePreferences.ts`) |
| `usePreferencesStatus`     | none                                                       | Reads the sync status for components that don't own the syncer (same module) |
| `useProfile`               | `/api/me/profile` (GET, PUT)                               | Settings profile, read and save |
| `useReviewQuote`           | `/api/market/data/{ticker}/{date}` (`?timeframe=1`)        | Review-mode quote rebuilt from that day's 1-minute bars |
| `useUser` (above)          | `/api/me`                                                  |                                    |

Pages read `useTickerStore().activeTicker` and pass it to the ticker-scoped hooks, which key the query on it (no hook reads the store itself), so changing `activeTicker` (from a page's `TickerCombobox`, the ⌘K command palette, or a ticker click on `/catalysts` or `/insights`) refetches every ticker-scoped query in one move. Among the `src/hooks` hooks, the queries not keyed on the ticker: `useUser`, `usePreferencesSync` and `useProfile` (keyed `['me', …]`); `useLiveStatus`, `useIndicatorConfig`, `useMarketHours` and `useWatchlist`; `useTickerSearch` and `useTickerCoverage` (keyed on the search text and the result symbols); `useInsightReportById` and `useRunStatus` (a report or run id); the admin queries; and `useLiveIndicators`, `useOptionsGreeks`, `usePlaybookEvaluation` and `usePlaybookBatch`, keyed on a digest of what they `POST` (see above). Page-local queries are not ticker-keyed either: the dashboard's catalysts (`['catalysts-overview', from]`) and sector rotation (`['market-sectors']`), `CatalystsPage`'s events and types, `MostActiveBar` (`['most-active']`) and `ReplayControl` (`['market-hours']`). Mutations carry no key at all.

## Refresh semantics — AI insights write path

Most calls only read. The write that goes through Cloud Tasks is the **insights refresh button**, which closes a loop through Cloud Tasks:

```
Browser (InsightsPage / ReportCards)
  ↓ POST /api/insights/report/{ticker}/refresh
FastAPI router (platform/api/routers/insights.py)
  ↓ enqueue task on insight-pipeline-queue (Cloud Tasks)
  ↓ task targets the insight-pipeline Cloud Run Job's :run endpoint
  ↓ with env vars INSIGHT_RUN_ID + INSIGHT_TICKER
Cloud Tasks delivers → insight-pipeline Job runs
  ↓ writes one row to insight_reports + insight_runs in Cloud SQL
Browser re-polls /api/insights/report/{ticker} via TanStack Query refetch
  ↓ new row appears
```

This is the only write that goes through Cloud Tasks, but not the only write. The 26 non-GET call sites in `src/` send 24 distinct verb + path pairs: 14 persist data or dispatch work (insights refresh and watchlist add; journal create, close, delete, import commit and style-mine; profile and preferences; four admin calls for the model route, user roles, user status and data-source refresh; and the landing-page waitlist signup), 9 only compute or preview (`/api/live/indicators`, `/api/live/signal-series`, `/api/options/greeks`, `/api/playbook/evaluate`, `/api/insights/chat`, `/api/backtest/replay-trades`, `/api/journal/import/preview`, `/api/admin/strat-engine/predict`, and `/api/journal/export/{ticker}`, which writes a CSV to `data/signals/` on the API container's ephemeral disk and changes no table), and 1 is defined but never called (`DELETE /api/insights/watchlist/{ticker}` via `useRemoveFromWatchlist`). The split goes by HTTP verb, so it does not count writes a `GET` triggers on the server. One of them: `SwingMode` (the `/options` Gamma Map's default Swing view) runs `useGammaGrid` in live mode by default, and for an off-list ticker with no stored chain `GET /api/options/{ticker}/grid` fetches one from AlphaVantage on demand and upserts it into `etf_options_snapshots` (stocks `platform/api/routers/grid.py`, `get_grid_live` → `_fetch_on_demand`).

## Build pipeline

### Local dev

```bash
npm install                        # one-time — this repo IS the frontend root
npm run dev                        # vite on :5173, proxies /api → :8000 if a backend is listening
# In another terminal, from the stocks repo (the backend lives there now):
make dev                           # FastAPI on :8000 (Makefile `dev` → scripts/dev_server.sh)
```

`vite.config.ts` proxies `/api/*` (and `/dev/*`) to `localhost:8000` when something is listening there, and to `solyra-api-staging` otherwise (see "Where `/api` goes" in `README.md`), so the browser sends its `/api` requests to `:5173` only. Hot-module reload works for `.tsx`/`.css`; FastAPI auto-reloads via `uvicorn --reload`.

### Production build

```bash
npm run build                       # tsc -b && vite build → dist/
```

`tsc -b` runs project-references compilation (`tsconfig.app.json` + `tsconfig.node.json` + `tsconfig.test.json`) — type-checks the whole app, and the E2E fixtures against the real API types, before bundling. `vite build` produces tree-shaken, code-split chunks (each lazy route is its own chunk) into `dist/` (Vite's default; `vite.config.ts` sets no `outDir`).

### Docker image

[`platform/Dockerfile`](https://github.com/TeneikaAskew/stocks/blob/main/platform/Dockerfile) (stocks) is multi-stage:

1. **`frontend` stage** (`node:20-slim`) — runs `npm ci` + `npm run build`, outputs `/build/platform/dist/`.
2. **`runtime` stage** (`python:3.11-slim`) — installs FastAPI deps, copies `lib/` + `gcp/` + `platform/api/`, then `COPY --from=frontend /build/platform/dist /app/platform/dist` so the same Python process serves the SPA + `/api/*`. `main.py` mounts `dist/` as a `StaticFiles` at `/`.

**Superseded by the #957 split.** The two-stage image above is how it worked when the SPA lived in the stocks repo. `platform/Dockerfile` now copies no `dist/`, and `main.py` mounts the SPA only when `platform/dist` exists, so that mount never activates — the header of that Dockerfile says so explicitly. Cold-start budget is still dominated by the Python import graph (`lib/`, `gcp/database.py` Cloud-SQL connector); the frontend simply is not in the image.

### Backend deploy — one API service (production retired 2026-10-10)

> **Production retired 2026-10-10.** `solyra-api-prod` was deleted after
> TeneikaAskew/stocks#1366 merged, which also removed the `deploy-solyra-api-prod`
> trigger. `solyra-api-staging` is the only API service and redeploys from
> stocks `main`. Below, the prod row and the promotion paragraph record the
> 2026-09-05 two-service layout; the staging trigger and `deploy-staging.yml`
> still apply.

Rebuilt 2026-09-05. Two Cloud Build triggers in the stocks repo, one per service:

| Trigger | Fires | Deploys |
|---|---|---|
| `deploy-solyra-api-staging` | push to `main` touching `platform/**`, `lib/**`, `requirements.txt`, `gcp/database.py` | `solyra-api-staging` |
| `deploy-solyra-api-prod` | **manual only** | `solyra-api-prod` |

Merging to `main` cannot reach production. The prod trigger promotes the image
digest currently serving staging rather than rebuilding, so prod ships the bits
staging validated.

This replaced a tag-based blue/green on a single service, where a `staging` tag
at 0% traffic was promoted by shifting traffic. `--no-traffic` was dropped on
2026-08-25 and a tag carries no traffic guarantee of its own, so the
"staging"-tagged revision was serving 100% of production. The environment a
deploy lands in is now the service name, not a traffic percentage.

`platform/deploy.sh` kept a legacy `STAGING=1` revision-tag mode for one-off
operator use; since TeneikaAskew/stocks#1366 it refuses that mode and any run
without `STAGING_SERVICE=1`. Stocks'
[`.github/workflows/deploy-staging.yml`](https://github.com/TeneikaAskew/stocks/blob/main/.github/workflows/deploy-staging.yml)
(this repo has no such workflow) is a manual (`workflow_dispatch`) one-click
staging redeploy with an opt-in schema apply.

The Cloud Build triggers run as `trading-runner@`. The separate
`deploy-staging.yml` GitHub Actions workflow (in stocks) authenticates via
Workload Identity Federation as `arch-refresh-bot@`, clamped to `main`.

> Superseding an earlier note here: that note said two GitHub Actions workflows
> (`deploy-platform-staging.yml` / `promote-platform-prod.yml`) had been removed
> from stocks `main` leaving `platform/deploy.sh` as the only entry point. The
> first half was right and the conclusion no longer holds — deployment moved to
> the two Cloud Build triggers above, which is what fires on a merge. Use the
> triggers; `platform/deploy.sh` is the manual operator path.

## Testing

- **Unit (`npm test` → Vitest):** co-located `*.test.ts{,x}` files under `src/`. In `src/lib/`, 14 of the 22 modules have one, `playbookEvaluator.test.ts` and `marketSession.test.ts` among them.
- **Component:** none currently — no Vitest test renders a component, and `@testing-library/react` is not a dependency. Filed as a coverage gap.
- **E2E (`npm run e2e` → Playwright):** the specs under `tests/<page>/` run the full app under `chromium`. `playwright.config.ts` has four projects (`warmup`, `chromium`, `iap-setup`, `cloud`); the two meant to run specs:
  - `chromium` (default) — against its own Vite on `:5199` (`node scripts/e2e-server.mjs`), never your `npm run dev` server;
  - `cloud` — targets the PUBLISHED FRONTEND (the `playwright.config.ts` default `https://solyra-stocks.lovable.app`, which now redirects to the custom domain `https://stocks.insightscollective.org`), not a Cloud Run URL and not behind IAP. IAP left this path at the #957 split: the SPA is published separately and the API is gated per request by a Firebase ID token. `e2e:cloud:auth` opens a browser for an interactive Firebase sign-in, refuses to save unless the signed-in shell renders, and captures Firebase's IndexedDB persistence so the session actually restores. **It currently has no specs to run**: `cloud` matches `*.cloud.spec.ts` and none exist, so `npm run e2e:cloud` exits with "No tests found". That is deliberate — it previously ran the 29 hermetic specs, which intercept every `/api` call and force `authMode: 'open'`, so a green run said nothing about the deployment. Deployment specs (no `mockCommon`, live responses) are the outstanding work.
- **Lint:** `npm run lint` → ESLint 9 with `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.

## Production runtime

This section describes the API service in stocks. **It is not where this SPA is
served** — that is Lovable, at its custom domain `https://stocks.insightscollective.org`
(solyra#242; `https://solyra-stocks.lovable.app` redirects there).

- **Frontend URL:** `https://stocks.insightscollective.org`. It calls the API
  cross-origin; `authedFetch` re-points `/api/*` at `STAGING_API` for static hosts
  (both defined in `src/lib/apiTargets.ts`).
- **API URL:** `solyra-api-staging-5sjtb3yl7a-ue.a.run.app` (public edge,
  Firebase-gated, what the SPA calls), the only API service.
  `solyra-api-prod-5sjtb3yl7a-ue.a.run.app` (behind IAP) was retired on
  2026-10-10 (TeneikaAskew/stocks#1366). `api.stocks.insightscollective.org` maps to **staging** since
  2026-09-06 (it was `stocks.insightscollective.org` from 2026-09-05, moved so
  that hostname could carry the Firebase auth-email DNS records; since solyra#242
  that hostname serves this SPA).
- **Auth:** two deployed modes until 2026-10-10, one since. `solyra-api-prod`, retired on
  2026-10-10 (TeneikaAskew/stocks#1366), ran `AUTH_MODE=iap`,
  which is **pass-through, not a check**: `api/auth.py` states "the middleware
  does NOT enforce here — IAP already gated the request", and `/api/me` takes
  identity from the plaintext `X-Goog-Authenticated-User-Email` header IAP
  injects at the edge (`main.py._iap_user_email`). No JWT assertion is parsed
  anywhere in the API — `grep -r Iap-Jwt-Assertion --include=*.py` in stocks
  returns zero hits. The security boundary is IAP itself, so a service in that
  mode must never get an `allUsers` invoker binding; without IAP in front, any caller
  could set the header and pick their own identity. `solyra-api-staging` runs
  `AUTH_MODE=firebase`: the browser signs in with Firebase and `authedFetch`
  attaches the ID token per request, which the middleware **does** verify. The
  SPA talks to staging, the only API service, so **Firebase is the only path that runs**.
  `useUser` gates `/admin` off the server-computed `is_admin` in either mode.
- **Cloud Run config** (`solyra-api-staging`, the only API service): `--min-instances 0`
  (no warm instance is configured, so do not rely on one to avoid cold starts),
  `--max-instances 5`, `--cpu 1`, `--memory 2Gi` (a 1 GiB instance OOM-killed
  full-chain GEX on `/api/options/*/levels`; the comment above the flags in
  `platform/deploy.sh` records the incident), `--timeout 300`, and
  **`--cpu-throttling`**: CPU is NOT allocated between requests. Sources:
  `--cpu-throttling` is line 355 of `platform/deploy.sh` on stocks `main`
  (`1a6ff45e`), the manual operator path (the auto-deploy Cloud Build trigger deploys the
  image by digest with one merged env var, `--update-env-vars=MOVEMENT_STATEMENT_ENABLED=true`,
  and leaves these settings on the service), and the live service read
  on 2026-10-11 reports `run.googleapis.com/cpu-throttling: 'true'`, `cpu: '1'`,
  `memory: 2Gi`, `timeoutSeconds: 300`, revision `maxScale: 5` (the service
  object also carries a service-level `run.googleapis.com/maxScale: '20'`
  annotation) and no `minScale`. **Corrected 2026-10-11:** this bullet previously said
  `--no-cpu-throttling` (PR #507, "FastAPI BackgroundTasks need full CPU after
  the response is sent"). #507 did the opposite: it pinned `--cpu-throttling`
  and `--min-instances 0` in `platform/deploy.sh` to stop always-allocated
  billing on a service taking ~38 requests a day. The only stocks deploy
  command that sets `--no-cpu-throttling` is the `discord-interactions`
  service's (`gcp/deploy.sh:1260`, where BackgroundTasks finish the deferred reply).
  There is no `--no-cpu-throttling` anywhere in `platform/deploy.sh`.
- **Logging:** stdout → Cloud Logging; the failure-notifier sink does NOT cover the service (its filter is `resource.type=cloud_run_job`), so service errors don't auto-create GitHub issues. Pager-style monitoring is via Cloud Logging alert policies (not yet wired — open todo).

## Known limitations

- **No service worker / offline mode.** A reload during a network hiccup shows the browser's network-error page.
- **No code-coverage gate in CI.** Vitest runs but coverage isn't enforced; coverage gaps in `hooks/` and `components/` are not visible until they cause a runtime regression.
- **No component-test layer.** No Vitest test renders a component, and `@testing-library/react` is not installed.
- **No Storybook / design-system doc.** Components are documented only by usage. Adding Storybook would help the Tailwind 4 + custom tokens story stay coherent.
- **`/api/me` is cached for only 30 s.** `useUser` sets `staleTime: 30_000` so a role change reaches the UI quickly; a page mount after that refetches identity.

## Open work

1. **Component test bed.** Set up `@testing-library/react` and write tests for at least `MetricCard`, the `/admin` gating in `TopTabs` and `Sidebar`, and `RouteErrorBoundary`.
2. **Coverage gate.** Wire Vitest `--coverage` into the staging-deploy workflow as an advisory check.
3. **Cloud Logging alert policy** for the `solyra-api-staging` service (5xx rate, p95 latency); this named `solyra-api-prod` until that service was retired on 2026-10-10.
4. **Component documentation surface** (Storybook or Ladle) — the Tailwind 4 token system is undocumented outside of `chartTheme.ts`.
