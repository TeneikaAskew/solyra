/**
 * E2E: client state across Firebase account transitions (FEAT-AUTH-001,
 * docs/superpowers/specs/2026-11-01-feat-auth-001-account-transitions.md,
 * done_when items 9 to 20; #117, #234, #270).
 *
 * Runs the real Firebase Auth SDK against a mocked Identity Toolkit (the same
 * approach as auth-gate.spec.ts) with two accounts, A and B. Every /api call
 * is answered per account from the bearer token it carries, so a response can
 * only be "A's" or "B's" by construction, and the spec can tell which account
 * any value on screen came from. Hermetic and synthetic: no live account,
 * provider or backend, and a pass here is not production acceptance.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { mockAllPages } from '../helpers/fixtures/all';
import { M } from '../helpers/mocks';
import { MOCK_JOURNAL_EMPTY, MOCK_JOURNAL_TRADES } from '@/mocks/journal';

const FAKE_FIREBASE = {
  apiKey: 'AIzaSyFAKE-key-for-tests-000000000000000',
  authDomain: 'demo-test.firebaseapp.com',
  projectId: 'demo-test',
  appId: '1:1234567890:web:abcdef0123456789',
};

type Acct = 'A' | 'B';
const ACCOUNTS: Record<Acct, { uid: string; email: string; token: string; name: string }> = {
  A: { uid: 'uid-a', email: 'a@example.test', token: 'tok-a', name: 'Alice Account' },
  B: { uid: 'uid-b', email: 'b@example.test', token: 'tok-b', name: 'Bea Account' },
};
const PASSWORD = 'correct-horse-9';

interface ApiCall {
  acct: Acct | null;
  method: string;
  path: string;
  body: unknown;
}

interface World {
  calls: ApiCall[];
  /** Per-account stored rows; null = no row (404). */
  profile: Record<Acct, Record<string, unknown> | null>;
  prefs: Record<Acct, Record<string, unknown> | null>;
  /** Hold matching requests until released. */
  hold: (pred: (c: ApiCall) => boolean) => { release: () => void };
  /** Accounts whose gated (non-/api/me) calls answer 401. */
  unauthorized: Set<Acct>;
  /** What accounts:lookup reports as emailVerified (default true). */
  verified: Record<Acct, boolean>;
}

function acctOf(auth: string | undefined): Acct | null {
  if (auth === `Bearer ${ACCOUNTS.A.token}`) return 'A';
  if (auth === `Bearer ${ACCOUNTS.B.token}`) return 'B';
  return null;
}

