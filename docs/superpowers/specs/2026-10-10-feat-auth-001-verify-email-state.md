---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-AUTH-001]
issues: []
canvases: []
done_when:
  - "src/lib/authedFetch.test.ts asserts that a gated 403 whose detail is 'verify your email to continue', on a request made while uid A is signed in, marks verification required for uid A and clears the auth-blocked flag; that a gated 403 with any other detail does neither; that a later successful gated response for uid A clears it while a late success for uid A after uid B was marked leaves B's flag in place; that the caller can still read the 403 response body; and that /api/me/preferences is gated (its verification 403 is tracked and its 401 fires onUnauthorized) while /api/me stays open"
  - "src/lib/authGate.test.ts asserts that verification marked required for uid A reads as not required for uid B and for no uid, that clearing for uid B leaves uid A's flag, and that clearing for uid A resets it"
  - "src/components/auth/AuthGate.test.ts asserts that isAccountChange is true from uid A to uid B and from uid A to no uid, and false from no uid to uid A and from uid A to uid A; and that resetAccountQueries, on a QueryClient holding account A's rows under a mounted observer while account B's ['me', uid] query is in flight, drops A's rows from that observer and lets B's identity query resolve with B's answer"
  - "src/components/shared/WidgetState.test.ts asserts that widgetErrorKind returns 'auth' for a 401 error, 'verify' for both Error('verify your email to continue') and Error('403') when verification is required, and 'error' for those two errors when it is not"
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that confirmEmailVerified for uid A, when the refresh reports verified, clears uid A's verification flag and invalidates the query cache; when it reports unverified, leaves both untouched; and when uid B's flag is marked while A's refresh is pending, A's verified result leaves B's flag in place"
  - "tests/shared/auth-gate.spec.ts signs in an email account whose accounts:lookup reports emailVerified false and whose gated calls answer 403 'verify your email to continue', asserts that a Dashboard card and the Signals page show 'Confirm your email to load data' with the banner visible, then makes accounts:lookup report verified and the gated calls answer 200, clicks the banner's I've confirmed, and asserts the Dashboard card renders its data without a page reload; a second test does the same through the Dashboard card's own I've confirmed instead of the banner's"
  - "src/lib/apiTargets.test.ts asserts isStaticFrontendHost is true for stocks.insightscollective.org, solyra-stocks.lovable.app and a lovableproject.com host, and false for insightscollective.org, evil-stocks.insightscollective.org, stocks.insightscollective.org.evil.com and localhost"
  - "Each new test is shown failing against main when the PR opens, and the solyra CI checks and e2e jobs are green on the PR head"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Tell an unverified account why its data does not load, and serve sign-in from stocks.insightscollective.org

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

The same day the owner connected `stocks.insightscollective.org` to this Lovable project (DNS at
Squarespace resolves) and added it to Firebase Auth's authorized domains so Google sign-in can
start there. Lovable serves the bundle without an `/api` route, but `src/lib/apiTargets.ts` only
recognises `*.lovable.app` and `*.lovableproject.com` as such static hosts. On the new address
the site would send `/api/*` to Lovable, get `index.html` back, and neither sign in nor load data.

## Non-goals

- No change to the API or its 403. The detail string is the contract this change reads.
- Not the Google sign-in path. Google accounts arrive verified and never see this state.
- Not `DataGate`'s signed-out behaviour, which stays as it is.
- Not Admin or Settings, which do not use `DataGate`. An unverified account resolves to no
  identity on `/api/me` (verified live 2026-10-10), so Admin shows its existing not-authorized view;
  Settings keeps its own sync errors. On both, the banner at the top states the cause.
- Not the API side of the new address. The stocks API's CORS pattern admitting
  `https://stocks.insightscollective.org` is stocks' own change, and the sign-in domain
  (`auth.stocks.insightscollective.org`) is project configuration recorded in the docs.
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
account A cannot erase the flag account B's 403 just set. A body that is not JSON leaves them
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
of its children while the signed-in uid's verification is required, after its existing signed-out
check. That covers Live, Charts, Options Flow, Signals, Insights, Catalysts, Playbook, Reports and
Journal, whose own error branches would otherwise speak first.

