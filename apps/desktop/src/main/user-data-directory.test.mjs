import { describe, expect, test } from "bun:test";
import { userDataDirectoryFromArguments } from "./user-data-directory.mjs";

describe("desktop user data directory", () => {
  test("reads the equals form", () => {
    expect(userDataDirectoryFromArguments(["RTNote", "--user-data-dir=/tmp/rtnote-profile"]))
      .toBe("/tmp/rtnote-profile");
  });

  test("reads the separate value form", () => {
    expect(userDataDirectoryFromArguments(["RTNote", "--user-data-dir", "/tmp/rtnote-profile"]))
      .toBe("/tmp/rtnote-profile");
  });

  test("ignores missing and empty values", () => {
    expect(userDataDirectoryFromArguments(["RTNote"])).toBe("");
    expect(userDataDirectoryFromArguments(["RTNote", "--user-data-dir="])).toBe("");
  });
});