async function setup(context: BrowserContext, page: Page, world?: Partial<World>): Promise<World> {
  const holds: { pred: (c: ApiCall) => boolean; waiters: (() => void)[]; released: boolean }[] = [];
  const w: World = {
    calls: [],
    profile: { A: { display_name: ACCOUNTS.A.name, account_size: 50_000 }, B: { display_name: ACCOUNTS.B.name } },
    prefs: { A: { theme: 'light', nav_pattern: 'top-tabs', density: 'comfy', accent: 'violet' }, B: null },
    hold: (pred) => {
      const h = { pred, waiters: [] as (() => void)[], released: false };
      holds.push(h);
      return {
        release: () => {
          h.released = true;
          h.waiters.splice(0).forEach((f) => f());
        },
      };
    },
    unauthorized: new Set(),
    verified: { A: true, B: true },
    ...world,
  };

  await mockAllPages(page);
  await page.route('**/api/config/firebase', (r) =>
    r.fulfill(M.ok({ authMode: 'firebase', firebase: FAKE_FIREBASE })),
  );

  await context.route('**/identitytoolkit.googleapis.com/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
    const json = (status: number, b: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(b) });
    if (path.endsWith('accounts:signInWithPassword')) {
      const a = (Object.keys(ACCOUNTS) as Acct[]).find((k) => ACCOUNTS[k].email === body.email);
      if (!a) return json(400, { error: { code: 400, message: 'EMAIL_NOT_FOUND' } });
      const x = ACCOUNTS[a];
      return json(200, { idToken: x.token, email: x.email, refreshToken: `refresh-${a}`, expiresIn: '3600', localId: x.uid });
    }
    if (path.endsWith('accounts:lookup')) {
      const a = (Object.keys(ACCOUNTS) as Acct[]).find((k) => ACCOUNTS[k].token === body.idToken);
      if (!a) return json(400, { error: { code: 400, message: 'INVALID_ID_TOKEN' } });
      const x = ACCOUNTS[a];
      // Recorded and holdable like an API call, so a check can be held open.
      const call: ApiCall = { acct: a, method: 'POST', path: 'identitytoolkit:accounts:lookup', body: null };
      w.calls.push(call);
      for (const h of holds) {
        if (!h.released && h.pred(call)) await new Promise<void>((res) => h.waiters.push(res));
      }
      return json(200, {
        kind: 'identitytoolkit#GetAccountInfoResponse',
        users: [{ localId: x.uid, email: x.email, emailVerified: w.verified[a], providerUserInfo: [], validSince: '1',
          lastLoginAt: String(Date.now()), createdAt: String(Date.now()) }],
      });
    }
    if (path.endsWith('accounts:resetPassword')) {
      return json(200, { email: ACCOUNTS.A.email, requestType: 'PASSWORD_RESET' });
    }
    return json(400, { error: { code: 400, message: 'UNEXPECTED_CALL' } });
  });
  // A forced refresh mints the same token again, so authedFetch's one retry
  // after a 401 is skipped (fresh === token) and the 401 stands.
  await context.route('**/securetoken.googleapis.com/**', (route) => {
    const body = new URLSearchParams(route.request().postData() ?? '');
    const a: Acct = body.get('refresh_token') === 'refresh-B' ? 'B' : 'A';
    const x = ACCOUNTS[a];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: x.token, id_token: x.token, refresh_token: `refresh-${a}`,
        expires_in: '3600', token_type: 'Bearer', user_id: x.uid }),
    });
  });

  // Registered last, so it answers first; everything else falls through to
  // the page fixtures, except a 401 for an account marked unauthorized.
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const acct = acctOf(req.headers()['authorization']);
    let body: unknown = null;
    try { body = req.postDataJSON(); } catch { body = null; }
    const call: ApiCall = { acct, method: req.method(), path, body };
    w.calls.push(call);
    for (const h of holds) {
      if (!h.released && h.pred(call)) await new Promise<void>((res) => h.waiters.push(res));
    }
    if (path === '/api/me') {
      return route.fulfill(M.ok({ email: acct ? ACCOUNTS[acct].email : null, is_admin: false }));
    }
    const open = ['/api/health', '/api/config/firebase', '/api/waitlist'].some((p) => path.startsWith(p));
    if (!open && (!acct || w.unauthorized.has(acct))) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'unauthorized' }) });
    }
    if (path.startsWith('/api/journal/trades/IWM') && req.method() === 'GET') {
      // Account-blind query key on the page: A has one trade, B has none.
      return route.fulfill(M.ok(acct === 'A' ? MOCK_JOURNAL_TRADES : MOCK_JOURNAL_EMPTY));
    }
    if (path === '/api/me/profile' || path === '/api/me/preferences') {
      const table = path.endsWith('profile') ? w.profile : w.prefs;
      if (req.method() === 'PUT') {
        table[acct!] = { ...(table[acct!] ?? {}), ...(body as object) };
        return route.fulfill(M.ok(table[acct!]));
      }
      const row = table[acct!];
      return row ? route.fulfill(M.ok(row)) : route.fulfill(M.notFound());
    }
    return route.fallback();
  });
  return w;
}

async function signInForm(page: Page, a: Acct) {
  await expect(page.getByTestId('signin-screen')).toBeVisible();
  await page.getByTestId('login-email').fill(ACCOUNTS[a].email);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('signin-screen')).toHaveCount(0);
}

/** Switch this tab's Firebase session straight to `a`, with no sign-out in
 *  between: what a tab sees when another tab changes the account. Calls the
 *  app's own facade module (same Vite module instance as the app). */
async function switchDirectly(page: Page, a: Acct) {
  await page.evaluate(async ({ email, password, facade }) => {
    const m = (await import(facade)) as { signInWithEmail: (e: string, p: string) => Promise<unknown> };
    await m.signInWithEmail(email, password);
  }, { email: ACCOUNTS[a].email, password: PASSWORD, facade: '/src/lib/firebase.ts' });
}

/** Client-side navigation (keeps module and query-cache state). */
async function clientNav(page: Page, to: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, to);
}

function section(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });
}

function profileName(page: Page) {
  return section(page, 'Your account');
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: false });
}

const profileGets = (w: World, a: Acct) =>
  w.calls.filter((c) => c.acct === a && c.method === 'GET' && c.path === '/api/me/profile').length;


const prefPuts = (w: World) => w.calls.filter((c) => c.method === 'PUT' && c.path === '/api/me/preferences');

/** A second tab in the same browser context, signed in through the shared
 *  Firebase persistence, with the same per-account API world. */
