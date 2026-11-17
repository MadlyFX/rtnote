import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parseSyntax } from "@antv/infographic";
import {
  INFOGRAPHIC_SAMPLE_CATEGORIES,
  INFOGRAPHIC_SAMPLES,
  getSampleDesc,
  getSampleSyntax,
  getSampleTitle,
} from "../lib/infographic-samples";
import { INFOGRAPHIC_SAMPLES_JA } from "../lib/infographic-samples.ja";
import { INFOGRAPHIC_SAMPLES_ZH_CN } from "../lib/infographic-samples.zh-CN";

const editorPaneSource = readFileSync(new URL("./InfographicEditorPane.tsx", import.meta.url), "utf8");
const gallerySource = readFileSync(new URL("./InfographicGallery.tsx", import.meta.url), "utf8");

describe("infographic gallery samples", () => {
  test("covers all 7 AntV template categories with curated samples", () => {
    const categories = new Set(INFOGRAPHIC_SAMPLES.map((s) => s.category));
    expect(categories.has("sequence")).toBe(true);
    expect(categories.has("compare")).toBe(true);
    expect(categories.has("list")).toBe(true);
    expect(categories.has("quadrant")).toBe(true);
    expect(categories.has("hierarchy")).toBe(true);
    expect(categories.has("relation")).toBe(true);
    expect(categories.has("chart")).toBe(true);
    expect(INFOGRAPHIC_SAMPLE_CATEGORIES.length).toBe(7);
  });

  test("all Chinese sample syntaxes parse cleanly without errors", () => {
    for (const sample of INFOGRAPHIC_SAMPLES) {
      const parsed = parseSyntax(INFOGRAPHIC_SAMPLES_ZH_CN[sample.id].syntax);
      expect(parsed.errors.length).toBe(0);
      expect(parsed.options.template).toBe(sample.template);
    }
  });

  test("all English sample syntaxes parse cleanly without errors", () => {
    for (const sample of INFOGRAPHIC_SAMPLES) {
      const parsed = parseSyntax(sample.syntax);
      expect(parsed.errors.length).toBe(0);
      expect(parsed.options.template).toBe(sample.template);
    }
  });

  test("every sample has a Simplified Chinese translation", () => {
    for (const sample of INFOGRAPHIC_SAMPLES) {
      expect(INFOGRAPHIC_SAMPLES_ZH_CN[sample.id]).toBeDefined();
    }
  });

  test("multilingual helper methods return appropriate localized content", () => {
    const sample = INFOGRAPHIC_SAMPLES[0];
    const zhCN = INFOGRAPHIC_SAMPLES_ZH_CN[sample.id];
    expect(getSampleTitle(sample, "zh-CN")).toBe(zhCN.title);
    expect(getSampleTitle(sample, "en-US")).toBe(sample.title);
    expect(getSampleTitle(sample, "ja")).toBe(INFOGRAPHIC_SAMPLES_JA[sample.id]?.title ?? sample.title);

    expect(getSampleSyntax(sample, "zh-CN")).toBe(zhCN.syntax);
    expect(getSampleSyntax(sample, "en-US")).toBe(sample.syntax);
    expect(getSampleSyntax(sample, "zh")).toBe(zhCN.syntax);
    expect(getSampleSyntax(sample, "pl")).toBe(sample.syntax);
    expect(getSampleSyntax(sample)).toBe(sample.syntax);

    expect(getSampleDesc(sample, "zh-CN")).toBe(zhCN.desc);
    expect(getSampleDesc(sample, "en-US")).toBe(sample.desc);
  });
});

describe("infographic editor gallery integration", () => {
  test("renders InfographicGallery in empty canvas state and provides toolbar gallery trigger without leaking technical branding", () => {
    expect(editorPaneSource).toContain("<InfographicGallery");
    expect(editorPaneSource).toContain("handleApplySample");
    expect(editorPaneSource).toContain('t("infographic.galleryTemplatesButton")');
    expect(gallerySource).toContain("data-infographic-gallery");
    expect(gallerySource).toContain("data-infographic-sample-card");
    expect(gallerySource).toContain("data-infographic-card-preview");
    expect(gallerySource).not.toContain("https://infographic.antv.vision/gallery");
    expect(gallerySource).not.toContain("sample.template");
    expect(gallerySource).not.toContain("AntV Infographic");
  });
});
