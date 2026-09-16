import { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSettings } from '@/lib/settings';
import { worldFromClient } from '@/lib/pointerMath';
import { objectBounds, rectsIntersect, snapValue } from '@/lib/geometry';
import { beginCreate } from './interactionsCreate';
import { beginPan, beginMarquee } from './interactions';
import { useImageImport } from '@/hooks/useImageImport';
import { EdgeLayer } from './EdgeLayer';
import { ObjectFrame } from './objects/ObjectFrame';
import { SelectionOverlay } from './SelectionOverlay';
import { ConnectionPreview } from './ConnectionPreview';
import { GridView } from './GridView';
import { Minimap } from './Minimap';
import { CanvasMenu } from './CanvasMenu';
import { MakeMenu } from './MakeMenu';
import type { CanvasObject, Rect } from '@/lib/types';

const CULL_MARGIN = 140;

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewport = useCanvasStore((s) => s.viewport);
  const tool = useCanvasStore((s) => s.tool);
  const spacePanning = useCanvasStore((s) => s.spacePanning);
  const marquee = useCanvasStore((s) => s.marquee);
  const connecting = useCanvasStore((s) => s.connecting);
  const size = useCanvasStore((s) => s.size);
  const objects = useEditorStore((s) => s.objects);
  const selection = useEditorStore((s) => s.selection);
  const gridStyle = useSettings((s) => s.gridStyle);
  const gridSize = useSettings((s) => s.gridSize);
  const { dropHandlers } = useImageImport();
  const [createPreview, setCreatePreview] = useState<Rect | null>(null);

  // Track container size + page origin for pointer math and viewport fitting.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const store = useCanvasStore.getState();
      store.setSize(r.width, r.height);
      store.setContainerOrigin(r.left, r.top);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Wheel: zoom at cursor (Shift = horizontal pan). Non-passive so we can
  // prevent the browser's own zoom/scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const vp = useCanvasStore.getState().viewport;
        useCanvasStore.getState().setViewport({ ...vp, x: vp.x - e.deltaY - e.deltaX });
        return;
      }
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      const factor = Math.exp(-e.deltaY * unit * 0.0022);
      useCanvasStore.getState().zoomAt({ x: e.clientX, y: e.clientY }, Math.min(1.6, Math.max(0.6, factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const snapPoint = useCallback((p: { x: number; y: number }) => {
    const { snapToGrid, gridSize } = useSettings.getState();
    return { x: snapValue(p.x, gridSize, snapToGrid), y: snapValue(p.y, gridSize, snapToGrid) };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) return;
      const canvas = useCanvasStore.getState();
      const world = worldFromClient(e.clientX, e.clientY);

      if (e.button === 1 || canvas.spacePanning || canvas.tool === 'hand') {
        e.preventDefault();
        beginPan(e);
        return;
      }
      if (e.button !== 0) return;

      switch (canvas.tool) {
        case 'select':
          beginMarquee(e, world, e.shiftKey);
          break;
        case 'text': {
          const p = snapPoint(world);
          useEditorStore.getState().createObjectAt('text', p.x, p.y);
          canvas.setTool('select');
          break;
        }
        case 'mindmap': {
          const p = snapPoint(world);
          useEditorStore.getState().createObjectAt('mindmap', p.x, p.y);
          canvas.setTool('select');
          break;
        }
        case 'sticky':
        case 'shape':
        case 'frame':
          beginCreate(e, world, setCreatePreview);
          break;
        case 'connector':
          // Background click while a connection is armed cancels it.
          if (canvas.connecting) canvas.setConnecting(null);
          break;
        case 'image':
          break;
      }
    },
    [snapPoint],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    useCanvasStore.getState().openContextMenu({ x: e.clientX, y: e.clientY, objId: null });
  }, []);

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    // Only when the background itself is double-clicked (objects stop propagation).
    const tool = useCanvasStore.getState().tool;
    if (tool !== 'select' && tool !== 'sticky') return;
    const world = worldFromClient(e.clientX, e.clientY);
    const editor = useEditorStore.getState();
    editor.createObjectAt('sticky', Math.round(world.x - 100), Math.round(world.y - 100));
  }, []);

  // Keep the armed connector preview glued to the cursor (click-to-click mode).
  useEffect(() => {
    if (tool !== 'connector' || !connecting) return;
    const onMove = (e: PointerEvent) => {
      const store = useCanvasStore.getState();
      if (store.connecting) {
        store.setConnecting({ fromId: store.connecting.fromId, cursor: worldFromClient(e.clientX, e.clientY) });
      }
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [tool, connecting?.fromId]);

  // Cull + z-sort objects for rendering.
  const viewRect: Rect = {
    x: -viewport.x / viewport.zoom - CULL_MARGIN,
    y: -viewport.y / viewport.zoom - CULL_MARGIN,
    width: size.width / viewport.zoom + CULL_MARGIN * 2,
    height: size.height / viewport.zoom + CULL_MARGIN * 2,
  };
  const visible: CanvasObject[] = [];
  for (const obj of Object.values(objects)) {
    if (obj.type === 'group') continue;
    if (!rectsIntersect(objectBounds(obj), viewRect) && !selection.objects.includes(obj.id)) continue;
    visible.push(obj);
  }
  visible.sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));

  const cursor = spacePanning
    ? 'grabbing'
    : tool === 'hand'
      ? 'grab'
      : tool === 'select'
        ? 'default'
        : 'crosshair';

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-canvas"
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      {...dropHandlers}
    >
        <GridView gridStyle={gridStyle} gridSize={gridSize} />
        <EdgeLayer />
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}
        >
          {visible.map((obj) => (
            <ObjectFrame key={obj.id} obj={obj} />
          ))}
          {connecting && <ConnectionPreview fromId={connecting.fromId} cursor={connecting.cursor} />}
          {createPreview && (
            <div
              className="pointer-events-none absolute rounded-md border-2 border-primary bg-primary/10"
              style={{ left: createPreview.x, top: createPreview.y, width: createPreview.width, height: createPreview.height }}
            />
          )}
          {marquee && (
            <div
              className="pointer-events-none absolute rounded-sm border border-primary bg-primary/10"
              style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }}
            />
          )}
          <SelectionOverlay />
        </div>
      <Minimap />
      <MakeMenu />
      <CanvasMenu />
    </div>
  );
}
