/**
 * E2E: Settings — appearance & display preferences.
 *
 * Covers the page the coverage audit flagged as the last one with no E2E at
 * all: the four control groups (theme / navigation / density / accent), the
 * server write-through each change triggers (PUT /api/me/preferences with the
 * full payload), and the sync-status banner's Rule-4 behaviour — a failed
 * read renders "Preferences not synced", never a silent fallback.
 *
 * Assertions favour durable surfaces over HeroUI internals: the network
 * payload, documentElement's data-theme (themeStore), the density/accent
 * classes settingsStore puts on body, and the persisted shell-settings key.
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { UserPreferences } from '@/types/preferences';
import { M, mockCommon } from '../helpers/mocks';

/** Wire /api/me/preferences with a PUT recorder. GET answers all-null
 *  ("nothing stored yet"), PUTs echo the payload back like the real API. */
async function mockPreferencesApi(page: Page, puts: unknown[]) {
  await page.route('**/api/me/preferences', (r) => {
    const req = r.request();
    if (req.method() === 'PUT') {
      const body = JSON.parse(req.postData() || '{}');
      puts.push(body);
      return r.fulfill(M.ok(body));
    }
    return r.fulfill(
      M.ok({ theme: null, nav_pattern: null, density: null, accent: null } satisfies UserPreferences)
    );
  });
}

function section(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });
}

test.describe('Settings — appearance & sync', () => {
  test('renders all four control groups and reports synced once hydrated', async ({ page }) => {
    await mockCommon(page);
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    for (const t of ['Theme', 'Navigation', 'Density', 'Accent']) {
      await expect(section(page, t)).toBeVisible();
    }
    // Owner claimed + GET resolved → the banner settles on synced, proving
    // the sync loop is alive under StrictMode (regression: a render-phase
    // ownership claim left it stuck on "Loading your saved preferences…").
    await expect(page.getByText('Synced to your account.')).toBeVisible();
  });

  test('theme toggle applies data-theme and writes through', async ({ page }) => {
    const puts: unknown[] = [];
    await mockCommon(page);
    await mockPreferencesApi(page, puts);
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();

    // HeroUI's single-selection ToggleButtonGroup renders as a radiogroup.
    await section(page, 'Theme').getByRole('radio', { name: /light/i }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect
      .poll(() => puts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'light', nav_pattern: 'top-tabs', density: 'dense', accent: 'blue' });
  });

  test('navigation toggle persists the shell choice and writes through', async ({ page }) => {
    const puts: unknown[] = [];
    await mockCommon(page);
    await mockPreferencesApi(page, puts);
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();

    await section(page, 'Navigation').getByRole('radio', { name: /sidebar/i }).click();

    await expect
      .poll(() => puts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'dark', nav_pattern: 'sidebar', density: 'dense', accent: 'blue' });
    const persisted = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem('platform-shell-settings') ?? '{}'),
    );
    expect(persisted.navPattern).toBe('sidebar');
  });

  test('density and accent picks land on <body> and write through', async ({ page }) => {
    const puts: unknown[] = [];
    await mockCommon(page);
    await mockPreferencesApi(page, puts);
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();

    await section(page, 'Density').getByRole('radio', { name: /comfy/i }).click();
    await expect(page.locator('body')).toHaveClass(/density-comfy/);
    await expect
      .poll(() => puts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'dark', nav_pattern: 'top-tabs', density: 'comfy', accent: 'blue' });

    await section(page, 'Accent').getByRole('button', { name: 'violet' }).click();
    await expect(page.locator('body')).toHaveClass(/accent-violet/);
    await expect
      .poll(() => puts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'dark', nav_pattern: 'top-tabs', density: 'comfy', accent: 'violet' });
  });

  test('a failed preferences read is announced, never swallowed (Rule 4)', async ({ page }) => {
    await mockCommon(page);
    // Registered after mockCommon so this 500 wins (newest-first matching).
    await page.route('**/api/me/preferences', (r) =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' }),
    );
    await page.goto('/settings');

    await expect(page.getByText(/preferences not synced/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/changes still apply on this device/i)).toBeVisible();
    // The controls stay usable — local-only, but never a fake "synced".
    await expect(page.getByText('Synced to your account.')).not.toBeVisible();
  });
});
