---
feat_id: FEAT-CICD-001
req_ids: [REQ-DATA-001]
issues: []
canvases: []
done_when:
  - "src/lib/replayBarsContract.test.ts passes under npm test and holds a test named replayBarsPhase reads one env value: replayBarsPhase(undefined) and replayBarsPhase('after') return 'after', replayBarsPhase('before') returns 'before', and the empty string, 'AFTER', 'post' and 'bogus' each throw an Error whose message names REPLAY_BARS_PHASE and quotes the value it was given (on main neither src/lib/replayBarsContract.ts nor its test exists)"
  - "The same file holds a test named missingBarsMismatches judges the answer for a day the table lacks: for ('after', 'SPY', '20100104') it returns an empty list only for status 404 with detail exactly 'No 1-min bars for SPY on 20100104 in market_data_intraday.', and one mismatch each for 404 with 'No data found in Cloud SQL or GCS for spy date=20100104', for 404 with 'No data for SPY on 20100104', for 404 with 'Invalid date 20100104: expected YYYYMMDD or YYYYMM.', for 200, and for 503 with 'Could not read 1-min bars for SPY on 20100104: the database is unavailable.'; for 'before' it returns an empty list for 200, for 404 with 'No data found in Cloud SQL or GCS for spy date=20100104' and for 404 with 'No data for SPY on 20100104', and one mismatch each for 404 with the 'No 1-min bars for SPY on 20100104 in market_data_intraday.' text, for 404 with 'No data found in Cloud SQL or GCS for SPY date=20100104' (upper-case ticker), for 404 with 'Not Found', for 404 with no detail, and for 401; every mismatch sentence quotes the status and the detail it was given"
  - "The same file holds a test named referenceMismatches judges the reference answer: for 'after' it returns an empty list only for status 200 with source 'cloud_sql', and one mismatch each for 200 with source 'alphavantage', for 200 with no source, for 404 and for 503; for 'before' it returns an empty list for 200 with source 'alphavantage', with source 'cloud_sql' and with no source, and one mismatch each for 404 and for 503"
  - "The same file holds a test named barsDetailKind names every Design 7 prefix: barsDetailKind returns 'bars-not-in-table' for 'No 1-min bars for SPY on 20100104 in market_data_intraday.', 'daily-bar-not-in-table' for 'No daily bar for SPY before 20100104 in market_data_daily.', 'invalid-date' for 'Invalid date 20100104: expected YYYYMMDD or YYYYMM.' and for 'Invalid date 20100104: expected YYYYMMDD or YYYY-MM-DD.', 'no-bar-by-end-time' for 'No data for SPY on 20100104 at or before end_time=09:45' and for 'No data for SPY on 20100104', 'no-matching-trades' for 'no matching trades found', 'database-unavailable' for 'Could not read 1-min bars for SPY on 20100104: the database is unavailable.', for 'Could not read reference levels for SPY before 20100104: the database is unavailable.', for 'Could not read 1-min bars for SPY: the database is unavailable.' and for 'Could not read journal trades for SPY: the database is unavailable.', 'journal-not-configured' for 'journal database not configured', and 'unknown' for 'No data found in Cloud SQL or GCS for spy date=20100104', for 'Not Found', for 'no 1-min bars for SPY' (lower-case first letter) and for the empty string"
  - "tests/charts/replay-bars-table.cloud.spec.ts exists and npx playwright test --project=cloud --list prints 5 tests in 4 files, 1 of them in this file (on main: 4 tests in 3 files); with REPLAY_BARS_PHASE=bogus set, that command and npx playwright test --project=chromium --list print the same lists as without it"
  - "npm run e2e -- tests/charts/replay-bars-table.cloud.spec.ts on the PR head reports 1 skipped and 0 failed, with REPLAY_BARS_PHASE unset and again with REPLAY_BARS_PHASE=bogus, and the e2e workflow on the PR head is green: the first statement of the test is test.skip for every project but cloud, as in the three existing cloud specs, and the one call of replayBarsPhase in the file is inside the test, on a line after it"
  - "The cloud spec file calls page.screenshot 4 times, with the output names dashboard-reference, charts-held-session, charts-20100104 and playbook-reference each followed by the run's before or after label, and each of the 4 calls passes mask with page.getByTestId('auth-status'), page.getByTestId('account-menu-status') and page.getByTestId('email-verification-banner'); it writes one JSON receipt with fs to info.outputPath of replay-bars-receipt-before.json or replay-bars-receipt-after.json and attaches that file by path under the name replay-bars-receipt; it contains no page.route, route.fulfill, mockCommon or page.request and no fetch call"
  - "grep -n 'No specs yet' CLAUDE.md and grep -n 'cloud spec exists yet' CLAUDE.md print nothing (on main the two greps print lines 393 and 465); the e2e:cloud row of the Testing table names the four cloud spec files and says that tests/charts/replay-bars-table fails until staging has deployed the stocks change unless REPLAY_BARS_PHASE=before is set; Testing discipline item 5 says the owner runs the cloud spec before the stocks change merges and once staging has deployed it (on main it names only the second run)"
  - "tsc -b, the full vitest run and npm run build pass on the PR head; node scripts/docs-audit.mjs reports nothing on the branch that main does not; python3 scripts/gate/spec_gate.py --pr origin/main is clean; git diff --name-only origin/main lists only src/lib/replayBarsContract.ts, src/lib/replayBarsContract.test.ts, tests/charts/replay-bars-table.cloud.spec.ts, CLAUDE.md, the plan and docs/product/02-FEATURE-CATALOG.md"
  - "In docs/product/02-FEATURE-CATALOG.md the FEAT-CICD-001 row keeps its Status cell byte for byte as on main at 13dfa44 (it starts 'Production but needs remediation' and ends 'shared E2E baseline repair in progress', as PR 323 left it), its Last reviewed cell is the PR head commit's date written YYYY-MM-DD (on main: 2026-11-11), and its PRs cell is the list on origin/main with this PR's number appended as ', #<number>' (at 13dfa44: #82, #255, #282, #287, #294, #295, #323); no other cell of the row and no other row changes"
