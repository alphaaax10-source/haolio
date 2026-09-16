import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, StickyNote, Type, Square, Image as ImageIcon, Frame, Network, ArrowRight, X } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CanvasObject } from '@/lib/types';

interface ObjectHit {
  kind: 'board' | 'object';
  boardId: string;
  boardTitle: string;
  object?: CanvasObject;
}

const TYPE_ICONS: Record<string, typeof Type> = {
  text: Type,
  sticky_note: StickyNote,
  shape: Square,
  image: ImageIcon,
  frame: Frame,
  mindmap_node: Network,
  group: Square,
};

/** Local search over board names + every text-bearing object on any board. */
export function SearchPanel() {
  const open = useCanvasStore((s) => s.searchOpen);
  const setOpen = useCanvasStore((s) => s.setSearchOpen);
  const data = useEditorStore((s) => s.data);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<ObjectHit[]>(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: ObjectHit[] = [];
    for (const board of data.boards) {
      if (board.title.toLowerCase().includes(q)) {
        hits.push({ kind: 'board', boardId: board.id, boardTitle: board.title });
      }
      for (const obj of Object.values(board.objects)) {
        const text = String(obj.data.text ?? '').toLowerCase();
        if (text.includes(q)) {
          hits.push({ kind: 'object', boardId: board.id, boardTitle: board.title, object: obj });
        }
        if (hits.length > 60) break;
      }
    }
    return hits.slice(0, 24);
  }, [data, query]);

  if (!open || !data) return null;

  const jump = (hit: ObjectHit) => {
    const editor = useEditorStore.getState();
    const canvas = useCanvasStore.getState();
    canvas.setSearchOpen(false);
    if (editor.boardId !== hit.boardId) editor.selectBoard(hit.boardId);
    if (hit.object) {
      // Board switch is synchronous in the store; fetch fresh objects.
      const obj = useEditorStore.getState().objects[hit.object.id] ?? hit.object;
      editor.setSelection([obj.id]);
      canvas.centerOnRect({ x: obj.x - 40, y: obj.y - 40, width: obj.width + 80, height: obj.height + 80 }, 160);
    } else {
      editor.clearSelection();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center pt-16" onPointerDown={() => setOpen(false)}>
      <div
        className="w-[520px] max-w-[92%] overflow-hidden rounded-xl border bg-popover shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            placeholder="Search boards, notes, nodes and text…"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && results[0]) jump(results[0]);
            }}
          />
          <button type="button" className="rounded p-1 text-muted-foreground hover:bg-accent" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="haolio-scroll max-h-[340px] overflow-y-auto p-1.5">
          {query && results.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for “{query}”.</div>
          )}
          {!query && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type to search this project. Results focus the canvas when selected.
            </div>
          )}
          {results.map((hit) => {
            const Icon = hit.kind === 'board' ? Frame : hit.object ? TYPE_ICONS[hit.object.type] ?? Type : Type;
            const text = hit.kind === 'board' ? hit.boardTitle : String(hit.object?.data.text ?? '(empty)');
            const snippet = text.length > 70 ? text.slice(0, 69) + '…' : text;
            return (
              <button
                key={(hit.object?.id ?? hit.boardId) + hit.kind}
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-accent"
                onClick={() => jump(hit)}
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{snippet}</span>
                  <span className="block text-xs text-muted-foreground">
                    {hit.kind === 'board' ? 'Board' : `${TYPE_ICONS[hit.object!.type] ? hit.object!.type.replace('_', ' ') : 'object'} · ${hit.boardTitle}`}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function searchPanelClass(): string {
  return cn();
}
