import assert from "node:assert/strict";

// Check the actual archive, not just the configured globs. Dependency collection
// has separate filtering in electron-builder and must obey the same exclusions.
export const assertDesktopProductionFiles = (files) => {
  const paths = [...files].map((file) => file.replaceAll("\\", "/"));
  const unwanted = paths.filter((file) =>
    /\.(?:test|spec)\.(?:js|cjs|mjs|ts|cts|mts)$/.test(file)
    || /\/(?:test|tests|__tests__|__mocks__)\//.test(file)
    || /\.map$/.test(file)
    || /\.d\.(?:ts|cts|mts)$/.test(file)
    || /\/node_modules\/zod\/src\//.test(file),
  );
  assert.deepEqual(unwanted, [], "Desktop archive contains test or development files");
  for (const required of [
    "/src/main/index.mjs",
    "/src/preload/index.cjs",
    "/node_modules/zod/index.js",
    "/node_modules/zod/index.cjs",
    "/node_modules/electron-updater/out/main.js",
  ]) {
    assert.ok(paths.includes(required), `Desktop archive is missing runtime file: ${required}`);
  }
};
