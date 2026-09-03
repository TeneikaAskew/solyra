import { describe, expect, it } from 'vitest';
import { sanitizePreferences, toPayload } from './usePreferences';

describe('sanitizePreferences', () => {
  it('keeps recognised enum values', () => {
    expect(
      sanitizePreferences({
        theme: 'light',
        nav_pattern: 'sidebar',
        density: 'comfy',
        accent: 'teal',
      }),
    ).toEqual({ theme: 'light', nav_pattern: 'sidebar', density: 'comfy', accent: 'teal' });
  });

  it('nulls unknown values instead of coercing them to a default', () => {
    const out = sanitizePreferences({
      theme: 'sepia',
      nav_pattern: 'rail',
      density: 'ultra',
      accent: 'chartreuse',
    });
    expect(out).toEqual({ theme: null, nav_pattern: null, density: null, accent: null });
  });

  it('treats an empty or malformed payload as "no stored opinion"', () => {
    expect(sanitizePreferences(null)).toEqual({
      theme: null, nav_pattern: null, density: null, accent: null,
    });
    expect(sanitizePreferences({ accent: 42 }).accent).toBeNull();
  });
});

describe('toPayload', () => {
  it('maps local store state to the snake_case server contract', () => {
    expect(toPayload('dark', 'top-tabs', 'dense', 'amber')).toEqual({
      theme: 'dark',
      nav_pattern: 'top-tabs',
      density: 'dense',
      accent: 'amber',
    });
  });
});
