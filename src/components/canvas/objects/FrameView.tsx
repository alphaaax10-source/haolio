import { useEditorStore } from '@/stores/editorStore';
import { EditableText } from '@/components/EditableText';
import type { CanvasObject } from '@/lib/types';

interface FrameViewProps {
  obj: CanvasObject;
  editing: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}

export function FrameView({ obj, editing, onPointerDown, onDoubleClick }: FrameViewProps) {
  const title = String(obj.data.text ?? '');
  const stroke = obj.style.stroke ?? '#8b5cf6';
  return (
    <>
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          border: `${obj.style.strokeWidth ?? 1.5}px solid ${stroke}`,
          borderRadius: obj.style.radius ?? 12,
          background: obj.style.fill && obj.style.fill !== 'transparent' ? obj.style.fill : 'transparent',
          pointerEvents: 'none',
        }}
      />
      <div
        className="absolute inline-flex max-w-[240px] cursor-move items-center"
        style={{ left: 0, top: -28, height: 24, pointerEvents: 'auto' }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
      >
        <EditableText
          value={title}
          editing={editing}
          onStartEdit={() => useEditorStore.getState().setEditingId(obj.id)}
          onCommit={(t) => {
            useEditorStore.getState().setEditingId(null);
            if (t !== title) useEditorStore.getState().setText(obj.id, t);
          }}
          onCancel={() => useEditorStore.getState().setEditingId(null)}
          className="truncate font-semibold outline-none"
          style={{ fontSize: 14, color: stroke }}
        />
      </div>
    </>
  );
}
