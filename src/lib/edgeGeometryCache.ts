import type { CanvasObject, Edge } from './types';
import { computeEdgeGeometry, type EdgeGeometry } from './edgeGeometry';

/**
 * Reference-keyed memo cache for connector geometry. Objects/edges are
 * copy-on-write, so comparing references is a correct and very cheap
 * invalidation check: a drag only rewrites the dragged nodes, so only the
 * edges attached to them recompute — everything else is served from cache.
 *
 * Mind-map branch routing also depends on the tree root (its layout), so the
 * root reference is part of the key for mind edges.
 */
interface CacheEntry {
  edge: Edge;
  from: CanvasObject;
  to: CanvasObject;
  root: CanvasObject | undefined;
  geo: EdgeGeometry;
}

const cache = new Map<string, CacheEntry>();

export function cachedEdgeGeometry(
  edge: Edge,
  objects: Record<string, CanvasObject>,
): EdgeGeometry | null {
  const from = objects[edge.from];
  const to = objects[edge.to];
  if (!from || !to) return null;
  const rootId = from.data.mind?.rootId;
  const root = rootId ? objects[rootId] : undefined;

  const hit = cache.get(edge.id);
  if (hit && hit.edge === edge && hit.from === from && hit.to === to && hit.root === root) {
    return hit.geo;
  }
  const geo = computeEdgeGeometry(edge, objects);
  if (!geo) return null;
  cache.set(edge.id, { edge, from, to, root, geo });
  return geo;
}

/** Drop cache entries whose edge no longer exists on the current board. */
export function pruneEdgeCache(keepIds: Set<string>): void {
  for (const id of cache.keys()) {
    if (!keepIds.has(id)) cache.delete(id);
  }
}
