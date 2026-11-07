// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInsightsLovable } from './useInsightsLovable';
const { token } = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ getIdToken: token }));
vi.mock('@/lib/runtimeConfig', () => ({ getAuthMode: () => 'firebase' }));
let current: ReturnType<typeof useInsightsLovable>;
let root: Root; let container: HTMLDivElement;
const transport = vi.fn();
function Harness() { current = useInsightsLovable(); return null; }
const customKey = 'fixture-public-key';
function env(values: Record<string, string | boolean | undefined>) { for (const [key, value] of Object.entries(values)) { if (key === 'DEV' && typeof value === 'boolean') vi.stubEnv('DEV', value); else vi.stubEnv(key, value as string | undefined); } }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  env({ VITE_SUPABASE_URL: undefined, VITE_SUPABASE_PROJECT_ID: undefined, VITE_SUPABASE_PUBLISHABLE_KEY: undefined, DEV: false });
  token.mockReset().mockResolvedValue('fixture-id-token');
  transport.mockReset().mockImplementation(async () => new Response(JSON.stringify({ sessions: [] }), { status: 200 }));
  vi.stubGlobal('fetch', transport);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(Harness)));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function list() { await act(async () => { await current.loadSessions(); }); }
describe('research endpoint and public key resolve as one configuration', () => {
  it('preserves the owner default pair when all overrides are absent', async () => {
    await list(); expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe('https://hajmcfkqmtgidstpggrh.supabase.co/functions/v1/insights-research');
    expect(init.headers.apikey).toMatch(/^sb_publishable_/);
    expect(init.headers.Authorization).toBe('Bearer fixture-id-token');
  });
  it.each([
    ['URL only', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co' }],
    ['project only', { VITE_SUPABASE_PROJECT_ID: 'otherproject' }],
    ['key only', { VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['whitespace URL', { VITE_SUPABASE_URL: '   ', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['whitespace key', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: '   ' }],
    ['malformed URL', { VITE_SUPABASE_URL: 'not a URL', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['relative URL', { VITE_SUPABASE_URL: '/research', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['insecure production URL', { VITE_SUPABASE_URL: 'http://otherproject.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['URL credentials', { VITE_SUPABASE_URL: 'https://user:pass@otherproject.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['URL query', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co?route=other', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['URL fragment', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co#other', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['empty URL query', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co?', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['empty URL fragment', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co#', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['conflicting Supabase project', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co', VITE_SUPABASE_PROJECT_ID: 'thirdproject', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
    ['malformed project', { VITE_SUPABASE_PROJECT_ID: 'other/project', VITE_SUPABASE_PUBLISHABLE_KEY: customKey }],
  ])('refuses %s before token access or transport', async (_name, values) => {
    env(values); await expect(list()).rejects.toThrow(/Research service configuration/);
    expect(token).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
  });
  it.each([
    ['explicit URL', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co' }, 'https://otherproject.supabase.co'],
    ['project', { VITE_SUPABASE_PROJECT_ID: 'otherproject' }, 'https://otherproject.supabase.co'],
    ['matching project and URL', { VITE_SUPABASE_URL: 'https://otherproject.supabase.co/', VITE_SUPABASE_PROJECT_ID: 'otherproject' }, 'https://otherproject.supabase.co'],
    ['custom domain without project inference', { VITE_SUPABASE_URL: 'https://research.example.test' }, 'https://research.example.test'],
    ['development fixture path', { VITE_SUPABASE_URL: 'http://localhost:5199/__e2e_research__/', DEV: true }, 'http://localhost:5199/__e2e_research__'],
  ])('uses a complete %s override without mixing defaults', async (_name, values, base) => {
    env({ ...values, VITE_SUPABASE_PUBLISHABLE_KEY: customKey }); await list();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe(`${base}/functions/v1/insights-research`);
    expect(transport.mock.calls[0][1].headers.apikey).toBe(customKey);
  });
  it('preserves signed-out refusal with otherwise valid configuration', async () => {
    token.mockResolvedValue(null); await expect(list()).rejects.toThrow('Sign in'); expect(transport).not.toHaveBeenCalled();
  });
});
