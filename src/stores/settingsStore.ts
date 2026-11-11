import { create } from 'zustand';
import type { Timeframe } from '@/types';
import { acceptsScreenWrite, getStorageMode, onStorageChange, readScoped, writeScoped } from '@/lib/authGate';

export type NavPattern = 'top-tabs' | 'sidebar';
export type Density = 'comfy' | 'default' | 'dense';
export type Accent =
  | 'dawn'
  | 'blue'
  | 'amber'
  | 'violet'
  | 'cyan'
  | 'teal'
  | 'pink'
  | 'magenta'
  | 'orange'
  | 'yellow'
  | 'indigo'
  | 'rose';

export const ACCENTS: Accent[] = [
  'dawn',
  'blue',
  'amber',
  'violet',
  'cyan',
  'teal',
  'pink',
  'magenta',
  'orange',
  'yellow',
  'indigo',
  'rose',
];

const STORAGE_KEY = 'platform-shell-settings';

interface Persisted {
  navPattern: NavPattern;
  density: Density;
  accent: Accent;
}

// Dense is the product default (Bloomberg-terminal information density); users
// can switch to default/comfy in Settings, which persists over this.
const DEFAULTS: Persisted = { navPattern: 'top-tabs', density: 'dense', accent: 'dawn' };

/**
 * The values for the current account-scoped storage state (authGate.ts,
 * FEAT-AUTH-001): null while storage is pending (nothing is read or applied),
 * otherwise the stored values for the current mode and account over the
 * product defaults.
 */
function loadPersisted(): Persisted | null {
  if (getStorageMode() === 'pending') return null;
  const raw = readScoped(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    // An unparseable stored preference is a display choice we cannot read,
    // not data: the product defaults render, as on main.
    return DEFAULTS;
  }
}

/** Density + accent ride on <body> classes so CSS variables cascade globally. */
function applyShellClasses(density: Density, accent: Accent) {
  if (typeof document === 'undefined') return;
  const body = document.body;
  // Snapshot the class list before mutating it: removing items during a
  // live forEach shifts indices and skips every other match, leaving stale
  // density-*/accent-* classes on <body> that override the new ones by CSS
  // source order.
  const stale = Array.from(body.classList).filter(
    (c) => c.startsWith('density-') || c.startsWith('accent-'),
  );
  for (const c of stale) body.classList.remove(c);
  body.classList.add(`density-${density}`, `accent-${accent}`);
}

function persist(next: Persisted) {
  // Stores nothing while pending or with no account; storage failures are
  // non-fatal inside writeScoped.
  writeScoped(STORAGE_KEY, JSON.stringify(next));
}

interface SettingsState extends Persisted {
  // Pre-existing fields (preserved)
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  // Shell chrome
  setNavPattern: (p: NavPattern) => void;
  setDensity: (d: Density) => void;
  setAccent: (a: Accent) => void;
}

const loaded = loadPersisted();
if (loaded) applyShellClasses(loaded.density, loaded.accent);
const initial: Persisted = loaded ?? DEFAULTS;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  timeframe: '5',
  setTimeframe: (timeframe) => set({ timeframe }),
  soundEnabled: true,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  setNavPattern: (navPattern) => {
    if (!acceptsScreenWrite()) return;
    const { density, accent } = get();
    persist({ navPattern, density, accent });
    set({ navPattern });
  },
  setDensity: (density) => {
    if (!acceptsScreenWrite()) return;
    const { navPattern, accent } = get();
    applyShellClasses(density, accent);
    persist({ navPattern, density, accent });
    set({ density });
  },
  setAccent: (accent) => {
    if (!acceptsScreenWrite()) return;
    const { navPattern, density } = get();
    applyShellClasses(density, accent);
    persist({ navPattern, density, accent });
    set({ accent });
  },
}));

// Reload on every storage event: the mode settling, the first account report
// and each later account change.
onStorageChange(() => {
  const next = loadPersisted();
  if (!next) return;
  applyShellClasses(next.density, next.accent);
  useSettingsStore.setState(next);
});
