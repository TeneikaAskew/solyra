---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-AUTH-001]
issues: []
canvases: []
done_when:
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that autoConfirmDue returns true for a shown banner on a visible page with no check running and no earlier automatic check, false when the page is hidden, when the banner is not shown, and when a check is running, false when the last automatic check started 9999 ms earlier, and true when it started 10000 ms earlier"
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that a confirm check for uid A started while another for uid A is in flight calls refresh once and resolves to the same result, that a check for uid B started then calls refresh again, and that once a check for an account has settled, failed or unverified, the next check for it calls refresh again, and that a check that read the account, found verified or not, adds one to getAccountReads for that uid while one that failed or read another account adds none"
  - "src/lib/authedFetch.test.ts asserts that a gated request whose verify-email 403 answers an ID token that was replaced while the request was out is sent once more with the current token, that the caller then receives that answer and a 200 sets no verify-email flag, that a second verify-email 403 sets the flag and no third request is sent, that a 403 whose token is replaced just after the fetch layer reads it is either sent again or marked, and that it is not sent again when the signed-in account reads differently after that token read"
  - "tests/shared/auth-gate.spec.ts signs in an email account whose accounts:lookup reports emailVerified false and whose gated calls answer 403 'verify your email to continue', makes accounts:lookup report verified and the API accept only the ID token a fresh check mints, dispatches a window focus event without clicking anything, and asserts that the Dashboard card renders its data and the banner is gone"
  - "tests/shared/auth-gate.spec.ts has a second test that leaves the account unverified, dispatches a visibilitychange while the page reports hidden and asserts that no accounts:lookup request follows, then dispatches a visibilitychange while the page reports visible and asserts that exactly one accounts:lookup request follows it, then, once that check's securetoken response has arrived and 500 ms more have passed, so that the check has finished, dispatches a window focus event and a visibilitychange back to back and asserts that none follows them, that the banner stays and shows no 'Not confirmed yet', and that clicking the banner's I've confirmed afterwards shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a third test that clicks Resend email and waits for it to read 'Sent, check your inbox', makes the refresh fail, dispatches a window focus event, and asserts that the banner shows 'Could not check the account:' with the error's message while the resend button still reads 'Sent, check your inbox', that a click on I've confirmed while the refresh still fails shows that line once and leaves the resend button as it was, and that clicking I've confirmed once the refresh answers again removes that line and shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a fourth test that signs in an email account whose accounts:lookup reports emailVerified true, dispatches a window focus event, and asserts that no accounts:lookup or securetoken request follows it"
  - "tests/shared/auth-gate.spec.ts has a fifth test that, with the account unverified, dispatches a window focus event and clicks a Dashboard card's I've confirmed in one page.evaluate, so both run in one task, and asserts that one accounts:lookup request follows and that card shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a sixth test that, with the account unverified, holds the accounts:lookup answer, dispatches a window focus event, and once that lookup has been requested asserts that the banner's I've confirmed is enabled and clicks it, then releases the answer and asserts that one accounts:lookup request followed the focus event and the click and that the banner shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a seventh test that, with the account unverified, holds the accounts:lookup answer, clicks the banner's I've confirmed, dispatches a window focus event while that check's lookup is held, releases the answer, and once the banner shows 'Not confirmed yet' dispatches a window focus event and asserts that two accounts:lookup requests followed the click"
  - "tests/shared/auth-gate.spec.ts has an eighth test that signs in an email account whose accounts:lookup reports emailVerified true while the API answers its gated calls with 403 'verify your email to continue' until a fresh ID token is minted, and whose securetoken refresh fails; asserts, without dispatching any event or clicking anything, that the banner shows 'Could not check the account:' with the error's message beside the Dashboard card's verify-email state; then lets the refresh answer, moves the page clock 10000 ms on with page.clock.setFixedTime, dispatches a window focus event, and asserts that the Dashboard card renders its data and the banner is gone"
  - "tests/shared/auth-gate.spec.ts has a ninth test that, with the account unverified, clicks the banner's I've confirmed and the first Dashboard card's and waits for each to show 'Not confirmed yet', makes accounts:lookup fail, dispatches a window focus event, and asserts that the banner shows 'Could not check the account:' with the error's message and no 'Not confirmed yet' while that card still shows its own; then lets accounts:lookup answer, moves the page clock 10000 ms on with page.clock.setFixedTime, dispatches a window focus event, and asserts that exactly one more accounts:lookup request follows it and that, once that check's token refresh has been answered, the banner shows neither the failure line nor 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a tenth test that, with the account unverified, makes accounts:lookup report verified, clicks the banner's I've confirmed, waits for the Dashboard card's data, for the banner to be gone and then for no /api request to have been in flight for 1500 ms, since that check runs until every refetch it started has been answered, dispatches a window focus event and a visibilitychange, and asserts that no accounts:lookup or securetoken request follows them"
  - "tests/shared/auth-gate.spec.ts has an eleventh test that signs in an email account whose accounts:lookup reports emailVerified false, makes accounts:lookup report verified and the API accept only the ID token a fresh check mints, reloads the page, and, without dispatching any event or clicking anything, asserts that the API answered a gated call with the verify-email 403 after the reload, that the Dashboard card renders its data, that the banner is gone, and that exactly one securetoken request followed the reload"
  - "tests/shared/auth-gate.spec.ts has a twelfth test that, with the account unverified, makes accounts:lookup report verified, makes the page report hidden from the next load on, reloads, and asserts that the API answered a gated call with the verify-email 403, that the banner shows, and that no securetoken request follows and no quote price renders while the page reports hidden; then makes the page report visible, dispatches a visibilitychange that bubbles to window as a browser's does, and asserts that the Dashboard card renders the quote's price, that the banner is gone and that exactly one securetoken request followed the reload"
  - "tests/shared/auth-gate.spec.ts has a thirteenth test, run three times with injected network latency (each /api response but the config reaching the app 300 ms late and each securetoken response 250 ms late; then 1000 ms and 100 ms; then 150 ms and 100 ms), that takes the twelfth test's steps, waits while the page reports hidden until it has made no /api request for that /api latency plus 1500 ms, and, once the page reports visible and a visibilitychange that bubbles to window has been dispatched, asserts that the Dashboard card renders the quote's price, that no card shows 'Couldn't load this data', that the banner is gone and that exactly one securetoken request followed the reload"
  - "tests/shared/auth-gate.spec.ts has a fourteenth test that, with each /api response but the config reaching the app 1000 ms late and each securetoken response 100 ms late, and each gated answer held until the page has reported hidden, signs in an email account whose accounts:lookup reports emailVerified false and whose gated calls answer 403 'verify your email to continue', makes the page report hidden and dispatches a visibilitychange that bubbles to window once the banner shows, waits until the page has made no /api request for 2500 ms and asserts that no securetoken request followed and no quote price renders, then makes accounts:lookup report verified and the API accept only the ID token a fresh check mints, makes the page report visible, dispatches a bubbling visibilitychange and a window focus event, and asserts that the Dashboard card renders the quote's price, that no card shows 'Couldn't load this data', that the banner is gone and that exactly one securetoken request followed"
  - "tests/shared/auth-gate.spec.ts has a fifteenth test that, with the account unverified, makes accounts:lookup fail, clicks the first Dashboard card's I've confirmed and waits for that card to show 'Could not check the account:' with the error's message, lets accounts:lookup answer, dispatches a window focus event, and asserts that exactly one accounts:lookup request follows it and that the card then shows neither that line nor 'Not confirmed yet', while the card and the banner still show and the banner shows neither line"
  - "Each of the fifteen e2e tests, in each of its runs, saves page.screenshot images into its own output directory under test-results/ (testInfo.outputPath): first its starting state once signed in, before any later event, click or reload, then each state it asserts on the page. The images, by name: the first and the fourth before-focus and after-focus; the second before-return, after-automatic-check and after-click; the third before-resend, after-resend, after-failed-automatic-check, after-failing-click and after-answering-click; the fifth before-return and after-card-answers; the sixth before-return, while-automatic-check-runs and after-banner-answers; the seventh before-click, while-click-check-runs, after-click-answers and after-later-return; the eighth before-return, which shows the failed check on show, and after-return; the ninth before-clicks, after-clicks, after-failed-automatic-check and after-later-return; the tenth before-click, after-click and after-return; the eleventh before-reload and after-reload; the twelfth before-reload, while-hidden and after-shown; the thirteenth, in each of its three runs, before-reload, while-hidden and after-shown; the fourteenth before-leave, while-hidden and after-return; the fifteenth before-click, after-failing-click and after-automatic-check. A PR comment describes each image"
  - "docs/UI-SCREENS.md SHELL-04 matches the banner as this change leaves it, each statement below replacing the one it contradicts: its Shows or does no longer says the banner renders only for an account whose emailVerified is false, and says it also renders while the API answers the account's gated calls with the verify-email 403 after Firebase reports it verified; its States names that state beside the unverified one; its Needs no longer says the banner needs no API, and names the Identity Toolkit accounts:lookup request and the securetoken token refresh each I've confirmed check makes, clicked or automatic, and the accounts:sendOobCode request Resend email makes; its criterion on rendering before /api/me resolves quotes the condition as this change writes it, showVerificationBanner(profileVerified, verificationRequired) with profileVerified = confirmed ? true : emailVerified, no longer says the banner reads only useUser()'s emailVerified, and names the three values the condition reads, emailVerified, useEmailConfirmed and useVerificationRequired; its criterion for an account whose emailVerified is false says that the banner also runs the I've confirmed check when the tab regains focus or becomes visible; a criterion for an account Firebase reports verified whose gated calls still answer the verify-email 403 says that the banner runs that check once with no click, at once when it shows on a visible page or else when the page next becomes visible, at most once per 10 s, and that a gated request whose verify-email 403 answers the ID token that check replaced is sent once more with the new token; its Tests no longer says that no test targets EmailVerificationBanner, and names tests/shared/auth-gate.spec.ts, src/components/shared/AuthStatusIndicator.test.ts and src/lib/authedFetch.test.ts; and its test ids include verification-check-error"
  - "The unit tests in the first three items and the first, second, third, sixth, seventh, eighth, ninth, eleventh, twelfth, thirteenth, fourteenth and fifteenth e2e tests are shown failing against main when the PR opens; the third unit item's assertions on a token replaced just after it is read and on an account switch after that read, which pass on main because it never sends a request again, are shown failing against a fetch layer that reads the token a second time to decide the mark and against one that sends again without reading the uid after the token; the fourth, fifth and tenth e2e tests, which pass on main because it has no listener, are shown failing against these broken versions of the change: the fourth against an effect that subscribes and checks whether or not the banner shows, the fifth against a card button that calls confirmEmailVerified itself instead of joining the shared check, and the tenth against an effect that never removes its listeners and against one that subscribes on Firebase's emailVerified without the confirmed record; the second is also shown failing against an effect that never records when its automatic check started, the sixth against a banner button that calls confirmEmailVerified itself and against an automatic check that disables that button, the eighth against an effect that checks when the banner shows but listens only while Firebase reports the email unverified, the ninth against an effect that runs one automatic check per banner, against an automatic check that leaves the failure line in place when it starts and against one that leaves the banner's 'Not confirmed yet' in place when it starts, the eleventh against an effect that makes no check when the banner shows, the twelfth against a check on show that runs while the page reports hidden, the thirteenth and fourteenth against the r4 prototype, whose fetch layer drops a verify-email 403 that answered a replaced ID token instead of sending it again, and against this change without that resend, each over ten repetitions, in which the fourteenth and the thirteenth's 1000 ms run fail every time and the thirteenth's 300 ms and 150 ms runs, where the check and the API answer within one round trip of each other, fail at least seven times, and the fifteenth against the r4 prototype, whose card keeps its failure line, and against a card that keeps its failure line after a later check reads the account"
  - "The solyra CI checks are green on the PR head, every test in tests/shared/auth-gate.spec.ts passes in the PR head's e2e job, and every other test that job fails is one of the seven that TeneikaAskew/solyra#274 names on main: tests/admin/admin-auth.spec.ts:236 and :249, tests/insights-lovable/insights-lovable.spec.ts:36, :48 and :59, and tests/shared/navigation.spec.ts:48 and :78"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number"
