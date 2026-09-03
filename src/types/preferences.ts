/**
 * Shape of the server-side appearance preferences.
 *
 * Contract with the backend (stocks repo): `GET /api/me/preferences` returns
 * this object for the authenticated user, `PUT /api/me/preferences` accepts a
 * partial of it and returns the stored result. A user who has never saved
 * preferences yields `404`, which the client treats as "nothing stored yet" —
 * NOT as an error and NOT as a set of fabricated defaults.
 *
 * Field names are snake_case to match the FastAPI schema; the mapping to the
 * camelCase Zustand stores lives in `src/hooks/usePreferences.ts`.
 *
 * Every field is nullable: a null means the server holds no opinion and the
 * local (device) value stands. See CLAUDE.md Rule 4 — never coerce a missing
 * preference into a default that is indistinguishable from a real choice.
 */
import type { Theme } from '@/stores/themeStore';
import type { Density, NavPattern, Accent } from '@/stores/settingsStore';

export interface UserPreferences {
  theme: Theme | null;
  nav_pattern: NavPattern | null;
  density: Density | null;
  accent: Accent | null;
}

export type UserPreferencesUpdate = Partial<UserPreferences>;
