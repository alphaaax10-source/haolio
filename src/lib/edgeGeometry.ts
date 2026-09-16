import type { ArrowStyle, CanvasObject, Edge, Vec } from './types';
import { curvedPath, edgeExitPoint, elbowPath, nearestSide, straightPath } from './geometry';

export interface EdgeGeometry {
  d: string;
  color: string;
  width: number;
  arrow: ArrowStyle;
  isMind: boolean;
  label?: string;
}

function centerOf(obj: CanvasObject): Vec {
  return { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
}

/**
 * Compute the SVG path + styling of a connection. Mind map branches derive
 * their look from the tree layout; plain connectors honor edge.data.route.
 * Shared by the on-canvas renderer and the SVG/PNG exporter.
 */
export function computeEdgeGeometry(edge: Edge, objects: Record<string, CanvasObject>): EdgeGeometry | null {
  const from = objects[edge.from];
  const to = objects[edge.to];
  if (!from || !to) return null;
  const isMind = from.type === 'mindmap_node' && to.type === 'mindmap_node';

  const toCenter = centerOf(to);
  const fromCenter = centerOf(from);
  const a = edgeExitPoint(from, toCenter);
  const b = edgeExitPoint(to, fromCenter);
  const aSide = nearestSide(from, toCenter);
  const bSide = nearestSide(to, fromCenter);

  let d: string;
  if (isMind) {
    const layout = (from.data.mind?.rootId ? objects[from.data.mind.rootId]?.data.mind?.layout : from.data.mind?.layout) ?? from.data.mind?.layout ?? 'horizontal';
    if (layout === 'radial') {
      d = straightPath(a, b);
    } else if (layout === 'vertical') {
      d = curvedPath(a, 'bottom', b, 'top');
    } else {
      d = curvedPath(a, 'right', b, 'left');
    }
  } else {
    const route = edge.data.route ?? 'curved';
    d =
      route === 'straight'
        ? straightPath(a, b)
        : route === 'elbow'
          ? elbowPath(a, aSide, b, bSide)
          : curvedPath(a, aSide, b, bSide);
  }

  return {
    d,
    color: isMind ? String(from.style.fill ?? '#94a3b8') : String(edge.style.color ?? '#94a3b8'),
    width: edge.style.width ?? 2,
    arrow: isMind ? 'none' : edge.data.arrow ?? 'none',
    isMind,
  };
}
