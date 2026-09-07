---
description: Drive a GitHub issue to a defensible close — re-verify, root-cause, guard the class, prove it, then close with evidence
argument-hint: "[issue-number | label | nothing for triage]"
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Agent
---

# Resolve Issue

You are the Issue Resolver for **Solyra**. Take an issue from "filed" to
"closed with evidence", in the order this project has learned to work.

The order matters more than the fix. Every phase exists because skipping it has
already cost a session across these two repos: a PR merged past five
resolved-but-never-applied review threads, a feature shipped as a permanent
no-op, a stale surface that sat 85 days because nobody re-ran the query before
deciding what was broken.

**Rules that bind this whole command**: Rule 0 (never rewrite published git
history — Lovable), Rule 2.5 (review gate), Rule 4 (no silent fallbacks),
Rule 5 (one source of truth for math), Rule 6 (cross-repo API contract drift).

**Solyra is the frontend only.** The API, the research pipeline and the GCP
jobs live in `TeneikaAskew/stocks`. A large share of issues filed here root-
cause over there. Establish which side owns the fix in Phase 2, before writing
code on this side to paper over a backend shape.

---

## Phase 0 — Pick the issue and classify it

With no argument, list what is open and stop for a decision:

```bash
# via MCP: mcp__github__list_issues owner=TeneikaAskew repo=solyra state=OPEN
#          orderBy=UPDATED_AT direction=DESC minimal_output=true
```

Report counts by label, then ask which to take. Do not pick one yourself unless
the user named a label or a number.

With an issue number, read the body **and every comment** first. Comments carry
the correction history: a challenged severity, a review reply that already
implemented half of it, a prior status comment naming what is still open.

Check whether work already exists before starting more:

```bash
git fetch origin
git branch -r | grep -iE "<issue-keyword>"
# and: mcp__github__search_pull_requests q="repo:TeneikaAskew/solyra <issue-number>"
```

**Branch before touching any file** (CLAUDE.md Rule 2). Never edit on the
Lovable-connected branch:

```bash
git status && git rev-parse --abbrev-ref HEAD
git checkout -b fix/<short-description>    # or feature/ chore/ docs/ test/
```

Rule 0 has no escape hatch: no force-push, no rebase, no amend or squash of
anything already pushed, anywhere in this repo. A merge commit is always the
answer to a conflict here.

---

## Phase 1 — Re-verify the finding before touching anything

**Not optional, and it comes first.** An issue body is a claim made on the date
it was filed. Produce the evidence in the same breath, or say plainly you have
not checked.

Reproduce it. For a UI or data-display issue that means actually rendering it,
not reading the component:

```bash
npm run dev                      # proxies /api to the local or staging backend
VITE_NO_BACKEND=1 npm run dev    # only for offline UI work; stubs auth as open
npm test -- <pattern>
npx playwright test tests/<page>/<spec>.spec.ts
```

For anything about a value the API returns, look at the real response, not the
fixture. The fixtures `satisfies` the types, so they cannot tell you the server
still sends that shape.

Three outcomes, all legitimate:

1. **Still true.** Record the current behaviour, with the output or a screenshot.
2. **No longer reproduces.** Say so with the evidence and close on it. Name what
   changed if you can find it.
3. **The claim was wrong.** Also a result: say which part, with the
   counter-evidence. A well-evidenced "do not fix" closes an issue as
   legitimately as a patch does.

---

## Phase 2 — Root cause, plural, and which repo owns it

Do not stop at the first mechanism. Ask, in this order:

1. **Is the data wrong, or is the render wrong?** A `0%` where the server sent
   `null` is a Rule 4 violation here. A `0%` the server actually sent is a
   stocks issue. Check the network response before editing a component.
2. **Does an endpoint already return this?** Rule 5: the app never duplicates
   financial math. If the value should be computed and is not, the fix belongs
   in `lib/` on the stocks side, not in a new helper here.
   ```bash
   grep -rn "<field>" src/types/ src/mocks/ tests/helpers/fixtures/
   grep -rn "api/<path>" src/
   ```
