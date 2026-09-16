import { create } from 'zustand';
import { dbGet, dbSet } from './db';

// -----------------------------------------------------------------------------
// App-level preferences (theme, grid, autosave…) persisted locally.
// These are application preferences; per-project settings live in the project
// file itself (Project.settings).
// -----------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppPrefs {
  theme: ThemeMode;
  gridStyle: 'dots' | 'lines';
  gridSize: number;
  snapToGrid: boolean;
  autosave: boolean;
  showMinimap: boolean;
  sidebarVisible: boolean;
}

export const DEFAULT_PREFS: AppPrefs = {
  theme: 'system',
  gridStyle: 'dots',
  gridSize: 20,
  snapToGrid: false,
  autosave: true,
  showMinimap: true,
  sidebarVisible: true,
};

interface SettingsState extends AppPrefs {
  hydrated: boolean;
  setPref<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]): void;
  hydrate(): Promise<void>;
}

const PREFS_KEY = 'prefs';

export const useSettings = create<SettingsState>()((set, get) => ({
  ...DEFAULT_PREFS,
  hydrated: false,
  setPref: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    void dbSet(PREFS_KEY, {
      theme: get().theme,
      gridStyle: get().gridStyle,
      gridSize: get().gridSize,
      snapToGrid: get().snapToGrid,
      autosave: get().autosave,
      showMinimap: get().showMinimap,
      sidebarVisible: get().sidebarVisible,
    });
  },
  hydrate: async () => {
    const stored = (await dbGet<Partial<AppPrefs>>(PREFS_KEY)) ?? {};
    set({ ...DEFAULT_PREFS, ...stored, hydrated: true });
  },
}));
