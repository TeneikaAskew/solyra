import { expect, test, type Page } from '@playwright/test';
import { marketDataForRequest, MOCK_LIVE_QUOTE } from '@/mocks/live';
import { MOCK_MARKET_DATA, MOCK_MARKET_DATES, MOCK_SIMILAR_SETUPS } from '@/mocks/charts';
import { MOCK_SIGNALS } from '@/mocks/signals';
import { M } from '../helpers/mocks';
import { mockInsightsApi, MOCK_INSIGHT_HISTORY, MOCK_WATCHLIST } from '../helpers/fixtures/insights';

const sessionId = '11111111-1111-4111-8111-111111111111';
const messageId = '22222222-2222-4222-8222-222222222222';
const question = 'What catalysts and risks matter most for IWM right now?';
const answer = {
  answer: 'Confirmed CPI catalyst; options positioning remains unavailable.',
  facts: [{ text: 'CPI is inside the review window.', citations: ['S1'] }],
  bullCase: 'Confirmation supports continuation.', bearCase: 'Missing confirmation weakens the setup.',
  invalidation: 'Loss of the cited structural level.', unknowns: ['Options positioning unavailable.'],
  catalystTimeline: [], replayContext: null,
};
const session = { id: sessionId, ticker: 'IWM', mode: 'live', replay_cutoff: null, title: question,
  status: 'active', created_at: '2026-10-11T12:00:00Z', updated_at: '2026-10-11T12:01:00Z' };

