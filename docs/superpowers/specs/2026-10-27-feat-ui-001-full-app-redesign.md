---
feat_id: FEAT-UI-001
req_ids: [REQ-UX-001, REQ-MARKET-001, REQ-ACCESS-001, REQ-DATA-002, REQ-DATA-003, REQ-REL-001, REQ-FRESH-001, REQ-AUTH-001, REQ-AUTHZ-001, REQ-TENANCY-001, REQ-LLM-001]
issues: [135, 95, 117, 119, 121]
canvases: []
done_when:
  - "Existing public, auth-action and 15 protected application route URLs continue to render real-source pages; /design-lab is added as an isolated preview route"
  - "Every original page data query and mutation has a named destination in the source-to-redesign coverage matrix, or an explicitly approved removal; the unapproved removal count is zero"
  - "Browser network assertions show that live pages call only the existing GCP/FastAPI proxy and approved existing application services, never Alpha Vantage directly"
  - "All production financial values come from existing hooks/typed API responses; zero synthetic design-lab fixtures or duplicate client financial calculations ship in live routes"
  - "Light mode is white/ivory with violet/purple actions and dark mode is graphite with orange primary and blue secondary actions, without changing bull/bear and King/Gate/Flip semantic encodings"
  - "Settings preserves persistent light/dark, accent, density, navigation and profile controls and their existing account-backed synchronization and error states"
  - "A global ticker and session/replay context is passed across compatible Dashboard/Live/Charts/Options/Playbook/Signals pages without leaking previous ticker or account data"
  - "Dashboard preserves price/brief, MovementRead, historical setup, qualified counts, levels, chart, signals, catalysts, sectors, AI take and news from the baseline"
  - "Charts/Options/Playbook preserve STRAT, GEX heatmaps/Trinity/Profiles, clearly labeled demo-only options print tape, backtest/replay, setup conditions and source timestamps"
  - "Reports/Signals/Journal/Catalysts preserve history, filtering, evidence, scoped trade mutations, news and earnings-history contract with open PR dependencies documented"
  - "The three AI routes preserve working endpoints and histories while offering a navigable Evidence/Research/Decision workspace with existing deep links"
  - "Admin keeps existing roles/data-source refresh/model routing/StructureBrief/PredictForm/ModelState features and clearly distinguishes GCP liveness/freshness from proposed endpoint observability"
  - "Public Landing, AuthGate sign-in and /auth/action retain actual waitlist/Firebase behavior and isolate mock-only preview interactions in /design-lab"
  - "Accessibility, responsive layouts, app route/auth and data-state tests pass at desktop/tablet/390px/360px, including null/error/stale/loading/permission tests and no account/ticker leakage"
  - "The implementation's approved PRs meet the spec gate, catalog traceability and current-head review requirements before owner-authorized merges"
status: draft
supersedes: null
---

# Solyra full application visual replacement without data loss

## Problem

The existing published Solyra renders real GCP-backed market research and user workflows at the production URLs. A separate unpublished Lovable remix now has 18 full-page redesign previews, but they use **synthetic illustrative fixtures** and are served under `/redesign-*`. The user wants those design compositions to **replace the real page layouts at their current routes** while retaining all current data, derived values, interactions, security and GCP endpoints. Merely adding preview routes does not satisfy the request.

The original Solyra Lovable project is connected to the GitHub repository; all implementation occurs on a gated feature branch and reviewed PR, **never directly on the Lovable-connected branch**. Lovable Design Lab remains available for design comparison. Current visual source: unpublished design project `26dee0a0-7a9d-4fa1-8eb6-b238f39aa13b` (latest reviewed `d863620`); its components are *visual references*, not production data providers.

## Non-goals

- Do not replace live API consumers with `syntheticBars`, `fixtures`, hardcoded market prices, simulated earnings, or preview-only fake success.
- Do not delete, rename or silently abandon any existing GCP, Firebase, Lovable research-session, journal or account endpoint.
- Do not add Cloud SQL tables, introduce new third-party browser calls, change server financial calculations, or implement the proposed GCP observability adapter as part of the UI-only phase.
- Do not claim options snapshot deltas are trade prints, or uncalibrated AI scores are probabilities.
- Do not auto-publish, merge, or deploy from the design remix or a work-in-progress PR.
- Do not rewrite Lovable Git history, or bypass `CLAUDE.md`/the product-delivery spec gate.
- Do not force the AI route consolidation until data and bookmark/deep-link parity is validated.

## Approaches considered

1. **Copy the Design Lab pages over production page components** — rejected: loses live data and writes, auth, provenance, and contract semantics.
2. **Expose `/redesign-*` alongside current app indefinitely** — rejected: user explicitly wants the actual existing pages replaced.
3. **Chosen: source-preserving view-layer refactor**, importing the design's layout grammar, tokens, hierarchy and controls into existing route components while binding to **their original hooks and responses**; update existing navigation and Settings. Keep Design Lab independently, review in gated PRs, and deploy only after validation.

