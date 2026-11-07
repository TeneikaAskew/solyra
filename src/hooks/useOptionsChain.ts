import { dataUnlessError } from '@/lib/queryData';
import { useQuery } from '@tanstack/react-query';
import { parseApiError } from '@/lib/apiError';
import type { ChainOptionRecord } from './useOptionsGreeks';

export interface OptionsResponse {
  ticker: string;
  date: string;
  options: ChainOptionRecord[];
  snapshot_timestamp: string;
  metadata: { source: string; data_source: string; row_count: number };
  cached: boolean;
}


export function useOptionsChain(ticker: string, date: string, enabled: boolean) {
  const query = useQuery<OptionsResponse>({
    queryKey: ['options', ticker, date],
    queryFn: async () => {
      // Cloud SQL EOD path first — populated by the 9 PM ET fetcher.
      const r = await fetch(`/api/options/${ticker}/${date}`);
      if (r.ok) return r.json();

      // 404 → fall back to the live AlphaVantage proxy (replaces the old
      // Cloudflare Worker). Anything else propagates as an error.
      if (r.status === 404) {
        const live = await fetch(`/api/options/live/${ticker}/${date}`);
        if (live.ok) return live.json();
        throw new Error(await parseApiError(live, 'Failed to fetch live options data'));
      }
      throw new Error(await parseApiError(r, 'Failed to fetch options data'));
    },
    enabled: enabled && !!ticker && !!date,
    staleTime: 3_600_000, // 1 hour
    retry: false,
  });
  return { ...query, data: dataUnlessError(query.data, query.isError) };
}

