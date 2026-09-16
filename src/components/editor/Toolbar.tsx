import { useRef } from 'react';
import {
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  Hexagon,
  Spline,
  Network,
  ImagePlus,
  Frame,
  Square,
  Circle,
  Diamond,
  Triangle,
  RectangleHorizontal,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { useImageImport } from '@/hooks/useImageImport';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ShapeKind, Tool } from '@/lib/types';

const SHAPE_KINDS: { kind: ShapeKind; icon: typeof Square; label: string }[] = [
  { kind: 'rectangle', icon: Square, label: 'Rectangle' },
  { kind: 'rounded_rectangle', icon: RectangleHorizontal, label: 'Rounded' },
  { kind: 'circle', icon: Circle, label: 'Circle' },
  { kind: 'diamond', icon: Diamond, label: 'Diamond' },
  { kind: 'triangle', icon: Triangle, label: 'Triangle' },
  { kind: 'hexagon', icon: Hexagon, label: 'Hexagon' },
];

export function Toolbar() {
  const tool = useCanvasStore((s) => s.tool);
  const pendingShape = useCanvasStore((s) => s.pendingShape);
  const setTool = useCanvasStore((s) => s.setTool);
  const setPendingShape = useCanvasStore((s) => s.setPendingShape);
  const { importFiles } = useImageImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ToolButton = ({
    id,
    icon: Icon,
    label,
    shortcut,
    active,
    onClick,
  }: {
    id?: Tool;
    icon: typeof Square;
    label: string;
    shortcut: string;
    active?: boolean;
    onClick: () => void;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-tool={id}
          className={cn(
            'h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground',
            active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
          )}
          onClick={onClick}
          aria-label={label}
        >
          <Icon className="h-[18px] w-[18px]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {label}
        <kbd className="rounded bg-background/20 px-1 text-[10px]">{shortcut}</kbd>
      </TooltipContent>
    </Tooltip>
  );

  const activeShape = SHAPE_KINDS.find((s) => s.kind === pendingShape) ?? SHAPE_KINDS[1]!;

  return (
    <div
      className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-lg backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <ToolButton id="select" icon={MousePointer2} label="Select" shortcut="V" active={tool === 'select'} onClick={() => setTool('select')} />
      <ToolButton id="hand" icon={Hand} label="Hand" shortcut="H" active={tool === 'hand'} onClick={() => setTool('hand')} />
      <div className="my-1 h-px w-6 bg-border" />
      <ToolButton id="text" icon={Type} label="Text" shortcut="T" active={tool === 'text'} onClick={() => setTool('text')} />
      <ToolButton id="sticky" icon={StickyNote} label="Sticky note" shortcut="N" active={tool === 'sticky'} onClick={() => setTool('sticky')} />
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground',
                  tool === 'shape' && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                )}
                aria-label="Shape"
              >
                <activeShape.icon className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            Shape <kbd className="rounded bg-background/20 px-1 text-[10px]">S</kbd>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="w-44">
          {SHAPE_KINDS.map(({ kind, icon: Icon, label }) => (
            <DropdownMenuItem
              key={kind}
              onClick={() => {
                setPendingShape(kind);
                setTool('shape');
              }}
            >
              <Icon /> {label}
              {pendingShape === kind && <span className="ml-auto text-xs text-primary">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolButton id="connector" icon={Spline} label="Connector" shortcut="C" active={tool === 'connector'} onClick={() => setTool('connector')} />
      <ToolButton id="mindmap" icon={Network} label="Mind map" shortcut="M" active={tool === 'mindmap'} onClick={() => setTool('mindmap')} />
      <div className="my-1 h-px w-6 bg-border" />
      <ToolButton icon={ImagePlus} label="Import image" shortcut="PNG · SVG" onClick={() => fileInputRef.current?.click()} />
      <ToolButton id="frame" icon={Frame} label="Frame" shortcut="F" active={tool === 'frame'} onClick={() => setTool('frame')} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void importFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
