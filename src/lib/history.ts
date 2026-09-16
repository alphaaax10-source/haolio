import type { CanvasObject, Edge } from './types';

/**
 * History entry: holds references to the immutable (copy-on-write) document
 * maps captured before and after a committed change. Because every mutation
 * replaces only the changed entries, snapshots are cheap to retain.
 */
export interface HistorySnapshot {
  objects: Record<string, CanvasObject>;
  edges: Record<string, Edge>;
  roots: string[];
}

export interface HistoryEntry {
  label: string;
  before: HistorySnapshot;
  after: HistorySnapshot;
}

export interface HistoryState {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
  /** Revision of the last committed state; changes since it are one transaction. */
  baseRev: number;
}

export const HISTORY_LIMIT = 100;

export function initialHistory(): HistoryState {
  return { undo: [], redo: [], baseRev: 0 };
}

/**
 * Collect the ids of all objects that will be stored in clipboard data and
 * remap them on paste. Kept here so the clipboard format lives next to the
 * history primitives it mirrors.
 */
export interface ClipboardPayload {
  objects: CanvasObject[];
  edges: Edge[];
  mindRoots: string[];
}

export function remapClipboard(payload: ClipboardPayload): ClipboardPayload {
  const idMap = new Map<string, string>();
  const nextId = (() => {
    let counter = 0;
    const alphabet = 'pasteabcdefghijklmnopqrstuvwxyz0123456789';
    return () => {
      let id = '';
      let n = counter++;
      do {
        id += alphabet[n % alphabet.length];
        n = Math.floor(n / alphabet.length);
      } while (n > 0 && id.length < 12);
      return 'p' + id + counter.toString(36);
    };
  })();
  for (const obj of payload.objects) idMap.set(obj.id, nextId());
  const objects = payload.objects.map((obj) => ({
    ...obj,
    id: idMap.get(obj.id)!,
    parentId: obj.parentId ? (idMap.has(obj.parentId) ? idMap.get(obj.parentId)! : null) : null,
    data: {
      ...obj.data,
      mind: obj.data.mind
        ? {
            ...obj.data.mind,
            parentId: obj.data.mind.parentId && idMap.has(obj.data.mind.parentId) ? idMap.get(obj.data.mind.parentId)! : null,
            rootId: obj.data.mind.rootId && idMap.has(obj.data.mind.rootId) ? idMap.get(obj.data.mind.rootId)! : null,
          }
        : undefined,
    },
  }));
  const edges = payload.edges
    .filter((e) => idMap.has(e.from) && idMap.has(e.to))
    .map((e) => ({
      ...e,
      id: nextId(),
      from: idMap.get(e.from)!,
      to: idMap.get(e.to)!,
    }));
  const mindRoots = payload.mindRoots.map((r) => idMap.get(r)).filter((r): r is string => !!r);
  return { objects, edges, mindRoots };
}