async function otherTab(context: BrowserContext, w: World): Promise<Page> {
  const other = await context.newPage();
  await setup(context, other, w);
  await other.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(other.getByTestId('sign-out')).toBeVisible({ timeout: 15_000 });
  return other;
}

/** A 404 for any request naming AAPL, MSFT or SPY that no fixture answers,
 *  so nothing leaves the browser. Register BEFORE setup(), so setup's
 *  recorder (registered last) still sees every such call. */
async function blockOtherTickers(page: Page) {
  await page.route(/\/api\/.*(AAPL|MSFT|SPY)/, (r) => r.fulfill(M.notFound()));
}

/** Ticker search and coverage for the two non-quick-pick symbols the tests
 *  add to recents. Register AFTER setup(), so these win over the page
 *  fixtures' empty search answers. */
async function mockTickerSearch(page: Page) {
  await page.route('**/api/insights/ticker/search**', (r) => {
    const q = (new URL(r.request().url()).searchParams.get('keywords') ?? '').toLowerCase();
    const sym = q.startsWith('ms') ? 'MSFT' : 'AAPL';
    return r.fulfill(M.ok({ keywords: q, results: [{ symbol: sym, name: `${sym} Inc`, type: 'Equity',
      region: 'United States', currency: 'USD', match_score: 0.9 }] }));
  });
  await page.route('**/api/market/coverage**', (r) =>
    r.fulfill(M.ok({ coverage: { AAPL: { intraday: false, daily: true }, MSFT: { intraday: false, daily: true } } })),
  );
}

/** The dashboard's movement statement with an expected-move block, so the
 *  sizing calculator renders. Register AFTER setup(), so it wins over the
 *  page fixtures' statement (which has no expected-move block). */
async function mockCalculator(page: Page) {
  await page.route('**/api/movement-statement*', async (r) => {
    const { MOCK_MOVEMENT_STATEMENT } = await import('../helpers/fixtures/dashboard');
    const s = MOCK_MOVEMENT_STATEMENT;
    return r.fulfill(M.ok({ ...s, confidence_modifiers: { ...s.confidence_modifiers, expected_move: {
      status: 'OK', role: 'context', size_class: 'EXPLOSIVE', pred_bucket: 3,
      probabilities: { p_tight: 0.35, p_normal: 0.2, p_expanded: 0.25, p_explosive: 0.2 },
      max_proba: 0.35, model_version: 'magnitude-recal-48njf', ts: '2026-07-10T19:45:00+00:00',
      atr_20: 1.85, current_price: 218.4, usage_guidance: 'context only' } } }));
  });
}

async function openCalculator(page: Page) {
  const calc = page.getByTestId('size-calculator');
  await expect(calc).toBeVisible();
  if ((await calc.getAttribute('open')) === null) await calc.locator('summary').click();
}

async function calculatorValues(page: Page) {
  await openCalculator(page);
  return { account: await page.getByTestId('calc-account').inputValue(), risk: await page.getByTestId('calc-risk').inputValue() };
}

async function setCalculator(page: Page, account: string, risk: string) {
  await openCalculator(page);
  await page.getByTestId('calc-account').fill(account);
  await page.getByTestId('calc-risk').fill(risk);
}

/** Pick a non-quick-pick symbol through search, so it lands in recents. */
async function pickBySearch(page: Page, query: string, sym: string) {
  const trigger = page.getByTestId('ticker-combobox').first();
  await trigger.click();
  await page.getByTestId('ticker-combobox-input').fill(query);
  await expect(page.getByTestId(`ticker-option-${sym}`)).toBeVisible({ timeout: 5000 });
  await page.getByTestId('ticker-combobox-input').press('Enter');
  await expect(trigger).toContainText(sym);
}

async function pickQuick(page: Page, sym: string) {
  const trigger = page.getByTestId('ticker-combobox').first();
  await trigger.click();
  await page.getByTestId(`ticker-option-${sym}`).click();
  await expect(trigger).toContainText(sym);
}

/** The recent chips the combobox shows (quick picks excluded). */
async function recentsShown(page: Page): Promise<string[]> {
  await page.getByTestId('ticker-combobox').first().click();
  const panel = page.getByTestId('ticker-combobox-panel');
  await expect(panel).toBeVisible();
  const recent = panel.locator('div.mb-2').filter({ hasText: /^Recent/ });
  const out = (await recent.count()) ? await recent.locator('button').allInnerTexts() : [];
  await page.keyboard.press('Escape');
  return out.map((t) => t.trim());
}

