---
feat_id: FEAT-MARKET-001
spec: docs/superpowers/specs/2026-10-29-feat-market-001-dashboard-chart-window.md
branch: fix/feat-market-001-dashboard-window
pr: null
status: ready
---

# Dashboard shared window and neutral brief implementation

> Execute inline using executing-plans. One writer; preserve #292/#293 and all inherited review history. This independent runtime has no registered CODE or local review yet; normal per-PR allowance applies.

## Task 1: Discriminating renderer and selector controls
Spec: Design1–4 and Verification. Advances done_when[0..2].
- [x] Add hermetic multiweek browser control reading actual chart component inputs in the local test browser, covering both modes and real review controls; observe the prior full-month candle failure.
- [x] Add pure selector controls for two/one/zero dates, month boundaries, ordering, invalid timestamps and review cutoff; no network calls.
- [x] Implement one selection in src/components/dashboard/dashboardWindow.ts and bind both renderer inputs in DashboardPage.tsx, matching volume timestamps.
- [x] Run tests green and verify no mutation of caller arrays or synthetic prices/dates.

## Task 2: Honest title and unavailable states
Spec: Design4–5 and Risks. Advances done_when[1..3].
- [x] Use the actual available-session count and preserve existing empty/error/auth widget states.
- [x] Replace unconditional Pre-market brief title with Market brief; keep session pill and source dates.
- [ ] Update affected auth/title assertions; test closed/premarket/review and invalid/empty input states with screenshots.

## Task 3: Normal closeout and release
Spec: Verification and release evidence. Advances done_when[4].
- [ ] Full relevant unit/browser suites, types/build, contract check and no-new MAIN audit; complete full PR-context gate.
- [ ] Current final independent whole-branch review, bounded repair if needed; preserve findings and review counts.
- [ ] Draft PR, number/catalog closeout, then current CODE/SEC/required checks and ordinary protected merge.
- [ ] Record source merge separately from website publication. Lovable access and live DevTools remain denied; no alternate inspection/publication route or fabricated live acceptance.
