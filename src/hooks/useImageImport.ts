import { useCallback } from 'react';
import { worldFromClient } from '@/lib/pointerMath';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { createImage } from '@/lib/format';
import { toast } from '@/stores/toastStore';
import type { Vec } from '@/lib/types';
import { tNow } from '@/lib/i18n';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif', 'image/bmp', 'image/avif'];

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function imageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 320;
      const h = img.naturalHeight || 240;
      resolve({ w, h });
    };
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

function viewportCenterWorld(): Vec {
  const { viewport, size } = useCanvasStore.getState();
  return { x: (size.width / 2 - viewport.x) / viewport.zoom, y: (size.height / 2 - viewport.y) / viewport.zoom };
}

/**
 * Import local image files as canvas objects (data URLs — never uploaded).
 * Used by drag & drop onto the canvas and the toolbar's image button.
 */
export function useImageImport() {
  const importFiles = useCallback(async (files: FileList | File[], at?: Vec) => {
    const list = [...files];
    const images = list.filter((f) => ACCEPTED.includes(f.type) || /\.(png|jpe?g|webp|svg|gif|bmp|avif)$/i.test(f.name));
    if (images.length === 0) {
      if (list.length > 0) toast.error(tNow('msg.importUnsupported'));
      return;
    }
    const editor = useEditorStore.getState();
    if (!editor.data) return;
    let index = 0;
    for (const file of images) {
      if (file.size > MAX_BYTES) {
        toast.error(tNow('msg.importTooBig', { name: file.name }));
        continue;
      }
      try {
        const src = await readAsDataURL(file);
        const { w, h } = await imageSize(src);
        const scale = Math.min(1, 440 / Math.max(w, h));
        const width = Math.max(24, Math.round(w * scale));
        const height = Math.max(24, Math.round(h * scale));
        const center = at ?? viewportCenterWorld();
        const obj = createImage(
          src,
          Math.round(center.x - width / 2 + index * 28),
          Math.round(center.y - height / 2 + index * 28),
          width,
          height,
          Math.max(0, ...Object.values(editor.objects).map((o) => o.z)) + 1 + index,
        );
        editor.addObjects([obj], [], 'Import image');
        index += 1;
      } catch {
        toast.error(tNow('msg.importFail', { name: file.name }));
      }
    }
  }, []);

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        void importFiles(e.dataTransfer.files, worldFromClient(e.clientX, e.clientY));
      }
    },
  };

  return { importFiles, dropHandlers };
}
