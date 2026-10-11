---
feat_id: FEAT-CICD-001
req_ids: [REQ-AUTH-001]
issues: []
canvases: []
done_when:
  - "node scripts/docs-audit.mjs on the PR head reports no count-claim finding, where main at 517c90e reports two at CLAUDE.md:491: claims 73 where the grep-count derivation gives 101, and claims 30 where the grep-files derivation gives 34"
  - "node scripts/docs-audit.mjs reports no finding on the PR head that it does not report on origin/main"
  - "git grep -nE '^[|] [^|]+ [|].*grep-(count|files) src fetch' -- docs/DOC_REGISTRY.md prints one line, the README.md Claims row, so no Claims row derives a fetch count for CLAUDE.md and README.md's row is the only one; on main it prints three, the two CLAUDE.md rows and the README.md row"
  - "git grep -nE '[0-9]+ bare|across ~[0-9]+ files' -- CLAUDE.md prints nothing, so CLAUDE.md states no fetch count; on main it prints CLAUDE.md:29 and CLAUDE.md:491"
  - "git grep -nE '~73 b|about 73 bare' -- . ':!docs/superpowers' ':!docs/DOC_REGISTRY.md' prints nothing; on main it prints CLAUDE.md:29, CLAUDE.md:491, docs/UI-SCREENS.md:229, src/lib/authedFetch.ts:7 and vite.config.ts:14"
  - "git grep -nE 'OPEN(_API)?_PREFIXES[^/]*/api/health., ./api/me.,|everything below it as open|an .OPEN_PREFIXES. entry|sits in OPEN_PREFIXES|the note on OPEN_PREFIXES|OPEN-prefix paths like|authedFetch.ts:(39-)?45[^,0-9-]|api/auth._OPEN_API_PREFIXES|Changes .OPEN_PREFIXES. in|and is .OPEN_PREFIXES. in|[|] .OPEN_PREFIXES. or origin|authedFetch.s OPEN_PREFIXES,|(The|wrapper.s) .OPEN_PREFIXES. (list )?must|^.OPEN_PREFIXES. must' -- . ':!docs/superpowers' ':!docs/solyra-landing-page-plan.md' ':!src/types/stocksOpenApi.gen.d.ts' ':!tests/fixtures' prints nothing; on main it prints 26 lines in CLAUDE.md, the defect template, the five agent and command files, docs/UI-SCREENS.md, src/lib/authedFetch.ts and src/lib/authedFetch.test.ts"
  - "CLAUDE.md's Auth section names OPEN_EXACT with /api/me beside _OPEN_API_EXACT, and OPEN_PREFIXES with /api/health, /api/config/firebase and /api/waitlist beside _OPEN_API_PREFIXES, the entries src/lib/authedFetch.ts:48-49 and stocks platform/api/auth.py:69-70 hold on main; docs/UI-SCREENS.md's SHARED-02 names the same two lists with the same entries; and .github/ISSUE_TEMPLATE/01-defect.yml names /api/me as the OPEN_EXACT path and /api/health, /api/config/firebase and /api/waitlist as the OPEN_PREFIXES paths"
  - "npx vitest run src/lib/authedFetch.test.ts src/mocks/contract.test.ts passes on the PR head, the renamed test 'attaches the bearer token to open paths like /api/me' included"
  - "git diff --name-only origin/main...HEAD names no path outside the twelve files the Design edits, docs/product/02-FEATURE-CATALOG.md and docs/superpowers/"
  - "python3 scripts/gate/spec_gate.py --pr origin/main passes on the PR head"
  - "02-FEATURE-CATALOG FEAT-CICD-001 row shows a Status, this PR's date in Last reviewed and this PR's number in PRs"
status: approved
supersedes: null
---

# State the open-path lists as the code has them, and drop the fetch counts from CLAUDE.md

Approved on 2026-10-11 under the owner's instruction to bring both repositories to a clean,
ready and closed-out state. Line numbers are solyra main at `517c90e`, which includes #255, #258
and #259, unless a line says otherwise. Evidence was read on 2026-10-11 from that commit and from
stocks main at `17bbacd3`.

## Problem

