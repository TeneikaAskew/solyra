---
feat_id: FEAT-OPTION-001
spec: docs/superpowers/specs/2026-11-07-feat-option-001-snapshot-labels.md
branch: fix/feat-option-001-snapshot-labels
pr: null
status: ready
---

# Stored options snapshot labels on Gamma Map implementation plan

**Goal:** show the stocks `snapshot_provenance` object on the Gamma Map screen as a neutral stored/unverified label with the recorded Eastern time, and prove it with hermetic Playwright screenshots.

**Spec:** docs/superpowers/specs/2026-11-07-feat-option-001-snapshot-labels.md (approved in its own spec PR; the gate passes once that is on main). Upstream contract: stocks PR 1724, merged at `bd88fa457cf73404419ef7d87dab5b2187f71a7e`.

## Source pin

Stocks main `bd88fa457cf73404419ef7d87dab5b2187f71a7e`, `platform/api/openapi.json` blob `bcca38438b6e28fa43731c8c85ca98ee0496455f`, SHA-256 `d2d0f172072c46517ffd4088258c16697adbd4b47c9e725c58e1ea04a0a2c255`. Generated with `STOCKS_OPENAPI_FILE=<that file> npm run contract:sync`; outputs `tests/fixtures/stocks-openapi.json` SHA-256 `db63f9e9d86fa4e398d67cdd83cdb24312b79d98b3a60b3a6f6bfcb85a4bef51` and `src/types/stocksOpenApi.gen.d.ts` SHA-256 `05927bb570b30769d36e244a60f2ff505f2735a0e0c93240b7424f30b0a42743`. The sync also carries stocks' TF bias description wording, which no screen reads.

## Task 1: Eastern time with zone

Spec: § Design: visible consumer, clock rules; advances done_when[0].
- [x] `src/lib/time.ts`: `isoToEtZoned` renders an aware instant as `YYYY-MM-DD HH:MM EST|EDT` and returns null for anything else.
- [x] `src/lib/time.test.ts`: EST, EDT, midnight Eastern, both 2026 DST changes, microsecond offsets, and null for missing, naive and invalid values.

## Task 2: Stored snapshot clock helper

Spec: § Design: visible consumer, clock rules; advances done_when[0].
- [x] `src/components/options/gammaPresentation.ts`: `STORED_SNAPSHOT_LABEL`, `storedSnapshotClock` and `storedSnapshotDetail`; the age is the server's, shown only with its `observed_at` for `legacy_snapshot_unqualified`; future keeps the time with no age; an older payload keeps only an aware timestamp.
- [x] `src/components/options/gammaPresentation.test.ts` covers each rule, including a known zero age and refused negative or fractional ages.

## Task 3: Hooks, mocks and screen

Spec: § Contract and authority, § Design: visible consumer; advances done_when[1] and done_when[3].
- [x] Vendored contract and generated types from `npm run contract:sync` (pin above).
- [x] `SnapshotProvenance` type; nullable `snapshot_provenance` on `GammaGridSummary` and `GammaLevelsResponse`; fetch, cache and retry unchanged.
- [x] `MOCK_GRID_POPULATED` and `MOCK_LEVELS_POPULATED` carry a legacy EOD provenance; `MOCK_GRID_UNAVAILABLE` carries null; `MOCK_GRID` and `MOCK_LEVELS` stay as old payloads.
- [x] `SwingMode.tsx`: one neutral `stored` pill for every present source, the banner and levels note use the same label and clock; unavailable and unrecognised sources stay `UNAVAILABLE`; loading text no longer says live.
- [x] `src/index.css`: neutral `.hs-pill.stored` style.

## Task 4: Hermetic Playwright evidence

Spec: § Design: visible consumer, § Scope and limits; advances done_when[1] and done_when[2].
- [x] `tests/options/snapshot-labels.spec.ts`: provenance with a prior-session REALTIME origin, an old payload, null and invalid timestamps, a future timestamp, the unavailable envelope, loading and error, and a warm client cache with a re-stamped refetch; one screenshot per state.
- [x] Update `cached-error-availability.spec.ts` and `profiles-balance-flip.spec.ts` for the new pill text.
- [ ] Run on CI's E2E job (this authoring session has no Chromium) and attach the screenshots from its artifact to the PR.

## Task 5: Close

Spec: § Scope and limits; closes done_when[3].
- [x] `npx tsc -b`, the full `npx vitest run`, `npm run lint` (no new findings over main) and `npm run build` pass.
- [x] Correct the current-behaviour rows OPTIONS-09 and OPTIONS-12 in `docs/UI-SCREENS.md`.
- [ ] FEAT-OPTION-001 catalog row: Status, Last reviewed and PRs list this PR.
- [ ] `node scripts/docs-audit.mjs` on this branch and main, and `python3 scripts/gate/spec_gate.py --pr origin/main`, recorded on the PR.

## Out of scope

No Gamma, Greeks or exposure math, no new request, polling or cache policy, no ProfilesTab or TrinityTab change, no deployment and no claim about the deployed site.
