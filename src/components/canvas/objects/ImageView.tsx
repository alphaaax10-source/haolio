import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { CanvasObject } from '@/lib/types';

export function ImageView({ obj }: { obj: CanvasObject }) {
  const [failed, setFailed] = useState(false);
  const src = String(obj.data.src ?? '');
  if (failed || !src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 text-muted-foreground">
        <ImageOff size={18} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className="h-full w-full"
      style={{
        objectFit: obj.style.fit === 'contain' ? 'contain' : 'cover',
        borderRadius: obj.style.radius ?? 8,
        opacity: obj.style.opacity ?? 1,
        userSelect: 'none',
      }}
    />
  );
}
