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
 *     behind the app. An operation several call sites post different shapes
 *     to lists every shape, so a change to one is not hidden by another.
 *  4. QUERY PARAMETERS — the names each request sends, read from the literal
 *     and from any `URLSearchParams` it interpolates, are checked against the
 *     operation's declared `parameters`: an undeclared name and a missing
 *     required one both fail. A call whose names cannot be read statically is
 *     counted and skipped rather than treated as sending none.
 *
 * Requests reach the API through `fetch` and through this repo's own wrappers
 * (`adminJson`, `useFetch`). Wrappers are DISCOVERED from each source — a
 * function that passes one of its parameters to `fetch` is one, and the
 * parameter's index is where its URL lives — so a new wrapper is covered the
 * day it is written rather than when someone remembers an allowlist.
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
import ts from 'typescript';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { resolveMock } from './index';
import type { Bar } from '@/lib/indicators';
import type { MarketSnapshot } from '@/lib/playbookEvaluator';
import type { IndicatorsRequest } from '@/hooks/useLiveIndicators';
import type { StratPredictRequest } from '@/hooks/useAdmin';
import type { UserPreferencesUpdate } from '@/types/preferences';
import { PROFILE_FIELDS, type UserProfileUpdate } from '@/types/profile';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SRC = path.join(REPO, 'src');
const SNAPSHOT = path.join(REPO, 'tests', 'fixtures', 'stocks-openapi.json');

interface Operation {
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
  requestBody?: { content?: Record<string, { schema?: unknown }> };
  parameters?: { name: string; in: string; required?: boolean }[];
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
 * Every `/api/...` request URL in a source, with the verb of the call it is
 * an argument of.
 *
 * This walks the TypeScript AST rather than scanning text. It began as a
 * character scanner, and Codex found four separate syntactic forms it could
 * not see (#54): a wrapper call with a generic argument list, a wrapper whose
 * URL is not the first parameter, a URL held in a const, and a query fragment
 * nested inside a conditional template expression. Each was a real hole, and
 * each patch invited the next — the root cause was parsing TypeScript with
 * regexes. The compiler is already a devDependency, so it does the parsing.
 *
 * What the walk gives for free: comments are not code, template spans keep
 * their structure, an argument is found at any position, and a call's options
 * object is a node rather than a forward text search.
 */
export interface ApiLiteral {
  literal: string;
  /**
   * Uppercase verb of the request call the literal is the URL argument of
   * (GET when the call sets no `method`), or null when the literal is not
   * such an argument — a prefix list such as authedFetch's OPEN_PREFIXES.
   * Those are checked for path existence under any verb.
   */
  method: string | null;
  /** Offset of the literal's start, for resolving nearby bindings. */
  quoteStart: number;
  /**
   * Query-parameter names this request sends, or null when they cannot be
   * read statically. Resolved here, where the AST is in hand, rather than by
   * re-scanning text around the literal.
   */
  queryNames: string[] | null;
}

const parse = (source: string) =>
  ts.createSourceFile('f.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function eachNode(node: ts.Node, visit: (n: ts.Node) => void): void {
  visit(node);
  node.forEachChild((c) => eachNode(c, visit));
}

/** The called name, for `f()`, `f<T>()` and `obj.f()`. */
function calleeName(call: ts.CallExpression): string | null {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return null;
}

/**
 * Render a node to URL patterns — plural, because a conditional URL is two
 * requests, not one.
 *
 * `useGammaGrid` picks between the live and historical grid endpoints in one
 * ternary. Rendering only the truthy branch bound the live path to its verb
 * and left the historical one to the unknown-verb fallback (Codex, #54), so
 * both branches are emitted and each carries the call's method.
 *
 * An identifier renders as `{p:name}` so the query reader can resolve it;
 * `normalizeUrl` flattens that to `{p}` for path matching. A conditional
 * inside a template (`${qs ? `?${qs}` : ''}`) multiplies the alternatives,
 * which is how the with-query and without-query forms both get checked.
 */
function renderUrlVariants(node: ts.Node): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isIdentifier(node)) return [`{p:${node.text}}`];
  if (ts.isParenthesizedExpression(node)) return renderUrlVariants(node.expression);
  // `${params.toString()}` refers to `params`; keep the marker so the query
  // reader can resolve its keys.
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'toString' && ts.isIdentifier(node.expression.expression)) {
    return [`{p:${node.expression.expression.text}}`];
  }
  if (ts.isConditionalExpression(node)) {
    return [...renderUrlVariants(node.whenTrue), ...renderUrlVariants(node.whenFalse)];
  }
  if (ts.isTemplateExpression(node)) {
    let acc = [node.head.text];
    for (const span of node.templateSpans) {
      const parts = renderUrlVariants(span.expression);
      const next: string[] = [];
      for (const a of acc) for (const part of parts) next.push(a + part + span.literal.text);
      // A pathological nest could explode; 8 alternatives covers this app.
      acc = next.slice(0, 8);
    }
    return acc;
  }
  return ['{p}'];
}

