---
feat_id: FEAT-CICD-001
req_ids: [REQ-GOV-001, REQ-GOV-003, REQ-REL-001]
issues: []
canvases: []
done_when:
  - "tests/admin/admin-auth.spec.ts and tests/shared/navigation.spec.ts match the actual fifteen/sixteen sidebar links, five inline tabs and complete page title, while retaining admin exclusion, actual route and brand assertions"
  - "tests/insights-lovable/insights-lovable.spec.ts uses the existing real ticker chooser, exact Replay action and intent-specific S1 evidence interaction, preserving the actual research answer and final legacy-insights navigation"
  - "playwright.config.ts supplies a synthetic loopback Supabase URL and public placeholder only to its dedicated local test server; cloud projects, production settings and authentication remain unchanged, and the research action is fulfilled by the existing mock without a real endpoint request"
  - "The seven preserved untouched-MAIN failures pass with the four-file test-only repair; all affected browser tests, unit/types/build, contract check, branch/main docs audit, required current-head CODE/SEC and normal gates pass with screenshots and inherited review history"
status: approved
supersedes: null
---

# Restore the approved hermetic browser baseline

## Existing approval and sole writer

The owner explicitly approved the three-file baseline browser repair plus local
hermetic Playwright configuration in the consolidated October 26 finish bundle
(user Sentinel_b12daf6284248191b5a58a25f79a9b3c). The parent reiterated October 27
that this approved baseline must proceed independently of unrelated earnings backend
work. This is formal publication of that exact already-tested scope, not a request
to redesign the app, expand a financial contract or weaken checks.

The existing frontend root remains the sole writer. The preserved source is commit
b0ad04640e3a2ea18478e6a76d54dfc8b82fb77a on earnings PR289, whose other component,
contract and selected-ticker repairs remain separate. Inspect fresh MAIN and preserve
unrelated Design Lab work. Implement only after this specification reaches MAIN.

## Demonstrated failure and exact repair

Untouched Solyra MAIN and the hosted dashboard PR292 run40551437653 both exhibit
exactly seven failures: two sidebar-count assertions, top-nav count, document title,
and three research-screen cases (citation/research URL, ticker chooser and ambiguous
Replay action). Dashboard's own cases pass. Cache/earnings semantics are not the
cause of these baseline failures.

Change only:

- tests/admin/admin-auth.spec.ts: non-admin sidebar count fifteen; admin sixteen;
  preserve actual /admin absent/present assertions and other account checks.
- tests/shared/navigation.spec.ts: five inline tabs, existing dropdown route checks
  and the actual complete Solyra title. Do not remove branding or navigation checks.
- tests/insights-lovable/insights-lovable.spec.ts: drive the actual existing
  TickerCombobox through visible choices; mock its search/coverage operations; use
  exact Replay; open S1 from the specific asserted research fact and verify its
  evidence content. No .first() escape for an ambiguous citation; retain the
  returned answer, actual research mock and final /insights navigation assertions.
- playwright.config.ts: only the dedicated local webServer environment receives
  its own loopback __e2e_research__ URL and e2e-public-placeholder key. Preserve
  existing local API proxy, separate server/lock, cloud projects and sign-in rules.
  No real research project or credential, agent secret/dotenv inspection, research/provider endpoint call or auth weakening.

Normal own FEAT-CICD-001 catalog/plan/PR records are permitted. No application,
shared authentication, backend, API/schema, collector, workflow, gate, dependency,
source-proof verifier or protection change belongs here. No skipped tests, removed
assertions, hidden exceptions, widened timeouts, retries or fabricated pass.

## Sensitive acceptance and preserved evidence

Reuse the existing frozen seven-failure receipts and earlier positive 47-case
combined run; do not present an old candidate's pass as this release's acceptance.
On the actual test-only candidate run the three affected browser files, including
both admin states and the successful cited research action, plus normal checks.
Record screenshots and actual mock action=research/IWM, fulfilled NDJSON and S1
interaction. A private loopback endpoint must never become a cloud fallback.
All expected API responses remain synthetic, not live contract or provider proof.

Retain explicit negative controls: non-admin has no admin route; unanswered or
missing-citation content cannot pass; wrong ticker cannot satisfy the chooser;
cloud configuration is outside the local webServer environment. Tests must exercise
real app interaction rather than only mutating a store. The existing already-proven
local mock route supplies research output; no new scoring or vendor data is needed.

## Lineage, budgets and delivery

This is the pre-existing shared test-harness defect scope, not a replacement or
re-cut of earnings UI289. Preserve its provenance: the approved four-file patch
was authored in mixed local commit b0ad046, but those four files are byte-identical
between the actual reviewed UI head23c5145d and its MAIN1dbea0bb baseline. Neither
that CODE review nor spec288 reviewed the baseline patch. The test-only design does
not inherit or dispose of the two EarningsHistory P2 findings. PR289's two approved
additional coordinated/CODE rounds remain untouched, including its known prior
CODE history and possible duplicate uncertainty.

Maintain a baseline-specific ledger anchored to the seven untouched-MAIN failures,
the prior read-only classifier and hermetic diagnostic, and b0ad046's exact patch.
Preserve all that work rather than assert zero historical effort. Conservatively
record one prior diagnostic judgment cohort; deterministic test executions are not
judgment passes under AGENTS.md. No external CODE review of this baseline patch has
occurred. Under the active four-aggregate/two-external ordinary limit, reserve the
normal spec CODE/SEC cohort next, then the test-only CODE cohort, without a budget
transfer or reset. An actual additional failed/restarted review consumes allowance;
report it rather than inventing more. A diagnostic identity not available in the
handoff stays unknown; it is not a clean review or an invented completion.

The implementation uses a legal matching ready plan/branch from MAIN only after
this spec merges. Do not stack on unmerged289, rewrite history, change its plan
binding, or move its application code here. Only the four approved test/config paths
and own normal publication records are in scope. Before merge all normal required
reviews/checks and own acceptance remain required. Once merged, bring current MAIN
into the existing292/293/289 branches with ordinary merge commits, preserving all
Lovable history; do not rebase or force-push published branches. This shared harness
repair does not by itself qualify or deploy the separate frontend/backend features.

Capacity: n/a: local/CI synthetic browser tests only; no new GCP/provider/storage
workload, background polling, production credentials, refresh or deployment.
