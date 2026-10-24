---
feat_id: FEAT-CICD-001
spec: docs/superpowers/specs/2026-10-24-feat-cicd-001-review-alignment.md
branch: feature/feat-cicd-001-review-alignment
pr: 287
status: ready
---

# Solyra agent-review alignment implementation plan

> Use superpowers:executing-plans with one writer and read-only acceptance. Reuse the reviewed stocks plan at98f76a762cb6ec61e87b604d3d84e9ffc6264c46; this is its repository-specific execution record, not a new design or approval cycle.

**Goal:** Mirror the reviewed stocks policy at8f2aafe4c6d26152b89663453bfd7821ada1b5f0 while preserving Solyra safeguards.
**Architecture:** Six existing instruction surfaces, dated evidence and owning catalog record; no automated review controller, runtime changes or new allowance.
**Tech Stack:** Markdown, existing Python gate tests, Node documentation audits and normal hosted CI.

## Authority and interfaces

Solyra spec#286 merged ataafdc9d395744805ca88431efc4d6706d41c5e2c. The owner authorized the existing design/plan, necessary Codex reviews and conditional merges in the bounded finish (userSentinel_314cdf4cfde8819183c963502f76acbb, confirmedSentinel_ec7949686db08191a3818ce255a4c9b7). No further planning-approval hold within this scope. Rootstocks#1577→stocks#1583→solyra#286 and this implementation remains one history, not a budget reset. Existing repository policy governs delivery until its implementation lands; unknown legacy effort stays unknown, never a fresh allowance.

One writer `/root` publishes. Preserve the Lovable header and no-rewritten-history rule, Rule4, hermetic browser/API proof, REQ-GOV-003 per-account/type/per-PR complete first review and immutable provenance. Later verification is focused; mandatory acceptance/security/integrity/capacity/no-fallback/current-head checks block regardless of badge. Only owner adjudicates disputed severity/acceptance. Four aggregate passes/two external rounds are the target policy, not permission to erase prior effort. No workflow, timeout, test weakening, API, fixture, IAM, credential or deployment changes.

## Task 1: source identity and baseline (S1,S4; spec Authority/Design)

Spec: § Design requirements and Local acceptance and implementation sequencing. Advances the S-items named above.

- [ ] Record actual main/spec/policy identities, fixed input digest, prior review receipts and BASE-SOL-01 decisions before editing policy.
- [ ] Use the same C1-C9/C11 inputs already exercised in stocks. A read-only participant sees current instructions before expected answers.
- [ ] Preserve all known original/external/internal effort and unknowns. No invented PR or forced handoff for observation.
- [ ] Commit this repository-specific plan before policy edits.
Expected: plan-only gate passes; baseline exposes the second-round recut/severity/lineage gaps, not invented executable failures.

## Task 2: mirror six policy surfaces (S1; spec Design requirements)

Spec: § Design requirements and Local acceptance and implementation sequencing. Advances the S-items named above.

Files: AGENTS.md, CLAUDE.md, .claude/commands/resolve-issue.md, .claude/skills/product-delivery/SKILL.md, .claude/agents/code-reviewer.md, .github/pull_request_template.md.

- [ ] Reuse stocks' reviewed canonical review block, changing only Solyra Rule4 references; preserve local header, insight rule and browser section.
- [ ] Align cap/prepush accounting, disposition before any fix, exact numerical owner extensions and disputed-acceptance holds. Preserve current-head authenticated CODE and first-type receipts.
- [ ] Retain full first review per PR and stable lineage findings; replacement/split histories share effort. Later checks cover fixes/new semantics; no cosmetic recut or automatic pass.
- [ ] Preserve existing substantive-spec reapproval and all unaffected repository instructions.
- [ ] Commit one candidate, then HEAD-SOL-01 runs the same fixed inputs on that immutable candidate. Fix only substantive contradictions in one batch; GitHub Codex is the fresh whole-branch review at publication.
Expected: C1-C9 decisions agree with stocks; mandatory blockers and original severity retained. Instruction-compliance evidence is not mechanical enforcement.

## Task 3: evidence and unchanged regression controls (S2,S3)

Spec: § Design requirements and Local acceptance and implementation sequencing. Advances the S-items named above.

Files: docs/superpowers/evidence/2026-10-24-agent-review-alignment.md; owning FEAT-CICD-001 catalog row only.

- [ ] Link actual stocks C10 renderer output/input hashes and C11 accepted non-force publication/stale-push refusal; no Solyra-only renderer is invented.
- [ ] Record Solyra participant B's actual read-only refusals and unchanged hash. No forced positive handoff; owner acknowledgment remains required for a real handoff.
- [ ] Run complete existing tests/scripts/test_spec_gate.py and scripts/docs-audit.test.mjs; preserve tests and native controls. Run normal hosted type/unit/build checks; no UI code changes require new screenshots/e2e runs.
- [ ] Run unchanged base and candidate spec gates against the same actual diff and full default node scripts/docs-audit.mjs on actual base/head; compare finding identities with no new findings.
Expected: suites/gates pass; no new audit findings; exact source identities and unrun limits remain explicit.

## Task 4: publication and observation (S3,S4)

Spec: § Design requirements and Local acceptance and implementation sequencing. Advances the S-items named above.

- [ ] Open one draft implementation, set plan PR and owning catalog PRs/date/status, copy S1-S4 acceptance into body with honest evidence. Mark ready only with completed acceptance/current-head checks; capture authenticated code/security review identities and resolve real findings under the existing limit.
- [ ] Merge only with authorization, required checks/review and expected-head guard. No force push, bypass, unrelated deployment or issue closure.
- [ ] Preserve stocks dependency on fixture owner's#1586 envelope work; never create a competing workflow writer or loop known timeout retries.
- [ ] Observe the already-needed release PRs. Keep the approved prospective ten-lineage protocol (at least three each repo plus actual replacement/acceptance blocker coverage); report incomplete coverage instead of claiming durability. No synthetic PRs or forced handoffs.
Expected: exact review/merge/check receipts and explicit remaining dependencies; no new planning gate or claim of proven live durability.
