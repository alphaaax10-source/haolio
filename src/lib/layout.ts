import type { CanvasObject, MindLayout, Rect } from './types';

/**
 * Mind map layout engine. Pure computation: given the nodes of a tree it
 * returns non-overlapping positions. The store applies the result; users can
 * freely move nodes afterwards (automatic layout is never forced).
 */

export interface LayoutNodeInput {
  id: string;
  parentId: string | null;
  order: number;
  width: number;
  height: number;
  collapsed: boolean;
}

export interface LayoutResult {
  positions: Record<string, { x: number; y: number }>;
  bounds: Rect;
}

interface TreeNode {
  id: string;
  input: LayoutNodeInput;
  children: TreeNode[];
  /** Size of the whole settled subtree. */
  subtreeWidth: number;
  subtreeHeight: number;
  x: number;
  y: number;
}

const SIBLING_GAP = 16;
const LEVEL_GAP = 84;
const RADIAL_GAP = 42;

function buildTree(nodes: LayoutNodeInput[], rootId: string): TreeNode | null {
  const byId = new Map<string, TreeNode>();
  for (const n of nodes) {
    byId.set(n.id, { id: n.id, input: n, children: [], subtreeWidth: 0, subtreeHeight: 0, x: 0, y: 0 });
  }
  const root = byId.get(rootId);
  if (!root) return null;
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId) && n.id !== rootId) {
      byId.get(n.parentId)!.children.push(byId.get(n.id)!);
    }
  }
  const sortRec = (t: TreeNode) => {
    t.children.sort((a, b) => a.input.order - b.input.order);
    t.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
}

function measure(t: TreeNode, horizontal: boolean): void {
  if (t.input.collapsed || t.children.length === 0) {
    t.subtreeWidth = t.input.width;
    t.subtreeHeight = t.input.height;
    return;
  }
  let along = 0;
  let across = 0;
  for (const child of t.children) {
    measure(child, horizontal);
    if (horizontal) {
      along += child.subtreeWidth;
      across = Math.max(across, child.subtreeHeight);
    } else {
      along += child.subtreeHeight;
      across = Math.max(across, child.subtreeWidth);
    }
  }
  along += SIBLING_GAP * (t.children.length - 1);
  across += LEVEL_GAP;
  if (horizontal) {
    t.subtreeWidth = t.input.width + LEVEL_GAP + along;
    t.subtreeHeight = Math.max(t.input.height, across);
  } else {
    t.subtreeWidth = Math.max(t.input.width, across);
    t.subtreeHeight = t.input.height + LEVEL_GAP + along;
  }
}

function place(t: TreeNode, x: number, y: number, horizontal: boolean): void {
  const childrenAlong = t.input.collapsed
    ? 0
    : t.children.reduce((acc, c) => {
        const size = horizontal ? c.subtreeWidth : c.subtreeHeight;
        return acc + size + SIBLING_GAP;
      }, -SIBLING_GAP);

  if (horizontal) {
    // The node keeps exactly the anchor position; children flow to the right,
    // spread around the node's vertical center line.
    t.x = x;
    t.y = y;
    const childX = x + t.input.width + LEVEL_GAP;
    let childY = y + t.input.height / 2 - childrenAlong / 2;
    for (const c of t.children) {
      place(c, childX, childY, horizontal);
      childY += c.subtreeHeight + SIBLING_GAP;
    }
  } else {
    // Vertical: the node keeps the anchor position; children stack below,
    // spread around the node's horizontal center line.
    t.x = x;
    t.y = y;
    const childY = y + t.input.height + LEVEL_GAP;
    let childX = x + t.input.width / 2 - childrenAlong / 2;
    for (const c of t.children) {
      place(c, childX, childY, horizontal);
      childX += c.subtreeWidth + SIBLING_GAP;
    }
  }
}

function countNodes(t: TreeNode): number {
  return 1 + t.children.reduce((a, c) => a + countNodes(c), 0);
}

function placeRadial(t: TreeNode, cx: number, cy: number, angle: number, radius: number): void {
  t.x = cx + Math.cos(angle) * radius - t.input.width / 2;
  t.y = cy + Math.sin(angle) * radius - t.input.height / 2;
  if (t.input.collapsed || t.children.length === 0) return;
  const count = t.children.length;
  const spread = Math.min(Math.PI * 1.9, 0.5 * count);
  let a = angle - spread / 2;
  const childRadius = radius + Math.max(t.input.width, t.input.height) / 2 + RADIAL_GAP;
  const step = count > 1 ? spread / (count - 1) : 0;
  for (const c of t.children) {
    placeRadial(c, cx, cy, a, childRadius);
    a += step;
  }
}

function shiftTree(t: TreeNode, dx: number, dy: number): void {
  t.x += dx;
  t.y += dy;
  for (const c of t.children) shiftTree(c, dx, dy);
}

function findNode(t: TreeNode, id: string): TreeNode | null {
  if (t.id === id) return t;
  for (const c of t.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function collect(t: TreeNode, out: LayoutResult): void {
  out.positions[t.id] = { x: Math.round(t.x), y: Math.round(t.y) };
  if (t.input.collapsed) return; // hidden branches keep their previous positions
  for (const c of t.children) collect(c, out);
}

/**
 * Lay out a tree rooted at `root`. `rootPosition` anchors the root where the
 * user left it. Returns positions for every reachable node plus tree bounds.
 */
export function layoutMindMap(
  root: LayoutNodeInput,
  otherNodes: LayoutNodeInput[],
  layout: MindLayout,
  rootPosition: { x: number; y: number },
): LayoutResult {
  const result: LayoutResult = { positions: {}, bounds: { x: 0, y: 0, width: 0, height: 0 } };
  const tree = buildTree([root, ...otherNodes.filter((n) => n.id !== root.id)], root.id);
  if (!tree) return result;

  if (layout === 'radial') {
    const count = countNodes(tree);
    const baseRadius = 140 + Math.sqrt(Math.max(count, 1)) * 40;
    placeRadial(tree, 0, 0, -Math.PI / 2, 0);
    shiftTree(tree, rootPosition.x + root.width / 2, rootPosition.y + root.height / 2);
    void baseRadius;
    collect(tree, result);
  } else {
    const horizontal = layout === 'horizontal';
    measure(tree, horizontal);
    place(tree, rootPosition.x, rootPosition.y, horizontal);
    collect(tree, result);
  }

  const rects: Rect[] = [];
  for (const [id, p] of Object.entries(result.positions)) {
    const node = findNode(tree, id);
    if (node) rects.push({ x: p.x, y: p.y, width: node.input.width, height: node.input.height });
  }
  if (rects.length > 0) {
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.width));
    const maxY = Math.max(...rects.map((r) => r.y + r.height));
    result.bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return result;
}

export function descendantsOf(objects: Record<string, CanvasObject>, id: string): string[] {
  const out: string[] = [];
  const walk = (parentId: string) => {
    for (const obj of Object.values(objects)) {
      if (obj.data.mind && obj.data.mind.parentId === parentId) {
        out.push(obj.id);
        walk(obj.id);
      }
    }
  };
  walk(id);
  return out;
}
