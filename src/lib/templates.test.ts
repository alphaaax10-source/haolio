import { describe, expect, it } from 'vitest';
import {
  createBrainstormProject,
  createFlowchartProject,
  createKanbanProject,
  createMeetingProject,
  createMindMapStarterProject,
  createProjectFromTemplate,
  createSwotProject,
  createWelcomeProject,
  type ProjectTemplate,
} from './templates';

function expectValid(project: ReturnType<typeof createProjectFromTemplate>, minObjects: number, minEdges = 0): void {
  expect(project.boards.length).toBeGreaterThan(0);
  const objects = project.boards.flatMap((b) => Object.values(b.objects));
  expect(objects.length).toBeGreaterThanOrEqual(minObjects);
  const ids = objects.map((o) => o.id);
  expect(new Set(ids).size).toBe(ids.length); // unique ids across the project
  const edges = project.boards.flatMap((b) => Object.values(b.edges));
  expect(edges.length).toBeGreaterThanOrEqual(minEdges);
  // Every edge endpoint must exist.
  for (const edge of edges) {
    const board = project.boards.find((b) => edge.id in b.edges)!;
    expect(board.objects[edge.from]).toBeDefined();
    expect(board.objects[edge.to]).toBeDefined();
  }
  // Every frame child points at an existing parent.
  for (const obj of objects) {
    if (obj.parentId) {
      expect(objects.find((o) => o.id === obj.parentId)?.type).toBe('frame');
    }
  }
}

describe('project templates', () => {
  it('all templates produce valid, repairable projects', () => {
    const cases: [ProjectTemplate, number, number][] = [
      ['welcome', 8, 5],
      ['mindmap', 4, 3],
      ['brainstorm', 7, 6],
      ['flowchart', 7, 6],
      ['kanban', 9, 0],
      ['swot', 9, 0],
      ['meeting', 8, 3],
      ['blank', 0, 0],
    ];
    for (const [template, minObjects, minEdges] of cases) {
      expectValid(createProjectFromTemplate('Test', template), minObjects, minEdges);
    }
  });

  it('brainstorm builds a radial map with six prompt branches', () => {
    const project = createBrainstormProject('B');
    const board = project.boards[0]!;
    const nodes = Object.values(board.objects);
    const root = nodes.find((o) => o.data.mind && !o.data.mind.parentId)!;
    const children = nodes.filter((o) => o.data.mind?.parentId === root.id);
    expect(children).toHaveLength(6);
    expect(root.data.mind!.layout).toBe('radial');
    expect(Object.values(board.edges)).toHaveLength(6);
  });

  it('flowchart wires every shape with arrows, including the loop back', () => {
    const project = createFlowchartProject('F');
    const board = project.boards[0]!;
    const shapes = Object.values(board.objects).filter((o) => o.type === 'shape');
    expect(shapes).toHaveLength(6);
    const edges = Object.values(board.edges);
    expect(edges).toHaveLength(6);
    for (const edge of edges) expect(edge.data.arrow).toBe('arrow');
    // 'Fix data' loops back into 'Collect data'.
    const fix = shapes.find((o) => o.data.text === 'Fix data')!;
    const collect = shapes.find((o) => o.data.text === 'Collect data')!;
    expect(edges.some((e) => e.from === fix.id && e.to === collect.id)).toBe(true);
  });

  it('kanban places cards inside their column frames', () => {
    const project = createKanbanProject('K');
    const board = project.boards[0]!;
    const frames = Object.values(board.objects).filter((o) => o.type === 'frame');
    expect(frames).toHaveLength(4);
    const cards = Object.values(board.objects).filter((o) => o.type === 'sticky_note');
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      const frame = frames.find((f) => f.id === card.parentId);
      expect(frame).toBeDefined();
      // Card lives within its frame's bounds (world coordinates).
      expect(card.x).toBeGreaterThanOrEqual(frame!.x);
      expect(card.x + card.width).toBeLessThanOrEqual(frame!.x + frame!.width + 1);
    }
  });

  it('swot colors the four quadrant frames differently', () => {
    const project = createSwotProject('S');
    const strokes = Object.values(project.boards[0]!.objects)
      .filter((o) => o.type === 'frame')
      .map((f) => f.style.stroke);
    expect(new Set(strokes).size).toBe(4);
  });

  it('the starter helper keeps working for the flagship template', () => {
    expectValid(createMindMapStarterProject('M'), 4, 3);
    expectValid(createWelcomeProject(), 8, 5);
  });
});
