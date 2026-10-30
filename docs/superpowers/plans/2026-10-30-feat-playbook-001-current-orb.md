---
feat_id: FEAT-PLAYBOOK-001
spec: docs/superpowers/specs/2026-10-30-feat-playbook-001-current-orb.md
branch: fix/feat-playbook-001-current-orb
pr: null
status: ready
---

# Private ready-metadata plan template (not runtime admission)

Parent confirms approved specification merged (Stocks#1638 / Solyra#305). Local base uses exact admitted spec commit; fresh publisher must reconcile actual MAIN merge before publication. Author implementation only, no judgment rounds reserved.

## Task 1: Contract
Spec: § Contract; advances done_when[0].
- [ ] Pin actualmergedbackendOpenAPI; write no-clientmath/identity/sourcecomparisonRED tests, then bind typeddata.

## Task 2: Scope and limits
Spec: § Scope and limits; advances done_when[1].
- [ ] Prove allunavailable/error/rollover paths and defaultotherconsumers unchanged; saveinspectedscreenshots.

## Task 3: Close-out
Spec: § Close-out; advances done_when[3].
- [ ] Runcontract/types/unit/build/fullbrowser; updateowncatalog and normalreadyPRgate; reservereviews before publication.

## Consumer reconciliation and unrelated-input preservation

Reconciled against actual Solyra MAIN `aa9595a5c457e7cfb81455a59b9e700022f44f0b`, preserving the Insights source repair. A hermetic regression reproduced that replacing compact history with an unavailable opening response (`bars: []`) stopped unrelated indicators and evaluation. The bounded repair retains the existing compact query for indicator/snapshot bars and uses the independent opt-in query only for ORB projection/status. Both keep the existing sixty-second polling and thirty-second stale interval; neither substitutes for the other or adds a retry policy. Opt-in failures clear ORB qualification while ordinary inputs continue.

These requests do not share backend admission or a cache: compact traffic is the existing ordinary path; full traffic has its separate eight-key/sixty-second cache, two in-flight slots and eight-attempt rolling minute budget per process. Combined fleet allocation remains an activation prerequisite; this is not quota-neutral or deployed-capacity evidence. No additional review round was initiated by deterministic reconciliation and regression testing.

### Pre-review consumer evidence

The full browser run passed392 checks on runtime source `f86d0430bdb00b3de1927543a971087f7d8fbd64`. Later changes add stronger failed-refresh POST assertions, documentation, and generated erased types/contract fixture from paired backend `185efc69d4db2080da05587332be0f0f7362f7f0`; no application runtime changed after that full browser run. The strengthened Playbook/ORB run passed19 checks and final full unit suite passed1394 tests. This generated contract remains a local backend candidate, not a claim that ORB has landed or deployed.

### First independent frontend review: one repair batch

The first frontend review of `c2233bed30d57c969afd97a503331e4ddc0ef632` identified two P2 defects: freshness could remain memoized after the120-second allowance, and permissive timestamp parsing accepted incomplete/invalid opening windows. The batched repair adds a bounded one-shot local expiry timer plus focus/visibility revalidation, rejects closed/unknown/failed market context for ORB only, and reuses `resolveReplayBoundary` calendar-field validation for explicit-zone window/comparison instants. Window completion and identity are validated without recomputing extrema. Existing compact inputs, request cadence and retry policy remain unchanged.

Actual component/helper controls first failed22 cases (18 passed) against the prior source; the repaired batch passes42 cases, including two further retained-status/background-resume controls. The392-browser receipt above is PRE-REVIEW-FIX evidence only. Final repaired-source unit evidence: 1420 tests across72 files passed. Complete affected Playbook browser evidence: 20 passed (including warmup),1 owner-cloud skip;39 selected shared-navigation/Insights preservation cases also passed on identical runtime source. Two earlier runs each passed58/skipped1 and failed only the new test clock setup; final test pauses after initial query notifications, preserving exact120000ms/+1ms assertions. Application source did not change during these browser runs. No new judgment round was started for deterministic verification.

`tests/playbook/orb-parity.cloud.spec.ts` is authored for separately authorized owner-run QA using the existing cloud harness and saved session. It skips before navigation in the local project. No cloud/deployment/auth acceptance run was executed by this consumer. Actual deployed parity remains pending.

Final local types/production build and paired contract check passed against backend `55069c27fc7ec990992d341be5d7e4613c455f6f`; OpenAPI SHA-256 `1bd15e9c3f2c68384fca76f4a4c4aebee3ba0133be17f4cca092223defaa5c17`. Matched offline docs audits using `/tmp/insights-issues-final.json` and `--no-contract-check` report33 findings on both candidate and cached main `018bd409c8a6ec447b8f14e390885838fdf7ea1e`, zero new. This audit deliberately excludes remote contract fetching; the independent paired local contract check supplies local evidence only. Commit and PR-context spec gates passed. External main was merged normally, retaining `.lovable/plan.md` exactly.

### Landed Signals reconciliation (local qualification incomplete)

Normally merged actual frontend main `2cdd85147793a8d086d3475c583552f0167e9744` into the ORB candidate as `5769bc7cf775601b60a6e3b2e42db3c9c8b4355e`. Only overlapping documentation needed mechanical reconciliation; landed Signals/Dashboard source, tests, harness and external Lovable plan remain byte-identical to main. No financial logic or new judgment was introduced.

Integrated unit suite1471/1471 (74 files), types/build and paired local backend contract passed. Matched offline audits report34 findings each, zero new, using cached issue snapshot captured06:31:37Z (`/tmp/signals-307-current-issues.json`), before307 merged06:43; this is not remote-current evidence. Backend pin remains unlanded candidate `55069c27`; publication/readiness awaits actual landed backend and outstanding provider/fleet qualification and owner decisions.

The first116-case affected Playbook/Signals/Dashboard browser run passed112/skipped3 and failed Dashboard generated_at-0 (missing strength element after5s). Identical isolated controls passed on actual main and candidate (2/2 each including warmup), without edits. One authorized complete repeat passed111/skipped3 and failed the Dashboard full-badged ticker beforeEach networkidle/teardown timeout and the ORB failed-refresh initial qualified-label assertion. The original score case passed in the repeat. Concurrently observed slow local operations do not establish causation. Both runs and controls are retained; integrated browser qualification remains unresolved, no blanket all-pass claim, no additional retry or source repair adopted. Owner-cloud cases were only skipped locally; no deployed/auth/cloud execution occurred.
