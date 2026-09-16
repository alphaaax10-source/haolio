import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronsUp,
  ChevronsDown,
  CopyPlus,
  Trash2,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  ArrowRight,
  ArrowDown,
  Orbit,
  GitBranch,
  Scissors,
  Copy,
} from 'lucide-react';
import { useEditorStore, mindChildrenOf } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MIND_COLORS, STICKY_COLORS } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ArrowStyle, CanvasObject, ConnectorRoute, Edge, ShapeKind } from '@/lib/types';

const SHAPE_KINDS: ShapeKind[] = ['rectangle', 'rounded_rectangle', 'circle', 'diamond', 'triangle', 'hexagon'];
const SHAPE_LABELS: Record<ShapeKind, string> = {
  rectangle: 'Rectangle',
  rounded_rectangle: 'Rounded rectangle',
  circle: 'Circle',
  diamond: 'Diamond',
  triangle: 'Triangle',
  hexagon: 'Hexagon',
};

/** Number field with live preview while typing and a single history commit on blur. */
function NumberField({
  value,
  onLive,
  onCommit,
  step = 1,
  min,
  max,
  className,
}: {
  value: number;
  onLive: (v: number) => void;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(Math.round(value * 10) / 10)), [value]);
  const clamp = (v: number) => Math.min(Math.max(v, min ?? -1e6), max ?? 1e6);
  return (
    <Input
      type="number"
      className={cn('h-7 px-2 text-xs tabular-nums', className)}
      value={draft}
      step={step}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onLive(clamp(v));
      }}
      onBlur={() => {
        const v = parseFloat(draft);
        if (Number.isFinite(v)) onCommit(clamp(v));
        else setDraft(String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const v = parseFloat(draft);
          if (Number.isFinite(v)) onCommit(clamp(v));
          (e.target as HTMLInputElement).blur();
        }
        e.stopPropagation();
      }}
    />
  );
}

function ColorField({ value, onChange, allowClear }: { value: string | undefined; onChange: (v: string | undefined) => void; allowClear?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border" title="Pick a color">
        <span className="absolute inset-0" style={{ background: value ?? 'transparent' }} />
        <input
          type="color"
          value={value && value.startsWith('#') ? value : '#6366f1'}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <Input
        className="h-7 px-2 text-xs"
        value={value ?? ''}
        placeholder="none"
        onChange={(e) => {
          const v = e.target.value.trim();
          onChange(v === '' ? undefined : v);
        }}
      />
      {allowClear && (
        <Button variant="ghost" size="iconSm" title="No color" onClick={() => onChange(undefined)}>
          ∅
        </Button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-b px-3 py-3 last:border-b-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="shrink-0">{label}</Label>
      <div className="flex min-w-0 flex-1 justify-end">{children}</div>
    </div>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: string | undefined; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={cn(
            'h-6 w-6 rounded-md border transition-transform hover:scale-110',
            value === c && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
          )}
          style={{ background: c }}
          onClick={() => onPick(c)}
          aria-label={c}
        />
      ))}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  sticky_note: 'Sticky note',
  shape: 'Shape',
  image: 'Image',
  frame: 'Frame',
  mindmap_node: 'Mind map node',
  group: 'Group',
};

