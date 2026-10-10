import { describe, it, expect } from 'vitest';
import { isAuthError, errorMessage, widgetErrorKind } from './WidgetState';

describe('isAuthError', () => {
  it('detects a 401 status message', () => {
    expect(isAuthError(new Error('401'))).toBe(true);
    expect(isAuthError(new Error('Request failed: 401'))).toBe(true);
  });
  it('detects an unauthorized message', () => {
    expect(isAuthError(new Error('Unauthorized'))).toBe(true);
  });
  it('does not treat other failures as auth errors', () => {
    expect(isAuthError(new Error('500'))).toBe(false);
    expect(isAuthError(new Error('Failed to fetch'))).toBe(false);
    expect(isAuthError(null)).toBe(false);
  });
});

describe('errorMessage', () => {
  it('expands a bare status code', () => {
    expect(errorMessage(new Error('503'))).toBe('Request failed (HTTP 503)');
  });
  it('passes through a real message', () => {
    expect(errorMessage(new Error('Failed to fetch'))).toBe('Failed to fetch');
  });
  it('returns null when there is nothing to show', () => {
    expect(errorMessage(undefined)).toBe(null);
  });
});

describe('widgetErrorKind', () => {
  it('keeps a 401 as the sign-in state whatever the verification flag says', () => {
    expect(widgetErrorKind(new Error('401'), true)).toBe('auth');
    expect(widgetErrorKind(new Error('401'), false)).toBe('auth');
  });
  it('reads any other error as verify-your-email while verification is required', () => {
    // useMarketData throws the bare detail, with no status in it.
    expect(widgetErrorKind(new Error('verify your email to continue'), true)).toBe('verify');
    expect(widgetErrorKind(new Error('403'), true)).toBe('verify');
  });
  it('leaves the same errors generic when verification is not required', () => {
    expect(widgetErrorKind(new Error('verify your email to continue'), false)).toBe('error');
    expect(widgetErrorKind(new Error('403'), false)).toBe('error');
  });
});
