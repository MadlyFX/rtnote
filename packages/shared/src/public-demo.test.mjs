import { describe, expect, test } from "bun:test";
import { PUBLIC_DEMO_INSTANCE_URL, normalizeInstanceUrl, resolveInstanceUrlInput } from "./public-demo.ts";

describe("instance URL input", () => {
  test("uses an example placeholder, not a hosted demo", () => {
    expect(PUBLIC_DEMO_INSTANCE_URL).toBe("https://notes.example.com");
  });

  test("does not expand a bare 'demo' into any remote host", () => {
    expect(resolveInstanceUrlInput("demo")).toBe("demo");
    expect(normalizeInstanceUrl("demo")).toBe("https://demo");
  });

  test("leaves real hosts unchanged apart from whitespace", () => {
    expect(resolveInstanceUrlInput(" https://notes.example.com ")).toBe("https://notes.example.com");
    expect(resolveInstanceUrlInput("demo.example.com")).toBe("demo.example.com");
    expect(resolveInstanceUrlInput("")).toBe("");
  });

  test("prefixes https when a host has no protocol", () => {
    expect(normalizeInstanceUrl("example.workers.dev")).toBe("https://example.workers.dev");
    expect(normalizeInstanceUrl(" example.workers.dev/ ")).toBe("https://example.workers.dev");
    expect(normalizeInstanceUrl("https://notes.example.com/")).toBe("https://notes.example.com");
    expect(normalizeInstanceUrl("http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
    expect(normalizeInstanceUrl("ftp://example.com")).toBe("ftp://example.com");
    expect(normalizeInstanceUrl("")).toBe("");
  });
});
