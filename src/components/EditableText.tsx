import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface EditableTextProps {
  value: string;
  editing: boolean;
  onStartEdit?: () => void;
  onCommit: (text: string) => void;
  onLiveChange?: (text: string) => void;
  onCancel?: () => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

/**
 * Inline text editor used by every text-bearing object. Renders static text
 * with double-click-to-edit, or a style-matched textarea while editing.
 * Enter commits, Shift+Enter inserts a newline, Escape cancels.
 */
export function EditableText({
  value,
  editing,
  onStartEdit,
  onCommit,
  onLiveChange,
  onCancel,
  className,
  style,
  placeholder,
}: EditableTextProps) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      // Focus after mount and place the caret at the end.
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    return (
      <div
        className={cn('whitespace-pre-wrap break-words', className)}
        style={style}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit?.();
        }}
      >
        {value}
      </div>
    );
  }

  const commit = () => {
    onCommit(draft);
  };

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        'w-full resize-none border-0 bg-transparent p-0 outline-none ring-0 focus:outline-none focus:ring-0',
        className,
      )}
      style={style}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        setDraft(e.target.value);
        onLiveChange?.(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel?.();
          onCommit(value); // revert
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}
