import { useRef } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  NOTE_DEFAULT_FONT_SIZE,
  NOTE_FONT_FAMILIES,
  NOTE_FONT_SIZES,
  NOTE_LINE_HEIGHTS,
  TEXT_ALIGNMENTS,
  normalizeFontFamily,
  normalizeFontSize,
  normalizeLineHeight,
  normalizeTextAlignment,
  type TextAlignment,
} from "@edgeever/shared";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ChevronDown, RemoveFormatting, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const triggerClassName = "flex h-8 shrink-0 items-center justify-center gap-0.5 rounded-md px-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:pointer-events-none disabled:opacity-40";

const ALIGNMENT_ICONS: Record<TextAlignment, typeof AlignLeft> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
};

/** Generic stacks have translated names; named fonts keep their own name. */
const useFontLabel = () => {
  const { t } = useTranslation();
  return (font: (typeof NOTE_FONT_FAMILIES)[number]) =>
    font.id === "sans" || font.id === "serif" || font.id === "mono" ? t(`editorToolbar.fontNames.${font.id}`) : font.label;
};

const isCodeSelection = (editor: Editor | null | undefined) => Boolean(editor?.isActive("codeBlock") || editor?.isActive("code"));

/** Font family and size for the selected text. */
export const EditorFontMenu = ({ editor, readOnly }: { editor: Editor | null; readOnly: boolean }) => {
  const { t } = useTranslation();
  const fontLabel = useFontLabel();
  const applied = useRef(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      fontFamily: normalizeFontFamily(current?.getAttributes("textStyle").fontFamily) ?? "",
      fontSize: normalizeFontSize(current?.getAttributes("textStyle").fontSize) ?? "",
      code: isCodeSelection(current),
    }),
  });
  const disabled = readOnly || !editor || editor.isDestroyed || Boolean(state?.code);
  const run = (command: (current: Editor) => void) => {
    if (!editor || editor.isDestroyed || disabled) return;
    applied.current = true;
    command(editor);
  };
  const familyKnown = NOTE_FONT_FAMILIES.some((font) => font.value === state?.fontFamily);
  return (
    <DropdownMenu onOpenChange={(open) => { if (open) applied.current = false; }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t("editorToolbar.font")} disabled={disabled} onMouseDown={(event) => event.preventDefault()} className={triggerClassName}>
              <Type aria-hidden="true" className="h-4 w-4" />
              <ChevronDown aria-hidden="true" className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("editorToolbar.font")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        className="max-h-[70vh] w-60 overflow-y-auto p-1"
        onCloseAutoFocus={(event) => { if (applied.current) event.preventDefault(); }}
      >
        <DropdownMenuLabel className="px-2 text-xs text-slate-500">{t("editorToolbar.fontFamily")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-label={t("editorToolbar.fontFamily")}
          value={familyKnown || !state?.fontFamily ? state?.fontFamily ?? "" : "custom"}
          onValueChange={(value) => run((current) => {
            if (value === "custom") return;
            if (value) current.chain().focus().setFontFamily(value).run();
            else current.chain().focus().unsetFontFamily().run();
          })}
        >
          <DropdownMenuRadioItem value="">{t("editorToolbar.defaultFont")}</DropdownMenuRadioItem>
          {NOTE_FONT_FAMILIES.map((font) => (
            <DropdownMenuRadioItem key={font.id} value={font.value} style={{ fontFamily: font.value }}>
              {fontLabel(font)}
            </DropdownMenuRadioItem>
          ))}
          {!familyKnown && state?.fontFamily ? (
            <DropdownMenuRadioItem value="custom" style={{ fontFamily: state.fontFamily }}>
              {state.fontFamily.split(",")[0]?.replaceAll("'", "")}
            </DropdownMenuRadioItem>
          ) : null}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 text-xs text-slate-500">{t("editorToolbar.fontSize")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-label={t("editorToolbar.fontSize")}
          value={state?.fontSize || NOTE_DEFAULT_FONT_SIZE}
          onValueChange={(value) => run((current) => current.chain().focus().setFontSize(value).run())}
          className="grid grid-cols-4 gap-1 px-1"
        >
          {NOTE_FONT_SIZES.map((size) => (
            <DropdownMenuRadioItem
              key={size}
              value={size}
              aria-label={size === NOTE_DEFAULT_FONT_SIZE ? `${t("editorToolbar.defaultSize")} (${size})` : size}
              className="justify-center rounded-md border border-slate-200 px-0 py-1 text-xs tabular-nums data-[state=checked]:border-slate-600 data-[state=checked]:ring-1 data-[state=checked]:ring-slate-600 [&>span:first-child]:hidden"
            >
              {size.replace("px", "")}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="mt-2" />
        <DropdownMenuItem disabled={disabled} onSelect={() => run((current) => current.chain().focus().unsetFontFamily().unsetFontSize().run())}>
          <RemoveFormatting aria-hidden="true" className="mr-2 h-4 w-4" />
          {t("editorToolbar.resetFont")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Paragraph alignment and line spacing. */
export const EditorAlignMenu = ({ editor, readOnly }: { editor: Editor | null; readOnly: boolean }) => {
  const { t } = useTranslation();
  const applied = useRef(false);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const block = current?.isActive("heading") ? current.getAttributes("heading") : current?.getAttributes("paragraph");
      return {
        textAlign: normalizeTextAlignment(block?.textAlign) ?? "left",
        lineHeight: normalizeLineHeight(block?.lineHeight) ?? "",
        canAlign: Boolean(current && !current.isDestroyed && current.can().setTextAlign("center")),
      };
    },
  });
  const disabled = readOnly || !editor || editor.isDestroyed || !state?.canAlign;
  const run = (command: (current: Editor) => void) => {
    if (!editor || editor.isDestroyed || disabled) return;
    applied.current = true;
    command(editor);
  };
  const ActiveIcon = ALIGNMENT_ICONS[state?.textAlign ?? "left"];
  return (
    <DropdownMenu onOpenChange={(open) => { if (open) applied.current = false; }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t("editorToolbar.alignment")} disabled={disabled} onMouseDown={(event) => event.preventDefault()} className={triggerClassName}>
              <ActiveIcon aria-hidden="true" className="h-4 w-4" />
              <ChevronDown aria-hidden="true" className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("editorToolbar.alignment")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-52 p-1" onCloseAutoFocus={(event) => { if (applied.current) event.preventDefault(); }}>
        <DropdownMenuRadioGroup
          aria-label={t("editorToolbar.alignment")}
          value={state?.textAlign ?? "left"}
          onValueChange={(value) => run((current) => current.chain().focus().setTextAlign(value as TextAlignment).run())}
        >
          {TEXT_ALIGNMENTS.map((alignment) => {
            const Icon = ALIGNMENT_ICONS[alignment];
            return (
              <DropdownMenuRadioItem key={alignment} value={alignment}>
                <Icon aria-hidden="true" className="mr-2 h-4 w-4" />
                {t(`editorToolbar.textAlignments.${alignment}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 text-xs text-slate-500">{t("editorToolbar.lineSpacing")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          aria-label={t("editorToolbar.lineSpacing")}
          value={state?.lineHeight ?? ""}
          onValueChange={(value) => run((current) => {
            if (value) current.chain().focus().setLineHeight(value).run();
            else current.chain().focus().unsetLineHeight().run();
          })}
        >
          <DropdownMenuRadioItem value="">{t("editorToolbar.defaultLineSpacing")}</DropdownMenuRadioItem>
          {NOTE_LINE_HEIGHTS.map((lineHeight) => (
            <DropdownMenuRadioItem key={lineHeight} value={lineHeight} className="tabular-nums">{lineHeight}</DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
