---
feat_id: FEAT-CICD-001
req_ids: [REQ-DEPLOY-001]
issues: []
canvases: []
done_when:
  - ".github/workflows/e2e.yml exists, carries the e2e job moved from ci.yml unchanged in its steps, with paths-ignore: ['docs/**', '**/*.md'] under both pull_request and push; ci.yml keeps the types · unit · build job with no paths filter"
  - "actionlint .github/workflows/ci.yml .github/workflows/e2e.yml reports nothing"
  - "both types · unit · build and e2e ran and passed on the implementation PR, which changes workflow files and not a doc"
  - "02-FEATURE-CATALOG FEAT-CICD-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Skip the e2e job on docs-only pull requests

## Problem

A markdown-only pull request runs the full CI workflow: `types · unit · build` (about
two minutes) and `e2e (chromium, mocked)` (about eight minutes). Solyra #80, a two-line
edit to `docs/solyra-landing-page-plan.md`, spent ten CI minutes this way on
2026-09-29.

The two jobs differ in what they read. The unit suite consumes documentation:
`vite.config.ts:114` includes `scripts/**/*.test.mjs` in `npm test`, and
`scripts/docs-audit.test.mjs` reads the shipped `docs/DOC_REGISTRY.md` (line 822) and
`README.md` (line 2684) from disk and asserts their contents. A docs-only PR can
therefore fail `npm test`, so that job must run on every PR. The e2e suite consumes no
documentation: `playwright.config.ts`, `scripts/e2e-server.mjs` and every file under
`tests/` read nothing under `docs/` and no `.md` file (checked with grep on
2026-09-30; the launcher reads `/proc` and its own lockfile, and the one `.md` string
in `tests/reports/reports.spec.ts` is a mocked API value shown on a page).

The three gate contexts (`spec-gate / gate`, `spec-gate / base-suite`,
`registry-check / registry`) keep running on every PR, because judging docs branches
is part of the gate's job.

## Non-goals

- No change to the gate workflows `spec-gate.yml` and `registry-check.yml`; they are
  pinned and run on everything.
- No change to what either CI job does when it runs: same runner, same steps, same
  Playwright report upload.
- No skipping of `types · unit · build` on any criterion.
- No skipping on labels, draft state or author.
- No change to `gh-api.yml` or `update-superpowers.yml`.

## Approaches considered

1. `paths-ignore` on the whole of `ci.yml`. Rejected in review (solyra#81
   r4134042897): it would skip the unit suite on edits to `docs/DOC_REGISTRY.md` and
   `README.md`, which that suite reads.
2. Keep one workflow and add a `changes` job that diffs the PR and gates e2e with a
   job-level `if:`. A skipped job still reports a check, which is what a required
   status check needs. Costs a third job and a diff on every run. Held in reserve:
   this is the shape to convert to if e2e is ever made a required check.
3. Move the e2e job into its own workflow, `e2e.yml`, with a workflow-level
   `paths-ignore`. `ci.yml` keeps `types · unit · build` unfiltered. No new job, no
   list of consumed documents to maintain. Chosen.

Whether e2e is a required status check could not be read directly: the
`gh-api.yml` bridge gets HTTP 403 on `branches/main/protection` with the built-in
token and this repository has no `PR_WORKFLOW_TOKEN`. It is inferred instead: while
e2e was still running on solyra#72, the PR's mergeable state was `unstable`, the
value GitHub reports for pending non-required checks, where stocks#1205 with pending
required checks reported `blocked`. So e2e is not required today, and approach 3
applies. If that changes, approach 2 replaces it; a workflow-level filter on a
required check would leave every docs-only PR unmergeable.

## Design

`.github/workflows/ci.yml` loses its `e2e` job and keeps everything else as is: the
name, triggers, concurrency group, permissions and the `checks` job.

`.github/workflows/e2e.yml` is new and carries the `e2e` job exactly as it was in
`ci.yml` (checkout, setup-node, `npm ci`, Chromium install, `npm run e2e`, the report
upload), under:

```yaml
name: E2E

on:
  pull_request:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md']
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md']

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
```

GitHub evaluates `paths-ignore` against the files the PR or push changes; when every
changed file matches an ignored pattern the workflow does not start. A change to any
other file, the two workflow files included, runs e2e as today. The check keeps its
name, `e2e (chromium, mocked)`, so nothing that reads check names by string changes.

Capacity: n/a. Solyra runs no workload; this change removes about eight minutes of
GitHub Actions runner time per docs-only PR and adds nothing.

## Risks

- Accepted: GitHub evaluates path filters on the first 300 changed files of a PR only
  (solyra#81 r4134042909). A PR with more than 300 files whose first 300 are all
  documentation would skip e2e even if a source file follows. Solyra's largest PR to
  date changed 32 files; the unit, type and build checks still run on such a PR.
  Approach 2 removes this limit if it ever matters.
- A future e2e spec that reads a document would be skipped on a docs-only PR. The
  Non-goals bound this; a spec that starts reading a document adds a narrower filter
  in the same change.
- done_when item 3 proves the filter does not swallow code PRs: the implementation PR
  changes workflow files, so both jobs must still run on it.
