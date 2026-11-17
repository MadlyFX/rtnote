/**
 * Leading section numbers in headings, including Chinese chapter numbering
 * ("第一章", "第3节", "一、") as well as plain "1." / "2、" prefixes. The magazine
 * outline and the WeChat table of contents strip them to get a short section title.
 */
const HEADING_NUMBER_PREFIX =
  /^\s*(?:第[一二三四五六七八九十百\d]+[章节部分篇]\s*[：:·.\s]*|\d+\s*[.、·:：]\s*|[一二三四五六七八九十]+\s*[、.．]\s*)/u;

export const stripHeadingNumberPrefix = (text: string) => text.replace(HEADING_NUMBER_PREFIX, "").trim();
