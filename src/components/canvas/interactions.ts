import { worldDeltaFromClientDelta, worldFromClient } from '@/lib/pointerMath';
import { objectBounds, rectContains, rectsIntersect, snapValue } from '@/lib/geometry';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore, expandWithDescendants } from '@/stores/editorStore';
import { useSettings } from '@/lib/settings';
import type { CanvasObject, Vec } from '@/lib/types';

// -----------------------------------------------------------------------------
// Pointer gesture implementations. Each installs transient window listeners
// and removes them on pointer-up, so gestures survive element re-renders.
// Live updates go through `updateObjectLive` (no history); the gesture's final
// commit() collapses the whole gesture into a single undo entry.
// -----------------------------------------------------------------------------

function capture(e: React.PointerEvent): void {
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    // Pointer capture unavailable — window listeners still work.
  }
}

function detach(move: (ev: PointerEvent) => void, up: (ev: PointerEvent) => void) {
  window.removeEventListener('pointermove', move);
  window.removeEventListener('pointerup', up);
  window.removeEventListener('pointercancel', up);
}

function attach(move: (ev: PointerEvent) => void, up: (ev: PointerEvent) => void) {
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

export function beginPan(e: React.PointerEvent): void {
  capture(e);
  const start = { x: e.clientX, y: e.clientY };
  const startViewport = { ...useCanvasStore.getState().viewport };
  const move = (ev: PointerEvent) => {
    useCanvasStore.getState().setViewport({
      zoom: startViewport.zoom,
      x: startViewport.x + (ev.clientX - start.x),
      y: startViewport.y + (ev.clientY - start.y),
    });
  };
  const up = () => detach(move, up);
  attach(move, up);
}

export function beginMarquee(e: React.PointerEvent, startWorld: Vec, additive: boolean): void {
  capture(e);
  const setMarquee = useCanvasStore.getState().setMarquee;
  let last: Vec = startWorld;
  const move = (ev: PointerEvent) => {
    last = worldFromClient(ev.clientX, ev.clientY);
    setMarquee({
      x: Math.min(startWorld.x, last.x),
      y: Math.min(startWorld.y, last.y),
      width: Math.abs(last.x - startWorld.x),
      height: Math.abs(last.y - startWorld.y),
    });
  };
  const up = () => {
    detach(move, up);
    const rect = useCanvasStore.getState().marquee;
    setMarquee(null);
    const editor = useEditorStore.getState();
    if (rect && (rect.width > 3 || rect.height > 3)) {
      const ids = Object.values(editor.objects)
        .filter((o) => o.type !== 'group')
        .filter((o) => rectsIntersect(objectBounds(o), rect))
        .map((o) => o.id);
      const merged = additive ? [...new Set([...editor.selection.objects, ...ids])] : ids;
      editor.setSelection(merged);
    } else if (!additive) {
      editor.clearSelection();
    }
  };
  attach(move, up);
}

export function beginObjectDrag(e: React.PointerEvent, obj: CanvasObject): void {
  capture(e);
  const editor = useEditorStore.getState();
  if (!editor.selection.objects.includes(obj.id)) {
    // Clicking a member of a group selects the whole group.
    const targetId = obj.parentId && editor.objects[obj.parentId]?.type === 'group' ? obj.parentId : obj.id;
    editor.setSelection([targetId]);
  }
  const selected = useEditorStore.getState().selection.objects;
  const ids = expandWithDescendants(useEditorStore.getState().objects, selected);
  const objects = useEditorStore.getState().objects;
  const base = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    const o = objects[id];
    if (o) base.set(id, { x: o.x, y: o.y });
  }
  if (base.size === 0) return;
  const primaryId = selected[0] ?? obj.id;
  const primary = base.get(primaryId) ?? { x: obj.x, y: obj.y };

  const start = { x: e.clientX, y: e.clientY };
  let moved = false;
  const move = (ev: PointerEvent) => {
    const d = worldDeltaFromClientDelta(ev.clientX - start.x, ev.clientY - start.y);
    if (!moved && Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) < 3) return;
    moved = true;
    const { snapToGrid, gridSize } = useSettings.getState();
    const primaryX = snapValue(primary.x + d.x, gridSize, snapToGrid);
    const primaryY = snapValue(primary.y + d.y, gridSize, snapToGrid);
    const dx = primaryX - primary.x;
    const dy = primaryY - primary.y;
    const store = useEditorStore.getState();
    for (const [id, b] of base) {
      store.updateObjectLive(id, { x: Math.round(b.x + dx), y: Math.round(b.y + dy) });
    }
  };
  const up = () => {
    detach(move, up);
    if (!moved) return;
    const store = useEditorStore.getState();
    store.reparentIntoFrames([...base.keys()]);
    store.commit('Move objects');
  };
  attach(move, up);
}

