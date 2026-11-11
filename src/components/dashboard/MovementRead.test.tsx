// @vitest-environment jsdom
/// <reference types="node" />
// Vitest unit tests for the Movement Read card (PHASE 3).
//
// Tested as pure logic (the platform's established frontend test style —
// no DOM rendering, no @testing-library/react). The card RENDERS ONLY and
// recomputes nothing, so the load-bearing logic is the small set of
// presentational helpers that decide OK vs. UNAVAILABLE and format the
// reach-rate / low-sample / probability strings. Those helpers encode the
// Rule 3.7 contract: a null / UNAVAILABLE field becomes "—" (em-dash),
// never a fabricated number.

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  isOk,
  fmtProbPct,
  fmtReachRate,
  isLowSample,
} from './MovementRead';
import type { ReachRate } from '@/types';

const EM_DASH = '—';

function rr(overrides: Partial<ReachRate> = {}): ReachRate {
  return {
    status: 'OK',
    reach_rate: 0.48,
    hits: 24,
    sample_n: 50,
    low_sample: false,
    ...overrides,
  };
}

// ── isOk ───────────────────────────────────────────────────────────────────

describe('isOk', () => {
  it('is true only for status "OK"', () => {
    expect(isOk({ status: 'OK' })).toBe(true);
  });
  it('is false for UNAVAILABLE / unexpected / null', () => {
    expect(isOk({ status: 'UNAVAILABLE' })).toBe(false);
    expect(isOk({ status: 'REJECTED' })).toBe(false);
    expect(isOk(null)).toBe(false);
    expect(isOk(undefined)).toBe(false);
  });
});

// ── fmtProbPct — null must NOT coerce to 0% (Rule 3.7) ──────────────────────

describe('fmtProbPct', () => {
  it('formats a 0..1 probability as a whole percent', () => {
    expect(fmtProbPct(0.62)).toBe('62%');
    expect(fmtProbPct(0.5)).toBe('50%');
  });
  it('renders an em-dash for null / undefined / NaN — never 0%', () => {
    expect(fmtProbPct(null)).toBe(EM_DASH);
    expect(fmtProbPct(undefined)).toBe(EM_DASH);
    expect(fmtProbPct(NaN)).toBe(EM_DASH);
  });
});

// ── fmtReachRate — OK shows "% (n=…)"; UNAVAILABLE shows "—" ─────────────────

describe('fmtReachRate', () => {
  it('formats an OK reach-rate with its sample size', () => {
    expect(fmtReachRate(rr())).toBe('48% (n=50)');
  });
  it('renders an em-dash when UNAVAILABLE (never a fabricated rate)', () => {
    expect(fmtReachRate(rr({ status: 'UNAVAILABLE', reach_rate: null }))).toBe(EM_DASH);
  });
  it('renders an em-dash when the rate is null even if status looks OK', () => {
    expect(fmtReachRate(rr({ reach_rate: null }))).toBe(EM_DASH);
  });
  it('renders an em-dash for null/undefined input', () => {
    expect(fmtReachRate(null)).toBe(EM_DASH);
    expect(fmtReachRate(undefined)).toBe(EM_DASH);
  });
});

// ── isLowSample — only flags when OK AND low_sample === true ─────────────────

describe('isLowSample', () => {
  it('is true when OK and low_sample flagged', () => {
    expect(isLowSample(rr({ sample_n: 12, low_sample: true }))).toBe(true);
  });
  it('is false when low_sample is false', () => {
    expect(isLowSample(rr({ low_sample: false }))).toBe(false);
  });
  it('is false when the reach-rate is UNAVAILABLE', () => {
    expect(isLowSample(rr({ status: 'UNAVAILABLE', low_sample: true }))).toBe(false);
  });
  it('is false for null', () => {
    expect(isLowSample(null)).toBe(false);
  });
});

// ── Language audit (source-level static check) ──────────────────────────────
//
// The card is a STRUCTURE read, not a directional or P&L edge. Its source
// MUST NOT contain words that would imply a trade recommendation. Mirrors
// the StructureBrief language audit.

describe('Language audit (source-level)', () => {
  const SINGLE_WORD_DISALLOWED = ['buy', 'sell'];
  const PHRASE_DISALLOWED = [
    'trade signal',
    'trade this',
    'directional edge',
    'buy at',
    'sell at',
  ];

  const path = resolve(__dirname, 'MovementRead.tsx');
  const source = readFileSync(path, 'utf8').toLowerCase();

  it('contains no single-word disallowed term (word-boundary)', () => {
    for (const word of SINGLE_WORD_DISALLOWED) {
      const re = new RegExp(`\\b${word}\\b`, 'i');
      const match = source.match(re);
      expect(match, `disallowed word "${word}" appears: "${match?.[0]}"`).toBeNull();
    }
  });

  it('contains no disallowed multi-word phrase', () => {
    for (const phrase of PHRASE_DISALLOWED) {
      expect(source, `phrase "${phrase}" appears`).not.toContain(phrase);
    }
  });
});

// ── Review-mode mount guard (point-in-time leak prevention) ─────────────────
//
// The Movement Read is a LIVE "current read": its hook calls
// /api/movement-statement with ticker/timeframe only (no as_of). In
// REVIEW/historical mode (reviewDate set) the surrounding cards are keyed to
// the selected as-of date, so mounting this live card next to historical data
// would show TODAY's continuation/levels alongside a historical dashboard —
// point-in-time contamination. DashboardPage MUST therefore only mount
// <MovementRead> in live (non-review) mode. The platform's frontend test style
// avoids DOM rendering (no @testing-library/react / jsdom in devDeps), so this
// is verified as a source-level invariant: every <MovementRead mount must be
// guarded by the review-mode flag, and no UNGUARDED mount may exist.

