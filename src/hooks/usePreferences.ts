/**
 * Server-backed appearance preferences.
 *
 * Local-first is NOT the contract here: the server is the source of truth for
 * a signed-in user, localStorage is only the pre-hydration paint so the first
 * frame isn't unstyled. On mount we read `GET /api/me/preferences` and apply
 * whatever the server holds; every change writes through with
 * `PUT /api/me/preferences`.
 *
 * Backend contract lives in the stocks repo (see CLAUDE.md Rule 6 — a shape
 * change there must land here in the same change set):
 *
 *   GET  /api/me/preferences -> 200 UserPreferences | 404 (nothing stored)
 *   PUT  /api/me/preferences <- UserPreferencesUpdate -> 200 UserPreferences
 *
 * Rule 4: a failed read or write is surfaced (`error`), never swallowed and
 * never replaced with fabricated defaults. A 404 is a real, distinguishable
 * "no preferences stored" answer — it is not a failure.
 */
import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserPreferences, UserPreferencesUpdate } from '@/types/preferences';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import {
  useSettingsStore, ACCENTS, type Accent, type Density, type NavPattern,
} from '@/stores/settingsStore';

const ENDPOINT = '/api/me/preferences';
const QUERY_KEY = ['me', 'preferences'] as const;

export interface PreferencesSyncStatus {
  /** True while the initial server read is in flight. */
  loading: boolean;
  /** True while a change is being written back. */
  saving: boolean;
  /** Non-null when the last read or write failed — render it, don't hide it. */
  error: Error | null;
}

/**
 * Only one mounted syncer may drive the server round-trip; see
 * `usePreferencesSync`. Module-level because the guard has to outlive any
 * single component instance.
 */
let syncOwnerClaimed = false;

/** Owner-published sync status, so passive readers re-render on change. */
const useSyncStatusStore = create<PreferencesSyncStatus>(() => ({
  loading: true,
  saving: false,
  error: null,
}));

const THEMES: Theme[] = ['dark', 'light'];
const DENSITIES: Density[] = ['comfy', 'default', 'dense'];
const NAV_PATTERNS: NavPattern[] = ['top-tabs', 'sidebar'];

function pick<T extends string>(allowed: T[], value: unknown): T | null {
  return typeof value === 'string' && (allowed as string[]).includes(value)
    ? (value as T)
    : null;
}

/**
 * Narrow an untrusted server payload to the known enums.
 *
 * An unrecognised value becomes `null` ("server holds no usable opinion"), so
 * a backend that adds an accent we don't ship yet degrades to the local choice
 * instead of writing a bogus class onto <body>.
 */
export function sanitizePreferences(raw: unknown): UserPreferences {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    theme: pick(THEMES, o.theme),
    nav_pattern: pick(NAV_PATTERNS, o.nav_pattern),
    density: pick(DENSITIES, o.density),
    accent: pick(ACCENTS as Accent[], o.accent),
  };
}

/** Read the current local appearance state as a server payload. */
export function toPayload(
  theme: Theme,
  navPattern: NavPattern,
  density: Density,
  accent: Accent,
): UserPreferences {
  return { theme, nav_pattern: navPattern, density, accent };
}

async function fetchPreferences(): Promise<UserPreferences | null> {
  const res = await fetch(ENDPOINT);
  // No row yet for this user — a legitimate empty state, not a failure.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load preferences (HTTP ${res.status})`);
  return sanitizePreferences(await res.json());
}

async function savePreferences(update: UserPreferencesUpdate): Promise<UserPreferences> {
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`Could not save preferences (HTTP ${res.status})`);
  return sanitizePreferences(await res.json());
}

/**
 * Hydrate the appearance stores from the server once, then write through on
 * every subsequent change.
 *
 * Mount EXACTLY once (AppShell does it). A second live instance would treat
 * the first one's hydration as a local edit and echo it straight back as a
 * redundant PUT, so the module-level guard makes extra mounts inert and they
 * read status from the shared store instead.
 */
export function usePreferencesSync() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useThemeStore();
  const { navPattern, density, accent, setNavPattern, setDensity, setAccent } =
    useSettingsStore();

  // Claim ownership for this component instance; later mounts stay passive.
  const owner = useRef<boolean | null>(null);
  if (owner.current === null) {
    owner.current = !syncOwnerClaimed;
    if (owner.current) syncOwnerClaimed = true;
  }
  const isOwner = owner.current;
  useEffect(() => {
    return () => {
      if (isOwner) syncOwnerClaimed = false;
    };
  }, [isOwner]);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPreferences,
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: isOwner,
  });

  const mutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: (saved) => queryClient.setQueryData(QUERY_KEY, saved),
  });

  // Apply the server's stored values exactly once per session. After that the
  // local stores lead and we push changes up.
  const hydrated = useRef(false);
  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    if (!isOwner || hydrated.current || query.isPending) return;
    hydrated.current = true;
    const remote = query.data;
    if (remote) {
      if (remote.theme && remote.theme !== theme) setTheme(remote.theme);
      if (remote.nav_pattern && remote.nav_pattern !== navPattern) setNavPattern(remote.nav_pattern);
      if (remote.density && remote.density !== density) setDensity(remote.density);
      if (remote.accent && remote.accent !== accent) setAccent(remote.accent);
    }
    // Baseline is the state we just applied, so hydration itself never PUTs.
    lastSent.current = JSON.stringify(
      toPayload(
        remote?.theme ?? theme,
        remote?.nav_pattern ?? navPattern,
        remote?.density ?? density,
        remote?.accent ?? accent,
      ),
    );
    // Store setters are stable; the local values are read only at hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, query.isPending, query.data]);

  // Write through whenever the local appearance changes post-hydration.
  useEffect(() => {
    if (!isOwner || !hydrated.current || lastSent.current === null) return;
    const payload = toPayload(theme, navPattern, density, accent);
    const serialized = JSON.stringify(payload);
    if (lastSent.current === serialized) return;
    // Also skip when the "change" merely restates what the server already
    // stores — e.g. a remount replaying hydration. Saves a pointless write.
    if (query.data && JSON.stringify(query.data) === serialized) {
      lastSent.current = serialized;
      return;
    }
    lastSent.current = serialized;
    mutation.mutate(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, theme, navPattern, density, accent, query.isPending]);

  // Publish the owner's state so passive consumers (Settings page) can render
  // sync status without mounting a second syncer.
  const loading = query.isPending;
  const saving = mutation.isPending;
  const error = (query.error ?? mutation.error) as Error | null;
  const shared = useSyncStatusStore();
  useEffect(() => {
    if (!isOwner) return;
    useSyncStatusStore.setState({ loading, saving, error });
  }, [isOwner, loading, saving, error]);

  return isOwner
    ? { loading, saving, error, stored: query.data ?? null }
    : { ...shared, stored: query.data ?? null };
}

/** Read-only sync status for components that don't own the syncer. */
export function usePreferencesStatus(): PreferencesSyncStatus {
  return useSyncStatusStore();
}
