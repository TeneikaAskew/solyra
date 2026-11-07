import { marketDataForRequest, MOCK_LIVE_QUOTE } from '@/mocks/live';
import { MOCK_SIGNALS } from '@/mocks/signals';
import { expect, test } from '@playwright/test';
import { mockCommon, M } from '../helpers/mocks';
import { MOCK_MARKET_DATA, MOCK_MARKET_DATES, MOCK_SIMILAR_SETUPS } from '@/mocks/charts';

const answer = {
  answer: 'IWM has one confirmed macro catalyst; the rest of the setup depends on stale report evidence.',
  facts: [{ text: 'CPI is scheduled inside the review window.', citations: ['S1'] }],
  bullCase: 'A positive reaction with confirming signals supports continuation.',
  bearCase: 'A negative reaction or missing confirmation weakens the setup.',
  invalidation: 'The setup is invalid if price loses the cited structural level.',
  unknowns: ['Current options positioning is unavailable.'],
  catalystTimeline: [{ date: '2026-10-14', event: 'CPI release', impact: 'high', citations: ['S1'] }],
  replayContext: null,
};

let researchReceipts: Array<{ action: string; ticker: string; question: string; fulfilledStatus: number }> = [];

test.beforeEach(async ({ page }) => {
  researchReceipts = [];
  await mockCommon(page);
  await page.route('**/api/signals/IWM/similar?*', r => r.fulfill(M.ok(MOCK_SIMILAR_SETUPS)));
  await page.route('**/api/market/dates/IWM', (r) => r.fulfill(M.ok(MOCK_MARKET_DATES)));
  await page.route('**/api/live/quote/IWM', (r) => r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
  await page.route('**/api/signals/IWM?*', (r) => r.fulfill(M.ok(MOCK_SIGNALS)));
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(marketDataForRequest(new URL(r.request().url()), MOCK_MARKET_DATA))));
  await page.route('**/functions/v1/insights-research', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'list') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessions: [] }) });
    if (body.action === 'read') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      session: { id: body.sessionId, ticker: 'IWM', mode: 'live', replay_cutoff: null, title: 'What catalysts matter most?', status: 'active', created_at: '2026-10-11T12:00:00Z', updated_at: '2026-10-11T12:01:00Z' },
      messages: [{ id: '22222222-2222-4222-8222-222222222222', session_id: body.sessionId, question: 'What catalysts matter most?', answer, run_state: 'completed', error_code: null, error_message: null, created_at: '2026-10-11T12:01:00Z' }],
      sources: [{ message_id: '22222222-2222-4222-8222-222222222222', citation_id: 'S1', source_type: 'catalysts', source_label: 'Catalyst calendar', source_url: '/api/catalysts/events', source_as_of: '2026-10-11T12:00:00Z', freshness: 'current', excerpt: 'CPI release' }],
    }) });
    if (body.action !== 'research') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'unexpected fixture action' }) });
    researchReceipts.push({ action: body.action, ticker: body.ticker, question: body.question, fulfilledStatus: 200 });
    const events = [
      { type: 'session', sessionId: '11111111-1111-4111-8111-111111111111' },
      { type: 'status', stage: 'gathering', label: 'Gathering approved evidence' },
      { type: 'sources', sources: [{ id: 'S1', type: 'catalysts', label: 'Catalyst calendar', path: '/api/catalysts/events', asOf: '2026-10-11T12:00:00Z', freshness: 'current', excerpt: 'CPI release' }] },
      { type: 'status', stage: 'synthesizing', label: 'Synthesizing cited answer' },
      { type: 'done', sessionId: '11111111-1111-4111-8111-111111111111', messageId: '22222222-2222-4222-8222-222222222222', answer },
    ];
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: events.map((event) => JSON.stringify(event)).join('\n') + '\n' });
  });
});

test('asks a cited live research question without changing legacy insights', async ({ page }, testInfo) => {
  await page.goto('/insights-lovable');
  await expect(page.getByRole('heading', { name: 'Insights Lab' })).toBeVisible();
  await page.getByPlaceholder(/Ask about IWM/).fill('What catalysts matter most over the next two weeks?');
  const researchResponse = page.waitForResponse(response => response.url().endsWith('/functions/v1/insights-research') && response.request().postDataJSON()?.action === 'research');
  await page.getByRole('button', { name: 'Research' }).click();
  const actualResponse = await researchResponse;
  expect(actualResponse.status()).toBe(200);
  expect(actualResponse.headers()['content-type']).toContain('application/x-ndjson');
  await expect(page.getByText(answer.answer)).toBeVisible();
  expect(researchReceipts).toEqual([{ action: 'research', ticker: 'IWM', question: 'What catalysts matter most over the next two weeks?', fulfilledStatus: 200 }]);
  await testInfo.attach('mocked-research-action.json', { body: JSON.stringify({ requests: researchReceipts, observedHttpStatus: actualResponse.status(), contentType: actualResponse.headers()['content-type'] }), contentType: 'application/json' });
  const fact = page.getByRole('article', { name: 'Research answer' })
    .getByText('CPI is scheduled inside the review window.', { exact: false });
  await fact.getByRole('button', { name: 'Open source S1: Catalyst calendar', exact: true }).click();
  await expect(page.locator('#evidence-S1').filter({ visible: true })).toContainText('CPI release');
  await page.screenshot({ path: testInfo.outputPath('cited-answer.png') });
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'AI Insights' })).toBeVisible();
});

