import { useQuery } from '@tanstack/react-query';
import type { Bar } from '@/lib/indicators';
import type { Indicators, Signal } from '@/lib/indicators';
import type { ChartVoter } from '@/types';

export interface IndicatorsRequest {
  bars: Bar[];
  current_price?: number | null;
  current_volume?: number | null;
  avg_volume_20d?: number | null;
}

export interface IndicatorsResponse {
  indicators: Indicators;
  signals: { call: Signal; put: Signal };
  chart_voter: ChartVoter;
}

/**
 * Server-side indicator + signal computation. The app never recomputes
 * these client-side — lib/indicators.py is the single source of truth.
 *
 * Keyed on the complete request content so corrected interior OHLCV cannot
 * reuse stale derived results. Equal contents still share the same query.
 */
export function useLiveIndicators(req: IndicatorsRequest, enabled: boolean) {
  const key = ['live-indicators', req];
  return useQuery<IndicatorsResponse>({
    queryKey: key,
    queryFn: async () => {
      const r = await fetch('/api/live/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!r.ok) throw new Error(`live-indicators ${r.status}`);
      return r.json();
    },
    enabled: enabled && req.bars.length > 0,
    staleTime: 10_000,
  });
}

export interface SignalSeriesFire {
  time: string;
  /** 'CALL' | 'PUT' today; plain string per schema. */
  direction: string;
  score: number;
  bar_index: number;
}

export interface SignalSeriesResponse {
  fires: SignalSeriesFire[];
}

/**
 * Server-side per-bar signal fires for the Charts page "Sig" overlay.
 *
 * Backed by POST /api/live/signal-series, which runs lib.signals'
 * production mean-reversion voter (the SAME per-bar logic
 * gcp/signal_monitor.py fires live alerts from) over the supplied bar
 * series — there is no client-side re-derivation of the voter.
 *
 * Keyed on ticker/date identity plus complete bar contents. A correction to
 * any existing OHLCV value gets a separate cache entry even when timestamps
 * and series length stay unchanged. A late old-input response cannot populate
 * the corrected-input query, and equal contents remain deduplicated.
 */
export function useSignalSeries(bars: Bar[], keyId: string, enabled: boolean) {
  const key = ['live-signal-series', keyId, { bars }];
  return useQuery<SignalSeriesResponse>({
    queryKey: key,
    queryFn: async () => {
      const r = await fetch('/api/live/signal-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bars }),
      });
      if (!r.ok) throw new Error(`live-signal-series ${r.status}`);
      return r.json();
    },
    enabled: enabled && bars.length >= 14,
    staleTime: 10_000,
  });
}
