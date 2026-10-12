import { expect, test } from '@playwright/test';
import { mockCommon } from '../helpers/mocks';

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

test.beforeEach(async ({ page }) => {
  await mockCommon(page);
  await page.route('**/functions/v1/insights-research', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'list') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessions: [] }) });
    if (body.action === 'read') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      session: { id: body.sessionId, ticker: 'IWM', mode: 'live', replay_cutoff: null, title: 'What catalysts matter most?', status: 'active', created_at: '2026-10-11T12:00:00Z', updated_at: '2026-10-11T12:01:00Z' },
      messages: [{ id: '22222222-2222-4222-8222-222222222222', session_id: body.sessionId, question: 'What catalysts matter most?', answer, run_state: 'completed', error_code: null, error_message: null, created_at: '2026-10-11T12:01:00Z' }],
      sources: [{ message_id: '22222222-2222-4222-8222-222222222222', citation_id: 'S1', source_type: 'catalysts', source_label: 'Catalyst calendar', source_url: '/api/catalysts/events', source_as_of: '2026-10-11T12:00:00Z', freshness: 'current', excerpt: 'CPI release' }],
    }) });
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
  await page.getByRole('button', { name: 'Research' }).click();
  await expect(page.getByText(answer.answer)).toBeVisible();
  await expect(page.getByLabel('Research answer').getByRole('button', { name: /Open source S1/ }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('cited-answer.png') });
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'AI Insights' })).toBeVisible();
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
