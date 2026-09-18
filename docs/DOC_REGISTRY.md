# Documentation registry

**Last reviewed:** unknown · **Last scanned:** 2026-09-18 · **Owner:** TBD

Which documents this repo maintains, who owns each one, and what code each one
describes. `scripts/docs-audit.mjs` reads the tables below; the prose around
them is for humans and is ignored by the parser.

## Why classes

A single "is this doc fresh?" rule produces wrong answers, because several
kinds of document live here and each one fails differently:

| Class | Meaning | What the audit does |
|---|---|---|
| **A** | **Machine-owned.** A job or tool writes it. | Audits it, writes only outside the generated regions, and **routes** every other fix. Also checks the owning job actually **delivered**. |
| **B** | **Frozen.** A deliberate hand-maintained snapshot. | Nothing. Never read as current, never written. |
| **X** | **Out of scope.** Agent and command instructions, templates, Lovable's own plan records. Not product documentation. | Nothing. Distinct from unclassified, which means the registry has a gap. |
| **C** | **Dated record.** An audit or design record whose whole purpose is to state what was true on its date. | Read for cross-references only. **Never re-dated, never rewritten** — rewriting a dated record destroys the record. May receive an *appended*, dated status block. |
| **D** | **Living.** Describes the system as it is now. | Full audit: review marker, issue/PR citations, links, and drift against the code it declares. |

### Class A is audited, not skipped

An owning job existing is not evidence its output landed. This repo's
machine-written artefact is the vendored OpenAPI snapshot
(`tests/fixtures/stocks-openapi.json` plus the generated
`src/types/stocksOpenApi.gen.d.ts`): `npm run contract:sync` writes it and
`npm run contract:check` gates it in CI. That gate has caught `main` **already
red** at least four times — #60 ("main was red on contract:check at 97e1d83"),
#64 ("main has been red on contract:check since that landed"), CI run 220 on
2026-09-15, and #68 ("the snapshot went stale when stocks main moved, so any PR
opened since would have failed the same way").

Each of those is the same failure: the snapshot claimed to represent stocks
`main` and did not, so every hand-written type and fixture checked against it
was being validated against fiction. The audit therefore runs `contract:check`
itself rather than trusting that CI would have caught it — CI only runs on a
PR, and the window where `main` is red is exactly the window where nobody is
looking.

### Class A is a property of a region, not of a file

`AGENTS.md` is 10 lines, all of them inside `<!-- LOVABLE:BEGIN -->` /
`<!-- LOVABLE:END -->`. Lovable rewrites that fence, so no line of it is ours
to edit — but the audit still checks that nothing has appeared *outside* the
fence, because a hand-written paragraph added below it would be silently
destroyed on the next regeneration and nobody would know which one.

That check generalises, and it is why the registry declares regions rather than
files. In the stocks repo the same column showed 1,325 lines of hand-written
prose sitting inside files labelled machine-owned, with no job writing them and
no audit reading them. The spec grammar:

