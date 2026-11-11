import { test, expect, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockOptionsApi } from '../helpers/fixtures/options';

// FEAT-OPTION-001 stored snapshot labels (solyra spec
// docs/superpowers/specs/2026-11-07-feat-option-001-snapshot-labels.md).
// Hermetic: every /api call is intercepted and anything off localhost is
// aborted, so no provider or production network is reached.
const sample = JSON.parse(readFileSync(new URL('../fixtures/distinct-gamma-producer-contract.json', import.meta.url), 'utf8'));
const LABEL = 'Stored options snapshot — freshness and completeness unverified';
// A prior-session REALTIME chain, read the next morning.
const prov = (over: Record<string, unknown> = {}) => ({
  provider: 'alphavantage',
  market_session: 'REALTIME',
  snapshot_ts: '2026-11-06T19:55:00+00:00',
  observed_at: '2026-11-07T14:09:30+00:00',
  snapshot_age_seconds: 65_670,
  freshness_status: 'unknown',
  completeness_status: 'unknown',
  reason: 'legacy_snapshot_unqualified',
  ...over,
});
const LIVE_CLAIMS = /\bLIVE\b|5-min snapshot|live dealer|realtime dealer/i;

type Answer = Parameters<Route['fulfill']>[0];
async function setup(page: Page, opts: { grid: () => Answer | Promise<Answer>; levels?: unknown; dates?: string[] }) {
  await page.route('**/*', (r) => {
    const u = new URL(r.request().url());
    return !['localhost', '127.0.0.1'].includes(u.hostname) || u.pathname.startsWith('/api/')
      ? r.abort('blockedbyclient')
      : r.continue();
  });
  await mockOptionsApi(page);
  const dates = opts.dates ?? (opts.levels ? ['2026-11-06'] : []);
  await page.route('**/api/options/dates/IWM*', (r) => r.fulfill({ json: { ticker: 'IWM', dates } }));
  await page.route('**/api/options/IWM/*/levels*', (r) =>
    r.fulfill(opts.levels ? { json: opts.levels } : { status: 503, json: { detail: 'levels offline' } }));
  let gridRequests = 0;
  await page.route('**/api/options/IWM/grid*', async (r) => {
    gridRequests++;
    await r.fulfill(await opts.grid());
  });
  await page.goto('/options');
  return { gridRequests: () => gridRequests };
}

const pill = (page: Page) => page.locator('.hs-toolbar .hs-pill');
const banner = (page: Page) => page.locator('.hs-demo-banner');

async function expectNoLiveClaim(page: Page) {
  await expect(pill(page)).not.toHaveText(LIVE_CLAIMS);
  await expect(banner(page)).not.toHaveText(LIVE_CLAIMS);
  await expect(pill(page).locator('.pulse')).toHaveCount(0);
  await expect(pill(page)).not.toHaveClass(/\brealtime\b/);
  // The banner dot holds still for a stored snapshot: no pulse class and no running animation.
  await expect(banner(page).locator('.dot')).toHaveCount(1);
  await expect(banner(page).locator('.dot.pulse')).toHaveCount(0);
  await expect(banner(page).locator('.dot')).toHaveCSS('animation-name', 'none');
}

test('prior-session REALTIME grid and levels show the stored label with recorded Eastern time and server age', async ({ page }, info) => {
  await setup(page, {
    grid: () => ({ json: { ...sample.grid, snapshot_provenance: prov() } }),
    levels: { ...sample.levels, snapshot_provenance: prov({ snapshot_age_seconds: 65_671, observed_at: '2026-11-07T14:09:31+00:00' }) },
  });
  await expect(pill(page)).toContainText(LABEL);
  await expect(pill(page)).toContainText('Recorded snapshot time 2026-11-06 14:55 EST');
  await expect(pill(page)).toContainText('realtime origin');
  await expect(pill(page)).toHaveClass(/\bstored\b/);
  await expect(banner(page)).toContainText(`IWM ${LABEL}`);
  await expect(banner(page)).toContainText('age 18h 14m as of 2026-11-07 09:09 EST');
  const levelsNote = page.getByRole('note', { name: 'Levels source' });
  await expect(levelsNote).toContainText(`IWM · 2026-10-27 · ${LABEL}`);
  await expect(levelsNote).toContainText('Recorded snapshot time 2026-11-06 14:55 EST');
  await expectNoLiveClaim(page);
  await expect(page.locator('.hs-legend')).toHaveCount(1);
  await page.screenshot({ path: info.outputPath('01-provenance-prior-session-realtime.png'), fullPage: true });
});

test('an old payload without snapshot_provenance gets the same neutral label and keeps its aware timestamp, with no age', async ({ page }, info) => {
  await setup(page, { grid: () => ({ json: sample.grid }), levels: sample.levels });
  await expect(pill(page)).toContainText(LABEL);
  await expect(pill(page)).toContainText('Recorded snapshot time 2026-10-27 15:55 EDT');
  await expect(banner(page)).toContainText(LABEL);
  await expect(banner(page)).not.toContainText('age ');
  await expect(page.getByRole('note', { name: 'Levels source' })).toContainText('Recorded snapshot time 2026-10-27 15:55 EDT');
  await expectNoLiveClaim(page);
  await page.screenshot({ path: info.outputPath('02-old-payload-no-provenance.png'), fullPage: true });
});

