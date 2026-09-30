---
feat_id: FEAT-CICD-001
spec: docs/superpowers/specs/2026-09-29-feat-cicd-001-docs-only-ci-skip.md
branch: feature/feat-cicd-001-docs-only-ci-skip
pr: 82
status: ready
---

# Skip the e2e job on docs-only pull requests: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pull request or push that changes only files under `docs/` or `*.md` files no longer runs the `e2e` job; `types · unit · build` runs on every PR as before.

**Architecture:** The `e2e` job moves unchanged from `.github/workflows/ci.yml` into a new `.github/workflows/e2e.yml` whose `pull_request` and `push` triggers carry `paths-ignore: ['docs/**', '**/*.md']`. `ci.yml` keeps its `checks` job with no filter. The gate workflows are pinned and untouched. Verification is actionlint on both files plus the implementation PR's own CI run, which must still start both jobs because the PR changes workflow files.

**Tech Stack:** GitHub Actions workflow YAML, actionlint 1.7, the spec gate (`scripts/gate/spec_gate.py`).

**Spec:** docs/superpowers/specs/2026-09-29-feat-cicd-001-docs-only-ci-skip.md

## Global Constraints

- The filter value is exactly `['docs/**', '**/*.md']` on both `pull_request` and `push` of `e2e.yml` (spec, Design).
- `ci.yml` loses the `e2e` job and nothing else changes in it; the job's steps are moved verbatim (spec, done_when 1).
- `spec-gate.yml` and `registry-check.yml` are not touched (spec, Non-goals).
- One branch, one PR: `feature/feat-cicd-001-docs-only-ci-skip`.

## Review Focus

- A PR that changes a doc and a source file together must still run e2e. `paths-ignore` only suppresses a run when every changed file matches; Task 1's actionlint check does not exercise this, the implementation PR (workflow files plus a plan and a catalog row) does, as done_when 3.
- A push to main from a squash merge of a docs-only PR must not run e2e. Covered by the same filter on `push`; observed after the first docs-only merge following this change, not testable inside the PR.
- A file named `README.md` at the repo root matches `**/*.md` (GitHub's `**` matches zero or more path segments). Intended.
- A future e2e spec that reads a doc under `docs/` would be skipped on a docs-only PR. Spec Non-goals and Risks own this; no test. The unit suite, which does read documents, is unaffected because it stays unfiltered.
- `actionlint` accepts unknown trigger keys silently in some versions; Task 1 also asserts both filters through a YAML parse so a typo in the key name is caught.
- The check name `e2e (chromium, mocked)` must survive the move, or anything reading check names by string breaks. Task 1's YAML assertion reads `jobs.e2e.name`.

---

### Task 1: Move the e2e job into `e2e.yml` behind the filter
Spec: § Design, the two workflow files. Advances done_when[0] and done_when[1].

**Files:**
- Modify: `.github/workflows/ci.yml` (remove the `e2e` job, lines 108 to the end; nothing else)
- Create: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: the check `e2e (chromium, mocked)` from `e2e.yml`, which Task 2's PR relies on.

- [ ] **Step 1: Confirm the starting shape**

Run: `grep -n "^  e2e:\|^  checks:\|paths" .github/workflows/ci.yml; ls .github/workflows/e2e.yml`
Expected: `checks:` and `e2e:` both present, no `paths` key, and `e2e.yml` does not exist.

- [ ] **Step 2: Cut the `e2e:` job block from `ci.yml` and write it, unchanged, as the only job of `e2e.yml` under the header from the spec's Design (`name: E2E`, both triggers with `paths-ignore: ['docs/**', '**/*.md']`, `concurrency` group `e2e-${{ github.ref }}`, `permissions: contents: read`), with a leading comment saying why the job has its own workflow**

- [ ] **Step 3: Verify both files**

Run: `actionlint .github/workflows/ci.yml .github/workflows/e2e.yml && python3 -c "import yaml; c=yaml.safe_load(open('.github/workflows/ci.yml')); e=yaml.safe_load(open('.github/workflows/e2e.yml')); assert list(c['jobs'])==['checks'] and 'paths' not in str(c[True]); assert e[True]['pull_request']['paths-ignore']==['docs/**','**/*.md'] and e[True]['push']['paths-ignore']==['docs/**','**/*.md']; assert list(e['jobs'])==['e2e'] and e['jobs']['e2e']['name']=='e2e (chromium, mocked)'; print('filters ok')" && git diff --stat`
Expected: no actionlint output, `filters ok`, and the diff stat shows only `ci.yml` with deletions (`e2e.yml` is untracked until added). (PyYAML reads the `on` key as boolean `True`.)

- [ ] **Step 4: Commit the plan and the change together**

```bash
git add docs/superpowers/plans/2026-09-29-feat-cicd-001-docs-only-ci-skip.md .github/workflows/ci.yml .github/workflows/e2e.yml
git commit -m "feat(ci): skip the e2e job on docs-only pull requests"
```
Expected: the pre-commit gate prints `spec gate ok (branch=feature/feat-cicd-001-docs-only-ci-skip, 3 changed file(s))`.

### Task 2: Open the PR and bind the plan to it
Spec: § Risks, the third bullet. Advances done_when[2].

**Files:**
- Modify: `docs/superpowers/plans/2026-09-29-feat-cicd-001-docs-only-ci-skip.md:5` (`pr:`)

**Interfaces:**
- Consumes: the branch pushed by Task 1.
- Produces: the PR number Task 3 writes into the catalog.

- [ ] **Step 1: Push and open a draft PR** titled `FEAT-CICD-001: skip the e2e job on docs-only pull requests`, body from the PR template: spec and plan paths, the four done_when items as `- [ ]` lines starting with the item's text, Capacity `n/a: solyra runs no workload; this removes about eight runner minutes per docs-only PR and adds nothing`, `Canvas refresh pending: none`.

- [ ] **Step 2: Set `pr:` in the plan to the PR's number**

- [ ] **Step 3: Verify both jobs started on the PR head** (done_when 3)

Run: read the PR's check runs.
Expected: `types · unit · build` and `e2e (chromium, mocked)` present, plus the three gate contexts.

### Task 3: Close out the catalog row
Spec: § Done when. Closes done_when[3].

**Files:**
- Modify: `docs/product/02-FEATURE-CATALOG.md:49` (the FEAT-CICD-001 row only)

**Interfaces:**
- Consumes: the PR number from Task 2.
- Produces: the record the gate's close-out check reads.

- [ ] **Step 1: In the FEAT-CICD-001 row set `Last reviewed` to the head commit's date (YYYY-MM-DD) and `PRs` to `#<number>`; leave Status as it reads (`Production but needs remediation`, a set value, not a placeholder)**

- [ ] **Step 2: Verify the branch against main**

Run: `node scripts/docs-audit.mjs > /tmp/audit-branch.txt; git stash -q; node scripts/docs-audit.mjs > /tmp/audit-main.txt; git stash pop -q; diff /tmp/audit-main.txt /tmp/audit-branch.txt; python3 scripts/gate/spec_gate.py --pr origin/main`
Expected: no new audit findings on the branch, and `spec gate ok`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-09-29-feat-cicd-001-docs-only-ci-skip.md docs/product/02-FEATURE-CATALOG.md
git commit -m "docs(catalog): close out FEAT-CICD-001 for the docs-only CI skip"
```
Expected: `spec gate ok`.

- [ ] **Step 4: Tick the four done_when boxes in the PR body with their evidence and mark the PR ready for review**

Expected: CI on the ready PR reports `spec-gate / gate` green with the close-out accepted; two review rounds at most, then stop and report.
