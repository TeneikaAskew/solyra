---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-AUTH-001]
issues: []
canvases: []
done_when:
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that autoConfirmDue returns true for a shown banner on a visible page with no check running and no earlier automatic check, false when the page is hidden, when the banner is not shown, and when a check is running, false when the last automatic check started 9999 ms earlier, and true when it started 10000 ms earlier"
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that a confirm check for uid A started while another for uid A is pending calls refresh once and resolves to the same result, and that a check for uid B started then calls refresh again"
  - "tests/shared/auth-gate.spec.ts signs in an email account whose accounts:lookup reports emailVerified false and whose gated calls answer 403 'verify your email to continue', makes accounts:lookup report verified and the API accept only the ID token a fresh check mints, dispatches a window focus event without clicking anything, and asserts that the Dashboard card renders its data and the banner is gone"
  - "tests/shared/auth-gate.spec.ts has a second test that leaves the account unverified, dispatches a visibilitychange and a window focus event back to back, and asserts that exactly one accounts:lookup request follows them, that the banner stays and shows no 'Not confirmed yet', and that clicking the banner's I've confirmed afterwards shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a third test whose refresh fails on the focus event and asserts that the banner shows 'Could not check the account:' with the error's message, and that clicking I've confirmed once the refresh answers again removes that line and shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a fourth test that signs in an email account whose accounts:lookup reports emailVerified true, dispatches a window focus event, and asserts that no accounts:lookup or securetoken request follows it"
  - "tests/shared/auth-gate.spec.ts has a fifth test that, with the account unverified, dispatches a window focus event and clicks a Dashboard card's I've confirmed in the same step, and asserts that one accounts:lookup request follows and that card shows 'Not confirmed yet'"
  - "The first e2e test saves a screenshot with page.screenshot before and after the focus event into its output directory under test-results/, and a PR comment describes each"
  - "Each new test is shown failing against main when the PR opens, and the solyra CI checks and e2e jobs are green on the PR head"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Notice a confirmed email when the person comes back

## Problem

An email account that has not confirmed its address sees the banner "Confirm your email address to
load your data." with two buttons, Resend email and I've confirmed. The person opens the link from the
email, which confirms the address in another tab or app, and comes back. The banner is still there
until they click I've confirmed, because confirming in another tab does not fire `onAuthStateChanged`
here (`EmailVerificationBanner`'s own comment says so).

The owner asked on 2026-10-11 what I've confirmed does, and whether that check should happen on its
own. It should: the check is the same one the button runs, and coming back to the tab is exactly the
moment the answer may have changed.

## Non-goals

- No polling. A timer would call Identity Toolkit for a tab nobody is looking at.
- No message from the `/auth/action` page to other tabs. A link opened in another browser or a mail
  app's own browser would never deliver it, and coming back to the tab covers those too.
- No change to what I've confirmed shows, or to the card's button (`VerifyEmailEmptyState`): both start
  their check through the shared one below. The banner is mounted on every app route
  (`AppShell.tsx:69`), so its automatic check lifts cards, page bodies and the banner, on Admin and
  Settings too.
- Not the email links' domain: the Lovable host already redirects `/auth/action` to
  `stocks.insightscollective.org` with the query intact (checked 2026-10-11).
- Not Google sign-in, which arrives verified.

## Approaches considered

1. Poll every few seconds while the banner shows. Rejected, as above.
2. Broadcast from `/auth/action` once the code applies. Rejected: it reaches only tabs of the same
   browser profile.
3. Run the existing check when the tab regains focus or becomes visible, at most once per 10 seconds,
   through one shared in-flight check. Chosen: it reuses `confirmEmailVerified` unchanged, so its
   account-switch safeguards hold.

Chosen on 2026-10-11 at the owner's request ("If they click it is it check? If so it should be
automatically done too right?").

## Design

`src/components/shared/AuthStatusIndicator.tsx`:

- A pure, exported `autoConfirmDue({ shown, visible, running, lastAutoAt, now }): boolean` and
  `AUTO_CONFIRM_MIN_INTERVAL_MS = 10_000`. True only when the banner is shown, the page is visible, no
  check is running, and either no automatic check has run or the last one started at least 10 000 ms
  before `now`. Focus and `visibilitychange` usually fire together when a person switches back, and the
  interval keeps that, or rapid tab switching, to one call.
- A module-level `checkEmailConfirmed(uid)` wraps `confirmEmailVerified(uid, refreshEmailVerified,
  queryClient)` with one in-flight promise per uid. The automatic check, the banner's button and every
  card's button call it, and a call made while one is pending joins it. A click that joins a pending
  automatic check shows that check's outcome as a click does ("Not confirmed yet"). `running` reads that
  promise, not React state, so a focus and a `visibilitychange` in one task, or a focus and a click,
  start one check.
- In `EmailVerificationBannerFor`, an effect declared before the early return (hooks cannot follow it)
  subscribes, while the banner shows, to `window` `focus` and `document` `visibilitychange`, and on each
  event that `autoConfirmDue` allows records the start and calls `checkEmailConfirmed(uid)`:
  - `'verified'`: nothing further. The confirmed record hides the banner and every query refetches,
    exactly as when the button succeeds.
  - `'unverified'`: nothing shown. An automatic check that finds the address still unconfirmed has
    nothing to tell the person; a click's own check still says "Not confirmed yet".
  - `'failed'`: its own line, "Could not check the account: <message>" (Rule 4), held apart from the
    resend state so "Sent, check your inbox" survives it, and cleared when the next check starts.
  A result arriving after the account changed sets no state on the new banner (a new instance under a
  new key); `confirmEmailVerified`'s writes land on the old uid only, as today.
- The OpenAPI sync. stocks FEAT-DEPLOY-001 changes the `/api/earnings/health/ping` description in its
  `platform/api/openapi.json`. This PR carries the matching sync
  (`STOCKS_OPENAPI_REF=<that branch> npm run contract:sync`, a one-description diff in
  `tests/fixtures/stocks-openapi.json` and the generated types), and merges after that stocks PR, when
  `contract:check` against stocks main agrees.

Capacity: n/a. At most one check per 10 s of tab switching while the banner shows; each check is one
`accounts:lookup` and one `securetoken` refresh (`src/lib/firebaseImpl.ts:134-141`).

## Risks

- A person who never leaves the tab sees no change until they click, as today.
- The e2e tests dispatch the focus event themselves; real focus in a headless browser is not
  observable. The unit tests pin the decision and the shared check, and the e2e tests pin what each
  outcome shows and how many lookups follow.
- If the stocks PR stalls, this PR waits on it, since its vendored copy would be ahead of stocks main.
