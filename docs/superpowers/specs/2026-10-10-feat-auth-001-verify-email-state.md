---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-AUTH-001]
issues: [234]
canvases: []
done_when:
  - "src/lib/authedFetch.test.ts asserts that a gated 403 whose detail is 'verify your email to continue', on a request made while uid A is signed in, marks verification required for uid A and clears the auth-blocked flag; that a gated 403 with any other detail does neither; that a later successful gated response for uid A clears it while a late success for uid A after uid B was marked leaves B's flag in place; that a verification 403, a 401 or a success made as uid A that returns after the signed-in uid became B leaves the auth-blocked flag as it was; that a verification 403 answered to a token that has since been replaced for the same uid does not mark the flag; that the caller can still read the 403 response body; and that /api/me/preferences is gated (its verification 403 is tracked and its 401 fires onUnauthorized) while /api/me stays open"
  - "src/lib/authGate.test.ts asserts that verification marked required for uid A reads as not required for uid B and for no uid, that clearing for uid B leaves uid A's flag, and that clearing for uid A resets it; and that the email-confirmed record marked for uid A reads as not confirmed for uid B and for no uid"
  - "src/components/shared/WidgetState.test.ts asserts that widgetErrorKind returns 'auth' for a 401 error, 'verify' for both Error('verify your email to continue') and Error('403') when verification is required, and 'error' for those two errors when it is not"
  - "src/components/shared/SignInEmptyState.test.ts asserts that dataGateView returns 'verify' for a signed-in account with the verification flag set, 'children' when that account's session is also blocked, 'sign-in' for a blocked signed-out session that has finished loading, and 'children' otherwise"
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that confirmEmailVerified for uid A returns 'verified', clears uid A's verification flag, records uid A as confirmed and invalidates the query cache when the refresh reports uid A verified; returns 'unverified' and changes nothing when it reports the account unverified or reports another uid verified; returns 'failed' with the error's message and changes nothing when the refresh rejects; and leaves uid B's flag in place when B is marked while A's refresh is pending; and that showVerificationBanner is true for a profile reading unverified, true for one reading verified while the verification flag is set, and false for one reading verified without it and for no account"
  - "tests/shared/auth-gate.spec.ts signs in an email account whose accounts:lookup reports emailVerified false and whose gated calls answer 403 'verify your email to continue', asserts that a Dashboard card and the Signals page show 'Confirm your email to load data' with the banner visible, then makes accounts:lookup report verified and the API accept only the ID token that I've confirmed mints, clicks the banner's I've confirmed, and asserts the Dashboard card renders its data without a page reload; a second test first clicks the Dashboard card's own I've confirmed while the account still reads unverified and asserts 'Not confirmed yet', then does the same as the first through that button and also asserts the banner is gone"
  - "Each new test is shown failing against main when the PR opens, and the solyra CI checks and e2e jobs are green on the PR head"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Tell an unverified account why its data does not load

## Problem

Since stocks#1360 (merged and verified live 2026-10-10) the API refuses every gated `/api/*`
request from a Firebase account whose email is not verified, with
`403 {"detail": "verify your email to continue"}`. The site does not recognise that answer:

- `src/lib/authedFetch.ts` tracks only 401 (`markAuthBlocked`), so nothing records that the
  account needs to verify.
- Dashboard cards go through `WidgetState`, which sends a 401 to `SignInEmptyState` and every
  other error to `WidgetError`: "Couldn't load this data" and a Retry that cannot succeed. The
  message varies by hook; `useMarketData` throws the bare detail, with no status in it.
- Every other data page wraps its body in `DataGate`, which only acts when the user is signed
  out, so each page's own error branch shows instead. `/signals` turns the 403 into
  "Failed to fetch signals" and then suggests running the generation pipeline.
- `EmailVerificationBanner` already shows for an unverified email account and offers
  "Resend email" and "I've confirmed". When "I've confirmed" succeeds, failed queries keep their
  error until each is retried by hand.

stocks#1360's spec left this side out on purpose ("Making the banner block the app is a solyra
change of its own"). This is that change.

## Non-goals

- No change to the API or its 403. The detail string is the contract this change reads.
- Not the Google sign-in path. Google accounts arrive verified and never see this state.
- Not `DataGate`'s signed-out behaviour, which stays as it is.
- Not Admin or Settings, which do not use `DataGate`. An unverified account resolves to no
  identity on `/api/me` (verified live 2026-10-10), so Admin shows its existing not-authorized view;
  Settings keeps its own sync errors. On both, the banner at the top states the cause: it shows
  while the profile reads unverified or the API has answered the verification 403 (below).
