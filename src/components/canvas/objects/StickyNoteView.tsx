import { useEditorStore } from '@/stores/editorStore';
import { EditableText } from '@/components/EditableText';
import type { CanvasObject } from '@/lib/types';

export function StickyNoteView({ obj, editing }: { obj: CanvasObject; editing: boolean }) {
  const text = String(obj.data.text ?? '');
  const shadow = 'shadow-[0_2px_8px_rgba(0,0,0,0.14)]';
  const typography: React.CSSProperties = {
    fontSize: obj.style.fontSize ?? 15,
    fontWeight: obj.style.bold ? 700 : 400,
    color: obj.style.color ?? '#1c1917',
    textAlign: obj.style.align ?? 'left',
    lineHeight: 1.4,
  };
  return (
    <div
      className={`h-full w-full overflow-hidden p-3 ${shadow}`}
      style={{
        background: obj.style.fill ?? '#fbbf24',
        borderRadius: obj.style.radius ?? 10,
        opacity: obj.style.opacity ?? 1,
      }}
    >
      <EditableText
        value={text}
        editing={editing}
        onStartEdit={() => useEditorStore.getState().setEditingId(obj.id)}
        onCommit={(t) => {
          useEditorStore.getState().setEditingId(null);
          if (t !== text) useEditorStore.getState().setText(obj.id, t);
        }}
        onCancel={() => useEditorStore.getState().setEditingId(null)}
        onLiveChange={(t) => {
          useEditorStore.getState().updateObjectLive(obj.id, { data: { ...obj.data, text: t } });
        }}
        className="h-full w-full"
        style={typography}
        placeholder="Write something…"
      />
    </div>
  );
}
