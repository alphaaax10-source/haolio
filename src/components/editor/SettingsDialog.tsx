import { useState } from 'react';
import {
  Palette,
  Grid3x3,
  MousePointerClick,
  HardDrive,
  Keyboard,
  Info,
  FolderOpen,
  Save,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSettings, type ThemeMode } from '@/lib/settings';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { openProjectFileFlow, saveProjectSnapshotFlow } from '@/lib/appFiles';
import { APP_VERSION } from '@/env';
import { useT, type LangPref } from '@/lib/i18n';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'appearance', labelKey: 'st.appearance', icon: Palette },
  { id: 'canvas', labelKey: 'st.canvas', icon: Grid3x3 },
  { id: 'editor', labelKey: 'st.editor', icon: MousePointerClick },
  { id: 'storage', labelKey: 'st.storage', icon: HardDrive },
  { id: 'shortcuts', labelKey: 'st.shortcuts', icon: Keyboard },
  { id: 'about', labelKey: 'st.about', icon: Info },
] as const;

type TabId = (typeof TABS)[number]['id'];

const SHORTCUTS: [string, string][] = [
  ['V / H', 'sc.selectHand'],
  ['T / N / S', 'sc.textStickyShape'],
  ['C / M / F', 'sc.connectorMindFrame'],
  ['TAB', 'sc.tabChild'],
  ['ENTER', 'sc.enterSibling'],
  ['SPACE', 'sc.spaceCollapse'],
  ['DELETE', 'sc.deleteSel'],
  ['CTRL+Z / CTRL+SHIFT+Z', 'sc.undoRedo'],
  ['CTRL+C · CTRL+V · CTRL+D', 'sc.clipboard'],
  ['CTRL+X', 'sc.cut'],
  ['CTRL+G / CTRL+SHIFT+G', 'sc.group'],
  ['CTRL+A', 'sc.selectAll'],
  ['CTRL+F', 'sc.search'],
  ['CTRL+S', 'sc.saveSnapshot'],
  ['CTRL+0 / CTRL+1', 'sc.zoomFit'],
  ['Scroll · Space+drag', 'sc.scrollPan'],
  ['SHIFT+F', 'sc.zoomSel'],
  ['CTRL+SHIFT+V', 'sc.pasteImage'],
];