- Not the custom domain. Serving the site from `stocks.insightscollective.org` is FEAT-UI-001's
  own spec (solyra#238).
- Not account switches without a reload. Most of the app's client state is account-blind: uid-less
  query keys, appearance values in uid-less localStorage keys, a save left in flight, and
  `AuthGate` unmounting on public routes so it cannot see a switch made meanwhile. Isolating all of
  that is its own change, tracked in solyra#234; four review rounds on this spec each found
  another piece of it, which is why it is out of scope here. This change adds nothing to that
  problem: its own state (the verification flag, the confirmed record) is keyed by uid.
- Not the site traceability matrix. A new AUTH state row and its ticks go on a `docs/` branch in
  stocks after this merges.

## Approaches considered

1. Match "403" in each error's message. Rejected: some hooks throw only the detail, admin-only
   endpoints and the allow-list also answer 403, and an admin-denied user would be told to verify
   an address they already verified.
2. Read `emailVerified` from the Firebase user in each surface. Rejected: the API decides from the
   token's claim, which lags the profile until the token refreshes; the UI would disagree with the
   server in exactly the window this change is about.
3. Let the fetch layer recognise the API's own answer, the 403 with that detail on a gated path,
   record it for the signed-in uid, and have the two shared surfaces (`WidgetState` for cards,
   `DataGate` for page bodies) read it. Chosen: one place decides, from what the server said, the
   same way 401 is handled today, and two components reach every data page.

Chosen on 2026-10-10 under the owner's instruction to make this change after stocks#1360.

## Design

`src/lib/authGate.ts`: beside the `blocked` flag, a verification flag keyed by uid:
`markVerificationRequired(uid)`, `clearVerificationRequired(uid)` (clears only a flag marked for
that same uid), `isVerificationRequired(uid)` (true only when the flag was marked for that same
uid) and `useVerificationRequired(uid)`, with the existing subscribe pattern. Keyed for the same reason the verification-email store is: an
account switch in another tab does not reload this one, and most query keys omit the uid.

`src/lib/authedFetch.ts`: in firebase mode, on a gated 403 it reads the detail from
`resp.clone()` (the caller's body stays unread) and, when the detail is exactly
`verify your email to continue`, calls `markVerificationRequired(uidAtStart)` and
`clearAuthBlocked()`: that 403 proves the token was accepted, so a "session expired" left by a
previous account must not linger beside it. A successful gated response clears `blocked` and
`clearVerificationRequired(uidAtStart)`: scoped to the request's own uid, so a late success from
account A cannot erase the flag account B's 403 just set. A verification 403 also marks nothing
when the token it was sent with is no longer the account's current token (`getIdToken()` returns
a different one): I've confirmed mints a fresh token carrying the verified claim, and an older
request answered after it would otherwise hide data that now loads. `blocked` is not keyed by uid, so a
response only changes it (a 401 marking it, a success or the verification 403 clearing it) while
`getCurrentUid()` still equals `uidAtStart` when the response returns; a late answer to account A
cannot clear or set the state account B's own responses established. A body that is not JSON leaves them
alone.

The open-path list stops treating everything under `/api/me` as open. It becomes
`OPEN_EXACT = ['/api/me']` plus `OPEN_PREFIXES = ['/api/health', '/api/config/firebase',
'/api/waitlist']`, the same split as stocks' `_OPEN_API_EXACT` and `_OPEN_API_PREFIXES` in
`platform/api/auth.py`, whose comment says the two must stay in sync. `/api/me/preferences` and
`/api/me/profile` are gated on the server; until now the site classified them as open, so their
401 never reported "signed out" and their 403 would never be tracked. `isIdentityPath` is
unchanged.

`src/components/shared/WidgetState.tsx`: a pure helper
`widgetErrorKind(error, verificationRequired): 'auth' | 'verify' | 'error'`. A 401 stays `'auth'`;
any other error while verification is required is `'verify'`, whatever text the hook threw;
otherwise `'error'`. `WidgetState` renders `VerifyEmailEmptyState` for `'verify'`, reading the
flag for `useUser().uid`.

`src/components/shared/SignInEmptyState.tsx`: `DataGate` renders `VerifyEmailEmptyState` in place
of its children while the signed-in uid's verification is required. That covers Live, Charts,
Options Flow, Signals, Insights, Catalysts, Playbook, Reports and Journal, whose own error branches
would otherwise speak first. The choice is a pure, exported `dataGateView({ blocked, isLoading,
isSignedIn, verificationRequired }): 'sign-in' | 'verify' | 'children'`: the existing signed-out
check first, then the verify state only while the session is not blocked. A 401 takes precedence,
as it does in `WidgetState`: an expired session is not a verification problem, and telling that
user to confirm an email would send them the wrong way.

`VerifyEmailEmptyState({ compact })`, beside `SignInEmptyState`: a mail icon, "Confirm your email
to load data", and delivery-neutral help ("Your email address isn't confirmed yet. Use the banner
at the top of the page to send a link, then confirm here.") with one action, I've confirmed, that
runs `confirmEmailVerified`. While the check runs the button reads "Checking…" and is disabled;
an `'unverified'` result shows "Not confirmed yet. Open the link in the email, then try again.",
and a `'failed'` one shows "Could not check the account: <message>". No Retry: a plain refetch
reuses the stale token and gets the same 403. No values are rendered (Rule 4).

`src/components/shared/AuthStatusIndicator.tsx`: a pure, exported
`confirmEmailVerified(uid, refresh, queryClient): Promise<ConfirmResult>`, where `uid` is the
account that clicked, read from `useUser()` at the click, and `ConfirmResult` is
`{ outcome: 'verified' } | { outcome: 'unverified' } | { outcome: 'failed'; message }`. It calls
`refresh` (`refreshEmailVerified`, which forces a fresh ID token). That now returns
`{ uid, emailVerified }` for the user it refreshed, captured before its awaits, instead of reading
`currentUser` after them, which another tab can have switched in the meantime. Only a result for
`uid` that reads verified counts: then it calls `clearVerificationRequired(uid)` and
`markEmailConfirmed(uid)` and `queryClient.invalidateQueries()`, and returns `'verified'`. A result for another uid, or one that
reads unverified, returns `'unverified'` and changes nothing; a rejected refresh returns
`'failed'` with the error's message rather than throwing, so neither surface can leave the button
looking inert. Scoped like the fetch layer's clear: a confirmation that resolves after the account
changed cannot erase the flag the new account's 403 set. Clearing first matters: while
`DataGate` shows the empty state, the page's queries are unmounted, so invalidation alone would
refetch nothing and the state would never lift. If the server still answers 403 the next response
marks it again. `EmailVerificationBanner` uses the same helper, its copy becomes "Confirm your
email address to load your data.", and its comment stops calling it non-blocking. It shows when a
pure, exported `showVerificationBanner(emailVerified, verificationRequired)` is true: while the
profile reads unverified, as today, or while the verification flag is set for the signed-in uid.
The second case is the lag this change exists for: the profile can read verified while the cached
token still carries the old claim and the API still answers 403, and on Admin and Settings the
banner is then the only place that says so. The banner reads "confirmed" from a shared,
uid-keyed record in `src/lib/authGate.ts` (`markEmailConfirmed`, `isEmailConfirmed`,
`useEmailConfirmed`) rather than its own local state: Firebase fires no auth event when a reload
and token refresh flip `emailVerified`, so a confirmation through a card's button would otherwise
leave the banner asking for an address the API already accepts.

Tests: listed in done_when. The Playwright test reuses the identity-toolkit mocking already in
`tests/shared/auth-gate.spec.ts`, with `emailVerified: false` on `accounts:lookup` until the
confirmation step. Its mock API accepts only the token the confirm mints, as the real API decides
from the token's claim: accepting the old token too let a card's retry succeed before the click,
clear the flag, and pull every other card's confirm button out of the page (forced with a 5 s wait
on 2026-10-10: it failed every time, and passes with the token check).

Capacity: n/a. The site runs no workload; the change reads one small JSON body on a 403.

## Risks

- The API rewords the detail. The flag stays unset and surfaces show today's errors, not a broken
  page. The exact string is pinned by stocks' `tests/api/test_platform_auth.py`, and this change's
  unit test names it.
- A non-verification error while the flag is set reads as "confirm your email". An unverified
  account cannot load any gated data, so confirming is still the first step, and the flag clears
  on the first successful response.
- Reading the clone delays the caller by one body read on a 403 only; 200 responses are untouched.
- `/api/me/*` becoming gated changes one behaviour: a 401 there now reports "signed out", as the
  server's own classification always implied. A signed-in user with a valid token never gets one.
