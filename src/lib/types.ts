// -----------------------------------------------------------------------------
// Haolio domain model. Everything in a project is plain JSON-serializable data
// so a .haolio file is a direct snapshot of this model (see lib/format.ts).
// -----------------------------------------------------------------------------

export const CANVAS_OBJECT_TYPES = [
  'text',
  'sticky_note',
  'shape',
  'image',
  'frame',
  'mindmap_node',
  'group',
] as const;

export type CanvasObjectType = (typeof CANVAS_OBJECT_TYPES)[number];

export type TextAlign = 'left' | 'center' | 'right';

export type ShapeKind =
  | 'rectangle'
  | 'rounded_rectangle'
  | 'circle'
  | 'diamond'
  | 'triangle'
  | 'hexagon';

export type MindLayout = 'horizontal' | 'vertical' | 'radial';

export type ConnectorRoute = 'straight' | 'curved' | 'elbow';

export type ArrowStyle = 'none' | 'arrow' | 'double';

/** Per-type semantic fields. */
export interface ObjectData {
  text?: string;
  /** Mind map tree links. */
  mind?: {
    parentId: string | null;
    rootId: string | null;
    order: number;
    collapsed: boolean;
    layout: MindLayout;
    /** Denormalized direct-children count (drives the collapse toggle). */
    childCount?: number;
  };
  shape?: ShapeKind;
  /** Data-URL or local asset source for images. */
  src?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  [key: string]: unknown;
}

/** Visual style fields shared by all object types. */
export interface ObjectStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** 0..1 */
  opacity?: number;
  /** Text / foreground color. */
  color?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: TextAlign;
  /** Corner radius for sticky notes / rounded shapes / images. */
  radius?: number;
  [key: string]: unknown;
}

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** Containing frame or group. Children keep world coordinates. */
  parentId?: string | null;
  data: ObjectData;
  style: ObjectStyle;
  /** Render + hit order, ascending. */
  z: number;
}

export interface EdgeData {
  route?: ConnectorRoute;
  arrow?: ArrowStyle;
  [key: string]: unknown;
}

export interface EdgeStyle {
  color?: string;
  width?: number;
  [key: string]: unknown;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  data: EdgeData;
  style: EdgeStyle;
  z: number;
}

export interface Board {
  id: string;
  title: string;
  objects: Record<string, CanvasObject>;
  edges: Record<string, Edge>;
  /** Root ids of every mind map on this board. */
  roots: string[];
}

export interface ProjectMetaBlock {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  /** Accent color used on the dashboard. */
  color: string;
}

export interface ProjectSettings {
  grid: {
    style: 'dots' | 'lines';
    size: number;
    snap: boolean;
  };
  editor: {
    autosave: boolean;
  };
}

export interface Project {
  format: 'haolio';
  version: number;
  project: ProjectMetaBlock;
  boards: Board[];
  settings: ProjectSettings;
}

// --- Dashboard / app-level types (not part of the file format) --------------

export interface ProjectRecord {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  lastOpenedAt: string;
  boardCount: number;
  objectCount: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type Tool =
  | 'select'
  | 'hand'
  | 'text'
  | 'sticky'
  | 'shape'
  | 'connector'
  | 'mindmap'
  | 'image'
  | 'frame';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vec {
  x: number;
  y: number;
}