export function PropertiesPanel() {
  const selection = useEditorStore((s) => s.selection);
  const objects = useEditorStore((s) => s.objects);
  const edges = useEditorStore((s) => s.edges);
  const rev = useEditorStore((s) => s.rev);

  if (selection.objects.length === 0 && selection.edges.length === 0) return null;
  void rev;

  const selectedObjects = selection.objects.map((id) => objects[id]).filter(Boolean) as CanvasObject[];
  const selectedEdges = selection.edges.map((id) => edges[id]).filter(Boolean) as Edge[];
  const single = selectedObjects.length === 1 ? selectedObjects[0] : undefined;
  const ids = selectedObjects.map((o) => o.id);
  const editor = useEditorStore.getState();
  void editor;

  const update = (patch: Partial<CanvasObject> | ((o: CanvasObject) => Partial<CanvasObject>), label = 'Update') =>
    useEditorStore.getState().updateObjects(ids, patch, { label });
  const setStyle = (patch: Partial<CanvasObject['style']>) =>
    useEditorStore.getState().setStyle(ids, patch);
  const livePos = (patch: Partial<CanvasObject>) => {
    for (const id of ids) useEditorStore.getState().updateObjectLive(id, patch);
  };

  const type = single?.type ?? (selectedObjects.length > 0 ? selectedObjects[0]!.type : undefined);
  const isTextLike = type === 'text' || type === 'mindmap_node';

  return (
    <aside
      className="haolio-scroll z-20 w-64 shrink-0 overflow-y-auto border-l bg-card"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="text-sm font-semibold">
          {single ? TYPE_LABELS[single.type] : `${selectedObjects.length} objects${selectedEdges.length ? ` + ${selectedEdges.length} links` : ''}`}
        </div>
      </div>

      {selectedEdges.length > 0 && selectedObjects.length === 0 && (
        <EdgeProperties edges={selectedEdges} />
      )}

      {selectedObjects.length > 0 && (
        <>
          <Section title="Position & size">
            <div className="grid grid-cols-2 gap-1.5">
              <label className="space-y-1">
                <span className="text-[10px] text-muted-foreground">X</span>
                <NumberField
                  value={single ? single.x : Math.min(...selectedObjects.map((o) => o.x))}
                  onLive={(v) => livePos({ x: v })}
                  onCommit={(v) => update({ x: v }, 'Move objects')}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Y</span>
                <NumberField
                  value={single ? single.y : Math.min(...selectedObjects.map((o) => o.y))}
                  onLive={(v) => livePos({ y: v })}
                  onCommit={(v) => update({ y: v }, 'Move objects')}
                />
              </label>
              {!isTextLike && single && (
                <>
                  <label className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">W</span>
                    <NumberField
                      value={single.width}
                      min={4}
                      onLive={(v) => livePos({ width: v })}
                      onCommit={(v) => update({ width: v }, 'Resize object')}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">H</span>
                    <NumberField
                      value={single.height}
                      min={4}
                      onLive={(v) => livePos({ height: v })}
                      onCommit={(v) => update({ height: v }, 'Resize object')}
                    />
                  </label>
                </>
              )}
            </div>
            {single && (
              <Row label="Rotation">
                <NumberField
                  className="w-20"
                  value={single.rotation}
                  min={0}
                  max={360}
                  onLive={(v) => livePos({ rotation: v })}
                  onCommit={(v) => update({ rotation: v }, 'Rotate object')}
                />
              </Row>
            )}
          </Section>

          <Section title="Layer & opacity">
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => useEditorStore.getState().reorder(ids, 'front')}>
                <ChevronsUp /> Front
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => useEditorStore.getState().reorder(ids, 'back')}>
                <ChevronsDown /> Back
              </Button>
            </div>
            <Row label="Opacity">
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={single?.style.opacity ?? 1}
                className="w-28"
                onChange={(e) => setStyle({ opacity: parseFloat(e.target.value) })}
              />
            </Row>
          </Section>

          {single?.type === 'sticky_note' && (
            <Section title="Sticky color">
              <Swatches colors={STICKY_COLORS} value={single.style.fill} onPick={(c) => setStyle({ fill: c })} />
              <Row label="Font size">
                <NumberField
                  className="w-20"
                  value={single.style.fontSize ?? 15}
                  min={8}
                  max={72}
                  onLive={(v) => setStyle({ fontSize: v })}
                  onCommit={(v) => setStyle({ fontSize: v })}
                />
              </Row>
              <AlignButtons style={single.style} onSet={setStyle} />
            </Section>
          )}

          {type === 'text' && (
            <Section title="Typography">
              <Row label="Font size">
                <NumberField
                  className="w-20"
                  value={(single ?? selectedObjects[0]!).style.fontSize ?? 18}
                  min={8}
                  max={144}
                  onLive={(v) => setStyle({ fontSize: v })}
                  onCommit={(v) => setStyle({ fontSize: v })}
                />
              </Row>
              <div className="flex gap-1">
                <Button
                  variant={single?.style.bold ? 'default' : 'outline'}
                  size="iconSm"
                  onClick={() => setStyle({ bold: !single?.style.bold })}
                >
                  <Bold />
                </Button>
                <Button
                  variant={single?.style.italic ? 'default' : 'outline'}
                  size="iconSm"
                  onClick={() => setStyle({ italic: !single?.style.italic })}
                >
                  <Italic />
                </Button>
                <Button
                  variant={single?.style.underline ? 'default' : 'outline'}
                  size="iconSm"
                  onClick={() => setStyle({ underline: !single?.style.underline })}
                >
                  <Underline />
                </Button>
                <AlignButtonsInline style={single?.style} onSet={setStyle} />
              </div>
              <Row label="Color">
                <ColorField value={single?.style.color} onChange={(c) => setStyle({ color: c })} allowClear />
              </Row>
            </Section>
          )}

          {single?.type === 'shape' && (
            <Section title="Shape">
              <Select
                value={single.data.shape ?? 'rectangle'}
                onValueChange={(v) => useEditorStore.getState().setShapeKind(ids, v as ShapeKind)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHAPE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {SHAPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Row label="Fill">
                <ColorField value={single.style.fill} onChange={(c) => setStyle({ fill: c ?? 'transparent' })} />
              </Row>
              <Row label="Border">
                <ColorField value={single.style.stroke} onChange={(c) => setStyle({ stroke: c })} />
              </Row>
              <Row label="Border width">
                <NumberField
                  className="w-20"
                  value={single.style.strokeWidth ?? 0}
                  min={0}
                  max={24}
                  onLive={(v) => setStyle({ strokeWidth: v })}
                  onCommit={(v) => setStyle({ strokeWidth: v })}
                />
              </Row>
              <Row label="Text color">
                <ColorField value={single.style.color} onChange={(c) => setStyle({ color: c })} allowClear />
              </Row>
            </Section>
          )}

          {single?.type === 'image' && (
            <Section title="Image">
              <Row label="Fit">
                <Select
                  value={String(single.style.fit ?? 'cover')}
                  onValueChange={(v) => setStyle({ fit: v as 'cover' | 'contain' })}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Fill (crop)</SelectItem>
                    <SelectItem value="contain">Fit (letterbox)</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Corner radius">
                <NumberField
                  className="w-20"
                  value={single.style.radius ?? 8}
                  min={0}
                  max={200}
                  onLive={(v) => setStyle({ radius: v })}
                  onCommit={(v) => setStyle({ radius: v })}
                />
              </Row>
            </Section>
          )}

          {single?.type === 'frame' && (
            <Section title="Frame">
              <Row label="Title">
                <Input
                  className="h-7 px-2 text-xs"
                  value={String(single.data.text ?? '')}
                  onChange={(e) => livePos({ data: { ...single.data, text: e.target.value } })}
                  onBlur={(e) => useEditorStore.getState().setText(single.id, e.target.value)}
                />
              </Row>
              <Row label="Border">
                <ColorField value={single.style.stroke} onChange={(c) => setStyle({ stroke: c })} />
              </Row>
            </Section>
          )}

          {single?.type === 'mindmap_node' && (
            <Section title="Mind map">
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" onClick={() => useEditorStore.getState().addMindChild(single.id)}>
                  <GitBranch /> Add child
                </Button>
                {!single.data.mind?.parentId && (
                  <Button variant="outline" size="sm" onClick={() => useEditorStore.getState().addMindSibling(single.id)}>
                    Add sibling
                  </Button>
                )}
                {(single.data.mind?.childCount ?? 0) > 0 && (
                  <Button variant="outline" size="sm" onClick={() => useEditorStore.getState().toggleCollapse(single.id)}>
                    {single.data.mind?.collapsed ? 'Expand' : 'Collapse'}
                  </Button>
                )}
              </div>
              <Row label="Layout">
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="iconSm" onClick={() => single.data.mind && useEditorStore.getState().setMindLayout(single.data.mind.rootId ?? single.id, 'horizontal')}>
                        <ArrowRight />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Horizontal</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="iconSm" onClick={() => single.data.mind && useEditorStore.getState().setMindLayout(single.data.mind.rootId ?? single.id, 'vertical')}>
                        <ArrowDown />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vertical</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="iconSm" onClick={() => single.data.mind && useEditorStore.getState().setMindLayout(single.data.mind.rootId ?? single.id, 'radial')}>
                        <Orbit />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Radial</TooltipContent>
                  </Tooltip>
                </div>
              </Row>
              <Swatches colors={MIND_COLORS} value={single.style.fill} onPick={(c) => setStyle({ fill: c })} />
              <Row label="Text color">
                <ColorField value={single.style.color} onChange={(c) => setStyle({ color: c })} allowClear />
              </Row>
              {mindChildrenOf(objects, single.id).length > 0 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => useEditorStore.getState().relayoutMindMap(single.data.mind?.rootId ?? single.id)}>
                  Auto-arrange branch
                </Button>
              )}
            </Section>
          )}

          <Section title="Actions">
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={() => useEditorStore.getState().duplicateSelection()}>
                <CopyPlus /> Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={() => useEditorStore.getState().copySelection()}>
                <Copy /> Copy
              </Button>
              {selectedObjects.length > 1 && (
                <Button variant="outline" size="sm" onClick={() => useEditorStore.getState().group(ids)}>
                  <GroupIcon /> Group
                </Button>
              )}
              {(single?.type === 'group' || selectedObjects.some((o) => o.parentId)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => useEditorStore.getState().ungroup(single?.type === 'group' ? [single.id] : ids)}
                >
                  <UngroupIcon /> Ungroup
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  if (selectedObjects.every((o) => o.type === 'mindmap_node')) useEditorStore.getState().deleteMindNodes(ids);
                  else useEditorStore.getState().deleteSelection();
                }}
              >
                <Trash2 /> Delete
              </Button>
            </div>
          </Section>
        </>
      )}
    </aside>
  );
}

