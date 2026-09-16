import { useMemo, useRef } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSettings } from '@/lib/settings';
import { objectBounds, unionRects } from '@/lib/geometry';
import type { Rect } from '@/lib/types';

const W = 176;
const H = 124;

const TYPE_COLORS: Record<string, string> = {
  text: '#64748b',
  sticky_note: '#fbbf24',
  shape: '#6366f1',
  image: '#10b981',
  frame: '#8b5cf6',
  mindmap_node: '#6366f1',
};

/** Compact minimap: content overview + draggable viewport rectangle. */
export function Minimap() {
  const visible = useSettings((s) => s.showMinimap);
  const objects = useEditorStore((s) => s.objects);
  const viewport = useCanvasStore((s) => s.viewport);
  const size = useCanvasStore((s) => s.size);
  const dragging = useRef(false);

  const worldView: Rect = {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: size.width / viewport.zoom,
    height: size.height / viewport.zoom,
  };

  const { rects, content, scale } = useMemo(() => {
    const objectRects = Object.values(objects)
      .filter((o) => o.type !== 'group')
      .map((o) => objectBounds(o));
    const content = unionRects([...objectRects, worldView]);
    if (!content) return { rects: [], content: null, scale: 1 };
    const pad = 40;
    const c: Rect = {
      x: content.x - pad,
      y: content.y - pad,
      width: content.width + pad * 2,
      height: content.height + pad * 2,
    };
    const scale = Math.min(W / c.width, H / c.height);
    const rects = Object.values(objects)
      .filter((o) => o.type !== 'group')
      .map((o) => {
        const b = objectBounds(o);
        return {
          key: o.id,
          color: TYPE_COLORS[o.type] ?? '#94a3b8',
          x: (b.x - c.x) * scale,
          y: (b.y - c.y) * scale,
          width: Math.max(b.width * scale, 2),
          height: Math.max(b.height * scale, 2),
          kind: o.type,
        };
      });
    return { rects, content: c, scale };
  }, [objects, worldView.x, worldView.y, worldView.width, worldView.height]);

  if (!visible || !content) return null;

  const mapToWorld = (mx: number, my: number): { x: number; y: number } => ({
    x: content.x + mx / scale,
    y: content.y + my / scale,
  });

  const centerOn = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const world = mapToWorld(e.clientX - rect.left, e.clientY - rect.top);
    useCanvasStore.getState().centerOn(world);
  };

  return (
    <div
      className="absolute bottom-4 right-4 rounded-xl border bg-card/90 p-1 shadow-md backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      title="Minimap — drag to navigate"
    >
      <svg
        width={W}
        height={H}
        className="block cursor-pointer rounded-lg"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
          centerOn(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) centerOn(e);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {rects.map((r) => (
          <rect
            key={r.key}
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.height}
            rx={r.kind === 'mindmap_node' ? 1.5 : 1}
            fill={r.color}
            opacity={r.kind === 'frame' ? 0.25 : 0.85}
            stroke={r.kind === 'frame' ? r.color : 'none'}
            strokeWidth={r.kind === 'frame' ? 1 : 0}
          />
        ))}
        <rect
          x={(worldView.x - content.x) * scale}
          y={(worldView.y - content.y) * scale}
          width={worldView.width * scale}
          height={worldView.height * scale}
          fill="hsl(var(--primary))"
          fillOpacity={0.08}
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </div>
  );
}
