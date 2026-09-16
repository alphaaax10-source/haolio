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
import { useT } from '@/lib/i18n';
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

const SHAPE_KINDS: { kind: ShapeKind; icon: typeof Square; labelKey: string }[] = [
  { kind: 'rectangle', icon: Square, labelKey: 'sh.rectangle' },
  { kind: 'rounded_rectangle', icon: RectangleHorizontal, labelKey: 'sh.roundedShort' },
  { kind: 'circle', icon: Circle, labelKey: 'sh.circle' },
  { kind: 'diamond', icon: Diamond, labelKey: 'sh.diamond' },
  { kind: 'triangle', icon: Triangle, labelKey: 'sh.triangle' },
  { kind: 'hexagon', icon: Hexagon, labelKey: 'sh.hexagon' },
];

export function Toolbar() {
  const tool = useCanvasStore((s) => s.tool);
  const pendingShape = useCanvasStore((s) => s.pendingShape);
  const setTool = useCanvasStore((s) => s.setTool);
  const setPendingShape = useCanvasStore((s) => s.setPendingShape);
  const { importFiles } = useImageImport();
  const t = useT();
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
      <ToolButton id="select" icon={MousePointer2} label={t('tb.select')} shortcut="V" active={tool === 'select'} onClick={() => setTool('select')} />
      <ToolButton id="hand" icon={Hand} label={t('tb.hand')} shortcut="H" active={tool === 'hand'} onClick={() => setTool('hand')} />
      <div className="my-1 h-px w-6 bg-border" />
      <ToolButton id="text" icon={Type} label={t('tb.text')} shortcut="T" active={tool === 'text'} onClick={() => setTool('text')} />
      <ToolButton id="sticky" icon={StickyNote} label={t('tb.sticky')} shortcut="N" active={tool === 'sticky'} onClick={() => setTool('sticky')} />
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
                aria-label={t('tb.shape')}
              >
                <activeShape.icon className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {t('tb.shape')} <kbd className="rounded bg-background/20 px-1 text-[10px]">S</kbd>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" className="w-44">
          {SHAPE_KINDS.map(({ kind, icon: Icon, labelKey }) => (
            <DropdownMenuItem
              key={kind}
              onClick={() => {
                setPendingShape(kind);
                setTool('shape');
              }}
            >
              <Icon /> {t(labelKey)}
              {pendingShape === kind && <span className="ml-auto text-xs text-primary">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <ToolButton id="connector" icon={Spline} label={t('tb.connector')} shortcut="C" active={tool === 'connector'} onClick={() => setTool('connector')} />
      <ToolButton id="mindmap" icon={Network} label={t('tb.mindmap')} shortcut="M" active={tool === 'mindmap'} onClick={() => setTool('mindmap')} />
      <div className="my-1 h-px w-6 bg-border" />
      <ToolButton icon={ImagePlus} label={t('tb.importImage')} shortcut={t('tb.imageHint')} onClick={() => fileInputRef.current?.click()} />
      <ToolButton id="frame" icon={Frame} label={t('tb.frame')} shortcut="F" active={tool === 'frame'} onClick={() => setTool('frame')} />
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
