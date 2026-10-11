---
feat_id: FEAT-AUTH-001
spec: docs/superpowers/specs/2026-10-10-feat-auth-001-verify-email-state.md
branch: feature/feat-auth-001-verify-email-state
pr: null
status: ready
---

# Tell an unverified account why its data does not load: implementation plan

> For agentic workers: use superpowers:executing-plans.
> Every task cites a spec section and the done_when item it advances.

## Task 1: the verification flag and the fetch layer
Spec: § Design, `authGate.ts` and `authedFetch.ts`. Advances done_when[0] and [1].
- [ ] Write the failing tests in `src/lib/authGate.test.ts` (flag keyed by uid, scoped clear) and
      `src/lib/authedFetch.test.ts` (describe "the verify-email 403": marks uid A and clears
      auth-blocked; other details do nothing; a late success for A leaves B's flag; a late
      verification 403, 401 or success for A leaves B's auth-blocked flag; the caller can still
      read the body; `/api/me/preferences` gated, `/api/me` open)
- [ ] Run: `npx vitest run src/lib/authGate.test.ts src/lib/authedFetch.test.ts` (expect FAIL)
- [ ] Implement `markVerificationRequired`, `clearVerificationRequired(uid)`,
      `isVerificationRequired`, `useVerificationRequired` in `src/lib/authGate.ts`; the 403 read
      from `resp.clone()`, `track(resp, uidAtStart, sameAccount)` with `sameAccount` read from
      `getCurrentUid()` when the response returns, and `OPEN_EXACT` in `src/lib/authedFetch.ts`
- [ ] Run again (expect PASS)

## Task 2: the surfaces and the confirm flow
Spec: § Design, `WidgetState.tsx`, `SignInEmptyState.tsx`, `AuthStatusIndicator.tsx`. Advances
done_when[3], [4], [5] and [6].
- [ ] Write the failing tests: `widgetErrorKind` in `src/components/shared/WidgetState.test.ts`;
      `dataGateView` in `src/components/shared/SignInEmptyState.test.ts`;
      `confirmEmailVerified(uid, refresh, queryClient)` and its three outcomes, the refreshed
      user's uid, B marked while A's refresh is pending, and `showVerificationBanner` in
      `src/components/shared/AuthStatusIndicator.test.ts`; the two "Unverified email account"
      tests in `tests/shared/auth-gate.spec.ts`, whose mock API accepts only the token minted by
      the confirm (the server decides from the token's claim)
- [ ] Run them (expect FAIL)
- [ ] Implement `widgetErrorKind` and the `'verify'` branch in `WidgetState`;
      `VerifyEmailEmptyState`, `dataGateView` and `DataGate`; `refreshEmailVerified` returning the
      refreshed user's `{ uid, emailVerified }`; `confirmEmailVerified` returning
      `ConfirmResult`, used by the banner and the empty state with `useUser().uid`; the banner copy
      and its visibility through `showVerificationBanner`
- [ ] Run again (expect PASS), then `npx playwright test tests/shared/auth-gate.spec.ts`

## Task 3: the account switch
Spec: § Design, `AuthGate.tsx`. Advances done_when[2].
- [ ] Write the failing tests in `src/components/auth/AuthGate.test.ts`: `isAccountChange` and
      `reloadOnAccountChange` with a spy reload
- [ ] Run (expect FAIL)
- [ ] Implement both and the effect in `AuthGate`, reloading with `window.location.reload()`
- [ ] Run again (expect PASS)

## Task 4: close
Spec: done_when[7] and [8].
- [ ] Run every new test against `main` and record the failures in the PR body
- [ ] `02-FEATURE-CATALOG.md` FEAT-AUTH-001 row: Status, Last reviewed, this PR in the PRs column
- [ ] `node scripts/docs-audit.mjs` on the branch and on `origin/main`;
      `python3 scripts/gate/spec_gate.py --pr origin/main`
