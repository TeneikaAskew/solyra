/** Resolve the public research endpoint/key together, before obtaining an ID token. */
export interface ResearchConfigEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  DEV?: boolean;
}
const DEFAULT_PROJECT_ID = 'hajmcfkqmtgidstpggrh';
const DEFAULT_PUBLIC_KEY = 'sb_publishable_FIw2-fs3KHbJjIDVmKlxtA_1dmC4B4F';

export function researchServiceConfig(env: ResearchConfigEnv): { functionUrl: string; publishableKey: string } {
  const values = [env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PROJECT_ID, env.VITE_SUPABASE_PUBLISHABLE_KEY];
  const overridden = values.some(value => value !== undefined && value !== '');
  const invalid = () => new Error('Research service configuration is incomplete or invalid.');
  if (!overridden) return {
    functionUrl: `https://${DEFAULT_PROJECT_ID}.supabase.co/functions/v1/insights-research`,
    publishableKey: DEFAULT_PUBLIC_KEY,
  };
  const urlValue = env.VITE_SUPABASE_URL?.trim();
  const project = env.VITE_SUPABASE_PROJECT_ID?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key || (!urlValue && !project)) throw invalid();
  // A supplied-but-blank endpoint/project is a configuration error, not a default.
  if ((env.VITE_SUPABASE_URL && !urlValue) || (env.VITE_SUPABASE_PROJECT_ID && !project)) throw invalid();
  if (project && !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(project)) throw invalid();
  let url: URL;
  try { url = new URL(urlValue || `https://${project}.supabase.co`); }
  catch { throw invalid(); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(env.DEV && loopback && url.protocol === 'http:')) throw invalid();
  if (url.username || url.password || url.href.includes('?') || url.href.includes('#')) throw invalid();
  const suppliedProject = url.hostname.match(/^([a-zA-Z0-9-]+)\.supabase\.co$/)?.[1];
  if (project && suppliedProject && suppliedProject !== project.toLowerCase()) throw invalid();
  // Custom domains are valid complete URL/key overrides; their remote ownership is
  // not inferred from a project-id string or an opaque public key.
  const base = url.href.replace(/\/+$/, '');
  return { functionUrl: `${base}/functions/v1/insights-research`, publishableKey: key };
}
