import { create } from 'zustand';
import type { Project, ProjectRecord } from '@/lib/types';
import { dbDelete, dbGet, dbSet } from '@/lib/db';
import { createId } from '@/lib/id';
import { normalizeProject, parseProjectText, projectColorFor, serializeProject, nowIso } from '@/lib/format';
import { createProjectFromTemplate, createWelcomeProject, type ProjectTemplate } from '@/lib/templates';
import { useEditorStore } from './editorStore';
import { toast } from './toastStore';
import { tNow } from '@/lib/i18n';

// -----------------------------------------------------------------------------
// Library store: the list of local projects + their autosaved working copies.
// All data lives in IndexedDB on the user's machine.
// -----------------------------------------------------------------------------

const LIB_KEY = 'library';
const SEED_KEY = 'seeded.v1';
const projectKey = (id: string) => `project:${id}`;

export interface WorkingCopy {
  data: Project;
  savedAt: string;
}

interface LibraryState {
  hydrated: boolean;
  projects: ProjectRecord[];
  activeProjectId: string | null;

  hydrate(): Promise<void>;
  createProject(name: string, template: ProjectTemplate): string | null;
  openProject(id: string): Promise<void>;
  importProjectText(text: string, fallbackName: string): Promise<void>;
  closeProject(): void;
  renameProject(id: string, name: string): void;
  removeProject(id: string): Promise<void>;
  updateRecordMeta(id: string, data: Project): void;
  persistWorkingCopy(projectId: string, data: Project): Promise<boolean>;
  loadWorkingCopy(projectId: string): Promise<WorkingCopy | undefined>;
}

function recordFromProject(data: Project, lastOpenedAt: string): ProjectRecord {
  return {
    id: data.project.id,
    name: data.project.name,
    color: data.project.color,
    createdAt: data.project.createdAt,
    lastOpenedAt,
    boardCount: data.boards.length,
    objectCount: data.boards.reduce((acc, b) => acc + Object.keys(b.objects).length, 0),
  };
}

export const useLibraryStore = create<LibraryState>()((set, get) => ({
  hydrated: false,
  projects: [],
  activeProjectId: null,

  hydrate: async () => {
    let projects = (await dbGet<ProjectRecord[]>(LIB_KEY)) ?? [];
    if (projects.length === 0 && !(await dbGet<boolean>(SEED_KEY))) {
      // First run: create a friendly starter project (shown on the dashboard).
      const data = createWelcomeProject();
      await dbSet(projectKey(data.project.id), { data, savedAt: nowIso() } satisfies WorkingCopy);
      projects = [recordFromProject(data, nowIso())];
      await dbSet(LIB_KEY, projects);
      await dbSet(SEED_KEY, true);
    }
    projects = [...projects].sort((a, b) => (a.lastOpenedAt < b.lastOpenedAt ? 1 : -1));
    set({ projects, hydrated: true });
  },

  createProject: (name, template) => {
    const trimmed = name.trim() || 'Untitled Project';
    const data = template === 'welcome' ? createWelcomeProject() : createProjectFromTemplate(trimmed, template);
    if (template !== 'welcome') data.project.name = trimmed;
    const record = recordFromProject(data, nowIso());
    const projects = [record, ...get().projects];
    set({ projects });
    void dbSet(LIB_KEY, projects);
    void dbSet(projectKey(record.id), { data, savedAt: nowIso() } satisfies WorkingCopy);
    useEditorStore.getState().openProject(data, record.id);
    set({ activeProjectId: record.id });
    return record.id;
  },

  openProject: async (id) => {
    const copy = await get().loadWorkingCopy(id);
    if (!copy) {
      toast.error(tNow('msg.projectMissing'), {
        actionLabel: 'Remove',
        onAction: () => void get().removeProject(id),
      });
      return;
    }
    const record = get().projects.find((p) => p.id === id);
    if (record) {
      record.lastOpenedAt = nowIso();
      record.boardCount = copy.data.boards.length;
      record.objectCount = copy.data.boards.reduce((acc, b) => acc + Object.keys(b.objects).length, 0);
      const projects = [...get().projects].sort((a, b) => (a.lastOpenedAt < b.lastOpenedAt ? 1 : -1));
      set({ projects });
      void dbSet(LIB_KEY, projects);
    }
    useEditorStore.getState().openProject(copy.data, id);
    set({ activeProjectId: id });
  },

  importProjectText: async (text, fallbackName) => {
    try {
      const data = parseProjectText(text);
      if (!data.project.name || data.project.name === 'Untitled Project') data.project.name = fallbackName;
      // Opening the same file twice must not create duplicate projects:
      // refresh the existing local copy instead.
      const existing = get().projects.find((p) => p.id === data.project.id);
      if (existing) {
        await dbSet(projectKey(existing.id), { data, savedAt: nowIso() } satisfies WorkingCopy);
        get().updateRecordMeta(existing.id, data);
        await get().openProject(existing.id);
        toast.info(tNow('msg.alreadyExists', { name: data.project.name }));
        return;
      }
      const record = recordFromProject(data, nowIso());
      const projects = [record, ...get().projects];
      set({ projects });
      void dbSet(LIB_KEY, projects);
      void dbSet(projectKey(record.id), { data, savedAt: nowIso() } satisfies WorkingCopy);
      useEditorStore.getState().openProject(data, record.id);
      set({ activeProjectId: record.id });
      toast.success(tNow('msg.opened', { name: data.project.name }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(tNow('msg.invalidProject', { reason: message }));
    }
  },

  closeProject: () => {
    useEditorStore.getState().closeProject();
    set({ activeProjectId: null });
  },

  renameProject: (id, name) => {
    const projects = get().projects.map((p) => (p.id === id ? { ...p, name } : p));
    set({ projects });
    void dbSet(LIB_KEY, projects);
    const editor = useEditorStore.getState();
    if (editor.projectId === id && editor.data) {
      editor.renameProject(name);
    }
  },

  removeProject: async (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    set({ projects });
    await dbSet(LIB_KEY, projects);
    await dbDelete(projectKey(id));
    if (get().activeProjectId === id) {
      get().closeProject();
    }
  },

  updateRecordMeta: (id, data) => {
    const projects = get().projects.map((p) =>
      p.id === id
        ? {
            ...p,
            name: data.project.name,
            color: data.project.color,
            boardCount: data.boards.length,
            objectCount: data.boards.reduce((acc, b) => acc + Object.keys(b.objects).length, 0),
          }
        : p,
    );
    set({ projects });
    void dbSet(LIB_KEY, projects);
  },

  persistWorkingCopy: async (projectId, data) => {
    const copy: WorkingCopy = { data, savedAt: nowIso() };
    await dbSet(projectKey(projectId), copy);
    get().updateRecordMeta(projectId, data);
    return true;
  },

  loadWorkingCopy: async (projectId) => {
    return await dbGet<WorkingCopy>(projectKey(projectId));
  },
}));

/** Sanitize a user-supplied name for use as a dashboard record. */
export function normalizeProjectName(name: string, fallback = 'Untitled Project'): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : fallback;
}

export { normalizeProject, projectColorFor, serializeProject };
