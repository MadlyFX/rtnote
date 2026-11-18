import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import extensionPackage from "./package.json";
import {
  buildExtensionManifest,
  FIREFOX_ADDON_ID,
  FIREFOX_ANDROID_MIN_VERSION,
  FIREFOX_MIN_VERSION,
} from "./manifest.ts";
import { platformGroups } from "./src/ui/platforms.ts";

describe("extension manifests", () => {
  test("keeps shared permissions and package version across targets", () => {
    for (const target of ["chromium", "firefox"]) {
      const manifest = buildExtensionManifest(target, extensionPackage.version);
      expect(manifest.version).toBe(extensionPackage.version);
      expect(manifest.permissions).toEqual(["activeTab", "contextMenus", "scripting", "storage", "declarativeNetRequestWithHostAccess"]);
      // China-only platforms are not advertised, so their hosts stay out of
      // the install-time permission prompt. Their capture code still runs
      // after a user-initiated save, through activeTab or optional access.
      expect(manifest.host_permissions).toEqual(["https://cdn.bsky.app/*"]);
      expect(manifest.optional_host_permissions).toEqual([
        "https://*/*",
        "http://*/*",
        "http://localhost/*",
        "http://127.0.0.1/*",
      ]);
      expect(manifest.content_scripts).toEqual([
        {
          matches: [
            "https://x.com/*",
            "https://www.x.com/*",
            "https://twitter.com/*",
            "https://www.twitter.com/*",
            "https://mobile.twitter.com/*",
          ],
          js: ["assets/tweet-target.js"],
          run_at: "document_start",
        },
        {
          matches: [
            "https://reddit.com/*",
            "https://www.reddit.com/*",
            "https://old.reddit.com/*",
            "https://new.reddit.com/*",
            "https://sh.reddit.com/*",
          ],
          js: ["assets/reddit-target.js"],
          run_at: "document_start",
        },
        {
          matches: [
            "https://www.facebook.com/*",
            "https://facebook.com/*",
            "https://m.facebook.com/*",
            "https://www.instagram.com/*",
            "https://instagram.com/*",
            "https://www.linkedin.com/*",
            "https://linkedin.com/*",
            "https://www.threads.com/*",
            "https://threads.com/*",
            "https://www.threads.net/*",
            "https://threads.net/*",
            "https://bsky.app/*",
          ],
          js: ["assets/social-target.js"],
          run_at: "document_start",
        },
      ]);
    }
  });

  test("does not advertise China-only platforms", () => {
    const hidden = /xiaohongshu|zhihu|douban|weixin|wechat|bilibili|juejin|xueqiu|zhipin|sspai|csdn|okjike|jike|v2ex|xiaoyuzhou|qpic/i;
    for (const target of ["chromium", "firefox"]) {
      const manifest = buildExtensionManifest(target, extensionPackage.version);
      expect(JSON.stringify(manifest)).not.toMatch(hidden);
    }
    const listed = platformGroups.flatMap((group) => group.platforms.map((platform) => `${platform.name} ${platform.icon}`));
    expect(listed.length).toBeGreaterThan(0);
    for (const entry of listed) expect(entry).not.toMatch(hidden);
  });

  test("uses a service worker for Chromium", () => {
    const manifest = buildExtensionManifest("chromium", extensionPackage.version);
    expect(manifest.background).toEqual({
      service_worker: "assets/background.js",
      type: "module",
    });
    expect("browser_specific_settings" in manifest).toBe(false);
  });

  test("uses an event-page module and required AMO disclosures for Firefox", () => {
    const manifest = buildExtensionManifest("firefox", extensionPackage.version);
    expect(manifest.background).toEqual({
      scripts: ["assets/background.js"],
      type: "module",
    });
    expect(manifest.browser_specific_settings).toEqual({
      gecko: {
        id: FIREFOX_ADDON_ID,
        strict_min_version: FIREFOX_MIN_VERSION,
        data_collection_permissions: {
          required: [
            "authenticationInfo",
            "browsingActivity",
            "websiteContent",
          ],
        },
      },
      gecko_android: {
        strict_min_version: FIREFOX_ANDROID_MIN_VERSION,
      },
    });
  });
});

describe("extension locales", () => {
  const localesDirectory = new URL("./public/_locales/", import.meta.url);
  const messages = (locale) => JSON.parse(readFileSync(new URL(`${locale}/messages.json`, localesDirectory), "utf8"));

  test("every locale ships the same message keys as English", () => {
    // A missing key silently falls back to English in the browser, so a new
    // feature must add its phrases to every locale.
    const english = Object.keys(messages("en")).sort();
    const locales = readdirSync(localesDirectory).filter((locale) => locale !== "en");
    expect(locales.length).toBeGreaterThan(0);
    for (const locale of locales) {
      expect({ locale, keys: Object.keys(messages(locale)).sort() }).toEqual({ locale, keys: english });
    }
  });
});
