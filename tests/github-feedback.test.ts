import { describe, expect, test } from "bun:test";
import { buildGitHubFeedbackUrl } from "../packages/shared/src/github-feedback";

describe("buildGitHubFeedbackUrl", () => {
  test("prefills localized feedback copy and system information", () => {
    const url = new URL(
      buildGitHubFeedbackUrl({
        contentHeading: "What happened",
        contentPrompt: "Describe the problem",
        privacyNotice: "Do not include private information",
        systemInfo: [
          { label: "Version", value: "v0.5.0" },
          { label: "OS", value: "Android 16" },
        ],
        systemInfoHeading: "System information",
        systemInfoNotice: "Generated automatically",
        titlePrefix: "[Feedback] ",
      })
    );

    expect(`${url.origin}${url.pathname}`).toBe("https://github.com/MadlyFX/rtnote/issues/new");
    expect(url.searchParams.get("title")).toBe("[Feedback] ");
    expect(url.searchParams.get("body")).toContain("## What happened");
    expect(url.searchParams.get("body")).toContain("- Version: v0.5.0");
    expect(url.searchParams.get("body")).toContain("- OS: Android 16");
    expect(url.searchParams.get("body")).toContain("> Do not include private information");
    expect(url.searchParams.get("system-info")).toContain("- Version: v0.5.0");
    expect(url.searchParams.get("system-info")).toContain("- OS: Android 16");
    expect(url.searchParams.get("template")).toBeNull();
  });
});
