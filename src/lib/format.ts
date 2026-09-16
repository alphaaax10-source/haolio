import type {
  Board,
  CanvasObject,
  Edge,
  MindLayout,
  ObjectData,
  ObjectStyle,
  Project,
  ProjectSettings,
  ShapeKind,
} from './types';
import { CANVAS_OBJECT_TYPES } from './types';
import { createId } from './id';

export const FORMAT_NAME = 'haolio';
export const FORMAT_VERSION = 1;

export class ParseError extends Error {
  title: string;
  constructor(title: string, message: string) {
    super(message);
    this.name = 'ParseError';
    this.title = title;
  }
}

export const PROJECT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
];

export function projectColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]!;
}

export const STICKY_COLORS = [
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#34d399',
  '#38bdf8',
  '#fb923c',
];

export const MIND_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];

export function nowIso(): string {
  return new Date().toISOString();
}

export function defaultSettings(): ProjectSettings {
  return {
    grid: { style: 'dots', size: 20, snap: false },
    editor: { autosave: true },
  };
}

export function createBoard(title = 'Board 1'): Board {
  return { id: createId(), title, objects: {}, edges: {}, roots: [] };
}

export function createProjectData(name: string): Project {
  const id = createId();
  const ts = nowIso();
  return {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    project: {
      id,
      name,
      createdAt: ts,
      modifiedAt: ts,
      color: projectColorFor(id + name),
    },
    boards: [createBoard('Main Board')],
    settings: defaultSettings(),
  };
}

// --- Object factories -------------------------------------------------------

export function createObjectBase(
  type: CanvasObject['type'],
  x: number,
  y: number,
  width: number,
  height: number,
  z: number,
): CanvasObject {
  return {
    id: createId(),
    type,
    x,
    y,
    width,
    height,
    rotation: 0,
    parentId: null,
    data: {},
    style: {},
    z,
  };
}

export function createSticky(x: number, y: number, z: number, color = STICKY_COLORS[0]!): CanvasObject {
  const obj = createObjectBase('sticky_note', x, y, 200, 200, z);
  obj.style = { fill: color, color: '#1c1917', fontSize: 15, radius: 10, align: 'left' };
  obj.data = { text: '' };
  return obj;
}

export function createText(x: number, y: number, z: number, text = 'Text'): CanvasObject {
  const obj = createObjectBase('text', x, y, 160, 24, z);
  obj.style = { fontSize: 18, color: undefined, align: 'left' };
  obj.data = { text };
  return obj;
}

export function createShape(
  kind: ShapeKind,
  x: number,
  y: number,
  width: number,
  height: number,
  z: number,
): CanvasObject {
  const obj = createObjectBase('shape', x, y, width, height, z);
  obj.data = { shape: kind, text: '' };
  obj.style = {
    fill: '#6366f1',
    stroke: '#4f46e5',
    strokeWidth: kind === 'rectangle' ? 1.5 : 0,
    color: '#ffffff',
    fontSize: 15,
    radius: kind === 'rounded_rectangle' ? 14 : 0,
    align: 'center',
  };
  return obj;
}

export function createFrame(x: number, y: number, width: number, height: number, z: number, title = 'Frame'): CanvasObject {
  const obj = createObjectBase('frame', x, y, width, height, z);
  obj.data = { text: title };
  obj.style = { fill: 'transparent', stroke: '#8b5cf6', strokeWidth: 1.5, radius: 12 };
  return obj;
}

export function createImage(src: string, x: number, y: number, width: number, height: number, z: number): CanvasObject {
  const obj = createObjectBase('image', x, y, width, height, z);
  obj.data = { src };
  obj.style = { radius: 8 };
  return obj;
}

export function createMindNode(opts: {
  x: number;
  y: number;
  z: number;
  text: string;
  parentId: string | null;
  rootId: string | null;
  order: number;
  layout?: MindLayout;
  isRoot?: boolean;
}): CanvasObject {
  const { isRoot = false } = opts;
  const obj = createObjectBase(
    'mindmap_node',
    opts.x,
    opts.y,
    isRoot ? 180 : 132,
    isRoot ? 56 : 42,
    opts.z,
  );
  obj.data = {
    text: opts.text,
    mind: {
      parentId: opts.parentId,
      rootId: opts.rootId,
      order: opts.order,
      collapsed: false,
      layout: opts.layout ?? 'horizontal',
    },
  };
  obj.style = {
    fill: isRoot ? '#6366f1' : '#a5b4fc',
    color: '#ffffff',
    fontSize: isRoot ? 17 : 14,
    bold: isRoot,
    radius: isRoot ? 16 : 12,
    align: 'center',
  };
  return obj;
}

export function createEdge(from: string, to: string, z: number): Edge {
  return { id: createId(), from, to, data: { route: 'curved', arrow: 'none' }, style: {}, z };
}

