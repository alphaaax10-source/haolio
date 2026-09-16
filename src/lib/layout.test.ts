import { describe, expect, it } from 'vitest';
import { layoutMindMap, type LayoutNodeInput } from './layout';

function makeTree(): { root: LayoutNodeInput; children: LayoutNodeInput[] } {
  const root: LayoutNodeInput = { id: 'r', parentId: null, order: 0, width: 180, height: 56, collapsed: false };
  const children: LayoutNodeInput[] = ['a', 'b', 'c', 'd'].map((id, i) => ({
    id,
    parentId: 'r',
    order: i,
    width: 132,
    height: 42,
    collapsed: false,
  }));
  return { root, children };
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

describe('mind map layout engine', () => {
  it('positions every node without overlap (horizontal)', () => {
    const { root, children } = makeTree();
    const result = layoutMindMap(root, children, 'horizontal', { x: 0, y: 0 });
    const ids = ['r', ...children.map((c) => c.id)];
    const boxes = ids.map((id) => {
      const pos = result.positions[id]!;
      const node = [root, ...children].find((n) => n.id === id)!;
      return { id, ...pos, width: node.width, height: node.height };
    });
    expect(boxes).toHaveLength(5);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(rectsOverlap(boxes[i]!, boxes[j]!)).toBe(false);
      }
    }
    // Root stays anchored where the user left it.
    expect(result.positions.r).toEqual({ x: 0, y: 0 });
    // Children flow to the right of the root.
    for (const c of children) {
      expect(result.positions[c.id]!.x).toBeGreaterThan(root.width);
    }
  });

  it('keeps the root anchored and stacks children below (vertical)', () => {
    const { root, children } = makeTree();
    const result = layoutMindMap(root, children, 'vertical', { x: 100, y: 200 });
    expect(result.positions.r).toEqual({ x: 100, y: 200 });
    for (const c of children) {
      expect(result.positions[c.id]!.y).toBeGreaterThan(root.height);
    }
  });

  it('places radial children around the root', () => {
    const { root, children } = makeTree();
    const result = layoutMindMap(root, children, 'radial', { x: 0, y: 0 });
    const rootCx = result.positions.r!.x + root.width / 2;
    const rootCy = result.positions.r!.y + root.height / 2;
    const left = children.filter((c) => result.positions[c.id]!.x + c.width / 2 < rootCx).length;
    const right = children.filter((c) => result.positions[c.id]!.x + c.width / 2 > rootCx).length;
    expect(left + right).toBe(4); // all children surround the root
    expect(left).toBeGreaterThanOrEqual(1);
    expect(right).toBeGreaterThanOrEqual(1);
    void rootCy;
  });

  it('collapses a branch to just its node size', () => {
    const { root, children } = makeTree();
    const collapsedRoot = { ...root, collapsed: true };
    const result = layoutMindMap(collapsedRoot, children, 'horizontal', { x: 0, y: 0 });
    expect(Object.keys(result.positions)).toEqual(['r']);
    expect(result.bounds.height).toBe(root.height);
  });

  it('handles nested branches with siblings sorted by order', () => {
    const root: LayoutNodeInput = { id: 'r', parentId: null, order: 0, width: 180, height: 56, collapsed: false };
    const a: LayoutNodeInput = { id: 'a', parentId: 'r', order: 0, width: 132, height: 42, collapsed: false };
    const a1: LayoutNodeInput = { id: 'a1', parentId: 'a', order: 0, width: 132, height: 42, collapsed: false };
    const a2: LayoutNodeInput = { id: 'a2', parentId: 'a', order: 1, width: 132, height: 42, collapsed: false };
    const b: LayoutNodeInput = { id: 'b', parentId: 'r', order: 1, width: 132, height: 42, collapsed: false };
    const result = layoutMindMap(root, [a, a1, a2, b], 'horizontal', { x: 0, y: 0 });
    // Grandchildren sit further right than their parent.
    expect(result.positions.a1!.x).toBeGreaterThan(result.positions.a!.x + a.width);
    expect(result.positions.a2!.x).toBeGreaterThan(result.positions.a!.x + a.width);
    // Nested children stack without overlapping each other.
    expect(rectsOverlap(
      { ...result.positions.a1!, width: a1.width, height: a1.height },
      { ...result.positions.a2!, width: a2.width, height: a2.height },
    )).toBe(false);
  });
});
