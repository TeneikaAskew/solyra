#!/usr/bin/env node
/**
 * Keep tests/fixtures/stocks-openapi.json in sync with the API contract that
 * TeneikaAskew/stocks commits at platform/api/openapi.json (generated there
 * by scripts/export_openapi.py, kept current by its
 * tests/api/test_openapi_snapshot.py).
 *
 *   npm run contract:sync    # refresh the vendored copy from stocks main
 *   npm run contract:check   # exit 1 if the vendored copy is stale (CI)
 *
 * STOCKS_OPENAPI_REF  selects the stocks git ref (default: main).
 * STOCKS_OPENAPI_FILE reads a local file instead of fetching — for checking
 *                     against a stocks branch you have checked out.
 *
 * Why vendor rather than fetch inside the test: src/mocks/contract.test.ts
 * must stay hermetic (vitest runs offline). The one network step is this
 * script, run once in CI before the tests, where a stale copy is a failure
 * with a diff — never a silent skip (CLAUDE.md Rule 4).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENDORED = path.resolve(__dirname, '..', 'tests', 'fixtures', 'stocks-openapi.json');
const REF = process.env.STOCKS_OPENAPI_REF ?? 'main';
const SOURCE_URL = `https://raw.githubusercontent.com/TeneikaAskew/stocks/${REF}/platform/api/openapi.json`;
const check = process.argv.includes('--check');

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys(value[k])]),
    );
  }
  return value;
}
const canonical = (obj) => JSON.stringify(sortKeys(obj), null, 2) + '\n';
const operations = (spec) =>
  new Map(
    Object.entries(spec.paths ?? {}).flatMap(([p, ops]) =>
      Object.entries(ops).map(([m, op]) => [`${m.toUpperCase()} ${p}`, op]),
    ),
  );

async function loadUpstream() {
  const file = process.env.STOCKS_OPENAPI_FILE;
  if (file) {
    console.log(`[api-contract] reading ${file}`);
    return JSON.parse(readFileSync(file, 'utf8'));
  }
  console.log(`[api-contract] fetching ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    console.error(
      `[api-contract] HTTP ${res.status} for ${SOURCE_URL}.` +
        (res.status === 404
          ? ' stocks has no committed snapshot at that ref yet (it lands with scripts/export_openapi.py).'
          : ''),
    );
    process.exit(2);
  }
  return JSON.parse(await res.text());
}

const upstream = await loadUpstream();
const upstreamText = canonical(upstream);

if (!check) {
  writeFileSync(VENDORED, upstreamText);
  console.log(`[api-contract] wrote ${path.relative(process.cwd(), VENDORED)} (${upstreamText.length} chars)`);
  process.exit(0);
}

let local = null;
try {
  local = JSON.parse(readFileSync(VENDORED, 'utf8'));
} catch {
  console.error(`[api-contract] ${VENDORED} is missing or unreadable — run: npm run contract:sync`);
  process.exit(1);
}
if (canonical(local) === upstreamText) {
  console.log('[api-contract] vendored snapshot matches stocks');
  process.exit(0);
}

const up = operations(upstream);
const lo = operations(local);
const added = [...up.keys()].filter((k) => !lo.has(k)).sort();
const removed = [...lo.keys()].filter((k) => !up.has(k)).sort();
const changed = [...up.keys()]
  .filter((k) => lo.has(k) && canonical(up.get(k)) !== canonical(lo.get(k)))
  .sort();
const schemasChanged = canonical(upstream.components ?? {}) !== canonical(local.components ?? {});
console.error('[api-contract] vendored snapshot is STALE against stocks. Run: npm run contract:sync');
console.error('  then update src/types and the fixtures the diff implies, and re-run npm test.');
if (added.length) console.error(`  operations added:   ${added.join(', ')}`);
if (removed.length) console.error(`  operations removed: ${removed.join(', ')}`);
if (changed.length) console.error(`  operations changed: ${changed.join(', ')}`);
if (schemasChanged) console.error('  components.schemas changed (a response or request model)');
process.exit(1);
