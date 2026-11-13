---
feat_id: FEAT-CHART-001
spec: docs/superpowers/specs/2026-11-13-feat-chart-001-similar-setups-realized-sync.md
branch: fix/feat-chart-001-similar-setups-realized
pr: null
status: ready
---

# Similar setups realized win share and contract sync implementation plan

**Goal:** Bring the vendored stocks contract in line with stocks PR 1833 and show the similar-setups
`% profitable` figure as the realized win share it now is.

**Spec:** docs/superpowers/specs/2026-11-13-feat-chart-001-similar-setups-realized-sync.md

## Source pin

Stocks main at `ecc8bf5f` on 2026-11-13 (the snapshot last changed in `b2d101a`, stocks PR 1833), path
`platform/api/openapi.json`, Git blob `3c0b420b0ef9782db6bef3fcd44bc7f2d18559a8`, SHA-256
`b00d413e7b88f6d64684ec9edf6ccf85d619add7d9a08760ea9aa72a646a8bd4`. Generated with
`npm run contract:sync`; outputs `tests/fixtures/stocks-openapi.json` SHA-256
`6fcff822e0c609670efcc9a179815d479322ae0365316b617654e6e2c0fc9d26` and
`src/types/stocksOpenApi.gen.d.ts` SHA-256
`fbda45304fc95bf5a41b58da9f1ae0187c732fa933a5c6f4c5de566cc2cccaa4`.

## Task 1: Regenerate the vendored contract

Spec: § Design, first bullet. Advances done_when[0] and done_when[1].
- [x] `npm run contract:sync` writes both files (pin above); neither is hand-edited.
- [x] `git diff origin/main --stat` shows the two files changed only in `SimilarStats`.
- [x] `npm run contract:check` passes against stocks main.

## Task 2: Types and mock

Spec: § Design, second bullet. Advances done_when[2].
- [x] `SimilarStats` declares `realized_count` and `pct_moved_in_favor`, optional and nullable.
- [x] `MOCK_SIMILAR_SETUPS` carries `realized_count` 236 (of 240), `pct_profitable` 0.496 and `pct_moved_in_favor` 0.858.

## Task 3: Card tile

Spec: § Design, third bullet. Advances done_when[3].
- [x] Write `src/components/charts/SimilarSetupsCard.test.tsx`; it fails on main's card.
- [x] The `% profitable` tile adds `of N realized` or `none realized yet`; the test passes.

## Task 4: Insights evidence summary

Spec: § Design, fourth bullet. Advances done_when[4].
- [x] Update `src/hooks/researchEvidence.test.ts`; it fails on main's summary.
- [x] `summarize` reads `of N realized` and `avg best move`; the test passes.

## Task 5: Verify and close

Spec: § Design, § Risks. Advances done_when[5] and done_when[6].
- [x] `npx tsc -b`, the full `npx vitest run` and `npm run build` pass.
- [x] CHARTS-06 in `docs/UI-SCREENS.md` describes the tile, with the card's shifted line ranges.
- [ ] Open the PR as a draft, set this plan's `pr`, and list it on the FEAT-CHART-001 catalog row with Status and Last reviewed.
- [ ] `node scripts/docs-audit.mjs` on this branch and main, and `python3 scripts/gate/spec_gate.py --pr origin/main`, recorded on the PR.
- [ ] The browser suite passes in CI on the head.

## Out of scope

No `% moved in favor` tile, no change to the per-match `+5 min` and `+20 min` columns, no stocks change.
