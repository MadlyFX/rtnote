import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const HEX = /^#[0-9a-f]{6}$/i;
const PATH_KEYS = ["icon", "mark", "adaptiveIconForeground", "adaptiveIconTransparent"];
const COLOR_KEYS = ["tileColor", "manifestThemeColor", "manifestBackgroundColor"];

/**
 * Reads and checks brand.config.json, the single source for identity that is
 * baked into builds: installer and home-screen names, icon sources and colours.
 * Branding that changes without a rebuild lives on the server instead.
 */
export const readBrandConfig = (file = path.join(projectRoot, "brand.config.json")) => {
  const config = JSON.parse(readFileSync(file, "utf8"));
  const problems = [];
  for (const key of ["name", "shortName", "description"]) {
    if (typeof config[key] !== "string" || !config[key].trim()) problems.push(`${key} must be a non-empty string`);
  }
  if (typeof config.name === "string" && config.name.length > 48) problems.push("name must be at most 48 characters");
  if (typeof config.shortName === "string" && config.shortName.length > 12) problems.push("shortName must be at most 12 characters (home screens truncate longer names)");
  for (const key of COLOR_KEYS) {
    if (!HEX.test(config[key] ?? "")) problems.push(`${key} must be a #rrggbb colour`);
  }
  for (const key of PATH_KEYS) {
    if (typeof config[key] !== "string" || path.isAbsolute(config[key]) || config[key].split(/[\\/]/).includes("..")) {
      problems.push(`${key} must be a path inside the repository`);
    }
  }
  if (problems.length) throw new Error(`brand.config.json is invalid:\n- ${problems.join("\n- ")}`);
  return {
    ...config,
    tileColor: config.tileColor.toLowerCase(),
    manifestThemeColor: config.manifestThemeColor.toLowerCase(),
    manifestBackgroundColor: config.manifestBackgroundColor.toLowerCase(),
    paths: Object.fromEntries(PATH_KEYS.map((key) => [key, path.join(projectRoot, config[key])])),
  };
};
