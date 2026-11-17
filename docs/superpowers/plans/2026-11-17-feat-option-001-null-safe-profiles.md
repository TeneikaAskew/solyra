---
feat_id: FEAT-OPTION-001
spec: docs/superpowers/specs/2026-11-17-feat-option-001-null-safe-profiles.md
branch: fix/feat-option-001-null-safe-profiles
pr: null
status: ready
---

# Null-safe Profiles tab for one-sided options chains implementation plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans.
> Every task cites a spec section and the done_when item it advances.

This branch is opened from the spec commit, so the approved spec is in its merge base once the spec PR merges. The
gate reads the spec from the merge base, so the branch is pushed only after the spec PR is on main.

## Task 1: producer fixture for one-sided chains
Spec: § Design, "Tests" (the one-sided producer fixture). Advances done_when[0] and done_when[1].
- [ ] Run the stocks PR 1916 head (`383eda8d13bc2b38a98014e64a3264af27b8f6cc`) chain, levels, grid and greeks routers
      in-process on the six-contract synthetic chain filtered to calls and to puts, Cloud SQL replaced by the frame
- [ ] Write `tests/fixtures/one-sided-gamma-producer-contract.json` with `kind`, `backend_pin`, `source_sha256` and
      the four responses per side

## Task 2: widen the hand-written types
Spec: § Design, "Types". Advances done_when[3].
- [ ] `src/hooks/useOptionsGreeks.ts`: nullable `total_gex`, `total_vex`, `put_call_ratio`; optional `reason`;
      `EMPTY_GREEKS.metrics` null, not zero
- [ ] `src/hooks/useGammaLevels.ts`: nullable `total_gex`, optional `reason`
- [ ] `src/hooks/useGammaGrid.ts`: nullable `total_gex`, `total_vex`
- [ ] `src/hooks/useOptionsChain.ts`: optional `chain_state`, `reason`, `metadata.sides_present`
- [ ] Run: `npx tsc -b` (expect FAIL at `ProfilesTab.tsx` where a nullable total meets `formatGEX` and `.toFixed`)

## Task 3: presentation helpers, test first
Spec: § Design, "Presentation helpers". Advances done_when[0].
- [ ] Write the failing tests named in done_when[0] in `src/components/options/gammaPresentation.test.ts`
- [ ] Run: `npx vitest run src/components/options/gammaPresentation.test.ts` (expect FAIL: helpers missing)
- [ ] Implement `exposureTotalText`, `exposureDirection`, `putCallRatioText`, `putCallSkew`, `strikePriceText`,
      `asPartialChainReason`, `summaryPartialChain`, `chainUnavailableReason`, `unavailableReasonText` in
      `src/components/options/gammaPresentation.ts`
- [ ] Run again (expect PASS)

## Task 4: shared unavailable badge and MetricCard prop
Spec: § Design, "Shared badge". Advances done_when[1].
- [ ] Move `UnavailableBadge` from `src/components/dashboard/MovementRead.tsx` to `src/components/primitives/index.tsx`
      unchanged; MovementRead imports it
- [ ] `MetricCardData.unavailableReason` in `src/types/index.ts`; `src/components/shared/MetricCard.tsx` shows the
      badge when it is set

## Task 5: ProfilesTab renders unavailable values
Spec: § Design, "ProfilesTab". Advances done_when[1] and done_when[2].
- [ ] Metrics bar through the helpers, badge and no direction or skew label for a missing value
- [ ] Gamma Flip and Gamma Balance: em-dash and badge once levels answered or failed
- [ ] Chain completeness notice; VEX-mode note honest about a missing total
- [ ] Run: `npx tsc -b` (expect PASS)

## Task 6: Gamma Map legend and heatmap reason
Spec: § Design, "SwingMode (Gamma Map)". Advances done_when[1].
- [ ] Heatmap unavailable text through `unavailableReasonText`
- [ ] Legend Flip, Gamma Balance, Total GEX, Total VEX: badge beside the em-dash when null, with the source's reason

## Task 7: hermetic browser proof
Spec: § Design, "Tests" (Playwright). Advances done_when[1].
- [ ] Write `tests/options/one-sided-chain.spec.ts` with the one-sided payloads registered by `page.route`, a page
      error listener, and the screenshots named in done_when[1]
- [ ] Run it against main (expect FAIL on the `put_call_ratio.toFixed` TypeError; keep its screenshots as the before
      state)
- [ ] Run: `npm run e2e -- tests/options/one-sided-chain.spec.ts --trace off` on this branch (expect PASS)

## Task 8: existing options specs
Spec: § Design, "Tests" (profiles-balance-flip). Advances done_when[2].
- [ ] `tests/options/profiles-balance-flip.spec.ts`: the two `--` expectations become the em-dash
- [ ] Run: `npm run e2e -- tests/options --trace off` (expect PASS)
- [ ] Commit: `fix(options): render one-sided chain values as unavailable`

## Task 9: build, lint, unit
Spec: § Design (whole). Advances done_when[3] and done_when[4].
- [ ] `npm run build`, `npm run lint`, `npm test`

## Task 10: close
Spec: § Approval and scope; done_when[5] and done_when[6].
- [ ] Update the FEAT-OPTION-001 catalog row (Status, Last reviewed); its PRs column takes the PR number once the PR
      is opened
- [ ] Docs audit reports nothing new over origin/main (`node scripts/docs-audit.mjs`)
- [ ] `python3 scripts/gate/spec_gate.py --pr origin/main`
