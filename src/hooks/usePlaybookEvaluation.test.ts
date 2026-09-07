import { describe, expect, it } from 'vitest';
import { playbookBatchKey } from './usePlaybookEvaluation';
import type { MarketSnapshot } from '@/lib/playbookEvaluator';

const snapshot = {
  price: 220.4,
  volumeToday: 1_000_000,
  orbHigh: 221,
  orbLow: 219.5,
  minutesSinceOpen: 45,
  indicators: { ema9: 220.1, ema20: 219.8, ema50: 218, rsi: 55, stochK: 60, atr: 1.2, vwap: 220 },
} as unknown as MarketSnapshot;

describe('playbookBatchKey', () => {
  it('changes when a refreshed card set keeps the same ids and condition counts but new text', () => {
    // Regenerated playbook: same card ids, same number of conditions per
    // card, different condition text. The old ids+counts key was identical
    // here, so the previous set's evaluations were served for the new text.
    const before = { card_1: ['RSI 40-65', 'Above VWAP'], card_2: ['Below VWAP'] };
    const after = { card_1: ['RSI 45-70', 'Above VWAP'], card_2: ['Below EMA9'] };
    expect(JSON.stringify(playbookBatchKey(before, snapshot))).not.toBe(
      JSON.stringify(playbookBatchKey(after, snapshot)),
    );
  });

  it('is stable for an identical card set and snapshot', () => {
    const batches = { card_1: ['RSI 40-65', 'Above VWAP'] };
    expect(JSON.stringify(playbookBatchKey(batches, snapshot))).toBe(
      JSON.stringify(playbookBatchKey({ ...batches }, { ...snapshot })),
    );
  });

  it('changes when the snapshot moves', () => {
    const batches = { card_1: ['RSI 40-65'] };
    const moved = { ...snapshot, price: 221.0 } as MarketSnapshot;
    expect(JSON.stringify(playbookBatchKey(batches, snapshot))).not.toBe(
      JSON.stringify(playbookBatchKey(batches, moved)),
    );
  });
});
