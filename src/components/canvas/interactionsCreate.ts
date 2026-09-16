import { worldFromClient } from '@/lib/pointerMath';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSettings } from '@/lib/settings';
import { snapValue } from '@/lib/geometry';
import type { Rect, Vec } from '@/lib/types';

/**
 * Drag-to-create gesture for sticky notes, shapes and frames. `onPreview`
 * streams the in-progress rect to the Canvas for the live outline; a simple
 * click creates the object at its default size.
 */
export function beginCreate(
  e: React.PointerEvent,
  startWorld: Vec,
  onPreview: (rect: Rect | null) => void,
): void {
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    // ignore — window listeners still work
  }
  const tool = useCanvasStore.getState().tool as 'sticky' | 'shape' | 'frame';
  let rect: Rect | null = null;

  const move = (ev: PointerEvent) => {
    const last = worldFromClient(ev.clientX, ev.clientY);
    rect = {
      x: Math.min(startWorld.x, last.x),
      y: Math.min(startWorld.y, last.y),
      width: Math.abs(last.x - startWorld.x),
      height: Math.abs(last.y - startWorld.y),
    };
    onPreview(rect);
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    onPreview(null);

    const { snapToGrid, gridSize } = useSettings.getState();
    const x = snapValue(startWorld.x, gridSize, snapToGrid);
    const y = snapValue(startWorld.y, gridSize, snapToGrid);
    const dragged = rect ? rect.width > 6 || rect.height > 6 : false;
    const width = dragged && rect ? Math.max(rect.width, tool === 'sticky' ? 120 : 24) : undefined;
    const height = dragged && rect ? Math.max(rect.height, tool === 'sticky' ? 120 : 24) : undefined;
    const editor = useEditorStore.getState();
    editor.createObjectAt(
      tool,
      x,
      y,
      width !== undefined ? { width, height: height! } : undefined,
      useCanvasStore.getState().pendingShape,
    );
    useCanvasStore.getState().setTool('select');
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