describe('Review-mode mount guard (DashboardPage source)', () => {
  const dashSource = readFileSync(
    resolve(__dirname, '../../routes/DashboardPage.tsx'),
    'utf8',
  );

  it('mounts <MovementRead> guarded by the review-mode flag', () => {
    // The card must be gated by `!isReview` (or `reviewDate === null`) so it is
    // hidden in historical review. Match the JSX guard directly preceding the
    // mount, tolerating whitespace/newlines between the guard and the element.
    const guarded =
      /\{\s*!isReview\s*&&\s*<MovementRead/.test(dashSource) ||
      /reviewDate\s*===\s*null\s*&&\s*<MovementRead/.test(dashSource);
    expect(
      guarded,
      '<MovementRead> must be mounted behind a review-mode guard (e.g. {!isReview && <MovementRead .../>})',
    ).toBe(true);
  });

  it('contains no UNGUARDED <MovementRead mount', () => {
    // An unguarded mount is one preceded immediately by `>` / `}` / newline
    // (i.e. rendered unconditionally). The only legal occurrence is the guarded
    // one asserted above, so the count of guarded mounts must equal the total
    // count of mounts.
    const totalMounts = (dashSource.match(/<MovementRead\b/g) || []).length;
    const guardedMounts = (
      dashSource.match(/(?:!isReview|reviewDate\s*===\s*null)\s*&&\s*<MovementRead\b/g) || []
    ).length;
    expect(totalMounts, 'expected exactly one <MovementRead> mount').toBe(1);
    expect(
      guardedMounts,
      'every <MovementRead> mount must be review-mode-guarded',
    ).toBe(totalMounts);
  });
});

// FEAT-AUTH-001 account transitions, done_when item 5 (MovementRead) and
// item 19 (unit side): the sizing inputs are kept per account.
describe('SizeCalculator account-scoped inputs', () => {
  const EM = {
    status: 'OK', role: 'context', size_class: 'EXPLOSIVE', pred_bucket: 3,
    probabilities: { p_tight: 0.35, p_normal: 0.2, p_expanded: 0.25, p_explosive: 0.2 },
    max_proba: 0.35, model_version: 'm', ts: '2026-07-10T19:45:00+00:00', atr_20: 1.85,
    current_price: 218.4, usage_guidance: 'context only',
  };

  async function render(uid: string | null) {
    vi.resetModules();
    const gate = await import('@/lib/authGate');
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount(uid);
    const { SizeCalculator } = await import('./MovementRead');
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const el = document.createElement('div');
    document.body.append(el);
    const root = createRoot(el);
    await act(async () => root.render(createElement(SizeCalculator, { em: EM as never })));
    const input = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLInputElement;
    const type = async (id: string, value: string) => {
      const node = input(id);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, value);
      await act(async () => { node.dispatchEvent(new Event('input', { bubbles: true })); });
    };
    const done = async () => { await act(async () => root.unmount()); el.remove(); };
    return { input, type, done };
  }

  it("shows the current account's own em.account and em.riskPct, never another account's or the legacy values", async () => {
    localStorage.clear();
    localStorage.setItem('em.account', '88888');
    localStorage.setItem('em.riskPct', '4.5');
    localStorage.setItem('em.account@uid:uid-a', '73137');
    localStorage.setItem('em.riskPct@uid:uid-a', '3.5');
    const a = await render('uid-a');
    expect([a.input('calc-account').value, a.input('calc-risk').value]).toEqual(['73137', '3.5']);
    await a.done();
    const b = await render('uid-b');
    expect([b.input('calc-account').value, b.input('calc-risk').value]).toEqual(['', '1']);
    await b.done();
  });

  it('writes its changes only under the current account', async () => {
    localStorage.clear();
    localStorage.setItem('em.account', '88888');
    localStorage.setItem('em.account@uid:uid-a', '73137');
    const b = await render('uid-b');
    await b.type('calc-account', '25000');
    await b.type('calc-risk', '1.5');
    expect(b.input('calc-account').value).toBe('25000');
    await b.done();
    expect(localStorage.getItem('em.account@uid:uid-b')).toBe('25000');
    expect(localStorage.getItem('em.riskPct@uid:uid-b')).toBe('1.5');
    expect(localStorage.getItem('em.account@uid:uid-a')).toBe('73137');
    expect(localStorage.getItem('em.account')).toBe('88888');
    expect(localStorage.getItem('em.riskPct')).toBeNull();
  });

  // IMPL-314-1 R-2: input on A's calculator after this page reported B, before
  // React rendered B, is refused: nothing is written under B, A's keys stay.
  it("refuses input on the previous account's calculator once this page reports another", async () => {
    localStorage.clear();
    localStorage.setItem('em.account@uid:uid-a', '73137');
    const a = await render('uid-a');
    const gate = await import('@/lib/authGate');
    gate.noteRenderedAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    await a.type('calc-account', '25000');
    await a.type('calc-risk', '1.5');
    expect([a.input('calc-account').value, a.input('calc-risk').value]).toEqual(['73137', '1']);
    expect(localStorage.getItem('em.account@uid:uid-b')).toBeNull();
    expect(localStorage.getItem('em.riskPct@uid:uid-b')).toBeNull();
    expect(localStorage.getItem('em.account@uid:uid-a')).toBe('73137');
    expect(gate.isRefusedWriteNoticeShown()).toBe(true);
    await a.done();
  });
});
