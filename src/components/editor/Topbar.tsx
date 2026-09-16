import { useState } from 'react';
import {
  FilePlus2,
  FolderOpen,
  Undo2,
  Redo2,
  Search,
  Settings,
  PanelLeft,
  Image as ImageIcon,
  FileJson,
  Save,
  Moon,
  Sun,
  CircleAlert,
  Check,
  Loader2,
  Menu,
  FileText,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RenameDialog } from '@/components/RenameDialog';
import { emitUiEvent } from '@/lib/uiEvents';
import { cn } from '@/lib/utils';
import type { ExportScope } from '@/lib/exporter';
import { useT } from '@/lib/i18n';

function SaveStatus() {
  const status = useEditorStore((s) => s.saveStatus);
  const t = useT();
  const retry = () => {
    emitUiEvent('flush-save');
  };
  return (
    <button
      type="button"
      onClick={status === 'error' ? retry : undefined}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground',
        status === 'error' && 'bg-destructive/10 text-destructive hover:bg-destructive/20',
      )}
      title={status === 'error' ? t('top.saveFailedTitle') : undefined}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('top.saving')}
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" /> {t('top.saved')}
        </>
      )}
      {status === 'error' && (
        <>
          <CircleAlert className="h-3.5 w-3.5" /> {t('top.saveFailed')}
        </>
      )}
      {status === 'idle' && null}
    </button>
  );
}

export function Topbar({ onBackToDashboard }: { onBackToDashboard: () => void }) {
  const projectName = useEditorStore((s) => s.data?.project.name ?? '');
  const boardId = useEditorStore((s) => s.boardId);
  const boardTitle = useEditorStore((s) => s.data?.boards.find((b) => b.id === s.boardId)?.title ?? '');
  const canUndo = useEditorStore((s) => s.history.undo.length > 0);
  const canRedo = useEditorStore((s) => s.history.redo.length > 0);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const sidebarVisible = useSettings((s) => s.sidebarVisible);
  const setPref = useSettings((s) => s.setPref);
  const theme = useSettings((s) => s.theme);
  const t = useT();
  const [renameOpen, setRenameOpen] = useState(false);

  return (
    <header className="z-30 flex h-12 shrink-0 items-center gap-1 border-b bg-card px-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('top.appMenu')}>
            <Menu className="h-4.5 w-4.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span className="text-base">◈</span> Haolio
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onBackToDashboard}>
            <FilePlus2 /> {t('top.newProject')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => emitUiEvent('open-project-file')}>
            <FolderOpen /> {t('top.openFile')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => emitUiEvent('save-project')}>
            <Save /> {t('top.saveSnapshot')}
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+S</span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ImageIcon /> {t('top.exportBoard')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              <DropdownMenuLabel>{t('top.scope')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => emitUiEvent('export-png-board')}>
                <ImageIcon /> {t('top.pngBoard')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => emitUiEvent('export-svg-board')}>
                <ImageIcon /> {t('top.svgBoard')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('top.scopeSel')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => emitUiEvent('export-png-selection')}>
                <ImageIcon /> {t('top.pngSel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => emitUiEvent('export-svg-selection')}>
                <ImageIcon /> {t('top.svgSel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => emitUiEvent('export-png-viewport')}>
                <ImageIcon /> {t('top.pngViewport')}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => emitUiEvent('export-pdf-board')}>
            <FileText /> {t('top.pdfBoard')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => emitUiEvent('export-pdf-selection')}>
            <FileText /> {t('top.pdfSel')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => emitUiEvent('export-json')}>
            <FileJson /> {t('top.exportJson')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useCanvasStore.getState().setSettingsOpen(true)}>
            <Settings /> {t('top.settings')}
            <span className="ml-auto text-xs text-muted-foreground">Ctrl+,</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        className="ml-1 flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
        onClick={() => setRenameOpen(true)}
        title={t('dash.renameProject')}
      >
        <span className="text-sm font-semibold text-primary">◈</span>
        <span className="max-w-[220px] truncate text-sm font-semibold">{projectName}</span>
      </button>
      <span className="text-sm text-muted-foreground">/</span>
      <span className="max-w-[200px] truncate text-sm text-muted-foreground">{boardTitle}</span>

      <div className="mx-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('common.undo')} disabled={!canUndo} onClick={undo}>
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('top.ttUndo')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('common.redo')} disabled={!canRedo} onClick={redo}>
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('top.ttRedo')}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1">
        <SaveStatus />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.search')}
              onClick={() => useCanvasStore.getState().setSearchOpen(true)}
            >
              <Search />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('top.ttSearch')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('top.ttBoards')}
              onClick={() => setPref('sidebarVisible', !sidebarVisible)}
            >
              <PanelLeft className={cn(!sidebarVisible && 'opacity-50')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('top.ttBoards')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('dash.lightDark')}
              onClick={() => {
                const isDark = document.documentElement.classList.contains('dark');
                setPref('theme', isDark ? 'light' : 'dark');
                void theme;
              }}
            >
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('dash.lightDark')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('top.settings')}
              onClick={() => useCanvasStore.getState().setSettingsOpen(true)}
            >
              <Settings />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('top.settings')}</TooltipContent>
        </Tooltip>
      </div>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={t('dash.renameProject')}
        initial={projectName}
        onCommit={(name) => {
          const editor = useEditorStore.getState();
          if (editor.projectId) {
            useLibraryStore.getState().renameProject(editor.projectId, name);
          }
        }}
      />
    </header>
  );
}

export type { ExportScope };
