import { useCanvasStore } from '@/stores/canvasStore';
import type { Vec } from './types';

/** Convert a browser (client) coordinate into world/canvas coordinates. */
export function worldFromClient(clientX: number, clientY: number): Vec {
  const { viewport, containerOrigin } = useCanvasStore.getState();
  return {
    x: (clientX - containerOrigin.x - viewport.x) / viewport.zoom,
    y: (clientY - containerOrigin.y - viewport.y) / viewport.zoom,
  };
}

export function worldDeltaFromClientDelta(dx: number, dy: number): Vec {
  const { viewport } = useCanvasStore.getState();
  return { x: dx / viewport.zoom, y: dy / viewport.zoom };
}
