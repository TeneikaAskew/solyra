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

  // Wait for the SIGN-IN SCREEN TO GO AWAY, which is the only signal that the
  // interactive sign-in actually completed.
  //
  // Two earlier predicates were both wrong, in opposite directions. The
  // original waited for `url.host.endsWith('.run.app')`, which the SPA host can
  // never match, so this step hung for its whole timeout. Replacing it with a
  // baseURL-origin check overcorrected: on a signed-out Firebase deployment
  // <AuthGate> renders <SignInScreen> at the app's own origin, so that
  // predicate is TRUE on arrival and the setup saved signed-out storage state
  // immediately, reporting success while producing a file that authorizes
  // nothing (Codex, solyra#44).
  //
  // Firebase sign-in is same-origin, so URL alone cannot distinguish
  // signed-out from signed-in here. The rendered gate can:
  // SignInScreen carries data-testid="signin-screen", and AuthGate swaps it for
  // the app shell once `useUser` reports a session.
  await page
    .getByTestId('signin-screen')
    .waitFor({ state: 'detached', timeout: 5 * 60 * 1000 })
    .catch(() => {
      throw new Error(
        'Sign-in did not complete within 5 minutes: the sign-in screen is still ' +
        'rendered, so any storage state saved now would be signed-out and would ' +
        'not authorize a single gated request. Complete the sign-in in the ' +
        'browser this opened, then re-run. Refusing to save.'
      );
    });

  await page.context().storageState({ path: authFile });
  // eslint-disable-next-line no-console
  console.log(`[iap-setup] saved SIGNED-IN browser state → ${authFile}`);
});
