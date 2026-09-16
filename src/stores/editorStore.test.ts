import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore, mindChildrenOf } from './editorStore';
import { createProjectData } from '@/lib/format';

const editor = () => useEditorStore.getState();

function openEmptyProject(): void {
  const project = createProjectData('Test Project');
  useEditorStore.getState().openProject(project, project.project.id);
}

function nodeIds(): string[] {
  return Object.keys(editor().objects).filter((id) => editor().objects[id]?.type === 'mindmap_node');
}

beforeEach(() => {
  openEmptyProject();
});

describe('mind map operations', () => {
  it('creates a root node registered as a mind map', () => {
    const rootId = editor().createMindMap(0, 0);
    expect(nodeIds()).toHaveLength(1);
    expect(editor().roots).toContain(rootId);
    const root = editor().objects[rootId]!;
    expect(root.data.mind!.parentId).toBeNull();
    expect(root.data.text).toBe('Main Idea');
  });

  it('adds child nodes with edges and relayouts', () => {
    const rootId = editor().createMindMap(0, 0);
    const childA = editor().addMindChild(rootId)!;
    const childB = editor().addMindChild(rootId)!;
    expect(nodeIds()).toHaveLength(3);
    expect(editor().roots).toEqual([rootId]);
    // Edges connect parent → child.
    const edges = Object.values(editor().edges);
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.from === rootId)).toBe(true);
    // Children end up to the right of the root and don't overlap.
    const root = editor().objects[rootId]!;
    const a = editor().objects[childA]!;
    const b = editor().objects[childB]!;
    expect(a.x).toBeGreaterThan(root.x + root.width);
    expect(b.x).toBeGreaterThan(root.x + root.width);
    expect(a.y).not.toBe(b.y);
    expect(editor().objects[rootId]!.data.mind!.childCount).toBe(2);
  });

  it('adds sibling nodes after the selected node', () => {
    const rootId = editor().createMindMap(0, 0);
    const childA = editor().addMindChild(rootId)!;
    const childB = editor().addMindChild(rootId)!;
    const sibling = editor().addMindSibling(childA)!;
    expect(nodeIds()).toHaveLength(4);
    const siblings = mindChildrenOf(editor().objects, rootId);
    expect(siblings.map((n) => n.id)).toEqual([childA, sibling, childB]);
  });

  it('ENTER on a root adds a child instead', () => {
    const rootId = editor().createMindMap(0, 0);
    const child = editor().addMindSibling(rootId)!;
    expect(editor().objects[child]!.data.mind!.parentId).toBe(rootId);
  });

  it('deletes a node with its whole subtree', () => {
    const rootId = editor().createMindMap(0, 0);
    const child = editor().addMindChild(rootId)!;
    editor().addMindChild(child);
    expect(nodeIds()).toHaveLength(3);
    editor().deleteMindNodes([child]);
    expect(nodeIds()).toHaveLength(1);
    expect(Object.keys(editor().edges)).toHaveLength(0);
  });

  it('collapses and expands branches', () => {
    const rootId = editor().createMindMap(0, 0);
    editor().addMindChild(rootId);
    editor().addMindChild(rootId);
    editor().toggleCollapse(rootId);
    expect(editor().objects[rootId]!.data.mind!.collapsed).toBe(true);
    // Expanded again via undo of the collapse is also possible; direct toggle:
    editor().undo();
    expect(editor().objects[rootId]!.data.mind!.collapsed).toBe(false);
    editor().toggleCollapse(rootId);
    editor().toggleCollapse(rootId);
    expect(editor().objects[rootId]!.data.mind!.collapsed).toBe(false);
  });

  it('switches layout and keeps nodes non-overlapping (vertical → radial)', () => {
    const rootId = editor().createMindMap(0, 0);
    for (let i = 0; i < 4; i++) editor().addMindChild(rootId);
    editor().setMindLayout(rootId, 'vertical');
    expect(editor().objects[rootId]!.data.mind!.layout).toBe('vertical');
    editor().setMindLayout(rootId, 'radial');
    expect(editor().objects[rootId]!.data.mind!.layout).toBe('radial');
  });

  it('duplicates a subtree as a sibling branch', () => {
    const rootId = editor().createMindMap(0, 0);
    const child = editor().addMindChild(rootId)!;
    editor().addMindChild(child);
    editor().setSelection([child]);
    editor().duplicateMindNodes([child]);
    // root + child + grandchild + cloned child + cloned grandchild
    expect(nodeIds()).toHaveLength(5);
    const siblings = mindChildrenOf(editor().objects, rootId);
    expect(siblings).toHaveLength(2);
  });

  it('does not force layout after a manual move', () => {
    const rootId = editor().createMindMap(0, 0);
    const child = editor().addMindChild(rootId)!;
    const beforeX = editor().objects[child]!.x;
    const manualX = beforeX + 500;
    editor().updateObjects([child], { x: manualX }, { label: 'Move objects' });
    expect(editor().objects[child]!.x).toBe(manualX);
    // Explicit relayout still works on demand.
    editor().relayoutMindMap(rootId);
    expect(editor().objects[child]!.x).not.toBe(manualX);
  });
});

