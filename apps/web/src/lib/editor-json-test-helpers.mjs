// Editor JSON lists every schema attribute, including the default-null
// alignment and line spacing that paragraphs and headings carry. Tests that
// compare whole nodes care about content, so they read JSON without them.
const BLOCK_FORMATTING_KEYS = new Set(["textAlign", "lineHeight"]);

export const withoutDefaultBlockFormatting = (node) => {
  if (Array.isArray(node)) return node.map(withoutDefaultBlockFormatting);
  if (!node || typeof node !== "object") return node;
  const { attrs, content, ...rest } = node;
  const kept = attrs && Object.fromEntries(Object.entries(attrs).filter(([key, value]) => !(BLOCK_FORMATTING_KEYS.has(key) && value === null)));
  return {
    ...rest,
    ...(kept && Object.keys(kept).length ? { attrs: kept } : {}),
    ...(content ? { content: content.map(withoutDefaultBlockFormatting) } : {}),
  };
};

/** Makes `editor.getJSON()` omit default block formatting for the rest of a test. */
export const compactEditorJson = (editor) => {
  const getJSON = editor.getJSON.bind(editor);
  editor.getJSON = () => withoutDefaultBlockFormatting(getJSON());
  return editor;
};
