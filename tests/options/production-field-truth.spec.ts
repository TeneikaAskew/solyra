import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockOptionsApi } from '../helpers/fixtures/options';
const sample = JSON.parse(readFileSync(new URL('../fixtures/distinct-gamma-producer-contract.json', import.meta.url), 'utf8'));
async function setup(page: Page, unavailable = false, totalVex = -987650) {
  await page.route('**/*', r => {
    const u = new URL(r.request().url());
    return !['localhost', '127.0.0.1'].includes(u.hostname) || u.pathname.startsWith('/api/') ? r.abort('blockedbyclient') : r.continue();
  });
  await mockOptionsApi(page);
  await page.route('**/api/options/dates/IWM*', r => r.fulfill({ json: { ticker: 'IWM', dates: ['2026-10-27'] } }));
  await page.route('**/api/options/IWM/*/levels*', r => r.fulfill(unavailable ? { status: 503, json: { detail: 'offline unavailable' } } : { json: sample.levels }));
  await page.route('**/api/options/IWM/grid*', r => r.fulfill(unavailable ? { status: 503, json: { detail: 'offline unavailable' } } : { json: sample.grid }));
  await page.route('**/api/options/IWM/2026-10-27', r => r.fulfill({ json: sample.chain_response }));
  await page.route('**/api/options/greeks', r => r.fulfill({ json: {
    ...sample.greeks,
    gex_by_strike: [{ strike: 100, gex: 1234000, call_gex: 2000000, put_gex: -766000 }],
    metrics: { ...sample.greeks.metrics, total_gex: 1234000, total_vex: totalVex },
  } }));
  await page.goto('/options');
}
test('IWM real Gamma never inherits static SPY hedge midpoint or Tactical values', async ({ page }, info) => {
  await setup(page);
  await expect(page.locator('.hs-legend .chip.flip .val')).toHaveText('99.52');
  await expect(page.getByRole('note', { name: 'Levels source' })).toContainText('IWM · 2026-10-27');
  await expect(page.locator('.hs-legend .chip.hedge')).toHaveCount(0);
  await expect(page.locator('.hs-nodes .node.hedge, .hs-nodes .node.midpoint')).toHaveCount(0);
  await expect(page.getByText('Tactical read · SPY')).toHaveCount(0);
  await expect(page.getByText(/Pinning between Flip 588/)).toHaveCount(0);
  await expect(page.getByText('Tactical analysis unavailable', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('iwm-real-no-spy-values.png'), fullPage: true });
  await page.locator('.hs-nodes').screenshot({ path: info.outputPath('actual-nodes-no-mock.png') });
});
test('VEX mode never presents GEX bars and preserves real total and return filters', async ({ page }, info) => {
  await setup(page);
  await page.getByRole('button', { name: 'Profiles', exact: true }).click();
  await expect(page.locator('svg text').filter({ hasText: '+1.2M' })).toHaveCount(1);
  await page.getByRole('button', { name: 'VEX', exact: true }).click();
  await expect(page.getByText('Total VEX', { exact: true })).toBeVisible();
  await expect(page.getByText('-988K', { exact: true })).toBeVisible();
  await expect(page.getByText('Per-strike VEX unavailable', { exact: true })).toBeVisible();
  await expect(page.locator('svg text').filter({ hasText: '+1.2M' })).toHaveCount(0);
  for (const name of ['calls', 'puts', 'net']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByText('Per-strike VEX unavailable', { exact: true })).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath('vex-total-profile-unavailable.png'), fullPage: true });
  await page.getByRole('button', { name: 'GEX', exact: true }).click();
  await expect(page.locator('svg text').filter({ hasText: '+1.2M' })).toHaveCount(1);
});
test('unavailable Gamma never reveals fallback illustrative values', async ({ page }, info) => {
  await setup(page, true);
  await expect(page.locator('.hs-legend')).toHaveCount(0);
  await expect(page.locator('.hs-nodes')).toHaveCount(0);
  await expect(page.getByText(/Pinning between Flip 588/)).toHaveCount(0);
  await expect(page.getByText('Tactical analysis unavailable', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('gamma-unavailable-no-mock.png'), fullPage: true });
});
test('actual zero total VEX remains visible without inventing a zero profile', async ({ page }, info) => {
  await setup(page, false, 0);
  await page.getByRole('button', { name: 'Profiles', exact: true }).click();
  await page.getByRole('button', { name: 'VEX', exact: true }).click();
  const card = page.locator('div.rounded-xl').filter({ has: page.getByText('Total VEX', { exact: true }) });
  await expect(card.locator('.metric-value')).toHaveText('+0');
  await expect(page.getByText('Per-strike VEX unavailable', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('zero-vex-total-no-invented-profile.png'), fullPage: true });
});
