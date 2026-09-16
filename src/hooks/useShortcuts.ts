import { useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { objectBounds, unionRects } from '@/lib/geometry';
import { emitUiEvent } from '@/lib/uiEvents';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

/** Shift+F: frame the selection in view (falls back to fitting the board). */
export function zoomToSelection(): void {
  const editor = useEditorStore.getState();
  const rects = editor.selection.objects
    .map((id) => editor.objects[id])
    .filter(Boolean)
    .map((o) => objectBounds(o));
  const bounds = unionRects(rects);
  if (bounds) {
    useCanvasStore.getState().centerOnRect(bounds, 140);
  } else {
    fitToContent();
  }
}

function fitToContent(): void {
  const editor = useEditorStore.getState();
  const rects = Object.values(editor.objects)
    .filter((o) => o.type !== 'group')
    .map((o) => objectBounds(o));
  const bounds = unionRects(rects);
  if (bounds) {
    useCanvasStore.getState().centerOnRect(bounds, 120);
  } else {
    const { size } = useCanvasStore.getState();
    useCanvasStore.getState().setViewport({ x: size.width / 2, y: size.height / 2, zoom: 1 });
  }
}

/**
 * Global keyboard shortcuts for the editor. Skips typing targets so text
 * editing keeps native behavior (except Escape which blurs).
 */
export function useShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const canvas = useCanvasStore.getState();
      const editor = useEditorStore.getState();
      if (!editor.data) return;
      // Overlays own the keyboard: no tool/history shortcuts while search,
      // settings, any dialog or the context menu is open.
      if (
        canvas.searchOpen ||
        canvas.settingsOpen ||
        canvas.contextMenu ||
        canvas.makeMenu ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }

      if (e.key === ' ') {
        if (!isTypingTarget(e.target)) {
          canvas.setSpacePanning(true);
          e.preventDefault();
        }
        return;
      }

      if (isTypingTarget(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      const firstSelected = editor.selection.objects[0]
        ? editor.objects[editor.selection.objects[0]]
        : undefined;

      if (mod) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) editor.redo();
            else editor.undo();
            return;
          case 'y':
            e.preventDefault();
            editor.redo();
            return;
          case 'c':
            editor.copySelection();
            return;
          case 'x':
            editor.cutSelection();
            return;
          case 'v':
            editor.pasteClipboard();
            return;
          case 'd':
            e.preventDefault();
            editor.duplicateSelection();
            return;
          case 'a':
            e.preventDefault();
            editor.selectAll();
            return;
          case 'g': {
            e.preventDefault();
            if (e.shiftKey) editor.ungroup(editor.selection.objects);
            else if (editor.selection.objects.length > 1) editor.group(editor.selection.objects);
            return;
          }
          case '0':
            e.preventDefault();
            canvas.setZoom(1);
            return;
          case '1':
            e.preventDefault();
            fitToContent();
            return;
          case '=':
          case '+':
            e.preventDefault();
            canvas.zoomBy(1.25);
            return;
          case '-':
            e.preventDefault();
            canvas.zoomBy(1 / 1.25);
            return;
          case 'f':
          case 'k':
            e.preventDefault();
            emitUiEvent('toggle-search');
            return;
          case 's':
            e.preventDefault();
            emitUiEvent('save-project');
            return;
          case ',':
            e.preventDefault();
            emitUiEvent('toggle-settings');
            return;
          default:
            return;
        }
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (editor.selection.edges.length > 0) editor.deleteEdgesByIds(editor.selection.edges);
          if (editor.selection.objects.length > 0) {
            const mindSelected = editor.selection.objects.every((id) => editor.objects[id]?.type === 'mindmap_node');
            if (mindSelected) editor.deleteMindNodes(editor.selection.objects);
            else editor.deleteSelection();
          }
          return;
        case 'Escape':
          if (canvas.connecting) {
            canvas.setConnecting(null);
            canvas.setTool('select');
            return;
          }
          if (canvas.tool !== 'select') {
            canvas.setTool('select');
            return;
          }
          editor.clearSelection();
          return;
        case 'Tab': {
          if (firstSelected?.type === 'mindmap_node') {
            e.preventDefault();
            editor.addMindChild(firstSelected.id);
          } else if (firstSelected) {
            e.preventDefault();
          }
          return;
        }
        case 'Enter': {
          if (firstSelected?.type === 'mindmap_node') {
            e.preventDefault();
            editor.addMindSibling(firstSelected.id);
          }
          return;
        }
        case 'F':
          // Shift+F — zoom to the current selection (or fit the board).
          e.preventDefault();
          zoomToSelection();
          return;
        case 'v':
          canvas.setTool('select');
          return;
        case 'h':
          canvas.setTool('hand');
          return;
        case 't':
          canvas.setTool('text');
          return;
        case 'n':
          canvas.setTool('sticky');
          return;
        case 's':
          canvas.setTool('shape');
          return;
        case 'c':
          canvas.setTool('connector');
          return;
        case 'm':
          canvas.setTool('mindmap');
          return;
        case 'f':
          canvas.setTool('frame');
          return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') useCanvasStore.getState().setSpacePanning(false);
    };

    const onBlur = () => useCanvasStore.getState().setSpacePanning(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled]);
}

export { fitToContent };