// ── done_when item 9 ─────────────────────────────────────────────────────────
test.describe('Account transitions: the four sign-out controls (item 9, #117)', () => {
  const paths: { name: string; viewport?: { width: number; height: number }; signOut: (p: Page) => Promise<void> }[] = [
    { name: 'settings', signOut: async (p) => {
      await p.getByRole('tab', { name: 'Account' }).click();
      await section(p, 'Session').getByRole('button', { name: 'Sign out' }).click();
    } },
    { name: 'header', signOut: async (p) => { await p.getByTestId('sign-out').click(); } },
    { name: 'account-menu', viewport: { width: 390, height: 844 }, signOut: async (p) => {
      await p.getByRole('button', { name: 'Open menu' }).click();
      await p.getByTestId('account-menu-sign-out').click();
    } },
    { name: 'auth-action', signOut: async (p) => {
      // The action page's "Sign in" after a password reset: sign out, then
      // route into the gate (AuthActionPage SignOutThenSignIn).
      await clientNav(p, '/auth/action?mode=resetPassword&oobCode=good-code&apiKey=AIzaFAKE&lang=en');
      await p.getByTestId('new-password').fill(PASSWORD);
      await p.getByTestId('confirm-password').fill(PASSWORD);
      await p.getByTestId('auth-action-submit').click();
      await expect(p.getByTestId('auth-action-success')).toBeVisible();
      await p.getByTestId('auth-action-cta').click();
      await expect(p.getByTestId('signin-screen')).toBeVisible();
      await p.getByTestId('login-email').fill(ACCOUNTS.B.email);
      await p.getByTestId('login-password').fill(PASSWORD);
      await p.getByTestId('login-submit').click();
      await expect(p.getByTestId('signin-screen')).toHaveCount(0);
      await clientNav(p, '/settings');
    } },
  ];
  for (const sp of paths) {
    test(`${sp.name} sign-out, then B: Settings shows only B's profile`, async ({ context, page }) => {
      if (sp.viewport) await page.setViewportSize(sp.viewport);
      const w = await setup(context, page);
      await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      await signInForm(page, 'A');
      await expect(profileName(page)).toContainText(ACCOUNTS.A.name);
      await shot(page, `item09-${sp.name}-a-signed-in`);
      await sp.signOut(page);
      if (sp.name !== 'auth-action') await signInForm(page, 'B');
      await expect(profileName(page)).toContainText(ACCOUNTS.B.name);
      await expect(profileName(page)).not.toContainText(ACCOUNTS.A.name);
      await shot(page, `item09-${sp.name}-then-b`);
      expect(profileGets(w, 'B')).toBeGreaterThan(0);
    });
  }
});

// ── done_when item 10 ────────────────────────────────────────────────────────
test.describe('Account transitions: A to B with no sign-out (item 10, #234)', () => {
  async function expectB(page: Page, w: World, name: string) {
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email, { timeout: 15_000 });
    await expect(profileName(page)).toContainText(ACCOUNTS.B.name);
    await expect(profileName(page)).not.toContainText(ACCOUNTS.A.name);
    await shot(page, name);
    expect(profileGets(w, 'B')).toBeGreaterThan(0);
  }

  test('in this tab, on Settings', async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(profileName(page)).toContainText(ACCOUNTS.A.name);
    await switchDirectly(page, 'B');
    await clientNav(page, '/settings');
    await expectB(page, w, 'item10-this-tab');
  });

  test('from another tab of the same browser', async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(profileName(page)).toContainText(ACCOUNTS.A.name);
    const other = await otherTab(context, w);
    await switchDirectly(other, 'B');
    await clientNav(page, '/settings');
    await expectB(page, w, 'item10-other-tab');
  });

  test('while this tab is on the public / route', async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(profileName(page)).toContainText(ACCOUNTS.A.name);
    await clientNav(page, '/');
    await switchDirectly(page, 'B');
    await clientNav(page, '/settings');
    await expectB(page, w, 'item10-public-route');
  });

  test('while this tab is on /auth/action', async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(profileName(page)).toContainText(ACCOUNTS.A.name);
    await clientNav(page, '/auth/action?mode=resetPassword&oobCode=good-code&apiKey=AIzaFAKE&lang=en');
    await expect(page.getByTestId('new-password')).toBeVisible();
    await switchDirectly(page, 'B');
    await clientNav(page, '/settings');
    await expectB(page, w, 'item10-auth-action');
  });
});

