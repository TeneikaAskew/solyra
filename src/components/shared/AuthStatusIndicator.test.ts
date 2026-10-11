import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  firebaseSignOut: vi.fn(),
  refreshEmailVerified: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

import { confirmEmailVerified, showVerificationBanner } from './AuthStatusIndicator';
import {
  clearVerificationRequired,
  isEmailConfirmed,
  isVerificationRequired,
  markVerificationRequired,
} from '@/lib/authGate';

afterEach(() => clearVerificationRequired());

describe('confirmEmailVerified', () => {
  const as = (uid: string, emailVerified: boolean) => async () => ({ uid, emailVerified });

  it('clears the verification flag and refetches every query once the account reads verified', async () => {
    markVerificationRequired('uid-a');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };

    const result = await confirmEmailVerified('uid-a', as('uid-a', true), queryClient);

    expect(result).toEqual({ outcome: 'verified' });
    expect(isVerificationRequired('uid-a')).toBe(false);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    // Recorded for every surface, so the banner hides after a card's confirm too.
    expect(isEmailConfirmed('uid-a')).toBe(true);
  });

  it('changes nothing while the account still reads unverified', async () => {
    // Its own account: the confirmed record is module state the test above set for uid-a.
    markVerificationRequired('uid-u');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };

    const result = await confirmEmailVerified('uid-u', as('uid-u', false), queryClient);

    expect(result).toEqual({ outcome: 'unverified' });
    expect(isVerificationRequired('uid-u')).toBe(true);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    expect(isEmailConfirmed('uid-u')).toBe(false);
  });

  it('reports a failed check instead of throwing, and changes nothing', async () => {
    markVerificationRequired('uid-a');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };
    const refresh = async () => {
      throw new Error('network down');
    };

    const result = await confirmEmailVerified('uid-a', refresh, queryClient);

    expect(result).toEqual({ outcome: 'failed', message: 'network down' });
    expect(isVerificationRequired('uid-a')).toBe(true);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it("does not count another account's verified result for the account that clicked", async () => {
    markVerificationRequired('uid-a');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };

    const result = await confirmEmailVerified('uid-a', as('uid-b', true), queryClient);

    expect(result).toEqual({ outcome: 'unverified' });
    expect(isVerificationRequired('uid-a')).toBe(true);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it("leaves account B's flag in place when A's confirmation returns after the switch", async () => {
    markVerificationRequired('uid-a');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };
    let report: (r: { uid: string; emailVerified: boolean }) => void = () => {};
    const refresh = () => new Promise<{ uid: string; emailVerified: boolean }>((resolve) => { report = resolve; });

    const confirming = confirmEmailVerified('uid-a', refresh, queryClient);
    markVerificationRequired('uid-b');
    report({ uid: 'uid-a', emailVerified: true });
    await confirming;

    expect(isVerificationRequired('uid-b')).toBe(true);
  });
});

describe('showVerificationBanner', () => {
  it('shows while the profile reads unverified', () => {
    expect(showVerificationBanner(false, false)).toBe(true);
    expect(showVerificationBanner(false, true)).toBe(true);
  });
  it('shows while the API still answers the verification 403, even when the profile reads verified', () => {
    expect(showVerificationBanner(true, true)).toBe(true);
  });
  it('hides for a verified profile the API accepts, and with no account', () => {
    expect(showVerificationBanner(true, false)).toBe(false);
    expect(showVerificationBanner(null, false)).toBe(false);
  });
});
