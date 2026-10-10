/**
 * E2E: Settings — profile, appearance, trading defaults, notifications, account.
 *
 * The page is tabbed (profile | appearance | trading | notifications |
 * account) and lands on Profile. Two persistence models are covered:
 *  - Appearance controls write through instantly via PUT /api/me/preferences;
 *    each interaction asserts the payload plus its DOM effect.
 *  - The profile form is draft + Save via PUT /api/me/profile; the save test
 *    asserts the minimal diff body and the Saved confirmation.
 * Rule 4 branches: a failed preferences read renders "Appearance not synced",
 * a failed profile save renders the error - neither is ever swallowed.
 *
 * Assertions favour durable surfaces over HeroUI internals: network payloads,
 * documentElement's data-theme (themeStore), the density/accent classes
 * settingsStore puts on body, and the persisted shell-settings key.
 */
import { test, expect, type Page } from '@playwright/test';
import type { UserPreferences } from '@/types/preferences';
import { MOCK_PROFILE } from '@/mocks/common';
import { M, mockCommon } from '../helpers/mocks';

/** Wire the two settings endpoints with PUT recorders. GETs answer "nothing
 *  stored yet" (all-null preferences; empty profile object), PUTs echo the
 *  payload back like the real API. */
async function mockSettingsApi(
  page: Page,
  rec: { prefPuts?: unknown[]; profilePuts?: unknown[] } = {},
) {
  await mockCommon(page);
  await page.route('**/api/me/preferences', (r) => {
    const req = r.request();
    if (req.method() === 'PUT') {
      const body = JSON.parse(req.postData() || '{}');
      rec.prefPuts?.push(body);
      return r.fulfill(M.ok(body));
    }
    return r.fulfill(
      M.ok({ theme: null, nav_pattern: null, density: null, accent: null } satisfies UserPreferences)
    );
  });
  await page.route('**/api/me/profile', (r) => {
    const req = r.request();
    if (req.method() === 'PUT') {
      const body = JSON.parse(req.postData() || '{}');
      rec.profilePuts?.push(body);
      return r.fulfill(M.ok(body));
    }
    return r.fulfill(M.ok({}));
  });
}

function section(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) });
}

async function openAppearance(page: Page) {
  await page.getByRole('tab', { name: 'Appearance' }).click();
}

test.describe('Settings — tabs & sync', () => {
  test('renders the five tabs, lands on Profile, and reports synced once hydrated', async ({
    page,
  }) => {
    await mockSettingsApi(page);
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    for (const t of ['Profile', 'Appearance', 'Trading', 'Notifications', 'Account']) {
      await expect(page.getByRole('tab', { name: t })).toBeVisible();
    }
    await expect(page.getByRole('tab', { name: 'Profile' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(section(page, 'Your account')).toBeVisible();
    // Owner claimed + both GETs resolved → the banner settles on synced,
    // proving the preferences sync loop is alive under StrictMode
    // (regression: a render-phase ownership claim left it stuck loading).
    await expect(page.getByText('Synced to your account.')).toBeVisible();
  });

  test('a failed preferences read is announced, never swallowed (Rule 4)', async ({ page }) => {
    await mockSettingsApi(page);
    // Registered after mockSettingsApi so this 500 wins (newest-first matching).
    await page.route('**/api/me/preferences', (r) =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' }),
    );
    await page.goto('/settings');

    await expect(page.getByText(/appearance not synced/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/changes still apply on this device/i)).toBeVisible();
    await expect(page.getByText('Synced to your account.')).not.toBeVisible();
  });
});

test.describe('Settings — appearance write-through', () => {
  test('theme toggle applies data-theme and writes through', async ({ page }) => {
    const prefPuts: unknown[] = [];
    await mockSettingsApi(page, { prefPuts });
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();
    await openAppearance(page);

    // HeroUI's single-selection ToggleButtonGroup renders as a radiogroup.
    await section(page, 'Theme').getByRole('radio', { name: /light/i }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect
      .poll(() => prefPuts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'light', nav_pattern: 'top-tabs', density: 'dense', accent: 'dawn' });
  });

  test('navigation toggle persists the shell choice and writes through', async ({ page }) => {
    const prefPuts: unknown[] = [];
    await mockSettingsApi(page, { prefPuts });
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();
    await openAppearance(page);

    await section(page, 'Navigation').getByRole('radio', { name: /sidebar/i }).click();

    await expect
      .poll(() => prefPuts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'dark', nav_pattern: 'sidebar', density: 'dense', accent: 'dawn' });
    const persisted = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem('platform-shell-settings') ?? '{}'),
    );
    expect(persisted.navPattern).toBe('sidebar');
  });

  test('density and accent picks land on <body> and write through', async ({ page }) => {
    const prefPuts: unknown[] = [];
    await mockSettingsApi(page, { prefPuts });
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();
    await openAppearance(page);

    await section(page, 'Density').getByRole('radio', { name: /comfy/i }).click();
    await expect(page.locator('body')).toHaveClass(/density-comfy/);
    await expect
      .poll(() => prefPuts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'dark', nav_pattern: 'top-tabs', density: 'comfy', accent: 'dawn' });

    await section(page, 'Accent').getByRole('button', { name: 'violet' }).click();
    await expect(page.locator('body')).toHaveClass(/accent-violet/);
    await expect
      .poll(() => prefPuts.at(-1), { timeout: 5_000 })
      .toEqual({ theme: 'dark', nav_pattern: 'top-tabs', density: 'comfy', accent: 'violet' });
  });
});

