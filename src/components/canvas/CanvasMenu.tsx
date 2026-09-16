import { useEffect, useRef } from 'react';
import {
  Spline,
  Circle,
  ChevronsRight,
  Copy,
  Scissors as Cut,
  CopyPlus as Duplicate,
  Trash2,
  ChevronsUp,
  ChevronsDown,
  GitBranch,
  Group,
  Ungroup,
  ArrowRight,
  ArrowDown,
  Orbit,
  Minus,
  Plus,
  StickyNote,
  Network,
  Type,
  ClipboardPaste,
  Layers,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { toast } from '@/stores/toastStore';
import { cn } from '@/lib/utils';
import type { CanvasObject } from '@/lib/types';

// -----------------------------------------------------------------------------
// Purpose-built right-click menu for the canvas (objects + background).
//
// Deliberately NOT a Radix ContextMenu: portal/DismissableLayer/scroll-lock
// machinery proved environment-sensitive (embedded iframes swallowed item
// clicks). This is a plain, fully-controlled overlay: real buttons, real
// onClick, closes on outside pointerdown / Escape / wheel / tool change.
// -----------------------------------------------------------------------------

interface MenuItemDef {
  label: string;
  icon?: typeof Copy;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action?: () => void;
}

interface MenuSection {
  items: MenuItemDef[];
}

function close(): void {
  useCanvasStore.getState().closeContextMenu();
}

function edgeSections(edgeId: string): MenuSection[] {
  const editor = () => useEditorStore.getState();
  return [
    {
      items: [
        { label: 'Straight line', icon: Minus, action: () => editor().setEdgeRoute([edgeId], 'straight') },
        { label: 'Curved line', icon: Spline, action: () => editor().setEdgeRoute([edgeId], 'curved') },
        { label: 'Elbow line', icon: Spline, action: () => editor().setEdgeRoute([edgeId], 'elbow') },
      ],
    },
    {
      items: [
        { label: 'No arrow', icon: Circle, action: () => editor().setEdgeArrow([edgeId], 'none') },
        { label: 'Arrow', icon: ArrowRight, action: () => editor().setEdgeArrow([edgeId], 'arrow') },
        { label: 'Double arrow', icon: ChevronsRight, action: () => editor().setEdgeArrow([edgeId], 'double') },
      ],
    },
    {
      items: [
        {
          label: 'Delete connection',
          icon: Trash2,
          shortcut: 'Del',
          danger: true,
          action: () => editor().deleteEdgesByIds([edgeId]),
        },
      ],
    },
  ];
}

function buildSections(obj: CanvasObject | null, edgeId: string | null, selectionCount: number): MenuSection[] {
  if (edgeId && !obj) return edgeSections(edgeId);
  if (!obj) {
    // Background menu.
    return [
      {
        items: [
          { label: 'New sticky note', icon: StickyNote, shortcut: 'N', action: () => useCanvasStore.getState().setTool('sticky') },
          { label: 'New mind map', icon: Network, shortcut: 'M', action: () => useCanvasStore.getState().setTool('mindmap') },
          { label: 'New text', icon: Type, shortcut: 'T', action: () => useCanvasStore.getState().setTool('text') },
        ],
      },
      {
        items: [
          {
            label: 'Paste',
            icon: ClipboardPaste,
            shortcut: 'Ctrl+V',
            action: () => {
              if (!useEditorStore.getState().pasteClipboard()) toast.info('Clipboard is empty');
            },
          },
          {
            label: 'Select all',
            icon: Layers,
            shortcut: 'Ctrl+A',
            action: () => useEditorStore.getState().selectAll(),
          },
        ],
      },
    ];
  }

  const editor = () => useEditorStore.getState();
  // Selection-facing actions always guarantee the right-clicked object is in
  // the selection first, so they behave correctly even if the selection was
  // cleared between opening the menu and clicking an entry.
  const withTargetSelected = (fn: () => void) => {
    const e = editor();
    if (!e.selection.objects.includes(obj.id)) e.setSelection([obj.id]);
    fn();
  };
  const isMind = obj.type === 'mindmap_node';
  const isRoot = isMind && !obj.data.mind?.parentId;
  const hasChildren = (obj.data.mind?.childCount ?? 0) > 0;
  const mindRootId = () => obj.data.mind?.rootId ?? obj.id;

  const sections: MenuSection[] = [];

  if (isMind) {
    const mindItems: MenuItemDef[] = [
      {
        label: 'Add child',
        icon: GitBranch,
        shortcut: 'Tab',
        action: () => editor().addMindChild(obj.id),
      },
    ];
    if (!isRoot) {
      mindItems.push({
        label: 'Add sibling',
        icon: GitBranch,
        shortcut: 'Enter',
        action: () => editor().addMindSibling(obj.id),
      });
    }
    if (hasChildren) {
      mindItems.push({
        label: obj.data.mind?.collapsed ? 'Expand branch' : 'Collapse branch',
        icon: obj.data.mind?.collapsed ? Plus : Minus,
        shortcut: 'Space',
        action: () => editor().toggleCollapse(obj.id),
      });
    }
    sections.push({ items: mindItems });
    sections.push({
      items: [
        { label: 'Layout: Horizontal', icon: ArrowRight, action: () => editor().setMindLayout(mindRootId(), 'horizontal') },
        { label: 'Layout: Vertical', icon: ArrowDown, action: () => editor().setMindLayout(mindRootId(), 'vertical') },
        { label: 'Layout: Radial', icon: Orbit, action: () => editor().setMindLayout(mindRootId(), 'radial') },
      ],
    });
  }

  sections.push({
    items: [
      { label: 'Copy', icon: Copy, shortcut: 'Ctrl+C', action: () => withTargetSelected(() => editor().copySelection()) },
      { label: 'Cut', icon: Cut, shortcut: 'Ctrl+X', action: () => withTargetSelected(() => editor().cutSelection()) },
      { label: 'Duplicate', icon: Duplicate, shortcut: 'Ctrl+D', action: () => withTargetSelected(() => editor().duplicateSelection()) },
    ],
  });

  sections.push({
    items: [
      { label: 'Bring to front', icon: ChevronsUp, action: () => editor().reorder([obj.id], 'front') },
      { label: 'Send to back', icon: ChevronsDown, action: () => editor().reorder([obj.id], 'back') },
    ],
  });

  sections.push({
    items: [
      {
        label: 'Group selection',
        icon: Group,
        disabled: selectionCount < 2,
        action: () => editor().group(editor().selection.objects),
      },
      // (withTargetSelected is used by copy/cut/duplicate/delete)
      {
        label: 'Ungroup',
        icon: Ungroup,
        disabled: obj.type !== 'group' && !obj.parentId,
        action: () => editor().ungroup([obj.id]),
      },
    ],
  });

  sections.push({
    items: [
      {
        label: 'Delete',
        icon: Trash2,
        shortcut: 'Del',
        danger: true,
        action: () => (isMind ? editor().deleteMindNodes([obj.id]) : editor().deleteObjectsByIds([obj.id])),
      },
    ],
  });

  return sections;
}

const MENU_WIDTH = 236;
const ITEM_HEIGHT = 30;
const SECTION_OVERHEAD = 9;

/** The right-click menu itself. Mounted once by <Canvas/>, state-driven. */
export function CanvasMenu() {
  const contextMenu = useCanvasStore((s) => s.contextMenu);
  const objId = contextMenu?.objId ?? null;
  const edgeId = contextMenu?.edgeId ?? null;
  const obj = useEditorStore((s) => (objId ? s.objects[objId] : undefined));
  const selectionCount = useEditorStore((s) => s.selection.objects.length);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    // Focus the first enabled entry so arrow-key navigation works right away.
    requestAnimationFrame(() => {
      ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
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
  }, [contextMenu]);

  if (!contextMenu) return null;

  const sections = buildSections(obj ?? null, edgeId, selectionCount);
  const estimatedHeight = sections.reduce((acc, s) => acc + s.items.length * ITEM_HEIGHT + SECTION_OVERHEAD, 4);
  const left = Math.max(8, Math.min(contextMenu.x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(8, Math.min(contextMenu.y, window.innerHeight - estimatedHeight - 8));

  return (
    <div
      ref={ref}
      role="menu"
      className="animate-in fade-in-0 zoom-in-95 fixed z-[80] min-w-[236px] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
      // The menu renders inside the canvas container; without stopping
      // propagation its pointerdown would bubble into the canvas gesture
      // handler (marquee + pointer capture), which retargets the pointerup
      // and swallows the button's click event entirely.
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        e.stopPropagation();
        const items = [
          ...ref.current!.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
        ];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          e.key === 'ArrowDown'
            ? items[(current + 1) % items.length]
            : items[(current - 1 + items.length) % items.length];
        next?.focus();
      }}
    >
      {sections.map((section, si) => (
        <div key={si} className={cn(si > 0 && 'mt-1 border-t pt-1')}>
          {section.items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              // preventDefault on mousedown keeps focus stable so the click
              // always lands on the button itself.
              onMouseDown={(e) => e.preventDefault()}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors',
                item.disabled
                  ? 'cursor-default opacity-40'
                  : item.danger
                    ? 'text-destructive hover:bg-destructive hover:text-destructive-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
              )}
              onClick={() => {
                if (item.disabled) return;
                close();
                item.action?.();
              }}
            >
              {item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && <span className="shrink-0 text-xs tracking-widest text-muted-foreground">{item.shortcut}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
