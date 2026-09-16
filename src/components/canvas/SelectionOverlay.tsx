import { memo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { objectBounds, unionRects } from '@/lib/geometry';
import { beginResize, beginRotate, type ResizeHandle } from './interactions';
import type { CanvasObject } from '@/lib/types';

const HANDLES: { id: ResizeHandle; fx: number; fy: number; cursor: string }[] = [
  { id: 'nw', fx: 0, fy: 0, cursor: 'nwse-resize' },
  { id: 'n', fx: 0.5, fy: 0, cursor: 'ns-resize' },
  { id: 'ne', fx: 1, fy: 0, cursor: 'nesw-resize' },
  { id: 'e', fx: 1, fy: 0.5, cursor: 'ew-resize' },
  { id: 'se', fx: 1, fy: 1, cursor: 'nwse-resize' },
  { id: 's', fx: 0.5, fy: 1, cursor: 'ns-resize' },
  { id: 'sw', fx: 0, fy: 1, cursor: 'nesw-resize' },
  { id: 'w', fx: 0, fy: 0.5, cursor: 'ew-resize' },
];

/** Selection outlines + resize/rotate handles for the current selection. */
export const SelectionOverlay = memo(function SelectionOverlay() {
  const selection = useEditorStore((s) => s.selection);
  const objects = useEditorStore((s) => s.objects);
  const zoom = useCanvasStore((s) => s.viewport.zoom);
  const tool = useCanvasStore((s) => s.tool);

  const selected = selection.objects.map((id) => objects[id]).filter(Boolean) as CanvasObject[];
  if (selected.length === 0) return null;

  const hs = 9 / zoom; // handle size in world units
  const bw = 1.5 / zoom;

  if (selected.length === 1) {
    const obj = selected[0]!;
    if (obj.type === 'group') {
      const b = objectBounds(obj);
      return (
        <div
          className="pointer-events-none absolute rounded-md border-2 border-dashed border-primary/70"
          style={{ left: b.x - 6, top: b.y - 6, width: b.width + 12, height: b.height + 12, borderWidth: bw * 2 }}
        />
      );
    }
    const cx = obj.width / 2;
    const cy = obj.height / 2;
    return (
      <div
        className="pointer-events-none absolute"
        style={{
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
          transformOrigin: 'center',
        }}
      >
        <div
          className="absolute inset-0 rounded-md border-primary"
          style={{ borderWidth: bw, borderStyle: 'solid' }}
        />
        {/* rotate handle */}
        <div
          className="pointer-events-auto absolute rounded-full border-2 border-primary bg-background"
          style={{
            width: hs,
            height: hs,
            left: cx - hs / 2,
            top: -hs * 2.2,
            cursor: 'grab',
            borderWidth: bw,
          }}
          onPointerDown={(e) => beginRotate(e, obj)}
        />
        <div className="absolute" style={{ left: cx - bw / 2, top: -hs * 1.2, width: bw, height: hs * 1.2, background: 'hsl(var(--primary))' }} />
        {/* resize handles */}
        {HANDLES.map((h) => (
          <div
            key={h.id}
            className="pointer-events-auto absolute rounded-[2px] border border-primary bg-background"
            style={{
              width: hs,
              height: hs,
              left: obj.width * h.fx - hs / 2,
              top: obj.height * h.fy - hs / 2,
              cursor: h.cursor,
            }}
            onPointerDown={(e) => beginResize(e, obj, h.id)}
          />
        ))}
      </div>
    );
  }

  const bounds = unionRects(selected.map((o) => objectBounds(o)));
  if (!bounds) return null;
  void tool;
  return (
    <div
      className="pointer-events-none absolute rounded-md border-2 border-dashed border-primary/70"
      style={{ left: bounds.x - 6, top: bounds.y - 6, width: bounds.width + 12, height: bounds.height + 12, borderWidth: bw * 2 }}
    />
  );
});