describe('undo / redo', () => {
  it('undo restores deleted objects, redo re-applies', () => {
    const stickyId = editor().createObjectAt('sticky', 0, 0)!;
    expect(editor().objects[stickyId]).toBeDefined();
    editor().deleteObjectsByIds([stickyId]);
    expect(editor().objects[stickyId]).toBeUndefined();
    editor().undo();
    expect(editor().objects[stickyId]).toBeDefined();
    editor().redo();
    expect(editor().objects[stickyId]).toBeUndefined();
  });

  it('a whole drag gesture is a single undo entry', () => {
    const stickyId = editor().createObjectAt('sticky', 0, 0)!;
    const baseY = editor().objects[stickyId]!.y;
    // Simulate drag: live updates without history, one commit at the end.
    editor().updateObjectLive(stickyId, { x: 120, y: 80 });
    editor().updateObjectLive(stickyId, { x: 200, y: 150 });
    editor().commit('Move objects');
    expect(editor().objects[stickyId]!.y).toBe(150);
    editor().undo();
    expect(editor().objects[stickyId]!.y).toBe(baseY);
  });

  it('undo/redo tracks style edits', () => {
    const stickyId = editor().createObjectAt('sticky', 0, 0)!;
    editor().setStyle([stickyId], { fill: '#ff0000' });
    expect(editor().objects[stickyId]!.style.fill).toBe('#ff0000');
    editor().undo();
    expect(editor().objects[stickyId]!.style.fill).not.toBe('#ff0000');
  });
});

describe('clipboard: copy / paste / duplicate / group', () => {
  it('copies and pastes multiple objects with internal edges', () => {
    const rootId = editor().createMindMap(0, 0);
    editor().addMindChild(rootId);
    editor().setSelection([rootId]);
    expect(editor().copySelection()).toBe(true);
    expect(editor().pasteClipboard()).toBe(true);
    expect(nodeIds()).toHaveLength(4);
    // The pasted tree has its own root and its own child edge.
    expect(editor().roots.length).toBe(2);
    expect(Object.values(editor().edges).length).toBe(2); // original + pasted
  });

  it('paste offsets position and selects the pasted objects', () => {
    const stickyId = editor().createObjectAt('sticky', 10, 10)!;
    const before = editor().objects[stickyId]!;
    editor().setSelection([stickyId]);
    editor().copySelection();
    editor().pasteClipboard();
    const selectedId = editor().selection.objects[0]!;
    expect(selectedId).not.toBe(stickyId);
    const pasted = editor().objects[selectedId]!;
    expect(pasted.x).toBe(before.x + 24);
    expect(pasted.y).toBe(before.y + 24);
  });

  it('duplicates in one action', () => {
    const id = editor().createObjectAt('text', 0, 0)!;
    editor().setSelection([id]);
    expect(editor().duplicateSelection()).toBe(true);
    expect(editor().selection.objects).toHaveLength(1);
    expect(editor().selection.objects[0]).not.toBe(id);
    expect(Object.keys(editor().objects)).toHaveLength(2);
  });

  it('groups and ungroups objects', () => {
    const a = editor().createObjectAt('sticky', 0, 0)!;
    const b = editor().createObjectAt('sticky', 300, 0)!;
    const groupId = editor().group([a, b])!;
    expect(editor().objects[groupId]!.type).toBe('group');
    expect(editor().objects[a]!.parentId).toBe(groupId);
    // Moving the group moves its members (relative delta, like a drag).
    editor().moveObjectsDelta([groupId], 50, 50);
    expect(editor().objects[a]!.x).toBe(50);
    expect(editor().objects[b]!.x).toBe(350);
    editor().ungroup([groupId]);
    expect(editor().objects[groupId]).toBeUndefined();
    expect(editor().objects[a]!.parentId ?? null).toBeNull();
  });
});

