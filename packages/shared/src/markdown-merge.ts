import { docToMarkdown, markdownToDoc } from "./content";
import type { TiptapDoc, TiptapNode } from "./content";

/**
 * Notes are stored as rich-text JSON; Markdown is a derived copy. Callers that
 * can only produce Markdown (MCP agents, plugins, offline Markdown queues)
 * would lose colours, fonts, image sizes and captions if their Markdown simply
 * replaced the document. This merge keeps every top-level block whose Markdown
 * did not change and only parses the blocks that did.
 */

// Above this many block comparisons the LCS table gets too large; the merge
// then keeps only the unchanged prefix and suffix.
const MAX_LCS_CELLS = 4_000_000;

const blockMarkdown = (node: TiptapNode) =>
  docToMarkdown({ type: "doc", content: [node] }).trim();

const longestCommonSubsequence = (left: string[], right: string[]): Array<[number, number]> => {
  const rows = left.length;
  const cols = right.length;
  if (!rows || !cols) return [];
  if (rows * cols > MAX_LCS_CELLS) return [];
  const table = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] = left[i] === right[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (left[i] === right[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return pairs;
};

/**
 * Returns `markdown` as a document, reusing the original JSON for each
 * top-level block whose Markdown is unchanged.
 */
export const mergeMarkdownIntoDoc = (currentDoc: TiptapDoc | null | undefined, markdown: string): TiptapDoc => {
  const nextDoc = markdownToDoc(markdown);
  const currentBlocks = currentDoc && Array.isArray(currentDoc.content) ? currentDoc.content : [];
  const nextBlocks = nextDoc.content ?? [];
  if (!currentBlocks.length || !nextBlocks.length) return nextDoc;

  const currentKeys = currentBlocks.map(blockMarkdown);
  const nextKeys = nextBlocks.map(blockMarkdown);
  const merged: TiptapNode[] = nextBlocks.slice();

  let prefix = 0;
  while (prefix < currentKeys.length && prefix < nextKeys.length && currentKeys[prefix] === nextKeys[prefix]) {
    merged[prefix] = currentBlocks[prefix];
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < currentKeys.length - prefix
    && suffix < nextKeys.length - prefix
    && currentKeys[currentKeys.length - 1 - suffix] === nextKeys[nextKeys.length - 1 - suffix]
  ) {
    merged[nextKeys.length - 1 - suffix] = currentBlocks[currentKeys.length - 1 - suffix];
    suffix += 1;
  }

  const middle = longestCommonSubsequence(
    currentKeys.slice(prefix, currentKeys.length - suffix),
    nextKeys.slice(prefix, nextKeys.length - suffix),
  );
  for (const [currentIndex, nextIndex] of middle) {
    merged[prefix + nextIndex] = currentBlocks[prefix + currentIndex];
  }

  return { ...nextDoc, content: merged };
};
