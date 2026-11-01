/**
 * E2E: account-switch send boundary with the real Firebase SDK (FEAT-AUTH-001,
 * docs/superpowers/specs/2026-11-01-feat-auth-001-account-transitions.md,
 * done_when item 16, second half; Q-3 controls tracked in #313).
 *
 * The contract: a preferences change or a profile save made on A's screen is
 * never sent with B's token, and its refusal is visible; with no switch both
 * go out with A's token, and a settled B screen saves with B's token.
 *
 * Real pieces: the app on this checkout, the installed Firebase Auth SDK, real
 * IndexedDB persistence, a real second tab sharing that IndexedDB, real UI
 * clicks. Mocked: Identity Toolkit, Secure Token and /api (per-token answers).
 * Hermetic and synthetic: the deliberate timing below widens windows the SDK
 * and React open by themselves, and nothing here is a user or production
 * reproduction.
 *
 * Deliberate harness steps:
 *  - "held": in tab 1 only, the success event of the SDK's own IndexedDB put
 *    for B's user record is delivered late. The put runs and commits; only the
 *    SDK's continuation (where it notifies auth listeners) waits until release.
 *    Tab 1's SDK then holds B while its listeners have reported only A.
 *  - "placed": the click is dispatched from a listener registered on the
 *    page's own SDK instance, after the app's, when it reports B: 'sync'
 *    inside that callback, 'task' in a MessageChannel task posted from it. The
 *    test asserts the click landed before React's first commit holding B and
 *    fails (never skips) when it did not.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { mockAllPages } from '../helpers/fixtures/all';
import { M } from '../helpers/mocks';

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

interface ApiCall { tab: string; acct: Acct | null; method: string; path: string; body: unknown }
interface World {
  calls: ApiCall[];
  profile: Record<Acct, Record<string, unknown> | null>;
  prefs: Record<Acct, Record<string, unknown> | null>;
}

function acctOf(auth: string | undefined): Acct | null {
  if (auth === `Bearer ${ACCOUNTS.A.token}`) return 'A';
  if (auth === `Bearer ${ACCOUNTS.B.token}`) return 'B';
  return null;
}

function note(k: string, v: string) {
  test.info().annotations.push({ type: k, description: v });
  console.log(`NOTE ${k}: ${v}`);
}

async function setup(context: BrowserContext, page: Page, tab: string, world?: World): Promise<World> {
  const w: World = world ?? {
    calls: [],
    profile: { A: { display_name: ACCOUNTS.A.name }, B: { display_name: ACCOUNTS.B.name } },
    prefs: { A: { theme: 'light', nav_pattern: 'top-tabs', density: 'comfy', accent: 'violet' }, B: null },
  };
  await mockAllPages(page);
  await page.route('**/api/config/firebase', (r) => r.fulfill(M.ok({ authMode: 'firebase', firebase: FAKE_FIREBASE })));
  if (!world) {
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
        return json(200, {
          kind: 'identitytoolkit#GetAccountInfoResponse',
          users: [{ localId: x.uid, email: x.email, emailVerified: true, providerUserInfo: [], validSince: '1',
            lastLoginAt: String(Date.now()), createdAt: String(Date.now()) }],
        });
      }
      return json(400, { error: { code: 400, message: 'UNEXPECTED_CALL' } });
    });
    await context.route('**/securetoken.googleapis.com/**', (route) => {
      const body = new URLSearchParams(route.request().postData() ?? '');
      const a: Acct = body.get('refresh_token') === 'refresh-B' ? 'B' : 'A';
      const x = ACCOUNTS[a];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        access_token: x.token, id_token: x.token, refresh_token: `refresh-${a}`, expires_in: '3600',
        token_type: 'Bearer', user_id: x.uid }) });
    });
  }
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const acct = acctOf(req.headers()['authorization']);
    let body: unknown = null;
    try { body = req.postDataJSON(); } catch { body = null; }
    w.calls.push({ tab, acct, method: req.method(), path, body });
    if (path === '/api/me') return route.fulfill(M.ok({ email: acct ? ACCOUNTS[acct].email : null, is_admin: false }));
    const open = ['/api/health', '/api/config/firebase', '/api/waitlist'].some((p) => path.startsWith(p));
    if (!open && !acct) {
      return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'unauthorized' }) });
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

