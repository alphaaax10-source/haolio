import { Minus, Plus, Maximize2, Crosshair } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fitToContent } from '@/hooks/useShortcuts';
import { objectBounds, unionRects } from '@/lib/geometry';
import { useEditorStore } from '@/stores/editorStore';

/** Zoom %, zoom in/out, fit-to-content and reset-origin controls. */
export function ViewportControls() {
  const zoom = useCanvasStore((s) => s.viewport.zoom);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const zoomBy = useCanvasStore((s) => s.zoomBy);
  const centerOn = useCanvasStore((s) => s.centerOn);
  void useEditorStore((s) => s.rev); // re-render on doc change (selection fit uses it)

  return (
    <div
      className="absolute bottom-4 right-[200px] z-20 flex items-center overflow-hidden rounded-xl border bg-card/95 shadow-md backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
            <Minus />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom out — Ctrl−</TooltipContent>
      </Tooltip>
      <button
        type="button"
        className="w-14 text-center text-xs font-medium tabular-nums hover:bg-accent"
        onClick={() => setZoom(1)}
        title="Reset zoom — Ctrl+0"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom in — Ctrl+</TooltipContent>
      </Tooltip>
      <div className="mx-0.5 h-5 w-px bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="iconSm" aria-label="Fit to content" onClick={fitToContent}>
            <Maximize2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Fit board — Ctrl+1</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Go to origin"
            onClick={() => centerOn({ x: 0, y: 0 })}
          >
            <Crosshair />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Center on origin</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function selectionBounds(): ReturnType<typeof unionRects> {
  const editor = useEditorStore.getState();
  return unionRects(editor.selection.objects.map((id) => editor.objects[id]).filter(Boolean).map((o) => objectBounds(o!)));
}
