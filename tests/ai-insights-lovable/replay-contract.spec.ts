import { test, expect, type Page } from '@playwright/test';
import { mockInsightsApi } from '../helpers/fixtures/insights';
import { M } from '../helpers/mocks';
import { marketDataForRequest, MOCK_LIVE_QUOTE } from '@/mocks/live';
import { MOCK_MARKET_DATA } from '@/mocks/charts';

test.use({ timezoneId: 'America/Los_Angeles' });
const title = 'Saved boundary question';
const answer = { answer: 'Saved boundary answer', facts: [], bullCase: '', bearCase: '', invalidation: '', unknowns: [], catalystTimeline: [], replayContext: null };
async function setup(page: Page, path: 'standalone' | 'embedded', savedCutoff?: string) {
  const requests: Array<{ action: string; replayCutoff?: string }> = [];
  const saved = { id: '11111111-1111-4111-8111-111111111111', ticker: 'IWM', mode: 'replay', replay_cutoff: savedCutoff, title, status: 'active', created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:00:00Z' };
  await page.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.fallback() : r.abort());
  await page.route('**/api/**', r => r.fulfill(M.notFound()));
  await mockInsightsApi(page);
  await page.route('**/api/market/dates/*', r => r.fulfill(M.ok({ ticker: 'IWM', dates: ['20261009', '20260306', '20260109', '20251031'], months: [], source: 'fixture' })));
  await page.route('**/api/market/data/*/*', r => r.fulfill(M.ok(marketDataForRequest(new URL(r.request().url()), MOCK_MARKET_DATA))));
  await page.route('**/api/live/quote/*', r => r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
  await page.route('**/functions/v1/insights-research', r => {
    const body = r.request().postDataJSON(); requests.push(body);
    if (body.action === 'list') return r.fulfill(M.ok({ sessions: savedCutoff ? [saved] : [] }));
    if (body.action === 'read') return r.fulfill(M.ok({ session: saved, messages: [{ id: 'm', question: title, answer, run_state: 'completed' }], sources: [] }));
    return r.fulfill({ status: 200, contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'error', code: 'fixture', message: 'Fixture terminal' }) + '\n' });
  });
  await page.goto(path === 'standalone' ? '/insights-lovable' : '/ai-insights-lovable');
  if (path === 'embedded') await page.getByRole('tab', { name: 'Chat', exact: true }).click();
  return requests;
}
async function enter(page: Page, path: 'standalone' | 'embedded', cutoff: string) {
  if (path === 'standalone') {
    await page.getByRole('button', { name: 'Replay', exact: true }).click();
    await page.getByLabel('Evidence cutoff', { exact: true }).fill(cutoff);
  } else await page.getByLabel('Point-in-time cutoff').fill(cutoff);
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('What was knowable at this boundary?');
}
for (const path of ['standalone', 'embedded'] as const) {
  for (const [wall, instant] of [
    ['2026-10-09T11:30', '2026-10-09T15:30:00.000Z'],
    ['2026-01-09T11:30', '2026-01-09T16:30:00.000Z'],
    ['2026-10-09T23:30', '2026-10-10T03:30:00.000Z'],
  ]) test(`4419167002 ${path} manual ET ${wall} submits the exact instant`, async ({ page }, info) => {
    const requests = await setup(page, path); await enter(page, path, wall);
    await page.screenshot({ path: info.outputPath('manual-eastern-cutoff.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    await expect.poll(() => requests.find(r => r.action === 'research')?.replayCutoff, { timeout: 2000 }).toBe(instant);
  });
  for (const [cutoff, display] of [
    ['2026-10-09T15:30:45Z', '2026-10-09T11:30'],
    ['2026-10-10T03:30:45+02:00', '2026-10-09T21:30'],
    ['2025-11-02T01:30:00-05:00', '2025-11-02T01:30'],
  ]) test(`4419167012 ${path} saved ${cutoff} stays visible and transports unchanged`, async ({ page }, info) => {
    const requests = await setup(page, path, cutoff);
    if (path === 'standalone') {
      await page.getByRole('button', { name: 'History', exact: true }).click();
      await page.getByRole('button').filter({ hasText: title }).click();
      await expect(page.getByLabel('Evidence cutoff', { exact: true })).toHaveValue(display, { timeout: 2000 });
      await expect(page.getByLabel('Evidence cutoff', { exact: true })).toBeDisabled();
    } else {
      const previous = page.getByRole('region', { name: 'Previous questions' });
      await previous.getByRole('button', { name: /Previous questions/ }).click();
      await previous.getByRole('button').filter({ hasText: title }).click();
      await expect(page.getByLabel('Point-in-time cutoff')).toHaveValue(display);
    }
    await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('restored-saved-cutoff-and-answer.png'), fullPage: true, animations: 'disabled' });
    await page.locator('#research-answer').screenshot({ path: info.outputPath('restored-answer.png'), animations: 'disabled' });
    await page.getByRole('textbox', { name: 'Question', exact: true }).fill('What evidence would invalidate this?');
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    await expect.poll(() => requests.find(r => r.action === 'research')?.replayCutoff).toBe(cutoff);
  });
  for (const [wall, reason] of [['2026-03-08T02:30', 'does not exist'], ['2025-11-02T01:30', 'ambiguous']]) {
    test(`4419167002 ${path} refuses ${reason} ET wall clock`, async ({ page }, info) => {
      const requests = await setup(page, path); await enter(page, path, wall);
      await expect(page.getByRole('alert')).toContainText(reason, { timeout: 2000 });
      await expect(page.getByRole('button', { name: 'Research', exact: true })).toBeDisabled();
      await page.getByRole('textbox', { name: 'Question', exact: true }).press('Control+Enter');
      expect(requests.filter(r => r.action === 'research')).toHaveLength(0);
      await page.screenshot({ path: info.outputPath('dst-refusal-and-disabled-submit.png'), fullPage: true, animations: 'disabled' });
    });
  }
}

test('standalone new research after a saved session keeps a market-local editable cutoff', async ({ page }, info) => {
  const requests = await setup(page, 'standalone', '2026-10-09T15:30:45Z');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await page.getByRole('button').filter({ hasText: title }).click();
  await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start new research', exact: true }).click();
  await expect(page.getByLabel('Evidence cutoff', { exact: true })).toHaveValue('2026-10-09T11:30');
  await expect(page.getByLabel('Evidence cutoff', { exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('What was knowable at this new boundary?');
  await page.screenshot({ path: info.outputPath('new-research-editable-eastern-cutoff.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect.poll(() => requests.find(r => r.action === 'research')?.replayCutoff).toBe('2026-10-09T15:30:00.000Z');
});
