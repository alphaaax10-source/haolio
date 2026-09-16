import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ObjectFrame } from '@/components/canvas/objects/ObjectFrame';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { useShortcuts } from '@/hooks/useShortcuts';
import { createProjectData, createSticky } from '@/lib/format';

const editor = () => useEditorStore.getState();
const canvas = () => useCanvasStore.getState();

beforeEach(() => {
  cleanup();
  const project = createProjectData('Interaction Test');
  useEditorStore.getState().openProject(project, project.project.id);
});

describe('connector click-to-click', () => {
  function setup(): void {
    canvas().setTool('connector');
    const a = createSticky(0, 0, 1);
    a.id = 'ca';
    const b = createSticky(600, 0, 2);
    b.id = 'cb';
    editor().addObjects([a, b], [], 'Add stickies');
    render(
      <div>
        <ObjectFrame obj={editor().objects['ca']!} />
        <ObjectFrame obj={editor().objects['cb']!} />
      </div>,
    );
  }

  it('drag to empty canvas arms the connection; clicking the target completes it', () => {
    setup();
    fireEvent.pointerDown(document.querySelector('[data-object-id="ca"]')!, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    // Released over empty canvas → connection stays armed for click-click.
    fireEvent.pointerUp(window, { clientX: 400, clientY: 100 });
    expect(canvas().connecting?.fromId).toBe('ca');
    expect(Object.keys(editor().edges)).toHaveLength(0);

    fireEvent.pointerDown(document.querySelector('[data-object-id="cb"]')!, { button: 0 });
    expect(Object.keys(editor().edges)).toHaveLength(1);
    const edge = Object.values(editor().edges)[0]!;
    expect([edge.from, edge.to].sort()).toEqual(['ca', 'cb']);
    expect(canvas().connecting).toBeNull();
  });

  it('dragging straight onto a target connects immediately (no arming)', () => {
    setup();
    fireEvent.pointerDown(document.querySelector('[data-object-id="ca"]')!, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerUp(window, { clientX: 700, clientY: 100 }); // inside cb
    expect(Object.keys(editor().edges)).toHaveLength(1);
    expect(canvas().connecting).toBeNull();
  });
});

describe('shortcuts are suppressed while overlays are open', () => {
  function Harness(): null {
    useShortcuts(true);
    return null;
  }

  it('tool keys do nothing while settings/search/dialog is open, work after close', () => {
    render(<Harness />);
    canvas().setTool('select');

    canvas().setSettingsOpen(true);
    fireEvent.keyDown(window, { key: 'h' });
    expect(canvas().tool).toBe('select');
    canvas().setSettingsOpen(false);

    canvas().setSearchOpen(true);
    fireEvent.keyDown(window, { key: 'h' });
    expect(canvas().tool).toBe('select');
    canvas().setSearchOpen(false);

    fireEvent.keyDown(window, { key: 'h' });
    expect(canvas().tool).toBe('hand');
  });

  it('undo is blocked while a dialog element exists', () => {
    render(<Harness />);
    const stickyId = editor().createObjectAt('sticky', 0, 0)!;
    editor().deleteObjectsByIds([stickyId]);
    expect(editor().history.undo.length).toBeGreaterThan(0);

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(editor().objects[stickyId]).toBeUndefined(); // undo did not run

    dialog.remove();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(editor().objects[stickyId]).toBeDefined(); // undo ran
  });
});
