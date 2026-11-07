import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import native from '../../../tests/fixtures/signal-score-native.json';
import { ScoreExplanation } from './ScoreExplanation';

describe('ScoreExplanation visible contract', () => {
  it('renders the native count, zero bonus and separate composite with historical provenance', () => {
    const html = renderToStaticMarkup(<ScoreExplanation row={native.cases[0]} />);
    expect(html).toContain('Base conditions: 6/7');
    expect(html).toContain('Bonus total: 0');
    expect(html).toContain('Composite strength: 6/7');
    expect(html).toContain('historical_signals');
    expect(html).toContain('momentum');
    expect(html).toContain('historical-momentum-v1');
    expect(html).toContain('cloud_sql');
    expect(html).toContain('Event time');
    expect(html).toContain('Generated at');
    expect(html).toContain('Inserted at');
    expect(html).toContain(native.cases[0].score_explanation.provenance.input_sha256);
    expect(html).not.toContain('text-[var(--bull)]');
    expect(html).not.toContain('Live signals');
  });

  it('labels the raw legacy fraction as unvalidated evidence and discloses absent identity', () => {
    const html = renderToStaticMarkup(<ScoreExplanation row={{ score: 6, conditions_met: '6/5' }} />);
    expect(html).toContain('Stored strength: ');
    expect(html).toContain('Breakdown unavailable');
    expect(html).toContain('Raw conditions (unvalidated)');
    expect(html).toContain('6/5');
    expect(html).not.toContain('Base conditions: 6/5');
    expect(html).toContain('Input identity');
    expect(html).toContain('Unavailable');
    expect(html).toContain('does not establish point-in-time availability');
  });

  it('renders null strength as unavailable and zero as stored zero', () => {
    const missing = renderToStaticMarkup(<ScoreExplanation row={{ score: null }} />);
    const zero = renderToStaticMarkup(<ScoreExplanation row={{ score: 0 }} />);
    expect(missing).toContain('data-testid="signal-strength">Unavailable</span>');
    expect(zero).toContain('data-testid="signal-strength">0</span>');
  });

  it('keeps a live run kind within the historical analytical corpus', () => {
    const row = structuredClone(native.cases[0]);
    row.run_kind = 'live';
    row.score_explanation.provenance.run_kind = 'live';
    const html = renderToStaticMarkup(<ScoreExplanation row={row} />);
    expect(html).toContain('Base conditions: 6/7');
    expect(html).toContain('Run kind: live');
    expect(html).toContain('Historical analytical record');
    expect(html).not.toContain('Live signals');
  });
});
