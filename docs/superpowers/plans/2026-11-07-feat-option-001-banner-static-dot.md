---
feat_id: FEAT-OPTION-001
spec: docs/superpowers/specs/2026-11-07-feat-option-001-snapshot-labels.md
branch: fix/feat-option-001-banner-static-dot
pr: 320
status: ready
---

# Static banner dot for stored options snapshots implementation plan

**Goal:** stop the exposure banner's dot from pulsing when the grid is a stored snapshot, so neither the source pill nor the exposure banner suggests a live feed.

**Spec:** docs/superpowers/specs/2026-11-07-feat-option-001-snapshot-labels.md (approved, on main). This closes a gap in done_when[1] after #319: the pill dot was static but the banner dot still ran the `hs-pulse` animation, which the owner saw on the published screen.

## Task 1: Banner dot

Spec: § Design: visible consumer; advances done_when[1].
- [x] `src/components/options/SwingMode.tsx`: the banner dot carries `pulse` only when the grid is not a present stored snapshot.
- [x] `src/index.css`: `.hs-demo-banner .dot` is static; `.hs-demo-banner .dot.pulse` keeps the animation for the unavailable state.

## Task 2: Evidence

Spec: § Design: visible consumer; advances done_when[1].
- [x] `tests/options/snapshot-labels.spec.ts`: `expectNoLiveClaim` also checks the banner dot has no `pulse` class and a computed `animation-name` of `none`, in every stored-snapshot state.
- [x] `npx tsc -b`, `npx vitest run`, lint on the changed files and `npm run build` pass.
- [ ] CI's E2E job passes on this branch (this authoring session has no Chromium).

## Out of scope

No label, clock or data change, no unavailable-state change, no deployment and no claim about the deployed site.
