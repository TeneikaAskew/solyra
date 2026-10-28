import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser';
import { useAuthBlocked, useVerificationRequired } from '@/lib/authGate';
import { fmtNum, fmtPct, NA, responseErrorMessage } from '@/lib/format';
import { useTickerStore } from '@/stores/tickerStore';
import { SignInEmptyState, VerifyEmailEmptyState } from '@/components/shared/SignInEmptyState';
import type { ClosingMetricSummary, EarningsDailySummary, EarningsHistoryResponse,
  EarningsTickerLean } from '@/types/earnings';
import { closingMetricText, historicalPercent, parseEarningsHistory, parseEarningsLean } from './earningsContract';

class EarningsHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function QueryError({ error, label }: { error: Error; label: string }) {
  if (error instanceof EarningsHttpError && error.status === 401) return <SignInEmptyState compact />;
  if (error instanceof EarningsHttpError && error.status === 404) {
    return <p role="status" className="text-sm text-[var(--on-surface-muted)]">{label} unavailable for this ticker (HTTP 404). No substitute event was loaded.</p>;
  }
  return <p role="alert" className="rounded-lg border border-[var(--bear)]/40 p-3 text-sm text-[var(--bear)]">{label}: {error.message}</p>;
}

function MetricSummary({ title, value }: { title: string; value: ClosingMetricSummary }) {
  return <div className="rounded-lg bg-[var(--surface-2)] p-3">
    <h4 className="text-sm font-semibold">{title}</h4>
    <p className="mt-1 text-sm">{value.eligible_n > 0
      ? <><strong>{historicalPercent(value.observed_rate_pct)}</strong> historical occurrence · {value.observed_n} observed / {value.eligible_n} eligible events</>
      : 'Historical occurrence unavailable — no eligible events.'}</p>
    <p className="mt-1 text-xs text-[var(--on-surface-muted)]">{value.right_censored_n} not observed by endpoint · {value.unavailable_n} unavailable · {value.not_applicable_n} not applicable</p>
    <p className="mt-1 text-xs">Median first observed closing step: {fmtNum(value.median_first_observed_step, 1)}</p>
  </div>;
}

function HistoricalSummary({ value }: { value: EarningsDailySummary }) {
  return <div data-testid="earnings-summary" className="space-y-3">
    {value.qualified_native_n > 0 ? <p className="text-sm" data-testid="earnings-native-percentages">
      Across <strong>{value.qualified_native_n}</strong> qualified historical events, <strong>{historicalPercent(value.historical_direction_consistency_pct)}</strong> met the direction-consistency rule; <strong>{historicalPercent(value.historical_upward_opening_gap_pct)}</strong> had an upward opening gap.
    </p> : <p role="status">Native historical percentages unavailable — 0 qualified events.</p>}
    <p className="text-xs text-[var(--on-surface-muted)]">Current historical context, not a pre-event prediction. Server cohort: {value.event_n} events. Percentages are historical descriptions, not forward confidence.</p>
    <div className="grid gap-3 md:grid-cols-2">
      <MetricSummary title="First opposite closing step" value={value.first_opposite_close} />
      <MetricSummary title="Closing gap fill" value={value.closing_gap_fill} />
    </div>
    <details className="text-xs text-[var(--on-surface-muted)]">
      <summary className="cursor-pointer">Summary cohort and source mode</summary>
      <p className="mt-2 break-words">{value.mode} · {value.scope}</p>
      {value.point_in_time_verified !== true && <p>Original historical point-in-time publication is not verified.</p>}
      <ul className="mt-2 space-y-1">{value.events.map(e => <li key={e.event_id} className="break-words">{e.reported_date} · fiscal {e.fiscal_date_ending ?? NA} · {e.status}{e.reason ? ` · ${e.reason}` : ''}</li>)}</ul>
    </details>
  </div>;
}

export interface EarningsHistoryResultsProps {
  ticker: string;
  history?: EarningsHistoryResponse;
  lean?: EarningsTickerLean;
  historyPending?: boolean;
  leanPending?: boolean;
  historyError?: Error | null;
  leanError?: Error | null;
}

