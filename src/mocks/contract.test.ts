// @vitest-environment node
/**
 * Cross-repo API contract check — CLAUDE.md Rule 6.
 *
 * src/types/ and the fixtures are hand-maintained here while the FastAPI app
 * that produces those shapes lives in TeneikaAskew/stocks. This test is the
 * mechanical tie between them: stocks commits its OpenAPI document
 * (platform/api/openapi.json, kept current by its own snapshot test), this
 * repo vendors it at tests/fixtures/stocks-openapi.json
 * (scripts/sync-api-contract.mjs; `npm run contract:check` in CI fails when
 * the copy is stale), and this file checks two things against it:
 *
 *  1. ROUTE INVENTORY — every `/api/...` string or template literal the app
 *     requests (under src/, with src/mocks and tests excluded), together with
 *     the verb of the fetch call it sits in, matches a declared operation.
 *     A removed or renamed endpoint, or a verb change, fails here.
 *  2. PAYLOAD SHAPE — for every operation whose 200 response declares a JSON
 *     schema, the mock-mode payload that answers a sample request is
 *     validated against that schema. A renamed or retyped field in a typed
 *     response fails here, because the mocks `satisfies` the TS types and
 *     the schema is what the API actually emits.
 *  3. REQUEST BODIES — for every operation the app sends a JSON body to, a
 *     representative sample of that body is validated against the operation's
 *     `requestBody` schema. A new required input field, or a renamed one,
 *     fails here rather than becoming a 422 in production (Codex, #54); an
 *     operation with a body and no sample fails too, so the map cannot fall
 *     behind the app.
 *
 * What it does NOT prove: an operation without a `response_model` in stocks
 * has an empty schema and validates trivially. The summary printed at the
 * end counts those; adding response models on the stocks side is how the
 * covered set grows. Non-200 mock replies (a documented 404) are skipped.
 * Validating one sample per operation also proves only that the sample is
 * permitted, not that the TS type accepts every response the server may now
 * emit: widening a field from required `string` to nullable leaves both the
 * old mock and the old type valid. Closing objects catches the narrowing
 * direction (a field we read or send that the API no longer declares); the
 * widening direction needs a schema-to-type comparison this does not do.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { resolveMock } from './index';
import type { Bar } from '@/lib/indicators';
import type { MarketSnapshot } from '@/lib/playbookEvaluator';
import type { IndicatorsRequest } from '@/hooks/useLiveIndicators';
import type { StratPredictRequest } from '@/hooks/useAdmin';
import type { UserPreferencesUpdate } from '@/types/preferences';
import type { UserProfileUpdate } from '@/types/profile';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SRC = path.join(REPO, 'src');
const SNAPSHOT = path.join(REPO, 'tests', 'fixtures', 'stocks-openapi.json');

interface Operation {
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
  requestBody?: { content?: Record<string, { schema?: unknown }> };
}
interface OpenApi {
  paths: Record<string, Record<string, Operation>>;
  components?: { schemas?: Record<string, unknown> };
}

const spec: OpenApi = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const API_PATHS = Object.keys(spec.paths);
/** Declared paths per verb, so the inventory checks the operation, not just the path. */
const API_PATHS_BY_METHOD: Record<string, string[]> = {};
for (const [p, ops] of Object.entries(spec.paths)) {
  for (const m of Object.keys(ops)) {
    if (!HTTP_METHODS.has(m)) continue;
    (API_PATHS_BY_METHOD[m.toUpperCase()] ??= []).push(p);
  }
}

// ── 1. Route inventory ─────────────────────────────────────────────────────

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'mocks') continue; // regex route tables, not request literals
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Every `/api/...` string or template literal in a source, with each `${…}`
 * collapsed to `{p}`. A small scanner rather than a regex: comments are
 * skipped (JSDoc quotes paths as prose), and template expressions are
 * skipped by brace depth so a nested template inside `${}` cannot end the
 * literal early.
 */
export interface ApiLiteral {
  literal: string;
  /**
   * Uppercase verb of the fetch call the literal is the URL argument of (GET
   * when the call sets no `method`), or null when the literal is not a fetch
   * argument — a const passed to fetch later, or a prefix list such as
   * authedFetch's OPEN_PREFIXES. Those are checked for path existence under
   * any verb, since the verb is not knowable from the literal.
   */
  method: string | null;
}

