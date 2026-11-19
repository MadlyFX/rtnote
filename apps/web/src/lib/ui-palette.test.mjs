import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { contrastRatio } from "./color-contrast";

const globals = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");

describe("application color system", () => {
  test("uses the same terracotta accent throughout the application", () => {
    const mobileEditor = readFileSync(new URL("../styles/mobile-markdown-editor.css", import.meta.url), "utf8");
    const button = readFileSync(new URL("../components/ui/button.tsx", import.meta.url), "utf8");

    expect(globals).toContain("--brand-green: #b5501b;");
    expect(globals).toContain("--brand-green-500-rgb: 181 80 27;");
    expect(globals).toContain("--brand-green: #d9692c;");
    expect(globals).not.toContain("--brand-green: #00a82d;");
    expect(mobileEditor).toContain("color: var(--brand-green, #b5501b);");
    expect(button).toContain('solid: "bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500"');
    expect(contrastRatio("#773512", "#fbf5f1")).toBeGreaterThanOrEqual(4.5);
    // White labels on solid accent buttons.
    expect(contrastRatio("#ffffff", "#b5501b")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#ffffff", "#d9692c")).toBeGreaterThanOrEqual(3);
  });

  test("keeps menus, switches, and secondary icons in ink", () => {
    const switchSource = readFileSync(new URL("../components/ui/switch.tsx", import.meta.url), "utf8");
    const checkbox = readFileSync(new URL("../components/ui/checkbox.tsx", import.meta.url), "utf8");
    const settings = readFileSync(new URL("../components/SettingsPane.tsx", import.meta.url), "utf8");

    expect(globals).toContain("--accent: 38 19.1% 85.9%;");
    expect(globals).toContain("--accent-foreground: 33 14.7% 14.7%;");
    expect(globals).not.toContain("--accent-foreground: 158 70% 25%;");
    expect(globals).toContain("--switch-track-on: #57534e;");
    expect(globals).toContain("--checkbox-on: #57534e;");
    expect(globals).toContain("--switch-track-on: #e7e1d6;");
    expect(switchSource).toContain("data-[state=checked]:bg-[var(--switch-track-on)]");
    expect(switchSource).not.toContain("bg-emerald-500");
    expect(checkbox).toContain("data-[state=checked]:bg-[var(--checkbox-on)]");
    expect(checkbox).not.toContain("bg-emerald-500");
    expect(settings).not.toContain("text-emerald-");
    expect(contrastRatio("#ffffff", "#57534e")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#fbf8f2", "#2b2620")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#1a1714", "#e7e1d6")).toBeGreaterThanOrEqual(4.5);
  });

  test("keeps the light workspace on a warm paper palette while preserving text hierarchy", () => {
    expect(globals).toContain("--workspace-canvas: #f4efe6;");
    expect(globals).toContain("--workspace-sidebar: #ece5d8;");
    expect(globals).toContain("--workspace-memo-list: #f9f5ee;");
    expect(globals).toContain("--workspace-editor: #fbf8f2;");
    expect(globals).toContain("--workspace-selection: #d7cebf;");
    expect(globals).toContain("--color-workspace-canvas: var(--workspace-canvas);");
    expect(globals).toContain("--workspace-hover: color-mix(in srgb, var(--workspace-sidebar) 40%, white);");
    expect(globals).toContain(".rtnote-workspace-sidebar-footer {\n  background: var(--workspace-sidebar);");
    expect(globals).toContain("--slate-500-rgb: 120 113 108;");
    expect(globals).toContain("--slate-950-rgb: 12 10 9;");
    expect(globals).toContain("--amber-50-rgb: 255 251 235;");
    expect(globals).toContain("--amber-300-rgb: 252 211 77;");
    expect(globals).toContain("--amber-400-rgb: 251 191 36;");
    expect(globals).toContain("--amber-500-rgb: 245 158 11;");
    expect(globals).toContain("--rose-50-rgb: 255 241 242;");
    expect(globals).toContain("--rose-400-rgb: 251 113 133;");
    expect(globals).not.toContain("--slate-500-rgb: 100 116 139;");
    expect(contrastRatio("#222222", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#737373", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#2b2620", "#fbf8f2")).toBeGreaterThanOrEqual(4.5);
    // Muted text (--muted-foreground) and slate-500 on the paper editor surface.
    expect(contrastRatio("#6b655d", "#fbf8f2")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#78716c", "#fbf8f2")).toBeGreaterThanOrEqual(4.5);
  });

  test("keeps dark workspace surfaces distinct and warm", () => {
    expect(globals).toContain("--workspace-canvas: #1a1714;");
    expect(globals).toContain("--workspace-sidebar: #1f1b17;");
    expect(globals).toContain("--workspace-memo-list: #221e1a;");
    expect(globals).toContain("--workspace-editor: #26221d;");
    expect(globals).toContain("--foreground: 38 36.7% 88.2%;");
    expect(globals).toContain("--border: 32 14.9% 19.8%;");
    expect(globals).toContain("--amber-300-rgb: 180 83 9;");
    expect(globals).not.toContain("scrollbar-color: rgba(100, 116, 139, 0.18)");
    expect(contrastRatio("#ece4d6", "#26221d")).toBeGreaterThanOrEqual(4.5);
    // Dark slate-500 and muted text on the dark editor surface.
    expect(contrastRatio("#a49e96", "#26221d")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#958d83", "#26221d")).toBeGreaterThanOrEqual(4.5);
  });
});
