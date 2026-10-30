---
feat_id: FEAT-INSIGHT-001
spec: docs/superpowers/specs/2026-10-12-feat-insight-001-complete-ai-insights-workspace.md
branch: fix/feat-insight-001-source-clocks
pr: null
status: ready
---

# Local source-clock repair proposal

Parent-authorized local authoring from Solyra8c17238, fast-forwarded to qualified
MAIN6ca165ef028154de419bc807845eb0ee1c7a4762 before final validation; no commit, publication,
provider/SQL access or deployed acceptance. Preserve #306 availability/date-only
semantics and the independent quote-date repair. This bounded candidate implements the existing workspace honest-data-health
contract. It does not claim completion of the separate research-evidence R1–R6
manifest, normalized evidence contract, producer proof or rollout obligations.

Admission analysis against cached origin/main6ca165ef028154de419bc807845eb0ee1c7a4762:
workspace spec status is approved and supersedes only the October11 UI spec.
Its Non-goals prohibit inferred timestamps, freshness and evidence completeness
(line38); Chat uses existing research contracts (85), frozen exact sources and
explicit health (89); Component boundaries retain stocks financial truth and
require a separate approved spec for a new backend contract (97). Product-delivery
Phase1.4 permits an existing approved spec that covers the change.

The research-evidence spec remains approved, supersedes:null, and expressly says
it does not supersede or widen workspace specs (line32). Its §B60/62 overlaps
this repair: unknown proof must not become a current claim and a dated quote
must not become authoritative intraday price. This plan does not waive those
protections or claim to implement normalizeEvidence/selectReferencePrice. The
legacy seven-day storage bucket is disclosed only as captured age classification;
it supplies no verified current eligibility. New source-clock/coverage API fields
remain outside this plan until the separate backend spec is approved and landed.
Parent admitted this narrow workspace-spec scope after this comparison. This is
not a ready-for-publication claim; broader-contract exclusions remain binding.

## Task 1: Clock regressions
Spec: Non-goals and Chat; advances done_when[5],[6],[9].
- [ ] Add actual Edge/UI regressions for future source instants, generation versus
   observation labeling, legacy recency labels, and selected catalyst summaries.
## Task 2: Conservative source health
Spec: Chat and Unified History; advances done_when[5],[6],[9].
- [ ] Refuse future timestamps as current while keeping usable payload availability.
   Preserve exact source date/instant and meaning through persistence/reload.
   Do not invent per-source SLAs, provider timezone or observation time.
## Task 3: Selected catalyst presentation
Spec: Chat evidence inspection/data gaps; advances done_when[5],[9].
- [ ] Label the generated catalyst timeline as selected highlights, not the complete
   source calendar; preserve citation and date-only behavior.
## Task 4: Backend boundary
Spec: Component boundaries; preserves done_when[5],[8],[9].
- [ ] Coordinate additive schedule/clock/coverage fields with the isolated backend
   author. Wiring awaits parent contract admission and producer provenance. Keep
   the existing complete-source45000-character guard unchanged.
## Task 5: Qualification and closeout
Spec: Responsive behavior, preserved routes and delivery; validates
   done_when[0]–[10] with inherited behavior distinguished from changed behavior.
- [ ] Run focused hermetic regression and compatibility controls. Report remaining
   producer fields, review lineage, publication and deployment requirements;
   do not reset historical review allowances or start a new judgment cohort.

## Current author proposal and contract boundary

The implemented subset retains the storage-compatible seven-day bucket but labels
it `recent as-of`, explicitly not verified live freshness. Future source instants
remain available evidence with unknown freshness and a recorded refusal reason;
no source timestamp is replaced with now. Source `clock` records only its field
and meaning (generation, source update, snapshot, source as-of, source time,
calendar date, or quote trading date). Metadata persists unchanged through saved
source reads and frozen follow-ups. This does not introduce a live/session SLA.

Backend-author compact proposal, not yet wired or admitted: retain event `date`
and grouped contract; add only actual per-row `event_time`, categorical `earnings_time`, `published_at`,
`fetched_at`, `ingested_at`, `updated_at`, and earnings `data_source` where recorded.
A `timing_sources` map keyed by existing source labels records schedule/clock
basis and missing reasons once per source. Coverage separates requested bounds,
returned event-date bounds, and `verified: null` with its reason. No top-level
observation clock may be synthesized from MAX insertion/fetch/update times.
Absent recorded provider timezone, legacy event time remains unqualified.
The complete-source45000-character guard remains unchanged; a representative101
rows is a size fixture, not a proof that arbitrary101-row payloads fit.

Pending authoritative inputs: actual deployed Edge revision; exact producer
field meanings/timezone provenance; source-specific freshness/session policy;
verified coverage/revision metadata; current backend contract admission; saved
legacy timestamps' interpretation. Parent's bounded DB samples establish that
some schedule/fetch fields exist and are omitted by current API, not all101
rows' coverage, release status, observed freshness, or public API parity.
The separate quote helper repair and dependency-lock worktrees remain untouched.

Local controls: initial four added regression cases failed while24 existing
source-integrity controls passed. Candidate focused tests cover future refusal,
source-clock labels, exact date-only quote semantics, selected timeline caveat,
actual persistence/frozen restore, and synthesis wording. No new review pass,
remote publication or deployment has been executed. Remaining full-spec
obligations and historical review lineage remain with the sole publisher.

## Prepared full source QA (not yet run)

- [ ] Add hermetic browser assertions on existing research fixture paths for
  unknown future freshness, generation/trading-date labels, selected-summary
  caveat, and exact saved-source restore. Capture screenshots of changed states;
  keep all original assertions, timeouts, workers1 and cloud exclusion.
- [ ] Run full unit suite: `npm test -- --maxWorkers=1`; then `npm run build`
  (includes all three TypeScript projects). Record exact source and lock identity.
- [ ] Run `npm run e2e -- tests/ai-insights-lovable tests/insights-lovable
  tests/insights tests/shared` with hermetic localhost fixtures and existing
  warmup. Prove five tabs, shared context, Live/Replay, cancellation/errors,
  restoration, legacy routes and changed visible states; no deployed acceptance.
- [ ] Compare unchanged vendored contract with the actual locally available
  stocks main OpenAPI; do not fetch remotely or substitute the unlanded draft.
- [ ] Run matched candidate/main offline docs audits with the same root-provided
  cached issue snapshot; label currentness limits. Run normal spec gate with
  actual draft/ready delivery context when root supplies that context.
- [ ] Root records catalog/PR/lineage and required current-head review before
  publication. No done_when checkbox is claimed from this preparation alone.

Backend contract draft received: stocks-source-clock-spec local
cee37a3f3e6c73b67a0be1c8c2cb7238df2de7da, status draft. Its proposed compact
projection and ForexFactory normalization are not runtime dependencies of this
label/refusal candidate. Wiring them later requires the separately approved
contract, exact landed producer/schema identity and new parity tests.

Final integration: normal fast-forward to actual quote-repair MAIN
fab3a52cc1d1a331a3bf6c46c4b6029a6153d8b5; preserved quote source and tests.
A traced pre-mount Dashboard failure in the unchanged shared-auth test requires
its helper to await its exact mocked403 brief response before existing assertions.
No auth behavior, timeout or assertion is weakened; dependency delay cause remains
unproven. This readiness control is part of Task5 preservation qualification.