/**
 * The verb of the fetch call a literal is the URL of. Looks forward from the
 * literal through its enclosing call's arguments for a `method: 'X'` option,
 * stopping at the call's closing paren. A literal that is not a fetch argument
 * (a const later passed to fetch) reports GET, the same default fetch uses.
 */
function methodAfter(source: string, from: number): string {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      if (depth === 0) break;
      depth--;
    } else if (c === ';' && depth === 0) break;
    if (c === 'm' && source.startsWith('method', i)) {
      const m = /^method\s*:\s*['"`](get|post|put|patch|delete)['"`]/i.exec(source.slice(i, i + 40));
      if (m) return m[1].toUpperCase();
    }
  }
  return 'GET';
}

/**
 * When the literal at `quoteStart` initialises a `const`/`let` binding, the
 * verbs of every `fetch(<binding>, ...)` in the source (GET when a call sets
 * no method), or null when the literal is not such a binding or the binding
 * is never fetched — then only path existence can be checked.
 */
function verbsOfBinding(source: string, quoteStart: number): string[] | null {
  const decl = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*$/.exec(
    source.slice(Math.max(0, quoteStart - 80), quoteStart),
  );
  if (!decl) return null;
  const name = decl[1];
  const re = new RegExp(String.raw`fetch\(\s*${name.replace(/\$/g, '\\$')}\s*[,)]`, 'g');
  const verbs = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) verbs.add(methodAfter(source, m.index + m[0].length - 1));
  return verbs.size ? [...verbs] : null;
}

export function extractApiLiterals(source: string): ApiLiteral[] {
  const out: ApiLiteral[] = [];
  const n = source.length;
  let i = 0;
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      i = source.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      i = close < 0 ? n : close + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      const quoteStart = i;
      const inFetch = /fetch\(\s*$/.test(source.slice(Math.max(0, i - 40), i));
      let lit = '';
      let depth = 0;
      i++;
      for (; i < n; i++) {
        const ch = source[i];
        if (depth > 0) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          continue;
        }
        if (ch === '\\') {
          lit += source[i + 1] ?? '';
          i++;
          continue;
        }
        if (ch === quote) break;
        if (ch === '\n' && quote !== '`') break; // unterminated
        if (quote === '`' && ch === '$' && source[i + 1] === '{') {
          depth = 1;
          i++;
          lit += '{p}';
          continue;
        }
        lit += ch;
      }
      i++;
      if (lit.startsWith('/api/')) {
        if (inFetch) {
          out.push({ literal: lit, method: methodAfter(source, i) });
        } else {
          // `const ENDPOINT = '/api/...'` used by fetch(ENDPOINT, ...) later:
          // every fetch of that binding contributes its verb, so a route
          // removed for one verb but kept for another is still reported.
          const verbs = verbsOfBinding(source, quoteStart);
          if (verbs === null) out.push({ literal: lit, method: null });
          else for (const method of verbs) out.push({ literal: lit, method });
        }
      }
      continue;
    }
    i++;
  }
  return out;
}

/** Path template → segments, query string and trailing slash dropped. */
function segments(literal: string): string[] {
  return literal.split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean);
}

/**
 * A request segment and a declared segment align when both are static and
 * equal, or when both are dynamic (`{p}` from a template expression on the
 * request side, `{param}` on the API side). A static request segment never
 * matches a declared parameter, and a dynamic request segment never matches a
 * static declared segment — otherwise `/api/options/dates/${t}` would be
 * satisfied by `/api/options/{ticker}/grid` and a removed route could hide
 * behind an unrelated one (Codex, #54). A segment with a literal prefix and a
 * trailing expression (`refresh${qs}`) is static for matching purposes.
 */
function segmentMatches(call: string, api: string): boolean {
  const apiDynamic = api.startsWith('{');
  const k = call.indexOf('{p}');
  const callDynamic = k === 0;
  if (apiDynamic !== callDynamic) return false;
  if (apiDynamic) return true;
  return k > 0 ? call.slice(0, k) === api : call === api;
}

