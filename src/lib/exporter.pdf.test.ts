import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * svgToPdfBlob rasterizes an SVG at 2x via canvas, then hands the PNG to
 * jsPDF. jsdom has no canvas implementation, so this suite stubs the
 * browser primitives (Image, canvas 2D, toBlob) and mocks the jspdf module
 * to capture exactly what our pipeline feeds it.
 */

const pdfCalls = vi.hoisted(() => {
  const state: {
    opts: Record<string, unknown> | undefined;
    images: unknown[][];
  } = { opts: undefined, images: [] };
  return state;
});

vi.mock('jspdf', () => {
  return {
    jsPDF: class {
      constructor(opts: Record<string, unknown>) {
        pdfCalls.opts = opts;
      }
      addImage(...args: unknown[]) {
        pdfCalls.images.push(args);
      }
      output(): Blob {
        return new Blob(['%PDF-mock'], { type: 'application/pdf' });
      }
    },
  };
});

import { svgToPdfBlob } from './exporter';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"></svg>';

let originalGetContext: PropertyDescriptor | undefined;
let originalToBlob: PropertyDescriptor | undefined;

beforeEach(() => {
  pdfCalls.opts = undefined;
  pdfCalls.images = [];
  vi.clearAllMocks();

  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 100;
    naturalHeight = 50;
    set src(_v: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal('Image', FakeImage);

  originalGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext');
  originalToBlob = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'toBlob');
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ scale: vi.fn(), drawImage: vi.fn() }),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    value: (cb: (blob: Blob | null) => void) => cb(new Blob(['png-bytes'], { type: 'image/png' })),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalGetContext) Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', originalGetContext);
  if (originalToBlob) Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', originalToBlob);
});

describe('svgToPdfBlob', () => {
  it('creates a single landscape page sized to the export region', async () => {
    const blob = await svgToPdfBlob(SVG, 1000, 400);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');

    expect(pdfCalls.opts).toMatchObject({
      orientation: 'landscape',
      unit: 'px',
      format: [1000, 400],
      compress: true,
    });
    // Exactly one full-bleed image.
    expect(pdfCalls.images).toHaveLength(1);
    const [dataUrl, format, x, y, w, h] = pdfCalls.images[0]! as [string, string, number, number, number, number];
    expect(format).toBe('PNG');
    expect(x).toBe(0);
    expect(y).toBe(0);
    expect(w).toBe(1000);
    expect(h).toBe(400);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('uses portrait orientation for tall regions', async () => {
    await svgToPdfBlob(SVG, 300, 900);
    expect(pdfCalls.opts).toMatchObject({ orientation: 'portrait', format: [300, 900] });
  });

  it('clamps non-positive dimensions to 1px pages', async () => {
    await svgToPdfBlob(SVG, 0, 0);
    expect(pdfCalls.opts).toMatchObject({ format: [1, 1] });
  });
});
