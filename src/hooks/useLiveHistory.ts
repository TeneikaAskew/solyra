import { useQuery } from '@tanstack/react-query';
import type { Bar } from '@/lib/indicators';
import type { OpeningProjection } from '@/lib/playbookEvaluator';

export interface LiveHistory {
  opening?: OpeningProjection | null;
  ticker: string;
  interval: string;
  count: number;
  market_session?: string;
  market_open?: boolean;
  bars: Bar[];
}

export function useLiveHistory(ticker: string, enabled: boolean = true, includeOpening: boolean = false) {
  return useQuery<LiveHistory>({
    queryKey: liveHistoryKey(ticker, includeOpening),
    queryFn: async () => {
      const r = await fetch(`/api/live/history/${ticker}${includeOpening ? '?include_opening=true' : ''}`);
      if (!r.ok) throw new Error(`live-history ${r.status}`);
      const data = await r.json();
      if (includeOpening && (data.ticker !== ticker || !Array.isArray(data.bars) || !data.opening
          || !['available', 'unavailable'].includes(data.opening.status) || data.opening.ticker !== ticker)) {
        throw new Error('live-history: invalid opening response');
      }
      return data;
    },
    enabled: enabled && !!ticker,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export interface AvgVolume {
  ticker: string;
  avg_volume_20d: number;
  sample_size: number;
  last_date?: string | null;
  source: string;
}

export function useAvgVolume(ticker: string) {
  return useQuery<AvgVolume>({
    queryKey: ['avg-volume', ticker],
    queryFn: async () => {
      const r = await fetch(`/api/live/avg-volume/${ticker}`);
      if (!r.ok) throw new Error(`avg-volume ${r.status}`);
      return r.json();
    },
    enabled: !!ticker,
    staleTime: 3_600_000,
  });
}

export function liveHistoryKey(ticker: string, includeOpening = false) {
  return includeOpening ? ['live-history', ticker, 'opening-v1'] : ['live-history', ticker];
}
