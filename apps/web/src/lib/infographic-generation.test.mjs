import { describe, expect, test } from "bun:test";
import { parseSyntax, getTemplate, getTemplates } from "@antv/infographic";
import { compileInfographicNote, INFOGRAPHIC_NOTE_TEMPLATES, officialTemplateFamily } from "@rtnote/shared";
import { buildInfographicSyntax, buildOfficialInfographicSyntax, INFOGRAPHIC_TEMPLATES } from "./infographic-generation.ts";

const sampleOfficialData = (template) => {
  const family = officialTemplateFamily(template);
  const entry = (label, desc) => ({ label, desc });
  if (family === "chart") return { title: "Chart", values: [{ label: "A", value: 40 }, { label: "B", value: 30 }, { label: "C", value: 20 }] };
  if (family === "hierarchy") return { title: "Hierarchy", root: { label: "Topic", children: [entry("Branch A", "Note"), entry("Branch B", "Note")] } };
  if (family === "relation") return { title: "Relation", nodes: [{ id: "a", label: "Node A" }, { id: "b", label: "Node B" }], relations: [{ from: "a", to: "b", direction: "forward" }] };
  if (family === "comparison") {
    const labels = template === "compare-swot" ? ["Strengths", "Weaknesses", "Opportunities", "Threats"] : ["Option A", "Option B"];
    return { title: "Comparison", compares: labels.map((label) => ({ label, children: [entry("Aspect one", "Note"), entry("Aspect two", "Note")] })) };
  }
  if (family === "quadrant") return { title: "Quadrant", compares: ["One", "Two", "Three", "Four"].map((label) => entry(label, "Note")) };
  if (family === "sequence") return { title: "Process", sequences: [entry("Step one", "Note"), entry("Step two", "Note"), entry("Step three", "Note")] };
  return { title: "List", lists: [entry("Item A", "Note"), entry("Item B", "Note"), entry("Item C", "Note")] };
};

describe("infographic templates", () => {
  test("offered form templates are real AntV templates and match their data family", () => {
    const official = new Set(getTemplates());
    const selectable = INFOGRAPHIC_TEMPLATES.filter((item) => !("selectable" in item && item.selectable === false));
    for (const { id: template, kind } of selectable) {
      expect(official.has(template)).toBe(true);
      const items = kind === "quadrant" ? Array.from({ length: 4 }, (_, index) => ({ label: `Item ${index + 1}`, description: "Note" }))
        : kind === "comparison" ? [{ label: "A", children: [{ label: "Aspect", description: "Note" }] }, { label: "B", children: [{ label: "Aspect", description: "Note" }] }]
        : [{ label: "First", description: "Note" }];
      const syntax = buildInfographicSyntax({ template, title: "Test", items });
      expect(parseSyntax(syntax).errors).toEqual([]);
    }
  });

  test("all installed AntV templates accept the shared family data format", () => {
    for (const template of getTemplates()) {
      const sample = sampleOfficialData(template);
      const parsed = parseSyntax(buildOfficialInfographicSyntax(template, sample));
      expect(parsed.errors).toEqual([]);
      expect(parsed.options.template).toBe(template);
      expect(parsed.options.data).toEqual(sample);
      expect(getTemplate(template)).toBeTruthy();
    }
  });

  test("MCP infographic note templates render with AntV", () => {
    for (const template of INFOGRAPHIC_NOTE_TEMPLATES) {
      const compiled = compileInfographicNote(template, sampleOfficialData(template));
      expect(compiled.ok).toBe(true);
      if (!compiled.ok) continue;
      const parsed = parseSyntax(compiled.syntax);
      expect(parsed.errors).toEqual([]);
      expect(parsed.options.template).toBe(template);
    }
  });
});
