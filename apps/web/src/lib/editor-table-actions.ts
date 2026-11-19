import type { Editor } from "@tiptap/react";
import { isInTable, selectedRect } from "@tiptap/pm/tables";
import { CELL_BORDER_NONE, normalizeCellBorder, normalizeTextColor } from "@rtnote/shared";

const targetsHeaderRow = (editor: Editor) => {
  // CellSelection.from/to describe the head cell, so isActive("tableHeader")
  // misses header rows included elsewhere in a rectangular cell selection.
  // The first row is the header row when it holds any header cell. A header
  // column puts a header cell in every row, so later rows only count when
  // they are made entirely of header cells.
  const { table, top, bottom } = selectedRect(editor.state);
  for (let rowIndex = top; rowIndex < bottom; rowIndex++) {
    const row = table.child(rowIndex);
    let headers = 0;
    for (let cellIndex = 0; cellIndex < row.childCount; cellIndex++) {
      if (row.child(cellIndex).type.spec.tableRole === "header_cell") headers++;
    }
    if (headers > 0 && (rowIndex === 0 || headers === row.childCount)) return true;
  }
  return false;
};

const tableReady = (editor: Editor | null): editor is Editor =>
  Boolean(editor && !editor.isDestroyed && editor.isActive("table") && isInTable(editor.state));

type TableAction = {
  key: string;
  command: "addRowAfter" | "deleteRow" | "addColumnAfter" | "deleteColumn" | "mergeCells" | "splitCell" | "toggleHeaderRow" | "toggleHeaderColumn" | "deleteTable";
  protectHeader?: boolean;
  destructive?: boolean;
  /** Commands that only apply to some selections, such as merging. */
  requiresCan?: boolean;
  /** Starts a new group in the menu. */
  separated?: boolean;
};

const ACTIONS: readonly TableAction[] = [
  { key: "editorToolbar.addTableRow", command: "addRowAfter" },
  { key: "editorToolbar.deleteTableRow", command: "deleteRow", protectHeader: true },
  { key: "editorToolbar.addTableColumn", command: "addColumnAfter" },
  { key: "editorToolbar.deleteTableColumn", command: "deleteColumn" },
  { key: "editorToolbar.mergeTableCells", command: "mergeCells", requiresCan: true, separated: true },
  { key: "editorToolbar.splitTableCell", command: "splitCell", requiresCan: true },
  { key: "editorToolbar.toggleTableHeader", command: "toggleHeaderRow", separated: true },
  { key: "editorToolbar.toggleTableHeaderColumn", command: "toggleHeaderColumn" },
  { key: "editorToolbar.deleteTable", command: "deleteTable", destructive: true },
];

/** Both menus share commands and the existing header-row protection. */
export const getEditorTableActions = (editor: Editor | null, readOnly: boolean) => {
  const inTable = tableReady(editor);
  const headerRow = inTable && editor ? targetsHeaderRow(editor) : false;
  return ACTIONS.map((action) => ({
    key: action.key,
    destructive: Boolean(action.destructive),
    separated: Boolean(action.separated),
    disabled: readOnly || !inTable || !editor?.isEditable
      || (Boolean(action.protectHeader) && headerRow)
      || (Boolean(action.requiresCan) && !editor.can()[action.command]()),
    run: ({ focus = true }: { focus?: boolean } = {}) => {
      if (!tableReady(editor) || !editor.isEditable || readOnly) return;
      if (action.protectHeader && targetsHeaderRow(editor)) return;
      const chain = editor.chain();
      if (focus) chain.focus();
      chain[action.command]().run();
    },
  }));
};

export type TableCellStyleProperty = "backgroundColor" | "borderColor";

/** Current cell colour and border, read from the cell holding the selection head. */
export const getTableCellStyle = (editor: Editor | null) => {
  if (!tableReady(editor)) return { backgroundColor: null, borderColor: null };
  const attributes = editor.isActive("tableHeader") ? editor.getAttributes("tableHeader") : editor.getAttributes("tableCell");
  return {
    backgroundColor: normalizeTextColor(attributes.backgroundColor),
    borderColor: normalizeCellBorder(attributes.borderColor),
  };
};

/** Applies a cell colour or border to every selected cell; an empty value clears it. */
export const setTableCellStyle = (
  editor: Editor | null,
  readOnly: boolean,
  property: TableCellStyleProperty,
  value: string,
  { focus = true }: { focus?: boolean } = {},
) => {
  if (!tableReady(editor) || !editor.isEditable || readOnly) return false;
  const normalized = property === "borderColor"
    ? (value === CELL_BORDER_NONE ? CELL_BORDER_NONE : normalizeTextColor(value))
    : normalizeTextColor(value);
  const chain = editor.chain();
  if (focus) chain.focus();
  return chain.setCellAttribute(property, normalized).run();
};
