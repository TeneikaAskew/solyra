import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import {
  clearVerificationRequired,
  getVerificationEmailState,
  isVerificationRequired,
  markVerificationRequired,
  recordVerificationEmail,
  subscribeVerificationEmail,
} from './authGate';

describe('verification-email delivery state', () => {
  it('starts unknown so nothing claims a send that never happened', () => {
    expect(getVerificationEmailState('uid-a')).toEqual({ status: 'unknown' });
    expect(getVerificationEmailState(null)).toEqual({ status: 'unknown' });
  });

  it('records an outcome for one account and notifies subscribers', () => {
    let notified = 0;
    const unsub = subscribeVerificationEmail(() => {
      notified += 1;
    });
    recordVerificationEmail('uid-a', { status: 'failed', message: 'auth/network-request-failed' });
    expect(getVerificationEmailState('uid-a')).toEqual({ status: 'failed', message: 'auth/network-request-failed' });
    expect(notified).toBe(1);

    recordVerificationEmail('uid-a', { status: 'sent' });
    expect(getVerificationEmailState('uid-a')).toEqual({ status: 'sent' });
    expect(notified).toBe(2);

    unsub();
    recordVerificationEmail('uid-a', { status: 'unknown' });
    expect(notified).toBe(2);
  });

  it('reports the in-flight sign-up send so a resend cannot start concurrently', () => {
    recordVerificationEmail('uid-s', { status: 'sending' });
    expect(getVerificationEmailState('uid-s')).toEqual({ status: 'sending' });
    recordVerificationEmail('uid-s', { status: 'sent' });
    expect(getVerificationEmailState('uid-s')).toEqual({ status: 'sent' });
  });

  it('never leaks one account\'s outcome to another or to a signed-out reader', () => {
    recordVerificationEmail('uid-a', { status: 'sent' });
    // Account B signs in in the same tab (or another tab) without a reload.
    expect(getVerificationEmailState('uid-b')).toEqual({ status: 'unknown' });
    expect(getVerificationEmailState(null)).toEqual({ status: 'unknown' });
    // B's own send is recorded for B only.
    recordVerificationEmail('uid-b', { status: 'failed', message: 'auth/too-many-requests' });
    expect(getVerificationEmailState('uid-b')).toEqual({ status: 'failed', message: 'auth/too-many-requests' });
    expect(getVerificationEmailState('uid-a')).toEqual({ status: 'unknown' });
  });
});

describe('verification-required flag', () => {
  it('is keyed by uid, so a switched-in account does not inherit it', () => {
    clearVerificationRequired();
    markVerificationRequired('uid-a');
    expect(isVerificationRequired('uid-a')).toBe(true);
    expect(isVerificationRequired('uid-b')).toBe(false);
    expect(isVerificationRequired(null)).toBe(false);
    clearVerificationRequired();
    expect(isVerificationRequired('uid-a')).toBe(false);
  });

  it('clears only the account it is asked to clear', () => {
    markVerificationRequired('uid-a');
    clearVerificationRequired('uid-b');
    expect(isVerificationRequired('uid-a')).toBe(true);
    clearVerificationRequired('uid-a');
    expect(isVerificationRequired('uid-a')).toBe(false);
  });
});

describe('email-confirmed record', () => {
  it('is keyed by uid, so a confirmation by account A says nothing about account B', async () => {
    const gate = await import('./authGate');
    gate.markEmailConfirmed('uid-a');
    expect(gate.isEmailConfirmed('uid-a')).toBe(true);
    expect(gate.isEmailConfirmed('uid-b')).toBe(false);
    expect(gate.isEmailConfirmed(null)).toBe(false);
  });
});

// FEAT-AUTH-001 account transitions, done_when item 1: the account record.
describe('account record', () => {
  async function fresh() {
    vi.resetModules();
    return import('./authGate');
  }

  it('reports no change for the first report after load, whether signed in or signed out', async () => {
    for (const first of ['uid-a', null]) {
      const gate = await fresh();
      const seen: (string | null)[] = [];
      gate.onAccountChange((next) => seen.push(next));
      gate.noteSignedInAccount(first);
      expect(seen).toEqual([]);
      expect(gate.getSignedInAccount()).toBe(first);
    }
  });

  it('reports no change for a repeated report of the same uid', async () => {
    const gate = await fresh();
    const seen: (string | null)[] = [];
    gate.onAccountChange((next) => seen.push(next));
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount(null);
    gate.noteSignedInAccount(null);
    expect(seen).toEqual([null]);
  });

  it('reports A to signed-out, signed-out to B, and A to B', async () => {
    const gate = await fresh();
    const seen: (string | null)[] = [];
    gate.onAccountChange((next) => seen.push(next));
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount(null);
    gate.noteSignedInAccount('uid-b');
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    expect(seen).toEqual([null, 'uid-b', 'uid-a', 'uid-b']);
    expect(gate.getSignedInAccount()).toBe('uid-b');
  });

  it('clears the auth-blocked flag on a change, before the listeners run, and keeps it for a repeat', async () => {
    const gate = await fresh();
    gate.noteSignedInAccount('uid-a');
    gate.markAuthBlocked();
    gate.noteSignedInAccount('uid-a');
    expect(gate.isAuthBlocked()).toBe(true);
    let blockedSeenByListener: boolean | null = null;
    gate.onAccountChange(() => { blockedSeenByListener = gate.isAuthBlocked(); });
    gate.noteSignedInAccount('uid-b');
    expect(gate.isAuthBlocked()).toBe(false);
    expect(blockedSeenByListener).toBe(false);
  });

  it('stops notifying a listener once it unsubscribes', async () => {
    const gate = await fresh();
    const seen: (string | null)[] = [];
    const off = gate.onAccountChange((next) => seen.push(next));
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    off();
    gate.noteSignedInAccount('uid-a');
    expect(seen).toEqual(['uid-b']);
  });
});

// done_when item 21: authGate.ts stays safe to import from the entry chunk.
describe('authGate imports', () => {
  it('imports @tanstack/react-query for types only and nothing from src/stores', () => {
    const src = readFileSync(fileURLToPath(new URL('./authGate.ts', import.meta.url)), 'utf8');
    const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l) || /^\s*export\s.*\bfrom\s/.test(l));
    for (const line of imports.filter((l) => l.includes('@tanstack/react-query'))) {
      expect(line).toMatch(/^\s*import\s+type\b/);
    }
    expect(imports.filter((l) => /['"](@\/stores|\.\.\/stores|src\/stores)/.test(l))).toEqual([]);
  });
});
