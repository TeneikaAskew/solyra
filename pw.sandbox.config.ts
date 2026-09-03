import base from './playwright.config';
const cfg = { ...base, projects: (base.projects ?? []).map((p) => ({ ...p, use: { ...p.use, launchOptions: { executablePath: '/opt/ms-playwright/chromium-1194/chrome-linux/chrome' } } })) };
export default cfg;
