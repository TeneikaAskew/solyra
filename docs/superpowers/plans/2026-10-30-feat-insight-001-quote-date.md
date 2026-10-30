---
feat_id: FEAT-INSIGHT-001
spec: docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md
branch: fix/feat-insight-001-quote-date
pr: null
status: ready
---

# Insights quote date implementation plan

> For agentic workers: use superpowers:executing-plans. Parent authorized local author execution only; parent owns publication and review scheduling.

**Goal:** Preserve a quote's supplied calendar date and show explicitly zoned timestamps in Eastern Time.

**Architecture:** Reuse `isoToEtDisplay` from `src/lib/time.ts` in `LiveQuoteBox`. Keep the quote hook, financial fields, research evidence formatter, and backend market-date logic unchanged.

**Tech Stack:** React, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md`, Chat and cited research; non-goal prohibiting inferred timestamps; done_when[5], [8], [9]. Requirements: REQ-UX-001, REQ-DATA-001, REQ-FRESH-001. Existing issues: stocks #827, #867, #1215, #1216; current status not fetched under local-only authorization. No applicable canvases.

## Global constraints and lineage

- Base: `8c17238065377dfb69fb21fda9107c8ea0070fd7`; preserve #307 and newer Lovable changes.
- Existing FEAT-INSIGHT-001 lineage includes #302 and #306. No new independent judgment cohort, review reset, push, provider review, deployment, or live browser action is authorized by this plan. Parent retains the exact allowance ledger and subsequently authorized a local commit after the existing commit gate passes.
- No backend contract, financial calculation, or research-session persistence changes.
- This private author patch is not release-ready until normal current-head review and repository delivery evidence are complete.

## Review focus

- Date-only input must not acquire a time or shift to the preceding date.
- Explicit UTC and offset timestamps must show their Eastern instant.
- Summer and winter offsets must both work.
- Browser timezone must not control the quote's displayed date/time.
- Missing timestamps must keep the existing em-dash presentation.

## Task 1: quote date regression and repair

Spec: Chat and cited research and no inferred timestamps; advances done_when[5], [8], [9].
Files: modify `src/components/insights/LiveQuoteBox.tsx`; add colocated `LiveQuoteBox.test.tsx`; extend the existing NY/Tokyo source-integrity cases in `tests/insights-lovable/insights-lovable.spec.ts` with a date-only quote fixture and header assertions.
Consumes: `LiveQuote.last_updated: string` and `isoToEtDisplay(string): string`. Produces: existing quote JSX with honest as-of text.

- [x] Render the actual component using a controlled quote hook. Assert date-only `2026-10-29` produces `As of 2026-10-29`, with no clock; zoned timestamps render literal expected ET values; empty input renders an em dash.
- [x] Run targeted Vitest in `America/New_York` (RED: five failed, one passed on baseline).
- [x] Replace the header's browser-local Date formatting with the existing helper.
- [x] Repeat targeted tests in `America/New_York` and `Asia/Tokyo` (GREEN: component plus existing helper, 10/10 each).
- [x] Run full unit/type/build checks: 1438/1438 unit tests; normal `npm run build` (all-project TypeScript plus Vite) passes; final all-project `tsc -b` passes after the screenshot capture was added.
- [x] Under parent's subsequent local-harness authorization, run existing Insights Lab hermetic tests: 6/6 pass; supplemental NY/Tokyo quote-region screenshots plus warmup 3/3 pass. Both screenshots show `As of 2026-10-29`. No deployed-site query, browser, or screenshot was performed.
- [ ] Run the existing commit gate, make the authorized local commit only if it passes, and hand off the patch, cause, test evidence, and inherited lineage to the sole publisher.

## Task 2: parent-owned delivery

Spec: Done when and existing-route regression; closes done_when[8], [10].
- [x] Obtain relevant hermetic browser proof for the changed quote label; full release-scope acceptance remains parent-owned.
- [ ] Obtain normal current-head reviews under the existing allowance.
- [ ] Update only the owning catalog row and PR traceability when publication is authorized.
- [ ] Run docs audit against current main and the spec gate before commit/publication.
- [ ] Preserve owner-controlled deployed verification; do not claim it happened locally.
