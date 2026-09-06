import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuthMode } from '@/lib/runtimeConfig';
import { subscribeAuth } from '@/lib/firebase';

interface MeResponse {
  email: string | null;
  is_admin?: boolean;
}

/**
 * Single identity hook for the app.
 *
 * - firebase mode: tracks Firebase auth state; once signed in, reads the
 *   server-VERIFIED identity from /api/me (so `is_admin` can't be spoofed).
 * - iap / open / local mode: polls /api/me exactly as before (IAP header gives
 *   the email in prod; null locally) — no gate, no behaviour change.
 */
export function useUser() {
  const authMode = getAuthMode();
  const firebaseMode = authMode === 'firebase';

  // In non-firebase modes there's no client auth state: "ready" + "signed in".
  const [fbReady, setFbReady] = useState(!firebaseMode);
  const [signedIn, setSignedIn] = useState(!firebaseMode);
  // The Firebase uid of the signed-in account, null when signed out and in
  // every non-firebase mode. Part of the /api/me query key below.
  const [uid, setUid] = useState<string | null>(null);
  // Firebase's emailVerified for the signed-in account; null when signed out
  // and in every non-firebase mode (there is no such state to report).
  // Google sign-ins arrive verified; only email/password sign-ups start false.
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (!firebaseMode) return;
    const unsub = subscribeAuth((user) => {
      setUid(user?.uid ?? null);
      setSignedIn(!!user);
      setEmailVerified(user ? user.emailVerified : null);
      setFbReady(true);
    });
    return () => unsub();
  }, [firebaseMode]);

  // Only hit /api/me when it can succeed: always in non-firebase modes; in
  // firebase mode only once signed in (the token attaches via authedFetch).
  const meEnabled = !firebaseMode || signedIn;
  const query = useQuery<MeResponse>({
    // Keyed by uid, not by a signed-in boolean: auth state is shared across
    // tabs, so account A signing out elsewhere and account B signing in here
    // must NOT reuse A's cached is_admin within the staleTime window. A
    // different uid is a different cache entry and forces a fresh, verified
    // /api/me for the new identity.
    queryKey: ['me', uid],
    enabled: meEnabled,
    queryFn: async () => {
      const r = await fetch('/api/me');
      // A non-OK answer is a server failure, not an identity — /api/me is an
      // open path that answers 200 with { email: null } for anonymous. Throw
      // so React Query retries and keeps the failure refetchable (on focus /
      // remount) instead of caching a fabricated anonymous is_admin: false
      // for the whole staleTime. Consumers read isAdmin === false while the
      // query errors, so a persistent failure still fails closed.
      if (!r.ok) throw new Error(`/api/me ${r.status}`);
      return r.json();
    },
    retry: 1,
    // Short on purpose: the uid key only covers ACCOUNT switches, while a
    // role granted or revoked for the SAME account changes /api/me's answer
    // without changing the key. The server enforces the role on every API
    // call immediately; this bound is how long the UI (denied card, admin
    // shell, nav link) can lag behind before a mount/focus refetch converges.
    staleTime: 30_000,
  });

  const email = query.data?.email ?? null;
  const isAdmin = query.data?.is_admin === true;
  const isSignedIn = firebaseMode ? signedIn : true;
  const isLoading = !fbReady || (meEnabled && query.isLoading);

  return { email, isAdmin, isSignedIn, isLoading, authMode, emailVerified };
}
