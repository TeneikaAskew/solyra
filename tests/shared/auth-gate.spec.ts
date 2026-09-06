/**
 * E2E: the app-level auth gate.
 *
 * The gate only engages in `firebase` auth mode (the public app-login service).
 * In `open`/`iap` mode it's inert and the app renders directly — which is why
 * every other spec (open mode) is unaffected.
 *
 * Real Google/email sign-in needs a live Firebase project, so that path is
 * covered by the staging manual verification, not here. These specs assert the
 * gate's render decision + that the login UI is present in firebase mode.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockCommon } from '../helpers/mocks';

// A well-formed (but fake) Firebase web config — enough for initializeApp() to
// construct without throwing; no network is needed to render the signed-out UI.
const FAKE_FIREBASE = {
  apiKey: 'AIzaSyFAKE-key-for-tests-000000000000000',
  authDomain: 'demo-test.firebaseapp.com',
  projectId: 'demo-test',
  appId: '1:1234567890:web:abcdef0123456789',
};

test.describe('Auth gate', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('open mode → app renders, no login screen', async ({ page }) => {
    await mockCommon(page); // config → { authMode: 'open' }
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // The app shell mounted: /help now lives inside the Support dropdown
    // (navConfig.ts SUPPORT group, menu: true), so there is no bare
    // `a[href="/help"]` until that menu opens. The menu trigger itself is the
    // stable "the nav rendered" signal.
    await expect(page.getByTestId('nav-menu-support')).toBeVisible();
    await expect(page.getByTestId('signin-screen')).toHaveCount(0);
  });

  test('firebase mode, signed out → login screen blocks the app', async ({ page }) => {
    await mockCommon(page);
    // Registered after mockCommon so it wins (Playwright: last route matches first).
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authMode: 'firebase', firebase: FAKE_FIREBASE }),
      }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('signin-screen')).toBeVisible();
    await expect(page.getByTestId('google-signin')).toBeVisible();
    await expect(page.getByTestId('login-email')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeVisible();
    // The app shell must NOT be reachable behind the gate.
    await expect(page.locator('nav a[href="/help"]')).toHaveCount(0);
  });

  // The two boot-failure specs below are the regression fence for issue #5:
  // commit 34588bc (bot edit) once swapped this exact path to a silent
  // fail-open, stripping the auth gate whenever the API was unreachable.
  // main.tsx's header comment forbids that; these make the posture executable.

  test('config fetch failure → config-error screen, app never renders', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('config-error')).toBeVisible();
    // Neither the ungated app shell nor the login screen may appear.
    await expect(page.getByTestId('nav-menu-support')).toHaveCount(0);
    await expect(page.getByTestId('signin-screen')).toHaveCount(0);
  });

  test('config endpoint answering HTML (static-host fallback) → config-error screen', async ({
    page,
  }) => {
    await mockCommon(page);
    // A static host with SPA history-fallback answers /api/* with index.html
    // and a 200 — the shape guard must treat that as a failed boot, not as
    // open mode (confirmed real via HAR, see src/main.tsx).
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html></html>' }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('config-error')).toBeVisible();
    await expect(page.getByTestId('nav-menu-support')).toHaveCount(0);
  });

  test('login screen toggles between sign-in and sign-up', async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/config/firebase', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authMode: 'firebase', firebase: FAKE_FIREBASE }),
      }),
    );

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-submit')).toHaveText(/sign in/i);

    await page.getByTestId('login-toggle').click();
    await expect(page.getByTestId('login-submit')).toHaveText(/create account/i);
  });
});

// ── Email flows: forgot-password + the /auth/action landing page ────────────
//
// These exercise the real Firebase Auth SDK against a MOCKED Identity Toolkit
// backend: every https://identitytoolkit.googleapis.com call the SDK makes is
// intercepted and answered with the documented response shapes, so the
// specs are hermetic while still running the SDK's own request/parse/error
// mapping (auth/expired-action-code etc.) end to end.

async function firebaseMode(page: Page) {
  await mockCommon(page);
  await page.route('**/api/config/firebase', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authMode: 'firebase', firebase: FAKE_FIREBASE }),
    }),
  );
}

interface ItkCall {
  /** e.g. "/v1/accounts:resetPassword" */
  path: string;
  body: Record<string, unknown>;
}
interface ItkReply {
  status: number;
  body: unknown;
}

/** Firebase's REST error envelope; the SDK maps `message` to an auth/* code. */
function itkError(message: string): ItkReply {
  return {
    status: 400,
    body: { error: { code: 400, message, errors: [{ message, domain: 'global', reason: 'invalid' }] } },
  };
}

async function mockIdentityToolkit(page: Page, reply: (call: ItkCall) => ItkReply): Promise<ItkCall[]> {
  const calls: ItkCall[] = [];
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => {
    const req = route.request();
    let body: Record<string, unknown> = {};
    try {
      body = (req.postDataJSON() as Record<string, unknown>) ?? {};
    } catch {
      body = {};
    }
    const call = { path: new URL(req.url()).pathname, body };
    calls.push(call);
    const res = reply(call);
    return route.fulfill({
      status: res.status,
      contentType: 'application/json',
      body: JSON.stringify(res.body),
    });
  });
  return calls;
}

