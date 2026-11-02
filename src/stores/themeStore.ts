import { create } from 'zustand';
import { acceptsScreenWrite, getStorageMode, onStorageChange, readScoped, writeScoped } from '@/lib/authGate';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'platform-theme';

// Dark is the product default (Obsidian Analyst), regardless of OS preference.
// Users who explicitly pick light keep it via the stored value.
const DEFAULT_THEME: Theme = 'dark';

/**
 * The theme for the current account-scoped storage state (authGate.ts,
 * FEAT-AUTH-001): null while storage is pending (nothing is read or applied),
 * otherwise the stored choice for the current mode and account, or the
 * product default when there is none.
 */
function loadTheme(): Theme | null {
  if (getStorageMode() === 'pending') return null;
  const stored = readScoped(STORAGE_KEY);
  return stored === 'dark' || stored === 'light' ? stored : DEFAULT_THEME;
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const loaded = loadTheme();
if (loaded) applyThemeToDocument(loaded);
const initial: Theme = loaded ?? DEFAULT_THEME;

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  setTheme: (theme) => {
    if (!acceptsScreenWrite()) return;
    writeScoped(STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    set({ theme });
  },
  toggleTheme: () => {
    if (!acceptsScreenWrite()) return;
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      writeScoped(STORAGE_KEY, next);
      applyThemeToDocument(next);
      return { theme: next };
    });
  },
}));

// Reload on every storage event: the mode settling, the first account report
// and each later account change.
onStorageChange(() => {
  const theme = loadTheme();
  if (!theme) return;
  applyThemeToDocument(theme);
  useThemeStore.setState({ theme });
});
