/**
 * E2E: a one-sided options chain (stocks PR 1916, FEAT-OPTION-001) renders as
 * unavailable, never as zero, and never crashes the Profiles tab.
 *
 * The payloads are the stocks PR 1916 head's own route output for a synthetic
 * calls-only and puts-only chain (tests/fixtures/one-sided-gamma-producer-contract.json):
 * the chain keeps its rows with chain_state "unavailable", and greeks, levels
 * and grid return null totals, a null put/call ratio and a side reason. Every
 * /api call is intercepted; the one-sided responses are registered here with
 * page.route on top of mockOptionsApi.
 *
 * Before this change the Profiles tab threw on `put_call_ratio.toFixed` and
 * rendered a null total as "+0 Positive"; running this spec against main shows
 * that state in the same screenshots.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockOptionsApi } from '../helpers/fixtures/options';

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
const oneSided = fixture('one-sided-gamma-producer-contract.json');
const distinct = fixture('distinct-gamma-producer-contract.json');

const EM_DASH = '—';
type Side = 'calls_only' | 'puts_only';
const MISSING: Record<Side, string> = {
  calls_only: 'the stored chain has no put contracts',
  puts_only: 'the stored chain has no call contracts',
};

/** Route every options endpoint for IWM on 2026-10-27 to the one-sided
 *  payloads, and collect script errors: uncaught ones, and the render errors
 *  React reports on the console when the route error boundary catches them. */
async function setup(page: Page, side: Side, levels: unknown = oneSided[side].levels) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${e.name}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && /\b(TypeError|ReferenceError|RangeError)\b/.test(m.text())) errors.push(m.text().slice(0, 300));
  });
  await page.route('**/*', (r) => {
    const u = new URL(r.request().url());
    return !['localhost', '127.0.0.1'].includes(u.hostname) || u.pathname.startsWith('/api/')
      ? r.abort('blockedbyclient')
      : r.continue();
  });
  await mockOptionsApi(page);
  await page.route('**/api/options/dates/IWM*', (r) => r.fulfill({ json: { ticker: 'IWM', dates: ['2026-10-27'] } }));
  await page.route('**/api/options/IWM/*/levels*', (r) => r.fulfill({ json: levels }));
  await page.route('**/api/options/IWM/grid*', (r) => r.fulfill({ json: oneSided[side].grid }));
  await page.route('**/api/options/IWM/2026-10-27', (r) => r.fulfill({ json: oneSided[side].chain_response }));
  await page.route('**/api/options/greeks', (r) => r.fulfill({ json: oneSided[side].greeks }));
  await page.goto('/options');
  return errors;
}

/** Open Profiles and wait until the greeks answer has rendered: the chain
 *  notice on this branch, or the route error page on main. */
async function openProfiles(page: Page) {
  const greeks = page.waitForResponse('**/api/options/greeks');
  await page.getByRole('button', { name: 'Profiles', exact: true }).click();
  await greeks;
  await expect(
    page.getByRole('status', { name: 'Chain completeness' }).or(page.getByRole('heading', { name: 'Page error' })),
  ).toBeVisible();
}

const card = (page: Page, name: string) =>
  page.locator('div.rounded-xl').filter({ has: page.getByText(name, { exact: true }) });

