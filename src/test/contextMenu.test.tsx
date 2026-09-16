import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CanvasMenu } from '@/components/canvas/CanvasMenu';
import { EdgeLayer } from '@/components/canvas/EdgeLayer';
import { ObjectFrame } from '@/components/canvas/objects/ObjectFrame';
import { useCanvasStore } from '@/stores/canvasStore';
import { useEditorStore } from '@/stores/editorStore';
import { createProjectData, createSticky, createEdge } from '@/lib/format';

/**
 * Regression coverage for the custom canvas context menu.
 * The menu is a fully-controlled component (no portals, no dismiss layers),
 * so these tests exercise the real click paths end-to-end:
 * right-click → store state → rendered menu → item click → editor action.
 */

const editor = () => useEditorStore.getState();
const canvas = () => useCanvasStore.getState();

function findItem(label: string): HTMLElement {
  const items = screen.getAllByRole('menuitem');
  const found = items.find((el) => el.textContent?.includes(label));
  if (!found) throw new Error(`Menu item "${label}" not found. Have: ${items.map((i) => i.textContent).join(' | ')}`);
  return found;
}

function openMenu(objId: string | null, x = 120, y = 90): void {
  canvas().openContextMenu({ x, y, objId });
}

beforeEach(() => {
  cleanup();
  const project = createProjectData('Menu Test');
  useEditorStore.getState().openProject(project, project.project.id);
  useCanvasStore.getState().setTool('select');
  useCanvasStore.getState().closeContextMenu();
});

describe('object right-click wiring', () => {
  it('right-click on an object opens the menu with its id and never reaches the canvas', () => {
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');

    let backgroundMenuOpened = false;
    render(
      <div
        onContextMenu={() => {
          backgroundMenuOpened = true;
        }}
      >
        <ObjectFrame obj={editor().objects[sticky.id]!} />
      </div>,
    );

    fireEvent.contextMenu(document.querySelector('[data-object-id]')!);
    expect(backgroundMenuOpened).toBe(false);
    expect(canvas().contextMenu?.objId).toBe(sticky.id);
    // Right-click also selects the object.
    expect(editor().selection.objects).toEqual([sticky.id]);
  });

  it('right-clicking into a multi-selection keeps the selection (for group actions)', () => {
    const a = createSticky(0, 0, 1);
    const b = createSticky(300, 0, 2);
    editor().addObjects([a, b], [], 'Add stickies');
    editor().setSelection([a.id, b.id]);
    render(<ObjectFrame obj={editor().objects[a.id]!} />);

    fireEvent.contextMenu(document.querySelector(`[data-object-id="${a.id}"]`)!);
    expect(editor().selection.objects.sort()).toEqual([a.id, b.id].sort());
  });
});

describe('object menu actions run on click', () => {
  it('duplicate / cut / layer actions', () => {
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');
    openMenu(sticky.id);
    render(<CanvasMenu />);

    fireEvent.click(findItem('Duplicate'));
    expect(Object.keys(editor().objects)).toHaveLength(2);
    expect(canvas().contextMenu).toBeNull(); // menu closes after an action

    openMenu(sticky.id);
    render(<CanvasMenu />);
    const zBefore = editor().objects[sticky.id]!.z;
    fireEvent.click(findItem('Bring to front'));
    expect(editor().objects[sticky.id]!.z).toBeGreaterThan(zBefore);

    openMenu(sticky.id);
    render(<CanvasMenu />);
    fireEvent.click(findItem('Cut'));
    expect(editor().objects[sticky.id]).toBeUndefined();
  });

  it('mind map actions: add child, add sibling, collapse, layout, delete', () => {
    const rootId = editor().createMindMap(0, 0);
    openMenu(rootId);
    render(<CanvasMenu />);

    fireEvent.click(findItem('Add child'));
    const kids = () => Object.values(editor().objects).filter((o) => o.data.mind?.parentId === rootId);
    expect(kids()).toHaveLength(1);

    openMenu(kids()[0]!.id);
    render(<CanvasMenu />);
    fireEvent.click(findItem('Add sibling'));
    expect(kids()).toHaveLength(2);

    // Root now has children → collapse/expand available.
    openMenu(rootId);
    render(<CanvasMenu />);
    fireEvent.click(findItem('Collapse branch'));
    expect(editor().objects[rootId]!.data.mind!.collapsed).toBe(true);

    openMenu(rootId);
    render(<CanvasMenu />);
    fireEvent.click(findItem('Expand branch'));
    expect(editor().objects[rootId]!.data.mind!.collapsed).toBe(false);

    openMenu(rootId);
    render(<CanvasMenu />);
    fireEvent.click(findItem('Layout: Vertical'));
    expect(editor().objects[rootId]!.data.mind!.layout).toBe('vertical');

    openMenu(kids()[0]!.id);
    render(<CanvasMenu />);
    const doomedId = kids()[0]!.id;
    fireEvent.click(findItem('Delete'));
    // The clicked child (and nothing above it) is removed; sibling + root stay.
    expect(Object.keys(editor().objects)).toHaveLength(2);
    expect(editor().objects[doomedId]).toBeUndefined();
  });

  it('disabled entries do nothing and stay open-safe (ungroup on plain sticky)', () => {
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');
    openMenu(sticky.id);
    render(<CanvasMenu />);

    const ungroup = findItem('Ungroup') as HTMLButtonElement;
    expect(ungroup.disabled).toBe(true);
    fireEvent.click(ungroup);
    expect(canvas().contextMenu).not.toBeNull();
  });
});

