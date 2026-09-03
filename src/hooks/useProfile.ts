/**
 * Server-backed account profile + non-appearance settings.
 *
 * Unlike `usePreferences` (appearance, write-through on every click), the
 * profile form is explicit: the user edits a draft and presses Save, which
 * PUTs only the changed fields.
 *
 * Rule 4: a 404 is a distinguishable "nothing stored yet" (returns null); any
 * other failure throws and is rendered by the caller. Nothing is defaulted.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EMPTY_PROFILE,
  type DateFormat,
  type DefaultTimeframe,
  type NumberFormat,
  type UserProfile,
  type UserProfileUpdate,
} from '@/types/profile';

const ENDPOINT = '/api/me/profile';
const QUERY_KEY = ['me', 'profile'] as const;

const NUMBER_FORMATS: NumberFormat[] = ['abbreviated', 'full'];
const DATE_FORMATS: DateFormat[] = ['iso', 'us'];
const TIMEFRAMES: DefaultTimeframe[] = ['1D', '5D', '1M', '3M', '6M', '1Y'];

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

/** Finite numbers only — a NaN/string/null stays null, never 0. */
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function pick<T extends string>(allowed: T[], v: unknown): T | null {
  return typeof v === 'string' && (allowed as string[]).includes(v) ? (v as T) : null;
}

/** Narrow an untrusted payload; unknown values degrade to null, not defaults. */
export function sanitizeProfile(raw: unknown): UserProfile {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    display_name: str(o.display_name),
    timezone: str(o.timezone),
    default_ticker: str(o.default_ticker)?.toUpperCase() ?? null,
    default_timeframe: pick(TIMEFRAMES, o.default_timeframe),
    account_size: num(o.account_size),
    risk_per_trade_pct: num(o.risk_per_trade_pct),
    notify_daily_digest: bool(o.notify_daily_digest),
    notify_catalyst_alerts: bool(o.notify_catalyst_alerts),
    notify_signal_alerts: bool(o.notify_signal_alerts),
    number_format: pick(NUMBER_FORMATS, o.number_format),
    date_format: pick(DATE_FORMATS, o.date_format),
    show_extended_hours: bool(o.show_extended_hours),
  };
}

/** Fields in `next` that differ from `base` — the minimal PUT body. */
export function profileDiff(base: UserProfile, next: UserProfile): UserProfileUpdate {
  const out: UserProfileUpdate = {};
  (Object.keys(next) as (keyof UserProfile)[]).forEach((k) => {
    if (base[k] !== next[k]) {
      // Assigning through a union-of-keys index needs the widening cast.
      (out as Record<string, unknown>)[k] = next[k];
    }
  });
  return out;
}

async function fetchProfile(): Promise<UserProfile | null> {
  const res = await fetch(ENDPOINT);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load your profile (HTTP ${res.status})`);
  return sanitizeProfile(await res.json());
}

async function saveProfile(update: UserProfileUpdate): Promise<UserProfile> {
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`Could not save your profile (HTTP ${res.status})`);
  return sanitizeProfile(await res.json());
}

export function useProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (saved) => queryClient.setQueryData(QUERY_KEY, saved),
  });

  return {
    /** Null while loading, or when the server has nothing stored. */
    profile: query.data ?? null,
    /** Stored profile, or an all-null shell so forms can render immediately. */
    stored: query.data ?? EMPTY_PROFILE,
    loading: query.isPending,
    /** Read error — render it, don't hide it. */
    loadError: query.error instanceof Error ? query.error : null,
    saving: mutation.isPending,
    saveError: mutation.error instanceof Error ? mutation.error : null,
    saved: mutation.isSuccess,
    save: mutation.mutate,
    reset: mutation.reset,
  };
}
