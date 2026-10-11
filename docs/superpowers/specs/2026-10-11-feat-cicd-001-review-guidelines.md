---
feat_id: FEAT-CICD-001
req_ids: [REQ-GOV-001, REQ-GOV-003]
issues: []
canvases: []
done_when:
  - "The root AGENTS.md of this repository (solyra) has a '## Review guidelines' section that says: a reviewer's first review of a pull request is the complete one; it reads every changed file in full, generated files included, and the direct callers and callees of what changed, and where a changed file's generator runs in the reviewer's environment it re-runs it and compares; it posts, against the revision it reviews, every finding it can raise on a defect the pull request introduces or makes worse, at every severity, with one finding per defect class listing each location; it checks the edges a change creates (errors and rejections, late or out-of-order responses, signed-out and other-account states, empty and null data, and the docs, tests and generated files that cite what changed); a spec PR is reviewed against the code it will change, and each done_when item that describes behavior must fail against a broken implementation; a later review by the same reviewer checks its earlier findings, then the new commits, and still posts a defect it finds in what its first review covered, for the author to classify under CLAUDE.md Rule 2.5; a problem the pull request neither introduces nor makes worse is not posted as a finding (a reviewer who can open an issue may open one); and a change a user can see in the site carries Playwright evidence from a run that exercises the changed code: solyra's hermetic suite for a solyra change; for a stocks change, an API test of the changed response in the PR, while runs against the deployed site before the merge and once staging has deployed it are close-out steps the owner posts on the PR, not boxes the PR ticks; with screenshots of the state each run shows, described state by state in a PR comment and kept in the e2e run's playwright-report artifact (saved under test-results/, kept 7 days) or sent to the owner; the reviewer asks for the hermetic run or the API test when the PR lacks it"
  - "The lines of AGENTS.md from `<!-- LOVABLE:BEGIN -->` to `<!-- LOVABLE:END -->` are unchanged, and the new section sits below `<!-- LOVABLE:END -->`"
  - "CLAUDE.md Rule 2.5 says a thread holding a finding that a reviewer posted after its own first review is not resolved until a reply on it classifies each location, taking the first class that applies: uncounted (not a defect, a defect the pull request neither introduces nor makes worse, or one that first review raised there), missed (the pull request had introduced or worsened it by the commit that first review covered, named by SHA), or new (a later commit introduced or worsened it, named by SHA); it defines a reviewer and a first review as REQ-GOV-003 does; it says a first review that posts no findings leaves no review object, that the commit it covered is the one Codex's review-summary comment shows for that review type when that row first reads Completed, and that the author records that SHA in a PR comment then, since the next run replaces the row; and it tells a reviewer of a pull request to follow AGENTS.md's '## Review guidelines'"
  - ".github/pull_request_template.md's Merge gate and .claude/commands/resolve-issue.md's Phase 8 ask for the classifying reply on each later finding before its thread is resolved, and Phase 8 replaces its 'No round limit' with the two-round review cap: after a PR's second review round, stop and split, re-cut or discard it, as CLAUDE.md and the product-delivery skill say"
  - "CLAUDE.md's Testing discipline has an item saying a change a user can see in the site is proven with a Playwright run of the hermetic suite in tests/ that exercises it, with screenshots of the state before and after the change, and, when it depends on a stocks API change, a *.cloud.spec.ts written for that change that the owner runs with npm run e2e:cloud against the deployed site once staging has deployed it and posts on the PR as a close-out step"
  - ".claude/agents/debug-local.md's Verify step says a bug a user sees in the site is verified with a Playwright run that reproduces it before the fix and passes after it, with screenshots of both: solyra's hermetic suite for a solyra bug; a bug whose fix belongs in stocks is handed to stocks, as this agent's scope says"
  - "playwright.screens.config.ts, the screenshot runner, loads: npx playwright test --config=playwright.screens.config.ts --list lists the suite instead of failing with `Project 'chromium' depends on unknown project 'warmup'`"
  - "tests/auth.setup.ts loads: npx playwright test --project=iap-setup --list lists the setup instead of failing with `__dirname is not defined in ES module scope`"
  - "CLAUDE.md, playwright.config.ts, vite.config.ts and tests/shared/gamma-levels.spec.ts describe solyra-api-staging as the only API service: git grep -n solyra-api-prod -- CLAUDE.md AGENTS.md .claude .github playwright.config.ts vite.config.ts tests/shared prints only lines that say it was retired"
  - "python3 scripts/gate/spec_gate.py --pr origin/main passes on the PR head; docs/DOC_REGISTRY.md classes `docs/superpowers/**/*.md` as C; and node scripts/docs-audit.mjs reports nothing new over origin/main"
  - "02-FEATURE-CATALOG FEAT-CICD-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Ask reviewers for the complete review in the first round, and for browser proof of a visible change

## Problem

Every PR here gets at most two review rounds (CLAUDE.md, "Review cap"); after that it is split,
re-cut or discarded. An approved spec cannot change in place either: the commit-time gate refuses
any edit to a spec committed as `approved`, so each revision of a spec PR is a new PR cut from
`main`. Codex's code review also runs when new commits reach a PR open for review, so each fix pushed
is a round.

