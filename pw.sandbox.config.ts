import base from './playwright.config';
export default { ...base, projects: (base as any).projects.map((p: any) => ({ ...p, use: { ...p.use, channel: 'chromium' } })) };
