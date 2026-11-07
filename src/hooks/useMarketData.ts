import { useQuery } from '@tanstack/react-query';
import type { Timeframe } from '@/types';
import { todayET } from '@/lib/dates';

interface CandlestickBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeBar {
  time: number;
  value: number;
  color: string;
}

interface MarketDataResponse {
  ticker: string;
  date: string;
  timeframe: number;
  count: number;
  candlestick: CandlestickBar[];
  volume: VolumeBar[];
}

interface DatesResponse {
  ticker: string;
  source: string;
  dates: string[];
  months: string[];
}

/** Legacy dates do not certify completeness or immutable publication vintage. */
export function marketDataStaleTime(date: string): number {
  const compact = date.replaceAll('-', '');
  const today = todayET().replaceAll('-', '');
  const mutable = compact.length === 6 ? compact >= today.slice(0, 6) : compact >= today;
  return mutable ? 60_000 : 300_000;
}

export class MarketReadError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(`HTTP ${status}: ${message}`); this.status = status; }
}

async function checkedJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body && typeof body.detail === 'string' ? body.detail : res.statusText;
    throw new MarketReadError(res.status, detail || 'Market data request refused');
  }
  return res.json();
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }

function validateBars(value: unknown, ticker: string, date: string, timeframe: Timeframe): MarketDataResponse {
  const invalid = () => { throw new Error('Invalid market data response: identity, count or price/time integrity'); };
  if (!record(value) || value.ticker !== ticker || value.date !== date || value.timeframe !== Number(timeframe)
    || !Number.isInteger(value.count) || (value.count as number) < 0
    || !Array.isArray(value.candlestick) || value.candlestick.length !== value.count || !Array.isArray(value.volume)) return invalid();
  let prior = -Infinity;
  for (const bar of value.candlestick) {
    if (!record(bar) || !finite(bar.time) || bar.time <= prior
      || !finite(bar.open) || !finite(bar.high) || !finite(bar.low) || !finite(bar.close)
      || Math.min(bar.open, bar.high, bar.low, bar.close) <= 0
      || bar.high < Math.max(bar.open, bar.close, bar.low) || bar.low > Math.min(bar.open, bar.close, bar.high)) return invalid();
    prior = bar.time;
  }
  prior = -Infinity;
  for (const bar of value.volume) {
    if (!record(bar) || !finite(bar.time) || bar.time <= prior || !finite(bar.value) || bar.value < 0 || typeof bar.color !== 'string') return invalid();
    prior = bar.time;
  }
  return value as unknown as MarketDataResponse;
}

export function useMarketData(ticker: string, date: string, timeframe: Timeframe, endTime?: string | null) {
  const query = useQuery<MarketDataResponse>({
    queryKey: ['market-data', ticker, date, timeframe, endTime ?? 'eod'],
    queryFn: async () => {
      const params = new URLSearchParams({ timeframe });
      if (endTime) params.set('end_time', endTime);
      const res = await fetch(`/api/market/data/${ticker}/${date}?${params.toString()}`);
      return validateBars(await checkedJson(res), ticker, date, timeframe);
    },
    enabled: !!ticker && !!date,
    staleTime: () => marketDataStaleTime(date),
    retry: false,
  });
  // React Query retains last success on a refused refetch. Preserve the error,
  // but never expose those prices as usable input to replay/derived consumers.
  return { ...query, data: query.isError ? undefined : query.data };
}

export function useAvailableDates(ticker: string) {
  return useQuery<DatesResponse>({
    queryKey: ['market-dates', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/market/dates/${ticker}`);
      if (!res.ok) throw new Error('Failed to load dates');
      return res.json();
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}

interface ReferenceLevels {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Absent on the GCS branch. */
  source?: string;
  /** Cloud SQL branch only. */
  stale_days?: number;
  week?: {
    high: number; low: number; avg_close: number; avg_rsi_14: number | null;
    start_date: string; end_date: string; sessions: number;
  } | null;
}

export function useReferenceLevels(ticker: string, date: string) {
  const query = useQuery<ReferenceLevels | null>({
    queryKey: ['reference-levels', ticker, date],
    queryFn: async () => {
      const res = await fetch(`/api/market/reference/${ticker}/${date}`);
      return await checkedJson(res) as ReferenceLevels;
    },
    enabled: !!ticker && !!date,
    staleTime: () => marketDataStaleTime(date),
    retry: false,
  });
  return { ...query, data: query.isError ? undefined : query.data };
}

export type { CandlestickBar, VolumeBar, DatesResponse, MarketDataResponse, ReferenceLevels };
