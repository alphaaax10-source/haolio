import { buildBoardSvg, exportScopeRect, svgToPdfBlob, svgToPngBlob, suggestFileName, type ExportScope } from './exporter';
import { openTextFile, saveBinaryFile, saveTextFile } from './bridge';
import { parseProjectText, serializeProject } from './format';
import { useEditorStore } from '@/stores/editorStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { toast } from '@/stores/toastStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { tNow } from '@/lib/i18n';

// High-level .haolio / export flows shared by menus and shortcuts.

const HAOLIO_FILTERS = [{ name: 'Haolio Project', extensions: ['haolio'] }];
const PNG_FILTERS = [{ name: 'PNG Image', extensions: ['png'] }];
const SVG_FILTERS = [{ name: 'SVG Image', extensions: ['svg'] }];
const PDF_FILTERS = [{ name: 'PDF Document', extensions: ['pdf'] }];
const JSON_FILTERS = [{ name: 'JSON Project', extensions: ['json'] }];

function resolvedBackground(): string {
  const style = getComputedStyle(document.documentElement);
  const bg = style.getPropertyValue('--canvas-bg').trim();
  return bg ? `hsl(${bg})` : '#f4f6fb';
}

/** Save the current project as a portable .haolio file. */
export async function saveProjectSnapshotFlow(): Promise<void> {
  const editor = useEditorStore.getState();
  if (!editor.data) return;
  try {
    const name = `${editor.data.project.name}.haolio`;
    const ok = await saveTextFile(name, serializeProject(editor.data), HAOLIO_FILTERS);
    if (ok) toast.success(tNow('msg.savedToFile'));
  } catch (error) {
    toast.error(tNow('msg.unableSave', { reason: error instanceof Error ? error.message : '' }), {
      actionLabel: 'Retry',
      onAction: () => void saveProjectSnapshotFlow(),
    });
  }
}

/** Export the whole project as pretty JSON. */
export async function exportProjectJsonFlow(): Promise<void> {
  const editor = useEditorStore.getState();
  if (!editor.data) return;
  try {
    const ok = await saveTextFile(
      `${editor.data.project.name}.json`,
      JSON.stringify(editor.data, null, 2),
      JSON_FILTERS,
    );
    if (ok) toast.success(tNow('msg.exportedJson'));
  } catch (error) {
    toast.error(tNow('msg.unableExport', { kind: 'JSON', reason: error instanceof Error ? error.message : '' }));
  }
}

/** Open a .haolio file into the library. */
export async function openProjectFileFlow(): Promise<void> {
  try {
    const picked = await openTextFile(HAOLIO_FILTERS);
    if (!picked) return;
    await useLibraryStore.getState().importProjectText(picked.text, picked.name.replace(/\.haolio$/i, ''));
  } catch (error) {
    toast.error(tNow('msg.unableOpenFile', { reason: error instanceof Error ? error.message : '' }));
  }
}

export async function exportBoardImageFlow(
  kind: 'png' | 'svg' | 'pdf',
  scope: ExportScope,
): Promise<void> {
  const editor = useEditorStore.getState();
  if (!editor.data) return;
  const board = editor.data.boards.find((b) => b.id === editor.boardId);
  if (!board) return;
  try {
    let viewportRect;
    if (scope === 'viewport') {
      const { viewport, size } = useCanvasStore.getState();
      viewportRect = {
        x: -viewport.x / viewport.zoom,
        y: -viewport.y / viewport.zoom,
        width: size.width / viewport.zoom,
        height: size.height / viewport.zoom,
      };
    }
    const svg = buildBoardSvg(
      board,
      scope,
      editor.selection.objects,
      resolvedBackground(),
      viewportRect,
    );
    const fileName = suggestFileName(editor.data, board, kind);
    if (kind === 'svg') {
      const ok = await saveTextFile(fileName, svg, SVG_FILTERS);
      if (ok) toast.success(tNow('msg.exportedSvg'));
      return;
    }
    const rect = exportScopeRect(scope, board, editor.selection.objects, viewportRect);
    if (kind === 'pdf') {
      const blob = await svgToPdfBlob(svg, rect.width, rect.height);
      const ok = await saveBinaryFile(fileName, blob, PDF_FILTERS);
      if (ok) toast.success(tNow('msg.exportedPdf'));
      return;
    }
    const blob = await svgToPngBlob(svg, 2);
    const ok = await saveBinaryFile(fileName, blob, PNG_FILTERS);
    if (ok) toast.success(tNow('msg.exportedPng'));
  } catch (error) {
    toast.error(tNow('msg.unableExport', { kind: 'PNG/SVG', reason: error instanceof Error ? error.message : '' }), {
      actionLabel: 'Retry',
      onAction: () => void exportBoardImageFlow(kind, scope),
    });
  }
}

export { exportScopeRect };