/** Presentation of already computed server values; exported for actual render controls. */
export function EarningsHistoryResults({ ticker, history, lean, historyPending = false,
  leanPending = false, historyError, leanError }: EarningsHistoryResultsProps) {
  const summary = lean?.daily_path_summary_v1;
  return <section aria-label={`Earnings history for ${ticker}`} data-testid="earnings-history"
    className="space-y-4 rounded-xl bg-[var(--surface-1)] p-4 ring-1 ring-[var(--outline-variant)]">
    <div>
      <h2 className="text-base font-semibold">Earnings history — {ticker}</h2>
      <p className="mt-1 text-xs text-[var(--on-surface-muted)]">Post-event price-action descriptions from the existing earnings engine. No forecast probability.</p>
    </div>
    {leanError ? <QueryError error={leanError} label="Historical summary" />
      : leanPending ? <p role="status">Loading historical summary…</p>
      : summary ? <HistoricalSummary value={summary} />
      : <p role="status" className="text-sm text-[var(--on-surface-muted)]">Qualified historical summary unavailable. The backend has not supplied the versioned descriptor.</p>}

    {historyError ? <QueryError error={historyError} label="Stored event history" />
      : historyPending ? <p role="status">Loading stored events…</p>
      : history && history.rows.length > 0 ? <>
        <p className="text-xs text-[var(--on-surface-muted)]">{history.count} stored events shown. These rows are separate from the server-selected summary cohort. Closing steps are daily samples: step 0 is the reaction session's completed close; later steps are subsequent session closes, not elapsed hours or intraday order.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-xs" data-testid="earnings-events">
          <caption className="sr-only">Stored earnings events and distinct native and closing-path outcomes</caption>
          <thead className="text-[var(--on-surface-muted)]"><tr>
            {['Reported date', 'Opening gap', 'Native 5-day sustain', 'Native reversal flag', 'First opposite close', 'Closing gap fill', 'Evidence'].map(s => <th key={s} className="px-2 py-2 font-medium">{s}</th>)}
          </tr></thead>
          <tbody>{history.rows.map(row => {
            const p = row.daily_path_v1;
            return <tr key={`${row.ticker}:${row.fiscal_date_ending}:${row.reported_date}`} className="border-t border-[var(--outline-variant)] align-top">
              <td className="whitespace-nowrap px-2 py-3">{row.reported_date}<span className="mt-1 block text-[var(--on-surface-muted)]">Fiscal {row.fiscal_date_ending ?? NA}</span></td>
              <td className="whitespace-nowrap px-2 py-3">{fmtPct(row.reaction_gap_pct)}</td>
              <td className="whitespace-nowrap px-2 py-3">{fmtPct(row.sustain_5d_pct)}</td>
              <td className="px-2 py-3">{row.is_reversal_5d === null ? NA : row.is_reversal_5d ? 'Yes' : 'No'}</td>
              <td className="px-2 py-3">{closingMetricText(p, 'first_opposite_close')}</td>
              <td className="px-2 py-3">{closingMetricText(p, 'closing_gap_fill')}</td>
              <td className="max-w-[28rem] px-2 py-3"><details><summary className="cursor-pointer">Qualification</summary>
                {p ? <div className="mt-2 space-y-1 break-words">
                  <p>Status: {p.status}{p.reason ? ` · ${p.reason}` : ''}</p>
                  <p>Event: {p.event_id ?? NA}</p><p>Timing: {p.reaction_basis ?? NA}</p>
                  <p>Source mode: {p.source_mode ?? 'unavailable'}</p><p>Basis: {p.basis_id ?? NA}</p>
                  <p>Input identity: {p.input_identity ?? NA}</p>
                  <p>Observed / expected closing steps: {p.observed_steps ?? NA} / {p.expected_steps ?? NA}</p>
                  <p>Reaction / endpoint sessions: {p.reaction_session ?? NA} / {p.window_end_session ?? NA}</p>
                  <p>Mature at: {p.mature_at ?? NA}</p><p>Observation: {p.observation_ts ?? NA}</p><p>Computed: {p.computed_at ?? NA}</p>
                  <p>Timestamp offsets are retained as supplied by the backend. Source mode does not certify original publication vintage.</p>
                </div> : <p className="mt-2">No qualified versioned daily path supplied.</p>}
              </details></td>
            </tr>;
          })}</tbody>
        </table></div>
        <p className="text-xs text-[var(--on-surface-muted)]">The native reversal flag, first opposite close and closing gap fill are different measures. “Not observed by endpoint” is right-censored, not a claim that reversal never happens.</p>
      </> : history ? <p role="status">The backend returned an explicitly empty stored history.</p> : null}
    {lean && !leanError && <details className="text-xs text-[var(--on-surface-muted)]"><summary className="cursor-pointer">Legacy ticker statistics</summary>
      <p className="mt-2">Stored quarters (legacy count): {lean.total_quarters ?? NA}. Legacy lean score: {fmtNum(lean.lean_score)} — not a probability. This count is not substituted for the qualified summary denominator.</p>
    </details>}
  </section>;
}

export function EarningsHistory() {
  const ticker = useTickerStore(s => s.activeTicker).toUpperCase();
  const user = useUser();
  const blocked = useAuthBlocked();
  const verificationRequired = useVerificationRequired(user.uid);
  const identity = user.authMode === 'open' ? 'open' : user.uid ?? user.email;
  const validTicker = /^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(ticker);
  const enabled = validTicker && user.isSignedIn && !user.isLoading && !blocked && !verificationRequired && identity !== null;
  const common = { enabled, retry: false as const, staleTime: 5 * 60_000,
    refetchOnWindowFocus: false, placeholderData: () => undefined };
  const history = useQuery({ ...common,
    queryKey: ['earnings-history', user.authMode, identity, ticker],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/earnings/history/${encodeURIComponent(ticker)}?limit=20`, { signal });
      if (!r.ok) throw new EarningsHttpError(r.status, await responseErrorMessage(r));
      return parseEarningsHistory(await r.json(), ticker);
    },
  });
  const lean = useQuery({ ...common,
    queryKey: ['earnings-ticker-lean', user.authMode, identity, ticker],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/earnings/ticker/${encodeURIComponent(ticker)}/lean`, { signal });
      if (!r.ok) throw new EarningsHttpError(r.status, await responseErrorMessage(r));
      return parseEarningsLean(await r.json(), ticker);
    },
  });
  if (user.isLoading) return <p role="status">Loading earnings data access…</p>;
  if (!user.isSignedIn || blocked || identity === null) return <SignInEmptyState compact />;
  if (verificationRequired) return <VerifyEmailEmptyState compact />;
  if (!validTicker) return <p role="status">Select a valid ticker to load earnings history.</p>;
  return <EarningsHistoryResults ticker={ticker}
    history={history.data} lean={lean.data}
    historyPending={history.isPending} leanPending={lean.isPending}
    historyError={history.error} leanError={lean.error} />;
}
