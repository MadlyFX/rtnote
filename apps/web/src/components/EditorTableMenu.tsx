import { Fragment } from "react";
import { CELL_BORDER_NONE, TEXT_COLORS } from "@rtnote/shared";
import { getEditorTableActions, getTableCellStyle, setTableCellStyle, type TableCellStyleProperty } from "@/lib/editor-table-actions";
import { useEditorState, type Editor } from "@tiptap/react";
import { Table } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type EditorTableMenuProps = {
  editor: Editor | null;
  readOnly: boolean;
};

const swatchClassName = "relative flex h-9 justify-center rounded-md border border-slate-200 p-0 data-[state=checked]:border-slate-600 data-[state=checked]:ring-1 data-[state=checked]:ring-slate-600 [&>span:first-child]:hidden";

/** Palette grid for a cell's background or border. */
const TableCellStyleSubmenu = ({ editor, readOnly, property, value, disabled }: {
  editor: Editor | null;
  readOnly: boolean;
  property: TableCellStyleProperty;
  value: string;
  disabled: boolean;
}) => {
  const { t } = useTranslation();
  const label = t(property === "backgroundColor" ? "editorToolbar.tableCellColor" : "editorToolbar.tableCellBorder");
  const choices = [
    { value: "", name: "default", label: t(property === "backgroundColor" ? "editorToolbar.tableCellNoColor" : "editorToolbar.tableCellDefaultBorder") },
    ...(property === "borderColor" ? [{ value: CELL_BORDER_NONE, name: CELL_BORDER_NONE, label: t("editorToolbar.tableCellNoBorder") }] : []),
    ...TEXT_COLORS.map((color) => ({
      value: property === "backgroundColor" ? color.background : color.text,
      name: color.name,
      label: t("editorToolbar.colorNames." + color.name),
    })),
  ];
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled}>{label}</DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56 p-2">
        <DropdownMenuRadioGroup aria-label={label} value={value} onValueChange={(next) => setTableCellStyle(editor, readOnly, property, next)} className="grid grid-cols-5 gap-1">
          {choices.map((choice) => (
            <Tooltip key={choice.name}>
              <TooltipTrigger asChild>
                <DropdownMenuRadioItem value={choice.value} aria-label={choice.label} textValue={choice.label} disabled={disabled} className={swatchClassName}>
                  <span
                    aria-hidden="true"
                    className={cn("h-6 w-6 rounded", property === "borderColor" ? "border-2" : "border border-slate-200")}
                    data-ee-background-color={property === "backgroundColor" ? choice.name : undefined}
                    data-ee-border-color={property === "borderColor" ? choice.name : undefined}
                    style={property === "backgroundColor"
                      ? { backgroundColor: choice.value || undefined }
                      : { borderColor: choice.value === CELL_BORDER_NONE ? "transparent" : choice.value || undefined, borderStyle: choice.value === CELL_BORDER_NONE ? "dashed" : "solid" }}
                  />
                </DropdownMenuRadioItem>
              </TooltipTrigger>
              <TooltipContent>{choice.label}</TooltipContent>
            </Tooltip>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export const EditorTableMenu = ({ editor, readOnly }: EditorTableMenuProps) => {
  const { t } = useTranslation();
  const ready = Boolean(editor && !editor.isDestroyed);
  const tableActiveState = useEditorState({
    editor,
    selector: ({ editor: activeEditor }) => ({
      inTable: activeEditor?.isActive("table") ?? false,
      disabled: getEditorTableActions(activeEditor, readOnly).map((action) => action.disabled),
      cellStyle: getTableCellStyle(activeEditor),
    }),
  });
  const inTable = Boolean(tableActiveState?.inTable);
  const disabled = readOnly || !ready;
  const cellStyleDisabled = disabled || !inTable || !editor?.isEditable;

  const run = (command: (activeEditor: Editor) => void) => {
    if (!editor || editor.isDestroyed || readOnly) {
      return;
    }

    command(editor);
  };

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition disabled:pointer-events-none disabled:opacity-40",
                inTable
                  ? "bg-slate-200/80 text-slate-900"
                  : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              )}
              type="button"
              aria-label={t("editorToolbar.table")}
              aria-pressed={inTable || undefined}
              disabled={disabled}
            >
              <Table aria-hidden="true" className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("editorToolbar.table")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        <DropdownMenuItem disabled={inTable} onSelect={() => run((activeEditor) => activeEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
          {t("editorToolbar.insertTable")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {getEditorTableActions(editor, readOnly).map((action) => (
          <Fragment key={action.key}>
            {action.destructive ? (
              <>
                <DropdownMenuSeparator />
                <TableCellStyleSubmenu editor={editor} readOnly={readOnly} property="backgroundColor" value={tableActiveState?.cellStyle.backgroundColor ?? ""} disabled={cellStyleDisabled} />
                <TableCellStyleSubmenu editor={editor} readOnly={readOnly} property="borderColor" value={tableActiveState?.cellStyle.borderColor ?? ""} disabled={cellStyleDisabled} />
              </>
            ) : null}
            {action.destructive || action.separated ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem disabled={action.disabled} className={action.destructive ? "text-rose-700 focus:text-rose-800" : undefined} onSelect={() => action.run()}>
              {t(action.key)}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
