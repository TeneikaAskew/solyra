// Screenshot-evidence variant of the local e2e suite: playwright.config.ts's
// chromium project with a screenshot for EVERY test (not just failures), plus
// the warmup project chromium depends on, without which Playwright refuses to
// load the config ("Project 'chromium' depends on unknown project 'warmup'").
// Run it with:
//   npx playwright test --config=playwright.screens.config.ts
// It boots its own Vite on :5199 through playwright.config.ts's webServer, as
// `npm run e2e` does. Not referenced by CI; the default config is unaffected.
import baseConfig from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...baseConfig,
  projects: (baseConfig.projects ?? [])
    .filter((p) => p.name === 'warmup' || p.name === 'chromium')
    .map((p) =>
      p.name === 'chromium' ? { ...p, use: { ...p.use, screenshot: 'on' as const } } : p,
    ),
});
