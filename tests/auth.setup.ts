/**
 * Interactive sign-in setup for cloud E2E runs.
 *
 * Run once (or whenever cookies expire) to populate tests/.auth/iap-state.json.
 * Subsequent `npm run e2e:cloud` runs reuse that state headlessly.
 *
 *   npm run e2e:cloud:auth      # opens a real browser; sign in
 *   npm run e2e:cloud           # headless tests against the deployed frontend
 *
 * IAP IS NO LONGER IN THIS PATH, and that is a known gap rather than something
 * this file solves. It was written when one Cloud Run service served both the
 * SPA and /api/* behind IAP, so visiting any route triggered an IAP → Google
 * OAuth chain worth capturing. After the #957 split the SPA is published
 * separately (Lovable) and is NOT IAP-gated, while the API is gated per-request
 * by a Firebase ID token that authedFetch attaches from browser auth state.
 *
 * So this setup no longer captures anything that authorizes an API call. Cloud
 * specs covering signed-out views work; anything gated needs a Firebase sign-in
 * strategy that does not exist yet. Deciding that (real credentials vs. the
 * Firebase Auth emulator vs. a minted custom token) is an open question — see
 * solyra#44. Do not read a green `e2e:cloud` as proof that gated routes work.
 */
import { test as setup } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const authFile = path.join(__dirname, '.auth', 'iap-state.json');

setup('capture signed-in browser state', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/dashboard');

  // Wait for a POSITIVE signed-in signal: an element that exists only once the
  // app shell renders. `nav-menu-support` is already this repo's marker for
  // exactly that distinction — tests/shared/auth-gate.spec.ts asserts it is
  // visible when signed in and has count 0 when the gate is up.
  //
  // Three predicates were wrong here before, each in a different way, and all
  // three came from asking a question that cannot separate the two states:
  //
  //   1. `url.host.endsWith('.run.app')` — the SPA host can never match it, so
  //      the step hung for its full timeout.
  //   2. baseURL origin — true on arrival, since Firebase sign-in is
  //      same-origin. Saved signed-out state instantly.
  //   3. `signin-screen` detached — also true on arrival: <AuthGate> renders a
  //      LoadingSpinner while `isLoading`, so SignInScreen has not mounted yet
  //      and Playwright counts an absent element as detached (Codex, solyra#44).
  //
  // The lesson those share: absence is not evidence. Only a positive marker of
  // the signed-in shell settles it, which is what this waits for.
  await page
    .getByTestId('nav-menu-support')
    .waitFor({ state: 'visible', timeout: 5 * 60 * 1000 })
    .catch(() => {
      throw new Error(
        'Sign-in did not complete within 5 minutes: the app shell never rendered, ' +
        'so any storage state saved now would be signed-out and would not ' +
        'authorize a single gated request. Complete the sign-in in the browser ' +
        'this opened, then re-run. Refusing to save.'
      );
    });

  // indexedDB: true is REQUIRED, not a precaution. src/lib/firebaseImpl.ts
  // selects `indexedDBLocalPersistence`, so the signed-in user record lives in
  // IndexedDB; Playwright's default storageState captures cookies and
  // localStorage only. Without this flag the file would be written after a
  // genuinely successful sign-in and still restore a signed-out context
  // (Codex, solyra#44).
  await page.context().storageState({ path: authFile, indexedDB: true });
  // eslint-disable-next-line no-console
  console.log(`[iap-setup] saved SIGNED-IN browser state (incl. IndexedDB) → ${authFile}`);
});
