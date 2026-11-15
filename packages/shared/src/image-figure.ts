import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { alignedImageToHtml, parseImageAlignment, readImageHtml } from "./image-alignment";

/**
 * A captioned image: the existing image node plus an editable caption line.
 * Images without a caption stay plain `image` nodes, so existing notes do not
 * change; "Add caption" wraps one image in a figure.
 *
 * Both children are optional in the schema so ordinary editing (deleting or
 * dragging the image out, selecting across the caption) can never produce an
 * invalid document. The normalizer below then unwraps a figure that lost its
 * caption and turns an orphaned caption into a paragraph.
 */
export const IMAGE_FIGURE_NODE_TYPE = "imageFigure";
export const IMAGE_CAPTION_NODE_TYPE = "imageCaption";
export const IMAGE_FIGURE_TOKEN = "rtnoteImageFigure";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageFigure: {
      /** Adds a caption to the selected image, or the image at `position`, and focuses it. */
      addImageCaption: (position?: number) => ReturnType;
      /** Removes the caption from the selected captioned image, or the image at `position`. */
      removeImageCaption: (position?: number) => ReturnType;
    };
  }
}

export type ImageCaptionOptions = {
  /** Shown in an empty caption while editing; a function is read on every render. */
  placeholder: string | (() => string);
};

const isType = (node: ProseMirrorNode | null | undefined, name: string) => node?.type.name === name;

/** Position and node of the image a caption command should act on. */
const findTargetImage = (state: EditorState, position?: number) => {
  if (typeof position === "number") {
    const node = state.doc.nodeAt(position);
    return isType(node, "image") ? { pos: position, node: node! } : null;
  }
  const { selection } = state;
  if (selection instanceof NodeSelection) {
    if (isType(selection.node, "image")) return { pos: selection.from, node: selection.node };
    if (isType(selection.node, IMAGE_FIGURE_NODE_TYPE)) {
      const image = selection.node.firstChild;
      return isType(image, "image") ? { pos: selection.from + 1, node: image! } : null;
    }
  }
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (!isType($from.node(depth), IMAGE_FIGURE_NODE_TYPE)) continue;
    const image = $from.node(depth).firstChild;
    return isType(image, "image") ? { pos: $from.before(depth) + 1, node: image! } : null;
  }
  return null;
};

/** The caption-node position inside a figure that starts at `figurePos`. */
const captionStart = (figure: ProseMirrorNode, figurePos: number) => {
  let start: number | null = null;
  figure.forEach((child, offset) => {
    if (isType(child, IMAGE_CAPTION_NODE_TYPE)) start = figurePos + 1 + offset;
  });
  return start;
};

const enclosingFigure = (state: EditorState) => {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (isType($from.node(depth), IMAGE_FIGURE_NODE_TYPE)) return { pos: $from.before(depth), node: $from.node(depth) };
  }
  return null;
};

/** Unwraps figures without a caption and turns captions without an image into paragraphs. */
const normalizeFigures = (state: EditorState): Transaction | null => {
  const changes: Array<{ pos: number; node: ProseMirrorNode }> = [];
  state.doc.descendants((node, pos) => {
    if (!isType(node, IMAGE_FIGURE_NODE_TYPE)) return true;
    const image = node.content.content.find((child) => isType(child, "image"));
    const caption = node.content.content.find((child) => isType(child, IMAGE_CAPTION_NODE_TYPE));
    if (!image || !caption) changes.push({ pos, node });
    return false;
  });
  if (!changes.length) return null;
  const tr = state.tr;
  for (const { pos, node } of changes.reverse()) {
    const image = node.content.content.find((child) => isType(child, "image"));
    const caption = node.content.content.find((child) => isType(child, IMAGE_CAPTION_NODE_TYPE));
    if (image) {
      tr.replaceWith(pos, pos + node.nodeSize, image);
    } else if (caption?.content.size) {
      tr.replaceWith(pos, pos + node.nodeSize, state.schema.nodes.paragraph!.create(null, caption.content));
    } else {
      tr.delete(pos, pos + node.nodeSize);
    }
  }
  return tr.docChanged ? tr : null;
};

