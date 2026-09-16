import { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { Board } from '@/lib/types';

export function BoardsSidebar() {
  const visible = useEditorStore((s) => !!s.data);
  const boards = useEditorStore((s) => s.data?.boards ?? []);
  const boardId = useEditorStore((s) => s.boardId);
  const selectBoard = useEditorStore((s) => s.selectBoard);
  const addBoard = useEditorStore((s) => s.addBoard);
  const renameBoard = useEditorStore((s) => s.renameBoard);
  const duplicateBoard = useEditorStore((s) => s.duplicateBoard);
  const deleteBoard = useEditorStore((s) => s.deleteBoard);
  const moveBoard = useEditorStore((s) => s.moveBoard);
  const objects = useEditorStore((s) => s.objects);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [deleting, setDeleting] = useState<Board | null>(null);

  // Re-render on active board switch so object counts refresh.
  void objects;
  const data = useEditorStore.getState().data;

  const commitRename = (id: string) => {
    const title = draft.trim();
    if (title) renameBoard(id, title);
    setRenamingId(null);
  };

  const startRename = (board: Board) => {
    setDraft(board.title);
    setRenamingId(board.id);
  };

  useEffect(() => {
    if (!renamingId) return;
    const el = document.querySelector<HTMLInputElement>(`[data-board-rename="${renamingId}"]`);
    el?.focus();
    el?.select();
  }, [renamingId]);

  if (!visible) return null;

  const item = (board: Board) => {
    const count = data?.boards.find((b) => b.id === board.id)?.objects
      ? Object.keys(data.boards.find((b) => b.id === board.id)!.objects).length
      : 0;
    const isRenaming = renamingId === board.id;
    return (
      <ContextMenu key={board.id}>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
              board.id === boardId ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-accent',
            )}
            onClick={() => selectBoard(board.id)}
            onDoubleClick={() => startRename(board)}
          >
            <span className="truncate">{board.title}</span>
            <span className="ml-2 flex items-center gap-1">
              {isRenaming ? null : (
                <>
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{count}</span>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <span className="rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => startRename(board)}>
                        <Pencil /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateBoard(board.id)}>
                        <Copy /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => moveBoard(board.id, -1)}>
                        <ChevronUp /> Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => moveBoard(board.id, 1)}>
                        <ChevronDown /> Move down
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={(data?.boards.length ?? 0) <= 1}
                        onClick={() => setDeleting(board)}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => startRename(board)}>
            Rename <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => duplicateBoard(board.id)}>
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={() => moveBoard(board.id, -1)}>Move up</ContextMenuItem>
          <ContextMenuItem onClick={() => moveBoard(board.id, 1)}>Move down</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            disabled={(data?.boards.length ?? 0) <= 1}
            onClick={() => setDeleting(board)}
          >
            Delete <ContextMenuShortcut>Del</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <aside className="z-20 flex w-56 shrink-0 flex-col border-r bg-card" onPointerDown={(e) => e.stopPropagation()}>
      <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Boards
      </div>
      <div className="haolio-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {boards.map((board) =>
          renamingId === board.id ? (
            <Input
              key={board.id}
              data-board-rename={board.id}
              value={draft}
              className="h-8"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commitRename(board.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(board.id);
                if (e.key === 'Escape') setRenamingId(null);
              }}
            />
          ) : (
            item(board)
          ),
        )}
      </div>
      <div className="border-t p-2">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => addBoard()}>
          <Plus /> New board
        </Button>
      </div>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete board “${deleting?.title ?? ''}”?`}
        description="Everything on this board will be permanently removed. This cannot be undone."
        confirmLabel="Delete board"
        destructive
        onConfirm={() => {
          if (deleting) deleteBoard(deleting.id);
          setDeleting(null);
        }}
      />
    </aside>
  );
}
