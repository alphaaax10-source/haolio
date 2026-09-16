import { useEditorStore } from '@/stores/editorStore';
import { EditableText } from '@/components/EditableText';
import { isShapeKind, shapePath } from '@/lib/geometry';
import type { CanvasObject } from '@/lib/types';
import { useT } from '@/lib/i18n';

export function ShapeView({ obj, editing }: { obj: CanvasObject; editing: boolean }) {
  const t = useT();
  const kind = isShapeKind(obj.data.shape) ? obj.data.shape : 'rectangle';
  const text = String(obj.data.text ?? '');
  const fill = obj.style.fill ?? '#6366f1';
  const stroke = obj.style.stroke;
  const strokeWidth = obj.style.strokeWidth ?? 0;

  return (
    <div className="h-full w-full" style={{ opacity: obj.style.opacity ?? 1 }}>
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${Math.max(obj.width, 1)} ${Math.max(obj.height, 1)}`} preserveAspectRatio="none">
        <path
          d={shapePath(kind, Math.max(obj.width, 1), Math.max(obj.height, 1))}
          fill={fill === 'transparent' ? 'none' : fill}
          stroke={strokeWidth > 0 && stroke ? stroke : 'none'}
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="flex h-full w-full items-center justify-center overflow-hidden px-2">
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
          className="max-h-full overflow-hidden"
          style={{
            fontSize: obj.style.fontSize ?? 15,
            fontWeight: obj.style.bold ? 700 : 400,
            color: obj.style.color ?? '#ffffff',
            textAlign: obj.style.align ?? 'center',
            lineHeight: 1.3,
          }}
          placeholder={t('ph.label')}
        />
      </div>
    </div>
  );
}
