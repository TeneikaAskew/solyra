---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-AUTH-001]
issues: []
canvases: []
done_when:
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that autoConfirmDue returns true for a shown banner on a visible page with no check running and no earlier automatic check, false when the page is hidden, when the banner is not shown, and when a check is running, false when the last automatic check started 9999 ms earlier, and true when it started 10000 ms earlier"
  - "src/components/shared/AuthStatusIndicator.test.ts asserts that a confirm check for uid A started while another for uid A is pending calls refresh once and resolves to the same result, that a check for uid B started then calls refresh again, and that once a check for an account has settled, failed or unverified, the next check for it calls refresh again"
  - "tests/shared/auth-gate.spec.ts signs in an email account whose accounts:lookup reports emailVerified false and whose gated calls answer 403 'verify your email to continue', makes accounts:lookup report verified and the API accept only the ID token a fresh check mints, dispatches a window focus event without clicking anything, and asserts that the Dashboard card renders its data and the banner is gone"
  - "tests/shared/auth-gate.spec.ts has a second test that leaves the account unverified, dispatches a visibilitychange while the page reports hidden and asserts that no accounts:lookup request follows, then dispatches a visibilitychange while the page reports visible and asserts that exactly one accounts:lookup request follows it, then, once that check has finished, dispatches a window focus event and a visibilitychange back to back and asserts that none follows them, that the banner stays and shows no 'Not confirmed yet', and that clicking the banner's I've confirmed afterwards shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a third test that clicks Resend email and waits for it to read 'Sent, check your inbox', makes the refresh fail, dispatches a window focus event, and asserts that the banner shows 'Could not check the account:' with the error's message while the resend button still reads 'Sent, check your inbox', that a click on I've confirmed while the refresh still fails shows that line once and leaves the resend button as it was, and that clicking I've confirmed once the refresh answers again removes that line and shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a fourth test that signs in an email account whose accounts:lookup reports emailVerified true, dispatches a window focus event, and asserts that no accounts:lookup or securetoken request follows it"
  - "tests/shared/auth-gate.spec.ts has a fifth test that, with the account unverified, dispatches a window focus event and clicks a Dashboard card's I've confirmed in one page.evaluate, so both run in one task, and asserts that one accounts:lookup request follows and that card shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a sixth test that, with the account unverified, holds the accounts:lookup answer, dispatches a window focus event, and once that lookup has been requested asserts that the banner's I've confirmed is enabled and clicks it, then releases the answer and asserts that one accounts:lookup request followed the focus event and the click and that the banner shows 'Not confirmed yet'"
  - "tests/shared/auth-gate.spec.ts has a seventh test that, with the account unverified, holds the accounts:lookup answer, clicks the banner's I've confirmed, dispatches a window focus event while that check is pending, releases the answer, and once the banner shows 'Not confirmed yet' dispatches a window focus event and asserts that two accounts:lookup requests followed the click"
  - "The first e2e test saves a screenshot with page.screenshot before and after the focus event into its output directory under test-results/, and a PR comment describes each"
  - "docs/UI-SCREENS.md SHELL-04's acceptance criterion for an account whose emailVerified is false says that the banner also runs the I've confirmed check when the tab regains focus or becomes visible, and SHELL-04's test ids include verification-check-error"
  - "The unit tests in the first two items and the first, second, third, sixth and seventh e2e tests are shown failing against main when the PR opens; the fourth and fifth e2e tests, which pass on main because it has no listener, are shown failing against these broken versions of the change: the fourth against an effect that subscribes and checks whether or not the banner shows, the fifth against a card button that calls confirmEmailVerified itself instead of joining the shared check; the sixth is also shown failing against a banner button that does the same and against an automatic check that disables that button; and the solyra CI checks and e2e jobs are green on the PR head"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number"
status: approved
supersedes: docs/superpowers/specs/2026-10-11-feat-auth-001-confirm-on-return.md
---

# Notice a confirmed email when the person comes back

