import { expect, test } from '@playwright/test';

// A well-formed (but fake) Firebase web config — enough for initializeApp() to
// construct without throwing; no network is needed to render the signed-out
// landing page (same fixture as tests/auth-gate.spec.ts).
const FAKE_FIREBASE = {
  apiKey: 'AIzaSyFAKE-key-for-tests-000000000000000',
  authDomain: 'demo-test.firebaseapp.com',
  projectId: 'demo-test',
  appId: '1:1234567890:web:abcdef0123456789',
};

// Landing page smoke — the landing page is the default page at / in every
// auth mode. Hermetic: /api/config/firebase is mocked (open mode) so the
// tests don't depend on a local backend answering the Vite proxy; the
// firebase-mode test below registers its own route, which takes precedence
// (Playwright matches newest-registered routes first).
test.describe('Solyra landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/config/firebase', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ authMode: 'open', firebase: null }) })
    );
  });

  test('renders all key sections at /', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /know why the market moves/i })).toBeVisible();
    await expect(page.getByText('Everything that moves the market. One surface.')).toBeVisible();
    await expect(page.getByText(/charts that show the/i)).toBeVisible();
    await expect(page.getByText('One market day with Solyra.')).toBeVisible();
    await expect(page.getByText('Be there at first light.')).toBeVisible();
    // Public module names only — competitor names must never appear.
    await expect(page.getByText(/heatseeker|flowseeker|skylit/i)).toHaveCount(0);
  });

  test('waitlist form rejects an invalid email with a visible error', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('waitlist-email').fill('not-an-email');
    await page.getByTestId('waitlist-submit').click();
    await expect(page.getByTestId('waitlist-error')).toContainText(/valid email/i);
  });

  // Regression: a mobile-overflow fix once hid `.sl-nav-signin` with
  // `display: none` below 720px, which removed the ONLY route to /dashboard
  // on a phone. Sign in must stay visible and inside the viewport at
  // phone widths, and the nav must not scroll sideways.
  for (const width of [360, 390, 411]) {
    test(`Sign in stays reachable and in-bounds at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const signIn = page.getByRole('link', { name: 'Sign in' });
      await expect(signIn).toBeVisible();
      await expect(signIn).toHaveAttribute('href', '/dashboard');
      const box = await signIn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const cta = page.locator('.sl-nav-cta');
      const ctaBox = await cta.boundingBox();
      expect(ctaBox!.x + ctaBox!.width).toBeLessThanOrEqual(width);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    });
  }

  test('landing renders at / even in firebase auth mode (signed out)', async ({ page }) => {
    // Route contract: `/` is the public LandingPage route (not wrapped by
    // AuthGate — see platform/src/App.tsx), so it must render regardless of
    // auth mode. Registered directly (no mockCommon) since `/` never calls
    // /api/me or /api/live/status; only /api/config/firebase is fetched at
    // boot (platform/src/main.tsx).
    await page.route('**/api/config/firebase', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authMode: 'firebase', firebase: FAKE_FIREBASE }),
      }),
    );
    await page.goto('/');
    await expect(page.getByTestId('landing-page')).toBeVisible();
    await expect(page.getByTestId('signin-screen')).toHaveCount(0);
  });
});
