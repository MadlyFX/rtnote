import { describe, expect, test } from "bun:test";
import { DEFAULT_MEMO_TITLE, LEGACY_DEFAULT_MEMO_TITLES } from "@rtnote/shared";
import { ja, zhCN, zhTW } from "@rtnote/shared/i18n";
import { mobileDe } from "./i18n/de.ts";
import { mobileEs } from "./i18n/es.ts";
import { mobileFr } from "./i18n/fr.ts";
import { mobileJa } from "./i18n/ja.ts";
import { mobilePl } from "./i18n/pl.ts";
import { mobileRu } from "./i18n/ru.ts";
import { mobileZhCN } from "./i18n/zh-CN.ts";
import { mobileZhTW } from "./i18n/zh-TW.ts";
import { formatMobileCopy, getMobileCatalog, localizeMissingNotebookName, localizeUntitledMemoTitle, toMobileSyncErrorSourceText, translateMobileText } from "./mobile-locale.tsx";

const mobileMaps = { "zh-CN": mobileZhCN, "zh-TW": mobileZhTW, ja: mobileJa, pl: mobilePl };
const HAN = /\p{Script=Han}/u;

describe("mobile locale translation", () => {
  test("keeps English source copy unchanged for English", () => {
    expect(translateMobileText("Syncing your notes", "en-US")).toBe("Syncing your notes");
    expect(translateMobileText("Choose from library", "en-US")).toBe("Choose from library");
  });

  test("returns text without a translation unchanged", () => {
    expect(translateMobileText("Quarterly planning", "zh-CN")).toBe("Quarterly planning");
    expect(translateMobileText("Source: https://example.com", "ja")).toBe("Source: https://example.com");
  });

  test("translates every Android-only string from the i18n files", () => {
    for (const [locale, map] of Object.entries(mobileMaps)) {
      const wrong = Object.entries(map)
        .filter(([source]) => !source.includes("{{"))
        .filter(([source, target]) => translateMobileText(source, locale) !== target)
        .map(([source]) => source);
      expect({ locale, wrong }).toEqual({ locale, wrong: [] });
    }
  });

  test("keeps a translation for every string the Chinese-keyed maps covered", () => {
    // Before English became the source, the mobile-only maps held 231 Chinese strings
    // with 229 distinct English translations (two pairs of synonyms shared one).
    for (const map of Object.values(mobileMaps)) {
      expect(Object.keys(map).length).toBeGreaterThanOrEqual(229);
    }
  });

  test("translates the buttons, statuses and errors shown on Android", () => {
    // These literals reach users through LocalizedText, Alert and Pressable,
    // which only translate copy that has a dictionary entry.
    const copy = [
      "OK", "Sign in", "Could not delete", "Deleting", "Restoring", "Could not restore", "Could not create", "Please try again",
      "Check your network and try again", "Cannot reach the instance right now. Try again later.", "Try a different keyword",
      "No matching notes", "Retry loading", "Create a notebook first", "Could not upload the attachment", "Saving", "Preparing",
      "Local draft", "Not saved", "The note data is missing, so the rich text editor cannot open.", "Could not load the note",
      "Starts editing and moves focus to the title", "Edit note title", "Change the note's notebook",
      "Select a version to preview and restore it.", "The attachment cannot be read right now.",
      "The resource cannot be read right now.", "Wait for the note to finish syncing.", "Could not read the resource",
      "Download canceled", "This device cannot open the system share sheet",
      "Signed in, but the server did not return a mobile session. Make sure the server is updated to a version that supports app sign-in.",
    ];
    // Japanese and Polish write "OK" the same way as English.
    const sameAsEnglish = new Set(["OK"]);
    for (const locale of Object.keys(mobileMaps)) {
      const untranslated = copy.filter((value) => translateMobileText(value, locale) === value
        && !(["ja", "pl"].includes(locale) && sameAsEnglish.has(value)));
      expect({ locale, untranslated }).toEqual({ locale, untranslated: [] });
    }
    expect(translateMobileText("Sign in", "pl")).toBe("Zaloguj się");
    expect(translateMobileText("Sign in", "zh-TW")).toBe(mobileZhTW["Sign in"]);
    expect(translateMobileText("Cancel", "zh-CN")).toBe(zhCN.common.cancel);
  });

  test("prefers specific mobile-only templates over broader templates", () => {
    expect(translateMobileText("Loaded 12 of 40 notes", "en-US")).toBe("Loaded 12 of 40 notes");
    expect(translateMobileText("Loaded 12 of 40 notes", "zh-CN"))
      .toBe(formatMobileCopy(mobileZhCN["Loaded {{loaded}} of {{total}} notes"], { loaded: 12, total: 40 }));
    expect(translateMobileText("Loaded 12 of 40 notes", "pl")).toBe("Wczytane notatki: 12 z 40");
    expect(translateMobileText("Filter: Przypięte · 3 notes", "pl")).toBe("Filtr: Przypięte · notatki: 3");
  });

  test("uses shared translations for the descendant preference", () => {
    expect(translateMobileText("Show notes from sub-notebooks", "ja")).toBe(ja.settings.showDescendantNotesTitle);
    expect(translateMobileText("Show notes from sub-notebooks", "zh-CN")).toBe(zhCN.settings.showDescendantNotesTitle);
  });

  test("translates the hidden sub-notebook notes hint", () => {
    const template = "Its sub-notebooks still contain {{count}} notes. Open a sub-notebook to see them, or turn on \"Show notes from sub-notebooks\" in Settings.";
    const hint = formatMobileCopy(template, { count: 5 });
    expect(translateMobileText(hint, "ja")).toBe(formatMobileCopy(mobileJa[template], { count: 5 }));
    expect(translateMobileText(hint, "zh-CN")).toBe(formatMobileCopy(mobileZhCN[template], { count: 5 }));
    expect(translateMobileText(hint, "pl"))
      .toBe("Notatki w podnotatnikach: 5. Otwórz podnotatnik, aby je zobaczyć, lub włącz w ustawieniach opcję „Pokazuj notatki z podnotatników”.");
  });

  test("prefers specific shared templates over broader mobile-only templates", () => {
    expect(translateMobileText("Delete 3 notes permanently", "zh-CN"))
      .toBe(formatMobileCopy(zhCN.dialogs.memoDelete.permanentBulkTitle, { count: 3 }));
    expect(translateMobileText("Current: Inbox", "zh-TW")).toBe(formatMobileCopy(zhTW.notebookTree.current, { name: "Inbox" }));
  });

  test("does not let broad English templates rewrite ordinary text", () => {
    // "{{count}} notes" and "Open {{name}}" exist in the shared catalog.
    expect(translateMobileText("Meeting notes", "zh-CN")).toBe("Meeting notes");
    expect(translateMobileText("Open questions", "ru")).toBe("Open questions");
    expect(translateMobileText("Cancel subscription", "zh-CN")).toBe("Cancel subscription");
    expect(translateMobileText("12 notes", "zh-CN")).toBe(formatMobileCopy(mobileZhCN["{{count}} notes"], { count: 12 }));
  });

  test("localizes only the default untitled title and the missing-notebook fallback", () => {
    expect(localizeUntitledMemoTitle("", "en-US")).toBe("Untitled note");
    expect(localizeUntitledMemoTitle(DEFAULT_MEMO_TITLE, "en-US")).toBe("Untitled note");
    // RTNote stored a Chinese default title; it still counts as untitled.
    expect(localizeUntitledMemoTitle(LEGACY_DEFAULT_MEMO_TITLES[0], "en-US")).toBe("Untitled note");
    expect(localizeUntitledMemoTitle(LEGACY_DEFAULT_MEMO_TITLES[0], "ja")).toBe(ja.common.untitledMemo);
    expect(localizeUntitledMemoTitle(`  ${DEFAULT_MEMO_TITLE}  `, "zh-CN")).toBe(zhCN.common.untitledMemo);
    expect(localizeUntitledMemoTitle("Meeting notes", "zh-CN")).toBe("Meeting notes");
    expect(localizeMissingNotebookName("en-US")).toBe("Uncategorized");
    expect(localizeMissingNotebookName("pl")).toBe("Nieprzypisane");
    expect(localizeMissingNotebookName("ru")).toBe("Без блокнота");
    expect(localizeMissingNotebookName("es")).toBe("Sin clasificar");
    expect(localizeMissingNotebookName("de")).toBe("Ohne Kategorie");
    expect(localizeMissingNotebookName("fr")).toBe("Non classé");
    expect(localizeMissingNotebookName("ja")).toBe(mobileJa.Uncategorized);
    expect(localizeMissingNotebookName("zh-TW")).toBe(mobileZhTW.Uncategorized);
    expect(localizeMissingNotebookName("zh-CN")).toBe(mobileZhCN.Uncategorized);
    for (const map of [mobileRu, mobileEs, mobileDe, mobileFr]) expect(map.Uncategorized).toBeDefined();
  });

  test("translates accessibility label templates for every locale", () => {
    expect(translateMobileText("Edit note title: Plan", "pl")).toBe("Edytuj tytuł notatki: Plan");
    expect(translateMobileText("Create tag praca", "pl")).toBe("Utwórz tag praca");
    expect(translateMobileText("Tag praca", "zh-CN")).toBe(formatMobileCopy(mobileZhCN["Tag {{name}}"], { name: "praca" }));
    expect(translateMobileText("Ustawienia, update available", "pl")).toBe("Ustawienia, dostępna aktualizacja");
    expect(translateMobileText("Create tag x", "ja")).toBe(formatMobileCopy(mobileJa["Create tag {{name}}"], { name: "x" }));
    expect(translateMobileText("Select Plan", "de")).toBe("Plan auswählen");
  });

  test("reads native copy from the shared catalog for every locale", () => {
    expect(getMobileCatalog("pl").mobile.update.title).toBe("Aktualizacje aplikacji");
    expect(getMobileCatalog("ja").mobile.update.title).toBe("アプリのアップデート");
    expect(getMobileCatalog("en-US").mobile.update.title).toBe("App updates");
    expect(getMobileCatalog("zh-CN").mobile.update.title).toMatch(HAN);
    expect(getMobileCatalog("zh-TW").mobile.update.title).toMatch(HAN);
    expect(getMobileCatalog("es").mobile.update.title).toBe("Actualizaciones de la app");
    expect(getMobileCatalog("de").mobile.update.title).toBe("App-Updates");
    expect(getMobileCatalog("fr").mobile.update.title).toBe("Mises à jour de l'application");
    expect(formatMobileCopy(getMobileCatalog("pl").mobile.login.serverError, { status: 503 }))
      .toBe("Instancja zwróciła błąd serwera (HTTP 503).");
    expect(formatMobileCopy("{{known}} {{missing}}", { known: "a" })).toBe("a {{missing}}");
  });

  test("localizes the suspicious overwrite sync error the server reports in English", () => {
    const source = toMobileSyncErrorSourceText("Save blocked because the title changed while most of the note content disappeared.");
    expect(source).toStartWith("Save blocked: the title changed");
    expect(translateMobileText(source, "en-US")).toBe(source);
    expect(translateMobileText(source, "pl")).toStartWith("Zapis zablokowany");
    expect(translateMobileText(source, "zh-CN")).toMatch(HAN);
    expect(toMobileSyncErrorSourceText("Network request failed")).toBe("Network request failed");
    expect(toMobileSyncErrorSourceText(null)).toBeNull();
  });
});
