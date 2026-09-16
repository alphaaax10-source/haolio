import { create } from 'zustand';
import type {
  Board,
  CanvasObject,
  Edge,
  ObjectStyle,
  Project,
  SaveStatus,
  ShapeKind,
  ConnectorRoute,
  ArrowStyle,
} from '@/lib/types';
import { createId } from '@/lib/id';
import {
  createBoard,
  createEdge,
  createFrame,
  createImage,
  createMindNode,
  createShape,
  createSticky,
  createText,
  MIND_COLORS,
  nowIso,
} from '@/lib/format';
import { initialHistory, HISTORY_LIMIT, type HistoryState } from '@/lib/history';
import { descendantsOf, layoutMindMap } from '@/lib/layout';
import { unionRects, objectBounds, inflate } from '@/lib/geometry';
import { clearClipboard, copyToClipboard, pasteFromClipboard } from '@/lib/clipboard';

// -----------------------------------------------------------------------------
// The editor store owns the ACTIVE project document. All mutations are
// copy-on-write and flow through `commit()` so undo/redo captures every change
// (including drags, which update live with history disabled, then collapse
// into a single entry on pointer-up).
// -----------------------------------------------------------------------------

interface DocRefs {
  objects: Record<string, CanvasObject>;
  edges: Record<string, Edge>;
  roots: string[];
}

interface Selection {
  objects: string[];
  edges: string[];
}

export interface EditorState {
  projectId: string | null;
  data: Project | null;
  boardId: string | null;
  objects: Record<string, CanvasObject>;
  edges: Record<string, Edge>;
  roots: string[];
  rev: number;
  history: HistoryState;
  lastCommitted: DocRefs | null;
  selection: Selection;
  editingId: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;

  // --- lifecycle ---
  openProject(project: Project, projectId: string, boardId?: string): void;
  closeProject(): void;
  setSaveStatus(status: SaveStatus, error?: string | null): void;
  renameProject(name: string): void;

  // --- boards ---
  addBoard(title?: string): string;
  renameBoard(id: string, title: string): void;
  duplicateBoard(id: string): void;
  deleteBoard(id: string): boolean;
  moveBoard(id: string, dir: -1 | 1): void;
  selectBoard(id: string): void;

  // --- history ---
  commit(label?: string): void;
  undo(): void;
  redo(): void;

  // --- objects ---
  createObjectAt(
    tool: 'text' | 'sticky' | 'shape' | 'frame' | 'mindmap',
    x: number,
    y: number,
    rect?: { width: number; height: number },
    shapeKind?: ShapeKind,
  ): string | null;
  addObjects(objects: CanvasObject[], edges?: Edge[], label?: string, opts?: { history?: boolean }): void;
  updateObjects(ids: string[], patch: Partial<CanvasObject> | ((obj: CanvasObject) => Partial<CanvasObject>), opts?: { history?: boolean; label?: string }): void;
  updateObjectLive(id: string, patch: Partial<CanvasObject>): void;
  deleteObjectsByIds(ids: string[], label?: string, opts?: { history?: boolean }): void;
  setText(id: string, text: string): void;
  setStyle(ids: string[], patch: Partial<ObjectStyle>): void;
  setShapeKind(ids: string[], kind: ShapeKind): void;
  reorder(ids: string[], where: 'front' | 'back'): void;
  group(ids: string[]): string | null;
  ungroup(ids: string[]): void;
  reparentIntoFrames(ids: string[]): void;
  moveObjectsDelta(ids: string[], dx: number, dy: number): void;

  // --- edges ---
  connectObjects(fromId: string, toId: string): string | null;
  addEdge(edge: Edge, label?: string): void;
  updateEdges(ids: string[], patch: Partial<Edge> | ((edge: Edge) => Partial<Edge>), opts?: { history?: boolean }): void;
  setEdgeRoute(ids: string[], route: ConnectorRoute): void;
  setEdgeArrow(ids: string[], arrow: ArrowStyle): void;
  deleteEdgesByIds(ids: string[], label?: string): void;

  // --- selection / editing ops ---
  setSelection(objectIds: string[], edgeIds?: string[]): void;
  clearSelection(): void;
  selectAll(): void;
  setEditingId(id: string | null): void;
  deleteSelection(): void;
  copySelection(): boolean;
  cutSelection(): boolean;
  pasteClipboard(): boolean;
  duplicateSelection(): boolean;

  // --- mind map ---
  createMindMap(x: number, y: number): string;
  addMindChild(parentId: string): string | null;
  addMindSibling(nodeId: string): string | null;
  deleteMindNodes(ids: string[]): void;
  toggleCollapse(id: string): void;
  duplicateMindNodes(ids: string[]): void;
  setMindLayout(rootId: string, layout: 'horizontal' | 'vertical' | 'radial'): void;
  relayoutMindMap(rootId: string): void;
}