test('null and invalid provenance timestamps render the recorded time as unavailable, never the legacy field or an age', async ({ page }, info) => {
  const invalid = prov({ snapshot_ts: null, snapshot_age_seconds: null, reason: 'timestamp_invalid' });
  await setup(page, {
    grid: () => ({ json: { ...sample.grid, snapshot_provenance: invalid } }),
    levels: { ...sample.levels, snapshot_provenance: { ...invalid, snapshot_ts: '2026-11-06T19:55:00' } },
  });
  await expect(pill(page)).toContainText(LABEL);
  await expect(pill(page)).toContainText('Recorded snapshot time unavailable');
  await expect(pill(page)).not.toContainText('2026-10-27');
  await expect(banner(page)).not.toContainText('age ');
  await expect(page.getByRole('note', { name: 'Levels source' })).toContainText('Recorded snapshot time unavailable');
  await expectNoLiveClaim(page);
  await page.screenshot({ path: info.outputPath('03-null-and-invalid-timestamps.png'), fullPage: true });
});

test('a future snapshot time is kept for diagnosis and shows no age', async ({ page }, info) => {
  await setup(page, {
    grid: () => ({ json: { ...sample.grid, snapshot_provenance: prov({ snapshot_ts: '2026-11-08T15:00:00+00:00', snapshot_age_seconds: null, reason: 'timestamp_future' }) } }),
  });
  await expect(pill(page)).toContainText('Recorded snapshot time 2026-11-08 10:00 EST');
  await expect(banner(page)).toContainText('later than the response time, so no age is shown');
  await expect(banner(page)).not.toContainText('age 0');
  await expect(banner(page)).not.toContainText(' as of ');
  await expectNoLiveClaim(page);
  await page.screenshot({ path: info.outputPath('04-future-timestamp-no-age.png'), fullPage: true });
});

test('the unavailable envelope never shows the stored snapshot label', async ({ page }, info) => {
  await setup(page, {
    grid: () => ({ json: { ...sample.grid, data_source: 'unavailable', spot: null, cells: [], snapshot_ts: null, reason: 'no snapshot available', snapshot_provenance: null } }),
  });
  await expect(pill(page)).toContainText('UNAVAILABLE');
  await expect(page.getByText('IWM gamma grid unavailable.')).toBeVisible();
  await expect(page.getByText(LABEL)).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('05-unavailable-envelope.png'), fullPage: true });
});

test('loading and error states never show the stored snapshot label', async ({ page }, info) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  let fail = false;
  await setup(page, {
    grid: async () => {
      if (fail) return { status: 503, json: { detail: 'snapshot temporarily refused' } };
      await held;
      return { json: { ...sample.grid, snapshot_provenance: prov() } };
    },
  });
  await expect(page.getByText('Loading gamma grid…')).toBeVisible();
  await expect(page.getByText(LABEL)).toHaveCount(0);
  await expect(pill(page)).toContainText('UNAVAILABLE');
  await page.screenshot({ path: info.outputPath('06-loading.png'), fullPage: true });
  release();
  await expect(pill(page)).toContainText(LABEL);
  fail = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(pill(page)).toContainText('UNAVAILABLE');
  await expect(page.getByText(/Data unavailable:/)).toBeVisible();
  await expect(page.getByText(LABEL)).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('07-error-after-refetch.png'), fullPage: true });
});

test('a warm client cache and a re-stamped refetch keep the recorded snapshot time', async ({ page }, info) => {
  let observed = { observed_at: '2026-11-07T14:09:30+00:00', snapshot_age_seconds: 65_670 };
  const net = await setup(page, { grid: () => ({ json: { ...sample.grid, snapshot_provenance: prov(observed) } }) });
  await expect(banner(page)).toContainText('age 18h 14m as of 2026-11-07 09:09 EST');
  // Leave Live and come back: the cached body is served as it was, no request.
  await page.getByRole('button', { name: 'Historical', exact: true }).click();
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await expect(pill(page)).toContainText('Recorded snapshot time 2026-11-06 14:55 EST');
  await expect(banner(page)).toContainText('age 18h 14m as of 2026-11-07 09:09 EST');
  expect(net.gridRequests()).toBe(1);
  await page.screenshot({ path: info.outputPath('08-warm-client-cache.png'), fullPage: true });
  // The server re-stamps observed_at on a later response; the stored clock does not move.
  observed = { observed_at: '2026-11-07T15:39:30+00:00', snapshot_age_seconds: 71_070 };
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(banner(page)).toContainText('age 19h 44m as of 2026-11-07 10:39 EST');
  await expect(pill(page)).toContainText('Recorded snapshot time 2026-11-06 14:55 EST');
  expect(net.gridRequests()).toBe(2);
  await expectNoLiveClaim(page);
  await page.screenshot({ path: info.outputPath('09-refetch-restamped-age-same-recorded-time.png'), fullPage: true });
});
