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

/**
 * A non-OK answer from a watchlist route, carrying its HTTP status and the
 * identity (uid and emailVerified) the request was made under.
 */
class WatchlistServiceError extends Error {
  readonly status: number;
  readonly identity: string | undefined;
  constructor(message: string, status: number, identity: string | undefined) {
    super(message);
    this.name = 'WatchlistServiceError';
    this.status = status;
    this.identity = identity;
  }
}

const isUnauthorized = (error: Error | null): boolean =>
  error instanceof WatchlistServiceError && error.status === 401;

/** A 401 received under this exact identity; one from an earlier identity no longer holds. */
const isUnauthorizedFor = (error: Error | null, identity: string): boolean =>
  isUnauthorized(error) && (error as WatchlistServiceError).identity === identity;

/** Parse a watchlist response, throwing the API's detail on a non-OK status. */
async function readWatchlistResponse<T>(r: Response, identity?: string): Promise<T> {
  if (!r.ok) {
    const payload = (await r.json().catch(() => ({}))) as { detail?: unknown };
    const detail = typeof payload.detail === 'string' ? payload.detail : undefined;
    throw new WatchlistServiceError(detail ?? `Watchlist service ${r.status}`, r.status, identity);
  }
  return (await r.json()) as T;
}

export function useUserWatchlist(): {
  query: UseQueryResult<MeWatchlistResponse, Error>;
  signedOut: boolean;
  activeTickers: string[];
} {
  const { isSignedIn, uid, emailVerified } = useUser();
  const queryClient = useQueryClient();
  const identity = `${uid ?? ''}|${String(emailVerified)}`;

  // Signing out drops the cached list, so the next account to sign in in
  // this tab never sees the previous account's rows.
  useEffect(() => {
    if (!isSignedIn) queryClient.removeQueries({ queryKey: USER_WATCHLIST_KEY, exact: true });
  }, [isSignedIn, queryClient]);

  // A 401 reaching this hook means the server rejected a FRESH token:
  // authedFetch already re-minted one and retried once. Nothing signs the
  // app out on it, so the 401 is held as the signed-out state only while the
  // identity it was received under (uid and emailVerified) is unchanged. The
  // usual causes, an email the token does not mark verified or a different
  // account, both change that identity, which re-enables the query.
  // The cached state is read here because the enabled flag has to be decided
  // before this render's useQuery call.
  const cachedError = queryClient.getQueryState<MeWatchlistResponse, Error>(USER_WATCHLIST_KEY)?.error ?? null;
  const unauthorizedCached = isUnauthorizedFor(cachedError, identity);

  const defaultRetry = queryClient.getDefaultOptions().queries?.retry;
  const query = useQuery<MeWatchlistResponse, Error>({
    queryKey: USER_WATCHLIST_KEY,
    enabled: isSignedIn && !unauthorizedCached,
    queryFn: async () =>
      readWatchlistResponse<MeWatchlistResponse>(await fetch('/api/me/watchlist'), identity),
    // A 401 is the signed-out state: retrying it only repeats a token the
    // server already rejected. Anything else follows the client's default.
    retry: (failureCount, error) => {
      if (isUnauthorized(error)) return false;
      if (typeof defaultRetry === 'function') return defaultRetry(failureCount, error);
      if (typeof defaultRetry === 'boolean') return defaultRetry;
      return failureCount < (defaultRetry ?? 3);
    },
  });

  const signedOut = !isSignedIn || isUnauthorizedFor(query.error, identity);
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
    // Changes only when Discord or the CLI edits it.
    staleTime: 5 * 60_000,
    queryFn: async () =>
      readWatchlistResponse<WatchlistDefaultResponse>(await fetch('/api/insights/watchlist/default')),
  });
}
