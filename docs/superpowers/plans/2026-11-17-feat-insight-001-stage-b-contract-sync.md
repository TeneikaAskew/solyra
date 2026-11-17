---
feat_id: FEAT-INSIGHT-001
spec: docs/superpowers/specs/2026-11-17-feat-insight-001-stage-b-contract-sync.md
branch: fix/feat-insight-001-stage-b-contract-sync
pr: 348
status: done
---

# Stage B contract sync implementation plan

**Goal:** Bring solyra's vendored stocks contract in line with stocks PR 1937 (FEAT-INSIGHT-001 stage B), which
declares `POST /api/insights/watchlist/add` and `DELETE /api/insights/watchlist/{ticker}` deprecated with a 410
response, so `npm run contract:check` passes again.

**Architecture:** No code path. The supported generator writes the snapshot and the types; nothing else changes.

**Spec:** docs/superpowers/specs/2026-11-17-feat-insight-001-stage-b-contract-sync.md

## Source pin

Stocks main at `6ee71e5f` (the squash merge of stocks PR 1937), path `platform/api/openapi.json`, Git blob
`112dcf4e6c335122180d130c96430632cf353569`, SHA-256 `84aa792ab63b36f5a111037909edf2118487bcc9032428774acca81ce585757f`.
Generated with `npm run contract:sync` (fetching stocks main); outputs `tests/fixtures/stocks-openapi.json` SHA-256
`9b0c4a2cbce08c9b7c417d8c94adf82ea77656450e83948814428c5aefb076a2` and `src/types/stocksOpenApi.gen.d.ts` SHA-256
`9a5b065c39fd5bf2df3e63024dba4caa5731598ff7a596fdd32385823ca2dc91`.

## Task 1: Regenerate the vendored contract

Spec: § Design; advances done_when[0].
- [x] `npm run contract:sync` writes both files (pin above); neither is hand-edited.
- [x] `git diff origin/main --stat` shows 12 changed lines in the snapshot and 31 in the types, all inside the two retired operations (deprecated, the retirement description, the 410 response).

## Task 2: Verify

Spec: § Design, § Risks; advances done_when[1] and done_when[2].
- [x] `npm run contract:check` against stocks main passes.
- [x] No file under `src/` other than the generated types names either retired operation.
- [x] `npx tsc -b`, the full `npx vitest run` (includes `src/mocks/contract.test.ts`) and `npm run build` pass.
- [x] `node scripts/docs-audit.mjs` on this branch and on main, and `python3 scripts/gate/spec_gate.py --pr origin/main`, recorded on the PR.

## Task 3: Open and record

Spec: § Design; advances done_when[3].
- [x] Open the PR as a draft (#348) and set this plan's `pr`.
- [x] FEAT-INSIGHT-001 catalog row: Status names the sync, Last reviewed moves to the PR's date, PRs lists this PR.

## Out of scope

No screen, hook, mock, request or test change. No change to the v3 spec or to stocks.
