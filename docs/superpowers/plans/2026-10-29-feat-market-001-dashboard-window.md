---
feat_id: FEAT-MARKET-001
spec: docs/superpowers/specs/2026-10-29-feat-market-001-dashboard-chart-window.md
branch: fix/feat-market-001-dashboard-window
pr: 299
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
- [x] Update affected auth/title assertions; test closed/premarket/review and invalid/empty input states with screenshots.

## Task 3: Normal closeout and release
Spec: Verification and release evidence. Advances done_when[4].
- [x] Full relevant unit/browser suites, types/build, contract check and no-new MAIN audit; complete full PR-context gate.
- [x] Current final independent whole-branch review, bounded repair if needed; preserve findings and review counts.
- [ ] Draft PR, number/catalog closeout, then current CODE/SEC/required checks and ordinary protected merge.
- [ ] Record source merge separately from website publication. Lovable access and live DevTools remain denied; no alternate inspection/publication route or fabricated live acceptance.

## Verification and inherited review ledger

Specification PR #298 merged at324d20f19e402d2756b375573427c1bfb1114cb6; specification CODE1 and current SEC clean, aggregate1 retained. Runtime local whole-branch review was aggregate2 (LOCAL1), immutable head1e337ba5edcfe6d9164ea526a596545201b772d9, reviewer dashboard_window_final. Runtime hosted CODE has not yet run. Reserve aggregate3 for the initial hosted runtime CODE/SEC cohort; do not reset either specification or closed #292/#293 histories.

The local review identified two mandatory P2 findings, repaired together in the single permitted repair batch:
- DW-LOCAL-001: null candle/volume row dereference could replace the dashboard with a route error. New malformed-row/container controls failed before the guard; guard now explicitly refuses the whole invalid window. The browser also covers null volume while retaining the rest of the dashboard.
- DW-LOCAL-002: five screenshots showed the hero above the chart. Captures now scroll the tested chart/count or unavailable state into view, retaining separate title evidence.

All1,204 unit controls and types/build pass after repair; final focused browser/auth rerun passes45/45, including null-volume rejection; all five corrected screenshot states were visually verified. Pinned contract matches Stocks784bb63b6a34c3cb41c0808581d2fe1ee89e99c5. The initial branch/MAIN docs audit had30/30 findings and zero new. Full numbered PR-context gate and remote checks remain closeout obligations.

Declined-scope rulings: live publication/HTTP parity remains unknown under the explicit access denial. Backend publication-time reconstruction, previous-month backfill, trading-calendar completeness, existing16:xx selection and broad price-value validation remain unchanged; this repair does not certify missing source data or provider freshness. Required current-head hosted CODE/SEC and normal protected merge are not waived.
