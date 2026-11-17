---
feat_id: FEAT-OPTION-001
spec: docs/superpowers/specs/2026-11-17-feat-option-001-null-safe-profiles.md
branch: fix/feat-option-001-null-safe-profiles
pr: 351
status: ready
---

# Null-safe Profiles tab for one-sided options chains implementation plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans.
> Every task cites a spec section and the done_when item it advances.

This branch is opened from the spec commit, so the approved spec is in its merge base once the spec PR merges. The
gate reads the spec from the merge base, so the branch is pushed only after the spec PR is on main.

## Task 1: producer fixture for one-sided chains
Spec: § Design, "Tests" (the one-sided producer fixture). Advances done_when[0] and done_when[1].
- [x] Run the stocks PR 1916 head (`383eda8d13bc2b38a98014e64a3264af27b8f6cc`) chain, levels, grid and greeks routers
      in-process on the six-contract synthetic chain filtered to calls and to puts, Cloud SQL replaced by the frame
- [x] Write `tests/fixtures/one-sided-gamma-producer-contract.json` with `kind`, `backend_pin`, `source_sha256` and
      the four responses per side

## Task 2: widen the hand-written types
Spec: § Design, "Types". Advances done_when[3].
- [x] `src/hooks/useOptionsGreeks.ts`: nullable `total_gex`, `total_vex`, `put_call_ratio`; optional `reason`;
      `EMPTY_GREEKS.metrics` null, not zero
- [x] `src/hooks/useGammaLevels.ts`: nullable `total_gex`, optional `reason`
- [x] `src/hooks/useGammaGrid.ts`: nullable `total_gex`, `total_vex`
- [x] `src/hooks/useOptionsChain.ts`: optional `chain_state`, `reason`, `metadata.sides_present`
- [x] Run: `npx tsc -b` (expect FAIL at `ProfilesTab.tsx` where a nullable total meets `formatGEX` and `.toFixed`)

## Task 3: presentation helpers, test first
Spec: § Design, "Presentation helpers". Advances done_when[0].
- [x] Write the failing tests named in done_when[0] in `src/components/options/gammaPresentation.test.ts`
- [x] Run: `npx vitest run src/components/options/gammaPresentation.test.ts` (expect FAIL: helpers missing)
- [x] Implement `exposureTotalText`, `exposureDirection`, `putCallRatioText`, `putCallSkew`, `strikePriceText`,
      `asPartialChainReason`, `summaryPartialChain`, `chainUnavailableReason`, `unavailableReasonText` in
      `src/components/options/gammaPresentation.ts`
- [x] Run again (expect PASS)

## Task 4: shared unavailable badge and MetricCard prop
Spec: § Design, "Shared badge". Advances done_when[1].
- [x] Move `UnavailableBadge` from `src/components/dashboard/MovementRead.tsx` to `src/components/primitives/index.tsx`
      unchanged; MovementRead imports it
- [x] `MetricCardData.unavailableReason` in `src/types/index.ts`; `src/components/shared/MetricCard.tsx` shows the
      badge when it is set

## Task 5: ProfilesTab renders unavailable values
Spec: § Design, "ProfilesTab". Advances done_when[1] and done_when[2].
- [x] Metrics bar through the helpers, badge and no direction or skew label for a missing value
- [x] Gamma Flip and Gamma Balance: em-dash and badge once levels answered or failed
- [x] Chain completeness notice; VEX-mode note honest about a missing total
- [x] Run: `npx tsc -b` (expect PASS)

## Task 6: Gamma Map legend and heatmap reason
Spec: § Design, "SwingMode (Gamma Map)". Advances done_when[1].
- [x] Heatmap unavailable text through `unavailableReasonText`
- [x] Legend Flip, Gamma Balance, Total GEX, Total VEX: badge beside the em-dash when null, with the source's reason

## Task 7: hermetic browser proof
Spec: § Design, "Tests" (Playwright). Advances done_when[1].
- [x] Write `tests/options/one-sided-chain.spec.ts` with the one-sided payloads registered by `page.route`, a page
      error listener, and the screenshots named in done_when[1]
