import type { Board, CanvasObject, Edge, Project, Rect } from './types';
import { anchorPoint, shapePath, unionRects, objectBounds } from './geometry';
import { computeEdgeGeometry } from './edgeGeometry';

// -----------------------------------------------------------------------------
// Board → SVG export (used directly for .svg and rasterized for .png).
// Pure string building, no DOM dependency, so it is unit-testable.
// -----------------------------------------------------------------------------

export type ExportScope = 'board' | 'selection' | 'viewport';

const FONT_STACK = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportScopeRect(
  scope: ExportScope,
  board: Board,
  selectionIds: string[],
  viewport?: Rect,
): Rect {
  if (scope === 'viewport' && viewport) return viewport;
  const objs =
    scope === 'selection' ? selectionIds.map((id) => board.objects[id]).filter(Boolean) : Object.values(board.objects);
  const rect = unionRects(objs.map((o) => objectBounds(o)));
  if (!rect) return { x: 0, y: 0, width: 800, height: 600 };
  return { x: rect.x - 40, y: rect.y - 40, width: rect.width + 80, height: rect.height + 80 };
}

function textLines(text: string): string[] {
  return text.split('\n');
}

function svgText(obj: CanvasObject, cx: number, cy: number, maxWidth: number): string {
  const size = obj.style.fontSize ?? 16;
  const color = obj.style.color ?? '#1e1b4b';
  const weight = obj.style.bold ? '700' : '400';
  const fontStyle = obj.style.italic ? ' italic' : '';
  const decoration = obj.style.underline ? ' underline' : '';
  const align = obj.style.align ?? 'center';
  const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  const x = align === 'left' ? cx - maxWidth / 2 + 4 : align === 'right' ? cx + maxWidth / 2 - 4 : cx;
  const lines = textLines(String(obj.data.text ?? ''));
  const lh = size * 1.35;
  const startY = cy - ((lines.length - 1) * lh) / 2 + size * 0.34;
  return lines
    .map((line, i) => {
      const shown = line.length > 64 ? line.slice(0, 63) + '…' : line;
      return `<text x="${x}" y="${startY + i * lh}" font-family="${FONT_STACK}" font-size="${size}" fill="${esc(color)}" font-weight="${weight}" font-style${fontStyle ? `="${fontStyle.trim()}"` : ''} text-decoration${decoration ? `="${decoration.trim()}"` : ''} text-anchor="${anchor}">${esc(shown)}</text>`;
    })
    .join('');
}

function objectSvg(obj: CanvasObject): string {
  const rot = obj.rotation ? ` transform="rotate(${obj.rotation} ${obj.x + obj.width / 2} ${obj.y + obj.height / 2})"` : '';
  const opacity = obj.style.opacity ?? 1;
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  const body = (() => {
    switch (obj.type) {
      case 'sticky_note': {
        const fill = obj.style.fill ?? '#fbbf24';
        return (
          `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="${obj.style.radius ?? 10}" fill="${esc(fill)}"/>` +
          svgText({ ...obj, style: { ...obj.style, color: '#1c1917', align: 'left' } }, obj.x + obj.width / 2, obj.y + obj.height / 2 + 6, obj.width - 24)
        );
      }
      case 'text':
        return svgText(obj, cx, cy, obj.width + 400);
      case 'shape': {
        const path = shapePath(obj.data.shape ?? 'rectangle', obj.width, obj.height);
        const fill = obj.style.fill && obj.style.fill !== 'transparent' ? esc(obj.style.fill) : 'none';
        const stroke = obj.style.stroke ? esc(obj.style.stroke) : 'none';
        const sw = obj.style.strokeWidth ?? 0;
        return `<path d="${path}" transform="translate(${obj.x} ${obj.y})" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>` + svgText(obj, cx, cy, obj.width - 16);
      }
      case 'mindmap_node': {
        const fill = obj.style.fill ?? '#6366f1';
        const r = Math.min(obj.style.radius ?? 12, obj.height / 2);
        return (
          `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="${r}" fill="${esc(fill)}"/>` +
          svgText(obj, cx, cy, obj.width - 16)
        );
      }
      case 'image': {
        const src = String(obj.data.src ?? '');
        return `<image x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" preserveAspectRatio="xMidYMid slice" href="${esc(src)}"/>`;
      }
      case 'frame': {
        const title = String(obj.data.text ?? '');
        return (
          `<rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="${obj.style.radius ?? 12}" fill="none" stroke="#8b5cf6" stroke-width="1.5"/>` +
          `<text x="${obj.x + 2}" y="${obj.y - 8}" font-family="${FONT_STACK}" font-size="14" font-weight="600" fill="#8b5cf6">${esc(title)}</text>`
        );
      }
      default:
        return '';
    }
  })();
  return opacity < 1 ? `<g opacity="${opacity}">${body}</g>` : body;
}

