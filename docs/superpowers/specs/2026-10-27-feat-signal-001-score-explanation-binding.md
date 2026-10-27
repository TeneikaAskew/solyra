---
feat_id: FEAT-SIGNAL-001
req_ids: [REQ-SIGNAL-001, REQ-UX-001, REQ-MARKET-001, REQ-REL-001]
issues: []
canvases:
  - https://claude.ai/artifact/Fg4VQHB6dFGWF9iXSJUDtg
done_when:
  - "src/lib/signalScore.test.ts proves strategy-specific recorded base/max, bonuses and composite rendering without a universal denominator, clamp, financial recomputation or confidence claim"
  - "src/lib/signalScore.test.ts covers legacy score6 with raw6/5, missing/unknown/malformed explanation, null versus zero and inconsistent components with explicit unavailable behavior and no inferred denominator"
  - "tests/dashboard/dashboard.spec.ts and tests/signals/signals.spec.ts exercise the actual score explanation on both existing screens, including native momentum6/7, native mean-reversion and legacy/invalid cases with corpus, strategy and available source/as-of identity"
  - "The existing contract generator produces types from a pinned merged Stocks OpenAPI matching the final backend contract; contract check, types and affected tests pass without handwritten generated types or a duplicated market calculation"
status: approved
supersedes: null
---

# Bind the existing signal screens to recorded score semantics

## Approval, scope and writer

This formalizes the owner's approved producer → storage → API → actual UI root-cause repair, reiterated October27. It retains FEAT-SIGNAL-001 and the existing app. Root is the sole Solyra writer; the existing STRAT child owns Stocks1620. Preserve unrelated Design Lab work. No source implementation before this spec reaches MAIN.

## Actual defect and dependency

DashboardPage.tsx currently renders conditions_met or score/5 and calls the section live signals. SignalsPage.tsx converts nullable score through Number, renders null as zero and assigns generic score thresholds. The actual /api/signals/{ticker} corpus is historical_signals analytical/backfill data, even where run_kind says live. Momentum has seven conditions and admission FLOOR5; mean-reversion has a different profile. A valid6 is not out of range, and neither global /5 nor /7 is correct. Dropping only the frontend fallback cannot repair already serialized6/5.

The additive backend contract is Stocks1620 reviewed head80e5f367c03f6c28892e07a4d68b9ce6c35db435, not yet merged/deployed. Its approved spec is Stocks1619, merged377789974ab150c34fd7d5387921de0059d43769, path docs/superpowers/specs/2026-10-27-feat-signal-001-historical-score-semantics.md. Implementation contract identity must be pinned again after its actual normal merge; no claim that this candidate is live.

The source is platform/api/schemas.py HistoricalScoreExplanation and SignalRow. score_explanation has version historical-score-v1; status recorded, legacy_unavailable or invalid_record; kind condition_count, base_plus_bonus or unknown; nullable base_count/base_max, matched_conditions, bonuses, bonus_total, composite_strength/composite_max; unavailable_reasons; provenance. Provenance contains corpus, strategy, run_kind, storage_source, producer_definition, profile, direction, code/config/input hashes, generated_at and inserted_at. Unknown values remain unknown. Current native profiles historical-momentum-v1 and historical-mr-v1 have maxima7 and5 respectively, bonuses[] and total0. Do not invent a nonzero current producer bonus. The transport may support future recorded bonus lists without inventing a new strategy.

## Design and owned paths

Use one shared pure presentation helper src/lib/signalScore.ts plus its colocated unit tests. Bind it in the existing src/routes/DashboardPage.tsx and src/routes/SignalsPage.tsx. Use the existing generator scripts/sync-api-contract.mjs to update tests/fixtures/stocks-openapi.json and src/types/stocksOpenApi.gen.d.ts from a pinned actual merged backend revision, recording its file hash and revision. Adapt existing typed fixtures only as required, including tests/helpers/fixtures/signals.ts, and the named existing screen tests. Own FEAT-SIGNAL-001 catalog/plan/PR records are in scope; no cache/auth/chart/earnings implementation is folded into this binding.

