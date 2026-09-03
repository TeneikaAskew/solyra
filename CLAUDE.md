# Project Instructions for Claude Code — Solyra

## Project Overview

Solyra is the **frontend** for the trading platform: a React 19 + TypeScript
single-page app covering the market dashboard, live quotes, charts,
options/gamma analysis, signals, the trade journal, AI insights, and catalysts.

**This repo holds the frontend only.** The FastAPI backend, the research
pipeline (`lib/`), and the GCP jobs live in the **stocks** repo
(`TeneikaAskew/stocks`) and deploy together as the `trading-platform` Cloud Run
service. Solyra's dev server proxies `/api/*` to that backend, so the browser
sees same-origin requests and none of the ~73 bare `fetch('/api/...')` call
sites need to know where the API actually is.

| | |
|---|---|
| Stack | React 19, Vite 7, TypeScript 5.9, Tailwind 4, HeroUI 3, TanStack Query/Table, Recharts, d3, lightweight-charts, Zustand, Firebase Auth |
| Tests | Vitest (unit, colocated in `src/`), Playwright (E2E, in `tests/`) |
| Editor sync | [Lovable](https://lovable.dev) — commits on the connected branch sync into the editor |
| Backend | stocks repo → `trading-platform` (prod) / `trading-platform-staging` (Cloud Run) |

---

## Critical Rules — MUST FOLLOW

### 0. Lovable history constraint — NON-NEGOTIABLE

This repo is connected to Lovable. **Never rewrite published git history** —
no force-push, no rebasing/amending/squashing commits that are already pushed.
It rewrites history on Lovable's side and the user can lose project history.

Commits pushed to the connected branch sync back into the Lovable editor, so
**keep that branch in a working state** — a broken build there is a broken
editor, not just a broken CI run.

This is the one rule with no escape hatch. See `AGENTS.md`.

### 1. File Management Philosophy — READ FIRST, CREATE LAST

- **ALWAYS** read and understand existing files before making any changes
- **SEARCH** thoroughly with Grep/Glob/Read before assuming something is absent
- **NEVER** create a new file if the functionality belongs in an existing one
- **PREFER** extending an existing module over creating a parallel one

Before creating any file, ask: have I read all the related existing files? Can
this go in an existing module? Is there already a pattern for this here?

This repo is small enough that duplication is always a choice, never an
accident. `src/lib/` in particular already has a home for most pure helpers
(`format.ts`, `dates.ts`, `risk.ts`, `time.ts`, `marketSession.ts`).

### 2. Branching Strategy

**Never edit on the Lovable-connected branch directly.** Start on a feature
branch, open a PR.

#### First action of every session

```bash
git status
git rev-parse --abbrev-ref HEAD
```

If you're on the connected branch, create a feature branch before touching any
file:

```bash
git checkout -b feature/short-description   # new features
git checkout -b fix/short-description       # bug fixes
git checkout -b docs/short-description      # doc-only changes
git checkout -b chore/short-description     # refactors, deps, tooling
git checkout -b test/short-description      # test-only changes
```

Push with upstream tracking on the first push:

```bash
git push -u origin feature/short-description
```

Use kebab-case, keep under ~40 chars, no emoji, no PR/issue numbers.

#### Hard rules

- **Never** commit directly to the connected branch for any non-trivial change
- **Never** `git push --force` anywhere in this repo (see Rule 0)
- **Never** `git rebase` or `git reset --hard` on a pushed branch
- All non-trivial changes go through a PR

#### What "trivial" means

Only these may go straight to the connected branch: single-line typo fixes in
markdown, README link corrections, and `.gitignore` additions for
already-ignored locally-generated files. Everything else — components, hooks,
types, tests, config, dependency bumps — goes through a feature branch + PR.

### 2.5. Review Feedback — read it BEFORE merging, resolve it AFTER fixing

Automated review lands a few minutes after a PR opens. **Never merge inside
that window.** Before any merge:

1. Read the review comments — **before** checking CI, not after. An empty
   result 60 seconds after opening the PR means nothing; wait and re-check.
2. Every thread either resolved, or replied to with why it isn't being
   actioned. Zero unresolved threads is the bar.
3. Only then CI, then merge.

A PR is done when CI is green **and** there are no unresolved review threads
**and** there is no merge conflict. Green CI alone is not done.

**Resolving is part of the fix.** A finding fixed in a later PR with the
original thread left open reads as unaddressed to everyone but you. When you
fix a finding: reply on the thread with what you verified, what changed, and
the test that covers it — naming the commit — then resolve it. If the fix
landed in a different PR, say which one.

**Verify the claim before fixing it.** Reviewers are usually right, but a fix
built on a misread finding is worse than no fix. For each finding: confirm it
against the code, write the failing test first, then fix, then show the same
test passing.

### 3. Commit Guidelines

- **NEVER** include AI attribution in commits — no "generated by", no
  `Co-Authored-By:` for an assistant, no 🤖 emoji, no Claude-specific signature
- Write commit messages as a human developer on the team would
- Conventional format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`
- **Imperative mood required** — "add", "fix", "update", not "added"/"adding"
- Subject line ≤72 chars, no trailing period; body wraps at 72

### 4. No Silent Fallbacks — Production-Grade Data Discipline

**This is the rule the codebase cites most.** 37 files under `src/` and
`tests/` reference "CLAUDE.md Rule 3.7" or "§3.7" — that numbering comes from
the stocks repo, where the rule originated. **It is Rule 4 here; both names
refer to this section.** Do not renumber the existing citations.

A "silent fallback" is any code path that, on failure or missing input,
returns a numeric/empty/sentinel value the caller cannot distinguish from a
legitimate result. They lie to downstream code and conceal bugs, stale data,
and vendor outages.

#### The principle: INTERNAL vs EXTERNAL

Every failure mode is one of two things:

- **`INTERNAL`** — code we own (this app, the API we ship alongside it). A
  failure means there is a bug. Silencing it conceals the bug. **Fail loud.**
- **`EXTERNAL`** — a vendor API or network we don't control. We can't prevent
  the failure; we *can* detect it, surface it explicitly, and let the user see
  that the data is unavailable. **Return/render an explicit unavailable
  state, never a fabricated value.**

If you're adding a `try`/`catch` that returns an empty container "just in
case," ask which bucket it is. Either answer leads away from the fallback.

#### Forbidden in this repo

1. **`?? 0` / `|| 0` / `?? 0.5` / `?? ''` on a financial field.** Prices,
   volume, open interest, Greeks (delta/gamma/theta/vega/rho/iv), P&L, return
   %, win rate, R:R, RSI/stochK/ATR/VWAP/RVOL, sentiment, confidence, streaks,
   durations. `0` must never be ambiguous with "missing." Keep `null`
   end-to-end and let the display layer render it.

2. **`catch { return [] }` / `return {}` / `return null` / `return 0`** in a
   data-access path (a hook, a fetch wrapper, a parser). Re-throw, or surface
   an error state the UI can render.

3. **Fabricated success.** A form that reports "saved" when the request
   failed, an import that silently drops unparseable rows, a badge that shows
   a stale value as live. Errors must be **visible** — see
   `src/components/landing/waitlist.ts` and
   `src/components/journal/ImportTradesModal.tsx` for the pattern (amber-
   labeled partial success plus an honest skipped-row list).

4. **Hardcoded neutral defaults** standing in for a real value — RSI 50, delta
   0.5, a $0 GEX reading. See `src/components/options/SwingMode.tsx:156` for
   why a fabricated `$0` is worse than nothing: it reads as a real "flat"
   measurement.

#### The one allowed fallback

**Rendering `null` / `NaN` as an em-dash `—` at the presentation boundary**,
ideally with an "unavailable" badge. This is the *only* exemption, and it
exists because the DOM cannot render `null`. The boundary is presentation
formatting, not JSX syntax: a pure formatter whose only job is producing
display text (`src/lib/format.ts`, `deltaText`) may return `—` for a missing
value even though it lives outside JSX — that is exactly what the canonical
helpers below do. What the exemption never covers is data access or
calculation: a hook, a fetch wrapper, a parser, or a math helper
(`src/lib/risk.ts`) must keep returning `null`, because a value coerced there
flows onward as data rather than pixels.

Canonical implementations to copy:

- `src/lib/format.ts` — the `—` placeholder helpers
- `src/components/dashboard/MovementRead.tsx` — em-dash + unavailable badge,
  with `MovementRead.test.tsx` asserting null does **not** coerce to `0%`
- `src/components/primitives/index.tsx` — `deltaText`, extracted as a pure
  helper precisely so the Rule can be unit-tested
- `src/lib/risk.ts` — returns `null` rather than a fabricated ratio

Test fixtures and mocks are also exempt: they legitimately return canned data
to exercise specific branches.

#### Forbidden phrases — if you type one, the code is wrong

`value ?? 0` / `value || 0` on a financial field · `catch { return [] }` ·
`.fillna(0)`-equivalents · `Number(x) || 0` · silently swallowing a rejected
promise · `if (!data) return <nothing/>` as the *only* handling of a failure

#### When you find an *existing* fallback

You are not obligated to fix it in your current PR. But:

- **Don't pattern-match off it.** An existing swallow is a bug, not a contract.
- **Don't extend it.** Every new layer makes the eventual fix harder.
- **Do** mark it `// AUDIT-2026-05-13: silent fallback — <why it's reachable>`
  if you touch an adjacent line, so the backlog stays greppable. See
  `src/components/journal/TradeMarkingChart.tsx:202` for the existing marker.

### 5. One Source of Truth for Math

**The React app never duplicates financial math.** Indicators, gamma, playbook
conditions, and trade analytics live in `lib/` (Python) in the stocks repo and
are exposed via FastAPI endpoints. The frontend consumes them.

This is not aspirational — it is already enforced in the code, and the
comments explain why:

- `src/lib/indicators.ts` is **types only**: "The actual math lives in
  lib/indicators.py and is exposed via POST /api/live/indicators. The frontend
  never recomputes these — that was the source of drift between TS and Python
  implementations."
- `src/lib/playbookEvaluator.ts` used to host a regex condition evaluator;
  that moved server-side. The app builds a `MarketSnapshot` and posts it to
  `/api/playbook/evaluate`.
- `src/components/playbook/SetupCardDetails.tsx:10` cites the rule directly.

**What legitimately lives here**: presentation-layer derivation that has no
server equivalent and no risk of drift — `formatGex.ts` (notation),
`format.ts` (display), `dates.ts` / `time.ts` / `marketSession.ts` (client
clock), `risk.ts` and `journalStats.ts` (journal aggregates computed from rows
the server already returned).

**Before adding any new calculation to `src/`**, ask: does an endpoint already
return this? If yes, consume it. If it *should*, add it to the stocks repo
instead of computing it twice.

### 6. Cross-Repo API Contract Drift

Solyra's response types (`src/types/`) and its E2E fixtures
(`tests/helpers/fixtures/`) are hand-maintained **here**, while the API that
produces those shapes lives in **stocks**. The fixtures use `satisfies`
against the real types, so a fixture can't drift from a type — but **nothing
mechanically ties either one to the actual FastAPI response.**

That means: a renamed or removed field in a stocks router passes CI in both
repos and breaks solyra at runtime.

So, when a change touches an API contract:

- Changing a shape in stocks → update `src/types/` and the affected fixture in
  the same change set, and say so in both PR descriptions.
- Changing `src/types/` here → confirm the stocks router actually returns
  that shape; don't reshape the type to match a fixture.
- Adding a new endpoint consumer → add its fixture to
  `tests/helpers/fixtures/<page>.ts` so the E2E suite covers the fan-out.

`npm run build` runs `tsc -b` across all three TS projects including `tests`,
so a type change that breaks a fixture fails the build rather than drifting
silently. Keep it that way — never loosen a type to make a fixture compile.

---

## Testing

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | `tsc -b` across `app`/`node`/`test` projects, then `vite build` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (`src/**/*.test.ts{,x}`) |
| `npm run test:watch` | Vitest watch mode |
| `npm run e2e` | Playwright E2E (boots its own Vite on :5199) |
| `npm run e2e:cloud:auth` | Interactive Google/IAP sign-in, saves cookies |
| `npm run e2e:cloud` | Headless run against the deployed Cloud Run URL |

### Unit — Vitest

Colocated in `src/` as `*.test.ts{,x}`, next to the code they cover. Prefer
extracting a pure helper and testing that over mounting a component — this is
why `deltaText`, `fmtProbPct`, `riskReward`, and `buildReviewQuote` exist as
standalone exports.

### E2E — Playwright

In `tests/`, and **hermetic**: every `/api` call is intercepted with
`page.route`, so they need no backend and no network. Test data lives in
`tests/helpers/`:

- `mocks.ts` — `mockCommon` (cross-cutting endpoints every page hits) plus the
  `M` fulfil helpers
- `fixtures/<page>.ts` — per-page typed payloads and a `mockXxxApi(page)`
  helper covering that page's full endpoint fan-out

Playwright's `webServer` runs **`node scripts/e2e-server.mjs --port 5199`**,
not `npm run dev` directly. That launcher owns port and concurrency hygiene:
it detects a leaked Vite from a hard-killed run, verifies the listener really
is *this checkout's* Vite before killing it, and uses a PID-checked lockfile
(`.e2e-server.lock`) so a second concurrent run refuses loudly rather than
sharing a server and producing garbage results for both. See
`docs/E2E_TEST_PLAN.md` §6.

**Do not weaken the isolation in `playwright.config.ts`.** Its three load-
bearing settings are documented in-file with the measurements that justify
them:

- **Dedicated port 5199** with `reuseExistingServer: false` — never adopt a
  dev server this config didn't configure, or an unmocked endpoint silently
  succeeds against real staging infrastructure
- **`workers: 1`** — measured on the same tree the same day: default workers
  gave 46 failed / 28 flaky / 87 passed with 218 timeouts; one worker gave
  18 failed / 5 flaky / 138 passed with timeouts down to 64. Raise it only
  alongside a dev server that can take the load
- **The `warmup` project** — warms every lazy route so perf budgets measure a
  warm server, not a cold transform

Backend contract tests that made live requests to `:8000` are deliberately
**not** here — they test code this repo no longer contains and belong in
stocks.

### Testing discipline

1. **Test what you suggest.** Before proposing a change, understand its impact;
   write or run tests that validate it.
2. **Give specific feedback.** State what's broken with the error message, what
   was fixed with the file:line, and the test output proving it.
3. **Iterate until green.** Run tests after each change; if they fail, analyze,
   fix, re-run. Document what each iteration found.
4. **Never claim done without evidence.** Run the command and read the output
   before saying it passes.

---

## Environment Notes

### OneDrive + `node_modules` (Windows)

This repo lives under a OneDrive-synced path. OneDrive's Files On-Demand
dehydrates files in `node_modules` to placeholders, and Vite/esbuild reads many
files in parallel during dep optimization — faster than OneDrive can rehydrate
them. The failure mode is a wall of
`[ERROR] Cannot read file "node_modules/.../foo.js": The cloud operation was
unsuccessful.` and a non-zero exit.

Fix — run from **PowerShell**, not Bash (Bash mangles the flags):

```powershell
attrib +P -U /S /D "node_modules\*"
```

(`+P` pin to disk, `-U` clear the unpinned bit, `/S /D` recurse.)

### Where `/api` goes

**`src/lib/apiTargets.ts` is the ONE place backend origins and static-host
detection live.** It is imported from both sides of the toolchain —
`vite.config.ts` (Node, dev-proxy fallback) and `src/lib/authedFetch.ts`
(browser, runtime target for static hosts). Before it existed the staging URL
was duplicated in both, so renaming the Cloud Run service would update one and
silently miss the other. Never re-introduce a hardcoded origin in either file.

If the app ever serves from a domain not in `STATIC_FRONTEND_HOST_SUFFIXES`,
**two** places need the new origin: that suffix list, and the CORS allow-list
in the stocks repo's API.

The dev server picks its proxy target by **probing for a backend**, not by
sniffing env vars:

| Situation | `/api/*` proxied to |
|---|---|
| Something listening on `localhost:8000` | that local backend |
| Nothing is (Lovable preview, fresh clone) | `trading-platform-staging` on Cloud Run |
| `VITE_API_PROXY_TARGET` is set | that URL, unconditionally |

`VITE_NO_BACKEND=1 npm run dev` stubs `/api/config/firebase` with open auth for
offline UI work. It is **opt-in** because that stub shadows a real backend —
it reports `authMode: 'open'` while the API still expects a Firebase ID token,
so every gated call would 401.

### Auth

`src/lib/authedFetch.ts` monkeypatches `window.fetch` to (1) re-point `/api/*`
at an absolute origin when one is configured (using `apiTargets.ts`) and
(2) attach the Firebase ID token. It's a global wrapper because the app makes
~73 bare relative `fetch('/api/...')` calls across ~30 files with no central
client.

`OPEN_EXACT` (`/api/me` — the path itself is open, its sub-paths like
`/api/me/preferences` are gated) and `OPEN_PREFIXES` (`/api/health`,
`/api/config/firebase`) must stay in sync with the backend's
`api/auth._OPEN_API_EXACT` / `_OPEN_API_PREFIXES` in stocks.

---

## Known Stale References

Some comments still point at pre-split paths (`platform/api/...`,
`platform/src/hooks/...`) from when this code lived inside the stocks repo —
e.g. `src/lib/playbookEvaluator.ts` and `src/lib/indicators.ts`. The referenced
*code* is real and still lives in stocks; only the path prefix is stale. Fix
them opportunistically when editing the surrounding lines; don't churn a PR
just to rewrite comments.

---

## Remember

- Quality over speed
- Test everything you change
- Follow the existing patterns in this codebase
- When in doubt, ask for clarification
