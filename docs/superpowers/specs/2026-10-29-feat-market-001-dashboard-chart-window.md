---
feat_id: FEAT-MARKET-001
req_ids: [REQ-DATA-001, REQ-DATA-002, REQ-DATA-003, REQ-REL-001]
issues: []
canvases: []
done_when:
  - "A deterministic shared dashboard-window selector test fails on the prior monthly candle path and proves candle/area parity for the latest two available session dates, excluding bars after the selected review cutoff and retaining only matching volume timestamps."
  - "Selector controls cover month boundaries, one or zero available sessions, a historical review date/time, out-of-order input, and missing or invalid timestamps without fabricating bars, dates or source freshness."
  - "tests/dashboard/dashboard.spec.ts uses a multiweek monthly response with post-cutoff bars to verify candle and area receive the same bounded source selection in live/review modes, with screenshots and a truthful available-session count."
  - "Dashboard tests render a neutral Market brief title in closed, premarket and review states while preserving the existing session pill, actual supplied dates, quote bindings, errors and unavailable states."
  - "Required unit/browser, types/build, pinned source-contract, no-new branch/main audit and normal gates pass; the FEAT-MARKET-001 record distinguishes source implementation from actual frontend publication and live acceptance."
status: approved
supersedes: null
---

# Shared dashboard chart window and neutral brief title

## Problem and authorization

The owner's October29 request asks for a full evaluation and explanation of persistent
issues. Parent explicitly authorized the minimal confirmed chart/title correction,
with normal scope/spec admission and preserved review budgets. This specification records the already-authorized minimal correction separately
from closed #292 and #293. No implementation or external review has started for
this specification. It preserves the parent-selected shared bounded selection
and reviewed-time semantics, without extending the approved functional scope.

Solyra MAIN9c8220d9bffa649848169a3dc05a13a20e080446 requests
`/api/market/data/{ticker}/{YYYYMM}?timeframe=60` in DashboardPage.tsx394–407.
The area path at420–451 selects two available calendar/session dates and applies the
review cutoff. The candle path at733–738 receives the entire monthly candle/volume
arrays, although the shared label says last2sessions. It also ignores the review
cutoff. Source therefore explains the observed weeks-wide candle window; DOM QA
alone does not establish the original HTTP payload, browser API origin or deployed
backend SHA. Browser DevTools inspection was denied by organizational policy and
is not an available verification route.

The Pre-market brief title at560 is unconditional even in closed/review states.
The existing market-session pill already expresses state; the brief title must not
misrepresent the current phase. Date/source news labels are already fixed by #292;
cache identity/revalidation by #293. Preserve them rather than duplicate their work.

## Scope and separate contracts

Own only the dashboard selection helper, DashboardPage consumption, their focused
unit/browser tests, and normal FEAT-MARKET-001 delivery records. Preserve design,
layout, theme, auth, ticker controls, data bindings, score contract work and unrelated
options/earnings/news candidates. No API changes, collector/provider refresh, SQL,
training, production replay or Lovable access route is admitted here.

The existing event evidence-label specification remains authoritative for news and
forward events. This independent chart/title scope does not supersede or reopen it.
A new implementation plan/branch follows only after this specification is admitted
and merged. No closed-PR review allowance is reused or reset.

## Alternatives and selected design

Changing the label to a month would leave the review-cutoff leak. Separate filters
for each renderer would retain the opportunity for drift. Use one pure selection
and feed its exact selected candle and matched-volume arrays to both renderers;
build area points from those selected candles.

## Design

1. Keep the existing request, ticker/month identity, source response and error states.
   Select from the returned bars; add no request or polling loop. Preserve native
   supplied price/volume values. Sort a copy by timestamp and qualify finite valid
   timestamps; never manufacture a timestamp or bar. Invalid source timestamps
   make the selected window explicitly unavailable with an invalid-data reason;
   do not silently drop corrupt rows and present a complete window.
2. Apply the existing dashboard reviewCutoff in review mode before identifying
   session dates. Retain the current04:00–16:00 selection convention. The endpoint
   contract encodes naive ET wall time as epoch seconds, so use the same established
   day-key interpretation. Do not relabel those values as certified UTC publication
   instants or claim original point-in-time completeness.
3. Select the latest at most two available session dates from qualified returned
   bars, not two fabricated calendar days. At a month boundary, one available date
   stays one; no previous-month backfill request is introduced. Exclude all later
   timestamps in historical review. Retain volume only for selected candle times.
4. Both candle and area consume this single selection. Existing renderer options,
   styling and controls remain. Label the actual available session count (singular
   when one), without claiming two complete sessions when only one exists. An empty
   response remains unavailable under the existing widget behavior.
5. Change the unconditional title to Market brief. Preserve the session pill,
   as-of/reference date, quote and source-dependent bullets. Do not derive freshness
   or missing clocks from the title or browser time.

The existing API cutoff is based on bar open time. This repair guarantees parity
and exclusion of timestamps after the requested cutoff; it does not certify
intra-bar information availability or reconstruct original publication time.

## Verification and capacity

Use a multiweek fixture that includes earlier days and bars after a selected
historical cutoff. Assert the actual data supplied to both renderers, not merely
canvas presence or toggle visibility. Unit controls cover both modes, one/zero
sessions and month/review boundaries. Browser proof remains hermetic and records
screenshots; an actual published-source/live check remains a separate release step.

Volume: same monthly response, at most two selected dates. Velocity: zero added
network calls. Local cost: one sort and linear filtering of the existing array,
with no new production workload or infrastructure spend.

## Risks and release evidence

Missing stored dates remain missing. The existing naive-ET transport convention is
not a source-clock certification. Merged code is not a served website: Lovable
private-project access remains denied, and separate redesign work must be preserved.
Record published MAIN revision and actual served revision only when independently
verified through an authorized supported route. Do not use denied DevTools or an
alternate network-inspection route to infer browser payload parity.