test.describe('Settings — profile draft & save', () => {
  test('editing the draft marks it dirty; Save PUTs only the diff and confirms', async ({
    page,
  }) => {
    const profilePuts: unknown[] = [];
    await mockSettingsApi(page, { profilePuts });
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();

    const saveBtn = page.getByRole('button', { name: 'Save changes' });
    await expect(saveBtn).toBeDisabled();

    await page.getByLabel('Display name').fill('Teneika A.');
    await expect(page.getByText('Unsaved changes.')).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    await saveBtn.click();
    // Only the changed field travels — the minimal diff, not the whole form
    await expect.poll(() => profilePuts.at(-1), { timeout: 5_000 }).toEqual({
      display_name: 'Teneika A.',
    });
    await expect(page.getByText('Saved.')).toBeVisible();
  });

  test('a failed save is rendered, never reported as saved (Rule 4)', async ({ page }) => {
    await mockSettingsApi(page);
    await page.route('**/api/me/profile', (r) => {
      if (r.request().method() === 'PUT') {
        return r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' });
      }
      return r.fulfill(M.ok({}));
    });
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();

    await page.getByLabel('Display name').fill('Someone Else');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(/could not save your profile/i)).toBeVisible();
    await expect(page.getByText('Saved.')).not.toBeVisible();
  });

  test('Discard returns the draft to the stored values and persists nothing', async ({ page }) => {
    const profilePuts: unknown[] = [];
    await mockSettingsApi(page);
    // Registered after mockSettingsApi so it wins (newest-first matching): a
    // stored profile, so Discard has a real value to go back to.
    await page.route('**/api/me/profile', (r) => {
      const req = r.request();
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData() || '{}');
        profilePuts.push(body);
        return r.fulfill(M.ok({ ...MOCK_PROFILE, ...body }));
      }
      return r.fulfill(M.ok(MOCK_PROFILE));
    });
    await page.goto('/settings');
    await expect(page.getByText('Synced to your account.')).toBeVisible();

    const name = page.getByLabel('Display name');
    const saveBtn = page.getByRole('button', { name: 'Save changes' });
    const discardBtn = page.getByRole('button', { name: 'Discard' });
    await expect(name).toHaveValue(MOCK_PROFILE.display_name);
    await expect(discardBtn).toHaveCount(0);

    await name.fill('Half typed');
    await expect(page.getByText('Unsaved changes.')).toBeVisible();
    await expect(saveBtn).toBeEnabled();
    await discardBtn.click();

    // Back to the stored value, with a quiet save bar and nothing to save.
    await expect(name).toHaveValue(MOCK_PROFILE.display_name);
    await expect(page.getByText('Unsaved changes.')).not.toBeVisible();
    await expect(discardBtn).toHaveCount(0);
    await expect(saveBtn).toBeDisabled();

    // Nothing half-typed was persisted: the next save carries its own field only.
    await page.getByLabel('Time zone').fill('Europe/London');
    await saveBtn.click();
    await expect(page.getByText('Saved.')).toBeVisible();
    expect(profilePuts).toEqual([{ timezone: 'Europe/London' }]);
  });
});

test.describe('Settings — failures are announced', () => {
  test('a failed profile read and a failed appearance write are each announced, never swallowed (Rule 4)', async ({
    page,
  }) => {
    const prefPuts: unknown[] = [];
    await mockSettingsApi(page);
    // Registered after mockSettingsApi so these win (newest-first matching).
    await page.route('**/api/me/profile', (r) =>
      r.fulfill({
        status: 503,
        contentType: 'application/json',
        body: '{"detail":"profile temporarily unavailable"}',
      }),
    );
    await page.route('**/api/me/preferences', (r) => {
      if (r.request().method() === 'PUT') {
        prefPuts.push(JSON.parse(r.request().postData() || '{}'));
        return r.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"boom"}' });
      }
      return r.fulfill(
        M.ok({ theme: null, nav_pattern: null, density: null, accent: null } satisfies UserPreferences),
      );
    });
    await page.goto('/settings');

    // The read is retried once, then the header says so instead of "Synced".
    await expect(page.getByText('Could not load your profile (HTTP 503)')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Synced to your account.')).not.toBeVisible();

    // A refused appearance write is announced, and the pick still applies here.
    await openAppearance(page);
    await section(page, 'Theme').getByRole('radio', { name: /light/i }).click();
    await expect(
      page.getByText(/appearance not synced, could not save preferences \(http 500\)/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/changes still apply on this device/i)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(prefPuts).toHaveLength(1);
  });
});
