import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSticky } from './format';
import type { CanvasObject } from './types';
import { cachedEdgeGeometry, pruneEdgeCache } from './edgeGeometryCache';

function sticky(id: string, x: number, y: number): CanvasObject {
  const s = createSticky(x, y, 1);
  s.id = id;
  return s;
}

function setup() {
  pruneEdgeCache(new Set());
  const a = sticky('a', 0, 0);
  const b = sticky('b', 400, 0);
  const objects = { a, b };
  const edge = { id: 'e1', from: 'a', to: 'b', data: {}, style: {}, z: 1 };
  return { a, b, objects, edge };
}

describe('edge geometry cache', () => {
  it('serves identical references for identical inputs', () => {
    const { objects, edge } = setup();
    const g1 = cachedEdgeGeometry(edge, objects);
    const g2 = cachedEdgeGeometry(edge, objects);
    expect(g1).not.toBeNull();
    expect(g1).toBe(g2);
  });

  it('recomputes when an endpoint object is replaced (copy-on-write)', () => {
    const { a, b, objects, edge } = setup();
    const g1 = cachedEdgeGeometry(edge, objects)!;
    const movedB = { ...b, x: b.x + 100 };
    const g2 = cachedEdgeGeometry(edge, { ...objects, b: movedB })!;
    expect(g2).not.toBe(g1);
    expect(g2.d).not.toBe(g1.d);
    void a;
  });

  it('recomputes when the edge itself is replaced', () => {
    const { objects, edge } = setup();
    const g1 = cachedEdgeGeometry(edge, objects)!;
    const g2 = cachedEdgeGeometry({ ...edge, data: { route: 'elbow' as const } }, objects)!;
    expect(g2).not.toBe(g1);
  });

  it('recomputes when the mind-map root changes', () => {
    const { objects, edge } = setup();
    // Give the endpoints a mind root — the root ref becomes part of the key.
    const withRoot = (o: CanvasObject): CanvasObject => ({
      ...o,
      data: { ...o.data, mind: { ...(o.data.mind ?? {}), rootId: 'root' } as CanvasObject['data']['mind'] },
    });
    const root = sticky('root', 200, -300);
    const objs1 = { ...objects, a: withRoot(objects.a!), b: withRoot(objects.b!), root };
    const g1 = cachedEdgeGeometry(edge, objs1)!;
    const root2 = { ...root, x: root.x + 1 };
    const g2 = cachedEdgeGeometry(edge, { ...objs1, root: root2 })!;
    expect(g2).not.toBe(g1);
  });

  it('returns null while an endpoint is missing', () => {
    const { objects, edge } = setup();
    expect(cachedEdgeGeometry(edge, { a: objects.a! })).toBeNull();
    expect(cachedEdgeGeometry(edge, {})).toBeNull();
  });

  it('pruneEdgeCache drops entries for removed edges so they recompute', () => {
    const { objects, edge } = setup();
    const g1 = cachedEdgeGeometry(edge, objects)!;
    // Keeping the id → cache hit.
    pruneEdgeCache(new Set([edge.id]));
    expect(cachedEdgeGeometry(edge, objects)).toBe(g1);
    // Dropping the id → entry removed, next call recomputes.
    pruneEdgeCache(new Set<string>());
    expect(cachedEdgeGeometry(edge, objects)).not.toBe(g1);
  });
});
