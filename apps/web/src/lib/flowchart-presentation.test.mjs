import { expect, test } from 'bun:test';
import { flowchartNodePresentation, compileDiagramIr } from './diagram-layout';

test('long labels fit bounded nodes while keeping every character', () => {
  for (const shape of ['process', 'decision', 'terminator']) {
    const label = 'Transformer forward pass\nCausal attention + feed-forward network with a longer description';
    const presentation = flowchartNodePresentation(shape, label);
    expect(presentation.text.replaceAll('\n', '')).toBe(label.replaceAll('\n', ''));
    expect(presentation.width).toBeLessThanOrEqual(240);
    expect(presentation.height).toBeGreaterThanOrEqual(presentation.text.split('\n').length * 18);
  }
});

test('MCP compilation reserves label geometry before arranging the graph', () => {
  const label = 'This is a very long flowchart step '.repeat(12);
  const document = compileDiagramIr({ kind: 'flowchart', nodes: [
    { id: 'a', type: 'process', label }, { id: 'b', type: 'end', label: 'End' },
  ], edges: [{ source: 'a', target: 'b' }] });
  expect(document.nodes[0].label).toBe(label);
  expect(document.nodes[0].height).toBe(flowchartNodePresentation('process', label).height);
  expect(document.nodes[1].y).toBeGreaterThan(document.nodes[0].y + document.nodes[0].height);
  expect(document.nodes[0]).not.toHaveProperty('text');
});
