/**
 * "My style" panel — mines the signed-in user's own closed chart/manual
 * journal trades into a per-direction condition profile and walk-forward
 * validates it (POST /api/style/mine-and-validate, lib/style_miner.py +
 * lib/walk_forward.py in the stocks repo).
 *
 * History (issue #14): Task 4.4 shipped this panel on ChartsPage (0721eec),
 * and the Task 6 strip-down (52acbe1) swept it away with the rest of Charts'
 * journal activity one day after it was polished — collateral, never a
 * decision. Re-homed here in the Journal one-stop cockpit, the panel's
 * natural owner now that all journal activity lives on this page. The hook
 * layer (useMineMyStyle + the response types + styleConditionLabel) was
 * knowingly kept the whole time and is consumed unchanged.
 *
 * Render states (design spec Task 4.4):
 *  - idle       → explainer + "Mine my style" button
 *  - pending    → button disabled, mining note (multi-second backend job)
 *  - unavailable→ the server's honest {status:'unavailable', reason} — an
 *                 expected state (< 10 closed trades, zero folds, …), shown
 *                 as a muted note, not an error (Rule 3.7)
 *  - error      → loud inline banner with the server's detail message
 *  - success    → condition chips + win rate / expectancy WITH sample sizes
 *                 + "Validated across N folds · stability X%"
 */
import { Sparkles } from 'lucide-react';
import { Card, CardHeader } from '@/components/primitives';
import {
  isMineStyleUnavailable,
  styleConditionLabel,
  useMineMyStyle,
} from '@/hooks/useJournalChartTrades';

const NA = '—';

/** 0-1 fraction → "57%" ; null → em dash (never a fabricated rate). */
function fmtFraction(f: number | null | undefined): string {
  return f == null ? NA : `${(f * 100).toFixed(0)}%`;
}

/** TRUE-percent expectancy → signed "+0.42%" ; null → em dash. */
function fmtExpectancy(pct: number | null | undefined): string {
  if (pct == null) return NA;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

export function MyStylePanel({ ticker }: { ticker: string }) {
  const mine = useMineMyStyle();
  const result = mine.data;

  return (
    <section data-testid="my-style-panel">
      <Card className="space-y-3">
        <CardHeader title="My style" meta="mined from your closed trades · walk-forward validated" />

      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid="mine-style-btn"
          onClick={() => mine.mutate({ ticker })}
          disabled={mine.isPending}
          className="flex items-center gap-1.5 rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={13} />
          {mine.isPending ? 'Mining…' : 'Mine my style'}
        </button>
        {mine.isPending && (
          <span className="text-[11px] text-[var(--on-surface-muted)]">
            Mining {ticker} closed trades and running the walk-forward validation — this takes a
            few seconds.
          </span>
        )}
        {!mine.isPending && !result && !mine.isError && (
          <span className="text-[11px] text-[var(--on-surface-muted)]">
            Finds the market conditions your winning {ticker} trades share, then backtests them
            out-of-sample. Needs 10+ closed trades.
          </span>
        )}
      </div>

      {mine.isError && (
        <p
          data-testid="my-style-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-[var(--bear)]"
        >
          Style mining failed: {mine.error.message}
        </p>
      )}

      {result && isMineStyleUnavailable(result) && (
        <p
          data-testid="my-style-unavailable"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-[var(--warn)]"
        >
          {result.reason}
        </p>
      )}

      {result && !isMineStyleUnavailable(result) && (
        <div data-testid="my-style-result" className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                result.profile.direction === 'CALL'
                  ? 'bg-green-500/20 text-[var(--bull)]'
                  : 'bg-red-500/20 text-[var(--bear)]'
              }`}
            >
              {result.profile.direction}
            </span>
            {result.profile.conditions.map((c) => (
              <span
                key={c}
                data-testid="my-style-condition"
                className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
              >
                {styleConditionLabel(c)}
              </span>
            ))}
            {result.staged && (
              <span
                data-testid="my-style-staged"
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--on-surface-muted)]"
                title="This profile was staged server-side for signal evaluation"
              >
                staged
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--color-text-secondary)]">
            Mined from {result.profile.support} of {result.profile.total} closed trades · win rate{' '}
            <span className="font-semibold tabular-nums">
              {fmtFraction(result.aggregate_metrics.avg_win_rate)}
            </span>{' '}
            · expectancy{' '}
            <span className="font-semibold tabular-nums">
              {fmtExpectancy(result.aggregate_metrics.avg_expectancy_pct)}
            </span>{' '}
            over {result.aggregate_metrics.total_trades_all_folds} out-of-sample trades
          </p>

          <p data-testid="my-style-validation" className="text-[11px] text-[var(--on-surface-muted)]">
            {result.aggregate_metrics.total_folds != null
              ? `Validated across ${result.aggregate_metrics.total_folds} folds · stability ${(result.stability_score * 100).toFixed(0)}%`
              : `Stability ${(result.stability_score * 100).toFixed(0)}%`}
          </p>
        </div>
      )}
      </Card>
    </section>
  );
}