/** `{p:name}` markers flattened to `{p}` for path matching. */
const normalizeUrl = (u: string) => u.replace(/\{p:[^}]*\}/g, '{p}');

const isUrlish = (n: ts.Node) =>
  ts.isStringLiteral(n) || ts.isTemplateExpression(n) || ts.isNoSubstitutionTemplateLiteral(n) ||
  ts.isConditionalExpression(n);

/** The `method:` of a call's options object, uppercased; GET when unset. */
function methodOfCall(call: ts.CallExpression): string {
  for (const arg of call.arguments) {
    if (!ts.isObjectLiteralExpression(arg)) continue;
    for (const prop of arg.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null;
      if (key !== 'method') continue;
      if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
        return prop.initializer.text.toUpperCase();
      }
    }
  }
  return 'GET';
}

/**
 * Request wrappers declared in this source: a function that passes one of its
 * own parameters to `fetch` as the URL. Maps name → that parameter's index.
 *
 * Discovered, not allowlisted. `adminJson(url, init)` takes it at 0 and
 * `useFetch(key, url, ...)` at 1, and a hand-maintained set missed both in
 * turn; deriving it means a new wrapper is covered the day it is written.
 */
export function requestWrappers(source: string): Map<string, number> {
  const out = new Map<string, number>();
  eachNode(parse(source), (n) => {
    if (!ts.isFunctionDeclaration(n) && !ts.isFunctionExpression(n) && !ts.isArrowFunction(n)) return;
    const name = ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)
      ? n.name?.text
      : ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)
        ? n.parent.name.text
        : undefined;
    if (!name || !n.body) return;
    const params = n.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null));
    eachNode(n.body, (inner) => {
      if (!ts.isCallExpression(inner) || calleeName(inner) !== 'fetch') return;
      const first = inner.arguments[0];
      if (!first || !ts.isIdentifier(first)) return;
      const idx = params.indexOf(first.text);
      if (idx >= 0) out.set(name, idx);
    });
  });
  return out;
}

/** Names of request wrappers in a source. */
export const requestWrapperNames = (source: string): string[] => [...requestWrappers(source).keys()];

/**
 * Identifier → the query names its `URLSearchParams` carries.
 *
 * Reads BOTH `{ a: x }` and shorthand `{ timeframe }` — the regex this
 * replaced required a colon, so `useMarketData`'s only constructor key was
 * dropped while a later `.set('end_time')` still marked the request
 * "resolved", reporting it readable with a name missing (Codex, #54). That
 * failed unsafely: a skip is visible in the count, a wrong answer is not.
 * `const qs = params.toString()` aliases back to `params`.
 */
function searchParamNames(file: ts.SourceFile): Map<string, Set<string>> {
  const direct = new Map<string, Set<string>>();
  const alias = new Map<string, string>();
  const add = (name: string, key: string) => {
    const set = direct.get(name) ?? new Set<string>();
    set.add(key);
    direct.set(name, set);
  };

  eachNode(file, (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const init = n.initializer;
      if (ts.isNewExpression(init) && ts.isIdentifier(init.expression) &&
          init.expression.text === 'URLSearchParams') {
        direct.set(n.name.text, direct.get(n.name.text) ?? new Set());
        const obj = init.arguments?.[0];
        if (obj && ts.isObjectLiteralExpression(obj)) {
          for (const prop of obj.properties) {
            if (ts.isShorthandPropertyAssignment(prop)) add(n.name.text, prop.name.text);
            else if (ts.isPropertyAssignment(prop)) {
              if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) {
                add(n.name.text, prop.name.text);
              }
            }
          }
        }
      }
      if (ts.isCallExpression(init) && ts.isPropertyAccessExpression(init.expression) &&
          init.expression.name.text === 'toString' && ts.isIdentifier(init.expression.expression)) {
        alias.set(n.name.text, init.expression.expression.text);
      }
    }
    // params.set('x', …) / params.append('x', …)
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) &&
        (n.expression.name.text === 'set' || n.expression.name.text === 'append') &&
        ts.isIdentifier(n.expression.expression)) {
      const key = n.arguments[0];
      if (key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key))) {
        add(n.expression.expression.text, key.text);
      }
    }
  });

  for (const [from, to] of alias) {
    const target = direct.get(to);
    if (target) direct.set(from, target);
  }
  return direct;
}

