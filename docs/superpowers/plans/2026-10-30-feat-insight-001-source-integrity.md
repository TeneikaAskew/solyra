---
feat_id: FEAT-INSIGHT-001
spec: docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md
branch: fix/feat-insight-001-source-integrity
pr: 306
status: ready
---
# Research source integrity repair

Existing approved spec: Chat and cited research, Unified History, source health and exact saved evidence acceptance. No financial math, provider, schema, or authentication redesign.

## Task 1: Atomic configuration
Spec: § Chat and cited research and Unified History; advances done_when[5], done_when[6], done_when[8], done_when[9] and closeout[10].
- [ ] Apply preserved atomic configuration pair correction; retain owner all-default pair and Firebase guard. Validate rejection before token/fetch and existing races.
## Task 2: Exact source calendar semantics
Spec: § Chat and cited research and Unified History; advances done_when[5], done_when[6], done_when[8], done_when[9] and closeout[10].
- [ ] Preserve calendar dates versus offset-qualified instants through source adaptation, JSON metadata persistence, streamed evidence and projected saved-source reads. Do not write date-only values to timestamptz. Test midnight/DST, invalid timestamps and legacy unknowns.
## Task 3: Availability and freshness
Spec: § Chat and cited research and Unified History; advances done_when[5], done_when[6], done_when[8], done_when[9] and closeout[10].
- [ ] Separate actual payload availability from unknown freshness, including saved sources and citations; keep failures explicit.
## Task 4: Actual catalyst contract
Spec: § Chat and cited research and Unified History; advances done_when[5], done_when[6], done_when[8], done_when[9] and closeout[10].
- [ ] Validate the actual grouped catalyst contract, empty and malformed boundaries, summaries and replay filtering without fabricated data.
## Task 5: Validation and closeout
Spec: § Chat and cited research and Unified History; advances done_when[5], done_when[6], done_when[8], done_when[9] and closeout[10].
- [ ] Validate affected unit/browser flows and screenshots, types/build, source contracts, docs baseline and draft gate. Publisher supplies actual PR number and truthful final acceptance only after required hosted review/checks.

## Preserved review ledger
Original #302 lineage consumed aggregate5 / CODE4. Explicit October30 02:30:26 user approval, reconciled by parent, grants exactly aggregate6 / CODE5 plus current SEC for this complete four-class batch. No reset. The fresh-runtime publisher owns remote GitHub writes; the prior producer remains quiescent for GitHub.

Consumer intake: all 13 afterimage hashes and all current-main beforeimages/absence guards verified against main a5e0b7c2. Regression replay on unchanged source: 31 failing, 8 passing controls. Complete final unit/browser/build, current source contract, docs audit and draft gate are pending. No hosted round for this follow-up has started. Reserve the approved aggregate6 cohort for the final immutable source and its required local/CODE5/SEC reviews.

## Aggregate6 local review and single repair batch

Fresh-context reviewer reviewed 5632848 against main a5e0b7c2, all14 changed files and direct contracts; no declined judgments. Three findings introduced by0e9456c: INS-CONS-001 P1 unknown/naive Replay timestamps admitted future bars; INS-CONS-002 P1 calendar dates do not prove catalyst publication/version eligibility; INS-CONS-003 P2 oversized grouped catalysts were silently truncated. Preserve these findings and the original #302 lineage.

One batched repair rejects unqualified price-history Replay timestamps and supplied-invalid clocks in nested arrays, explicitly withholds Replay catalysts before fetching absent a point-in-time contract, and rejects oversized Live catalyst evidence instead of silently trimming groups. This preserves Live grouped catalysts, valid eligible qualified bars and explicit unknown freshness. Eight reviewer regressions failed on reviewed source; all24 source-contract controls and all1381 unit tests pass after repair. No additional local judgment pass or hosted CODE5 request has run. This is the executing-plans single fix pass, not a reset or extra hosted allowance. Final build/browser/docs/readiness verification remains required on repaired source.