**1. The open-path lists are stated wrongly across the repository.** The code,
`src/lib/authedFetch.ts:48-49`, holds two lists:

```ts
const OPEN_EXACT = ['/api/me'];
const OPEN_PREFIXES = ['/api/health', '/api/config/firebase', '/api/waitlist'];
```

and `isGatedApiPath` (`:98-102`) checks exact membership first, then
`path === p || path.startsWith(p)`. Stocks' `platform/api/auth.py:69-70` on main holds the same
split:

```python
_OPEN_API_EXACT = ("/api/me",)
_OPEN_API_PREFIXES = ("/api/health", "/api/config/firebase", "/api/waitlist")
```

matched by `_path_requires_auth` (`:180-185`) the same way, and its comment (`:57-68`) names
solyra's `OPEN_*` lists as the mirror. The two sides agree entry for entry, and the server
applies them only in `firebase` mode (`auth_middleware`, `:194-197`). The backend list is right.
The split came with #241 (`d976bab`), which did not update the prose. These places still
describe the single four-entry prefix list with `/api/me` in it, or name only the prefix list as
what must stay in sync:

- `CLAUDE.md:494-495`: "`OPEN_PREFIXES` (`/api/health`, `/api/me`, `/api/config/firebase`) must
  stay in sync with the backend's `api/auth._OPEN_API_PREFIXES` in stocks." It puts `/api/me` in
  the prefix list, which would open `/api/me/preferences` and `/api/me/profile` (gated on both
  sides), omits `/api/waitlist`, and names only the prefix list on each side.
- `docs/UI-SCREENS.md` SHARED-02 (`:163-208`): "Frontend (`src/lib/authedFetch.ts:45`):
  `OPEN_PREFIXES = ['/api/health', '/api/me', '/api/config/firebase', '/api/waitlist']` is one
  list, prefix matched for all four entries including `/api/me`", with AC `:201` calling `/api/me`
  "an `OPEN_PREFIXES` entry", the States at `:190-191` naming the backend only, and stale line
  pointers in `:170`, `:179`, `:208`. Its Gaps entry at `:13551-13554` says "The client treats
  `/api/me` and everything below it as open", which #241 fixed. `:793` and `:6366` point at the
  list as `authedFetch.ts:45` (it is at `:48-49`). Six sentences give only the prefix lists as the
  sync contract, "The wrapper's `OPEN_PREFIXES` must match the backend's `_OPEN_API_PREFIXES`
  (CLAUDE.md, Auth)" or close to it: `:6386-6387`, `:7045`, `:7561-7562`, `:8430-8431`,
  `:10560-10561`, `:11376-11377`.
- `.github/ISSUE_TEMPLATE/01-defect.yml:33`: "`OPEN_PREFIXES` is only `/api/health`, `/api/me`,
  `/api/config/firebase` and `/api/waitlist`".
- Agent instructions naming only the prefix list: `.claude/agents/security-scan.md:3` and
  `:143-160` (its check greps `OPEN_PREFIXES` only, so an `OPEN_EXACT` change is not compared),
  `.claude/agents/impact-analyzer.md:106-107`, `.claude/agents/code-reviewer.md:120`,
  `.claude/commands/resolve-issue.md:437-438`, `.claude/commands/commit.md:63`.
