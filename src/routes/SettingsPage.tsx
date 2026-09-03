/**
 * Settings — profile, appearance, trading defaults, notifications, account.
 *
 * Two persistence models live side by side on purpose:
 *  - Appearance (theme / nav / density / accent) applies instantly and writes
 *    through via `usePreferences` — the user needs to see the change.
 *  - Profile / trading / notification / display settings are an explicit
 *    draft + Save form (`useProfile`), because a half-typed account size
 *    should never be persisted.
 *
 * Rule 4: sync and save failures are rendered, never swallowed, and a value
 * the server doesn't hold stays empty rather than being defaulted.
 */
import { useEffect, useMemo, useState, type Key } from 'react';
import {
  Moon, Sun, PanelLeft, LayoutGrid, User, Palette, LineChart, Bell, ShieldCheck,
} from 'lucide-react';
import { ToggleButton, ToggleButtonGroup, Button } from '@heroui/react';
import { useThemeStore } from '@/stores/themeStore';
import {
  useSettingsStore, ACCENTS, type Density, type NavPattern, type Accent,
} from '@/stores/settingsStore';
import { usePreferencesStatus } from '@/hooks/usePreferences';
import { useProfile, profileDiff } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { firebaseSignOut } from '@/lib/firebase';
import { EMPTY_PROFILE, type UserProfile } from '@/types/profile';

/** Accent swatch colors (match index.css .accent-* palettes; blue = brand). */
const ACCENT_SWATCH: Record<Accent, string> = {
  blue: '#8bceff', amber: '#ffb86b', violet: '#b58bff', cyan: '#5ee3e1',
  teal: '#14b8a6', pink: '#ff7eb9', magenta: '#e879f9', orange: '#fb923c',
  yellow: '#facc15', indigo: '#818cf8', rose: '#f472b6',
};

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'trading', label: 'Trading', icon: LineChart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account', icon: ShieldCheck },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** First key of a single-selection change, ignoring empty sets. */
function firstKey(keys: Set<Key>): Key | undefined {
  for (const k of keys) return k;
  return undefined;
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl bg-[var(--surface-1)] p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[var(--on-surface)]">{title}</h2>
        {desc && <p className="mt-0.5 text-[12px] text-[var(--on-surface-muted)]">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="text-[12px] font-medium text-[var(--on-surface)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--on-surface-muted)]">{hint}</span>}
    </label>
  );
}

const inputCls =
  'mt-1 w-full min-w-0 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--on-surface)] outline-none ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--accent)]';

/** Text for a value the server doesn't hold (Rule 4 presentation boundary). */
const EM_DASH = '—';

/** Text input value for a nullable string: null renders as empty, not "null". */
function textValue(v: string | null): string {
  return v ?? '';
}

/** Number input value: null renders empty so 0 stays a real, distinct choice. */
function numValue(v: number | null): string {
  return v === null ? '' : String(v);
}

/** Parse an input back to a nullable number; blank => null, junk => null. */
function parseNum(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}


