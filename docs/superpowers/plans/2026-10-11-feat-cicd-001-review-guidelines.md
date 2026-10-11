---
feat_id: FEAT-CICD-001
spec: docs/superpowers/specs/2026-10-11-feat-cicd-001-review-guidelines.md
branch: feature/feat-cicd-001-review-guidelines-r2
pr: null
status: ready
---

# Review guidelines and browser proof (solyra) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`)
> syntax for tracking. Every task cites a spec section and the done_when item it advances.

**Goal:** Give every reviewer of a solyra pull request a `## Review guidelines` section below Lovable's
fence in `AGENTS.md`, give authors the classifying reply in CLAUDE.md Rule 2.5 and the merge gates, make
the two Playwright paths the close-out runs need load again, take the retired `solyra-api-prod` out of
CLAUDE.md and three comments, and class `docs/superpowers/` in the docs registry.

**Architecture:** Two code fixes, each test-first with the failing `npx playwright test … --list` on
`origin/main` as the red step: `playwright.screens.config.ts` keeps the `warmup` project its `chromium`
project depends on, and `tests/auth.setup.ts` derives its directory from `import.meta.url`. The rest are
edits to process documents, comments and the registry, each with a clause check that fails on
`origin/main` and passes after the edit. Every edit's exact text is in this plan and was applied to a
scratch copy of `origin/main` at `3546641`, where every check below passed, `npx tsc -b` and ESLint
were clean, and `node scripts/docs-audit.mjs` reported nothing new.

**Tech Stack:** TypeScript, Playwright 1.62 (`@playwright/test`), Node 22, Vitest, Markdown; Python 3 for
`$SCRATCH/clause_check.py` and `scripts/gate/spec_gate.py`.

**Spec:** `docs/superpowers/specs/2026-10-11-feat-cicd-001-review-guidelines.md` (lands on `main` via solyra#248). Read it with this plan.

## Global Constraints

- **The spec lands first.** Cut the branch only after solyra#248 has merged: the gate reads the approved
  spec from the base. Check: `git fetch origin main && git show origin/main:docs/superpowers/specs/2026-10-11-feat-cicd-001-review-guidelines.md | sed -n 18p`
  prints `status: approved`.
- **One branch, one PR.** `feature/feat-cicd-001-review-guidelines-r2`, cut from `origin/main` in a worktree
  (superpowers:using-git-worktrees), never on the Lovable-connected branch. PR title starts
  `FEAT-CICD-001:`. Never rebase, amend or force-push a pushed commit (CLAUDE.md Rule 0); bring in a
  moved `main` with `git merge origin/main`.
- **A worktree has no `node_modules`.** Run `npm ci` in it before any `npx` command.
- **Before every commit** run `python3 scripts/gate/spec_gate.py --commit` (expect `spec gate ok`).
  Commit messages: `type(scope): description`, imperative, subject at most 72 characters, no AI
  attribution, no `Co-Authored-By:` for an assistant, no 🤖 (CLAUDE.md Rule 3).
- **Shared text.** The `## Review guidelines` section (Task 4) and the two Rule 2.5 subsections (Task 5)
  are byte-identical to the stocks plan's, except `Rule 4` here and `Rule 3.7` there (spec § Design,
  last paragraph). Paste them as given and do not rewrap them.
- **Lovable's fence.** Lines 1-10 of `AGENTS.md` (`<!-- LOVABLE:BEGIN -->` to `<!-- LOVABLE:END -->`)
  are not edited (`docs/DOC_REGISTRY.md:43-53`).
- **Anchors.** Line numbers are `origin/main` at `3546641` (2026-10-10). An earlier task moves later
  line numbers in the same file, so find each edit by its quoted old text; every quoted old text occurs
  exactly once in its file.
- **The retired service.** A line in the done_when[8] paths that names `solyra-api-prod` says
  "retired" on the same physical line.
- **Review cap: two rounds** (CLAUDE.md "Review cap", product-delivery Phase 4).
- **PR-body evidence.** What follows a ticked done_when item is scanned by the gate's `DEFERRAL` pattern;
  the item's own words are not. Do not write `Phase 8`, `pending`, `after the merge`, `follow-up`,
  `to follow`, `skipped`, `partial`, `TODO`, `later PR`, `not yet …`, `out of scope` or `in progress`
  after an item. Task 9 runs the gate on the body to prove it.
- **Capacity:** `n/a: solyra runs no workload, and no workflow changes`.
- **Chromium.** This plan's checks need no browser. If `npm run e2e` cannot run in the session, the PR
  says so and cites the CI `e2e (chromium, mocked)` run (spec § Risks).

Two helper scripts, saved outside the checkout. `$SCRATCH` below is any directory outside the
repository (the session scratchpad works); set it once per shell: `export SCRATCH=<dir>`.

`$SCRATCH/clause_check.py`: the test every documentation task runs, red on `origin/main`, green
after the edit. It checks that each clause appears in the named section after dropping backticks
and asterisks, folding quotes and collapsing line wraps, so a clause the edit wraps across lines
still counts:

````python
#!/usr/bin/env python3
"""clause_check.py FILE START_RE END_RE CLAUSE...

Every CLAUSE must appear in FILE between the first line matching START_RE and the next line
matching END_RE (end of file if none). Both sides are normalized first: backticks and asterisks
dropped, curly and single quotes folded to ", whitespace (line wraps included) collapsed,
lowercased. Prints each missing clause and a count; exits 1 if the section or any clause is
missing.
"""
import re
import sys

path, start, end, *clauses = sys.argv[1:]
lines = open(path, encoding="utf-8").read().splitlines()
i = next((n for n, line in enumerate(lines) if re.search(start, line)), None)
if i is None:
    print(f"{path}: no line matches {start!r}; 0/{len(clauses)} clauses present")
    sys.exit(1)
j = next((n for n in range(i + 1, len(lines)) if re.search(end, lines[n])), len(lines))


def norm(s: str) -> str:
    s = re.sub(r"[`*]", "", s)
    for q in ("“", "”", "‘", "’", "'"):
        s = s.replace(q, '"')
    return re.sub(r"\s+", " ", s).strip().lower()


body = norm("\n".join(lines[i:j]))
missing = [c for c in clauses if norm(c) not in body]
for c in missing:
    print("MISSING:", c)
print(f"{path} lines {i + 1}-{j}: {len(clauses) - len(missing)}/{len(clauses)} clauses present")
sys.exit(1 if missing else 0)
````

`$SCRATCH/audit_diff.py`: the docs-audit comparison the close-out runs:

````python
#!/usr/bin/env python3
"""audit_diff.py MAIN_JSON BRANCH_JSON: findings the branch has and main does not.

A finding is keyed by (check, doc, detail), so line numbers that move do not count as new."""
import json
import sys

