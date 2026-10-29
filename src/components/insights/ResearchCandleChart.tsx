import { useMemo, useState } from 'react';
import { MicroLabel } from '@/components/primitives';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { useAvailableDates, useMarketData, type CandlestickBar, type VolumeBar } from '@/hooks/useMarketData';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { chartTheme } from '@/lib/chartTheme';
import type { Timeframe } from '@/types';
import type { ResearchMode } from '@/types/insightsLovable';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1h' },
];

export interface PriceLine { price: number; color: string; title: string }

/**
 * Validate a stocks OHLCV payload before it reaches the chart. Any missing or
 * non-finite open/high/low/close — or an inverted high/low — makes the source
 * unavailable. We never manufacture bars, zero volume, or a line fallback
 * (CLAUDE.md Rule 4).
 */
export function toChartBars(
  data: { candlestick: CandlestickBar[]; volume: VolumeBar[] } | undefined,
): { candlestick: CandlestickBar[]; volume: VolumeBar[] } | null {
  if (!data || !Array.isArray(data.candlestick) || data.candlestick.length === 0) return null;
  const valid = data.candlestick.every(
    (b) =>
      Number.isFinite(b.time) &&
      Number.isFinite(b.open) &&
      Number.isFinite(b.high) &&
      Number.isFinite(b.low) &&
      Number.isFinite(b.close) &&
      b.high >= b.low,
  );
  if (!valid) return null;
  const volume = Array.isArray(data.volume)
    ? data.volume.filter((v) => Number.isFinite(v.time) && Number.isFinite(v.value))
    : [];
  return { candlestick: data.candlestick, volume };
}

function localDateCompact(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Absolute saved cutoffs must use the market API's Eastern wall clock.
 * Briefing's timezone-less input already represents that market wall clock. */
function marketCutoff(cutoff: string): { date: string; time: string | null } {
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(cutoff)) {
    return { date: cutoff.slice(0, 10).replace(/-/g, ''), time: cutoff.slice(11, 16) };
  }
  const instant = new Date(cutoff);
  if (!Number.isFinite(instant.getTime())) return { date: '', time: null };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)!.value;
  return { date: `${part('year')}${part('month')}${part('day')}`, time: `${part('hour')}:${part('minute')}` };
}

function displayDate(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

/**
 * Resolve the trading day to chart. The market-data API wants YYYYMMDD and
 * only has bars for real sessions — asking for "today" on a weekend/holiday
 * (or before the day's file lands) returns nothing. Snap to the newest
 * available date at or before the target, mirroring ChartsPage's snapping.
 * Returns '' while the dates list is still loading so no bad request fires.
 */
export function resolveChartDate(
  availableDates: string[] | undefined,
  targetCompact: string,
): string {
  if (!availableDates) return '';
  if (availableDates.length === 0) return targetCompact;
  return availableDates.find((d) => d <= targetCompact) ?? '';
}

/**
 * Trader-grade candlestick + volume chart for the research workspace, built on
 * the same lightweight-charts foundation as /charts. In Replay mode the
 * selected cutoff is passed to the stocks data request as `end_time`, so no
 * bar after the boundary is ever fetched or rendered.
 */
export function ResearchCandleChart({
  ticker,
  mode,
  replayCutoff,
  planLines = [],
}: {
  ticker: string;
  mode: ResearchMode;
  replayCutoff: string | null;
  /** Extra levels from a trade plan (entry, stop, targets, key levels). */
  planLines?: PriceLine[];
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>('15');
  const [showVolume, setShowVolume] = useState(true);
  const [rthOnly, setRthOnly] = useState(false);
  const isReplay = mode === 'replay' && Boolean(replayCutoff);
  const cutoff = isReplay && replayCutoff ? marketCutoff(replayCutoff) : null;
  const targetCompact = cutoff ? cutoff.date : localDateCompact(new Date());
  const datesQ = useAvailableDates(ticker);
  const date = datesQ.isError ? targetCompact : resolveChartDate(datesQ.data?.dates, targetCompact);
  // Every bar of an earlier session precedes the boundary; only the target
  // session needs the intraday time filter (weekends, holidays, missing files).
  const endTime = cutoff && date === targetCompact ? cutoff.time : null;
  const market = useMarketData(ticker, date, timeframe, endTime);
  const quote = useLiveQuote(ticker);
  const bars = useMemo(() => toChartBars(market.data), [market.data]);

  const priceLines = useMemo<PriceLine[]>(() => {
    // Live quote is authoritative price evidence in Live mode only — never in Replay.
    if (isReplay || !quote.data) return planLines;
    const lines: PriceLine[] = [...planLines, { price: quote.data.price, color: chartTheme.brand, title: 'Live' }];
    if (quote.data.prev_close != null) {
      lines.push({ price: quote.data.prev_close, color: chartTheme.textMuted, title: 'Prior close' });
    }
    return lines;
  }, [isReplay, quote.data, planLines]);

  return (
    <section aria-label="Price chart" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MicroLabel>{isReplay ? `Replay chart · ${displayDate(date || targetCompact)}` : `Live chart · ${displayDate(date || targetCompact)}`}</MicroLabel>
        <div className="flex flex-wrap items-center gap-1" aria-label="Chart controls">
          <div className="flex rounded-md bg-[var(--surface-2)] p-0.5" role="group" aria-label="Timeframe">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setTimeframe(tf.value)}
                aria-pressed={timeframe === tf.value}
                className={`rounded px-2 py-1 text-[11px] font-semibold ${timeframe === tf.value ? 'bg-[var(--surface-lowest)] text-[var(--on-surface)]' : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'}`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowVolume((v) => !v)}
            aria-pressed={showVolume}
            className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${showVolume ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-[var(--outline-variant)] text-[var(--on-surface-muted)]'}`}
          >
            Volume
          </button>
          <button
            type="button"
            onClick={() => setRthOnly((v) => !v)}
            aria-pressed={rthOnly}
            className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${rthOnly ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-[var(--outline-variant)] text-[var(--on-surface-muted)]'}`}
          >
            RTH
          </button>
        </div>
      </div>
      <ul aria-label="Price references" className="sr-only">
        {priceLines.map((line, index) => <li key={`${line.title}-${index}`}>{line.title}: {line.price}</li>)}
      </ul>
      <div className="mt-2">
        {datesQ.isLoading || market.isLoading ? (
          <div className="h-[320px] animate-pulse rounded-md bg-[var(--surface-1)]" />
        ) : datesQ.data && !date ? (
          <p role="note">Chart unavailable: no trading session exists on or before this cutoff.</p>
        ) : market.isError ? (
          <p role="note" className="rounded-md border border-[var(--warn)]/40 bg-[var(--surface-1)] px-4 py-3 text-xs text-[var(--warn)]">
            Chart data unavailable for {ticker} on {displayDate(date)}. {market.error instanceof Error ? market.error.message : ''}
          </p>
        ) : !bars ? (
          <p role="note" className="rounded-md border border-[var(--warn)]/40 bg-[var(--surface-1)] px-4 py-3 text-xs text-[var(--warn)]">
            Chart data for {ticker} on {displayDate(date)} was missing or invalid, so no chart is shown.
          </p>
        ) : (
          <CandlestickChart
            candlestick={bars.candlestick}
            volume={bars.volume}
            showVolume={showVolume}
            rthOnly={rthOnly}
            priceLines={priceLines}
            minHeight={320}
          />
        )}
      </div>
    </section>
  );
}
