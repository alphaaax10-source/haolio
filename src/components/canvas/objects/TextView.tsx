import { useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useElementAutoSize } from '@/hooks/useElementAutoSize';
import { EditableText } from '@/components/EditableText';
import type { CanvasObject } from '@/lib/types';

export function TextView({ obj, editing }: { obj: CanvasObject; editing: boolean }) {
  const text = String(obj.data.text ?? '');
  const style = obj.style;

  const onAutoSize = useCallback(
    (width: number, height: number) => {
      const editor = useEditorStore.getState();
      if (Math.abs(obj.width - width) > 1 || Math.abs(obj.height - height) > 1) {
        editor.updateObjectLive(obj.id, { width: Math.ceil(width), height: Math.ceil(height) });
      }
    },
    [obj.id, obj.width, obj.height],
  );

  const contentRef = useElementAutoSize(!editing, onAutoSize, [text, style.fontSize, style.bold]);

  const typography: React.CSSProperties = {
    fontSize: style.fontSize ?? 18,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : undefined,
    textDecoration: style.underline ? 'underline' : undefined,
    color: style.color ?? 'hsl(var(--foreground))',
    lineHeight: 1.35,
  };

  return (
    <div
      ref={contentRef}
      className="h-min min-w-[2ch] whitespace-pre"
      style={{ width: 'fit-content', textAlign: style.align ?? 'left', minWidth: editing ? obj.width : undefined }}
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
        className="outline-none"
        style={typography}
        placeholder="Text"
      />
    </div>
  );
}
