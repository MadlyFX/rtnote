import "katex/dist/katex.min.css";
import { useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { createRTNoteDocumentExtensions, type TiptapDoc } from "@rtnote/shared";
import { createRTNoteMathematics } from "@rtnote/shared/mathematics";
import { RTNoteLink } from "@rtnote/shared/editor-link";
import { EditorToolbar } from "./EditorToolbar";

/**
 * Rich-text editor for a template body. Templates are stored as rich text
 * like notes, so they keep colours, fonts, alignment and tables.
 */
export const TemplateRichEditor = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  /** Initial document. Later changes to this prop are ignored. */
  value: TiptapDoc;
  onChange: (doc: TiptapDoc) => void;
  placeholder: string;
  ariaLabel: string;
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      ...createRTNoteDocumentExtensions({
        mathematics: createRTNoteMathematics(),
        starterKit: { link: false },
        table: { table: { resizable: true } },
      }),
      RTNoteLink,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        role: "textbox",
        class: "note-prose min-h-48 px-4 py-3 text-sm outline-none",
      },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getJSON() as TiptapDoc),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-card focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-400/25">
      <div className="border-b border-slate-200">
        <EditorToolbar editor={editor} readOnly={false} />
      </div>
      <div className="max-h-[50vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