/** Tab-1 instrumentation of the SDK's IndexedDB writes (see file header). */
function instrumentIdb() {
  type Entry = { uid: string | null; tPut: number; tSuccess: number | null; tRelease: number | null };
  const H = {
    log: [] as Entry[],
    holdUid: null as string | null,
    held: [] as (() => void)[],
    tAuthB: null as number | null,
    release() { const fs = this.held.splice(0); fs.forEach((f) => f()); return fs.length; },
  };
  (window as unknown as { __fbIdb: typeof H }).__fbIdb = H;
  const origPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    const req = origPut.call(this, value, key);
    if (this.name !== 'firebaseLocalStorage') return req;
    const v = value as { value?: { uid?: string } } | null;
    const entry: Entry = { uid: v?.value?.uid ?? null, tPut: performance.now(), tSuccess: null, tRelease: null };
    H.log.push(entry);
    req.addEventListener('success', () => { entry.tSuccess = performance.now(); });
    if (H.holdUid && entry.uid === H.holdUid) {
      const origAdd = req.addEventListener.bind(req);
      (req as unknown as { addEventListener: typeof req.addEventListener }).addEventListener =
        ((type: string, cb: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
          if (type !== 'success') return origAdd(type, cb, opts);
          origAdd('success', (ev: Event) => {
            H.held.push(() => {
              entry.tRelease = performance.now();
              if (typeof cb === 'function') cb.call(req, ev); else cb.handleEvent(ev);
            });
          }, opts);
        }) as typeof req.addEventListener;
    }
    return req;
  } as typeof IDBObjectStore.prototype.put;
  const watch = () => {
    new MutationObserver(() => {
      if (H.tAuthB === null && document.querySelector('[data-testid="auth-status"]')?.textContent?.includes('b@example.test')) {
        H.tAuthB = performance.now();
      }
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
}

/**
 * Tab-1 boundary instrumentation (cases 2 and 3). Adds no behavior:
 *  - wraps window.fetch BEFORE the app installs authedFetch, so it sees what
 *    authedFetch actually sends (time, Authorization, body);
 *  - installs a minimal React DevTools hook, so each React commit is timed and
 *    the first commit whose hook state holds a watched uid is recorded.
 */
function instrumentBoundary() {
  type Sent = { t: number; method: string; path: string; auth: string | null; body: string | null };
  const B = {
    sent: [] as Sent[],
    commits: [] as number[],
    watchUid: null as string | null,
    tCommitUid: null as number | null,
    /** First time the page showed each save outcome (null: never shown). */
    tNothingSaved: null as number | null,
    tSaved: null as number | null,
  };
  const watchText = () => {
    new MutationObserver(() => {
      const text = document.body?.innerText ?? '';
      if (B.tNothingSaved === null && /Nothing was saved/.test(text)) B.tNothingSaved = performance.now();
      if (B.tSaved === null && /\bSaved\./.test(text)) B.tSaved = performance.now();
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchText); else watchText();
  (window as unknown as { __bnd: typeof B }).__bnd = B;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url, location.origin).pathname;
    if (path.startsWith('/api/me')) {
      B.sent.push({ t: performance.now(), method: (init?.method ?? 'GET').toUpperCase(), path,
        auth: new Headers(init?.headers).get('Authorization'),
        body: typeof init?.body === 'string' ? init.body : null });
    }
    return nativeFetch(input, init);
  }) as typeof fetch;
  type Fiber = { child: Fiber | null; sibling: Fiber | null; memoizedState: unknown };
  const holds = (root: { current: Fiber }, uid: string) => {
    const stack: Fiber[] = [root.current];
    let n = 0;
    while (stack.length && n++ < 50000) {
      const f = stack.pop()!;
      let h = f.memoizedState as { memoizedState?: unknown; next?: unknown } | null;
      let k = 0;
      while (h && typeof h === 'object' && 'next' in h && k++ < 200) {
        if (h.memoizedState === uid) return true;
        h = h.next as typeof h;
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return false;
  };
  (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown }).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    inject() { return 1; },
    checkDCE() {},
    onScheduleFiberRoot() {},
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    onCommitFiberRoot(_id: number, root: { current: Fiber }) {
      const t = performance.now();
      B.commits.push(t);
      if (B.watchUid && B.tCommitUid === null && holds(root, B.watchUid)) B.tCommitUid = t;
    },
  };
}

async function signInForm(page: Page, a: Acct) {
  await expect(page.getByTestId('signin-screen')).toBeVisible();
  await page.getByTestId('login-email').fill(ACCOUNTS[a].email);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('signin-screen')).toHaveCount(0);
}

