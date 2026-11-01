---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-TENANCY-001]
issues: [117, 234, 270]
canvases: []
done_when:
  - "src/lib/authGate.test.ts asserts that noteSignedInAccount reports no account change for the first report after load or for a repeated report of the same uid, reports A to signed-out, signed-out to B and A to B, and clears the auth-blocked flag on a change but keeps it for a repeated report of the same uid"
  - "src/lib/authGate.test.ts asserts, in firebase mode, that an account-scoped write made while this page's account is uid A is stored under '<key>@uid:uid-a' and changes no other key; that a read while the account is uid B returns B's own value or nothing, never uid A's value, another owner's value or the un-namespaced value; that before this page's first account report nothing account-scoped is read or written; and that with localStorage unavailable reads return nothing and writes are dropped without an error"
  - "src/lib/authGate.test.ts runs A signed in, A writes, signed out, B signed in, B writes, A signed in again, with un-namespaced legacy values present from the start, and asserts that no localStorage key present at any step is missing or changed at the end except the keys the current owner wrote, and that no code path removes an '@uid:' key or an un-namespaced account-scoped key"
  - "src/lib/authGate.test.ts asserts that outside firebase mode (initFirebase never called) every account-scoped read and write uses the un-namespaced key exactly as on main, so dev, open, local and IAP behaviour is unchanged"
  - "store unit tests assert that themeStore, settingsStore (navPattern, density, accent), the sizing calculator inputs (em.account, em.riskPct) and tickerStore's recentTickers reload from the new account's own values, or the product defaults when it has none, on every account change this page observes and on the first report; that tickerStore's activeTicker stays a per-browser value in 'ticker-store' as on main; and that a write of activeTicker keeps any recentTickers already held in 'ticker-store' byte-identical"
  - "src/lib/authGate.test.ts asserts that resetAccountQueries for uid B removes every query keyed under 'me' except ['me', B], empties an account-blind query, discards an account-blind answer that arrives after the call, and after a sign-out leaves no query holding data"
  - "src/lib/authGate.test.ts asserts that the email-confirmed record marked for uid B and then for uid A reads confirmed for both, that marking uid A never clears uid B, and that a record marked for uid A still reads not confirmed for uid B and for no uid"
  - "hook unit tests assert that preferences write-through is suspended from an account change until the new account's stored preferences have hydrated, and that the profile and preferences save write their answer to the cache only while the account that rendered them is still signed in"
  - "tests/shared/identity-transitions.spec.ts signs account A in, signs out through each of the four controls (Settings Account tab, header, account menu at 390 px, /auth/action Sign in after a password reset), signs account B in and asserts that once B's profile has answered Settings shows B's display name and does not contain A's, and that B's profile was requested with B's token"
  - "tests/shared/identity-transitions.spec.ts asserts the same for a switch from A to B with no sign-out: in this tab, from another tab of the same browser context, while this tab is on the public / route, and while it is on /auth/action, each with a client-side return to /settings"
  - "tests/shared/identity-transitions.spec.ts asserts that account B with no stored preferences (404), after account A stored light, comfy and violet, renders data-theme dark and that B's first appearance change sends a PUT carrying none of A's values, both when A signed out in this tab and when another tab switched to B"
  - "tests/shared/identity-transitions.spec.ts asserts that a profile read, a profile save and a preferences save that A started and that answer after B is signed in never reach B's view or B's stored row, with the preferences save answering both after B's own preferences read and while it is still in flight, and including after a remount of the shell"
  - "tests/shared/identity-transitions.spec.ts asserts that after a direct switch from A to B, B's stored theme and accent apply with no preferences PUT for either account, and that while B's profile request is held the Display name field does not show A's name and Save changes is disabled"
  - "tests/shared/identity-transitions.spec.ts asserts that after a direct switch from A to B on the journal's My journal view, A's trade text is gone and B's trades are requested with B's token"
  - "tests/shared/identity-transitions.spec.ts asserts that after A's gated request answers 401 and the account switches to B, with every gated API request B makes held unanswered, the auth status reads signed-in and the expired-session strip is absent"
  - "tests/shared/identity-transitions.spec.ts asserts that when a tab still showing A changes the theme after another tab signed B in, B's next fresh load renders B's own appearance or the defaults, and A's next sign-in on that browser renders A's changed theme"
  - "tests/shared/identity-transitions.spec.ts asserts that A's appearance, sizing inputs and recent tickers are shown again when A signs back in after B used the same browser, with none of B's values"
  - "tests/shared/identity-transitions.spec.ts starts from a browser holding un-namespaced platform-theme, platform-shell-settings, em.account, em.riskPct and ticker-store recentTickers, signs in an account with no stored preferences, and asserts that the product defaults render, the sizing inputs are empty, no recent ticker is shown, and every one of those un-namespaced values is byte-identical afterwards"
  - "tests/shared/identity-transitions.spec.ts asserts that sizing inputs and recent tickers A entered are not shown to B, that no request carries the sizing inputs, and that the active ticker stays per browser, with B's requests for it carrying B's token"
  - "tests/shared/identity-transitions.spec.ts asserts that when A's I've confirmed check answers after the switch to B and after B confirmed, B's verification banner stays hidden"
  - "tests/landing/landing.spec.ts's existing fence on / passes unchanged on the PR head, and src/lib/authGate.ts imports @tanstack/react-query for types only and imports nothing from src/stores"
  - "the existing open-mode specs that seed platform-shell-settings (tests/shared/navigation.spec.ts and tests/admin/admin-auth.spec.ts) pass unchanged on the PR head"
  - "When the PR opens, a PR comment shows each new e2e test's result on main fab3a52c (or the main the PR is cut from) and the assertion at which it fails there, names the tests that pass on main (the header, account-menu and /auth/action sign-out tests, and the active-ticker assertion), and says where main fails before the mechanism a test isolates (the late preferences save at the missing re-read; the stale-tab write, reproduced on the shared-owner-tag variant 64f583a, while main has neither that tag nor the per-owner keys and its shared-key appearance failure is established separately); the e2e tests save a screenshot of each asserted state on that main and on the PR head with page.screenshot under test-results/, and the comment names the environment (hermetic Playwright, mocked Identity Toolkit and API), the revision and the viewport of each"
  - "The PR diff does not touch tests/shared/auth-gate.spec.ts or tests/shared/mock-mode.spec.ts, and its body does not close solyra#234"
  - "docs/UI-SCREENS.md no longer states that the previous account's cached answers or appearance survive a sign-out or a switch (AUTH-09 at line 1266, SHELL-11 at 1881, the Settings purpose and status at 12745 and 12747, the SETTINGS-08 row at 12784 and its body, flow 4 at 12799, and line 13494), and describes per-account appearance and sizing inputs"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number, and a paired stocks docs PR updates the 03-SITE-TRACEABILITY.md Gaps entry at line 1221"
