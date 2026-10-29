# Solyra agent-review alignment evidence — 2026-10-24

One writer `/root`; Solyra#287 mirrors reviewed stocks#1583 at8f2aafe4c6d26152b89663453bfd7821ada1b5f0. Approved Solyra spec#286 merged ataafdc9d395744805ca88431efc4d6706d41c5e2c after clean code/security review on58adffe09c4acc5e1c974693813a1533db2ff7d5 and all four checks passing. First-type receipts: https://github.com/TeneikaAskew/solyra/pull/286#issuecomment-6390146659 . Reused plan commit571a6ea precedes policy commit995213e756b19cd465ff18653e1bb1f7baa121ff.

## Linked history, not a fresh budget

Rootstocks#1577→stocks#1583→solyra#286→solyra#287. Preserve stocks' evidence at https://github.com/TeneikaAskew/stocks/blob/8f2aafe4c6d26152b89663453bfd7821ada1b5f0/docs/review-evidence/2026-10-24-agent-review-alignment.md . It retains two specification code reviews, its security review, BASE-01, HEAD-01, FIX-01, unknown earlier local effort and the implementation code receipt. Solyra spec adds one code and one security review; BASE-SOL-01 and HEAD-SOL-01 are separately declared instruction exercises, not erased or retroactively folded into earlier cohorts. Exact prior unknown identities stay unknown; no newly adopted-policy balance is asserted.

The owner's bounded-finish authorization (Sentinel_314cdf4cfde8819183c963502f76acbb, confirmedSentinel_ec7949686db08191a3818ce255a4c9b7) covers the existing spec/plan/mirror, required Codex reviews and conditional merges. Existing repository instructions govern delivery until their implementation lands. There is no new planning-approval hold and no permission to weaken a required check. Any later use of the adopted budget must reconcile this inherited history, not assign a new allowance.

## Actual instruction-compliance exercises

BASE-SOL-01 read only six policy files atf0aaf422fcfaf0b2bcadc129f8454c4714318224. HEAD-SOL-01 used995213e756b19cd465ff18653e1bb1f7baa121ff. Participant `/root/solyra_acceptance` read the same fixed C1-C9/C11 input JSON before any expected answers or proposed spec/plan. Input SHA-256 ca4c88d6584ca46bd732632fabd63dcca7edf4998351cd39c653442c672ca97f, archived in the linked stocks evidence. No agent writes, external requests or extra review cohorts.

| Cases | Actual baseline | Actual candidate decision |
|---|---|---|
| C1/C2 | Cosmetic/semantic boundary partly implicit | Punctuation alone no renewed approval/cycle; glob asterisk, MUST→MAY and false availability substantive; actual provider runs count |
| C3 | Canonical P2/P3 disposition contradicted by command's any-finding recut | Reply/issue for real P2, explanation for preference, resolve; no forced second-round fix/recut or automatic merge |
| C4/C5 | Mandatory low-badge precedence and HIGH mapping incomplete | All P1/acceptance/security/integrity/capacity/fallback variants block without relabeling; HIGH=P1 retained; conflicts/missing labels and disputed acceptance owner-adjudicated; realistic user-visible P2 spec counterexample blocks |
| C6/C8 | No aggregate/split/cancellation carryover protocol | Two local+two external =4/4 aggregate,2/2 external spent; replacement retains EXERCISE-F1 P1; cancellation spent; split shares balance; unknown not zero; +1 aggregate grants zero unspecified external rounds |
| C7 | Correct missed/new classification, no stable-ID protocol | Actual missing-price defect remains missed after line2→4; zero-quantity defect new at introducing SHA; provenance/identity retained |
| C9 | Existing substantive approval distinction already works | done_when change renews approval; citation-only does not; merged contract requires approved supersession |
| C11 | Read-only task authority prevents B writes; general exclusion/handoff underspecified | B refuses before/after precheck; stale identity refuses; active writer prevents handoff; hashes expressly not atomic exclusion |

