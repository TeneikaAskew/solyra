---
feat_id: FEAT-ADMIN-001
spec: docs/superpowers/specs/2026-11-04-feat-admin-001-market-hours-contract.md
branch: fix/feat-admin-001-market-hours-contract
pr: 317
status: ready
---

# Market-hours contract sync implementation plan

**Goal:** Bring solyra's vendored stocks contract and the `MarketHours` type and mock in line with stocks PR 1546, which made `holidays` and `early_closes` required on `GET /api/config/market-hours` and added an optional `FreshnessRow.detail`.

**Architecture:** No new code path. The supported generator writes the snapshot and types; the hand-maintained `MarketHours` interface and `MOCK_MARKET_HOURS` gain the two fields so the existing contract test validates the mock against the regenerated schema.

**Spec:** docs/superpowers/specs/2026-11-04-feat-admin-001-market-hours-contract.md

## Source pin

Stocks main `3ab668a946a2c9641a032a4ef2c4e5ece8483ed4` (the squash merge of PR 1546), path `platform/api/openapi.json`, Git blob `01ac4ea46ebb068195ede5678b0ad434f3197cf4`, SHA-256 `7aa958cab76b51b76e3b4f2176e64dae539c10ed9b9c95dfdb757d1cda6a157f`. Generated with `STOCKS_OPENAPI_FILE=<that file> npm run contract:sync`; outputs `tests/fixtures/stocks-openapi.json` SHA-256 `c403424fd545196d3738caef67ab09dede6c722a16b1cf8ca296099a635d679e` and `src/types/stocksOpenApi.gen.d.ts` SHA-256 `e1727dc39dd2ad2bff2f519db0b5991320295cf822ba1f60d1eebdcc1ac9f9ed`. `npm run contract:check` against the same file: snapshot matches, types current.

## Tasks

1. Regenerate the snapshot and types with `npm run contract:sync` from stocks main. Never hand-edit either file.
2. `src/hooks/useConfig.ts`: `MarketHours` gains `holidays: string[]` and `early_closes: { date: string; close: string }[]`. `holidays_2026` stays.
3. `src/mocks/common.ts`: `MOCK_MARKET_HOURS` gains the real NYSE values for the fields (`holidays` from the 2026 and 2027 closures already used in the mock window, `early_closes` 2026-11-27 and 2026-12-24 at 13:00).
4. Leave `ReplayControl` and every other consumer on `holidays_2026`; moving the picker is stocks' Spec C.
5. Verify: `npx tsc -b`, the full `npx vitest run` (includes `src/mocks/contract.test.ts`), `npm run build`.
6. FEAT-ADMIN-001 catalog row: `Last reviewed` and `PRs` list this PR.

## Out of scope

No screen change, request, polling, fallback or default. No deployed behaviour of its own: the deployed API's values are recorded on stocks PR 1546.
