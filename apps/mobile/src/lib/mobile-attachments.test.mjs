import { describe, expect, test } from "bun:test";
import { ATTACHMENT_TEXT_PREFIX, LEGACY_ATTACHMENT_PREFIXES } from "@rtnote/shared";
import {
  buildMobileResourceDownloadRequest,
  deleteMobileAttachmentFromDoc,
  deleteMobileResourceFromDoc,
  getMobileAttachmentTarget,
  getMobileImageTarget,
  getParagraphAttachmentTarget,
  parseMobileAttachmentTargetJson,
  parseMobileResourceTargetJson,
  readBlobAsUint8Array,
  renameMobileAttachmentInDoc,
  renameMobileResourceInDoc,
  resolveExportFilename,
  resolveResourceMimeType,
} from "./mobile-attachments.ts";

// RTNote wrote a Chinese prefix before attachment links; notes still carry it.
const legacyPrefix = LEGACY_ATTACHMENT_PREFIXES[0];
const href = "/api/v1/resources/res_123/blob";
const attachmentTarget = { filename: "report.pdf", href, kind: "attachment", resourceId: "res_123" };
const doc = {
  type: "doc",
  content: [{
    type: "paragraph",
    content: [{
      type: "text",
      text: `${ATTACHMENT_TEXT_PREFIX}report.pdf`,
      marks: [{ type: "link", attrs: { href, class: "rtnote-attachment-link" } }],
    }],
  }],
};

