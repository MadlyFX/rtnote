import { describe, expect, test } from "bun:test";
import { createDefaultDiagramDocument, parseDiagramDocument, serializeDiagramDocument } from "./diagram.ts";
import {
  createDefaultInfographicDocument,
  getInfographicSummary,
  parseInfographicDocument,
  serializeInfographicDocument,
} from "./infographic.ts";

describe("infographic note format", () => {
  test("round trips AntV syntax and keeps a readable fallback", () => {
    const document = {
      schemaVersion: 1,
      syntax: "infographic list-row-simple-horizontal-arrow\ndata\n  title Release process\n  lists\n    - label Prepare\n    - label Release",
    };
    const markdown = serializeInfographicDocument(document);
    expect(markdown).toContain("```infographic\n");
    expect(parseInfographicDocument(markdown)).toEqual(document);
    expect(getInfographicSummary(markdown)).toEqual({ infographic: true });
  });

  test("empty and invalid notes do not claim a valid document", () => {
    expect(parseInfographicDocument(serializeInfographicDocument(createDefaultInfographicDocument()))).toEqual(createDefaultInfographicDocument());
    expect(parseInfographicDocument("<!-- edgeever-infographic-v1:broken -->")).toBeNull();
    expect(getInfographicSummary("regular note")).toEqual({ infographic: false });
  });

  test("keeps AI revision requests with the infographic across reads", () => {
    const document = {
      schemaVersion: 1,
      syntax: "infographic sequence-steps-simple\ndata\n  title Release process",
      history: [
        { id: "one", prompt: "Make a release process chart", createdAt: "2026-09-24T10:00:00.000Z", kind: "generated", resultTitle: "Release process" },
        { id: "two", prompt: "Change step two to review", createdAt: "2026-09-24T10:01:00.000Z", kind: "refined", resultTitle: "Release process", undoneAt: "2026-09-24T10:02:00.000Z" },
      ],
    };
    expect(parseInfographicDocument(serializeInfographicDocument(document))).toEqual(document);
    expect(parseInfographicDocument(serializeInfographicDocument({ ...document, history: [{ ...document.history[0], prompt: 42 }] }))).toBeNull();
  });

  test("keeps agent replies and clarification turns in the note", () => {
    const document = { schemaVersion: 1, syntax: "", history: [
      { id: "clarify", prompt: "Try another company", response: "Which company should it be?", kind: "clarified", resultTitle: "", createdAt: "2026-09-24T10:00:00.000Z" },
      { id: "edit", prompt: "Globex", response: "Replaced the compared company.", decision: "The comparison is unchanged, so the template stays.", kind: "refined", resultTitle: "Acme vs Globex", template: "compare-binary-horizontal-badge-card-vs", createdAt: "2026-09-24T10:01:00.000Z" },
    ] };
    expect(parseInfographicDocument(serializeInfographicDocument(document))).toEqual(document);
    const sessioned = {
      schemaVersion: 1,
      syntax: "infographic sequence-steps-simple\ndata\n  title Release process",
      activeSessionId: "session-new",
      history: [
        { id: "old", prompt: "Turn it into a release process", createdAt: "2026-10-01T00:00:00.000Z", kind: "generated", resultTitle: "Release process" },
        { id: "new", prompt: "Switch to milestones", createdAt: "2026-10-24T00:00:00.000Z", kind: "refined", resultTitle: "Milestones", sessionId: "session-new" },
      ],
    };
    expect(parseInfographicDocument(serializeInfographicDocument(sessioned))).toEqual(sessioned);
    expect(parseInfographicDocument(serializeInfographicDocument({ schemaVersion: 1, syntax: "", activeSessionId: "session empty" }))).toBeNull();
    expect(parseInfographicDocument(serializeInfographicDocument({ ...sessioned, history: [{ ...sessioned.history[1], sessionId: "bad id" }] }))).toBeNull();
  });

  test("infographic syntax and visual diagram IR keep separate envelopes", () => {
    const infographic = serializeInfographicDocument({ schemaVersion: 1, syntax: "infographic sequence-steps-simple\ndata\n  sequences\n    - label Start" });
    const diagram = serializeDiagramDocument(createDefaultDiagramDocument("flowchart"));
    expect(parseInfographicDocument(infographic)?.syntax).toContain("sequence-steps-simple");
    expect(parseDiagramDocument(infographic)).toBeNull();
    expect(parseDiagramDocument(diagram)?.kind).toBe("flowchart");
    expect(parseInfographicDocument(diagram)).toBeNull();
  });
});