// ── done_when item 11 ────────────────────────────────────────────────────────
test.describe('Account transitions: B with no stored preferences (item 11)', () => {
  async function bFirstChangeCarriesNoA(page: Page, w: World, name: string) {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await shot(page, `${name}-b-dark`);
    await clientNav(page, '/settings');
    await page.getByRole('tab', { name: 'Appearance' }).click();
    const nav = section(page, 'Navigation');
    const onTabs = (await nav.getByRole('radio', { name: /^tabs$/i }).getAttribute('aria-checked')) === 'true';
    await nav.getByRole('radio', { name: onTabs ? /sidebar/i : /^tabs$/i }).click();
    await expect.poll(() => prefPuts(w).filter((c) => c.acct === 'B').length).toBeGreaterThan(0);
    const put = prefPuts(w).find((c) => c.acct === 'B')!.body as Record<string, unknown>;
    await shot(page, `${name}-b-first-change`);
    expect(put.theme).not.toBe('light');
    expect(put.density).not.toBe('comfy');
    expect(put.accent).not.toBe('violet');
  }

  test('after A signed out in this tab', async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByTestId('sign-out').click();
    await signInForm(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await bFirstChangeCarriesNoA(page, w, 'item11-same-tab');
  });

  test('after another tab switched to B', async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const other = await otherTab(context, w);
    await switchDirectly(other, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email, { timeout: 15_000 });
    await bFirstChangeCarriesNoA(page, w, 'item11-other-tab');
  });
});

// ── done_when item 12 ────────────────────────────────────────────────────────
test.describe("Account transitions: A's requests answering after B (item 12)", () => {
  test("a profile read A started never reaches B's view", async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    const held = w.hold((c) => c.acct === 'A' && c.method === 'GET' && c.path === '/api/me/profile');
    await clientNav(page, '/settings');
    await expect.poll(() => w.calls.some((c) => c.acct === 'A' && c.path === '/api/me/profile')).toBe(true);
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    held.release();
    await expect(profileName(page)).toContainText(ACCOUNTS.B.name);
    await page.waitForTimeout(500);
    await shot(page, 'item12-late-a-profile-read');
    await expect(profileName(page)).not.toContainText('Alice');
  });

  test("a profile save A started never reaches B's view or B's row", async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(profileName(page)).toContainText(ACCOUNTS.A.name);
    const held = w.hold((c) => c.acct === 'A' && c.method === 'PUT' && c.path === '/api/me/profile');
    await page.getByLabel('Display name').fill('Alice Renamed');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect.poll(() => w.calls.some((c) => c.acct === 'A' && c.method === 'PUT')).toBe(true);
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await expect(profileName(page)).toContainText(ACCOUNTS.B.name);
    held.release();
    await page.waitForTimeout(500);
    await shot(page, 'item12-late-a-profile-save');
    await expect(profileName(page)).not.toContainText('Alice');
    await expect(profileName(page)).toContainText(ACCOUNTS.B.name);
    expect(w.profile.B).toEqual({ display_name: ACCOUNTS.B.name });
  });

  test("a preferences save A started, answering after B's own read, never reaches B, including after a shell remount", async ({ context, page }) => {
    const w = await setup(context, page);
    w.prefs.B = { theme: 'dark', nav_pattern: 'top-tabs', density: 'dense', accent: 'teal' };
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const held = w.hold((c) => c.acct === 'A' && c.method === 'PUT' && c.path === '/api/me/preferences');
    await page.getByRole('tab', { name: 'Appearance' }).click();
    await section(page, 'Navigation').getByRole('radio', { name: /sidebar/i }).click();
    await expect.poll(() => prefPuts(w).filter((c) => c.acct === 'A').length).toBe(1);
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await expect(page.locator('body')).toHaveClass(/accent-teal/);
    held.release();
    await page.waitForTimeout(500);
    // Remount the shell inside the preferences staleTime.
    await clientNav(page, '/');
    await clientNav(page, '/settings');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await page.waitForTimeout(500);
    await shot(page, 'item12-late-a-prefs-after-b-read-remount');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveClass(/accent-teal/);
    // B's next change carries none of A's values to B's row.
    await page.getByRole('tab', { name: 'Appearance' }).click();
    const nav = section(page, 'Navigation');
    const onTabs = (await nav.getByRole('radio', { name: /^tabs$/i }).getAttribute('aria-checked')) === 'true';
    await nav.getByRole('radio', { name: onTabs ? /sidebar/i : /^tabs$/i }).click();
    await expect.poll(() => prefPuts(w).filter((c) => c.acct === 'B').length).toBeGreaterThan(0);
    const bPut = prefPuts(w).filter((c) => c.acct === 'B').at(-1)!.body as Record<string, unknown>;
    expect(bPut).toMatchObject({ theme: 'dark', accent: 'teal', density: 'dense' });
    expect(w.prefs.B).toMatchObject({ theme: 'dark', accent: 'teal', density: 'dense' });
  });

  test("the same preferences save answering while B's read is in flight never reaches B, including after a shell remount", async ({ context, page }) => {
    const w = await setup(context, page);
    w.prefs.B = { theme: 'dark', nav_pattern: 'top-tabs', density: 'dense', accent: 'teal' };
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const heldA = w.hold((c) => c.acct === 'A' && c.method === 'PUT' && c.path === '/api/me/preferences');
    const heldB = w.hold((c) => c.acct === 'B' && c.method === 'GET' && c.path === '/api/me/preferences');
    await page.getByRole('tab', { name: 'Appearance' }).click();
    await section(page, 'Navigation').getByRole('radio', { name: /sidebar/i }).click();
    await expect.poll(() => prefPuts(w).filter((c) => c.acct === 'A').length).toBe(1);
    await switchDirectly(page, 'B');
    await expect.poll(() => w.calls.some((c) => c.acct === 'B' && c.method === 'GET' && c.path === '/api/me/preferences')).toBe(true);
    heldA.release();
    await page.waitForTimeout(300);
    await shot(page, 'item12-late-a-prefs-during-b-read');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
    heldB.release();
    await expect(page.locator('body')).toHaveClass(/accent-teal/);
    await clientNav(page, '/');
    await clientNav(page, '/settings');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await page.waitForTimeout(500);
    await shot(page, 'item12-late-a-prefs-during-b-read-remount');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveClass(/accent-teal/);
    expect(w.prefs.B).toEqual({ theme: 'dark', nav_pattern: 'top-tabs', density: 'dense', accent: 'teal' });
  });
});

