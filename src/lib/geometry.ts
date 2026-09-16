import type { CanvasObject, Edge, Rect, ShapeKind, Vec } from './types';

export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectContains(rect: Rect, p: Vec): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height;
}

export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function inflate(rect: Rect, by: number): Rect {
  return {
    x: rect.x - by,
    y: rect.y - by,
    width: rect.width + by * 2,
    height: rect.height + by * 2,
  };
}

/** Axis-aligned bounding box of an object's rotated rectangle. */
export function objectBounds(obj: CanvasObject): Rect {
  const rad = (obj.rotation * Math.PI) / 180;
  if (Math.abs(obj.rotation % 360) < 0.01) {
    return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
  }
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = obj.width / 2;
  const hh = obj.height / 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [lx, ly] of [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ] as const) {
    const x = cx + lx * cos - ly * sin;
    const y = cy + lx * sin + ly * cos;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export type Side = 'top' | 'right' | 'bottom' | 'left';

/** Point on an object's border for a given side (rotation-aware). */
export function anchorPoint(obj: CanvasObject, side: Side, t = 0.5): Vec {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  let lx = 0;
  let ly = 0;
  switch (side) {
    case 'top':
      lx = obj.width * t;
      ly = 0;
      break;
    case 'right':
      lx = obj.width;
      ly = obj.height * t;
      break;
    case 'bottom':
      lx = obj.width * t;
      ly = obj.height;
      break;
    case 'left':
      lx = 0;
      ly = obj.height * t;
      break;
  }
  lx -= obj.width / 2;
  ly -= obj.height / 2;
  const rad = (obj.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
}

/** Intersection of the segment from the object center towards `target` with its rect border. */
export function edgeExitPoint(obj: CanvasObject, target: Vec): Vec {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  let dx = target.x - cx;
  let dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = Math.max(obj.width / 2, 0.01);
  const hh = Math.max(obj.height / 2, 0.01);
  const scale = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

export function nearestSide(obj: CanvasObject, target: Vec): Side {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

function outwardVector(obj: CanvasObject, side: Side): Vec {
  const rad = (obj.rotation * Math.PI) / 180;
  const base: Vec =
    side === 'top'
      ? { x: 0, y: -1 }
      : side === 'bottom'
        ? { x: 0, y: 1 }
        : side === 'left'
          ? { x: -1, y: 0 }
          : { x: 1, y: 0 };
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: base.x * cos - base.y * sin, y: base.x * sin + base.y * cos };
}

export function straightPath(a: Vec, b: Vec): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

export function curvedPath(a: Vec, aSide: Side, b: Vec, bSide: Side): string {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const k = clamp(dist * 0.4, 24, 140);
  const dirA = sideDir(aSide);
  const dirB = sideDir(bSide);
  const c1 = { x: a.x + dirA.x * k, y: a.y + dirA.y * k };
  const c2 = { x: b.x + dirB.x * k, y: b.y + dirB.y * k };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

function sideDir(side: Side): Vec {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
}

/** Orthogonal (elbow) path with rounded corners. */
export function elbowPath(a: Vec, aSide: Side, b: Vec, bSide: Side): string {
  const dirA = sideDir(aSide);
  const dirB = sideDir(bSide);
  const r = 10;
  const pts: Vec[] = [a];
  const aHorizontal = dirA.x !== 0;
  const bHorizontal = dirB.x !== 0;
  if (aHorizontal && bHorizontal) {
    const midX = (a.x + b.x) / 2;
    pts.push({ x: midX, y: a.y }, { x: midX, y: b.y });
  } else if (!aHorizontal && !bHorizontal) {
    const midY = (a.y + b.y) / 2;
    pts.push({ x: a.x, y: midY }, { x: b.x, y: midY });
  } else if (aHorizontal && !bHorizontal) {
    pts.push({ x: b.x, y: a.y });
  } else {
    pts.push({ x: a.x, y: b.y });
  }
  pts.push(b);
  // Deduplicate consecutive identical points and build a rounded polyline.
  const clean = pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1]!.x, p.y - pts[i - 1]!.y) > 0.5);
  if (clean.length < 2) return straightPath(a, b);
  let d = `M ${clean[0]!.x} ${clean[0]!.y}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1]!;
    const cur = clean[i]!;
    const next = clean[i + 1]!;
    const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const d2 = Math.hypot(next.x - cur.x, next.y - cur.y);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const p1 = { x: cur.x + ((prev.x - cur.x) / (d1 || 1)) * rr, y: cur.y + ((prev.y - cur.y) / (d1 || 1)) * rr };
    const p2 = { x: cur.x + ((next.x - cur.x) / (d2 || 1)) * rr, y: cur.y + ((next.y - cur.y) / (d2 || 1)) * rr };
    d += ` L ${p1.x} ${p1.y} Q ${cur.x} ${cur.y}, ${p2.x} ${p2.y}`;
  }
  const last = clean[clean.length - 1]!;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** SVG path for shape kinds in local (unrotated, unpositioned) coordinates. */
export function shapePath(kind: ShapeKind, w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  switch (kind) {
    case 'rectangle':
      return `M 0 0 H ${w} V ${h} H 0 Z`;
    case 'rounded_rectangle': {
      const r = Math.min(14, hw, hh);
      return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    }
    case 'circle':
      return `M ${hw} 0 A ${hw} ${hh} 0 1 1 ${hw - 0.01} 0 Z`;
    case 'diamond':
      return `M ${hw} 0 L ${w} ${hh} L ${hw} ${h} L 0 ${hh} Z`;
    case 'triangle':
      return `M ${hw} 0 L ${w} ${h} L 0 ${h} Z`;
    case 'hexagon': {
      const o = Math.min(w / 4, hw);
      return `M ${o} 0 L ${w - o} 0 L ${w} ${hh} L ${w - o} ${h} L ${o} ${h} L 0 ${hh} Z`;
    }
  }
}

export function isShapeKind(v: unknown): v is ShapeKind {
  return (
    v === 'rectangle' ||
    v === 'rounded_rectangle' ||
    v === 'circle' ||
    v === 'diamond' ||
    v === 'triangle' ||
    v === 'hexagon'
  );
}

export function snapValue(v: number, grid: number, enabled: boolean): number {
  if (!enabled || grid <= 0) return v;
  return Math.round(v / grid) * grid;
}
