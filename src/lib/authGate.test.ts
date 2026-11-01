// @vitest-environment jsdom
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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
    const src = readFileSync(join(process.cwd(), 'src', 'lib', 'authGate.ts'), 'utf8');
    const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l) || /^\s*export\s.*\bfrom\s/.test(l));
    for (const line of imports.filter((l) => l.includes('@tanstack/react-query'))) {
      expect(line).toMatch(/^\s*import\s+type\b/);
    }
    expect(imports.filter((l) => /['"](@\/stores|\.\.\/stores|src\/stores)/.test(l))).toEqual([]);
  });
});

// done_when items 2, 3 and 4 (shared half): account-scoped storage.
describe('account-scoped storage', () => {
  async function fresh() {
    vi.resetModules();
    localStorage.clear();
    return import('./authGate');
  }
  const snapshot = () => Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]));

  it('per-owner: a write while uid A is the account goes to <key>@uid:uid-a and changes no other key', async () => {
    const gate = await fresh();
    localStorage.setItem('platform-theme', 'light');
    localStorage.setItem('platform-theme@uid:uid-b', 'dark');
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    const before = snapshot();
    gate.writeScoped('platform-theme', 'dark');
    expect(snapshot()).toEqual({ ...before, 'platform-theme@uid:uid-a': 'dark' });
  });

  it("per-owner: a read while uid B is the account returns B's own value or nothing, never A's, another owner's or the un-namespaced value", async () => {
    const gate = await fresh();
    localStorage.setItem('platform-theme', 'light');
    localStorage.setItem('platform-theme@uid:uid-a', 'light');
    localStorage.setItem('platform-theme@uid:uid-c', 'light');
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-b');
    expect(gate.readScoped('platform-theme')).toBeNull();
    localStorage.setItem('platform-theme@uid:uid-b', 'dark');
    expect(gate.readScoped('platform-theme')).toBe('dark');
  });

  it('pending: nothing account-scoped is read or written', async () => {
    const gate = await fresh();
    localStorage.setItem('platform-theme', 'light');
    localStorage.setItem('platform-theme@uid:uid-a', 'light');
    gate.markStoragePending();
    gate.noteSignedInAccount('uid-a');
    const before = snapshot();
    expect(gate.readScoped('platform-theme')).toBeNull();
    gate.writeScoped('platform-theme', 'dark');
    expect(snapshot()).toEqual(before);
  });

  it('per-owner with no account (before the first report, or signed out): a write stores nothing', async () => {
    const gate = await fresh();
    gate.settleStorageMode('perOwner');
    gate.writeScoped('em.account', '1000');
    expect(snapshot()).toEqual({});
    gate.noteSignedInAccount(null);
    gate.writeScoped('em.account', '1000');
    expect(gate.readScoped('em.account')).toBeNull();
    expect(snapshot()).toEqual({});
  });

  it('with localStorage unavailable, reads return nothing and writes are dropped without an error', async () => {
    const gate = await fresh();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    try {
      expect(gate.readScoped('platform-theme')).toBeNull();
      expect(() => gate.writeScoped('platform-theme', 'dark')).not.toThrow();
      gate.settleStorageMode('shared');
      expect(gate.readScoped('platform-theme')).toBeNull();
      expect(() => gate.writeScoped('platform-theme', 'dark')).not.toThrow();
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('A, signed out, B, A again: every key present at any step is unchanged at the end except the keys the current owner wrote', async () => {
    const gate = await fresh();
    const legacy = {
      'platform-theme': 'light',
      'platform-shell-settings': JSON.stringify({ navPattern: 'sidebar', density: 'comfy', accent: 'violet' }),
      'em.account': '88888',
      'em.riskPct': '4.5',
      'ticker-store': JSON.stringify({ state: { activeTicker: 'IWM', recentTickers: ['NVDA'] }, version: 0 }),
    };
    for (const [k, v] of Object.entries(legacy)) localStorage.setItem(k, v);
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    const seen: Record<string, string | null>[] = [snapshot()];
    gate.noteSignedInAccount('uid-a');
    gate.writeScoped('platform-theme', 'light');
    gate.writeScoped('em.account', '1000');
    seen.push(snapshot());
    gate.noteSignedInAccount(null);
    gate.writeScoped('platform-theme', 'dark');
    seen.push(snapshot());
    gate.noteSignedInAccount('uid-b');
    gate.writeScoped('platform-theme', 'dark');
    gate.writeScoped('em.account', '2000');
    seen.push(snapshot());
    gate.noteSignedInAccount('uid-a');
    gate.writeScoped('em.account', '1500');
    const end = snapshot();
    const writtenByCurrentOwner = new Set(['em.account@uid:uid-a']);
    for (const step of seen) {
      for (const [k, v] of Object.entries(step)) {
        if (writtenByCurrentOwner.has(k)) continue;
        expect(end[k], k).toBe(v);
      }
    }
    expect(end['em.account@uid:uid-a']).toBe('1500');
    for (const [k, v] of Object.entries(legacy)) expect(end[k]).toBe(v);
  });

  it('shared mode, or no ConfigGate at all: reads and writes use the un-namespaced key exactly as on main', async () => {
    const gate = await fresh();
    // No ConfigGate has marked storage pending: shared, as on main.
    expect(gate.getStorageMode()).toBe('shared');
    localStorage.setItem('platform-theme', 'light');
    expect(gate.readScoped('platform-theme')).toBe('light');
    gate.writeScoped('em.account', '1000');
    expect(localStorage.getItem('em.account')).toBe('1000');
    // A boot that settles without initFirebase: shared, whatever is reported.
    const g2 = await fresh();
    g2.markStoragePending();
    g2.settleStorageMode('shared');
    g2.noteSignedInAccount('uid-a');
    g2.writeScoped('platform-theme', 'dark');
    expect(snapshot()).toEqual({ 'platform-theme': 'dark' });
  });

  it('notifies storage listeners when the mode settles, at the first report, and at each account change', async () => {
    const gate = await fresh();
    const events: string[] = [];
    gate.onStorageChange(() => events.push(`${gate.getStorageMode()}:${gate.getSignedInAccount()}`));
    gate.markStoragePending();
    gate.settleStorageMode('perOwner');
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-a');
    gate.noteSignedInAccount('uid-b');
    expect(events).toEqual(['pending:null', 'perOwner:null', 'perOwner:uid-a', 'perOwner:uid-b']);
  });
});

// done_when item 3, second half: nothing removes stored values.
describe('no deletion of stored values', () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return sources(p);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
    });
  }
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

  it('no file under src/ other than previewAuthStorage.ts removes a localStorage key, clears it, or clears a zustand persist store', () => {
    const root = join(process.cwd(), 'src') + '/';
    const allowed = join(root, 'integrations', 'supabase', 'previewAuthStorage.ts');
    const offenders: string[] = [];
    for (const file of sources(root)) {
      if (file === allowed) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      if (/localStorage\s*\.\s*(removeItem|clear)\s*\(|\bclearStorage\s*\(|\bdelete\s+(window\.)?localStorage\b/.test(code)) {
        offenders.push(file.slice(root.length));
      }
    }
    expect(offenders).toEqual([]);
  });
});