// ── done_when item 13 ────────────────────────────────────────────────────────
test.describe('Account transitions: state held by mounted components (item 13)', () => {
  test("direct switch: B's stored theme and accent apply, and no preferences PUT is sent", async ({ context, page }) => {
    const w = await setup(context, page);
    w.prefs.B = { theme: 'light', nav_pattern: null, density: null, accent: 'teal' };
    w.prefs.A = { theme: 'dark', nav_pattern: 'top-tabs', density: 'comfy', accent: 'violet' };
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.locator('body')).toHaveClass(/accent-violet/);
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveClass(/accent-teal/);
    await page.waitForTimeout(500);
    await shot(page, 'item13-direct-switch-b-appearance');
    expect(prefPuts(w)).toEqual([]);
  });

  test("direct switch while B's profile is held: A's name is not shown and Save is disabled", async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(profileName(page)).toContainText(ACCOUNTS.A.name);
    const held = w.hold((c) => c.acct === 'B' && c.method === 'GET' && c.path === '/api/me/profile');
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await shot(page, 'item13-b-profile-held');
    await expect(page.getByLabel('Display name')).not.toHaveValue(ACCOUNTS.A.name);
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    held.release();
    await expect(profileName(page)).toContainText(ACCOUNTS.B.name);
  });
});

// ── done_when item 14 ────────────────────────────────────────────────────────
test.describe('Account transitions: account-blind cached answers (item 14)', () => {
  test("direct switch on My journal: A's trade text leaves and B's trades are requested with B's token", async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/journal', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await page.getByRole('button', { name: 'My journal' }).click();
    await expect(page.getByText(/breakout above pd high/i).first()).toBeVisible();
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await expect.poll(() => w.calls.some((c) => c.acct === 'B' && c.path.startsWith('/api/journal/trades/IWM'))).toBe(true);
    await page.getByRole('button', { name: 'My journal' }).click();
    await shot(page, 'item14-direct-switch-journal');
    await expect(page.getByText(/breakout above pd high/i)).toHaveCount(0);
  });
});

