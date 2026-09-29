---
feat_id: FEAT-CICD-001
req_ids: [REQ-DEPLOY-001]
issues: []
canvases: []
done_when:
  - ".github/workflows/ci.yml carries paths-ignore: ['docs/**', '**/*.md'] under both pull_request and push, and nothing else in the file changed"
  - "actionlint .github/workflows/ci.yml reports nothing"
  - "both CI jobs (types · unit · build, e2e) ran and passed on the implementation PR, which changes a workflow file and not a doc"
  - "02-FEATURE-CATALOG FEAT-CICD-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Skip the app CI jobs on docs-only pull requests

## Problem

A markdown-only pull request runs the full CI workflow: `types · unit · build` (about
two minutes) and `e2e (chromium, mocked)` (about eight minutes). Neither can fail on a
change under `docs/` or to a `.md` file, since no code under `src/` or `tests/` reads
those files. Solyra #80, a two-line edit to `docs/solyra-landing-page-plan.md`, spent
ten CI minutes this way on 2026-09-29. The three gate contexts (`spec-gate / gate`,
`spec-gate / base-suite`, `registry-check / registry`) must keep running on every PR,
because judging docs branches is part of the gate's job.

## Non-goals

- No change to the gate workflows `spec-gate.yml` and `registry-check.yml`; they are
  pinned and run on everything.
- No change to what the CI jobs do when they run, their runner, or their steps.
- No skipping on any other criterion (labels, draft state, author).
- No change to `gh-api.yml` or `update-superpowers.yml`, which are dispatch or
  schedule driven.

## Approaches considered

1. `paths-ignore` on the `pull_request` and `push` triggers of `ci.yml`. Two lines,
   no new job. A docs-only PR produces no CI check runs at all. Chosen.
2. A `changes` job that diffs the PR against its base and gates the two jobs with
   `if:`. Skipped jobs still report a check, which matters only if the CI jobs become
   required status checks. Costs a third job and a diff on every run. Not chosen: the
   planned required checks are the three gate contexts, and approach 1 converts to
   this shape later if that changes.
3. Leave as is. Rejected: ten minutes of runner time per docs PR for no signal.

## Design

In `.github/workflows/ci.yml`, both triggers gain the same filter:

```yaml
on:
  pull_request:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md']
  push:
    branches: [main]
    paths-ignore: ['docs/**', '**/*.md']
```

GitHub evaluates `paths-ignore` against the files the PR changes (for `pull_request`)
or the push changes (for `push`); a change whose every file matches an ignored pattern
does not start the workflow. A PR that touches any other file, `ci.yml` included,
runs both jobs as today.

Capacity: n/a. Solyra runs no workload; this change removes about ten minutes of
GitHub Actions runner time per docs-only PR and adds nothing.

## Risks

- A future doc consumed by tests would make a docs-only PR skip a test that could
  fail. No such doc exists today (fixtures live under `tests/` and `src/`). The
  mitigation is the non-goal above: any such consumer is added together with a
  narrower filter.
- If `types · unit · build` or `e2e` are ever made required status checks, a
  docs-only PR would never satisfy them, since the workflow does not run. The
  approach-2 shape resolves that; the PR descriptions for the gate name only the
  three gate contexts as future required checks.
- done_when item 3 proves the filter does not swallow code PRs: the implementation
  PR changes a workflow file, so both jobs must still run on it.
