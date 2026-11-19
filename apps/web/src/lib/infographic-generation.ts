import { buildOfficialInfographicSyntax } from "@rtnote/shared";

export { buildOfficialInfographicSyntax };

/** Templates the simple infographic form can edit. */
export const INFOGRAPHIC_TEMPLATES = [
  { id: "list-row-simple-horizontal-arrow", label: "simpleList", kind: "steps", hint: "short horizontal process" },
  { id: "sequence-steps-simple", label: "numberedSteps", kind: "steps", hint: "numbered steps" },
  { id: "sequence-horizontal-zigzag-simple", label: "zigzagSteps", kind: "steps", hint: "longer alternating process" },
  { id: "list-column-done-list", label: "verticalList", kind: "list", hint: "checklist" },
  { id: "list-grid-simple", label: "gridList", kind: "list", hint: "parallel ideas in a grid" },
  { id: "list-pyramid-compact-card", label: "pyramidList", kind: "list", hint: "ranked levels or priorities" },
  { id: "sequence-timeline-simple", label: "timeline", kind: "timeline", hint: "simple chronological events" },
  { id: "sequence-timeline-done-list", label: "timelineChecklist", kind: "timeline", hint: "chronological milestones" },
  { id: "sequence-roadmap-vertical-simple", label: "roadmap", kind: "timeline", hint: "vertical roadmap" },
  { id: "compare-binary-horizontal-badge-card-vs", label: "comparison", kind: "comparison", hint: "two subjects with matched aspects and VS divider" },
  { id: "compare-binary-horizontal-compact-card-vs", label: "compactComparison", kind: "comparison", hint: "dense two-sided comparison with VS divider" },
  { id: "compare-binary-horizontal-simple-arrow", label: "arrowComparison", kind: "comparison", hint: "before and after or directional comparison" },
  { id: "compare-quadrant-quarter-simple-card", label: "quadrant", kind: "quadrant", hint: "four labeled quadrants" },
  { id: "compare-quadrant-quarter-circular", label: "circularQuadrant", kind: "quadrant", hint: "four quadrants in a circular style" },
  { id: "quadrant-quarter-simple-card", label: "quadrant", kind: "quadrant", hint: "legacy four quadrants", selectable: false },
] as const;

export type InfographicItem = { label: string; description?: string; children?: InfographicItem[] };

const plainLine = (value: string) => value.replace(/\s+/g, " ").trim();

export const buildInfographicSyntax = (input: {
  template: string;
  title: string;
  description?: string;
  items: InfographicItem[];
  dark?: boolean;
}) => {
  const lines = [`infographic ${input.template}`];
  if (input.dark) lines.push("theme dark");
  lines.push("data");
  if (input.title.trim()) lines.push(`  title ${plainLine(input.title)}`);
  if (input.description?.trim()) lines.push(`  desc ${plainLine(input.description)}`);
  if (input.items.length) {
    const comparison = input.template.startsWith("compare-binary-");
    lines.push(input.template.startsWith("sequence-") ? "  sequences" : comparison || /^(compare-)?quadrant-/.test(input.template) ? "  compares" : "  lists");
    for (const item of input.items) {
      lines.push(`    - label ${plainLine(item.label)}`);
      if (comparison) {
        lines.push("      children", `        - label ${plainLine(item.label)}`);
        if (item.description?.trim()) lines.push(`          desc ${plainLine(item.description)}`);
        for (const child of item.children ?? []) {
          lines.push(`        - label ${plainLine(child.label)}`);
          if (child.description?.trim()) lines.push(`          desc ${plainLine(child.description)}`);
        }
      } else if (item.description?.trim()) lines.push(`      desc ${plainLine(item.description)}`);
    }
  }
  return lines.join("\n");
};
