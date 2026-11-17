import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readBrandConfig } from "./brand-config.mjs";
import { applyBrandConfig, brandTargets } from "./apply-brand-config.mjs";

const writeConfig = (patch) => {
  const base = JSON.parse(readFileSync("brand.config.json", "utf8"));
  const file = path.join(mkdtempSync(path.join(tmpdir(), "brand-config-")), "brand.config.json");
  writeFileSync(file, JSON.stringify({ ...base, ...patch }));
  return file;
};

describe("brand.config.json", () => {
  test("is valid and the platform files already match it", () => {
    const config = readBrandConfig();
    expect(config.name).toBe("RTNote");
    expect(config.tileColor).toBe("#16a06e");
    expect(applyBrandConfig({ check: true })).toEqual([]);
  });

  test("rejects names, colours and paths that would break a build", () => {
    expect(() => readBrandConfig(writeConfig({ tileColor: "green" }))).toThrow("tileColor");
    expect(() => readBrandConfig(writeConfig({ shortName: "A very long home screen name" }))).toThrow("shortName");
    expect(() => readBrandConfig(writeConfig({ icon: "../outside.svg" }))).toThrow("icon");
    expect(() => readBrandConfig(writeConfig({ name: "" }))).toThrow("name");
  });

  test("a new name and tile colour reach Android and iOS without touching ids", () => {
    const config = readBrandConfig(writeConfig({ name: "Acme & Co", shortName: "Acme", tileColor: "#123ABC" }));
    const outputs = Object.fromEntries(brandTargets.map((target) => [target.file, target.update(readFileSync(target.file, "utf8"), config)]));
    const app = JSON.parse(outputs["apps/mobile/app.json"]);
    expect(app.expo.name).toBe("Acme & Co");
    expect(app.expo.android.adaptiveIcon.backgroundColor).toBe("#123ABC");
    expect(app.expo.android.package).toBe("com.madlyfx.rtnote");
    expect(app.expo.slug).toBe("rtnote");
    expect(outputs["apps/ios/project.yml"]).toContain('CFBundleDisplayName: "Acme & Co"');
    expect(outputs["apps/ios/project.yml"]).toContain("CFBundleName: Acme");
    expect(outputs["apps/ios/project.yml"]).toContain("PRODUCT_BUNDLE_IDENTIFIER: com.madlyfx.rtnote");
    expect(outputs["apps/ios/EdgeEver/Resources/Info.plist"]).toContain("<string>Acme &amp; Co</string>");
  });
});