test('authenticated workspace connects chart, report history, watchlist and cited saved research', async ({ page }, testInfo) => {
  const refreshes: string[] = [];
  const researchRequests: Array<{ action: string; ticker?: string; question?: string; authorization?: string }> = [];
  let completed = false;
  await mockInsightsApi(page, { history: MOCK_INSIGHT_HISTORY, watchlist: MOCK_WATCHLIST, onRefresh: url => refreshes.push(url) });
  await page.route('**/api/signals/IWM/similar?*', r => r.fulfill(M.ok(MOCK_SIMILAR_SETUPS)));
  await page.route('**/api/market/dates/IWM', r => r.fulfill(M.ok(MOCK_MARKET_DATES)));
  await page.route('**/api/market/data/IWM/*', r => r.fulfill(M.ok(marketDataForRequest(new URL(r.request().url()), MOCK_MARKET_DATA))));
  await page.route('**/api/live/quote/IWM', r => r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
  await page.route('**/api/signals/IWM?*', r => r.fulfill(M.ok(MOCK_SIGNALS)));
  await page.route('**/api/config/firebase', r => r.fulfill(M.ok({ authMode: 'firebase', firebase: {
    apiKey: 'AIzaSyFAKE-key-for-tests-000000000000000', authDomain: 'demo-test.firebaseapp.com',
    projectId: 'demo-test', appId: '1:1234567890:web:abcdef0123456789',
  } })));
  await page.route('**/api/me', r => r.fulfill(M.ok({ email: 'trader@example.test', is_admin: false })));
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('accounts:signInWithPassword')) return route.fulfill(M.ok({
      idToken: 'fake-id-token', email: 'trader@example.test', refreshToken: 'fake-refresh-token', expiresIn: '3600', localId: 'uid-trader',
    }));
    if (path.endsWith('accounts:lookup')) return route.fulfill(M.ok({ users: [{
      localId: 'uid-trader', email: 'trader@example.test', emailVerified: true, providerUserInfo: [], validSince: '1',
      lastLoginAt: String(Date.now()), createdAt: String(Date.now()),
    }] }));
    return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: 'UNEXPECTED_CALL' } }) });
  });
  await page.route('**/functions/v1/insights-research', async route => {
    const body = route.request().postDataJSON();
    const authorization = route.request().headers().authorization;
    researchRequests.push({ action: body.action, ticker: body.ticker, question: body.question, authorization });
    expect(authorization).toBe('Bearer fake-id-token');
    if (body.action === 'list') return route.fulfill(M.ok({ sessions: completed ? [session] : [] }));
    if (body.action === 'read') return route.fulfill(M.ok({ session,
      messages: [{ id: messageId, session_id: sessionId, question, answer, run_state: 'completed', error_code: null, error_message: null, created_at: session.updated_at }],
      sources: [{ message_id: messageId, citation_id: 'S1', source_type: 'catalysts', source_label: 'Catalyst calendar', source_url: '/api/catalysts/events', source_as_of: session.created_at, freshness: 'current', excerpt: 'CPI release' }],
    }));
    expect(body.action).toBe('research');
    completed = true;
    const events = [
      { type: 'session', sessionId },
      { type: 'sources', sources: [{ id: 'S1', type: 'catalysts', label: 'Catalyst calendar', path: '/api/catalysts/events', asOf: session.created_at, freshness: 'current', excerpt: 'CPI release' }] },
      { type: 'done', sessionId, messageId, answer },
    ];
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: events.map(e => JSON.stringify(e)).join('\n') + '\n' });
  });
  await page.goto('/ai-insights-lovable');
  await expect(page.getByTestId('signin-screen')).toBeVisible();
  expect(researchRequests).toHaveLength(0);
  await page.getByTestId('login-email').fill('trader@example.test');
  await page.getByTestId('login-password').fill('fixture-password-9');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('region', { name: 'Decision' })).toBeVisible();
  await expect(page.locator('section[aria-label="Price chart"] canvas').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('authenticated-briefing.png') });
  await page.getByRole('tab', { name: /^History/ }).click();
  await page.getByRole('tabpanel', { name: 'History' }).getByRole('button').filter({ hasText: 'Report run' }).first().click();
  await expect(page.getByRole('button', { name: 'Back to latest' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to latest' }).click();
  await page.getByLabel('Point-in-time cutoff').fill('2026-10-09T15:30');
  await page.getByRole('tab', { name: 'Watchlist', exact: true }).click();
  await page.getByRole('button', { name: 'Generate report', exact: true }).first().click();
  await expect.poll(() => refreshes.length).toBe(1);
  expect(new URL(refreshes[0]).searchParams.has('as_of')).toBe(false);
  await expect(page.getByLabel('Point-in-time cutoff')).toHaveValue('');
  await expect(page.getByRole('tab', { name: 'Briefing', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Watchlist', exact: true }).click();
  await page.getByRole('button', { name: 'Ask research', exact: true }).first().click();
  await expect(page.getByPlaceholder(/Ask about IWM/)).toHaveValue(question);
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/functions/v1/insights-research') && r.request().postDataJSON()?.action === 'research');
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/x-ndjson');
  await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
  await page.getByRole('article', { name: 'Research answer' }).getByRole('button', { name: 'Open source S1: Catalyst calendar', exact: true }).click();
  await expect(page.locator('#evidence-S1').filter({ visible: true })).toContainText('CPI release');
  await page.screenshot({ path: testInfo.outputPath('authenticated-cited-chat.png') });
  await page.getByRole('tab', { name: /^History/ }).click();
  await page.getByRole('tabpanel', { name: 'History' }).getByRole('button').filter({ hasText: question }).click();
  await expect(page.getByRole('tab', { name: 'Chat', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
  expect(researchRequests.filter(r => r.action === 'research')).toEqual([{ action: 'research', ticker: 'IWM', question, authorization: 'Bearer fake-id-token' }]);
  await testInfo.attach('research-requests.json', { body: JSON.stringify(researchRequests), contentType: 'application/json' });
});

async function savedResearch(page: Page, mode: 'live' | 'replay' = 'live') {
  await mockInsightsApi(page, { history: MOCK_INSIGHT_HISTORY });
  await page.route('**/api/market/dates/IWM', r => r.fulfill(M.ok(MOCK_MARKET_DATES)));
  await page.route('**/api/market/data/IWM/*', r => r.fulfill(M.ok(marketDataForRequest(new URL(r.request().url()), MOCK_MARKET_DATA))));
  await page.route('**/api/live/quote/IWM', r => r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
  await page.route('**/api/signals/IWM?*', r => r.fulfill(M.ok(MOCK_SIGNALS)));
  await page.route('**/api/signals/IWM/similar?*', r => r.fulfill(M.ok(MOCK_SIMILAR_SETUPS)));
  const saved = { ...session, mode, replay_cutoff: mode === 'replay' ? '2026-10-09T15:30:00.000Z' : null };
  await page.route('**/functions/v1/insights-research', async route => {
    const body = route.request().postDataJSON();
    if (body.action === 'list') return route.fulfill(M.ok({ sessions: [saved] }));
    if (body.action === 'read') return route.fulfill(M.ok({ session: saved,
      messages: [{ id: messageId, session_id: sessionId, question, answer: { ...answer, followUps: ['What would change this conclusion?'] }, run_state: 'completed', error_code: null, error_message: null, created_at: session.updated_at }],
      sources: [
        { message_id: messageId, citation_id: 'S1', source_type: 'catalysts', source_label: 'Catalyst calendar', source_url: '/api/catalysts/events', source_as_of: session.created_at, freshness: 'stale', excerpt: 'CPI release' },
        { message_id: messageId, citation_id: 'S2', source_type: 'options', source_label: 'Options positioning', source_as_of: null, freshness: 'unavailable', excerpt: 'Provider unavailable' },
      ],
    }));
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Research provider unavailable' }) });
  });
  await page.goto('/ai-insights-lovable');
  await page.getByRole('tab', { name: /^History/ }).click();
  await page.getByRole('tabpanel', { name: 'History' }).getByRole('button').filter({ hasText: question }).click();
  await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
  return saved;
}

test('saved research shows stale and unavailable evidence explicitly', async ({ page }, testInfo) => {
  await savedResearch(page);
  const notice = page.getByRole('article', { name: 'Research answer' }).getByRole('note');
  await expect(notice).toContainText('Older than a week: Catalyst calendar');
  await expect(notice).toContainText('Could not reach: Options positioning');
  await expect(notice).toContainText('This answer may be incomplete');
  await page.screenshot({ path: testInfo.outputPath('stale-partial-saved-answer.png') });
});

for (const mode of ['live', 'replay'] as const) {
  test(`restored ${mode} follow-up keeps its frozen boundary after shared cutoff changes`, async ({ page }, testInfo) => {
    const saved = await savedResearch(page, mode);
    await page.getByLabel('Point-in-time cutoff').fill(mode === 'live' ? '2026-10-08T14:00' : '2026-10-10T14:00');
    await page.getByRole('button', { name: 'What would change this conclusion?', exact: true }).click();
    const request = page.waitForRequest(r => r.url().endsWith('/functions/v1/insights-research') && r.postDataJSON()?.action === 'research');
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    const body = (await request).postDataJSON();
    await testInfo.attach('follow-up-boundary.json', { body: JSON.stringify(body), contentType: 'application/json' });
    expect(body).toMatchObject({ sessionId, ticker: saved.ticker, mode: saved.mode, replayCutoff: saved.replay_cutoff, question: 'What would change this conclusion?' });
  });
}

test('failed follow-up retains the completed answer and its cited sources', async ({ page }, testInfo) => {
  await savedResearch(page);
  await page.getByRole('button', { name: 'What would change this conclusion?', exact: true }).click();
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Research provider unavailable' })).toBeVisible();
  await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('failed-follow-up.png') });
  await expect(page.getByRole('article', { name: 'Research answer' }).getByRole('button', { name: 'Open source S1: Catalyst calendar', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Research answer' }).getByRole('note')).toContainText('This answer may be incomplete');
});

test('Stop retains the completed answer and its cited sources', async ({ page }, testInfo) => {
  await savedResearch(page);
  let release: (() => void) | undefined;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/functions/v1/insights-research', async route => {
    if (route.request().postDataJSON()?.action !== 'research') return route.fallback();
    await held;
    await route.abort().catch(() => {});
  });
  try {
    await page.getByRole('button', { name: 'What would change this conclusion?', exact: true }).click();
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Research stopped');
    await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('stopped-follow-up.png') });
    await expect(page.getByRole('article', { name: 'Research answer' }).getByRole('button', { name: 'Open source S1: Catalyst calendar', exact: true })).toBeVisible();
  } finally { release?.(); }
});

test('Agents keeps run provenance when administrator routing is denied', async ({ page }, testInfo) => {
  await savedResearch(page);
  await page.route('**/api/admin/routes', r => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'Admin access required' }) }));
  await page.getByRole('tab', { name: 'Agents', exact: true }).click();
  await expect(page.getByText('Admin access required to view per-agent routing.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to the decision this run produced' })).toBeVisible();
  await expect(page.getByText('Recent runs', { exact: true })).toBeVisible();
  const agents = page.getByRole('tabpanel', { name: 'Agents' });
  await expect(agents.getByText('$0.0134', { exact: true }).first()).toBeVisible();
  await expect(agents.getByText('12.5s', { exact: true })).toBeVisible();
  await expect(agents.getByText('2026-04-15', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('agents-routing-denied.png') });
});

