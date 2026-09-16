import { useEffect, useRef } from 'react';
import { GitBranch, Network, Square, StickyNote, Type } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const MENU_WIDTH = 208;
const ITEM_HEIGHT = 34;
const OVERHEAD = 44; // header + padding

interface MakeItem {
  key: string;
  label: string;
  icon: LucideIcon;
  kind: 'child' | 'sticky' | 'text' | 'shape' | 'mind';
}

/** Create the object at the drop point and wire a connector from the source. */
function make(kind: MakeItem['kind']): void {
  const canvas = useCanvasStore.getState();
  const menu = canvas.makeMenu;
  if (!menu) return;
  canvas.closeMakeMenu();
  const editor = useEditorStore.getState();

  if (kind === 'child') {
    // Mind maps manage their own edges + layout.
    editor.addMindChild(menu.fromId);
    canvas.setTool('select');
    return;
  }

  if (kind === 'mind') {
    const rootId = editor.createObjectAt('mindmap', Math.round(menu.world.x - 90), Math.round(menu.world.y - 28));
    if (rootId) editor.connectObjects(menu.fromId, rootId);
    canvas.setTool('select');
    return;
  }

  const at =
    kind === 'text'
      ? { x: menu.world.x - 70, y: menu.world.y - 16 }
      : kind === 'shape'
        ? { x: menu.world.x - 80, y: menu.world.y - 80 }
        : { x: menu.world.x - 100, y: menu.world.y - 100 };
  const id = editor.createObjectAt(
    kind,
    Math.round(at.x),
    Math.round(at.y),
    kind === 'shape' ? { width: 160, height: 160 } : undefined,
  );
  if (id) editor.connectObjects(menu.fromId, id);
  canvas.setTool('select');
}

/**
 * Small menu shown when a connector drag is released over empty canvas:
 * "Make …" — create a sticky / text / shape / mind node right there,
 * already connected to the drag source. Escape / outside click cancels.
 */
export function MakeMenu() {
  const makeMenu = useCanvasStore((s) => s.makeMenu);
  const fromId = makeMenu?.fromId ?? null;
  const source = useEditorStore((s) => (fromId ? s.objects[fromId] : undefined));
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!makeMenu) return;
    const close = () => useCanvasStore.getState().closeMakeMenu();
    requestAnimationFrame(() => {
      ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    const onWheel = () => close();
    const onBlur = () => close();
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
      window.removeEventListener('blur', onBlur);
    };
  }, [makeMenu]);

  if (!makeMenu) return null;

  // Mind sources grow their tree; anything else can start a fresh mind map.
  const items: MakeItem[] = source?.data.mind
    ? [
        { key: 'child', label: t('cm.addChild'), icon: GitBranch, kind: 'child' },
        { key: 'sticky', label: t('tb.sticky'), icon: StickyNote, kind: 'sticky' },
        { key: 'text', label: t('tb.text'), icon: Type, kind: 'text' },
        { key: 'shape', label: t('tb.shape'), icon: Square, kind: 'shape' },
      ]
    : [
        { key: 'sticky', label: t('tb.sticky'), icon: StickyNote, kind: 'sticky' },
        { key: 'text', label: t('tb.text'), icon: Type, kind: 'text' },
        { key: 'shape', label: t('tb.shape'), icon: Square, kind: 'shape' },
        { key: 'mind', label: t('tb.mindmap'), icon: Network, kind: 'mind' },
      ];

  const left = Math.max(8, Math.min(makeMenu.x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(8, Math.min(makeMenu.y, window.innerHeight - items.length * ITEM_HEIGHT - OVERHEAD - 8));

  return (
    <div
      ref={ref}
      role="menu"
      className="animate-in fade-in-0 zoom-in-95 fixed z-[80] min-w-[208px] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
      // Renders inside the canvas container: without stopping propagation the
      // pointerdown would start a marquee + pointer capture and swallow the click.
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        e.stopPropagation();
        const items = [...ref.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          e.key === 'ArrowDown'
            ? items[(current + 1) % items.length]
            : items[(current - 1 + items.length) % items.length];
        next?.focus();
      }}
    >
      <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">{t('mk.title')}</div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={cn(
            'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm outline-none transition-colors',
            'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
          )}
          onClick={() => make(item.kind)}
        >
          <item.icon className="h-4 w-4 text-muted-foreground" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
