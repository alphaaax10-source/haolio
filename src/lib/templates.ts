import type { Project } from './types';
import {
  createBoard,
  createEdge,
  createMindNode,
  createProjectData,
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

export type ProjectTemplate = 'welcome' | 'mindmap' | 'blank';

export function createProjectFromTemplate(name: string, template: ProjectTemplate): Project {
  if (template === 'welcome') return createWelcomeProject();
  if (template === 'mindmap') return createMindMapStarterProject(name);
  return createProjectData(name);
}