Render the backend-recorded base count and denominator, named bonuses and composite strength as distinct values; display no composite denominator when absent. Do not calculate a new score, infer maximum from strategy names, clamp or reinterpret a count as probability. Current producer-derived controls must use the actual backend definitions, not solely a canonical4/5 mock. Generic score>=7/>=5 interpretation must not imply cross-strategy quality; use neutral strength presentation unless an actual recorded contract supplies that interpretation.

Missing, unsupported-version or malformed explanations show raw finite stored strength separately with an explicit breakdown-unavailable state and reason. Null is unavailable, legitimate zero remains zero. Inconsistent recorded components are not silently repaired into a plausible fraction. A raw legacy6/5 string is not presented as an authoritative fraction. Preserve raw evidence for inspection without confusing it with a validated explanation. Never replace unavailable fields with neutral trading conclusions.

Both existing screens identify the corpus as historical analytical signals, show the available strategy/profile/run kind and source, and distinguish recorded/generated/inserted times from market event time. Missing producer/input identity is explicitly unavailable, not strict-PIT certified. Retain the existing timestamp and price/return units; do not invent freshness thresholds or call these records live alerts. Preserve existing endpoint, query limits, ticker/date filters, authentication/account states, sorting and routing; no new endpoint, polling, provider call, storage or backfill.

## Acceptance and release evidence

The listed unit controls fail on the current universal-denominator/null-to-zero behavior. Screen tests must drive existing app routes and real rows, not merely test an unused helper; cover recorded momentum6/7, recorded mean-reversion profile, legacy raw6/5, zero/null and malformed metadata. Include positive/negative loading, empty and auth/error controls already exercised by those screens. Keep actual producer-derived inputs and pin their source revision. Mocked browser tests prove consumer behavior only.

Run ordinary branch/current-MAIN docs audit, generator identity/repeatability and normal gates/checks/reviews. Pin OpenAPI for local contract evidence, but do not suppress the existing moving-MAIN CI contract check. Before integrated-release completion verify the actual deployed backend revision, a bounded existing read-only API response and both rendered screens through the parent's dedicated website QA owner; no alternate browser route around a denial. Staging observation is a postmerge closeout, not a falsely checked PR acceptance item. If backend release is blocked, frontend integration acceptance remains explicitly incomplete; this spec does not waive it. Rollback uses the prior normal frontend commit and existing backend-compatible additive API, preserving raw records.

## Approaches and limits

A universal /7, deleting only /5, or cosmetic clamping fails strategy/legacy cases. Duplicating the producer in the browser risks financial drift. The chosen recorded-explanation binding preserves financial arithmetic and unknowns. No new model, probability, profitability assertion, execution policy, tables, destructive migration, provider request, permission or redesign.

## Review history

Keep one end-to-end FEAT-SIGNAL-001 ledger with all backend receipts as context:
- Stocks1619 CODE1 f1703e75, clean: issuecomment6447640388.
- Stocks1619 CODE2 9b2366f9, clean: issuecomment6448583293.
- Stocks1620 CODE1 3f0417bc, two introduced P2 findings subsequently fixed: issuecomment6450164293.
- Stocks1620 CODE2 80e5f367, clean: issuecomment6450466992.

The parent explicitly adjudicated repository-specific counting: these Stocks judgments do not retroactively consume Solyra caps without an explicit cross-repository rule. No prior Solyra judgment reviewed this binding; preserve the receipts rather than rename/reset work. Market290, chart291 and earnings288/289 did not implement/review this contract. Reserve the normal Solyra spec CODE/SEC cohort, then complete implementation LOCAL and CODE/SEC within the four aggregate/two external limit; no289 allowance transfer and no extra round implied. Actual automatic/cancelled/duplicate runs consume the applicable allowance and must be recorded.

Capacity: n/a: presentation of existing bounded API responses; no new requests, polling, GCP job, storage or provider workload.
