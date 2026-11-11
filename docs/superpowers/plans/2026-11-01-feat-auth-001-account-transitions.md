---
feat_id: FEAT-AUTH-001
spec: docs/superpowers/specs/2026-11-01-feat-auth-001-account-transitions.md
branch: fix/feat-auth-001-account-transitions
pr: 314
status: ready
---

# Account transitions implementation plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans.
> Every task cites a spec section and the done_when item it advances (items numbered 1 to 26 in the order they appear in the spec, done_when[0] to done_when[25]).

## Fixed boundaries for every task

- **Behavior.** It is exactly the approved spec: preserve but isolate.
  - Firebase mode uses per-owner keys `<key>@uid:<uid>`. Nothing is deleted or evicted, and legacy un-namespaced values stay inert and byte-identical.
  - Dev, open, local and IAP modes keep the shared keys, exactly as on main.
  - The active ticker stays per browser, and the query keys stay uid-keyed as `['me', uid]`.
  - No server, session or storage policy changes, and no new product behavior.
- **Protected files.** Never edit `tests/shared/auth-gate.spec.ts` or `tests/shared/mock-mode.spec.ts` (#311, item 24).
- **The lazy `/` route.**
  - Keep the fence: `tests/landing/landing.spec.ts` stays unchanged.
  - `src/lib/authGate.ts` imports only types from `@tanstack/react-query` and nothing from `src/stores` (item 21).
- **Safe validation only.**
  - Vitest units, plus hermetic Playwright through `scripts/e2e-server.mjs` on port 5199 with every `/api` call mocked.
  - Never use `npm run dev` for write paths.
  - Hermetic results are synthetic evidence, not production acceptance.
  - No hook bypass.
- **The prototype is evidence only.** The local `spike/` branches are never merged or cherry-picked; their design is re-derived here under test-first development.
- **Review budget.** This implementation lineage has its own budget, recorded on the PR before any judgment pass. Tests and gates are not judgment passes.

## Task 1: causal baseline, including the Q-3 controls (#313)
Spec: § Problem (observed on main, with harness timing), § Design "Sends". Advances done_when[9] to done_when[19] (test side).
- [ ] Write `tests/shared/identity-transitions.spec.ts` covering items 9 to 20.
  - The stale-tab case is ordered by the other tab's signed-in state, not by a storage tag.
  - Every asserted state is captured with `page.screenshot` into `testInfo.outputPath`.
- [ ] Write `tests/shared/sdk-listener-window.spec.ts` with the real SDK for the held and placed cases and their controls. It adds the Q-3 controls:
  - Case 2 asserts that the click landed before B's first React commit, and fails rather than skips if it did not.
  - The refused profile save shows the account-changed error and never "Saved."
  - The refused preferences write sets the sync status error.
  - For the placed Appearance change, no request carries B's token. The test records whether any request was sent; it does not claim a refusal.
- [ ] Run both on the merge base (main). Expect FAIL. Record each failing assertion for the item 23 comment.
- [ ] Commit: `test(auth): add account-transition boundary e2e tests`

## Task 2: account record
Spec: § Design "The account record". Advances done_when[0], done_when[20].
- [ ] Write failing tests in `src/lib/authGate.test.ts`:
  - The first report after load and a repeated report of the same uid are not changes.
  - A to signed-out, signed-out to B, and A to B are changes.
  - The blocked flag is cleared on a change and kept on a repeat.
  - Import check: types only from react-query, nothing from `src/stores`.
- [ ] Run `npx vitest run src/lib/authGate.test.ts` (expect FAIL).
- [ ] Implement `noteSignedInAccount`, `getSignedInAccount` and `onAccountChange` in `src/lib/authGate.ts`. Feed them from `onAuthStateChanged` in `src/lib/firebaseImpl.ts`.
- [ ] Run again (expect PASS).
- [ ] Commit: `fix(auth): track the signed-in account and its changes`

## Task 3: account-scoped storage with no deletion
Spec: § Design "When account-scoped storage is read", "Per-owner storage". Advances done_when[1], done_when[2], and done_when[3] (shared half).
- [ ] Write failing tests:
  - Pending, shared and per-owner reads and writes.
  - No account means nothing is stored.
  - localStorage unavailable means nothing is returned and writes are dropped.
  - The A, out, B, A sequence leaves every key it found byte-identical.
  - A source scan forbids `removeItem`, `clear`, `clearStorage` and `delete localStorage[...]` outside `src/integrations/supabase/previewAuthStorage.ts`.
  - With no ConfigGate, storage is shared.
- [ ] Implement it in `src/lib/authGate.ts`, keeping its import rule. It has no removal path.
- [ ] Run (expect PASS).
- [ ] Commit: `fix(auth): store account-scoped values per owner without deleting any`

## Task 4: one boot owns the mode
Spec: § Design "One boot owns the mode". Advances done_when[3] (ConfigGate half).
- [ ] Write a failing `src/components/auth/ConfigGate.test.tsx`. It covers:
  - Storage is pending before the first preload starts.
  - The boot settles the mode.
  - A second ConfigGate, a StrictMode re-run, or an unmount during the spinner changes nothing.
  - A failed boot stays pending.
- [ ] In `ConfigGate.tsx`, start the boot effect before the preload effect, and have `bootOnce` own the mode.
- [ ] Run, plus `npx playwright test tests/landing/landing.spec.ts` through the launcher config (expect PASS, with the fence unchanged).
- [ ] Commit: `fix(auth): settle the storage mode in the one boot`

## Task 5: stores load the current state
Spec: § Design "A store loads the current state". Advances done_when[4] (stores) and done_when[21] (existing store tests unchanged).
- [ ] Add failing cases to the existing `themeStore.test.ts`, `settingsStore.test.ts` and `tickerStore.test.ts`. Edit no existing case.
- [ ] Load each store at evaluation and on every storage event. While pending, apply nothing. Keep `activeTicker` per browser in `ticker-store`, with `recentTickers` kept byte-identical there. In per-owner mode the recents live under `ticker-recents@uid:<uid>`.
- [ ] Run all store tests (expect PASS).
- [ ] Commit: `fix(stores): load appearance and recents for the current account`

## Task 6: sizing inputs through account storage
Spec: § Design "Owners of each value". Advances done_when[4] (MovementRead) and done_when[18] (unit side).
- [ ] Add a failing case to `MovementRead.test.tsx`: the account's own `em.account` and `em.riskPct`, or main's defaults (empty, and Risk % 1).
- [ ] Route `SizeCalculator` through account storage.
- [ ] Run (expect PASS, with the existing null-is-not-0% assertions unchanged).
- [ ] Commit: `fix(dashboard): keep sizing inputs per account`

## Task 7: account change resets queries and pauses write-through
Spec: § Design "On every account change". Advances done_when[5] and done_when[7] (pause).
- [ ] Write failing tests for `resetAccountQueries`:
  - Every `'me'` entry except `['me', next]` is removed.
  - Account-blind queries are reset, and a late answer is discarded.
  - Nothing remains after a sign-out.
  - `clear()` is never called.
- [ ] Write a failing hook test for the write-through pause until hydration.
- [ ] Subscribe at the `QueryClient` in `src/App.tsx`. Reload the stores and pause write-through in `usePreferences.ts`.
- [ ] Run (expect PASS).
- [ ] Commit: `fix(auth): reset account queries on an account change`

## Task 8: write-back guards
Spec: § Design "Write-backs". Advances done_when[7] (cache) and done_when[11] (unit side).
- [ ] Write failing hook tests: a profile or preferences save writes its answer to the cache only while the rendering account is still current.
- [ ] Guard `onSuccess` in `useProfile.ts` and `usePreferences.ts`.
- [ ] Run (expect PASS).
- [ ] Commit: `fix(settings): keep a previous account's save out of the cache`

## Task 9: bind sends to the rendered account
Spec: § Design "Sends". Advances done_when[7] (send) and done_when[15] (with Task 1's boundary e2e).
- [ ] Write failing tests in `authedFetch.test.ts` and a new `firebaseImpl.test.ts`:
  - A write bound to A sends nothing, and never reads B's token, while the SDK holds B or nobody.
  - A bound write with no account sends nothing.
  - A bound to A, and B bound to B, each send with their own token.
- [ ] Implement:
  - `getIdTokenFor(uid, force)` checks and reads from one SDK user object.
  - A facade export in `firebase.ts`.
  - `boundToAccount(init, uid)` in `authedFetch.ts`. It applies only in firebase mode, adds no header, and never retries as another account.
  - `useProfile(uid)` and `usePreferencesSync(uid)` take the uid from `useUser().uid` in `SettingsPage.tsx` and `AppShell.tsx`.
- [ ] Run the unit tests, then Task 1's `sdk-listener-window.spec.ts` (expect PASS, including the Q-3 controls).
- [ ] Commit: `fix(auth): send account writes only as the account that rendered them`

## Task 10: per-uid confirmed record
Spec: § Design "Confirmed record". Advances done_when[6] and done_when[19] (unit side).
- [ ] Write failing tests: confirmations for B then A both hold, and a confirmation for A never reads as confirmed for B.
- [ ] Change `emailConfirmedFor` in `authGate.ts` to a `Set<string>`.
- [ ] Run (expect PASS).
- [ ] Commit: `fix(auth): remember email confirmation per account`

## Task 11: end-to-end account transitions pass
Spec: § Problem, § Design. Advances done_when[8] to done_when[19].
- [ ] Run `tests/shared/identity-transitions.spec.ts` and `tests/shared/sdk-listener-window.spec.ts` on this head (expect PASS) and on main (expect the Task 1 failures).
- [ ] Fix only what the failures show. Re-run.
- [ ] Commit, if anything changed: `fix(auth): <what the run showed>`

## Task 12: UI-SCREENS statements
Spec: § Coverage, § Non-goals. Advances done_when[24].
- [ ] Re-grep `platform-theme`, `platform-shell-settings`, `em.account`, `em.riskPct` and `recentTickers` in `docs/UI-SCREENS.md`.
- [ ] Update AUTH-09, SHELL-11, the Settings purpose and status, SETTINGS-08 and its body, flow 4 and line 13494, plus every persistence statement, by auth mode.
- [ ] Commit: `docs(ui-screens): describe per-account storage after sign-in changes`

## Task 13: full suites and protected files
Spec: § Done when. Advances done_when[21], done_when[22], done_when[23].
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run e2e` through the launcher, including the five open-mode specs, `auth-gate.spec.ts` and `mock-mode.spec.ts`, all unchanged.
- [ ] Check that `git diff --stat origin/main...HEAD -- tests/shared/auth-gate.spec.ts tests/shared/mock-mode.spec.ts` is empty, and that the body does not close #234.
- [ ] Post a PR comment with each new e2e test's result on main and on the head, the failing assertion on main, and each screenshot's environment, revision and viewport.

## Task 14: close
Spec: § Done when. Closes done_when[25].
- [ ] Update the 02-FEATURE-CATALOG FEAT-AUTH-001 row: Status, Last reviewed, and this PR in the PRs column.
- [ ] Paired stocks docs PR for the `03-SITE-TRACEABILITY.md` Gaps entry. This is outward work in another repo, done only with authorization.
- [ ] Docs audit reports nothing new over origin/main (`node scripts/docs-audit.mjs`).
- [ ] `python3 scripts/gate/spec_gate.py --pr origin/main`

## Implementation review ledger

**A distinct lineage.** This is the implementation lineage for the approved FEAT-AUTH-001 account-transitions spec. The owner's 21:37:13Z decision on 2026-11-01, relayed with the instruction "Record a distinct implementation review budget before any later implementation judgment", separates it from the spec lineage on #312.

**The spec lineage's history is kept in full on #312.** Five judgment passes were spent there: four aggregate passes and the LOCAL-312-QUAL5 extension. External rounds there: 0 of 2. Its P3s Q-1 to Q-4 are dispositioned on #312, with Q-3 carried here as Task 1 and tracked in #313.

**Allowance recorded for this lineage: the AGENTS.md default.** That is 4 coordinated judgment passes, with at most 2 external code-review rounds.
- Spent so far: 0 aggregate, 0 external.
- No reviewer is requested now.
- A figure the owner sets later replaces this default.
- Each pass is reserved on the PR before it starts. Provider-triggered runs count toward the external limit.
