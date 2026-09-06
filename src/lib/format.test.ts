/**
 * Pins the Rule-4 contract of the canonical formatters: a missing financial
 * value renders as the em-dash placeholder, never as a fabricated number.
 * CLAUDE.md names this file as the reference implementation of the one
 * allowed presentation-boundary fallback, so the null paths are asserted
 * per-formatter here — mirroring risk.test.ts and MovementRead.test.tsx,
 * which already fence their own canonical helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  NA,
  fmtCompact,
  fmtGex,
  fmtMoney,
  fmtNum,
  fmtPct,
  fmtPrice,
  fmtRatioPct,
  fmtSigned,
  toneOf,
  responseErrorMessage,
} from './format';

const MISSING = [null, undefined, NaN, Infinity, -Infinity] as const;

describe('Rule 4 — every formatter renders missing input as the em-dash, never a value', () => {
  it.each([
    ['fmtMoney', fmtMoney],
    ['fmtPrice', fmtPrice],
    ['fmtSigned', fmtSigned],
    ['fmtPct', fmtPct],
    ['fmtRatioPct', fmtRatioPct],
    ['fmtGex', fmtGex],
    ['fmtCompact', fmtCompact],
    ['fmtNum', fmtNum],
  ])('%s(missing) → —', (_name, fn) => {
    for (const v of MISSING) {
      expect(fn(v as number | null | undefined)).toBe(NA);
    }
  });

  it('never renders a missing value as a zero-shaped string', () => {
    for (const v of [null, undefined, NaN]) {
      expect(fmtMoney(v)).not.toBe('$0.00');
      expect(fmtPct(v)).not.toBe('+0.00%');
      expect(fmtNum(v)).not.toBe('0.00');
    }
  });

  it('toneOf treats missing as neutral, not bearish', () => {
    for (const v of MISSING) {
      expect(toneOf(v as number | null | undefined)).toBe('neutral');
    }
    expect(toneOf(0)).toBe('neutral');
  });
});

describe('fmtMoney', () => {
  it('scales through K/M/B with sign preserved', () => {
    expect(fmtMoney(12.3)).toBe('$12.30');
    expect(fmtMoney(45_600)).toBe('$45.6K');
    expect(fmtMoney(7_890_000)).toBe('$7.89M');
    expect(fmtMoney(1_200_000_000)).toBe('$1.20B');
    expect(fmtMoney(-45_600)).toBe('$-45.6K');
  });

  it('a legitimate zero still renders as money — only MISSING maps to the dash', () => {
    expect(fmtMoney(0)).toBe('$0.00');
  });
});

describe('fmtPrice / fmtNum', () => {
  it('respects the digits parameter', () => {
    expect(fmtPrice(123.456)).toBe('$123.46');
    expect(fmtPrice(123.456, 1)).toBe('$123.5');
    expect(fmtNum(0.12345, 4)).toBe('0.1235');
  });
});

describe('fmtSigned', () => {
  it('signs both directions with thousands separators', () => {
    expect(fmtSigned(1234)).toBe('+1,234');
    expect(fmtSigned(-56)).toBe('-56');
    expect(fmtSigned(0)).toBe('+0');
  });
});

describe('fmtPct / fmtRatioPct', () => {
  it('fmtPct takes percent units; fmtRatioPct takes a ratio', () => {
    expect(fmtPct(0.37)).toBe('+0.37%');
    expect(fmtPct(-2.05)).toBe('-2.05%');
    expect(fmtRatioPct(0.0037)).toBe('+0.37%');
    expect(fmtRatioPct(-0.0205)).toBe('-2.05%');
  });
});

describe('fmtGex', () => {
  it('scales with the Bn suffix and keeps the sign outside the dollar', () => {
    expect(fmtGex(2_340_000_000)).toBe('$2.34Bn');
    expect(fmtGex(-2_340_000_000)).toBe('-$2.34Bn');
    expect(fmtGex(5_600_000)).toBe('$5.6M');
    expect(fmtGex(-780_000)).toBe('-$780K');
    expect(fmtGex(42)).toBe('$42');
  });
});

describe('fmtCompact', () => {
  it('scales counts unsigned-style through K/M/B', () => {
    expect(fmtCompact(1_234)).toBe('1.2K');
    expect(fmtCompact(34_500_000)).toBe('34.5M');
    expect(fmtCompact(999)).toBe('999');
  });
});

describe('toneOf', () => {
  it('maps sign to tone', () => {
    expect(toneOf(0.01)).toBe('bull');
    expect(toneOf(-0.01)).toBe('bear');
  });
});

describe('responseErrorMessage', () => {
  const mk = (status: number, body: string, contentType = 'application/json') =>
    new Response(body, { status, headers: { 'content-type': contentType } });

  it('surfaces the FastAPI {detail} string so a stale-data 503 says why', async () => {
    const detail = 'playbook_cards for IWM is stale: latest analysis_date 2026-06-13 is 85 days old';
    expect(await responseErrorMessage(mk(503, JSON.stringify({ detail })))).toBe(detail);
  });

  it('falls back to the bare status for non-string detail or non-JSON bodies', async () => {
    expect(await responseErrorMessage(mk(422, JSON.stringify({ detail: [{ loc: ['q'] }] })))).toBe('422');
    expect(await responseErrorMessage(mk(502, '<html>bad gateway</html>', 'text/html'))).toBe('502');
    expect(await responseErrorMessage(mk(500, ''))).toBe('500');
  });
});