describe("mobile attachments", () => {
  test("builds a native disk download request with protected-resource authentication", () => {
    expect(buildMobileResourceDownloadRequest("res/a", {
      baseUrl: "https://notes.example///",
      token: "secret",
    })).toEqual({
      url: "https://notes.example/api/v1/resources/res%2Fa/blob",
      headers: { Authorization: "Bearer secret" },
    });
  });

  test("recognizes resource links and attachment paragraphs", () => {
    expect(getMobileAttachmentTarget(href, "📄 Report: report.pdf")).toEqual(attachmentTarget);
    expect(getMobileAttachmentTarget(href, `${legacyPrefix}report.pdf`)).toEqual(attachmentTarget);
    for (const prefix of [ATTACHMENT_TEXT_PREFIX, legacyPrefix]) {
      expect(getParagraphAttachmentTarget({
        type: "paragraph",
        children: [{ type: "text", content: prefix }, { type: "link", attributes: { href }, children: [{ type: "text", content: "report.pdf" }] }],
      })).toEqual(attachmentTarget);
    }
  });

  test("validates attachment targets received from the DOM editor", () => {
    expect(parseMobileAttachmentTargetJson(JSON.stringify(attachmentTarget))).toEqual(attachmentTarget);
    expect(parseMobileAttachmentTargetJson(JSON.stringify({ ...attachmentTarget, resourceId: "different" }))).toBeNull();
    expect(parseMobileAttachmentTargetJson(JSON.stringify({ ...attachmentTarget, kind: "image" }))).toBeNull();
  });

  test("renames the linked label", () => {
    const updated = renameMobileAttachmentInDoc(doc, attachmentTarget, "final.pdf", ATTACHMENT_TEXT_PREFIX);
    expect(updated.content[0].content[0].text).toBe(`${ATTACHMENT_TEXT_PREFIX}final.pdf`);
  });

  test("removes a standalone attachment paragraph", () => {
    expect(deleteMobileAttachmentFromDoc(doc, attachmentTarget)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  test("removes the legacy prefix left beside a deleted attachment link", () => {
    const legacyDoc = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: legacyPrefix },
          { type: "text", text: "report.pdf", marks: [{ type: "link", attrs: { href, class: "rtnote-attachment-link" } }] },
        ],
      }],
    };
    expect(deleteMobileAttachmentFromDoc(legacyDoc, attachmentTarget).content).toEqual([{ type: "paragraph" }]);
  });

  test("removes and renames file and PDF attachment nodes", () => {
    const videoTarget = {
      filename: "clip.mp4",
      href: "/api/v1/resources/res_video/blob",
      kind: "attachment",
      resourceId: "res_video",
    };
    const nodeDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{
            type: "rtnoteFileAttachment",
            attrs: {
              url: "rtnote-resource://resource/res_video",
              label: `${legacyPrefix}clip.mp4`,
              filename: "clip.mp4",
              mimeType: "video/mp4",
            },
          }],
        },
        {
          type: "paragraph",
          content: [{
            type: "rtnotePdfAttachment",
            attrs: {
              url: href,
              label: `${ATTACHMENT_TEXT_PREFIX}report.pdf`,
              filename: "report.pdf",
            },
          }],
        },
      ],
    };

    const renamed = renameMobileAttachmentInDoc(nodeDoc, videoTarget, "final.mp4", ATTACHMENT_TEXT_PREFIX);
    expect(renamed.content[0].content[0]).toEqual({
      type: "rtnoteFileAttachment",
      attrs: {
        url: "rtnote-resource://resource/res_video",
        label: `${ATTACHMENT_TEXT_PREFIX}final.mp4`,
        filename: "final.mp4",
        mimeType: "video/mp4",
      },
    });
    expect(renamed.content[1].content[0].type).toBe("rtnotePdfAttachment");
    expect(deleteMobileAttachmentFromDoc(nodeDoc, videoTarget).content).toEqual([{
      type: "paragraph",
      content: [{
        type: "rtnotePdfAttachment",
        attrs: {
          url: href,
          label: `${ATTACHMENT_TEXT_PREFIX}report.pdf`,
          filename: "report.pdf",
        },
      }],
    }]);
  });

  test("recognizes and validates image resources", () => {
    const target = { filename: "photo.jpg", href, kind: "image", resourceId: "res_123" };
    expect(getMobileImageTarget(href, "photo.jpg")).toEqual(target);
    expect(parseMobileResourceTargetJson(JSON.stringify(target))).toEqual(target);
    expect(getMobileImageTarget("https://example.com/photo.jpg", "photo.jpg")).toBeNull();
  });

  test("renames and removes image nodes", () => {
    const target = { filename: "photo.jpg", href, kind: "image", resourceId: "res_123" };
    const imageDoc = {
      type: "doc",
      content: [{ type: "image", attrs: { alt: "photo.jpg", src: href, title: null } }],
    };
    expect(renameMobileResourceInDoc(imageDoc, target, "passport.jpg", ATTACHMENT_TEXT_PREFIX)).toEqual({
      type: "doc",
      content: [{ type: "image", attrs: { alt: "passport.jpg", src: href, title: "passport.jpg" } }],
    });
    expect(deleteMobileResourceFromDoc(imageDoc, target)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  test("resolves export mime types and filenames for SAF", () => {
    expect(resolveResourceMimeType("photo.webp", "")).toBe("image/webp");
    expect(resolveResourceMimeType("RTNote geek cat", "image/svg+xml")).toBe("image/svg+xml");
    expect(resolveExportFilename("RTNote geek cat", "image/svg+xml")).toBe("RTNote geek cat.svg");
    expect(resolveExportFilename("report.pdf", "application/pdf")).toBe("report.pdf");
  });

  test("reads blob bytes via FileReader when Blob.arrayBuffer is missing (React Native)", async () => {
    const payload = new Uint8Array([1, 2, 3, 250]);
    const standard = new Blob([payload], { type: "image/webp" });
    expect([...await readBlobAsUint8Array(standard)]).toEqual([1, 2, 3, 250]);

    // RN Blob has no arrayBuffer(); previously openMobileResource threw
    // "undefined is not a function" at blob.arrayBuffer().
    const rnLike = { type: "image/webp", size: payload.byteLength };
    expect(rnLike.arrayBuffer).toBeUndefined();

    const OriginalFileReader = globalThis.FileReader;
    class FakeFileReader {
      result = null;
      error = null;
      onerror = null;
      onloadend = null;
      readAsArrayBuffer(blob) {
        expect(blob).toBe(rnLike);
        void Promise.resolve().then(() => {
          this.result = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
          this.onloadend?.();
        });
      }
    }
    globalThis.FileReader = FakeFileReader;
    try {
      expect([...await readBlobAsUint8Array(/** @type {any} */ (rnLike))]).toEqual([1, 2, 3, 250]);
    } finally {
      globalThis.FileReader = OriginalFileReader;
    }
  });
});