status: draft
supersedes: null
---

# Deployed-site check for the replay-bars answers (owner-run cloud spec)

## Problem

The stocks spec `docs/superpowers/specs/2026-11-13-feat-replay-001-replay-bars-from-the-table.md`
(FEAT-REPLAY-001, read at stocks commit 7df792b4) changes what two routes the site calls answer:

- `GET /api/market/data/{ticker}/{date}`: a day the table lacks answers 404 with
  `No 1-min bars for {T} on {date} in market_data_intraday.` It no longer reads the bucket.
- `GET /api/market/reference/{ticker}/{date}`: always answered from `market_data_daily`, with
  `source` `cloud_sql`. It no longer calls AlphaVantage.

Its Close-out step 1 needs a Playwright run against the deployed site before the stocks PR merges, and
step 4 needs the same run again once staging has deployed it. Both are the owner's runs (AGENTS.md,
Browser proof). They need a `*.cloud.spec.ts` in solyra, merged before the stocks PR merges.

What is true at solyra main 13dfa44:

- No cloud spec opens Charts. Three cloud specs exist: `tests/catalysts/earnings-history.cloud.spec.ts`,
  `tests/playbook/orb-parity.cloud.spec.ts`, `tests/signals/score-explanation.cloud.spec.ts`.
- None of the three has a before and after mechanism. Each says it is run only once its backend has
  deployed (their header comments), and each asserts one contract.
- They share no helper. Each test starts with `test.skip(info.project.name !== 'cloud', ...)` (lines 7,
  12 and 15) and uses the saved sign-in of the `cloud` project (`playwright.config.ts:181-190`).
- `CLAUDE.md:393` still says of `npm run e2e:cloud` "No specs yet ... none exist", and Testing
  discipline item 5 (`CLAUDE.md:464-465`) still says no cloud spec exists yet. Both are false.
- Charts has no ticker picker. The active ticker defaults to IWM (`src/stores/tickerStore.ts:209`) and
  is picked on the Dashboard (`src/routes/DashboardPage.tsx:513`), not on Charts or the Playbook.
- The Dashboard asks reference levels for today in Eastern time until the brief has answered, and
  then for the brief's latest daily date when that differs (`src/routes/DashboardPage.tsx:394-401`;
  its `todayISO` is `todayET`, `:250-252`). The Playbook asks for today in Eastern time
  (`src/routes/PlaybookPage.tsx:73-84`). Charts asks for the selected day
  (`src/routes/ChartsPage.tsx:193`).

