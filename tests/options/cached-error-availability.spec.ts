import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockOptionsApi } from '../helpers/fixtures/options';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/current-gamma-producer-contract.json', import.meta.url), 'utf8'));

test('failed cached grid refetch removes LIVE and its overlay, then recovers', async ({ page }, info) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname.startsWith('/api/')) await route.abort('blockedbyclient');
    else await route.continue();
  });
  await mockOptionsApi(page);
  // No independent historical levels: this tests the grid-only overlay path.
  await page.route('**/api/options/dates/IWM*', r => r.fulfill({ json: { ticker: 'IWM', dates: [] } }));
  let failed = false, requests = 0;
  await page.route('**/api/options/IWM/grid*', async route => {
    requests++;
    await route.fulfill(failed ? { status: 503, json: { detail: 'snapshot temporarily refused' } } : { json: fixture.grid });
  });
  await page.goto('/options');
  const pill = page.locator('.hs-toolbar .hs-pill');
  await expect(pill).toContainText('REALTIME ORIGIN');
  await expect(page.locator('.hs-legend')).toHaveCount(1);
  await pill.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('healthy-producer-grid.png'), fullPage: true });
  failed = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(pill).toContainText('UNAVAILABLE');
  await expect(pill).not.toContainText('REALTIME ORIGIN');
  await expect(page.locator('.hs-legend')).toHaveCount(0);
  await expect(page.getByText(/Live IWM grid unavailable/)).toBeVisible();
  await expect(page.getByText(/Data unavailable:/)).toBeVisible();
  await page.screenshot({ path: info.outputPath('failed-refetch-unavailable.png'), fullPage: true });
  failed = false;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(pill).toContainText('REALTIME ORIGIN');
  await expect(page.locator('.hs-legend')).toHaveCount(1);
  expect(requests).toBe(3); // no hidden retries
  await expect(page.locator('.hs-demo-banner')).toContainText(/tactical read is illustrative/i);
});

test('HTTP200 unavailable never renders zero exposure or realtime freshness', async ({ page }) => {
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (!['localhost','127.0.0.1'].includes(u.hostname) || u.pathname.startsWith('/api/')) await route.abort();
    else await route.continue();
  });
  await mockOptionsApi(page);
  await page.route('**/api/options/dates/IWM*', r => r.fulfill({ json: { ticker:'IWM',dates:[] } }));
  await page.route('**/api/options/IWM/grid*', r => r.fulfill({ json:fixture.unavailable_grid }));
  await page.goto('/options');
  await expect(page.locator('.hs-toolbar .hs-pill')).toContainText('UNAVAILABLE');
  await expect(page.locator('.hs-legend')).toHaveCount(0);
  await expect(page.getByText('Data unavailable: SYNTHETIC snapshot unavailable')).toBeVisible();
  await expect(page.getByRole('note',{name:'Gamma source warnings'})).toContainText('SYNTHETIC snapshot unavailable');
});