// --- Parse / normalize / migrate --------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeObject(raw: Record<string, unknown>, z: number): CanvasObject | null {
  const type = str(raw.type, '');
  if (!(CANVAS_OBJECT_TYPES as readonly string[]).includes(type)) return null;
  const data = asRecord(raw.data) as ObjectData;
  const style = asRecord(raw.style) as ObjectStyle;
  const obj: CanvasObject = {
    id: str(raw.id, '') || createId(),
    type: type as CanvasObject['type'],
    x: num(raw.x, 0),
    y: num(raw.y, 0),
    width: Math.max(num(raw.width, 40), 1),
    height: Math.max(num(raw.height, 40), 1),
    rotation: num(raw.rotation, 0),
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    data,
    style,
    z: num(raw.z, z),
  };
  if (obj.type === 'mindmap_node' && !data.mind) {
    data.mind = { parentId: null, rootId: null, order: 0, collapsed: false, layout: 'horizontal' };
  }
  if (obj.type === 'shape' && !data.shape) data.shape = 'rectangle';
  return obj;
}

function normalizeBoard(raw: Record<string, unknown>, index: number): Board {
  const objects: Record<string, CanvasObject> = {};
  let z = 0;
  for (const [key, value] of Object.entries(asRecord(raw.objects))) {
    const obj = normalizeObject(asRecord(value), z++);
    if (obj) objects[key === obj.id ? key : obj.id] = obj;
  }
  const ids = new Set(Object.keys(objects));
  const edges: Record<string, Edge> = {};
  let ez = 0;
  for (const [key, value] of Object.entries(asRecord(raw.edges))) {
    const rec = asRecord(value);
    const from = str(rec.from, '');
    const to = str(rec.to, '');
    if (!ids.has(from) || !ids.has(to)) continue;
    edges[str(key, '') || createId()] = {
      id: str(rec.id, '') || key || createId(),
      from,
      to,
      data: asRecord(rec.data),
      style: asRecord(rec.style),
      z: num(rec.z, ez++),
    };
  }
  const roots = Array.isArray(raw.roots)
    ? (raw.roots as unknown[]).filter((r): r is string => typeof r === 'string' && ids.has(r))
    : [];
  // Recover any orphaned mind map trees (e.g. from older partial saves).
  for (const obj of Object.values(objects)) {
    if (obj.type === 'mindmap_node' && obj.data.mind && !obj.data.mind.parentId && !roots.includes(obj.id)) {
      roots.push(obj.id);
    }
  }
  return {
    id: str(raw.id, '') || createId(),
    title: str(raw.title, `Board ${index + 1}`),
    objects,
    edges,
    roots,
  };
}

/**
 * Validate + normalize any unknown input into a full Project.
 * Throws ParseError with a friendly title when the file is not a Haolio
 * project or was produced by an incompatible (newer) version.
 */
export function normalizeProject(input: unknown): Project {
  const root = asRecord(input);
  const format = str(root.format, '');
  if (format !== FORMAT_NAME) {
    throw new ParseError(
      'Invalid Haolio project',
      'This file may be corrupted or was not created by Haolio.',
    );
  }
  const version = num(root.version, 0);
  if (version > FORMAT_VERSION) {
    throw new ParseError(
      'Unsupported project version',
      `This project was created by a newer version of Haolio (format v${version}). ` +
        `This app supports format v${FORMAT_VERSION}.`,
    );
  }
  const projectRec = asRecord(root.project);
  const boardsRaw = Array.isArray(root.boards) ? root.boards : [];
  const boards = boardsRaw.map((b, i) => normalizeBoard(asRecord(b), i));
  if (boards.length === 0) boards.push(createBoard('Main Board'));
  const settingsRec = asRecord(root.settings);
  const gridRec = asRecord(settingsRec.grid);
  const editorRec = asRecord(settingsRec.editor);
  const defaults = defaultSettings();
  const settings: ProjectSettings = {
    grid: {
      style: gridRec.style === 'lines' ? 'lines' : defaults.grid.style,
      size: Math.min(Math.max(num(gridRec.size, defaults.grid.size), 4), 200),
      snap: typeof gridRec.snap === 'boolean' ? gridRec.snap : defaults.grid.snap,
    },
    editor: {
      autosave:
        typeof editorRec.autosave === 'boolean' ? editorRec.autosave : defaults.editor.autosave,
    },
  };
  const ts = nowIso();
  return {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    project: {
      id: str(projectRec.id, '') || createId(),
      name: str(projectRec.name, 'Untitled Project'),
      createdAt: str(projectRec.createdAt, ts),
      modifiedAt: str(projectRec.modifiedAt, ts),
      color: str(projectRec.color, '') || projectColorFor(str(projectRec.name, 'haolio')),
    },
    boards,
    settings,
  };
}

/** Parse a .haolio file's JSON text into a Project. Throws ParseError. */
export function parseProjectText(text: string): Project {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new ParseError(
      'Invalid Haolio project',
      'This file may be corrupted or created by a newer version.',
    );
  }
  return normalizeProject(input);
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project);
}