status: draft
supersedes: null
---

# Keep each account's client state to that account, and keep every account's own

## Problem

Firebase shares the signed-in account across a browser's tabs and never reloads a tab when the
account changes. The app keeps account data in the browser with no owner attached. It drops that
data only when three of the four sign-out buttons run `qc.clear()`.

The evidence is hermetic and synthetic: the real Firebase SDK, a mocked Identity Toolkit and a
mocked API that answers per bearer token. No production exposure is claimed. Each claim below is
placed by where it was actually observed.

**Observed on main `fab3a52c`:**

- **Settings' Sign out (solyra#117).** It calls `firebaseSignOut()` alone
  (`src/routes/SettingsPage.tsx:478`), so the next account sees the previous account's profile.
  The header, account-menu and `/auth/action` sign-out controls pass on main.
- **A switch with no sign-out (#234 items 1 and 4).** After a direct sign-in, another tab, or a
  switch made while this tab is on `/`, the profile, the journal's account-blind trades and the
  mounted Settings form still belong to the previous account. `AuthGate` and `useUser`, the only
  identity listener, are unmounted on public routes.
- **Appearance (#234 item 2).** `platform-theme` and `platform-shell-settings` have no owner. B
  with no stored preferences starts from A's appearance, and B's first change PUTs A's values to
  B's row. This was seen after a same-tab sign-out, and after another tab switched to B (B's PUT
  carried light, comfy and violet).
- **Late profile answers (#234 item 3).** A profile read or save that A started, and that answers
  after B is signed in, lands in B's view.
- **No preferences re-read on a direct switch.** On main, B's preferences are never re-read after a
  direct switch, so B keeps A's appearance. That earlier failure is why the late preferences save
  below could not be isolated on main.
- **Expired-session flag (#270).** The flag (`src/lib/authGate.ts:14`) survives the switch, so B
  sees "Session expired" until B's first gated success.
- **Confirmed record (#270), 1 of 1 run.** It holds one uid (`emailConfirmedFor`,
  `authGate.ts:103-113`). A's I've confirmed check that answers after the switch, and after B
  confirmed, replaces B's record, and B's banner returns. The source trace: `refreshEmailVerified`
  (`firebaseImpl.ts:138-146`) returns the user it refreshed, so `confirmEmailVerified`
  (`AuthStatusIndicator.tsx:220-222`) marks A.
- **Sizing inputs and recent tickers (#234).** The sizing inputs A typed (`em.account`,
  `em.riskPct`) and A's chosen ticker are shown to B. No request carries the sizing inputs. Every
  request for the ticker after the switch carries B's token. The recent-tickers list itself was
  not asserted separately; it is persisted in the same `ticker-store` record (`tickerStore.ts`
  `partialize`).

**Isolated only on the local prototype `2b9d04a`, or on its evidence variants:**

- **Late preferences save (#234 item 3).** A preferences save that A started and that answers after
  B is signed in reaches B's view (3 of 3), and then B's stored row through B's own next PUT. This
  happens when the save answers after B's own preferences read, which needs a shell remount, and
  when it answers while that read is in flight, with no remount (3 of 3 each). On main the earlier
  failure above happens first.
- **Stale-tab writes, a defect of the first draft's design, not of main.** With one owner tag for
  the whole browser (variant `64f583a`), a tab that still shows A writes A's theme under the tag the
  other tab set for B. B's next load shows it (5 of 5). Main has no tag, so this exact sequence
  cannot occur there; main's shared keys are already covered by the appearance failures above.
- **The other-tab appearance leak under that same design (review F-1).** The prototype keeps A's
  appearance in this tab after another tab claims storage for B (3 of 3).

**Checked and not found, on source and the prototype:**

- A stale A callback that starts after B is selected. Every mutate runs synchronously in an
  effect, and the shell unmounts.
- A's request carrying B's token. `authedFetch.ts:226-241` reads the token at send time and
  refuses another account's forced-refresh token.

**Not yet tested anywhere.** These are acceptance controls this spec adds:

- A switch made while this tab is on `/auth/action`.
- The restore of A's own values after B used the browser.
- Isolation of legacy un-namespaced values.
- Recent tickers asserted separately from the active ticker.
- The proposed per-owner storage design. It is not built, and none of its controls has run.

**Coverage.** No approved contract covers this.
- The FEAT-AUTH-001 verify-email spec lists account switches as a non-goal (its lines 53-58).
- Confirm-on-return and the stocks sign-in hardening spec do not reach it.
- REQ-AUTH-001 is the server perimeter.

**The confirmed record specifically.**
- The approved verify-email spec defines it as a "shared, uid-keyed record". Its item that a record
  for A reads not confirmed for B still holds after this change.
- The overwrite after a switch falls under the switch scope that spec excludes.
- Draft #278 r5 names it and assigns it to #270, which this spec covers.
- This spec adds one acceptance item for it and changes no server or verification behaviour.

## Non-goals

- **Server and configuration.** No server, session, revocation, role, Firebase configuration or
  `/api/me` change. This excludes stocks #1317, #1319, #1315 and #1323, `ADMIN_EMAIL`, and solyra
  #266.
- **Other auth modes.** No change to dev, open, local or IAP behaviour. Outside firebase mode every
  value keeps its key and behaviour from main.
- **The landing route.** No change to `/`. The account record is fed only after ConfigGate has
  initialised the SDK.
- **Uid-keyed queries.** None of the account-blind query keys gain a uid. They are reset or removed
  on an account change instead.
- **Deletion and confidentiality.**
  - No deletion of stored preferences, and no eviction.
  - localStorage is not confidential. Nothing here protects stored values from a script on the
    origin, or from anyone who can read the browser profile.
  - Clearing values at sign-out is not part of this change.
- **Per-browser values that stay shared.** The active ticker, the overview chart style, broker CSV
  column presets, the dev mock-mode toggle (`mockMode.ts`, already documented as per-browser) and
  the Lovable preview auth storage.
- **In-memory per-tab UI state.** `reviewDateStore`, and settingsStore's `timeframe`,
  `soundEnabled` and `sidebarCollapsed`, are not persisted and stay as they are.
- **Server sync for sizing inputs.** Seeding the sizing inputs from the profile's `account_size` and
  `risk_per_trade_pct`, or syncing them to the server, is out of scope.
- **Files owned by an open PR.** No change to `tests/shared/auth-gate.spec.ts` or
  `tests/shared/mock-mode.spec.ts` (open PR #311).
- **Closing #234.** This does not close solyra#234.

## Approaches considered

1. **Add `qc.clear()` to Settings' Sign out.** Rejected: it fixes one path of many.
2. **Reload the page on a uid change.** Rejected: localStorage survives a reload, and a switch made
   on a public route is missed.
3. **One owner tag for the whole browser, deleting account-scoped keys when a different uid
   appears.** This was the first draft. Rejected:
   - It cannot attribute a stale tab's write (reproduced 5 of 5).
   - It deletes legacy values and the previous account's values.
4. **One `{owner, value}` slot, or one map key holding every owner.** Rejected:
   - A single slot overwrites the previous owner's record.
   - A map in one key is read, changed and written back by each tab. Two tabs writing for
     different owners can overwrite each other's entries.
5. **Per-owner namespaced keys, written only for this page's own account, read only for the
   current account.** Chosen:
   - A write for one owner never touches another owner's key.
   - A stale tab writes under its own account.
   - Nothing is deleted.

## Design

### The account record

`src/lib/authGate.ts` keeps one account record outside AuthGate:
- `noteSignedInAccount(uid)`, `getSignedInAccount()` and `onAccountChange(cb)`.
- `src/lib/firebaseImpl.ts` `initFirebase` feeds it with
  `onAuthStateChanged(_auth, u => noteSignedInAccount(u?.uid ?? null))`.
- The first report after load is not a change, and neither is a repeat of the same uid.
- On a change, the blocked flag clears first, then the listeners run.

### Per-owner storage

In firebase mode, that is once `initFirebase` has run:
- **Writes.** An account-scoped value is written to `<key>@uid:<uid>`, where the uid is this page's
  own last reported account.
- **Reads.** A read returns only the current account's key.
- **Before the first report.** Nothing account-scoped is read or written, and the product defaults
  render. AuthGate's spinner covers that interval.
- **No deletion.** Nothing removes an `@uid:` key or an un-namespaced key.
- **Outside firebase mode.** The un-namespaced keys are used exactly as on main.

The account-scoped keys are:

| Key | Holds |
|---|---|
| `platform-theme` | Appearance |
| `platform-shell-settings` | Appearance: navPattern, density, accent |
| `em.account`, `em.riskPct` | Personal sizing inputs |
| `ticker-recents` | The account's recent tickers. The active ticker stays in `ticker-store` per browser. |

**Legacy values.** Un-namespaced values written before this ships stay where they are, byte for
byte. In firebase mode they are never read, rendered or applied. In other modes they keep working
as today. A write of the active ticker keeps any `recentTickers` already in `ticker-store`.

### On every account change

- **Stores reload.** The theme, shell settings, sizing inputs and recents reload from the new
  account's own keys, or from the product defaults (dark; top tabs, dense, dawn; empty inputs; no
  recents).
- **Write-through pauses.** Preferences write-through is suspended until the new account's stored
  preferences have hydrated, so no reset value is ever PUT.
- **Queries reset.** `resetAccountQueries(queryClient, next)` removes every `'me'` entry except
  `['me', next]`. It resets every other query, or removes it after a sign-out. It never uses
  `clear()`.

### Write-backs, the confirmed record and the sign-out controls

- **Write-backs.** `useProfile` and `usePreferencesSync` write a save's answer to the cache only
  while the account that rendered them is current.
- **Confirmed record.** `emailConfirmedFor` becomes a per-uid set. Nothing else about verification
  changes.
- **Sign-out controls.** Unchanged. Settings' Sign out is fixed by the account change, and the
  three controls that already call `qc.clear()` keep it.

### Why the shell remounts

The shell remounts on a switch because `AuthGate` renders its spinner while the new account's
`['me', uid]` query loads. That query is always new, because the previous account's entries are
removed.

**Capacity:** n/a. The site runs no workload. Each account change causes one refetch of the
visible queries.

## Risks and tradeoffs

- **Legacy values become invisible in firebase mode.** A firebase-mode account with no stored
  preferences row saw its legacy appearance and sizing inputs before. It now sees the defaults and
  empty inputs until it chooses again. The legacy values are kept, but nothing restores them
  automatically, because an un-namespaced value cannot be attributed to an account. Accounts with
  a server row get their appearance from the server as today.
- **Signed-out and pre-auth screens use the defaults.** In firebase mode they render the defaults,
  not the last account's appearance. A light-theme user sees a dark sign-in screen and spinner
  before their own values apply.
- **Retention.**
  - Every account that signs in on a browser keeps its own small set of keys until browser storage
    is cleared. No eviction or deletion means growth is bounded only by the number of accounts on
    that browser.
  - Key names contain the uid. Firebase already stores the uid on the device.
  - None of this is confidential.
- **Same account in several tabs.** Last write wins per key, as today.
- **Dependence on the shell remount.** The late-answer guards and the mounted-state tests depend on
  it. A future change that cached `['me', uid]` across accounts would break them, and those tests
  would fail.

## Evidence status

Every row is local, on `spike/identity-transitions`, which has not been pushed.

| Area | Status |
|---|---|
| Controls on main and on the earlier prototype | Exist for every e2e item except the `/auth/action` switch, the preservation, legacy-isolation and recents items, which are not yet written. Where each one was observed is stated in Problem. |
| Preferences write-back guard, reset on every change, per-uid confirmed record | Evidence-only variants. They pass their controls. |
| The per-owner storage design | Not built. None of its items has run. |
