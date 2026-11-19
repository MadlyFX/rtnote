import { docToMarkdown, emptyDoc, resolveMemoContentDoc, type MemoTemplate, type TiptapDoc } from "@rtnote/shared";
import { localizeDefaultMemoTemplate } from "@rtnote/shared/memo-template-seeds";

export type TemplateCard = {
  /** The template as stored; editing starts from it. */
  template: MemoTemplate;
  /** The template as shown in the current UI language. */
  display: MemoTemplate;
};

export type TemplateDraft = {
  name: string;
  description: string;
  title: string;
  /** Rich-text body edited in the template editor. */
  contentJson: TiptapDoc;
  /** True once the body was edited; untouched bodies are not resent. */
  contentChanged: boolean;
  tags: string;
};

export const emptyTemplateDraft = (): TemplateDraft => ({
  name: "",
  description: "",
  title: "",
  contentJson: emptyDoc(),
  contentChanged: false,
  tags: "",
});

// Unedited default templates are displayed in the UI language, but the editor
// always starts from the stored fields, so saving a change to one field never
// writes the display translation of the others.
export const createTemplateCards = (
  templates: readonly MemoTemplate[],
  locale: string | null | undefined,
): TemplateCard[] => templates.map((template) => ({
  template,
  display: localizeDefaultMemoTemplate(template, locale),
}));

export const createTemplateDraft = (template: MemoTemplate): TemplateDraft => ({
  name: template.name,
  description: template.description ?? "",
  title: template.title ?? "",
  contentJson: resolveMemoContentDoc(template.contentJson, template.contentMarkdown),
  contentChanged: false,
  tags: template.tags.join(", "),
});

export type TemplatePayload = {
  name: string;
  description: string | null;
  title: string | null;
  contentJson?: TiptapDoc;
  contentMarkdown?: string;
  tags: string[];
};

// An unchanged body is left out so a metadata-only edit keeps the stored
// content exactly, including the Markdown that marks an unedited default
// template for localization.
export const templateDraftToPayload = (draft: TemplateDraft): TemplatePayload => ({
  name: draft.name.trim(),
  description: draft.description.trim() || null,
  title: draft.title.trim() || null,
  ...(draft.contentChanged
    ? { contentJson: draft.contentJson, contentMarkdown: docToMarkdown(draft.contentJson) }
    : {}),
  tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
});