/** In the OTHER tab: sign `a` in over the current session, through the app's
 *  own facade. This tab's SDK then sees A replaced by B in one poll. */
async function switchDirectly(page: Page, a: Acct) {
  await page.evaluate(async ({ email, password, facade }) => {
    const m = (await import(facade)) as { signInWithEmail: (e: string, p: string) => Promise<unknown> };
    await m.signInWithEmail(email, password);
  }, { email: ACCOUNTS[a].email, password: PASSWORD, facade: '/src/lib/firebase.ts' });
}

async function sdkState(page: Page) {
  return page.evaluate(async (facade) => {
    const m = (await import(facade)) as { getCurrentUid: () => Promise<string | null>; getIdToken: () => Promise<string | null> };
    return { uid: await m.getCurrentUid(), token: await m.getIdToken() };
  }, '/src/lib/firebase.ts');
}

/** A listener on the page's own SDK instance, registered after the app's:
 *  records each report the SDK delivers to auth listeners. */
async function addProbe(page: Page) {
  await page.evaluate(async (facade) => {
    const m = (await import(facade)) as { subscribeAuth: (cb: (u: { uid: string } | null) => void) => () => void };
    type Snap = Record<string, unknown>;
    const w = window as unknown as {
      __probe: { uid: string | null; t: number }[];
      __onReport: { uid: string; mode: 'sync' | 'task'; target: HTMLElement; snap?: Snap; tClick?: number } | null;
      __bnd?: { tCommitUid: number | null };
    };
    w.__probe = [];
    w.__onReport = null;
    const snapshot = (): Snap => ({
      authStatus: document.querySelector('[data-testid="auth-status"]')?.textContent ?? null,
      displayName: (document.querySelector('input[placeholder="Not set"]') as HTMLInputElement | null)?.value ?? null,
      bCommitted: w.__bnd?.tCommitUid != null,
    });
    m.subscribeAuth((u) => {
      w.__probe.push({ uid: u?.uid ?? null, t: performance.now() });
      const a = w.__onReport;
      if (!a || u?.uid !== a.uid) return;
      w.__onReport = null;
      const fire = () => {
        a.snap = { ...snapshot(), targetConnected: a.target.isConnected };
        a.tClick = performance.now();
        a.target.click();
      };
      (window as unknown as { __placed: typeof a }).__placed = a;
      if (a.mode === 'sync') fire();
      else { const ch = new MessageChannel(); ch.port1.onmessage = fire; ch.port2.postMessage(0); }
    });
  }, '/src/lib/firebase.ts');
  await expect.poll(() => lastReport(page)).toBe(ACCOUNTS.A.uid);
}

