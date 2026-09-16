import type { CanvasObject, Project } from './types';
import {
  createBoard,
  createEdge,
  createFrame,
  createMindNode,
  createProjectData,
  createShape,
  createSticky,
  createText,
  MIND_COLORS,
  STICKY_COLORS,
} from './format';
import { createId } from './id';
import { layoutMindMap } from './layout';

// -----------------------------------------------------------------------------
// Project templates used by the dashboard's New Project dialog.
// -----------------------------------------------------------------------------

function addMindTree(
  board: ReturnType<typeof createBoard>,
  rootText: string,
  childTexts: string[],
  origin: { x: number; y: number },
  layout: 'horizontal' | 'vertical' | 'radial' = 'horizontal',
): void {
  const root = createMindNode({
    x: origin.x,
    y: origin.y,
    z: 1,
    text: rootText,
    parentId: null,
    rootId: null,
    order: 0,
    layout,
    isRoot: true,
  });
  board.objects[root.id] = root;
  board.roots.push(root.id);

  const childInputs: { id: string; parentId: string | null; order: number; width: number; height: number; collapsed: boolean }[] = [
    { id: root.id, parentId: null, order: 0, width: root.width, height: root.height, collapsed: false },
  ];
  const children = childTexts.map((text, i) => {
    const node = createMindNode({
      x: origin.x + 300,
      y: origin.y + i * 64,
      z: 2 + i,
      text,
      parentId: root.id,
      rootId: root.id,
      order: i,
    });
    node.style.fill = MIND_COLORS[i % MIND_COLORS.length] ?? '#a5b4fc';
    board.objects[node.id] = node;
    const edge = createEdge(root.id, node.id, i);
    board.edges[edge.id] = edge;
    childInputs.push({ id: node.id, parentId: root.id, order: i, width: node.width, height: node.height, collapsed: false });
    return node;
  });
  root.data.mind!.childCount = children.length;

  const result = layoutMindMap(childInputs[0]!, childInputs.slice(1), layout, origin);
  for (const [id, pos] of Object.entries(result.positions)) {
    const obj = board.objects[id];
    if (obj) {
      obj.x = pos.x;
      obj.y = pos.y;
    }
  }
}

export function createWelcomeProject(): Project {
  const project = createProjectData('Welcome to Haolio');

  const start = createBoard('Getting Started');
  const title = createText(-30, -170, 0, 'Think. Map. Create.');
  title.style.fontSize = 30;
  title.style.bold = true;
  title.style.color = '#6366f1';
  start.objects[title.id] = title;

  addMindTree(start, 'Haolio', [
    'Press TAB to add a child idea',
    'Press ENTER to add a sibling',
    'Press SPACE to collapse a branch',
    'Drag on empty canvas to pan',
    'Scroll to zoom — everything is offline',
  ], { x: -60, y: -40 });

  const todo = createSticky(760, -60, 3, STICKY_COLORS[1]!);
  todo.data.text = 'Try it now\n\n• Select the root node\n• Press TAB a few times\n• Drag nodes around';
  start.objects[todo.id] = todo;

  const shortcuts = createBoard('Shortcuts');
  const shortcutNotes: [string, string, string][] = [
    ['Tools', 'V Select · H Hand\nT Text · N Sticky\nS Shape · C Connect\nM Mind map · F Frame', STICKY_COLORS[4]!],
    ['Mind map', 'TAB add child\nENTER add sibling\nSPACE collapse/expand\nDELETE remove node', STICKY_COLORS[0]!],
    ['Editing', 'Ctrl+Z / Ctrl+Shift+Z\nCtrl+C · Ctrl+V · Ctrl+D\nCtrl+G group\nCtrl+A select all', STICKY_COLORS[2]!],
    ['View', 'Scroll zoom\nSpace+drag pan\nCtrl+0 reset zoom\nCtrl+1 fit board', STICKY_COLORS[3]!],
  ];
  shortcutNotes.forEach(([titleText, body, color], i) => {
    const note = createSticky(40 + (i % 2) * 280, 40 + Math.floor(i / 2) * 280, i, color);
    note.data.text = `${titleText}\n\n${body}`;
    shortcuts.objects[note.id] = note;
  });

  project.boards = [start, shortcuts];
  return project;
}

export function createMindMapStarterProject(name: string): Project {
  const project = createProjectData(name);
  const board = createBoard('Main Mind Map');
  addMindTree(board, 'Main Idea', ['First idea', 'Second idea', 'Third idea'], { x: 0, y: 0 });
  project.boards = [board];
  return project;
}

export type ProjectTemplate =
  | 'welcome'
  | 'mindmap'
  | 'brainstorm'
  | 'flowchart'
  | 'kanban'
  | 'swot'
  | 'meeting'
  | 'blank';

// -----------------------------------------------------------------------------
// Starter templates.
// -----------------------------------------------------------------------------

function note(board: ReturnType<typeof createBoard>, x: number, y: number, z: number, color: string, text: string, parentId?: string | null): CanvasObject {
  const sticky = createSticky(x, y, z, color);
  sticky.data.text = text;
  if (parentId) sticky.parentId = parentId;
  board.objects[sticky.id] = sticky;
  return sticky;
}

function label(board: ReturnType<typeof createBoard>, x: number, y: number, z: number, text: string, opts?: { size?: number; bold?: boolean; color?: string }): CanvasObject {
  const obj = createText(x, y, z, text);
  obj.style.fontSize = opts?.size ?? 18;
  obj.style.bold = opts?.bold ?? false;
  obj.style.color = opts?.color;
  board.objects[obj.id] = obj;
  return obj;
}

