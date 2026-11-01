---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-TENANCY-001]
issues: [117, 234, 270]
canvases: []
done_when:
  - "src/lib/authGate.test.ts asserts that noteSignedInAccount reports no account change for the first report after load or for a repeated report of the same uid; reports A to signed-out, signed-out to B and A to B; and clears the auth-blocked flag when the account changes but keeps it for a repeated report of the same uid"
  - "src/lib/authGate.test.ts asserts that when uid B is reported while localStorage holds values tagged for uid A, or untagged values, every key in ACCOUNT_SCOPED_STORAGE_KEYS is removed, the tag becomes uid B and the reset listeners run once; that values tagged for the reported uid, and a report of signed-out, change nothing; that overview-chart is kept; and that ACCOUNT_SCOPED_STORAGE_KEYS contains themeStore's and settingsStore's STORAGE_KEY"
  - "src/lib/authGate.test.ts asserts that resetAccountQueries for uid B removes every query keyed under 'me' except ['me', B], empties an account-blind query, discards an account-blind answer that arrives after the call, and after a sign-out leaves no query"
  - "tests/shared/identity-transitions.spec.ts signs account A in, signs out through each of the four controls (Settings Account tab, header, account menu at 390 px, /auth/action Sign in after a password reset), signs account B in and asserts that Settings shows B's display name, never A's, and that B's profile was requested with B's token"
  - "tests/shared/identity-transitions.spec.ts asserts that Settings shows B's profile, never A's, after a switch from A to B with no sign-out: in this tab, from another tab of the same browser context, and while this tab is on the public / route with a client-side return to /settings"
  - "tests/shared/identity-transitions.spec.ts asserts that account B with no stored preferences (404), after account A stored light, comfy and violet, renders data-theme dark, and that B's first appearance change sends a PUT carrying none of A's values"
  - "tests/shared/identity-transitions.spec.ts asserts that a profile read and a profile save that A started and that answer after B is signed in never put A's display name in B's view"
  - "tests/shared/identity-transitions.spec.ts asserts that after a direct switch from A to B, B's stored theme and accent apply with no preferences PUT for either account, and that while B's profile request is held the Display name field does not show A's name and Save changes is disabled"
  - "tests/shared/identity-transitions.spec.ts asserts that after a direct switch from A to B on the journal's My journal view, A's trade text is gone and B's trades are requested with B's token"
  - "tests/shared/identity-transitions.spec.ts asserts that after A's gated request answers 401 and the account switches to B, with every gated request B makes held unanswered, the auth status reads signed-in and the expired-session strip is absent"
  - "tests/landing/landing.spec.ts's existing fence on / (no runtime-config request and no Firebase or gated-shell download) passes unchanged on the PR head"
  - "When the PR opens, a PR comment shows every new e2e test failing against main fab3a52c (or the main the PR is cut from), except the header, account-menu and /auth/action sign-out tests, which pass there as controls; and the unit and e2e suites and the solyra CI checks pass on the PR head"
  - "The e2e tests save a screenshot of each asserted state with page.screenshot under test-results/, and a PR comment names the environment (hermetic Playwright, mocked Identity Toolkit and API), the revision and the viewport of each"
  - "docs/UI-SCREENS.md SETTINGS-08 and the Settings appearance criterion that says the next account starts with the previous account's theme describe the account change, and no longer state the defects this change removes"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number"
status: draft
supersedes: null
---

# Keep each account's client state to that account

## Problem

Firebase shares the signed-in account across the tabs of a browser and never reloads a tab when
the account changes. The app keeps account data in the browser with no account attached to it. It
drops that data only when one of three sign-out buttons runs `qc.clear()`.

This was reproduced on main `fab3a52c` with the real Firebase SDK, a mocked Identity Toolkit and a
mocked API that answers per bearer token. The reproduction is synthetic, and no production exposure
is claimed. The new file `tests/shared/identity-transitions.spec.ts` has 14 tests:

- 8 tests written first to reproduce the reported defects. All 8 fail on main.
- 3 tests added later for state held by mounted components and for account-blind answers. All 3
  fail on main.
- 3 control tests (header, account menu, `/auth/action`). All 3 pass on main.

What the failures show:

- **Settings' Sign out (solyra#117).** It calls `firebaseSignOut()` alone
  (`src/routes/SettingsPage.tsx:478`), so the next account sees the previous account's profile.
  The header, account-menu and `/auth/action` controls clear the cache and pass.
