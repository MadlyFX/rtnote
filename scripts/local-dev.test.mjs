import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildReadyBanner,
  getLocalDevelopmentProfile,
  inspectLocalD1,
} from "./local-dev.mjs";
import {
  buildAdbReverseArguments,
  parseAdbDevices,
} from "./mobile-dev.mjs";

describe("local development environment", () => {
  test("targets every online Android device for local API reverse forwarding", () => {
    const devices = parseAdbDevices([
      "List of devices attached",
      "emulator-5554\tdevice product:sdk_gphone64_arm64 model:sdk_gphone64_arm64",
      "emulator-5556\toffline",
      "R58M123456\tdevice usb:1-1",
      "",
    ].join("\n"));

    expect(devices).toEqual(["emulator-5554", "R58M123456"]);
    expect(buildAdbReverseArguments(devices[0], 8787)).toEqual([
      "-s",
      "emulator-5554",
      "reverse",
      "tcp:8787",
      "tcp:8787",
    ]);
  });

  test("keeps persistent development and resettable demo profiles isolated", () => {
    expect(getLocalDevelopmentProfile("local")).toMatchObject({
      statePath: ".wrangler/state",
      demoSeed: false,
    });
    expect(getLocalDevelopmentProfile("demo")).toMatchObject({
      statePath: ".wrangler/demo-state",
      demoSeed: true,
    });
    expect(getLocalDevelopmentProfile("local").statePath).not.toBe(
      getLocalDevelopmentProfile("demo").statePath,
    );
  });

  test("rejects unknown local development profiles", () => {
    expect(() => getLocalDevelopmentProfile("remote")).toThrow(
      "Unknown local development profile",
    );
  });

  test("renders a Demo banner", () => {
    const banner = buildReadyBanner(getLocalDevelopmentProfile("demo"));
    expect(banner).toContain("LOCAL DEMO ready");
    expect(banner).toContain("resettable demo data");
  });

  test("inspects a stopped WAL-mode D1 database", () => {
    const statePath = mkdtempSync(join(tmpdir(), "edgeever-local-dev-"));
    const directory = join(statePath, "v3/d1/miniflare-D1DatabaseObject");
    mkdirSync(directory, { recursive: true });
    const database = new Database(join(directory, "test.sqlite"), { create: true });
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY)");
    database.exec("INSERT INTO d1_migrations (id) VALUES (1)");
    database.close();

    try {
      expect(inspectLocalD1(statePath)).toEqual({
        databaseCount: 1,
        migrationCount: 1,
      });
    } finally {
      rmSync(statePath, { recursive: true, force: true });
    }
  });

});