/** The declared path template a request literal resolves to, or null. */
export function matchedDeclaredPath(literal: string, apiPaths: string[]): string | null {
  const call = segments(literal);
  return (
    apiPaths.find((p) => {
      const api = segments(p);
      return api.length === call.length && call.every((s, i) => segmentMatches(s, api[i]));
    }) ?? null
  );
}

export function matchesDeclaredPath(literal: string, apiPaths: string[]): boolean {
  return matchedDeclaredPath(literal, apiPaths) !== null;
}

// ── 2. Payload shape ───────────────────────────────────────────────────────

const PARAM_SAMPLES: Record<string, string> = {
  ticker: 'IWM',
  date: '20260425',
  date_str: '20260425',
  tf: '15m',
  ts: '2026-04-25T15:00:00Z',
  role: 'analyst',
  uid: 'uid-member',
  source_id: 'market_data_daily',
  run_id: '00000000-0000-0000-0000-000000000001',
  report_id: '00000000-0000-0000-0000-000000000001',
  trade_id: '1',
  phase: 'phase1',
  event_date: '2026-04-25',
};
/**
 * Typed operations whose mock cannot answer a body-less sample request.
 * Empty on purpose: add an entry only with the reason, never to silence a
 * failure.
 */
const UNSAMPLEABLE = new Set<string>([]);

const sampleUrl = (p: string) =>
  p.replace(/\{([^}]+)\}/g, (_, name: string) => PARAM_SAMPLES[name] ?? 'sample');

const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });

/**
 * JSON Schema permits properties it does not mention, and Pydantic marks every
 * defaulted field optional — so out of the box a mock carrying `themes` where
 * the API emits `theme` validates. That is exactly the drift this test exists
 * to catch, so every object schema that declares `properties` is closed: a
 * field the mock has and the API does not declare is a failure.
 *
 * This deliberately overrides `additionalProperties: true`, which Pydantic
 * emits for `extra='allow'` models. The API side uses that so an unexpected
 * key passes through in production instead of becoming a 500; it does not
 * mean the frontend may depend on undeclared keys. A mock that needs one is
 * a field the API should declare. Map-like schemas (`dict[str, X]`, no
 * `properties`) are untouched.
 */
function closeObjects<T>(node: T): T {
  if (Array.isArray(node)) return node.map(closeObjects) as T;
  if (node && typeof node === 'object') {
    const src = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) out[k] = closeObjects(v);
    if ('properties' in src) out.additionalProperties = false;
    return out as T;
  }
  return node;
}
const CLOSED_COMPONENTS = closeObjects(spec.components ?? {});

function schemaErrors(schema: unknown, payload: unknown): string[] {
  // `$ref: '#/components/schemas/X'` resolves against the root document, so
  // the response schema is wrapped with the (closed) components.
  const root = { ...closeObjects(schema as object), components: CLOSED_COMPONENTS };
  const validate = ajv.compile(root);
  if (validate(payload)) return [];
  return (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim());
}

/**
 * The 200 JSON schema of an operation, or null when it constrains nothing: no
 * schema at all (no `response_model`), or a bare `dict` (`type: object` with
 * `additionalProperties: true` and no `properties`), which FastAPI emits for
 * `response_model=dict` and which validates any payload. Both count as
 * untyped in the summary so the coverage number is honest.
 */
function jsonSchemaFor(op: Operation): unknown {
  const schema = op.responses?.['200']?.content?.['application/json']?.schema as
    | Record<string, unknown>
    | undefined;
  if (!schema || Object.keys(schema).length === 0) return null;
  const bareDict =
    schema.type === 'object' && !('properties' in schema) && !('$ref' in schema) && !('allOf' in schema) && !('anyOf' in schema) && !('oneOf' in schema);
  return bareDict ? null : schema;
}


// ── 3. Request bodies ──────────────────────────────────────────────────────

const SAMPLE_BARS = [
  { time: '2026-04-25 09:30:00', open: 217.1, high: 217.9, low: 216.8, close: 217.6, volume: 1_240_000 },
  { time: '2026-04-25 09:45:00', open: 217.6, high: 218.4, low: 217.4, close: 218.2, volume: 980_000 },
] satisfies Bar[];