## Design

### A. Route and source-preservation inventory

Before changing each route, capture the full baseline inventory: route, imported child components, API calls, query keys, mutations and auth gates; map each to a visible destination (a page panel, tab, drawer or contextual link) in the redesign. Each row needs tests demonstrating the real data remains visible. No removal is implicit.

| Actual application target | Existing data/functions that must remain reachable | Redesign destination |
|---|---|---|
| `/` | LandingNav, agent hero, full GEX/bento demos, chart showcase, product dives, rhythm, real waitlist `/api/waitlist`, FAQ/footer | Full Vasa-inspired public Landing with **real** waitlist submit/errors; not a fake concept form |
| AuthGate state (not a new `/login`) | Google/email sign-in/up, verification, password reset, auth state and user identity | New branded Sign-in/Sign-up shown by existing AuthGate |
| `/auth/action` | Firebase action-code handling, email confirm, reset, recover, invalid/expired | Styled single-task action cards through existing ConfigGate and Firebase code |
| `/dashboard` | `/api/dashboard/brief/{ticker}`, `/api/live/quote/{ticker}`, live/history, reference/market data, MovementRead, top setup/hold windows, signals, catalysts, 11 sectors, AI take, source-stamped news | New bento Dashboard, full data-preserving panels and chart |
| `/live` | quote/history/status, server indicator calls, OHLC, volume pace, reference levels, conditional signals, feed timing | Live workstation with explicit freshness, session and entitlement |
| `/charts` | timeframes, EMA/VWAP/Gamma/Strat overlays, ReplaySessionControls, TradeMarkingChart, StrategyConditionsCard, SimilarSetupsCard, BacktesterSection, trade-history contexts | Chart-first canvas and evidence rail, preserving live/replay and server-calculated results |
| `/options` | real SwingMode strike×expiry GEX/VEX grid, Trinity SPX/SPY/QQQ, Profiles GEX/VEX/date/Greeks/nodes/flip, FlowTab+ContractDrilldown **demo** | Options terminal with real GCP data for actual panels, demo banner for unconnected trade-print UI |
| `/playbook` | setup cards, qualified counts, win/return horizons, trigger/stop/target, checklist/evaluation, related trades | Plan/conditions/risk workspace; server evaluation persists |
| `/reports` | report library by ticker/date/phase, markdown reading, source evidence | Report reader, complete phase navigation |
| `/signals` | filters, raw scores, historical rows, outcome/analytics and detail | Signal tape + inspector; raw score never probability |
| `/journal` | owner-scoped trades, import with rejected-row evidence, marking chart, trade rail, MyStylePanel, profile and historical review | Journal chart + trade rail + import/workflow |
| `/insights` | GCP seven-agent reports, runs/history/watchlist, actual chat and source evidence | Intelligence Workspace **Evidence** mode with backward-compatible `/insights` |
| `/insights-lovable` | existing real research-session persistence/orchestration, quote/chart, question composer, history | Intelligence Workspace **Research** mode, keep deep link and storage |
| `/ai-insights-lovable` | report/analogue/market signal, agents, context, watchlist/history/chat | Intelligence Workspace **Decision** mode; existing route kept |
| `/catalysts` | events/earnings/news/SEC/macroeconomic filters, dates/details, and frontend #289 + backend #1608 **open/unmerged** descriptive earnings qualification/evidence contract | Timeline + evidence + earnings; do not treat PR fields as deployed |
| `/admin` | liveness `/api/health`, dataset freshness `/api/health/freshness`, existing admin users/roles/data source refresh/routes/models and StructureBrief/PredictForm/ModelStateSnapshot | Admin Platform Operations and Model Operations, role-secured, existing writes retained |
| `/help` | glossary, configuration and methodology content | Task-based searchable help with full original terms and contextual links |
| `/settings` | real theme/accent/density/nav/account profile and user-preference write-through; failure and conflict states | Full preference center and global styling |
| `/design-lab` (new) | preserved Vasa/HeroUI preview screens with explicit illustrative labels; no production calls | Separate reference/design QA route, not a replacement for live pages |

Any baseline query/mutation not listed in this high-level summary must still be included in the generated full source-to-destination audit. A standalone production UI change is blocked if its current data source has no mapped destination.

### B. New system-wide theme rules

Theme selection remains `dark | light` with existing `useThemeStore` / `/api/me/preferences` persistence; do **not** break or repurpose stored values. Both modes consume shared semantic CSS tokens (no fixed theme-specific colors in route components):

