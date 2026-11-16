// Run using the packaged Electron executable with ELECTRON_RUN_AS_NODE=1.
// This exercises only temporary files, without launching the app or its updater.
const assert = require("node:assert/strict");
const { realpathSync } = require("node:fs");
const { createRequire } = require("node:module");
const { dirname, join, resolve, sep } = require("node:path");
const { pathToFileURL } = require("node:url");

async function main() {
  const archive = realpathSync(resolve(process.argv[2]));
  const appRequire = createRequire(join(archive, "package.json"));
  const resolveDependency = (name) => {
    const file = appRequire.resolve(name);
    assert.ok(file.startsWith(archive + sep), `${name} resolved outside packaged archive: ${file}`);
    return file;
  };
  const zod = appRequire(resolveDependency("zod"));
  assert.equal(zod.z.string().parse("packaged"), "packaged");
  const esmZod = await import(pathToFileURL(join(dirname(resolveDependency("zod/package.json")), "index.js")).href);
  assert.equal(esmZod.z.string().parse("packaged"), "packaged");
  const updater = appRequire(resolveDependency("electron-updater"));
  for (const name of ["MacUpdater", "NsisUpdater", "AppImageUpdater"]) {
    assert.equal(typeof updater[name], "function", `Missing updater: ${name}`);
  }
  console.log(JSON.stringify({ ok: true, packagedDependencies: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
