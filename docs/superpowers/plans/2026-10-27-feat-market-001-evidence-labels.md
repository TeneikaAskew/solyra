---
feat_id: FEAT-MARKET-001
spec: docs/superpowers/specs/2026-10-27-feat-market-001-evidence-labels.md
branch: fix/feat-market-001-evidence-labels
pr: null
status: ready
---
# Dashboard source-date implementation plan

> Execute through superpowers:executing-plans in the existing isolated worktree.

Goal: qualify existing event/news dates without financial or backend duplication.
Architecture: one pure selection helper; existing Dashboard cards/query boundaries.
Tech stack: TypeScript, React, Vitest, existing hermetic Playwright.

## Constraints and review focus
No provider calls/polling, source-clock invention, score/schema changes, design/auth changes or false freshness from row counts. Preserve invalid/unknown dates, review cutoff uncertainty, stable ties, independent refusals and retained-cache errors.

## Task 1 — selection controls
Spec: Minimal display/selection contract; done_when[0].
- [ ] Add fixed-date tests then implement evidenceLabels.ts: valid calendar dates only, inclusive reference through reference+7; stable order, separate newest-first AV news; count unknowns and expose newest supplied date.
- [ ] Test past/current/future, malformed/absent dates, leap days, ET midnight/DST via existing clock, review dates and no-data.

## Task 2 — actual cards
Spec: Minimal display/selection contract; done_when[1–2].
- [ ] Bind DashboardPage to helper and independent catalyst query/refusal states. Replace fresh/upcoming claims with date-qualified labels, preserve headline/category/ticker and unrelated design.
- [ ] Extend existing dashboard mocked browser tests with fixed dates, errors/retained cache and screenshots. No live proof claimed.

## Task 3 — publication
Spec: Sensitive tests/release; done_when[3].
- [ ] Affected unit/browser tests, types/build, pinned backend contract, actual branch/MAIN docs audits/gates and only own catalog record.
- [ ] Reserve one implementation review within existing lineage allowance. Normal protected merge then parent-owned deployed QA; no fixture-as-live claim.
