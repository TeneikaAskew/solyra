import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ refreshEmailVerified: vi.fn() }));

import { dataGateView } from './SignInEmptyState';

describe('dataGateView', () => {
  const base = { blocked: false, isLoading: false, isSignedIn: true, verificationRequired: false };

  it('asks a signed-in account to confirm its email while the API answers the verify-email 403', () => {
    expect(dataGateView({ ...base, verificationRequired: true })).toBe('verify');
  });
  it('never asks for the email while the session is blocked: an expired session is not a verification problem', () => {
    expect(dataGateView({ ...base, verificationRequired: true, blocked: true })).toBe('children');
    expect(dataGateView({ ...base, verificationRequired: true, blocked: true, isSignedIn: false })).toBe('sign-in');
  });
  it('keeps the signed-out state and otherwise renders the page', () => {
    expect(dataGateView({ ...base, blocked: true, isSignedIn: false })).toBe('sign-in');
    expect(dataGateView({ ...base, blocked: true, isSignedIn: false, isLoading: true })).toBe('children');
    expect(dataGateView(base)).toBe('children');
  });
});