export function SettingsDialog() {
  const open = useCanvasStore((s) => s.settingsOpen);
  const setOpen = useCanvasStore((s) => s.setSettingsOpen);
  const prefs = useSettings();
  const setPref = useSettings((s) => s.setPref);
  const data = useEditorStore((s) => s.data);
  const projects = useLibraryStore((s) => s.projects);
  const t = useT();
  const [tab, setTab] = useState<TabId>('appearance');

  const objectCount = data ? data.boards.reduce((acc, b) => acc + Object.keys(b.objects).length, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{t('top.settings')}</DialogTitle>
        <div className="flex min-h-[440px]">
          <nav className="w-44 shrink-0 space-y-0.5 border-r bg-muted/40 p-2">
            {TABS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  tab === id ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                onClick={() => setTab(id)}
              >
                <Icon className="h-4 w-4" /> {t(labelKey)}
              </button>
            ))}
          </nav>
          <div className="haolio-scroll min-w-0 flex-1 overflow-y-auto p-5">
            {tab === 'appearance' && (
              <div className="space-y-5">
                <h3 className="font-semibold">{t('st.appearance')}</h3>
                <div className="space-y-2">
                  <Label>{t('st.theme')}</Label>
                  <div className="flex gap-2">
                    {(
                      [
                        ['light', 'st.light'],
                        ['dark', 'st.dark'],
                        ['system', 'st.system'],
                      ] as [ThemeMode, string][]
                    ).map(([mode, labelKey]) => (
                      <button
                        key={mode}
                        type="button"
                        className={cn(
                          'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                          prefs.theme === mode ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                        )}
                        onClick={() => setPref('theme', mode)}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('st.language')}</Label>
                  <div className="flex gap-2">
                    {(
                      [
                        ['system', 'st.langSystem'],
                        ['en', 'English'],
                        ['id', 'Bahasa Indonesia'],
                      ] as [LangPref, string][]
                    ).map(([lang, label]) => (
                      <button
                        key={lang}
                        type="button"
                        className={cn(
                          'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                          prefs.lang === lang ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                        )}
                        onClick={() => setPref('lang', lang)}
                      >
                        {label.startsWith('st.') ? t(label) : label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'canvas' && (
              <div className="space-y-4">
                <h3 className="font-semibold">{t('st.canvas')}</h3>
                <div className="flex items-center justify-between">
                  <Label>{t('st.gridStyle')}</Label>
                  <Select value={prefs.gridStyle} onValueChange={(v) => setPref('gridStyle', v as 'dots' | 'lines')}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dots">{t('st.dots')}</SelectItem>
                      <SelectItem value="lines">{t('st.lines')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('st.gridSize')}</Label>
                  <Input
                    type="number"
                    className="w-24"
                    min={4}
                    max={200}
                    value={prefs.gridSize}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (Number.isFinite(v)) setPref('gridSize', Math.min(200, Math.max(4, v)));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('st.snap')}</Label>
                  <Switch checked={prefs.snapToGrid} onCheckedChange={(v) => setPref('snapToGrid', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t('st.minimap')}</Label>
                  <Switch checked={prefs.showMinimap} onCheckedChange={(v) => setPref('showMinimap', v)} />
                </div>
              </div>
            )}

            {tab === 'editor' && (
              <div className="space-y-4">
                <h3 className="font-semibold">{t('st.editor')}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('st.autosave')}</Label>
                    <p className="text-xs text-muted-foreground">{t('st.autosaveDesc')}</p>
                  </div>
                  <Switch checked={prefs.autosave} onCheckedChange={(v) => setPref('autosave', v)} />
                </div>
              </div>
            )}

            {tab === 'storage' && (
              <div className="space-y-4">
                <h3 className="font-semibold">{t('st.storage')}</h3>
                <div className="rounded-xl border p-4 text-sm">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-2xl font-semibold">{projects.length}</div>
                      <div className="text-xs text-muted-foreground">{t('st.projects')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{data?.boards.length ?? 0}</div>
                      <div className="text-xs text-muted-foreground">{t('st.boardsOpen')}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{objectCount}</div>
                      <div className="text-xs text-muted-foreground">{t('st.objectsOpen')}</div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t('st.storageText')}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => void saveProjectSnapshotFlow()}>
                    <Save /> {t('top.saveSnapshot')}
                  </Button>
                  <Button variant="outline" onClick={() => void openProjectFileFlow()}>
                    <FolderOpen /> {t('top.openFile')}
                  </Button>
                </div>
              </div>
            )}

            {tab === 'shortcuts' && (
              <div className="space-y-3">
                <h3 className="font-semibold">{t('st.shortcuts')}</h3>
                <div className="overflow-hidden rounded-lg border">
                  {SHORTCUTS.map(([keys, labelKey], i) => (
                    <div key={keys} className={cn('flex items-center justify-between px-3 py-1.5 text-sm', i % 2 === 0 && 'bg-muted/40')}>
                      <span className="text-muted-foreground">{t(labelKey)}</span>
                      <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'about' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg">
                  <Logo size={36} />
                </div>
                <div>
                  <div className="text-xl font-bold">{t('st.aboutName')}</div>
                  <div className="text-sm text-muted-foreground">{t('st.aboutDesc')}</div>
                  <div className="mt-1 text-sm font-medium text-primary">{t('st.aboutTag')}</div>
                </div>
                <div className="text-xs text-muted-foreground">{t('st.version', { version: APP_VERSION })}</div>
                <p className="max-w-xs text-xs text-muted-foreground">{t('st.aboutText')}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
