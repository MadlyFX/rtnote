import { prefersChineseContent } from "./bilingual-content-locale";

/**
 * Decorative labels of the magazine cover and section outline, shown in the editor and
 * in the WeChat publish copy. Authored in English with a Simplified Chinese variant;
 * Chinese UI locales get the Chinese labels, every other locale the English ones.
 * `{{count}}` and `{{number}}` are replaced by the caller.
 */
const MAGAZINE_CHROME_COPY = {
  sectionFallback: { en: "Section {{number}}", zh: "章节 {{number}}" },
  coverTitleFallback: { en: "An in-depth, structured guide", zh: "深度实测与结构化指南" },
  topTagFallback: { en: "HANDS-ON · DEEP DIVE", zh: "实测 · 深度梳理" },
  subtitleWithSections: { en: "{{count}} key sections, from the big picture to the key details", zh: "{{count}} 个核心章节，从全局脉络到关键细节完整拆解" },
  subtitleFallback: { en: "A structured overview with practical takeaways", zh: "结构化核心脉络与实战要点梳理" },
  columnFallback: { en: "RTNote column", zh: "RTNote 专栏" },
  sectionCount: { en: "{{count}} sections", zh: "{{count}} 个章节" },
  editorOutline: { en: "{{count}} PARTS · SECTION GUIDE", zh: "{{count}} PARTS · 章节导览" },
  publishCoverTag: { en: "FEATURED · IN DEPTH", zh: "FEATURED · 深度实测" },
  publishCoverFooter: { en: "RTNOTE · FEATURED NOTE", zh: "RTNOTE · 精选笔记" },
  publishOutline: { en: "{{count}} PARTS · CONTENTS", zh: "{{count}} PARTS · 全文导览" },
} as const;

export type MagazineChromeKey = keyof typeof MAGAZINE_CHROME_COPY;

export const magazineChromeLabel = (
  key: MagazineChromeKey,
  locale: string | null | undefined,
  values: { count?: number; number?: string | number } = {},
) => {
  const copy = MAGAZINE_CHROME_COPY[key];
  const template: string = prefersChineseContent(locale) ? copy.zh : copy.en;
  return template
    .replace("{{count}}", String(values.count ?? ""))
    .replace("{{number}}", String(values.number ?? ""));
};
