import { describe, expect, it } from 'vitest';
import { isStaticFrontendHost } from './apiTargets';

describe('isStaticFrontendHost', () => {
  it('recognises the Lovable hosts and the custom domain', () => {
    expect(isStaticFrontendHost('stocks.insightscollective.org')).toBe(true);
    expect(isStaticFrontendHost('solyra-stocks.lovable.app')).toBe(true);
    expect(isStaticFrontendHost('0a1b2c3d-0000-4444-8888-9e8d7c6b5a40.lovableproject.com')).toBe(true);
  });

  it('matches the custom domain exactly, not as a suffix', () => {
    expect(isStaticFrontendHost('insightscollective.org')).toBe(false);
    expect(isStaticFrontendHost('evil-stocks.insightscollective.org')).toBe(false);
    expect(isStaticFrontendHost('stocks.insightscollective.org.evil.com')).toBe(false);
    expect(isStaticFrontendHost('localhost')).toBe(false);
  });
});
