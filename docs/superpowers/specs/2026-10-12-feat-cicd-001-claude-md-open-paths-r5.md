---
feat_id: FEAT-CICD-001
req_ids: [REQ-AUTH-001]
issues: [266, 270]
canvases: []
done_when:
  - "node scripts/docs-audit.mjs on the PR head reports no count-claim finding on CLAUDE.md or README.md, where main at 5fbdbb9 reports two at CLAUDE.md:491: claims 73 where the grep-count derivation gives 101, and claims 30 where the grep-files derivation gives 34"
  - "node scripts/docs-audit.mjs reports no finding on the PR head that it does not report on origin/main"
  - "git grep -nE '^[|] [^|]+ [|].*grep-(count|files) src fetch' -- docs/DOC_REGISTRY.md prints one line, the README.md Claims row, so no Claims row derives a fetch count for CLAUDE.md and README.md's row is the only one; on main it prints three, the two CLAUDE.md rows and the README.md row"
  - "git grep -nE '[0-9]+ (bare|backend calls|relative)|about [0-9]+ bare|across (~|about )?[0-9]+ files|~?[0-9]+ .?fetch[(]' -- CLAUDE.md docs/UI-SCREENS.md src/lib/authedFetch.ts vite.config.ts prints nothing, so CLAUDE.md and the three other copies state no fetch count; on main it prints CLAUDE.md:29, CLAUDE.md:491, docs/UI-SCREENS.md:229, src/lib/authedFetch.ts:7 and vite.config.ts:14"
  - "git grep -nE 'OPEN(_API)?_PREFIXES[^/]*/api/health., ./api/me.,|everything below it as open|an .OPEN_PREFIXES. entry|sits in OPEN_PREFIXES|the note on OPEN_PREFIXES|OPEN-prefix paths like|authedFetch.ts:(39-)?45([^0-9]|$)|authedFetch.ts:156-158|Open in the auth sense|api/auth._OPEN_API_PREFIXES|Changes .OPEN_PREFIXES. in|and is .OPEN_PREFIXES. in|[|] .OPEN_PREFIXES. or origin|authedFetch.s OPEN_PREFIXES,|(The|wrapper.s) .OPEN_PREFIXES. (list )?must|^.OPEN_PREFIXES. must' -- . ':!docs/superpowers' ':!docs/solyra-landing-page-plan.md' ':!src/types/stocksOpenApi.gen.d.ts' ':!tests/fixtures' prints nothing; on main it prints 38 lines in CLAUDE.md, the defect template, the five agent and command files, docs/UI-SCREENS.md, src/lib/authedFetch.ts and src/lib/authedFetch.test.ts"
  - "git grep -niE 'open prefix|open paths 200|200 to the open paths|and the open paths$|[(]the open paths[)]' -- . ':!docs/superpowers' ':!docs/solyra-landing-page-plan.md' prints nothing, so no text calls every open path a prefix or calls three of them all of them; on main it prints docs/UI-SCREENS.md:130, :163, :1346, :6406, :7062, :7578, :8449, :8827, :10586 and :11395"
  - "git grep -c 'id=.shared-02--open-prefixes-kept-in-sync-apiauthpy-and-authedfetch-open_prefixes.' -- docs/UI-SCREENS.md prints docs/UI-SCREENS.md:1, the fragment stocks docs/product/03-SITE-TRACEABILITY.md:108 links to, kept above the renamed SHARED-02 heading; on main it prints nothing"
  - "CLAUDE.md's Auth section names OPEN_EXACT with /api/me beside _OPEN_API_EXACT, and OPEN_PREFIXES with /api/health, /api/config/firebase and /api/waitlist beside _OPEN_API_PREFIXES, the entries src/lib/authedFetch.ts:48-49 and stocks platform/api/auth.py:69-70 hold on main; docs/UI-SCREENS.md's SHARED-02 names the same two lists with the same entries and says the browser matches a relative URL string whole, so a relative /api/me with a query string is gated in the browser, and states the server's half as read from stocks' platform/api/auth.py (it matches the path without its query and leaves the same request open) without crediting any test with it: git grep -c 'half is read from' -- docs/UI-SCREENS.md prints docs/UI-SCREENS.md:2, and git grep -nE 'which the server leaves open|matching the server' -- src docs/UI-SCREENS.md prints nothing, where on main it prints src/lib/authedFetch.test.ts:406; .github/ISSUE_TEMPLATE/01-defect.yml names /api/me as the OPEN_EXACT path and /api/health, /api/config/firebase and /api/waitlist as the OPEN_PREFIXES paths; and CLAUDE.md states no such exception of its own but points at SHARED-02 and solyra#266 for it: git grep -c 'solyra#266' -- CLAUDE.md docs/UI-SCREENS.md src/lib/authedFetch.test.ts prints CLAUDE.md:1, docs/UI-SCREENS.md:1 and src/lib/authedFetch.test.ts:1, where on main it prints nothing, and git grep -nE 'gated in the browser|query included' -- CLAUDE.md prints nothing"
  - "docs/UI-SCREENS.md says a gated 401 is retried once only in firebase mode, when the wrapper sent a token, the request can be re-sent and a forced refresh returns a different token for the same account, and that a retry that succeeds neither fires onUnauthorized nor marks the session blocked, in SHARED-02's Shows or does paragraph and in SETTINGS-13's bullet at main's lines 13549-13554, and that no other element states how the auth-blocked flag, its strip and banner, the wrapper's retry or the callback follow a gated call's answer without those conditions (the flag is set by a final 401 and cleared by a later success, each only when that answer counts: always in open and iap mode, where there is no account, and in firebase mode when the account signed in as the answer arrives is the one signed in when the request began, no account counting as one), or says the wrapper's tests never read the flag; and SHARED-02 says the flag is one global value that an account switch does not clear, citing solyra#270: git grep -c 'the request can be re-sent' -- docs/UI-SCREENS.md prints docs/UI-SCREENS.md:3 (SHARED-02, AUTH-08's retry criterion and SETTINGS-13), git grep -c 'solyra#270' -- docs/UI-SCREENS.md prints docs/UI-SCREENS.md:8, where on main it prints nothing, git grep -c -e 'has no account to compare' -e 'sent and answered while signed out counts' -- docs/UI-SCREENS.md prints docs/UI-SCREENS.md:2, where on main it prints nothing, git grep -nE 'final 401 for the same account|is 401 for the same account|been 401 for the same account|whose account is still signed in|while its account is still signed in|for that account .SHARED-02.|unless the account changed meanwhile|signed-in account has not changed|account that sent the request is still signed in' -- docs/UI-SCREENS.md prints nothing, where the r4 Design (solyra#272) prints 45 lines, and git grep -nE 'except identity paths, which throw instead|gated path returns 401: .track|when the response status is 401, then .track|only when the wrapper sent a token and a forced|any gated 401|gated-path 401 and|on any page.s 401|ANY gated ./api/[*]. 401|any gated ./api/[*]. call answers 401|Given a gated 401, then|Given a 401 from a gated path, then|gated path answers 401, then|Every gated call that answers 401|Given a gated call answers 401, (then|when .track)|a 401 sets the flag|call returns 401 .AUTH-08.|cleared by any later gated success|any successful gated response clears|Given a gated call succeeds again, then|next gated-path success [(]|^answer clears .|next successful gated call clears|follows the last answer .read|a gated call has answered 401|when a gated call has$|last gated answer was a 401|while a gated call answers 401|Given a signed-in user and a 401 on|Given a signed-in user whose calls answer 401|by which answer came$|Given a stale token, when a gated call first 401s|answers 401, after one retry with a freshly minted|reflects the last gated answer, not|signed-in user.s 401|Given a 401 on the market data|then the page shows the load errors above|What a signed-in account sees when a route refuses|^route[.]$|no assertion in it reads the resulting flag|that file reads the resulting flag|15 tests, Vitest|never .isAuthBlocked|reads .markAuthBlocked. or .useAuthBlocked|The .isAuthBlocked. branch itself' -- docs/UI-SCREENS.md prints nothing, where on main it prints 73 lines: SHARED-02's 193, 194 and 203 and 70 lines in other elements; and the code facts SHARED-02 states hold: git grep -nE '(mark|clear)AuthBlocked[(][)];' -- src ':!*.test.ts' prints only src/lib/authedFetch.ts:186, :188 and :294, so only a gated answer sets or clears the flag, and git grep -n 'setOnUnauthorized(' -- src ':!*.test.ts' prints only src/lib/authedFetch.ts:81, its definition"
  - "npx vitest run src/lib/authedFetch.test.ts src/mocks/contract.test.ts passes on the PR head with the 37 tests of src/lib/authedFetch.test.ts, the two tests the Design renames and the eleven it adds included, and each added test fails when src/lib/authedFetch.ts is changed as the Design's mutation table names for it: pathOf dropping a relative URL's query or keeping an absolute string's, isReplayable always true, the retry without its different-token check, without its same-account check or without its sent-token check, a gated answer outside firebase mode returned untracked, sameAccount false for a request that began signed out or true for any request that began signed out, an open path's answer tracked or its 401 retried, an identity path sent when the refresh returns another account's token, and a present token kept off the OPEN_PREFIXES paths"
  - "The bash block under security-scan.md's Auth-gate surface, run in a scratch repository whose OPEN_PREFIXES array has a comment line ending in a closing bracket after its fifth entry and a comment on the line after its closing bracket, once with the array spanning thirteen lines and once twenty-nine, prints in both the changed-since-merge-base HIGH line when an entry is added or removed after the eighth line, when an entry is added below that in-array comment and when the one-line OPEN_EXACT gains an entry; prints no HIGH line when only the comment after the closing bracket changes; prints the not-found HIGH line when both lists are renamed; and prints the changed HIGH line when an entry is added in a third copy whose OPEN_PREFIXES declaration line ends in a line comment ending in a closing bracket, and in a fourth whose declaration line ends in a block comment, closed on the next line, ending in a closing bracket"
  - "git diff --name-only origin/main...HEAD names no path outside the thirteen files the Design edits, docs/product/02-FEATURE-CATALOG.md and docs/superpowers/"
  - "python3 scripts/gate/spec_gate.py --pr origin/main passes on the PR head"
  - "02-FEATURE-CATALOG FEAT-CICD-001 row shows a Status, this PR's date in Last reviewed and this PR's number in PRs"
status: approved
supersedes: null
---

# State the open-path lists as the code has them, and drop the fetch counts from CLAUDE.md

Approved under the owner's 2026-10-11 instruction to bring both repositories to a clean, ready
and closed-out state.

This re-cuts solyra#272 (head `4262178`), which re-cut solyra#262 (head `fefcaf8`), the first cut
of this spec. #262 added it at `docs/superpowers/specs/2026-10-11-feat-cicd-001-claude-md-open-paths.md`
and #272 at `docs/superpowers/specs/2026-10-12-feat-cicd-001-claude-md-open-paths.md`. Codex's
first review of each raised findings, four on #262 and three on #272, and an approved spec with a
finding is re-cut rather than edited in place, so both close unmerged and this spec replaces them
at a path of its own, with `supersedes: null` because neither reached main. "Changes from
solyra#262" and "Changes from solyra#272" below answer each finding.

Line numbers are solyra main at `5fbdbb9` unless a line says otherwise. Since `517c90e`, where the
first evidence was read, main gained #264, the Lovable commits of 2026-10-11 and 2026-10-12, #265
(the lockfile sync), #267 and #268 (a freshness audit). Of the thirteen files this spec edits,
`docs/DOC_REGISTRY.md` changed a registry row at `:125` and gained Claims rows after `:171`, and
#268 restamped the review line of `README.md:3`, `docs/UI-SCREENS.md:11` and
`docs/DOC_REGISTRY.md:3`. Every line this spec cites reads the same on `517c90e` and `5fbdbb9`,
and every old text the Design replaces sits at the same line on both (executed with `git show`).
Evidence was re-read on 2026-10-12 from `5fbdbb9`, still solyra main, and from stocks main at
`d0231901`, where `platform/api/auth.py` and `tests/api/test_platform_auth.py` read as at `17bbacd3`.