export const ImageCaption = Node.create<ImageCaptionOptions>({
  name: IMAGE_CAPTION_NODE_TYPE,
  content: "inline*",
  defining: true,
  selectable: false,
  addOptions() {
    return { placeholder: "Add a caption" };
  },
  parseHTML() {
    return [{ tag: "figcaption" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figcaption", mergeAttributes(HTMLAttributes, { "data-type": "image-caption" }), 0];
  },
  addKeyboardShortcuts() {
    return {
      // Enter leaves the caption for a new paragraph below the figure.
      Enter: ({ editor }) => {
        const figure = enclosingFigure(editor.state);
        if (!figure || !isType(editor.state.selection.$from.parent, IMAGE_CAPTION_NODE_TYPE)) return false;
        const after = figure.pos + figure.node.nodeSize;
        return editor.chain()
          .insertContentAt(after, { type: "paragraph" })
          .command(({ tr }) => {
            tr.setSelection(TextSelection.create(tr.doc, after + 1));
            return true;
          })
          .scrollIntoView()
          .run();
      },
      // Backspace in an empty caption removes the caption and selects the image.
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const caption = selection.$from.parent;
        if (!selection.empty || !isType(caption, IMAGE_CAPTION_NODE_TYPE) || caption.content.size) return false;
        const figure = enclosingFigure(editor.state);
        if (!figure) return false;
        return editor.commands.removeImageCaption(figure.pos + 1);
      },
    };
  },
  addProseMirrorPlugins() {
    const placeholder = this.options.placeholder;
    return [new Plugin({
      key: new PluginKey("imageCaptionPlaceholder"),
      props: {
        decorations: (state) => {
          const decorations: Decoration[] = [];
          const text = typeof placeholder === "function" ? placeholder() : placeholder;
          state.doc.descendants((node, pos) => {
            if (isType(node, IMAGE_CAPTION_NODE_TYPE)) {
              if (!node.content.size) {
                decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: "is-caption-empty", "data-caption-placeholder": text }));
              }
              return false;
            }
            return node.isBlock;
          });
          return decorations.length ? DecorationSet.create(state.doc, decorations) : null;
        },
      },
    })];
  },
});

