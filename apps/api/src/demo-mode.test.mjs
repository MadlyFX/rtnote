import { describe, expect, test } from "bun:test";
import { hashPassword } from "./auth-crypto.ts";
import { resolvePublicDemoLogin } from "./demo-mode.ts";

describe("public demo login", () => {
  test("returns the plain demo password with the configured or default username", () => {
    expect(resolvePublicDemoLogin({ RTNOTE_DEMO_MODE: "true", RTNOTE_AUTH_PASSWORD: "try-it" }))
      .toEqual({ username: "admin", password: "try-it" });
    expect(resolvePublicDemoLogin({ RTNOTE_DEMO_MODE: "TRUE", RTNOTE_AUTH_USERNAME: " demo ", RTNOTE_AUTH_PASSWORD: "try-it" }))
      .toEqual({ username: "demo", password: "try-it" });
  });

  test("returns nothing outside demo mode or without a plain password", () => {
    expect(resolvePublicDemoLogin({ RTNOTE_AUTH_PASSWORD: "secret" })).toBeNull();
    expect(resolvePublicDemoLogin({ RTNOTE_DEMO_MODE: "false", RTNOTE_AUTH_PASSWORD: "secret" })).toBeNull();
    expect(resolvePublicDemoLogin({ RTNOTE_DEMO_MODE: "true" })).toBeNull();
  });

  test("returns nothing when a password hash takes precedence over the plain password", async () => {
    expect(resolvePublicDemoLogin({
      RTNOTE_DEMO_MODE: "true",
      RTNOTE_AUTH_PASSWORD: "stale",
      RTNOTE_AUTH_PASSWORD_HASH: await hashPassword("current"),
    })).toBeNull();
  });
});
