import { beforeEach, describe, expect, it } from 'vitest';
import { useLibraryStore } from '@/stores/libraryStore';
import { useEditorStore } from '@/stores/editorStore';
import { parseProjectText, serializeProject } from '@/lib/format';
import { __resetDbForTests } from '@/lib/db';
import { createProjectData } from '@/lib/format';

const library = () => useLibraryStore.getState();
const editor = () => useEditorStore.getState();

beforeEach(async () => {
  __resetDbForTests();
  useLibraryStore.setState({ projects: [], hydrated: false, activeProjectId: null });
  editor().closeProject();
});

describe('local persistence', () => {
  it('seeds a welcome project on first run', async () => {
    await library().hydrate();
    expect(library().hydrated).toBe(true);
    expect(library().projects.length).toBeGreaterThanOrEqual(1);
    expect(library().projects[0]!.name).toContain('Haolio');
  });

  it('creates a project, autosaves the working copy, and recovers it', async () => {
    await library().hydrate();
    const id = library().createProject('Recovery Test', 'blank')!;
    expect(editor().data?.project.name).toBe('Recovery Test');

    // Simulate work on the open project.
    const sticky = (await import('@/lib/format')).createSticky(5, 5, 1);
    sticky.data.text = 'precious work';
    editor().addObjects([sticky], [], 'Add sticky');

    // Autosave (debounced in the UI; the store API persists directly here).
    await library().persistWorkingCopy(id, editor().data!);

    // "Restart" the app: forget in-memory state, reload from the local db.
    editor().closeProject();
    useLibraryStore.setState({ projects: [], hydrated: false });
    await library().hydrate();
    await library().openProject(id);

    expect(editor().data?.project.name).toBe('Recovery Test');
    const texts = Object.values(editor().objects).map((o) => o.data.text);
    expect(texts).toContain('precious work');
  });

  it('opening a missing project fails gracefully', async () => {
    await library().hydrate();
    await library().openProject('does-not-exist');
    expect(editor().data).toBeNull();
    expect(library().activeProjectId).toBeNull();
  });

  it('updates recents order by last opened', async () => {
    await library().hydrate();
    const a = library().createProject('Project A', 'blank')!;
    const b = library().createProject('Project B', 'blank')!;
    // B was created last so it leads the list.
    expect(library().projects[0]!.id).toBe(b);
    await new Promise((r) => setTimeout(r, 5));
    await library().openProject(a);
    expect(library().projects[0]!.id).toBe(a);
    expect(library().projects.map((p) => p.id)).toContain(b);
  });

  it('round-trips a .haolio file through import', async () => {
    await library().hydrate();
    const project = createProjectData('From File');
    const text = serializeProject(project);
    // Imported projects get their own library record.
    await library().importProjectText(text, 'From File');
    expect(library().projects.some((p) => p.name === 'From File')).toBe(true);
    // Corrupt content is rejected with an error toast, not a crash.
    expect(() => parseProjectText('{{')).toThrow();
    await library().importProjectText('{{', 'Broken');
    expect(editor().data?.project.name).not.toBe('Broken');
  });

  it('importing the same file twice does not duplicate the project', async () => {
    await library().hydrate();
    const project = createProjectData('Same File');
    const text = serializeProject(project);
    await library().importProjectText(text, 'Same File');
    await library().importProjectText(text, 'Same File');
    const matches = library().projects.filter((p) => p.id === project.project.id);
    expect(matches).toHaveLength(1);
    expect(library().projects.filter((p) => p.name === 'Same File')).toHaveLength(1);
    // The existing copy is opened.
    expect(editor().data?.project.id).toBe(project.project.id);
  });

  it('removes a project and its local data', async () => {
    await library().hydrate();
    const id = library().createProject('Doomed', 'blank')!;
    await library().removeProject(id);
    expect(library().projects.some((p) => p.id === id)).toBe(false);
    const copy = await library().loadWorkingCopy(id);
    expect(copy).toBeUndefined();
    expect(editor().data).toBeNull();
  });
});
