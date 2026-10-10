import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  firebaseSignOut: vi.fn(),
  refreshEmailVerified: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

import { confirmEmailVerified, showVerificationBanner } from './AuthStatusIndicator';
import { clearVerificationRequired, isVerificationRequired, markVerificationRequired } from '@/lib/authGate';

afterEach(() => clearVerificationRequired());

describe('confirmEmailVerified', () => {
  it('clears the verification flag and refetches every query once the account reads verified', async () => {
    markVerificationRequired('uid-a');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };

    const verified = await confirmEmailVerified('uid-a', async () => true, queryClient);

    expect(verified).toBe(true);
    expect(isVerificationRequired('uid-a')).toBe(false);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('changes nothing while the account still reads unverified', async () => {
    markVerificationRequired('uid-a');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };

    const verified = await confirmEmailVerified('uid-a', async () => false, queryClient);

    expect(verified).toBe(false);
    expect(isVerificationRequired('uid-a')).toBe(true);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it("leaves account B's flag in place when A's confirmation returns after the switch", async () => {
    markVerificationRequired('uid-a');
    const queryClient = { invalidateQueries: vi.fn(async () => {}) };
    let reportVerified: (verified: boolean) => void = () => {};
    const refresh = () => new Promise<boolean>((resolve) => { reportVerified = resolve; });

    const confirming = confirmEmailVerified('uid-a', refresh, queryClient);
    markVerificationRequired('uid-b');
    reportVerified(true);
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
