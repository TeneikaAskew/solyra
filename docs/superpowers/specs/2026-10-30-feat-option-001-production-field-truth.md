---
feat_id: FEAT-OPTION-001
req_ids: [REQ-DATA-001, REQ-UX-001, REQ-MARKET-001, REQ-REL-001]
issues: [87, 93]
canvases: []
done_when:
  - "tests/options/production-field-truth.spec.ts proves a real IWM levels/grid response never renders static SPY hedge580, midpoint591 or Tactical scenarios; backend prices and independent source/date evidence remain present."
  - "tests/options/production-field-truth.spec.ts toggles GEX/VEX/net/calls/puts and back: GEX chart retains its own values; VEX total uses the backend total_vex including actual zero, while absent per-strike VEX is explicitly unavailable and never displays GEX bars under a VEX label."
  - "tests/options/production-field-truth.spec.ts proves unavailable levels/grid/analytics cannot reveal mock values, borrowed prices, simulated narratives or placeholder zero exposures; existing flip/balance, source-date, recovery and zero-preservation regressions remain passing."
  - "Existing options unit/browser, types/build and no-new docs audit checks pass with screenshots of changed states; own FEAT-OPTION record and actual current-head independent CODE/SEC review/CI distinguish source merge from verified website publication."
status: approved
supersedes: docs/superpowers/specs/2026-10-29-feat-option-001-existing-field-binding.md
---

# Actual production Gamma values and truthful Profiles metric availability

## Authorization and publication state

User approval: 2026-10-30T00:02:36UTC, Sentinel_69d79e3d6c5c8191b1c171e37f2a4ac4, explicitly removes illustrative production Gamma values and requires actual data. Parent delegated this separate local author lane; no duplicate product approval is required. This local approved contract is NOT yet approved-spec MAIN or publication evidence. Runtime experiment stays on spike/options-production-field-truth until normal specification admission/MAIN and a unique ready runtime plan. Root is sole publisher. No #302 scope, source or allowance is borrowed.

This supersedes only the earlier requirement to preserve illustrative Tactical content. All prior contracts distinguishing flip/balance, zero/unavailable, error/recovery, request identity and dated source evidence remain binding and covered by their existing tests. The predecessor receives only its normal approved-to-superseded status transition on this specification-only branch; its historical decisions and review receipts remain intact.

## Problem

MAIN7744d1e (unchanged options sources from22a715a) imports fixed SPY demo values into Gamma's live levels taxonomy: Hedge580 and Midpoint591 render when real levels exist. Tactical is labelled illustrative but user now explicitly rejects those production values. Profiles toggles its title/total to VEX while chart data always remains gex_by_strike; the existing GreeksResponse carries only total_vex, not per-strike VEX.

Existing finding provenance: [solyra#87](https://github.com/TeneikaAskew/solyra/issues/87) records static Hedge/Midpoint leakage; [solyra#93](https://github.com/TeneikaAskew/solyra/issues/93) records GEX bars under VEX. The writer reconciled both open issues and their returned timelines on 2026-10-30: no linked repair PR was identified. This does not claim that unlinked branches do not exist. SITE umbrella #168/stocks#1335 is preserved, not substituted for those original identities. #110 spot selection and #174 source/window aggregation remain separate, unchanged findings.

## Design and scope

Remove HS demo-value consumption from production SwingMode entirely, including fallback financial values, Hedge/Midpoint chips/nodes and Tactical scenarios. Backend levels/grid remain their existing source-specific, symbol/date-labelled responses; missing fields stay unavailable and no replacement is inferred from a different source. A concise Tactical unavailable state replaces the mock story because no backend narrative exists. Shared glossary/type definitions may remain; Flow's separately labelled Demo surface is outside this productionGamma request and unchanged.

Profiles keeps backend total_gex/total_vex selection. Render existing per-strike GEX bars only in GEX mode. VEX mode explicitly says per-strike VEX unavailable; do not reuse GEX, derive dollars from raw net_vega, request another endpoint or manufacture a VEX profile. Preserve filters and returning to GEX. Do not force totals to match: Profiles sums its posted chain at greeksSpot, Gamma prefers levels.total_gex with its source spot; grid fallback sums its displayed window. Independent spot/window/source identities remain explicit; observed4.5M/4.0M is not an established arithmetic defect.

Owned runtime: src/components/options/SwingMode.tsx and ProfilesTab.tsx; focused tests and required own delivery records only. No backend math/API/schema, request/query-key/cadence/retry changes, new provider calls, news/insights/collector work or frontend financial computation.

## Validation and capacity

Use existing producer-derived fixtures and intercept all browser external/API traffic. New tests fail on unchanged MAIN before edits and pass candidate; save screenshots. Retain existing unit/flip/balance/error/recovery/demoFlow coverage. Zero added requests, rows, bytes stored or recurring workload; removing mock content and conditionally withholding an unsupported chart adds no financial computation. Build/types and branch/main docs audit precede normal publication; live served-bundle proof remains separate.

## Review admission

This is a new original change: prior #300/#301 completed their approved scope, which explicitly preserved illustrative Tactical; user now reverses that product decision. VEX chart binding was outside that completed acceptance and unchanged by #301. It is not a replacement/split/retry of unresolved #301 work. AGENTS tracks the original change/spec, not the entire FEAT. Preserve /workspace/options-lineage-reconciliation.json, #300/#301 receipts and any overlapping finding provenance without inheriting a spent budget merely from shared file/capability ownership. Superseding the product decision is not a history reset.

New lineage author/tests consumed0 judgment passes, no remote review. Ordinary maximum4aggregate/2hostedCODE applies to this distinct change; proposed minimum use2aggregate/2CODE with currentSEC (spec review and one complete independent hosted final runtime review), leaving2aggregate/0CODE if completed as planned. This is proposed allocation only; root records actual reservation before each trigger and reclassifies if contradictory lineage evidence appears. No extra numerical grant is currently justified. Required approved-spec MAIN and current-head review/CI still precede runtime publication; root is sole publisher.

Prior completed #300/#301 forward allowance consumed4 aggregate and3 hostedCODE after its explicit final1/1 extension, as recorded in /workspace/options-301-body-final.md and its immutable receipts. That history and earlier unknown legacy counts remain intact; this new classification does not refund or reset them.

## Approaches considered and regression risks

Retaining static Gamma values with stronger illustrative labels does not satisfy the user's actual-data requirement. Inventing per-strike VEX or client financial calculations would misrepresent the current backend contract. The selected bounded repair binds existing actual fields and explicitly withholds unsupported values.

Main risks are hiding legitimate zero exposures, weakening cached-error/recovery behavior, or changing existing request identity. The named production-field-truth, flip/balance, source-date and recovery tests distinguish those outcomes. No backend calculation or additional data acquisition is admitted.
