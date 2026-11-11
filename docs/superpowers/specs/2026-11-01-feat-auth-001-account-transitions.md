---
feat_id: FEAT-AUTH-001
req_ids: [REQ-UX-001, REQ-TENANCY-001]
issues: [117, 234, 270]
canvases: []
done_when:
  - "src/lib/authGate.test.ts asserts that noteSignedInAccount reports no account change for the first report after load or for a repeated report of the same uid, reports A to signed-out, signed-out to B and A to B, and clears the auth-blocked flag on a change but keeps it for a repeated report of the same uid"
  - "src/lib/authGate.test.ts asserts, in per-owner mode, that an account-scoped write made while this page's account is uid A is stored under '<key>@uid:uid-a' and changes no other key; that a read while the account is uid B returns B's own value or nothing, never uid A's value, another owner's value or the un-namespaced value; that while storage is pending nothing account-scoped is read or written; that while this page has no account (before its first report, or signed out) an account-scoped write stores nothing; and that with localStorage unavailable reads return nothing and writes are dropped without an error"
  - "src/lib/authGate.test.ts runs A signed in, A writes, signed out, B signed in, B writes, A signed in again, with un-namespaced legacy values present from the start, and asserts that no localStorage key present at any step is missing or changed at the end except the keys the current owner wrote; and a unit test that scans the source files under src/ (tests excluded, comments stripped) asserts that no file other than src/integrations/supabase/previewAuthStorage.ts calls localStorage.removeItem or localStorage.clear, calls a zustand persist clearStorage, or deletes a localStorage property"
  - "src/lib/authGate.test.ts asserts that in shared mode (the boot settled without initFirebase) and when no ConfigGate has marked storage pending, every account-scoped read and write uses the un-namespaced key exactly as on main, with recentTickers kept inside 'ticker-store', so dev, open, local and IAP behaviour is unchanged; and a new src/components/auth/ConfigGate.test.tsx asserts that the boot marks storage pending before the first ConfigGate's preload starts, settles the mode itself, and that a second ConfigGate mounted after the boot started, a StrictMode re-run of its effects, or a ConfigGate unmounted during its spinner leaves the mode and every stored value unchanged, and that a failed boot leaves storage pending"
  - "store unit tests assert that themeStore, settingsStore (navPattern, density, accent) and tickerStore's recentTickers, in per-owner mode, apply the product defaults when the mode is set and then load the account's own values, or keep the product defaults when it has none, on the first report and on every later account change this page observes; that a store module evaluated after the mode settled, both before and after the first report, holds the same values as one evaluated earlier; that in shared mode they load and apply the un-namespaced values when the boot settles; that a store module evaluated while storage is pending reads no account-scoped key other than 'ticker-store', takes none of that record's recentTickers, and leaves data-theme and the body classes unchanged; that tickerStore's activeTicker stays a per-browser value in 'ticker-store' as on main; that a write of activeTicker keeps any recentTickers already held in 'ticker-store' byte-identical; and src/components/dashboard/MovementRead.test.tsx asserts that SizeCalculator shows the current account's own em.account and em.riskPct, or main's defaults (an empty account size and Risk % 1) when the account has none, and writes its changes only under that account"
  - "src/lib/authGate.test.ts asserts that resetAccountQueries for uid B removes every query keyed under 'me' except ['me', B], empties an account-blind query, discards an account-blind answer that arrives after the call, and after a sign-out leaves no query holding data"
  - "src/lib/authGate.test.ts asserts that the email-confirmed record marked for uid B and then for uid A reads confirmed for both, that marking uid A never clears uid B, and that a record marked for uid A still reads not confirmed for uid B and for no uid"
  - "hook unit tests assert that preferences write-through is suspended from an account change until the new account's stored preferences have hydrated, and that the profile and preferences save write their answer to the cache only while the account that rendered them is still signed in; and src/lib/authedFetch.test.ts and a new src/lib/firebaseImpl.test.ts assert that a write bound to the uid its screen was rendered for (A) sends no request and never reads B's token while the SDK holds B or nobody, that a bound write with no account sends nothing, and that a write bound to A while the SDK holds A, or bound to B while it holds B, sends with that account's own token"
  - "tests/shared/identity-transitions.spec.ts signs account A in, signs out through each of the four controls (Settings Account tab, header, account menu at 390 px, /auth/action Sign in after a password reset), signs account B in and asserts that once B's profile has answered Settings shows B's display name and does not contain A's, and that B's profile was requested with B's token"
  - "tests/shared/identity-transitions.spec.ts asserts the same for a switch from A to B with no sign-out: in this tab, from another tab of the same browser context, while this tab is on the public / route, and while it is on /auth/action, each with a client-side return to /settings"
  - "tests/shared/identity-transitions.spec.ts asserts that account B with no stored preferences (404), after account A stored light, comfy and violet, renders data-theme dark and that B's first appearance change sends a PUT carrying none of A's values, both when A signed out in this tab and when another tab switched to B"
  - "tests/shared/identity-transitions.spec.ts asserts that a profile read, a profile save and a preferences save that A started and that answer after B is signed in never reach B's view or B's stored row, with the preferences save answering both after B's own preferences read and while it is still in flight, and including after a remount of the shell"
  - "tests/shared/identity-transitions.spec.ts asserts that after a direct switch from A to B, B's stored theme and accent apply with no preferences PUT for either account, and that while B's profile request is held the Display name field does not show A's name and Save changes is disabled"
  - "tests/shared/identity-transitions.spec.ts asserts that after a direct switch from A to B on the journal's My journal view, A's trade text is gone and B's trades are requested with B's token"
  - "tests/shared/identity-transitions.spec.ts asserts that after A's gated request answers 401 and the account switches to B, with every gated API request B makes held unanswered, the auth status reads signed-in and the expired-session strip is absent"
  - "tests/shared/identity-transitions.spec.ts asserts that when a tab still showing A changes the theme after another tab signed B in, while this tab's own last account report is still A, B's next fresh load renders B's own appearance or the defaults, and A's next sign-in on that browser renders A's changed theme; the test orders that write by the other tab's signed-in state, not by a storage tag; and tests/shared/sdk-listener-window.spec.ts asserts, with the real SDK, that a preferences change or a profile save made on A's screen sends no request with B's token both while this tab's IndexedDB success event for B's record is delayed (its SDK holds B, its listener has reported only A) and when the save is clicked at this tab's B report before React renders B, that with no switch both go out with A's token, and that a fresh B screen saves its own profile with B's token"
  - "tests/shared/identity-transitions.spec.ts asserts that after B signed in on the same browser and set its own appearance, sizing inputs and recent tickers, each different from A's, A's appearance, sizing inputs and recent tickers are shown again when A signs back in, with none of B's values"
  - "tests/shared/identity-transitions.spec.ts starts from a browser holding un-namespaced platform-theme, platform-shell-settings, em.account, em.riskPct and ticker-store recentTickers, signs in an account with no stored preferences, and asserts that the product defaults render, the account-size input is empty and Risk % shows 1 as on main, no recent ticker is shown, none of those legacy values is shown on ConfigGate's spinner or before the account's first report, and every one of those un-namespaced values is byte-identical afterwards"
  - "tests/shared/identity-transitions.spec.ts asserts that sizing inputs and recent tickers A entered are not shown to B, that no request carries the sizing inputs, and that the active ticker stays per browser, with B's requests for it carrying B's token"
  - "tests/shared/identity-transitions.spec.ts asserts that when A's I've confirmed check answers after the switch to B and after B confirmed, B's verification banner stays hidden"
  - "tests/landing/landing.spec.ts's existing fence on / passes unchanged on the PR head, and src/lib/authGate.ts imports @tanstack/react-query for types only and imports nothing from src/stores"
  - "the existing unit and e2e suites and the solyra CI checks pass on the PR head, including, unchanged, tests/shared/auth-gate.spec.ts, tests/shared/mock-mode.spec.ts, the themeStore, settingsStore and tickerStore unit tests, and the open-mode specs that seed or read platform-shell-settings or ticker-store (tests/shared/navigation.spec.ts, tests/admin/admin-auth.spec.ts, tests/settings/settings.spec.ts, tests/playbook/playbook.spec.ts and tests/charts/charts-cards.spec.ts)"
  - "When the PR opens, a PR comment shows each new e2e test's result on main fab3a52c (or the main the PR is cut from) and the assertion at which it fails there, names every test that passes on main, and says where main fails before the mechanism a test isolates (the late profile save, at the earlier missing profile reset; the late preferences save, at the missing re-read; the same-tab appearance PUT, at the earlier data-theme assertion; the stale-tab write, reproduced on the shared-owner-tag variant 64f583a, while main has neither that tag nor the per-owner keys and its shared-key appearance failure is established separately); the e2e tests save a screenshot of each asserted state on that main and on the PR head with page.screenshot under test-results/, and the comment names the environment (hermetic Playwright, mocked Identity Toolkit and API), the revision and the viewport of each"
  - "The PR diff does not touch tests/shared/auth-gate.spec.ts or tests/shared/mock-mode.spec.ts, and its body does not close solyra#234"
  - "docs/UI-SCREENS.md no longer states that the previous account's cached answers or appearance survive a sign-out or a switch (AUTH-09 at line 1266, SHELL-11 at 1881, the Settings purpose and status at 12745 and 12747, the SETTINGS-08 row at 12784 and its body, flow 4 at 12799, and line 13494), and every statement in it that names where platform-theme, platform-shell-settings, em.account, em.riskPct or recentTickers are persisted says that in firebase mode they are kept per account and in the other modes under the same keys as before, including per-account recent tickers"
  - "02-FEATURE-CATALOG FEAT-AUTH-001 row shows a Status, this PR's date and number, and a paired stocks docs PR updates the 03-SITE-TRACEABILITY.md Gaps entry at line 1221"
