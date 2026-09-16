import { memo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { beginConnect, beginObjectDrag, beginPan } from '../interactions';
import { ObjectContextMenu } from '../ObjectContextMenu';
import { TextView } from './TextView';
import { StickyNoteView } from './StickyNoteView';
import { ShapeView } from './ShapeView';
import { FrameView } from './FrameView';
import { MindNodeView } from './MindNodeView';
import { ImageView } from './ImageView';
import type { CanvasObject } from '@/lib/types';

/**
 * Positions an object in world space, owns its pointer behavior (select/drag,
 * connect, pan) and wraps it in a context menu.
 */
export const ObjectFrame = memo(function ObjectFrame({ obj }: { obj: CanvasObject }) {
  const editing = useEditorStore((s) => s.editingId === obj.id);

  if (obj.type === 'group') return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    const canvas = useCanvasStore.getState();
    if (canvas.spacePanning || canvas.tool === 'hand') {
      beginPan(e);
      return;
    }
    if (canvas.tool === 'connector') {
      beginConnect(e, obj);
      return;
    }
    if (e.button === 0) beginObjectDrag(e, obj);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const editor = useEditorStore.getState();
    if (['text', 'sticky_note', 'shape', 'mindmap_node', 'frame'].includes(obj.type)) {
      if (!editor.selection.objects.includes(obj.id)) editor.setSelection([obj.id]);
      editor.setEditingId(obj.id);
    }
  };

  const isFrame = obj.type === 'frame';
  const view = (() => {
    switch (obj.type) {
      case 'text':
        return <TextView obj={obj} editing={editing} />;
      case 'sticky_note':
        return <StickyNoteView obj={obj} editing={editing} />;
      case 'shape':
        return <ShapeView obj={obj} editing={editing} />;
      case 'frame':
        return <FrameView obj={obj} editing={editing} onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} />;
      case 'mindmap_node':
        return <MindNodeView obj={obj} editing={editing} />;
      case 'image':
        return <ImageView obj={obj} />;
      default:
        return null;
    }
  })();

  return (
    <ObjectContextMenu obj={obj}>
      <div
        data-object-id={obj.id}
        className="absolute touch-none select-none"
        style={{
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
          transformOrigin: 'center center',
          zIndex: obj.z,
          pointerEvents: isFrame ? 'none' : 'auto',
        }}
        onPointerDown={isFrame ? undefined : onPointerDown}
        onDoubleClick={isFrame ? undefined : onDoubleClick}
        // The canvas background is also a Radix ContextMenu trigger; without
        // stopping propagation here BOTH menus would open on right-click and
        // the canvas menu would cover the object's own menu.
        onContextMenu={(e) => e.stopPropagation()}
      >
        {view}
      </div>
    </ObjectContextMenu>
  );
});