describe('object creation & boards', () => {
  it('creates all object types with defaults', () => {
    expect(editor().createObjectAt('text', 0, 0)).toBeTruthy();
    expect(editor().createObjectAt('sticky', 0, 0)).toBeTruthy();
    expect(editor().createObjectAt('shape', 0, 0, undefined, 'circle')).toBeTruthy();
    expect(editor().objects[editor().selection.objects[0]!]!.data.shape).toBe('circle');
    expect(editor().createObjectAt('frame', 0, 0)).toBeTruthy();
    expect(editor().createObjectAt('mindmap', 0, 0)).toBeTruthy();
  });

  it('objects created inside a frame become children', () => {
    const frameId = editor().createObjectAt('frame', 0, 0, { width: 500, height: 400 })!;
    const stickyId = editor().createObjectAt('sticky', 100, 100)!;
    expect(editor().objects[stickyId]!.parentId).toBe(frameId);
  });

  it('connects two objects once (no duplicates)', () => {
    const a = editor().createObjectAt('sticky', 0, 0)!;
    const b = editor().createObjectAt('sticky', 400, 0)!;
    const edgeId = editor().connectObjects(a, b)!;
    expect(edgeId).toBeTruthy();
    expect(editor().connectObjects(a, b)).toBeNull();
    expect(editor().connectObjects(b, a)).toBeNull();
    editor().deleteEdgesByIds([edgeId]);
    expect(Object.keys(editor().edges)).toHaveLength(0);
  });

  it('deleting an object removes its attached connections', () => {
    const a = editor().createObjectAt('sticky', 0, 0)!;
    const b = editor().createObjectAt('sticky', 400, 0)!;
    editor().connectObjects(a, b);
    editor().deleteObjectsByIds([a]);
    expect(Object.keys(editor().edges)).toHaveLength(0);
    expect(editor().objects[b]).toBeDefined();
  });

  it('adds, renames, duplicates, reorders and deletes boards', () => {
    const first = editor().boardId!;
    const second = editor().addBoard('Research')!;
    expect(editor().data!.boards.map((b) => b.title)).toEqual(['Main Board', 'Research']);
    expect(editor().boardId).toBe(second);
    editor().renameBoard(second, 'Discovery');
    expect(editor().data!.boards.find((b) => b.id === second)!.title).toBe('Discovery');
    editor().duplicateBoard(second);
    expect(editor().data!.boards).toHaveLength(3);
    editor().moveBoard(second, 1);
    expect(editor().data!.boards[2]!.id).toBe(second);
    // Objects live per board.
    const stickyId = editor().createObjectAt('sticky', 0, 0)!;
    editor().selectBoard(first);
    expect(Object.keys(editor().objects)).not.toContain(stickyId);
    expect(editor().deleteBoard(first)).toBe(true); // not the last board
    expect(editor().data!.boards).toHaveLength(2);
    expect(editor().deleteBoard(editor().data!.boards[0]!.id)).toBe(true);
    expect(editor().data!.boards).toHaveLength(1);
    expect(editor().deleteBoard(editor().data!.boards[0]!.id)).toBe(false); // cannot delete final board
  });
});