test.describe('Forgot password', () => {
  test('requests a reset link and shows the neutral confirmation', async ({ page }) => {
    await firebaseMode(page);
    const calls = await mockIdentityToolkit(page, () => ({ status: 200, body: { email: 'trader@example.test' } }));

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-forgot').click();
    await expect(page.getByTestId('reset-email')).toBeVisible();
    // The password field and Google button belong to the sign-in view only.
    await expect(page.getByTestId('login-password')).toHaveCount(0);

    await page.getByTestId('reset-email').fill('trader@example.test');
    await page.getByTestId('reset-submit').click();

    const sent = page.getByTestId('reset-sent');
    await expect(sent).toBeVisible();
    await expect(sent).toContainText('trader@example.test');
    await expect(sent).toContainText(/if an account exists/i);

    const oob = calls.find((c) => c.path.endsWith('accounts:sendOobCode'));
    expect(oob?.body).toMatchObject({ requestType: 'PASSWORD_RESET', email: 'trader@example.test' });

    await page.getByTestId('reset-back').click();
    await expect(page.getByTestId('login-submit')).toHaveText(/sign in/i);
  });

  test('a rate-limit failure is shown, not swallowed', async ({ page }) => {
    await firebaseMode(page);
    await mockIdentityToolkit(page, () => itkError('TOO_MANY_ATTEMPTS_TRY_LATER'));

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-forgot').click();
    await page.getByTestId('reset-email').fill('trader@example.test');
    await page.getByTestId('reset-submit').click();

    await expect(page.getByTestId('login-error')).toContainText(/too many attempts/i);
    await expect(page.getByTestId('reset-sent')).toHaveCount(0);
  });
});

test.describe('/auth/action', () => {
  test('a link without a code renders the incomplete-link card and never calls the SDK', async ({ page }) => {
    await firebaseMode(page);
    const calls = await mockIdentityToolkit(page, () => ({ status: 200, body: {} }));

    await page.goto('/auth/action?mode=resetPassword', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('auth-action-invalid')).toBeVisible();
    await expect(page.getByTestId('auth-action-cta')).toHaveAttribute('href', '/dashboard');
    expect(calls).toHaveLength(0);
  });

  test('password reset: verifies the code, validates the form, confirms, succeeds', async ({ page }) => {
    await firebaseMode(page);
    const calls = await mockIdentityToolkit(page, (call) => {
      if (call.path.endsWith('accounts:resetPassword')) {
        return { status: 200, body: { email: 'trader@example.test', requestType: 'PASSWORD_RESET' } };
      }
      return itkError('UNEXPECTED_CALL');
    });

    await page.goto('/auth/action?mode=resetPassword&oobCode=good-code&apiKey=AIzaFAKE&lang=en', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('auth-action-reset-form')).toBeVisible();
    await expect(page.getByTestId('auth-action-email')).toHaveText('trader@example.test');

    // Client-side validation runs before any network call.
    await page.getByTestId('new-password').fill('correct-horse-9');
    await page.getByTestId('confirm-password').fill('different-horse');
    await page.getByTestId('auth-action-submit').click();
    await expect(page.getByTestId('auth-action-form-error')).toContainText(/do not match/i);
    expect(calls.filter((c) => 'newPassword' in c.body)).toHaveLength(0);

    await page.getByTestId('confirm-password').fill('correct-horse-9');
    await page.getByTestId('auth-action-submit').click();

    const success = page.getByTestId('auth-action-success');
    await expect(success).toBeVisible();
    await expect(success).toContainText(/password updated/i);
    await expect(page.getByTestId('auth-action-cta')).toHaveText(/sign in/i);

    const confirm = calls.find((c) => 'newPassword' in c.body);
    expect(confirm?.path.endsWith('accounts:resetPassword')).toBe(true);
    expect(confirm?.body).toMatchObject({ oobCode: 'good-code', newPassword: 'correct-horse-9' });
  });

  test('email verification: applies the code and confirms', async ({ page }) => {
    await firebaseMode(page);
    const calls = await mockIdentityToolkit(page, (call) => {
      if (call.path.endsWith('accounts:resetPassword')) {
        // checkActionCode
        return { status: 200, body: { email: 'trader@example.test', requestType: 'VERIFY_EMAIL' } };
      }
      if (call.path.endsWith('accounts:update')) {
        // applyActionCode
        return { status: 200, body: { email: 'trader@example.test', emailVerified: true } };
      }
      return itkError('UNEXPECTED_CALL');
    });

    await page.goto('/auth/action?mode=verifyEmail&oobCode=verify-code', { waitUntil: 'domcontentloaded' });

    const success = page.getByTestId('auth-action-success');
    await expect(success).toBeVisible();
    await expect(success).toContainText(/email confirmed/i);
    await expect(success).toContainText('trader@example.test');
    expect(calls.some((c) => c.path.endsWith('accounts:update') && c.body.oobCode === 'verify-code')).toBe(true);
  });

  test('an expired link renders the error card with the SDK-mapped reason', async ({ page }) => {
    await firebaseMode(page);
    await mockIdentityToolkit(page, () => itkError('EXPIRED_OOB_CODE'));

    await page.goto('/auth/action?mode=verifyEmail&oobCode=stale', { waitUntil: 'domcontentloaded' });

    const error = page.getByTestId('auth-action-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(/expired/i);
    await expect(page.getByTestId('auth-action-success')).toHaveCount(0);
  });

  test('open mode → email sign-in unavailable card', async ({ page }) => {
    await mockCommon(page); // authMode: open
    await page.goto('/auth/action?mode=verifyEmail&oobCode=x', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('auth-action-unavailable')).toBeVisible();
  });
});
