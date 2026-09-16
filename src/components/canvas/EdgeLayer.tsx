import { memo, useMemo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { computeEdgeGeometry } from '@/lib/edgeGeometry';
import { cn } from '@/lib/utils';
import type { Edge } from '@/lib/types';

function markerIdFor(color: string, start: boolean): string {
  const safe = color.replace(/[^a-zA-Z0-9]/g, '');
  return `haolio-arrow-${start ? 's' : 'e'}-${safe}`;
}

const EdgeView = memo(function EdgeView({ edge }: { edge: Edge }) {
  const from = useEditorStore((s) => s.objects[edge.from]);
  const to = useEditorStore((s) => s.objects[edge.to]);
  const selected = useEditorStore((s) => s.selection.edges.includes(edge.id));
  const root = useEditorStore((s) => {
    const f = s.objects[edge.from];
    const rootId = f?.data.mind?.rootId;
    return rootId ? s.objects[rootId] : undefined;
  });

  const geo = useMemo(() => {
    if (!from || !to) return null;
    const map: Record<string, (typeof from) | undefined> = { [edge.from]: from, [edge.to]: to };
    if (root) map[root.id] = root;
    return computeEdgeGeometry(edge, map as Record<string, NonNullable<typeof from>>);
  }, [edge, from, to, root]);

  if (!geo) return null;
  const color = selected ? 'hsl(var(--primary))' : geo.color;
  const markerEnd = geo.arrow !== 'none' ? `url(#${markerIdFor(color, false)})` : undefined;
  const markerStart = geo.arrow === 'double' ? `url(#${markerIdFor(color, true)})` : undefined;

  const onSelect = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    const editor = useEditorStore.getState();
    if (e.shiftKey) {
      const has = editor.selection.edges.includes(edge.id);
      editor.setSelection(
        editor.selection.objects,
        has ? editor.selection.edges.filter((id) => id !== edge.id) : [...editor.selection.edges, edge.id],
      );
    } else {
      editor.setSelection([], [edge.id]);
    }
  };

  return (
    <g>
      {/* generous invisible hit area */}
      <path d={geo.d} fill="none" stroke="transparent" strokeWidth={16} className="cursor-pointer" style={{ pointerEvents: 'stroke' }} onPointerDown={onSelect} />
      <path
        d={geo.d}
        fill="none"
        stroke={color}
        strokeWidth={geo.width + (selected ? 1.5 : 0)}
        strokeLinecap="round"
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
});

/** SVG layer for all connections (rendered beneath objects). */
export function EdgeLayer() {
  const edges = useEditorStore((s) => s.edges);
  const objects = useEditorStore((s) => s.objects);
  const viewport = useCanvasStore((s) => s.viewport);

  const markers = useMemo(() => {
    const colors = new Set<string>();
    for (const edge of Object.values(edges)) {
      const from = objects[edge.from];
      const to = objects[edge.to];
      if (!from || !to) continue;
      const geo = computeEdgeGeometry(edge, objects);
      if (!geo || geo.arrow === 'none') continue;
      colors.add(geo.color);
    }
    return [...colors].flatMap((color) => [
      <marker key={markerIdFor(color, false)} id={markerIdFor(color, false)} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 0.8 L 9.2 5 L 0 9.2 z" fill={color} />
      </marker>,
      <marker key={markerIdFor(color, true)} id={markerIdFor(color, true)} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 0.8 L 9.2 5 L 0 9.2 z" fill={color} />
      </marker>,
    ]);
  }, [edges, objects]);

  const sorted = useMemo(() => Object.values(edges).sort((a, b) => a.z - b.z), [edges]);

  return (
    <svg className={cn('absolute inset-0 h-full w-full')} style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <defs>{markers}</defs>
      <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
        {sorted.map((edge) => (
          <EdgeView key={edge.id} edge={edge} />
        ))}
      </g>
    </svg>
  );
}