const SAMPLE_SNAPSHOT = {
  price: 218.2,
  prevClose: 216.4,
  prevHigh: 218.9,
  prevLow: 215.7,
  volumeToday: 2_220_000,
  avgVolume20d: 31_400_000,
  orbHigh: 217.9,
  orbLow: 216.8,
  lastBar: SAMPLE_BARS[1],
  minutesSinceOpen: 15,
  stochKPrev: 61.2,
  indicators: {
    ema9: 217.8, ema20: 217.2, ema50: 216.1, rsi: 57.4,
    stochK: 64.8, stochD: 60.1, atr: 1.42, vwap: 217.7, stochKPrev: 61.2,
  },
} satisfies MarketSnapshot;

/**
 * One representative body per operation the app sends JSON to, mirroring what
 * the named call site actually builds. Keyed by `VERB <declared path>`.
 *
 * Typed with `satisfies` wherever the app has a type for the body, so the two
 * directions are both covered: a TS change that no longer describes what we
 * send fails `tsc -b`, and a server-side change to the request model fails the
 * test below. Undeclared keys are rejected the same way response payloads are
 * (see `closeObjects`) — a field the client sends that the API does not
 * declare is silently dropped by Pydantic in production, which is exactly the
 * kind of no-op this check exists to surface.
 *
 * A new call site with a body and no entry here FAILS the test rather than
 * being skipped, so the map cannot quietly fall behind the app.
 */
const REQUEST_SAMPLES: Record<string, unknown> = {
  // src/hooks/useLiveIndicators.ts:39 / :85
  'POST /api/live/indicators': {
    bars: SAMPLE_BARS,
    current_price: 218.2,
    current_volume: 2_220_000,
    avg_volume_20d: 31_400_000,
  } satisfies IndicatorsRequest,
  'POST /api/live/signal-series': { bars: SAMPLE_BARS },
  // src/hooks/useOptionsGreeks.ts:87
  'POST /api/options/greeks': {
    options: [{ type: 'call', strike: 220, delta: 0.42, gamma: 0.031, vega: 0.11, volume: 1240, open_interest: 8800 }],
    spot_price: 218.2,
    strike_range_pct: null,
  },
  // src/hooks/usePlaybookEvaluation.ts:27 (conditions) and :54 (batches)
  'POST /api/playbook/evaluate': { snapshot: SAMPLE_SNAPSHOT, conditions: ['rsi > 50'] },
  // src/components/landing/waitlist.ts:13
  'POST /api/waitlist': { email: 'trader@example.com', source: 'landing-hero', website: '' },
  // src/hooks/useTickerSearch.ts:93
  'POST /api/insights/watchlist/add': { ticker: 'AAPL' },
  // src/routes/InsightsPage.tsx:484
  'POST /api/insights/chat': {
    message: 'what is the read on IWM?',
    mode: 'chat',
    ticker: 'IWM',
    history: [{ role: 'user', content: 'hello' }],
  },
  // src/routes/JournalPage.tsx:162
  'POST /api/journal/trades': {
    ticker: 'IWM',
    direction: 'CALL',
    entry_date: '2026-04-25',
    entry_time: '09:45',
    entry_price: 1.42,
    exit_date: '2026-04-25',
    exit_time: '11:15',
    exit_price: 2.05,
    notes: '',
  },
  // src/hooks/useJournalChartTrades.ts:353
  'PATCH /api/journal/trades/{trade_id}': {
    exit_date: '2026-04-25',
    exit_time: '11:15',
    exit_price: 2.05,
  },
  // src/routes/JournalPage.tsx:308
  'POST /api/journal/export/{ticker}': {
    trades: [{
      id: '1',
      ticker: 'IWM',
      direction: 'CALL',
      entry_date: '2026-04-25',
      entry_time: '09:45',
      entry_price: 1.42,
      exit_date: '2026-04-25',
      exit_time: '11:15',
      exit_price: 2.05,
      notes: '',
    }],
  },
  // src/hooks/useJournalChartTrades.ts:800
  'POST /api/journal/import/commit': {
    broker: 'robinhood',
    trades: [{
      ticker: 'IWM',
      direction: 'CALL',
      entry_ts: '2026-04-25T13:45:00Z',
      entry_price: 1.42,
      exit_ts: '2026-04-25T15:15:00Z',
      exit_price: 2.05,
      return_pct: 44.4,
      quantity: 2,
      status: 'CLOSED',
    }],
  },
  // src/hooks/useJournalChartTrades.ts:496
  'POST /api/backtest/replay-trades': { ticker: 'IWM', trade_ids: ['1'], session_id: 'sess-1' },
  // src/hooks/useJournalChartTrades.ts:670
  'POST /api/style/mine-and-validate': { ticker: 'IWM' },
  // src/hooks/usePreferences.ts:101
  'PUT /api/me/preferences': {
    theme: 'dark', nav_pattern: 'sidebar', density: 'default', accent: 'violet',
  } satisfies UserPreferencesUpdate,
  // src/hooks/useProfile.ts:84
  'PUT /api/me/profile': {
    display_name: 'Trader', default_ticker: 'IWM', default_timeframe: '1D',
  } satisfies UserProfileUpdate,
  // src/hooks/useAdmin.ts:172
  'POST /api/admin/strat-engine/predict': {
    ticker: 'IWM', timeframe: '15m',
  } satisfies StratPredictRequest,
  // src/hooks/useAdmin.ts:196
  'PUT /api/admin/routes/{role}': { provider: 'anthropic', model: 'claude-sonnet-5' },
  // src/hooks/useAdmin.ts:270 / :282
  'PUT /api/admin/users/{uid}/roles': { roles: ['analyst'] },
  'PUT /api/admin/users/{uid}/status': { disabled: true },
};