| Spec | Owns |
|---|---|
| `all` | every line (a wholly rendered artefact) |
| `inventory:*` | every `<!-- inventory:NAME:start/end -->` pair |
| `mark:NAME` | the `<!-- BEGIN NAME -->`..`<!-- END NAME -->` pair |
| `fence:NAME` | the `<!-- NAME:BEGIN -->`..`<!-- NAME:END -->` pair (Lovable's shape) |
| `line:REGEX` | every line matching REGEX |
| `prose:PATH` | the remainder is model-written, by the prompt at PATH |
| `exhaustive` | the file is wholly machine-owned — any line outside the declared regions is a **P1**, because a regeneration will discard it |

A declared region that matches nothing is a **P1**: the writer stopped emitting
it and this table is claiming a coverage that no longer exists. An empty region
cell on a Class A row is also a finding, never "assume the whole file is
generated".

## The review marker

Living docs carry one line, as the first paragraph after the H1:

```
**Last reviewed:** YYYY-MM-DD · **Depth:** verified|scanned · **Against:** `<sha>` · **Last scanned:** YYYY-MM-DD · **Owner:** TBD
```

`verified` means the claims were re-read against the code, the issues or live
state **in that run**, with the evidence recorded in the PR. `scanned` means
only the mechanical checks ran, and is the honest default. A document nobody
has reviewed reads `unknown`, never today's date: a review date bumped without
a re-read is a freshness badge on an unread document. `Last reviewed` moves
only when someone confirms the claims; `Last scanned` moves every run.
`Against:` pins the `origin/main` commit reviewed against, so the next run
diffs from a commit rather than guessing from a date.

Placement is "the first paragraph after the first H1", never a fixed line
number: seven living docs here open with an HTML comment block and carry their
H1 on line 9, where a line-3 insert would land inside the comment.

## Registry

`Declared code paths` drives the drift check: when those paths gain content
commits after the doc's `Against:` SHA, the doc is queued for re-review. Pure
renames are ignored, so a file-move wave does not flag every document.

| Class | Path glob | Declared code paths | Generated regions |
|---|---|---|---|
| A | AGENTS.md | | fence:LOVABLE; exhaustive |
| C | docs/LOVABLE_COMMITS_REVIEW.md | | |
| C | docs/TEST_COVERAGE_AUDIT.md | | |
| C | docs/expected-move-affordances-design.md | | |
| C | docs/journal-one-stop-shop-design.md | | |
| C | docs/solyra-landing-page-design.md | | |
| D | README.md | package.json, vite.config.ts, playwright.config.ts, scripts/e2e-server.mjs, tests, tsconfig.json | |
| D | CLAUDE.md | src/lib/authedFetch.ts, src/lib/apiTargets.ts, vite.config.ts, .github/workflows | |
| D | FRONTEND.md | src/routes, src/components | |
| D | docs/UI-SCREENS.md | src/routes, src/components, src/App.tsx | |
| D | docs/DESIGN_SYSTEM.md | src/index.css, vite.config.ts, src/components/primitives | |
| D | docs/E2E_TEST_PLAN.md | tests, playwright.config.ts, scripts/e2e-server.mjs | |
| D | docs/REDESIGN.md | src/components, src/index.css | |
| D | docs/STRAT_ENGINE_FRONTEND_DESIGN_BRIEF.md | src/routes/AdminPage.tsx, src/hooks/useAdmin.ts | |
| D | docs/options_flow_data_contract.md | src/types, src/hooks/useOptionsGreeks.ts | |
| D | docs/solyra-landing-page-plan.md | src/components/landing | |
| D | docs/DOC_REGISTRY.md | scripts/docs-audit.mjs | |
| X | .claude/agents/*.md | | |
| X | .claude/commands/*.md | | |
| X | .github/pull_request_template.md | | |
| X | .lovable/plan/*.md | | |

`Frontend.drawio` and `Frontend-icons.drawio` are deliberately absent. They are
hand-maintained here — unlike the stocks `Architecture*.drawio`, no job writes
them — and they are XML, so there is no H1 to stamp and the link checks would
read markup rather than prose. Registering them would produce noise, not
coverage. This paragraph exists so the omission reads as a decision rather than
a gap; the audit only pulls a non-Markdown file into the document set when the
registry names it.

## Claims

Numeric assertions in the prose, and how to re-derive each one. The stocks repo
delegates counting to `doc_inventory.py`; this repo has no counter, so the
derivation is declared here instead of a person remembering to re-check.

Both seed rows were **wrong** when this table was written, which is the point:
`CLAUDE.md` said "~73 bare `fetch('/api/...')` calls across ~30 files" when the
tree held 87 across 34, and listed three `OPEN_PREFIXES` when
`src/lib/authedFetch.ts` held four — in the very paragraph telling you to keep
that list in sync with the backend.

Capture group 1 of `Pattern` is the claimed number. Derivations are a fixed
grammar (`grep-count`, `grep-files`, `list-len`), not a shell string: a registry
row is documentation, and documentation that executes arbitrary commands is a
different thing.

| Doc | Pattern | Derivation |
|---|---|---|
| CLAUDE.md | ~(\d+) bare relative | grep-count src fetch\(\s*['"`]/api/ |
| CLAUDE.md | across ~(\d+) files | grep-files src fetch\(\s*['"`]/api/ |
| CLAUDE.md | (\d+) files under `src/` and | grep-files src,tests Rule 3\.7\|§3\.7 |