export const ImageFigure = Node.create({
  name: IMAGE_FIGURE_NODE_TYPE,
  group: "block",
  content: `image? ${IMAGE_CAPTION_NODE_TYPE}?`,
  draggable: true,
  isolating: true,
  selectable: true,
  parseHTML() {
    return [{
      tag: "figure",
      // Only image-plus-caption figures; other <figure> markup keeps its own rules.
      getAttrs: (element) => (element.querySelector("img") && element.querySelector("figcaption") ? null : false),
    }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const image = node.content.content.find((child) => isType(child, "image"));
    const alignment = parseImageAlignment(image?.attrs.alignment);
    return ["figure", mergeAttributes(HTMLAttributes, {
      "data-type": "image-figure",
      ...(alignment ? { "data-image-align": alignment } : {}),
    }), 0];
  },
  addCommands() {
    return {
      addImageCaption: (position) => ({ state, tr, dispatch }) => {
        const target = findTargetImage(state, position);
        if (!target) return false;
        const $pos = state.doc.resolve(target.pos);
        if (isType($pos.parent, IMAGE_FIGURE_NODE_TYPE)) {
          const start = captionStart($pos.parent, $pos.before());
          if (start === null) return false;
          if (dispatch) {
            const caption = state.doc.nodeAt(start)!;
            tr.setSelection(TextSelection.create(tr.doc, start + 1 + caption.content.size)).scrollIntoView();
          }
          return true;
        }
        const figureType = state.schema.nodes[IMAGE_FIGURE_NODE_TYPE];
        const captionType = state.schema.nodes[IMAGE_CAPTION_NODE_TYPE];
        if (!figureType || !captionType) return false;
        const index = $pos.index();
        if (!$pos.parent.canReplaceWith(index, index + 1, figureType)) return false;
        if (dispatch) {
          tr.replaceWith(target.pos, target.pos + target.node.nodeSize, figureType.create(null, [target.node, captionType.create()]));
          tr.setSelection(TextSelection.create(tr.doc, target.pos + 1 + target.node.nodeSize + 1)).scrollIntoView();
        }
        return true;
      },
      removeImageCaption: (position) => ({ state, tr, dispatch }) => {
        const target = findTargetImage(state, position);
        if (!target) return false;
        const $pos = state.doc.resolve(target.pos);
        if (!isType($pos.parent, IMAGE_FIGURE_NODE_TYPE)) return false;
        if (dispatch) {
          const figurePos = $pos.before();
          tr.replaceWith(figurePos, figurePos + $pos.parent.nodeSize, target.node);
          tr.setSelection(NodeSelection.create(tr.doc, figurePos)).scrollIntoView();
        }
        return true;
      },
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey("imageFigureNormalizer"),
      appendTransaction: (transactions, _oldState, newState) =>
        transactions.some((transaction) => transaction.docChanged) ? normalizeFigures(newState) : null,
      props: {
        handleDOMEvents: {
          // Dragging a captioned image moves the whole figure, caption included.
          dragstart: (view) => {
            const { selection } = view.state;
            if (!(selection instanceof NodeSelection) || !isType(selection.node, "image")) return false;
            const $pos = view.state.doc.resolve(selection.from);
            if (!isType($pos.parent, IMAGE_FIGURE_NODE_TYPE)) return false;
            view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, $pos.before())));
            return false;
          },
        },
      },
    })];
  },
  renderMarkdown(node: JSONContent, helpers) {
    const image = node.content?.find((child) => child.type === "image");
    const caption = node.content?.find((child) => child.type === IMAGE_CAPTION_NODE_TYPE);
    const captionMarkdown = caption?.content?.length ? helpers.renderChildren(caption.content).trim() : "";
    if (!image) return captionMarkdown;
    if (!captionMarkdown) return helpers.renderChildren([image]);
    return `<figure>\n${alignedImageToHtml(image, { keepUnaligned: true })}\n<figcaption>${captionMarkdown}</figcaption>\n</figure>`;
  },
  markdownTokenName: IMAGE_FIGURE_TOKEN,
  markdownTokenizer: {
    name: IMAGE_FIGURE_TOKEN,
    level: "block",
    start: (source) => {
      const match = /^ {0,3}<figure\b/im.exec(source);
      return match ? match.index : -1;
    },
    tokenize(source, _tokens, lexer) {
      const opening = /^ {0,3}<figure\b(?:[^"'>]|"[^"]*"|'[^']*')*>\s*/i.exec(source);
      if (!opening) return undefined;
      const closing = /<\/figure>[ \t]*(?:\n|$)/i.exec(source.slice(opening[0].length));
      if (!closing) return undefined;
      const inner = source.slice(opening[0].length, opening[0].length + closing.index).replace(/>\s*<figcaption\b/i, ">\n<figcaption");
      const image = readImageHtml(inner);
      if (!image) return undefined;
      const caption = /^\s*<figcaption\b(?:[^"'>]|"[^"]*"|'[^']*')*>([\s\S]*?)<\/figcaption>\s*$/i.exec(inner.slice(image.raw.length));
      if (!caption) return undefined;
      return {
        type: IMAGE_FIGURE_TOKEN,
        raw: source.slice(0, opening[0].length + closing.index + closing[0].length),
        imageAttributes: image.attributes,
        tokens: lexer.inlineTokens(caption[1]!.trim()),
      };
    },
  },
  parseMarkdown(token, helpers) {
    const caption = helpers.parseInline(token.tokens ?? []);
    return {
      type: IMAGE_FIGURE_NODE_TYPE,
      content: [
        { type: "image", attrs: (token as { imageAttributes?: Record<string, unknown> }).imageAttributes },
        { type: IMAGE_CAPTION_NODE_TYPE, ...(caption.length ? { content: caption } : {}) },
      ],
    };
  },
});

export const createImageFigureExtensions = (options: Partial<ImageCaptionOptions> = {}) => [
  ImageFigure,
  ImageCaption.configure(options),
];
