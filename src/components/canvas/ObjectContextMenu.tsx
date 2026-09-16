import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
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
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { toast } from '@/stores/toastStore';
import type { CanvasObject } from '@/lib/types';

/** Right-click menu for canvas objects. */
export function ObjectContextMenu({ obj, children }: { obj: CanvasObject; children: ReactNode }) {
  const editor = () => useEditorStore.getState();
  const isMind = obj.type === 'mindmap_node';
  const isRoot = isMind && !obj.data.mind?.parentId;
  const hasChildren = (obj.data.mind?.childCount ?? 0) > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {isMind && (
          <>
            <ContextMenuItem
              onClick={() => {
                editor().setSelection([obj.id]);
                editor().addMindChild(obj.id);
              }}
            >
              <GitBranch /> Add child <span className="ml-auto text-xs text-muted-foreground">Tab</span>
            </ContextMenuItem>
            {!isRoot && (
              <ContextMenuItem
                onClick={() => {
                  editor().setSelection([obj.id]);
                  editor().addMindSibling(obj.id);
                }}
              >
                <GitBranch /> Add sibling <span className="ml-auto text-xs text-muted-foreground">Enter</span>
              </ContextMenuItem>
            )}
            {hasChildren && (
              <ContextMenuItem onClick={() => editor().toggleCollapse(obj.id)}>
                {obj.data.mind?.collapsed ? 'Expand branch' : 'Collapse branch'}
                <span className="ml-auto text-xs text-muted-foreground">Space</span>
              </ContextMenuItem>
            )}
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Orbit /> Layout
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={() => obj.data.mind && editor().setMindLayout(obj.data.mind.rootId ?? obj.id, 'horizontal')}>
                  <ArrowRight /> Horizontal
                </ContextMenuItem>
                <ContextMenuItem onClick={() => obj.data.mind && editor().setMindLayout(obj.data.mind.rootId ?? obj.id, 'vertical')}>
                  <ArrowDown /> Vertical
                </ContextMenuItem>
                <ContextMenuItem onClick={() => obj.data.mind && editor().setMindLayout(obj.data.mind.rootId ?? obj.id, 'radial')}>
                  <Orbit /> Radial
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          onClick={() => {
            editor().setSelection([obj.id]);
            if (!editor().copySelection()) toast.info('Nothing to copy');
          }}
        >
          <Copy /> Copy <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            editor().setSelection([obj.id]);
            editor().cutSelection();
          }}
        >
          <Cut /> Cut <span className="ml-auto text-xs text-muted-foreground">Ctrl+X</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            editor().setSelection([obj.id]);
            editor().duplicateSelection();
          }}
        >
          <Duplicate /> Duplicate <span className="ml-auto text-xs text-muted-foreground">Ctrl+D</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => editor().reorder([obj.id], 'front')}>
          <ChevronsUp /> Bring to front
        </ContextMenuItem>
        <ContextMenuItem onClick={() => editor().reorder([obj.id], 'back')}>
          <ChevronsDown /> Send to back
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            const selected = editor().selection.objects.includes(obj.id) ? editor().selection.objects : [obj.id];
            if (selected.length > 1) editor().group(selected);
            else toast.info('Select at least two objects to group (Ctrl+G).');
          }}
        >
          <Group /> Group selection
        </ContextMenuItem>
        <ContextMenuItem onClick={() => editor().ungroup([obj.id])} disabled={obj.type !== 'group' && !obj.parentId}>
          <Ungroup /> Ungroup
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => (isMind ? editor().deleteMindNodes([obj.id]) : editor().deleteObjectsByIds([obj.id]))}
        >
          <Trash2 /> Delete <span className="ml-auto text-xs text-muted-foreground">Del</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Right-click menu for the empty canvas background. */
export function CanvasContextMenu({ children }: { children: ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => useCanvasStore.getState().setTool('sticky')}>
          New sticky note
        </ContextMenuItem>
        <ContextMenuItem onClick={() => useCanvasStore.getState().setTool('mindmap')}>
          New mind map
        </ContextMenuItem>
        <ContextMenuItem onClick={() => useCanvasStore.getState().setTool('text')}>
          New text
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            if (!useEditorStore.getState().pasteClipboard()) toast.info('Clipboard is empty');
          }}
        >
          Paste <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => useEditorStore.getState().selectAll()}>
          Select all <span className="ml-auto text-xs text-muted-foreground">Ctrl+A</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