- Code comments: `src/lib/authedFetch.test.ts:4` ("/api/me sits in OPEN_PREFIXES"), the test
  name at `:66` ("attaches the bearer token to OPEN-prefix paths like /api/me"), and
  `src/lib/authedFetch.ts:199-200` (the "OPEN_PREFIXES paths included, see the note on
  OPEN_PREFIXES" comment, whose example is /api/me).

**2. CLAUDE.md's fetch counts are stale, and only a FEAT-CICD-001 branch can correct them.**
`CLAUDE.md:491` says "~73 bare relative `fetch('/api/...')` calls across ~30 files"; the two
Claims rows at `docs/DOC_REGISTRY.md:168-169` re-derive them, and `node scripts/docs-audit.mjs`
on main reports "count-claim: CLAUDE.md:491, claims 73, `grep-count src ...` gives 101" and
"claims 30, `grep-files src ...` gives 34". The derivation counts 67 calls in 31 application
files, 33 in two test files and 1 in the comment at `src/lib/authedFetch.ts:8`. The Overview at
`CLAUDE.md:29` repeats "~73" with no Claims row matching it, and the same stale number sits in
`docs/UI-SCREENS.md:229`, `src/lib/authedFetch.ts:7` and `vite.config.ts:14`. #259 already gave
`README.md` the right count ("`src/` holds ~101 bare `fetch('/api/...')` literals, its colocated
tests included", `README.md:15`) and its own Claims row (`docs/DOC_REGISTRY.md:171`,
`| README.md | ~(\d+) bare | grep-count ... |`), which passes on main.

The counts cannot be kept right in CLAUDE.md. The gate treats CLAUDE.md as process, not
documentation (`is_documentation` returns False for `AGENT_FILES`,
`scripts/gate/spec_gate.py:1203-1215`; `is_process_file`, `:1085-1088`), and refuses a traced PR
whose process files belong to another FEAT (`:4107-4110`). So a PR that adds a `fetch('/api/...')`
call cannot correct the count it makes stale: two of the 27 first-parent merges on main from
2026-09-14 to 2026-10-11 changed it, #242 (FEAT-UI-001, 87 to 89) and #241 (FEAT-AUTH-001, 89
to 101).

## Non-goals

- No stocks change. The backend lists are right (Problem 1). Stocks main still cites the old
  solyra list in `docs/product/03-SITE-TRACEABILITY.md:443`, `:1202` and `:1227` and
  `docs/product/09-SECURITY-AUTH.md:152`; they are another repository's records. Its matrix row
  for SHARED-02 (`03-SITE-TRACEABILITY.md:108`) carries the record's title, which is why the
  SHARED-02 heading here stays as it is.
- Not `README.md` or its Claims row: #259 supplies both, and they pass on main.
- Not `docs/solyra-landing-page-plan.md:288`. It shows stocks' `auth.py` line 34 as that plan
  changed it, before the exact/prefix split; rewriting an executed plan step falsifies what the
  plan did. It is excluded from the open-path grep for that reason.
- Not `src/types/stocksOpenApi.gen.d.ts:541` and `tests/fixtures/stocks-openapi.json`, generated
  and vendored from stocks; they say the firebase config path is in `_OPEN_API_PREFIXES`, which
  is true.
- Not the other `authedFetch.ts` line pointers in `docs/UI-SCREENS.md` (for example `:250`,
  `:791`, `:797`, `:817`, `:6363`, `:6365`, `:7067`, `:7583`, `:8454`, `:10592`, `:11400`,
  `:13597`). They point at code #241 moved, not at the open-path lists; refreshing them is a
  UI-SCREENS refresh of its own.
- Not the third CLAUDE.md Claims row, the Rule 3.7 citation count (`docs/DOC_REGISTRY.md:170`,
  checking "38 files under `src/` and `tests/`" at `CLAUDE.md:183`). It carries the same shape of
  risk, but its count changed once in the same four weeks (37 to 38 on 2026-09-17), and moving it
  was not part of this decision.
- Not the narrative at `docs/DOC_REGISTRY.md:155-159`, a past-tense account of what the seed rows
  found; a new paragraph after it says where the fetch-count rows went.
- Not `src/mocks/contract.test.ts:141` and `:462`, which cite `OPEN_PREFIXES` as an example of a
  prefix list, which it is.

## Approaches considered

1. Correct both CLAUDE.md numbers and reword the Overview so the existing Claims rows check it.
   The first draft of this spec. Rejected by the owner on 2026-10-11: any PR that adds or
   removes a bare `fetch('/api/...')` would then raise a count finding it is not allowed to fix.
2. Drop the numbers from CLAUDE.md and its two fetch-count Claims rows, leave the count to
   `README.md` and the row #259 gave it, which any branch may edit, and correct every solyra
   copy of the open-path lists in the same PR. Chosen on 2026-10-11 by the owner.
3. Name the lists without their entries, so the prose cannot go stale when an entry changes.
   Rejected: the entries and the exact/prefix split are what the old text got wrong.

