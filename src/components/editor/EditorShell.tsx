import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useSettings } from '@/lib/settings';
import { useWindowTitle } from '@/components/ThemeProvider';
import { useShortcuts } from '@/hooks/useShortcuts';
import { registerUiEvent, emitUiEvent } from '@/lib/uiEvents';
import {
  exportBoardImageFlow,
  exportProjectJsonFlow,
  openProjectFileFlow,
  saveProjectSnapshotFlow,
} from '@/lib/appFiles';
import { toast } from '@/stores/toastStore';
import { isTauri } from '@/lib/bridge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Topbar } from './Topbar';
import { Toolbar } from './Toolbar';
import { BoardsSidebar } from './BoardsSidebar';
import { PropertiesPanel } from './PropertiesPanel';
import { ViewportControls } from './ViewportControls';
import { SearchPanel } from './SearchPanel';
import { SettingsDialog } from './SettingsDialog';
import { Toaster } from '@/components/Toaster';
import { Canvas } from '@/components/canvas/Canvas';

const AUTOSAVE_DEBOUNCE_MS = 700;

export function EditorShell({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const projectId = useEditorStore((s) => s.projectId);
  const projectName = useEditorStore((s) => s.data?.project.name ?? null);
  const hydrated = useRef(false);
  useWindowTitle(projectName);
  useShortcuts(true);

  // Center the viewport on first mount of a project.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const { size, setViewport } = useCanvasStore.getState();
    setViewport({ x: size.width / 2 - 80, y: size.height / 2 - 60, zoom: 1 });
  }, []);

  // --- Autosave engine -------------------------------------------------------
  // Document edits bump `rev`; this watcher debounces a write of the working
  // copy to the local database and surfaces Saving…/Saved/failure states.
  useEffect(() => {
    if (!projectId) return;
    let timer: number | undefined;
    let latestData = useEditorStore.getState().data;

    const flushNow = async () => {
      window.clearTimeout(timer);
      const state = useEditorStore.getState();
      if (!state.projectId || !latestData) return;
      try {
        await useLibraryStore.getState().persistWorkingCopy(state.projectId, latestData);
        useEditorStore.getState().setSaveStatus('saved');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        useEditorStore.getState().setSaveStatus('error', message);
        toast.error('Unable to save project.', {
          actionLabel: 'Retry',
          onAction: () => void flushNow(),
        });
      }
    };

    const schedule = () => {
      if (!useSettings.getState().autosave) return;
      const state = useEditorStore.getState();
      if (state.saveStatus !== 'saving') state.setSaveStatus('saving');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void flushNow(), AUTOSAVE_DEBOUNCE_MS);
    };

    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (!state.data) return;
      if (state.rev !== prev.rev) {
        latestData = state.data;
        schedule();
      }
    });

    const flushListener = registerUiEvent('flush-save', () => void flushNow());
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditorStore.getState().saveStatus === 'saving') {
        void flushNow();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flushNow();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);

    // Desktop shell: the native close button bypasses beforeunload, so
    // intercept the close request, finish the pending save, then close.
    let unlistenClose: (() => void) | undefined;
    if (isTauri()) {
      void (async () => {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
            if (useEditorStore.getState().saveStatus === 'saving') {
              event.preventDefault();
              await flushNow();
              void getCurrentWindow().destroy();
            }
          });
        } catch {
          // Window API unavailable — beforeunload/visibility still cover it.
        }
      })();
    }

    return () => {
      unsubscribe();
      flushListener();
      unlistenClose?.();
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
      // Persist anything pending when leaving the editor.
      if (latestData) void useLibraryStore.getState().persistWorkingCopy(projectId, latestData).catch(() => undefined);
    };
  }, [projectId]);

  // --- Menu / shortcut-driven flows ------------------------------------------
  useEffect(() => {
    const offs = [
      registerUiEvent('save-project', () => void saveProjectSnapshotFlow()),
      registerUiEvent('open-project-file', () => void openProjectFileFlow()),
      registerUiEvent('export-json', () => void exportProjectJsonFlow()),
      registerUiEvent('export-png-board', () => void exportBoardImageFlow('png', 'board')),
      registerUiEvent('export-svg-board', () => void exportBoardImageFlow('svg', 'board')),
      registerUiEvent('export-png-selection', () => {
        if (useEditorStore.getState().selection.objects.length === 0) toast.info('Select objects to export a selection.');
        else void exportBoardImageFlow('png', 'selection');
      }),
      registerUiEvent('export-svg-selection', () => {
        if (useEditorStore.getState().selection.objects.length === 0) toast.info('Select objects to export a selection.');
        else void exportBoardImageFlow('svg', 'selection');
      }),
      registerUiEvent('export-png-viewport', () => void exportBoardImageFlow('png', 'viewport')),
      registerUiEvent('toggle-search', () => useCanvasStore.getState().setSearchOpen(!useCanvasStore.getState().searchOpen)),
      registerUiEvent('toggle-settings', () => useCanvasStore.getState().setSettingsOpen(!useCanvasStore.getState().settingsOpen)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // Escape/close plumbing for overlays handled locally below.
  const searchOpen = useCanvasStore((s) => s.searchOpen);

  return (
    <TooltipProvider delayDuration={350}>
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <Topbar onBackToDashboard={onBackToDashboard} />
        <div className="relative flex min-h-0 flex-1">
          <BoardsSidebar />
          <div className="relative min-w-0 flex-1">
            <Canvas />
            <Toolbar />
            <ViewportControls />
            {searchOpen && <SearchPanel />}
          </div>
          <PropertiesPanel />
        </div>
        <SettingsDialog />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export { emitUiEvent };
