---
feat_id: FEAT-CATALYST-001
spec: docs/superpowers/specs/2026-10-25-feat-catalyst-001-earnings-api-binding.md
branch: feature/feat-catalyst-001-earnings-ui
pr: 289
status: ready
---

# Existing-app earnings binding implementation plan

> Use the existing isolated writer and actual merged specification. Financial
> evidence and calculations remain in stocks. No new production pipeline.

## Task 1: bind the actual API contract
Spec: API and display contract. Advances done_when[0], [1], [3].
- [ ] Read the actual history/ticker-lean serialization and captured PostgreSQL API assertions in stocks PR1608; retain its source identity.
- [ ] Add exact nullable frontend response types and contract guards, including explicit server cohort identities and percentage units.
- [ ] Add failing presentation controls for qualified, unavailable, zero, immature and censored server responses; no client financial calculations.

## Task 2: connect the existing app screen
Spec: Selected approach and owned implementation surface. Advances done_when[0], [1].
- [ ] Implement a focused EarningsHistory section within the existing /catalysts DataGate and selected-ticker state.
- [ ] Use existing auth/origin/fetch handling, account/ticker-specific query keys, abort signals, no polling or automatic retries, and only the two declared bounded endpoints.
- [ ] Render server percentages/sample counts and event rows with separately labeled native sustain and closing-path fields.

## Task 3: refuse misleading display states
Spec: Sensitive acceptance. Advances done_when[1], [2].
- [ ] Verify malformed current versions fail visibly, old missing additive fields remain unavailable, and null never becomes zero/false.
- [ ] Verify unauthorized, forbidden, missing-history and server-error states independently for both endpoints.
- [ ] Verify ticker/account changes and late responses cannot display another ticker/account's data.

## Task 4: preserve cross-repository contract coverage
Spec: Owned implementation surface. Advances done_when[3].
- [ ] Extend the existing catalysts fixture's complete endpoint fan-out and mock contract coverage with actual server-compatible payloads.
- [ ] After the backend contract is on stocks MAIN, run the existing contract-sync/check workflow and retain linked actual backend API tests; never hand-edit generated snapshots or loosen types for fixtures.
- [ ] Run affected unit/contract tests and the TypeScript/Vite build; record exact commands and results.

## Task 5: prove the visible states
Spec: Sensitive acceptance and release. Advances done_when[0], [2], [4].
- [ ] Run the hermetic /catalysts earnings tests with qualified positive data and all required unavailable/error/race cases.
- [ ] Save screenshots via testInfo.outputPath and inspect the rendered output; do not claim mocked browser proof exercises GCP.
- [ ] Prepare the owner-run deployed cloud spec comparing the screen with the same real API responses after staging deployment.

## Task 6: close the implementation source
Spec: Release and preservation. Advances done_when[5].
- [ ] Update only FEAT-CATALYST-001 catalog status, review date and this implementation PR link.
- [ ] Run actual branch/main docs audits with no new findings and the normal commit/PR gates.
- [ ] Freeze the complete candidate, preserve lineage and reserve remaining review allowance before required current-head judgment; no repeated review of unchanged material.

## Task 7: normal merge and deployed acceptance
Spec: Sensitive acceptance and rollback. Advances delivery closeout after done_when[5].
- [ ] Merge only through normal authorized protection/review/checks, preserving published Lovable history.
- [ ] Verify deployed frontend/backend identities and owner-run real API/rendered-screen parity; record a genuine data/admission gap if no qualified event exists.
- [ ] Retain the prior reviewed frontend revision for rollback; never revert backend data/schema from this UI change.
