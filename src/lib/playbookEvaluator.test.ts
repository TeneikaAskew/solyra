import { describe, it, expect } from 'vitest';
import { buildSnapshot, minutesSinceOpen, type OpeningProjection } from './playbookEvaluator';
import type { Bar, Indicators } from './indicators';
import { liveHistoryKey } from '@/hooks/useLiveHistory';
import { playbookBatchKey } from '@/hooks/usePlaybookEvaluation';

// The regex-based condition evaluator (evalCondition / evalConditions) was
// moved to platform/api/routers/playbook.py — see the header comment in
// playbookEvaluator.ts. Only the pure client-side helpers remain here.

// ── minutesSinceOpen ──────────────────────────────────────────────────────

describe('minutesSinceOpen', () => {
  it('calculates correctly at 10:15', () => {
    const bar: Bar = { time: '2026-04-10 10:15:00', open: 200, high: 201, low: 199, close: 200.5, volume: 1000 };
    expect(minutesSinceOpen(bar)).toBe(45);
  });

  it('returns 0 at 09:30', () => {
    const bar: Bar = { time: '2026-04-10 09:30:00', open: 200, high: 201, low: 199, close: 200.5, volume: 1000 };
    expect(minutesSinceOpen(bar)).toBe(0);
  });

  it('returns null for pre-market bar', () => {
    const bar: Bar = { time: '2026-04-10 09:15:00', open: 200, high: 201, low: 199, close: 200.5, volume: 1000 };
    expect(minutesSinceOpen(bar)).toBeNull();
  });

  it('returns null for null bar', () => {
    expect(minutesSinceOpen(null)).toBeNull();
  });
});

// ── useLiveHistory cache identity (FEAT-PLAYBOOK-001 done_when[2]) ──────
// Request and refetch behavior are exercised in src/hooks/useLiveHistory.test.tsx.

describe('live history cache identity', () => {
  it('keeps the default key every non-opt-in caller already shares', () => {
    expect(liveHistoryKey('IWM')).toEqual(['live-history', 'IWM']);
    expect(liveHistoryKey('IWM', false)).toEqual(['live-history', 'IWM']);
  });

  it('gives each option and each ticker its own cache entry', () => {
    const keys = [liveHistoryKey('IWM'), liveHistoryKey('IWM', true), liveHistoryKey('SPY'), liveHistoryKey('SPY', true)];
    expect(new Set(keys.map(k => JSON.stringify(k))).size).toBe(4);
  });

  it('separates evaluation keys when the ticker or the opening projection changes', () => {
    const opening: OpeningProjection = { status: 'available', ticker: 'IWM', session: '2026-10-29', window_minutes: 30, window_start: '2026-10-29T13:30:00Z', window_end: '2026-10-29T14:00:00Z', high: 131, low: 99, comparison_price: 140, comparison_as_of: '2026-10-29T15:00:00Z', price_basis: 'as_traded_requested', source: 'alphavantage', fetched_at: '2026-10-29T15:00:00Z' };
    const bars: Bar[] = [{ time: '2026-10-29 10:59:00', open: 100, high: 101, low: 99, close: 100, volume: 10 }];
    const base = { bars, quote: { price: 100 }, avgVolume20d: 100, reference: undefined, indicators: {} as Indicators };
    const batches = { a: ['above ORB high'] };
    const now = Date.parse('2026-10-29T15:00:00Z');
    const realNow = Date.now;
    Date.now = () => now;
    try {
      const iwm = buildSnapshot({ ...base, ticker: 'IWM', opening })!;
      const spy = buildSnapshot({ ...base, ticker: 'SPY', opening: { ...opening, ticker: 'SPY' } })!;
      const iwmNoOpening = buildSnapshot({ ...base, ticker: 'IWM', opening: null })!;
      expect(iwm.orbOpening?.ticker).toBe('IWM');
      expect(iwmNoOpening.orbOpening).toBeNull();
      const keys = [iwm, spy, iwmNoOpening].map(s => JSON.stringify(playbookBatchKey(batches, s)));
      expect(new Set(keys).size).toBe(3);
    } finally {
      Date.now = realNow;
    }
  });
});
