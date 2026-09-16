// -----------------------------------------------------------------------------
// Environment bridge: native file dialogs under Tauri, browser fallbacks
// (download / file picker) when running outside the desktop shell.
// No network is involved in either path.
// -----------------------------------------------------------------------------

export interface FileFilter {
  name: string;
  extensions: string[];
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function downloadContents(contents: string | Blob, fileName: string): void {
  const blob = typeof contents === 'string' ? new Blob([contents], { type: 'application/octet-stream' }) : contents;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Ask the user for a destination and write text contents. Returns false when cancelled. */
export async function saveTextFile(
  defaultName: string,
  contents: string,
  filters: FileFilter[],
): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await save({ defaultPath: defaultName, filters });
    if (!path) return false;
    await invoke('write_text_file', { path, contents });
    return true;
  }
  downloadContents(contents, defaultName);
  return true;
}

/** Ask the user for a destination and write binary contents. Returns false when cancelled. */
export async function saveBinaryFile(
  defaultName: string,
  contents: Blob,
  filters: FileFilter[],
): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await save({ defaultPath: defaultName, filters });
    if (!path) return false;
    const bytes = new Uint8Array(await contents.arrayBuffer());
    await invoke('write_binary_file', { path, contents: [...bytes] });
    return true;
  }
  downloadContents(contents, defaultName);
  return true;
}

function pickFileWeb(accept: string): Promise<{ name: string; text: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      resolve({ name: file.name, text: await file.text() });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Ask the user to pick a text file. Returns null when cancelled. */
export async function openTextFile(filters: FileFilter[]): Promise<{ name: string; text: string } | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await open({ multiple: false, filters });
    if (!path || typeof path !== 'string') return null;
    const text = await invoke<string>('read_text_file', { path });
    const name = path.split(/[\\/]/).pop() ?? 'project.haolio';
    return { name, text };
  }
  const exts = filters.flatMap((f) => f.extensions).map((e) => `.${e}`).join(',');
  return pickFileWeb(exts);
}

/** Set the native window title when running under Tauri. */
export async function setWindowTitle(title: string): Promise<void> {
  document.title = title;
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setTitle(title);
    } catch {
      // Window API unavailable — document.title is enough.
    }
  }
}
