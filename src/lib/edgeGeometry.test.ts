import { describe, expect, it } from 'vitest';
import { computeEdgeGeometry } from './edgeGeometry';
import { createEdge, createMindNode, createSticky } from './format';
import type { CanvasObject } from './types';

// Note: non-root mind nodes are 132x42, root nodes 180x56 (see createMindNode).

function mindNode(id: string, x: number, y: number, opts?: { layout?: 'horizontal' | 'vertical' | 'radial'; parentId?: string | null; rootId?: string | null }): CanvasObject {
  const node = createMindNode({
    x,
    y,
    z: 1,
    text: id,
    parentId: opts?.parentId ?? null,
    rootId: opts?.rootId ?? null,
    order: 0,
    layout: opts?.layout ?? 'horizontal',
  });
  node.id = id;
  return node;
}

describe('edge geometry attaches connectors to object borders', () => {
  it('horizontal mind edge anchors at facing side midpoints', () => {
    const parent = mindNode('p', 0, 0, { rootId: 'p' });
    const child = mindNode('c', 300, 0, { parentId: 'p', rootId: 'p' });
    const geo = computeEdgeGeometry(createEdge('p', 'c', 1), { p: parent, c: child })!;
    // Parent right-mid = (132, 21). Child left-mid = (300, 21).
    expect(geo.d).toContain('M 132 21');
    expect(geo.d).toMatch(/300 21$/);
    expect(geo.isMind).toBe(true);
  });

  it('vertical mind edge anchors at bottom/top midpoints', () => {
    const parent = mindNode('p', 0, 0, { layout: 'vertical', rootId: 'p' });
    const child = mindNode('c', 0, 200, { parentId: 'p', rootId: 'p' });
    const geo = computeEdgeGeometry(createEdge('p', 'c', 1), { p: parent, c: child })!;
    // Parent bottom-mid = (66, 42); child top-mid = (66, 200).
    expect(geo.d).toContain('M 66 42');
    expect(geo.d).toMatch(/66 200$/);
  });

  it('mind edge sides flip when a node is dragged to the other side', () => {
    const parent = mindNode('p', 300, 0, { rootId: 'p' });
    const child = mindNode('c', 0, 0, { parentId: 'p', rootId: 'p' });
    const geo = computeEdgeGeometry(createEdge('p', 'c', 1), { p: parent, c: child })!;
    // Child is left of parent → edge leaves parent's LEFT side and enters
    // child's RIGHT side.
    expect(geo.d).toContain('M 300 21');
    expect(geo.d).toMatch(/132 21$/);
  });

  it('auto-flips anchor sides as a node moves (below → bottom/top, then right → right/left)', () => {
    const parent = mindNode('p', 0, 0, { rootId: 'p' });
    const below = mindNode('c', 200, 300, { parentId: 'p', rootId: 'p' });
    const geoBelow = computeEdgeGeometry(createEdge('p', 'c', 1), { p: parent, c: below })!;
    // Child is mostly below → edge leaves the parent's BOTTOM midpoint
    // (66, 42) and enters the child's TOP midpoint (266, 300).
    expect(geoBelow.d).toContain('M 66 42');
    expect(geoBelow.d).toMatch(/266 300$/);

    // Same child dragged to the right side → edge flips to right/left.
    const right = { ...below, x: 500, y: 0 };
    const geoRight = computeEdgeGeometry(createEdge('p', 'c', 1), { p: parent, c: right })!;
    expect(geoRight.d).toContain('M 132 21');
    expect(geoRight.d).toMatch(/500 21$/);
  });

  it('radial mind edge is a straight border-to-border line', () => {
    const parent = mindNode('p', 0, 0, { layout: 'radial', rootId: 'p' });
    const child = mindNode('c', 300, 100, { parentId: 'p', rootId: 'p' });
    const geo = computeEdgeGeometry(createEdge('p', 'c', 1), { p: parent, c: child })!;
    expect(geo.d).toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
    // Start point lies on the parent's border along the center line:
    // center (66,21) towards child center (366,121), height/2 = 21 → (129, 42).
    expect(geo.d.startsWith('M 129 42 ')).toBe(true);
  });

  it('curved connector anchors at nearest-side midpoints', () => {
    const a = createSticky(0, 0, 1);
    a.id = 'a';
    const b = createSticky(500, 0, 2);
    b.id = 'b';
    const geo = computeEdgeGeometry(createEdge('a', 'b', 1), { a, b })!;
    // a is 200x200 at (0,0) → right-mid = (200,100); b at (500,0) → left-mid = (500,100).
    expect(geo.d).toContain('M 200 100');
    expect(geo.d).toMatch(/500 100$/);
  });

  it('straight connector meets the border on the center line', () => {
    const a = createSticky(0, 0, 1);
    a.id = 'a';
    const b = createSticky(500, 100, 2);
    b.id = 'b';
    const edge = { ...createEdge('a', 'b', 1), data: { route: 'straight' as const, arrow: 'none' as const } };
    const geo = computeEdgeGeometry(edge, { a, b })!;
    expect(geo.d).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
    // Center (100,100) → (600,200): exits a's right border at (200,120),
    // enters b's left border at (500,180).
    expect(geo.d).toBe('M 200 120 L 500 180');
  });

  it('general edges inherit side anchoring for elbow routing', () => {
    const a = createSticky(0, 0, 1);
    a.id = 'a';
    const b = createSticky(500, 400, 2);
    b.id = 'b';
    const edge = { ...createEdge('a', 'b', 1), data: { route: 'elbow' as const, arrow: 'arrow' as const } };
    const geo = computeEdgeGeometry(edge, { a, b })!;
    expect(geo.d).toContain('M 200 100'); // a right-mid
    expect(geo.d).toContain('L 500 500'); // ends at b left-mid
    expect(geo.arrow).toBe('arrow');
  });
});