test('accepts a typed ticker and offers quick ticker suggestions', async ({ page }) => {
  await page.goto('/insights-lovable');
  await page.route('**/api/insights/ticker/search?*', r => r.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify({ keywords: 'AAPL', results: [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States', currency: 'USD', match_score: 1 },
    ] }) }));
  await page.route('**/api/market/coverage?*', r => r.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify({ coverage: { AAPL: { daily: true, intraday: true } } }) }));
  const chooser = page.getByRole('button', { name: 'Active ticker', exact: true });
  await expect(chooser).toContainText('IWM');
  await chooser.click();
  await expect(page.getByTestId('ticker-option-QQQ')).toBeVisible();
  await page.getByTestId('ticker-combobox-input').fill('AAPL');
  await page.getByTestId('ticker-option-AAPL').click();
  await expect(chooser).toContainText('AAPL');
  await expect(page.getByPlaceholder(/Ask about AAPL/)).toBeVisible();
});

test('replay mode requires and preserves a cutoff with no mobile overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 411, height: 771 });
  await page.goto('/insights-lovable');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.getByLabel('Evidence cutoff')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Research' })).toBeDisabled();
  expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-replay.png') });
});

for (const timezoneId of ['America/New_York', 'Asia/Tokyo']) {
  test.describe(`source integrity in ${timezoneId}`, () => {
    test.use({ timezoneId });
    test('calendar dates and source availability survive streamed answer and saved restoration', async ({ page }, testInfo) => {
      await page.route('**/api/live/quote/IWM', r => r.fulfill(M.ok({ ...MOCK_LIVE_QUOTE, last_updated: '2026-10-29' })));
      let releaseRead!: () => void;
      const readReady = new Promise<void>(resolve => { releaseRead = resolve; });
      const messageId = '22222222-2222-4222-8222-222222222222';
      const sources = [
        { id: 'S1', type: 'market_brief', label: 'Calendar brief', asOf: '2026-10-29', available: true, freshness: 'unavailable', excerpt: 'Prior-close brief; intraday freshness unknown.' },
        { id: 'S2', type: 'signals', label: 'Signals', asOf: null, available: true, freshness: 'unavailable', excerpt: 'Signal data available; time-of-day unavailable.' },
        { id: 'S3', type: 'catalysts', label: 'Catalysts', asOf: null, available: false, freshness: 'unavailable', excerpt: 'Solyra API returned 503' },
      ];
      await page.route('**/functions/v1/insights-research', async route => {
        const body = route.request().postDataJSON();
        if (body.action === 'list') return route.fulfill(M.ok({ sessions: [] }));
        if (body.action === 'read') {
          await readReady;
          return route.fulfill(M.ok({
            session: { id: body.sessionId, ticker: 'IWM', mode: 'live', replay_cutoff: null, title: 'Check dated source evidence', created_at: '2026-10-30T00:01:00Z', updated_at: '2026-10-30T00:01:00Z' },
            messages: [{ id: messageId, question: 'Check dated source evidence', answer, run_state: 'completed' }],
            sources: sources.map(s => ({ message_id: messageId, citation_id: s.id, source_type: s.type, source_label: s.label, source_as_of: null, asOf: s.asOf, available: s.available, freshness: s.freshness, excerpt: s.excerpt })),
          }));
        }
        const events = [{ type: 'sources', sources }, { type: 'done', sessionId: '11111111-1111-4111-8111-111111111111', messageId, answer }];
        return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: events.map(e => JSON.stringify(e)).join('\n') + '\n' });
      });
      await page.goto('/insights-lovable');
      await page.getByPlaceholder(/Ask about IWM/).fill('Check dated source evidence');
      await page.getByRole('button', { name: 'Research', exact: true }).click();
      const evidence = page.locator('#evidence-S1').filter({ visible: true });
      await expect(evidence).toContainText('Oct 29, 2026');
      await expect(evidence).toContainText('calendar date; time unavailable');
      await expect(page.getByRole('region', { name: 'Live quote', exact: true })).toContainText('As of 2026-10-29 ·');
      await expect(page.getByRole('article', { name: 'Research answer' })).toContainText('Freshness unknown: Calendar brief, Signals');
      await expect(page.getByRole('article', { name: 'Research answer' })).toContainText('Evidence unavailable: Catalysts');
      await expect(page.getByText('Could not reach:', { exact: false })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath('streamed-date-and-availability.png') });
      releaseRead();
      await expect(page.getByRole('button', { name: 'Start new research', exact: true })).toBeVisible();
      await expect(evidence).toContainText('Oct 29, 2026');
      await expect(evidence).not.toContainText('Oct 28');
      await expect(page.getByRole('region', { name: 'Live quote', exact: true })).toContainText('As of 2026-10-29 ·');
      await expect(page.getByRole('article', { name: 'Research answer' })).toContainText('Freshness unknown: Calendar brief, Signals');
      await page.screenshot({ path: testInfo.outputPath('restored-date-and-availability.png') });
      await page.getByRole('region', { name: 'Live quote', exact: true }).screenshot({ path: testInfo.outputPath('quote-calendar-date.png') });
    });
  });
}
