import { useQuery } from '@tanstack/react-query';

export interface SearchMatch {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  match_score: number;
}

// ---------------------------------------------------------------------------
// Search tickers by keyword (debounced in component)
// ---------------------------------------------------------------------------

export interface TickerSearchResult {
  keywords: string;
  results: SearchMatch[];
}

export function useTickerSearch(keywords: string, enabled = true) {
  return useQuery<TickerSearchResult>({
    queryKey: ['ticker-search', keywords],
    queryFn: async () => {
      const r = await fetch(
        `/api/insights/ticker/search?keywords=${encodeURIComponent(keywords)}&limit=8`,
      );
      if (!r.ok) throw new Error(`search ${r.status}`);
      return r.json();
    },
    enabled: enabled && keywords.length >= 1,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Data coverage per symbol (Task 1's /api/market/coverage) — drives the
// TickerCombobox full/daily/new badges.
// ---------------------------------------------------------------------------

export interface TickerCoverage {
  intraday: boolean;
  daily: boolean;
}

export interface CoverageResult {
  coverage: Record<string, TickerCoverage>;
}

export function useTickerCoverage(symbolsCsv: string, enabled = true) {
  return useQuery<CoverageResult>({
    queryKey: ['ticker-coverage', symbolsCsv],
    queryFn: async () => {
      const r = await fetch(`/api/market/coverage?symbols=${encodeURIComponent(symbolsCsv)}`);
      if (!r.ok) throw new Error(`coverage ${r.status}`);
      return r.json();
    },
    enabled: enabled && symbolsCsv.length > 0,
    staleTime: 60_000,
  });
}
