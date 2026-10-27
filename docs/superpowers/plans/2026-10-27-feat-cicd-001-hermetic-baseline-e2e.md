---
feat_id: FEAT-CICD-001
spec: docs/superpowers/specs/2026-10-27-feat-cicd-001-hermetic-baseline-e2e.md
branch: fix/feat-cicd-001-hermetic-browser-baseline
pr: 295
status: ready
---
# Hermetic browser baseline implementation plan

> Execute via superpowers:executing-plans. Existing root is sole writer.

Goal: restore seven existing browser acceptance failures without application changes.
Architecture: reuse the preserved approved four-file patch; local mock configuration stays isolated from cloud projects.
Tech stack: existing Playwright/Vite/TypeScript; no dependency changes.

## Constraints and review focus
No skipped tests, deleted assertions, weakened auth, application changes, cloud credentials, extra provider calls, new workflow/gate behavior or review-budget reset. Preserve existing290/291/289/292/293 history and normal merge protection.

## Task 1 — apply approved scope
Spec: Demonstrated failure/exact repair; done_when[0–2].
- [ ] Restore only playwright.config.ts and the three named browser files from preservedb0ad046 patch; correct only the stale explanatory navigation-count comment.
- [ ] Keep admin exclusion/presence, dropdown routes, full title, actual chooser and intent-specific citation evidence assertions. No direct store shortcut.
- [ ] Verify local webServer loopback research configuration; cloud projects remain unchanged.

## Task 2 — acceptance
Spec: Sensitive acceptance; done_when[3].
- [ ] Run all three affected browser files on this candidate, preserve screenshots and actualresearch mock evidence. Compare with frozen seven-failure receipts, not an invented new baseline.
- [ ] Types/unit/build, pinned contract, actual branch/main audits and gates; preserve negative/auth controls.

## Task 3 — publication
Spec: Lineage/budgets; done_when[3].
- [ ] Own CICD catalog date/PR and matching plan, one complete independent LOCAL review within ordinary remaining allowance, then normal final external CODE/SEC. No manual duplicate trigger.
- [ ] Normal protected merge, then ordinary MAIN merges into292/293/289 preserving Lovable history. Their own review/API/deployment acceptance remains separate.