async function expectUnavailableCard(page: Page, name: string, reason: string) {
  await expect(card(page, name).locator('.metric-value')).toHaveText(EM_DASH);
  const badge = card(page, name).getByTestId('unavailable-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('title', reason);
}

for (const side of ['calls_only', 'puts_only'] as const) {
  test(`Profiles renders a ${side.replace('_', '-')} chain as unavailable, not zero`, async ({ page }, info) => {
    const errors = await setup(page, side);
    await openProfiles(page);
    const shot = side === 'calls_only' ? 'profiles-calls-only-gex.png' : 'profiles-puts-only.png';
    await page.screenshot({ path: info.outputPath(shot), fullPage: true });

    expect(errors, 'script errors while rendering the one-sided chain').toEqual([]);
    await expect(page.getByRole('heading', { name: 'Page error' })).toHaveCount(0);
    await expect(page.getByRole('status', { name: 'Chain completeness' })).toContainText(
      `Incomplete options chain: ${MISSING[side]}.`,
    );
    // The backend's own warning still shows beside the notice.
    await expect(page.getByText(/Chain has no (put|call) contracts: GEX, VEX/)).toBeVisible();

    for (const name of ['Total GEX', 'Max Pain', 'Put/Call OI']) await expectUnavailableCard(page, name, MISSING[side]);
    for (const name of ['Gamma Flip', 'Gamma Balance']) await expectUnavailableCard(page, name, MISSING[side]);
    // No direction or skew conclusion is drawn from a missing value, and no zero is shown.
    await expect(card(page, 'Total GEX')).not.toContainText(/Positive|Negative/);
    await expect(card(page, 'Put/Call OI')).not.toContainText(/skew/);
    await expect(page.locator('.metric-value').filter({ hasText: /^\+?\$?0(\.0+)?$/ })).toHaveCount(0);
    // No per-strike profile is drawn from an empty gex_by_strike.
    await expect(page.getByText(/GEX by Strike/)).toHaveCount(0);

    if (side === 'calls_only') {
      await page.getByRole('button', { name: 'VEX', exact: true }).click();
      await expectUnavailableCard(page, 'Total VEX', MISSING[side]);
      await expect(card(page, 'Total VEX')).not.toContainText(/Positive|Negative/);
      await expect(
        page.getByText('The chain analytics provide neither a VEX total nor a per-strike VEX profile for this snapshot.'),
      ).toBeVisible();
      await page.screenshot({ path: info.outputPath('profiles-calls-only-vex.png'), fullPage: true });
    }
    expect(errors, 'script errors').toEqual([]);
  });
}

test('Gamma Map names the missing side for a one-sided grid and levels', async ({ page }, info) => {
  const errors = await setup(page, 'calls_only');
  await expect(page.locator('.hs-grid-card').getByText(/^Data unavailable:/)).toBeVisible();
  await page.screenshot({ path: info.outputPath('gamma-map-calls-only.png'), fullPage: true });

  await expect(page.locator('.hs-grid-card').getByText(/^Data unavailable:/)).toHaveText(
    `Data unavailable: ${MISSING.calls_only}`,
  );
  // Neither response has levels or cells, so no legend values are drawn at all.
  await expect(page.locator('.hs-legend')).toHaveCount(0);
  await expect(page.getByRole('note', { name: 'Gamma source warnings' })).toContainText('Chain has no put contracts');
  await expect(page.getByRole('heading', { name: 'Page error' })).toHaveCount(0);
  expect(errors, 'script errors').toEqual([]);
});

test('Gamma Map marks a one-sided grid total as unavailable beside complete levels', async ({ page }, info) => {
  const errors = await setup(page, 'calls_only', distinct.levels);
  const vex = page.locator('.hs-legend .chip').filter({ hasText: /Total\s*VEX/ });
  await expect(vex.locator('.val')).toHaveText(EM_DASH);
  await page.screenshot({ path: info.outputPath('gamma-map-one-sided-grid-total.png'), fullPage: true });

  const badge = vex.getByTestId('unavailable-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('title', MISSING.calls_only);
  // The complete levels keep their own reported values, with no badge.
  await expect(page.locator('.hs-legend .chip.flip .val')).toHaveText(distinct.levels.gamma_flip.toFixed(2));
  await expect(page.locator('.hs-legend .chip.flip').getByTestId('unavailable-badge')).toHaveCount(0);
  const gex = page.locator('.hs-legend .chip').filter({ hasText: /Total\s*GEX/ });
  await expect(gex.getByTestId('unavailable-badge')).toHaveCount(0);
  await expect(page.locator('.hs-grid-card').getByText(/^Data unavailable:/)).toHaveText(
    `Data unavailable: ${MISSING.calls_only}`,
  );
  expect(errors, 'script errors').toEqual([]);
});
