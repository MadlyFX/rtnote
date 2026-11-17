import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// English is RTNote's source language for code, data, docs and tooling. Other
// languages live in translation files. This guard keeps Chinese characters out
// of everything else, so a new screen, log line or comment cannot quietly slip
// back to Chinese.
//
// Allowed places, each for a reason:
// - translation files: `i18n/` and `_locales/` directories, and files named
//   with a locale suffix such as `foo.zh-CN.ts`;
// - inline translations: a string value labelled with a Chinese or Japanese
//   locale (`zh: "…"`, `"zh-CN": "…"`, `ja: "…"`), as in iOS `t("Save", zh: "保存")`;
// - the exceptions below: web-clipper code that reads Chinese websites, the
//   WeChat chat importer, Chinese font names, tests that exercise CJK text
//   handling, migrations that already ran, and generated bundles.

const root = join(import.meta.dir, "..");

const HAN = /[㐀-䶿一-鿿豈-﫿]/;

const translationPath = /(?:^|\/)(?:i18n|_locales)\/|\.(?:zh-CN|zh-TW|zh|ja)\.[A-Za-z0-9]+$/;

const inlineTranslation =
  /(?:\b(?:zh|zhCN|zhTW|zhHans|zhHant|ja)\b|["'](?:zh|zh-CN|zh-TW|zh-Hans|zh-Hant|zh_CN|zh_TW|ja)["'])\s*:\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g;

// Binary and media files can contain any bytes.
const binaryExtension =
  /\.(?:png|jpe?g|gif|webp|avif|ico|icns|bmp|tiff?|svgz|woff2?|ttf|otf|eot|mp[34]|m4a|webm|ogg|wav|caf|mov|pdf|zip|gz|tgz|br|wasm|jar|keystore|p12|der|bin|sqlite|db|lockb)$/i;

type Exception = { path: RegExp; reason: string };

const exceptions: Exception[] = [
  // Migrations that already ran are immutable; a fresh English baseline replaces them before 1.0.
  { path: /^migrations\/00(?:[0-8]\d|9[0-4])_[^/]+\.sql$/, reason: "migrations that already ran must not be edited" },
  // Built from apps/ios/EditorSource and the shared catalogs; checked at the source.
  { path: /^apps\/ios\/(?:EdgeEver\/Resources\/)?EditorBundle\//, reason: "generated iOS editor bundle" },
  // Chinese values EdgeEver stored in user data, mapped to RTNote's on read.
  { path: /^packages\/shared\/src\/memo-title\.ts$/, reason: "maps EdgeEver's stored untitled title" },
  { path: /^packages\/shared\/src\/edgeever-legacy-values\.ts$/, reason: "maps EdgeEver's stored attachment prefix and inbox name" },
  { path: /^apps\/ios\/EdgeEver\/Data\/Models\/EdgeEverLegacyValues\.swift$/, reason: "iOS copy of EdgeEver's stored values" },
  { path: /^apps\/ios\/Tests\/EdgeEverTests\/EdgeEverLegacyValuesTests\.swift$/, reason: "tests that EdgeEver's stored values are still recognised" },
  // Xcode string catalogs hold English source strings with their translations.
  { path: /\.xcstrings$/, reason: "Xcode string catalog (translations)" },
  // Web-clipper code that reads Chinese websites, and its fixtures and tests.
  { path: /^apps\/extension\/fixtures\/platforms\//, reason: "captured pages from Chinese sites and Chinese-locale sessions of other sites" },
  { path: /^apps\/extension\/src\/(?:article-clip|boss-clip|capture-platform|capture-xhs|douban-clip|jike-clip|social-clip|tweet-clip|v2ex-clip|wechat-headings|xhs-clip|xiaoyuzhou-clip|xueqiu-clip|xueqiu-tag)\.ts$/, reason: "web-clipper site adapters that match Chinese page text and controls" },
  { path: /^apps\/extension\/(?:article-clip|platform-capture|platform-clip|platform-save|social-clip|tweet-clip|vertical-clip|xhs-clip|zhihu-clip)\.test\.mjs$/, reason: "site-adapter tests with Chinese page content" },
  { path: /^tests\/e2e\/web-clipper-(?:platforms|html-safety)\.spec\.ts$/, reason: "end-to-end clipping of Chinese sites" },
  // The WeChat chat importer parses WeChat's Chinese export format.
  { path: /^apps\/desktop\/src\/main\/wechat-(?:chat-archive|share-import)(?:\.test)?\.mjs$/, reason: "WeChat chat importer" },
  // Chinese font names, and font licence and attribution files.
  { path: /^packages\/shared\/src\/(?:font-catalog-data|poster-font-notices|note-image-font-notices|note-image-card)\.ts$/, reason: "Chinese font names" },
  { path: /^packages\/shared\/src\/note-image-assets\//, reason: "font licence and attribution files" },
  { path: /^packages\/shared\/src\/font-assets\/poster\/licenses\//, reason: "font licence files" },
  { path: /^apps\/web\/src\/assets\/fonts\/editor-body\/[^/]+\.txt$/, reason: "font licence text" },
  { path: /^apps\/web\/src\/lib\/poster-design\/vendor\/qiaomu\/(?:typeset\.ts|LICENSE|README\.md)$/, reason: "vendored poster templates: Chinese font family names and the upstream author's attribution" },
  { path: /^apps\/web\/src\/lib\/wechat-chat-import\.test\.mjs$/, reason: "WeChat chat importer tests" },
  // Example plugins ship a `locales: { "zh-CN": … }` block in the plugin manifest format.
  { path: /^apps\/web\/public\/extensions\/[^/]+\/manifest\.json$/, reason: "plugin manifest translations" },
  // Tests whose subject is CJK text handling: segmentation, search, measuring, rendering.
  { path: /^packages\/shared\/src\/(?:editor-link|markdown-strike|diagram-flowchart-style|diagram-mindmap-style|note-image-card|note-image-remote-fonts)\.test\.mjs$/, reason: "tests of CJK text handling" },
  { path: /^apps\/api\/src\/(?:mcp-management-tools|mcp-poster-tools|notebook-share-routes)\.test\.mjs$/, reason: "tests of CJK search and layout" },
  { path: /^tests\/e2e\/fixtures\/(?:mermaid-viewer\.js|note-image-(?:content\.ts|quality\.tsx))$/, reason: "Chinese text rendering samples" },
  { path: /^tests\/browser\/paper-list(?:-reference)?\.ts$/, reason: "Chinese poster layout compared against a reference" },
  { path: /^scripts\/public-notebook-site-plan-ablation\.mjs$/, reason: "CJK substring search check" },
  // Real third-party exports used as import fixtures; some file names are Chinese.
  { path: /^tests\/fixtures\/note-import\//, reason: "third-party note export fixtures" },
  { path: /^tests\/note-import\.integration\.test\.mjs$/, reason: "asserts the note-import fixtures" },
  // Historical records.
  { path: /^docs\/changes\/evidence\//, reason: "captured output from EdgeEver builds; rewriting it would falsify the record" },
  { path: /^release-summary\.json$/, reason: "release notes keyed by locale" },
  { path: /^tests\/english-source-guard\.test\.ts$/, reason: "this guard" },
];

const trackedFiles = () => {
  const result = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: root });
  if (result.exitCode !== 0) throw new Error(`git ls-files failed: ${result.stderr.toString()}`);
  return result.stdout.toString().split("\0").filter(Boolean);
};

const isScanned = (file: string) =>
  !binaryExtension.test(file)
  && !translationPath.test(file)
  && !exceptions.some((exception) => exception.path.test(file));

const findings = () => trackedFiles().filter(isScanned).flatMap((file) => {
  const path = join(root, file);
  if (!existsSync(path)) return [];
  const bytes = readFileSync(path);
  if (bytes.includes(0)) return [];
  return bytes.toString("utf8").split("\n").flatMap((line, index) => {
    if (!HAN.test(line)) return [];
    const remaining = line.replace(inlineTranslation, "");
    return HAN.test(remaining) ? [`${file}:${index + 1}: ${line.trim().slice(0, 160)}`] : [];
  });
});

describe("English source language", () => {
  test("Chinese text appears only in translations and justified exceptions", () => {
    expect(findings()).toEqual([]);
  }, 60_000);

  test("every exception still matches a tracked file", () => {
    const files = trackedFiles();
    const stale = exceptions.filter((exception) => !files.some((file) => exception.path.test(file)));
    expect(stale.map((exception) => exception.reason)).toEqual([]);
  });

  test("inline translations are recognised and other Chinese is not", () => {
    const strip = (line: string) => HAN.test(line.replace(inlineTranslation, ""));
    expect(strip('t("Save", zh: "保存", ja: "保存")')).toBe(false);
    expect(strip('{ "zh-CN": "等待分类", "en-US": "Inbox" }')).toBe(false);
    expect(strip('const label = "保存";')).toBe(true);
    expect(strip("// 保存草稿")).toBe(true);
  });
});