function activeBoard(state: EditorState): Board | undefined {
  return state.data?.boards.find((b) => b.id === state.boardId);
}

export function mindChildrenOf(objects: Record<string, CanvasObject>, id: string): CanvasObject[] {
  return Object.values(objects)
    .filter((o) => o.type === 'mindmap_node' && o.data.mind?.parentId === id)
    .sort((a, b) => (a.data.mind?.order ?? 0) - (b.data.mind?.order ?? 0));
}

export function isMindNode(obj?: CanvasObject | null): boolean {
  return !!obj && obj.type === 'mindmap_node';
}

function maxZ(objects: Record<string, CanvasObject>): number {
  let z = 0;
  for (const o of Object.values(objects)) z = Math.max(z, o.z);
  return z;
}

function maxEdgeZ(edges: Record<string, Edge>): number {
  let z = 0;
  for (const e of Object.values(edges)) z = Math.max(z, e.z);
  return z;
}

/** All objects that must move together with the given selection (frames/groups pull their children). */
export function expandWithDescendants(objects: Record<string, CanvasObject>, ids: string[]): string[] {
  const set = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const obj of Object.values(objects)) {
      if (obj.parentId && set.has(obj.parentId) && !set.has(obj.id)) {
        set.add(obj.id);
        grew = true;
      }
    }
  }
  return [...set];
}

function objectIdsAttachedTo(objects: Record<string, CanvasObject>, edges: Record<string, Edge>, ids: string[]): string[] {
  const set = new Set(ids);
  for (const id of ids) {
    // Mind map nodes take their whole subtree with them.
    const obj = objects[id];
    if (obj?.type === 'mindmap_node') {
      for (const d of descendantsOf(objects, id)) set.add(d);
    }
  }
  return [...set];
}

