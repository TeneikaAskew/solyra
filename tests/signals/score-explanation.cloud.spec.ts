/** Owner-run closeout only, after the backend and frontend have deployed.
 * Uses the cloud project's existing saved Firebase session and real responses.
 * No mocks, auth setup, deployment, or provider writes. Local runs skip before
 * navigation. Missing rows or missing typed contracts fail, not vacuous success.
 * A passing run proves only the observed rows; native/legacy fixture coverage
 * remains the separate hermetic evidence, not a claim about deployed contents.
 */
import { test, expect } from '@playwright/test';
import type { components } from '../../src/types/stocksOpenApi.gen';

type SignalsResponse = components['schemas']['SignalsResponse'];

for (const route of ['/dashboard', '/signals']) {
  test(`deployed ${route} preserves the received historical score contract`, async ({ page }, info) => {
    test.skip(info.project.name !== 'cloud', 'Owner-run cloud project only; no local deployed acceptance.');
    const pending = page.waitForResponse(response =>
      /^\/api\/signals\/[^/]+$/.test(new URL(response.url()).pathname) && response.request().method() === 'GET');
    await page.goto(route);
    await expect(page.getByTestId('nav-menu-support')).toBeVisible();
    const response = await pending;
    expect(response.ok(), 'A successful authenticated signals response is required.').toBe(true);
    expect(/^Bearer \S+$/.test((await response.request().headerValue('authorization')) ?? ''),
      'The response must exercise the saved Firebase session.').toBe(true);
    const payload = await response.json() as SignalsResponse;
    expect(payload.signals.length, 'Run with existing historical rows; empty data is not score parity proof.').toBeGreaterThan(0);
    await expect(page.getByText('Historical analytical signals', { exact: true })).toBeVisible();
    const score = page.getByTestId('score-explanation').first();
    await expect(score).toBeVisible();
    await score.locator('summary').click();
    const field = (label: string) => score.locator('dl > div').filter({ has: page.getByText(`${label}:`, { exact: true }) }).locator('dd');
    const eventTime = await field('Event time').innerText();
    const strength = await score.getByTestId('signal-strength').innerText();
    const matches = payload.signals.filter(row => row.time === eventTime &&
      (typeof row.score === 'number' && Number.isFinite(row.score) ? String(row.score) : 'Unavailable') === strength);
    expect(matches.length, 'Visible row must identify one unambiguous response record.').toBe(1);
    const row = matches[0];
    const explanation = row.score_explanation;
    expect(explanation, 'Typed backend explanation required; a missing old contract cannot pass closeout.').toBeTruthy();
    expect(explanation!.version).toBe('historical-score-v1');
    expect(['recorded', 'legacy_unavailable', 'invalid_record']).toContain(explanation!.status);
    await expect(field('Corpus')).toHaveText('historical_signals');
    await expect(field('API response source')).toHaveText(payload.source || 'Unavailable');
    if (explanation!.status === 'recorded') {
      await expect(score).toContainText(`Base conditions: ${explanation!.base_count}/${explanation!.base_max}`);
      const composite = explanation!.composite_max === null ? String(explanation!.composite_strength)
        : `${explanation!.composite_strength}/${explanation!.composite_max}`;
      await expect(score).toContainText(`Composite strength: ${composite}`);
      await expect(score).toContainText(`Bonus total: ${explanation!.bonus_total}`);
      const p = explanation!.provenance;
      for (const [label, value] of [
        ['Strategy', p.strategy], ['Profile', p.profile], ['Run kind', p.run_kind],
        ['Storage source', p.storage_source], ['Producer definition', p.producer_definition],
        ['Code identity', p.code_sha256], ['Config identity', p.config_sha256], ['Input identity', p.input_sha256],
        ['Generated at', p.generated_at], ['Inserted at', p.inserted_at ?? row.inserted_at],
      ]) await expect(field(label!)).toHaveText(value || 'Unavailable');
    } else {
      await expect(score).toContainText('Breakdown unavailable');
      await expect(score).not.toContainText('Base conditions:');
      for (const reason of explanation!.unavailable_reasons) await expect(score).toContainText(reason);
      if (typeof row.conditions_met === 'string') await expect(score).toContainText(`Raw conditions (unvalidated): ${row.conditions_met}`);
    }
    await expect(score).toContainText('Recorded identity does not establish point-in-time availability.');
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await info.attach('historical-score-live-receipt', {
      body: JSON.stringify({ route, ticker: payload.ticker, source: payload.source, event_time: row.time,
        score: row.score, explanation, received_at: new Date().toISOString(),
        coverage: 'Observed row only; other score states require separate evidence.' }),
      contentType: 'application/json',
    });
    await score.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`${route.slice(1)}-score-live.png`), fullPage: true });
  });
}
