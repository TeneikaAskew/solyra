---
feat_id: FEAT-INSIGHT-001
spec: docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md
branch: feature/feat-insight-001-integration
pr: 302
status: ready
---

# Complete AI Insights workspace integration implementation plan

> For agentic workers: use superpowers:executing-plans. Parent authorized local author preparation and deterministic validation; root records review reservations and exclusively owns remote publication.

**Goal:** Integrate the existing five-tab workspace with current main, preserving both feature behavior and newer fixes.

**Architecture:** Merge feature 78ae241 with main 22a715a without rewriting either published history. Preserve the shared ticker and extracted research workspace. Resolve overlapping browser fixtures with request-aware market data and the stronger response/citation assertions from main.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md

## Global constraints

- Preserve Briefing, Agents, History, Watchlist, and Chat and exactly one shared ticker selector.
- Preserve stocks financial evidence ownership and existing research-session persistence contract.
- No provider calls, production writes, review triggers, remote publication, or allowance reset during local preparation.
- Original feature and main histories remain intact. Parent owns publication.
- Legacy expenditure remains recorded as unknown. Owner approval at 2026-10-29 13:06:56 UTC authorizes the parent-requested forward allowance of three aggregate passes and two hosted code rounds plus required security review; it does not reset history. This worker runs only author implementation and deterministic checks.

## Review focus

Reserved for the later admitted reviewer: restored frozen-session context, watchlist live-generation boundaries, signed-out research rejection, partial source availability, and responsive tab/evidence navigation. Local integration tests exercise these where existing fixtures support them; unproven acceptance remains explicit.

## Task 1: Resolve integration conflicts

Spec: Shared workspace shell, implementation boundaries, and existing-route compatibility; advances done_when[0,8].
Files: tests/ai-insights-lovable/ai-insights-lovable.spec.ts and tests/insights-lovable/insights-lovable.spec.ts.
Interfaces: marketDataForRequest(URL, fixture) preserves requested market-data identity; research fixture retains request and HTTP response receipts.
- [x] Confirm merge conflict output against pinned source heads before resolution.
- [x] Preserve market dates and use marketDataForRequest in both overlapping test suites.
- [x] Preserve main's citation drilldown and typed ticker assertions.
- [x] Run build and focused unit tests; expected successful exit.
- [x] Run original and research-route browser regressions; expected all pass.

## Task 2: Prove combined workspace flow

Spec: Briefing, Agents, unified History, Watchlist, Chat, responsive and accessible behavior; advances done_when[0-9].
Files: tests/ai-insights-lovable/ai-insights-lovable.spec.ts, existing report/research fixtures and implementation only if deterministic failures require repair.
Interfaces: mockInsightsApi provides report/history/watchlist endpoints; mocked research function returns saved sessions and cited NDJSON answers.
- [x] Exercise chart, five tabs, report restoration, watchlist navigation, and authenticated research with recorded responses and screenshots (workspace-integration.spec.ts).
- [x] Verify responsive widths 390/411/768/1440 and 29 decision/history/chart unit tests.
- [x] Capture saved-context and failed/Stop-source preservation RED cases; repair together and rerun GREEN. Expanded spec coverage adds STRAT/provenance, exact history restoration, fresh watchlist research, and session-context unit cases.

## Task 3: Prepare publication evidence

Spec: Delivery paths and catalog acceptance; advances done_when[10].
- [x] Final-source docs audit disposition: parent classifies unchanged CLAUDE 73/30 count claims as existing baseline findings (main measurements 101/34; integration 102/35). Earlier zero-delta result included a numeric cleanup reverted in 7d98081; do not reuse it as final-source proof.
- [x] Run deterministic spec gate and preserve exact output.
- [x] Supply local patch, source identities, validation counts and unresolved acceptance to parent.
- [x] Parent records explicit forward allowance approval before reserving any judgment or publication; historical usage is preserved.
- [x] Parent assigns real PR identity and updates catalog/PR traceability before final review.
- [x] Commit and publish only after parent authorizes the publication step under reconciled policy.

## Final author evidence

Integration head f93818d repairs all ten LOCAL1 findings; 1,276 unit tests, 48 browser tests, build and full PR gate pass. Final docs audit matches prior validated 31 baseline findings exactly. PR #302 retains the original feature history. Forward LOCAL1 consumed; first hosted CODE/current security cohort reserved under the October 29 explicit extension. No live deployment is claimed. Backend R:R is unavailable and displayed as such, with no new financial calculation or API field. Actual research-function deployment remains a release closeout requirement.

## Approved timezone repair extension

The user approved one additional aggregate pass / hosted CODE3 with current SEC at 2026-10-29T23:47:35Z (Sentinel_ae3b9c79eafc8191b72cf2c196a75ac4, replying to Sentinel_8014fb24c71c8191bed32749caa4ae23). Forward aggregate4 follows LOCAL1, CODE1 and CODE2; no earlier history is reset. Scope is the two saved-session callbacks in finding4413573431, shared Eastern-time formatting, and saved-research-to-Briefing regressions.

Both callbacks preserve the exact saved offset and seconds. Chart and datetime input share the existing Eastern date formatter through a datetime adapter; the signal API receives its required Eastern wall clock while research/report requests retain the absolute timestamp. Malformed saved text is not converted into an invented cutoff. Existing separate ResearchWorkspace malformed-input behavior is unchanged.

Author validation: ten transition cases failed on unchanged2805666 and pass after repair, covering both paths, UTC/explicit offsets, date rollover and DST seasons. Two newly introduced formatter error cases failed before the guard and pass after it. Full1301unit/58browser passed before the final guard; final affected58unit/11browser and build passed after it. Source/test hashes and complete logs are preserved in the writer's code2-repair receipt. No new independent LOCAL cohort was consumed. Hosted CODE3/current SEC and required hosted E2E remain required before merge; publication/live verification remain subsequent closeout.
