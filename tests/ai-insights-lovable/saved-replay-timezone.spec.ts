import { test, expect } from '@playwright/test';
import { mockInsightsApi } from '../helpers/fixtures/insights';
import { M } from '../helpers/mocks';
import { marketDataForRequest, MOCK_LIVE_QUOTE } from '@/mocks/live';
import { MOCK_MARKET_DATA } from '@/mocks/charts';

// A non-market viewer timezone must not alter restored absolute cutoffs.
test.use({ timezoneId: 'America/Los_Angeles' });

const cases = [
  { name: 'UTC summer', cutoff: '2026-10-09T15:30:45Z', date: '20261009', time: '11:30' },
  { name: 'UTC winter', cutoff: '2026-01-09T15:30:45Z', date: '20260109', time: '10:30' },
  { name: 'offset and previous ET date', cutoff: '2026-10-10T03:30:45+02:00', date: '20261009', time: '21:30' },
  { name: 'before DST', cutoff: '2026-03-06T15:30:45Z', date: '20260306', time: '10:30' },
  { name: 'after DST', cutoff: '2026-03-09T15:30:45Z', date: '20260309', time: '11:30' },
];
for (const path of ['History', 'Previous questions'] as const) {
  for (const fixture of cases) {
    test(`4413573431 ${path}: ${fixture.name} preserves the saved instant into Briefing`, async ({ page }, info) => {
      const saved = { id: '11111111-1111-4111-8111-111111111111', ticker: 'IWM', mode: 'replay', replay_cutoff: fixture.cutoff, title: 'Saved boundary question', status: 'active', created_at: fixture.cutoff, updated_at: fixture.cutoff };
      const answer = { answer: 'Saved boundary answer', facts: [], bullCase: '', bearCase: '', invalidation: '', unknowns: [], catalystTimeline: [], replayContext: null };
      const charts: string[] = []; const refreshes: string[] = []; const signals: string[] = [];
      await page.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.fallback() : r.abort());
      await page.route('**/api/**', r => r.fulfill(M.notFound()));
      await mockInsightsApi(page, { onRefresh: url => refreshes.push(url) });
      await page.route('**/api/signals/IWM?*', r => { signals.push(r.request().url()); return r.fulfill(M.ok({ signals: [] })); });
      await page.route('**/api/live/quote/*', r => r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
      await page.route('**/api/market/dates/*', r => r.fulfill(M.ok({ ticker: 'IWM', dates: [fixture.date], months: [fixture.date.slice(0, 6)], source: 'fixture' })));
      await page.route('**/api/market/data/*/*', r => { charts.push(r.request().url()); return r.fulfill(M.ok(marketDataForRequest(new URL(r.request().url()), MOCK_MARKET_DATA))); });
      await page.route('**/functions/v1/insights-research', r => r.fulfill(M.ok(r.request().postDataJSON().action === 'list' ? { sessions: [saved] } : { session: saved, messages: [{ id: 'm', question: saved.title, answer, run_state: 'completed' }], sources: [] })));
      const reportReady = page.waitForResponse(response => new URL(response.url()).pathname === '/api/insights/report/IWM' && response.status() === 200);
      await page.goto('/ai-insights-lovable');
      await reportReady;
      await expect(page.getByRole('region', { name: 'Decision' })).toBeVisible();
      if (path === 'History') {
        await page.getByRole('tab', { name: /^History/ }).click();
        await page.getByRole('tabpanel', { name: 'History' }).getByRole('button').filter({ hasText: saved.title }).click();
      } else {
        await page.getByRole('tab', { name: 'Chat', exact: true }).click();
        await page.getByRole('region', { name: 'Previous questions' }).getByRole('button', { name: /Previous questions/ }).click();
        await page.getByRole('region', { name: 'Previous questions' }).getByRole('button').filter({ hasText: saved.title }).click();
      }
      await expect(page.getByText(answer.answer, { exact: true })).toBeVisible();
      await page.getByRole('tab', { name: 'Briefing', exact: true }).click();
      await expect.poll(() => charts.map(raw => { const url = new URL(raw); return `${url.pathname.split('/').at(-1)} ${url.searchParams.get('end_time')}`; }), { timeout: 2000 }).toContain(`${fixture.date} ${fixture.time}`);
      const date = `${fixture.date.slice(0, 4)}-${fixture.date.slice(4, 6)}-${fixture.date.slice(6, 8)}`;
      await expect(page.getByLabel('Point-in-time cutoff')).toHaveValue(`${date}T${fixture.time}`);
      await expect.poll(() => signals.map(raw => { const url = new URL(raw); return `${url.searchParams.get('end_date')} ${url.searchParams.get('end_time')}`; })).toContain(`${date} ${fixture.time}:00`);
      await page.screenshot({ path: info.outputPath('saved-cutoff-restored-briefing.png'), fullPage: true, animations: 'disabled' });
      await page.getByRole('region', { name: 'Price chart', exact: true }).screenshot({ path: info.outputPath('restored-briefing-chart.png'), animations: 'disabled' });
      await page.getByRole('button', { name: 'Run replay', exact: true }).click();
      await expect.poll(() => refreshes.length).toBe(1);
      expect(new URL(refreshes[0]).searchParams.get('as_of')).toBe(fixture.cutoff);
      await info.attach('saved-boundary.json', { body: JSON.stringify({ saved: fixture.cutoff, charts, signals, refreshes }), contentType: 'application/json' });
    });
  }
}
