import { getMemoSaveErrorReasonKey, DEFAULT_MEMO_TITLE, isDefaultMemoTitle } from "@edgeever/shared";
import { de, enUS, es, fr, ja, pl, ru, zhCN, zhTW } from "@edgeever/shared/i18n";
import { resolveSupportedLocale } from "@edgeever/shared/i18n/locales";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mobileDe } from "./i18n/de";
import { mobileEs } from "./i18n/es";
import { mobileFr } from "./i18n/fr";
import { mobileJa } from "./i18n/ja";
import { mobilePl } from "./i18n/pl";
import { mobileRu } from "./i18n/ru";
import { mobileZhCN } from "./i18n/zh-CN";
import { mobileZhTW } from "./i18n/zh-TW";
import { MOBILE_SHARED_TEMPLATE_KEYS } from "./mobile-shared-templates";
import {
  readMobileLocalePreference,
  writeMobileLocalePreference,
  type MobileLocalePreference,
} from "./preferences";

type SupportedMobileLocale = "zh-CN" | "zh-TW" | "en-US" | "es" | "de" | "fr" | "ja" | "pl" | "ru";
export type MobileLocale = SupportedMobileLocale;
type TranslatedMobileLocale = Exclude<SupportedMobileLocale, "en-US">;
type MobileLocaleContextValue = {
  preference: MobileLocalePreference;
  resolvedLocale: SupportedMobileLocale;
  setPreference: (preference: MobileLocalePreference) => void;
  translate: (value: string) => string;
};

type TranslationPair = { source: string; target: string; pattern?: RegExp; placeholders?: string[] };

