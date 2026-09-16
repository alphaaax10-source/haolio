import { useCanvasStore } from '@/stores/canvasStore';

interface GridViewProps {
  gridStyle: 'dots' | 'lines';
  gridSize: number;
}

/** Infinite dotted / lined grid that follows the viewport. */
export function GridView({ gridStyle, gridSize }: GridViewProps) {
  const viewport = useCanvasStore((s) => s.viewport);
  const cell = gridSize * viewport.zoom;
  if (cell < 9) return null;
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${gridStyle === 'dots' ? 'canvas-grid-dots' : 'canvas-grid-lines'}`}
      style={{
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    />
  );
}