function AlignButtons({ style, onSet }: { style: CanvasObject['style']; onSet: (p: Partial<CanvasObject['style']>) => void }) {
  return <AlignButtonsInline style={style} onSet={onSet} />;
}

function AlignButtonsInline({ style, onSet }: { style?: CanvasObject['style']; onSet: (p: Partial<CanvasObject['style']>) => void }) {
  const align = style?.align ?? 'left';
  return (
    <>
      <Button variant={align === 'left' ? 'default' : 'outline'} size="iconSm" onClick={() => onSet({ align: 'left' })}>
        <AlignLeft />
      </Button>
      <Button variant={align === 'center' ? 'default' : 'outline'} size="iconSm" onClick={() => onSet({ align: 'center' })}>
        <AlignCenter />
      </Button>
      <Button variant={align === 'right' ? 'default' : 'outline'} size="iconSm" onClick={() => onSet({ align: 'right' })}>
        <AlignRight />
      </Button>
    </>
  );
}

function EdgeProperties({ edges }: { edges: Edge[] }) {
  const single = edges.length === 1 ? edges[0] : undefined;
  const ids = edges.map((e) => e.id);
  return (
    <>
      <Section title="Connection">
        <Row label="Line">
          <Select
            value={single?.data.route ?? 'curved'}
            onValueChange={(v) => useEditorStore.getState().setEdgeRoute(ids, v as ConnectorRoute)}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="straight">Straight</SelectItem>
              <SelectItem value="curved">Curved</SelectItem>
              <SelectItem value="elbow">Elbow</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Arrows">
          <Select
            value={single?.data.arrow ?? 'none'}
            onValueChange={(v) => useEditorStore.getState().setEdgeArrow(ids, v as ArrowStyle)}
          >
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="arrow">Arrow</SelectItem>
              <SelectItem value="double">Double arrow</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Color">
          <ColorField value={single?.style.color} onChange={(c) => useEditorStore.getState().updateEdges(ids, (e) => ({ style: { ...e.style, color: c } }))} allowClear />
        </Row>
        {single && (
          <Row label="Width">
            <NumberField
              className="w-20"
              value={single.style.width ?? 2}
              min={0.5}
              max={12}
              step={0.5}
              onLive={(v) => useEditorStore.getState().updateEdges(ids, (e) => ({ style: { ...e.style, width: v } }), { history: false })}
              onCommit={(v) => useEditorStore.getState().updateEdges(ids, (e) => ({ style: { ...e.style, width: v } }))}
            />
          </Row>
        )}
      </Section>
      <Section title="Actions">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => useEditorStore.getState().deleteEdgesByIds(ids)}
        >
          <Scissors /> Delete connection
        </Button>
      </Section>
    </>
  );
}
