---
feat_id: FEAT-INSIGHT-001
spec: docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md
branch: feature/feat-insight-001-integration
pr: null
status: ready
---

# Complete AI Insights workspace integration implementation plan

> For agentic workers: use superpowers:executing-plans. Parent authorized local author preparation and deterministic validation; judgment review and remote publication remain pending lineage adjudication.

**Goal:** Integrate the existing five-tab workspace with current main, preserving both feature behavior and newer fixes.

**Architecture:** Merge feature 78ae241 with main 22a715a without rewriting either published history. Preserve the shared ticker and extracted research workspace. Resolve overlapping browser fixtures with request-aware market data and the stronger response/citation assertions from main.

**Tech Stack:** React, TypeScript, Vite, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md

## Global constraints

- Preserve Briefing, Agents, History, Watchlist, and Chat and exactly one shared ticker selector.
- Preserve stocks financial evidence ownership and existing research-session persistence contract.
- No provider calls, production writes, review triggers, remote publication, or allowance reset during local preparation.
- Original feature and main histories remain intact. Parent owns publication.
- Existing ledger expenditure remains unknown; deterministic checks do not establish review approval.

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
- [ ] For any introduced behavioral defect, capture failing test before source repair, then rerun that test.

## Task 3: Prepare publication evidence

Spec: Delivery paths and catalog acceptance; advances done_when[10].
- [x] Run docs audit against main and integration; 31 main / 29 integration findings, zero new findings.
- [ ] Run deterministic spec gate and preserve exact output.
- [ ] Supply local patch, source identities, validation counts and unresolved acceptance to parent.
- [ ] Parent reconciles inherited review ledger before judgment or publication; no numerical allowance assumed.
- [ ] Parent assigns real PR identity and updates catalog/PR traceability before final review.
- [ ] Commit and publish only after parent authorizes the publication step under reconciled policy.
