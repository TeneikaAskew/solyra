// FEAT-INSIGHT-001 per-user watchlist, served by the stocks API.
//
// Identity is the Firebase ID token that src/lib/authedFetch.ts attaches to
// every relative /api call, so these hooks use the ordinary relative fetch and
// send no apikey, no custom auth header and no body field naming the user.
import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useUser } from './useUser';
import type {
  MeWatchlistRemoveResponse,
  MeWatchlistResponse,
  WatchlistDefaultResponse,
} from '@/types/watchlist';

export const USER_WATCHLIST_KEY = ['me', 'watchlist'] as const;

/** A non-OK answer from a watchlist route, carrying its HTTP status. */
class WatchlistServiceError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'WatchlistServiceError';
    this.status = status;
  }
}

const isUnauthorized = (error: Error | null): boolean =>
  error instanceof WatchlistServiceError && error.status === 401;

/** Parse a watchlist response, throwing the API's detail on a non-OK status. */
async function readWatchlistResponse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const payload = (await r.json().catch(() => ({}))) as { detail?: unknown };
    const detail = typeof payload.detail === 'string' ? payload.detail : undefined;
    throw new WatchlistServiceError(detail ?? `Watchlist service ${r.status}`, r.status);
  }
  return (await r.json()) as T;
}

export function useUserWatchlist(): {
  query: UseQueryResult<MeWatchlistResponse, Error>;
  signedOut: boolean;
  activeTickers: string[];
} {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();

  // A 401 left in the cache keeps the query disabled; once the app has
  // signed out, drop it so the next sign-in starts from a fresh request
  // instead of the previous session's answer.
  useEffect(() => {
    if (!isSignedIn) queryClient.removeQueries({ queryKey: USER_WATCHLIST_KEY, exact: true });
  }, [isSignedIn, queryClient]);

  // The 401 check reads the cached query state because the enabled flag has
  // to be decided before this render's useQuery call.
  const cachedError = queryClient.getQueryState<MeWatchlistResponse, Error>(USER_WATCHLIST_KEY)?.error ?? null;
  const unauthorizedCached = isUnauthorized(cachedError);

  const query = useQuery<MeWatchlistResponse, Error>({
    queryKey: USER_WATCHLIST_KEY,
    enabled: isSignedIn && !unauthorizedCached,
    queryFn: async () => readWatchlistResponse<MeWatchlistResponse>(await fetch('/api/me/watchlist')),
    // A 401 is the signed-out state: retrying it only repeats the request
    // with the same expired token. Anything else gets the app's single retry.
    retry: (failureCount, error) => !isUnauthorized(error) && failureCount < 1,
  });

  const signedOut = !isSignedIn || isUnauthorized(query.error);
  // Rule 4: an empty list here means "no data yet" (loading, signed out),
  // never an error; the error state is query.isError.
  const activeTickers = query.data ? query.data.tickers.map((row) => row.ticker.toUpperCase()) : [];

  return { query, signedOut, activeTickers };
}

function useInvalidateWatchlists() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: USER_WATCHLIST_KEY }),
      // The ranked panel's ['watchlist', ...] keys, so it refetches with the new extras.
      queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
    ]);
  };
}

export function useAddUserTicker(): UseMutationResult<
  MeWatchlistResponse,
  Error,
  { ticker: string; source: 'ui' | 'combobox-auto-add' }
> {
  const invalidate = useInvalidateWatchlists();
  return useMutation<MeWatchlistResponse, Error, { ticker: string; source: 'ui' | 'combobox-auto-add' }>({
    mutationFn: async ({ ticker, source }) =>
      readWatchlistResponse<MeWatchlistResponse>(
        await fetch('/api/me/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, source }),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRemoveUserTicker(): UseMutationResult<MeWatchlistRemoveResponse, Error, string> {
  const invalidate = useInvalidateWatchlists();
  return useMutation<MeWatchlistRemoveResponse, Error, string>({
    mutationFn: async (ticker) =>
      readWatchlistResponse<MeWatchlistRemoveResponse>(
        await fetch(`/api/me/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' }),
      ),
    onSuccess: invalidate,
  });
}

export function useDefaultWatchlist(): UseQueryResult<WatchlistDefaultResponse, Error> {
  return useQuery<WatchlistDefaultResponse, Error>({
    queryKey: ['watchlist', 'default'],
    queryFn: async () =>
      readWatchlistResponse<WatchlistDefaultResponse>(await fetch('/api/insights/watchlist/default')),
  });
}
