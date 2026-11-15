import { describe, expect, test } from "bun:test";
import { withEnvironmentTitlePrefix } from "./environment-title.ts";

describe("environment tab title", () => {
  test("marks local development tabs as DEV", () => {
    expect(withEnvironmentTitlePrefix("RTNote", { development: true, profile: "local" }))
      .toBe("[DEV] RTNote");
    expect(withEnvironmentTitlePrefix("RTNote", { development: true, profile: "" }))
      .toBe("[DEV] RTNote");
  });

  test("marks the local demo profile as DEMO", () => {
    expect(withEnvironmentTitlePrefix("RTNote", { development: true, profile: "demo" }))
      .toBe("[DEMO] RTNote");
  });

  test("is idempotent during hot reloads and leaves production titles unchanged", () => {
    expect(withEnvironmentTitlePrefix("[LOCAL DEMO] RTNote", { development: true, profile: "demo" }))
      .toBe("[DEMO] RTNote");
    expect(withEnvironmentTitlePrefix("RTNote", { development: false, profile: "demo" }))
      .toBe("RTNote");
  });
});
