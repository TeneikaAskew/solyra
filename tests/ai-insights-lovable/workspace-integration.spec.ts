import { expect, test } from '@playwright/test';
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
  await page.getByRole('tab', { name: 'Watchlist', exact: true }).click();
  await page.getByRole('button', { name: 'Generate report', exact: true }).first().click();
  await expect.poll(() => refreshes.length).toBe(1);
  expect(new URL(refreshes[0]).searchParams.has('as_of')).toBe(false);
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