const flattenStrings = (value: unknown, prefix = "", output = new Map<string, string>()) => {
  if (typeof value === "string") {
    output.set(prefix, value);
    return output;
  }
  if (!value || typeof value !== "object") {
    return output;
  }
  for (const [key, child] of Object.entries(value)) {
    flattenStrings(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Count placeholders only match numbers, so "{{count}} notes" leaves a title like "Meeting notes" alone.
const NUMERIC_PLACEHOLDERS = new Set(["count", "loaded", "total", "revision"]);
const createTranslationPair = (source: string, target: string): TranslationPair => {
  const placeholders: string[] = [];
  const patternSource = escapeRegExp(source).replace(/\\\{\\\{(\w+)\\\}\\\}/g, (_match, placeholder: string) => {
    placeholders.push(placeholder);
    return NUMERIC_PLACEHOLDERS.has(placeholder) ? "(\\d[\\d.,\\s]*?)" : "(.+?)";
  });
  return {
    source,
    target,
    pattern: placeholders.length > 0 ? new RegExp(`^${patternSource}$`) : undefined,
    placeholders,
  };
};

const enStrings = flattenStrings(enUS);

/**
 * English catalog text paired with the same catalog key in the target locale.
 * When several keys share one English text, the most common translation wins.
 * Only the listed template keys are used: English templates such as
 * "Open {{name}}" would otherwise rewrite ordinary sentences and note titles.
 */
const buildCatalogPairs = (targets: Map<string, string>) => {
  const exactVotes = new Map<string, Map<string, number>>();
  const templates: TranslationPair[] = [];
  for (const [key, source] of enStrings) {
    const target = targets.get(key);
    if (!target || source === target) continue;
    if (source.includes("{{")) {
      if (MOBILE_SHARED_TEMPLATE_KEYS.has(key)) templates.push(createTranslationPair(source, target));
      continue;
    }
    const votes = exactVotes.get(source) ?? new Map<string, number>();
    votes.set(target, (votes.get(target) ?? 0) + 1);
    exactVotes.set(source, votes);
  }
  const exact = new Map<string, string>();
  for (const [source, votes] of exactVotes) {
    let best = "";
    let bestCount = 0;
    for (const [target, count] of votes) {
      if (count > bestCount) {
        best = target;
        bestCount = count;
      }
    }
    exact.set(source, best);
  }
  return { exact, templates };
};

type LocaleTable = {
  exact: Map<string, string>;
  templates: TranslationPair[];
  /** Locale to try when this one has no translation. */
  fallback?: TranslatedMobileLocale;
};

/**
 * Android-only copy wins over the shared catalog, and specific templates win
 * over broader ones (longer sources are tried first).
 */
const buildLocaleTable = (
  mobileOnly: Readonly<Record<string, string>>,
  catalog: unknown,
  fallback?: TranslatedMobileLocale,
): LocaleTable => {
  const catalogPairs = buildCatalogPairs(flattenStrings(catalog));
  const mobilePairs = Object.entries(mobileOnly).map(([source, target]) => createTranslationPair(source, target));
  const exact = catalogPairs.exact;
  for (const pair of mobilePairs) {
    if (!pair.pattern) exact.set(pair.source, pair.target);
  }
  const templates = [
    ...mobilePairs.filter((pair) => pair.pattern),
    ...catalogPairs.templates,
  ].sort((left, right) => right.source.length - left.source.length);
  return { exact, templates, fallback };
};

const localeTableBuilders: Record<TranslatedMobileLocale, () => LocaleTable> = {
  "zh-CN": () => buildLocaleTable(mobileZhCN, zhCN),
  // Traditional Chinese used to show the Simplified Chinese source when it had no translation; it still does.
  "zh-TW": () => buildLocaleTable(mobileZhTW, zhTW, "zh-CN"),
  ja: () => buildLocaleTable(mobileJa, ja),
  pl: () => buildLocaleTable(mobilePl, pl),
  ru: () => buildLocaleTable(mobileRu, ru),
  es: () => buildLocaleTable(mobileEs, es),
  de: () => buildLocaleTable(mobileDe, de),
  fr: () => buildLocaleTable(mobileFr, fr),
};
const localeTables = new Map<TranslatedMobileLocale, LocaleTable>();
// Each table is built on first use so startup does not pay for locales nobody reads.
const getLocaleTable = (locale: TranslatedMobileLocale) => {
  let table = localeTables.get(locale);
  if (!table) {
    table = localeTableBuilders[locale]();
    localeTables.set(locale, table);
  }
  return table;
};

type LocalizedCatalog<T> = { readonly [K in keyof T]: T[K] extends string ? string : LocalizedCatalog<T[K]> };
export type MobileCatalog = LocalizedCatalog<typeof enUS>;

// Typing every locale against the English shape makes a missing key a compile error.
const mobileCatalogs: Record<SupportedMobileLocale, MobileCatalog> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "en-US": enUS,
  es,
  de,
  fr,
  ja,
  pl,
  ru,
};

export const getMobileCatalog = (locale: SupportedMobileLocale): MobileCatalog => mobileCatalogs[locale];

export const formatMobileCopy = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

const resolveSystemLocale = (): SupportedMobileLocale =>
  resolveSupportedLocale(Intl.DateTimeFormat().resolvedOptions().locale);

const applyTemplateTranslations = (value: string, pairs: TranslationPair[]) => {
  for (const pair of pairs) {
    const match = pair.pattern?.exec(value);
    if (!match) {
      continue;
    }
    return (pair.placeholders ?? []).reduce(
      (translated, placeholder, index) => translated.replace(`{{${placeholder}}}`, match[index + 1] ?? ""),
      pair.target,
    );
  }
  return null;
};

const translateWithTable = (value: string, locale: TranslatedMobileLocale): string | null => {
  const table = getLocaleTable(locale);
  const translated = table.exact.get(value) ?? applyTemplateTranslations(value, table.templates);
  if (translated !== null) return translated;
  return table.fallback ? translateWithTable(value, table.fallback) : null;
};

const MAX_CACHED_TRANSLATIONS = 2000;
const translationCache = new Map<string, string>();

/**
 * Translates English source copy into the given locale. English, and text with
 * no translation (including user content), is returned unchanged.
 */
export const translateMobileText = (value: string, locale: SupportedMobileLocale) => {
  if (locale === "en-US" || !value.trim()) {
    return value;
  }
  const cacheKey = `${locale}\u0000${value}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const translated = translateWithTable(value, locale) ?? value;
  if (translationCache.size >= MAX_CACHED_TRANSLATIONS) translationCache.clear();
  translationCache.set(cacheKey, translated);
  return translated;
};

let currentResolvedMobileLocale: SupportedMobileLocale = resolveSystemLocale();
export const translateCurrentMobileText = (value: string) => translateMobileText(value, currentResolvedMobileLocale);

/** Maps a known server sync error to the catalog's English text so the localized components translate it. */
export const toMobileSyncErrorSourceText = (message: string | null) => {
  const key = message ? getMemoSaveErrorReasonKey(null, message) : null;
  return (key && enStrings.get(key)) || message;
};

export const localizeUntitledMemoTitle = (
  title: string | null | undefined,
  locale: SupportedMobileLocale,
) => {
  if (!isDefaultMemoTitle(title)) {
    return (title ?? "").trim();
  }
  return translateMobileText(DEFAULT_MEMO_TITLE, locale);
};

export const localizeMissingNotebookName = (locale: SupportedMobileLocale) =>
  translateMobileText("Uncategorized", locale);

const MobileLocaleContext = createContext<MobileLocaleContextValue>({
  preference: "system",
  resolvedLocale: resolveSystemLocale(),
  setPreference: () => undefined,
  translate: (value) => value,
});

export const MobileLocaleProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<MobileLocalePreference>("system");

  useEffect(() => {
    let active = true;
    void readMobileLocalePreference().then((storedPreference) => {
      if (active) {
        setPreferenceState(storedPreference);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const resolvedLocale = preference === "system" ? resolveSystemLocale() : preference;
  currentResolvedMobileLocale = resolvedLocale;
  const value = useMemo<MobileLocaleContextValue>(
    () => ({
      preference,
      resolvedLocale,
      setPreference: (nextPreference) => {
        setPreferenceState(nextPreference);
        void writeMobileLocalePreference(nextPreference);
      },
      translate: (text) => translateMobileText(text, resolvedLocale),
    }),
    [preference, resolvedLocale]
  );

  return <MobileLocaleContext.Provider value={value}>{children}</MobileLocaleContext.Provider>;
};

export const useMobileLocale = () => useContext(MobileLocaleContext);