Codex has been finding new issues in every round rather than all of them in the first. Between
2026-10-10 22:46 and 2026-10-11 00:25 UTC the solyra verify-email spec went through six cuts
(#231, #232, #233, #235, #237, #239). The first reviews of cuts two to five (#232, #233, #235, #237) raised four, three, four and five findings, and #239 passed with none; most were further instances of one class
(state that survives a switch of the signed-in account) found one at a time. The stocks retire-prod spec
took two cuts (stocks#1363, stocks#1364). Each cut costs a PR, a CI run and a review wait.

Codex reads review instructions from a `## Review guidelines` section in `AGENTS.md`. Neither
repository's `AGENTS.md` has one, so reviewers get no guidance on depth or on reporting a class of
finding at once. REQ-GOV-003 (stocks#1368, re-cut as stocks#1371) now requires that section in both repositories, and a reply that
classifies each later finding so misses can be counted. Its Enforced-by column plans both: the section
under FEAT-CICD-001, and the reply in CLAUDE.md Rule 2.5.

This re-cuts #240, written before REQ-GOV-003 settled. It had the reviewer mark its own misses,
and sent pre-existing problems to a new issue or a comment labelled pre-existing, neither of which Codex's
review can produce.

## Non-goals

- No change to the review cap, the gate, or the spec rules. The guidance makes the first round
  fuller; it does not add rounds.
- Not Codex's own settings (which events trigger a review), which live outside the repository.
- No mechanical check of the classifying reply. A check that reads review threads would be its own change.
- Not REQ-GOV-003's Enforced-by column, which lives in stocks' `01-PRODUCT-REQUIREMENTS.md` and moves
  on a stocks `docs/` PR after both implementations merge.
- Not the other repository. This spec covers solyra's files; stocks' own spec (re-cutting stocks#1367) covers the other one,
  with its own plan and PR, because each repository's gate only sees its own files.

## Approaches considered

1. Raise the round cap. Rejected: more rounds is the cost being reduced, not the fix.
2. Put the guidance in a separate `REVIEW.md`. Rejected: `AGENTS.md` is the file Codex reads, and
   CLAUDE.md, which Claude Code loads, can point reviewers to it.
3. A `## Review guidelines` section in `AGENTS.md` for reviewers, and the classifying reply in
   CLAUDE.md Rule 2.5 for authors, in both repositories, each under its own spec. Chosen.

Chosen on 2026-10-11 at the owner's request: "when doing a code review it needs to be the most
exhaustive as possible in the first round", and later the same day, that Playwright is "an evidence path
of proof it's fixed" in review and debugging. REQ-GOV-003 states the first as a requirement; the second
applies REQ-GOV-001's reproduction rule to a change a user can see.

## Design

- **Review guidelines (`AGENTS.md`).** The root `AGENTS.md` gains a `## Review guidelines` section after
  its existing content, addressed to every reviewer (Codex, Claude, a person):
  - *The first review is the complete one.* Why (the cap, the in-place rule and per-push reviews make
    a held-back finding cost a round or a whole PR), then what to do before posting: read every changed
    file in full, generated files included, and the direct callers and callees of what changed; where a
    file's generator runs in the reviewer's environment, re-run it and compare; post every finding on a
    defect the PR introduces or makes worse, at every severity, at once; when a finding is one instance of
    a class, search for every instance and post the class once with each location; check the edges a
    change creates (errors and rejections, late or out-of-order responses, signed-out and other-account
    states, empty and null data under the repository's no-silent-fallbacks rule (Rule 4), and the docs,
    tests and generated files that cite what changed); for a spec PR, open each file the spec names, check
    every `done_when` item can be met, and check that each item describing behavior would fail against a
    broken implementation. Items that record delivery (the gate, the docs audit, the catalog row) are only
    checked for being met.
  - *Later reviews.* A reviewer's later review checks its earlier findings, then the new commits, and
    still posts a defect it finds in what its first review covered, for the author to classify.
  - *Not this PR's problems.* A problem the PR neither introduces nor makes worse is not posted as a
    finding, since every thread holds the merge (REQ-GOV-001). A reviewer who can open an issue may open
    one.
  - *Browser proof.* A change a user can see in the site carries Playwright evidence from a run that
    exercises the changed code. solyra's hermetic suite covers a solyra change; it intercepts every
    `/api` call, so for a stocks change the proof in the PR is an API test of the changed response.
    Runs against the deployed site, one before the merge and one once staging has deployed it, are
    close-out steps the owner posts on the PR, not boxes the PR ticks: staging's trigger deploys from
    `main`, deploying a branch with `platform/deploy.sh` would put unreviewed code behind the live site,
    and the deployed site's sign-in is interactive (`npm run e2e:cloud:auth` runs headed). Screenshots of the
    state each run shows are described state by state in a PR comment and kept in the e2e run's
    `playwright-report` artifact (saved under `test-results/`, kept 7 days) or sent to the owner, since
    images cannot be attached to a PR from a Claude Code session.
    The reviewer asks for the hermetic run or the API test when the PR lacks it.

- **The Lovable fence (solyra `AGENTS.md`).** `docs/DOC_REGISTRY.md` classes `AGENTS.md` as D with
  `fence:LOVABLE` and says a Lovable regeneration is merged into the file, never applied over it, keeping
  every line outside the fence. The new section goes below `<!-- LOVABLE:END -->`, and the fenced block
  is not edited.

- **The classifying reply (CLAUDE.md Rule 2.5).** The author's side of REQ-GOV-003, in its words: a
  thread holding a finding that a reviewer posted after its own first review is not resolved until a
  reply classifies each location, taking the first class that applies: uncounted, missed (with the SHA
  of the commit the first review covered) or new (with the SHA of the later commit). A reviewer is one
  account, split by review type where one account runs separately triggered types; its first review is
  the earliest it completes, including one with no findings. A clean first review leaves no review
  object, and Codex's review-summary comment shows only the latest run per type, so the author records
  that SHA in a PR comment when the row first reads Completed. Rule 2.5 also tells a reviewer to follow
  `AGENTS.md`'s `## Review guidelines`, since Claude Code loads CLAUDE.md and not `AGENTS.md`.

- **The merge gates (`.github/pull_request_template.md`, `.claude/commands/resolve-issue.md` Phase 8).**
  Both ask for the classifying reply on each later finding before its thread is resolved. Phase 8 also
  loses its "No round limit" for the two-round review cap CLAUDE.md and the product-delivery skill already
  set.
- **The screenshot runner (`playwright.screens.config.ts`).** It keeps only the `chromium` project, which
  depends on `warmup`, so Playwright refuses to load it ("Project 'chromium' depends on unknown project
  'warmup'", run 2026-10-11). The change keeps `warmup` beside `chromium`, with `screenshot: 'on'` on
  `chromium` only, so it loads; it also corrects the header's `PLAYWRIGHT_START_VITE=1` instruction,
  which nothing reads.
- **The deployed-site sign-in (`tests/auth.setup.ts`).** Line 35 uses `__dirname`, which an ES module
  (`"type": "module"` in `package.json`) does not define, so loading it fails (`--project=iap-setup --list`
  and a bare `--list` both exit 1, run 2026-10-11). It derives the directory from `import.meta.url`
  instead, so `npm run e2e:cloud:auth`, which the close-out runs need, works again.
- **The docs registry (`docs/DOC_REGISTRY.md`).** It gains a row classing `docs/superpowers/**/*.md` as
  C (dated records), as stocks' registry classes its plans and specs, so a new plan or spec adds no audit
  finding. The glob is `**/*.md` because solyra's `globToRe` keeps `*` inside one path segment: a
  `docs/superpowers/*` row matches no file and is itself a finding.

- **Evidence rules (`CLAUDE.md`).** Testing discipline gains a fifth item: a change the site shows is proven with the hermetic suite run that
  exercises it, with before and after screenshots. When it depends on a stocks change, a `*.cloud.spec.ts`
  written for that change is run by the owner with `npm run e2e:cloud` once staging has deployed it, as a
  close-out step: the Testing table says no cloud spec exists yet, and this is what the first one is for.
- **The retired service (`CLAUDE.md` and three config and test comments).** `solyra-api-prod` was deleted
  on 2026-10-10 (stocks#1366), but CLAUDE.md's overview and Backend row, and comments in
  `playwright.config.ts`, `vite.config.ts` and `tests/shared/gamma-levels.spec.ts`, still describe it as
  live. CLAUDE.md is a process file, so it changes under FEAT-CICD-001 here, with the comments beside it.
  The vendored OpenAPI copy and its generated types follow stocks through `npm run contract:sync`.
- **Debugging (`.claude/agents/debug-local.md`, Step 4 Verify).** A bug a user sees is verified with a
  Playwright run that reproduces it before the fix and passes after, with screenshots of both. This is
  REQ-GOV-001's "reproduced against pre-fix code before a fix is written", carried into the browser.

The guideline text and Rule 2.5's classifying-reply text are the same in both repositories except the
no-silent-fallbacks rule's number (stocks Rule 3.7, solyra Rule 4).

Capacity: n/a. No workload runs differently.

## Risks

- A longer first review. That is the trade wanted: one long review instead of several short ones.
- Reviewers may ignore it. Nothing enforces the guidelines; the missed count is the signal, and it is
  a lower bound, since a miss that no later review raises is never counted.
- An extra reply per later finding, and a comment recording a clean first review's SHA. Each is one line.
- Chromium may not run in a given session. The PR then says so and cites the CI e2e run instead. A
  deployed-site run signs in interactively, so it is the owner's close-out step either way.
- A Lovable regeneration applied over `AGENTS.md` instead of merged into it would drop the section, and
  nothing detects that. `docs/DOC_REGISTRY.md`'s fence rule is the guard.
