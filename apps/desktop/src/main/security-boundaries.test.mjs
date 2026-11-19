import { expect, test } from "bun:test";
import { resourceResponseHeaders } from "./resource-url.mjs";
import { isAllowedAppNavigation } from "./window-open-policy.mjs";
import { credentialForUrl, decodeSessionCredential, encodeSessionCredential } from "./session-credential.mjs";
import { validateAiProviderUrl } from "./ai-direct.mjs";
import { createPublicLookup } from "@rtnote/public-network/node";

test("privileged window cannot navigate to resource documents or origin-prefix spoofs", () => {
  for (const app of ["http://127.0.0.1:5173/", "rtnote-app://app/index.html", "file:///app/web/index.html"]) {
    expect(isAllowedAppNavigation(app, app)).toBe(true);
    for (const target of ["http://127.0.0.1:5173@evil.example/", "http://127.0.0.1:51730/", "rtnote-app://app.evil/index.html", "rtnote-resource://resource/html", "rtnote-staged://html", "file:///etc/passwd"]) {
      expect(isAllowedAppNavigation(target, app)).toBe(false);
    }
  }
});

test("resource responses never inline HTML documents, including MIME variants", () => {
  for (const type of ["text/html", "Text/HTML; charset=utf-8", "application/xhtml+xml", "text/plain", "application/octet-stream"]) {
    const headers = resourceResponseHeaders(type);
    expect(headers.get("content-type")).toBe("application/octet-stream");
    expect(headers.get("content-disposition")).toBe("attachment");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("content-security-policy")).toContain("sandbox");
  }
  for (const type of ["image/png", "application/pdf", "video/mp4", "audio/mpeg"]) {
    expect(resourceResponseHeaders(type).get("content-type")).toBe(type);
    expect(resourceResponseHeaders(type).get("content-disposition")).toBeNull();
    expect(resourceResponseHeaders(type, 'attachment; filename="test"').get("content-disposition")).toContain("test");
  }
});

test("legacy credentials migrate to an origin-bound record and cannot follow an instance switch", () => {
  const previous = decodeSessionCredential("legacy-test-token", "https://notes.example.org");
  expect(credentialForUrl(previous.token, previous.origin, "https://notes.example.org/api/v1")).toBe("legacy-test-token");
  const restored = decodeSessionCredential(encodeSessionCredential(previous.token, previous.origin), "https://attacker.example.org");
  expect(credentialForUrl(restored.token, restored.origin, "https://attacker.example.org/blob")).toBe("");
  expect(credentialForUrl(restored.token, restored.origin, "http://notes.example.org/blob")).toBe("");
  expect(credentialForUrl(restored.token, restored.origin, "https://notes.example.org:8443/blob")).toBe("");
  expect(decodeSessionCredential('{"version":99}', previous.origin).token).toBe("");
});

test("AI accepts configured private endpoints while plugin DNS remains public-only", async () => {
  for (const host of ["[::ffff:127.0.0.1]", "[::ffff:169.254.169.254]", "[::ffff:10.0.0.5]", "localhost.", "service.internal", "service.local", "localhost", "127.0.0.1"]) {
    expect(validateAiProviderUrl(`https://${host}/v1`).protocol).toBe("https:");
  }
  const lookup = createPublicLookup((_host, _options, callback) => callback(null, [{ address: "127.0.0.1", family: 4 }]));
  await expect(new Promise((resolve, reject) => lookup("provider.example.org", {}, (error, address) => error ? reject(error) : resolve(address))))
    .rejects.toThrow(/public addresses/);
  const mixed = createPublicLookup((_host, _options, callback) => callback(null, [{ address: "8.8.8.8", family: 4 }, { address: "::ffff:127.0.0.1", family: 6 }]));
  await expect(new Promise((resolve, reject) => mixed("provider.example.org", {}, (error, address) => error ? reject(error) : resolve(address))))
    .rejects.toThrow(/public addresses/);
});

test("SVG previews retain MIME and sandbox scripts and external resources", () => {
  for (const type of ["image/svg+xml", "IMAGE/SVG+XML; charset=utf-8"]) {
    const headers = resourceResponseHeaders(type);
    expect(headers.get("content-type")).toBe("image/svg+xml");
    expect(headers.get("content-disposition")).toBeNull();
    expect(headers.get("content-security-policy")).toBe("default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; sandbox");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(resourceResponseHeaders(type, 'attachment; filename="original.svg"').get("content-disposition")).toContain("original.svg");
  }
});
