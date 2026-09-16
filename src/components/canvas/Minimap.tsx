import { useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSettings } from '@/lib/settings';
import { objectBounds, unionRects } from '@/lib/geometry';
import type { CanvasObject, Rect } from '@/lib/types';

const W = 176;
const H = 124;
/** Object-rect refresh interval while interacting (viewport rect stays live). */
const CONTENT_DEBOUNCE_MS = 110;

const TYPE_COLORS: Record<string, string> = {
  text: '#64748b',
  sticky_note: '#fbbf24',
  shape: '#6366f1',
  image: '#10b981',
  frame: '#8b5cf6',
  mindmap_node: '#6366f1',
};

interface MinimapData {
  rects: { key: string; color: string; x: number; y: number; width: number; height: number; kind: string }[];
  /** Content extent incl. padding, in world coords (basis for the scale). */
  content: Rect | null;
  scale: number;
}

function computeMinimapData(objects: Record<string, CanvasObject>, worldView: Rect): MinimapData {
  const list = Object.values(objects);
  const objectRects = list
    .filter((o) => o.type !== 'group')
    .map((o) => ({ x: o.x, y: o.y, width: o.width, height: o.height }));
  const raw = unionRects([...objectRects, worldView]);
  if (!raw) return { rects: [], content: null, scale: 1 };
  const pad = 40;
  const content: Rect = {
    x: raw.x - pad,
    y: raw.y - pad,
    width: raw.width + pad * 2,
    height: raw.height + pad * 2,
  };
  const scale = Math.min(W / content.width, H / content.height);
  const rects = list
    .filter((o) => o.type !== 'group')
    .map((o) => {
      const b = { x: o.x, y: o.y, width: o.width, height: o.height };
      return {
        key: o.id,
        color: TYPE_COLORS[o.type] ?? '#94a3b8',
        x: (b.x - content.x) * scale,
        y: (b.y - content.y) * scale,
        width: Math.max(b.width * scale, 2),
        height: Math.max(b.height * scale, 2),
        kind: o.type,
      };
    });
  return { rects, content, scale };
}

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

  // Expensive part (bounds of every object + union) is debounced so drags and
  // pans stay smooth; the first paint computes synchronously.
  const [data, setData] = useState<MinimapData>(() => computeMinimapData(objects, worldView));
  useEffect(() => {
    const id = window.setTimeout(() => setData(computeMinimapData(objects, worldView)), CONTENT_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, worldView.x, worldView.y, worldView.width, worldView.height]);

  const content = data.content;
  const scale = data.scale;

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
        {data.rects.map((r) => (
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
        {/* Live viewport indicator — updates every frame for instant feedback. */}
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
