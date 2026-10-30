// Live signal evidence for the AI Insights Lab Briefing. The insight report's
// own supporting_signals list is often empty, so the card reads the stocks
// signal feed directly and feeds its latest alert into the historical
// "similar setups" query. No math here: both endpoints do it server-side.
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { SimilarSetupsCard } from '@/components/charts/SimilarSetupsCard';
import type { SignalRef } from '@/types/insights';
import { latestSignal, type SignalFeedRow } from './decision';

interface Props { ticker: string; replayCutoff: string | null; reportSignals: SignalRef[]; historical?: boolean }

function useSignalFeed(ticker: string, cutoff: string | null, enabled: boolean) {
  return useQuery<{ signals: SignalFeedRow[] }>({
    queryKey: ['ai-lab-signals', ticker, cutoff ?? 'live'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (cutoff) { params.set('end_date', cutoff.slice(0, 10)); params.set('end_time', `${cutoff.slice(11, 16)}:00`); }
      const r = await fetch(`/api/signals/${ticker}?${params}`);
      if (!r.ok) throw new Error(`Signal feed returned ${r.status}`);
      return r.json();
    },
    staleTime: 60_000,
    enabled,
  });
}

export function MarketSignals({ ticker, replayCutoff, reportSignals, historical = false }: Props) {
  const feed = useSignalFeed(ticker, replayCutoff, !historical);
  const rows = historical ? [] : feed.data?.signals ?? [];
  const latest = latestSignal(rows);
  return (
    <>
      <div className="rounded-xl bg-[var(--surface-2)] p-6">
        <h3 className="label-micro mb-3">Supporting Signals</h3>
        {!historical && feed.isLoading ? (
          <p className="flex items-center gap-2 text-xs text-[var(--on-surface-muted)]"><Loader2 size={12} className="animate-spin" />Loading signal feed…</p>
        ) : !historical && feed.isError ? (
          <p role="alert" className="text-xs text-[var(--bear)]">Signal feed unavailable: {(feed.error as Error).message}</p>
        ) : rows.length === 0 && reportSignals.length === 0 ? (
          <p className="text-xs text-[var(--on-surface-muted)]">No signal alerts recorded for {ticker}.</p>
        ) : (
          <ul className="space-y-2 text-xs" aria-label="Recent signals">
            {(rows.length ? rows.slice(0, 5).map((s) => ({ t: s.time, d: s.direction, sc: s.score, rsi: s.rsi ?? null }))
              : reportSignals.slice(0, 5).map((s) => ({ t: s.alert_ts, d: s.direction, sc: s.score, rsi: null }))).map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-3 tabular-nums">
                <span className={`font-mono font-semibold ${s.d === 'CALL' ? 'text-[var(--bull)]' : 'text-[var(--bear)]'}`}>{s.d}</span>
                <span className="text-[var(--on-surface-variant)]">score {s.sc ?? '—'}</span>
                <span className="text-[var(--on-surface-muted)]">RSI {s.rsi == null ? '—' : s.rsi.toFixed(1)}</span>
                <span className="text-[10px] text-[var(--on-surface-muted)]">{String(s.t).slice(0, 16)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {replayCutoff || historical ? <p role="note" className="text-xs text-[var(--on-surface-muted)]">Similar setups unavailable for historical evidence: this source has no point-in-time aggregate contract.</p> : <SimilarSetupsCard ticker={ticker} direction={latest?.direction ?? null} rsi={latest?.rsi ?? null} score={latest?.score ?? null} />}
    </>
  );
}
