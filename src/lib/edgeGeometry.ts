import type { ArrowStyle, CanvasObject, Edge, Vec } from './types';
import { anchorPoint, curvedPath, edgeExitPoint, elbowPath, nearestSide, straightPath } from './geometry';

export interface EdgeGeometry {
  d: string;
  color: string;
  width: number;
  arrow: ArrowStyle;
  isMind: boolean;
}

function centerOf(obj: CanvasObject): Vec {
  return { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
}

/**
 * Compute the SVG path + styling of a connection. The endpoints are always
 * glued to the object border:
 *
 * - Mind map branches anchor at the side midpoints facing the other node
 *   (right/left for horizontal, bottom/top for vertical), so the curve leaves
 *   and enters each node cleanly at its center line.
 * - Radial branches and straight connectors meet at the border point lying on
 *   the center-to-center line.
 * - Curved/elbow connectors anchor at the nearest-side midpoints, matching the
 *   bezier control directions (no kinks at the endpoints).
 *
 * Shared by the on-canvas renderer and the SVG/PNG exporter.
 */
export function computeEdgeGeometry(edge: Edge, objects: Record<string, CanvasObject>): EdgeGeometry | null {
  const from = objects[edge.from];
  const to = objects[edge.to];
  if (!from || !to) return null;
  const isMind = from.type === 'mindmap_node' && to.type === 'mindmap_node';

  const fromCenter = centerOf(from);
  const toCenter = centerOf(to);

  let a: Vec;
  let b: Vec;
  let d: string;

  if (isMind) {
    const rootId = from.data.mind?.rootId;
    const layout =
      (rootId ? objects[rootId]?.data.mind?.layout : undefined) ??
      from.data.mind?.layout ??
      'horizontal';

    if (layout === 'radial') {
      a = edgeExitPoint(from, toCenter);
      b = edgeExitPoint(to, fromCenter);
      d = straightPath(a, b);
    } else {
      // Dynamic sides: pick each node's nearest side towards the other node,
      // so a branch dragged below its parent automatically re-routes from the
      // bottom (and back to the side when moved sideways again). Anchors stay
      // on the side midpoints and the curve control follows the side, keeping
      // the endpoints glued and smooth.
      const aSide = nearestSide(from, toCenter);
      const bSide = nearestSide(to, fromCenter);
      a = anchorPoint(from, aSide);
      b = anchorPoint(to, bSide);
      d = curvedPath(a, aSide, b, bSide);
    }
  } else {
    const route = edge.data.route ?? 'curved';
    if (route === 'straight') {
      a = edgeExitPoint(from, toCenter);
      b = edgeExitPoint(to, fromCenter);
      d = straightPath(a, b);
    } else {
      const aSide = nearestSide(from, toCenter);
      const bSide = nearestSide(to, fromCenter);
      a = anchorPoint(from, aSide);
      b = anchorPoint(to, bSide);
      d = route === 'elbow' ? elbowPath(a, aSide, b, bSide) : curvedPath(a, aSide, b, bSide);
    }
  }

  return {
    d,
    color: isMind ? String(from.style.fill ?? '#94a3b8') : String(edge.style.color ?? '#94a3b8'),
    width: edge.style.width ?? 2,
    arrow: isMind ? 'none' : edge.data.arrow ?? 'none',
    isMind,
  };
}