- **Light / Clear Signals:** white/ivory base (`#fff`, `#f7f6fc`), graphite/ink text, purple/violet action (`#6339d8` or contrast-checked equivalent), subtle lavender panels and borders.
- **Dark / Dawn Intelligence:** dark navy/graphite (`#111318`, `#1b202b`), orange/coral primary actions (`#ff936b` with contrast-safe text), clear blue secondary/highlight (`#75bde8`), readable muted text.
- Keep existing accent options and user-configured accent preference. Light/dark provide defaults; explicit user accent overrides remain optional and never corrupt positive/negative semantics. Density `comfy | default | dense`, nav `top-tabs | sidebar` and user preferences continue syncing.
- **Market/technical semantics invariant:** green/red for positive/negative; King gold, Gate blue dotted, Flip violet dashed, separate spot/reference. Do not reuse accent colors to convey bullish/bearish or turn amber/orange into implied risk.
- Theme switch in header and Settings operates on the same state; full app applies instantly with persistent source-of-truth and visible error on failed sync. Verify Clear and Dawn visual contrast and table/chart labels.

### C. Six required UX changes

1. **Unified intelligence navigation**, preserving `/insights`, `/insights-lovable`, `/ai-insights-lovable` and their distinct data/stores. Modes Evidence / Research / Decision provide contextual deep-link navigation; no lost chat, report, history, watchlist, runs or AI orchestration.
2. **Continuous research context** across Dashboard → Charts/Options → Playbook/Signals → Journal: carry ticker, selected date, timeframe, live/replay cutoff and selection safely via existing state/query params; reset old account/ticker results when context changes.
3. **Dashboard prioritized reading order**: status/bias → top qualified setup + risk → main chart → signals/catalysts → sectors/news/AI; retain all current data and conditional widgets, including source/qualification caveats.
4. **Provenance as product feature**: real source, as-of, session, stale/delayed/entitlement/unknown state shown by actual backend metadata; raw score vs historical rate vs AI self-reported confidence distinctly labeled.
5. **Admin architecture**: sections Platform Operations and Model Operations under `/admin` with full legacy functionality, role restrictions and mutation behavior; built-in liveness/freshness not misrepresented as endpoint p95. Proposed Cloud Monitoring adapter remains visibly unavailable until built by a separate backend task.
6. **Phased production adoption** with first Dashboard/Live/Options pilot and parity gates, then all other pages; feature flag or safe rollback of layout only, preserving original data. No blanket switch until each group passes source/contract and user QA.

### D. Implementation and gate sequencing

This is a cross-route program. Product-delivery's `FEAT-UI-001` owns the shared theme/shell/route mapping; individual implementation plans/PRs should be broken into bounded groups (market, workflows, intelligence, public/auth, admin/settings) using the appropriate existing FEAT IDs and their **approved specs**. The page replacements must land on the *actual* `/`, `/dashboard`, etc. locations, **not** merely `/redesign-*`. Keep the Design Lab as independent design-review surface. Do not stack PRs, auto-merge or publish.

For any visual component sourced from the remix: migrate **its presentation and interaction design only**; bind to existing production hooks and query/mutation functions. Never ship demo fixtures, local synthetic calculator/signal implementations, hardcoded vendor success, fake confidence or fake GCP health.

### E. Tests / source completeness matrix

- Lock baseline query/mutation inventory by route before code; compare to post-change API coverage. Count orphaned source consumers, lost fields/actions, unmatched states, and newly introduced browser vendor requests. All must be **zero** unless an omission is individually approved.
- Hermetic unit + Playwright tests for light/dark theme persistence (including settings write/read and error), auth routing, data states, mobile widths (360/390/768), accessible focus, GCP contract fixtures, live/replay point-in-time parity, ticker/account switch stale-result protection, user owner-scoped journal, admins denied without role, endpoint/provider failures. No loss of any existing test expectations.
- Explicitly exercise top setup and options data on real typed fixtures; snapshots are not a flow tape. Preserve frontend PR #289 earnings history feature and its versioned backend dependency without treating either unmerged PR as deployed.
- Run the existing `npm run build`, `npm run lint`, `npm test`, route/browser specs, `npm run contract:check`, docs audit and spec gate; do not infer production correctness from Design Lab's synthetic-only 184 passing tests.
- For owner signoff provide side-by-side original vs rebuilt screenshots, per-route API/render matrix, integration test receipts, regression summaries and rollback instructions.

## Risks

1. **Lost data or workflows during UI replacement** — mitigated by 1:1 query/mutation destination mapping and no orphan criterion.
2. **Synthetic preview shipped to real users** — blocked by test asserting no `src/components/design-lab` or demo fixture import in live route tree and actual backend hook usage.
3. **Auth/research data leakage across sessions** — preserve ConfigGate/AuthGate, query cache identity, ticker selection invalidation, journal authorization and failure states.
4. **Theme persistence conflict** — retain existing `usePreferencesSync` as source of truth; test overrides, server hydration and write failures.
5. **API contract drift & unsupported provider fields** — existing GCP/stocks OpenAPI only; no new browser Alpha Vantage or invented Cloud Monitoring.
6. **Huge PR and unsafe cutover** — bounded FEAT-specific specs/PRs and owner-authorized releases. New screen appearance never implies deployment until observed in the actual domain.
