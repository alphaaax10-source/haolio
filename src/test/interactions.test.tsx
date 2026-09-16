import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ObjectFrame } from '@/components/canvas/objects/ObjectFrame';
import { MakeMenu } from '@/components/canvas/MakeMenu';
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

describe('connector released over empty canvas', () => {
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

  it('dragging straight onto a target connects immediately (no menu)', () => {
    setup();
    fireEvent.pointerDown(document.querySelector('[data-object-id="ca"]')!, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerUp(window, { clientX: 700, clientY: 100 }); // inside cb
    expect(Object.keys(editor().edges)).toHaveLength(1);
    expect(canvas().connecting).toBeNull();
    expect(canvas().makeMenu).toBeNull();
  });

  it('release over empty canvas opens the Make menu with the drop point', () => {
    setup();
    fireEvent.pointerDown(document.querySelector('[data-object-id="ca"]')!, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerUp(window, { clientX: 460, clientY: 220 });
    const menu = canvas().makeMenu;
    expect(menu).not.toBeNull();
    expect(menu!.fromId).toBe('ca');
    expect(menu!.x).toBe(460);
    expect(menu!.y).toBe(220);
    // Connection is not created until the user picks something.
    expect(Object.keys(editor().edges)).toHaveLength(0);
    expect(canvas().connecting).toBeNull();
  });

  it('picking "Sticky note" in the menu creates a connected sticky at the drop point', () => {
    setup();
    fireEvent.pointerDown(document.querySelector('[data-object-id="ca"]')!, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerUp(window, { clientX: 500, clientY: 300 });
    render(<MakeMenu />);
    const items = [...document.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[];
    expect(items.length).toBeGreaterThan(0);
    fireEvent.click(items.find((b) => b.textContent?.includes('Sticky note'))!);

    const objects = Object.values(editor().objects);
    const created = objects.find((o) => o.id !== 'ca' && o.id !== 'cb');
    expect(created?.type).toBe('sticky_note');
    // Centered on the released cursor (client 500,300 at zoom 1, viewport 0,0).
    expect(Math.round(created!.x + created!.width / 2)).toBe(500);
    expect(Math.round(created!.y + created!.height / 2)).toBe(300);
    // Auto-connected back to the drag source.
    const edge = Object.values(editor().edges)[0]!;
    expect([edge.from, edge.to]).toEqual(['ca', created!.id]);
    expect(canvas().makeMenu).toBeNull();
  });

  it('mind sources offer "Add child" which grows the tree', () => {
    setup();
    // Replace sticky A with a mind node.
    editor().deleteObjectsByIds(['ca', 'cb']);
    const rootId = editor().createObjectAt('mindmap', 0, 0)!;
    expect(rootId).not.toBeNull();
    canvas().setTool('connector');
    render(
      <div>
        <ObjectFrame obj={editor().objects[rootId]!} />
      </div>,
    );
    fireEvent.pointerDown(document.querySelector(`[data-object-id="${rootId}"]`)!, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerUp(window, { clientX: 450, clientY: 300 });
    render(<MakeMenu />);
    const items = [...document.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[];
    fireEvent.click(items.find((b) => b.textContent?.includes('Add child'))!);
    // addMindChild creates a connected child and selects it.
    const child = Object.values(editor().objects).find((o) => o.data.mind?.parentId === rootId);
    expect(child).toBeDefined();
    expect(Object.values(editor().edges).some((e) => e.from === rootId && e.to === child!.id)).toBe(true);
  });

  it('Escape closes the Make menu without creating anything', () => {
    setup();
    fireEvent.pointerDown(document.querySelector('[data-object-id="ca"]')!, {
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerUp(window, { clientX: 460, clientY: 220 });
    expect(canvas().makeMenu).not.toBeNull();
    render(<MakeMenu />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(canvas().makeMenu).toBeNull();
    expect(Object.keys(editor().objects)).toHaveLength(2);
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

    canvas().openMakeMenu({ x: 10, y: 10, world: { x: 10, y: 10 }, fromId: 'ca' });
    fireEvent.keyDown(window, { key: 'h' });
    expect(canvas().tool).toBe('select');
    canvas().closeMakeMenu();

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
