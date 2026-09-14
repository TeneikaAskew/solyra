import { useQuery } from '@tanstack/react-query';

import { parseApiError } from '@/lib/apiError';

/**
 * `/api/options/dates/{ticker}` has two callers with different needs, and
 * conflating them cost 9.9 seconds per page load.
 *
 * The endpoint returns up to 1000 snapshot dates. `TrinityTab` and `SwingMode`
 * read `dates[0]` and discard the rest, so they were paying for the entire
 * snapshot history to render one date. Measured against prod: 9,870 ms, from a
 * query reading 10,373,012 index rows to return 43. `?limit=1` is a single
 * index descent, 2.5 ms. See TeneikaAskew/stocks#992 for the backend half.
 *
 * The two hooks live here rather than being copy-pasted into each component
 * (CLAUDE.md Rule 1). They were duplicated byte-for-byte in `TrinityTab.tsx`
 * and `SwingMode.tsx`, which matters more than tidiness: both copies wrote the
 * SAME React Query key, so editing one of them would have made the cache
 * contents depend on which component mounted first.
 *
 * The keys are deliberately distinct — `'latest'` vs `'all'`. A single shared
 * key would let a `limit=1` response be served to `ProfilesTab`'s date picker,
 * silently collapsing it to one option.
 */

export interface OptionsDatesResponse {
  ticker: string;
  dates: string[];
}

const STALE_TIME_MS = 300_000;

/**
 * The newest snapshot date only, for views with no date picker.
 *
 * Note the consequence of the split key: for up to `staleTime` after a new
 * snapshot lands, a view using this hook can show yesterday's date while a
 * view using `useAllOptionsDates` already lists today's. It self-heals on the
 * next refetch, and the alternative — one shared entry — is the collision
 * above.
 */
export function useLatestOptionsDate(ticker: string) {
  return useQuery<OptionsDatesResponse>({
    queryKey: ['options-dates', ticker, 'latest'],
    queryFn: async () => {
      const r = await fetch(`/api/options/dates/${ticker}?limit=1`);
      if (!r.ok) throw new Error(await parseApiError(r, 'Failed to fetch options dates'));
      return r.json();
    },
    staleTime: STALE_TIME_MS,
    retry: false,
  });
}

/** The full snapshot history, for views that render a date picker. */
export function useAllOptionsDates(ticker: string) {
  return useQuery<OptionsDatesResponse>({
    queryKey: ['options-dates', ticker, 'all'],
    queryFn: async () => {
      const r = await fetch(`/api/options/dates/${ticker}`);
      if (!r.ok) throw new Error(await parseApiError(r, 'Failed to fetch options dates'));
      return r.json();
    },
    staleTime: STALE_TIME_MS,
    retry: false,
  });
}
