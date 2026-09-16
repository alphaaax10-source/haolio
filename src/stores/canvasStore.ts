import { create } from 'zustand';
import type { Rect, ShapeKind, Tool, Vec } from '@/lib/types';

/**
 * Transient, non-persisted canvas state: viewport, active tool and in-flight
 * gesture previews. Kept separate from the document store so high-frequency
 * updates (pan/zoom/drag) never touch history or persistence.
 */
export interface CanvasState {
  viewport: { x: number; y: number; zoom: number };
  tool: Tool;
  pendingShape: ShapeKind;
  spacePanning: boolean;
  marquee: Rect | null;
  connecting: { fromId: string; cursor: Vec } | null;
  size: { width: number; height: number };
  /** Page-space position of the canvas container (for pointer math). */
  containerOrigin: Vec;
  searchOpen: boolean;
  settingsOpen: boolean;

  setSearchOpen(v: boolean): void;
  setSettingsOpen(v: boolean): void;
  setContainerOrigin(x: number, y: number): void;
  setViewport(viewport: { x: number; y: number; zoom: number }): void;
  setTool(tool: Tool): void;
  setPendingShape(kind: ShapeKind): void;
  setSpacePanning(v: boolean): void;
  setMarquee(rect: Rect | null): void;
  setConnecting(state: { fromId: string; cursor: Vec } | null): void;
  setSize(width: number, height: number): void;
  zoomAt(anchor: Vec, factor: number): void;
  zoomBy(factor: number): void;
  setZoom(zoom: number): void;
  centerOn(point: Vec): void;
  centerOnRect(rect: Rect, padding?: number): void;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 5;

export const useCanvasStore = create<CanvasState>()((set, get) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  tool: 'select',
  pendingShape: 'rounded_rectangle',
  spacePanning: false,
  marquee: null,
  connecting: null,
  size: { width: 1200, height: 800 },
  containerOrigin: { x: 0, y: 0 },
  searchOpen: false,
  settingsOpen: false,

  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setContainerOrigin: (x, y) => set({ containerOrigin: { x, y } }),
  setViewport: (viewport) => set({ viewport }),
  setTool: (tool) => set({ tool, marquee: null, connecting: null }),
  setPendingShape: (pendingShape) => set({ pendingShape }),
  setSpacePanning: (spacePanning) => set({ spacePanning }),
  setMarquee: (marquee) => set({ marquee }),
  setConnecting: (connecting) => set({ connecting }),
  setSize: (width, height) => set({ size: { width, height } }),

  zoomAt: (anchor, factor) => {
    const { viewport } = get();
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
    const wx = (anchor.x - viewport.x) / viewport.zoom;
    const wy = (anchor.y - viewport.y) / viewport.zoom;
    set({
      viewport: {
        zoom,
        x: anchor.x - wx * zoom,
        y: anchor.y - wy * zoom,
      },
    });
  },

  zoomBy: (factor) => {
    const { size } = get();
    get().zoomAt({ x: size.width / 2, y: size.height / 2 }, factor);
  },

  setZoom: (zoom) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const { viewport, size } = get();
    const wx = (size.width / 2 - viewport.x) / viewport.zoom;
    const wy = (size.height / 2 - viewport.y) / viewport.zoom;
    set({ viewport: { zoom: clamped, x: size.width / 2 - wx * clamped, y: size.height / 2 - wy * clamped } });
  },

  centerOn: (point) => {
    const { viewport, size } = get();
    set({ viewport: { ...viewport, x: size.width / 2 - point.x * viewport.zoom, y: size.height / 2 - point.y * viewport.zoom } });
  },

  centerOnRect: (rect, padding = 100) => {
    const { size } = get();
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min((size.width - padding * 2) / Math.max(rect.width, 1), (size.height - padding * 2) / Math.max(rect.height, 1), 1.25)),
    );
    set({
      viewport: {
        zoom,
        x: size.width / 2 - (rect.x + rect.width / 2) * zoom,
        y: size.height / 2 - (rect.y + rect.height / 2) * zoom,
      },
    });
  },
}));
