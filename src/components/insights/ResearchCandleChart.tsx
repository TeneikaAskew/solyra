import { useMemo, useState } from 'react';
import { MicroLabel } from '@/components/primitives';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { useMarketData, type CandlestickBar, type VolumeBar } from '@/hooks/useMarketData';
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

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const date = isReplay && replayCutoff ? replayCutoff.slice(0, 10) : localDate(new Date());
  const endTime = isReplay && replayCutoff ? replayCutoff.slice(11, 16) : null;
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
        <MicroLabel>{isReplay ? `Replay chart · ${date}` : 'Live chart'}</MicroLabel>
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
      <div className="mt-2">
        {market.isLoading ? (
          <div className="h-[320px] animate-pulse rounded-md bg-[var(--surface-1)]" />
        ) : market.isError ? (
          <p role="note" className="rounded-md border border-[var(--warn)]/40 bg-[var(--surface-1)] px-4 py-3 text-xs text-[var(--warn)]">
            Chart data unavailable for {ticker} on {date}. {market.error instanceof Error ? market.error.message : ''}
          </p>
        ) : !bars ? (
          <p role="note" className="rounded-md border border-[var(--warn)]/40 bg-[var(--surface-1)] px-4 py-3 text-xs text-[var(--warn)]">
            Chart data for {ticker} on {date} was missing or invalid, so no chart is shown.
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
