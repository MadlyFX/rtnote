/**
 * Writes brand.config.json into the platform files that cannot read it at
 * build time: the Android app name and icon background, and the iOS display
 * name. `--check` only reports drift and exits non-zero, for CI.
 *
 * App ids, bundle ids, URL schemes and the desktop product name are left
 * alone on purpose: changing them breaks updates and installs side by side.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { projectRoot, readBrandConfig } from "./brand-config.mjs";

const xmlEscape = (text) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
const yamlString = (text) => /^[A-Za-z0-9 ._-]+$/.test(text) && !/^\s|\s$/.test(text) ? text : JSON.stringify(text);

/** Each target returns the file's new text for a config; unchanged text means no drift. */
export const brandTargets = [
  {
    file: "apps/mobile/app.json",
    // Edited as text so the file keeps its hand formatting. The only background
    // colours in app.json are the adaptive icon and the splash screen, both the tile.
    update: (text, config) => text
      .replace(/^(  "expo": \{\s*\n\s*"name": )"[^"]*"/m, (_match, prefix) => `${prefix}${JSON.stringify(config.name)}`)
      .replace(/("backgroundColor": )"#[0-9A-Fa-f]{6}"/g, (_match, prefix) => `${prefix}"${config.tileColor.toUpperCase()}"`),
  },
  {
    file: "apps/ios/project.yml",
    update: (text, config) => text
      .replace(/^(\s*CFBundleDisplayName:).*$/m, `$1 ${yamlString(config.name)}`)
      .replace(/^(\s*CFBundleName:).*$/m, `$1 ${yamlString(config.shortName)}`),
  },
  {
    file: "apps/ios/RTNote/Resources/Info.plist",
    update: (text, config) => text
      .replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${xmlEscape(config.name)}$2`)
      .replace(/(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${xmlEscape(config.shortName)}$2`),
  },
];

export const applyBrandConfig = ({ check = false, config = readBrandConfig() } = {}) => {
  const drift = [];
  for (const target of brandTargets) {
    const file = path.join(projectRoot, target.file);
    const current = readFileSync(file, "utf8");
    const next = target.update(current, config);
    if (next === current) continue;
    drift.push(target.file);
    if (!check) writeFileSync(file, next);
  }
  return drift;
};

if (import.meta.main) {
  const check = process.argv.includes("--check");
  const drift = applyBrandConfig({ check });
  if (check && drift.length) {
    console.error(`[brand] these files do not match brand.config.json; run bun run prepare:brand:\n- ${drift.join("\n- ")}`);
    process.exit(1);
  }
  console.log(drift.length ? `[brand] updated ${drift.join(", ")}` : "[brand] platform files already match brand.config.json");
}