export function beginConnect(e: React.PointerEvent, obj: CanvasObject): void {
  capture(e);
  const setConnecting = useCanvasStore.getState().setConnecting;
  setConnecting({ fromId: obj.id, cursor: worldFromClient(e.clientX, e.clientY) });
  const move = (ev: PointerEvent) => {
    setConnecting({ fromId: obj.id, cursor: worldFromClient(ev.clientX, ev.clientY) });
  };
  const up = (ev: PointerEvent) => {
    detach(move, up);
    const state = useCanvasStore.getState();
    const from = state.connecting?.fromId ?? obj.id;
    state.setConnecting(null);
    const p = worldFromClient(ev.clientX, ev.clientY);
    const target = topObjectAt(useEditorStore.getState().objects, p, new Set([from]));
    if (target) {
      useEditorStore.getState().connectObjects(from, target.id);
    }
  };
  attach(move, up);
}

export function topObjectAt(
  objects: Record<string, CanvasObject>,
  p: Vec,
  exclude?: Set<string>,
): CanvasObject | null {
  let best: CanvasObject | null = null;
  for (const o of Object.values(objects)) {
    if (o.type === 'group') continue;
    if (exclude?.has(o.id)) continue;
    if (rectContains(objectBounds(o), p)) {
      if (!best || o.z >= best.z) best = o;
    }
  }
  return best;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const ANCHOR_FRACTIONS: Record<ResizeHandle, [number, number]> = {
  nw: [1, 1],
  n: [0.5, 1],
  ne: [0, 1],
  e: [0, 0.5],
  se: [0, 0],
  s: [0.5, 0],
  sw: [1, 0],
  w: [1, 0.5],
};

export function beginResize(e: React.PointerEvent, obj: CanvasObject, handle: ResizeHandle): void {
  e.stopPropagation();
  capture(e);
  const startObj = { ...obj };
  const theta = (startObj.rotation * Math.PI) / 180;
  const cT = Math.cos(theta);
  const sT = Math.sin(theta);
  const startCenter = { x: startObj.x + startObj.width / 2, y: startObj.y + startObj.height / 2 };
  const toLocal = (px: number, py: number): Vec => {
    const dx = px - startCenter.x;
    const dy = py - startCenter.y;
    return {
      x: startObj.width / 2 + dx * cT + dy * sT,
      y: startObj.height / 2 + -dx * sT + dy * cT,
    };
  };
  const [afx, afy] = ANCHOR_FRACTIONS[handle];
  const ax = afx * startObj.width;
  const ay = afy * startObj.height;
  // World position of the fixed anchor point.
  const adx = ax - startObj.width / 2;
  const ady = ay - startObj.height / 2;
  const anchorWorld = {
    x: startCenter.x + adx * cT - ady * sT,
    y: startCenter.y + adx * sT + ady * cT,
  };

  const move = (ev: PointerEvent) => {
    const p = worldFromClient(ev.clientX, ev.clientY);
    const local = toLocal(p.x, p.y);
    let nw = Math.max(Math.abs(local.x - ax), 16);
    let nh = Math.max(Math.abs(local.y - ay), 16);
    const nlx = Math.min(local.x, ax);
    const nly = Math.min(local.y, ay);
    const { snapToGrid, gridSize } = useSettings.getState();
    if (snapToGrid && Math.abs(startObj.rotation % 360) < 0.01) {
      nw = Math.max(snapValue(nw, gridSize, true), gridSize);
      nh = Math.max(snapValue(nh, gridSize, true), gridSize);
    }
    // Keep the anchor fixed in world space.
    const anx = ax - nlx;
    const any = ay - nly;
    const cdx = anx - nw / 2;
    const cdy = any - nh / 2;
    const newCenter = {
      x: anchorWorld.x - (cdx * cT - cdy * sT),
      y: anchorWorld.y - (cdx * sT + cdy * cT),
    };
    let x = newCenter.x - nw / 2;
    let y = newCenter.y - nh / 2;
    if (snapToGrid && Math.abs(startObj.rotation % 360) < 0.01) {
      x = snapValue(x, gridSize, true);
      y = snapValue(y, gridSize, true);
    }
    useEditorStore.getState().updateObjectLive(obj.id, {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(nw),
      height: Math.round(nh),
    });
  };
  const up = () => {
    detach(move, up);
    useEditorStore.getState().commit('Resize object');
  };
  attach(move, up);
}

export function beginRotate(e: React.PointerEvent, obj: CanvasObject): void {
  e.stopPropagation();
  capture(e);
  const center = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
  const start = worldFromClient(e.clientX, e.clientY);
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const base = obj.rotation;
  const move = (ev: PointerEvent) => {
    const p = worldFromClient(ev.clientX, ev.clientY);
    const angle = Math.atan2(p.y - center.y, p.x - center.x);
    let deg = base + ((angle - startAngle) * 180) / Math.PI;
    if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
    deg = ((deg % 360) + 360) % 360;
    useEditorStore.getState().updateObjectLive(obj.id, { rotation: Math.round(deg * 10) / 10 });
  };
  const up = () => {
    detach(move, up);
    useEditorStore.getState().commit('Rotate object');
  };
  attach(move, up);
}
