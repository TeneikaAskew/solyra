---
description: Group uncommitted changes, sync docs, and create logical commits
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

# Commit & Docs Agent

You are the Commit & Docs agent for **Solyra**. Auto-group all uncommitted
changes, sync documentation to match the code, and create logical commits.

---

## Phase 0: Branch check (do this FIRST)

```bash
git status
git rev-parse --abbrev-ref HEAD
```

If you are on the **Lovable-connected branch** (`main`), STOP and create a
feature branch before committing anything:

```bash
git checkout -b feature/short-description   # or fix/ docs/ chore/ test/
```

Only these may go straight to the connected branch: a single-line markdown
typo, a README link fix, or a `.gitignore` addition for an already-ignored
generated file. Everything else needs a branch + PR (CLAUDE.md Rule 2).

**Never `git push --force`, rebase, amend, or squash a pushed commit** — this
repo is connected to Lovable and rewriting published history can lose project
history (CLAUDE.md Rule 0). This has no exceptions.

---

## Phase 1: Scan changes

```bash
git status
git diff --stat
```

List every modified, added, and deleted file. Do not proceed until you have a
complete inventory. If a file is unexpected (a build artifact, a `.har`, a
`.env`), stop and ask rather than committing it.

---

## Phase 2: Documentation sync

Map each changed file to its documentation. Update the doc **before** creating
the commit, so doc and code land together.

| Code area | Primary doc | Update when |
|---|---|---|
| `package.json` scripts | `README.md` → Scripts table | A script is added, removed, or its behaviour changes |
| `vite.config.ts` (proxy logic) | `README.md` → "Where `/api` goes" | Proxy target resolution or env-var handling changes |
| `playwright.config.ts` | `README.md` → Tests; `CLAUDE.md` → Testing | Ports, workers, projects, or isolation settings change |
| `tests/**` | `docs/TEST_COVERAGE_AUDIT.md` | New spec, removed spec, or a coverage verdict changes |
| `src/lib/authedFetch.ts` | `README.md` → auth; `CLAUDE.md` → Auth | `OPEN_PREFIXES` or origin resolution changes |
| `src/types/**` | `docs/options_flow_data_contract.md` (if options-related) | A response contract changes |
| `src/routes/**` (new route) | `README.md` | A page is added or removed |
| `tsconfig*.json` | `README.md` → TypeScript projects | Project references change |
| Any Rule 4 / Rule 5 decision | `CLAUDE.md` | A new convention or exemption is established |
| `.claude/**` | (no doc) | N/A |

**Staleness check**: read the relevant doc section for each changed file. If it
no longer matches the code, update it now:

- **New feature**: add a subsection — purpose, usage, example
- **Changed behaviour**: update the table row or code block, and the reason
- **Bug fix**: a bullet naming the file and what was wrong
- **Removed feature**: delete the section and note the removal

Do NOT invent documentation the repo doesn't have. There is no changelog
directory and no status tracker here — do not create one unless asked.

---

## Phase 3: Group and commit

Group related changes. Files that are functionally related go in the same
commit even if they live in different directories. Doc updates always go with
the code they document.

| Group | What belongs |
|---|---|
| `feat(ui)` | New component / route / visual feature + its doc updates |
| `feat(hooks)` | New or extended data hooks |
| `feat(journal)` | `src/components/journal/`, `src/routes/Journal*`, `journalStats`, `risk` |
| `feat(options)` | `src/components/options/`, `formatGex`, gamma hooks |
| `feat(charts)` | `src/components/charts/`, `chartTheme` |
| `feat(dashboard)` | `src/components/dashboard/`, `src/routes/DashboardPage*` |
| `feat(auth)` | `src/components/auth/`, `authedFetch`, `firebase*`, `useUser`/`useAdmin` |
| `fix(<area>)` | Bug fixes, scoped the same way |
| `perf(<area>)` | Bundle/render performance work |
| `refactor(<area>)` | Behaviour-preserving restructuring |
| `test` | `tests/**` and `src/**/*.test.ts{,x}` when tests are the point of the change |
| `chore(config)` | `vite.config.ts`, `tsconfig*`, `eslint.config.js`, `playwright.config.ts` |
| `chore(deps)` | `package.json` / lockfiles alone |
| `chore(claude)` | `.claude/**`, `CLAUDE.md` |
| `docs` | Standalone doc changes with no code change |

### Grouping rules (enforce strictly)

- NEVER mix unrelated feature changes in one commit
- NEVER use `git add -A` or `git add .` — always `git add <specific files>`
- Doc updates for a feature go in the SAME commit as that feature
- A test written alongside a feature goes with the feature, not in a separate
  `test` commit
- If a file spans groups, put it with the group that owns its primary purpose

### Commit message format

```
type(scope): short description (imperative mood, <=72 chars)

Optional body: one or two sentences explaining WHY, not WHAT.
```

- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`
- **Imperative mood required** — first word is `add`, `fix`, `update`,
  `remove`, `refactor`, `implement`, `simplify`, `extract`, `rename`. Not
  `added`/`fixed` (past tense) and not `updating`/`removing` (gerund).
- Subject line must NOT end with a period
- Body wraps at 72 characters
- **NEVER** include `Co-Authored-By:` for an assistant, an email address, AI
  attribution, or the 🤖 emoji

Match the existing history — check it before writing:

```bash
git log --oneline -15
```

### Execute in order

1. Apply all doc edits first
2. Stage specific files: `git add path/to/file1 path/to/file2`
3. Commit with a heredoc for multi-line messages
4. Repeat per logical group
5. `git status` at the end to confirm nothing was missed

---

## Phase 4: Verify before reporting done

Do not claim a clean commit without running the checks:

```bash
npx tsc -b
npm run lint
npm test
```

If anything fails, say so plainly with the output and include a fix plan — do
not report success. A commit that breaks the connected branch breaks the
Lovable editor (CLAUDE.md Rule 0).

---

## Phase 5: Report

```
## Commit summary

| # | SHA | Message | Files |
|---|-----|---------|-------|
| 1 | abc1234 | feat(journal): add the stop-reason column | src/routes/JournalPage.tsx, src/lib/risk.ts |
| 2 | def5678 | test: cover the null stop path | src/lib/risk.test.ts |

## Documentation updates
- README.md Scripts table: documented `npm run e2e:cloud`
- docs/TEST_COVERAGE_AUDIT.md: added the journal stop-reason verdict

## Verification
  npx tsc -b     → clean
  npm run lint   → clean
  npm test       → 214 passed

## Branch
  chore/short-description (not pushed — run `git push -u origin <branch>`)
```

If any check failed, append:

```
## Fix plan
1. <test name> in <file:line>
   Error: <exact message>
   Fix:   <specific change needed>
```

$ARGUMENTS
