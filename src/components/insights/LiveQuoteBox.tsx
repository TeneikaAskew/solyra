import { useMemo } from 'react';
import { MicroLabel, Pill } from '@/components/primitives';
import { PriceAreaChart, type PricePoint } from '@/components/charts/PriceAreaChart';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { useLiveHistory } from '@/hooks/useLiveHistory';
import { fmtCompact, fmtPct, fmtPrice, fmtSignedMoney } from '@/lib/format';

function sessionPill(session?: string, open?: boolean) {
  if (open) return <Pill tone="bull">Market open</Pill>;
  if (session === 'pre') return <Pill tone="warn">Pre-market</Pill>;
  if (session === 'post') return <Pill tone="warn">After hours</Pill>;
  return <Pill tone="bear">Closed</Pill>;
}

/** One live quote used as the single reference for price vs. prior close. */
export function LiveQuoteBox({ ticker }: { ticker: string }) {
  const quote = useLiveQuote(ticker);
  if (quote.isLoading) return <div className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-1)] px-4 py-3 text-xs text-[var(--on-surface-muted)]">Loading live quote…</div>;
  if (quote.isError || !quote.data) return <div role="note" className="rounded-md border border-[var(--warn)]/40 bg-[var(--surface-1)] px-4 py-3 text-xs text-[var(--warn)]">Live quote unavailable for {ticker}. Prices in this answer come from saved evidence and may differ.</div>;
  const q = quote.data;
  const tone = q.change === null ? 'text-[var(--on-surface-muted)]' : q.change >= 0 ? 'text-[var(--bull)]' : 'text-[var(--bear)]';
  return (
    <section aria-label="Live quote" className="rounded-md border border-[var(--outline-variant)] bg-[var(--surface-1)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><MicroLabel>Live quote · {q.ticker}</MicroLabel>{sessionPill(q.market_session, q.market_open)}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[26px] font-bold tabular-nums text-[var(--on-surface)]">{fmtPrice(q.price)}</span>
        <span className={`text-sm font-semibold tabular-nums ${tone}`}>{fmtSignedMoney(q.change)} ({fmtPct(q.change_pct)})</span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {[['Prior close', fmtPrice(q.prev_close)], ['Open', fmtPrice(q.open)], ['Range', `${fmtPrice(q.low)} – ${fmtPrice(q.high)}`], ['Volume', fmtCompact(q.volume)]].map(([k, v]) => <div key={k}><dt className="text-[var(--on-surface-muted)]">{k}</dt><dd className="font-semibold tabular-nums text-[var(--on-surface)]">{v}</dd></div>)}
      </dl>
      <p className="mt-2 text-[10px] text-[var(--on-surface-muted)]">As of {q.last_updated ? new Date(q.last_updated).toLocaleString() : '—'} · Use this as the reference price; evidence snapshots may be older.</p>
    </section>
  );
}

/** Recent price history with live price and prior close marked. */
export function LivePriceChart({ ticker }: { ticker: string }) {
  const history = useLiveHistory(ticker);
  const quote = useLiveQuote(ticker);
  const points = useMemo<PricePoint[]>(() => (history.data?.bars ?? []).slice(-60).map((b) => {
    const d = new Date(b.time);
    return { time: Math.floor(d.getTime() / 1000), price: b.close, label: d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) };
  }), [history.data]);
  const lines = useMemo(() => {
    const out: { value: number; label: string; tone: 'brand' | 'muted' }[] = [];
    if (quote.data) out.push({ value: quote.data.price, label: 'Live', tone: 'brand' });
    if (quote.data?.prev_close != null) out.push({ value: quote.data.prev_close, label: 'Prior close', tone: 'muted' });
    return out;
  }, [quote.data]);
  if (history.isError) return <p className="text-xs text-[var(--warn)]">Price history unavailable for {ticker}.</p>;
  if (history.isLoading) return <div className="h-[180px] animate-pulse rounded-md bg-[var(--surface-1)]" />;
  return <PriceAreaChart data={points} height={180} showDots={false} seriesLabel={`${ticker} price`} priceLines={lines} />;
}
