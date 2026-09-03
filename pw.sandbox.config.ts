import base from './playwright.config';
const exe = '/opt/ms-playwright/chromium-1194/chrome-linux/chrome';
const b: any = base;
export default { ...b, projects: b.projects.map((p: any) => ({ ...p, use: { ...p.use, launchOptions: { ...(p.use?.launchOptions ?? {}), executablePath: exe } } })) };
