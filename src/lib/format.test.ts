import { describe, expect, it } from 'vitest';
import {
  createBoard,
  createMindNode,
  createProjectData,
  createShape,
  createSticky,
  FORMAT_VERSION,
  normalizeProject,
  parseProjectText,
  serializeProject,
} from './format';

describe('project format', () => {
  it('creates a valid v1 project with one board', () => {
    const project = createProjectData('My Project');
    expect(project.format).toBe('haolio');
    expect(project.version).toBe(FORMAT_VERSION);
    expect(project.project.name).toBe('My Project');
    expect(project.boards).toHaveLength(1);
    expect(project.boards[0]!.objects).toEqual({});
  });

  it('round-trips serialize → parse without loss', () => {
    const project = createProjectData('Round Trip');
    const board = project.boards[0]!;
    const sticky = createSticky(10, 20, 1);
    sticky.data.text = 'hello\nworld';
    board.objects[sticky.id] = sticky;
    const shape = createShape('diamond', 0, 0, 100, 100, 2);
    board.objects[shape.id] = shape;

    const parsed = parseProjectText(serializeProject(project));
    expect(parsed.project.name).toBe('Round Trip');
    expect(Object.keys(parsed.boards[0]!.objects)).toHaveLength(2);
    expect(parsed.boards[0]!.objects[sticky.id]!.data.text).toBe('hello\nworld');
    expect(parsed.boards[0]!.objects[shape.id]!.data.shape).toBe('diamond');
    expect(parsed).toEqual(project);
  });

  it('rejects files that are not Haolio projects', () => {
    expect(() => parseProjectText('{"format": "other"}')).toThrow(/corrupted|not created/i);
    expect(() => parseProjectText('not json at all')).toThrow();
    expect(() => parseProjectText('{}')).toThrow();
  });

  it('rejects projects from newer format versions', () => {
    const future = JSON.stringify({ format: 'haolio', version: FORMAT_VERSION + 5, boards: [] });
    expect(() => parseProjectText(future)).toThrow(/newer version/i);
  });

  it('normalizes missing fields and drops invalid objects/edges', () => {
    const raw = {
      format: 'haolio',
      version: 1,
      project: { name: 'Repaired' },
      boards: [
        {
          title: 'B',
          objects: {
            a: { id: 'a', type: 'sticky_note', x: 1, y: 2, width: 0, height: 50, data: { text: 'x' }, style: {} },
            bad: { id: 'bad', type: 'laser_beam', x: 0, y: 0, width: 10, height: 10 },
            m: {
              id: 'm',
              type: 'mindmap_node',
              x: 0,
              y: 0,
              width: 100,
              height: 40,
              data: {},
              style: {},
            },
          },
          edges: {
            e1: { id: 'e1', from: 'a', to: 'ghost' },
            e2: { id: 'e2', from: 'a', to: 'm' },
          },
        },
      ],
    };
    const project = normalizeProject(raw);
    const board = project.boards[0]!;
    expect(board.objects['a']!.width).toBe(1); // clamped to >= 1
    expect(board.objects['bad']).toBeUndefined();
    expect(board.edges['e1']).toBeUndefined(); // dangling edge removed
    expect(board.edges['e2']).toBeDefined();
    // Orphan mind node recovered as a root with default mind data.
    expect(board.roots).toContain('m');
    expect(board.objects['m']!.data.mind!.layout).toBe('horizontal');
    expect(project.settings.grid.size).toBeGreaterThan(0);
  });

  it('creates a replacement board when a project has none', () => {
    const project = normalizeProject({ format: 'haolio', version: 1, boards: [] });
    expect(project.boards).toHaveLength(1);
  });

  it('mind node factory carries tree metadata', () => {
    const node = createMindNode({ x: 5, y: 6, z: 1, text: 'Idea', parentId: 'root1', rootId: 'root1', order: 2 });
    expect(node.type).toBe('mindmap_node');
    expect(node.data.mind).toMatchObject({ parentId: 'root1', rootId: 'root1', order: 2, collapsed: false });
    const board = createBoard();
    expect(board.roots).toEqual([]);
  });
});
