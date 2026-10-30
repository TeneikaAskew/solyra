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

**Spec:** `docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md`, Chat and cited research; non-goal prohibiting inferred timestamps; done_when[5], [8], [9]. Requirements: REQ-UX-001, REQ-DATA-001, REQ-FRESH-001. Existing issues: stocks #827, #867, #1215, #1216 remain open in the parent-provided issue snapshot captured 2026-10-30T10:30:58Z; this narrow repair does not close those umbrella issues. No applicable canvases.

## Global constraints and lineage

- Base: `8c17238065377dfb69fb21fda9107c8ea0070fd7`; preserve #307 and newer Lovable changes.
- Existing FEAT-INSIGHT-001 lineage includes #302 and #306. Parent retains the original finding provenance and allowance ledger; local author work does not reset review history. Only the parent publishes or triggers reviews. Deployment and live browser actions remain outside this local task.
- No backend contract, financial calculation, or research-session persistence changes.
- This private author patch is not release-ready until normal current-head review and repository delivery evidence are complete.

### Bounded review admission

The parent recorded the user's standing current-chat authorization for code changes, reviews, and security, and explicitly granted this quote-date repair one additional aggregate pass and one additional external code-review round: **aggregate 7 / CODE 6**, with required security review in the coordinated cycle. Reason: the production quote header shifted a supplied calendar date to the preceding evening despite the correct research answer. Scope is the quote formatter repair, its tests, and required delivery documentation; no allowance reset or formal approval is implied.

This is a reservation, not a completed review. The parent records immutable review head, trigger/run/completion IDs, findings, and final disposition in the inherited ledger before publication or readiness. This author has triggered no independent judgment cohort or hosted review. No further cycle is granted here.

Source implementation and test evidence are pinned to `741c4269cf0bd4cb051b108a1abd0b8f44dfc086`; admission documentation changes preserve those source bytes. The new draft's number does not yet exist: keep `pr: null`, then add the actual number here and in the owning catalog row's PRs cell after draft creation. Solyra has no separate `12-PR-ISSUE-TRACEABILITY.md` file.

### Local admission evidence

- Baseline and candidate documentation audits used the same parent-provided issue snapshot, captured 2026-10-30T10:30:58Z, with the supported `--no-contract-check --json` flags. Against Solyra main `8c17238065377dfb69fb21fda9107c8ea0070fd7`, both report 34 findings and the candidate introduces none (comparison ignores line-number movement only).
- Separately, `STOCKS_OPENAPI_FILE=<committed-main-snapshot> npm run contract:check` passes against the committed OpenAPI from stocks main `d4478433777283524377a61f142893807351b9b7`; source SHA-256 `e5b9f101dcd03b5158f607bddc13e38cda3883e8f7d2fc3650610dd1a51738ba`. This checks the vendored schema and generated types; it is not a claim that the default network-backed audit ran.
- Source/unit/browser/build receipts remain those recorded above. Admission documentation adds no executable change. No review or release-acceptance checkbox is inferred complete from these deterministic checks.

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
- [x] Run the existing commit gate and normal pre-commit hook, then make authorized local source commit `741c4269cf0bd4cb051b108a1abd0b8f44dfc086`; hand off source, test evidence, and inherited lineage to the sole publisher.

## Task 2: parent-owned delivery

Spec: Done when and existing-route regression; closes done_when[8], [10].
- [x] Obtain relevant hermetic browser proof for the changed quote label; full release-scope acceptance remains parent-owned.
- [ ] Obtain normal current-head reviews under the existing allowance.
- [x] Update only the owning catalog row's status and retain the actual 2026-10-30 verification date.
- [ ] Add the actual draft PR number to this plan and the catalog PRs cell after draft creation; do not invent a number or link.
- [x] Compare local docs audits against main and separately validate the committed-main API contract as specified above; no new documentation findings.
- [ ] Pass the commit and draft-PR gates on the final admission commit; the parent retains any remaining network-backed CI and readiness checks.
- [ ] Preserve owner-controlled deployed verification; do not claim it happened locally.