- [x] Run it against main (expect FAIL on the `put_call_ratio.toFixed` TypeError; keep its screenshots as the before
      state)
- [x] Run: `npm run e2e -- tests/options/one-sided-chain.spec.ts --trace off` on this branch (expect PASS)

## Task 8: existing options specs
Spec: § Design, "Tests" (profiles-balance-flip). Advances done_when[2].
- [x] `tests/options/profiles-balance-flip.spec.ts`: the two `--` expectations become the em-dash
- [x] Run: `npm run e2e -- tests/options --trace off` (expect PASS)
- [x] Commit: `fix(options): render one-sided chain values as unavailable`

## Task 9: build, lint, unit
Spec: § Design (whole). Advances done_when[3] and done_when[4].
- [x] `npm run build`, `npm run lint`, `npm test`

## Task 10: close
Spec: § Approval and scope; done_when[5] and done_when[6].
- [x] Update the FEAT-OPTION-001 catalog row (Status, Last reviewed); its PRs column takes the PR number once the PR
      is opened
- [ ] Docs audit reports nothing new over origin/main (`node scripts/docs-audit.mjs`)
- [ ] `python3 scripts/gate/spec_gate.py --pr origin/main`

## Evidence (local, 2026-11-17, fix head `cefaed2`)

- Fixture source: stocks `383eda8d13bc2b38a98014e64a3264af27b8f6cc` (PR 1916 head), its options and grid routers run
  in-process (FastAPI TestClient) with Cloud SQL replaced by the six-contract frame of stocks'
  `tests/api/test_options_router.py::_chain_frame`, dated 2026-10-27 and filtered to one side; observation clock
  2026-10-28T14:00Z. Source hashes are in the fixture. The candidate `platform/api/openapi.json` (blob `66471ee7`,
  SHA-256 `cdd43945397c63e863ccd04e5f428d748fb9a27bad973d66ab0ecc89962694e9`) validates all 8 fixture responses
  (ajv 2020); the vendored main schema rejects 6 of 8 on the null totals, which is why the fixture is test-only and
  no mock-mode payload changes.
- Candidate types: `openapi-typescript` on the candidate schema, checked with the `src/types/assignability.ts` pairs:
  `GammaGridCell`, `GammaLevelsResponse`, `GreeksResponse`, `GammaGridResponse` and `OptionsChainResponse` are
  assignable to this branch's hand types; on main `30a46ab` three of the five are not.
- Vitest: the 8 new tests in `gammaPresentation.test.ts` failed before the helpers existed; 35 of 35 pass in the file;
  `npm test` 88 files, 1858 tests passed (main 1850).
- Playwright: `tests/options/one-sided-chain.spec.ts` on main `30a46ab` fails 4 of 4 (Profiles: `TypeError: Cannot
  read properties of null (reading 'toFixed')` and the route error page; Gamma Map: `Data unavailable: puts_missing`
  and no badge on Total VEX); on this branch 4 of 4 pass. `tests/options` with
  `tests/dashboard/movement-read.spec.ts`: 58 passed (warmup included); `tests/options` on main: 48 passed. Runs used a
  local, uncommitted wrapper of `playwright.config.ts` that only sets `executablePath` to the sandbox's Chromium,
  because the installed `@playwright/test` 1.62.1 expects browser revision 1234 and the sandbox carries 1243.
- `npx tsc -b`, `npm run build` and `npm run contract:check` pass; `npm run lint` reports the same 86 problems as main
  (file, rule and message identical, line numbers aside).
- Docs audit against main `30a46ab`: no new finding except `changed-since` drift that this change's own edits raise
  under watched paths (README.md, docs/DESIGN_SYSTEM.md, docs/E2E_TEST_PLAN.md, docs/REDESIGN.md,
  docs/options_flow_data_contract.md, and FRONTEND.md's count from 3 to 4 commits). Those documents are reviewed and
  stamped on main by the plan-done docs change after the merge (Phase 5 step 7), as solyra #348 and #349 did.
- Gate: `--commit` ok; `--pr` against the spec branch ok (17 files); `--pr origin/main` refuses until the spec PR
  merges, because the gate reads the approved spec from the merge base.