Why FEAT-CICD-001: CLAUDE.md, `.claude/` and `.github/ISSUE_TEMPLATE/` are process files to the
gate, which only a FEAT-CICD-001 branch may change. Executed 2026-10-11 with the real gate from
`517c90e` in the gate suite's own throwaway repositories: the twelve files below on
`feature/feat-auth-001-claude-md-open-paths` fail with "process change(s) (...) belong to
FEAT-CICD-001, not FEAT-AUTH-001", and pass on `feature/feat-cicd-001-claude-md-open-paths`.
The content is FEAT-AUTH-001's open-path contract, hence REQ-AUTH-001, but FEAT-AUTH-001's row
is not touched.

## Design

Twelve files, plus the catalog close-out. Each old text below occurs exactly once on main at
`517c90e`.

### CLAUDE.md

Project Overview, lines 29-30. Replace

```
sees same-origin requests and none of the ~73 bare `fetch('/api/...')` call
sites need to know where the API actually is.
```

with

```
sees same-origin requests and none of the app's bare relative
`fetch('/api/...')` calls need to know where the API actually is.
```

Auth section, lines 490-495 (lines 486-489 stay). Replace

```
(2) attach the Firebase ID token. It's a global wrapper because the app makes
~73 bare relative `fetch('/api/...')` calls across ~30 files with no central
client.

`OPEN_PREFIXES` (`/api/health`, `/api/me`, `/api/config/firebase`) must stay in
sync with the backend's `api/auth._OPEN_API_PREFIXES` in stocks.
```

with

