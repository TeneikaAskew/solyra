---
feat_id: FEAT-CICD-001
req_ids: [REQ-GOV-001, REQ-GOV-003, REQ-GOV-004]
issues: []
canvases: []
done_when:
  - "S1: pinned baseline/proposed instruction exercises C1-C9 produce consistent blocking, disposition, semantic approval and lineage-budget decisions across all six Solyra policy surfaces"
  - "S2: C10-C11 record exact generated evidence identities and accepted/refused single-writer controls without claiming hashes are atomic locks"
  - "S3: unchanged base/head spec gates, affected existing suites and full documentation audits pass with no new finding identities; FEAT-CICD-001 records the draft implementation PR"
  - "S4: the evidence links stocks#1577 and stocks#1583 without resetting history and separates local instruction exercises from the prospective ten-lineage live observation protocol"
status: draft
supersedes: null
---

# Match the approved stocks agent-review alignment

## Authority, scope and current evidence

This is a reviewable specification proposal, not active policy. Solyra written-spec approval,
specification merge and reviewed implementation plan remain prerequisites to its own draft
implementation. No merge, deployment, production write, external Claude contact or automatic
issue closure is authorized here. Current Solyra instructions govern until implementation lands.

The owner authorized matching Solyra requirements as part of the stocks alignment. The binding
upstream design is stocks spec PR [#1577](https://github.com/TeneikaAskew/stocks/pull/1577),
merged at `641a93b96e4f7fccab9f57e1be9adf3a221dbc55`; its draft implementation is
[stocks#1583](https://github.com/TeneikaAskew/stocks/pull/1583). This proposal shares that root:
all known prior reviews and unknown historical effort must remain linked. Neither a new repo,
specification stage nor PR number grants a new balance. Existing policy governs delivery;
owner adjudication reconciles unknown history before asserting allowance upon adoption.

Inspected Solyra main: `f0aaf422fcfaf0b2bcadc129f8454c4714318224`. No `.agents/skills`
directory is present. The delivery skill, AGENTS.md, CLAUDE.md and resolve-issue command still
use per-PR two-round/re-cut instructions; command lines 859–863 force re-cut for any second-round
finding. The already-existing substantive-spec-approval distinction must be preserved.
FEAT-CICD-001 owns CI/testing and build/test/deploy automation (catalog row currently
“Production but needs remediation”). No matching open alignment PR existed at intake.

Change only AGENTS.md, CLAUDE.md, .claude/commands/resolve-issue.md,
.claude/skills/product-delivery/SKILL.md, .claude/agents/code-reviewer.md and
.github/pull_request_template.md, plus owning catalog and evidence/plan records. Preserve the
Lovable header and published-history restrictions, Rule 4's no-silent-financial-fallback
contract, browser/API proof distinction and Solyra hermetic browser requirements. Do not copy
stocks Rule 3.7 numbering into Solyra. No application, workflow, fixture, generated-inventory
allowance or documentation-architecture changes belong here.

## Design requirements

The following design is carried from the approved stocks specification. Repository-specific
references apply to the corresponding Solyra surface; existing renderer capabilities are
preserved, not invented where Solyra does not provide them.

### One blocking and disposition rule

Apply the following precedence everywhere, including the spec counterexample rule:

1. Unmet required acceptance, failed required checks, missing current-head review,
   unresolved required conversations, security or data-integrity defects, forbidden
   fallbacks and mandatory capacity/performance failures block progression regardless
   of badge. A spec counterexample showing a realistic user-visible defect blocks.
   A missing proof is not proof of correctness. Delivery checks remain required.
2. P0/P1 findings block until fixed and verified. The spec-counterexample exception
   cannot excuse a P0/P1 or a requirement in item 1. This deliberately resolves the
   current D2/D3 ambiguity and requires owner approval before taking effect.
3. Other P2/P3 findings may be dispositioned by a reasoned thread reply, linking a
   tracked issue for a real deferred defect, then resolving the thread. This is not
   automatic merge permission. All normal merge prerequisites remain necessary.
   Cosmetic preference is recorded as such without manufacturing a defect issue.
4. Ambiguous severity, disputed classification, unknown required-check status or
   disputed acceptance goes to the owner and remains pending; an agent cannot
   silently downgrade a finding. Preserve original severity and text in the record.

Proposed vocabulary mapping: CRITICAL=P0, HIGH=P1, MEDIUM=P2, LOW=P3. Preserve
reviewer account/type, original label and normalized label. An absent, conflicting
or unmapped label requires adjudication; mapping is not permission to change
severity. Only the owner may change reviewer severity with recorded rationale.

An ordinary punctuation preference neither invalidates semantic approval nor
requires another review cycle by itself. Asterisks in executable globs, operators,
requirements, examples used as commands, or changed emphasis that changes a promise
are potentially semantic. Misleading documentation is a defect, not a preference.
If a cosmetic commit nevertheless triggers an external run, record that actual
cost; do not pretend the provider did no work or waive current-head requirements.

### Complete initial review, focused verification and stable identity

The initial review reads all changed files and direct callers/callees, includes
reproducible generated-output comparison, checks boundary cases and posts all
known defect classes/locations together. Retain REQ-GOV-003 per-reviewer/type first
review identity and uncounted/missed/new classification with immutable SHAs.

Later work verifies prior fixes plus changed semantics and affected dependencies.
Newly discovered genuine defects are always reported and classified, never suppressed
by a budget. Unchanged cosmetic preferences do not restart a full review. A missed
first-review defect retains its original provenance, including across replacement PRs.

The single writer maintains a review ledger in the PR body or linked immutable
review artifact: lineage ID, root and replacement PR URLs, approved spec path/blob,
reviewed base/head, pass IDs, reviewer account/type, run URLs/status, findings,
dispositions, owner decisions and spent/remaining budget. A finding ID is assigned
once per defect class within that lineage; retain all original thread URLs and
location/commit history. Do not derive identity from mutable line numbers or prose.
Re-cut/split children inherit all spent passes and the applicable findings; the
parent remains linked. Duplicate observations append evidence, not new identities.
Uncertain duplication is owner-adjudicated without erasing either finding.

### Proposed aggregate effort limit and escalation

Owner decision proposed: four coordinated review passes per lineage, at most two
external PR code-review rounds, including pre-push review work in the total.
A pass is one declared review cohort against one immutable head with one complete
review or focused-verification objective. Parallel attack-surface reviewers belong
to one pass only if declared together before starting; record every reviewer/run.
New head, newly commissioned cohort, repeated pre-push red-team attempt or restarted
interrupted attempt consumes another pass. Reserve the pass before work starts;
a failed or cancelled pass still consumes it. Run status never invents completion.
Required security/specialist reviews cannot be omitted to conserve the budget.
Routine deterministic tests/gates are recorded but do not consume judgment passes.

The budget covers the entire lineage, not each PR or agent. Split descendants do
not each receive fresh balances. Closing, renaming, replacing, switching reviewer,
or moving from local pre-push to GitHub does not reset it. A ledger unavailable or
inconsistent with observed history causes a hold for reconciliation, not a zero.
Initial ledger seeding must include known prior review effort and mark unknowns;
legacy lineages need owner adjudication before a remaining allowance is asserted.

At the limit: stop autonomous fixes/review requests/pushes likely to initiate review.
Present unresolved findings and unmet requirements with exact head, reproductions,
remaining acceptance, budget history and options: bounded explicit extension,
rescope through approved spec, or stop. Owner chooses; no automatic re-cut or pass.
An extension records reason, exact additional aggregate pass count and scope,
and separately states whether and by how many rounds the external limit increases.
Without that explicit external allowance the two-external-round limit still holds. A real defect
remains blocked until corrected and reviewed even when an extension is granted.
Current external review and CI prerequisites cannot be replaced with local review.
Do not request an extension automatically through repeated retries.

### Generated evidence and shared-file ownership

Use the existing trusted renderer/source-snapshot protocols without new allowances.
For each refresh record repository, policy/base/source commit IDs, generator blob
identity, exact invocation, input hashes, and SHA-256 hashes of every output. Compare
complete bytes from committed source and merge-base prose; preserve marker/non-owned
bytes. Re-run on the exact final head. Hash agreement proves identity, not deployment,
data freshness or external review. Any input/source change invalidates the old proof.

One named writer exclusively publishes to the branch and shared output set. Other
agents read only and return findings; they have no delegated publication authority.
Every participant checks the recorded writer identity before any shared write. An
unauthorized second writer must refuse before installing any bytes. Use isolated worktrees and writer-private output directories.
Before publishing, compare the expected branch head and every shared output hash;
if any differs, refuse publication, preserve the other writer's bytes and reconcile.
Use non-forced branch publication; a non-fast-forward rejection is a collision, not
permission to overwrite. An ownership handoff requires the prior writer to stop and confirm quiescence,
then explicit owner acknowledgment of the old/new writer and expected head/hashes
before the new writer proceeds. If quiescence cannot be established, publication
stays blocked. Shared-evidence output paths are not parallel workers' scratch space.
Hash prechecks detect stale inputs but are not atomic file compare-and-swap and do
not themselves exclude a race. This protocol depends on all participants honoring
exclusive publication; an uncontrolled concurrent writer blocks the task until
isolation is restored. No new lock service or mechanical exclusion is claimed.

### Required policy surfaces and cross-repository boundary

Future implementation must reconcile, not replace wholesale, these surfaces in each
repository: AGENTS.md review guidelines; CLAUDE.md review cap, pre-push gate review
and Rule 2.5; `.claude/commands/resolve-issue.md` second-round and downstream close-out
instructions; `.claude/skills/product-delivery/SKILL.md` Phases 2/4/5;
`.claude/agents/code-reviewer.md` severity/output rules; and
`.github/pull_request_template.md` review/merge checklist. Search other references to
these rules for contradictory instructions; replace the ambiguous AGENTS.md
"Before it posts" pronoun with an explicit reviewer subject (#1511). Preserve Solyra's LOVABLE header and
no-history-rewrite restrictions, repository-specific no-fallback rule numbering,
browser/API proof and its hermetic e2e requirements.

Stocks owns canonical requirements; this proposal changes no requirement definition.
If implementation needs to change one, stop for a separately approved requirements
change rather than widening this branch. Solyra must carry the same decisions and
scenario IDs through its own draft/approved spec, plan, catalog and PR. Do not copy
stocks-only inventory or backend evidence machinery into Solyra. Link independently
reviewed repository heads in the eventual acceptance record; a stocks pass cannot
certify Solyra. Active policy rollout awaits approval in both repositories.


## Local acceptance and implementation sequencing

Use the exact C1-C11 input classes and immutable-history exercises from the
[upstream specification](https://github.com/TeneikaAskew/stocks/blob/641a93b96e4f7fccab9f57e1be9adf3a221dbc55/docs/superpowers/specs/2026-10-24-feat-cicd-001-review-alignment.md).
Before showing expected decisions, obtain read-only baseline and proposed-policy participant
answers, with one writer publishing results. C1 punctuation needs no new semantic cycle;
C2 changed executable asterisk/requirement/misleading docs is substantive; C3 otherwise
nonblocking P2/P3-only second round uses disposition without forced re-cut; C4 P1 or unmet
acceptance/security/integrity/capacity/no-fallback blocks; C5 label conflicts remain owner
adjudication; C6 replacements retain all effort/findings; C7 missed/new classification uses
actual immutable SHAs; C8 cancellations/splits/unknown history cannot manufacture allowance;
C9 substantive approved-spec changes renew approval and merged contracts require supersession.

For C10 reuse applicable existing Solyra gate/generated-evidence tests, recording exact inputs,
commands, hashes and accepted/refused boundaries. Do not import stocks-only renderer tests or
claim Solyra has their controls. Cross-repo shared evidence links the actual stocks C10 results
and states this limitation. C11 includes an uncontended designated-writer publication, actual
read-only B refusals before/after precheck, and isolated local Git non-fast-forward refusal
preserving the winning tip. Stale hashes or active-writer handoff cannot pass; no real handoff
without owner acknowledgment. Never exercise collisions against a production remote.

After approval and spec merge, write/review a Solyra implementation plan before code edits.
Run unchanged base/head spec gate, affected regression suites, full `node scripts/docs-audit.mjs`
on both revisions and compare complete finding identities, permitting zero new findings.
Record only FEAT-CICD-001 catalog changes/PR reference. Keep implementation draft pending
cross-repository acceptance and required review; neither current document CI nor local
participant decisions establish durable process behavior.

## Prospective live observation

After separately authorized adoption, observe ten real change lineages with at least three
from each repository, including an actual replacement and unmet-acceptance blocker. Record
immutable heads, review-type receipts, first/full versus targeted scope, stable finding IDs,
all reserved/completed/cancelled passes, aggregate/external totals, elapsed time, owner
escalations and single-writer publication evidence. Required outcome: zero lost findings,
zero budget resets, zero unchecked blockers, zero unapproved extensions and zero overwrites.
Report missing coverage and any failure; do not claim durability until the owner-approved
protocol and its exit criteria are actually satisfied. This draft proposes that protocol;
no live observation is claimed complete.