## Changes from solyra#262

1. **Generic "open prefixes" (4240568649).** `docs/UI-SCREENS.md:130` and `:8827` call every
   exception "the open prefixes", although `/api/me` is open by exact match. Both are now in the
   Design, and so is the rest of the class found by searching for it: the SHARED-02 heading
   (`:163`, "Open prefixes kept in sync", renamed with its old anchor kept, which done_when 7
   checks), and seven sentences that present the three open paths stocks'
   `test_firebase_requires_valid_token` requests as all of them (`:1346`, `:6406`, `:7062`,
   `:7578`, `:8449`, `:10586`, `:11395`). done_when 6 checks the whole class case-insensitively.
2. **Conditional 401 retry (4240568656).** The SETTINGS-13 text now says the retry happens only in
   `firebase` mode, when the wrapper sent a token, the request can be re-sent and a forced refresh
   returns a different token for the same account, and that a successful retry neither fires
   `onUnauthorized` nor marks the session blocked. Every branch is pinned by a committed test (the
   mutation table under "Checked"). The same qualification goes into SHARED-02: its Shows or does paragraph, the States
   line for a gated 401 and the acceptance criterion that said a 401 always calls
   `markAuthBlocked()` (`:194`, `:203`), and the identity-path States line (`:193`), which said
   identity paths always throw. SHARED-02 also gains the other half of the rule: the flag clears on
   a later gated success, or in `firebase` mode on the verify-email 403, again only when that answer
   counts (Changes from solyra#272, 6), and it says what the flag is: one global value, not kept per account,
   that an account switch does not clear, so account B sees account A's expired-session strip until
   B's first gated success (solyra#270, FEAT-AUTH-001, will change that). Searching for the class
   found 70 more lines in other elements that state how the flag, its strip and banner, the
   wrapper's retry or the callback follow a gated call's answer without those conditions, or that
   say the wrapper's tests never read the flag: the flag set "on any gated 401", "cleared by any
   later gated success", `DataGate` shown "when a gated call has answered 401", the callback fired
   on "a gated 401", the summary rows and criteria whose strip or banner follows "a 401", the retry
   stated without its conditions, SETTINGS-13's pre-#241 statements still in the present tense, and
   "no assertion reads the resulting flag" where the account-switch tests now do, with AUTH-08's
   "the `isAuthBlocked` branch itself remains untested" beside it. Each gets a
   qualifier or a correction in the Design. done_when 9 checks SHARED-02, SETTINGS-13 and the
   class.
3. **Parity for relative URLs with a query (4240568654).** Confirmed: `pathOf` returns a relative
   string whole, so `/api/me?source=x` is gated in the browser, while the backend matches
   `request.url.path` and leaves it open. Ruling: changing `pathOf` is a change to how the auth
   wrapper classifies requests, which FEAT-AUTH-001 owns, and solyra#266 (FEAT-AUTH-001) is the
   issue that will change it; it does not belong in this FEAT-CICD-001 alignment spec. This spec
   documents the difference in SHARED-02 and pins the browser's half with a unit test covering the
   relative string, the absolute string, a `URL` and a `Request`, so the #266 change fails that test
   and updates the test and SHARED-02 in its own PR. The server's half is read from stocks' code
   (Changes from solyra#272, 5). CLAUDE.md states no exception of its own and points at
   SHARED-02 and #266 instead: the gate refuses a FEAT-AUTH-001 PR that edits CLAUDE.md
   (`spec_gate.py:4107-4110`), so an exception written there could not be removed by the PR that
   fixes it, the same trap Problem 2 describes for the fetch counts. No call site requests `/api/me` with a query or fragment (on main,
   `git grep -nE "/api/me[?#]" -- src tests` finds none; the pinned test adds the only such lines).
4. **Whole declarations in the scanner (4240568653).** The security-scan block now reads each
   declaration from `const OPEN_...` through its closing bracket instead of a fixed eight-line
   window, and reports when neither declaration is found. The read ends on a line that starts with
   `]`, or on the declaration's own line when it closes there and holds neither `//` nor `/*`, so a
   `//` or `/*` comment that ends in `]`, inside the array or after the `[` on the declaration line,
   does not end it early. On main the scanner has the fixed-window defect too
   (`grep -A8 "OPEN_PREFIXES"`). done_when 11 runs every case on two arrays, of thirteen and
   twenty-nine lines. A window reaching past an array's closing bracket fails when only the comment
   after it changes, and a window stopping short of the bracket misses an entry added at the end,
   so no fixed window passes both arrays (executed with windows of 12, 20 and 40 lines); a window of
   12 lines passes the thirteen-line array alone. It also includes a case that a read ending on any
   `]` fails (an entry below an in-array comment ending in `]`).

The tests the Design adds hold fifteen `fetch('/api/...')` literals under `src/`, so the count
README.md carries moves from 101 to 116 and README.md:15 is in the Design for that number.

## Changes from solyra#272

solyra#272 (head `4262178`) carried the previous cut. Codex's first review of it (5493253424)
raised three findings, so this re-cut replaces it as #272 replaced #262, and #272 closes unmerged.

5. **The server's half of the query-string difference (4250017201).** The committed test runs the
   browser's wrapper against a mocked fetch, so it cannot fail when the server changes. It is now
   named for what it checks, `classifies a relative /api/me with a query string as gated, unlike its
   absolute forms`, and its comment and SHARED-02's criterion say it checks the browser's
   classification only. SHARED-02 states the server's half as read from stocks' code
   (`platform/api/auth.py:199` matches `request.url.path`, which has no query) and says that no test
   sends the server a query: stocks has none (`git grep -n "api/me?" -- tests` at `d0231901` finds
   nothing), and this spec adds none, since it changes no stocks file. Two more places credited a
   solyra test with the server's behaviour and change the same way: the existing test `treats
   /api/me/preferences as gated, matching the server, while /api/me stays open` is renamed `treats
   /api/me/preferences as gated while /api/me stays open`, the server's side staying with stocks'
   `test_firebase_open_me_is_exact_match_and_subpaths_are_gated`; and CLAUDE.md's Auth note now says
   `src/lib/authedFetch.test.ts` pins the browser's side, where the previous cut said it pinned how
   each side reads a path.
6. **Answers with no account (4250017196).** The previous cut qualified the flag as set and cleared
   "only while the account that sent the request is still signed in". In `open` and `iap` modes the
   wrapper has no account and `track()` runs with `sameAccount` defaulting to true
   (`src/lib/authedFetch.ts:184-197`), and in `firebase` mode a request sent and answered while
   signed out compares two null uids and counts too. SHARED-02 now defines which answers count, in
   every mode and with no account, and every line done_when 9 governs says "that counts (SHARED-02)"
   instead of naming an account. Each case was run in the wrapper's test harness and is pinned by a
   committed test: `open` and `iap` mode, a request sent and answered signed out, and one whose
   account signed in before its 401 arrived. The same class elsewhere: SHARED-02's state for an open
   path with no token now says it goes out anonymously outside `firebase` mode too, and the defect
   template's 401 to a bare `curl` is stated for a deployed host whose API runs in `firebase` mode.
   The one deployed API, `solyra-api-staging`, runs `AUTH_MODE=firebase` (read on 2026-10-12 with
   `gcloud run services describe solyra-api-staging --region=us-east1`); `solyra-api-prod`, the
   `iap` one, was retired on 2026-10-10 (stocks#1366).
7. **Conditions no committed test pinned (4250017207).** No test sent a body `isReplayable` rejects,
   so `isReplayable` returning true passed every listed test. The Design adds `does not retry a gated
   401 whose body cannot be re-sent` (a streamed `PUT` body), which fails under that change. A sweep
   of every condition the Design's text states found more with no committed test, each now pinned by
   a test that fails under one change to `src/lib/authedFetch.ts` (the mutation table under
   "Checked"): the forced refresh returning the same token or failing, another account signed in by
   the time it returns, a request sent without a token, the accountless cases of 6, an open path's
   401 neither retried nor tracked, an `/api/me` request aborted when the refresh returns another
   account's token, and a present token attached to the OPEN_PREFIXES paths. Two statements the wrapper's
   tests cannot reach are checked against the code instead (done_when 9): only the wrapper's answers
   set or clear the flag, so an account switch alone leaves it set (solyra#270), and nothing in the
   app registers `onUnauthorized` (solyra#161).

## Problem

**1. The open-path lists are stated wrongly across the repository.** The code,
`src/lib/authedFetch.ts:48-49`, holds two lists:

```ts
const OPEN_EXACT = ['/api/me'];
const OPEN_PREFIXES = ['/api/health', '/api/config/firebase', '/api/waitlist'];
```

and `isGatedApiPath` (`:98-102`) checks exact membership first, then
`path === p || path.startsWith(p)`. Stocks' `platform/api/auth.py:69-70` on main holds the same
entries:

```python
_OPEN_API_EXACT = ("/api/me",)
_OPEN_API_PREFIXES = ("/api/health", "/api/config/firebase", "/api/waitlist")
```

matched by `_path_requires_auth` (`:180-185`) the same way, and its comment (`:57-68`) names
solyra's `OPEN_*` lists as the mirror. The server applies them only in `firebase` mode
(`auth_middleware`, `:194-197`), to `request.url.path` (`:199`), which has no query. The backend
list is right. The split came with #241 (`d976bab`), which did not update the prose. Before
#241, `src/lib/authedFetch.ts:45` was the single list itself (`git show d976bab^:src/lib/authedFetch.ts`).
These places still describe that single four-entry prefix list, call every exception a prefix,
point at line 45, or name only the prefix list as what must stay in sync:

- `CLAUDE.md:494-495`: "`OPEN_PREFIXES` (`/api/health`, `/api/me`, `/api/config/firebase`) must
  stay in sync with the backend's `api/auth._OPEN_API_PREFIXES` in stocks."
- `docs/UI-SCREENS.md`, SHARED-02 (`:163-208`): it describes "one list, prefix matched for all four
  entries including `/api/me`" and calls `/api/me` "an `OPEN_PREFIXES` entry" (`:201`). Its States
  name the backend only (`:190-191`), say identity paths always throw (`:193`) and say a gated 401
  always calls `markAuthBlocked()` (`:194`), as does its acceptance criterion `:203`, which points
  at `authedFetch.ts:156-158`. It points at stale lines in `:170`, `:179` and `:208`, and its heading
  reads "Open prefixes kept in sync".
- `docs/UI-SCREENS.md` elsewhere:
  - `:130` and `:8827` call every exception "the open prefixes".
  - SETTINGS-13's bullet at `:13549-13554` says "The client treats `/api/me` and everything below it
    as open", which #241 fixed.
  - `:793` and `:6366` point at the list as `authedFetch.ts:45`, and so do the Code lines
    `:817`, `:7067`, `:7583`, `:8454`, `:9316`, `:10592`, `:11400` and `:13597`.
  - Six sentences give only the prefix lists as the sync contract (`:6386-6387`, `:7045`,
    `:7561-7562`, `:8430-8431`, `:10560-10561`, `:11376-11377`).
  - Seven present `/api/health`, `/api/me` and `/api/waitlist`, the three open paths stocks'
    `test_firebase_requires_valid_token` requests, as all of them (`:1346`, `:6406`, `:7062`,
    `:7578`, `:8449`, `:10586`, `:11395`).
  - Seventy lines in other elements state how the flag, its strip and banner, the wrapper's
    retry or the callback follow a gated call's answer without SHARED-02's conditions, or say
    the wrapper's tests never read the flag:
    - the flag set "on any gated 401" or "when any gated call answers 401" (`:973`, `:979`,
      `:1331-1332`, `:1584`, `:1649`, `:2009-2010`, `:2024`, `:3794`, `:6364`, `:9297`, `:9309`,
      and the strip sentence at `:7037`, `:7555`, `:8425`, `:10549-10550`, `:11368-11369`);
    - the flag "cleared by any later gated success" and its kin (`:979`, `:1332`, `:3795`, `:6365`,
      `:6395`, the same strip sentences and the line after each, `:7038`, `:7556`, `:8426`,
      `:10551`, `:11370`: "so it follows the last answer"), and CHARTS-17's account of the flag
      (`:5113`, `:5115`: "after one retry with a freshly minted token when a token was sent, and
      clears when any later gated call succeeds", "so it reflects the last gated answer");
    - the wrapper's retry stated without its conditions (`:1354`);
    - `DataGate` shown "when a gated call has answered 401" (`:3155`, `:7024`, `:7540-7541`,
      `:8408`, `:9294`, `:10524`, `:11352`), the banner shown "while a gated call answers 401"
      (`:5230`) or "while the last gated answer was a 401" (`:3901`), and the criteria whose
      banner or strip follows a 401 (`:5154`, `:5157`, `:6393`, `:7053`, `:7569`, `:8438`,
      `:9308`, `:10570`, `:11385`), and the six permission summary rows whose "signed-in user's
      401 shows the shell's expired-session strip" (`:6464`, `:7113`, `:7631`, `:8519`, `:9370`,
      `:10643`);
    - the callback fired on "a gated 401" (`:1348`, `:3828`, `:5165`, `:6398`, and the criterion
      at `:7058`, `:7573`, `:8443`, `:10577`, `:11389`);
    - SETTINGS-13's statements of the pre-#241 run in the present tense, which contradict its own
      corrected bullet: the opening of that bullet (`:13549`, "What a signed-in account sees when a
      route refuses it is the error of its own row"), its States (`:13565-13566`) and its criterion
      `:13580` ("then the page shows the load errors above and no sign-in state");
    - the claims that no test reads the flag (AUTH-08 `:1352`, `:1367-1371`, which also counts "15
      tests" where the file holds 26 on main; SHELL-16 `:2040-2043`; LIVE `:3835`; CHARTS
      `:5167`), while the account-switch and verify-email tests assert `isAuthBlocked()`, and
      AUTH-08's `:1377`, "The `isAuthBlocked` branch itself remains untested", which means the
      `MostActiveBar` rendering branch but reads as one of them once the line above it names the
      tests that read the flag.

    In `firebase` mode a retry that succeeds sets neither, the flag is neither set nor cleared by
    an answer to a request made as an account that is no longer signed in (`a late 401 from account
    A does not mark account B as auth-blocked`, `a late verification 403 or success from account A
    leaves account B's auth-blocked flag set`); in `open` and `iap` modes, and for a `firebase`
    request sent and answered while signed out, every final gated answer sets or clears it
    (executed; Changes from solyra#272, 6); and the callback fires only in `firebase` mode.
    The flag is one module-level boolean (`src/lib/authGate.ts:14`), not kept per account, and an
    account switch does not clear it: after account A's final 401, account B sees the strip until
    B's first gated success (executed; solyra#270).
- `.github/ISSUE_TEMPLATE/01-defect.yml:33`: "`OPEN_PREFIXES` is only `/api/health`, `/api/me`,
  `/api/config/firebase` and `/api/waitlist`".
- Agent instructions:
  - `.claude/agents/security-scan.md:3` and `:143-163` name only the prefix list, and its check
    greps `OPEN_PREFIXES` with an eight-line window, so an `OPEN_EXACT` change or an entry below
    the window is not compared.
  - `.claude/agents/impact-analyzer.md:106-107`, `.claude/agents/code-reviewer.md:120` and
    `.claude/commands/resolve-issue.md:437-438` name only the prefix list.
  - `.claude/commands/commit.md:63`, the doc-sync row for `authedFetch.ts`, names only
    `OPEN_PREFIXES` and points at a "`README.md` → auth" section README does not have.
- Code comments:
  - `src/lib/authedFetch.test.ts:4` ("/api/me sits in OPEN_PREFIXES") and the test name at `:66`
    ("attaches the bearer token to OPEN-prefix paths like /api/me").
  - `src/lib/authedFetch.ts:116-120`, the `isIdentityPath` comment ("/api/me and everything under
    it. Open in the auth sense"), although `/api/me/*` has been gated since #241.
  - `src/lib/authedFetch.ts:199-200`, the "OPEN_PREFIXES paths included, see the note on
    OPEN_PREFIXES" comment, whose example is /api/me.

Nothing states the one place the two sides differ: `pathOf` (`src/lib/authedFetch.ts:85-96`)
returns a relative URL string whole, so `OPEN_EXACT` does not match `/api/me?source=x` and the
browser treats it as gated, while the server sees the path `/api/me` and leaves it open
(`platform/api/auth.py:199`).

**2. CLAUDE.md's fetch counts are stale, and only a FEAT-CICD-001 branch can correct them.**
`CLAUDE.md:491` says "~73 bare relative `fetch('/api/...')` calls across ~30 files"; the two
Claims rows at `docs/DOC_REGISTRY.md:168-169` re-derive them, and `node scripts/docs-audit.mjs`
on main reports "count-claim: CLAUDE.md:491, claims 73, `grep-count src ...` gives 101" and
"claims 30, `grep-files src ...` gives 34". The Overview at `CLAUDE.md:29` repeats "~73" with no
Claims row matching it, and the same stale number sits in `docs/UI-SCREENS.md:229`,
`src/lib/authedFetch.ts:7` and `vite.config.ts:14`. #259 gave `README.md` the right count
(`README.md:15`, "~101 bare `fetch('/api/...')` literals, its colocated tests included") and its
own Claims row (`docs/DOC_REGISTRY.md:171`), which passes on main. That count is of literals in
`src/`, tests and one comment included, not of the app's call sites: on main 67 calls in 31
application files, 33 in two test files and 1 in the comment at `src/lib/authedFetch.ts:8`, the
same at `5fbdbb9` as at `517c90e`: the Lovable commits add no bare `fetch('/api/...')` literal.

The counts cannot be kept right in CLAUDE.md. The gate treats CLAUDE.md as process, not
documentation (`is_documentation` returns False for `AGENT_FILES`,
`scripts/gate/spec_gate.py:1203-1216`; `is_process_file`, `:1085-1088`), and refuses a traced PR
whose process files belong to another FEAT (`:4107-4110`). So a PR that adds a `fetch('/api/...')`
call cannot correct the count it makes stale. Two of the 59 first-parent commits on main from
2026-09-14 to `5fbdbb9` changed it: #242 (FEAT-UI-001, 87 to 89) and #241 (FEAT-AUTH-001, 89 to
101).

## Non-goals

- No change to how `authedFetch.ts` classifies a request. Normalising `pathOf` so a relative URL's
  query no longer counts is a FEAT-AUTH-001 behaviour change, filed as solyra#266; this spec
  documents the difference and pins the browser's half with a test (Changes, 3).
- No stocks change. The backend lists are right (Problem 1). Stocks main still states the old
  lists in `docs/product/03-SITE-TRACEABILITY.md:227`, `:443`, `:1202` and `:1227` and
  `docs/product/09-SECURITY-AUTH.md:152`, and its SHARED-02 row (`03-SITE-TRACEABILITY.md:108`)
  carries the old heading text and links to the old fragment; they are another repository's
  records. The renamed heading keeps that fragment as an explicit anchor, as #253 did for
  SHARED-01, so the link still resolves (done_when 7).
- Not `docs/solyra-landing-page-plan.md:288`. It shows stocks' `auth.py` line 34 as that plan
  changed it, before the exact/prefix split; rewriting an executed plan step falsifies what the
  plan did. It is excluded from the greps for that reason.
- Not `src/types/stocksOpenApi.gen.d.ts:541` and `tests/fixtures/stocks-openapi.json`, generated
  and vendored from stocks; they say the firebase config path is in `_OPEN_API_PREFIXES`, which
  is true.
- Not "open path" where it is accurate for both lists, for example "a 401 from an open path such
  as `/api/me`" or "`/api/live/*` is not among the open paths". Only text that calls every open
  path a prefix, or calls three of them all of them, changes.
- Not the `authedFetch.ts` line pointers in `docs/UI-SCREENS.md` that point at code #241 moved
  rather than at the open-path lists (about fifty, for example `:250`, `:791`, `:797`, `:3829`,
  `:6363`, `:12209`, `:13558`, and the `56-63,109-129,145-166` and `155-166,247-250` parts of the
  Code lines whose leading `45` this change re-points), except on lines this change rewrites, where
  the pointer is re-pointed with the text: `:1332`, `:1649`, `:2010`, `:3795`, `:5114`, `:6365`,
  `:6395` and the five strip sentences. Refreshing the rest is a UI-SCREENS refresh of its own.
- Not the 401 statements that already name the conditions they hold under, or that do not follow
  the flag:
  - records of executed runs that name `open` mode, where a gated 401 is never retried and has no
    account to compare (`:7035`, `:11293`, `:12208`, `:12321`), and the narrative of what
    a run showed under the element that the qualified criteria govern (`:3947`, `:4040`, `:4276`,
    `:5116`, `:7476`, `:8321`, `:8421`, `:10540`, `:11368`);
  - the per-card outcomes (`:3093`, `:3095`), which follow the card's own query error
    (`isAuthError`, `src/components/shared/WidgetState.tsx:77-81`), and so the wrapper's final
    answer, not the flag.
- Not the Lovable research workspace added after `bd2fdce` (`/insights-lovable`,
  `/ai-insights-lovable`). Its browser calls go to the research function at
  `${VITE_SUPABASE_URL}/functions/v1/insights-research` (`src/hooks/useInsightsLovable.ts:9-34`)
  and through the Supabase client (`src/integrations/supabase/client.ts:14-46`): absolute URLs
  whose path is not `/api/*`, which `authedFetch` passes through unclassified and untouched (in
  `firebase` mode the native fetch gets the caller's own headers and no added token, executed in
  the wrapper's harness). The function calls stocks server side (`supabase/functions/insights-research/index.ts:7`,
  `:68-78`, `:135`), never through `authedFetch`, and checks a caller by asking `/api/me` to
  resolve its bearer token to an email, which `/api/me` does whether the path is open or gated.
  Its pages reach `/api/*` only through existing hooks and components (`useLiveQuote`,
  `useMarketData`, `ChatView` among them), so they add no open path and no bare
  `fetch('/api/...')` literal (101 in 34 files at `5fbdbb9`, as at `517c90e`).
- Not the third CLAUDE.md Claims row, the Rule 3.7 citation count (`docs/DOC_REGISTRY.md:170`,
  checking "38 files under `src/` and `tests/`" at `CLAUDE.md:183`). Its count changed once in the
  same four weeks (37 to 38 on 2026-09-17), and moving it was not part of this decision.
- Not the narrative at `docs/DOC_REGISTRY.md:155-159`, a past-tense account of what the seed rows
  found; a new paragraph after it says where the fetch-count rows went.
- Not `src/mocks/contract.test.ts:141` and `:462`, which cite `OPEN_PREFIXES` as an example of a
  prefix list, which it is.

## Approaches considered

1. Correct both CLAUDE.md numbers and reword the Overview so the existing Claims rows check it.
   Rejected by the owner on 2026-10-11: any PR that adds or removes a bare `fetch('/api/...')`
   would then raise a count finding it is not allowed to fix.
2. Drop the numbers from CLAUDE.md and its two fetch-count Claims rows, leave the count to
   `README.md` and the row #259 gave it, which any branch that can add a call may also edit, and
   correct every solyra copy of the open-path lists in the same PR. Chosen on 2026-10-11 by the owner.
3. Name the lists without their entries, so the prose cannot go stale when an entry changes.
   Rejected: the entries and the exact/prefix split are what the old text got wrong.

For the query-string difference (Changes, 3): normalising `pathOf` here, or documenting and
pinning the difference. Documenting and pinning was chosen, for the scope reason given there.

Why FEAT-CICD-001: CLAUDE.md, `.claude/` and `.github/ISSUE_TEMPLATE/` are process files to the
gate, which only a FEAT-CICD-001 branch may change, and tests are filed under FEAT-CICD-001 (the
catalog's introduction). Executed 2026-10-12 with the real gate from `5fbdbb9` on throwaway
clones: the thirteen files below on `feature/feat-auth-001-claude-md-open-paths`
fail with "process change(s) (...) belong to FEAT-CICD-001, not FEAT-AUTH-001", and pass on
`feature/feat-cicd-001-claude-md-open-paths`. The content is FEAT-AUTH-001's open-path contract,
hence REQ-AUTH-001, but FEAT-AUTH-001's row is not touched.

## Design

Thirteen files, plus the catalog close-out. Each old text below occurs exactly once on main at
`5fbdbb9`, except seven texts replaced as counted sets: four that occur exactly five times (the
Code-line pointers, the callback criterion, the strip-flag sentence and the sentence after it), one
exactly four times (the pointer after the strip-flag sentence where it shares the line) and two
exactly six times (`DataGate`'s condition and the summary rows' "a signed-in user's 401"). The
apply script refuses any other count.

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
calls across `src/` (`README.md` carries the audited count of those
literals, tests included).

Two lists name the `/api/*` paths the backend serves without a token in
`firebase` mode, and both must stay in sync with stocks'
`platform/api/auth.py`, which splits them the same way. `OPEN_EXACT`
(`/api/me`) mirrors `_OPEN_API_EXACT` and matches that path only, so
`/api/me/preferences` and `/api/me/profile` stay gated. `OPEN_PREFIXES`
(`/api/health`, `/api/config/firebase`, `/api/waitlist`) mirrors
`_OPEN_API_PREFIXES` and matches each path and any path that starts with it.
How each side reads a request's path, including how `authedFetch.ts` treats a
relative URL with a query string (solyra#266, FEAT-AUTH-001), is recorded in
SHARED-02 of `docs/UI-SCREENS.md`; `src/lib/authedFetch.test.ts` pins the
browser's side.
```

CLAUDE.md names the lists and their entries but not the query-string difference itself, which
SHARED-02 states. solyra#266 will change that behaviour, and its FEAT-AUTH-001 PR may edit
`docs/UI-SCREENS.md` and the test but not CLAUDE.md, a process file the gate keeps for
FEAT-CICD-001 (`scripts/gate/spec_gate.py:4107-4110`). Written here, the difference would go stale
the day #266 merges, with no FEAT-AUTH-001 branch able to correct it. The pointer above stays true
before and after #266.

### README.md

Line 15: "`src/` holds ~101 bare `fetch('/api/...')` literals" becomes "`src/` holds ~116 bare
`fetch('/api/...')` literals". The tests below add fifteen literals; the implementer writes what
the grep-count derivation gives on the branch.

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
`README.md`, which any branch that can add a call may also edit, carries the
count under its own row below, and `CLAUDE.md` states no fetch count.
```

### docs/UI-SCREENS.md

Line 130: "`/api/*` request except the open prefixes (SHARED-02)." becomes "`/api/*` request except
the open paths (`/api/me` exactly, three prefixes; SHARED-02)."

Line 163, the heading, becomes

```
<a id="shared-02--open-prefixes-kept-in-sync-apiauthpy-and-authedfetch-open_prefixes"></a>

##### SHARED-02 · Open paths kept in sync (api/auth.py and authedFetch OPEN_EXACT, OPEN_PREFIXES)
```

The anchor is the old heading's fragment, which stocks' matrix links to
(`03-SITE-TRACEABILITY.md:108`).

SHARED-02, lines 165-183 (the Shows or does paragraph). Replace the paragraph with

```
**Shows or does:** Two lists on each side of the split decide which `/api/*` paths work
without a signed in user, with the same entries on both sides. Backend
(`platform/api/auth.py:57-70`): `_OPEN_API_EXACT = ("/api/me",)` matches the literal path
only, so `/api/me` itself is open but every sub-path (`/api/me/preferences`,
`/api/me/profile`) is gated; `_OPEN_API_PREFIXES = ("/api/health", "/api/config/firebase",
"/api/waitlist")` matches the path or anything starting with it. The backend matches
`request.url.path` (`:199`), which carries no query. Frontend (`src/lib/authedFetch.ts:38-49`):
`OPEN_EXACT = ['/api/me']` and
`OPEN_PREFIXES = ['/api/health', '/api/config/firebase', '/api/waitlist']`, matched the same
way by `isGatedApiPath` (`:98-102`), so the frontend gates `/api/me/preferences` and
`/api/me/profile` too (since #241). It matches what `pathOf` (`:85-96`) returns, which for a
relative URL string is the whole string, query included: a relative `/api/me?source=x` is gated
in the browser, while the same URL as an absolute string, a `URL` or a `Request` yields the bare
path and stays open (`classifies a relative /api/me with a query string as gated, unlike its
absolute forms`). The server leaves all four open, since it matches the path alone (`:199`);
that half is read from stocks' code, and no test in either repository sends it a query.
solyra#266 (FEAT-AUTH-001) will make the browser drop the query too; that change updates this
paragraph and the test. A path in `OPEN_PREFIXES` keeps its match with a query,
since the string still starts with the prefix. A second, narrower check remains:
`isIdentityPath` (`/api/me` or `/api/me/*`, `:122-124`) makes the wrapper throw rather than send
the request anonymously when token acquisition fails twice (the cached token, then a forced
refresh) or the refresh returns another account's token; a path in `OPEN_PREFIXES` such as
`/api/waitlist` goes out without a token instead. In `firebase` mode the wrapper attaches a
present token to every `/api/*` request (open or gated), so a signed in caller's `/api/me`
reply is never anonymous. The same gated/open classification also decides which 401s mean
anything. In `firebase` mode, for a gated request that answers 401, the wrapper retries once,
and only when it sent a token, the request can be re-sent and a forced refresh returns a
different token for the same account (`:267-278`). If the final answer is 401, it fires the
`onUnauthorized` callback when one is registered (`:282`; nothing in the app registers one,
solyra#161) and, when the answer counts, `track()` (`src/lib/authedFetch.ts:184-192`) calls
`markAuthBlocked()`; a retry that succeeds does neither. The flag clears on a later gated
success that counts, and in `firebase` mode on the API's verify-email 403 to a request made
while an account was signed in, when that answer counts (`:184-192`, `:286-295`). Which answers
count: in `open` and `iap` modes the wrapper has no account to compare, and every final answer
to a gated path counts (`:194-197`); in `firebase` mode an answer counts when the account signed
in as it arrives is the one that was signed in when the request began, no account counting as
one (`sameAccount`, `:283`), so a request sent and answered while signed out counts, and one
made as account A does not once A has signed out or another account has signed in. The flag
itself is one global value, not kept per account (`src/lib/authGate.ts:14`), and only these
answers set or clear it (`authedFetch.ts:186`, `:188`, `:294`): nothing clears it when the
account changes, so after account A's final 401, account B sees the expired-session strip until
B's first gated success (solyra#270, FEAT-AUTH-001, will change this).
In `open` and `iap` modes a gated 401 is not retried and fires no callback. A 401 from an open path such as `/api/me` is
not retried and never reaches `track()`, so neither fires; an open path answering without a
token is expected, not a sign the session is blocked.
```

States, lines 190-194:

- `:190`: "- exact-open (backend `/api/me` only, sub-paths gated): " becomes "- exact-open (`/api/me`
  only, sub-paths gated, on both sides): ".
- `:191`: "- prefix-open (backend `/api/health*`, `/api/config/firebase*`, `/api/waitlist*`)" becomes
  "- prefix-open (`/api/health*`, `/api/config/firebase*`, `/api/waitlist*`, on both sides)".
- `:192`: "- frontend open-classified with a token present (still attaches `Authorization`)" becomes
  "- frontend open-classified with a token present (in `firebase` mode, still attaches
  `Authorization`)".
- `:193`: "- frontend open-classified with no token (sent anonymously, except identity paths, which
  throw instead)" becomes "- frontend open-classified with no token (sent anonymously when signed
  out or outside `firebase` mode; in `firebase` mode, when token acquisition fails, identity paths
  throw instead)".
- `:194`: "- gated path returns 401: `track()` calls `markAuthBlocked()`, session marked
  auth-blocked" becomes "- gated path's final answer is 401: `track()` calls `markAuthBlocked()`
  when the answer counts (see Shows or does), and in `firebase` mode a registered `onUnauthorized`
  fires too; a `firebase`-mode retry that succeeds does neither".

Line 201: "(an `OPEN_PREFIXES` entry)" becomes "(the `OPEN_EXACT` entry)", and the test it cites,
"`attaches the bearer token to OPEN-prefix paths like /api/me`", becomes "`attaches the bearer
token to open paths like /api/me`".

Line 203 becomes

```
- Given a gated path (`isGatedApiPath` true), when the final answer is 401 and counts (see Shows or does), then `track()` calls `markAuthBlocked()`, marking the session auth-blocked (`src/lib/authedFetch.ts:184-192`).
```

After line 204, six new acceptance criteria:

```
- In `firebase` mode, given a signed in user, when the frontend's request to `/api/me/preferences` answers 401 to every attempt, then the registered `onUnauthorized` callback fires, as for any gated path, while a 401 from `/api/me` does not fire it (`treats /api/me/preferences as gated while /api/me stays open`).
- In `firebase` mode, given a signed in user, when the frontend requests the relative URL `/api/me?source=x` and it answers 401, then the wrapper treats it as gated and fires `onUnauthorized`, while the same URL given as an absolute string, a `URL` or a `Request` stays open (`classifies a relative /api/me with a query string as gated, unlike its absolute forms`). The backend matches the path alone (`platform/api/auth.py:199`) and so leaves all four forms open, the relative one included; that half is read from its code, and no test sends it a query.
- In `firebase` mode, given a signed in user and a gated 401, then the wrapper does not retry when the request's body cannot be re-sent, when the forced refresh returns the same token or fails, or when another account is signed in by the time it returns, and in that last case `onUnauthorized` still fires and the flag is left as it was (`does not retry a gated 401 whose body cannot be re-sent`, `does not retry a gated 401 when the forced refresh returns the same token or fails`, `does not retry a gated 401 with another account's token`).
- In `firebase` mode with no account signed in, when a gated call answers 401, then it is not retried, `onUnauthorized` fires and the session is marked blocked, and a later gated success clears it; when an account signs in before the 401 arrives, the session is not marked (`marks the session blocked on a gated 401 sent and answered while signed out, with no retry`, `does not mark the session blocked when an account signs in while a signed-out request is out`).
- In `open` and `iap` modes, when a gated call answers 401, then the session is marked blocked with no retry and no callback, and a later gated success clears it (`in open mode a gated 401 marks the session blocked with no retry or callback, and a gated success clears it`, and the same in `iap` mode).
- In `firebase` mode, given a signed in user, when an open path such as `/api/me` answers 401, then it is not retried and the session is not marked blocked (`neither retries an open path that answers 401 nor marks the session blocked`); when the cached token fails and the forced refresh returns another account's token, then a request to `/api/me` is aborted (`aborts an /api/me request when the account switches during the forced token refresh`).
```

Each cites the committed test that pins it (see src/lib/authedFetch.test.ts below). The second
states the server's half from stocks' code (`platform/api/auth.py:199`, the path without its
query) and says that no test sends the server a query: this repository's test checks the browser's
classification only, and stocks has no test that sends `/api/me` a query (`git grep -n "api/me?"
-- tests` in stocks finds none).

Line 206 (Tests): the renamed test; `treats /api/me/preferences as gated while /api/me stays open`,
renamed from "treats /api/me/preferences as gated, matching the server, while /api/me stays open",
a name that claimed a server behaviour no solyra test can check; and the eleven tests the test
file gains below, added to the list.

Line 208 (Code): `platform/api/auth.py:56-70` becomes `:57-70`, and the solyra part becomes
"`src/lib/authedFetch.ts:38-49` (the comment, `OPEN_EXACT` and `OPEN_PREFIXES`), `:98-102`
(`isGatedApiPath`), `:122-124` (`isIdentityPath`), `:184-192` (`track`, `markAuthBlocked`)".

Line 229: "(about 73 bare `fetch('/api/...')` calls across about 30 files, per `CLAUDE.md`)"
becomes "(the bare `fetch('/api/...')` calls under `src/`; `README.md` carries the count of those
literals, tests included)".

Line 793: "`OPEN_PREFIXES` (`authedFetch.ts:45`)" becomes "`OPEN_PREFIXES` (`authedFetch.ts:49`)".

Line 1346: "(the open paths)" becomes "(three of the four open paths; the test does not request
`/api/config/firebase`)".

Line 6366: "`OPEN_PREFIXES` (`authedFetch.ts:45`) are open" becomes "`OPEN_EXACT` and
`OPEN_PREFIXES` (`authedFetch.ts:48-49`) are open".

The Code lines whose leading pointer is line 45, the open list's line before #241, now point at
the lists, keeping their other ranges:

- `:817` (LANDING-10): `src/lib/authedFetch.ts:45,56-63,109-129,145-166` becomes `:48-49,56-63,109-129,145-166`.
- `:7067`, `:7583`, `:8454`, `:10592` and `:11400` (PLAYBOOK-10, REPORTS-10, SIGNALS-12,
  INSIGHTS-15, CATALYSTS-14): `src/lib/authedFetch.ts:45,155-166,247-250` becomes
  `:48-49,155-166,247-250` in each, the same text five times.
- `:9316` (JOURNAL-16): `src/lib/authedFetch.ts:45-92` becomes `:48-102`.
- `:13597` (SETTINGS-13): `src/lib/authedFetch.ts:45-102,150-250` becomes `:48-102,150-250`.

The last two are ranges from the open list through `isGatedApiPath`, which ended at line 92 before
#241 (`git show d976bab^:src/lib/authedFetch.ts`, lines 89-92) and ends at line 102 now.

The six sync sentences keep their line breaks; in each, "`OPEN_PREFIXES`" becomes "`OPEN_EXACT`
and `OPEN_PREFIXES`" and "`_OPEN_API_PREFIXES`" becomes "`_OPEN_API_EXACT` and
`_OPEN_API_PREFIXES`". At `:6386-6387`, which says "The `OPEN_PREFIXES` list must match the",
"list" also becomes "lists". The other five read "The wrapper's `OPEN_PREFIXES` must match the
backend's `_OPEN_API_PREFIXES` (CLAUDE.md, Auth)." (`:7045`; `:7561-7562`, `:8430-8431`,
`:10560-10561` and `:11376-11377` wrap it across two lines at different words).

The six summaries of `test_firebase_requires_valid_token` at `:6406`, `:7062`, `:7578`, `:8449`,
`:10586` and `:11395` say the middleware answers 200 to "the open paths"; in each, "the open
paths" becomes "`/api/health`, `/api/me` and `/api/waitlist`", keeping the line breaks (`:10586`
ends its line at "the open paths").

Line 8827: "gated like every `/api/` route but the open prefixes (V" becomes "gated like every
`/api/` route but the open paths of SHARED-02 (V".

The other elements' statements of how the flag, its strip and banner, or the callback follow a
gated call's answer get the conditions SHARED-02 states: the flag is set by a gated call's final
401 and cleared by a later gated success, each only when that answer counts, the wrapper retries
only under SHARED-02's conditions, and the callback fires on a gated call's final 401 in `firebase`
mode. An answer counts as SHARED-02 defines it: in `open` and `iap` modes every final gated
answer counts, since there is no account to compare; in `firebase` mode it counts when the
account signed in as it arrives is the one signed in when the request began, no account counting
as one, so a request sent and answered while signed out counts too. These lines say "that counts
(SHARED-02)" rather than naming an account, so they hold in every mode and when no one is signed
in. Where a line describes the flag as following "the last answer", it says "the last answer that
counted" and cites SHARED-02 and solyra#270, since the flag is global and survives an account
switch. A line this rewrites that carries a pointer at code #241 moved gets the pointer re-pointed
too. Each edit changes only the quoted words, keeping line breaks:

- `:973` (AUTH-08 row): "flips a global flag on any gated 401;" becomes "flips a global flag on a
  gated call's final 401 that counts (SHARED-02);".
- `:979` (journey): "A gated /api/* call returns 401 (AUTH-08) → authedFetch marks the session
  auth-blocked (AUTH-08)" becomes "A gated /api/* call's final answer is 401 (AUTH-08) → authedFetch
  marks the session auth-blocked when that answer counts (AUTH-08, SHARED-02)", and, at the end of
  the line, "The next successful gated call clears the flag" becomes "The next successful gated call
  made after signing in clears the flag".
- `:1331-1332`: "calls `markAuthBlocked()` on any / gated-path 401 and `clearAuthBlocked()` on the
  next gated-path success (`authedFetch.ts:157-165, 249-250`)" becomes "calls `markAuthBlocked()` on
  a / gated call's final 401 that counts (SHARED-02) and `clearAuthBlocked()` on the next gated-path
  success that counts (`authedFetch.ts:184-192, 296`)" (the slash is the line break).
- `:1348`: "when a gated path answers 401, then" becomes "when a gated path answers 401 to every
  attempt (the one conditional retry in SHARED-02 included), then".
- `:1354-1355` (AUTH-08): "- Given a stale token, when a gated call first 401s, then the wrapper
  retries once with a / force-refreshed token before giving up," becomes "- Given a stale token in
  `firebase` mode, when a gated call first 401s, then the wrapper retries once with a /
  force-refreshed token (when the request can be re-sent and the fresh token differs while the same
  account is signed in; SHARED-02) before giving up,".
- `:1584`: "(client-only, set by any gated 401," becomes "(client-only, set by a gated call's final
  401 that counts (SHARED-02),".
- `:1649`: "which `authedFetch` sets on any page's 401 (`src/lib/authedFetch.ts:158`)" becomes "which
  `authedFetch` sets on any page's final gated 401 that counts (SHARED-02;
  `src/lib/authedFetch.ts:186`)".
- `:2010`: "helper on ANY gated `/api/*` 401, "in every auth mode" (`authedFetch.ts:155-159,163-166,250`,"
  becomes "helper on ANY gated `/api/*` call's final 401 that counts (SHARED-02), "in every auth
  mode" (`authedFetch.ts:184-192,194-197,296`,".
- `:2024`: "- Given a gated call answers 401, when `track()` runs," becomes "- Given a gated call's final
  answer is a 401 that counts (SHARED-02), when `track()` runs,".
- `:3155` (LIVE-13 row), `:7024`, `:8408`, `:9294`, `:10524` and `:11352`, the same text six times:
  "a gated call has answered 401" becomes "a gated call's final answer has been a 401 that counts
  (SHARED-02)". `:7540-7541` wraps it: "when a gated call has / answered 401 and the user is signed
  out" becomes "when a gated call's final answer has / been a 401 that counts (SHARED-02) and the
  user is signed out".
- `:3794-3795`: "sets when any gated `/api/*` call answers 401 and a later successful gated / answer
  clears (`src/lib/authedFetch.ts:155-166,250`," becomes "sets when a gated `/api/*` call's final
  answer is a 401 that counts (SHARED-02) and a later successful gated / answer that counts clears
  (`src/lib/authedFetch.ts:184-197,296`,".
- `:3901` (CHARTS-17 row): "shown while the last gated answer was a 401" becomes "shown while the
  last gated answer that counted was a 401 (SHARED-02, solyra#270)".
- `:5112-5115` (CHARTS-17): "`blocked` is the global flag that `authedFetch` sets when a gated
  `/api/*` call / answers 401, after one retry with a freshly minted token when a token was sent,
  and clears when any / later gated call succeeds (`src/lib/authedFetch.ts:155-166,226-250`,"
  becomes "`blocked` is the global flag that `authedFetch` sets when a gated `/api/*` call's / final
  answer is a 401 that counts (SHARED-02; in `firebase` mode after its one conditional retry), and
  clears when a / later gated call's success counts (`src/lib/authedFetch.ts:184-197,258-296`,",
  and "so it reflects the last gated answer, not any 401:" becomes "so it reflects the last gated
  answer that counted (SHARED-02, solyra#270), not any 401:".
- `:5154` (CHARTS-17): "- Given a 401 on the market data, then the page banner" becomes "- Given a
  final 401 on the market data that counts (SHARED-02), then the page banner".
- `:5157`: "then the banner shows or not by which answer came" becomes "then the banner shows or not
  by which counted answer came".
- `:5230` (OPTIONS-13 row): "while a gated call answers 401;" becomes "while a gated call's final
  answer is a 401 that counts (SHARED-02);".
- `:3828`: "- Given a gated 401, then `authedFetch` marks the session blocked and calls `onUnauthorized`"
  becomes "- Given a gated call's final 401 that counts (SHARED-02), then `authedFetch` marks the
  session blocked and, in `firebase` mode, calls `onUnauthorized`".
- `:5165`: "- Given a gated 401, then `authedFetch` calls `onUnauthorized`" becomes "- Given a gated call's
  final 401 in `firebase` mode, then `authedFetch` calls `onUnauthorized`".
- `:6364-6365`: "a 401 sets the flag" becomes "a final 401 that counts (SHARED-02) sets the flag", and
  "any successful gated response clears it (`clearAuthBlocked`, `authedFetch.ts:156-160`)" becomes "a
  successful gated response that counts clears it (`clearAuthBlocked`, `authedFetch.ts:188`)".
- `:6393`: "- Given a gated call answers 401, then `Sign in to load options data`" becomes "- Given a
  gated call's final answer is a 401 that counts (SHARED-02), then `Sign in to load options data`".
- `:6395`: "- Given a gated call succeeds again, then the banner is gone (read, `authedFetch.ts:156-160`;
  no test)" becomes "- Given a gated call succeeds again and that answer counts (SHARED-02), then the
  banner is gone (read, `authedFetch.ts:184-192`; no test)".
- `:6464`, `:7113`, `:7631`, `:8519`, `:9370` and `:10643`, the permission summary rows, the same
  text six times: "a signed-in user's 401" becomes "a signed-in user's final 401 that counts
  (SHARED-02)".
- `:6398`: "- Given a 401 from a gated path, then the wrapper calls the callback" becomes "- Given a final
  401 from a gated path in `firebase` mode, then the wrapper calls the callback".
- `:7058`, `:7573`, `:8443`, `:10577` and `:11389`, the same text five times: "- Given a gated 401,
  then the wrapper calls the callback registered with `setOnUnauthorized`" becomes "- Given a gated
  call's final 401 in `firebase` mode (SHARED-02), then the wrapper calls the callback registered
  with `setOnUnauthorized`".
- `:7037`, `:7555`, `:8425`, `:10550` and `:11369`, the same text five times: "any gated 401 and
  cleared by any later gated success" becomes "a gated call's final 401 and cleared by a later gated
  success, each when it counts", and its pointer, on the same line in four of the five (`:7037`,
  `:7555`, `:8425`, `:10550`), "(`src/lib/authedFetch.ts:155-166,247-250`," becomes
  "(`src/lib/authedFetch.ts:184-197,280-296`,", as it does at the start of `:11370`. In the line
  after each (`:7038`, `:7556`, `:8426`, `:10551`, `:11370`), the same text five times: "so it
  follows the last answer (read)" becomes "so it follows the last answer that counted (read;
  SHARED-02, solyra#270)".
- `:7053`, `:7569`, `:8438`, `:10570` and `:11385`, the strip criteria: "Given a signed-in user and a
  401 on the playbook request" (the list, the signals request, every call, both routes) becomes
  "Given a signed-in user and a final 401 on the playbook request that counts (SHARED-02)", and
  `:9308` "whose calls answer 401" becomes "whose calls end in a 401 that counts (SHARED-02)".
- `:9297`: "Every gated call that answers 401 marks the session blocked," becomes "Every gated call whose
  final answer is a 401 that counts marks the session blocked (SHARED-02),".
- `:9309`: "- Given a gated path answers 401, then the fetch layer reports the session blocked," becomes
  "- Given a gated path's final answer is a 401 that counts (SHARED-02), then the fetch layer reports
  the session blocked,".

The callback criteria cite `a 401 from a gated path fires onUnauthorized`, which runs in `firebase`
mode with every attempt answering 401, as the qualified text says. The repeated texts are
replaced as counted sets (Design, opening paragraph), or the apply script refuses.

Statements that no test reads the flag, which the account-switch and verify-email tests in
`src/lib/authedFetch.test.ts` now do (`expect(gate.isAuthBlocked())`):

- `:1352` (AUTH-08): "but no assertion in it reads the resulting flag (" becomes "and neither of these
  two tests reads the resulting flag (".
- `:1367-1371` (AUTH-08 Tests): "(15 tests, Vitest, CI-run) is real, passing coverage of / the
  401-on-gated-path mechanics and the token-retry behavior, though its assertions target the /
  `onUnauthorized` callback and the `Authorization` header, not `isAuthBlocked()` directly; /
  `markAuthBlocked`/`clearAuthBlocked` run for real as an unmocked side effect, but no assertion in /
  that file reads the resulting flag." becomes "(37 tests, Vitest, CI-run) is real, passing coverage
  of / the 401-on-gated-path mechanics and the token-retry behavior. Most of its assertions target
  the / `onUnauthorized` callback and the `Authorization` header; the account-switch, verify-email
  and / retry-condition tests also read the flag through `isAuthBlocked()` (`a late 401 from account
  A does not mark account B as / auth-blocked`)." The file holds 26 tests on main and 37 with this
  change.
- `:1377` (AUTH-08 Tests): "The `isAuthBlocked` branch itself remains untested" becomes "The
  `isAuthBlocked` → `Sign in to load data` rendering branch itself remains untested", so the line
  is not read as contradicting the tests above that read the flag.
- `:2040-2043` (SHELL-16 Tests): ", but every assertion in that / file targets
  `onUnauthorized`/the `Authorization` header, never `isAuthBlocked()`/ / `useAuthBlocked()`
  directly (grepped both repos for those four names inside any test file: zero / matches), matching
  Task 13's AUTH-08 finding for the identical mechanism." becomes "; most of its assertions target /
  `onUnauthorized` and the `Authorization` header, the account-switch and verify-email tests read /
  `isAuthBlocked()` directly, and no test reads `useAuthBlocked()`, as AUTH-08 records for the /
  same mechanism."
- `:3835` (LIVE) and `:5167` (CHARTS): "no test reads `markAuthBlocked` or `useAuthBlocked`" becomes
  "no test reads `useAuthBlocked`" (`git grep useAuthBlocked` over the test files finds none).

SETTINGS-13's statements of the pre-#241 run, which its corrected bullet below contradicts in the
present tense:

- `:13549`: "- What a signed-in account sees when a route refuses it is the error of its own row, not
  a sign-in state." becomes "- Before #241, what a signed-in account saw when a route refused it was
  the error of its own row, not a sign-in state."
- `:13565-13566` (States): "the error lines above for a refused / route." becomes "the error lines
  above for a route / that refuses the token (a 401), under the shell's expired-session strip since
  #241 (SHARED-02; not checked on the page)." The allowlist's 403, which SETTINGS-13 also calls a
  refusal, leaves the flag unset, so the line names the 401.
- `:13580-13581`: "then the page shows the load errors above and no sign-in state (executed; matrix
  / Gaps)." becomes "then before #241 the page showed the load errors above and no sign-in state
  (executed; matrix / Gaps); since #241 the session is also marked blocked and the shell shows its
  expired-session strip (SHARED-02; not checked on the page)."

SETTINGS-13's bullet, lines 13551-13554 from "The client treats", becomes

```
  twice, React Query's one retry). That run predates #241. Since #241 the client, like the server, gates every path under `/api/me/`
  and leaves `/api/me` itself open (`OPEN_EXACT`, `src/lib/authedFetch.ts:48`; `_OPEN_API_EXACT`, `platform/api/auth.py:69`), so a 401
  from either route takes the gated path SHARED-02 describes. In `firebase` mode that is one retry, only when the wrapper sent a token,
  the request can be re-sent and a forced refresh returns a different token for the same account; then, if the answer is still 401, the
  session is marked blocked when that answer counts (SHARED-02), and `onUnauthorized` fires, though nothing in the app registers one (solyra#161); a retry
  that succeeds does neither. The tests SHARED-02 lists pin each of these conditions, and `treats /api/me/preferences as gated while /api/me
  stays open` pins the `onUnauthorized` call when every attempt answers 401. What the page shows in that state was not re-run (not checked). The stocks matrix Gaps entry for these routes still
  describes the behaviour before #241.
```

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
        401s to a bare `curl` against a deployed host, whose API runs in
        `firebase` mode. Either send an `Authorization: Bearer <id token>` header,
```

The next line stays. A `curl` reaches the backend, which matches the path, so a query does not
change the answer. The 401 holds where the API runs in `firebase` mode, as the one deployed API
does (Changes from solyra#272, 6); in `open` and `iap` modes the API itself answers no 401. The file stays valid YAML (checked with `yaml.safe_load`).

### .claude/agents/security-scan.md

Line 3: "auth-gate bypasses in authedFetch's OPEN_PREFIXES, and" becomes "auth-gate bypasses in
authedFetch's OPEN_EXACT and OPEN_PREFIXES, and", and on the same line the dash after "Read-only"
becomes "Read-only: it reports", so the changed line carries no em dash.

Lines 143-163 (the paragraph, the bash block and the paragraph after it). Replace them with

````
`src/lib/authedFetch.ts` defines `OPEN_EXACT` (open by exact match) and
`OPEN_PREFIXES` (open by prefix): the endpoints reachable pre-auth. They must
mirror the backend's `_OPEN_API_EXACT` and `_OPEN_API_PREFIXES` in
`platform/api/auth.py` in the **stocks** repo.

```bash
# Each open list's whole declaration, from `const OPEN_EXACT` or
# `const OPEN_PREFIXES` through its closing bracket, however many lines the
# array spans: a fixed `-A` window misses an entry added below it.
open_lists() { awk '/^(export )?const OPEN_(EXACT|PREFIXES)[^A-Za-z0-9_]/,/^[[:space:]]*\]|^(export )?const OPEN_(EXACT|PREFIXES)[^A-Za-z0-9_]([^/]|\/[^/*])*\][[:space:]]*(as const)?[[:space:]]*;?[[:space:]]*$/'; }
open_lists < src/lib/authedFetch.ts
[ -n "$(open_lists < src/lib/authedFetch.ts)" ] \
  || echo "no OPEN_EXACT or OPEN_PREFIXES declaration found: flag HIGH, the open lists moved or were renamed"
# Compare the declarations across revisions (merge base → working tree, so
# committed and uncommitted changes both count). Don't grep the diff for the
# names: with a multiline list, an added entry's diff line does not contain
# the list's name and a name-anchored grep misses exactly that edit.
BASE="$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD)"
diff <(git show "$BASE:src/lib/authedFetch.ts" 2>/dev/null | open_lists) \
     <(open_lists < src/lib/authedFetch.ts) \
  || echo "OPEN_EXACT or OPEN_PREFIXES changed since merge base: flag HIGH, confirm backend parity"
```

Flag **HIGH** on any addition to either list. Widening one client-side does not
grant access (the server still decides), but a mismatch changes how the wrapper
treats that path: a gated path listed as open (other than an `/api/me/*` path,
which still throws) goes out without a token when token acquisition fails, and
its 401s are neither retried nor reported as a signed-out session. It also
signals someone believed an endpoint was public. Confirm the backend agrees
before clearing it.
````

The read ends at the first line that starts with `]` (after any indentation), or on the
declaration's own line when it closes there and holds neither `//` nor `/*`, as a one-line array
does. A typed declaration (`: readonly string[] = [`) and an `as const` close are read whole, and a
`//` or `/*` comment ending in `]`, inside the array or after `[` on the declaration line, does not
end the read; a line inside the array that starts with `]` does, even within a block comment
(Risks). The block was
run against `5fbdbb9` (it prints both declarations) and in a scratch repository (table under "Checked"). The consequence sentence rests
on the token-failure and 401 branches in that table: with `/api/me/preferences` and `/api/live`
added to `OPEN_PREFIXES` in a scratch copy and both token attempts failing, `/api/me/preferences`
still throws and `/api/live/status` goes out without a token.

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

Line 63, the doc-sync row for `src/lib/authedFetch.ts`, becomes

```
| `src/lib/authedFetch.ts` | `README.md` → "Where `/api` goes"; `CLAUDE.md` → Auth; `docs/UI-SCREENS.md` → SHARED-02; `.github/ISSUE_TEMPLATE/01-defect.yml` | `OPEN_EXACT`, `OPEN_PREFIXES` or origin resolution changes |
```

README has no auth section; its "Where `/api` goes" covers origin resolution, and the three
other places now carry the open-path entries.

### src/lib/authedFetch.ts (comments only)

Lines 7-8 become

```
 * Why a global monkeypatch: the app makes its backend calls as bare relative
 * `fetch('/api/...')` across `src/`, with no central client and no
```

The comment keeps its one `fetch('/api/...')` literal. Lines 117-120, inside the `isIdentityPath`
comment, become

```
 * Paths whose RESPONSE is the identity (or data keyed to it): /api/me and
 * everything under it. /api/me is open (OPEN_EXACT) and its sub-paths are
 * gated, but none is safe to downgrade to anonymous: an anonymous answer
 * here is fabricated data, not a public resource.
```

Lines 199-200 become

```
    // Attach the identity to EVERY /api request when signed in, the open
    // paths included: see the note on OPEN_EXACT and OPEN_PREFIXES. Skipping
```

Each keeps its line count, so every `authedFetch.ts` pointer above stays right.

### src/lib/authedFetch.test.ts

Line 4: "/api/me sits in OPEN_PREFIXES (reachable" becomes "/api/me sits in OPEN_EXACT (reachable".
Line 66: the test name "attaches the bearer token to OPEN-prefix paths like /api/me" becomes
"attaches the bearer token to open paths like /api/me". Line 406: the test name "treats
/api/me/preferences as gated, matching the server, while /api/me stays open" becomes "treats
/api/me/preferences as gated while /api/me stays open": it runs only the browser's wrapper, so it
cannot speak for the server, whose side stocks' `test_firebase_open_me_is_exact_match_and_subpaths_are_gated`
pins. Only `docs/UI-SCREENS.md` cites either name, and every citation changes above.

After the test ending at line 420, inside the same `describe` (it uses that block's `signedInAs`),
add

```ts
  it('classifies a relative /api/me with a query string as gated, unlike its absolute forms', async () => {
    // pathOf keeps a relative string whole, query included, so OPEN_EXACT does not
    // match it; an absolute string, a URL or a Request yields the bare path. This
    // checks the browser's classification only. The backend matches the path alone
    // (stocks platform/api/auth.py, request.url.path) and leaves the same request
    // open; docs/UI-SCREENS.md SHARED-02 records the difference, and solyra#266
    // (FEAT-AUTH-001) changes it: that change updates this test and SHARED-02.
    signedInAs('uid-a');
    const { native, onUnauthorized, fetch } = await install();
    native.mockResolvedValue(new Response('{}', { status: 401 }));

    await fetch('/api/me?source=x');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    onUnauthorized.mockClear();
    await fetch('http://localhost:5173/api/me?source=x');
    await fetch(new URL('http://localhost:5173/api/me?source=x'));
    await fetch(new Request('http://localhost:5173/api/me?source=x'));
    await fetch('/api/health?probe=1');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
```

The absolute string adds no literal the README count matches (it does not start with `/api/`).

The ten tests below pin each condition the Design's text states about the wrapper's retry, the
flag and the callback (Changes from solyra#272, 6 and 7). Each fails under the change to
`src/lib/authedFetch.ts` the mutation table under "Checked" names for it, and passes on main's code.
The new block's title uses a colon where the file's other titles use a dash, since this change adds
no dash. Line numbers are main's.

After the test ending at line 84 (`attaches the bearer token to gated paths`), add

```ts
  it('attaches the bearer token to the OPEN_PREFIXES paths too', async () => {
    getAuthMode.mockReturnValue('firebase');
    getIdToken.mockResolvedValue('tok-123');
    const { native, fetch } = await install();

    await fetch('/api/health');
    await fetch('/api/waitlist');

    expect(native).toHaveBeenCalledTimes(2);
    for (const call of native.mock.calls) {
      expect(new Headers((call[1] as RequestInit | undefined)?.headers).get('Authorization')).toBe('Bearer tok-123');
    }
  });
```

After the test ending at line 164 (`strips the token instead when the account switches and the path is public`), add

```ts
  it('aborts an /api/me request when the account switches during the forced token refresh', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValueOnce('uid-A').mockResolvedValueOnce('uid-B');
    getIdToken
      .mockRejectedValueOnce(new Error('refresh blip'))
      .mockResolvedValueOnce('tok-of-B');
    const { native, fetch } = await install();

    await expect(fetch('/api/me')).rejects.toThrow('signed-in account changed during token refresh');
    expect(native).not.toHaveBeenCalled();
  });
```

After the test ending at line 186 (`a 401 from a gated path fires onUnauthorized`), inside the same block, add

```ts
  it('neither retries an open path that answers 401 nor marks the session blocked', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValue('uid-1');
    getIdToken.mockImplementation(async (force?: boolean) => (force ? 'tok-fresh' : 'tok-stale'));
    const { native, fetch } = await install();
    const gate = await import('./authGate');
    native.mockResolvedValue(new Response('{}', { status: 401 }));

    await fetch('/api/me');

    expect(native).toHaveBeenCalledTimes(1);
    expect(gate.isAuthBlocked()).toBe(false);
  });
```

After the test ending at line 208 (`firebase mode leaves non-/api requests untouched`), inside the same block, add

```ts
  it.each(['open', 'iap'])(
    'in %s mode a gated 401 marks the session blocked with no retry or callback, and a gated success clears it',
    async (mode) => {
      getAuthMode.mockReturnValue(mode);
      const { native, onUnauthorized, fetch } = await install();
      const gate = await import('./authGate');
      native.mockResolvedValueOnce(new Response('{}', { status: 401 }));

      await fetch('/api/admin/routes');
      expect(native).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(gate.isAuthBlocked()).toBe(true);

      await fetch('/api/admin/routes');
      expect(gate.isAuthBlocked()).toBe(false);
    },
  );
```

After the test ending at line 242 (`reports signed-out when the refreshed token also 401s, and retries only once`), at the end of that block, add

```ts
  it('does not retry a gated 401 whose body cannot be re-sent', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValue('uid-1');
    getIdToken.mockImplementation(async (force?: boolean) => (force ? 'tok-fresh' : 'tok-stale'));
    const { native, onUnauthorized, fetch } = await install();
    const gate = await import('./authGate');
    native.mockResolvedValue(new Response('{}', { status: 401 }));
    // The first send consumes a streamed body, so isReplayable refuses a second one.
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });

    await fetch('/api/me/preferences', { method: 'PUT', body });

    expect(native).toHaveBeenCalledTimes(1);
    expect(getIdToken).not.toHaveBeenCalledWith(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(gate.isAuthBlocked()).toBe(true);
  });

  it('does not retry a gated 401 when the forced refresh returns the same token or fails', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValue('uid-1');
    getIdToken.mockResolvedValue('tok-same');
    const { native, onUnauthorized, fetch } = await install();
    native.mockResolvedValue(new Response('{}', { status: 401 }));

    await fetch('/api/admin/routes');
    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(native).toHaveBeenCalledTimes(1);

    getIdToken.mockImplementation(async (force?: boolean) => {
      if (force) throw new Error('refresh down');
      return 'tok-stale';
    });
    await fetch('/api/admin/routes');
    expect(native).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it("does not retry a gated 401 with another account's token", async () => {
    getAuthMode.mockReturnValue('firebase');
    // Account A sends the request; B is signed in by the time the refresh returns.
    getCurrentUid.mockResolvedValueOnce('uid-A').mockResolvedValue('uid-B');
    getIdToken.mockImplementation(async (force?: boolean) => (force ? 'tok-of-B' : 'tok-of-A'));
    const { native, onUnauthorized, fetch } = await install();
    const gate = await import('./authGate');
    native.mockResolvedValue(new Response('{}', { status: 401 }));

    await fetch('/api/admin/routes');

    expect(native).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(gate.isAuthBlocked()).toBe(false);
  });
```

and after that block, before the verify-email block, add

```ts
describe('installAuthFetch: signed out in firebase mode', () => {
  it('marks the session blocked on a gated 401 sent and answered while signed out, with no retry', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValue(null);
    // No cached token; a refresh that did yield one must not turn this into a retry.
    getIdToken.mockImplementation(async (force?: boolean) => (force ? 'tok-late' : null));
    const { native, onUnauthorized, fetch } = await install();
    const gate = await import('./authGate');
    native.mockResolvedValueOnce(new Response('{}', { status: 401 }));

    await fetch('/api/admin/routes');
    expect(sentAuthHeader(native)).toBeNull();
    expect(native).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(gate.isAuthBlocked()).toBe(true);

    await fetch('/api/admin/routes');
    expect(gate.isAuthBlocked()).toBe(false);
  });

  it('does not mark the session blocked when an account signs in while a signed-out request is out', async () => {
    getAuthMode.mockReturnValue('firebase');
    getCurrentUid.mockResolvedValueOnce(null).mockResolvedValue('uid-a');
    getIdToken.mockResolvedValue(null);
    const { native, onUnauthorized, fetch } = await install();
    const gate = await import('./authGate');
    native.mockResolvedValueOnce(new Response('{}', { status: 401 }));

    await fetch('/api/admin/routes');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(gate.isAuthBlocked()).toBe(false);
  });
});
```

### vite.config.ts (comment only)

Line 14: "// neither the ~73 bare fetch('/api/...') call sites nor the API's CORS" becomes
"// neither the bare fetch('/api/...') call sites nor the API's CORS".

### Catalog close-out

FEAT-CICD-001's row in `docs/product/02-FEATURE-CATALOG.md`: Last reviewed set to the PR's date,
and the PR's number appended to PRs in the row's plain form (`#82, #255, #NNN`). Plain, not a
`[#NNN](url)` link: the docs audit reports a linked merged PR in a catalog row as a P1
closed-issue finding ("is CLOSED (merged) but cited as live work"), as it does on main today for
FEAT-AUTH-001's `[#241]` and FEAT-UI-001's `[#242]`, and leaves the plain `#82` alone.

Capacity: n/a. Solyra runs no workload; this changes prose, comments and tests.

### Checked on a scratch copy of 5fbdbb9 (2026-10-12)

The apply script runs on a fresh detached worktree of `5fbdbb9` with `npm ci`: "applied 102 edits
plus 36 counted replacements to 13 files". Each old text sits at the same line on `517c90e` and
`5fbdbb9`.

The mutation table. Each row changes `src/lib/authedFetch.ts` on the applied tree by one text
replacement, runs `npx vitest run src/lib/authedFetch.test.ts`, and restores the file; the last
column runs the same change against the previous cut's 27 tests (solyra#272). On the unchanged code
all 37 pass, and under each change every test not named in its row still passes.

| Change | Replacement in `src/lib/authedFetch.ts` | Fails with this Design | Fails with #272's tests |
|---|---|---|---|
| `pathOf` drops a relative URL's query | `input.startsWith('http') ? new URL(input).pathname : input` becomes `new URL(input, window.location.origin).pathname` | `classifies a relative /api/me with a query string as gated, unlike its absolute forms` | its query test |
| `pathOf` keeps an absolute string's query | `new URL(input).pathname : input` becomes `new URL(input).pathname + new URL(input).search : input` | the same | its query test |
| `isReplayable` always true | `return true;` as the first line of `isReplayable` | `does not retry a gated 401 whose body cannot be re-sent` | none |
| the retry without its different-token check | `fresh && fresh !== token && (await getCurrentUid()) === uidAtStart` loses `fresh !== token &&` | `does not retry a gated 401 when the forced refresh returns the same token or fails`, and `a late verification 403 or success from account A leaves account B's auth-blocked flag set` | the second only |
| the retry without its same-account check | the same condition loses `&& (await getCurrentUid()) === uidAtStart` | `does not retry a gated 401 with another account's token` | none |
| the retry without its sent-token check | `resp.status === 401 && gated && token && isReplayable(init, target)` loses `token &&` | `marks the session blocked on a gated 401 sent and answered while signed out, with no retry` | none |
| a gated answer outside `firebase` mode returned untracked | in the branch for other modes, `return gated ? track(resp) : resp;` becomes `return resp;` | `in open mode a gated 401 marks the session blocked with no retry or callback, and a gated success clears it` and its `iap` twin | none |
| `sameAccount` false for a request that began signed out | `const sameAccount = (await getCurrentUid()) === uidAtStart;` gains `uidAtStart !== null &&` | `marks the session blocked on a gated 401 sent and answered while signed out, with no retry` | none |
| `sameAccount` true for any request that began signed out | the same line gains `!uidAtStart \|\|` | `does not mark the session blocked when an account signs in while a signed-out request is out` | none |
| an open path's answer tracked | the last `return gated ? track(resp, uidAtStart, sameAccount) : resp;` becomes `return track(resp, uidAtStart, sameAccount);` | `neither retries an open path that answers 401 nor marks the session blocked` | none |
| an open path's 401 retried | the retry condition loses `gated &&` | the same | none |
| an identity path sent when the refresh returns another account's token | in the account-change branch of token acquisition, `isIdentityPath(path) \|\| isGatedApiPath(path)` becomes `isGatedApiPath(path)` | `aborts an /api/me request when the account switches during the forced token refresh` | none |
| a present token kept off the OPEN_PREFIXES paths | `const nextInit = token ? withToken(token) : init;` becomes `token && (isGatedApiPath(path) \|\| isIdentityPath(path)) ? withToken(token) : init` | `attaches the bearer token to the OPEN_PREFIXES paths too` | none |

Ten of the thirteen changes passed every test of the previous cut, the finding of 4250017207 and
the sweep of Changes from solyra#272, 7; each now fails one named test.

Two facts SHARED-02 states sit outside what the wrapper's harness can change, and done_when 9
reads them from the code: `markAuthBlocked()` and `clearAuthBlocked()` are called only at
`src/lib/authedFetch.ts:186`, `:188` and `:294`, so nothing clears the flag when the account
changes (the switch happens in the Firebase SDK, which the harness mocks), and nothing outside the
tests calls `setOnUnauthorized` (`git grep -n "setOnUnauthorized(" -- src ':!*.test.ts'` finds only
its definition).

The flag across accounts, in the same harness:
- after account B's gated 401 the flag is set, a late 200 to a request account A made leaves it
  set, B's own 200 clears it, and after another 401 B's verify-email 403 clears it too (pinned by
  `a late verification 403 or success from account A leaves account B's auth-blocked flag set` and
  `marks verification required for the signed-in uid and clears a stale auth-blocked flag`);
- after account A's final 401 and a switch to account B, the flag is still set before any answer
  for B, and B's first gated success clears it (solyra#270; executed, and read from the code as
  above, since the switch itself happens outside the wrapper);
- a late final 401 to a request A made, arriving after the switch, fires `onUnauthorized` and
  leaves the flag as it was (pinned by `does not retry a gated 401 with another account's token`
  and `a late 401 from account A does not mark account B as auth-blocked`).

Classification, each answering 401 with a token sent and no retry: `/api/me` stays open (no flag,
no callback); a relative `/api/me?source=x` and `/api/me#x` are gated (flag and callback); the
same URL as an absolute string or a `URL` stays open; a relative `/api/health?probe=1` stays open.
The committed query test pins every case but `#x`. On the server side, stocks' `_path_requires_auth`
run on Starlette's `URL(...).path` gives open for `/api/me?source=x` and `/api/me#x` and gated for
`/api/me/profile?x=1`, `/api/me/preferences` and `/api/me/profile`; that run is the evidence for
the server's half SHARED-02 states, and no committed test in either repository repeats it.

Token failures: `/api/me` throws when the cached token and the forced refresh both fail and when
the refresh returns another account's token, and goes out with the fresh token when the refresh
succeeds; a gated `/api/me/profile` throws when both fail; `/api/waitlist` goes out without a token
in both failure cases. With a token present, `/api/health`, `/api/waitlist`, `/api/me`,
`/api/me/profile` and `/api/live/status` each carry it. Committed tests pin each of these
behaviours, on `/api/me`, `/api/admin/routes`, `/api/health` and `/api/waitlist`; `/api/me/profile`
and `/api/live/status` were the executed examples of a gated path.

The Lovable research call, in the same harness in `firebase` mode: a POST to
`https://<project>.supabase.co/functions/v1/insights-research` with its own `Authorization` and
`apikey` reaches the native fetch with the same URL and the same `init` object, and no token
lookup is made.

The gate, from `5fbdbb9`, on throwaway repositories: the thirteen files on
`feature/feat-auth-001-claude-md-open-paths` fail with "process change(s) (...) belong to
FEAT-CICD-001, not FEAT-AUTH-001"; a #266-shaped fix on `fix/feat-auth-001-pathof-query` that
also edits CLAUDE.md fails with "process change(s) (CLAUDE.md) belong to FEAT-CICD-001", and
without CLAUDE.md it draws no process-change error.

The security-scan block, in a scratch repository whose `OPEN_PREFIXES` has a comment line
`// mirrors stocks _OPEN_API_PREFIXES[3]` after its fifth entry and a comment on the line after its
closing bracket, once spanning thirteen lines and once twenty-nine, against a read that ends on
any line ending in `]` and fixed windows of 12, 20 and 40 lines:

| Change | Ends on any `]` | 12-line window | 20-line window | 40-line window | This block |
|---|---|---|---|---|---|
| entry added after the eighth array line | no HIGH in both | no HIGH in the 29-line | no HIGH in the 29-line | HIGH | HIGH |
| entry removed after the eighth array line | no HIGH in both | no HIGH in the 29-line | no HIGH in the 29-line | HIGH | HIGH |
| entry added below the in-array comment | no HIGH in both | no HIGH in the 29-line | no HIGH in the 29-line | HIGH | HIGH |
| one-line `OPEN_EXACT` gains an entry | HIGH | HIGH | HIGH | HIGH | HIGH |
| only the comment after the closing bracket changes | no HIGH | no HIGH | HIGH in the 13-line | HIGH in both | no HIGH |
| both lists renamed | not-found and changed | not-found and changed | not-found and changed | not-found and changed | not-found and changed |
| no change | no HIGH | no HIGH | no HIGH | no HIGH | no HIGH |

Every variant but this block fails at least one case in one of the two arrays; the 12-line window
passes the thirteen-line array alone, which is why done_when 11 runs both. In a third copy whose
`OPEN_PREFIXES` declaration line ends in `// mirrors _OPEN_API_PREFIXES[0]`, an added entry gives
HIGH with this block and none with the r3 block, whose one-line end rule closed the read on that
line. In a fourth whose declaration line ends in `/* auth.py [70]`, closed on the next line, an
added entry gives HIGH with this block and none with one that excludes only `//`. Typed and
`as const` declarations are read whole; a one-line declaration that holds `//` or `/*` (a comment,
or a URL entry such as `'/api/*'`) reads on to the next line that starts with `]`, a false alarm at
worst. A line inside the array that starts with `]`, as a block comment's continuation could, ends
the read there, and an entry added below it gives no HIGH (Risks).

With all thirteen files edited, on `5fbdbb9`:

- `node scripts/docs-audit.mjs`: the two CLAUDE.md count-claim findings are gone and no finding is
  new; README's ~116 equals the derivation. Main's six FRONTEND.md count-claim findings (the
  Lovable routes) and its `roadmap.md` unclassified finding stay, as on main.
- Each grep in done_when prints what its item says, against `HEAD` (main) and on the edited tree.
- Each item that describes behaviour fails against a deliberately broken copy:

  | Item | Broken copy | Result |
  |---|---|---|
  | 3 | Claims rows kept | 3 lines |
  | 4 | "~116 bare" written into UI-SCREENS' call-site line | 1 line |
  | 4 | "(~116 `fetch('/api/...')` literals" written there | 1 line |
  | 5 | LANDING-10's Code line left at `:45` | 1 line |
  | 6 | `:8827` left as "the open prefixes" | 1 line |
  | 7 | the kept anchor dropped | nothing |
  | 8 | the r2 Design (CLAUDE.md states the exception, cites no #266) | no `solyra#266` count, two `gated in the browser` lines |
  | 8 | the previous cut's Design (solyra#272) | the server-claim grep prints 7 lines; `half is read from` prints nothing |
  | 9 | the r3 Design | 16 class lines, no `solyra#270` |
  | 9 | REPORTS-10's summary row left as it was | 1 line |
  | 9 | SETTINGS-13's criterion left in the present tense | 1 line |
  | 9 | SETTINGS-13 without "the request can be re-sent" | `docs/UI-SCREENS.md:2` |
  | 9 | AUTH-08's `:1377` left as it was | 1 line |
  | 9 | the previous cut's Design (solyra#272) | its qualifiers print 45 lines; the no-account count prints nothing |
  | 9 | `clearAuthBlocked();` called from a new place in `src/` | an extra line beside `:186`, `:188` and `:294` |
  | 10 | each change in the mutation table | the test its row names fails |
  | 11 | each variant in the table above, the r3 block on the third copy, and a block that excludes only `//` on the fourth | at least one wrong case |
  | 12 | a stray file added | the stray path printed |

- `npx vitest run src/lib/authedFetch.test.ts src/mocks/contract.test.ts --testTimeout=60000`: 2
  files, 51 tests passed; `scripts/docs-audit.test.mjs` with the `npm ci` `node_modules`: 643 of 643
  passed.
- `npx tsc -b` and eslint on the three touched source files: clean, with `node_modules` from
  `npm ci` on `5fbdbb9` (the lockfile #265 synced).
- The gate, from `5fbdbb9`, on a throwaway repository with this spec and its plan on the base: the
  thirteen files and the catalog row on `feature/feat-cicd-001-claude-md-open-paths` pass `--pr`
  as a draft and as ready for review with every box ticked; unticked boxes are refused when ready.

## Risks

- The recurring count finding the first draft carried is gone: CLAUDE.md states no fetch count,
  and the one fetch count the audit checks sits in `README.md`, which any branch that can add a
  call may also edit (a `chore/` branch cannot, and adds no call). This change uses that path
  itself (101 to 116). The Rule 3.7 count at `CLAUDE.md:183` stays audited.
- The documented query-string difference is real behaviour. Its browser half is pinned by a test;
  its server half is read from stocks' code and no test in either repository checks it, so a
  stocks change to how the middleware reads a path would not fail this repository's suite. That
  half belongs to stocks' own tests, which this solyra spec does not change. solyra#266
  (FEAT-AUTH-001) will normalise `pathOf`; its done_when has the change update the test and
  SHARED-02 only, neither a process file, and CLAUDE.md only points at SHARED-02 and #266, so it
  needs no edit then. #266's text names the test by its previous name, "classifies a relative
  /api/me with a query string as gated, which the server leaves open"; the test it means is the
  one renamed here. Until #266 lands a relative `/api/me` with a query is treated as gated in the
  browser.
- The expired-session flag survives an account switch: after account A's final 401, account B sees
  the strip until B's first gated success. No test pins it, since the switch happens in the
  Firebase SDK, outside the wrapper the tests drive; done_when 9 reads from the code that only the
  wrapper's answers set or clear the flag. This change describes that in SHARED-02 and in the lines
  that say the flag follows "the last answer that counted", and cites solyra#270 (FEAT-AUTH-001),
  which will change it. #270's done_when has its PR drop that caveat from SHARED-02 and the
  qualified strip rows, all in `docs/UI-SCREENS.md`, which a FEAT-AUTH-001 branch may edit.
- The audit is not in CI. CI runs only its unit tests (`scripts/docs-audit.test.mjs`, through
  `vite.config.ts:114`), so README's count is checked when a PR's author runs Phase 5 step 5.
- The open-path entries now appear in CLAUDE.md, `docs/UI-SCREENS.md` SHARED-02 and the defect
  template besides the code. The commit command's doc-sync row for `authedFetch.ts` names all
  three, but nothing checks them mechanically.
- The done_when greps read one line at a time. They catch every location this Design edits,
  because each one hits on main as a single line and stays stale only if left unedited; they
  would not catch a stale phrase newly written across a line break. done_when 8 and 9 check the
  main texts positively.
- The security-scan block ends its read at the first line that starts with `]`, or on a one-line
  declaration that holds neither `//` nor `/*`. If the last entry is written on the same line as
  the closing `];`, or a one-line declaration holds `//` or `/*` (a comment, or a URL entry such as
  `'/api/*'`), the read runs on to the next line that starts with `]` or to the end of the file,
  and a later change reports HIGH: a false alarm, never a missed entry. The one early close is a
  line inside the array that starts with `]`, as a block comment's continuation could: the read
  ends there, and an entry added below it is not compared. Both lists on main are one-line
  declarations, so neither has such a line.
- The edits to `src/` and `vite.config.ts` make this a code PR to CI, so the e2e workflow runs, and
  E2E on main is red. Run 38256446842 on `54ca9ae` (the last E2E run on main; #267 and #268 are
  docs-only) failed 7 tests and passed 283, all failures from the Lovable commits: the sidebar nav
  counts (`tests/admin/admin-auth.spec.ts:236`, `:249`), the top nav and the shell branding
  (`tests/shared/navigation.spec.ts:48`, `:78`) and three Lovable insights specs
  (`tests/insights-lovable/insights-lovable.spec.ts:36`, `:48`, `:59`). This change does not cause
  them: in `src/` it edits comments in `authedFetch.ts`, renames two unit tests and adds eleven, and in
  `vite.config.ts` one comment. Its e2e run will show the same seven failures until a
  FEAT-INSIGHT-001 fix lands; whether to merge past them is the owner's call under CLAUDE.md
  Rule 2.5 ("CI is green").
- The Lovable research workspace depends on stocks' `/api/me` resolving a bearer token to an email
  (`supabase/functions/insights-research/index.ts:68-78`), not on its open status, so a later
  change to `_OPEN_API_EXACT` does not break it; a change to what `/api/me` returns would.
