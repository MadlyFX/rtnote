/** Palette and colour normalizer without editor dependencies, for Workers. */
export const TEXT_COLORS = [
  { name: "gray", text: "#787774", background: "#f1f1ef", darkText: "#b8b7b3", darkBackground: "#373735" },
  { name: "brown", text: "#9f6b53", background: "#f4eeee", darkText: "#c99b82", darkBackground: "#493a34" },
  { name: "orange", text: "#c76b21", background: "#fbecdd", darkText: "#e6a064", darkBackground: "#523b28" },
  { name: "yellow", text: "#9b7800", background: "#fbf3db", darkText: "#dfc36a", darkBackground: "#4f462b" },
  { name: "green", text: "#448361", background: "#edf3ec", darkText: "#8dc5a5", darkBackground: "#2d4437" },
  { name: "blue", text: "#337ea9", background: "#e7f3f8", darkText: "#82bce0", darkBackground: "#293f50" },
  { name: "purple", text: "#9065b0", background: "#f4f0f7", darkText: "#bd9cdb", darkBackground: "#443451" },
  { name: "pink", text: "#b34c82", background: "#f9eef3", darkText: "#e29cbe", darkBackground: "#503346" },
  { name: "red", text: "#c94343", background: "#fce9e7", darkText: "#ec9691", darkBackground: "#543432" },
] as const;

// Markdown is also parsed in Workers, where there is no DOM. Keep the portable
// syntax deliberately small: hex colours plus the font family and size values
// that text-formatting.ts accepts.
export const normalizeTextColor = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const color = value.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(color)) return color;
  if (/^#[\da-f]{3}$/.test(color)) return `#${color.slice(1).split("").map((digit) => digit.repeat(2)).join("")}`;
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(color);
  if (!rgb || rgb.slice(1).some((part) => Number(part) > 255)) return null;
  return `#${rgb.slice(1).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
};
