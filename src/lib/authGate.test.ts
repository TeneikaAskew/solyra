import { describe, it, expect } from 'vitest';
import {
  getVerificationEmailState,
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
