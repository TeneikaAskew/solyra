---
feat_id: FEAT-SIGNAL-001
spec: docs/superpowers/specs/2026-10-27-feat-signal-001-score-explanation-binding.md
branch: feature/feat-signal-001-score-explanation-binding
pr: null
status: ready
---

# Recorded signal score presentation implementation plan

> For agentic workers: use superpowers:executing-plans. Root owns publication and reserves the single complete final independent review after the author batch.

**Goal:** Present producer-recorded score explanations on the existing Dashboard and Signals screens, preserving unknown values and historical provenance.

**Architecture:** A shared pure `presentSignalScore` helper validates presentation inputs without computing market scores. `ScoreExplanation` renders it in both existing tables; the supported contract generator supplies schema-derived types.

**Tech stack:** Existing React, TypeScript, Vitest and hermetic Playwright.

**Spec:** docs/superpowers/specs/2026-10-27-feat-signal-001-score-explanation-binding.md

## Global constraints and intake

Catalog: FEAT-SIGNAL-001, “Signals / execution”, “Signal discovery, alerting, exits”; current status “Production but needs remediation”. Requirements: REQ-SIGNAL-001, REQ-UX-001, REQ-MARKET-001 and REQ-REL-001. Approved spec issues list is empty; no issue closure is claimed. Canvas: https://claude.ai/artifact/Fg4VQHB6dFGWF9iXSJUDtg.

Base `aa9595a5c457e7cfb81455a59b9e700022f44f0b`. No runtime prototype/helper/component was found in local branches, history or sibling worktrees. Create the spec-named component because its “reuse” path is absent; no parallel architecture is introduced.

Preserve endpoints, limits, queries, filters, sorting, auth/account behavior, price/return units, Insights and Design Lab. No market formula, universal denominator, clamping, probability/quality interpretation, strict-PIT certification or live-alert claim. Null remains unavailable and zero remains data.

No remote writes, provider/SQL/GCP operations or deployed-browser attempts. Authenticated deployed acceptance remains unexecuted; the stopped website QA owner must not be bypassed. Heavy unit/build/browser/docs-audit runs wait for root CPU coordination. Local source work and focused unit tests run at nice 10.

## Source pin and review lineage

Stocks merged revision `05830d8d535de7f8003c9642417adedc2890ad75`, path `platform/api/openapi.json`, Git blob `0c53ae1adb30b316d096630e29816e505e5e0a07`, 401539 bytes, SHA-256 `e5b9f101dcd03b5158f607bddc13e38cda3883e8f7d2fc3650610dd1a51738ba`. Read using local Git; generate only through `STOCKS_OPENAPI_FILE=/tmp/solyra-signals-openapi-05830d8d.json node scripts/sync-api-contract.mjs`. Record output hashes and repeatability after generation. Existing moving-MAIN CI contract check remains intact.

Spec PR296 cohort reviewed immutable `da2157bbad2abb45b751f18eef71f98e86c75f86`: CODE and SEC completed without findings, receipts issuecomments6474831850/6474918879. It consumed aggregate1/4 and external CODE1/2; three aggregate passes and one external CODE round remain before the root reserves runtime review. Backend receipts remain context and consume no additional Solyra allowance. Author tests/generators are deterministic validation, not an independent judgment pass.

## Review focus

- Valid native momentum6/7 and MR5/5 retain distinct recorded maxima; transport bonus lists are separate recorded values.
- Missing/unknown/malformed metadata and null strength remain unavailable; legacy raw6/5 is inspection evidence only.
- Contradictory components or provenance cannot be promoted to a validated explanation.
- Historical event time is distinct from generated/inserted time and missing source identity remains explicit.
- Both actual routes retain loading/error/empty/auth controls and query/filter/sort semantics.

## Task 1: Pin contract and implement shared presentation

Spec: §Design and owned paths; advances done_when[0,1,3].
Consumes actual backend OpenAPI and native fixture/producer outputs from the pinned revision. Produces `presentSignalScore(row)` and `ScoreExplanation`.
- [x] Generate fixture/types with the supported local-file input, repeat and compare output hashes, run pinned contract check.
- [x] Add producer-derived controls and unit tests for native6/7, MR5/5, zero/null, legacy6/raw6/5, unknown version, malformed provenance/components, recorded bonuses and absent composite denominator; observe RED before helper implementation.
- [x] Implement `src/lib/signalScore.ts` and shared `src/components/signals/ScoreExplanation.tsx`; run focused unit tests GREEN.

## Task 2: Bind both existing routes and prove visible states

Spec: §Design and §Acceptance; advances done_when[2,3].
Consumes Task1 helper/component and generated types. Produces actual Dashboard/Signals rendering with unchanged data requests.
- [x] Add component/rendering controls and route scenarios in `tests/dashboard/dashboard.spec.ts`, `tests/signals/signals.spec.ts` and existing typed fixture helper; observe RED before route binding where execution is available.
- [x] Replace universal denominator/null coercion/generic quality rendering with the shared component and identify historical analytical corpus, strategy/profile/run kind/source and separate event/generated/inserted times.
- [x] After CPU release, run affected browser tests with screenshots, full unit suite, types/build and contract controls. Record any baseline failures accurately.

