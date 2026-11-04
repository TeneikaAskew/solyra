import { describe, it, expect } from 'vitest';
import { minutesSinceOpen } from './playbookEvaluator';
import type { Bar } from './indicators';

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