function edgeSvg(edge: Edge, objects: Record<string, CanvasObject>): string {
  const geo = computeEdgeGeometry(edge, objects);
  if (!geo) return '';
  const markerStart = geo.arrow === 'double' ? ' marker-start="url(#haolio-arrow)"' : '';
  const markerEnd = geo.arrow !== 'none' ? ' marker-end="url(#haolio-arrow)"' : '';
  return `<path d="${geo.d}" fill="none" stroke="${esc(geo.color)}" stroke-width="${geo.width}"${markerStart}${markerEnd}/>`;
}

export function buildBoardSvg(
  board: Board,
  scope: ExportScope,
  selectionIds: string[],
  background: string,
  viewport?: Rect,
): string {
  const rect = exportScopeRect(scope, board, selectionIds, viewport);
  const objects = Object.values(board.objects)
    .filter((o) => o.type !== 'group')
    .sort((a, b) => a.z - b.z)
    .filter((o) => {
      const b2 = objectBounds(o);
      return b2.x < rect.x + rect.width && b2.x + b2.width > rect.x && b2.y < rect.y + rect.height && b2.y + b2.height > rect.y;
    });
  const edges = Object.values(board.edges)
    .sort((a, b) => a.z - b.z)
    .filter((e) => objects.some((o) => o.id === e.from) && objects.some((o) => o.id === e.to));
  const arrowDef =
    `<marker id="haolio-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"></path></marker>`;
  const parts: string[] = [];
  parts.push(`<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${esc(background)}"/>`);
  for (const e of edges) parts.push(edgeSvg(e, board.objects));
  for (const o of objects) parts.push(objectSvg(o));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(rect.width)}" height="${Math.round(rect.height)}" viewBox="${rect.x} ${rect.y} ${rect.width} ${rect.height}">` +
    `<defs>${arrowDef}</defs>` +
    parts.join('') +
    `</svg>`
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Rasterize the board SVG into a single-page PDF sized exactly to the
 * exported region (rendered at 2x for crisp output).
 */
export async function svgToPdfBlob(svg: string, widthPx: number, heightPx: number): Promise<Blob> {
  const png = await svgToPngBlob(svg, 2);
  const dataUrl = await blobToDataUrl(png);
  const { jsPDF } = await import('jspdf');
  const w = Math.max(1, Math.round(widthPx));
  const h = Math.max(1, Math.round(heightPx));
  const doc = new jsPDF({
    orientation: w >= h ? 'landscape' : 'portrait',
    unit: 'px',
    format: [w, h],
    compress: true,
  });
  doc.addImage(dataUrl, 'PNG', 0, 0, w, h);
  return doc.output('blob');
}

export async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to rasterize export image'));
    img.src = svgUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.naturalWidth * scale);
  canvas.height = Math.max(1, img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode PNG'))), 'image/png');
  });
}

export function suggestFileName(project: Project, board: Board, ext: string): string {
  const safe = `${project.project.name} — ${board.title}`.replace(/[\\/:*?"<>|]+/g, '-').trim();
  return `${safe}.${ext}`;
}

export { anchorPoint };
