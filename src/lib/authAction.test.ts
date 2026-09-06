import { describe, it, expect } from 'vitest';
import {
  AUTH_ACTION_MODES,
  MIN_PASSWORD_LENGTH,
  friendlyActionError,
  friendlyError,
  parseAuthAction,
  resetLooksSent,
  successCopy,
  validateNewPassword,
} from './authAction';

describe('parseAuthAction', () => {
  it('accepts every Firebase action mode with a code', () => {
    for (const mode of AUTH_ACTION_MODES) {
      expect(parseAuthAction(`?mode=${mode}&oobCode=abc123`)).toEqual({ mode, oobCode: 'abc123' });
    }
  });

  it('ignores extra params Firebase appends (apiKey, lang, continueUrl)', () => {
    expect(
      parseAuthAction('?mode=resetPassword&oobCode=xyz&apiKey=AIza&lang=en&continueUrl=https%3A%2F%2Fx'),
    ).toEqual({ mode: 'resetPassword', oobCode: 'xyz' });
  });

  it('returns null for a missing, blank, or unknown mode/code', () => {
    expect(parseAuthAction('')).toBeNull();
    expect(parseAuthAction('?mode=resetPassword')).toBeNull();
    expect(parseAuthAction('?mode=resetPassword&oobCode=%20%20')).toBeNull();
    expect(parseAuthAction('?oobCode=abc')).toBeNull();
    expect(parseAuthAction('?mode=signIn&oobCode=abc')).toBeNull();
    expect(parseAuthAction('?mode=RESETPASSWORD&oobCode=abc')).toBeNull();
  });
});

describe('validateNewPassword', () => {
  it('enforces the minimum length before the match check', () => {
    expect(validateNewPassword('abc', 'abc')).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  });

  it('rejects a mismatch and accepts a matching pair', () => {
    expect(validateNewPassword('longenough', 'different')).toBe('Passwords do not match.');
    expect(validateNewPassword('longenough', 'longenough')).toBeNull();
  });
});

describe('friendlyActionError', () => {
  it('maps the Firebase codes an action link can fail with', () => {
    expect(friendlyActionError('auth/expired-action-code')).toMatch(/expired/i);
    expect(friendlyActionError('auth/invalid-action-code')).toMatch(/already been used/i);
    expect(friendlyActionError('auth/user-disabled')).toMatch(/disabled/i);
    expect(friendlyActionError('auth/weak-password')).toMatch(/at least/i);
  });

  it('never echoes an unknown raw code to the reader', () => {
    const msg = friendlyActionError('auth/something-new');
    expect(msg).not.toContain('auth/');
    expect(msg).toMatch(/request a new one/i);
    expect(friendlyActionError(undefined)).toBe(msg);
  });
});

describe('successCopy', () => {
  it('has a title and body for every mode, with and without an email', () => {
    for (const mode of AUTH_ACTION_MODES) {
      const withEmail = successCopy(mode, 'a@b.test');
      const without = successCopy(mode, null);
      expect(withEmail.title.length).toBeGreaterThan(0);
      expect(withEmail.body.length).toBeGreaterThan(0);
      expect(without.body).not.toContain('null');
    }
    expect(successCopy('verifyEmail', 'a@b.test').body).toContain('a@b.test');
  });
});

describe('friendlyError', () => {
  it('maps credential failures to one neutral message', () => {
    for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found']) {
      expect(friendlyError(code, 'raw')).toBe('Incorrect email or password.');
    }
  });

  it('falls back to the caller-supplied message for unknown codes', () => {
    expect(friendlyError('auth/brand-new', 'raw message')).toBe('raw message');
    expect(friendlyError(undefined, 'raw message')).toBe('raw message');
  });

  it('explains a network failure instead of echoing it', () => {
    expect(friendlyError('auth/network-request-failed', 'raw')).toMatch(/connection/i);
  });
});

describe('resetLooksSent', () => {
  it('treats user-not-found as sent so account existence is never leaked', () => {
    expect(resetLooksSent('auth/user-not-found')).toBe(true);
  });

  it('surfaces every other failure', () => {
    expect(resetLooksSent('auth/invalid-email')).toBe(false);
    expect(resetLooksSent('auth/too-many-requests')).toBe(false);
    expect(resetLooksSent(undefined)).toBe(false);
  });
});
