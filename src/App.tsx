import { useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { useLibraryStore } from '@/stores/libraryStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSettings } from '@/lib/settings';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { EditorShell } from '@/components/editor/EditorShell';

function Splash() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background">
      <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg">
        <Logo size={36} />
      </div>
      <div className="text-lg font-bold">Haolio</div>
      <div className="text-xs text-muted-foreground">Think. Map. Create.</div>
    </div>
  );
}

export default function App() {
  const hydrated = useLibraryStore((s) => s.hydrated);
  const projectId = useEditorStore((s) => s.projectId);

  useEffect(() => {
    void useSettings.getState().hydrate();
    void useLibraryStore.getState().hydrate();
  }, []);

  if (!hydrated) return <Splash />;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {projectId ? (
          <EditorShell key={projectId} onBackToDashboard={() => useLibraryStore.getState().closeProject()} />
        ) : (
          <Dashboard />
        )}
      </ThemeProvider>
    </ErrorBoundary>
  );
}