async function lastReport(page: Page): Promise<string | null | undefined> {
  return page.evaluate(() => (window as unknown as { __probe?: { uid: string | null }[] }).__probe?.at(-1)?.uid);
}

function section(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: false });
}

/** Tab 1 signed in as A on /settings, tab 2 open on the app as A. */
async function twoTabs(context: BrowserContext, page: Page) {
  await page.addInitScript(instrumentIdb);
  await page.addInitScript(instrumentBoundary);
  const w = await setup(context, page, 'tab1');
  await page.goto('/settings', { waitUntil: 'domcontentloaded' });
  await signInForm(page, 'A');
  await expect(section(page, 'Your account')).toContainText(ACCOUNTS.A.name);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await addProbe(page);
  const other = await context.newPage();
  await setup(context, other, 'tab2', w);
  await other.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(other.getByTestId('sign-out')).toBeVisible();
  return { w, other };
}

async function armAndSwitch(page: Page, other: Page) {
  await page.evaluate((uid) => { (window as unknown as { __fbIdb: { holdUid: string } }).__fbIdb.holdUid = uid; }, ACCOUNTS.B.uid);
  await switchDirectly(other, 'B');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __fbIdb: { held: unknown[] } }).__fbIdb.held.length),
    { timeout: 10_000 }).toBeGreaterThan(0);
}

async function release(page: Page) {
  return page.evaluate(() => (window as unknown as { __fbIdb: { release: () => number } }).__fbIdb.release());
}

async function toggleNav(page: Page) {
  await page.getByRole('tab', { name: 'Appearance' }).click();
  const nav = section(page, 'Navigation');
  const onTabs = (await nav.getByRole('radio', { name: /^tabs$/i }).getAttribute('aria-checked')) === 'true';
  await nav.getByRole('radio', { name: onTabs ? /sidebar/i : /^tabs$/i }).click();
}

const puts = (w: World, tab: string, path: string) =>
  w.calls.filter((c) => c.tab === tab && c.method === 'PUT' && c.path === path);

