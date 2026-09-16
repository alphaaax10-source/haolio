import { useEffect } from 'react';
import { useSettings, type ThemeMode } from '@/lib/settings';

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies the light/dark/system preference to <html> and tracks the OS theme. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettings((s) => s.theme);

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(useSettings.getState().theme);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  return <>{children}</>;
}

/** Keeps the native window title in sync with the open project. */
export function useWindowTitle(projectName: string | null): void {
  useEffect(() => {
    const title = projectName ? `Haolio — ${projectName}` : 'Haolio';
    void import('@/lib/bridge').then(({ setWindowTitle }) => setWindowTitle(title));
  }, [projectName]);
}
