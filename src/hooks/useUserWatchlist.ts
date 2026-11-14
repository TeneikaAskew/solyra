// FEAT-INSIGHT-001 per-user watchlist, served by the stocks API.
//
// Identity is the Firebase ID token that src/lib/authedFetch.ts attaches to
// every relative /api call, so these hooks use the ordinary relative fetch and
// send no API key header, no custom auth header and no body field naming the user.
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
 * A failed watchlist read, carrying its HTTP status (0 when no response came
 * back: a network failure or an unreadable body) and the identity (uid and
 * emailVerified) the request was made under. Every error the list query
 * throws is one of these, so a cached error always names its owner.
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

/**
 * The API's `detail` as one message: a string verbatim, or FastAPI's 422
 * validation array with each entry's `msg` joined. `undefined` when it
 * carries no message, so the caller names the status instead.
 */
function detailMessage(detail: unknown): string | undefined {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((entry: unknown) => (entry as { msg?: unknown } | null)?.msg)
      .filter((msg): msg is string => typeof msg === 'string' && msg.length > 0);
    return msgs.length > 0 ? msgs.join('; ') : undefined;
  }
  return undefined;
}

/** Parse a watchlist response, throwing the API's detail on a non-OK status. */
async function readWatchlistResponse<T>(r: Response, identity?: string): Promise<T> {
  if (!r.ok) {
    const payload = (await r.json().catch(() => ({}))) as { detail?: unknown };
    const detail = detailMessage(payload.detail);
    throw new WatchlistServiceError(detail ?? `Watchlist service ${r.status}`, r.status, identity);
  }
  return (await r.json()) as T;
}

/** The identity (uid and emailVerified) each list was read under. */
const listIdentity = new WeakMap<MeWatchlistResponse, string>();

export function useUserWatchlist(): {
  query: UseQueryResult<MeWatchlistResponse, Error>;
  signedOut: boolean;
  activeTickers: string[];
} {
  const { isSignedIn, uid, emailVerified } = useUser();
  const queryClient = useQueryClient();
  const identity = `${uid ?? ''}|${String(emailVerified)}`;

  // The key is ['me', 'watchlist'] for every account, so the cached entry is
  // dropped whenever it belongs to anyone but the identity rendering now:
  // on sign-out, and on a uid or emailVerified change with no signed-out
  // render in between. It happens here, before useQuery reads the cache,
  // rather than in an effect, because an effect runs after a render that
  // would already have handed account A's rows to account B. It is
  // idempotent: the entry useQuery builds next holds no data and no error,
  // so a second hook instance rendering in the same pass removes nothing.
  // This also clears a 401 cached under the previous identity.
  const cachedState = queryClient.getQueryState<MeWatchlistResponse, Error>(USER_WATCHLIST_KEY);
  if (cachedState && (cachedState.data !== undefined || cachedState.error)) {
    const owner =
      cachedState.data !== undefined
        ? listIdentity.get(cachedState.data)
        : cachedState.error instanceof WatchlistServiceError
          ? cachedState.error.identity
          : undefined;
    if (!isSignedIn || (owner !== undefined && owner !== identity)) {
      queryClient.removeQueries({ queryKey: USER_WATCHLIST_KEY, exact: true });
    }
  }

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
    queryFn: async () => {
      try {
        const list = await readWatchlistResponse<MeWatchlistResponse>(await fetch('/api/me/watchlist'), identity);
        listIdentity.set(list, identity);
        return list;
      } catch (err) {
        // A fetch TypeError or a body that will not parse carries no owner,
        // so it would outlive an account switch. Own it here, message kept.
        if (err instanceof WatchlistServiceError) throw err;
        throw new WatchlistServiceError(err instanceof Error ? err.message : String(err), 0, identity);
      }
    },
    // Each response object is kept as fetched, so the identity recorded for
    // it above stays attached to what the cache holds.
    structuralSharing: false,
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

/**
 * Both writes refresh in onSettled, failure included: the stocks API commits
 * the write before it reads the list back, and a 503 from that read does not
 * undo it, so the client refreshes with GET rather than retrying the write
 * (the POST and DELETE /api/me/watchlist descriptions in its OpenAPI).
 */
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
    onSettled: invalidate,
  });
}

export function useRemoveUserTicker(): UseMutationResult<MeWatchlistRemoveResponse, Error, string> {
  const invalidate = useInvalidateWatchlists();
  return useMutation<MeWatchlistRemoveResponse, Error, string>({
    mutationFn: async (ticker) =>
      readWatchlistResponse<MeWatchlistRemoveResponse>(
        await fetch(`/api/me/watchlist/${encodeURIComponent(ticker)}`, { method: 'DELETE' }),
      ),
    onSettled: invalidate,
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
