import { useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useEditorStore, mindChildrenOf } from '@/stores/editorStore';
import { useElementAutoSize } from '@/hooks/useElementAutoSize';
import { EditableText } from '@/components/EditableText';
import type { CanvasObject } from '@/lib/types';

export function MindNodeView({ obj, editing }: { obj: CanvasObject; editing: boolean }) {
  const mind = obj.data.mind;
  const text = String(obj.data.text ?? '');

  const onAutoSize = useCallback(
    (width: number, height: number) => {
      const editor = useEditorStore.getState();
      if (Math.abs(obj.width - width) > 1 || Math.abs(obj.height - height) > 1) {
        editor.updateObjectLive(obj.id, { width: Math.ceil(width), height: Math.ceil(height) });
      }
    },
    [obj.id, obj.width, obj.height],
  );

  const contentRef = useElementAutoSize(true, onAutoSize, [text, obj.style.fontSize, obj.style.bold]);

  // Collapse toggle position follows the tree layout direction.
  const rootId = mind?.rootId;
  const layout = (rootId ? useEditorStore.getState().objects[rootId]?.data.mind?.layout : undefined) ?? mind?.layout ?? 'horizontal';
  const hasChildren = (mind?.childCount ?? 0) > 0;

  const toggleStyle: React.CSSProperties =
    layout === 'horizontal'
      ? { right: -22, top: '50%', transform: 'translateY(-50%)' }
      : { bottom: -22, left: '50%', transform: 'translateX(-50%)' };

  return (
    <div className="relative h-full w-full">
      <div
        ref={contentRef}
        className="flex h-full w-full items-center justify-center overflow-hidden px-3 text-center shadow-sm"
        style={{
          width: 'fit-content',
          minWidth: obj.width,
          minHeight: obj.height,
          background: obj.style.fill ?? '#6366f1',
          color: obj.style.color ?? '#ffffff',
          borderRadius: Math.min(obj.style.radius ?? 12, obj.height / 2),
          opacity: obj.style.opacity ?? 1,
        }}
      >
        <EditableText
          value={text}
          editing={editing}
          onStartEdit={() => useEditorStore.getState().setEditingId(obj.id)}
          onCommit={(t) => {
            useEditorStore.getState().setEditingId(null);
            if (t !== text) useEditorStore.getState().setText(obj.id, t || 'New idea');
          }}
          onCancel={() => useEditorStore.getState().setEditingId(null)}
          onLiveChange={(t) => {
            useEditorStore.getState().updateObjectLive(obj.id, { data: { ...obj.data, text: t } });
          }}
          className="line-clamp-5"
          style={{
            fontSize: obj.style.fontSize ?? 14,
            fontWeight: obj.style.bold ? 700 : 500,
            textAlign: obj.style.align ?? 'center',
            lineHeight: 1.3,
          }}
        />
      </div>
      {hasChildren && !editing && (
        <button
          type="button"
          className="absolute z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/60 text-white shadow-sm transition-transform hover:scale-110"
          style={{ ...toggleStyle, background: obj.style.fill ?? '#6366f1' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            useEditorStore.getState().toggleCollapse(obj.id);
          }}
          title={mind?.collapsed ? 'Expand branch (Space)' : 'Collapse branch (Space)'}
        >
          {mind?.collapsed ? <Plus size={11} strokeWidth={3} /> : <Minus size={11} strokeWidth={3} />}
        </button>
      )}
    </div>
  );
}
