import { describe, expect, test } from "bun:test";
import {
  isMountedDiskImageVolume,
  isMountedInstallerPath,
  mountedInstallerCandidates,
} from "./installation-location.mjs";

describe("macOS installation location", () => {
  test("recognizes an app launched from a mounted volume", () => {
    expect(isMountedInstallerPath("/Volumes/RTNote/RTNote.app/Contents/Resources/app.asar", "darwin")).toBe(true);
  });

  test("does not reject the installed Applications copy", () => {
    expect(isMountedInstallerPath("/Applications/RTNote.app/Contents/Resources/app.asar", "darwin")).toBe(false);
  });

  test("does not apply the macOS rule on other platforms", () => {
    expect(isMountedInstallerPath("/Volumes/RTNote/RTNote.app/Contents/Resources/app.asar", "win32")).toBe(false);
  });

  test("builds safe installer candidates for mounted volumes", () => {
    expect(mountedInstallerCandidates(["RTNote Installer", "External Disk"])).toEqual([
      {
        volumePath: "/Volumes/RTNote Installer",
        appPath: "/Volumes/RTNote Installer/RTNote.app",
      },
      {
        volumePath: "/Volumes/External Disk",
        appPath: "/Volumes/External Disk/RTNote.app",
      },
    ]);
  });

  test("rejects invalid mounted volume names", () => {
    expect(mountedInstallerCandidates(["", "../escape", null])).toEqual([]);
  });

  test("only identifies exact disk image mount points", () => {
    const output = [
      "/dev/disk7\tGUID_partition_scheme",
      "/dev/disk7s1\tApple_HFS\t/Volumes/RTNote Installer",
    ].join("\n");
    expect(isMountedDiskImageVolume(output, "/Volumes/RTNote Installer")).toBe(true);
    expect(isMountedDiskImageVolume(output, "/Volumes/RTNote")).toBe(false);
  });
});
