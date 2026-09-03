import { describe, it, expect } from 'vitest';
import { isAuthError, errorMessage } from './WidgetState';

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
