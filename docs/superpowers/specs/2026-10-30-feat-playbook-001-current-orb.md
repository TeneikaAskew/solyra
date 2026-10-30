---
feat_id: FEAT-PLAYBOOK-001
req_ids: [REQ-PLAYBOOK-001, REQ-DATA-003, REQ-REL-001]
issues: [200]
canvases: []
done_when:
  - "tests/playbook/orb-contract.spec.ts proves qualified server opening range and same-acquisition comparison price are transported without client extrema/math"
  - "tests/playbook/orb-contract.spec.ts proves loading, partial, malformed, empty, stale, wrong-symbol/session and failed-refresh states remain explicit while unrelated quotes/conditions survive"
  - "src/lib/playbookEvaluator.test.ts and hook tests prove default useLiveHistory behavior/cache key unchanged for non-opt-in consumers and every option/symbol change isolates data"
  - "Pinned backend OpenAPI, types, unit/build and hermetic browser tests pass, with inspected screenshots and FEAT-PLAYBOOK-001 catalog/PR record updated"
status: approved
supersedes: null
---

# Consume qualified current-session Playbook ORB

## Contract
Dependency: Stocks 2026-10-30-feat-playbook-001-current-orb.md and its exact merged OpenAPI. Preserve30m/open-inclusive,end-exclusive semantics and all302 changes. Playbook alone opts into include_opening=true. useLiveHistory cache key includes the option; other callers remain unchanged. Transport typed server range, comparison price/asof/source/session/availability; never call computeORB or derive extrema on this path. Do not overwrite unrelated snapshot.price or financial inputs; server ORB conditions use their separately qualified comparison field. Render unknown/unavailable reasons honestly; an error cannot expose stale retained result as current.

## Scope and limits
Only src/hooks/useLiveHistory.ts, src/lib/playbookEvaluator.ts, src/hooks/usePlaybookEvaluation.ts, src/routes/PlaybookPage.tsx, affectedtypes/contracts/fixtures/tests. No backend math or new provider, no new polling cadence. Snapshot qualification and response fields must be pinned from actual landed backend before ready runtime plan; no invented fields. Preserve raw original30m helper lineage and issue200. No new product choice or review reset inferred.

## Close-out
Normal spec-before-runtime route, current reviews/checks, root sole publication; parent qualified frontend publication and same-session rendered parity after backend deployment. Hermetic screenshots are not live data proof.
