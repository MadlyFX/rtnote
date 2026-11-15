import { describe, expect, test } from "bun:test";
import { resolveContainerImageSource } from "./container-image-source";

describe("container image source diagnostics", () => {
  test("recognizes official image repositories with tags or digests", () => {
    expect(resolveContainerImageSource("ghcr.io/madlyfx/rtnote")).toBe("official-ghcr");
    expect(resolveContainerImageSource("ghcr.io/madlyfx/rtnote:v1.2.3")).toBe("official-ghcr");
    expect(resolveContainerImageSource("GHCR.IO/MADLYFX/RTNOTE@sha256:abc")).toBe("official-ghcr");
    expect(resolveContainerImageSource("ccr.ccs.tencentyun.com/edgeever/edgeever:latest")).toBe("official-cn-mirror");
  });

  test("does not expose custom image references through the classification", () => {
    expect(resolveContainerImageSource("registry.internal.example/team/edgeever:latest")).toBe("custom");
    expect(resolveContainerImageSource("ghcr.io/madlyfx/rtnote-fork")).toBe("custom");
    expect(resolveContainerImageSource("  ")).toBe("unknown");
    expect(resolveContainerImageSource(undefined)).toBe("unknown");
  });
});