```
(2) attach the Firebase ID token. It's a global wrapper because the app has no
central client: it reaches the API through bare relative `fetch('/api/...')`
calls across `src/`, whose count `README.md` carries and the docs audit checks.

Two lists name the `/api/*` paths the backend serves without a token in
`firebase` mode, and both must stay in sync with stocks'
`platform/api/auth.py`, which splits them the same way. `OPEN_EXACT`
(`/api/me`) mirrors `_OPEN_API_EXACT` and matches that path only, so
`/api/me/preferences` and `/api/me/profile` stay gated. `OPEN_PREFIXES`
(`/api/health`, `/api/config/firebase`, `/api/waitlist`) mirrors
`_OPEN_API_PREFIXES` and matches each path and any path that starts with it.
```

### docs/DOC_REGISTRY.md

Claims rows, lines 168-169. Delete

```
| CLAUDE.md | ~(\d+) bare relative | grep-count src fetch\(\s*['"`]/api/ |
| CLAUDE.md | across ~(\d+) files | grep-files src fetch\(\s*['"`]/api/ |
```

The Rule 3.7 row (`:170`) and the README.md row (`:171`) stay. After line 159 ("that list in
sync with the backend."), add a blank line and:

```
The two `CLAUDE.md` fetch-count rows (calls and files) are gone: the spec gate
lets only a FEAT-CICD-001 branch edit `CLAUDE.md`, so a change that added a
`fetch('/api/...')` call could not correct the count it had made stale.
`README.md`, which any branch may edit, carries the count under its own row
below, and `CLAUDE.md` states no fetch count.
```

### docs/UI-SCREENS.md

SHARED-02, lines 165-183 (the Shows or does paragraph; the heading at 163 stays). Replace the
paragraph with

```
**Shows or does:** Two lists on each side of the split decide which `/api/*` paths work
without a signed in user, and the two sides are identical. Backend
(`platform/api/auth.py:57-70`): `_OPEN_API_EXACT = ("/api/me",)` matches the literal path
only, so `/api/me` itself is open but every sub-path (`/api/me/preferences`,
`/api/me/profile`) is gated; `_OPEN_API_PREFIXES = ("/api/health", "/api/config/firebase",
"/api/waitlist")` matches the path or anything starting with it. Frontend
(`src/lib/authedFetch.ts:38-49`): `OPEN_EXACT = ['/api/me']` and
`OPEN_PREFIXES = ['/api/health', '/api/config/firebase', '/api/waitlist']`, matched the same
way by `isGatedApiPath` (`:98-102`), so the frontend gates `/api/me/preferences` and
`/api/me/profile` too (since #241). A second, narrower check remains: `isIdentityPath`
(`/api/me` or `/api/me/*`, `:122-124`) forces the wrapper to throw rather than send
anonymously when token acquisition fails, and the wrapper attaches a present token to every
`/api/*` request (open or gated) when one is available, so a signed in caller's `/api/me`
reply is never anonymous. The same gated/open classification also decides which 401s mean
anything: `authedFetch` runs a response through `track()` (`src/lib/authedFetch.ts:184-192`)
only when `isGatedApiPath` called the request gated, so a 401 from a gated path calls
`markAuthBlocked()` and may trigger the registered `onUnauthorized` callback, while a 401
from an open path such as `/api/me` never reaches `track()` at all, so neither fires; an open
path answering without a token is expected, not a sign the session is blocked.
```

States, lines 190-191: "- exact-open (backend `/api/me` only, sub-paths gated): " becomes
"- exact-open (`/api/me` only, sub-paths gated, on both sides): ", and "- prefix-open (backend
`/api/health*`, `/api/config/firebase*`, `/api/waitlist*`)" becomes "- prefix-open
(`/api/health*`, `/api/config/firebase*`, `/api/waitlist*`, on both sides)".

Line 201: "(an `OPEN_PREFIXES` entry)" becomes "(the `OPEN_EXACT` entry)", and the test it cites,
"`attaches the bearer token to OPEN-prefix paths like /api/me`", becomes "`attaches the bearer
token to open paths like /api/me`".

After line 204, a new acceptance criterion:

```
- Given a signed in user, when the frontend's request to `/api/me/preferences` answers 401, then the registered `onUnauthorized` callback fires, as for any gated path, while a 401 from `/api/me` does not fire it (`treats /api/me/preferences as gated, matching the server, while /api/me stays open`).
```

Line 206 (Tests): the renamed test, and `treats /api/me/preferences as gated, matching the
server, while /api/me stays open` added to the list.

Line 208 (Code): `platform/api/auth.py:56-70` becomes `:57-70`, and the solyra part becomes
"`src/lib/authedFetch.ts:38-49` (the comment, `OPEN_EXACT` and `OPEN_PREFIXES`), `:98-102`
(`isGatedApiPath`), `:122-124` (`isIdentityPath`), `:184-192` (`track`, `markAuthBlocked`)".

Line 229: "(about 73 bare `fetch('/api/...')` calls across about 30 files, per `CLAUDE.md`)"
becomes "(the bare `fetch('/api/...')` literals whose count `README.md` carries)", README's own
word for them.

Line 793: "`OPEN_PREFIXES` (`authedFetch.ts:45`)" becomes "`OPEN_PREFIXES` (`authedFetch.ts:49`)".

Line 6366: "`OPEN_PREFIXES` (`authedFetch.ts:45`) are open" becomes "`OPEN_EXACT` and
`OPEN_PREFIXES` (`authedFetch.ts:48-49`) are open".

The six sync sentences keep their line breaks; in each, "`OPEN_PREFIXES`" becomes "`OPEN_EXACT`
and `OPEN_PREFIXES`" and "`_OPEN_API_PREFIXES`" becomes "`_OPEN_API_EXACT` and
`_OPEN_API_PREFIXES`". At `:6386-6387`, which says "The `OPEN_PREFIXES` list must match the",
"list" also becomes "lists". The other five read "The wrapper's `OPEN_PREFIXES` must match the
backend's `_OPEN_API_PREFIXES` (CLAUDE.md, Auth)." (`:7045`; `:7561-7562` and `:8430-8431`,
`:10560-10561`, `:11376-11377` wrap it across two lines at different words).

Lines 13551-13554, from "The client treats", become

```
  twice, React Query's one retry). That run predates #241. Since #241 the client opens `/api/me` alone, as the server does (`OPEN_EXACT`,
  `src/lib/authedFetch.ts:48`; `_OPEN_API_EXACT`, `platform/api/auth.py:69`), so a 401 from either route takes the gated path: one retry
  with a fresh token, the session marked blocked and `onUnauthorized` fired (executed 2026-10-11 against the wrapper with mocked
  responses; the committed test `treats /api/me/preferences as gated, matching the server, while /api/me stays open` pins the
  `onUnauthorized` call). What the page shows in that state was not re-run (not checked). The stocks matrix Gaps
  entry for these routes still describes the behaviour before #241.
```

The executed check: the wrapper's own unit-test harness, signed in as one uid, every response
401. For `/api/me/profile` and `/api/me/preferences` the native fetch was called twice, the second
time with the fresh token, `isAuthBlocked()` read true and `onUnauthorized` fired once; for
`/api/me` the native fetch was called once and neither happened (3 of 3 passed, on `11a7950` and
again on `517c90e`).

### .github/ISSUE_TEMPLATE/01-defect.yml

Lines 32-35. Replace

```
        **Most `/api` routes need the bearer token.** `authedFetch`'s
        `OPEN_PREFIXES` is only `/api/health`, `/api/me`, `/api/config/firebase`
        and `/api/waitlist`; everything else 401s to a bare `curl` against a
        deployed host. Either send an `Authorization: Bearer <id token>` header,
```

with

```
        **Most `/api` routes need the bearer token.** The open paths are only
        `/api/me` itself (`OPEN_EXACT`) and `/api/health`, `/api/config/firebase`
        and `/api/waitlist` with any path starting with them (`OPEN_PREFIXES`);
        everything else, `/api/me/preferences` and `/api/me/profile` included,
        401s to a bare `curl` against a deployed host. Either send an
        `Authorization: Bearer <id token>` header,
```

The next line ("or paste the browser DevTools network response, ...") stays. The file stays
valid YAML (checked with `yaml.safe_load`).

### .claude/agents/security-scan.md

Line 3: "auth-gate bypasses in authedFetch's OPEN_PREFIXES, and" becomes "auth-gate bypasses in
authedFetch's OPEN_EXACT and OPEN_PREFIXES, and".

Lines 143-160. Replace the paragraph, the bash block and the first line after it with

````
`src/lib/authedFetch.ts` defines `OPEN_EXACT` (open by exact match) and
`OPEN_PREFIXES` (open by prefix): the endpoints reachable pre-auth. They must
mirror the backend's `_OPEN_API_EXACT` and `_OPEN_API_PREFIXES` in
`platform/api/auth.py` in the **stocks** repo.

```bash
grep -nE -A6 "OPEN_(EXACT|PREFIXES)" src/lib/authedFetch.ts
# Compare the resolved declarations across revisions (merge base → working
# tree, so committed and uncommitted changes both count). Don't grep the diff
# for the names: with a multiline list, an added entry's diff line does not
# contain the list's name and a name-anchored grep misses exactly that edit.
BASE="$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD)"
diff <(git show "$BASE:src/lib/authedFetch.ts" 2>/dev/null | grep -E -A8 "OPEN_(EXACT|PREFIXES)") \
     <(grep -E -A8 "OPEN_(EXACT|PREFIXES)" src/lib/authedFetch.ts) \
  || echo "OPEN_EXACT or OPEN_PREFIXES changed since merge base: flag HIGH, confirm backend parity"
```

Flag **HIGH** on any addition to either list. Widening one client-side does not
````

The rest of that paragraph stays. The block runs (executed on the scratch copy: it prints both
declarations, then the diff and the message, since this change edits a comment near them).

### .claude/agents/impact-analyzer.md

Lines 106-107 become

```
- Changes `OPEN_EXACT` or `OPEN_PREFIXES` in `authedFetch.ts` → must mirror the
  backend's `_OPEN_API_EXACT` and `_OPEN_API_PREFIXES`
```

### .claude/agents/code-reviewer.md

Line 120: "and is `OPEN_PREFIXES` in `src/lib/authedFetch.ts` still correct?" becomes "and are
`OPEN_EXACT` and `OPEN_PREFIXES` in `src/lib/authedFetch.ts` still correct?".

### .claude/commands/resolve-issue.md

Lines 437-438 become

```
- `OPEN_EXACT` and `OPEN_PREFIXES` in `authedFetch.ts` stay in sync with the
  backend's `_OPEN_API_EXACT` and `_OPEN_API_PREFIXES` in stocks'
  `platform/api/auth.py`.
```

### .claude/commands/commit.md

Line 63: "| `OPEN_PREFIXES` or origin resolution changes |" becomes "| `OPEN_EXACT`, `OPEN_PREFIXES`
or origin resolution changes |".

### src/lib/authedFetch.ts (comments only)

Lines 7-8 become

```
 * Why a global monkeypatch: the app makes its backend calls as bare relative
 * `fetch('/api/...')` across `src/`, with no central client and no
```

The comment keeps its one `fetch('/api/...')` literal, so README's count does not move. Lines
199-200 become

```
    // Attach the identity to EVERY /api request when signed in, the open
    // paths included: see the note on OPEN_EXACT and OPEN_PREFIXES. Skipping
```

Both keep their line count, so every `authedFetch.ts` pointer above stays right.

### src/lib/authedFetch.test.ts

Line 4: "/api/me sits in OPEN_PREFIXES (reachable" becomes "/api/me sits in OPEN_EXACT (reachable".
Line 66: the test name "attaches the bearer token to OPEN-prefix paths like /api/me" becomes
"attaches the bearer token to open paths like /api/me". Only `docs/UI-SCREENS.md:201` and `:206`
cite it (no stocks document does), and both change above.

### vite.config.ts (comment only)

Line 14: "// neither the ~73 bare fetch('/api/...') call sites nor the API's CORS" becomes
"// neither the bare fetch('/api/...') call sites nor the API's CORS".

### Catalog close-out

FEAT-CICD-001's row in `docs/product/02-FEATURE-CATALOG.md`: Last reviewed set to the PR's date,
and the PR's number appended to PRs in the row's plain form (`#82, #255, #NNN`). Plain, not a
`[#NNN](url)` link: the docs audit reports a linked merged PR in a catalog row as a P1
closed-issue finding ("is CLOSED (merged) but cited as live work"), as it does on main today for
FEAT-AUTH-001's `[#241]` and FEAT-UI-001's `[#242]`, and leaves the plain `#82` alone.

Capacity: n/a. Solyra runs no workload; this changes prose, comments and one test name.

### Checked on a scratch copy of 517c90e (2026-10-11)

With all twelve files edited as above:

- `node scripts/docs-audit.mjs`: the two CLAUDE.md count-claim findings are gone and no finding is
  new. Setting README's number to 100 made it report "count-claim: README.md:15, claims 100 ...
  gives 101", so README's row, the only fetch-count row left, still checks it.
- Each grep in done_when prints what its item says, against `HEAD` (main) and on the edited tree.
- `npx vitest run src/lib/authedFetch.test.ts src/mocks/contract.test.ts`: 2 files, 40 tests
  passed. `scripts/docs-audit.test.mjs`, which reads `README.md` and `docs/DOC_REGISTRY.md` from
  the tree: 642 of 643 passed; the one failure ("a list-len derivation target must be tracked,
  like the grep ones") fails the same way on clean `517c90e` in that scratch copy, whose
  `node_modules` is a symlink the audit refuses before its tracked check.
- The gate, in the gate suite's throwaway repositories, with this spec and its plan on the base:
  the twelve files and the catalog row on `feature/feat-cicd-001-claude-md-open-paths` pass
  `--pr` as a draft and as ready for review with every box ticked.

## Risks

- The recurring count finding the first draft carried is gone: CLAUDE.md states no count, and
  the one count the audit checks sits in `README.md`, which any branch may edit.
- A PR that adds or removes a bare `fetch('/api/...')` under `src/` makes the audit report a
  count finding at `README.md:15`, and that PR corrects the number itself.
- The audit is not in CI. CI runs only its unit tests (`scripts/docs-audit.test.mjs`, through
  `vite.config.ts:114`), so README's count is checked when a PR's author runs Phase 5 step 5.
- The open-path entries now appear in CLAUDE.md, `docs/UI-SCREENS.md` SHARED-02 and the defect
  template besides the code. A change to either list has those three places to update, and
  nothing checks them mechanically; the done_when greps catch only the stale forms known today.
- The security-scan check compares every line near either list name, so a comment-only change
  there reads as a list change (as it did before for `OPEN_PREFIXES`, and as it does on this
  change's own branch).
- The edits to `src/` and `vite.config.ts` make this a code PR to CI, so the e2e workflow runs.