3. **Who else consumes it?** A shared hook or a `src/lib/` helper has more
   callers than the page that filed the issue.
   ```bash
   grep -rn "<hook|helper>" src/
   ```

If the root cause is in stocks, file or update the issue there and say so on
this one. Do not add a frontend workaround that hides a backend defect; that is
how a fabricated value gets a second home.

For an architecturally significant call, post the proposed resolution on the
issue and have it challenged before building it: numbered questions about
severity, about the order of operations, and about whether the guard
generalises.

---

## Phase 3 — Order the fix: boundary first, source second, class third

1. **Stop the misinformation at the presentation boundary.** A missing value
   renders as `—` with an "unavailable" badge, never as `0`. That em-dash render
   is the *only* Rule 4 exemption, and it lives at the presentation boundary:
   a hook, a fetch wrapper, a parser or `src/lib/risk.ts` keeps returning `null`.
   Copy `src/lib/format.ts`, `src/components/dashboard/MovementRead.tsx`, or
   `deltaText` in `src/components/primitives/index.tsx`.
2. **Fix the source.** Here, or paired with a stocks PR when the shape is wrong
   on the server.
3. **Guard the class.** Extract the logic as a pure helper and unit-test it, the
   way `deltaText`, `fmtProbPct`, `riskReward` and `buildReviewQuote` exist as
   standalone exports precisely so the rule is testable without mounting a
   component. `MovementRead.test.tsx` asserts null does **not** coerce to `0%`;
   that is the shape of guard to copy.

Do not extend an existing silent fallback you find on the way. Mark it
`// AUDIT-2026-05-13: silent fallback — <why reachable>` and keep going.

---

## Phase 4 — Write the failing test first

Before the fix, not after. Run it against the **unfixed** code and paste the
failure. A test that passes against pre-fix code is testing something else.

- **Unit (Vitest)**: colocated in `src/` as `*.test.ts{,x}`. Prefer extracting a
  pure helper and testing that over mounting a component.
- **E2E (Playwright)**: `tests/<page>/`, one folder per page or area, never at
  the `tests/` root. Every `/api` call is intercepted with `page.route`; the
  suite is hermetic and needs no backend. Add the payload to
  `tests/helpers/fixtures/<page>.ts` so the page's whole endpoint fan-out is
  covered.

**Do not weaken the isolation in `playwright.config.ts` to make a test pass.**
Port 5199 with `reuseExistingServer: false`, `workers: 1`, and the `warmup`
project are load-bearing and carry their measurements in-file. A timing-out
spec is an unmocked endpoint, a leaked dev server, or a real regression, in that
order of likelihood. Use the `playwright-tester` agent to diagnose.

---

## Phase 5 — Implement

Read every related file first; extend an existing module rather than adding a
parallel one. `src/lib/` already has a home for most pure helpers
(`format.ts`, `dates.ts`, `risk.ts`, `time.ts`, `marketSession.ts`).

Standing gates while writing:

- **Rule 4** — no `?? 0` / `|| 0` / `?? 0.5` / `?? ''` on a financial field, no
  `catch { return [] }` in a data-access path, no fabricated success. Missing
  values stay `null` end to end. Run the `fallback-guard` agent on the diff.
- **Rule 5** — no new financial math here. If it should exist, add it to stocks.
- **Rule 6** — if `src/types/` changes, confirm the stocks router actually
  returns that shape; never reshape a type to make a fixture compile. If the
  shape changed on the stocks side: regenerate its OpenAPI snapshot there, then
  here run `npm run contract:sync` and update `src/types/` and the affected
  fixture in the same change set, and say so in **both** PR descriptions.
- Never re-introduce a hardcoded backend origin. `src/lib/apiTargets.ts` is the
  one place origins and static-host detection live, imported from both
  `vite.config.ts` and `src/lib/authedFetch.ts`.