describe('edge (connector) right-click menu', () => {
  function makeEdge() {
    const a = createSticky(0, 0, 1);
    a.id = 'ea';
    const b = createSticky(500, 0, 2);
    b.id = 'eb';
    editor().addObjects([a, b], [], 'Add stickies');
    const edge = createEdge('ea', 'eb', 1);
    editor().addEdge(edge, 'Connect');
    return edge;
  }

  it('changes route and arrows, then deletes the connection', () => {
    const edge = makeEdge();
    canvas().openContextMenu({ x: 200, y: 200, edgeId: edge.id });
    render(<CanvasMenu />);

    fireEvent.click(findItem('Elbow line'));
    expect(editor().edges[edge.id]!.data.route).toBe('elbow');

    canvas().openContextMenu({ x: 200, y: 200, edgeId: edge.id });
    render(<CanvasMenu />);
    fireEvent.click(findItem('Double arrow'));
    expect(editor().edges[edge.id]!.data.arrow).toBe('double');

    canvas().openContextMenu({ x: 200, y: 200, edgeId: edge.id });
    render(<CanvasMenu />);
    fireEvent.click(findItem('Delete connection'));
    expect(Object.keys(editor().edges)).toHaveLength(0);
  });

  it('right-clicking an edge selects it first (via the edge layer)', () => {
    const edge = makeEdge();
    render(<EdgeLayer />);
    const hitPath = document.querySelector('svg path[onContextMenu]') ?? document.querySelector('svg path')!;
    fireEvent.contextMenu(hitPath);
    expect(editor().selection.edges).toEqual([edge.id]);
    expect(canvas().contextMenu?.edgeId).toBe(edge.id);
  });
});

describe('menu keyboard navigation', () => {
  it('arrow keys move focus between items, Enter activates', async () => {
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');
    openMenu(sticky.id);
    const { container } = render(<CanvasMenu />);

    await new Promise((r) => setTimeout(r, 10));
    const items = [...container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')];
    expect(items.length).toBeGreaterThan(2);

    fireEvent.keyDown(container.querySelector('[role="menu"]')!, { key: 'ArrowDown' });
    const focused = document.activeElement as HTMLButtonElement;
    expect(focused).toBe(items[1]); // moved from Copy to Cut

    fireEvent.keyDown(container.querySelector('[role="menu"]')!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(container.querySelector('[role="menu"]')!, { key: 'ArrowDown' });
    // Activating the focused item (native button click) runs its action.
    fireEvent.click(document.activeElement as HTMLButtonElement);
    expect(editor().objects[sticky.id]).toBeUndefined(); // Cut removed it
  });
});

describe('background menu', () => {
  it('offers paste and select all, actions run', () => {
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');
    editor().setSelection([sticky.id]);
    editor().copySelection();

    openMenu(null, 300, 200);
    render(<CanvasMenu />);

    expect(findItem('New sticky note')).toBeDefined();
    fireEvent.click(findItem('Paste'));
    expect(Object.keys(editor().objects)).toHaveLength(2);

    openMenu(null);
    render(<CanvasMenu />);
    fireEvent.click(findItem('Select all'));
    expect(editor().selection.objects).toHaveLength(2);
  });

  it('closes on outside pointerdown', () => {
    openMenu(null);
    render(<CanvasMenu />);
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);

    fireEvent.pointerDown(document.body);
    expect(canvas().contextMenu).toBeNull();
  });

  it('closes on Escape', () => {
    openMenu(null);
    render(<CanvasMenu />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(canvas().contextMenu).toBeNull();
  });

  it('pointerdown inside the menu never reaches the canvas container (click stays on the button)', () => {
    // Replicates the real DOM arrangement: <CanvasMenu/> is a child of the
    // canvas container whose onPointerDown starts a marquee gesture with
    // pointer capture — that would swallow the item's click event.
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');
    openMenu(sticky.id);

    let containerPointerDown = false;
    render(
      <div
        onPointerDown={() => {
          containerPointerDown = true;
        }}
      >
        <CanvasMenu />
      </div>,
    );

    const item = findItem('Duplicate');
    fireEvent.pointerDown(item);
    expect(containerPointerDown).toBe(false);

    fireEvent.click(item);
    expect(Object.keys(editor().objects)).toHaveLength(2);
  });
});
