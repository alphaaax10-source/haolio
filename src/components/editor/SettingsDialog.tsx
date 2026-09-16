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
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'canvas', label: 'Canvas', icon: Grid3x3 },
  { id: 'editor', label: 'Editor', icon: MousePointerClick },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
] as const;

type TabId = (typeof TABS)[number]['id'];

const SHORTCUTS: [string, string][] = [
  ['V / H', 'Select / Hand tool'],
  ['T / N / S', 'Text / Sticky note / Shape'],
  ['C / M / F', 'Connector / Mind map / Frame'],
  ['TAB', 'Mind map: add child node'],
  ['ENTER', 'Mind map: add sibling node'],
  ['SPACE', 'Mind map: collapse · hold to pan'],
  ['DELETE', 'Delete selection'],
  ['CTRL+Z / CTRL+SHIFT+Z', 'Undo / Redo'],
  ['CTRL+C · CTRL+V · CTRL+D', 'Copy · Paste · Duplicate'],
  ['CTRL+X', 'Cut'],
  ['CTRL+G / CTRL+SHIFT+G', 'Group / Ungroup'],
  ['CTRL+A', 'Select all'],
  ['CTRL+F', 'Search'],
  ['CTRL+S', 'Save .haolio snapshot'],
  ['CTRL+0 / CTRL+1', 'Zoom 100% / Fit board'],
  ['Scroll · Space+drag', 'Zoom · Pan'],
];

export function SettingsDialog() {
  const open = useCanvasStore((s) => s.settingsOpen);
  const setOpen = useCanvasStore((s) => s.setSettingsOpen);
  const prefs = useSettings();
  const setPref = useSettings((s) => s.setPref);
  const data = useEditorStore((s) => s.data);
  const projects = useLibraryStore((s) => s.projects);
  const [tab, setTab] = useState<TabId>('appearance');

  const objectCount = data ? data.boards.reduce((acc, b) => acc + Object.keys(b.objects).length, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-[440px]">
          <nav className="w-44 shrink-0 space-y-0.5 border-r bg-muted/40 p-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  tab === id ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                onClick={() => setTab(id)}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </nav>
          <div className="haolio-scroll min-w-0 flex-1 overflow-y-auto p-5">
            {tab === 'appearance' && (
              <div className="space-y-5">
                <h3 className="font-semibold">Appearance</h3>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    {(
                      [
                        ['light', 'Light'],
                        ['dark', 'Dark'],
                        ['system', 'System'],
                      ] as [ThemeMode, string][]
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        className={cn(
                          'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors',
                          prefs.theme === mode ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                        )}
                        onClick={() => setPref('theme', mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'canvas' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Canvas</h3>
                <div className="flex items-center justify-between">
                  <Label>Grid style</Label>
                  <Select value={prefs.gridStyle} onValueChange={(v) => setPref('gridStyle', v as 'dots' | 'lines')}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dots">Dots</SelectItem>
                      <SelectItem value="lines">Lines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Grid size</Label>
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
                  <div>
                    <Label>Snap to grid</Label>
                    <p className="text-xs text-muted-foreground">Objects snap to the grid while dragging.</p>
                  </div>
                  <Switch checked={prefs.snapToGrid} onCheckedChange={(v) => setPref('snapToGrid', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show minimap</Label>
                  <Switch checked={prefs.showMinimap} onCheckedChange={(v) => setPref('showMinimap', v)} />
                </div>
              </div>
            )}

            {tab === 'editor' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Editor</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autosave</Label>
                    <p className="text-xs text-muted-foreground">
                      Continuously save your work to this computer. A manual snapshot can always be written to a .haolio file.
                    </p>
                  </div>
                  <Switch checked={prefs.autosave} onCheckedChange={(v) => setPref('autosave', v)} />
                </div>
              </div>
            )}

            {tab === 'storage' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Storage</h3>
                <div className="rounded-xl border p-4 text-sm">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-2xl font-semibold">{projects.length}</div>
                      <div className="text-xs text-muted-foreground">Projects</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{data?.boards.length ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Boards (open)</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">{objectCount}</div>
                      <div className="text-xs text-muted-foreground">Objects (open)</div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  All projects live in Haolio's local database on this computer. Nothing is uploaded — Haolio works fully offline.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => void saveProjectSnapshotFlow()}>
                    <Save /> Save .haolio snapshot
                  </Button>
                  <Button variant="outline" onClick={() => void openProjectFileFlow()}>
                    <FolderOpen /> Open .haolio file
                  </Button>
                </div>
              </div>
            )}

            {tab === 'shortcuts' && (
              <div className="space-y-3">
                <h3 className="font-semibold">Keyboard shortcuts</h3>
                <div className="overflow-hidden rounded-lg border">
                  {SHORTCUTS.map(([keys, label], i) => (
                    <div key={keys} className={cn('flex items-center justify-between px-3 py-1.5 text-sm', i % 2 === 0 && 'bg-muted/40')}>
                      <span className="text-muted-foreground">{label}</span>
                      <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'about' && (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-3xl text-white shadow-lg">
                  ◈
                </div>
                <div>
                  <div className="text-xl font-bold">Haolio</div>
                  <div className="text-sm text-muted-foreground">Offline Infinite Canvas &amp; Mind Mapping</div>
                  <div className="mt-1 text-sm font-medium text-primary">Think. Map. Create.</div>
                </div>
                <div className="text-xs text-muted-foreground">Version {APP_VERSION}</div>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Haolio runs entirely on your machine. No account, no cloud, no tracking — your ideas never leave this PC.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
