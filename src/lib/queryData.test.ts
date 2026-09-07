import { describe, expect, it } from 'vitest';
import { dataUnlessError } from './queryData';

describe('dataUnlessError', () => {
  const cached = { ticker: 'IWM', cards: [{ id: 'card_1' }] };

  it('passes data through while the query is healthy', () => {
    expect(dataUnlessError(cached, false)).toBe(cached);
  });

  it('drops retained data once the query errors (a refused refetch must not keep rendering the old payload)', () => {
    expect(dataUnlessError(cached, true)).toBeUndefined();
  });

  it('is a no-op on an empty query', () => {
    expect(dataUnlessError(undefined, false)).toBeUndefined();
    expect(dataUnlessError(undefined, true)).toBeUndefined();
  });
});