/**
 * The JSON request schema of an operation, or null when it constrains nothing:
 * no `requestBody`, a non-JSON body (`POST /api/journal/import/preview` is
 * multipart form-data), or an empty schema.
 */
function requestSchemaFor(op: Operation): unknown {
  const schema = op.requestBody?.content?.['application/json']?.schema as
    | Record<string, unknown>
    | undefined;
  return schema && Object.keys(schema).length > 0 ? schema : null;
}

/** `VERB <declared path>` for every operation the app requests. */
function requestedOperations(): Set<string> {
  const out = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    for (const { literal: lit, method } of extractApiLiterals(readFileSync(file, 'utf8'))) {
      if (method === null) continue; // verb unknowable — not a body-bearing call
      if (/\s|\*|\.\.\./.test(lit)) continue;
      const declared = matchedDeclaredPath(lit, API_PATHS_BY_METHOD[method] ?? []);
      if (declared) out.add(`${method} ${declared}`);
    }
  }
  return out;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('extractApiLiterals', () => {
  it('reads the verb of a literal used directly inside fetch()', () => {
    expect(
      extractApiLiterals("await fetch('/api/journal/trades', { method: 'POST' });"),
    ).toEqual([{ literal: '/api/journal/trades', method: 'POST' }]);
  });

  it('defaults a fetch with no method option to GET', () => {
    expect(extractApiLiterals("await fetch('/api/me/profile');")).toEqual([
      { literal: '/api/me/profile', method: 'GET' },
    ]);
  });

  it('collects every verb a `const ENDPOINT = ...` binding is fetched under', () => {
    // The usePreferences.ts / useProfile.ts shape: one literal, two requests.
    const src = [
      "const ENDPOINT = '/api/me/preferences';",
      'async function read() { const res = await fetch(ENDPOINT); return res.json(); }',
      "async function write(b) { return fetch(ENDPOINT, { method: 'PUT', body: b }); }",
    ].join('\n');
    const found = extractApiLiterals(src);
    expect(found.map((f) => f.method).sort()).toEqual(['GET', 'PUT']);
    expect(new Set(found.map((f) => f.literal))).toEqual(new Set(['/api/me/preferences']));
  });

  it('leaves the verb unknown when a literal is never fetched through its binding', () => {
    expect(extractApiLiterals("const OPEN_PREFIXES = ['/api/health'];")).toEqual([
      { literal: '/api/health', method: null },
    ]);
  });
});