/**
 * Query names a rendered URL sends, or null when a name cannot be read.
 *
 * A `{p…}` hole directly after `=` is a VALUE — the name beside it is known.
 * Only a hole standing where a NAME would be needs resolving, via its
 * `{p:ident}` marker.
 */
function queryNamesOf(rendered: string, params: Map<string, Set<string>>): string[] | null {
  const q = rendered.indexOf('?');
  if (q === -1) return [];
  const tail = rendered.slice(q + 1);
  const names = new Set<string>();
  for (const m of tail.matchAll(/(?:^|&)([A-Za-z_][\w.-]*)=/g)) names.add(m[1]);

  for (const m of tail.matchAll(/\{p(?::([^}]*))?\}/g)) {
    if (tail[m.index! - 1] === '=') continue; // a value, not a name
    const ident = m[1];
    const resolved = ident ? params.get(ident) : undefined;
    if (!resolved || resolved.size === 0) return null;
    for (const k of resolved) names.add(k);
  }
  return [...names];
}

export function extractApiLiterals(source: string): ApiLiteral[] {
  const file = parse(source);
  const wrappers = requestWrappers(source);
  wrappers.set('fetch', 0);
  const params = searchParamNames(file);
  const mk = (raw: string, method: string | null, quoteStart: number): ApiLiteral => ({
    literal: normalizeUrl(raw),
    method,
    quoteStart,
    queryNames: queryNamesOf(raw, params),
  });

  const out: ApiLiteral[] = [];
  /** Identifier → the URL patterns assigned to it, for `const U = ...; fetch(U)`. */
  const bindings = new Map<string, ApiLiteral[]>();
  /** Where each binding's URL initializer sits, so a CONSUMED one is not re-emitted. */
  const bindingRange = new Map<string, [number, number]>();

  eachNode(file, (n) => {
    if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer) return;
    if (!isUrlish(n.initializer)) return;
    const variants = renderUrlVariants(n.initializer);
    if (!variants.some((v) => v.startsWith('/api/'))) return;
    bindingRange.set(n.name.text, [n.initializer.getStart(file), n.initializer.getEnd()]);
    const list = bindings.get(n.name.text) ?? [];
    for (const v of variants) {
      if (v.startsWith('/api/')) list.push(mk(v, null, n.initializer.getStart(file)));
    }
    bindings.set(n.name.text, list);
  });

  /**
   * Source ranges already emitted from. A conditional URL's branches are
   * themselves template literals, so without this the fallback pass below
   * re-emits each branch with an unknown verb alongside the real entry.
   */
  const covered: [number, number][] = [];
  const isCovered = (n: ts.Node) =>
    covered.some(([a, b]) => n.getStart(file) >= a && n.getEnd() <= b);

  eachNode(file, (n) => {
    if (!ts.isCallExpression(n)) return;
    const name = calleeName(n);
    if (name === null) return;
    const urlIndex = wrappers.get(name);
    if (urlIndex === undefined) return;
    const arg = n.arguments[urlIndex];
    if (!arg) return;
    const method = methodOfCall(n);

    if (isUrlish(arg)) {
      covered.push([arg.getStart(file), arg.getEnd()]);
      for (const v of renderUrlVariants(arg)) {
        if (v.startsWith('/api/')) out.push(mk(v, method, arg.getStart(file)));
      }
      return;
    }
    // `const ENDPOINT = '/api/…'` used as the URL later: every call of that
    // binding contributes its verb, so a route removed for one verb but kept
    // for another is still reported.
    if (ts.isIdentifier(arg)) {
      const range = bindingRange.get(arg.text);
      if (range) covered.push(range);
      for (const b of bindings.get(arg.text) ?? []) out.push({ ...b, method });
    }
  });

  // Literals never used as a request URL — authedFetch's OPEN_PREFIXES and
  // the like. Reported with an unknown verb and checked on path alone.
  eachNode(file, (n) => {
    if (!isUrlish(n)) return;
    if (isCovered(n)) return;
    const quoteStart = n.getStart(file);
    if (out.some((o) => o.quoteStart === quoteStart)) return;
    // Inside a call we already handled as a request URL? Then it is covered.
    if (ts.isCallExpression(n.parent) && wrappers.has(calleeName(n.parent) ?? '')) return;
    for (const v of renderUrlVariants(n)) {
      if (v.startsWith('/api/')) out.push(mk(v, null, quoteStart));
    }
  });

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
 * being skipped, so the map cannot quietly fall behind the app. An operation
 * that several call sites post structurally different bodies to takes an
 * ARRAY, and every entry is validated.
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
  // src/hooks/usePlaybookEvaluation.ts:27 (conditions) and :54 (batches).
  // Two structurally different bodies reach this one operation, so both are
  // listed: validating only the first left `batches` unchecked (Codex, #54).
  'POST /api/playbook/evaluate': [
    { snapshot: SAMPLE_SNAPSHOT, conditions: ['rsi > 50'] },
    { snapshot: SAMPLE_SNAPSHOT, batches: { orb: ['rsi > 50'] } },
  ],
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
  // Two call sites post different shapes: the manual form in
  // src/routes/JournalPage.tsx:162, and the chart/replay form in
  // src/hooks/useJournalChartTrades.ts:316, which adds stop_loss,
  // take_profits, source and session_id (Codex, #54).
  'POST /api/journal/trades': [
    {
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
    {
      ticker: 'IWM',
      direction: 'CALL',
      entry_date: '2026-04-25',
      entry_time: '09:45',
      entry_price: 1.42,
      stop_loss: 1.1,
      take_profits: [1.8, 2.2],
      source: 'chart',
      session_id: 'sess-1',
    },
  ],
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
  // src/hooks/useProfile.ts:84. SettingsPage sends profileDiff(...), so ANY
  // subset of UserProfileUpdate can be the body — a three-field sample let a
  // rename of one of the other nine pass (Codex, #54). Every field is listed,
  // and a test below asserts this covers PROFILE_FIELDS so the type cannot
  // grow past it.
  'PUT /api/me/profile': {
    display_name: 'Trader',
    timezone: 'America/New_York',
    default_ticker: 'IWM',
    default_timeframe: '1D',
    account_size: 25000,
    risk_per_trade_pct: 1.5,
    notify_daily_digest: true,
    notify_catalyst_alerts: false,
    notify_signal_alerts: true,
    number_format: 'abbreviated',
    date_format: 'iso',
    show_extended_hours: false,
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
  /** Drop the source offset; these cases are about the literal and the verb. */
  const verbs = (src: string) =>
    extractApiLiterals(src).map(({ literal, method }) => ({ literal, method }));

  it('reads the verb of a literal used directly inside fetch()', () => {
    expect(verbs("await fetch('/api/journal/trades', { method: 'POST' });")).toEqual([
      { literal: '/api/journal/trades', method: 'POST' },
    ]);
  });

  it('defaults a fetch with no method option to GET', () => {
    expect(verbs("await fetch('/api/me/profile');")).toEqual([
      { literal: '/api/me/profile', method: 'GET' },
    ]);
  });

  it('discovers a wrapper and reads the verb through it', () => {
    // useAdmin.ts routes its mutations through adminJson, not fetch. The
    // wrapper is found from its own body, not from an allowlist.
    const src = [
      'async function adminJson(url, init) { const r = await fetch(url, init); return r.json(); }',
      "adminJson(`/api/admin/users/${uid}/roles`, { method: 'PUT', body: b })",
    ].join('\n');
    expect(verbs(src)).toEqual([{ literal: '/api/admin/users/{p}/roles', method: 'PUT' }]);
  });

  it('finds a wrapper URL that is not the first parameter', () => {
    // DashboardPage.tsx: useFetch(key, url, ...) takes it second.
    const src = [
      'function useFetch(key, url) { return useQuery({ queryFn: async () => fetch(url) }); }',
      "useFetch(['k'], '/api/market/sectors')",
    ].join('\n');
    expect(verbs(src)).toEqual([{ literal: '/api/market/sectors', method: 'GET' }]);
  });

  it('keeps query text nested inside a conditional template expression', () => {
    // BacktesterSection.tsx: `...${ticker}${run ? `?run=${run}` : ''}`.
    // Both branches are real requests, so both are emitted.
    const src = "fetch(`/api/backtest/results/${ticker}${run ? `?run=${run}` : ''}`)";
    expect(verbs(src)).toEqual([
      { literal: '/api/backtest/results/{p}?run={p}', method: 'GET' },
      { literal: '/api/backtest/results/{p}', method: 'GET' },
    ]);
  });

  it('emits both branches of a conditional URL with the call verb', () => {
    // useGammaGrid.ts picks between the live and historical grid endpoints.
    const src = [
      'const url = live',
      '  ? `/api/options/${ticker}/grid`',
      '  : `/api/options/${ticker}/${date}/grid`;',
      'fetch(url);',
    ].join('\n');
    expect(verbs(src)).toEqual([
      { literal: '/api/options/{p}/grid', method: 'GET' },
      { literal: '/api/options/{p}/{p}/grid', method: 'GET' },
    ]);
  });

  it('reads shorthand URLSearchParams keys', () => {
    // useMarketData.ts: new URLSearchParams({ timeframe })
    const src = [
      'const params = new URLSearchParams({ timeframe });',
      "if (endTime) params.set('end_time', endTime);",
      'fetch(`/api/market/data/${t}/${d}?${params.toString()}`);',
    ].join('\n');
    const found = extractApiLiterals(src).filter((f) => f.method === 'GET');
    expect(found[0].queryNames?.sort()).toEqual(['end_time', 'timeframe']);
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
    expect(verbs("const OPEN_PREFIXES = ['/api/health'];")).toEqual([
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
        // Invoke a body-bearing operation with the real request sample. The
        // playbook mock answers 400 to `{}` on purpose, so sampling with an
        // empty body recorded it as "skipped" and never validated its 200
        // fixture, while a valid body sat unused in REQUEST_SAMPLES
        // (Codex, #54). First variant, since one 200 shape is being checked.
        const sample = REQUEST_SAMPLES[key];
        const body = (Array.isArray(sample) ? sample[0] : sample) ?? {};
        let hit: ReturnType<typeof resolveMock>;
        try {
          hit = resolveMock(method.toUpperCase(), new URL(sampleUrl(p), 'http://mock.local'), body);
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
          // With a valid sample in hand, a non-200 means the mock rejects a
          // body the app really sends — a violation, not something to skip.
          if (sample !== undefined) {
            violations.push(`${key}\n    mock answered ${hit.status} to its REQUEST_SAMPLES body`);
          } else {
            skipped.push(`${key} (mock answers ${hit.status} ${hit.contentType})`);
          }
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

  it('every query parameter the app sends is declared, and every required one is sent', () => {
    const violations: string[] = [];
    let checked = 0;
    let unreadable = 0;
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, 'utf8');
      for (const { literal: lit, method, queryNames: sent } of extractApiLiterals(source)) {
        if (method === null || /\s|\*|\.\.\./.test(lit)) continue;
        const declaredPath = matchedDeclaredPath(lit, API_PATHS_BY_METHOD[method] ?? []);
        if (!declaredPath) continue; // the route test owns that failure
        const op = spec.paths[declaredPath]?.[method.toLowerCase()];
        const params = (op?.parameters ?? []).filter((prm) => prm.in === 'query');
        if (sent === null) {
          unreadable++;
          continue;
        }
        checked++;
        const where = `${path.relative(REPO, file)}: ${method} ${declaredPath}`;
        const declaredNames = new Set(params.map((prm) => prm.name));
        for (const name of sent) {
          if (!declaredNames.has(name)) violations.push(`${where}: sends undeclared query \`${name}\``);
        }
        for (const prm of params) {
          if (prm.required && !sent.includes(prm.name)) {
            violations.push(`${where}: omits required query \`${prm.name}\``);
          }
        }
      }
    }
    console.info(`[contract] query params: ${checked} requests checked, ${unreadable} not statically readable`);
    expect(violations, 'query parameters that disagree with the declared operation').toEqual([]);
  });

  it('the profile sample covers every field a partial update can send', () => {
    // SettingsPage posts profileDiff(...), which can carry any profile field.
    // A sample missing one would validate while that field's rename 422s.
    const sample = REQUEST_SAMPLES['PUT /api/me/profile'] as Record<string, unknown>;
    const missing = PROFILE_FIELDS.filter((f) => !(f in sample));
    expect(missing, 'profile fields absent from the request sample').toEqual([]);
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
      const variants = Array.isArray(sample) ? sample : [sample];
      let ok = true;
      variants.forEach((variant, n) => {
        const errs = schemaErrors(schema, variant);
        if (!errs.length) return;
        ok = false;
        const which = variants.length > 1 ? ` (variant ${n + 1}/${variants.length})` : '';
        violations.push(`${key}${which}: ${errs.join('; ')}`);
      });
      if (ok) covered.push(key);
    }
    console.info(`[contract] request bodies: ${covered.length} operations validated`);
    expect(violations, 'request bodies that do not match the declared schema').toEqual([]);
  });

});
