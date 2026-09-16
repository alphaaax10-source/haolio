import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ObjectFrame } from '@/components/canvas/objects/ObjectFrame';
import { useEditorStore } from '@/stores/editorStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { createProjectData, createSticky } from '@/lib/format';

/**
 * Regression coverage for the object context menu.
 *
 * Radix menu portals cannot run under this jsdom environment (the scroll-lock
 * blocks the event loop), so the Radix primitives are replaced with inert
 * pass-through components. This still exercises everything Haolio owns:
 * - the action wiring behind every menu entry ("clicking does nothing" bug)
 * - the stopPropagation guard that keeps the canvas menu from covering the
 *   object menu on right-click (the root cause of the bug).
 */

vi.mock('@/components/ui/context-menu', async () => {
  const React = await import('react');
  type Props = { children?: React.ReactNode; onClick?: (e: unknown) => void; disabled?: boolean; className?: string };
  const passthrough = (testId: string) =>
    function Mocked({ children, onClick, disabled }: Props) {
      return (
        <div data-testid={testId} role="menuitem" aria-disabled={disabled} onClick={disabled ? undefined : onClick}>
          {children}
        </div>
      );
    };
  return {
    ContextMenu: ({ children }: Props) => <>{children}</>,
    ContextMenuTrigger: ({ children }: Props) => <>{children}</>,
    ContextMenuContent: ({ children }: Props) => <div role="menu">{children}</div>,
    ContextMenuItem: passthrough('menu-item'),
    ContextMenuSeparator: () => <hr />,
    ContextMenuSub: ({ children }: Props) => <>{children}</>,
    ContextMenuSubTrigger: passthrough('menu-sub-trigger'),
    ContextMenuSubContent: ({ children }: Props) => <div>{children}</div>,
    ContextMenuGroup: ({ children }: Props) => <>{children}</>,
    ContextMenuPortal: ({ children }: Props) => <>{children}</>,
    ContextMenuCheckboxItem: passthrough('menu-checkbox-item'),
    ContextMenuRadioItem: passthrough('menu-radio-item'),
    ContextMenuRadioGroup: ({ children }: Props) => <>{children}</>,
    ContextMenuLabel: ({ children }: Props) => <div>{children}</div>,
    ContextMenuShortcut: ({ children }: Props) => <span>{children}</span>,
  };
});

const editor = () => useEditorStore.getState();

function findItem(label: string): HTMLElement {
  const items = screen.getAllByTestId('menu-item');
  const found = items.find((el) => el.textContent?.includes(label));
  if (!found) throw new Error(`Menu item "${label}" not found. Have: ${items.map((i) => i.textContent).join(' | ')}`);
  return found;
}

beforeEach(() => {
  cleanup();
  const project = createProjectData('Menu Test');
  useEditorStore.getState().openProject(project, project.project.id);
  useCanvasStore.getState().setTool('select');
});

describe('object context menu', () => {
  it('right-click on an object never reaches the canvas menu trigger', () => {
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');

    let canvasMenuFired = false;
    render(
      <div
        onContextMenu={() => {
          canvasMenuFired = true;
        }}
      >
        <ObjectFrame obj={editor().objects[sticky.id]!} />
      </div>,
    );

    fireEvent.contextMenu(document.querySelector('[data-object-id]')!);
    expect(canvasMenuFired).toBe(false);
  });

  it('every menu action is wired: duplicate, copy, layer, delete', () => {
    const sticky = createSticky(0, 0, 1);
    editor().addObjects([sticky], [], 'Add sticky');
    render(<ObjectFrame obj={editor().objects[sticky.id]!} />);

    fireEvent.click(findItem('Duplicate'));
    expect(Object.keys(editor().objects)).toHaveLength(2);
    expect(editor().selection.objects).toHaveLength(1);
    expect(editor().selection.objects[0]).not.toBe(sticky.id);

    fireEvent.click(findItem('Copy'));
    fireEvent.click(findItem('Cut'));
    expect(editor().objects[sticky.id]).toBeUndefined();

    // Drop the deleted object's stale menu before wiring the next one.
    cleanup();
    const second = createSticky(300, 0, 2);
    editor().addObjects([second], [], 'Add sticky');
    const zBefore = editor().objects[second.id]!.z;
    render(<ObjectFrame obj={editor().objects[second.id]!} />);
    fireEvent.click(findItem('Bring to front'));
    expect(editor().objects[second.id]!.z).toBeGreaterThan(zBefore);
    fireEvent.click(findItem('Send to back'));
    expect(editor().objects[second.id]!.z).toBeLessThan(0);
  });

  it('mind map menu actions: add child, add sibling, collapse, layout', () => {
    const rootId = editor().createMindMap(0, 0);
    render(<ObjectFrame obj={editor().objects[rootId]!} />);

    fireEvent.click(findItem('Add child'));
    const kids = Object.values(editor().objects).filter((o) => o.data.mind?.parentId === rootId);
    expect(kids).toHaveLength(1);

    cleanup();
    const child = kids[0]!;
    render(<ObjectFrame obj={editor().objects[child.id]!} />);
    fireEvent.click(findItem('Add sibling'));
    expect(Object.values(editor().objects).filter((o) => o.data.mind?.parentId === rootId)).toHaveLength(2);

    // The root now has children, so its fresh menu offers Collapse/Expand.
    cleanup();
    render(<ObjectFrame obj={editor().objects[rootId]!} />);
    fireEvent.click(findItem('Collapse branch'));
    expect(editor().objects[rootId]!.data.mind!.collapsed).toBe(true);

    // Fresh render so the menu reflects the toggled state (real Radix would
    // re-render via props; the mock keeps the initial props).
    cleanup();
    render(<ObjectFrame obj={editor().objects[rootId]!} />);
    fireEvent.click(findItem('Expand branch'));
    expect(editor().objects[rootId]!.data.mind!.collapsed).toBe(false);

    fireEvent.click(findItem('Vertical'));
    expect(editor().objects[rootId]!.data.mind!.layout).toBe('vertical');
    fireEvent.click(findItem('Radial'));
    expect(editor().objects[rootId]!.data.mind!.layout).toBe('radial');
  });

  it('delete entry removes a mind node with its subtree', () => {
    const rootId = editor().createMindMap(0, 0);
    editor().addMindChild(rootId);
    render(<ObjectFrame obj={editor().objects[rootId]!} />);

    fireEvent.click(findItem('Delete'));
    expect(Object.keys(editor().objects)).toHaveLength(0);
  });
});