test.describe('Send boundary: SDK switched to B on a tab still showing A (item 16, #313)', () => {
  test('held window: an A-rendered preferences change must not go out with B token', async ({ context, page }) => {
    const { w, other } = await twoTabs(context, page);
    await page.getByRole('tab', { name: 'Appearance' }).click();
    await armAndSwitch(page, other);
    const s = await sdkState(page);
    note('sdk during hold', JSON.stringify(s));
    expect(s).toEqual({ uid: ACCOUNTS.B.uid, token: ACCOUNTS.B.token });
    expect(await lastReport(page)).toBe(ACCOUNTS.A.uid);
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.A.email);
    expect(w.calls.filter((c) => c.tab === 'tab1' && c.acct === 'B')).toEqual([]);
    const before = puts(w, 'tab1', '/api/me/preferences').length;
    await toggleNav(page);
    await page.waitForTimeout(1500);
    await shot(page, 'held-prefs-tab1');
    const during = puts(w, 'tab1', '/api/me/preferences').slice(before);
    expect(during.filter((c) => c.acct === 'B')).toEqual([]);
    // Q-3 (#313): the refusal is visible in the sync status Settings renders.
    await expect(page.getByText(/Appearance not synced/)).toBeVisible();
    note('tab1 preference PUTs during hold', JSON.stringify(during.map((c) => ({ acct: c.acct, body: c.body }))));
    note('B preferences row during hold', JSON.stringify(w.prefs.B));
    note('listener during hold (last report)', String(await lastReport(page)));
    expect(await lastReport(page)).toBe(ACCOUNTS.A.uid);
    note('auth-status text during hold', (await page.getByTestId('auth-status').textContent()) ?? '');
    note('tab1 B-token calls during hold', JSON.stringify(w.calls.filter((c) => c.tab === 'tab1' && c.acct === 'B').map((c) => `${c.method} ${c.path}`)));
    note('released callbacks', String(await release(page)));
    await expect.poll(() => lastReport(page)).toBe(ACCOUNTS.B.uid);
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email, { timeout: 15_000 });
    expect(during.filter((c) => c.acct === 'B')).toEqual([]);
  });

  test('held window: an A-rendered profile save must not go out with B token', async ({ context, page }) => {
    const { w, other } = await twoTabs(context, page);
    const name = page.getByLabel('Display name');
    await name.fill('Alice Edited');
    await armAndSwitch(page, other);
    const s = await sdkState(page);
    note('sdk during hold', JSON.stringify(s));
    expect(s).toEqual({ uid: ACCOUNTS.B.uid, token: ACCOUNTS.B.token });
    expect(await lastReport(page)).toBe(ACCOUNTS.A.uid);
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.A.email);
    await expect(section(page, 'Your account')).toContainText('Alice Edited');
    const before = puts(w, 'tab1', '/api/me/profile').length;
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForTimeout(1500);
    await shot(page, 'held-profile-tab1');
    const during = puts(w, 'tab1', '/api/me/profile').slice(before);
    expect(during.filter((c) => c.acct === 'B')).toEqual([]);
    // Q-3 (#313): the refusal is visible and the bar never says "Saved."
    await expect(page.getByText(/Nothing was saved/)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __bnd: { tSaved: number | null } }).__bnd.tSaved)).toBeNull();
    note('tab1 profile PUTs during hold', JSON.stringify(during.map((c) => ({ acct: c.acct, body: c.body }))));
    note('B profile row during hold', JSON.stringify(w.profile.B));
    note('save bar during hold', (await page.locator('[aria-live="polite"]').last().textContent()) ?? '');
    note('listener during hold (last report)', String(await lastReport(page)));
    expect(await lastReport(page)).toBe(ACCOUNTS.A.uid);
    note('released callbacks', String(await release(page)));
    await expect.poll(() => lastReport(page)).toBe(ACCOUNTS.B.uid);
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email, { timeout: 15_000 });
    expect(during.filter((c) => c.acct === 'B')).toEqual([]);
  });

  test('same-account control: with no switch, A preference change and profile save go out with A token', async ({ context, page }) => {
    const { w } = await twoTabs(context, page);
    const pBefore = puts(w, 'tab1', '/api/me/profile').length;
    await page.getByLabel('Display name').fill('Alice Edited');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    const prof = puts(w, 'tab1', '/api/me/profile').slice(pBefore);
    const before = puts(w, 'tab1', '/api/me/preferences').length;
    await toggleNav(page);
    await expect.poll(() => puts(w, 'tab1', '/api/me/preferences').length).toBeGreaterThan(before);
    const pref = puts(w, 'tab1', '/api/me/preferences').slice(before);
    note('same-account PUTs', JSON.stringify({ profile: prof.map((c) => c.acct), prefs: pref.map((c) => c.acct) }));
    expect(prof.map((c) => c.acct)).toEqual(['A']);
    expect(pref.every((c) => c.acct === 'A')).toBe(true);
    expect(w.profile.A?.display_name).toBe('Alice Edited');
  });

  // ── Case 2: listener reported B, A's render still on screen ─────────────
  // Deliberate placement: a click dispatched from a listener registered on
  // the page's own SDK instance, after the app's listener, when the SDK
  // reports B. 'sync' clicks inside that report callback (before React can
  // render B). 'task' clicks in a separate MessageChannel task posted from it.
  type Placed = { snap: Record<string, unknown>; tClick: number };
  type Bnd = { sent: { t: number; method: string; path: string; auth: string | null; body: string | null }[]; tCommitUid: number | null;
    tNothingSaved: number | null; tSaved: number | null };
  async function placeOnReport(target: ReturnType<Page["locator"]>, mode: 'sync' | 'task') {
    await target.evaluate((el, a) => {
      const w = window as unknown as { __onReport: unknown; __bnd: { watchUid: string } };
      w.__onReport = { uid: a.uid, mode: a.mode, target: el };
      w.__bnd.watchUid = a.uid;
    }, { uid: ACCOUNTS.B.uid, mode });
  }
  async function boundary(page: Page, path: string) {
    return page.evaluate((p) => {
      const w = window as unknown as { __placed?: Placed; __bnd: Bnd; __probe: { uid: string | null; t: number }[] };
      const rep = w.__probe.find((x) => x.uid === 'uid-b');
      const placed = w.__placed ?? null;
      return {
        tReportB: rep?.t ?? null,
        tCommitWithUidB: w.__bnd.tCommitUid,
        placed,
        clickBeforeCommitB: placed ? (w.__bnd.tCommitUid === null || placed.tClick < w.__bnd.tCommitUid) : null,
        nothingSavedShown: placed ? w.__bnd.tNothingSaved !== null && w.__bnd.tNothingSaved >= placed.tClick : null,
        savedShown: placed ? w.__bnd.tSaved !== null && w.__bnd.tSaved >= placed.tClick : null,
        sent: w.__bnd.sent.filter((x) => x.method === 'PUT' && x.path === p && (!placed || x.t >= placed.tClick))
          .map((x) => ({ dtFromClickMs: placed ? x.t - placed.tClick : null, auth: x.auth, body: x.body })),
      };
    }, path);
  }

  // Q-3 (#313) posted-task oracle. Once this page reacts to the B report, the
  // store reload and the query reset (account-change handling the spec
  // requires) render B in the same tick, before any task posted at the report
  // runs. So a posted-task click can no longer reach A's screen: the oracle
  // asserts that explicitly (B committed first, the captured A target already
  // detached) and that nothing was sent and nothing refused, so no save was
  // created. On main the same click landed on A's screen before B's commit and
  // sent with B's token, so main fails this oracle.
  async function expectPostedTaskFoundBOnScreen(page: Page, b: Awaited<ReturnType<typeof boundary>>) {
    expect(b.placed).not.toBeNull();
    expect(b.tCommitWithUidB).not.toBeNull();
    expect(b.clickBeforeCommitB).toBe(false);
    expect(b.placed!.tClick).toBeGreaterThan(b.tCommitWithUidB!);
    expect((b.placed!.snap as { bCommitted: boolean }).bCommitted).toBe(true);
    expect((b.placed!.snap as { targetConnected: boolean }).targetConnected).toBe(false);
    // No request of any token after the click, and no refusal recorded: a
    // bound write is either sent or refused (and a refusal after the switch is
    // always shown), so seeing neither means no save was created.
    expect(b.sent).toEqual([]);
    expect(b.nothingSavedShown).toBe(false);
    expect(b.savedShown).toBe(false);
    await expect(page.getByTestId('account-change-refusal')).toHaveCount(0);
  }

  for (const mode of ['sync', 'task'] as const) {
    test(`case 2 (${mode}): profile Save placed at the B report on A's screen`, async ({ context, page }) => {
      const { w, other } = await twoTabs(context, page);
      await page.getByLabel('Display name').fill('Alice Edited');
      await placeOnReport(page.getByRole('button', { name: 'Save changes' }), mode);
      await switchDirectly(other, 'B');
      await expect.poll(() => lastReport(page)).toBe(ACCOUNTS.B.uid);
      await page.waitForTimeout(1500);
      await shot(page, `case2-${mode}-profile-tab1`);
      const b = await boundary(page, '/api/me/profile');
      note(`case2-${mode}-profile boundary`, JSON.stringify(b));
      const bPuts = puts(w, 'tab1', '/api/me/profile').filter((c) => c.acct === 'B');
      note(`case2-${mode}-profile tab1 B-token PUTs`, JSON.stringify(bPuts.map((c) => c.body)));
      note(`case2-${mode}-profile B row`, JSON.stringify(w.profile.B));
      await other.goto('/settings', { waitUntil: 'domcontentloaded' });
      await expect(other.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
      await expect.poll(async () => other.getByLabel('Display name').inputValue()).not.toBe('');
      note(`case2-${mode}-profile B fresh readback`, await other.getByLabel('Display name').inputValue());
      expect(w.profile.B).toEqual({ display_name: ACCOUNTS.B.name });
      await expect(other.getByLabel('Display name')).toHaveValue(ACCOUNTS.B.name);
      if (mode === 'task') {
        await expectPostedTaskFoundBOnScreen(page, b);
        return;
      }
      expect(b.placed).not.toBeNull();
      // Q-3 (#313): discriminating, not conditional. The click must have landed
      // on A's screen before React's first commit holding B.
      expect(b.clickBeforeCommitB).toBe(true);
      expect((b.placed!.snap as { authStatus: string }).authStatus).toContain(ACCOUNTS.A.email);
      expect((b.placed!.snap as { targetConnected: boolean }).targetConnected).toBe(true);
      expect(b.sent).toEqual([]);
      // The refusal was shown, and "Saved." never was.
      expect(b.savedShown).toBe(false);
      expect(b.nothingSavedShown).toBe(true);
    });

    test(`case 2 (${mode}): Appearance change placed at the B report on A's screen`, async ({ context, page }) => {
      const { w, other } = await twoTabs(context, page);
      await page.getByRole('tab', { name: 'Appearance' }).click();
      const nav = section(page, 'Navigation');
      const onTabs = (await nav.getByRole('radio', { name: /^tabs$/i }).getAttribute('aria-checked')) === 'true';
      await placeOnReport(nav.getByRole('radio', { name: onTabs ? /sidebar/i : /^tabs$/i }), mode);
      await switchDirectly(other, 'B');
      await expect.poll(() => lastReport(page)).toBe(ACCOUNTS.B.uid);
      await page.waitForTimeout(1500);
      await shot(page, `case2-${mode}-prefs-tab1`);
      const b = await boundary(page, '/api/me/preferences');
      note(`case2-${mode}-prefs boundary`, JSON.stringify(b));
      note(`case2-${mode}-prefs B row`, JSON.stringify(w.prefs.B));
      expect(w.prefs.B).toBeNull();
      if (mode === 'task') {
        await expectPostedTaskFoundBOnScreen(page, b);
        return;
      }
      expect(b.placed).not.toBeNull();
      expect(b.clickBeforeCommitB).toBe(true);
      expect((b.placed!.snap as { targetConnected: boolean }).targetConnected).toBe(true);
      expect(b.sent.filter((x) => x.auth === `Bearer ${ACCOUNTS.B.token}`)).toEqual([]);
      // Q-2 limit: whether this placed change sends anything at all was never
      // traced. Recorded, not asserted, and not claimed as a refusal.
      note(`case2-${mode}-prefs requests after the click`, String(b.sent.length));
    });
  }

  // The sync placement's refusal settles after AuthGate has replaced A's
  // screen, so it is shown by AuthGate to the account now on screen. It must
  // carry nothing of A's, never read as saved, and clear on the next account
  // change and on dismiss, across repeated transitions.
  test("case 2 (sync): the refusal notice stays with the account now on screen and clears on the next change", async ({ context, page }) => {
    const { w, other } = await twoTabs(context, page);
    const notice = page.getByTestId('account-change-refusal');
    const cycle = async (to: Acct, label: string) => {
      await page.getByLabel('Display name').fill(`Edited before ${label}`);
      await placeOnReport(page.getByRole('button', { name: 'Save changes' }), 'sync');
      await page.evaluate((uid) => { (window as unknown as { __onReport: { uid: string } }).__onReport.uid = uid; }, ACCOUNTS[to].uid);
      await switchDirectly(other, to);
      await expect.poll(() => lastReport(page)).toBe(ACCOUNTS[to].uid);
      await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS[to].email);
      await expect(notice).toBeVisible();
      await expect(notice).toContainText('Nothing was saved');
      await shot(page, `notice-${label}`);
      const text = (await notice.textContent()) ?? '';
      for (const a of Object.values(ACCOUNTS)) {
        expect(text).not.toContain(a.email);
        expect(text).not.toContain(a.name);
      }
      expect(text).not.toContain(`Edited before ${label}`);
      expect(await page.evaluate(() => (window as unknown as { __bnd: { tSaved: number | null } }).__bnd.tSaved)).toBeNull();
    };
    await cycle('B', 'b1');
    expect(puts(w, 'tab1', '/api/me/profile')).toEqual([]);
    // The next change clears it, and the account now shown starts clean.
    await switchDirectly(other, 'A');
    await expect.poll(() => lastReport(page)).toBe(ACCOUNTS.A.uid);
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.A.email);
    await expect(notice).toHaveCount(0);
    await shot(page, 'notice-cleared-on-change');
    // A second refusal shows it again; a dismiss clears it.
    await expect(section(page, 'Your account')).toContainText(ACCOUNTS.A.name);
    await page.evaluate(() => { const w = window as unknown as { __bnd: { tSaved: number | null; tCommitUid: number | null } }; w.__bnd.tSaved = null; w.__bnd.tCommitUid = null; });
    await cycle('B', 'b2');
    await notice.getByRole('button', { name: 'Dismiss' }).click();
    await expect(notice).toHaveCount(0);
    await shot(page, 'notice-dismissed');
    expect(puts(w, 'tab1', '/api/me/profile')).toEqual([]);
    expect(w.profile.A).toEqual({ display_name: ACCOUNTS.A.name });
    expect(w.profile.B).toEqual({ display_name: ACCOUNTS.B.name });
  });

  // ── Case 3: settled B, valid success ────────────────────────────────────
  test('case 3: a fresh B screen saves its own profile and appearance with B token', async ({ context, page }) => {
    const { w, other } = await twoTabs(context, page);
    await switchDirectly(other, 'B');
    await expect(page.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email, { timeout: 15_000 });
    await other.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(other.getByTestId('auth-status')).toContainText(ACCOUNTS.B.email);
    await expect(other.getByLabel('Display name')).toHaveValue(ACCOUNTS.B.name);
    const before = puts(w, 'tab2', '/api/me/profile').length;
    await other.getByLabel('Display name').fill('Bea Edited');
    await other.getByRole('button', { name: 'Save changes' }).click();
    await expect(other.getByText('Saved.')).toBeVisible();
    const prof = puts(w, 'tab2', '/api/me/profile').slice(before);
    const pBefore = puts(w, 'tab2', '/api/me/preferences').length;
    await toggleNav(other);
    await expect.poll(() => puts(w, 'tab2', '/api/me/preferences').length).toBeGreaterThan(pBefore);
    const pref = puts(w, 'tab2', '/api/me/preferences').slice(pBefore);
    note('case3 PUTs', JSON.stringify({ profile: prof.map((c) => ({ acct: c.acct, body: c.body })), prefs: pref.map((c) => ({ acct: c.acct, body: c.body })) }));
    await other.reload({ waitUntil: 'domcontentloaded' });
    await expect(other.getByLabel('Display name')).toHaveValue('Bea Edited');
    note('case3 readback', JSON.stringify({ profileB: w.profile.B, prefsB: w.prefs.B, profileA: w.profile.A }));
    expect(prof.map((c) => [c.acct, c.body])).toEqual([['B', { display_name: 'Bea Edited' }]]);
    expect(pref.every((c) => c.acct === 'B')).toBe(true);
    expect(w.profile.A?.display_name).toBe(ACCOUNTS.A.name);
  });
});
