import { useState } from 'react';
import { FolderOpen, MoreHorizontal, Pencil, Plus, Trash2, Moon, Sun, Clock } from 'lucide-react';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSettings } from '@/lib/settings';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RenameDialog } from '@/components/RenameDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NewProjectDialog } from './NewProjectDialog';
import { Toaster } from '@/components/Toaster';
import { openProjectFileFlow } from '@/lib/appFiles';
import { plural, useT, type Translate } from '@/lib/i18n';
import { APP_VERSION } from '@/env';
import type { ProjectRecord } from '@/lib/types';

function timeAgo(iso: string, t: Translate): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('dash.justNow');
  if (minutes < 60) return t('dash.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('dash.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('dash.daysAgo', { n: days });
  return new Date(iso).toLocaleDateString();
}

export function Dashboard({ onProjectOpened }: { onProjectOpened?: () => void }) {
  const t = useT();
  const projects = useLibraryStore((s) => s.projects);
  const openProject = useLibraryStore((s) => s.openProject);
  const renameProject = useLibraryStore((s) => s.renameProject);
  const removeProject = useLibraryStore((s) => s.removeProject);
  const theme = useSettings((s) => s.theme);
  const setPref = useSettings((s) => s.setPref);
  const [newOpen, setNewOpen] = useState(false);
  const [renaming, setRenaming] = useState<ProjectRecord | null>(null);
  const [removing, setRemoving] = useState<ProjectRecord | null>(null);

  const open = (id: string) => {
    void openProject(id).then(() => onProjectOpened?.());
  };

  return (
    <TooltipProvider delayDuration={350}>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-end p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('dash.lightDark')}
                onClick={() => setPref('theme', document.documentElement.classList.contains('dark') ? 'light' : 'dark')}
              >
                <Sun className="hidden dark:block" />
                <Moon className="dark:hidden" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('dash.lightDark')}</TooltipContent>
          </Tooltip>
        </div>

        <main className="haolio-scroll mx-auto flex w-full max-w-2xl flex-1 flex-col items-center overflow-y-auto px-6 pb-10">
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-3xl text-white shadow-lg">
              ◈
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Haolio</h1>
            <p className="mt-1 text-sm text-muted-foreground">Think. Map. Create.</p>
          </div>

          <div className="mt-6 flex gap-2">
            <Button size="lg" onClick={() => setNewOpen(true)}>
              <Plus /> {t('dash.newProject')}
            </Button>
            <Button size="lg" variant="outline" onClick={() => void openProjectFileFlow()}>
              <FolderOpen /> {t('dash.openProject')}
            </Button>
          </div>

          <div className="mt-10 w-full">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('dash.recent')}
            </h2>
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('dash.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="group relative cursor-pointer rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    onClick={() => open(p.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') open(p.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
                        style={{ background: p.color }}
                      >
                        ◈
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{p.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {timeAgo(p.lastOpenedAt, t)}
                          <span>·</span> {plural(t, 'dash.boards', p.boardCount)}
                          <span>·</span> {t('dash.objects', { n: p.objectCount })}
                        </div>
                      </div>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="iconSm" aria-label={t('dash.optionsFor', { name: p.name })}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); open(p.id); }}>
                            {t('common.open')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenaming(p); }}>
                            <Pencil /> {t('common.rename')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setRemoving(p); }}
                          >
                            <Trash2 /> {t('dash.removeFromList')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          {t('dash.footer', { version: APP_VERSION })}
        </footer>

        <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} />
        <RenameDialog
          open={!!renaming}
          onOpenChange={(o) => !o && setRenaming(null)}
          title={t('dash.renameProject')}
          initial={renaming?.name ?? ''}
          onCommit={(name) => renaming && renameProject(renaming.id, name)}
        />
        <ConfirmDialog
          open={!!removing}
          onOpenChange={(o) => !o && setRemoving(null)}
          title={t('dash.removeTitle', { name: removing?.name ?? '' })}
          description={t('dash.removeDesc')}
          confirmLabel={t('dash.deleteProject')}
          destructive
          onConfirm={() => removing && void removeProject(removing.id)}
        />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