- `OPEN_PREFIXES` in `authedFetch.ts` stays in sync with the backend's
  `api/auth._OPEN_API_PREFIXES` in stocks.

Run the gates and paste real output:

```bash
npx tsc -b            # the check that catches fixture drift
npm test
npm run lint
npm run build
npm run e2e
npm run contract:check    # fails if the vendored OpenAPI copy is stale
```

`npm run build` runs `tsc -b` across `app`, `node` and `test` projects, so a
type change that breaks a fixture fails the build. Keep it that way: never
loosen a type to make a fixture compile.

---

## Phase 6 — Prove it

Verify the **thing that was broken**, not a neighbour. A suite that goes green
while the specific defect still renders is not evidence.

For a UI fix, show it: run the page and attach before and after. For a data
handling fix, show the null path producing `—` rather than `0`. For a
contract fix, show `contract:check` clean and the mock validating against the
declared schema.

Note what the contract checks do *not* cover, so a green run is not overclaimed:
an operation without a `response_model` in stocks has an empty schema and
validates trivially, and validating one sample proves the sample is permitted,
not that the type accepts every response the server may now emit.

---

## Phase 7 — PR

Fill `.github/pull_request_template.md` as a layout: Summary linking the issue,
the Rule 6 cross-repo checkboxes with the paired stocks PR number when there is
one, the Rule 4 checkbox, real command output under Testing, before/after
screenshots for UI.

Commit messages: conventional format, imperative mood, subject under 72 chars,
body wrapped at 72, no AI attribution and no `Co-Authored-By` for an assistant.
The body carries the mechanism, not just the change.

```bash
git push -u origin fix/<short-description>
```

Retry a network failure up to 4 times with backoff (2s, 4s, 8s, 16s). Never
force-push (Rule 0). Then subscribe to the PR's activity so CI and review
events wake this session.

Keep the Lovable-connected branch in a working state at all times: a broken
build there is a broken editor, not just a red CI run.

---

## Phase 8 — Merge gate (Rule 2.5)

Automated review lands a few minutes after the PR opens. **Never merge inside
that window.** An empty review list at 60 seconds means "wait", not "clean".
In order:

1. Read the review comments — **before** checking CI, not after.
2. Confirm a review exists for the **current head SHA**. All threads outdated
   means the head is unreviewed regardless of how many show resolved. Review
   listings return oldest first, so the current review is on the last page.
3. Every thread fixed-and-resolved, naming what changed and the covering test
   and commit, or replied to with why not. Zero unresolved is the bar.
4. Verify each finding against the code before fixing it: reproduce, write the
   failing test, fix, show it pass.
5. Only then CI green on the current head, and no merge conflict.

Resolving is part of the fix. A finding fixed in a later PR with the original
thread left open reads as unaddressed to everyone but you; if the fix landed
elsewhere, say which PR.

A finding whose fix exceeds this PR's scope becomes a **new issue** with the
provenance recorded, so the thread resolves against a tracked item.

---

## Phase 9 — Close with evidence, or say what remains

Post a status comment on the issue:

```markdown
## Status <date> — <what landed>, branch `<branch>`

### Verified before touching anything
<the Phase 1 reproduction and its output>

### Root cause
<each cause, with the evidence that established it; which repo owns it>

### What landed (commits `<sha>`)
**<Boundary>** — <file>: <what it now renders>
**<Source>** — <file>: <what it now returns>
**<Guard>** — <file>: <what it now catches>

### Tests
<names and counts; written before the fix and run against unfixed code first>
<tsc -b / npm test / npm run e2e results>

### Still open before this closes
<the explicit remainder, or "nothing">
```

End every GitHub comment with the attribution footer:

```

---
_Generated by [Claude Code](https://claude.ai/code)_
```

**Close only when the issue's own acceptance criteria are met.** If part is met,
post the status and leave it open with the remainder named. Merged is not the
same as resolved, and a paired stocks PR that has not deployed yet means the
user still cannot see the fix.
