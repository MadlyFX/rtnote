import { describe, expect, test } from "bun:test";
import {
  getMemoSaveErrorReasonKey,
  isMemoEditBindingValid,
  isSuspiciousMemoOverwrite,
  SUSPICIOUS_MEMO_OVERWRITE_MESSAGE,
} from "./memo-safety.ts";
import { DEFAULT_MEMO_TITLE, LEGACY_DEFAULT_MEMO_TITLES } from "./memo-title.ts";

describe("isSuspiciousMemoOverwrite", () => {
  test("blocks the production incident shape", () => {
    expect(
      isSuspiciousMemoOverwrite(
        "Activate a UK giffgaff SIM",
        "o".repeat(550),
        "Reseller GPT region notes",
        "x".repeat(70)
      )
    ).toBe(true);
  });

  test("allows image-width-only saves", () => {
    expect(
      isSuspiciousMemoOverwrite("Same title", "body".repeat(150), "Same title", "body".repeat(150))
    ).toBe(false);
  });

  test("allows a title rename when content remains intact", () => {
    expect(
      isSuspiciousMemoOverwrite("Old title", "body".repeat(150), "New title", "body".repeat(145))
    ).toBe(false);
  });

  test("treats empty, RTNote and EdgeEver default titles as the same untitled title", () => {
    for (const [currentTitle, nextTitle] of [
      [LEGACY_DEFAULT_MEMO_TITLES[0], DEFAULT_MEMO_TITLE],
      ["", DEFAULT_MEMO_TITLE],
      [null, LEGACY_DEFAULT_MEMO_TITLES[0]],
    ]) {
      expect(isSuspiciousMemoOverwrite(currentTitle, "o".repeat(550), nextTitle, "x".repeat(70))).toBe(false);
    }
    expect(isSuspiciousMemoOverwrite(LEGACY_DEFAULT_MEMO_TITLES[0], "o".repeat(550), "Renamed", "x".repeat(70))).toBe(true);
  });

  test("does not interfere with short notes", () => {
    expect(isSuspiciousMemoOverwrite("Old title", "Short", "New title", "")).toBe(false);
  });
});

describe("isMemoEditBindingValid", () => {
  const current = { memoId: "memo_a", revision: 7, contentHash: "a".repeat(64) };
  const session = {
    id: "edit_1",
    memoId: "memo_a",
    baseRevision: 7,
    baseContentHash: "a".repeat(64),
  };
  const request = {
    editSessionId: "edit_1",
    memoId: "memo_a",
    expectedRevision: 7,
    expectedContentHash: "a".repeat(64),
  };

  test("accepts a fully bound save", () => {
    expect(isMemoEditBindingValid(current, session, request)).toBe(true);
  });

  test("rejects a session from another memo", () => {
    expect(isMemoEditBindingValid(current, { ...session, memoId: "memo_b" }, request)).toBe(false);
  });

  test("rejects a stale revision", () => {
    expect(isMemoEditBindingValid(current, session, { ...request, expectedRevision: 6 })).toBe(false);
  });

  test("rejects a stale content hash", () => {
    expect(isMemoEditBindingValid(current, session, { ...request, expectedContentHash: "b".repeat(64) })).toBe(false);
  });

  test("rejects a different edit-session id", () => {
    expect(isMemoEditBindingValid(current, session, { ...request, editSessionId: "edit_2" })).toBe(false);
  });
});

describe("getMemoSaveErrorReasonKey", () => {
  test("maps the suspicious overwrite rejection by code or by its server message", () => {
    const key = "editor.saveState.errorReason.suspiciousOverwrite";
    expect(getMemoSaveErrorReasonKey("suspicious_memo_overwrite")).toBe(key);
    expect(getMemoSaveErrorReasonKey(null, ` ${SUSPICIOUS_MEMO_OVERWRITE_MESSAGE} `)).toBe(key);
  });

  test("leaves other errors to their original message", () => {
    expect(getMemoSaveErrorReasonKey("memo_not_found", "Memo not found")).toBeNull();
    expect(getMemoSaveErrorReasonKey(null, null)).toBeNull();
  });
});
