import { describe, expect, test } from "bun:test";
import { compileInfographicNote, infographicSyntaxTemplate, parseInfographicDocument, serializeInfographicDocument } from "./index.ts";

describe("infographic note syntax", () => {
  test("compiles a revenue share into a pie infographic", () => {
    const compiled = compileInfographicNote("chart-pie-donut-plain-text", {
      title: "Acme 2025 revenue mix",
      desc: "Shares are illustrative estimates, not reported figures.",
      values: [
        { label: "Value-added services", value: 52 },
        { label: "Fintech and business services", value: 30 },
        { label: "Online advertising", value: 16 },
        { label: "Other", value: 2 },
      ],
    });
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.title).toBe("Acme 2025 revenue mix");
    expect(compiled.syntax).toBe(`infographic chart-pie-donut-plain-text
data
  title Acme 2025 revenue mix
  desc Shares are illustrative estimates, not reported figures.
  values
    - label Value-added services
      value 52
    - label Fintech and business services
      value 30
    - label Online advertising
      value 16
    - label Other
      value 2`);
    expect(infographicSyntaxTemplate(compiled.syntax)).toBe("chart-pie-donut-plain-text");
    expect(parseInfographicDocument(serializeInfographicDocument({ schemaVersion: 1, syntax: compiled.syntax }))?.syntax).toBe(compiled.syntax);
  });

  test("rejects a share chart whose parts are not positive numbers", () => {
    expect(compileInfographicNote("chart-pie-donut-plain-text", {
      title: "Share",
      values: [{ label: "A", value: -1 }, { label: "B", value: 2 }],
    })).toMatchObject({ ok: false });
    expect(compileInfographicNote("chart-column-simple", {
      title: "Trend",
      values: [{ label: "A" }],
    })).toMatchObject({ ok: false });
    expect(compileInfographicNote("not-a-template", { title: "Share", values: [{ label: "A", value: 1 }] })).toMatchObject({ ok: false });
  });
});
