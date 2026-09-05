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

  // Wait until the browser is back on the app's own origin and off any identity
  // provider. Deliberately compares against baseURL rather than hardcoding
  // `.run.app`: the SPA is no longer served from a Cloud Run host, so that old
  // predicate could never match and this step would have hung for its full
  // five-minute timeout (Codex, solyra#44).
  const appOrigin = new URL(
    setup.info().project.use.baseURL ?? 'https://solyra-stocks.lovable.app'
  ).origin;
  await page.waitForURL(
    (url) => url.origin === appOrigin && !url.pathname.startsWith('/oauth'),
    { timeout: 5 * 60 * 1000 }
  );

  await page.context().storageState({ path: authFile });
  // eslint-disable-next-line no-console
  console.log(`[iap-setup] saved browser state → ${authFile}`);
});
