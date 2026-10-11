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
    if (body.action === 'read') return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
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
  await expect(page.getByText('S1')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('cited-answer.png') });
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'AI Insights' })).toBeVisible();
});

test('replay mode requires and preserves a cutoff with no mobile overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 411, height: 771 });
  await page.goto('/insights-lovable');
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByLabel('Evidence cutoff')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Research' })).toBeDisabled();
  expect(await page.locator('body').evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-replay.png') });
});