function connect(board: ReturnType<typeof createBoard>, fromId: string, toId: string, z: number, arrow = true): void {
  const edge = createEdge(fromId, toId, z);
  if (arrow) edge.data.arrow = 'arrow';
  board.edges[edge.id] = edge;
}

export function createBrainstormProject(name: string): Project {
  const project = createProjectData(name);
  const board = createBoard('Brainstorm');
  addMindTree(
    board,
    'Central idea',
    ['What?', 'Why?', 'Who?', 'When?', 'Where?', 'How?'],
    { x: 300, y: 60 },
    'radial',
  );
  note(
    board,
    -260,
    40,
    50,
    STICKY_COLORS[4]!,
    'Grow the map\n\n• Select any node\n• Press TAB for a child\n• Press ENTER for a sibling',
  );
  project.boards = [board];
  return project;
}

export function createFlowchartProject(name: string): Project {
  const project = createProjectData(name);
  const board = createBoard('Flowchart');

  const node = (kind: 'rectangle' | 'rounded_rectangle' | 'diamond', x: number, y: number, w: number, h: number, z: number, text: string) => {
    const obj = createShape(kind, x, y, w, h, z);
    obj.data.text = text;
    if (kind !== 'rectangle') obj.style.strokeWidth = kind === 'rounded_rectangle' ? 1.5 : 0;
    board.objects[obj.id] = obj;
    return obj;
  };

  const start = node('rounded_rectangle', 380, 40, 180, 70, 1, 'Start');
  const collect = node('rectangle', 380, 180, 180, 70, 1, 'Collect data');
  const check = node('diamond', 360, 320, 220, 130, 1, 'Data valid?');
  const process = node('rectangle', 380, 520, 180, 70, 1, 'Process');
  const done = node('rounded_rectangle', 380, 660, 180, 70, 1, 'Done');
  const fix = node('rectangle', 110, 520, 170, 70, 1, 'Fix data');

  connect(board, start.id, collect.id, 3);
  connect(board, collect.id, check.id, 3);
  connect(board, check.id, process.id, 3);
  connect(board, process.id, done.id, 3);
  connect(board, check.id, fix.id, 3);
  connect(board, fix.id, collect.id, 3);

  label(board, 380, -60, 2, 'Process flow', { size: 26, bold: true, color: '#6366f1' });
  project.boards = [board];
  return project;
}

export function createKanbanProject(name: string): Project {
  const project = createProjectData(name);
  const board = createBoard('Kanban');

  const columns: [string, string, string[]][] = [
    ['To Do', '#38bdf8', ['Research users', 'Draft the spec']],
    ['Doing', '#fbbf24', ['Design the flow']],
    ['Review', '#a78bfa', ['Build the prototype']],
    ['Done', '#34d399', ['Kick-off notes']],
  ];

  columns.forEach(([title, color, cards], ci) => {
    const frame = createFrame(ci * 340, 60, 280, 560, 1, title);
    board.objects[frame.id] = frame;
    cards.forEach((card, i) => {
      note(board, ci * 340 + 40, 130 + i * 230, 2 + ci * 3 + i, color, card, frame.id);
    });
  });

  project.boards = [board];
  return project;
}

export function createSwotProject(name: string): Project {
  const project = createProjectData(name);
  const board = createBoard('SWOT');

  const quadrants: [string, string, string, number, number][] = [
    ['Strengths', '#10b981', '• What do we do well?\n• Unique assets?', 0, 0],
    ['Weaknesses', '#ef4444', '• Where are we behind?\n• Gaps to close?', 340, 0],
    ['Opportunities', '#6366f1', '• Trends to ride?\n• Untapped needs?', 0, 300],
    ['Threats', '#f59e0b', '• What could hurt us?\n• Roadblocks ahead?', 340, 300],
  ];

  for (const [title, stroke, prompt, x, y] of quadrants) {
    const frame = createFrame(x, y, 300, 240, 1, title);
    frame.style.stroke = stroke;
    board.objects[frame.id] = frame;
    note(board, x + 50, y + 70, 2, STICKY_COLORS[4]!, prompt, frame.id);
  }

  label(board, 180, -90, 2, 'SWOT Analysis', { size: 28, bold: true, color: '#6366f1' });
  project.boards = [board];
  return project;
}

export function createMeetingProject(name: string): Project {
  const project = createProjectData(name);
  const board = createBoard('Meeting Notes');

  label(board, 40, -80, 2, 'Meeting notes', { size: 28, bold: true, color: '#6366f1' });
  note(board, 40, 0, 1, STICKY_COLORS[0]!, 'Agenda\n\n1. Context\n2. Options\n3. Decision');
  note(board, 40, 250, 1, STICKY_COLORS[1]!, 'Decisions\n\n• What did we agree on?');
  note(board, 40, 500, 1, STICKY_COLORS[3]!, 'Action items\n\n[ ] Owner — task\n[ ] Owner — task');

  addMindTree(board, 'Discussion', ['Point one', 'Point two', 'Point three'], { x: 640, y: 20 });
  note(board, 640, 420, 30, STICKY_COLORS[4]!, 'Next meeting:\npick a date + owner');

  project.boards = [board];
  return project;
}

export function createProjectFromTemplate(name: string, template: ProjectTemplate): Project {
  if (template === 'welcome') return createWelcomeProject();
  if (template === 'mindmap') return createMindMapStarterProject(name);
  if (template === 'brainstorm') return createBrainstormProject(name);
  if (template === 'flowchart') return createFlowchartProject(name);
  if (template === 'kanban') return createKanbanProject(name);
  if (template === 'swot') return createSwotProject(name);
  if (template === 'meeting') return createMeetingProject(name);
  return createProjectData(name);
}
