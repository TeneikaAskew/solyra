import { describe, expect, it } from 'vitest';
import native from '../../tests/fixtures/signal-score-native.json';
import { presentSignalScore } from './signalScore';

const momentum = native.cases[0];
const explanation = () => structuredClone(momentum.score_explanation);
const withExplanation = (value: unknown, score: unknown = 6) => ({ ...momentum, score, score_explanation: value });

describe('recorded historical score presentation', () => {
  it.each([[0, '6/7', '6/7'], [1, '7/7', '7/7'], [2, '5/5', '5/5']] as const)(
    'renders native producer case %i without a universal denominator', (index, base, composite) => {
      const view = presentSignalScore(native.cases[index]);
      expect(view.status).toBe('recorded');
      expect(view.base).toBe(base);
      expect(view.composite).toBe(composite);
      expect(view.bonuses).toEqual([]);
      expect(view.bonusTotal).toBe('0');
      expect(view.provenance.corpus).toBe('historical_signals');
      expect(view.provenance.strategy).toBe(native.cases[index].strategy);
    },
  );

  it('presents recorded bonus fields without inventing a composite maximum', () => {
    const e = explanation();
    Object.assign(e, { kind: 'base_plus_bonus', bonuses: [{ name: 'recorded transport control', value: 2 }], bonus_total: 2, composite_strength: 8, composite_max: null });
    e.provenance.producer_definition = 'transport-fixture-only';
    const view = presentSignalScore(withExplanation(e, 8));
    expect(view.status).toBe('recorded');
    expect(view.base).toBe('6/7');
    expect(view.bonuses).toEqual([{ name: 'recorded transport control', value: 2 }]);
    expect(view.composite).toBe('8');
  });

  it('keeps legacy stored strength separate from its unvalidated raw fraction', () => {
    const view = presentSignalScore({ score: 6, conditions_met: '6/5', strategy: 'momentum' });
    expect(view.status).toBe('unavailable');
    expect(view.strength).toBe('6');
    expect(view.rawConditions).toBe('6/5');
    expect(view.base).toBeNull();
    expect(view.composite).toBeNull();
    expect(view.reasons).toContain('Score explanation missing');
  });

  it.each([null, undefined, NaN, Infinity, '6', false])('does not turn missing or invalid strength %s into zero', score => {
    expect(presentSignalScore({ score }).strength).toBe('Unavailable');
  });

  it('retains real zero, including a consistent recorded zero', () => {
    expect(presentSignalScore({ score: 0 }).strength).toBe('0');
    const e = explanation();
    Object.assign(e, { base_count: 0, matched_conditions: [], composite_strength: 0 });
    const view = presentSignalScore(withExplanation(e, 0));
    expect(view.status).toBe('recorded');
    expect(view.base).toBe('0/7');
  });

  it.each([
    ['version', { version: 'historical-score-v2' }],
    ['null provenance', { provenance: null }],
    ['string provenance', { provenance: 'unknown' }],
    ['missing identity', { provenance: { ...momentum.score_explanation.provenance, input_sha256: null } }],
    ['wrong corpus', { provenance: { ...momentum.score_explanation.provenance, corpus: 'live_alerts' } }],
    ['bad time', { provenance: { ...momentum.score_explanation.provenance, generated_at: 'not a time' } }],
    ['count mismatch', { base_count: 5 }],
    ['bad maximum', { base_max: 5 }],
    ['zero composite maximum', { composite_max: 0 }],
    ['composite maximum below the base maximum', { composite_max: 6 }],
    ['duplicate conditions', { matched_conditions: Array(6).fill('above_vwap') }],
    ['total mismatch', { composite_strength: 5 }],
    ['bonus mismatch', { bonus_total: 1 }],
    ['noninteger count', { base_count: 6.5 }],
    ['missing reasons', { unavailable_reasons: null }],
  ])('refuses %s without repairing the stored score', (_name, patch) => {
    const view = presentSignalScore(withExplanation({ ...explanation(), ...patch }));
    expect(view.status).toBe('unavailable');
    expect(view.strength).toBe('6');
    expect(view.base).toBeNull();
    expect(view.reasons.length).toBeGreaterThan(0);
  });

  it.each(['legacy_unavailable', 'invalid_record'])('preserves explicit %s reasons', status => {
    const e = { ...explanation(), status, unavailable_reasons: ['legacy_score_contract_missing'] };
    const view = presentSignalScore(withExplanation(e));
    expect(view.status).toBe('unavailable');
    expect(view.reasons).toContain('legacy_score_contract_missing');
  });

  it('rejects a conflicting row direction or strategy', () => {
    expect(presentSignalScore({ ...momentum, direction: 'PUT' }).status).toBe('unavailable');
    expect(presentSignalScore({ ...momentum, strategy: 'mean_reversion' }).status).toBe('unavailable');
  });

  it('shows missing provenance explicitly and keeps event/generation/insertion distinct', () => {
    const view = presentSignalScore(momentum);
    expect(view.eventTime).toBe(momentum.time);
    expect(view.provenance.generated_at).toBe(momentum.score_explanation.provenance.generated_at);
    expect(view.provenance.inserted_at).toBe('2026-10-30T05:00:00+00:00');
    expect(presentSignalScore({ score: null }).provenance.input_sha256).toBe('Unavailable');
  });

  it('retains available insertion time on a legacy row without inventing generation time', () => {
    const view = presentSignalScore({ score: 6, inserted_at: '2026-10-30T05:00:00+00:00' });
    expect(view.provenance.inserted_at).toBe('2026-10-30T05:00:00+00:00');
    expect(view.provenance.generated_at).toBe('Unavailable');
  });
});