status: approved
supersedes: docs/superpowers/specs/2026-10-11-feat-auth-001-confirm-on-return.md
---

# Notice a confirmed email when the person comes back

Re-cut of r4, which was written and pre-reviewed but never opened as a pull request, and of
solyra#260, the r2 spec (head `b79d9b1`, open and unmerged; Codex raised three findings there). An
independent pre-review of r4 against main `5fbdbb9` found one P1, one P2 and four P3 defects. An
approved spec with a finding is re-cut rather than edited, so r5 replaces r4 and r3 (neither reached
a pull request) and #260, which closes unmerged when the r5 spec pull request opens; each of #260's
three Codex threads first gets a reply naming that pull request, then is resolved (CLAUDE.md 2.5).
r5 supersedes r1, the spec main holds (merged in solyra#250), because the gate refuses a
`supersedes` that names a spec the base does not carry. Approved under the owner's 2026-10-11
instruction to bring both repositories to a clean, ready and closed-out state.

The pre-review's findings, and what r5 does about each:

- P1, the check raced the retries the query client paused while the page was hidden. When the page
  shows, the banner's `visibilitychange` listener on `document` starts the check, and in the same
  task the query client's listener on `window` resumes those retries. They leave with the cached ID
  token, because the check's refresh has not finished. When the API answers more slowly than the
  check, a retry's verify-email 403 arrives after the check replaced the token, and the check's
  `invalidateQueries()` has joined that retry instead of starting a fetch. The fetch layer treated
  that 403 as superseded and did not mark it, the query had spent its one retry, and each card the
  race caught read "Couldn't load this data ... (HTTP 403)" with no banner, for an account that is
  verified. The twelfth test missed it because the mocks answer at once. r5 sends such a request
  once more in `authedFetch`, with the token read that found it superseded (Design). A third unit
  item pins the resend. A thirteenth e2e test takes the twelfth test's steps under three injected
  latencies, and a fourteenth signs in, leaves the tab before the cards load, confirms and comes
  back. The RED item names the r4 prototype as their broken version (r4's change as its pre-review
  ran it, which is this change without the resend and without the card's read count): over ten
  repetitions on it, the fourteenth test and the thirteenth's 1000 ms run fail every time, and the
  thirteenth's 300 ms and 150 ms runs, where the check and the API answer within one round trip of
  each other, fail 7 and 10 times; on r5's prototype all four pass ten times out of ten. Risks no
  longer says that only a check slower than the retry delay can race, and r4's ruling that
  documented the race instead of designing it out is withdrawn.
- P2, the merge blockers were stale. `npm ci` passes on main since solyra#265: CI run 38259361654 on
  `5fbdbb9` is green. Main's E2E workflow has seven failures this change does not touch (run
  38256446842 on `54ca9ae`, 7 failed and 283 passed), now TeneikaAskew/solyra#274. The CI checks have
  a done_when item of their own: the PR head's e2e job must pass every `auth-gate.spec.ts` test, and
  any other test it fails must be one of those seven.
- P3, ruling 2's reason was false for an automatic check that finds the address unconfirmed: the
  banner shows nothing for that, so it does not "already show" it, and a card's "Could not check the
  account" outlived a later check that read the account (the pre-review's probe E1). The card now
  drops its failure line once a later check, from any surface, has read the account, and keeps "Not
  confirmed yet" for a reason that holds (Design, "Which line shows"). A fifteenth e2e test pins it.
- P3, measurements made on `da584ca`. Each is re-run on `5fbdbb9` below, and the sentence that
  `authedFetch` forces a new token only after a 401 now also names the failed read of the cached
  token.
- P3, the SHELL-04 criterion for the check on show left out the visible-page condition. The item and
  Design now say that the banner runs it at once when it shows on a visible page, or else when the
  page next becomes visible.
- P3, the second test went on as soon as the `securetoken` request arrived. It now waits for that
  response and 500 ms more, so the interval, not a running check, is what stops the next two events,
  and the RED item names the broken version that proves it: an effect that never records when its
  automatic check started.

The r3 pre-review's findings stay answered as r4 answered them: a ninth e2e test runs a second
automatic check after the interval and checks it clears the earlier failure line; a tenth checks that
no request follows a return once the banner hides; every check the banner starts or joins clears both
its lines when it starts; SHELL-04's four false statements are replaced rather than added to; the
stocks pull request is TeneikaAskew/stocks#1384; Capacity counts two `securetoken` refreshes per check
once the cached ID token has expired; every screenshot is listed by name; and the banner runs its
check once when it shows for an address already read verified (the eleventh test), only on a visible
page (the twelfth). The eighth test makes that check fail, asserts the failure line, then lifts the
banner with a return after the interval, so it still fails against an effect that listens only while
Firebase reports the email unverified, the broken version Codex's 4240493126 on #260 described. r3's
answers to Codex's three findings on #260 stand: every e2e test saves screenshots (4240493121),
SHELL-04's Needs names the requests (4240493129), and a test covers the verified-but-403 banner
(4240493126). r2 re-cut solyra#250 (r1), whose item "Each new test is shown failing against main"
could not be met: the fourth, fifth and tenth e2e tests check that the listener adds nothing, pass
on main, which has no listener, and fail against the broken versions the RED item names.

Measured on main `5fbdbb9` (fetched 2026-10-12). Of the paths this change reads or edits
(`src/components/shared/`, `src/lib/`, `src/hooks/useUser.ts`, `src/components/layout/AppShell.tsx`,
`src/App.tsx`, `tests/shared/auth-gate.spec.ts`, `tests/helpers/`, `docs/UI-SCREENS.md`,
`playwright.config.ts` and the two workflows), `git diff --stat da584ca 5fbdbb9` changes one line:
`docs/UI-SCREENS.md:11`, the Last scanned stamp (#268). Every measurement below was nonetheless re-run
on `5fbdbb9`.

## Problem

An email account that has not confirmed its address sees the banner "Confirm your email address to
load your data." with two buttons, Resend email and I've confirmed. The person opens the link from the
email, which confirms the address in another tab or app, and comes back. The banner is still there
until they click I've confirmed, because confirming in another tab does not fire `onAuthStateChanged`
here (`EmailVerificationBanner`'s own comment says so).

The same banner shows to an account Firebase already reports verified while the API still refuses
its cached ID token, whose claim predates the confirmation (`showVerificationBanner`'s second
condition). A reload or a new tab after confirming elsewhere lands there: Firebase's start-up
re-reads the profile with one `accounts:lookup` and keeps the cached token while it is unexpired,
and a reload fires no focus or visibility event. Measured on main `5fbdbb9`, with the hermetic
suite's own mocks:

- While the cached token is unexpired, neither a return nor a reload lifts it; I've confirmed does.
  A return (a `visibilitychange` and a focus) left the banner and the four verify-email cards, with
  no `securetoken` request in the 6 s after it, in four runs of four; a reload left them too (the
  eleventh test, run on main, fails at `Pre-market brief`).
- Once the token has expired, the first gated request refreshes it and its success clears the state.
  With the page clock moved 3 700 000 ms on, a reload lifted the banner and the Pre-market brief card
  loaded in four runs of four (one `securetoken` request in three; in the fourth, two, after five
  gated calls had answered the verify-email 403). The first gated request after the move lifted it
  when one followed it, in four runs of four (one `securetoken` request in three; three, after eight
  refusals, in the fourth). A return that made no gated request left the banner and the cards, with
  no `securetoken` request in 6 s, in four runs of four.
- r4 ran each of these once, on `da584ca`, and saw one `securetoken` request each time; the runs
  with more are from the four here.

The owner asked on 2026-10-11 what I've confirmed does, and whether that check should happen on its
own. It should: the check is the same one the button runs, and coming back to the tab, or landing on
this state, is exactly the moment the answer may have changed.

Three things on main shape how the check runs:

- A failed click today goes through the resend state (`AuthStatusIndicator.tsx:306`,
  `setResend({ state: 'error', ... })`). That turns "Sent, check your inbox" back into "Resend email",
  and no later check clears it; only another Resend email does.
- Each I've confirmed calls `confirmEmailVerified` itself: the banner at `AuthStatusIndicator.tsx:304`
  and each card at `SignInEmptyState.tsx:72`. The banner's button is disabled while its own check runs
  (`:350`). An automatic check that disabled it would drop the click of a person who comes back by
  clicking it.
- `authedFetch` drops a verify-email 403 that answered a token since replaced
  (`src/lib/authedFetch.ts:291-293`): it neither marks the account nor sends the request again. On
  main only a click replaces the token, so only a request out across a click can meet that (by
  reading, not run). A check that starts on a return starts in the same task in which the query
  client resumes its paused retries, and meets it whenever the API answers more slowly than the check
  (Risks).

## Non-goals

- No polling. A timer would call Identity Toolkit for a tab nobody is looking at.
- No message from the `/auth/action` page to other tabs. A link opened in another browser or a mail
  app's own browser would never deliver it, and coming back to the tab covers those too.
- No change to the text I've confirmed shows ("Not confirmed yet. Open the link in the email, then try
  again." and "Could not check the account: <message>"), or to what the card's button
  (`VerifyEmailEmptyState`) shows, beyond when the card's failure line goes. Both buttons start their
  check through the shared one below. The banner is mounted on every app route (`AppShell.tsx:69`), so
  its automatic check lifts cards, page bodies and the banner, on Admin and Settings too.
- Not the email links' domain: the Lovable host already redirects `/auth/action` to
  `stocks.insightscollective.org` with the query intact (checked 2026-10-11).
- Not Google sign-in, which arrives verified.
- Not the lint backlog. `npm run lint` is not gated (`ci.yml:14-23`), and the two components this
  changes already carry five `react-refresh/only-export-components` errors for their exported
  helpers. The new exports add three entries of that rule, because this spec places them beside the
  banner. `src/lib/authGate.ts`, `src/lib/authedFetch.ts` and the three test files gain none, and no
  entry of any other rule appears (`npx eslint` on the seven touched files: 8 errors on r5's
  prototype and 5 on main, all of that rule).
- Not main's red E2E job. TeneikaAskew/solyra#274 holds its seven failures (the shell's nav count,
  top-nav tabs and document title, and Lovable's Insights specs); none touches the auth gate. The CI
  item says how this PR's e2e job is read while they stand.
- Not the hidden tab's empty cards. While the page reports hidden, a card whose query's retry is
  paused renders its empty or unavailable copy ("Cloud SQL not connected", "No signals yet"), because
  `WidgetState` reads such a query as neither loading nor failed. That is on main and this change does
  not cause it (TeneikaAskew/solyra#273); the twelfth to fourteenth tests' `while-hidden` images show
  it.
- Not the account-switch leftovers. The expired-session flag survives a switch
  (TeneikaAskew/solyra#270), and a switched-in account inherits client state (#234). One more of
  that kind is on main too: the confirmed record holds one uid (`emailConfirmedFor`,
  `src/lib/authGate.ts:103-109`), so a check for account A that answers after the switch to B, and
  after B confirmed, replaces B's record, and B's banner returns over loaded data until B's next
  check (the pre-review's probe E3b; run again on r5's prototype:
  `banner 1 pre-market 1 verifyState 0`). Main reaches it with a click held across the switch; this
  change adds a return as one more way to start such a check, and changes nothing else about it. The
  fix (a confirmed record keyed per uid) belongs with #270.

## Approaches considered

1. Poll every few seconds while the banner shows. Rejected, as above.
2. Broadcast from `/auth/action` once the code applies. Rejected: it reaches only tabs of the same
   browser profile.
3. Run the existing check when the tab regains focus or becomes visible, at most once per 10
   seconds, through one shared in-flight check, and once when the banner shows for an address
   already read verified. Chosen: it reuses `confirmEmailVerified` unchanged, so its account-switch
   safeguards hold.
4. Also run the check when the banner shows for an unverified address. Rejected: that address was
   just read, by sign-in (`signInWithPassword`, then `accounts:lookup`) or by Firebase's start-up
   reload, so the check would learn nothing, and it would spend the 10 s interval, so a person who
   signs up, confirms in another tab and comes back within 10 s would get no check. One case where
   the address was not just read: when the start-up reload fails with `network-request-failed`,
   Firebase keeps the persisted profile unread, and the banner shows from that stale `false` until a
   return or a click, as on main.
5. For the race with the paused retries, cancel every query before the check's
   `invalidateQueries()` (`cancelQueries()` in `confirmEmailVerified`). Rejected, not run: it changes
   `confirmEmailVerified`, which approach 3 keeps unchanged; it cancels every in-flight request, not
   only the stale ones; and it leaves a request made outside the query client with the dropped 403.
   The resend in `authedFetch` covers every caller, the same way the 401 retry beside it does.

Chosen on 2026-10-11 at the owner's request ("If they click it is it check? If so it should be
automatically done too right?").

## Design

`src/components/shared/AuthStatusIndicator.tsx`:

- A pure, exported `autoConfirmDue({ shown, visible, running, lastAutoAt, now }): boolean` and
  `AUTO_CONFIRM_MIN_INTERVAL_MS = 10_000`. True only when the banner is shown, the page is visible, no
  check is running, and either no automatic check has run (`lastAutoAt` null) or the last one started
  at least 10 000 ms before `now`. Focus and `visibilitychange` usually fire together when a person
  switches back, and the interval keeps that, or rapid tab switching, to one call.
- A module-level, exported `checkEmailConfirmed(uid, queryClient)` wraps
  `confirmEmailVerified(uid, refresh, queryClient)` with one in-flight promise per uid. The query
  client is a parameter because a module-level function cannot call `useQueryClient`. The automatic
  check, the banner's button and every card's button call it, and a call made while one is in flight
  joins it and receives the same result. The entry is removed when the check settles, failed or not,
  so the next call reaches the network again. An exported `isConfirmCheckRunning(uid)` reads that
  map, and `running` is read from it rather than from React state. A focus and a `visibilitychange`
  in one task, or a focus and a click, therefore start one check. A click that joins an automatic
  check shows that check's outcome as a click does ("Not confirmed yet"). The `refresh` it passes is
  `refreshEmailVerified` plus one step: when the answer is this uid's account, verified or not, it
  calls `recordAccountRead(uid)` (below). A failed refresh, or an answer for another account after a
  switch, records nothing. `confirmEmailVerified` itself is unchanged.
- In `EmailVerificationBannerFor`, `profileVerified = confirmed ? true : emailVerified` and
  `shown = showVerificationBanner(profileVerified, verificationRequired)`. An effect declared before
  the early return (hooks cannot follow it), with `[shown, profileVerified, uid, queryClient]` as its
  dependencies, does nothing unless `shown`. While the banner shows it:
  - subscribes to `window` `focus` and `document` `visibilitychange`, and its cleanup removes both,
    so once the banner hides no return makes a request. "Shows" is `showVerificationBanner`'s answer
    with the confirmed record, never Firebase's `emailVerified` alone, which stays `false` after a
    check finds the address verified (`reload()` notifies `onAuthStateChanged` only when the uid
    changes). It covers both conditions: an email Firebase reports unverified, and one Firebase
    reports verified whose gated calls still answer the verify-email 403. In the second the cached
    ID token carries the old claim: `authedFetch` marks that 403 whatever the profile says
    (`src/lib/authedFetch.ts:286-293` on main), and forces a new token only after a 401 (`:267`) or
    when reading the cached one fails (`:228-232`), so until the cached token expires its requests
    carry the old claim and the check's forced token refresh is what lifts the banner;
  - runs the automatic check once, through `autoConfirmDue`, when `profileVerified` is true: at once
    when the page is visible, or else on the next focus or `visibilitychange` that finds it visible.
    The banner then shows only because of a stale token, so the check's forced refresh is what lifts
    it, and a reload reaches this state with no event to start one. Approach 4 says why an
    unverified address gets no check on show.
  On each event the effect reads `document.visibilityState` at that moment, so leaving the tab never
  spends the interval. The check on show and each event go through `autoConfirmDue`, so a reload
  into a hidden tab checks once the tab shows (the twelfth test). When it allows, the effect records
  the start in a ref, clears the banner's failure line and its "Not confirmed yet", and calls
  `checkEmailConfirmed(uid, queryClient)` synchronously, so a second event in the same task finds it
  in flight. Then:
  - `'verified'`: nothing further. The confirmed record hides the banner and every query refetches,
    exactly as when the button succeeds.
  - `'unverified'`: nothing shown. An automatic check that finds the address still unconfirmed has
    nothing to tell the person; a click's own check still says "Not confirmed yet".
  - `'failed'`: its own line, "Could not check the account: <message>" (Rule 4), held apart from the
    resend state so "Sent, check your inbox" survives it, and cleared when the next check starts.
  A result arriving after the account changed sets no state on the new banner (a new instance under a
  new key); `confirmEmailVerified`'s writes land on the old uid only, as today.
- Which line shows. The banner reports only its latest check: every check it starts or joins,
  automatic or clicked, clears both its lines when it starts, so an earlier "Not confirmed yet" never
  stands beside a later failure. A Dashboard card answers its own click, and keeps that answer as
  long as nothing has made it stale:
  - Its "Not confirmed yet" stays. No later check can contradict it while the card shows: one that
    reads the account verified lifts the card with the verify-email state, one that reads it
    unverified agrees, and one that fails read nothing.
  - Its "Could not check the account" goes once a later check, from any surface, reads the account,
    because the account has then been read since the failure. Until then it stays: a later check that
    fails too leaves the failure current. The ninth test asserts the first, the fifteenth the second.
- The banner's I've confirmed sends its own `'failed'` result to that same line, not to the resend
  state, and clears both lines when it starts. The text is unchanged; only its element moves.
- The banner's button is disabled only while its own click's check runs. An automatic check never
  disables it, so a click as the tab regains focus joins the running check instead of being dropped.
  The sixth e2e test clicks it while an automatic check's lookup is held, after React has rendered.

`src/lib/authGate.ts`, beside the confirmed record: a per-uid count of the confirm checks that read
the account, `recordAccountRead(uid)`, `getAccountReads(uid)` and `useAccountReads(uid)` (a
`useSyncExternalStore` hook, like the stores around it). Keyed per uid, so one account's reads never
touch another's card.

`src/components/shared/SignInEmptyState.tsx`, `VerifyEmailEmptyState`: its button calls
`checkEmailConfirmed`. It keeps its click's answer together with `getAccountReads(uid)` at the moment
the answer arrived, and renders the failure line only while `useAccountReads(uid)` still equals that
number.

`src/lib/authedFetch.ts`, the verify-email 403 block (`:286-313` as this change leaves it):

- On main, a gated 403 "verify your email to continue" marks the account's flag unless the token it
  answered has since been replaced (`superseded`, from one `getIdToken()` read); a superseded 403 is
  dropped. That 403 says nothing about the current token, but dropping it leaves the caller with an
  error, and when the caller is a query whose last retry the check's `invalidateQueries()` joined,
  nothing refetches it.
- With this change, a superseded 403 is sent once more with the token from that same read, and the
  answer to that request is what the caller receives; a verify-email 403 to it marks the flag, and no
  third request is sent. It is sent again only when the request was made as the account still signed
  in (`sameAccount`), the body can be replayed (`isReplayable`, as for the 401 retry), and the uid
  read after that token read is still the one the request started with, so the request never goes out
  with another account's token (the 401 retry reads the uid after its token the same way, `:274`).
- One token read decides both the resend and the mark. The pre-review ran a first sketch that read
  the token a second time to decide the mark, and it still failed 1 run in 10: when the check
  replaces the token between the two reads, the 403 is neither sent again nor marked. The third unit
  item pins it.
- Nothing else about when `authedFetch` forces a token changes: after a 401 (`:267`), or when reading
  the cached one fails (`:228-232`). The resend forces none; it uses the token the check already
  minted.
- A request whose body cannot be replayed (a stream) is not sent again and is dropped as on main. No
  call site sends one: every `/api` call in `src/` passes a string URL, and a grep for
  `ReadableStream` in `src/` finds only `isReplayable` itself.

`docs/UI-SCREENS.md` SHELL-04 describes this banner. Seven of its statements change with this
change, or are already false where it edits, and each is replaced, not added to; one criterion is
new:

- Shows or does says the banner renders "only" for an account whose `emailVerified === false`. It
  gains the second condition: while the API answers the account's gated calls with the verify-email
  403 after Firebase reports it verified.
- States says the second banner presents the unverified state. It names the verified account the
  API still refuses beside it.
- Needs says the banner "needs no API at all". Its I've confirmed check, clicked or automatic, calls
  Identity Toolkit `accounts:lookup` and the `securetoken` token refresh (`refreshEmailVerified`,
  `src/lib/firebaseImpl.ts:134-141`), and Resend email calls `accounts:sendOobCode`. Needs names the
  three.
- The criterion on rendering before `/api/me` resolves quotes the hide condition as
  `emailVerified !== false || confirmed` at `AuthStatusIndicator.tsx:221`, and says it reads "only
  `useUser()`'s own `emailVerified`". It quotes the condition as this change writes it,
  `showVerificationBanner(profileVerified, verificationRequired)` with
  `profileVerified = confirmed ? true : emailVerified`, at its lines, and names what it reads:
  `useUser()`'s `emailVerified`, `useEmailConfirmed(uid)` and `useVerificationRequired(uid)`, none of
  which waits on the `/api/me` query.
- The criterion for an account whose `emailVerified` is false gains that the banner also runs the
  I've confirmed check when the tab regains focus or becomes visible, at most once per 10 s. Its
  quoted text becomes the banner's own ("Confirm your email address to load your data."), and its
  citation (`AuthStatusIndicator.tsx:240-253`) moves to the banner's lines as this change leaves
  them.
- A new criterion: given an account Firebase reports verified whose gated calls still answer the
  verify-email 403, the banner runs the check once with no click, at once when it shows on a visible
  page or else when the page next becomes visible, at most once per 10 s, and a gated request whose
  verify-email 403 answers the token that check replaced is sent once more with the new token.
- Tests says no test targets the banner by name or test id; `tests/shared/auth-gate.spec.ts` does on
  main, and this change adds fifteen more. Tests names it,
  `src/components/shared/AuthStatusIndicator.test.ts` and `src/lib/authedFetch.test.ts`.
- The test ids gain `verification-check-error`.

The tests:

- Every e2e test saves an image of its starting state and of each state it asserts on the page into
  its output directory (`testInfo.outputPath`), since `npm run e2e` runs with Playwright's screenshot
  option off and the e2e workflow uploads `test-results/` in its `playwright-report` artifact
  (AGENTS.md, Browser proof). The item lists all 50 by name: 35 for the first twelve tests, nine for
  the thirteenth's three runs, three each for the fourteenth and the fifteenth.
- Two tests move the page clock with `page.clock.setFixedTime(Date.now() + 10_000)` after the page has
  loaded: the eighth and the ninth. It fixes the page's `Date.now` and keeps timers running, so the
  interval reads as elapsed while Firebase's and the query client's timers behave as before. The
  test's `Date.now()` is never earlier than the page's at the last automatic check, so the page sees
  at least 10 000 ms, which `autoConfirmDue` allows.
- The tenth test waits for the click's check to finish before it returns: after `'verified'` that
  check stays in flight until `invalidateQueries()` has settled every refetch (`confirmEmailVerified`
  awaits it, `AuthStatusIndicator.tsx:223`), and a running check blocks a new one, so a leaked
  listener would make no request either. It counts the page's `/api` requests in flight
  (`request`, `requestfinished` and `requestfailed` events) and waits until none has been in flight
  for 1500 ms, longer than the query client's 1000 ms first retry delay (`App.tsx:36`, `retry: 1`).
- The thirteenth and fourteenth tests inject latency in the page, under `authedFetch` and the
  Firebase SDK: a response reaches the app late while Playwright sees it on time. So their wait
  while the page reports hidden counts the latency in: no `/api` request for the latency plus
  1500 ms, by which time every first answer has reached the app and every retry has stopped to wait
  for the page. A fixed 1500 ms wait was too short at 1000 ms: the r4 prototype passed both of its
  1000 ms runs, by reading because some first answers had not reached the app when the page showed,
  so their retries were never paused.
- The fourteenth runs at 1000 ms and 100 ms, where the API is the slower of the two every time; at
  300 ms and 250 ms the check and the API answer within one round trip of each other (Risks). It
  also holds the gated answers until the page has reported hidden, as for a person who leaves before
  the cards load, so its starting-state screenshot cannot let them land while the page is visible.
  An earlier cut, at 300 ms and 250 ms and without the hold, failed on the r4 prototype in only 5 of
  10 runs.
- The thirteenth and fourteenth tests dispatch a `visibilitychange` that bubbles to `window`, as a
  browser fires it, because the query client resumes paused retries only on its own `window` listener.

The OpenAPI sync. stocks FEAT-DEPLOY-001 (the spec merged in stocks#1381; the implementation is
TeneikaAskew/stocks#1384, open, draft) changes the `/api/earnings/health/ping` description in
`platform/api/openapi.json` on its branch `feature/feat-deploy-001-retired-service-leftovers`. This
PR carries the matching sync,
`STOCKS_OPENAPI_REF=feature/feat-deploy-001-retired-service-leftovers npm run contract:sync`. The
result is a one-description diff: one line of `tests/fixtures/stocks-openapi.json` and three comment
lines of `src/types/stocksOpenApi.gen.d.ts` (`6 +++---` and `2 +-`, measured on `5fbdbb9`). Merge
order: this PR is open, with the sync, before stocks#1384 merges; stocks#1384 merges; this PR's CI
re-runs and it merges. Between the sync commit and that merge, two things fail on purpose. The
`types · unit · build` job fails at `contract:check`. `node scripts/docs-audit.mjs` reports one
finding main does not (P1, `class-a`, `tests/fixtures/stocks-openapi.json`, "contract:check is red";
measured on `5fbdbb9` with a fresh issues snapshot: main 28 findings, r5's prototype the same 28,
and the prototype with the sync 29). The close-out's docs audit therefore runs after stocks#1384
merges.

Capacity: n/a. While the banner shows on a visible page, at most one automatic check per 10 s of
returns, plus one when it shows for an address already read verified. Each check is one
`accounts:lookup` and one `securetoken` refresh while the cached ID token is unexpired, and two
`securetoken` refreshes once it has expired, because `reload()` refreshes an expired token before
`getIdToken(true)` (`src/lib/firebaseImpl.ts:134-141`). Measured on r5's prototype on `5fbdbb9`: one
lookup and one refresh per check with a fresh token (the second test pins it); one lookup and two
refreshes an hour past expiry, on `/dashboard` and on `/help`. On `/dashboard` the dashboard's own
refetches after such a return then carried the check's fresh token, where main, which has no check,
made 13 refreshes for them in the same probe (10 on `da584ca`). The resend sends a gated request at
most twice, and only when its first answer was the verify-email 403 to a replaced token (Risks gives
the count measured on the Dashboard).

## Risks

- A person who never leaves the tab, with the address unverified, sees no change until they click,
  as today. The verified-but-403 state needs no click: the check on show covers it once the page is
  visible.
- The e2e tests dispatch the focus and visibility events themselves; real focus in a headless browser
  is not observable. The unit tests pin the decision, the shared check and the resend, and the e2e
  tests pin what each outcome shows and how many lookups follow.
- The effect reads `running` from the shared check. It matters only for a return while a click's
  check runs: that return joins the check either way, and `running` keeps it from spending the 10 s
  interval, so the next return still checks. The first unit item pins how `autoConfirmDue` treats
  `running`, and the seventh e2e test pins the effect's wiring by the lookup count of that next
  return.
- The fourth, fifth and tenth e2e tests guard against extra checks, and main makes none, so they
  cannot fail there. The RED item names the broken versions each one fails against instead.
- A return within 10 s of the previous automatic check, the check on show included, starts none, so a
  person who confirms and comes back that quickly sees the banner until they click I've confirmed or
  come back again. The ninth and eighth tests show the next return after the interval checks.
- The query client listens for `visibilitychange` on `window` (`focusManager` in
  `@tanstack/query-core`), and the tests' `comeBack` events do not bubble, so in every test but the
  twelfth to fourteenth it does not react to a return. In a browser it does, and the order matters:
  the banner's listener on `document` starts the check first, then the query client resumes, in the
  same task, the retries it paused while the page was hidden, with the cached token. Whenever the
  API answers more slowly than the check (one lookup and one refresh), the retry's 403 answers a
  replaced token. How often a deployed API is the slower of the two was not measured here. On the r4
  prototype, which drops that 403, each card the race caught read "Couldn't load this data" with no
  banner: over ten repetitions, the thirteenth test failed 10 times at 1000 ms and 100 ms, 10 at
  150 ms and 100 ms and 7 at 300 ms and 250 ms, and the fourteenth 10 times; this change without the
  resend failed 10, 7, 8 and 10 times. When the API answers faster than the check, the 403 answers
  the current token, is marked, and the check's refetch loads the card (the pre-review's run at
  100 ms and 300 ms). The resend closes the first order whatever the latency; the thirteenth and
  fourteenth tests pin three latencies and the sign-up flow.
- The other tests under latency: the first to twelfth and the fifteenth tests were run on r5's
  prototype with the latency injected into `signInUnverified`, at 300 ms and 250 ms (twice) and at
  1000 ms and 100 ms (once), and every one passed each time; the fourth signs in through its own
  mocks and ran without latency. None of their criteria holds only because the mocks answer at once.
- The tenth test's wait reads the network, not the check itself. A refetch retried more than 1500 ms
  after the previous request would let it return early, while the check still runs; the test would
  then pass against a leaked listener rather than fail on a correct one, and the RED run against the
  two broken versions is what shows the wait is long enough.
- The resend adds at most one request per gated request that was out with the old token when the
  check replaced it: in the thirteenth test's 300 ms run on r5's prototype, each of the twelve gated
  paths the page requested with the old token after it showed was requested exactly once more, with
  the new token, whether by the resend or, for a 403 that arrived before the check replaced the
  token, by the check's refetch. No path was requested twice with the new token.
- If stocks#1384 stalls, this PR waits on it, since its vendored copy would be ahead of stocks main.
- Main's e2e job fails seven tests this change does not touch (#274). The CI item accepts those seven
  and no other, so a new failure in any other file still blocks the PR; if #274 closes first, the
  job must be green.
