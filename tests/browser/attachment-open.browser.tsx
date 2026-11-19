// Open via Vite's /@fs/<checkout>/tests/browser/attachment-open.html.
// The real TipTap attachment card and PDF viewer share a controlled IPC mock.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Editor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { zhCN } from "../../packages/shared/src/i18n/zh-CN";
import { FileAttachment } from "../../apps/web/src/components/editor/FileAttachment";
import { PdfViewer } from "../../apps/web/src/components/pdf/PdfViewer";
import "../../apps/web/src/styles/globals.css";

const i18n = i18next.createInstance();
await i18n.init({ lng: "zh-CN", resources: { "zh-CN": { translation: zhCN } }, initAsync: false });
let resolveOpen: ((value: { ok: boolean; code?: string }) => void) | undefined;
const calls: Array<{ url: string; filename: string }> = [];
Object.defineProperty(window, "rtnoteDesktop", { configurable: true, value: {
  isAvailable: true,
  apiBaseUrl: "http://attachment-fixture.invalid",
  openAttachment: (input: { url: string; filename: string }) => {
    calls.push(input);
    document.getElementById("calls")!.textContent = JSON.stringify(calls);
    return new Promise((resolve) => { resolveOpen = resolve; });
  },
} });
const editor = new Editor({ extensions: [StarterKit, FileAttachment], content: {
  type: "doc", content: [{ type: "paragraph", content: [{ type: FileAttachment.name, attrs: {
    url: "rtnote-resource://resource/sheet_1", label: "Training plan.xlsx", filename: "Training plan.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", byteSize: 6440,
  } }] }],
} });
const Fixture = () => {
  const [desktop, setDesktop] = useState(true);
  return <I18nextProvider i18n={i18n}>
    <div className="my-4 flex flex-wrap gap-3">
      <button onClick={() => resolveOpen?.({ ok: true })}>Finish opening</button>
      <button onClick={() => resolveOpen?.({ ok: false, code: "unavailable" })}>Simulate offline without cache</button>
      <button onClick={() => resolveOpen?.({ ok: false, code: "blocked" })}>Simulate blocked file</button>
      <button onClick={() => resolveOpen?.({ ok: false, code: "open-failed" })}>Simulate no associated app</button>
      <button onClick={() => {
        const next = !desktop;
        window.rtnoteDesktop!.isAvailable = next;
        editor.commands.setContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: FileAttachment.name, attrs: {
          url: next ? "rtnote-resource://resource/sheet_1" : "/api/v1/resources/sheet_1/blob",
          label: "Training plan.xlsx", filename: "Training plan.xlsx", byteSize: 6440,
        } }] }] });
        setDesktop(next);
      }}>Runtime: {desktop ? "Desktop" : "Web"}</button>
    </div>
    <EditorContent editor={editor} />
    <PdfViewer url={desktop ? "rtnote-staged://pdf_1" : "/api/v1/resources/pdf_1/blob"} label="Report.pdf" filename="Report.pdf" byteSize={1000} />
    <pre id="calls" className="mt-5 whitespace-pre-wrap text-xs">[]</pre>
  </I18nextProvider>;
};
createRoot(document.getElementById("fixture")!).render(<Fixture />);
