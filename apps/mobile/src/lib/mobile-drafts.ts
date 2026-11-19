import AsyncStorage from "@react-native-async-storage/async-storage";
import { markdownToDoc, mergeMarkdownIntoDoc, resolveMemoContentDoc, type MemoDetail, type TiptapDoc } from "@rtnote/shared";

const MOBILE_DRAFT_PREFIX = "rtnote.mobile.memoDraft:";
const MOBILE_NEW_DRAFT_PREFIX = "rtnote.mobile.newMemoDraft:";

export type MobileMemoDraft = {
  memoId: string;
  expectedRevision: number;
  title: string;
  /** Rich-text body; drafts saved by older builds only have Markdown. */
  contentJson?: TiptapDoc;
  contentMarkdown: string;
  notebookId: string;
  tagsText: string;
  updatedAt: string;
};

export type MobileNewMemoDraft = {
  title: string;
  contentJson?: TiptapDoc;
  contentMarkdown: string;
  notebookId: string;
  tagsText: string;
  updatedAt: string;
};

export const readMobileMemoDraft = async (memoId: string): Promise<MobileMemoDraft | null> => {
  const rawValue = await AsyncStorage.getItem(getMobileMemoDraftKey(memoId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isMobileMemoDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeMobileMemoDraft = (draft: MobileMemoDraft) => AsyncStorage.setItem(getMobileMemoDraftKey(draft.memoId), JSON.stringify(draft));

export const clearMobileMemoDraft = (memoId: string) => AsyncStorage.removeItem(getMobileMemoDraftKey(memoId));

export const readMobileNewMemoDraft = async (scope: string): Promise<MobileNewMemoDraft | null> => {
  const rawValue = await AsyncStorage.getItem(getMobileNewMemoDraftKey(scope));
  if (!rawValue) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawValue);
    return isMobileNewMemoDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeMobileNewMemoDraft = (scope: string, draft: MobileNewMemoDraft) =>
  AsyncStorage.setItem(getMobileNewMemoDraftKey(scope), JSON.stringify(draft));

export const clearMobileNewMemoDraft = (scope: string) => AsyncStorage.removeItem(getMobileNewMemoDraftKey(scope));

const isDoc = (value: unknown): value is TiptapDoc =>
  Boolean(value) && typeof value === "object" && Array.isArray((value as { content?: unknown }).content);

/**
 * The document to restore from a draft. Drafts keep the rich-text JSON; for
 * Markdown-only drafts from older builds, the Markdown is merged into the
 * note so unchanged paragraphs keep their formatting.
 */
export const restoreDraftDoc = (
  draft: { contentJson?: unknown; contentMarkdown: string },
  memo?: Pick<MemoDetail, "contentJson" | "contentMarkdown" | "schemaVersion"> | null,
): TiptapDoc => {
  if (isDoc(draft.contentJson)) return draft.contentJson;
  return memo
    ? mergeMarkdownIntoDoc(resolveMemoContentDoc(memo.contentJson, memo.contentMarkdown, memo), draft.contentMarkdown)
    : markdownToDoc(draft.contentMarkdown);
};

const getMobileMemoDraftKey = (memoId: string) => `${MOBILE_DRAFT_PREFIX}${memoId}`;
const getMobileNewMemoDraftKey = (scope: string) => `${MOBILE_NEW_DRAFT_PREFIX}${encodeURIComponent(scope)}`;

const isMobileMemoDraft = (value: unknown): value is MobileMemoDraft => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<MobileMemoDraft>;
  return (
    typeof draft.memoId === "string" &&
    typeof draft.expectedRevision === "number" &&
    typeof draft.title === "string" &&
    typeof draft.contentMarkdown === "string" &&
    typeof draft.notebookId === "string" &&
    typeof draft.tagsText === "string" &&
    typeof draft.updatedAt === "string"
  );
};

const isMobileNewMemoDraft = (value: unknown): value is MobileNewMemoDraft => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const draft = value as Partial<MobileNewMemoDraft>;
  return (
    typeof draft.title === "string" &&
    typeof draft.contentMarkdown === "string" &&
    typeof draft.notebookId === "string" &&
    typeof draft.tagsText === "string" &&
    typeof draft.updatedAt === "string"
  );
};
