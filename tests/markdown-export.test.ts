import { describe, expect, test } from "bun:test";
import type { MemoDetail, Notebook, Resource } from "@rtnote/shared";
import { strFromU8, unzipSync } from "fflate";
import {
  buildMarkdownFrontMatter,
  buildNotebookExportPaths,
  createMarkdownExport,
  sanitizeExportPathSegment,
} from "../apps/web/src/lib/markdown-export";

const notebook = (input: Partial<Notebook> & Pick<Notebook, "id" | "name">): Notebook => ({
  id: input.id,
  parentId: input.parentId ?? null,
  name: input.name,
  slug: null,
  icon: null,
  color: null,
  sortOrder: 0,
  memoCount: 0,
  lastMemoUpdatedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const memo = (input: Partial<MemoDetail> = {}): MemoDetail => ({
  id: "memo_1",
  notebookId: "nb_child",
  title: "Project notes",
  excerpt: "",
  tags: ["work", "important"],
  isPinned: true,
  isArchived: false,
  isDeleted: false,
  revision: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  deletedAt: null,
  contentJson: { type: "doc", content: [] },
  contentMarkdown: "![diagram](/api/v1/resources/res_1/blob)",
  contentText: "",
  contentHash: "hash",
  sourceMemoIds: [],
  mergeSourceCount: 0,
  mergedIntoMemoId: null,
  ...input,
});

const resource: Resource = {
  id: "res_1",
  memoId: "memo_1",
  originalMemoId: null,
  kind: "image",
  mimeType: "image/png",
  filename: "Café design.png",
  byteSize: 3,
  sha256: null,
  width: null,
  height: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  url: "/api/v1/resources/res_1/blob",
};

describe("Markdown export", () => {
  test("sanitizes unsafe and reserved path names", () => {
    expect(sanitizeExportPathSegment("CON", "fallback")).toBe("_CON");
    expect(sanitizeExportPathSegment('<>:"/\\|?*', "fallback")).toBe("---------");
    expect(sanitizeExportPathSegment("...", "fallback")).toBe("fallback");
  });

  test("preserves notebook hierarchy and disambiguates sibling names", () => {
    const paths = buildNotebookExportPaths([
      notebook({ id: "nb_root", name: "Work" }),
      notebook({ id: "nb_child", name: "Projects", parentId: "nb_root" }),
      notebook({ id: "nb_child_2", name: "Projects", parentId: "nb_root" }),
    ]);

    expect(paths.get("nb_child")).toBe("Work/Projects");
    expect(paths.get("nb_child_2")).toBe("Work/Projects (2)");
  });

  test("writes front matter, Markdown, and relative assets into the ZIP", async () => {
    const notes = [memo()];
    const blob = await createMarkdownExport({
      listNotebooks: async () => ({
        notebooks: [
          notebook({ id: "nb_root", name: "Work" }),
          notebook({ id: "nb_child", name: "Projects", parentId: "nb_root" }),
        ],
      }),
      getPage: async () => ({ memos: notes, resources: [resource], totalCount: 1, nextOffset: null }),
      getResourceBlob: async () => new Blob([new Uint8Array([1, 2, 3])]),
    });
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const markdownPath = "Work/Projects/Project notes.md";
    const assetPath = "Work/Projects/Project notes.assets/Café design.png";

    expect(Object.keys(files).sort()).toEqual([assetPath, markdownPath].sort());
    expect(Array.from(files[assetPath])).toEqual([1, 2, 3]);

    const markdown = strFromU8(files[markdownPath]);
    expect(markdown).toStartWith(buildMarkdownFrontMatter(notes[0], "Work/Projects"));
    expect(markdown).toContain(
      "![diagram](Project%20notes.assets/Caf%C3%A9%20design.png)"
    );
  });

  test("retains the initial total when continuation pages omit counts", async () => {
    const progress: { completed: number; total: number }[] = [];
    const blob = await createMarkdownExport({
      listNotebooks: async () => ({ notebooks: [notebook({ id: "nb_child", name: "Notes" })] }),
      getPage: async (offset) => ({
        memos: [memo({ id: `memo_${offset}`, title: `Note ${offset}`, contentMarkdown: "body" })],
        resources: [], ...(offset === 0 ? { totalCount: 2 } : {}), nextOffset: offset === 0 ? 1 : null,
      }),
      getResourceBlob: async () => new Blob(),
    }, (value) => progress.push(value));
    expect(Object.keys(unzipSync(new Uint8Array(await blob.arrayBuffer())))).toHaveLength(2);
    expect(progress.every((value) => value.total === 2)).toBe(true);
    expect(progress.at(-1)?.completed).toBe(2);
  });
});