describe('API contract (stocks OpenAPI snapshot)', () => {
  it('every /api request the app makes (verb + path) is a declared operation', () => {
    const unmatched: string[] = [];
    let total = 0;
    for (const file of sourceFiles(SRC)) {
      for (const { literal: lit, method } of extractApiLiterals(readFileSync(file, 'utf8'))) {
        // A request URL never contains whitespace or a glob star; such literals
        // are error messages and prefix lists, not requests.
        if (/\s|\*|\.\.\./.test(lit)) continue;
        const segs = segments(lit);
        if (segs.length < 2 || segs[1].includes('{p}')) continue; // '/api/' alone or fully dynamic
        total++;
        const declared = method === null ? API_PATHS : (API_PATHS_BY_METHOD[method] ?? []);
        if (!matchesDeclaredPath(lit, declared)) {
          unmatched.push(`${path.relative(REPO, file)}: ${method ?? '(any verb)'} ${lit}`);
        }
      }
    }
    console.info(`[contract] route inventory: ${total} /api requests under src/, ${API_PATHS.length} declared paths`);
    expect(unmatched, 'requests with no declared API operation (verb + path)').toEqual([]);
  });

  it('every mock payload for a typed 200 response matches its response schema (no undeclared fields)', () => {
    const violations: string[] = [];
    const covered: string[] = [];
    const uncovered: string[] = [];
    const skipped: string[] = [];
    let untyped = 0;

    for (const [p, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        if (!HTTP_METHODS.has(method)) continue;
        const key = `${method.toUpperCase()} ${p}`;
        const schema = jsonSchemaFor(op);
        if (!schema) {
          untyped++;
          continue;
        }
        if (UNSAMPLEABLE.has(key)) {
          skipped.push(`${key} (allowlisted: cannot be sampled without a real request body)`);
          continue;
        }
        let hit: ReturnType<typeof resolveMock>;
        try {
          hit = resolveMock(method.toUpperCase(), new URL(sampleUrl(p), 'http://mock.local'), {});
        } catch (err) {
          // A mock that throws for the sample request validated nothing; that
          // is a broken mock, not a skip (Codex, #54). Allowlist above if a
          // route genuinely cannot be sampled.
          violations.push(`${key}\n    mock handler threw: ${(err as Error).message}`);
          continue;
        }
        if (!hit) {
          uncovered.push(key);
          continue;
        }
        if (hit.status !== 200 || !hit.contentType.includes('json')) {
          skipped.push(`${key} (mock answers ${hit.status} ${hit.contentType})`);
          continue;
        }
        const errors = schemaErrors(schema, JSON.parse(hit.payload));
        if (errors.length) violations.push(`${key}\n    ${errors.join('\n    ')}`);
        else covered.push(key);
      }
    }

    console.info(
      `[contract] payload shape: ${covered.length} typed operations validated, ` +
        `${uncovered.length} typed with no mock, ${skipped.length} skipped, ${untyped} untyped (no response_model or bare dict)`,
    );
    if (uncovered.length) console.info(`[contract] typed but unmocked:\n  ${uncovered.join('\n  ')}`);
    if (skipped.length) console.info(`[contract] skipped:\n  ${skipped.join('\n  ')}`);
    expect(violations, 'mock payloads that violate the API response schema').toEqual([]);
  });

  it('every request body the app sends matches its operation request schema', () => {
    const violations: string[] = [];
    const covered: string[] = [];
    for (const key of [...requestedOperations()].sort()) {
      const [method, declared] = key.split(' ');
      const op = spec.paths[declared]?.[method.toLowerCase()];
      const schema = op ? requestSchemaFor(op) : null;
      if (!schema) continue; // no JSON body declared — nothing to check
      const sample = REQUEST_SAMPLES[key];
      if (sample === undefined) {
        violations.push(`${key}: declares a request body but REQUEST_SAMPLES has no entry`);
        continue;
      }
      const errs = schemaErrors(schema, sample);
      if (errs.length) violations.push(`${key}: ${errs.join('; ')}`);
      else covered.push(key);
    }
    console.info(`[contract] request bodies: ${covered.length} operations validated`);
    expect(violations, 'request bodies that do not match the declared schema').toEqual([]);
  });

});