`VerifyEmailEmptyState({ compact })`, beside `SignInEmptyState`: a mail icon, "Confirm your email
to load data", and delivery-neutral help ("Your email address isn't confirmed yet. Use the banner
at the top of the page to send a link, then confirm here.") with one action, I've confirmed, that
runs `confirmEmailVerified`. No Retry: a plain refetch reuses the stale token and gets the same
403. No values are rendered (Rule 4).

`src/components/shared/AuthStatusIndicator.tsx`: a pure, exported
`confirmEmailVerified(uid, refresh, queryClient): Promise<boolean>`, where `uid` is the account
that clicked, read from `useUser()` at the click. It calls `refresh` (`refreshEmailVerified`,
which forces a fresh ID token) and, when that reports verified, calls
`clearVerificationRequired(uid)` and `queryClient.invalidateQueries()`. Scoped like the fetch
layer's clear: a confirmation that resolves after the account changed cannot erase the flag the
new account's 403 set. Clearing first matters: while
`DataGate` shows the empty state, the page's queries are unmounted, so invalidation alone would
refetch nothing and the state would never lift. If the server still answers 403 the next response
marks it again. `EmailVerificationBanner` uses the same helper, its copy becomes "Confirm your
email address to load your data.", and its comment stops calling it non-blocking.

`src/components/auth/AuthGate.tsx`: when the signed-in uid changes away from a previous account
(A to B, or A to signed out), it calls an exported `resetAccountQueries(queryClient)`, which runs
`queryClient.resetQueries()`. Most query keys omit the uid, so without this an account switched in
from another tab is served the previous account's cached results, journal rows included, with no
request made and so no 403 to set the flag. A reset returns every query to its initial state,
which drops A's results from the cache and from any mounted view, and refetches the active ones
under B's token. It is not `clear()`, which `SignOutButton` uses: by the time this effect runs,
B's `['me', uid]` query has already started, and `clear()` destroys it in flight, so its answer is
discarded and the gate stays on its spinner. Both were run on 2026-10-10 against
`@tanstack/query-core` 5.102.8: after `clear()` the in-flight observer was still
`pending/fetching` once the answer arrived; after `resetQueries()` it reached `success`, and a
mounted observer holding A's rows went to no data, then B's. The decision is a pure, exported
`isAccountChange(prev, next)`: true when `prev` is a uid and `next` differs from it.

`src/lib/apiTargets.ts`: a second list, `STATIC_FRONTEND_HOSTS = ['stocks.insightscollective.org']`,
matched exactly, beside the existing suffix list; `isStaticFrontendHost` returns true for either.
Exact, not a suffix: `endsWith('stocks.insightscollective.org')` would also match
`evil-stocks.insightscollective.org`, and the apex serves a different site. The header comment's
"two places need the new origin" note names this host and its stocks counterpart.

Tests: listed in done_when. The Playwright test reuses the identity-toolkit mocking already in
`tests/shared/auth-gate.spec.ts`, with `emailVerified: false` on `accounts:lookup` until the
confirmation step.

Capacity: n/a. The site runs no workload; the change reads one small JSON body on a 403.

## Risks

- The API rewords the detail. The flag stays unset and surfaces show today's errors, not a broken
  page. The exact string is pinned by stocks' `tests/api/test_platform_auth.py`, and this change's
  unit test names it.
- A non-verification error while the flag is set reads as "confirm your email". An unverified
  account cannot load any gated data, so confirming is still the first step, and the flag clears
  on the first successful response.
- The new host ships before the API admits it. Calls from `stocks.insightscollective.org` then
  fail CORS as they do today, and `solyra-stocks.lovable.app` is unaffected; the two changes can
  land in either order.
- Reading the clone delays the caller by one body read on a 403 only; 200 responses are untouched.
- `/api/me/*` becoming gated changes one behaviour: a 401 there now reports "signed out", as the
  server's own classification always implied. A signed-in user with a valid token never gets one.
