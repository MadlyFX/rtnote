import { zhCN } from "../../../packages/shared/src/i18n/zh-CN";

// playwright.config.ts runs the browser in the zh-CN locale, so specs locate
// controls by the zh-CN catalog values instead of repeating them inline.
export const ui = zhCN;

/** Fills `{{name}}` placeholders the way i18next does. */
export const format = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key]));

/** Escapes a label for use inside a RegExp. */
export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches any text produced by one of the templates, from its start. */
export const templatesRegExp = (...templates: string[]) =>
  new RegExp(`^(?:${templates.map((template) => escapeRegExp(template).replace(/\\\{\\\{\w+\\\}\\\}/g, ".*")).join("|")})`);
