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
 *     requests (under src/, with src/mocks and tests excluded) matches a
 *     path the API declares. A removed or renamed endpoint fails here.
 *  2. PAYLOAD SHAPE — for every operation whose 200 response declares a JSON
 *     schema, the mock-mode payload that answers a sample request is
 *     validated against that schema. A renamed or retyped field in a typed
 *     response fails here, because the mocks `satisfies` the TS types and
 *     the schema is what the API actually emits.
 *
 * What it does NOT prove: an operation without a `response_model` in stocks
 * has an empty schema and validates trivially. The summary printed at the
 * end counts those; adding response models on the stocks side is how the
 * covered set grows. Non-200 mock replies (a documented 404) are skipped.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';
import { resolveMock } from './index';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const SRC = path.join(REPO, 'src');
const SNAPSHOT = path.join(REPO, 'tests', 'fixtures', 'stocks-openapi.json');

interface Operation {
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
}
interface OpenApi {
  paths: Record<string, Record<string, Operation>>;
  components?: { schemas?: Record<string, unknown> };
}

const spec: OpenApi = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const API_PATHS = Object.keys(spec.paths);

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
export function extractApiLiterals(source: string): string[] {
  const out: string[] = [];
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
      if (lit.startsWith('/api/')) out.push(lit);
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

function segmentMatches(call: string, api: string): boolean {
  if (api.startsWith('{')) return true; // API path parameter takes anything
  if (call === api) return true;
  const k = call.indexOf('{p}');
  return k >= 0 && api.startsWith(call.slice(0, k)); // literal prefix + expr
}

export function matchesDeclaredPath(literal: string, apiPaths: string[]): boolean {
  const call = segments(literal);
  return apiPaths.some((p) => {
    const api = segments(p);
    return api.length === call.length && call.every((s, i) => segmentMatches(s, api[i]));
  });
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
const sampleUrl = (p: string) =>
  p.replace(/\{([^}]+)\}/g, (_, name: string) => PARAM_SAMPLES[name] ?? 'sample');

const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });

/**
 * JSON Schema permits properties it does not mention, and Pydantic marks every
 * defaulted field optional — so out of the box a mock carrying `themes` where
 * the API emits `theme` validates. That is exactly the drift this test exists
 * to catch, so every object schema that declares `properties` and says
 * nothing about extras is closed: a field the mock has and the API does not
 * declare is a failure. Schemas that opt in to extras (`additionalProperties`
 * set, e.g. Pydantic `extra='allow'` or a `dict[str, X]`) are left alone.
 */
function closeObjects<T>(node: T): T {
  if (Array.isArray(node)) return node.map(closeObjects) as T;
  if (node && typeof node === 'object') {
    const src = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) out[k] = closeObjects(v);
    if ('properties' in src && !('additionalProperties' in src)) out.additionalProperties = false;
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

// ── Tests ──────────────────────────────────────────────────────────────────

describe('API contract (stocks OpenAPI snapshot)', () => {
  it('every /api path the app requests is declared by the API', () => {
    const unmatched: string[] = [];
    let total = 0;
    for (const file of sourceFiles(SRC)) {
      for (const lit of extractApiLiterals(readFileSync(file, 'utf8'))) {
        // A request URL never contains whitespace or a glob star; such literals
        // are error messages and prefix lists, not requests.
        if (/\s|\*|\.\.\./.test(lit)) continue;
        const segs = segments(lit);
        if (segs.length < 2 || segs[1].includes('{p}')) continue; // '/api/' alone or fully dynamic
        total++;
        if (!matchesDeclaredPath(lit, API_PATHS)) unmatched.push(`${path.relative(REPO, file)}: ${lit}`);
      }
    }
    console.info(`[contract] route inventory: ${total} /api literals under src/, ${API_PATHS.length} declared paths`);
    expect(unmatched, 'request literals with no declared API path').toEqual([]);
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
        let hit: ReturnType<typeof resolveMock>;
        try {
          hit = resolveMock(method.toUpperCase(), new URL(sampleUrl(p), 'http://mock.local'), {});
        } catch (err) {
          skipped.push(`${key} (mock threw for the sample request: ${(err as Error).message})`);
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
});