## Task 3: Delivery preparation

Spec: §Acceptance and release evidence; advances done_when[3] and delivery records.
- [x] Update only own FEAT-SIGNAL-001 catalog status/date; root adds actual PR link after draft creation.
- [ ] Run current branch/current-MAIN docs audits, normal commit/PR gates and retain exact commands/results. Draft PR remains null until root publishes.
- [ ] Commit local author batch only after required local gates; hand root source/output hashes, evidence, unresolved validation and review ledger. Root owns fresh-context final review, hosted CODE/SEC and publication.
- [ ] Integrated deployed API and both screen acceptance remain pending dedicated authorized website QA; health200 alone is not authenticated acceptance.

Capacity: n/a: presentation of existing bounded responses, no new requests or workloads.

## Author validation receipts (partial)

- Supported local-file generator produced snapshot SHA-256 `93fb2df72154afeebd4d399342921f978a57d632ff14001e3e0e16c49abb6823` and generated types `cc7f255049cdcceabad7c3e356f1a32a2e753d3aeb44b18330b71932600bf707`; `--check` independently rendered and matched both outputs.
- `tests/fixtures/signal-score-native.json` SHA-256 `a2999e7556f4fc59cddd2c9493e2ff88e724ce42b5827532e78203a2b6d995a5`: actual native producers on pinned synthetic enriched inputs yielded momentum6/7, momentum7/7 and MR5/5. Its source map records exact SHA-256 values for the producer/config/input files, checked against the pinned Git revision before generation. Storage/run/insertion context is synthetic, explicitly not deployed evidence.
- First helper run failed because the helper was absent; first component run failed because the component was absent and the new legacy insertion-time assertion failed. `nice -n 10 npm test -- src/components/signals/ScoreExplanation.test.tsx src/lib/signalScore.test.ts` then passed 33 tests across two files in 529ms. Browser route RED and bindings, full unit/build/audits/gates remain pending CPU coordination.

## Final author validation

Ordinary `git merge --ff-only origin/main` reconciled current MAIN `018bd409c8a6ec447b8f14e390885838fdf7ea1e` before the author commit, preserving its 23-line `.lovable/plan.md` addition as data; no Lovable action was performed. Runtime baseline remained identical to initial `aa9595a5`.

- Actual-route RED: the existing Dashboard and Signals momentum-six controls failed, with warmup passing (2 failures/1 pass, 38.3s). The Dashboard still labeled the corpus “Live signals” and Signals showed bare6.0. Initial Node JSON import setup failure and own zombie-lock cleanup are recorded separately; neither is behavioral RED.
- Additional malformed-components RED: composite_max6 below base_max7 incorrectly remained recorded (1 failure/35 passes); a comparison of recorded maxima repaired it without inferring or computing any display total. Focused helper/component suite then passed36 tests.
- Full affected browser command: `PLAYWRIGHT_BROWSERS_PATH=/tmp/insights-playwright nice -n 10 npm run e2e -- tests/dashboard/dashboard.spec.ts tests/signals/signals.spec.ts tests/shared/auth-gate.spec.ts --grep 'Dashboard|dashboard|Signal Explorer|signals|firebase mode, signed out|cards and pages ask|card.s own confirm' --reporter=line`: 51 passed in2.8m. Includes both existing route suites, seven score states per route, loading/error/empty, query/filter/sort/review controls and three existing auth controls. Log `/tmp/solyra-signals-browser-green.log`; full prior-layout evidence preserved privately under this plan workspace's `browser-51-pre-layout/`.
- `nice -n 10 npm test`: 1417 passed across72 files in23.69s. The suite's deliberate invalid-Git-ref control emits its expected stderr diagnostic; exit0. Log `/tmp/solyra-signals-full-unit.log`.
- Screenshot inspection led only to aligning the Score heading and top-aligning expanded rows; screenshots now capture the full page. `nice -n 10 npm run build` then passed TypeScript and Vite (Vite16.88s). Log `/tmp/solyra-signals-build.log`.
- Final exact-render browser command: same local browser asset selection, `npm run e2e -- tests/dashboard/dashboard.spec.ts tests/signals/signals.spec.ts --grep 'recorded score explanation:' --reporter=line`: 15 passed in52.3s (14 score cases plus warmup). Full-page screenshots are under `test-results/`; rendering source SHA-256 inputs are recorded in the private plan workspace. Log `/tmp/solyra-signals-final-render.log`.
- Final supported pinned `STOCKS_OPENAPI_FILE` contract `--check` passed. No moving-MAIN CI check was edited or suppressed.

Root reserved aggregate2 for the single complete final local review on the completed author head, with aggregate3/CODE2+SEC intended for hosted review. No additional judgment pass was initiated by this author.

All browser evidence above is local/hermetic. Authenticated deployed API acceptance and both deployed screens remain unexecuted; source/health/Ready receipts do not substitute for that closeout.
