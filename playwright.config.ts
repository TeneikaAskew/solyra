import { defineConfig, devices } from '@playwright/test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLOUD_RUN_URL =
  process.env.CLOUD_RUN_URL ?? 'https://trading-platform-5sjtb3yl7a-ue.a.run.app';
const IAP_STATE = path.join(__dirname, 'tests', '.auth', 'iap-state.json');

// ── E2E dev server ────────────────────────────────────────────────────────
// Playwright runs its OWN Vite on a dedicated port, never port 5173.
//
// Why not reuse a running dev server: vite.config.ts resolves the /api proxy
// by probing localhost:8000 and falling back to the deployed STAGING service
// when nothing answers. That fallback is right for a human previewing the app
// (and for Lovable, which has no local backend) but wrong for a test run —
// it makes unmocked endpoints silently succeed against real infrastructure
// instead of failing fast, which is precisely the coverage gap the typed
// fixtures exist to expose. It also puts a cold-starting Cloud Run service
// (min-instances 0) in the path of every navigation, which blew the 30s
// page.goto budget across the suite.
//
// A `reuseExistingServer` here would silently inherit whatever target a
// developer's own `npm run dev` had already resolved to, ignoring the `env`
// below. A separate port with reuse disabled keeps the two fully isolated:
// you can leave `npm run dev` pointed at staging while tests run hermetically.
const E2E_PORT = 5199;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

// The cloud/iap projects talk to Cloud Run directly, so don't pay for a local
// Vite boot on those runs.
const wantsLocalServer = !process.argv.some(
  (a) => a === '--project=cloud' || a === '--project=iap-setup'
);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  // ONE worker, deliberately. `fullyParallel: false` only serializes tests
  // WITHIN a file; separate files still fan out across workers (default: half
  // the cores), and every worker's Chromium hammers the single shared Vite
  // dev server on E2E_PORT. Measured on the same tree, same day (2026-09-01):
  //   default workers: 46 failed / 28 flaky / 87 passed — 218 thirty-second
  //                    timeouts, pages dying during fixture setup
  //   workers: 1     : 18 failed /  5 flaky / 138 passed — timeouts 218 → 64
  // The remaining failures are real and tracked; the fan-out ones were not.
  // Raise this only alongside a dev server that can take the load (or a
  // prebuilt bundle served statically).
  workers: 1,
  timeout: 30_000,
  webServer: wantsLocalServer
    ? {
        command: `npm run dev -- --port ${E2E_PORT} --strictPort`,
        url: E2E_BASE_URL,
        // Never adopt a server this config didn't configure — see the note above.
        reuseExistingServer: false,
        // A cold boot compiles the dep graph, so allow more than the default.
        timeout: 120_000,
        env: {
          ...(process.env as Record<string, string>),
          // Pin the proxy so a test run can never fall through to staging.
          // Points at a local FastAPI: if one is up, integration-style specs
          // hit it for real; if not, unmocked calls fail fast with
          // ECONNREFUSED, which is the honest hermetic behaviour. Override
          // (e.g. VITE_API_PROXY_TARGET=https://…) to aim tests elsewhere on
          // purpose. Deliberately NOT VITE_NO_BACKEND=1 — that flag also
          // installs the open-auth stub for /api/config/firebase, which would
          // shadow a real backend's authMode and 401 every gated call.
          VITE_API_PROXY_TARGET:
            process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
        },
      }
    : undefined,
  projects: [
    // Warms every lazy route against the freshly-booted Vite so the specs'
    // wall-clock budgets measure a warm server rather than a cold transform.
    // A dependency of `chromium` only, so cloud runs never trigger it.
    // The filename deliberately avoids both `*.spec.ts` (the default
    // testMatch) and `*.setup.ts` (the iap-setup project's), so no other
    // project picks it up.
    {
      name: 'warmup',
      testMatch: /routes\.warmup\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: E2E_BASE_URL, ignoreHTTPSErrors: true },
    },
    // Default: local-dev specs against Playwright's own Vite (see E2E_PORT).
    {
      name: 'chromium',
      testIgnore: /\.setup\.ts$/,
      dependencies: ['warmup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: E2E_BASE_URL,
        headless: true,
        // The headless shell lacks system root CAs, so the Montserrat
        // Google-Fonts CDN load throws ERR_CERT and trips the "no console
        // errors" assertions. Accept certs in this mocked local project
        // (does not affect the cloud project, which uses real IAP).
        ignoreHTTPSErrors: true,
      },
    },
    // Interactive: open a real browser, complete Google sign-in, save cookies.
    // Run via `npm run e2e:cloud:auth`. Skipped by the default test command.
    {
      name: 'iap-setup',
      testMatch: /\.setup\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: CLOUD_RUN_URL,
        headless: false,
      },
    },
    // Headless tests against the deployed Cloud Run URL using saved IAP cookies.
    // Run via `npm run e2e:cloud`. Requires `iap-setup` to have run first.
    {
      name: 'cloud',
      testIgnore: /\.setup\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: CLOUD_RUN_URL,
        headless: true,
        storageState: IAP_STATE,
      },
    },
  ],
});