// ── done_when item 15 ────────────────────────────────────────────────────────
test.describe('Account transitions: expired-session flag (item 15, #270)', () => {
  test("A's 401, then B with every gated request held: signed-in, no expired strip", async ({ context, page }) => {
    const w = await setup(context, page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    w.unauthorized.add('A');
    await clientNav(page, '/journal');
    await expect(page.getByTestId('auth-status')).toHaveAttribute('data-status', 'blocked');
    w.hold((c) => c.acct === 'B' && c.path.startsWith('/api/') && c.path !== '/api/me');
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await shot(page, 'item15-a401-then-b');
    await expect(page.getByTestId('auth-status')).toHaveAttribute('data-status', 'signed-in');
    await expect(page.getByTestId('auth-status-banner')).toHaveCount(0);
  });
});

// ── done_when item 16 (identity-transitions half) ────────────────────────────
test.describe('Account transitions: a stale tab still showing A (item 16)', () => {
  test("A's theme change after another tab signed B in stays A's: B's fresh load is B's, A's next sign-in is A's", async ({ context, page }) => {
    const w = await setup(context, page);
    w.prefs.A = { theme: 'dark', nav_pattern: 'top-tabs', density: 'comfy', accent: 'violet' };
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.locator('body')).toHaveClass(/accent-violet/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const other = await otherTab(context, w);
    await other.getByTestId('sign-out').click();
    await signInForm(other, 'B');
    // Ordered by the other tab's signed-in state: B is signed in there.
    await expect(other.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    const atClick = await page.evaluate(() => {
      const status = document.querySelector('[data-testid="auth-status"]')?.textContent ?? '';
      (document.querySelector('button[aria-label="Switch to light theme"]') as HTMLButtonElement | null)?.click();
      return { thisTabStillA: status.includes('a@example.test') };
    });
    await shot(page, 'item16-stale-tab-click');
    expect(atClick.thisTabStillA).toBe(true);
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email, { timeout: 15_000 });
    await page.waitForTimeout(500);
    // B's next fresh load in a new tab of the same browser.
    const third = await context.newPage();
    await setup(context, third, w);
    await third.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(third.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email, { timeout: 15_000 });
    await third.waitForTimeout(500);
    await shot(third, 'item16-b-next-fresh-load');
    await expect(third.locator('html')).toHaveAttribute('data-theme', 'dark');
    // A's next sign-in on that browser renders A's changed theme.
    await third.getByTestId('sign-out').click();
    await signInForm(third, 'A');
    await expect(third.getByTestId('auth-status')).toContainText(ACCOUNTS.A.email);
    await third.waitForTimeout(500);
    await shot(third, 'item16-a-next-sign-in');
    await expect(third.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

// ── done_when item 17 ────────────────────────────────────────────────────────
test.describe("Account transitions: A's own values come back (item 17)", () => {
  test("after B set different appearance, sizing inputs and recents, A's return shows A's values and none of B's", async ({ context, page }) => {
    await blockOtherTickers(page);
    const w = await setup(context, page);
    await mockTickerSearch(page);
    await mockCalculator(page);
    w.prefs.B = { theme: 'dark', nav_pattern: 'top-tabs', density: 'dense', accent: 'teal' };
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await setCalculator(page, '73137', '3.5');
    await pickBySearch(page, 'aa', 'AAPL');
    await pickQuick(page, 'IWM');
    await shot(page, 'item17-a-values');
    await page.getByTestId('sign-out').click();
    await signInForm(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await expect(page.locator('body')).toHaveClass(/accent-teal/);
    await setCalculator(page, '25000', '1.5');
    await pickBySearch(page, 'ms', 'MSFT');
    await pickQuick(page, 'IWM');
    await shot(page, 'item17-b-values');
    await page.getByTestId('sign-out').click();
    await signInForm(page, 'A');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.A.email);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveClass(/accent-violet/);
    await expect(page.locator('body')).toHaveClass(/density-comfy/);
    const calc = await calculatorValues(page);
    const recents = await recentsShown(page);
    await shot(page, 'item17-a-returns');
    expect(calc).toEqual({ account: '73137', risk: '3.5' });
    expect(recents).toContain('AAPL');
    expect(recents).not.toContain('MSFT');
  });
});

// ── done_when item 18 ────────────────────────────────────────────────────────
const LEGACY: Record<string, string> = {
  'platform-theme': 'light',
  'platform-shell-settings': JSON.stringify({ navPattern: 'sidebar', density: 'comfy', accent: 'violet' }),
  'em.account': '88888',
  'em.riskPct': '4.5',
  'ticker-store': JSON.stringify({ state: { activeTicker: 'IWM', recentTickers: ['NVDA'] }, version: 0 }),
};

test.describe('Account transitions: legacy un-namespaced values stay inert (item 18)', () => {
  test('a browser holding legacy values: defaults render for a new account, nothing legacy shows early, every legacy value stays byte-identical', async ({ context, page }) => {
    await page.addInitScript((legacy) => {
      if (sessionStorage.getItem('__legacy_seeded')) return;
      sessionStorage.setItem('__legacy_seeded', '1');
      for (const [k, v] of Object.entries(legacy)) localStorage.setItem(k, v);
    }, LEGACY);
    await blockOtherTickers(page);
    let releaseConfig: () => void = () => {};
    const configHeld = new Promise<void>((res) => { releaseConfig = res; });
    const w = await setup(context, page);
    await mockTickerSearch(page);
    await mockCalculator(page);
    // Hold the config answer so ConfigGate's spinner is on screen.
    await page.route('**/api/config/firebase', async (r) => {
      await configHeld;
      return r.fulfill(M.ok({ authMode: 'firebase', firebase: FAKE_FIREBASE }));
    });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await shot(page, 'item18-config-spinner');
    const onSpinner = { theme: await page.locator('html').getAttribute('data-theme'), body: await page.locator('body').getAttribute('class') };
    releaseConfig();
    // Before any account's first report: the sign-in screen.
    await expect(page.getByTestId('signin-screen')).toBeVisible();
    await shot(page, 'item18-before-first-report');
    const beforeReport = { theme: await page.locator('html').getAttribute('data-theme'), body: await page.locator('body').getAttribute('class') };
    // B has no stored preferences (404).
    await signInForm(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await page.waitForTimeout(500);
    const calc = await calculatorValues(page);
    const recents = await recentsShown(page);
    await shot(page, 'item18-new-account-defaults');
    const after = await page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), Object.keys(LEGACY));
    expect(onSpinner.theme).not.toBe('light');
    expect(onSpinner.body ?? '').not.toMatch(/accent-violet|density-comfy/);
    expect(beforeReport.theme).not.toBe('light');
    expect(beforeReport.body ?? '').not.toMatch(/accent-violet|density-comfy/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).not.toHaveClass(/accent-violet|density-comfy/);
    expect(calc).toEqual({ account: '', risk: '1' });
    expect(recents).not.toContain('NVDA');
    expect(after).toEqual(LEGACY);
    expect(w.calls.some((c) => JSON.stringify(c.body ?? '').includes('88888'))).toBe(false);
  });
});

// ── done_when item 19 ────────────────────────────────────────────────────────
test.describe('Account transitions: sizing inputs, recents and the active ticker (item 19)', () => {
  test("A's sizing inputs and recents are not shown to B, no request carries them, and the active ticker stays per browser with B's token", async ({ context, page }) => {
    await blockOtherTickers(page);
    const w = await setup(context, page);
    await mockTickerSearch(page);
    await mockCalculator(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await setCalculator(page, '73137', '3.5');
    await pickBySearch(page, 'aa', 'AAPL');
    await pickQuick(page, 'SPY');
    await page.waitForTimeout(300);
    await shot(page, 'item19-a-values');
    const before = w.calls.length;
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await page.waitForTimeout(500);
    const shown = (await page.getByTestId('ticker-combobox').first().innerText()).trim();
    const calc = await calculatorValues(page);
    const recents = await recentsShown(page);
    await shot(page, 'item19-b-view');
    const spyCalls = w.calls.slice(before).filter((c) => c.path.includes('SPY'));
    expect(calc).toEqual({ account: '', risk: '1' });
    expect(recents).not.toContain('AAPL');
    expect(w.calls.filter((c) => JSON.stringify(c.body ?? '').includes('73137') || c.path.includes('73137'))).toEqual([]);
    expect(shown).toContain('SPY');
    expect(spyCalls.length).toBeGreaterThan(0);
    expect(spyCalls.every((c) => c.acct === 'B')).toBe(true);
  });
});

// ── done_when item 20 ────────────────────────────────────────────────────────
test.describe('Account transitions: the email-confirmed record (item 20)', () => {
  test("A's I've-confirmed check answering after the switch and after B confirmed keeps B's banner hidden", async ({ context, page }) => {
    const w = await setup(context, page);
    w.verified = { A: false, B: false };
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await signInForm(page, 'A');
    await expect(page.getByTestId('email-verification-banner')).toBeVisible();
    w.verified.A = true;
    const heldA = w.hold((c) => c.acct === 'A' && c.path === 'identitytoolkit:accounts:lookup');
    await page.getByTestId('verification-check').click();
    await expect.poll(() => w.calls.some((c) => c.acct === 'A' && c.path === 'identitytoolkit:accounts:lookup')).toBe(true);
    await switchDirectly(page, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await expect(page.getByTestId('email-verification-banner')).toBeVisible();
    w.verified.B = true;
    await page.getByTestId('verification-check').click();
    await expect(page.getByTestId('email-verification-banner')).toHaveCount(0);
    heldA.release();
    await page.waitForTimeout(1000);
    await shot(page, 'item20-late-a-confirm-after-b');
    await expect(page.getByTestId('email-verification-banner')).toHaveCount(0);
  });
});
