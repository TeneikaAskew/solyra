import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAuthBlocked,
  markAuthBlocked,
  clearAuthBlocked,
  subscribeAuthGate,
} from './authGate';

describe('authGate', () => {
  beforeEach(() => clearAuthBlocked());

  it('starts unblocked', () => {
    expect(isAuthBlocked()).toBe(false);
  });

  it('marks blocked and notifies subscribers', () => {
    let seen = 0;
    const unsub = subscribeAuthGate(() => { seen += 1; });
    markAuthBlocked();
    expect(isAuthBlocked()).toBe(true);
    expect(seen).toBe(1);
    unsub();
  });

  it('clearAuthBlocked resets the flag and notifies', () => {
    markAuthBlocked();
    let seen = 0;
    const unsub = subscribeAuthGate(() => { seen += 1; });
    clearAuthBlocked();
    expect(isAuthBlocked()).toBe(false);
    expect(seen).toBe(1);
    unsub();
  });

  it('markAuthBlocked is idempotent (no repeat notifications)', () => {
    let seen = 0;
    const unsub = subscribeAuthGate(() => { seen += 1; });
    markAuthBlocked();
    markAuthBlocked();
    markAuthBlocked();
    expect(seen).toBe(1);
    unsub();
  });
});