## Non-goals

- No screen change. The UI that shows "not in the table" and "unavailable" states, and the Replay
  calendar limited to the dates the table has, is a separate solyra spec that follows the stocks
  change. No screen imports the new helper in this change.
- The 503 state. The deployed site cannot show it without a database outage. Its proof is the stocks
  API tests and, for the wording, the hermetic suite of the UI spec.
- The contract sync. It is its own spec:
  `docs/superpowers/specs/2026-11-13-feat-cicd-001-replay-bars-contract-sync.md`.
- `POST /api/backtest/replay-trades` and `POST /api/style/mine-and-validate`. The run never calls
  them: on the deployed site only their 503 changes, and a call would write journal or style rows.
- No assertion on what Charts draws for the missing day. Which solyra bundle is published was not
  checked, so the run asserts responses and the signed-in shell, and the screenshot records the rest.
- No assertion on the reference answer for 2010-01-04. Whether `market_data_daily` holds an SPY bar
  before that day was not checked. The response is written to the receipt.
- No edit of `docs/E2E_TEST_PLAN.md` or `FRONTEND.md`. Their lists of cloud specs are short already
  (neither names the earnings one). They are documentation and can change on a `docs/` branch.
- No edit of the stocks CLAUDE.md, whose rule 3.11 also says no cloud spec exists yet.
- No change to `playwright.config.ts`, `package.json` or any workflow.

## Approaches considered

1. Record only, with no phase: the run saves the four states and asserts the new contract. Rejected:
   the run before the merge would be red by design, and a red run cannot tell "the old API, as
   expected" from "the check is broken".
2. Two spec files, one per phase. Rejected: the navigation would be written twice and the first file
   would be dead the day staging deploys.
3. One file and one explicit env var, `REPLAY_BARS_PHASE` (chosen). The judgments that differ by
   phase sit in a pure helper with a unit test, so the texts the run compares are pinned in CI even
   though CI never runs the cloud project.

Where the file lives: `tests/charts/`. Charts is the one page that calls both routes and it carries
two of the four states. This is what the stocks Close-out names, and it follows
`tests/signals/score-explanation.cloud.spec.ts`, which covers the Dashboard and Signals from the
folder of the page that owns the subject. `tests/shared/` was the other candidate.

