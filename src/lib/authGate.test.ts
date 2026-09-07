import { describe, it, expect } from 'vitest';
import {
  getVerificationEmailState,
  recordVerificationEmail,
  subscribeVerificationEmail,
} from './authGate';

describe('verification-email delivery state', () => {
  it('starts unknown so nothing claims a send that never happened', () => {
    expect(getVerificationEmailState()).toEqual({ status: 'unknown' });
  });

  it('records a failure with its reason and notifies subscribers', () => {
    let notified = 0;
    const unsub = subscribeVerificationEmail(() => {
      notified += 1;
    });
    recordVerificationEmail({ status: 'failed', message: 'auth/network-request-failed' });
    expect(getVerificationEmailState()).toEqual({ status: 'failed', message: 'auth/network-request-failed' });
    expect(notified).toBe(1);

    recordVerificationEmail({ status: 'sent' });
    expect(getVerificationEmailState()).toEqual({ status: 'sent' });
    expect(notified).toBe(2);

    unsub();
    recordVerificationEmail({ status: 'unknown' });
    expect(notified).toBe(2);
  });
});
