import { useEditorStore } from '@/stores/editorStore';
import type { Vec } from '@/lib/types';

/** Dashed live preview while the connector tool is dragging between objects. */
export function ConnectionPreview({ fromId, cursor }: { fromId: string; cursor: Vec }) {
  const from = useEditorStore((s) => s.objects[fromId]);
  if (!from) return null;
  const ax = from.x + from.width / 2;
  const ay = from.y + from.height / 2;
  return (
    <svg className="pointer-events-none absolute left-0 top-0 h-px w-px" style={{ overflow: 'visible' }}>
      <line
        x1={ax}
        y1={ay}
        x2={cursor.x}
        y2={cursor.y}
        stroke="hsl(var(--primary))"
        strokeWidth={2 / 1}
        strokeDasharray="6 4"
        strokeLinecap="round"
      />
      <circle cx={cursor.x} cy={cursor.y} r={4} fill="hsl(var(--primary))" />
    </svg>
  );
}