Which capability: FEAT-CICD-001. The catalog files this repository's tests under it
(`docs/product/02-FEATURE-CATALOG.md:12-14`). The three existing cloud specs were filed under
FEAT-CATALYST-001, FEAT-PLAYBOOK-001 and FEAT-SIGNAL-001 because each arrived inside that
capability's screen change. This one arrives alone, spans three capabilities' pages, and corrects
`CLAUDE.md`, which the gate lets only a FEAT-CICD-001 change touch. Run on 2026-11-13 in a scratch
clone of 13dfa44: a `docs/` branch that edits `CLAUDE.md` is refused ("changes 1 gated file(s)"), a
`fix/feat-chart-001-...` PR that edits it is refused ("process change(s) (CLAUDE.md) belong to
FEAT-CICD-001"), and a `fix/feat-cicd-001-...` PR with `CLAUDE.md` and a file under `tests/charts/`
passes.

## Design

Branch `fix/feat-cicd-001-replay-bars-cloud-spec`, opened once this spec is approved and on main.

### 1. Files

| File | Change |
|---|---|
| `src/lib/replayBarsContract.ts` | new, pure, no import, no `/api/` literal |
| `src/lib/replayBarsContract.test.ts` | new, the four tests of `done_when` |
| `tests/charts/replay-bars-table.cloud.spec.ts` | new, one test |
| `CLAUDE.md` | three corrections (section 7) |

The helper sits in `src/lib/` because vitest collects tests under `src/` and `scripts/` only
(`vite.config.ts:114`) and CLAUDE.md asks for a pure helper with a unit test. It holds no `/api/`
literal because `src/mocks/contract.test.ts` reads every such literal under `src/` as a request the
app makes. The cloud spec imports it by relative path, as `tests/playbook/orb-parity.cloud.spec.ts:8`
imports from `src/lib`. The spec does not import `ErrorDetail` from the generated types: that schema
arrives with the contract sync, and this file must compile on main today.

It exports four functions: `replayBarsPhase` (section 2), and `barsDetailKind`,
`missingBarsMismatches` and `referenceMismatches` (section 3).

### 2. The phase

`replayBarsPhase(raw: string | undefined): 'before' | 'after'`. The spec passes
`process.env.REPLAY_BARS_PHASE`.

- `before`: the run before the stocks PR merges.
- `after`, or the variable not set: the contract of the stocks spec. This is the lasting state, so a
  plain `npm run e2e:cloud` keeps checking it.
- Any other value, the empty string included, throws. The message names `REPLAY_BARS_PHASE` and
  quotes the value it was given.

The default is not a silent fallback: the phase is written into the receipt and into every
screenshot name, and a run in the wrong phase fails its assertions.

Where it is called: once, inside the test, as the statement after `test.skip`. It is not called at
module scope. The chromium project collects this file too (section 6), so a throw while the file
loads would break `npm run e2e` and every `--list` for a bad value. Called inside the test, a bad
value changes nothing for a project that skips, and fails a cloud run before its first navigation
with the message above.

### 3. The classifier and the judgments

`barsDetailKind(detail: string)` names the row of the stocks spec's Design 7 prefix table that a
`detail` text starts with. The match is `startsWith`, case-sensitive, on the text as received.

| `detail` starts with | Kind |
|---|---|
| `No 1-min bars for ` | `bars-not-in-table` |
| `No daily bar for ` | `daily-bar-not-in-table` |
| `Invalid date ` | `invalid-date` |
| `No data for ` | `no-bar-by-end-time` |
| `no matching trades found` | `no-matching-trades` |
| `Could not read ` | `database-unavailable` |
| `journal database not configured` | `journal-not-configured` |
| anything else | `unknown` |

- `unknown` is a kind of its own. No text falls through to a kind that reads as "not in the table"
  (Rule 4).
- It reads the text only. Design 7 pairs each prefix with a status, and the caller checks the status
  with the kind.
- It names the approved contract. On the API before the change, `No data for SPY on 20100104` is an
  empty day and not an `end_time` cut, so the `before` judgment below compares whole texts and does
  not call it.
- The later solyra UI spec (stocks Close-out 5) consumes this classifier to tell "not in the table"
  from "unavailable" by the prefix and not by the status alone. That is why it lives in `src/lib/`
  and not in the spec file. No screen imports it in this change.
- Rule 1: no module on main classifies an API error by its `detail` text, so this is a new function
  and not an extension. `src/lib/apiError.ts` returns the text and does not sort it
  (`parseApiError`). `src/components/shared/WidgetState.tsx:78-81` and `:130-133` sort an error into
  sign-in, verify-email or other from the status in its message.

The two judgments return a list of mismatch sentences. An empty list means the answer meets the
phase. Every sentence quotes the status and the `detail` or `source` that came back. In the
`after` phase a bars sentence also names the kind `barsDetailKind` gives that `detail`.

`missingBarsMismatches(phase, ticker, date, status, detail)`. `detail` is the body's `detail` when
it is a string and `null` otherwise. The spec file never puts an empty string in its place.

| Phase | Meets it |
|---|---|
| `after` | status 404 and `detail` exactly `No 1-min bars for {T} on {date} in market_data_intraday.` |
| `before` | status 200; or status 404 and `detail` exactly `No data found in Cloud SQL or GCS for {t} date={date}` or exactly `No data for {T} on {date}` |

`referenceMismatches(phase, status, source)`. `source` is the body's `source` when it is a string
and `null` otherwise.

| Phase | Meets it |
|---|---|
| `after` | status 200 and `source` exactly `cloud_sql` |
| `before` | status 200; `source` is recorded, not judged |

- `{T}` is the ticker in upper case, `{t}` the ticker in lower case, and `{date}` the path value as
  sent.
- The `after` texts are those of the stocks spec's Design 7.
- The two `before` texts are what stocks main emits, read at 7df792b4 (`platform/api/main.py` is the
  same file at the stocks `origin/main` of the drafting checkout, f43447fb), not from a run:
  - `platform/api/main.py:1724` raises
    `FileNotFoundError(f"No data found in Cloud SQL or GCS for {ticker_lower} date={date}")`, with
    the ticker in lower case, and `:952-953` answers it as a 404 with that text;
  - `:956` and `:1002` answer 404 with `f"No data for {ticker_upper} on {date}"`;
  - the answer is 200 when the bucket holds a file for that day (`:1709-1722`).
- Any other answer in the `before` phase is a mismatch: another 404 text, the same text in another
  casing, a 404 with no `detail`, a 401 or a 5xx. A rule that only excluded the new text would take
  any unknown 404 for the old API (Rule 4).
- The route has a third 404 text of its own, `... at or before end_time={end_time}` (`:1018`). It
  needs `end_time`, which Charts sends only in review mode (`src/routes/ChartsPage.tsx:157-162`).
  The run never enters review mode: the review date is not persisted
  (`src/stores/reviewDateStore.ts:13-19`) and the run does not set one.
- A recent reference answer on stocks main carries `source` `alphavantage` (`:1123`) or `cloud_sql`
  (`:1154`). What the deployed API answers today was not checked.
- A `before` run that sees the new 404 text fails: staging already has the change, so it is not a
  before run.

### 4. The run

One test, so the SPY pick made on the Dashboard carries to the other pages in the same browser
context. Its first statement is `test.skip(info.project.name !== 'cloud', ...)`, the second reads
the phase (section 2), the third is `test.setTimeout(300_000)`: the config allows a test 30 s
(`playwright.config.ts:89`), this test loads three pages, and the API's cold start was not measured.

Timeouts:

- Each wait below has a 60 s timeout, and each `page.goto` passes `timeout: 60_000`. A step's waits
  are registered before its navigation or action and run alongside it, so a step ends or fails
  within about 60 s, and the four steps within 4 x 60 s = 240 s.
- The two clicks of the pick and the date fill pass `timeout: 10_000`, inside their step's 60 s.
- The 60 s that remain of the 300 s cover the precondition `expect` calls and the four
  screenshots. The config sets no `expect`, action or navigation timeout, so an `expect` waits
  Playwright's default of 5 s.
- So a wait that never resolves fails as that wait and not as a test timeout. The file builds every
  wait with one local function that takes a label (the step and the path pattern) and rethrows a
  timeout with the label in its message.

Every wait is registered before the navigation or the action that triggers it, matches GET requests
by path, and resolves on the first response for that path whatever its status. A wait for `/SPY/`
that never resolves fails the run, so the check cannot pass on another ticker.

| Step | Action | Waits for | Screenshot |
|---|---|---|---|
| 1 Dashboard | `page.goto('/dashboard')`. If `ticker-combobox` does not read SPY, click it and click `ticker-option-SPY` | the first `/api/market/reference/SPY/{8 digits}` | `dashboard-reference-{phase}.png` |
| 2 Charts, a held session | `page.goto('/charts')` | `/api/market/dates/SPY`; the first `/api/market/data/SPY/{8 digits}`; the first `/api/market/reference/SPY/{8 digits}` | `charts-held-session-{phase}.png` |
| 3 Charts, a missing day | `page.locator('input[type="date"]').fill('2010-01-04')` | `/api/market/data/SPY/20100104`; `/api/market/reference/SPY/20100104` | `charts-20100104-{phase}.png` |
| 4 Playbook | `page.goto('/playbook')` | the first `/api/market/reference/SPY/{8 digits}` | `playbook-reference-{phase}.png` |

- Step 1 judges the first SPY reference request. By the code that is the request for today in
  Eastern time: the SPY brief has not answered when the request is made, on a load that starts on SPY
  and after a pick alike, so `anchorDate` is `todayISO()` (`DashboardPage.tsx:394-396`, `:250-252`).
  A second request, for the brief's latest daily date, follows when that date is not today. It is
  not waited for and not judged. The receipt records the path of the request that was judged.
- "A session the table holds" is `dates[0]` of the `/api/market/dates/SPY` answer: the newest
  session, which Charts selects by itself (`ChartsPage.tsx:130-133`). No date is written in the file
  except 2010-01-04.
- Step 3's locator is the one the hermetic `tests/charts/charts-cards.spec.ts:198` uses, in strict
  mode. `ChartsPage.tsx:511` is the only `type="date"` input in a file Charts renders: the other
  literals under `src/` are in `JournalPage.tsx` and `SignalsPage.tsx`. That was read, not run.
- Step 3 relies on a typed date outside the picker's bounds still being requested. The hermetic
  `tests/charts/charts-cards.spec.ts:187-224` pins that. It was not run for this spec: the drafting
  checkout has no `node_modules`.
- Preconditions use `expect` and stop the run. Contract assertions use `expect.soft`, so one run
  saves all four screenshots and reports every mismatch.

Screenshots. Each is
`page.screenshot({ path: info.outputPath(name), fullPage: true, mask })`, taken once the step's
responses have arrived and before the step's contract assertions. `mask` is the same list in all
four calls: `page.getByTestId('auth-status')`, `page.getByTestId('account-menu-status')` and
`page.getByTestId('email-verification-banner')`.

- The screenshots are posted on a pull request, and the header shows the account's email: the label
  of `auth-status` is the email for a signed-in session
  (`src/components/shared/AuthStatusIndicator.tsx:50`, `:54`, `:64`), shown from the `sm` width up,
  and the cloud project runs `devices['Desktop Chrome']` (`playwright.config.ts:185`). The element
  is rendered by `TopTabs.tsx:219` or `Header.tsx:19`.
- The same file renders the email in two more places: the account row of the small-screen menu
  (`:120`, `:136`), which exists only while that menu is open (`TopTabs.tsx:250`, `:290`) and which
  the run never opens, and the verify-email banner (`:318`, `:326`), which shows only for an
  unconfirmed account. All three are masked. A locator that matches nothing masks nothing.
- No other component these three pages render shows an email, a name or a token. `useUser` returns
  no name (`src/hooks/useUser.ts:84`), and its `email` is rendered only by
  `AuthStatusIndicator.tsx` and `SettingsPage.tsx` (a search of `src/` at 13dfa44). Not run.

Preconditions:

- Step 1: `nav-menu-support` is visible, `signin-screen` and `mock-mode-banner` have count 0.
  `nav-menu-support` is visible again on steps 2 and 4.
- Every judged response's request carries `authorization: Bearer ...`, as
  `tests/signals/score-explanation.cloud.spec.ts:22-23` checks.
- Step 2: the dates answer is 200 with a non-empty `dates` that does not hold `20100104`, and the
  bars request is for `dates[0]`.

Contract assertions:

| Step | Response | Asserted, both phases | Asserted by phase |
|---|---|---|---|
| 1 | reference | | `referenceMismatches(phase, status, source)` is empty |
| 2 | bars for `dates[0]` | status 200, `ticker` SPY, `date` equal to `dates[0]`, `count` at least 1 | |
| 2 | reference for `dates[0]` | | `referenceMismatches` is empty |
| 3 | bars for 20100104 | | `missingBarsMismatches(phase, 'SPY', '20100104', status, detail)` is empty |
| 3 | reference for 20100104 | recorded only | |
| 4 | reference | | `referenceMismatches` is empty |

A 401 on a judged path. The app resends a gated request once after a 401, with a fresh token
(`src/lib/authedFetch.ts:310-324`). The wait resolves on the first response, so it takes that 401
and the judgment reports it as a mismatch, even if the resend then succeeds and the page looks
right. This is accepted: the run fails loudly, the sentence quotes the 401, and the owner runs it
again. The predicate does not skip a 401, because no test in CI could exercise that branch.

The receipt is one JSON document: the phase, the base URL, and for each response above its path,
status, `detail` or `source`, and for bars `count`. It also lists the method and path of every
`/api/` request of the run whose method is not GET. It holds no header and no request body, so no
token.

- The file writes it with `fs.writeFileSync` to
  `info.outputPath('replay-bars-receipt-{phase}.json')` and attaches that file with
  `info.attach('replay-bars-receipt', { path, contentType: 'application/json' })`. An attachment
  given as a `body`, as `tests/playbook/orb-parity.cloud.spec.ts:32` gives it, is handed to the
  reporter and is not written under `test-results/`; the config names no reporter, so the owner
  would have no file to read `detail` and `source` from. That is Playwright's behaviour as
  documented; it was not run here.
- It is written in a `finally` block that starts once the phase is read, so a run that a
  precondition or a wait stopped still leaves the answers it had seen.

### 5. No write, no mock, no math

- The file sends nothing itself: no `page.route`, `route.fulfill`, `mockCommon`, `page.request` or
  `fetch`. It makes two user actions: one quick pick and one date fill. A quick pick starts no
  watchlist write; only a search row badged "new" does (`TickerCombobox.tsx:259-275`).
- It asserts that the run saw no request to `/api/insights/watchlist/add`,
  `/api/backtest/replay-trades` or `/api/style/mine-and-validate`, and none under `/api/journal`
  with a method other than GET. The pages send POST reads of their own (`/api/live/indicators`,
  `/api/live/signal-series`, `/api/playbook/evaluate`); the receipt lists what was seen. Which
  non-GET requests these pages send with a real session was not checked, so the assertion names the
  write routes and is not an allow-list.
- Rule 4: a missing answer, an empty `dates`, a signed-out session, an unknown phase or an answer
  that is neither the phase's contract nor one of the named old texts fails the run. No response
  value is defaulted. Rule 5: the file compares strings, statuses and one count. It computes
  nothing from prices.

### 6. Who runs it

- `npm run e2e` (`playwright test --project=chromium`, `package.json:14`) collects the file, because
  the chromium project ignores only `.setup.ts` (`playwright.config.ts:137`), and the test skips
  itself before any navigation. This is how the three existing cloud specs stay out of the hermetic
  run.
- `npm run e2e:cloud` (`--project=cloud`, `package.json:16`) runs it against the deployed frontend
  (`playwright.config.ts:15-16`, `:183`) with the state `npm run e2e:cloud:auth` saved
  (`tests/auth.setup.ts:62-80`). No Vite is started for that project (`playwright.config.ts:59-61`).
- On main the cloud project holds 4 tests in 3 files, counted by reading the three files (one, one,
  and a loop over two routes). The list command was not run for this spec: the drafting checkout has
  no `node_modules`.
- With `REPLAY_BARS_PHASE=bogus`, collection never calls the helper (section 2), so both projects
  list the same tests and the chromium run of the file still reports 1 skipped. `done_when` checks
  both. That a cloud run then fails with the message naming the value is proven by the unit test
  and by where the call sits, not by a run: the cloud project needs the owner's saved sign-in
  (`playwright.config.ts:188`), so no cloud run is a `done_when` box.

### 7. CLAUDE.md

Three corrections, all in the Testing section.

- Testing table, `npm run e2e:cloud` row: "Headless run against the deployed frontend, with the
  sign-in `npm run e2e:cloud:auth` saved. Owner-run. Runs the four `*.cloud.spec.ts` files
  (`tests/catalysts/earnings-history`, `tests/charts/replay-bars-table`, `tests/playbook/orb-parity`,
  `tests/signals/score-explanation`); `npm run e2e` collects them and each skips itself.
  `tests/charts/replay-bars-table` fails until staging has deployed stocks FEAT-REPLAY-001 unless
  `REPLAY_BARS_PHASE=before` is set."
- Testing discipline item 5, the sentence on the owner's run: "against the deployed site once
  staging has deployed it and posts on the PR as a close-out step" becomes "against the deployed
  site before the stocks change merges and once staging has deployed it, and posts on the PR as
  close-out steps". `AGENTS.md:147-148` already asks for both runs, and so does this spec.
- Testing discipline item 5, the last sentence ("The Testing table above says no cloud spec exists
  yet: this is what the first one is for.") becomes "A cloud spec lives in the page's folder as
  `tests/<page>/<name>.cloud.spec.ts`."

Capacity: n/a, solyra runs no workload. One owner run loads three pages of the deployed site once
each.

Plan size: five tasks (phase and judgments with their unit tests; classifier with its unit test;
cloud spec; CLAUDE.md; verify, open the PR and record).

## Close-out (the owner's steps, posted on the stocks PR)

None of these runs is a `done_when` box. The commands below were not run for this spec.

1. This PR merges before the stocks PR merges. If the owner can, the first before run is made from
   this PR's head before it merges, so a defect in the navigation is fixed in this PR.
2. Before run, before the stocks PR merges. Sign in once with `npm run e2e:cloud:auth` if
   `tests/.auth/iap-state.json` is missing or expired. Then run the spec and copy its files out.
   Playwright empties `test-results/` at the start of every run, so the copy comes before any other
   run. The copy goes to a new folder beside the checkout.
   - bash:
     - `REPLAY_BARS_PHASE=before npm run e2e:cloud -- tests/charts/replay-bars-table.cloud.spec.ts`
     - `cp -R test-results ../replay-bars-before`
   - PowerShell:
     - `$env:REPLAY_BARS_PHASE='before'; npm run e2e:cloud -- tests/charts/replay-bars-table.cloud.spec.ts`
     - `Copy-Item -Recurse test-results ..\replay-bars-before`
     - `Remove-Item Env:REPLAY_BARS_PHASE`

   In bash the prefix sets the variable for that one command. In PowerShell it stays set for the
   session, so the `Remove-Item` line clears it; without it every later `npm run e2e:cloud` in that
   window is a before run.
3. After run, once staging has deployed the stocks change. The phase is named, so a value left in
   the shell cannot decide it.
   - bash:
     - `REPLAY_BARS_PHASE=after npm run e2e:cloud -- tests/charts/replay-bars-table.cloud.spec.ts`
     - `cp -R test-results ../replay-bars-after`
   - PowerShell:
     - `$env:REPLAY_BARS_PHASE='after'; npm run e2e:cloud -- tests/charts/replay-bars-table.cloud.spec.ts`
     - `Copy-Item -Recurse test-results ..\replay-bars-after`
     - `Remove-Item Env:REPLAY_BARS_PHASE`
4. For each run the owner posts on the stocks PR the phase, and state by state the path, the status,
   the `detail` or `source` from `replay-bars-receipt-{phase}.json`, and what the screenshot shows.
   The receipt and the four screenshots are in the test's own folder inside the copied
   `test-results` folder. Playwright names that folder from the file path, the test title and the
   project; the name was not checked, since no run was made. The owner looks at each screenshot
   before posting it: the account's email is masked, and Charts can draw the account's own journal
   trades (`src/routes/ChartsPage.tsx:223`).
5. A green after run is the deployed proof of the 404 text and of `source` `cloud_sql`. It says
   nothing about the 503 state.

## Risks

- The spec is never run against the deployed site by its own PR. `done_when` proves the classifier
  and the judgments (unit tests), that the file compiles, that the hermetic run skips it and that
  the cloud project lists it. The navigation is first proven by the owner's before run (Close-out
  1).
- The pick on the Dashboard may not carry to Charts through a full page load with a real signed-in
  session. That was read from `tickerStore.ts`, not run. If it does not carry, the `/SPY/` waits time
  out and the run fails; it cannot pass.
- The table may hold SPY bars for 2010-01-04. The precondition on `dates` fails the run and names
  the day.
- On a fresh load the Dashboard's first SPY reference request is for today in Eastern time, and the
  request for the brief's date is the second (`DashboardPage.tsx:394-396`). Step 1 waits for and
  judges the first. The screenshot can already show levels from the second. The contract is the
  same for any recent date, and the judged path is in the receipt.
- A judged request can answer 401 first and succeed on the app's one resend
  (`authedFetch.ts:310-324`). The run then fails on a page that looks right (Design 4). The owner
  runs it again, and signs in again with `npm run e2e:cloud:auth` if it repeats.
- The two `before` texts were read from stocks main, not seen on the deployed API. If the deployed
  API answers the missing day with another 404 text, the before run fails and quotes it. When that
  run is made from this PR's head (Close-out 1), the helper is corrected in this PR.
- Between this PR's merge and the stocks deploy, a plain `npm run e2e:cloud` fails on this file,
  because the default phase is `after`. That is true to what is deployed, and the CLAUDE.md row
  says so (Design 7). The other three files can be run by path.
- If the stocks implementation changes a Design 7 text, the stocks spec has to be superseded first,
  and the helper follows in a new solyra change. The unit tests pin the bars 404 text exactly and
  the prefix of every row of the Design 7 table, each with the approved text for SPY and 20100104
  as its example.
- The published solyra bundle may be older than main. The shell markers, the two controls the run
  uses (`ticker-combobox`, the Charts date input) and the three masked test ids depend on it. A
  bundle without a masked test id leaves the email in the screenshot, which is why the owner looks
  before posting (Close-out 4).