C7 participant executed both actual blobs: firstf7f894f32d94d13cd3da859c5144aee2b6dd395e yielded price(None)=0,qty(0)=0; later601ceafa7182b967a3b74d2c97461a4c7cfb57b7 yielded price(None)=0,qty(0)=None. Price is missed at the first SHA; quantity is new at the later SHA, neither uncounted. C11 shared bytes remained `writer=A` and `revision=1`, SHA-2562463990a1033a291449022d5de446779736a2046c8b07a85a23eb6ccd913426a. No positive handoff was forced.

HEAD-SOL-01 also found one residual command wording alternative: a generic bot review object could substitute for the timed CODE row, contrary to CLAUDE/template. The writer removed that alternative in the single correction batch; the command now expressly requires the authenticated current-head Code Review row after the latest trigger. This is a focused wording/control correction, not a new design, full-review restart or severity downgrade. Original participant results remain pinned to995213e.

## Mechanical evidence and limits

C10: Solyra does not contain stocks' generated-inventory renderer. The existing shared producer/verifier controls, committed fixture/input hashes and exact two-render output hashes are in the linked stocks evidence; no new local renderer or allowance is claimed. This mirror changes no renderer, gate, runtime source, workflow, timeout or test. C11's actual local-Git accepted designated-writer publication and rejected stale push, with preserved winning tip, are also linked unchanged; the new Solyra participant separately made actual read-only refusal decisions. Hash checks do not constitute locks.

Run the unchanged full gate suite and existing documentation-audit test suite locally, base/candidate gates on the same committed diff, and full default main/candidate audit with no new finding identities. Hosted types/unit/build and required checks remain independent requirements. Exact terminal outcomes are appended before publication or recorded on#287 without another source push.

Setup corrections retained: first plan gate rejected missing Spec/checklist syntax; corrected before plan commit, without design changes. First npm install could not create the environment's default cache; using a task-private cache succeeded without dependency changes. First audit-test invocation used Node's runner against Vitest tests; rerun with the repository's npm test command. Initial full audits could not fetch the canonical OpenAPI contract; this transport/setup failure is not a passing audit or a product assertion failure.

## Real release observations, not invented coverage

The owner authorized observing already-needed release PRs. The linked work is one change lineage, not four independent lineages and not a replacement-PR positive control. Observed: existing first-review receipts are retained; substantive local contradictions were corrected in a batch; real registry timeout blocks stocks#1583 despite clean code review; no timeout waiver, competing workflow writer, artificial PR or forced writer handoff. Dependency receipt: https://github.com/TeneikaAskew/stocks/pull/1586#issuecomment-6390122274 .

Retain the prospective ten-lineage protocol (at least three per repo, actual replacement and unmet-acceptance blocker coverage, exact heads/receipts, all aggregate/external/cancelled counts, elapsed times, dispositions and publication identities; zero lost findings, resets, unchecked blockers, unauthorized extensions or overwrites). Use only needed release work to gather it. Coverage remains incomplete and no durable or mechanically enforced review behavior is claimed from text tests or CI.

## Local regression receipts

Existing gate suite: `python -m pytest -q tests/scripts/test_spec_gate.py` —96 passed,1 warning in159.41s. Existing complete documentation-audit suite: `npm test -- scripts/docs-audit.test.mjs` —643 passed. No test or gate code changed. Gate tests ran from candidate995213e; subsequent correction changes the command's review-proof wording and records only, not executable test inputs.

The GitHub contract fetch succeeded using Node's `NODE_USE_ENV_PROXY=1` with the already-configured environment proxy and CA. No network configuration, TLS bypass, credential or repository dependency change. Full audits use that same transport environment and the unchanged default audit command. Package installation succeeded using a task-private npm cache; dependency manifests/lockfiles remain byte-identical.

Exact block comparison passed: Solyra review rules equal reviewed stocks after Rule3.7→Rule4 reference substitution; existing Lovable/header/insight and browser-proof sections are byte-identical to main.
