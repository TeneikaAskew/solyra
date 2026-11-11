---
feat_id: FEAT-CICD-001
spec: docs/superpowers/specs/2026-11-09-feat-cicd-001-ping-contract-sync.md
branch: fix/feat-cicd-001-ping-contract-sync
pr: 323
status: done
---

# Ping description contract sync implementation plan

**Goal:** Bring solyra's vendored stocks contract in line with stocks PR 1384, which rewrites the
`GET /api/earnings/health/ping` description so it no longer names the retired `solyra-api-prod`.

**Architecture:** No code path. The supported generator writes the snapshot and the types; nothing else changes.

**Spec:** docs/superpowers/specs/2026-11-09-feat-cicd-001-ping-contract-sync.md

## Source pin

Stocks branch `feature/feat-deploy-001-retired-service-leftovers` at `2215223a` (stocks PR 1384's head on
2026-11-09), path `platform/api/openapi.json`, Git blob `f9ccabf30606999b25c27d3881fcef32cfa25b0d`,
SHA-256 `274e17a7d9c2d662d30ad29e8f32b72c40a4aae2f1192a39c07c58e777d0fa2d`. Generated with
`STOCKS_OPENAPI_REF=feature/feat-deploy-001-retired-service-leftovers npm run contract:sync`; outputs
`tests/fixtures/stocks-openapi.json` SHA-256 `d2f5985ecfab9db27409d9c5d0a65289f1f72be717b827de3a74d61904e8275c`
and `src/types/stocksOpenApi.gen.d.ts` SHA-256 `74f688ac2aa6e2512b549aac7f3906d1df5d36575c90895ddf2cc45dae33128b`.

## Task 1: Regenerate the vendored contract

Spec: § Design; advances done_when[0].
- [x] `STOCKS_OPENAPI_REF=feature/feat-deploy-001-retired-service-leftovers npm run contract:sync` writes both files (pin above); neither is hand-edited.
- [x] `git diff origin/main --stat` shows one changed line in the snapshot and three in the types, all in the ping description.

## Task 2: Verify the build

Spec: § Design; advances done_when[2].
- [x] `npx tsc -b`, the full `npx vitest run` (includes `src/mocks/contract.test.ts`) and `npm run build` pass.

## Task 3: Open and record

Spec: § Design, § Risks; advances done_when[3].
- [x] Open the PR as a draft (#323) and link it from stocks PR 1384; set this plan's `pr`.
- [x] FEAT-CICD-001 catalog row: Last reviewed and PRs list this PR.

## Task 4: Close after stocks PR 1384 merges

Spec: § Design (merge order), § Risks; advances done_when[1].
- [ ] `npm run contract:check` against stocks main passes on the head. If stocks' head moved before its merge, re-run Task 1 from stocks main and re-pin.
- [ ] `node scripts/docs-audit.mjs` on this branch and main, and `python3 scripts/gate/spec_gate.py --pr origin/main`, recorded on the PR.

## Out of scope

No screen, hook, mock, request or test change. No change to the confirm-on-return spec.
