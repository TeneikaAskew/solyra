import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The per-user watchlist talks to the stocks API only. This test reads every
// file the feature creates or edits and fails if any names a Supabase surface.
// The forbidden strings are built from parts so this file contains none of
// them literally and is scanned like every other file in the list.

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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');

describe('per-user watchlist touches no Supabase surface', () => {
  it('no scanned file names a forbidden string', () => {
    const hits: string[] = [];
    for (const rel of SCANNED_FILES) {
      const abs = path.join(REPO, rel);
      if (!fs.existsSync(abs)) {
        throw new Error(`scanned file is missing: ${rel}`);
      }
      const text = fs.readFileSync(abs, 'utf8');
      for (const needle of FORBIDDEN) {
        if (text.includes(needle)) hits.push(`${rel} contains "${needle}"`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('adds no supabase migrations', () => {
    expect(fs.existsSync(path.join(REPO, 'supabase', 'migrations'))).toBe(false);
  });

  it('supabase/functions holds only _shared and insights-research', () => {
    const entries = fs.readdirSync(path.join(REPO, 'supabase', 'functions')).sort();
    expect(entries).toEqual(['_shared', 'insights-research']);
  });
});
