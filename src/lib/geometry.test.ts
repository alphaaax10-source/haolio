import { describe, expect, it } from 'vitest';
import {
  anchorPoint,
  curvedPath,
  edgeExitPoint,
  elbowPath,
  objectBounds,
  rectsIntersect,
  shapePath,
  straightPath,
  unionRects,
} from './geometry';
import { createMindNode, createShape } from './format';
import type { CanvasObject } from './types';

function shape(partial: Partial<CanvasObject>): CanvasObject {
  const base = createShape('rectangle', 0, 0, 100, 50, 1);
  return { ...base, ...partial, data: { ...base.data, ...partial.data }, style: { ...base.style, ...partial.style } };
}

describe('geometry', () => {
  it('computes axis-aligned bounds for unrotated objects', () => {
    const b = objectBounds(shape({ x: 10, y: 20, width: 100, height: 50 }));
    expect(b).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('computes rotated bounds correctly (90°)', () => {
    const b = objectBounds(shape({ x: 0, y: 0, width: 100, height: 50, rotation: 90 }));
    expect(b.width).toBeCloseTo(50, 5);
    expect(b.height).toBeCloseTo(100, 5);
  });

  it('unions rects and detects intersections', () => {
    const u = unionRects([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 },
    ]);
    expect(u).toEqual({ x: 0, y: 0, width: 15, height: 15 });
    expect(rectsIntersect({ x: 0, y: 0, width: 5, height: 5 }, { x: 4, y: 4, width: 5, height: 5 })).toBe(true);
    expect(rectsIntersect({ x: 0, y: 0, width: 5, height: 5 }, { x: 6, y: 6, width: 5, height: 5 })).toBe(false);
  });

  it('anchors sides with rotation', () => {
    const obj = shape({ x: 0, y: 0, width: 100, height: 50 });
    expect(anchorPoint(obj, 'right')).toEqual({ x: 100, y: 25 });
    expect(anchorPoint(obj, 'bottom', 0.5)).toEqual({ x: 50, y: 50 });
    const rotated = shape({ x: 0, y: 0, width: 100, height: 50, rotation: 180 });
    expect(anchorPoint(rotated, 'right').x).toBeCloseTo(0, 5);
  });

  it('computes edge exit points towards a target', () => {
    const obj = shape({ x: 0, y: 0, width: 100, height: 100 });
    const exit = edgeExitPoint(obj, { x: 200, y: 50 });
    expect(exit.x).toBeCloseTo(100, 5);
    expect(exit.y).toBeCloseTo(50, 5);
  });

  it('builds path strings for straight, curved and elbow connectors', () => {
    expect(straightPath({ x: 0, y: 0 }, { x: 10, y: 10 })).toBe('M 0 0 L 10 10');
    const curved = curvedPath({ x: 0, y: 0 }, 'right', { x: 100, y: 0 }, 'left');
    expect(curved).toMatch(/^M 0 0 C /);
    const elbow = elbowPath({ x: 0, y: 0 }, 'right', { x: 100, y: 80 }, 'left');
    expect(elbow).toMatch(/^M 0 0/);
    expect(elbow).toContain('L 100 80');
  });

  it('emits closed shape paths for every kind', () => {
    for (const kind of ['rectangle', 'rounded_rectangle', 'circle', 'diamond', 'triangle', 'hexagon'] as const) {
      const d = shapePath(kind, 100, 100);
      expect(d.length).toBeGreaterThan(0);
    }
    expect(shapePath('rectangle', 100, 50)).toBe('M 0 0 H 100 V 50 H 0 Z');
  });

  it('keeps mind node bounds aligned with position', () => {
    const node = createMindNode({ x: 33, y: 44, z: 1, text: 'n', parentId: null, rootId: null, order: 0 });
    const b = objectBounds(node);
    expect(b.x).toBe(33);
    expect(b.y).toBe(44);
  });
});