Re-cut of the confirm-on-return spec merged in solyra#250 (r1). Its done_when item "Each new test is
shown failing against main" could not be met. The fourth and fifth e2e tests check that the new
listener adds nothing: no check for a verified account, and one lookup when a focus and a card click
coincide. Both pass on main, which has no listener, and fail only against the broken versions the RED
item now names. Measured on `11a7950`, whose `src/`, `tests/helpers/` and
`tests/shared/auth-gate.spec.ts` are identical to `fd7783e`'s, where r1 merged. This re-cut also adds
two tests: the banner-click test the pre-review asked for (its E1), which holds the lookup so that it
fails on main and against an automatic check that disables the button, and a seventh, for a return
while a click's check is pending. It folds in what planning and the pre-review measured: a click's
failure shares the automatic check's line, the effect reads visibility when the event fires, a
`visibilitychange` alone starts a check, the query client is a parameter, and the close-out audit
waits for the stocks merge. Approved on 2026-10-11 under the owner's instruction to bring both
repositories to a clean, closed-out state.

## Problem

An email account that has not confirmed its address sees the banner "Confirm your email address to
load your data." with two buttons, Resend email and I've confirmed. The person opens the link from the
email, which confirms the address in another tab or app, and comes back. The banner is still there
until they click I've confirmed, because confirming in another tab does not fire `onAuthStateChanged`
here (`EmailVerificationBanner`'s own comment says so).

The owner asked on 2026-10-11 what I've confirmed does, and whether that check should happen on its
own. It should: the check is the same one the button runs, and coming back to the tab is exactly the
moment the answer may have changed.

Two things on main shape how the check runs:

- A failed click today goes through the resend state (`AuthStatusIndicator.tsx:306`,
  `setResend({ state: 'error', ... })`). That turns "Sent, check your inbox" back into "Resend email",
  and no later check clears it; only another Resend email does.
- Each I've confirmed calls `confirmEmailVerified` itself: the banner at `AuthStatusIndicator.tsx:304`
  and each card at `SignInEmptyState.tsx:72`. The banner's button is disabled while its own check runs
  (`:350`). An automatic check that disabled it would drop the click of a person who comes back by
  clicking it.

## Non-goals

- No polling. A timer would call Identity Toolkit for a tab nobody is looking at.
- No message from the `/auth/action` page to other tabs. A link opened in another browser or a mail
  app's own browser would never deliver it, and coming back to the tab covers those too.
- No change to the text I've confirmed shows ("Not confirmed yet. Open the link in the email, then try
  again." and "Could not check the account: <message>"), or to what the card's button
  (`VerifyEmailEmptyState`) shows. Both buttons start their check through the shared one below. The
  banner is mounted on every app route (`AppShell.tsx:69`), so its automatic check lifts cards, page
  bodies and the banner, on Admin and Settings too.
- Not the email links' domain: the Lovable host already redirects `/auth/action` to
  `stocks.insightscollective.org` with the query intact (checked 2026-10-11).
- Not Google sign-in, which arrives verified.
- Not the lint backlog. `npm run lint` is not gated (`ci.yml:11-14`), and the two
  files this changes already carry five `react-refresh/only-export-components` errors for their
  exported helpers. The new exports add entries of that rule, because this spec places them beside the
  banner.

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
  check is running, and either no automatic check has run (`lastAutoAt` null) or the last one started
  at least 10 000 ms before `now`. Focus and `visibilitychange` usually fire together when a person
  switches back, and the interval keeps that, or rapid tab switching, to one call.
- A module-level, exported `checkEmailConfirmed(uid, queryClient)` wraps
  `confirmEmailVerified(uid, refreshEmailVerified, queryClient)` with one in-flight promise per uid.
  The query client is a parameter because a module-level function cannot call `useQueryClient`. The
  automatic check, the banner's button and every card's button call it, and a call made while one is
  pending joins it and receives the same result. The entry is removed when the check settles, failed
  or not, so the next call reaches the network again. An exported `isConfirmCheckRunning(uid)` reads
  that map, and `running` is read from it rather than from React state. A focus and a
  `visibilitychange` in one task, or a focus and a click, therefore start one check. A click that
  joins a pending automatic check shows that check's outcome as a click does ("Not confirmed yet").
- In `EmailVerificationBannerFor`, an effect declared before the early return (hooks cannot follow it)
  subscribes, while the banner shows, to `window` `focus` and `document` `visibilitychange`. Its
  cleanup removes both. On each event it reads `document.visibilityState` at that moment, so leaving
  the tab never spends the interval. When `autoConfirmDue` allows, it records the start in a ref and
  calls `checkEmailConfirmed(uid, queryClient)` synchronously, so a second event in the same task finds
  it pending. Then:
  - `'verified'`: nothing further. The confirmed record hides the banner and every query refetches,
    exactly as when the button succeeds.
  - `'unverified'`: nothing shown. An automatic check that finds the address still unconfirmed has
    nothing to tell the person; a click's own check still says "Not confirmed yet".
  - `'failed'`: its own line, "Could not check the account: <message>" (Rule 4), held apart from the
    resend state so "Sent, check your inbox" survives it, and cleared when the next check starts.
  A result arriving after the account changed sets no state on the new banner (a new instance under a
  new key); `confirmEmailVerified`'s writes land on the old uid only, as today.
- The banner's I've confirmed sends its own `'failed'` result to that same line, not to the resend
  state, and clears the line when it starts. The text is unchanged; only its element moves.
- The banner's button is disabled only while its own click's check runs. An automatic check never
  disables it, so a click as the tab regains focus joins the pending check instead of being dropped.
  The sixth e2e test clicks it while an automatic check is pending, after React has rendered.
- `docs/UI-SCREENS.md` SHELL-04 describes this banner. Its acceptance criterion for an account whose
  `emailVerified` is false gains that the banner also runs the I've confirmed check when the tab
  regains focus or becomes visible, at most once per 10 s, and its test ids gain
  `verification-check-error`. That criterion's citation (`AuthStatusIndicator.tsx:240-253`) moves to
  the banner's lines as this change leaves them.
- The OpenAPI sync. stocks FEAT-DEPLOY-001 (spec r2, stocks#1381) changes the
  `/api/earnings/health/ping` description in `platform/api/openapi.json` on its branch
  `feature/feat-deploy-001-retired-service-leftovers`. This PR carries the matching sync,
  `STOCKS_OPENAPI_REF=feature/feat-deploy-001-retired-service-leftovers npm run contract:sync`. The
  result is a one-description diff: one line of `tests/fixtures/stocks-openapi.json` and three comment
  lines of `src/types/stocksOpenApi.gen.d.ts`. Merge order: this PR is open, with the sync, before the
  stocks PR merges; the stocks PR merges; this PR's CI re-runs and it merges.
  Between the sync commit and that merge, two things fail on purpose. The `types · unit · build` job
  fails at `contract:check`. `node scripts/docs-audit.mjs` reports one finding main does not
  (P1, `class-a`, `tests/fixtures/stocks-openapi.json`, "contract:check is red"; measured on `11a7950`
  with the synced copy: 25 findings against main's 24). The close-out's docs audit therefore runs
  after the stocks merge.

Capacity: n/a. At most one check per 10 s of tab switching while the banner shows; each check is one
`accounts:lookup` and one `securetoken` refresh (`src/lib/firebaseImpl.ts:134-141`).

## Risks

- A person who never leaves the tab sees no change until they click, as today.
- The e2e tests dispatch the focus and visibility events themselves; real focus in a headless browser
  is not observable. The unit tests pin the decision and the shared check, and the e2e tests pin what
  each outcome shows and how many lookups follow.
- The effect reads `running` from the shared check. It matters only for a return while a click's
  check is pending: that return joins the check either way, and `running` keeps it from spending the
  10 s interval, so the next return still checks. The first unit item pins how `autoConfirmDue`
  treats `running`, and the seventh e2e test pins the effect's wiring by the lookup count of that
  next return.
- The fourth and fifth e2e tests guard against extra checks, and main makes none, so they cannot fail
  there. The RED item names the broken version each one fails against instead.
- A return within 10 s of the previous automatic check starts none, so a person who confirms and
  comes back that quickly sees the banner until they click I've confirmed or come back again.
- If the stocks PR stalls, this PR waits on it, since its vendored copy would be ahead of stocks main.