test('watchlist research for a different ticker starts new work rather than changing a saved session', async ({ page }) => {
  await savedResearch(page);
  await page.route('**/api/insights/watchlist**', r => r.fulfill(M.ok(MOCK_WATCHLIST)));
  await page.route('**/api/insights/report/AAPL', r => r.fulfill(M.notFound()));
  await page.route('**/api/insights/report/AAPL/history?*', r => r.fulfill(M.ok({ ticker: 'AAPL', count: 0, reports: [] })));
  await page.getByRole('tab', { name: 'Watchlist', exact: true }).click();
  await page.getByRole('button', { name: 'Ask research', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Active ticker', exact: true })).toContainText('AAPL');
  await expect(page.getByPlaceholder(/Ask about AAPL/)).toHaveValue('What catalysts and risks matter most for AAPL right now?');
  await expect(page.getByText(answer.answer, { exact: true })).toHaveCount(0);
});


test('failed saved session is selectable and dependency read failures retain the prior answer', async ({ page }) => {
  await savedResearch(page);
  await page.route('**/functions/v1/insights-research', async route => {
    if (route.request().postDataJSON()?.action !== 'read') return route.fallback();
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Saved session unavailable' }) });
  });
  await page.getByRole('tab', { name: /^History/ }).click();
  await page.getByRole('tabpanel', { name: 'History' }).getByRole('button').filter({ hasText: question }).click();
  await expect(page.getByRole('alert')).toContainText('Could not open this research: Saved session unavailable');
  await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
  await page.route('**/functions/v1/insights-research', async route => {
    if (route.request().postDataJSON()?.action !== 'read') return route.fallback();
    return route.fulfill(M.ok({ session: { ...session, status: 'failed' }, messages: [{ id: messageId, session_id: sessionId, question: 'Failed original question', answer: null, run_state: 'failed', error_code: 'provider', error_message: 'Source timeout', created_at: session.updated_at }], sources: [] }));
  });
  await page.getByRole('tab', { name: /^History/ }).click();
  await page.getByRole('tabpanel', { name: 'History' }).getByRole('button').filter({ hasText: question }).click();
  await expect(page.getByRole('alert')).toContainText('Failed original question');
  await expect(page.getByRole('alert')).toContainText('Source timeout');
  await expect(page.getByText(answer.answer, { exact: true })).toHaveCount(0);
});

for (const width of [390, 411, 768, 1440]) {
  test(`saved evidence, ticker popup and chart controls stay inside ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await savedResearch(page);
    await page.getByRole('article', { name: 'Research answer' }).getByRole('button', { name: 'Open source S1: Catalyst calendar', exact: true }).click();
    const evidence = page.getByRole('complementary', { name: 'Evidence used' }).filter({ visible: true });
    await expect(evidence).toBeVisible();
    const box = await evidence.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: testInfo.outputPath(`${width}-evidence.png`) });
    if (width < 1280) await page.getByRole('button', { name: 'Close evidence', exact: true }).click();
    await page.getByRole('tab', { name: 'Briefing', exact: true }).click();
    const controls = page.getByLabel('Chart controls');
    const controlBox = await controls.boundingBox();
    expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(width + 1);
    await page.getByRole('button', { name: 'Active ticker', exact: true }).click();
    await expect(page.getByTestId('ticker-combobox-input')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`${width}-ticker-popup.png`) });
  });
}


test('restored Replay research shows frozen evidence without a live quote', async ({ page }) => {
  await savedResearch(page, 'replay');
  await expect(page.getByRole('region', { name: 'Live quote', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tabpanel', { name: 'Chat' }).getByText(/Replay · 2026-10-09/)).toBeVisible();
});

test('stream failure after new sources preserves the original completed question and source pair', async ({ page }) => {
  await savedResearch(page);
  await page.route('**/functions/v1/insights-research', async route => {
    if (route.request().postDataJSON()?.action !== 'research') return route.fallback();
    const events = [
      { type: 'sources', sources: [{ id: 'S9', label: 'New incomplete evidence', freshness: 'current', excerpt: 'Not a completed answer' }] },
      { type: 'error', code: 'provider_error', message: 'Model unavailable after sources', status: 503 },
    ];
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event)).join('\n') + '\n' });
  });
  await page.getByRole('button', { name: 'What would change this conclusion?', exact: true }).click();
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Model unavailable after sources');
  await expect(page.locator('#research-answer')).toContainText(question);
  await expect(page.getByRole('article', { name: 'Research answer' }).getByRole('button', { name: 'Open source S1: Catalyst calendar', exact: true })).toBeVisible();
  await expect(page.getByText('New incomplete evidence', { exact: true })).toHaveCount(0);
});
