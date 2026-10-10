---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-AUTH-001]
issues: []
canvases: []
done_when:
  - "src/lib/authedFetch.test.ts asserts that a gated 403 whose detail is 'verify your email to continue' sets the verification-required flag in src/lib/authGate.ts, that a gated 403 with any other detail leaves it unset, that a later successful gated response clears it, and that the caller can still read the 403 response body"
  - "src/components/shared/WidgetState.test.ts asserts that widgetErrorKind returns 'verify' for a 403 error while the flag is set, 'auth' for a 401, and 'error' for a 403 when the flag is not set"
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that confirmEmailVerified invalidates the query cache when the refresh reports verified, and leaves it untouched when the refresh reports unverified"
  - "tests/shared/auth-gate.spec.ts signs in an email account whose accounts:lookup reports emailVerified false, answers the dashboard's gated calls with 403 'verify your email to continue', and asserts a card shows 'Confirm your email to load data' while the verification banner is visible"
  - "src/lib/apiTargets.test.ts asserts isStaticFrontendHost is true for stocks.insightscollective.org, solyra-stocks.lovable.app and a lovableproject.com host, and false for insightscollective.org, evil-stocks.insightscollective.org, stocks.insightscollective.org.evil.com and localhost"
  - "Each new test is shown failing against main when the PR opens, and the solyra CI checks and e2e jobs are green on the PR head"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Tell an unverified account why its data does not load, and sign in from stocks.insightscollective.org

## Problem

Since stocks#1360 (merged 2026-10-10) the API refuses every gated `/api/*` request from a
Firebase account whose email is not verified, with
`403 {"detail": "verify your email to continue"}`. The site does not recognise that answer:

- `src/lib/authedFetch.ts` tracks only 401 (`markAuthBlocked`), so nothing records that the
  account needs to verify.
- `WidgetState` sends a 401 to `SignInEmptyState` and every other error to `WidgetError`, so each
  card reads "Couldn't load this data" with whatever message its hook threw, from
  "verify your email to continue (HTTP 403)" to "Request failed (HTTP 403)", and a Retry button
  that cannot succeed until the address is confirmed.
- `EmailVerificationBanner` already shows for an unverified email account and offers
  "Resend email" and "I've confirmed". Its code comment calls it non-blocking because the app
  used to stay usable; it no longer does. When "I've confirmed" succeeds, the cards that already
  failed keep their error until each is retried by hand.

stocks#1360's spec left this side out on purpose ("Making the banner block the app is a solyra
change of its own"). This is that change.

The same day the owner connected `stocks.insightscollective.org` to this Lovable project (DNS at
Squarespace already resolves), and added it to Firebase Auth's authorized domains so Google
sign-in can start there. Lovable serves the bundle without an `/api` route, but
`src/lib/apiTargets.ts` only recognises `*.lovable.app` and `*.lovableproject.com` as such static
hosts. On the new address the site would send `/api/*` to Lovable, get `index.html` back, and
neither sign in nor load data.

## Non-goals

- No change to the API or its 403. The detail string is the contract this change reads.
- No full-page block. The banner and the per-card state carry the message; a page that also
  shows public data keeps showing it.
- Not the Google sign-in path. Google accounts arrive verified and never see this state.
- Not `DataGate`, which stays the signed-out gate.
- Not the API side of the new address. The stocks API's CORS pattern admitting
  `https://stocks.insightscollective.org` is stocks#1363's change, and the sign-in domain
  (`auth.stocks.insightscollective.org`) is project configuration recorded in the docs.
- Not the site traceability matrix. A new AUTH state row and its ticks go on a `docs/` branch in
  stocks after this merges.

## Approaches considered

1. Match "403" in each card's error message. Rejected: admin-only endpoints and the allow-list
   also answer 403, and some hooks throw only the status code, so a bare match would tell an
   admin-denied user to verify an email they already verified.
2. Read `emailVerified` from the Firebase user in each card. Rejected: the API decides from the
   token's claim, which lags the profile until the token refreshes; the UI would disagree with the
   server in exactly the window this change is about.
3. Let the fetch layer recognise the API's own answer, the 403 with that detail on a gated path,
   and raise a flag next to the existing auth-blocked one; cards read the flag. Chosen: one place
   decides, from what the server actually said, the same way 401 is handled today.

Chosen on 2026-10-10 under the owner's instruction to make this change after stocks#1360.

## Design

`src/lib/authGate.ts`: a second flag beside `blocked`: `markVerificationRequired`,
`clearVerificationRequired`, `isVerificationRequired`, `useVerificationRequired`, with the same
subscribe pattern.

`src/lib/authedFetch.ts`: `track` becomes async. On a gated 403 it reads the detail from
`resp.clone()` (the caller's body stays unread) and calls `markVerificationRequired` when the
detail is exactly `verify your email to continue`. A successful gated response clears both flags,
as it clears `blocked` today. A body that is not JSON leaves the flag alone.

`src/components/shared/WidgetState.tsx`: a pure helper
`widgetErrorKind(error, verificationRequired): 'auth' | 'verify' | 'error'`. A 401 stays
`'auth'`; a 403 while the flag is set is `'verify'`; everything else is `'error'`. `WidgetState`
renders `VerifyEmailEmptyState` for `'verify'`.

`src/components/shared/SignInEmptyState.tsx`, beside `SignInEmptyState`:
`VerifyEmailEmptyState({ compact, onRetry })`: a mail icon, "Confirm your email to load data",
a line pointing at the banner ("Open the link we emailed you, then choose I've confirmed above.")
and Retry when `onRetry` is given. No values are rendered (Rule 4).

`src/components/shared/AuthStatusIndicator.tsx`: a pure, exported
`confirmEmailVerified(refresh, queryClient): Promise<boolean>`. It calls `refresh`
(`refreshEmailVerified`, which already forces a fresh ID token) and, when that reports verified,
calls `queryClient.invalidateQueries()`, so every card refetches with the new token and the first
successful response clears the flag. `EmailVerificationBanner` uses it, its copy becomes
"Confirm your email address to load your data.", and its comment stops calling it non-blocking.

`src/lib/apiTargets.ts`: a second list, `STATIC_FRONTEND_HOSTS = ['stocks.insightscollective.org']`,
matched exactly, beside the existing suffix list; `isStaticFrontendHost` returns true for either.
Exact, not a suffix: `endsWith('stocks.insightscollective.org')` would also match
`evil-stocks.insightscollective.org`, and the apex serves a different site. The header comment's
"two places need the new origin" note gains this host and its stocks counterpart.

Tests: listed in done_when. The Playwright test reuses the identity-toolkit mocking already in
`tests/shared/auth-gate.spec.ts`, with `emailVerified: false` on `accounts:lookup`.

Capacity: n/a. The site runs no workload; the change reads one small JSON body on a 403.

## Risks

- The API rewords the detail. The flag would stay unset and cards would show the generic error
  again, which is today's behaviour, not a broken page. The exact string is pinned by stocks'
  `tests/api/test_platform_auth.py`, and this change's unit test names it.
- A 403 for another reason while the flag is set (an admin page for a non-admin who is also
  unverified) reads as "confirm your email". That account cannot load anything until it confirms,
  so the message is still the right first step.
- Reading the clone delays the caller by one body read on a 403 only; 200 responses are untouched.
- The new host ships before the API admits it. Calls from `stocks.insightscollective.org` then
  fail CORS exactly as they do today, and `solyra-stocks.lovable.app` is unaffected; the two
  PRs can merge in either order.