status: approved
supersedes: null
---

# Keep each account's client state to that account, and keep every account's own values

## Problem

Firebase shares the signed-in account across a browser's tabs and never reloads a tab when the
account changes. The app keeps account data in the browser with no owner attached. It drops that
data only when three of the four sign-out buttons run `qc.clear()`.

The evidence is hermetic and synthetic: the real Firebase SDK, a mocked Identity Toolkit and a
mocked API that answers per bearer token. No production exposure is claimed. Each claim below is
placed by where it was actually observed. A test that stops at an earlier assertion on main is
not counted as observing the later step.

**Observed on main `fab3a52c`:**

- **Settings' Sign out (solyra#117).** It calls `firebaseSignOut()` alone
  (`src/routes/SettingsPage.tsx:478`), so the next account sees the previous account's profile.
  The header, account-menu and `/auth/action` sign-out controls pass on main.
- **A switch with no sign-out (#234 items 1 and 4).** After a direct sign-in, from another tab,
  and after a switch made while this tab is on `/`, the profile still belongs to the previous
  account. After a direct switch, the mounted Settings form shows A's display name while B's
  profile loads, and the journal sends no trade request for B; those two were run on the direct
  switch only. `AuthGate` and `useUser`, the only identity listener, are unmounted on public
  routes.
- **Appearance (#234 item 2).** `platform-theme` and `platform-shell-settings` have no owner. B
  with no stored preferences starts from A's theme (`data-theme` light) after a same-tab sign-out;
  density and accent were not asserted there. After another tab switched to B, this tab kept A's
  light, comfy and violet, and B's first change PUT them to B's row. In the same-tab
  case the test stops at the earlier `data-theme` assertion, so B's first PUT there was not
  observed.
- **Late profile read (#234 item 3).** A profile read that A started and that answers after B is
  signed in replaces B's view.
- **No preferences re-read on a direct switch.** On main, B's preferences are never re-read after a
  direct switch, so B keeps A's appearance. That earlier failure is why the late preferences save
  below could not be isolated on main.
- **Expired-session flag (#270).** The flag (`src/lib/authGate.ts:14`) survives the switch, so B
  sees "Session expired" with every gated B request held. That it clears at B's first gated
  success is read from source (`authedFetch.ts:188,294`), not observed.
- **Confirmed record (#270), 2 of 2 runs.** It holds one uid (`emailConfirmedFor`,
  `authGate.ts:103-113`). A's I've confirmed check that answers after the switch, and after B
  confirmed, replaces B's record, and B's banner returns. The source trace: `refreshEmailVerified`
  (`firebaseImpl.ts:134-142`) returns the user it refreshed, so `confirmEmailVerified`
  (`AuthStatusIndicator.tsx:220-222`) marks A.
- **Sizing inputs and the active ticker (#234).** The sizing inputs A typed (`em.account`,
  `em.riskPct`) and A's chosen ticker are shown to B. No request carries the sizing inputs. Every
  request for the ticker after the switch carries B's token. The recent-tickers list was not
  asserted separately; it is persisted in the same `ticker-store` record (`tickerStore.ts`
  `partialize`).

**Observed on main `fab3a52c` only with deliberate harness timing (I-1 boundary matrix):**

- **A write sent after this tab's SDK switched to B and before its listener reported B.** The SDK
  (`@firebase/auth` 1.13.5) sets `currentUser` to B, awaits its own IndexedDB write of B, and only
  then notifies auth listeners. `authedFetch.ts:221-229` reads the uid and token at send time, so a
  write sent in that interval carries B's token. The harness delays only the delivery of this tab's
  IndexedDB success event for B's record; the put itself runs and nothing is reordered. With A's
  screen still rendered and this tab's last report still A (a listener on the same SDK instance),
  an Appearance change sent `PUT /api/me/preferences` with B's token and A's values
  (`{"theme":"light","nav_pattern":"sidebar","density":"comfy","accent":"violet"}`), which became
  B's stored row, and a profile Save sent A's edit (`{"display_name":"Alice Edited"}`) to B's
  profile and showed "Saved." Without the delay, the interval from that IndexedDB write to this
  tab's listener measured 0.6 to 1.8 ms in 25 runs, so a user's click inside it was not reproduced.
- **A Save made on A's screen after this tab's listener reported B and before React rendered B.**
  The harness clicks Save from a second listener on the same SDK instance when it reports B, either
  inside that report or in a separate task posted from it; React then rendered B 3.5 to 5.1 ms
  after the report. In both placements A's draft (`{"display_name":"Alice Edited"}`) went out with B's token,
  became B's row, and B's own fresh load showed "Alice Edited". Without placement, the report to
  the first React commit holding B measured 1.5 to 3.0 ms in 15 runs. An Appearance change placed
  the same way sent no request at all, for either account, in either placement; why it was not sent
  was not traced.
- These are harness results, not a user or production reproduction. A fresh screen of the settled
  account B saves with B's token, as expected.

**Isolated only on the local prototype `2b9d04a`, or on its evidence variants:**

- **Late profile save (#234 item 3).** On main B already shows A's profile before the held save is
  released, so the late answer cannot be told apart there. With the prototype's profile write-back
  guard removed, A's late save lands in B's view.
- **Late preferences save (#234 item 3).** A preferences save that A started and that answers after
  B's own preferences read reaches B's view, and then B's stored row through B's own next PUT
  (3 of 3; this order needs a shell remount). The same save answering while B's read is in flight
  reaches B's view with no remount (3 of 3); B's stored row was not checked in that order. On main
  the earlier failure above happens first.
- **Stale-tab writes, a defect of the first draft's design, not of main.** With one owner tag for
  the whole browser (variant `64f583a`), a tab that still shows A writes A's theme under the tag the
  other tab set for B. B's next load shows it (5 of 5). Main has no tag, so this exact sequence
  cannot occur there; main's shared keys are already covered by the appearance failures above.
- **The other-tab appearance leak under that same design (review F-1).** The prototype keeps A's
  appearance in this tab after another tab claims storage for B (3 of 3).

**Checked and not found, on source and the prototype:**

- A stale A callback that starts after B is selected. Every mutate runs synchronously in an
  effect, and the shell unmounts.
- A's request carrying B's token when the request starts while this tab's SDK still holds A.
  `authedFetch.ts:226-241` reads the token at send time and refuses another account's
  forced-refresh token. A request that starts after the SDK switched is the I-1 case above.

**Not yet tested anywhere.** These are acceptance controls this spec adds:

- A switch made while this tab is on `/auth/action`.
- The restore of A's own values after B set different values of its own.
- Isolation of legacy un-namespaced values, including before the first report.
- Recent tickers asserted separately from the active ticker.
- A stale-tab control that does not depend on a storage tag.
- The proposed per-owner storage design. It is not built, and none of its controls has run.

**Coverage.** No approved contract covers this.
- The FEAT-AUTH-001 verify-email spec lists account switches as a non-goal (its lines 53-58).
- Confirm-on-return and the stocks sign-in hardening spec do not reach it.
- REQ-AUTH-001 is the server perimeter.
- solyra#155 reports that no sign-out clears the appearance keys or `solyra-mock-mode`. This spec
  stops the appearance carry-over in firebase mode by keeping each account's values apart, not by
  clearing them, and leaves `solyra-mock-mode` per browser. It does not close #155 and does not
  list it in `issues`.

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
- **Other auth modes.** No change to dev, open, local or IAP behaviour, apart from the spinner and
  config-error screen shown before the boot settles (Design). Outside firebase mode every value
  keeps its key, its default and its behaviour from main.
- **The landing route.** No change to `/`. The account record is fed only after ConfigGate has
  initialised the SDK.
- **Uid-keyed queries.** None of the account-blind query keys gain a uid. They are reset or removed
  on an account change instead.
- **Deletion and confidentiality.**
  - No deletion of stored preferences, and no eviction.
  - localStorage is not confidential. Nothing here protects stored values from a script on the
    origin, or from anyone who can read the browser profile.
  - Clearing values at sign-out is not part of this change.
- **New defaults.** The product defaults stay as on main: dark; top tabs, dense, dawn; an empty
  account size and Risk % 1; no recent tickers.
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
6. **One shared sign-out function for the four controls (#117's suggestion).** Not adopted. The
   account record reacts to every account change, including the switches no control takes part in,
   so the controls need no change. Sharing their bodies would be a refactor with no behavioural
   effect here.

## Design

### The account record

`src/lib/authGate.ts` keeps one account record outside AuthGate:
- `noteSignedInAccount(uid)`, `getSignedInAccount()` and `onAccountChange(cb)`.
- `src/lib/firebaseImpl.ts` `initFirebase` feeds it with
  `onAuthStateChanged(_auth, u => noteSignedInAccount(u?.uid ?? null))`.
- The first report after load is not a change, and neither is a repeat of the same uid. The first
  report does load account-scoped storage (below).
- On a change, the blocked flag clears first, then the listeners run.

`authGate.ts` is already in the entry chunk (`authedFetch.ts` imports it), and it imports nothing
from `src/stores`; the stores import it.

### When account-scoped storage is read

**One boot owns the mode.** `bootOnce` in ConfigGate runs once per page load. When it starts it
marks storage pending, and ConfigGate starts it before it starts its preload, so no store module
can evaluate first. The boot settles the mode itself, not through a ConfigGate instance:
- **Shared** when it resolves without calling `initFirebase`: open, IAP, the dev stub, or a
  firebase config with no web config.
- **Per-owner** when `initFirebase` runs, set before the SDK listener is attached.
- **Failed boot.** Storage stays pending for that page load. Only the config-error screen renders.

Nothing else changes the mark or the mode: not a ConfigGate that mounts after the boot started (a
second route's ConfigGate, a client-side return from `/`, a move from `/auth/action` into the app),
not a StrictMode re-run of its effects, and not a ConfigGate that unmounts during its spinner.

**A store loads the current state.** At module evaluation, and again at each storage event (the
mode settling, the first report, a later account change), a store loads the values for the current
mode and account:
- **Pending.** No account-scoped value is read or applied, and the document is left unchanged.
  The store holds the product defaults in memory, and nothing renders from it. The per-browser
  active ticker still loads (below).
- **Shared.** The un-namespaced values, applied as main's module evaluation does.
- **Per-owner, before the first report or with no account.** The product defaults, applied.
- **Per-owner with a reported account.** That account's own values, or the defaults when it has
  none.

A store that evaluates late, after the mode settled or after the first report, therefore holds what
it would hold had it evaluated earlier.

**Writes use the current state too.** While pending, and in per-owner mode with no account, a write
changes the in-memory value and stores nothing. In shared mode it uses the un-namespaced key as on
main. In per-owner mode with an account it uses that account's key.

With no ConfigGate (a unit test that imports a store directly), storage is shared, as on main. In
the browser every route that loads a store sits under ConfigGate, and `/` loads none.

**Screens outside the app that change.**
- Outside firebase mode, ConfigGate's spinner shows the base appearance until the config arrives.
  On main it showed the stored appearance only when the shell chunk evaluated before the config
  answer.
- In every mode, the config-error screen keeps the base appearance. On main the preloaded chunk
  applied the stored appearance to it whenever the chunk evaluated.
- Outside firebase mode, every screen rendered after the boot settles is unchanged.

### Per-owner storage

In per-owner mode:
- **Writes.** An account-scoped value is written to `<key>@uid:<uid>`, where the uid is this page's
  own last reported account.
- **No account.** Before the first report, and while signed out, a write stores nothing (above).
- **Reads.** A read returns only the current account's key.
- **No deletion.** Nothing removes an `@uid:` key or an un-namespaced key.

The account-scoped values are:

| Value | Shared mode, as on main | Per-owner mode |
|---|---|---|
| Theme | `platform-theme` | `platform-theme@uid:<uid>` |
| navPattern, density, accent | `platform-shell-settings` | `platform-shell-settings@uid:<uid>` |
| Sizing inputs | `em.account`, `em.riskPct` | `em.account@uid:<uid>`, `em.riskPct@uid:<uid>` |
| Recent tickers | `recentTickers` inside `ticker-store` | `ticker-recents@uid:<uid>` |

The active ticker stays in `ticker-store` per browser in every mode and loads at evaluation as on
main, including while storage is pending. Recent tickers held inside `ticker-store` are applied only
in shared mode.

**Legacy values.** Un-namespaced values written before this ships stay where they are, byte for
byte. In per-owner mode they are never read, rendered or applied, including before the first
report. In shared mode they keep working as today. In per-owner mode a write of the active ticker
keeps any `recentTickers` already in `ticker-store`.

**Owners of each value.** `themeStore`, `settingsStore` and `tickerStore` keep their values and
load them as above. `SizeCalculator` in `MovementRead.tsx` keeps owning the sizing inputs. It reads
them through the account-scoped storage for the current state when it mounts and writes through it, and the shell
remount on every account change makes it read them again. No new store is added.

### On every account change

- **Stores reload.** The theme, shell settings and recents load from the new account's own keys,
  or from the product defaults. The sizing inputs follow when `SizeCalculator` remounts.
- **Write-through pauses.** Preferences write-through is suspended until the new account's stored
  preferences have hydrated, so no reset value is ever PUT.
- **Queries reset.** `resetAccountQueries(queryClient, next)` removes every `'me'` entry except
  `['me', next]`. It resets every other query, or removes it after a sign-out. It never uses
  `clear()`.

### Write-backs, the confirmed record and the sign-out controls

- **Write-backs.** `useProfile` and `usePreferencesSync` write a save's answer to the cache only
  while the account that rendered them is current.
- **Sends.** The preferences write-through and the profile save carry the uid of the account
  their screen was rendered for, and are sent only with that account's own token while the SDK still
  holds it. The check and the token read use the same SDK user object. A write composed on A's
  screen after the SDK switched to B, whether or not this page's listener has reported B yet, is
  not sent, its error is shown (a profile save says nothing was saved), and the pause above then
  applies. No other request changes.
- **Confirmed record.** `emailConfirmedFor` becomes a per-uid set. Nothing else about verification
  changes.
- **Sign-out controls.** Unchanged (approach 6). Settings' Sign out is fixed by the account change,
  and the three controls that already call `qc.clear()` keep it.

### Why the shell remounts

The shell remounts on a switch because `AuthGate` renders its spinner while the new account's
`['me', uid]` query loads. That query is always new, because the previous account's entries are
removed.

**Capacity:** n/a. The site runs no workload. Each account change causes one refetch of the
visible queries.

## Risks and tradeoffs

- **Legacy values become invisible in firebase mode.** A firebase-mode account with no stored
  preferences row saw its legacy appearance and sizing inputs before. It now sees the defaults
  (account size empty, Risk % 1) until it chooses again. The legacy values are kept, but nothing
  restores them automatically, because an un-namespaced value cannot be attributed to an account.
  Accounts with a server row get their appearance from the server as today.
- **Signed-out and pre-auth screens use the defaults.** In firebase mode they render the defaults,
  not the last account's appearance. A light-theme user sees a dark sign-in screen and spinner
  before their own values apply. This follows from not attributing values to an account that has
  not reported.
- **Retention.**
  - Every account that signs in on a browser keeps its own small set of keys until browser storage
    is cleared. No eviction or deletion means growth is bounded only by the number of accounts on
    that browser.
  - Key names contain the uid. Firebase already stores the uid on the device.
  - None of this is confidential.
- **Same account in several tabs.** Last write wins per key, as today.
- **Dependence on the shell remount.** The late-answer guards, the sizing inputs and the
  mounted-state tests depend on it. A future change that cached `['me', uid]` across accounts would
  break them, and those tests would fail.

## Evidence status

Every run below is local and hermetic. Nothing on `spike/identity-transitions` has been pushed.

**Executed:**

| Run | Result | Log |
|---|---|---|
| The spike's e2e file (21 cases, plus the warmup project) on main `fab3a52c`, 2026-11-01 18:04:08Z to 18:06:59Z | 16 fail; 5 pass (the header, account-menu and `/auth/action` sign-outs, and two characterisations that only log values); the warmup passes. Where each fails is in Problem. | `main-fab3a52c-r3-full.log` |
| Existing store, `MovementRead` and `authGate` unit tests on main, 18:29:14Z | 5 files, 40 tests pass | `main-fab3a52c-unit-baseline.log` |
| Boundary harness on main `fab3a52c` (14 cases plus warmup), 2026-11-01 | 4 fail: both held-window writes, and the profile Save placed at the B report (both placements), sent A's data with B's token. 10 pass, including the natural timings, the same-account control and the settled-B control | `boundary-evidence/main-fab3a52c-run3.log` |
| The same file on the reported-account check `34eb9bb` + harness `cbf212d` | 2 fail: the profile Save placed at the B report still sent A's edit with B's token | `boundary-evidence/guard-v1-cbf212d-run.log` |
| The same file on the rendered-account check `facde1b` | 14 pass. Its unit tests pass. | `boundary-evidence/guard-v2-facde1b-run.log` |
| The first prototype and its ablations | As in Problem | spike logs |
| Evidence-only variants: preferences write-back guard, reset on every change, per-uid confirmed record | They pass their controls | spike logs |

**Planned, not written or not run:**
- The `/auth/action` switch, the restore after B's own values, legacy isolation including on the
  spinner and before the first report, recents asserted separately.
- A stale-tab control ordered by the other tab's signed-in state. The existing one polls a tag the
  per-owner design does not write.
- The storage-mode unit tests, including late store evaluation, and the new `ConfigGate.test.tsx`.
- The source scan for removal calls.
- The per-owner storage design itself. It is not built, and none of its items has run.
