import { describe, expect, it, vi } from 'vitest';
import { isAccountChange, reloadOnAccountChange } from './AuthGate';

describe('isAccountChange', () => {
  it('is true when the signed-in account changes away from a previous one', () => {
    expect(isAccountChange('uid-a', 'uid-b')).toBe(true);
    expect(isAccountChange('uid-a', null)).toBe(true);
  });
  it('is false for a first sign-in and for the same account', () => {
    expect(isAccountChange(null, 'uid-a')).toBe(false);
    expect(isAccountChange('uid-a', 'uid-a')).toBe(false);
    expect(isAccountChange(null, null)).toBe(false);
  });
});

describe('reloadOnAccountChange', () => {
  it('reloads the page when the signed-in account changes away from a previous one', () => {
    const reload = vi.fn();
    reloadOnAccountChange('uid-a', 'uid-b', reload);
    reloadOnAccountChange('uid-a', null, reload);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it('does not reload for a first sign-in or the same account', () => {
    const reload = vi.fn();
    reloadOnAccountChange(null, 'uid-a', reload);
    reloadOnAccountChange('uid-a', 'uid-a', reload);
    expect(reload).not.toHaveBeenCalled();
  });
});