- **A switch with no sign-out (solyra#234 items 1 and 4).** After another tab or a direct sign-in
  changes the account, the profile, the account-blind queries (the journal's trades, for example)
  and the mounted Settings form all still belong to the previous account. The same happens when
  the switch lands while the app is on `/` or `/auth/action`. There, `AuthGate` and `useUser`, the
  only identity listener, are unmounted.
- **Appearance (solyra#234 item 2).** `platform-theme` and `platform-shell-settings` have no owner.
  Account B with no stored preferences starts from A's appearance, and B's first change writes A's
  values to B.
- **Late answers (solyra#234 item 3).** A profile read or save that A started and that answers
  after B is signed in lands in B's view.
- **Expired-session flag (solyra#270).** The flag (`src/lib/authGate.ts:14`) survives the switch,
  so B sees "Session expired" until B's first gated success.

**Coverage.** No approved contract covers this:

- The FEAT-AUTH-001 verify-email spec lists account switches as a non-goal.
- Confirm-on-return and the stocks sign-in hardening spec do not reach it.
- REQ-AUTH-001 is the server perimeter.

## Non-goals

- **Server and configuration.** No server, session, revocation, role, Firebase configuration or
  `/api/me` change. This excludes stocks #1317, #1319, #1315 and #1323, `ADMIN_EMAIL`, and solyra
  #266.
- **Other auth modes.** No change to dev, open, local or IAP behaviour. Without a Firebase account,
  nothing here runs.
- **The landing route.** No change to `/`. The account record is fed only after ConfigGate has
  initialised the SDK, so the landing route still loads no runtime config, Firebase or shell code.
- **Uid-keyed queries.** None of the account-blind query keys gain a uid, and neither do profile or
  preferences. They are reset or removed on an account change instead.
- **The I've-confirmed record.** The record that holds one uid (`emailConfirmedFor`, named by spec
  PR #278 r5) is not changed. No test here reproduces it.
- **Writers not covered by this spec.** solyra#234 is not complete after this change:
  - `em.account` and `em.riskPct`, the sizing inputs in `MovementRead`.
  - `ticker-store`, the active and recent tickers.
  - A preferences save that answers after a switch.

  No test here reproduces any of them. Per-browser conveniences stay shared: the overview chart
  style, broker CSV column presets, the dev mock-mode toggle and the Lovable preview auth storage.
- **Files owned by an open PR.** No change to `tests/shared/auth-gate.spec.ts` or
  `tests/shared/mock-mode.spec.ts`, which open PR #311 changes. The new tests have their own file.

## Approaches considered

1. **Add `qc.clear()` to Settings' Sign out,** the minimal fix for #117. Rejected: it fixes 1 of
   the 11 failing tests.
2. **Reload the page when the uid changes.** Rejected for two reasons. localStorage survives a
   reload. A switch made on a public route is also missed, unless the last uid is kept outside any
   component.
3. **One account record outside AuthGate,** fed by a Firebase listener registered when the SDK
   initialises. When the account changes, it drops what belonged to the previous account: the
   cached queries, the blocked flag and the account-scoped storage. Chosen: one place sees every
   path (four controls, another tab, a public route), and the new account's identity query stays
   intact.

## Design

**`src/lib/authGate.ts`** gains these exports:

- **`noteSignedInAccount(uid)`, `getSignedInAccount()` and `onAccountChange(cb)`.** The first
  report after load is not a change, and neither is a repeat of the same uid. On a change, the
  blocked flag is cleared first, then the listeners are called with `(next, prev)`.
- **`ACCOUNT_SCOPED_STORAGE_KEYS` and the `platform-account-owner` tag.** The keys are
  `['platform-theme', 'platform-shell-settings']`. Whenever a uid is reported that differs from
  the tag (an untagged legacy value counts as different), those keys are removed, the tag is set
  and the `onDeviceStateReset` listeners run. This happens before that account's app renders.
- **`resetAccountQueries(qc, next)`.** This calls `removeQueries` for every key under `'me'` except
  `['me', next]`. For every other key, it calls `resetQueries` when `next` is an account, or
  `removeQueries` after a sign-out. `resetQueries` cancels in-flight answers and refetches what is
  on screen with the new token.

**Wiring.**

- `src/lib/firebaseImpl.ts` `initFirebase` registers
  `onAuthStateChanged(_auth, u => noteSignedInAccount(u?.uid ?? null))` once.
- `src/App.tsx` registers `onAccountChange(next => resetAccountQueries(queryClient, next))` at
  module scope.
- `themeStore` and `settingsStore` export `STORAGE_KEY`. On `onDeviceStateReset` they reset to the
  product defaults (dark; top tabs, dense, dawn). The server's stored values then hydrate as today.

**Profile save.** `useProfile`'s save `onSuccess` writes its answer to the cache only while the
account that rendered the form is still the signed-in account.

**Sign-out controls.** The sign-out controls are unchanged. Settings' Sign out is fixed by the
account change. The three controls that already call `qc.clear()` keep it.

**Why each part is needed.** Each part was removed in turn on the prototype, and the spec file was
re-run:

| Part removed | Result |
|---|---|
| None | 14 pass |
| The query reset | 2 fail: mounted-state draft, journal |
| The blocked-flag clear | 1 fails: the 401 strip |
| The Firebase listener | 6 fail |
| The storage claim | 2 fail: B with no preferences, direct-switch appearance |
| The profile write-back guard | 1 fails: the late save |

Four parts were also tested and found not needed, so they are left out:

- uid-keyed profile and preferences keys;
- a pre-send account check on saves;
- guards on preferences saves;
- removing `qc.clear()` from the three controls.

**Shell remount.** The shell remounts on a switch because `AuthGate` renders its spinner while the
new account's `['me', uid]` query loads. That query is always new, because the previous account's
entries are removed. The mounted-state tests and the late-save test depend on this.

**Capacity:** n/a. The site runs no workload. Each account change refetches the visible queries
once.

## Risks

- **Legacy appearance reset.** Untagged appearance is reset once, on the first sign-in after this
  ships. Accounts with stored preferences get them back from the server at once. Accounts without
  a row see the product defaults. Accepted, because an untagged value cannot be attributed to an
  account.
- **Dependence on the shell remount.** The profile guard reads the account from the form's render.
  That is correct only because the shell remounts on a switch. A future change that kept
  `['me', uid]` cached across accounts would break the remount, and the mounted-state and late-save
  tests would fail.
