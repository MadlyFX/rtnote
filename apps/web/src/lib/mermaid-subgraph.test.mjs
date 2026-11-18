import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("patched compact renderer preserves Chinese groups and cross-container edge geometry in source and browser bundles", () => {
  // Chinese subgraph ids ("Logs", "Outer", "Inner"), escaped so the source stays English.
  // Non-Latin ids must not collapse to empty group ids.
  const CJK_GROUP = "\u65e5\u5fd7";
  const CJK_OUTER = "\u5916\u5c42";
  const CJK_INNER = "\u5185\u5c42";
  // ELK must initialize without the partial window globals installed by other suites.
  const result = spawnSync(process.execPath, ["--eval", `
    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import { parseMermaid, renderMermaidSVG } from "beautiful-mermaid";
    const entry = import.meta.resolve("beautiful-mermaid");
    const { layoutGraphSync } = await import(new URL("./layout.ts", entry).href);
    const browser = await import(new URL("../dist/index.js", entry).href);
    const onBoundary = (p, n) => {
      const near = (a, b) => Math.abs(a - b) < 1.5;
      return ((near(p.x, n.x) || near(p.x, n.x + n.width)) && p.y >= n.y - 1.5 && p.y <= n.y + n.height + 1.5)
        || ((near(p.y, n.y) || near(p.y, n.y + n.height)) && p.x >= n.x - 1.5 && p.x <= n.x + n.width + 1.5);
    };
    for (const direction of ["LR", "RL", "TD", "BT"]) {
      for (const body of [
        'subgraph ${CJK_GROUP}\\nA[Production] -->|off| B[Query logs]\\nC[Dev and test] -->|on demand| B\\nE[Audit] -->|on demand| B\\nend',
        'subgraph outer["Outer"]\\na[A]\\nsubgraph inner["Inner"]\\nb[B]\\nend\\nend\\na -->|yes| b',
        'subgraph ${CJK_OUTER}["${CJK_OUTER}"]\\na[A]\\nsubgraph ${CJK_INNER}["${CJK_INNER}"]\\nb[B]\\nend\\nend\\na -->|yes| b',
        'a[A] -->|yes| b[B]',
      ]) {
        const source = 'flowchart ' + direction + '\\n' + body;
        const graph = parseMermaid(source);
        for (const group of graph.subgraphs) assert(group.id, 'empty Chinese group id');
        const positioned = layoutGraphSync(graph);
        const nodes = new Map(positioned.nodes.map(n => [n.id, n]));
        for (const edge of positioned.edges) {
          assert(onBoundary(edge.points[0], nodes.get(edge.source)), direction + ': detached start');
          assert(onBoundary(edge.points.at(-1), nodes.get(edge.target)), direction + ': detached end');
        }
        assert.equal(renderMermaidSVG(source), browser.renderMermaidSVG(source), 'Bun and browser patches differ');
      }
    }
    console.log('geometry and source/browser parity passed');
  `], { cwd: import.meta.dir, encoding: "utf8", timeout: 30_000 });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("geometry and source/browser parity passed");
});
