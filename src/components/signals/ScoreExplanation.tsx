import { presentSignalScore, type SignalScoreInput } from '@/lib/signalScore';

/** Shared presentation of historical API evidence; no market-score evaluator. */
export function ScoreExplanation({ row, source }: { row: SignalScoreInput; source?: string }) {
  const view = presentSignalScore(row);
  const p = view.provenance;
  const identity = [
    ['Corpus', p.corpus], ['Strategy', p.strategy], ['Profile', p.profile],
    ['Run kind', p.run_kind], ['Storage source', p.storage_source],
    ['API response source', source || 'Unavailable'],
    ['Producer definition', p.producer_definition], ['Direction', p.direction],
    ['Event time', view.eventTime], ['Generated at', p.generated_at], ['Inserted at', p.inserted_at],
    ['Code identity', p.code_sha256], ['Config identity', p.config_sha256], ['Input identity', p.input_sha256],
  ];
  return (
    <div data-testid="score-explanation" className="min-w-[180px] max-w-md text-left text-xs text-[var(--on-surface-variant)]">
      <div className="font-mono tabular-nums">Stored strength: <span data-testid="signal-strength">{view.strength}</span></div>
      {view.status === 'recorded'
        ? <div>{`Base conditions: ${view.base}`}</div>
        : <div className="text-[var(--on-surface-muted)]">Breakdown unavailable</div>}
      <div className="mt-0.5 text-[10px] text-[var(--on-surface-muted)]">Strategy: {p.strategy} · Profile: {p.profile} · Run kind: {p.run_kind}</div>
      <details className="mt-1" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <summary className="cursor-pointer underline underline-offset-2">Score details and provenance</summary>
        <div className="mt-2 space-y-1 break-words">
          {view.status === 'recorded' ? <>
            <div>{`Composite strength: ${view.composite}`}</div>
            <div>{`Bonus total: ${view.bonusTotal}`}</div>
            {view.bonuses?.length === 0 ? <div>Named bonuses: none recorded</div> : (
              <ul>{view.bonuses?.map(bonus => <li key={bonus.name}>{bonus.name}: {bonus.value}</li>)}</ul>
            )}
            <div>Matched conditions: {view.matchedConditions.length ? view.matchedConditions.join(', ') : 'None recorded'}</div>
          </> : <ul>{view.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
          <dl className="space-y-1">
            {identity.map(([label, value]) => <div key={label}>
              <dt className="inline font-medium">{label}: </dt>
              <dd className="inline break-all">{value}</dd>
            </div>)}
          </dl>
          {view.rawConditions !== null && <div>Raw conditions (unvalidated): {view.rawConditions}</div>}
          <p className="text-[10px] text-[var(--on-surface-muted)]">Historical analytical record. Recorded identity does not establish point-in-time availability.</p>
        </div>
      </details>
    </div>
  );
}
