import { describe, expect, test } from "bun:test";
import { de } from "./de.ts";
import { enUS } from "./en-US.ts";
import { es } from "./es.ts";
import { fr } from "./fr.ts";
import { ja } from "./ja.ts";
import { pl } from "./pl.ts";
import { ru } from "./ru.ts";
import { zhCN } from "./zh-CN.ts";
import { zhTW } from "./zh-TW.ts";
import { supportedLocales } from "./locales.ts";

const collectKeys = (value, prefix = "") => {
  if (Array.isArray(value)) {
    if (value.some((item) => item && typeof item === "object")) {
      return value.flatMap((item, index) => collectKeys(item, `${prefix}[${index}]`));
    }
    return [`${prefix}#${value.length}`];
  }
  if (!value || typeof value !== "object") {
    return [prefix];
  }
  return Object.keys(value).flatMap((key) => collectKeys(value[key], prefix ? `${prefix}.${key}` : key));
};

// English (en-US) is the source language and the reference catalog: every
// other locale must have exactly its keys.
const translations = { "zh-CN": zhCN, "zh-TW": zhTW, ja, pl, ru, es, de, fr };

describe("shared i18n catalogs", () => {
  test("lists English first among the supported locales", () => {
    expect(supportedLocales).toEqual(["en-US", "zh-CN", "zh-TW", "ja", "pl", "ru", "es", "de", "fr"]);
  });

  test.each(Object.entries(translations))("%s has exactly the keys of the en-US reference catalog", (_locale, catalog) => {
    const reference = new Set(collectKeys(enUS));
    const keys = new Set(collectKeys(catalog));
    expect([...reference].filter((key) => !keys.has(key))).toEqual([]);
    expect([...keys].filter((key) => !reference.has(key))).toEqual([]);
  });

  test("translations are in their own language", () => {
    expect(zhCN.login.title).toContain("登录");
    expect(ja.login.title).toContain("サインイン");
    expect(zhTW.login.title).toContain("登入");
    expect(pl.login.title).toContain("Zaloguj");
    expect(ru.login.title).toContain("Вход");
    expect(es.login.title).toContain("Iniciar");
    expect(de.login.title).toContain("anmelden");
    expect(fr.login.title).toContain("connecter");
  });
});