export const useEditorStore = create<EditorState>()((set, get) => {
  // Applies doc refs to state and mirrors them onto the active board of data.
  const applyRefs = (refs: DocRefs, extra?: Partial<EditorState>) => {
    const state = get();
    const board = activeBoard(state);
    if (board) {
      board.objects = refs.objects;
      board.edges = refs.edges;
      board.roots = refs.roots;
    }
    set({ objects: refs.objects, edges: refs.edges, roots: refs.roots, rev: state.rev + 1, ...extra } as Partial<EditorState>);
  };

  const currentRefs = (): DocRefs => {
    const s = get();
    return { objects: s.objects, edges: s.edges, roots: s.roots };
  };

  const mutateObjects = (fn: (draft: Record<string, CanvasObject>) => void) => {
    const state = get();
    const next = { ...state.objects };
    fn(next);
    const board = activeBoard(state);
    if (board) board.objects = next;
    set({ objects: next, rev: state.rev + 1 });
  };

  const mutateEdges = (fn: (draft: Record<string, Edge>) => void) => {
    const state = get();
    const next = { ...state.edges };
    fn(next);
    const board = activeBoard(state);
    if (board) board.edges = next;
    set({ edges: next, rev: state.rev + 1 });
  };

  const mutateRoots = (fn: (draft: string[]) => string[]) => {
    const state = get();
    const next = fn([...state.roots]);
    const board = activeBoard(state);
    if (board) board.roots = next;
    set({ roots: next, rev: state.rev + 1 });
  };

  const touchProject = () => {
    const state = get();
    if (state.data) state.data.project.modifiedAt = nowIso();
  };

  const pruneSelection = () => {
    const s = get();
    const objects = s.selection.objects.filter((id) => s.objects[id]);
    const edges = s.selection.edges.filter((id) => s.edges[id]);
    if (objects.length !== s.selection.objects.length || edges.length !== s.selection.edges.length) {
      set({ selection: { objects, edges } });
    }
  };

  const relayoutTree = (rootId: string, opts: { history: boolean; label: string }) => {
    const s = get();
    const root = s.objects[rootId];
    if (!root?.data.mind) return;
    const nodes = Object.values(s.objects)
      .filter((o) => o.type === 'mindmap_node' && o.data.mind)
      .map((o) => ({
        id: o.id,
        parentId: o.data.mind!.parentId,
        order: o.data.mind!.order,
        width: o.width,
        height: o.height,
        collapsed: o.data.mind!.collapsed,
      }));
    const result = layoutMindMap(
      nodes.find((n) => n.id === rootId)!,
      nodes.filter((n) => n.id !== rootId),
      root.data.mind!.layout,
      { x: root.x, y: root.y },
    );
    mutateObjects((draft) => {
      for (const [id, pos] of Object.entries(result.positions)) {
        const obj = draft[id];
        if (obj) draft[id] = { ...obj, x: pos.x, y: pos.y };
      }
    });
    if (opts.history) get().commit(opts.label);
  };

  return {
    projectId: null,
    data: null,
    boardId: null,
    objects: {},
    edges: {},
    roots: [],
    rev: 0,
    history: initialHistory(),
    lastCommitted: null,
    selection: { objects: [], edges: [] },
    editingId: null,
    saveStatus: 'idle',
    saveError: null,

    openProject: (project, projectId, boardId) => {
      const board = project.boards.find((b) => b.id === boardId) ?? project.boards[0]!;
      set({
        projectId,
        data: project,
        boardId: board.id,
        objects: board.objects,
        edges: board.edges,
        roots: board.roots,
        rev: 0,
        history: initialHistory(),
        lastCommitted: { objects: board.objects, edges: board.edges, roots: board.roots },
        selection: { objects: [], edges: [] },
        editingId: null,
        saveStatus: 'saved',
        saveError: null,
      });
    },

    closeProject: () => {
      clearClipboard();
      set({
        projectId: null,
        data: null,
        boardId: null,
        objects: {},
        edges: {},
        roots: [],
        history: initialHistory(),
        lastCommitted: null,
        selection: { objects: [], edges: [] },
        editingId: null,
        saveStatus: 'idle',
        saveError: null,
      });
    },

    setSaveStatus: (status, error = null) => set({ saveStatus: status, saveError: error }),

    renameProject: (name) => {
      const s = get();
      if (!s.data) return;
      s.data.project.name = name;
      set({ rev: s.rev + 1 });
    },

    // --- boards ---------------------------------------------------------------

    addBoard: (title) => {
      const s = get();
      if (!s.data) return '';
      const board = createBoard(title ?? `Board ${s.data.boards.length + 1}`);
      s.data.boards.push(board);
      set({ rev: s.rev + 1 });
      get().selectBoard(board.id);
      return board.id;
    },

    renameBoard: (id, title) => {
      const s = get();
      const board = s.data?.boards.find((b) => b.id === id);
      if (board) {
        board.title = title;
        set({ rev: s.rev + 1 });
      }
    },

    duplicateBoard: (id) => {
      const s = get();
      if (!s.data) return;
      const index = s.data.boards.findIndex((b) => b.id === id);
      if (index < 0) return;
      const source = s.data.boards[index]!;
      const idMap = new Map<string, string>();
      const objects: Record<string, CanvasObject> = {};
      for (const [key, obj] of Object.entries(source.objects)) {
        const newId = createId();
        idMap.set(key, newId);
        objects[newId] = {
          ...JSON.parse(JSON.stringify(obj)),
          id: newId,
          parentId: obj.parentId ? (idMap.get(obj.parentId) ?? null) : null,
        } as CanvasObject;
      }
      // Second pass for forward references (rare, but possible).
      for (const obj of Object.values(objects)) {
        if (obj.parentId && !source.objects[obj.parentId]) obj.parentId = null;
        if (obj.data.mind) {
          obj.data.mind = {
            ...obj.data.mind,
            parentId: obj.data.mind.parentId ? (idMap.get(obj.data.mind.parentId) ?? null) : null,
            rootId: obj.data.mind.rootId ? (idMap.get(obj.data.mind.rootId) ?? null) : null,
          };
        }
      }
      const edges: Record<string, Edge> = {};
      for (const [key, edge] of Object.entries(source.edges)) {
        const from = idMap.get(edge.from);
        const to = idMap.get(edge.to);
        if (from && to) {
          edges[createId()] = { ...JSON.parse(JSON.stringify(edge)), id: createId(), from, to };
        }
      }
      const copy: Board = {
        id: createId(),
        title: `${source.title} Copy`,
        objects,
        edges,
        roots: source.roots.map((r) => idMap.get(r)).filter((r): r is string => !!r),
      };
      s.data.boards.splice(index + 1, 0, copy);
      set({ rev: s.rev + 1 });
    },

    deleteBoard: (id) => {
      const s = get();
      if (!s.data) return false;
      if (s.data.boards.length <= 1) return false;
      const index = s.data.boards.findIndex((b) => b.id === id);
      if (index < 0) return false;
      s.data.boards.splice(index, 1);
      if (s.boardId === id) {
        const next = s.data.boards[Math.min(index, s.data.boards.length - 1)]!;
        get().selectBoard(next.id);
      } else {
        set({ rev: s.rev + 1 });
      }
      return true;
    },

    moveBoard: (id, dir) => {
      const s = get();
      if (!s.data) return;
      const index = s.data.boards.findIndex((b) => b.id === id);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= s.data.boards.length) return;
      const [board] = s.data.boards.splice(index, 1);
      s.data.boards.splice(target, 0, board!);
      set({ rev: s.rev + 1 });
    },

    selectBoard: (id) => {
      const s = get();
      const board = s.data?.boards.find((b) => b.id === id);
      if (!board || s.boardId === id) return;
      set({
        boardId: id,
        objects: board.objects,
        edges: board.edges,
        roots: board.roots,
        rev: s.rev + 1,
        history: initialHistory(),
        lastCommitted: { objects: board.objects, edges: board.edges, roots: board.roots },
        selection: { objects: [], edges: [] },
        editingId: null,
      });
    },

    // --- history --------------------------------------------------------------

    commit: (label = 'Change') => {
      const s = get();
      if (!s.data) return;
      const now = currentRefs();
      if (now.objects === s.lastCommitted?.objects && now.edges === s.lastCommitted?.edges && now.roots === s.lastCommitted?.roots) {
        return; // nothing changed since the last commit
      }
      const entry = { label, before: s.lastCommitted!, after: now };
      const undo = [...s.history.undo, entry].slice(-HISTORY_LIMIT);
      set({ history: { undo, redo: [], baseRev: s.rev }, lastCommitted: now });
      touchProject();
    },

    undo: () => {
      const s = get();
      const entry = s.history.undo[s.history.undo.length - 1];
      if (!entry) return;
      const undo = s.history.undo.slice(0, -1);
      const redo = [...s.history.redo, entry];
      applyRefs(entry.before, { history: { undo, redo, baseRev: s.rev }, lastCommitted: entry.before });
      pruneSelection();
      touchProject();
    },

    redo: () => {
      const s = get();
      const entry = s.history.redo[s.history.redo.length - 1];
      if (!entry) return;
      const redo = s.history.redo.slice(0, -1);
      const undo = [...s.history.undo, entry];
      applyRefs(entry.after, { history: { undo, redo, baseRev: s.rev }, lastCommitted: entry.after });
      pruneSelection();
      touchProject();
    },

    // --- objects --------------------------------------------------------------

    createObjectAt: (tool, x, y, rect, shapeKind) => {
      const s = get();
      if (!s.data) return null;
      const z = maxZ(s.objects) + 1;
      let obj: CanvasObject | null = null;
      switch (tool) {
        case 'text':
          obj = createText(Math.round(x), Math.round(y), z);
          break;
        case 'sticky': {
          const w = rect?.width ?? 200;
          const h = rect?.height ?? 200;
          obj = createSticky(Math.round(x), Math.round(y), z);
          obj.width = Math.max(w, 120);
          obj.height = Math.max(h, 120);
          break;
        }
        case 'shape': {
          const w = rect?.width ?? 160;
          const h = rect?.height ?? 160;
          obj = createShape(shapeKind ?? 'rounded_rectangle', Math.round(x), Math.round(y), Math.max(w, 20), Math.max(h, 20), z);
          break;
        }
        case 'frame': {
          const w = rect?.width ?? 420;
          const h = rect?.height ?? 300;
          obj = createFrame(Math.round(x), Math.round(y), Math.max(w, 80), Math.max(h, 80), z, `Frame ${Object.values(s.objects).filter((o) => o.type === 'frame').length + 1}`);
          break;
        }
        case 'mindmap':
          return get().createMindMap(Math.round(x), Math.round(y));
      }
      if (!obj) return null;
      // Objects created inside a frame become children of that frame.
      for (const frame of Object.values(s.objects)) {
        if (frame.type !== 'frame') continue;
        if (x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height) {
          obj.parentId = frame.id;
          obj.z = z + 1;
          break;
        }
      }
      get().addObjects([obj], [], `Add ${tool}`);
      set({ selection: { objects: [obj.id], edges: [] } });
      if (tool === 'text' || tool === 'sticky') set({ editingId: obj.id });
      return obj.id;
    },

    addObjects: (objects, edges = [], label = 'Add objects', opts) => {
      mutateObjects((draft) => {
        for (const obj of objects) draft[obj.id] = obj;
      });
      if (edges.length > 0) {
        mutateEdges((draft) => {
          for (const e of edges) draft[e.id] = e;
        });
      }
      for (const obj of objects) {
        if (obj.type === 'mindmap_node' && obj.data.mind && !obj.data.mind.parentId) {
          mutateRoots((roots) => (roots.includes(obj.id) ? roots : [...roots, obj.id]));
        }
      }
      if (opts?.history !== false) get().commit(label);
    },

    updateObjects: (ids, patch, opts) => {
      const live = opts?.history === false;
      mutateObjects((draft) => {
        for (const id of ids) {
          const obj = draft[id];
          if (!obj) continue;
          const p = typeof patch === 'function' ? patch(obj) : patch;
          draft[id] = { ...obj, ...p };
        }
      });
      if (!live) get().commit(opts?.label ?? 'Update objects');
    },

    updateObjectLive: (id, patch) => {
      mutateObjects((draft) => {
        const obj = draft[id];
        if (obj) draft[id] = { ...obj, ...patch };
      });
    },

    deleteObjectsByIds: (ids, label = 'Delete', opts) => {
      const s = get();
      const doomed = new Set(objectIdsAttachedTo(s.objects, s.edges, ids));
      mutateObjects((draft) => {
        for (const id of doomed) {
          const obj = draft[id];
          delete draft[id];
          // Children of deleted frames/groups are released, not deleted.
          if (obj && (obj.type === 'frame' || obj.type === 'group')) {
            for (const child of Object.values(draft)) {
              if (child.parentId === id) draft[child.id] = { ...child, parentId: null };
            }
          }
        }
      });
      mutateEdges((draft) => {
        for (const [key, e] of Object.entries(draft)) {
          if (doomed.has(e.from) || doomed.has(e.to)) delete draft[key];
        }
      });
      mutateRoots((roots) => roots.filter((r) => !doomed.has(r)));
      set({ selection: { objects: [], edges: [] }, editingId: null });
      if (opts?.history !== false) get().commit(label);
    },

    setText: (id, text) => {
      get().updateObjects([id], (obj) => ({ data: { ...obj.data, text } }), { label: 'Edit text' });
    },

    setStyle: (ids, patch) => {
      get().updateObjects(
        ids,
        (obj) => ({ style: { ...obj.style, ...patch } }),
        { label: 'Change style' },
      );
    },

    setShapeKind: (ids, kind) => {
      get().updateObjects(
        ids,
        (obj) => ({
          data: { ...obj.data, shape: kind },
          style: {
            ...obj.style,
            radius: kind === 'rounded_rectangle' ? 14 : 0,
            strokeWidth: obj.style.strokeWidth ?? (kind === 'rectangle' ? 1.5 : 0),
          },
        }),
        { label: 'Change shape' },
      );
    },

    reorder: (ids, where) => {
      const s = get();
      const zMax = maxZ(s.objects);
      const zMin = Math.min(...Object.values(s.objects).map((o) => o.z), 0);
      get().updateObjects(
        ids,
        (obj) => ({ z: where === 'front' ? zMax + 1 + ids.indexOf(obj.id) : Math.max(zMin - ids.length + ids.indexOf(obj.id), 0) - (ids.length + 10) }),
        { label: where === 'front' ? 'Bring to front' : 'Send to back' },
      );
    },

    group: (ids) => {
      const s = get();
      if (ids.length < 2) return null;
      const members = ids
        .map((id) => s.objects[id])
        .filter((o): o is CanvasObject => !!o && o.type !== 'group');
      if (members.length < 2) return null;
      const bounds = unionRects(members.map((o) => objectBounds(o)));
      if (!bounds) return null;
      const z = maxZ(s.objects) + 1;
      const group: CanvasObject = {
        id: createId(),
        type: 'group',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        parentId: null,
        data: {},
        style: {},
        z,
      };
      const memberIds = new Set(members.map((m) => m.id));
      mutateObjects((draft) => {
        draft[group.id] = group;
        for (const m of members) {
          if (m.type === 'mindmap_node') continue;
          draft[m.id] = { ...draft[m.id]!, parentId: group.id };
        }
      });
      set({ selection: { objects: [group.id], edges: [] } });
      get().commit('Group objects');
      void memberIds;
      return group.id;
    },

    ungroup: (ids) => {
      const s = get();
      const groups = ids.map((id) => s.objects[id]).filter((o) => o?.type === 'group');
      if (groups.length === 0) return;
      mutateObjects((draft) => {
        for (const g of groups) {
          for (const child of Object.values(draft)) {
            if (child.parentId === g.id) {
              draft[child.id] = { ...child, parentId: g.parentId ?? null };
            }
          }
          delete draft[g.id];
        }
      });
      set({ selection: { objects: [], edges: [] } });
      get().commit('Ungroup');
    },

    moveObjectsDelta: (ids, dx, dy) => {
      const s = get();
      if (dx === 0 && dy === 0) return;
      const all = expandWithDescendants(s.objects, ids).filter((id) => {
        const obj = s.objects[id];
        return !!obj && obj.type !== 'mindmap_node';
      });
      // Mind map nodes in the original selection still move individually.
      const mindIds = ids.filter((id) => s.objects[id]?.type === 'mindmap_node');
      mutateObjects((draft) => {
        for (const id of [...all, ...mindIds]) {
          const obj = draft[id];
          if (obj) draft[id] = { ...obj, x: Math.round(obj.x + dx), y: Math.round(obj.y + dy) };
        }
      });
      get().commit('Move objects');
    },

    reparentIntoFrames: (ids) => {
      const s = get();
      const frames = Object.values(s.objects).filter((o) => o.type === 'frame');
      if (frames.length === 0) return;
      const updates: { id: string; parentId: string | null }[] = [];
      for (const id of ids) {
        const obj = s.objects[id];
        if (!obj || obj.type === 'frame' || obj.type === 'group' || obj.type === 'mindmap_node') continue;
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        let best: CanvasObject | null = null;
        for (const frame of frames) {
          if (frame.id === id) continue;
          if (cx >= frame.x && cx <= frame.x + frame.width && cy >= frame.y && cy <= frame.y + frame.height) {
            if (!best || (frame.width * frame.height < best.width * best.height)) best = frame;
          }
        }
        const nextParent = best?.id ?? null;
        if ((obj.parentId ?? null) !== nextParent) updates.push({ id, parentId: nextParent });
      }
      if (updates.length === 0) return;
      mutateObjects((draft) => {
        for (const u of updates) {
          const obj = draft[u.id];
          if (obj) draft[u.id] = { ...obj, parentId: u.parentId };
        }
      });
    },

    // --- edges ------------------------------------------------------------------

    connectObjects: (fromId, toId) => {
      const s = get();
      if (fromId === toId || !s.objects[fromId] || !s.objects[toId]) return null;
      for (const e of Object.values(s.edges)) {
        if ((e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)) return null;
      }
      const edge = createEdge(fromId, toId, maxEdgeZ(s.edges) + 1);
      get().addEdge(edge, 'Connect objects');
      return edge.id;
    },

    addEdge: (edge, label = 'Connect') => {
      mutateEdges((draft) => {
        draft[edge.id] = edge;
      });
      get().commit(label);
    },

    updateEdges: (ids, patch, opts) => {
      const live = opts?.history === false;
      mutateEdges((draft) => {
        for (const id of ids) {
          const e = draft[id];
          if (!e) continue;
          const p = typeof patch === 'function' ? patch(e) : patch;
          draft[id] = { ...e, ...p };
        }
      });
      if (!live) get().commit('Update connection');
    },

    setEdgeRoute: (ids, route) => {
      get().updateEdges(ids, (e) => ({ data: { ...e.data, route } }));
    },

    setEdgeArrow: (ids, arrow) => {
      get().updateEdges(ids, (e) => ({ data: { ...e.data, arrow } }));
    },

    deleteEdgesByIds: (ids, label = 'Delete connection') => {
      mutateEdges((draft) => {
        for (const id of ids) delete draft[id];
      });
      set({ selection: { objects: get().selection.objects, edges: [] } });
      get().commit(label);
    },

    // --- selection / clipboard ----------------------------------------------------

    setSelection: (objectIds, edgeIds = []) => {
      set({ selection: { objects: objectIds, edges: edgeIds }, editingId: null });
    },

    clearSelection: () => set({ selection: { objects: [], edges: [] }, editingId: null }),

    selectAll: () => {
      const s = get();
      set({ selection: { objects: Object.keys(s.objects), edges: Object.keys(s.edges) } });
    },

    setEditingId: (id) => set({ editingId: id }),

    deleteSelection: () => {
      const s = get();
      if (s.selection.edges.length > 0) get().deleteEdgesByIds(s.selection.edges);
      if (s.selection.objects.length > 0) get().deleteObjectsByIds(s.selection.objects);
    },

    copySelection: () => {
      const s = get();
      const selected = new Set(objectIdsAttachedTo(s.objects, s.edges, s.selection.objects));
      const objects = Object.values(s.objects).filter((o) => selected.has(o.id));
      if (objects.length === 0) return false;
      const ids = new Set(objects.map((o) => o.id));
      const edges = Object.values(s.edges).filter((e) => ids.has(e.from) && ids.has(e.to));
      const roots = s.roots.filter((r) => ids.has(r));
      copyToClipboard(objects, edges, roots);
      return true;
    },

    cutSelection: () => {
      if (!get().copySelection()) return false;
      get().deleteSelection();
      return true;
    },

    pasteClipboard: () => {
      const payload = pasteFromClipboard();
      if (!payload) return false;
      const zBase = maxZ(get().objects) + 1;
      payload.objects.forEach((o, i) => (o.z = zBase + i));
      payload.edges.forEach((e, i) => (e.z = maxEdgeZ(get().edges) + 1 + i));
      for (const obj of payload.objects) {
        if (obj.type === 'mindmap_node' && obj.data.mind) obj.data.mind = { ...obj.data.mind };
      }
      get().addObjects(payload.objects, payload.edges, 'Paste');
      set({ selection: { objects: payload.objects.map((o) => o.id), edges: [] } });
      return true;
    },

    duplicateSelection: () => {
      const ok = get().copySelection();
      if (!ok) return false;
      return get().pasteClipboard();
    },

    // --- mind map -----------------------------------------------------------------

    createMindMap: (x, y) => {
      const s = get();
      const z = maxZ(s.objects) + 1;
      const root = createMindNode({
        x,
        y,
        z,
        text: 'Main Idea',
        parentId: null,
        rootId: null,
        order: 0,
        isRoot: true,
      });
      mutateObjects((draft) => {
        draft[root.id] = root;
      });
      mutateRoots((roots) => [...roots, root.id]);
      get().commit('Add mind map');
      set({ selection: { objects: [root.id], edges: [] }, editingId: root.id });
      return root.id;
    },

    addMindChild: (parentId) => {
      const s = get();
      const parent = s.objects[parentId];
      if (!parent?.data.mind) return null;
      const parentMind = parent.data.mind;
      const rootId = parentMind.rootId ?? parent.id;
      const siblings = mindChildrenOf(s.objects, parentId);
      const z = maxZ(s.objects) + 1;
      const child = createMindNode({
        x: parent.x + parent.width + 90,
        y: parent.y + siblings.length * 56,
        z,
        text: 'New idea',
        parentId: parent.id,
        rootId,
        order: siblings.length,
      });
      child.style.fill = MIND_COLORS[siblings.length % MIND_COLORS.length] ?? '#a5b4fc';
      const edge = createEdge(parent.id, child.id, maxEdgeZ(s.edges) + 1);
      mutateObjects((draft) => {
        draft[child.id] = child;
        if (parentMind.collapsed) {
          draft[parentId] = {
            ...draft[parentId]!,
            data: { ...draft[parentId]!.data, mind: { ...parentMind, collapsed: false } },
          };
        }
        const p = draft[parentId]!;
        if (p.data.mind) {
          draft[parentId] = { ...p, data: { ...p.data, mind: { ...p.data.mind, childCount: (p.data.mind.childCount ?? siblings.length) + 1 } } };
        }
      });
      mutateEdges((draft) => {
        draft[edge.id] = edge;
      });
      relayoutTree(rootId, { history: false, label: '' });
      get().commit('Add child node');
      set({ selection: { objects: [child.id], edges: [] }, editingId: child.id });
      return child.id;
    },

    addMindSibling: (nodeId) => {
      const s = get();
      const node = s.objects[nodeId];
      if (!node?.data.mind) return null;
      if (!node.data.mind.parentId) return get().addMindChild(nodeId);
      const parentId = node.data.mind.parentId;
      const parent = s.objects[parentId!];
      if (!parent) return null;
      const siblings = mindChildrenOf(s.objects, parentId!);
      const index = siblings.findIndex((n) => n.id === nodeId);
      // Shift orders of later siblings.
      mutateObjects((draft) => {
        for (let i = index + 1; i < siblings.length; i++) {
          const sib = draft[siblings[i]!.id];
          if (sib?.data.mind) {
            draft[sib.id] = { ...sib, data: { ...sib.data, mind: { ...sib.data.mind, order: i + 1 } } };
          }
        }
      });
      const rootId = parent.data.mind?.rootId ?? parent.id;
      const z = maxZ(get().objects) + 1;
      const sibling = createMindNode({
        x: node.x + 40,
        y: node.y + node.height + 24,
        z,
        text: 'New idea',
        parentId: parentId!,
        rootId,
        order: index + 1,
      });
      sibling.style.fill = MIND_COLORS[(index + 1) % MIND_COLORS.length] ?? '#a5b4fc';
      const edge = createEdge(parentId!, sibling.id, maxEdgeZ(get().edges) + 1);
      mutateObjects((draft) => {
        draft[sibling.id] = sibling;
        const parentObj = draft[parentId!]!;
        if (parentObj.data.mind) {
          draft[parentId!] = {
            ...parentObj,
            data: { ...parentObj.data, mind: { ...parentObj.data.mind, childCount: (parentObj.data.mind.childCount ?? siblings.length) + 1 } },
          };
        }
      });
      mutateEdges((draft) => {
        draft[edge.id] = edge;
      });
      relayoutTree(rootId, { history: false, label: '' });
      get().commit('Add sibling node');
      set({ selection: { objects: [sibling.id], edges: [] }, editingId: sibling.id });
      return sibling.id;
    },

    deleteMindNodes: (ids) => {
      const s = get();
      // Count children that will disappear per surviving parent for childCount upkeep.
      const doomed = new Set<string>();
      for (const id of ids) {
        if (!s.objects[id]?.data.mind) continue;
        doomed.add(id);
        for (const d of descendantsOf(s.objects, id)) doomed.add(d);
      }
      const parentDeltas = new Map<string, number>();
      for (const id of doomed) {
        const parentId = s.objects[id]?.data.mind?.parentId;
        if (parentId && !doomed.has(parentId)) {
          parentDeltas.set(parentId, (parentDeltas.get(parentId) ?? 0) + 1);
        }
      }
      get().deleteObjectsByIds(ids, 'Delete node', { history: false });
      if (parentDeltas.size > 0) {
        mutateObjects((draft) => {
          for (const [parentId, delta] of parentDeltas) {
            const parent = draft[parentId];
            if (parent?.data.mind) {
              draft[parentId] = {
                ...parent,
                data: { ...parent.data, mind: { ...parent.data.mind, childCount: Math.max((parent.data.mind.childCount ?? 0) - delta, 0) } },
              };
            }
          }
        });
      }
      // Relayout every remaining root touched by this deletion.
      const s2 = get();
      for (const rootId of s2.roots) {
        if (s2.objects[rootId]) relayoutTree(rootId, { history: false, label: '' });
      }
      get().commit('Delete node');
    },

    toggleCollapse: (id) => {
      const s = get();
      const node = s.objects[id];
      if (!node?.data.mind) return;
      const children = mindChildrenOf(s.objects, id);
      if (children.length === 0) return;
      const mind = node.data.mind;
      get().updateObjects([id], (obj) => ({
        data: { ...obj.data, mind: { ...obj.data.mind!, collapsed: !obj.data.mind!.collapsed } },
      }), { history: false });
      const rootId = mind.rootId ?? id;
      relayoutTree(rootId, { history: false, label: '' });
      get().commit(mind.collapsed ? 'Expand branch' : 'Collapse branch');
    },

    duplicateMindNodes: (ids) => {
      const s = get();
      // Only the top-most selected nodes of each subtree get duplicated.
      const topLevels = ids.filter((id) => {
        const obj = s.objects[id];
        if (!obj?.data.mind) return false;
        const ancestors = new Set<string>();
        let p = obj.data.mind.parentId;
        while (p) {
          ancestors.add(p);
          p = s.objects[p]?.data.mind?.parentId ?? null;
        }
        return !ids.some((other) => other !== id && ancestors.has(other));
      });
      if (topLevels.length === 0) return;

      const clones: CanvasObject[] = [];
      const cloneEdges: Edge[] = [];
      const newRootIds: string[] = [];
      for (const id of topLevels) {
        const original = s.objects[id]!;
        const subtreeIds = [id, ...descendantsOf(s.objects, id)];
        const idMap = new Map<string, string>();
        for (const nid of subtreeIds) idMap.set(nid, createId());
        for (const nid of subtreeIds) {
          const node = s.objects[nid]!;
          const clone = JSON.parse(JSON.stringify(node)) as CanvasObject;
          clone.id = idMap.get(nid)!;
          clone.x += 40;
          clone.y += 40;
          const originalMind = node.data.mind!;
          const mind = clone.data.mind!;
          // Internal links remap to the cloned ids; the duplicated top node
          // keeps its original parent (becoming a sibling branch) or null.
          mind.parentId =
            originalMind.parentId && idMap.has(originalMind.parentId)
              ? idMap.get(originalMind.parentId)!
              : originalMind.parentId;
          mind.rootId =
            originalMind.rootId && idMap.has(originalMind.rootId)
              ? idMap.get(originalMind.rootId)!
              : (originalMind.rootId ?? clone.id);
          mind.collapsed = false;
          if (nid === id) {
            if (!originalMind.parentId) {
              newRootIds.push(clone.id);
            } else {
              // Attach as an extra branch under the original's parent.
              const siblings = mindChildrenOf(s.objects, originalMind.parentId);
              mind.order = Math.max(...siblings.map((n) => n.data.mind?.order ?? 0), -1) + 1;
            }
          }
          clones.push(clone);
          if (mind.parentId) cloneEdges.push(createEdge(mind.parentId, clone.id, 0));
        }
      }

      const zBase = maxZ(s.objects) + 1;
      clones.forEach((c, i) => (c.z = zBase + i));
      let ez = maxEdgeZ(s.edges) + 1;
      for (const e of cloneEdges) e.z = ez++;
      get().addObjects(clones, cloneEdges, 'Duplicate node', { history: false });
      for (const rootId of newRootIds) mutateRoots((roots) => (roots.includes(rootId) ? roots : [...roots, rootId]));
      // Relayout affected trees so the copies settle next to their originals.
      const affected = new Set<string>();
      for (const clone of clones) {
        const rootId = clone.data.mind?.rootId;
        if (rootId && get().objects[rootId]) affected.add(rootId);
      }
      for (const rootId of affected) relayoutTree(rootId, { history: false, label: '' });
      get().commit('Duplicate node');
      set({ selection: { objects: clones.map((c) => c.id), edges: [] } });
    },

    setMindLayout: (rootId, layout) => {
      const s = get();
      const root = s.objects[rootId];
      if (!root?.data.mind) return;
      get().updateObjects([rootId], (obj) => ({
        data: { ...obj.data, mind: { ...obj.data.mind!, layout } },
      }), { history: false });
      relayoutTree(rootId, { history: false, label: '' });
      get().commit('Change layout');
    },

    relayoutMindMap: (rootId) => {
      relayoutTree(rootId, { history: true, label: 'Arrange mind map' });
    },
  };
});

// Convenience selector hooks used across the canvas/UI.
export const useProjectName = () => useEditorStore((s) => s.data?.project.name ?? '');
export const useBoardTitle = () => {
  const boardId = useEditorStore((s) => s.boardId);
  return useEditorStore((s) => s.data?.boards.find((b) => b.id === boardId)?.title ?? '');
};
export const useSelectionCount = () => useEditorStore((s) => s.selection.objects.length + s.selection.edges.length);

export { inflate };