/** Accessible on/off row — a plain switch so it renders identically in both themes. */
function ToggleRow({
  label, isOn, onToggle,
}: { label: string; isOn: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => onToggle(!isOn)}
      className="flex w-full min-w-0 items-center justify-between gap-3 text-left"
    >
      <span className="min-w-0 text-sm text-[var(--on-surface)]">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          isOn ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] ring-1 ring-[var(--border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isOn ? 'left-[1.15rem]' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabId>('profile');
  const { theme, setTheme } = useThemeStore();
  const { navPattern, setNavPattern, density, setDensity, accent, setAccent } = useSettingsStore();
  const prefs = usePreferencesStatus();
  const { email, isAdmin, isSignedIn, authMode } = useUser();
  const { stored, loading, loadError, saving, saveError, saved, save } = useProfile();

  // Local draft, seeded from the server answer once it lands.
  const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
  useEffect(() => {
    if (!loading) setDraft(stored);
    // Re-seed only when the stored snapshot identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, stored]);

  const diff = useMemo(() => profileDiff(stored, draft), [stored, draft]);
  const dirty = Object.keys(diff).length > 0;
  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const densities: Density[] = ['comfy', 'default', 'dense'];
  const navs: { value: NavPattern; icon: typeof PanelLeft; label: string }[] = [
    { value: 'top-tabs', icon: LayoutGrid, label: 'Tabs' },
    { value: 'sidebar', icon: PanelLeft, label: 'Sidebar' },
  ];

  const initials = (draft.display_name || email || '?').trim().slice(0, 1).toUpperCase();

  const saveBar = (
    <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--surface-2)] px-4 py-3 ring-1 ring-[var(--border)]">
      <Button size="sm" isDisabled={!dirty || saving} onPress={() => save(diff)}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
      {dirty && (
        <Button size="sm" variant="ghost" isDisabled={saving} onPress={() => setDraft(stored)}>
          Discard
        </Button>
      )}
      <span className="min-w-0 flex-1 text-[12px]" aria-live="polite">
        {saveError ? (
          <span className="text-[var(--bear)]">{saveError.message}</span>
        ) : saved && !dirty ? (
          <span className="text-[var(--bull)]">Saved.</span>
        ) : dirty ? (
          <span className="text-[var(--on-surface-muted)]">Unsaved changes.</span>
        ) : null}
      </span>
    </div>
  );

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-5">
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-[var(--on-surface)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--on-surface-muted)]">
          Your profile, appearance and trading defaults. Saved to your account,
          so they follow you to any device.
        </p>
        <p className="mt-1 text-[12px]" aria-live="polite">
          {prefs.error ? (
            <span className="text-[var(--bear)]">
              Appearance not synced, {prefs.error.message}. Changes still apply on this device.
            </span>
          ) : loadError ? (
            <span className="text-[var(--bear)]">{loadError.message}</span>
          ) : prefs.loading || loading ? (
            <span className="text-[var(--on-surface-muted)]">Loading your saved settings…</span>
          ) : (
            <span className="text-[var(--on-surface-muted)]">Synced to your account.</span>
          )}
        </p>
      </header>

      {/* Scrollable tab strip, stays usable on a 360px viewport. */}
      <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
        <div className="flex w-max gap-1" role="tablist" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] ${
                tab === id
                  ? 'bg-[var(--accent-soft,var(--surface-2))] font-semibold text-[var(--accent)]'
                  : 'text-[var(--on-surface-muted)] hover:text-[var(--on-surface)]'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'profile' && (
        <>
          <Section title="Your account" desc="Identity from your sign-in, plus how you appear in the app.">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-base font-semibold text-[var(--surface-0,#0b0b0f)]"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-[var(--on-surface)]">
                  {draft.display_name ?? EM_DASH}
                </div>
                <div className="truncate text-[12px] text-[var(--on-surface-muted)]">
                  {email ?? EM_DASH}
                </div>
              </div>
              {isAdmin && (
                <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--on-surface-muted)]">
                  Admin
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <input
                  className={inputCls}
                  value={textValue(draft.display_name)}
                  placeholder="Not set"
                  onChange={(e) => set('display_name', e.target.value.trim() === '' ? null : e.target.value)}
                />
              </Field>
              <Field label="Time zone" hint="Used for session clocks and event times.">
                <input
                  className={inputCls}
                  value={textValue(draft.timezone)}
                  placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onChange={(e) => set('timezone', e.target.value.trim() === '' ? null : e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Data & display" desc="How numbers and dates are formatted across the app.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number format">
                <select
                  className={inputCls}
                  value={draft.number_format ?? ''}
                  onChange={(e) => set('number_format', (e.target.value || null) as UserProfile['number_format'])}
                >
                  <option value="">Not set</option>
                  <option value="abbreviated">Abbreviated (1.2M)</option>
                  <option value="full">Full (1,200,000)</option>
                </select>
              </Field>
              <Field label="Date format">
                <select
                  className={inputCls}
                  value={draft.date_format ?? ''}
                  onChange={(e) => set('date_format', (e.target.value || null) as UserProfile['date_format'])}
                >
                  <option value="">Not set</option>
                  <option value="iso">ISO (2026-09-03)</option>
                  <option value="us">US (09/03/2026)</option>
                </select>
              </Field>
            </div>
            <div className="mt-4">
              <ToggleRow
                label="Show extended-hours data on charts"
                isOn={draft.show_extended_hours === true}
                onToggle={(v) => set('show_extended_hours', v)}
              />
            </div>
          </Section>
          {saveBar}
        </>
      )}

      {tab === 'appearance' && (
        <>
          <Section title="Theme" desc="Light or dark color scheme (also toggleable from the header).">
            <ToggleButtonGroup
              size="sm"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[theme]}
              onSelectionChange={(keys) => {
                const k = firstKey(keys);
                if (k === 'dark' || k === 'light') setTheme(k);
              }}
            >
              <ToggleButton id="dark"><Moon size={13} /> Dark</ToggleButton>
              <ToggleButton id="light"><Sun size={13} /> Light</ToggleButton>
            </ToggleButtonGroup>
          </Section>

          <Section title="Navigation" desc="Top tab bar or a left sidebar for the primary nav.">
            <ToggleButtonGroup
              size="sm"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[navPattern]}
              onSelectionChange={(keys) => {
                const k = firstKey(keys);
                if (k === 'top-tabs' || k === 'sidebar') setNavPattern(k);
              }}
            >
              {navs.map(({ value, icon: Icon, label }) => (
                <ToggleButton key={value} id={value}><Icon size={13} /> {label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Section>

          <Section title="Density" desc="Spacing and sizing across tables and cards.">
            <ToggleButtonGroup
              size="sm"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[density]}
              onSelectionChange={(keys) => {
                const k = firstKey(keys);
                if (k === 'comfy' || k === 'default' || k === 'dense') setDensity(k);
              }}
            >
              {densities.map((d) => (
                <ToggleButton key={d} id={d}>{d[0].toUpperCase() + d.slice(1)}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Section>

          <Section title="Accent" desc="Highlight color for active state, links, and charts.">
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <ToggleButton
                  key={a}
                  isIconOnly
                  size="sm"
                  aria-label={a}
                  isSelected={accent === a}
                  onChange={() => setAccent(a)}
                  className="h-7 w-7 min-w-0 rounded-full p-0"
                  style={{ background: ACCENT_SWATCH[a] }}
                />
              ))}
            </div>
          </Section>
        </>
      )}

      {tab === 'trading' && (
        <>
          <Section title="Defaults" desc="What loads first on the charts, options and signals pages.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default ticker">
                <input
                  className={inputCls}
                  value={textValue(draft.default_ticker)}
                  placeholder="Not set"
                  onChange={(e) =>
                    set('default_ticker', e.target.value.trim() === '' ? null : e.target.value.toUpperCase())
                  }
                />
              </Field>
              <Field label="Default timeframe">
                <select
                  className={inputCls}
                  value={draft.default_timeframe ?? ''}
                  onChange={(e) => set('default_timeframe', (e.target.value || null) as UserProfile['default_timeframe'])}
                >
                  <option value="">Not set</option>
                  {['1D', '5D', '1M', '3M', '6M', '1Y'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Risk" desc="Used to pre-fill position sizing in the journal and playbook.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account size (USD)" hint="Left blank means no sizing suggestion is shown.">
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={numValue(draft.account_size)}
                  placeholder="Not set"
                  onChange={(e) => set('account_size', parseNum(e.target.value))}
                />
              </Field>
              <Field label="Risk per trade (%)">
                <input
                  className={inputCls}
                  inputMode="decimal"
                  value={numValue(draft.risk_per_trade_pct)}
                  placeholder="Not set"
                  onChange={(e) => set('risk_per_trade_pct', parseNum(e.target.value))}
                />
              </Field>
            </div>
          </Section>
          {saveBar}
        </>
      )}

      {tab === 'notifications' && (
        <>
          <Section title="Email" desc="Delivery goes to your sign-in address.">
            <div className="space-y-3">
              <ToggleRow
                label="Daily market digest before the open"
                isOn={draft.notify_daily_digest === true}
                onToggle={(v) => set('notify_daily_digest', v)}
              />
              <ToggleRow
                label="Catalyst alerts for watchlist tickers"
                isOn={draft.notify_catalyst_alerts === true}
                onToggle={(v) => set('notify_catalyst_alerts', v)}
              />
              <ToggleRow
                label="Signal triggers from your playbook setups"
                isOn={draft.notify_signal_alerts === true}
                onToggle={(v) => set('notify_signal_alerts', v)}
              />
            </div>
            <p className="mt-3 text-[11px] text-[var(--on-surface-muted)]">
              Sending to {email ?? EM_DASH}.
            </p>
          </Section>
          {saveBar}
        </>
      )}

      {tab === 'account' && (
        <>
          <Section title="Sign-in" desc="How you authenticate to this workspace.">
            <dl className="grid gap-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--on-surface-muted)]">Email</dt>
                <dd className="min-w-0 truncate text-[var(--on-surface)]">{email ?? EM_DASH}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--on-surface-muted)]">Auth mode</dt>
                <dd className="text-[var(--on-surface)]">{authMode ?? EM_DASH}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--on-surface-muted)]">Role</dt>
                <dd className="text-[var(--on-surface)]">{isAdmin ? 'Admin' : 'Member'}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Session" desc="Sign out of this device.">
            <Button
              size="sm"
              variant="ghost"
              isDisabled={!isSignedIn || authMode !== 'firebase'}
              onPress={() => { void firebaseSignOut(); }}
            >
              Sign out
            </Button>
            {authMode !== 'firebase' && (
              <p className="mt-2 text-[11px] text-[var(--on-surface-muted)]">
                Session is managed outside the app in {authMode ?? 'this'} mode.
              </p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
