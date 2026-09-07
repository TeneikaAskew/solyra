/**
 * E2E: Movement Read / Expected-Move card on the dashboard.
 *
 * The card (src/components/dashboard/MovementRead.tsx) renders the assembled
 * movement statement from GET /api/movement-statement — validated TYPE
 * continuation as the headline + the validated 15m SIZE bucket + regime +
 * levels, with the "not a directional edge" honesty guard. Hermetic: all APIs
 * mocked (same pattern as dashboard.spec.ts). Proves the card renders end-to-end
 * with a realistic payload and produces screenshots for visual verification.
 */
import { test, expect } from '@playwright/test';
import { MOCK_MOVEMENT_STATEMENT, mockDashboard } from '../helpers/fixtures/dashboard';

// The assembled statement (shape verified live against the production
// assembler) now lives in src/mocks/dashboard.ts, shared with mock mode and
// the mockDashboard fixture; the variants below derive from it.
const MOCK_STATEMENT = MOCK_MOVEMENT_STATEMENT;

test('movement-read card renders TYPE + validated SIZE + regime (flag ON)', async ({ page }) => {
  await mockDashboard(page);
  await page.route('**/api/movement-statement*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_STATEMENT),
    }),
  );

  await page.goto('/dashboard');

  // Headline = TYPE continuation (structure read).
  const headline = page.getByTestId('movement-headline');
  await expect(headline).toBeVisible({ timeout: 15000 });
  await expect(headline).toContainText('1 candle');
  await expect(headline).toContainText('continuation');

  // SIZE context modifier renders the validated bucket.
  const modifiers = page.getByTestId('context-modifiers');
  await expect(modifiers).toBeVisible();
  await expect(modifiers).toContainText('TIGHT');

  // The honesty guard is present (never implies a direction).
  await expect(page.getByText(/not a directional or P&L edge/i)).toBeVisible();

  // Levels-to-go ladder renders each way, with reach-rates + a low-sample badge.
  await expect(page.getByText('Call levels')).toBeVisible();
  await expect(page.getByText('Put levels')).toBeVisible();
  await expect(page.getByTestId('low-sample-badge').first()).toBeVisible();

  // Screenshots for visual verification: the card element + the full page.
  // Write to an explicit, stable dir (env override) so they survive Playwright's
  // per-run test-results cleanup and OneDrive dehydration.
  const outDir = process.env.MOVEMENT_SHOT_DIR || 'test-results';
  const card = headline.locator(
    'xpath=ancestor::*[contains(@class,"min-w-0")][1]',
  );
  await card.screenshot({ path: `${outDir}/movement-read-card.png` });
  await page.screenshot({ path: `${outDir}/movement-read-dashboard.png`, fullPage: true });
});

// --- Affordances (three tiers) -------------------------------------------
function statementWith(expected_move: Record<string, unknown>) {
  return { ...MOCK_STATEMENT, confidence_modifiers: { ...MOCK_STATEMENT.confidence_modifiers, expected_move } };
}
const outDir = process.env.MOVEMENT_SHOT_DIR || 'test-results';

test('affordances — big-move state (green chip, risk hint, options idea, calculator)', async ({ page }) => {
  await mockDashboard(page);
  await page.route('**/api/movement-statement*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statementWith({
      status: 'OK', role: 'context', size_class: 'EXPLOSIVE', pred_bucket: 3,
      probabilities: { p_tight: 0.35, p_normal: 0.20, p_expanded: 0.25, p_explosive: 0.20 },
      max_proba: 0.35, model_version: 'magnitude-recal-48njf', ts: '2026-07-10T19:45:00+00:00',
      atr_20: 1.85, current_price: 218.4, usage_guidance: 'context only',
    })) }));
  await page.goto('/dashboard');
  await expect(page.getByTestId('size-light-chip')).toContainText('big move likely', { timeout: 15000 });
  await expect(page.getByTestId('expected-move-atr')).toContainText('1.5× ATR');
  await expect(page.getByTestId('risk-hint')).toContainText('wider stops');
  await expect(page.getByTestId('options-idea')).toBeVisible();
  await page.getByTestId('size-calculator').locator('summary').click();
  await page.getByTestId('calc-account').fill('10000');
  await page.getByTestId('calc-risk').fill('1');
  await expect(page.getByTestId('calc-result')).toContainText('shares');
  await page.getByTestId('movement-headline').locator('xpath=ancestor::*[contains(@class,"min-w-0")][1]')
    .screenshot({ path: `${outDir}/affordances-bigmove.png` });
});

test('affordances — tight state (red chip, no options idea, tighter stops)', async ({ page }) => {
  await mockDashboard(page);
  await page.route('**/api/movement-statement*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statementWith({
      status: 'OK', role: 'context', size_class: 'TIGHT', pred_bucket: 0,
      probabilities: { p_tight: 0.72, p_normal: 0.22, p_expanded: 0.05, p_explosive: 0.01 },
      max_proba: 0.72, model_version: 'm', ts: '2026-07-10T19:45:00+00:00',
      atr_20: 1.85, current_price: 218.4, usage_guidance: 'context only',
    })) }));
  await page.goto('/dashboard');
  await expect(page.getByTestId('size-light-chip')).toContainText('tight', { timeout: 15000 });
  await expect(page.getByTestId('options-idea')).toHaveCount(0);
  await expect(page.getByTestId('risk-hint')).toContainText('tighter stops');
  await page.getByTestId('movement-headline').locator('xpath=ancestor::*[contains(@class,"min-w-0")][1]')
    .screenshot({ path: `${outDir}/affordances-tight.png` });
});

test('affordances — ATR null disables the calculator', async ({ page }) => {
  await mockDashboard(page);
  await page.route('**/api/movement-statement*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statementWith({
      status: 'OK', role: 'context', size_class: 'EXPANDED', pred_bucket: 2,
      probabilities: { p_tight: 0.3, p_normal: 0.3, p_expanded: 0.3, p_explosive: 0.1 },
      max_proba: 0.3, model_version: 'm', ts: '2026-07-10T19:45:00+00:00',
      atr_20: null, current_price: null, usage_guidance: 'context only',
    })) }));
  await page.goto('/dashboard');
  await expect(page.getByTestId('size-light-chip')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('size-calculator').locator('summary').click();
  await expect(page.getByTestId('size-calculator')).toContainText('ATR unavailable');
  await page.getByTestId('movement-headline').locator('xpath=ancestor::*[contains(@class,"min-w-0")][1]')
    .screenshot({ path: `${outDir}/affordances-atrnull.png` });
});
