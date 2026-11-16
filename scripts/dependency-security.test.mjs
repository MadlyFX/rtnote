import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const desktopRequire = createRequire(new URL("../apps/desktop/package.json", import.meta.url));
const rootRequire = createRequire(new URL("../package.json", import.meta.url));
const mobileRequire = createRequire(new URL("../apps/mobile/package.json", import.meta.url));
const extensionRequire = createRequire(new URL("../apps/extension/package.json", import.meta.url));
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));

function consumerRequire(start, ...packages) {
  return packages.reduce((require, name) => createRequire(require.resolve(name)), start);
}

describe("dependency security at the actual consumer", () => {
  test("the desktop schema validator canonicalizes percent-encoded hostnames", () => {
    const builderRequire = consumerRequire(desktopRequire, "electron-builder", "app-builder-lib");
    const ajvRequire = consumerRequire(builderRequire, "ajv");
    const uri = ajvRequire("fast-uri");
    expect(uri.parse("//%41.com").host).toBe("a.com");
    expect(uri.equal("//%41.com", "//a.com")).toBe(true);
    const Ajv = builderRequire("ajv");
    const validate = new Ajv().compile({ type: "object", properties: { enabled: { type: "boolean" } } });
    expect(validate({ enabled: true })).toBe(true);
    expect(validate({ enabled: "true" })).toBe(false);
  });

  test("infographic CSS cannot load an absolute source map without a source filename", () => {
    const infographicRequire = consumerRequire(webRequire, "@antv/infographic/package.json");
    const postcss = infographicRequire("postcss");
    const directory = mkdtempSync(join(tmpdir(), "edgeever-css-map-"));
    const mapPath = join(directory, "private.map");
    try {
      writeFileSync(mapPath, JSON.stringify({ version: 3, sources: ["private.txt"], sourcesContent: ["EDGE_EVER_PRIVATE_MAP_CONTENT"], names: [], mappings: "AAAA" }));
      const result = postcss([]).process(`a { color: green }\n/*# sourceMappingURL=${mapPath} */`, { map: { inline: false } }).sync();
      expect(result.root.source.input.map?.text).toBeUndefined();
      expect(JSON.stringify(result.map.toJSON())).not.toContain("EDGE_EVER_PRIVATE_MAP_CONTENT");
      expect(result.css).toContain("color: green");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("Tailwind's source map consumer rejects excessive indexed offsets", () => {
    const tailwindRequire = consumerRequire(rootRequire, "@tailwindcss/vite", "@tailwindcss/node");
    const { SourceMapConsumer } = tailwindRequire("source-map-js");
    const map = { version: 3, sources: ["input.css"], names: [], mappings: "AAAA" };
    expect(new SourceMapConsumer(map).originalPositionFor({ line: 1, column: 0 }).source).toBe("input.css");
    expect(() => new SourceMapConsumer({ version: 3, sections: [{ offset: { line: 10000001, column: 0 }, map }] })).toThrow(/offset/i);
  });

  test("infographic's Nano ID handles non-positive sizes without looping", () => {
    const postcssRequire = consumerRequire(webRequire, "@antv/infographic/package.json", "postcss");
    const version = postcssRequire("nanoid/package.json").version;
    expect(Bun.semver.satisfies(version, ">=3.3.18 <4")).toBe(true);
    const { nanoid, customAlphabet } = postcssRequire("nanoid/non-secure");
    expect(nanoid(-1)).toBe("");
    expect(customAlphabet("abc")(0)).toBe("");
    expect(customAlphabet("abc")(8)).toMatch(/^[abc]{8}$/);
    expect(postcssRequire("nanoid").customAlphabet("abc")(0)).toBe("");
  });

  test("native plist consumers preserve values and reject injected entity names", () => {
    const expoRequire = consumerRequire(mobileRequire, "expo/package.json", "@expo/config-plugins");
    const builderRequire = consumerRequire(desktopRequire, "electron-builder", "app-builder-lib");
    const consumers = [
      [expoRequire, "@expo/plist"],
      [builderRequire, "plist"],
      [consumerRequire(expoRequire, "xcode", "simple-plist"), "plist"],
      [consumerRequire(builderRequire, "@electron/osx-sign"), "plist"],
      [consumerRequire(builderRequire, "@electron/universal"), "plist"],
    ];
    const fixture = { CFBundleIdentifier: "com.edgeever.app", label: "中文 & <RTNote>", enabled: true, count: 42, values: ["a", "b"] };
    for (const [require, name] of consumers) {
      const plistModule = require(name);
      const plist = plistModule.default ?? plistModule;
      expect(plist.parse(plist.build(fixture))).toEqual(fixture);
      const xmlRequire = consumerRequire(require, name);
      const { DOMImplementation } = xmlRequire("@xmldom/xmldom");
      const doc = new DOMImplementation().createDocument(null, "root", null);
      expect(() => doc.createEntityReference("x;<injected/>")).toThrow();
    }
  });

  test("Firefox profile encoding uses the fixed ZIP parser and preserves preferences", async () => {
    const webExtRequire = consumerRequire(extensionRequire, "web-ext/package.json");
    const profileRequire = consumerRequire(webExtRequire, "firefox-profile");
    const FirefoxProfile = webExtRequire("firefox-profile");
    const AdmZip = profileRequire("adm-zip");
    expect(profileRequire("adm-zip/package.json").version).toBe("0.6.1");
    const directory = mkdtempSync(join(tmpdir(), "edgeever-firefox-profile-"));
    const profile = new FirefoxProfile({ destinationDirectory: directory });
    try {
      profile.setPreference("edgeever.security.test", "中文 & value");
      const encoded = await new Promise((resolve, reject) => profile.encoded((error, data) => error ? reject(error) : resolve(data)));
      const zip = new AdmZip(Buffer.from(encoded, "base64"));
      expect(zip.readAsText("user.js")).toContain('user_pref("edgeever.security.test", "中文 & value");');
    } finally {
      process.removeListener("exit", profile.onExit);
      process.removeListener("SIGINT", profile.onSigInt);
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("the desktop updater enforces a budget for empty YAML merge sources", () => {
    const updaterRequire = createRequire(desktopRequire.resolve("electron-updater"));
    const yaml = updaterRequire("js-yaml");
    expect(yaml.load("version: 1.111.0\nfiles: []\n")).toEqual({ version: "1.111.0", files: [] });
    expect(() => yaml.load("a: &a {}\nb:\n  <<: [*a, *a, *a, *a]\n", {
      maxTotalMergeKeys: 3,
    })).toThrow();
  });

  test("the command tool refuses a line terminator after a comment token", () => {
    const commandRequire = createRequire(rootRequire.resolve("concurrently"));
    const { quote } = commandRequire("shell-quote");
    expect(() => quote(["echo", { comment: "test" }, "value\ncommand"])).toThrow(TypeError);
    expect(quote(["echo", "two words"])).toContain("two words");
  });

});
