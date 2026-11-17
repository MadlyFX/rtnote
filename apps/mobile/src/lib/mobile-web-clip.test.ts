import { describe, expect, test } from "bun:test";
import {
  buildMobileWebClipDraft,
  buildMobileWebClipDraftFromRenderedPage,
  extractPageTitle,
  getSharedImages,
  getSharedWebUrl,
  htmlToMarkdown,
  isWeChatArticleUrl,
} from "./mobile-web-clip";
import { webClipCopy } from "./i18n/web-clip";

describe("mobile web clip", () => {
  test("normalizes resolved images shared by another Android app", () => {
    expect(getSharedImages([
      {
        contentMimeType: "image/webp",
        contentType: "image",
        contentUri: "file:///cache/zhihu-image.webp",
        mimeType: "image/*",
        originalName: "zhihu-image.webp",
        shareType: "image",
        value: "content://com.zhihu.android/image/42",
      },
    ])).toEqual([{
      mimeType: "image/webp",
      name: "zhihu-image.webp",
      uri: "file:///cache/zhihu-image.webp",
    }]);
  });

  test("extracts a WeChat URL embedded in shared text", () => {
    expect(getSharedWebUrl([
      { shareType: "text", value: "An article\nhttps://mp.weixin.qq.com/s/abc123" },
    ])).toBe("https://mp.weixin.qq.com/s/abc123");
    expect(isWeChatArticleUrl("https://mp.weixin.qq.com/s/abc123")).toBe(true);
    expect(isWeChatArticleUrl("http://mp.weixin.qq.com/s/abc123")).toBe(false);
  });

  test("extracts title regardless of meta attribute order", () => {
    expect(extractPageTitle('<meta content="Official account article &amp; more" property="og:title">'))
      .toBe("Official account article & more");
  });

  test("turns common article HTML into readable markdown", () => {
    const markdown = htmlToMarkdown(`
      <section>
        <h2>Section one</h2>
        <p>Body<strong>key point</strong><br>next line</p>
        <img data-src="https://mmbiz.qpic.cn/example.jpg" alt="Example image">
        <p><a href="https://example.com">Read more</a></p>
      </section>
    `);
    expect(markdown).toContain("## Section one");
    expect(markdown).toContain("Body**key point**\nnext line");
    expect(markdown).toContain("![Example image](https://mmbiz.qpic.cn/example.jpg)");
    expect(markdown).toContain("[Read more](https://example.com)");
  });

  test("builds a complete WeChat clip from nested js_content", async () => {
    const html = `
      <html><head><meta property="og:title" content="Test article"></head>
      <body><div id="js_content"><section><p>Opening</p><div><p>Nested body</p></div></section></div></body></html>
    `;
    const draft = await buildMobileWebClipDraft("https://mp.weixin.qq.com/s/test", {
      capturedAt: new Date("2026-07-31T00:00:00.000Z"),
      fetcher: async () => new Response(html, { status: 200 }),
    });
    expect(draft.title).toBe("Test article");
    expect(draft.tagsText).toBe("web-clip, wechat");
    expect(draft.contentMarkdown).toContain("Opening");
    expect(draft.contentMarkdown).toContain("Nested body");
    expect(draft.contentMarkdown).toContain("2026-07-31T00:00:00.000Z");
  });

  test("builds a WeChat clip from a rendered WebView page", () => {
    const draft = buildMobileWebClipDraftFromRenderedPage(
      "https://mp.weixin.qq.com/s/rendered",
      {
        title: "Rendered article title &amp; more",
        finalUrl: "https://mp.weixin.qq.com/s/rendered",
        contentHtml: `
          <section>
            <p>Body text extracted after the browser rendered the page.</p>
            <img data-src="//mmbiz.qpic.cn/example.jpg" alt="Article image">
            <a href="/s/related">Related article</a>
          </section>
        `,
      },
      { capturedAt: new Date("2026-07-31T00:00:00.000Z") },
    );

    expect(draft.title).toBe("Rendered article title & more");
    expect(draft.contentMarkdown).toContain("Body text extracted after the browser rendered the page.");
    expect(draft.contentMarkdown).toContain(
      "![Article image](https://mmbiz.qpic.cn/example.jpg)",
    );
    expect(draft.contentMarkdown).toContain(
      "[Related article](https://mp.weixin.qq.com/s/related)",
    );
  });

  test("keeps the source URL when fetching fails", async () => {
    const draft = await buildMobileWebClipDraft("https://mp.weixin.qq.com/s/offline", {
      fetcher: async () => {
        throw new Error("offline");
      },
    });
    expect(draft.contentMarkdown).toContain("https://mp.weixin.qq.com/s/offline");
    expect(draft.contentMarkdown).toContain("Source:");
    expect(draft.contentMarkdown).toContain("Captured at:");
    expect(draft.contentMarkdown).toContain("Could not extract the page text");
  });

  test("writes English source labels into a new clip", () => {
    const draft = buildMobileWebClipDraftFromRenderedPage(
      "https://example.com/story",
      {
        title: "Story",
        finalUrl: "https://example.com/story",
        contentHtml: "<p>Body</p><img src=\"https://example.com/a.png\">",
      },
      { capturedAt: new Date("2026-07-31T00:00:00.000Z"), locale: "en-US" },
    );

    expect(draft.contentMarkdown).toContain("Source: [https://example.com/story](https://example.com/story)");
    expect(draft.contentMarkdown).toContain("Captured at: 2026-07-31T00:00:00.000Z");
    expect(draft.contentMarkdown).toContain("![Image](https://example.com/a.png)");
    expect(draft.contentMarkdown).not.toContain(webClipCopy["zh-CN"].sourceLabel);
  });

  test("writes Japanese labels when the page cannot be fetched", async () => {
    const draft = await buildMobileWebClipDraft("notaurl", {
      capturedAt: new Date("2026-07-31T00:00:00.000Z"),
      fetcher: async () => {
        throw new Error("offline");
      },
      locale: "ja",
    });

    expect(draft.title).toBe(webClipCopy.ja.fallbackTitle);
    expect(draft.contentMarkdown).toContain(`${webClipCopy.ja.sourceLabel}: [notaurl](notaurl)`);
    expect(draft.contentMarkdown).toContain(`${webClipCopy.ja.capturedAtLabel}: 2026-07-31T00:00:00.000Z`);
    expect(draft.contentMarkdown).toContain(webClipCopy.ja.unavailableBody);
  });

  test("writes Polish labels when the page cannot be fetched", async () => {
    const draft = await buildMobileWebClipDraft("notaurl", {
      capturedAt: new Date("2026-07-31T00:00:00.000Z"),
      fetcher: async () => {
        throw new Error("offline");
      },
      locale: "pl",
    });

    expect(draft.title).toBe("Wycinek strony");
    expect(draft.contentMarkdown).toContain("Źródło: [notaurl](notaurl)");
    expect(draft.contentMarkdown).toContain("Zapisano: 2026-07-31T00:00:00.000Z");
  });
});
