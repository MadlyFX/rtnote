/**
 * Shared catalog keys whose `{{placeholder}}` templates Android copy relies on,
 * for example the text built by `translate(\`Delete ${count} notes permanently\`)`.
 * Other catalog templates are not applied to mobile text: English templates
 * such as "Open {{name}}" would also rewrite ordinary sentences and note titles.
 */
export const MOBILE_SHARED_TEMPLATE_KEYS: ReadonlySet<string> = new Set<string>([
  "dialogs.memoDelete.permanentBulkTitle",
  "editor.collapseOutlineHeading",
  "editor.expandOutlineHeading",
  "editor.switchToNotebook",
  "editor.tagPicker.memoCount",
  "editor.tagPicker.remove",
  "memoCard.select",
  "memoCard.unselect",
  "memoList.constrainedCount",
  "memoList.filterConstraint",
  "memoList.filterTitle",
  "memoList.memoCount",
  "memoList.searchResults",
  "memoList.selectionCount",
  "mobileNotebookPicker.collapse",
  "mobileNotebookPicker.current",
  "mobileNotebookPicker.currentNotebook",
  "mobileNotebookPicker.expand",
  "mobileNotebookPicker.switchToNotebook",
  "mobileSheets.selectionCount",
  "notebookTree.collapse",
  "notebookTree.current",
  "notebookTree.expand",
  "notebookTree.switchTo",
  "revisions.revisionName",
  "structuredTable.downloadAttachment",
  "tagsDialog.memoCount",
]);
