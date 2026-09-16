import { beforeEach, describe, expect, it } from 'vitest';
import { zoomToSelection } from '@/hooks/useShortcuts';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { createSticky } from '@/lib/format';
import type { CanvasObject } from '@/lib/types';

function sticky(id: string, x: number, y: number, width = 200, height = 160): CanvasObject {
  const s = createSticky(x, y, 1);
  s.id = id;
  s.width = width;
  s.height = height;
  return s;
}

const VIEWPORT = { x: 0, y: 0, zoom: 1 };

beforeEach(() => {
  useCanvasStore.setState({ size: { width: 1000, height: 800 }, viewport: { ...VIEWPORT } });
  useEditorStore.setState({ objects: {}, edges: {}, selection: { objects: [], edges: [] } });
});

describe('zoomToSelection (Shift+F)', () => {
  it('centers and fits the union of the selected objects', () => {
    const a = sticky('a', 0, 0, 200, 100);
    const b = sticky('b', 1000, 800, 200, 100);
    useEditorStore.setState({ objects: { a, b }, selection: { objects: ['a', 'b'], edges: [] } });

    zoomToSelection();

    // Union bounds = (0,0)-(1200,900). Padding 140 → zoom = min(720/1200, 520/900, 1.25) ≈ 0.578.
    const expectedZoom = Math.min((1000 - 280) / 1200, (800 - 280) / 900, 1.25);
    const { viewport } = useCanvasStore.getState();
    expect(viewport.zoom).toBeCloseTo(expectedZoom, 6);
    expect(viewport.x).toBeCloseTo(1000 / 2 - (600 * expectedZoom), 6);
    expect(viewport.y).toBeCloseTo(800 / 2 - (450 * expectedZoom), 6);
  });

  it('ignores objects outside the selection', () => {
    const a = sticky('a', 0, 0, 100, 100);
    const b = sticky('b', 50, 50, 100, 100);
    const far = sticky('far', 50000, 50000, 100, 100);
    useEditorStore.setState({ objects: { a, b, far }, selection: { objects: ['a', 'b'], edges: [] } });

    zoomToSelection();

    // Union of a+b only = (0,0)-(150,150) → the far object must not be framed.
    const { viewport } = useCanvasStore.getState();
    expect(viewport.zoom).toBeCloseTo(Math.min((1000 - 280) / 150, (800 - 280) / 150, 1.25), 6);
    expect(viewport.zoom).toBeCloseTo(1.25, 6);
  });

  it('falls back to fitting all content with an empty selection', () => {
    const a = sticky('a', 0, 0, 1200, 900);
    useEditorStore.setState({ objects: { a }, selection: { objects: [], edges: [] } });

    zoomToSelection();

    const expectedZoom = Math.min((1000 - 240) / 1200, (800 - 240) / 900, 1.25);
    const { viewport } = useCanvasStore.getState();
    expect(viewport.zoom).toBeCloseTo(expectedZoom, 6);
  });

  it('resets to the origin-centered default view on an empty board', () => {
    zoomToSelection();
    const { viewport, size } = useCanvasStore.getState();
    expect(viewport.zoom).toBe(1);
    expect(viewport.x).toBe(size.width / 2);
    expect(viewport.y).toBe(size.height / 2);
  });
});
