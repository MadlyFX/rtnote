import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { extractFile } from "@electron/asar";
import { shouldConfigureDesktopUpdates } from "../apps/desktop/src/main/desktop-update-policy.mjs";

// Checks that a packaged RTNote desktop build disables automatic updates and
// bundles no update feed. Pass the unpacked resources directory, or let the
// script find it under release/desktop for the current platform.
const releaseRoot = "release/desktop";

const findResources = () => {
  if (process.argv[2]) return process.argv[2];
  if (process.platform === "win32") return join(releaseRoot, "win-unpacked", "resources");
  if (process.platform === "linux") return join(releaseRoot, "linux-unpacked", "resources");
  // macOS output folders are named mac, mac-arm64 or mac-universal.
  for (const folder of readdirSync(releaseRoot).filter((name) => name.startsWith("mac"))) {
    const apps = readdirSync(join(releaseRoot, folder)).filter((name) => name.endsWith(".app"));
    if (apps.length > 0) return join(releaseRoot, folder, apps[0], "Contents", "Resources");
  }
  throw new Error(`No packaged macOS app found under ${releaseRoot}`);
};

const resources = findResources();
const metadata = JSON.parse(extractFile(join(resources, "app.asar"), "package.json").toString());
assert.equal(metadata.edgeeverUpdatePolicy, "manual", "RTNote builds must disable automatic updates");
assert.equal(shouldConfigureDesktopUpdates({ packaged: true, updatePolicy: metadata.edgeeverUpdatePolicy }), false);
assert.equal(existsSync(join(resources, "app-update.yml")), false, "RTNote builds must not bundle an update feed");
console.log(`${resources}: manual updates, no update feed.`);
