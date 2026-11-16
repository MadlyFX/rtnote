import type { TranscriptCue, VideoChapter } from "./types";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

export const decodeHtmlEntities = (value: string) => value
  .replace(/&#(\d+);/g, (_, digits: string) => safeCodePoint(Number(digits)))
  .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
  .replace(/&([a-z]+);/gi, (entity, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? entity);

const safeCodePoint = (value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) return "";
  try {
    return String.fromCodePoint(value);
  } catch {
    return "";
  }
};

export const cleanCueText = (value: string) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export const cleanCues = (cues: TranscriptCue[]) => cues.flatMap((cue) => {
  const text = cleanCueText(cue.text);
  if (!text || !Number.isFinite(cue.start) || !Number.isFinite(cue.end)) return [];
  const start = Math.max(0, cue.start);
  const end = Math.max(start, cue.end);
  return [{ start, end, text }];
});

export const formatTimestamp = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remain = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(remain).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const languageFamily = (code: string) => {
  let normalized = code.trim().toLowerCase().replace(/_/g, "-");
  if (normalized.startsWith("ai-")) normalized = normalized.slice(3);
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja")) return "ja";
  return normalized.split("-")[0] ?? "";
};

export const pickSubtitleTrack = <T>(
  tracks: T[],
  uiLanguage: string,
  read: (track: T) => { language: string; human: boolean },
) => {
  const family = languageFamily(uiLanguage);
  const ranked = tracks.map((track, index) => {
    const info = read(track);
    const matches = Boolean(family) && languageFamily(info.language) === family;
    const rank = matches && info.human ? 0 : matches ? 1 : info.human ? 2 : 3;
    return { track, rank, index };
  });
  ranked.sort((left, right) => left.rank - right.rank || left.index - right.index);
  return ranked[0]?.track ?? null;
};

export const sectionsFromChapters = (chapters: VideoChapter[]) => chapters.flatMap((chapter) => {
  const title = cleanCueText(chapter.title);
  if (!title || !Number.isFinite(chapter.start) || chapter.start < 0) return [];
  return [{ start: Math.floor(chapter.start), text: title }];
});
