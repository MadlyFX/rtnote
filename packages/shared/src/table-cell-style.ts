/** Cell colour values without editor dependencies, for Workers. */
import { normalizeTextColor } from "./text-color-values";

export const CELL_BORDER_NONE = "none";

export type TableCellStyle = {
  backgroundColor: string | null;
  borderColor: string | null;
};

/** A border is either hidden (`none`) or a hex colour. */
export const normalizeCellBorder = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().toLowerCase() === CELL_BORDER_NONE) return CELL_BORDER_NONE;
  return normalizeTextColor(value);
};
