import type { CanvasObject, Edge } from './types';
import { remapClipboard, type ClipboardPayload } from './history';

let buffer: ClipboardPayload | null = null;

export function clipboardHasContent(): boolean {
  return buffer !== null && buffer.objects.length > 0;
}

/**
 * Store a safe, plain-data copy of objects + their internal edges.
 * Only JSON-safe fields are kept (the domain model is plain data already).
 */
export function copyToClipboard(
  objects: CanvasObject[],
  edges: Edge[],
  mindRoots: string[],
): void {
  buffer = {
    objects: objects.map((o) => JSON.parse(JSON.stringify(o)) as CanvasObject),
    edges: edges.map((e) => JSON.parse(JSON.stringify(e)) as Edge),
    mindRoots: [...mindRoots],
  };
  // Best-effort plain-text summary for other apps (never required).
  try {
    const text = objects
      .map((o) => String(o.data.text ?? '').trim())
      .filter(Boolean)
      .join('\n');
    if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(() => undefined);
    }
  } catch {
    // Clipboard API may be unavailable — internal buffer still works.
  }
}

export function pasteFromClipboard(offset = 24): ClipboardPayload | null {
  if (!buffer) return null;
  const copy = remapClipboard(JSON.parse(JSON.stringify(buffer)) as ClipboardPayload);
  for (const obj of copy.objects) {
    obj.x += offset;
    obj.y += offset;
  }
  return copy;
}

export function clearClipboard(): void {
  buffer = null;
}