key = lambda p: {(f["check"], f["doc"], f.get("detail")) for f in json.load(open(p))["findings"]}
new = sorted(key(sys.argv[2]) - key(sys.argv[1]), key=str)
for f in new:
    print("NEW:", f)
print(f"{len(new)} new finding(s) over main")
sys.exit(1 if new else 0)
````

## Review Focus

1. **The screenshot runner loading with the wrong project settings.** A config that loads can still put
   `screenshot: 'on'` on `warmup` or drop it from `chromium`. Task 2 prints the resolved
   `[name, screenshot]` pairs and expects `[["warmup","off"],["chromium","on"]]`.
2. **The sign-in state saved where the `cloud` project does not read it.** `tests/auth.setup.ts` must
   still write `tests/.auth/iap-state.json`, the file `playwright.config.ts:35` (`IAP_STATE`) restores.
   Task 3 checks both resolve to the same path.
3. **A Lovable regeneration applied over `AGENTS.md`.** Nothing detects it (spec § Risks); Task 4 pins
   that the fenced block is byte-identical to main and the section sits below `<!-- LOVABLE:END -->`.
4. **A `solyra-api-prod` line that says "retired" only on the next line.** Task 8 runs the done_when[8]
   grep with `grep -v retired` and expects no output.
5. **A ticked box the gate refuses.** Evidence text can trip `DEFERRAL` (done_when[3] itself says "Phase
   8", which is fine as the item, not as evidence). Task 9 runs the gate with the PR body before the PR is
   marked ready.

---

## Task 1: the plan, and `docs/superpowers/` classed as dated records

Spec: § Design, "The docs registry (`docs/DOC_REGISTRY.md`)". Advances done_when[9] (its registry
clause).

**Files:**
- Create: `docs/superpowers/plans/2026-10-11-feat-cicd-001-review-guidelines.md` (this plan)
- Modify: `docs/DOC_REGISTRY.md:19` (the Class C row of "Why classes") and after `:115` (the last `C`
  row of "Registry", `| C | docs/solyra-landing-page-design.md | | |`)
- Test: `scripts/docs-audit.test.mjs` ("the registry this repo actually ships" loads the real
  registry and asserts every row matches a tracked file)

**Interfaces:**
- Produces: the registry row `| C | docs/superpowers/**/*.md | | |`, which classes this plan, the
  spec and the six earlier plans and specs.

- [ ] **Step 1: Run the checks (expect FAIL)**

```bash
python3 "$SCRATCH/clause_check.py" docs/DOC_REGISTRY.md '^## Why classes' '^### Class A is audited' \
  "a plan's status done and a spec's status superseded, the frontmatter changes the product-delivery skill requires" \
  "are not rewrites"
```

```bash
npm ci                                                               # a fresh worktree has no node_modules
grep -n "docs/superpowers" docs/DOC_REGISTRY.md                       # expect no output on main
node scripts/docs-audit.mjs --json | python3 -c "import json,sys; print(json.load(sys.stdin)['summary'])"
```

Expected on main: `0/2 clauses present` (exit 1), no grep output, and
the summary `{'count-claim': 2, 'marker': 13, 'dead-link': 7, 'closed-issue': 2, 'unclassified': 7}`
(`6` on `3546641`; the spec adds one): every `unclassified` finding is a plan or spec under
`docs/superpowers/`.

- [ ] **Step 2: Add the plan file and edit the registry**

Copy this plan (`plan-review-guidelines-solyra.md`) to `docs/superpowers/plans/2026-10-11-feat-cicd-001-review-guidelines.md`. In `docs/DOC_REGISTRY.md`, replace line 19:

````markdown
| **C** | **Dated record.** An audit or design record whose whole purpose is to state what was true on its date. | Read for cross-references only. **Never re-dated, never rewritten** — rewriting a dated record destroys the record. May receive an *appended*, dated status block. |
````

with:

````markdown
| **C** | **Dated record.** An audit or design record whose whole purpose is to state what was true on its date, a spec or plan under `docs/superpowers/` included. | Read for cross-references only. **Never re-dated, never rewritten** — rewriting a dated record destroys the record. May receive an *appended*, dated status block. A plan's status done and a spec's status superseded, the frontmatter changes the product-delivery skill requires (`status: done` once the plan's PR merges, `status: superseded` once an approved spec replaces it), are not rewrites: they are the record's lifecycle. |
````

and after line 115 add the row (the glob is `**/*.md` because `globToRe` keeps `*` inside one path
segment, `scripts/docs-audit.mjs:965-976`, so `docs/superpowers/*` would match no file):

````markdown
| C | docs/solyra-landing-page-design.md | | |
| C | docs/superpowers/**/*.md | | |
````

- [ ] **Step 3: Run the checks again (expect PASS)**

```bash
npx vitest run scripts/docs-audit.test.mjs        # expect: all passed
```

(`npm ci` matters here: with `node_modules` symlinked from another checkout, the test `must be tracked,
like the grep ones` fails on `origin/main` too, because it reads `node_modules/vitest/package.json`
through the link.)

Same clause check and summary command as Step 1. Expected: `2/2 clauses present` (exit 0), the grep
prints lines 19 and 116, and the summary has no `unclassified` key.

- [ ] **Step 4: Commit**

```bash
python3 scripts/gate/spec_gate.py --commit
git add docs/superpowers/plans/2026-10-11-feat-cicd-001-review-guidelines.md docs/DOC_REGISTRY.md
git commit -m "docs(registry): class docs/superpowers plans and specs as dated records"
```

## Task 2: the screenshot runner loads

Spec: § Design, "The screenshot runner (`playwright.screens.config.ts`)". Advances done_when[6].

**Files:**
- Modify: `playwright.screens.config.ts:1-14` (the whole file)
- Test: `npx playwright test --config=playwright.screens.config.ts --list`

**Interfaces:**
- Consumes: `playwright.config.ts` projects `warmup` (`:125-129`) and `chromium` (`:131-145`,
  `dependencies: ['warmup']` at `:134`).

- [ ] **Step 1: Run the failing command on main (RED)**

```bash
npx playwright test --config=playwright.screens.config.ts --list; echo "rc=$?"
```

Output on `origin/main` (run 2026-10-11, Playwright 1.62.1):

````text
Error: Project 'chromium' depends on unknown project 'warmup'
    at resolveProjectDependencies (node_modules/playwright/lib/common/index.js:698:15)
    at new FullConfigInternal (node_modules/playwright/lib/common/index.js:599:5)
    ...
rc=1
````

- [ ] **Step 2: Replace the file**

`playwright.screens.config.ts`, whole file (it keeps `warmup` beside `chromium`, sets `screenshot: 'on'`
on `chromium` only, and drops the header's `PLAYWRIGHT_START_VITE=1`, which nothing reads: `git grep -n
PLAYWRIGHT_START_VITE` finds only this header and an old plan doc):

````ts
// Screenshot-evidence variant of the local e2e suite: playwright.config.ts's
// chromium project with a screenshot for EVERY test (not just failures), plus
// the warmup project chromium depends on, without which Playwright refuses to
// load the config ("Project 'chromium' depends on unknown project 'warmup'").
// Run it with:
//   npx playwright test --config=playwright.screens.config.ts
// It boots its own Vite on :5199 through playwright.config.ts's webServer, as
// `npm run e2e` does. Not referenced by CI; the default config is unaffected.
import baseConfig from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...baseConfig,
  projects: (baseConfig.projects ?? [])
    .filter((p) => p.name === 'warmup' || p.name === 'chromium')
    .map((p) =>
      p.name === 'chromium' ? { ...p, use: { ...p.use, screenshot: 'on' as const } } : p,
    ),
});
````

- [ ] **Step 3: Run it again (GREEN), and check the projects it resolves**

```bash
npx playwright test --config=playwright.screens.config.ts --list | tail -1; echo "rc=${PIPESTATUS[0]}"
npx playwright test --project=chromium --list | tail -1     # the same count, for comparison
npx esbuild playwright.screens.config.ts --bundle --platform=node --format=esm --packages=external \
  --outfile=node_modules/.tmp/screens-check.mjs --log-level=warning
node --input-type=module -e "const m = await import('$PWD/node_modules/.tmp/screens-check.mjs'); \
  console.log(JSON.stringify(m.default.projects.map(p => [p.name, p.use?.screenshot ?? 'off'])))"
rm node_modules/.tmp/screens-check.mjs
```

Expected: `Total: 283 tests in 32 files` and `rc=0` (282 `chromium` tests plus the one `warmup`
route-warming test, the same count `--project=chromium --list` gives), then
`[["warmup","off"],["chromium","on"]]`.

- [ ] **Step 4: Lint, then commit**

```bash
npx eslint playwright.screens.config.ts      # expect no output
python3 scripts/gate/spec_gate.py --commit
git add playwright.screens.config.ts
git commit -m "fix(e2e): keep the warmup project in the screenshot config"
```

## Task 3: the deployed-site sign-in setup loads

Spec: § Design, "The deployed-site sign-in (`tests/auth.setup.ts`)". Advances done_when[7].

**Files:**
- Modify: `tests/auth.setup.ts:33-35`
- Test: `npx playwright test --project=iap-setup --list`, and the bare `npx playwright test --list`

**Interfaces:**
- Produces: `authFile` = `tests/.auth/iap-state.json`, the same file as `IAP_STATE` in
  `playwright.config.ts:35`, which the `cloud` project restores (`:184`).

- [ ] **Step 1: Run the failing commands on main (RED)**

```bash
npx playwright test --project=iap-setup --list; echo "rc=$?"
npx playwright test --list | tail -1; echo "rc=${PIPESTATUS[0]}"
```

Output on `origin/main` (run 2026-10-11):

````text
ReferenceError: __dirname is not defined in ES module scope

   at auth.setup.ts:35

  33 | import * as path from 'node:path';
  ...
Error: No tests found
Listing tests:
Total: 0 tests in 0 files
rc=1
...
Total: 0 tests in 0 files
rc=1
````

- [ ] **Step 2: Derive the directory from `import.meta.url`** (the pattern `playwright.config.ts:3-5`
  and `tests/journal/journal-import.spec.ts:35` already use)

Old (`tests/auth.setup.ts:33-35`):

````ts
import * as path from 'node:path';

const authFile = path.join(__dirname, '.auth', 'iap-state.json');
````

New:

````ts
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// package.json sets "type": "module", and an ES module has no __dirname.
const authFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth', 'iap-state.json');
````

- [ ] **Step 3: Run them again (GREEN), and check the path**

```bash
npx playwright test --project=iap-setup --list; echo "rc=$?"
npx playwright test --list | tail -1; echo "rc=${PIPESTATUS[0]}"
node -e "const p=require('path'),u=require('url'); \
  const a=p.join(p.dirname(u.fileURLToPath(u.pathToFileURL(p.resolve('tests/auth.setup.ts')))),'.auth','iap-state.json'); \
  const b=p.join(process.cwd(),'tests','.auth','iap-state.json'); console.log(a===b, a)"
```

Expected: `[iap-setup] › auth.setup.ts:39:1 › capture signed-in browser state`, `Total: 1 test in 1
file`, `rc=0`; then `Total: 284 tests in 33 files`, `rc=0` (283 from Task 2 plus this setup; `cloud`
finds none, as CLAUDE.md's Testing table says); then `true <checkout>/tests/.auth/iap-state.json`.

- [ ] **Step 4: Type-check, lint, commit**

```bash
npx tsc -b                                  # tests/ is in tsconfig.test.json; expect no output
npx eslint tests/auth.setup.ts              # expect only the existing warning at the eslint-disable line
python3 scripts/gate/spec_gate.py --commit
git add tests/auth.setup.ts
git commit -m "fix(e2e): derive the sign-in state path from import.meta.url"
```

## Task 4: `## Review guidelines` in `AGENTS.md`, below Lovable's fence

Spec: § Design, "Review guidelines (`AGENTS.md`)" and "The Lovable fence (solyra `AGENTS.md`)".
Advances done_when[0] and done_when[1].

**Files:**
- Modify: `AGENTS.md` (22 lines on main; the fence is lines 1-10; the section is appended after line 22)

**Interfaces:**
- Produces: `## Review guidelines` and its subsections, which Task 5's Rule 2.5 text and Task 7's two
  items point to by name.

- [ ] **Step 1: Run the checks (expect FAIL)**

```bash
python3 "$SCRATCH/clause_check.py" AGENTS.md '^## Review guidelines' '^## (?!Review guidelines)' \
  "A reviewer's first review of a pull request is the complete one" \
  "it reads every changed file in full, generated files included, and the direct callers and callees of what changed" \
  "where a changed file's generator runs in the reviewer's environment it re-runs it and compares" \
  "it posts, against the revision it reviews, every finding it can raise on a defect the pull request introduces or makes worse, at every severity, with one finding per defect class listing each location" \
  "it checks the edges a change creates (errors and rejections, late or out-of-order responses, signed-out and other-account states, empty and null data, and the docs, tests and generated files that cite what changed)" \
  "no-silent-fallbacks rule, CLAUDE.md Rule 4" \
  "A spec PR is reviewed against the code it will change" \
  "each done_when item that describes behavior must fail against a broken implementation" \
  "A later review by the same reviewer checks its earlier findings, then the new commits, and still posts a defect it finds in what its first review covered, for the author to classify under CLAUDE.md Rule 2.5" \
  "A problem the pull request neither introduces nor makes worse is not posted as a finding (a reviewer who can open an issue may open one)" \
  "A change a user can see in the site carries Playwright evidence from a run that exercises the changed code: solyra's hermetic suite for a solyra change; for a stocks change, an API test of the changed response in the PR, while runs against the deployed site before the merge and once staging has deployed it are close-out steps the owner posts on the PR, not boxes the PR ticks" \
  "screenshots of the state each run shows, which the test saves with page.screenshot into its output directory under test-results/" \
  "where the e2e workflow's playwright-report artifact keeps them 7 days" \
  "described state by state in a PR comment and kept in the e2e run's playwright-report artifact (saved under test-results/, kept 7 days) or sent to the owner" \
  "the reviewer asks for the hermetic run or the API test when the PR lacks it" \
  "described state by state in a PR comment" \
  "or sent to the owner"
```

```bash
diff <(git show origin/main:AGENTS.md | sed -n '/<!-- LOVABLE:BEGIN -->/,/<!-- LOVABLE:END -->/p') \
     <(sed -n '/<!-- LOVABLE:BEGIN -->/,/<!-- LOVABLE:END -->/p' AGENTS.md) && echo "fence unchanged"
grep -n "LOVABLE:END\|^## Review guidelines" AGENTS.md
```

Expected on main: `AGENTS.md: no line matches '^## Review guidelines'; 0/17 clauses present` (exit 1),
`fence unchanged`, and only `10:<!-- LOVABLE:END -->`.

- [ ] **Step 2: Append the section**

Append one blank line and then this text after line 22 (`(the vendored skills), as Phase 0 of the
product-delivery skill sets out.`). Lines 1-10 are not touched.

````markdown
## Review guidelines

For every reviewer of a pull request in this repository: Codex, which reads this section; Claude,
which CLAUDE.md Rule 2.5 sends here; and a person. stocks and solyra carry the same guidelines.

### The first review is the complete one

A reviewer's first review of a pull request is the complete one. A pull request gets at most two
review rounds (CLAUDE.md, "Review cap"), an approved spec does not change in place, and Codex's code
review runs again when new commits are pushed to a pull request open for review, so a finding held
back costs a round, and on a spec PR a whole re-cut PR. Before it posts:

- It reads every changed file in full, generated files included, and the direct callers and callees
  of what changed, and where a changed file's generator runs in the reviewer's environment it re-runs
  it and compares.
- It posts, against the revision it reviews, every finding it can raise on a defect the pull request
  introduces or makes worse, at every severity, with one finding per defect class listing each
  location. When a finding is one instance of a class, it searches for every instance before it
  posts the class.
- It checks the edges a change creates (errors and rejections, late or out-of-order responses,
  signed-out and other-account states, empty and null data, and the docs, tests and generated files
  that cite what changed). Empty and null data are judged by this repository's no-silent-fallbacks
  rule, CLAUDE.md Rule 4.
- A spec PR is reviewed against the code it will change: the reviewer opens each file the spec names
  and checks that every `done_when` item can be met, and each `done_when` item that describes
  behavior must fail against a broken implementation. Items that record delivery (the gate, the docs
  audit, the catalog row) are only checked for being met.

### Later reviews

A later review by the same reviewer checks its earlier findings, then the new commits, and still
posts a defect it finds in what its first review covered, for the author to classify under CLAUDE.md
Rule 2.5.

### Problems this pull request did not cause

A problem the pull request neither introduces nor makes worse is not posted as a finding (a reviewer
who can open an issue may open one), since every thread holds the merge (REQ-GOV-001).

### Browser proof

A change a user can see in the site carries Playwright evidence from a run that exercises the
changed code: solyra's hermetic suite for a solyra change; for a stocks change, an API test of the
changed response in the PR, while runs against the deployed site before the merge and once staging
has deployed it are close-out steps the owner posts on the PR, not boxes the PR ticks.

- solyra's hermetic suite (`npm run e2e`) intercepts every `/api` call, so it cannot prove a stocks
  change. The API test in the stocks PR is that proof.
- The deployed-site runs are the owner's: staging's trigger deploys from `main`, deploying a stocks
  branch with `platform/deploy.sh` would put unreviewed code behind the live site, and the deployed
  site's sign-in is interactive (`npm run e2e:cloud:auth` runs headed).
- Each run carries screenshots of the state each run shows, which the test saves with
  `page.screenshot` into its output directory under `test-results/` (`testInfo.outputPath(...)`),
  where the e2e workflow's `playwright-report` artifact keeps them 7 days. The test takes them itself
  because `npm run e2e` runs with Playwright's screenshot option off; solyra's e2e workflow uploads
  `test-results/` in that artifact.
- The screenshots are described state by state in a PR comment and kept in the e2e run's
  `playwright-report` artifact (saved under `test-results/`, kept 7 days) or sent to the owner, since
  images cannot be attached to a PR from a Claude Code session.

The reviewer asks for the hermetic run or the API test when the PR lacks it.
````

- [ ] **Step 3: Run the checks again (expect PASS)**

Same commands. Expected: `17/17 clauses present` (exit 0), `fence unchanged`,
and `10:<!-- LOVABLE:END -->` then `24:## Review guidelines`.

- [ ] **Step 4: Commit**

```bash
python3 scripts/gate/spec_gate.py --commit
git add AGENTS.md
git commit -m "docs(agents): add review guidelines below the Lovable fence"
```

## Task 5: Rule 2.5, the reviewer pointer and the classifying reply

Spec: § Design, "The classifying reply (CLAUDE.md Rule 2.5)". Advances done_when[2].

**Files:**
- Modify: `CLAUDE.md:138-141` (after the paragraph `**Verify the claim before fixing it.**`, the last of
  `### 2.5.`, before `### 3. Commit Guidelines`)

**Interfaces:**
- Consumes: Task 4's `## Review guidelines`.
- Produces: `#### Reviewing a pull request` and `#### A finding raised after a reviewer's first review`,
  cited as "CLAUDE.md Rule 2.5" by Task 6's merge gates and by Task 4's text.

- [ ] **Step 1: Run the check (expect FAIL)**

```bash
python3 "$SCRATCH/clause_check.py" CLAUDE.md '^### 2\.5\.' '^### 3\.' \
  "a thread holding a finding that a reviewer posted after its own first review is not resolved until a reply on it classifies each location, taking the first class that applies" \
  "uncounted (not a defect, a defect the pull request neither introduces nor makes worse, or one that first review raised there)" \
  "missed (the pull request had introduced or worsened it by the commit that first review covered, named by SHA)" \
  "or new (a later commit introduced or worsened it, named by SHA)" \
  "A reviewer is one account, split by review type where the account runs separately triggered types (Codex's code review and its security review are two), and its first review is the earliest review it completes on the pull request, including one that posts no findings" \
  "A first review that posts no findings leaves no review object" \
  "the commit it covered is the one Codex's review-summary comment shows for that review type when that row first reads Completed" \
  "the author records that SHA in a PR comment then, since the next run replaces the row" \
  "A reviewer of a pull request here" \
  "follows AGENTS.md's ## Review guidelines"
```

Expected on main: `0/10 clauses present`, exit 1.

- [ ] **Step 2: Insert the two subsections**

Old (`CLAUDE.md:138-141`):

````markdown
against the code, write the failing test first, then fix, then show the same
test passing.

### 3. Commit Guidelines
````

New:

````markdown
against the code, write the failing test first, then fix, then show the same
test passing.

#### Reviewing a pull request

A reviewer of a pull request here, Claude included, follows
`AGENTS.md`'s `## Review guidelines`: its first review is the complete one.
Claude Code loads this file and not `AGENTS.md`, so this is where a Claude
reviewer is sent to them.

#### A finding raised after a reviewer's first review

A reviewer is one account, split by review type where the account runs
separately triggered types (Codex's code review and its security review are
two), and its first review is the earliest review it completes on the pull
request, including one that posts no findings (REQ-GOV-003).

A thread holding a finding that a reviewer posted after its own first review
is not resolved until a reply on it classifies each location, taking the
first class that applies: uncounted (not a defect, a defect the pull request
neither introduces nor makes worse, or one that first review raised there),
missed (the pull request had introduced or worsened it by the commit that
first review covered, named by SHA), or new (a later commit introduced or
worsened it, named by SHA). The missed count per reviewer and pull request is
the lower bound REQ-GOV-003 keeps on what a first review misses.

A first review that posts no findings leaves no review object, so the commit
it covered is the one Codex's review-summary comment shows for that review
type when that row first reads Completed, and the author records that SHA in
a PR comment then, since the next run replaces the row:
`First Codex code review: Completed on <sha>, no findings.`

### 3. Commit Guidelines
````

- [ ] **Step 3: Run the check again (expect PASS)**

Same command. Expected: `10/10 clauses present`, exit 0.

- [ ] **Step 4: Commit**

```bash
python3 scripts/gate/spec_gate.py --commit
git add CLAUDE.md
git commit -m "docs(claude): classify findings raised after a first review"
```

## Task 6: the merge gates ask for the reply, and Phase 8 takes the review cap

Spec: § Design, "The merge gates (`.github/pull_request_template.md`, `.claude/commands/resolve-issue.md`
Phase 8)". Advances done_when[3].

**Files:**
- Modify: `.github/pull_request_template.md:66-68` (add an item after "Zero unresolved review threads")
- Modify: `.claude/commands/resolve-issue.md:853-857` (step 4's loop and "No round limit") and
  `:862-864` (step 5)

**Interfaces:**
- Consumes: Task 5's Rule 2.5 classifying reply.

- [ ] **Step 1: Run the checks (expect FAIL)**

```bash
python3 "$SCRATCH/clause_check.py" .github/pull_request_template.md '^## Merge gate' '^## (?!Merge gate)' \
  "Each thread holding a finding a reviewer posted after its own first review carries the reply classifying each location before it is resolved" \
  "uncounted, missed (with the SHA of the commit the first review covered) or new (with the SHA of the later commit)"
```

```bash
python3 "$SCRATCH/clause_check.py" .claude/commands/resolve-issue.md '^## Phase 8' '^## Phase 9' \
  "A thread holding a finding that a reviewer posted after its own first review is resolved only after a reply on it classifies each location" \
  "If this produced a commit for a finding from the PR's first review round, go back to step 1 on the new head" \
  "Two review rounds, then split, re-cut or discard" \
  "A finding from the second round is classified" \
  "the PR split, re-cut or discarded, with no in-place fix and no third review"
```

Expected on main: `0/2 clauses present` and
`0/5 clauses present`, both exit 1.

- [ ] **Step 2: The template's Merge gate**

Old (`.github/pull_request_template.md:66-68`):

````markdown
- [ ] Zero unresolved review threads: each one fixed-and-resolved (naming
      what changed and the covering test/commit) or replied to with why it
      isn't being actioned
````

New:

````markdown
- [ ] Zero unresolved review threads: each one fixed-and-resolved (naming
      what changed and the covering test/commit) or replied to with why it
      isn't being actioned
- [ ] Each thread holding a finding a reviewer posted after its own first
      review carries the reply classifying each location before it is
      resolved: uncounted, missed (with the SHA of the commit the first
      review covered) or new (with the SHA of the later commit), as
      CLAUDE.md Rule 2.5 says
````

- [ ] **Step 3: Phase 8 step 4, the loop applies to first-round findings and "No round limit" goes**

Old (`.claude/commands/resolve-issue.md:853-857`; lines 851-852 before it and 858-861, the no-findings
note, after it stay):

````markdown
   **If this produced a commit, go back to step 1 on the new head.** A fix
   commit moves the head past the review that approved it, so merging from
   here lets the review-fix itself merge unreviewed — the same stale-head
   condition, arriving by a different route. Push, let the review re-run on
   the new SHA, re-check. No round limit.
````

New:

````markdown
   **If this produced a commit for a finding from the PR's first review round,
   go back to step 1 on the new head.** A fix commit moves the head past the
   review that approved it, so merging from here lets the review-fix itself
   merge unreviewed — the same stale-head condition, arriving by a different
   route. Push, let the review re-run on the new SHA, re-check: that run is
   the PR's second review round.
   **Two review rounds, then split, re-cut or discard** (CLAUDE.md, "Review
   cap"; the product-delivery skill, Phase 4). A finding from the second
   round is classified (CLAUDE.md Rule 2.5) and the PR split, re-cut or
   discarded, with no in-place fix and no third review: present that choice
   (`superpowers:finishing-a-development-branch`) and stop.
````

- [ ] **Step 4: Phase 8 step 5, the classifying reply before a later finding's thread resolves**

Old (`:863-864`):

````markdown
   naming what changed and the covering test and commit, or replied to with
   why not. Then CI green on the current head, and no merge conflict.
````

New:

````markdown
   naming what changed and the covering test and commit, or replied to with
   why not. A thread holding a finding that a reviewer posted after its own
   first review is resolved only after a reply on it classifies each
   location: uncounted, missed (with the SHA of the commit that first review
   covered) or new (with the SHA of the later commit), as CLAUDE.md Rule 2.5
   says. Then CI green on the current head, and no merge conflict.
````

- [ ] **Step 5: Run the checks again (expect PASS)**

Same commands. Expected: `2/2` and `5/5`, exit 0; `grep -n "No round limit"
.claude/commands/resolve-issue.md` prints nothing (exit 1).

- [ ] **Step 6: Commit**

```bash
python3 scripts/gate/spec_gate.py --commit
git add .github/pull_request_template.md .claude/commands/resolve-issue.md
git commit -m "docs(review): cap Phase 8 at two rounds and classify later findings"
```

## Task 7: browser proof in Testing discipline and in debug-local's Verify step

Spec: § Design, "Evidence rules (`CLAUDE.md`)" and "Debugging (`.claude/agents/debug-local.md`, Step 4
Verify)". Advances done_when[4] and done_when[5].

**Files:**
- Modify: `CLAUDE.md:396-397` (after item 4 of `### Testing discipline`)
- Modify: `.claude/agents/debug-local.md:92` (after item 4 of `### Step 4 — Verify`)

**Interfaces:**
- Consumes: Task 4's `## Review guidelines`; `playwright-tester`'s scope (`debug-local.md:20-21`:
  "*Test-logic* failures belong to `playwright-tester`") and debug-local's "backend/FastAPI errors
  (different repo — say so and stop)" (`:28`).

- [ ] **Step 1: Run the checks (expect FAIL)**

```bash
python3 "$SCRATCH/clause_check.py" CLAUDE.md '^### Testing discipline' '^---' \
  "A change a user can see in the site is proven with a Playwright run of the hermetic suite in tests/ that exercises it, with screenshots of the state before and after the change" \
  "When it depends on a stocks API change" \
  "a *.cloud.spec.ts written for that change that the owner runs with npm run e2e:cloud against the deployed site once staging has deployed it and posts on the PR as a close-out step"
```

```bash
python3 "$SCRATCH/clause_check.py" .claude/agents/debug-local.md '^### Step 4' '^### Step 5' \
  "A bug a user sees in the site is verified with a Playwright run of solyra's hermetic suite that reproduces it before the fix and passes after it, with screenshots of both" \
  "hands that run's assertions to playwright-tester, which its scope gives test-logic failures" \
  "A bug whose fix belongs in stocks is handed to stocks, as this agent's scope says"
```

Expected on main: `0/3 clauses present` and
`0/3 clauses present`, both exit 1.

- [ ] **Step 2: Testing discipline, item 5**

Old (`CLAUDE.md:396-397`):

````markdown
4. **Never claim done without evidence.** Run the command and read the output
   before saying it passes.
````

New:

````markdown
4. **Never claim done without evidence.** Run the command and read the output
   before saying it passes.
5. **Prove a visible change in the browser.** A change a user can see in the
   site is proven with a Playwright run of the hermetic suite in `tests/` that
   exercises it, with screenshots of the state before and after the change,
   which the test saves with `page.screenshot` (see `AGENTS.md`,
   `## Review guidelines`). When it depends on a stocks API change, it also
   needs a `*.cloud.spec.ts` written for that change that the owner runs with
   `npm run e2e:cloud` against the deployed site once staging has deployed it
   and posts on the PR as a close-out step. The Testing table above says no
   cloud spec exists yet: this is what the first one is for.
````

- [ ] **Step 3: debug-local Step 4, item 5**

Old (`.claude/agents/debug-local.md:92`):

````markdown
4. Confirm no regression in the adjacent feature
````

New:

````markdown
4. Confirm no regression in the adjacent feature
5. A bug a user sees in the site is verified with a Playwright run of solyra's
   hermetic suite that reproduces it before the fix and passes after it, with
   screenshots of both (the test saves them with `page.screenshot` into
   `testInfo.outputPath(...)`; `AGENTS.md`, `## Review guidelines`). This agent
   hands that run's assertions to `playwright-tester`, which its scope gives
   test-logic failures, and reports the before and after runs. A bug whose fix
   belongs in stocks is handed to stocks, as this agent's scope says.
````

- [ ] **Step 4: Run the checks again (expect PASS)**

Same commands. Expected: `3/3` and `3/3`, exit 0.

- [ ] **Step 5: Commit**

```bash
python3 scripts/gate/spec_gate.py --commit
git add CLAUDE.md .claude/agents/debug-local.md
git commit -m "docs(testing): prove a visible change with a Playwright run and screenshots"
```

## Task 8: one API service in CLAUDE.md and three comments

Spec: § Design, "The retired service (`CLAUDE.md` and three config and test comments)". Advances
done_when[8].

**Files:**
- Modify: `CLAUDE.md:26-27` (overview) and `:36` (Backend row)
- Modify: `playwright.config.ts:10-14` (comment), `vite.config.ts:10-12` (comment),
  `tests/shared/gamma-levels.spec.ts:14-17` (comment)
- Not here: `tests/fixtures/stocks-openapi.json` and `src/types/stocksOpenApi.gen.d.ts` follow stocks
  through `npm run contract:sync` (spec § Design), and docs outside the done_when[8] paths
  (`FRONTEND.md`, `docs/`, the `.drawio` files) are not this change's.

- [ ] **Step 1: Run the check (expect FAIL)**

```bash
git grep -n solyra-api-prod -- CLAUDE.md AGENTS.md .claude .github playwright.config.ts vite.config.ts tests/shared
git grep -n solyra-api-prod -- CLAUDE.md AGENTS.md .claude .github playwright.config.ts vite.config.ts tests/shared | grep -v retired
```

Expected on main: both print the same five lines (`CLAUDE.md:26`, `CLAUDE.md:36`,
`playwright.config.ts:10`, `tests/shared/gamma-levels.spec.ts:14`, `vite.config.ts:11`); none says
retired.

- [ ] **Step 2: CLAUDE.md overview** (`:26-27`; `~73 bare` on line 28 stays, the docs registry counts it)

Old:

````markdown
(`TeneikaAskew/stocks`) and deploy together as the `solyra-api-prod` Cloud Run
service. Solyra's dev server proxies `/api/*` to that backend, so the browser
````

New:

````markdown
(`TeneikaAskew/stocks`); the API deploys as `solyra-api-staging`, the only API
Cloud Run service since `solyra-api-prod` was retired on 2026-10-10 (TeneikaAskew/stocks#1366).
Solyra's dev server proxies `/api/*` to that backend, so the browser
````

- [ ] **Step 3: CLAUDE.md Backend row** (`:36`)

Old:

````markdown
| Backend | stocks repo → `solyra-api-prod` (prod) / `solyra-api-staging` (Cloud Run) |
````

New:

````markdown
| Backend | stocks repo → `solyra-api-staging` (Cloud Run), the only API service since `solyra-api-prod` was retired on 2026-10-10 |
````

- [ ] **Step 4: `playwright.config.ts:10-14`**

Old:

````ts
// the SPA only when platform/dist exists), so solyra-api-prod answers /dashboard
// with 404 {"detail":"Not Found"}. Verified 2026-09-05 against solyra-api-staging,
// which runs the same image without IAP in front. This default previously pointed
// at the API service, which is why `npm run e2e:cloud` could not have worked since
// #957 (Codex, solyra#44).
````

New:

````ts
// the SPA only when platform/dist exists), so the API service answers /dashboard
// with 404 {"detail":"Not Found"}. Verified 2026-09-05 against solyra-api-staging,
// the only API service since solyra-api-prod was retired on 2026-10-10. This
// default previously pointed at the API service, which is why `npm run e2e:cloud`
// could not have worked since #957 (Codex, solyra#44).
````

- [ ] **Step 5: `vite.config.ts:10-12`**

Old:

````ts
// lives in the stocks repo, deployed as two Cloud Run services: solyra-api-staging
// (public, Firebase-gated — what this proxy falls back to) and solyra-api-prod
// (behind IAP). Merging to main auto-deploys staging only; prod is manual.
````

New:

````ts
// lives in the stocks repo, deployed as one Cloud Run service, solyra-api-staging
// (public, Firebase-gated — what this proxy falls back to). Merging to main
// auto-deploys it; solyra-api-prod (behind IAP) was retired on 2026-10-10.
````

- [ ] **Step 6: `tests/shared/gamma-levels.spec.ts:14-17`**

Old:

````ts
 * in this repo (it moved to stocks, deployed as the solyra-api-prod Cloud Run
 * service). Those contract tests belong beside the code they exercise; what
 * stays here is the frontend's rendering of that contract, mocked via
 * mockOptionsApi so it is deterministic and needs no backend.
````

New:

````ts
 * in this repo (it moved to stocks, deployed as solyra-api-staging, its only
 * API Cloud Run service). Those contract tests belong beside the code they
 * exercise; what stays here is the frontend's rendering of that contract,
 * mocked via mockOptionsApi so it is deterministic and needs no backend.
````

- [ ] **Step 7: Run the check again (expect PASS), then type-check and lint**

```bash
git grep -n solyra-api-prod -- CLAUDE.md AGENTS.md .claude .github playwright.config.ts vite.config.ts tests/shared
git grep -n solyra-api-prod -- CLAUDE.md AGENTS.md .claude .github playwright.config.ts vite.config.ts tests/shared | grep -v retired; echo "rc=$?"
npx tsc -b && npx eslint playwright.config.ts vite.config.ts tests/shared/gamma-levels.spec.ts
```

Expected: four lines (`CLAUDE.md:27`, `CLAUDE.md:37`, `playwright.config.ts:12`, `vite.config.ts:12`),
each saying retired; the second command prints nothing and `rc=1`; `tsc` and ESLint print nothing.

- [ ] **Step 8: Commit**

```bash
python3 scripts/gate/spec_gate.py --commit
git add CLAUDE.md playwright.config.ts vite.config.ts tests/shared/gamma-levels.spec.ts
git commit -m "docs: describe solyra-api-staging as the only API service"
```

## Task 9: close-out, catalog row, docs audit and gate

Spec: done_when[9] and done_when[10] (delivery records; the product-delivery skill, Phase 5). Advances
done_when[9] and done_when[10].

**Files:**
- Modify: `docs/product/02-FEATURE-CATALOG.md:49` (the FEAT-CICD-001 row: its last two cells,
  `| 2026-10-10 | #82 |`; Status stays `Production but needs remediation`)
- Modify: `docs/superpowers/plans/2026-10-11-feat-cicd-001-review-guidelines.md` (`pr: null` → `pr: NNN`)

Touch no other line of the catalog: the gate refuses a line outside FEAT-CICD-001's row, which rules
out the stale intro sentence at lines 20-23 too. Keep `#NNN` bare, as `#82` is: the linked form on the
AUTH and UI rows (`[#241](…)`, `[#242](…)`) is what `node scripts/docs-audit.mjs` reports as
`closed-issue` P1 once those PRs merged.

- [ ] **Step 1: Full local suite, gate and docs audit before the PR opens**

```bash
npx tsc -b && npm run lint && npm test && npm run build
npm run e2e                                   # if Chromium cannot run here, say so in the PR and cite CI's e2e run
python3 scripts/gate/spec_gate.py --pr origin/main          # expect: spec gate ok (branch=feature/feat-cicd-001-review-guidelines-r2, …)
git worktree add --detach "$SCRATCH/solyra-main-audit" origin/main
ln -s "$PWD/node_modules" "$SCRATCH/solyra-main-audit/node_modules"
(cd "$SCRATCH/solyra-main-audit" && node scripts/docs-audit.mjs --json) > "$SCRATCH/audit-main.json"
node scripts/docs-audit.mjs --json > "$SCRATCH/audit-branch.json"
python3 "$SCRATCH/audit_diff.py" "$SCRATCH/audit-main.json" "$SCRATCH/audit-branch.json"   # expect: 0 new finding(s) over main
rm "$SCRATCH/solyra-main-audit/node_modules" && git worktree remove "$SCRATCH/solyra-main-audit"
```

On `3546641` the audit summary was `count-claim 2, marker 13, dead-link 7, closed-issue 2,
unclassified 6`; the scratch copy with every edit above gave the same without `unclassified`, and 0 new.

- [ ] **Step 2: Open the PR as a draft**

Title: `FEAT-CICD-001: ask reviewers for the complete first review and browser proof`. Body (copy each
done_when item exactly, backticks included; the gate matches the line's start against the item):

````markdown
**FEAT-ID:** FEAT-CICD-001
**Spec:** docs/superpowers/specs/2026-10-11-feat-cicd-001-review-guidelines.md
**Plan:** docs/superpowers/plans/2026-10-11-feat-cicd-001-review-guidelines.md

## Done when (copied from the spec)
- [ ] The root AGENTS.md of this repository (solyra) has a '## Review guidelines' section that says: a reviewer's first review of a pull request is the complete one; it reads every changed file in full, generated files included, and the direct callers and callees of what changed, and where a changed file's generator runs in the reviewer's environment it re-runs it and compares; it posts, against the revision it reviews, every finding it can raise on a defect the pull request introduces or makes worse, at every severity, with one finding per defect class listing each location; it checks the edges a change creates (errors and rejections, late or out-of-order responses, signed-out and other-account states, empty and null data, and the docs, tests and generated files that cite what changed); a spec PR is reviewed against the code it will change, and each done_when item that describes behavior must fail against a broken implementation; a later review by the same reviewer checks its earlier findings, then the new commits, and still posts a defect it finds in what its first review covered, for the author to classify under CLAUDE.md Rule 2.5; a problem the pull request neither introduces nor makes worse is not posted as a finding (a reviewer who can open an issue may open one); and a change a user can see in the site carries Playwright evidence from a run that exercises the changed code: solyra's hermetic suite for a solyra change; for a stocks change, an API test of the changed response in the PR, while runs against the deployed site before the merge and once staging has deployed it are close-out steps the owner posts on the PR, not boxes the PR ticks; with screenshots of the state each run shows, which the test saves with page.screenshot into its output directory under test-results/, where the e2e workflow's playwright-report artifact keeps them 7 days, described state by state in a PR comment or sent to the owner; the reviewer asks for the hermetic run or the API test when the PR lacks it
- [ ] The lines of AGENTS.md from `<!-- LOVABLE:BEGIN -->` to `<!-- LOVABLE:END -->` are unchanged, and the new section sits below `<!-- LOVABLE:END -->`
- [ ] CLAUDE.md Rule 2.5 says a thread holding a finding that a reviewer posted after its own first review is not resolved until a reply on it classifies each location, taking the first class that applies: uncounted (not a defect, a defect the pull request neither introduces nor makes worse, or one that first review raised there), missed (the pull request had introduced or worsened it by the commit that first review covered, named by SHA), or new (a later commit introduced or worsened it, named by SHA); it defines a reviewer and a first review as REQ-GOV-003 does; it says a first review that posts no findings leaves no review object, that the commit it covered is the one Codex's review-summary comment shows for that review type when that row first reads Completed, and that the author records that SHA in a PR comment then, since the next run replaces the row; and it tells a reviewer of a pull request to follow AGENTS.md's '## Review guidelines'
- [ ] .github/pull_request_template.md's Merge gate and .claude/commands/resolve-issue.md's Phase 8 ask for the classifying reply on each later finding before its thread is resolved, and Phase 8 replaces its 'No round limit' with the two-round review cap: its 'go back to step 1' after a fix commit applies only to findings from a PR's first review round, and a finding from the second round is classified and the PR split, re-cut or discarded, with no in-place fix and no third review, as CLAUDE.md and the product-delivery skill say
- [ ] CLAUDE.md's Testing discipline has an item saying a change a user can see in the site is proven with a Playwright run of the hermetic suite in tests/ that exercises it, with screenshots of the state before and after the change, and, when it depends on a stocks API change, a *.cloud.spec.ts written for that change that the owner runs with npm run e2e:cloud against the deployed site once staging has deployed it and posts on the PR as a close-out step
- [ ] .claude/agents/debug-local.md's Verify step says a bug a user sees in the site is verified with a Playwright run of solyra's hermetic suite that reproduces it before the fix and passes after it, with screenshots of both, and hands that run's assertions to playwright-tester, which its scope gives test-logic failures; a bug whose fix belongs in stocks is handed to stocks, as this agent's scope says
- [ ] playwright.screens.config.ts, the screenshot runner, loads: npx playwright test --config=playwright.screens.config.ts --list lists the suite instead of failing with `Project 'chromium' depends on unknown project 'warmup'`
- [ ] tests/auth.setup.ts loads: npx playwright test --project=iap-setup --list lists the setup instead of failing with `__dirname is not defined in ES module scope`
- [ ] CLAUDE.md, playwright.config.ts, vite.config.ts and tests/shared/gamma-levels.spec.ts describe solyra-api-staging as the only API service: git grep -n solyra-api-prod -- CLAUDE.md AGENTS.md .claude .github playwright.config.ts vite.config.ts tests/shared prints only lines that say it was retired
- [ ] python3 scripts/gate/spec_gate.py --pr origin/main passes on the PR head; docs/DOC_REGISTRY.md classes `docs/superpowers/**/*.md` as C and its Class C text says a plan's status done and a spec's status superseded, the frontmatter changes the product-delivery skill requires, are not rewrites; and node scripts/docs-audit.mjs reports nothing new over origin/main
- [ ] 02-FEATURE-CATALOG FEAT-CICD-001 row shows a Status, this PR's date and number

## Capacity (stocks CLAUDE.md rule 0; solyra runs no workload, so `n/a: <why>` unless a workflow changes)
n/a: solyra runs no workload, and no workflow changes.

Canvas refresh pending: none

## Summary
(what changed, per task; no change here is visible in the site, so the hermetic e2e run is CI's)
````

- [ ] **Step 3: Record the PR number and the date, in one commit**

With `NNN` the PR number and `YYYY-MM-DD` today's date as `git show -s --format=%cs HEAD` will print it for
this commit (the gate requires the head commit's committer or author date; if a later commit lands on
another day, move `YYYY-MM-DD` in that commit):

- `docs/superpowers/plans/2026-10-11-feat-cicd-001-review-guidelines.md`: `pr: null` → `pr: NNN`.
- `docs/product/02-FEATURE-CATALOG.md:49`: `| 2026-10-10 | #82 |` at the end of the FEAT-CICD-001 row →
  `| YYYY-MM-DD | #82, #NNN |`.

```bash
python3 scripts/gate/spec_gate.py --commit
git add docs/superpowers/plans/2026-10-11-feat-cicd-001-review-guidelines.md docs/product/02-FEATURE-CATALOG.md
git commit -m "docs(catalog): record #NNN under FEAT-CICD-001"
```

- [ ] **Step 4: Tick the boxes with evidence, then prove the ready-for-review gate locally**

Change each `- [ ]` under "Done when" to `- [x]` and append ` — <evidence>` after the item's text.
Evidence that passes the gate's deferral scan (checked against `DEFERRAL` while writing this plan):

````text
done_when[0]: — evidence: Task 4 clause check, 17/17 in the AGENTS.md section
done_when[1]: — evidence: Task 4 fence diff prints fence unchanged; the section starts at line 24, below line 10
done_when[2]: — evidence: Task 5 clause check, 10/10 in Rule 2.5
done_when[3]: — evidence: Task 6 checks, 2/2 in the template and 5/5 in the merge-gate steps; No round limit is gone
done_when[4]: — evidence: Task 7 clause check, 3/3 in Testing discipline
done_when[5]: — evidence: Task 7 clause check, 3/3 in Step 4
done_when[6]: — evidence: Task 2, Total: 283 tests in 32 files, rc=0 (main: depends on unknown project, rc=1)
done_when[7]: — evidence: Task 3, Total: 1 test in 1 file, rc=0 (main: `__dirname is not defined`, rc=1)
done_when[8]: — evidence: Task 8 grep, four lines, each says retired
done_when[9]: — evidence: spec gate ok on the head; Task 1 registry check 2/2; docs audit 0 new finding(s) over origin/main
done_when[10]: — evidence: FEAT-CICD-001 row reads Production but needs remediation, YYYY-MM-DD, #82, #NNN
````

Save the body to `$SCRATCH/pr-body.md`, re-run the docs audit comparison from Step 1, then:

```bash
PR_BODY="$(cat "$SCRATCH/pr-body.md")" PR_TITLE="FEAT-CICD-001: ask reviewers for the complete first review and browser proof" \
PR_NUMBER=NNN PR_DRAFT=false PR_HEAD_REF=feature/feat-cicd-001-review-guidelines-r2 PR_BASE_REF=main \
  python3 scripts/gate/spec_gate.py --pr origin/main
# expect: spec gate ok
```

Then push, update the PR body on GitHub with the same text, and mark the PR ready for review. From here
CLAUDE.md Rule 2.5 governs: read the review before CI, record the first Codex review's SHA in a PR
comment if it posts no findings, give each later finding its classifying reply, and stop at two rounds.

- [ ] **Step 5: After the merge**

Owner-side, outside this PR's done_when: on a `docs/` branch set this plan's `status: done`
(product-delivery Phase 5 step 7). REQ-GOV-003's Enforced-by column moves in stocks once both
implementations merge (spec § Non-goals).
