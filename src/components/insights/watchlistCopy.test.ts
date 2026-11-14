// FEAT-INSIGHT-001 done_when[1]: a row's data state under a fixed clock. Each of
// the three outcomes is asserted, so an implementation that always says the
// data is pending, or renders a blank, fails.
import { describe, expect, it } from 'vitest';
import type { MeWatchlistRow } from '@/types/watchlist';
import { dataStateCopy } from './watchlistCopy';

// 09:00 EST; the most recent elapsed 00:30 ET is 2026-11-13T05:30:00Z.
const NOW = new Date('2026-11-13T14:00:00Z');

const row = (added_at: string, last_daily_bar: string | null): MeWatchlistRow => ({
  ticker: 'ABCD',
  added_at,
  source: 'ui',
  name: null,
  exchange: null,
  asset_type: null,
  last_daily_bar,
});

describe('dataStateCopy', () => {
  it('a null-bar row added after the boundary waits for tonight', () => {
    expect(dataStateCopy(row('2026-11-13T06:00:00Z', null), NOW)).toBe("data arrives after tonight's fetch");
  });

  it('a null-bar row added before the boundary has no data', () => {
    expect(dataStateCopy(row('2026-11-12T20:00:00Z', null), NOW)).toBe('no data for this symbol');
  });

  it('a row with a bar has no data-state copy; the bar date shows instead', () => {
    expect(dataStateCopy(row('2026-11-13T06:00:00Z', '2026-11-12'), NOW)).toBeNull();
  });
});
