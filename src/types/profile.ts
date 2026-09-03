/**
 * Account profile + non-appearance user settings.
 *
 * Contract with the backend (stocks repo — CLAUDE.md Rule 6):
 *
 *   GET /api/me/profile -> 200 UserProfile | 404 (nothing stored yet)
 *   PUT /api/me/profile <- Partial<UserProfile> -> 200 UserProfile (merged)
 *
 * Every field is nullable. `null` means "the user has never set this" and is
 * rendered as an em-dash / empty input — never coerced to a fabricated value
 * (Rule 4). Numeric fields in particular must stay null rather than 0.
 */

export type NumberFormat = 'abbreviated' | 'full';
export type DateFormat = 'iso' | 'us';
export type DefaultTimeframe = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y';

export interface UserProfile {
  /** Identity */
  display_name: string | null;
  /** IANA zone, e.g. "America/New_York". */
  timezone: string | null;

  /** Trading defaults */
  default_ticker: string | null;
  default_timeframe: DefaultTimeframe | null;
  /** Account size in USD. Null = not provided (never 0). */
  account_size: number | null;
  /** Risk per trade as a percent, e.g. 1.5. Null = not provided. */
  risk_per_trade_pct: number | null;

  /** Notifications */
  notify_daily_digest: boolean | null;
  notify_catalyst_alerts: boolean | null;
  notify_signal_alerts: boolean | null;

  /** Data & display */
  number_format: NumberFormat | null;
  date_format: DateFormat | null;
  show_extended_hours: boolean | null;
}

export type UserProfileUpdate = Partial<UserProfile>;

export const PROFILE_FIELDS: (keyof UserProfile)[] = [
  'display_name',
  'timezone',
  'default_ticker',
  'default_timeframe',
  'account_size',
  'risk_per_trade_pct',
  'notify_daily_digest',
  'notify_catalyst_alerts',
  'notify_signal_alerts',
  'number_format',
  'date_format',
  'show_extended_hours',
];

/** An all-null profile: the shape used before the server answers. */
export const EMPTY_PROFILE: UserProfile = {
  display_name: null,
  timezone: null,
  default_ticker: null,
  default_timeframe: null,
  account_size: null,
  risk_per_trade_pct: null,
  notify_daily_digest: null,
  notify_catalyst_alerts: null,
  notify_signal_alerts: null,
  number_format: null,
  date_format: null,
  show_extended_hours: null,
};
