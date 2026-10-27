---
feat_id: FEAT-CHART-001
spec: docs/superpowers/specs/2026-10-27-feat-chart-001-current-day-cache.md
branch: fix/feat-chart-001-current-day-cache
pr: null
status: ready
---
# Current-day cache implementation plan

> Execute through superpowers:executing-plans in the existing isolated worktree.

Goal: repair the existing chart reader without changing ingestion or market semantics.
Architecture: existing query keys and ET date helper; bounded cache, validated reads, explicit legacy qualification.
Tech stack: React Query, TypeScript, Vitest and existing hermetic Playwright.

## Constraints and review focus
No polling, provider calls, auth/origin changes, raw/source-clock inference or new backend fields. Preserve missing data, independent refusals, flat candles and zero volume. Check ET rollover, partial history, malformed identities, duplicate timestamps and retained successful data after an error.

## Task 1 — sensitive hook controls
Spec: Bounded cache contract and Sensitive acceptance; done_when[0–1].
- [ ] Preserve original RED receipt; add current/month/ET boundary, partial-history and admission tests in src/hooks/useMarketData.test.ts using actual captured options and QueryClient.
- [ ] Implement temporal TTL, no retries, typed HTTP errors and coherent response checks in src/hooks/useMarketData.ts. Run focused tests red→green.

## Task 2 — chart evidence
Spec: Owned paths and Sensitive acceptance; done_when[2].
- [ ] Update minimal ChartsPage status and tests/charts/charts-cards.spec.ts for source/basis unknown, refusal and revalidation; preserve existing chart/design/shared ticker behavior.
- [ ] Run affected hermetic browser cases, retaining screenshots as mocked evidence only.

## Task 3 — publication
Spec: Sensitive acceptance; done_when[3].
- [ ] Types/build, pinned backend contract, branch/MAIN audits and gates. Update only own catalog row and normal PR record; preserve lineage review ledger.
- [ ] One complete coordinated implementation review within remaining allowance, normal checks and protected merge. Parent verifies real deployed screen separately; no live acceptance claimed from fixtures.
