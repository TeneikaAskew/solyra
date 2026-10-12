import { expect, test } from '@playwright/test';
import { M, mockCommon } from '../helpers/mocks';
import { MOCK_MARKET_DATA } from '@/mocks/charts';

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

const quote = {
  ticker: 'IWM', price: 278.12, prev_close: 278.94, change: -0.82, change_pct: -0.29,
  open: 279.1, high: 280.0, low: 277.5, volume: 1234567,
  market_session: 'post', market_open: false, last_updated: '2026-10-11T20:00:00Z',
};

async function mockResearch(page: import('@playwright/test').Page) {
  await page.route('**/functions/v1/insights-research', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'list') return route.fulfill(M.ok({ sessions: [] }));
    if (body.action === 'read') return route.fulfill(M.ok({
      session: { id: body.sessionId, ticker: 'IWM', mode: 'live', replay_cutoff: null, title: 'What catalysts matter most?', status: 'active', created_at: '2026-10-11T12:00:00Z', updated_at: '2026-10-11T12:01:00Z' },
      messages: [{ id: '22222222-2222-4222-8222-222222222222', session_id: body.sessionId, question: 'What catalysts matter most?', answer, run_state: 'completed', error_code: null, error_message: null, created_at: '2026-10-11T12:01:00Z' }],
      sources: [{ message_id: '22222222-2222-4222-8222-222222222222', citation_id: 'S1', source_type: 'catalysts', source_label: 'Catalyst calendar', source_url: '/api/catalysts/events', source_as_of: '2026-10-11T12:00:00Z', freshness: 'current', excerpt: 'CPI release' }],
    }));
    const events = [
      { type: 'session', sessionId: '11111111-1111-4111-8111-111111111111' },
      { type: 'status', stage: 'gathering', label: 'Gathering approved evidence' },
      { type: 'sources', sources: [{ id: 'S1', type: 'catalysts', label: 'Catalyst calendar', path: '/api/catalysts/events', asOf: '2026-10-11T12:00:00Z', freshness: 'current', excerpt: 'CPI release' }] },
      { type: 'status', stage: 'synthesizing', label: 'Synthesizing cited answer' },
      { type: 'done', sessionId: '11111111-1111-4111-8111-111111111111', messageId: '22222222-2222-4222-8222-222222222222', answer },
    ];
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: events.map((event) => JSON.stringify(event)).join('\n') + '\n' });
  });
}

test.beforeEach(async ({ page }) => {
  await mockCommon(page);
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(MOCK_MARKET_DATA)));
  await page.route('**/api/live/quote/IWM', (r) => r.fulfill(M.ok(quote)));
  await mockResearch(page);
});

test('renders the candlestick chart with quote lines and runs cited research', async ({ page }, testInfo) => {
  await page.goto('/ai-insights-lovable');
  await expect(page.getByRole('heading', { name: 'AI Insights Lab' })).toBeVisible();
  // Trader chart: lightweight-charts renders into a canvas, with timeframe/volume/RTH controls.
  await expect(page.getByRole('group', { name: 'Timeframe' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volume' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'RTH' })).toBeVisible();
  await expect(page.locator('section[aria-label="Price chart"] canvas').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('candlestick-chart.png') });

  await page.getByPlaceholder(/Ask about IWM/).fill('What catalysts matter most over the next two weeks?');
  await page.getByRole('button', { name: 'Research' }).click();
  await expect(page.getByText(answer.answer)).toBeVisible();
  await expect(page.getByText('S1').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('cited-answer.png') });

  // Existing routes are unchanged.
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'AI Insights' })).toBeVisible();
  await page.goto('/insights-lovable');
  await expect(page.getByRole('heading', { name: 'Insights Lab' })).toBeVisible();
});

test('replay mode sends the cutoff to the chart data request', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/market/data/IWM/*', (r) => { requests.push(r.request().url()); return r.fulfill(M.ok(MOCK_MARKET_DATA)); });
  await page.goto('/ai-insights-lovable');
  await page.getByRole('button', { name: 'Replay' }).click();
  await page.getByLabel('Evidence cutoff').fill('2026-10-10T14:30');
  await expect.poll(() => requests.some((url) => url.includes('end_time=14%3A30') || url.includes('end_time=14:30'))).toBe(true);
});

test('invalid OHLC data renders an unavailable state, never a fabricated chart', async ({ page }) => {
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok({
    ticker: 'IWM', date: '2026-10-11', timeframe: 15, count: 1,
    candlestick: [{ time: 1728600000, open: 100, high: 98, low: 101, close: NaN }],
    volume: [],
  })));
  await page.goto('/ai-insights-lovable');
  await expect(page.getByText(/missing or invalid/)).toBeVisible();
  await expect(page.locator('section[aria-label="Price chart"] canvas')).toHaveCount(0);
});

test('no overflow at mobile width', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ai-insights-lovable');
  await expect(page.getByRole('heading', { name: 'AI Insights Lab' })).toBeVisible();
  expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile.png') });
});
