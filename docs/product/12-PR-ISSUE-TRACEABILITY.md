# PR and Issue Traceability (solyra)

**Last reviewed:** unknown · **Last scanned:** 2026-09-28 · **Owner:** TBD

Which pull requests changed each capability in this repository, which solyra
issues were filed against it, and where its backend issues live. This is the
solyra companion of the stocks
[12-PR-ISSUE-TRACEABILITY.md](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md),
which stays canonical for backend, audit and remediation issues. The
capabilities are the 22 rows of [02-FEATURE-CATALOG.md](02-FEATURE-CATALOG.md).

Phase 5 of the product-delivery skill adds every new PR here, under its
FEAT-ID, in the same PR (see [Maintenance](#maintenance)).

## Coverage and method

| | Count | Method |
|---|---|---|
| Commits on `main` (first parent) | **89**, from the Lovable template (2026-08-20) to `eca7078` (2026-09-27) | `git log --first-parent origin/main` on a full, unshallowed clone |
| Merged PRs that reached `main` | **45** of 46 merged | PR number from the squash subject `(#N)` or `Merge pull request #N`. [#55](https://github.com/TeneikaAskew/solyra/pull/55) merged into [#54](https://github.com/TeneikaAskew/solyra/pull/54)'s branch (stacked) and reached `main` through [#54](https://github.com/TeneikaAskew/solyra/pull/54) |
| Commits on `main` without a PR | **44**: 43 by Lovable (`gpt-engineer-app[bot]`, `Lovable`), 1 manual merge (`e0cb9d8`) | commit author and subject |
| PRs closed without merging | **4**: [#19](https://github.com/TeneikaAskew/solyra/pull/19), [#35](https://github.com/TeneikaAskew/solyra/pull/35), [#39](https://github.com/TeneikaAskew/solyra/pull/39), [#41](https://github.com/TeneikaAskew/solyra/pull/41) | GitHub API |
| Open PRs | **1**: [#72](https://github.com/TeneikaAskew/solyra/pull/72) | GitHub API |
| Issues | **21**, 2 open ([#12](https://github.com/TeneikaAskew/solyra/issues/12), [#28](https://github.com/TeneikaAskew/solyra/issues/28)) | GitHub API, with each closure confirmed from the issue's own timeline or closing comment |

**Mapped by changed files, not by title.** Each commit's files (diff against its
first parent) are assigned to a capability by path, using the rules below. A PR
is listed under every capability whose code or tests it changed, with the number
of files it changed there. Tooling (workflows, scripts, manifests, build and
test configuration) counts under FEAT-CICD-001. Documentation-only and
contract or mock changes are listed under
[Cross-cutting](#cross-cutting-no-capability-row-in-this-repo) instead. This is stricter than the stocks file, which classifies PRs by title
and merge date.

| Capability | Paths |
|---|---|
| FEAT-AUTH-001 | `src/routes/AuthActionPage`, `src/components/auth/`, `src/lib/{authGate,authedFetch,authAction,firebase,firebaseImpl}`, `src/hooks/{useUser,useConfig}`, auth specs |
| FEAT-WAITLIST-001 | `src/routes/LandingPage`, `src/components/landing/`, `tests/landing/` |
| FEAT-MARKET-001 | `src/routes/DashboardPage*`, `src/components/dashboard/` (Movement Read), `src/hooks/{useMarketData,useMovementStatement}`, `tests/dashboard/` |
| FEAT-LIVE-001 | `src/routes/LiveMarketPage`, `src/hooks/useLive*`, `tests/live-market/` |
| FEAT-CHART-001 | `src/routes/ChartsPage`, `src/components/charts/`, `src/lib/chartTheme`, `tests/charts/` |
| FEAT-OPTION-001 | `src/routes/OptionsFlowPage`, `src/components/options/`, `src/hooks/{useGamma*,useOptions*}`, `src/lib/formatGex`, `tests/options/` |
| FEAT-SIGNAL-001 | `src/routes/SignalsPage`, `tests/signals/` |
| FEAT-PLAYBOOK-001 | `src/routes/PlaybookPage`, `src/components/playbook/`, `src/hooks/usePlaybookEvaluation`, `src/lib/playbookEvaluator`, `tests/playbook/` |
| FEAT-STRAT-001, FEAT-IND-001 | no files of their own: STRAT levels and indicators render inside `/charts` and `/live`, so their changes count under FEAT-CHART-001 and FEAT-LIVE-001. `src/lib/indicators` and `src/hooks/useLiveIndicators` count under FEAT-IND-001 |
| FEAT-INSIGHT-001 | `src/routes/InsightsPage`, `src/components/insights/`, `src/hooks/{useInsights,useSimilarSetups}`, `tests/insights/` |
| FEAT-CATALYST-001 | `src/routes/CatalystsPage`, `tests/catalysts/` |
| FEAT-REPORT-001 | `src/routes/ReportsPage*`, `src/lib/reports`, `tests/reports/` |
| FEAT-REPLAY-001 | `src/components/backtest/`, `src/hooks/useReplaySession`, replay specs |
| FEAT-MODEL-001 | `src/components/structure_brief/` (the admin Model State Snapshot and on-demand Predict, backed by `gcp/research/` in stocks) |
| FEAT-JOURNAL-001 | `src/routes/JournalPage*`, `src/components/journal/`, journal hooks, `src/lib/{journalStats,risk,reviewQuote}`, `tests/journal/` |
| FEAT-ADMIN-001 | `src/routes/AdminPage`, `src/components/admin/`, `src/hooks/useAdmin`, `tests/admin/` |
| FEAT-HELP-001 | `src/routes/HelpPage`, `tests/help/` |
| FEAT-SETTINGS-001 | `src/routes/SettingsPage`, `src/stores/{settingsStore,themeStore}`, `src/hooks/{usePreferences,useProfile}`, `tests/settings/` |
| FEAT-OPS-001 | the data-pipeline widget guard specs |
| FEAT-CICD-001 | `.github/`, `scripts/`, `package.json`, `package-lock.json`, `vite.config.ts`, `playwright.config.ts`, `tsconfig.json`, `eslint.config.js`, `.gitignore`, and, in history, the Lovable template's components.json and the pre-layout dev spec |
| FEAT-UI-001 | `src/App`, `src/main`, `src/index.css`, `src/components/{layout,primitives,shared}/`, shared stores and hooks, `src/lib/{format,dates,time,marketSession,apiError,queryData,apiTargets,runtimeConfig}`, `index.html`, `public/`, `tests/shared/`, the original Lovable template files |

Test specs from before the per-page layout ([#40](https://github.com/TeneikaAskew/solyra/pull/40)) sat at `tests/<page>.spec.ts`;
they are mapped by page name.

**Limits.** A path is a proxy for a capability: a change to a shared primitive
counts under FEAT-UI-001 even when it was made for one page. The broad PRs
([#1](https://github.com/TeneikaAskew/solyra/pull/1) import, [#4](https://github.com/TeneikaAskew/solyra/pull/4) frontend split, [#21](https://github.com/TeneikaAskew/solyra/pull/21), [#40](https://github.com/TeneikaAskew/solyra/pull/40), [#46](https://github.com/TeneikaAskew/solyra/pull/46), [#64](https://github.com/TeneikaAskew/solyra/pull/64))
touched many areas and appear in many sections; the "Files here" column shows
how much of each one landed in that capability.

## Commits without a PR

44 of the 89 commits on `main` did not come through a pull request.

- **43 Lovable commits** (2026-08-20 to 2026-09-06). Lovable pushes to its
  connected branch, `main`, directly. None of these was reviewed in a PR. CI
  also runs on pushes to `main`, but only after the push has landed; the spec
  gate runs in the pre-commit hook and on pull requests, so it never evaluates
  them, and a required status check would not block them either, because it
  applies to pull requests. The [Lovable commit index](../LOVABLE_COMMITS_REVIEW.md)
  lists them for review. Every change since 2026-09-06 has come through a PR.
- **1 manual merge**, `e0cb9d8` (2026-09-01), which brought the
  `feature/frontend-only` branch to `main` after [#4](https://github.com/TeneikaAskew/solyra/pull/4). Fixes for [#8](https://github.com/TeneikaAskew/solyra/issues/8),
  [#10](https://github.com/TeneikaAskew/solyra/issues/10) and part of [#9](https://github.com/TeneikaAskew/solyra/issues/9) reached `main` this way.

Each capability section lists its direct commits.

## Capabilities

"Type" is the conventional-commit type of the PR title; the first three PRs are
the repository's origin. "Files here" counts the files that PR changed in the
capability. Every listed PR is merged; the date is its merge date.

### FEAT-AUTH-001 · Authentication

Backend and audit issues: 7 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-auth-001--auth--security-7-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 9 | feat: import trading platform frontend and Python backend |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 3 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 2 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#34](https://github.com/TeneikaAskew/solyra/pull/34) merged 2026-09-03 | chore | 5 | chore(admin): remove the shared admin-token gate in favor of roles |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#44](https://github.com/TeneikaAskew/solyra/pull/44) merged 2026-09-05 | chore | 1 | chore: point Solyra at the renamed Solyra API services |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 2 | feat: mock-data dev mode with backend-verified fixtures |
| [#53](https://github.com/TeneikaAskew/solyra/pull/53) merged 2026-09-07 | test | 2 | test(e2e): answer the dashboard fan-out with typed fixtures; fix route glob depth |
| [#51](https://github.com/TeneikaAskew/solyra/pull/51) merged 2026-09-14 | feat | 10 | feat(auth): forgot-password flow, email verification, /auth/action page |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 5 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#68](https://github.com/TeneikaAskew/solyra/pull/68) merged 2026-09-16 | fix | 2 | fix(auth): apply the shell accent on /auth/action, and resync the API contract |

Direct commits to `main` without a PR (5): `e0cb9d8` merge: feature/frontend-only into main - test-coverage audit, E2E fixes, lazy Firebase, single-worker E2E (manual merge) · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state · `593004e` Fixed session expiry retry · `558ed84` Fixed duplicate email display

### FEAT-WAITLIST-001 · Landing / waitlist

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 15 | feat: import trading platform frontend and Python backend |
| [#24](https://github.com/TeneikaAskew/solyra/pull/24) merged 2026-09-02 | docs | 1 | docs: bring the design system over from stocks; resolve cross-repo doc links |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 1 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |

Direct commits to `main` without a PR (4): `7079b9a` Fixed mobile nav spacing · `83ae883` Restored sign-in and waitlist · `cde84c4` Removed em dashes and AI idioms · `03ddb06` Fixed footer layout wrapping

### FEAT-MARKET-001 · Market dashboard

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 15 | feat: import trading platform frontend and Python backend |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 6 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 2 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#24](https://github.com/TeneikaAskew/solyra/pull/24) merged 2026-09-02 | docs | 1 | docs: bring the design system over from stocks; resolve cross-repo doc links |
| [#31](https://github.com/TeneikaAskew/solyra/pull/31) merged 2026-09-03 | fix | 1 | fix: stop fabricating spot/King/flip levels and null-blind stat tones |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 5 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 1 | feat: mock-data dev mode with backend-verified fixtures |
| [#48](https://github.com/TeneikaAskew/solyra/pull/48) merged 2026-09-06 | fix | 1 | fix: address the 8 Codex P2 findings on the mock-data mode |
| [#50](https://github.com/TeneikaAskew/solyra/pull/50) merged 2026-09-06 | feat | 1 | feat(mocks): serve the real 12-card IWM playbook in mock mode |
| [#49](https://github.com/TeneikaAskew/solyra/pull/49) merged 2026-09-06 | feat | 3 | feat(playbook): show card-set age and surface the stale-cards refusal (stocks #861) |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 2 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#53](https://github.com/TeneikaAskew/solyra/pull/53) merged 2026-09-07 | test | 4 | test(e2e): answer the dashboard fan-out with typed fixtures; fix route glob depth |
| [#61](https://github.com/TeneikaAskew/solyra/pull/61) merged 2026-09-07 | feat | 1 | feat(movement): carry slot and analysis_date on ladder reach-rates; resync the OpenAPI snapshot |
| [#62](https://github.com/TeneikaAskew/solyra/pull/62) merged 2026-09-07 | test | 1 | test(dashboard): screenshot the low-sample rung and the withheld-field states of Movement Read |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 1 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 2 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (5): `1fb7f03` Fixed mobile card header wrap · `6383ca7` Fixed Catalysts title wrapping · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state · `3fd05f3` Added retry for API errors

### FEAT-LIVE-001 · Intraday monitoring

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 6 | feat: import trading platform frontend and Python backend |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 2 | merge: graft platform's 167-commit history |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 1 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#31](https://github.com/TeneikaAskew/solyra/pull/31) merged 2026-09-03 | fix | 1 | fix: stop fabricating spot/King/flip levels and null-blind stat tones |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 1 | feat: mock-data dev mode with backend-verified fixtures |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 2 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 2 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (2): `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state

### FEAT-CHART-001 · Charting

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 11 | feat: import trading platform frontend and Python backend |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 2 | merge: graft platform's 167-commit history |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 2 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#24](https://github.com/TeneikaAskew/solyra/pull/24) merged 2026-09-02 | docs | 1 | docs: bring the design system over from stocks; resolve cross-repo doc links |
| [#31](https://github.com/TeneikaAskew/solyra/pull/31) merged 2026-09-03 | fix | 2 | fix: stop fabricating spot/King/flip levels and null-blind stat tones |
| [#33](https://github.com/TeneikaAskew/solyra/pull/33) merged 2026-09-03 | fix | 1 | fix: close the Codex follow-ups from the review-fix merge |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 2 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 1 | feat: mock-data dev mode with backend-verified fixtures |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 1 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#53](https://github.com/TeneikaAskew/solyra/pull/53) merged 2026-09-07 | test | 2 | test(e2e): answer the dashboard fan-out with typed fixtures; fix route glob depth |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 3 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |

Direct commits to `main` without a PR (10): `1a91c9a` Changes · `d37ca1f` Changes · `55d9560` Changes · `881b457` Changes · `e7c952c` Changes · `6930cc1` Fixed options overflow wrap · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state · `0c4000f` Added sign-in CTA banner · `3fd05f3` Added retry for API errors

### FEAT-OPTION-001 · Options / gamma

Backend and audit issues: 10 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-option-001--options--gamma-10-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 17 | feat: import trading platform frontend and Python backend |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 3 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 2 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#31](https://github.com/TeneikaAskew/solyra/pull/31) merged 2026-09-03 | fix | 4 | fix: stop fabricating spot/King/flip levels and null-blind stat tones |
| [#33](https://github.com/TeneikaAskew/solyra/pull/33) merged 2026-09-03 | fix | 1 | fix: close the Codex follow-ups from the review-fix merge |
| [#34](https://github.com/TeneikaAskew/solyra/pull/34) merged 2026-09-03 | chore | 1 | chore(admin): remove the shared admin-token gate in favor of roles |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 3 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 4 | feat: mock-data dev mode with backend-verified fixtures |
| [#45](https://github.com/TeneikaAskew/solyra/pull/45) merged 2026-09-07 | perf | 7 | perf(options): stop fetching 1000 snapshot dates to render one |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 2 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 15 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 6 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (6): `e0cb9d8` merge: feature/frontend-only into main - test-coverage audit, E2E fixes, lazy Firebase, single-worker E2E (manual merge) · `6930cc1` Fixed options overflow wrap · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state · `0c4000f` Added sign-in CTA banner · `3fd05f3` Added retry for API errors

### FEAT-SIGNAL-001 · Signals / execution

Backend and audit issues: 12 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-signal-001--signals--execution-12-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 2 | feat: import trading platform frontend and Python backend |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 3 | merge: graft platform's 167-commit history |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 1 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#31](https://github.com/TeneikaAskew/solyra/pull/31) merged 2026-09-03 | fix | 2 | fix: stop fabricating spot/King/flip levels and null-blind stat tones |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 1 | feat: mock-data dev mode with backend-verified fixtures |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 1 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 1 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |

Direct commits to `main` without a PR (2): `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state

### FEAT-PLAYBOOK-001 · Premarket / playbook

Backend and audit issues: 1 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-playbook-001--premarket--playbook-1-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 6 | feat: import trading platform frontend and Python backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 1 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#50](https://github.com/TeneikaAskew/solyra/pull/50) merged 2026-09-06 | feat | 1 | feat(mocks): serve the real 12-card IWM playbook in mock mode |
| [#49](https://github.com/TeneikaAskew/solyra/pull/49) merged 2026-09-06 | feat | 4 | feat(playbook): show card-set age and surface the stale-cards refusal (stocks #861) |
| [#53](https://github.com/TeneikaAskew/solyra/pull/53) merged 2026-09-07 | test | 1 | test(e2e): answer the dashboard fan-out with typed fixtures; fix route glob depth |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 2 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 2 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (2): `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state

### FEAT-STRAT-001 · STRAT / levels

Backend and audit issues: 4 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-strat-001--levels--strat-4-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

No merged PR changed this capability's code or tests.

### FEAT-IND-001 · Indicators

Backend and audit issues: 4 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-ind-001--indicators-4-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 1 | feat: import trading platform frontend and Python backend |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 1 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |

### FEAT-INSIGHT-001 · AI insights

Backend and audit issues: 4 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-insight-001--ai-insights-4-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 7 | feat: import trading platform frontend and Python backend |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 2 | merge: graft platform's 167-commit history |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 1 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 2 | feat: mock-data dev mode with backend-verified fixtures |
| [#48](https://github.com/TeneikaAskew/solyra/pull/48) merged 2026-09-06 | fix | 3 | fix: address the 8 Codex P2 findings on the mock-data mode |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 3 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 2 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 3 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (3): `a02ef44` Fixed Insights mobile layout · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state

### FEAT-CATALYST-001 · Earnings / catalysts

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 2 | feat: import trading platform frontend and Python backend |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 3 | merge: graft platform's 167-commit history |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 1 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 1 | feat: mock-data dev mode with backend-verified fixtures |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 1 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 1 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |

Direct commits to `main` without a PR (5): `3a3fb5e` Unified date pickers to range · `774e913` Fixed cutoff titles via expand · `ac3efae` Fixed mobile header overlap · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state

### FEAT-REPORT-001 · Reports / analytics

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 3 | feat: import trading platform frontend and Python backend |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 3 | merge: graft platform's 167-commit history |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 1 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#34](https://github.com/TeneikaAskew/solyra/pull/34) merged 2026-09-03 | chore | 1 | chore(admin): remove the shared admin-token gate in favor of roles |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 2 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 1 | feat: mock-data dev mode with backend-verified fixtures |

Direct commits to `main` without a PR (4): `e0cb9d8` merge: feature/frontend-only into main - test-coverage audit, E2E fixes, lazy Firebase, single-worker E2E (manual merge) · `9b5e00f` Rebuilt report layout design · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state

### FEAT-REPLAY-001 · Replay / backtest engine

Backend and audit issues: 17 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-replay-001--replay--backtest--evaluation-17-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 5 | feat: import trading platform frontend and Python backend |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 1 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 1 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (1): `cde84c4` Removed em dashes and AI idioms

### FEAT-MODEL-001 · Models / research

Backend and audit issues: 11 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-model-001--models--research-11-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 4 | feat: import trading platform frontend and Python backend |
| [#24](https://github.com/TeneikaAskew/solyra/pull/24) merged 2026-09-02 | docs | 1 | docs: bring the design system over from stocks; resolve cross-repo doc links |
| [#34](https://github.com/TeneikaAskew/solyra/pull/34) merged 2026-09-03 | chore | 1 | chore(admin): remove the shared admin-token gate in favor of roles |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 2 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |

### FEAT-JOURNAL-001 · Journal / portfolio

Backend and audit issues: 2 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-journal-001--journal--portfolio-2-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 21 | feat: import trading platform frontend and Python backend |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 4 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 7 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#24](https://github.com/TeneikaAskew/solyra/pull/24) merged 2026-09-02 | docs | 1 | docs: bring the design system over from stocks; resolve cross-repo doc links |
| [#31](https://github.com/TeneikaAskew/solyra/pull/31) merged 2026-09-03 | fix | 4 | fix: stop fabricating spot/King/flip levels and null-blind stat tones |
| [#33](https://github.com/TeneikaAskew/solyra/pull/33) merged 2026-09-03 | fix | 1 | fix: close the Codex follow-ups from the review-fix merge |
| [#34](https://github.com/TeneikaAskew/solyra/pull/34) merged 2026-09-03 | chore | 1 | chore(admin): remove the shared admin-token gate in favor of roles |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 3 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 1 | feat: mock-data dev mode with backend-verified fixtures |
| [#48](https://github.com/TeneikaAskew/solyra/pull/48) merged 2026-09-06 | fix | 2 | fix: address the 8 Codex P2 findings on the mock-data mode |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 4 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 5 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (3): `e0cb9d8` merge: feature/frontend-only into main - test-coverage audit, E2E fixes, lazy Firebase, single-worker E2E (manual merge) · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state

### FEAT-ADMIN-001 · Administration

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 4 | feat: import trading platform frontend and Python backend |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 2 | merge: graft platform's 167-commit history |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 1 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#34](https://github.com/TeneikaAskew/solyra/pull/34) merged 2026-09-03 | chore | 5 | chore(admin): remove the shared admin-token gate in favor of roles |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 4 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 2 | feat: mock-data dev mode with backend-verified fixtures |
| [#53](https://github.com/TeneikaAskew/solyra/pull/53) merged 2026-09-07 | test | 1 | test(e2e): answer the dashboard fan-out with typed fixtures; fix route glob depth |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 3 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 1 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (1): `265f246` Added admin data management

### FEAT-HELP-001 · Help / glossary

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 2 | feat: import trading platform frontend and Python backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 1 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#24](https://github.com/TeneikaAskew/solyra/pull/24) merged 2026-09-02 | docs | 1 | docs: bring the design system over from stocks; resolve cross-repo doc links |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 1 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#53](https://github.com/TeneikaAskew/solyra/pull/53) merged 2026-09-07 | test | 1 | test(e2e): answer the dashboard fan-out with typed fixtures; fix route glob depth |

Direct commits to `main` without a PR (1): `cde84c4` Removed em dashes and AI idioms

### FEAT-SETTINGS-001 · Settings

Backend and audit issues: 0 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 3 | feat: import trading platform frontend and Python backend |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 2 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 2 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#67](https://github.com/TeneikaAskew/solyra/pull/67) merged 2026-09-15 | feat | 4 | feat(brand): default the shell accent to the landing dawn orange |

Direct commits to `main` without a PR (4): `ad91837` Fixed theme class removal bug · `7bf823d` Persisted settings via mock API · `313bd30` Reorganized Settings into tabs · `cde84c4` Removed em dashes and AI idioms

### FEAT-OPS-001 · Operations / reliability

Backend and audit issues: 9 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-ops-001--operations--reliability-9-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 1 | feat: import trading platform frontend and Python backend |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 1 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#29](https://github.com/TeneikaAskew/solyra/pull/29) merged 2026-09-02 | test | 1 | test: port the data-pipeline widget guard from stocks |

### FEAT-CICD-001 · CI / testing

Backend and audit issues: 9 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-cicd-001--ci--testing-9-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 112 | feat: import trading platform frontend and Python backend |
| [#2](https://github.com/TeneikaAskew/solyra/pull/2) merged 2026-08-31 | chore | 1 | chore: commit package-lock.json |
| [#3](https://github.com/TeneikaAskew/solyra/pull/3) merged 2026-08-31 | origin (history graft) | 4 | merge: graft platform's 167-commit history |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 102 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 4 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#25](https://github.com/TeneikaAskew/solyra/pull/25) merged 2026-09-02 | ci | 2 | ci: run types, unit tests, build, and E2E on pull requests |
| [#23](https://github.com/TeneikaAskew/solyra/pull/23) merged 2026-09-02 | chore | 1 | chore: add CLAUDE.md and the frontend agent config |
| [#38](https://github.com/TeneikaAskew/solyra/pull/38) merged 2026-09-03 | mixed | 2 | Add PR template, GitHub REST bridge workflow, and webhook-staleness hook |
| [#44](https://github.com/TeneikaAskew/solyra/pull/44) merged 2026-09-05 | chore | 2 | chore: point Solyra at the renamed Solyra API services |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 4 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#59](https://github.com/TeneikaAskew/solyra/pull/59) merged 2026-09-07 | feat | 7 | feat: /resolve-issue command and issue forms that require evidence from the running app |
| [#63](https://github.com/TeneikaAskew/solyra/pull/63) merged 2026-09-08 | fix | 2 | fix: whole-file review findings on /resolve-issue and the issue forms |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 3 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#69](https://github.com/TeneikaAskew/solyra/pull/69) merged 2026-09-25 | docs | 4 | docs: audit documentation against the repo, its issues and its PRs |
| [#71](https://github.com/TeneikaAskew/solyra/pull/71) merged 2026-09-27 | chore | 3 | chore(claude): vendor Superpowers skills and propose weekly updates |

Direct commits to `main` without a PR (5): `0f401e5` template: tanstack_start_ts_current-b3e81c491308 · `e41ea25` Rebuilt configuration page · `f27ac3a` Added build:dev script · `417da99` Added dev Firebase config · `e0cb9d8` merge: feature/frontend-only into main - test-coverage audit, E2E fixes, lazy Firebase, single-worker E2E (manual merge)

### FEAT-UI-001 · Web / UI shell

Backend and audit issues: 2 open in [stocks 12](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/12-PR-ISSUE-TRACEABILITY.md#feat-ui-001--web--ui-2-open) (its 2026-08-31 snapshot). Solyra issues: see [Issues](#issues).

| PR | Type | Files here | Title |
|---|---|---|---|
| [#1](https://github.com/TeneikaAskew/solyra/pull/1) merged 2026-08-31 | origin (import) | 105 | feat: import trading platform frontend and Python backend |
| [#4](https://github.com/TeneikaAskew/solyra/pull/4) merged 2026-09-01 | origin (frontend split) | 4 | feat: frontend-only repo, proxy /api to the deployed backend |
| [#21](https://github.com/TeneikaAskew/solyra/pull/21) merged 2026-09-02 | mixed | 5 | Work through all open issues: security posture, E2E hygiene, dead code, journal decisions |
| [#33](https://github.com/TeneikaAskew/solyra/pull/33) merged 2026-09-03 | fix | 2 | fix: close the Codex follow-ups from the review-fix merge |
| [#34](https://github.com/TeneikaAskew/solyra/pull/34) merged 2026-09-03 | chore | 2 | chore(admin): remove the shared admin-token gate in favor of roles |
| [#40](https://github.com/TeneikaAskew/solyra/pull/40) merged 2026-09-03 | test | 4 | test: per-page spec layout, full coverage audit, and the gaps it closed |
| [#43](https://github.com/TeneikaAskew/solyra/pull/43) merged 2026-09-03 | feat | 3 | feat: move mobile auth status into the nav menu with a sign-out action |
| [#44](https://github.com/TeneikaAskew/solyra/pull/44) merged 2026-09-05 | chore | 2 | chore: point Solyra at the renamed Solyra API services |
| [#46](https://github.com/TeneikaAskew/solyra/pull/46) merged 2026-09-06 | feat | 3 | feat: mock-data dev mode with backend-verified fixtures |
| [#47](https://github.com/TeneikaAskew/solyra/pull/47) merged 2026-09-06 | chore | 1 | chore: move mock-mode spec into tests/shared, document layout rule |
| [#49](https://github.com/TeneikaAskew/solyra/pull/49) merged 2026-09-06 | feat | 6 | feat(playbook): show card-set age and surface the stale-cards refusal (stocks #861) |
| [#45](https://github.com/TeneikaAskew/solyra/pull/45) merged 2026-09-07 | perf | 3 | perf(options): stop fetching 1000 snapshot dates to render one |
| [#54](https://github.com/TeneikaAskew/solyra/pull/54) merged 2026-09-07 | test | 1 | test(contract): tie solyra's types, mocks and requests to the stocks OpenAPI contract |
| [#53](https://github.com/TeneikaAskew/solyra/pull/53) merged 2026-09-07 | test | 2 | test(e2e): answer the dashboard fan-out with typed fixtures; fix route glob depth |
| [#59](https://github.com/TeneikaAskew/solyra/pull/59) merged 2026-09-07 | feat | 1 | feat: /resolve-issue command and issue forms that require evidence from the running app |
| [#63](https://github.com/TeneikaAskew/solyra/pull/63) merged 2026-09-08 | fix | 1 | fix: whole-file review findings on /resolve-issue and the issue forms |
| [#51](https://github.com/TeneikaAskew/solyra/pull/51) merged 2026-09-14 | feat | 3 | feat(auth): forgot-password flow, email verification, /auth/action page |
| [#64](https://github.com/TeneikaAskew/solyra/pull/64) merged 2026-09-14 | feat | 12 | feat: re-verification pass - contract widening check, mock-mode completion, public tab names, lazy landing boot |
| [#65](https://github.com/TeneikaAskew/solyra/pull/65) merged 2026-09-15 | chore | 3 | chore(brand): rename the wordmark and page title to Solyra |
| [#67](https://github.com/TeneikaAskew/solyra/pull/67) merged 2026-09-15 | feat | 1 | feat(brand): default the shell accent to the landing dawn orange |
| [#66](https://github.com/TeneikaAskew/solyra/pull/66) merged 2026-09-17 | fix | 3 | fix: address the five Codex verification findings from #64 |

Direct commits to `main` without a PR (22): `0f401e5` template: tanstack_start_ts_current-b3e81c491308 · `e1f56b1` Fixed fonts link · `e2d4596` Redesigned site to Skylit-like · `2148ff6` Handled config fetch fallback · `e0cb9d8` merge: feature/frontend-only into main - test-coverage audit, E2E fixes, lazy Firebase, single-worker E2E (manual merge) · `7bf823d` Persisted settings via mock API · `1fb7f03` Fixed mobile card header wrap · `83b68b0` Changes · `edb87b3` Changes · `6930cc1` Fixed options overflow wrap · `191a2cf` Guarded flat sparklines · `05ac385` Fixed ticker search mobile layout · `3a3fb5e` Unified date pickers to range · `9b5e00f` Rebuilt report layout design · `cde84c4` Removed em dashes and AI idioms · `82aaeed` Added auth gate empty state · `0c4000f` Added sign-in CTA banner · `3fd05f3` Added retry for API errors · `86501e3` Added auth indicator & banner · `fe333c9` Fixed auth-gated widget blanking · `97c3bcc` Fixed reload splash & CORS · `0b2f206` Fixed popover bleed issue

## Cross-cutting (no capability row in this repo)

PRs that changed no capability's code or tests. Deploy has no row here: the
stocks catalog files it under `FEAT-DEPLOY-001`, which this repository's catalog
omits.

| Area | PRs |
|---|---|
| API contract and mocks | [#58](https://github.com/TeneikaAskew/solyra/pull/58) and [#60](https://github.com/TeneikaAskew/solyra/pull/60) OpenAPI snapshot resyncs · [#70](https://github.com/TeneikaAskew/solyra/pull/70) magnitude decision-rule types (contract and mocks only); most contract work also touched pages and is listed under them ([#46](https://github.com/TeneikaAskew/solyra/pull/46), [#48](https://github.com/TeneikaAskew/solyra/pull/48), [#54](https://github.com/TeneikaAskew/solyra/pull/54), [#61](https://github.com/TeneikaAskew/solyra/pull/61), [#64](https://github.com/TeneikaAskew/solyra/pull/64), [#66](https://github.com/TeneikaAskew/solyra/pull/66), [#68](https://github.com/TeneikaAskew/solyra/pull/68)) |
| Documentation | [#20](https://github.com/TeneikaAskew/solyra/pull/20), [#22](https://github.com/TeneikaAskew/solyra/pull/22), [#24](https://github.com/TeneikaAskew/solyra/pull/24) docs and design system from stocks · [#30](https://github.com/TeneikaAskew/solyra/pull/30) cross-repo links · [#37](https://github.com/TeneikaAskew/solyra/pull/37) and [#42](https://github.com/TeneikaAskew/solyra/pull/42) Lovable commit index · [#52](https://github.com/TeneikaAskew/solyra/pull/52) what the mocked E2E job proves · [#69](https://github.com/TeneikaAskew/solyra/pull/69) documentation audit |

## Issues

Every solyra issue, the capability it belongs to, and what resolved it. Only
[#5](https://github.com/TeneikaAskew/solyra/issues/5) carries a GitHub closing link; the others were closed by hand, each with
a comment naming the fix, which is the evidence used here.

| Issue | State | Capability | Resolved by | Title |
|---|---|---|---|---|
| [#5](https://github.com/TeneikaAskew/solyra/issues/5) | closed | FEAT-AUTH-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21), which superseded [#19](https://github.com/TeneikaAskew/solyra/pull/19) | Deployed main fails OPEN on config-fetch failure: ratify or revert the bot's edit |
| [#6](https://github.com/TeneikaAskew/solyra/issues/6) | closed | FEAT-WAITLIST-001 | `e0cb9d8` (manual merge), completed by [#21](https://github.com/TeneikaAskew/solyra/pull/21) | Reconcile diverged branches; push + deploy the lazy-Firebase perf work |
| [#7](https://github.com/TeneikaAskew/solyra/issues/7) | closed | FEAT-CICD-001 | none: moot once stocks became API-only | stocks: frontend Docker build must include tests/ |
| [#8](https://github.com/TeneikaAskew/solyra/issues/8) | closed | FEAT-HELP-001 | commit `a7476c8`, via `e0cb9d8` (no PR) | No nav link to /help exists, but auth-gate.spec asserts one |
| [#9](https://github.com/TeneikaAskew/solyra/issues/9) | closed | FEAT-CICD-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21); `workers: 1` via `e0cb9d8` | E2E: default worker fan-out melts the shared dev server |
| [#10](https://github.com/TeneikaAskew/solyra/issues/10) | closed | FEAT-ADMIN-001 | commits `a7476c8` and `65ab2ed`, via `e0cb9d8` (no PR) | admin-auth: admin email does not see the logout button |
| [#11](https://github.com/TeneikaAskew/solyra/issues/11) | closed | FEAT-UI-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21) | Centralize the staging API URL and the allowed-origin story |
| [#12](https://github.com/TeneikaAskew/solyra/issues/12) | **open** | none in solyra (stocks FEAT-DEPLOY-001) | not resolved; items 2 to 4 are GCP Console actions | GCP billing follow-ups: Detailed export, stalled backfill, account-wide budget |
| [#13](https://github.com/TeneikaAskew/solyra/issues/13) | closed | FEAT-JOURNAL-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21) | Decide: journal stats math |
| [#14](https://github.com/TeneikaAskew/solyra/issues/14) | closed | FEAT-JOURNAL-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21) | Decide: re-home the "My style" panel or delete the orphaned hook |
| [#15](https://github.com/TeneikaAskew/solyra/issues/15) | closed | FEAT-UI-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21) | Delete never-used scaffolding: shared/DataTable.tsx and shared/Tabs.tsx |
| [#16](https://github.com/TeneikaAskew/solyra/issues/16) | closed | FEAT-OPTION-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21) | Delete superseded TermHover.tsx + useGammaGlossary.ts |
| [#17](https://github.com/TeneikaAskew/solyra/issues/17) | closed | FEAT-OPS-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21) | DataPipelineStatus.tsx has zero importers: delete or revive? |
| [#18](https://github.com/TeneikaAskew/solyra/issues/18) | closed | FEAT-MARKET-001 | [#21](https://github.com/TeneikaAskew/solyra/pull/21) | dashboard.spec.ts still inlines card payloads |
| [#26](https://github.com/TeneikaAskew/solyra/issues/26) | closed | FEAT-WAITLIST-001 | [#64](https://github.com/TeneikaAskew/solyra/pull/64) | landing perf: lazy app shell / defer Firebase init |
| [#27](https://github.com/TeneikaAskew/solyra/issues/27) | closed | FEAT-OPTION-001 | [#64](https://github.com/TeneikaAskew/solyra/pull/64) | Rename internal Heatseeker/Flowseeker tabs before public launch |
| [#28](https://github.com/TeneikaAskew/solyra/issues/28) | **open** | FEAT-CICD-001 | CI exists since [#25](https://github.com/TeneikaAskew/solyra/pull/25); left: make both CI jobs required checks (repository settings) | [P2][Testing] Run Vitest and Playwright suites in CI |
| [#32](https://github.com/TeneikaAskew/solyra/issues/32) | closed | FEAT-ADMIN-001 | [#34](https://github.com/TeneikaAskew/solyra/pull/34) (item 1), [#64](https://github.com/TeneikaAskew/solyra/pull/64) (item 3); items 2 and 4 moved to stocks | Full-review follow-ups: admin token off sessionStorage, nullable bar volume, coverage gaps |
| [#36](https://github.com/TeneikaAskew/solyra/issues/36) | closed | FEAT-SETTINGS-001 | [stocks#972](https://github.com/TeneikaAskew/stocks/pull/972); the solyra half, [#39](https://github.com/TeneikaAskew/solyra/pull/39), closed unmerged | Preferences sync calls /api/me/preferences, but the backend had no such endpoint |
| [#56](https://github.com/TeneikaAskew/solyra/issues/56) | closed | cross-cutting | [#64](https://github.com/TeneikaAskew/solyra/pull/64), with [stocks#1101](https://github.com/TeneikaAskew/stocks/pull/1101) | Contract check: cover the schema-to-type widening direction |
| [#57](https://github.com/TeneikaAskew/solyra/issues/57) | closed | cross-cutting | [#64](https://github.com/TeneikaAskew/solyra/pull/64) (11 of 12 routes; `POST /api/waitlist` left unmocked on purpose) | Mock mode: twelve requested operations have no mock route |

## PRs closed without merging

| PR | Title | Outcome |
|---|---|---|
| [#19](https://github.com/TeneikaAskew/solyra/pull/19) | fix: boot fails loud again on a bad runtime config, never open | superseded by [#21](https://github.com/TeneikaAskew/solyra/pull/21) |
| [#35](https://github.com/TeneikaAskew/solyra/pull/35) | test: mock /api/me/preferences in mockCommon | not checked |
| [#39](https://github.com/TeneikaAskew/solyra/pull/39) | fix(auth): attach the ID token to /api/me and gate its sub-paths | the backend half landed as [stocks#972](https://github.com/TeneikaAskew/stocks/pull/972) |
| [#41](https://github.com/TeneikaAskew/solyra/pull/41) | test: fix the 15 E2E failures on main | not checked |

## Findings from this scan

1. **Half of `main` bypassed review.** 44 of 89 commits reached `main` without
   a PR, 43 of them from Lovable. CI tested them only after they landed, the
   spec gate never saw them, and a required status check would not stop them.
   Lovable has not pushed since 2026-09-06.
2. **[#28](https://github.com/TeneikaAskew/solyra/issues/28) is done except for a setting.** CI has run Vitest and the hermetic
   Playwright suite on every PR since [#25](https://github.com/TeneikaAskew/solyra/pull/25); the issue stays open only until
   both jobs are made required checks on `main` (issue comment, 2026-09-14). The
   same comment warns against also requiring a PR before merging, because that
   would block Lovable's direct pushes.
3. **[#12](https://github.com/TeneikaAskew/solyra/issues/12) is not solyra work.** Its remaining items are GCP Console actions
   on the stocks billing account; it belongs in stocks under FEAT-DEPLOY-001.
4. **Two capabilities have no code path of their own.** FEAT-STRAT-001 and most of
   FEAT-IND-001 render inside the charts and live pages, so their history is
   folded into FEAT-CHART-001 and FEAT-LIVE-001 here.
5. **The stocks per-capability issue counts are a 2026-08-31 snapshot**, by that
   file's own note, and may be stale.

## Maintenance

- **Every merged PR:** add one row under its FEAT-ID section (PR, merge date,
  type, files changed there, title), in the same PR (product-delivery Phase 5,
  step 2). A PR that spans capabilities gets a row in each.
- **Every solyra issue opened or closed:** update its row in [Issues](#issues),
  naming the PR that resolved it and where that is recorded.
- **Re-deriving the lineage:** list first-parent commits with
  `git log --first-parent --format='%h %ad %an %s' --date=short origin/main`,
  take each commit's files with `git diff --name-only <commit>^1 <commit>`, and
  apply the path rules above.
