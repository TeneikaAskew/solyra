import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The per-user watchlist talks to the stocks API only. This test reads every
// file the feature creates or edits and fails if any names a Supabase surface.
// The forbidden strings are built from parts so this file contains none of
// them literally and is scanned like every other file in the list.
//
// Two tiers. SCANNED_FILES are the files this change owns: none may contain a
// forbidden string. EDITED_RESEARCH_SPECS are the research workspace's own
// Playwright specs, which name that workspace's edge-function routes before
// and independently of this change and which the spec keeps untouched; this
// change edited only their watchlist route glob. They are checked on the lines
// this change owns (no line naming a watchlist route holds a forbidden
// string) and pinned elsewhere (each forbidden string's occurrence count must
// equal the count measured before the change, so a new one fails).

const FORBIDDEN: readonly string[] = [
  ['integrations', 'supabase'].join('/'),
  ['supabase', 'co'].join('.'),
  ['functions', 'v1'].join('/'),
  ['SUPABASE', ''].join('_'),
  ['api', 'key'].join(''),
];

// Repo-relative paths. A path that does not exist fails the test: the list is
// the contract, so nothing is skipped.
const SCANNED_FILES: readonly string[] = [
  'src/components/insights/DefaultWatchlistSection.tsx',
  'src/components/insights/MyWatchlistSection.tsx',
  'src/components/insights/WatchlistPanel.sections.test.tsx',
  'src/components/insights/WatchlistPanel.tsx',
  'src/components/insights/watchlistCopy.test.ts',
  'src/components/insights/watchlistCopy.ts',
  'src/components/shared/TickerCombobox.tsx',
  'src/hooks/useTickerSearch.ts',
  'src/hooks/useUserWatchlist.test.tsx',
  'src/hooks/useUserWatchlist.ts',
  'src/hooks/useWatchlist.extras.test.tsx',
  'src/hooks/useWatchlist.ts',
  'src/lib/marketSession.ingest.test.ts',
  'src/lib/marketSession.ts',
  'src/mocks/contract.test.ts',
  'src/mocks/insights.ts',
  'src/types/assignability.ts',
  'src/types/stocksOpenApi.gen.d.ts',
  'src/types/watchlist.ts',
  'tests/dashboard/ticker-combobox.spec.ts',
  'tests/fixtures/stocks-openapi.json',
  'tests/helpers/fixtures/insights.ts',
  'tests/insights/watchlist.spec.ts',
  'src/hooks/useUserWatchlist.supabase.test.ts',
];

// Pinned occurrence counts of each forbidden string, as measured on the files
// before this change; a forbidden string not listed here is pinned at zero.
const EDITED_RESEARCH_SPECS: ReadonlyArray<{ file: string; pinned: Readonly<Record<string, number>> }> = [
  { file: 'tests/ai-insights-lovable/final-findings.spec.ts', pinned: { [['functions', 'v1'].join('/')]: 3 } },
  { file: 'tests/ai-insights-lovable/workspace-integration.spec.ts', pinned: { [['functions', 'v1'].join('/')]: 8 } },
];

// The only lines this change edits in those specs name a watchlist route.
const WATCHLIST_ROUTES: readonly string[] = ['/api/insights/watchlist', '/api/me/watchlist'];

const countOf = (text: string, needle: string): number => text.split(needle).length - 1;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

describe('per-user watchlist touches no Supabase surface', () => {
  it('no scanned file names a forbidden string', () => {
    const hits: string[] = [];
    for (const rel of SCANNED_FILES) {
      // readFileSync throws ENOENT naming the path for a missing file.
      const text = fs.readFileSync(path.join(REPO, rel), 'utf8');
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) hits.push(`${rel} contains "${needle}"`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('the edited research specs hold only their pinned forbidden strings, none on a watchlist route line', () => {
    const problems: string[] = [];
    for (const { file, pinned } of EDITED_RESEARCH_SPECS) {
      const text = fs.readFileSync(path.join(REPO, file), 'utf8');
      for (const needle of FORBIDDEN) {
        const expected = pinned[needle] ?? 0;
        const actual = countOf(text, needle);
        if (actual !== expected) problems.push(`${file} has ${actual} of "${needle}", pinned at ${expected}`);
      }
      text.split('\n').forEach((line, i) => {
        if (!WATCHLIST_ROUTES.some((route) => line.includes(route))) return;
        for (const needle of FORBIDDEN) {
          if (line.includes(needle)) problems.push(`${file}:${i + 1} names a watchlist route and "${needle}"`);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it('adds no supabase migrations', () => {
    expect(fs.existsSync(path.join(REPO, 'supabase', 'migrations'))).toBe(false);
  });

  it('supabase/functions holds only _shared and insights-research', () => {
    const dir = path.join(REPO, 'supabase', 'functions');
    expect(fs.existsSync(dir), 'supabase/functions is missing; it holds the insights-research function').toBe(true);
    const entries = fs.readdirSync(dir).sort();
    expect(entries).toEqual(['_shared', 'insights-research']);
  });
});
