// Tiny event registry so global shortcuts (implemented in a hook) can trigger
// UI actions that live inside React components (dialogs, panels, file pickers).

const handlers = new Map<string, Set<() => void>>();

export function registerUiEvent(name: string, fn: () => void): () => void {
  let set = handlers.get(name);
  if (!set) {
    set = new Set();
    handlers.set(name, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}

export function emitUiEvent(name: string): void {
  handlers.get(name)?.forEach((fn) => fn());
}
