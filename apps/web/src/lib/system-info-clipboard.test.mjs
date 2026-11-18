import { describe, expect, test } from "bun:test";
import { formatSystemInfoClipboard } from "./system-info-clipboard.ts";

describe("formatSystemInfoClipboard", () => {
  test("builds structured Markdown and HTML tables", () => {
    const formatted = formatSystemInfoClipboard({
      title: "System information",
      fieldLabel: "Item",
      valueLabel: "Details",
      groups: [{
        title: "Cloud instance",
        items: [
          { label: "Instance version", value: "v1.81.0" },
          { label: "Instance URL", value: "https://example.com" },
        ],
      }],
    });

    expect(formatted.plainText).toBe([
      "# System information",
      "",
      "## Cloud instance",
      "| Item | Details |",
      "| --- | --- |",
      "| Instance version | v1.81.0 |",
      "| Instance URL | https://example.com |",
    ].join("\n"));
    expect(formatted.html).toContain("<h1>System information</h1>");
    expect(formatted.html).toContain("<h2>Cloud instance</h2>");
    expect(formatted.html).toContain("<table>");
    expect(formatted.html).toContain('<th scope="row">Instance version</th><td>v1.81.0</td>');
  });

  test("escapes clipboard values for both formats", () => {
    const formatted = formatSystemInfoClipboard({
      title: "System info",
      fieldLabel: "Field",
      valueLabel: "Value",
      groups: [{
        title: "Client",
        items: [{ label: "Build | channel", value: "<script>alert('x')</script>\\next" }],
      }],
    });

    expect(formatted.plainText).toContain("Build \\| channel");
    expect(formatted.plainText).toContain("&lt;script&gt;alert('x')&lt;/script&gt;");
    expect(formatted.plainText).toContain("\\\\next");
    expect(formatted.html).not.toContain("<script>");
    expect(formatted.html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;\\next");
  });
});
