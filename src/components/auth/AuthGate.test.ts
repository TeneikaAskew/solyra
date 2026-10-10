import { describe, expect, it } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { isAccountChange, resetAccountQueries } from './AuthGate';

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

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('resetAccountQueries', () => {
  it("drops account A's rows from a mounted view and lets B's in-flight identity query resolve", async () => {
    const queryClient = new QueryClient();

    // Account A's journal rows, cached under a key with no uid and still mounted.
    const rows = [['A-row'], ['B-row']];
    const journal = new QueryObserver(queryClient, { queryKey: ['journal'], queryFn: async () => rows.shift() });
    const stopJournal = journal.subscribe(() => {});
    await settle();
    expect(journal.getCurrentResult().data).toEqual(['A-row']);

    // Account B's /api/me, started by useUser before AuthGate's effect runs.
    const answers: Array<(me: { email: string }) => void> = [];
    const me = new QueryObserver(queryClient, {
      queryKey: ['me', 'uid-b'],
      queryFn: () => new Promise<{ email: string }>((resolve) => answers.push(resolve)),
    });
    const stopMe = me.subscribe(() => {});
    await settle();

    await Promise.race([resetAccountQueries(queryClient), settle()]);
    expect(journal.getCurrentResult().data).not.toEqual(['A-row']);

    answers.forEach((answer) => answer({ email: 'b@example.com' }));
    await settle();

    expect(me.getCurrentResult().status).toBe('success');
    expect(me.getCurrentResult().data).toEqual({ email: 'b@example.com' });
    expect(journal.getCurrentResult().data).toEqual(['B-row']);
    stopJournal();
    stopMe();
  });
});
