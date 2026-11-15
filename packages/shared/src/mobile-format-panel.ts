import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { isInTable } from "@tiptap/pm/tables";
import type { MobileEditorLocale } from "./mobile-editor";
import { IMAGE_FIGURE_NODE_TYPE } from "./image-figure";
import { IMAGE_GALLERY_NODE_TYPE } from "./image-gallery";
import { CELL_BORDER_NONE, normalizeCellBorder } from "./rich-table-markdown";
import { normalizeTextColor, TEXT_COLORS } from "./text-colors";
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
} from "./text-formatting";

/**
 * The "Format" sheet of the Android and iOS editors. Both run TipTap inside a
 * WebView, so the panel is plain DOM and shared: font, size, alignment, line
 * spacing, image captions and table cell tools, each shown when it applies.
 */

type FormatPanelCopy = {
  title: string;
  close: string;
  font: string;
  defaultFont: string;
  fontNames: { sans: string; serif: string; mono: string };
  size: string;
  defaultSize: string;
  alignment: string;
  alignments: Record<TextAlignment, string>;
  lineSpacing: string;
  defaultLineSpacing: string;
  image: string;
  addCaption: string;
  removeCaption: string;
  table: string;
  mergeCells: string;
  splitCell: string;
  headerRow: string;
  headerColumn: string;
  cellColor: string;
  noCellColor: string;
  cellBorder: string;
  defaultBorder: string;
  noBorder: string;
  colors: Record<(typeof TEXT_COLORS)[number]["name"], string>;
};

const FORMAT_PANEL_COPY: Record<MobileEditorLocale, FormatPanelCopy> = {
  "en-US": {
    title: "Format", close: "Close", font: "Font", defaultFont: "Default font",
    fontNames: { sans: "Sans serif", serif: "Serif", mono: "Monospace" },
    size: "Size", defaultSize: "Default size", alignment: "Alignment",
    alignments: { left: "Align left", center: "Center", right: "Align right", justify: "Justify" },
    lineSpacing: "Line spacing", defaultLineSpacing: "Default spacing", image: "Image",
    addCaption: "Add caption", removeCaption: "Remove caption", table: "Table",
    mergeCells: "Merge cells", splitCell: "Split cell", headerRow: "Header row", headerColumn: "Header column",
    cellColor: "Cell color", noCellColor: "No color", cellBorder: "Cell border", defaultBorder: "Default border", noBorder: "No border",
    colors: { gray: "Gray", brown: "Brown", orange: "Orange", yellow: "Yellow", green: "Green", blue: "Blue", purple: "Purple", pink: "Pink", red: "Red" },
  },
  "zh-CN": {
    title: "格式", close: "关闭", font: "字体", defaultFont: "默认字体",
    fontNames: { sans: "无衬线", serif: "衬线", mono: "等宽" },
    size: "字号", defaultSize: "默认字号", alignment: "对齐",
    alignments: { left: "左对齐", center: "居中", right: "右对齐", justify: "两端对齐" },
    lineSpacing: "行距", defaultLineSpacing: "默认行距", image: "图片",
    addCaption: "添加图注", removeCaption: "移除图注", table: "表格",
    mergeCells: "合并单元格", splitCell: "拆分单元格", headerRow: "标题行", headerColumn: "标题列",
    cellColor: "单元格颜色", noCellColor: "无颜色", cellBorder: "单元格边框", defaultBorder: "默认边框", noBorder: "无边框",
    colors: { gray: "灰色", brown: "棕色", orange: "橙色", yellow: "黄色", green: "绿色", blue: "蓝色", purple: "紫色", pink: "粉色", red: "红色" },
  },
  "zh-TW": {
    title: "格式", close: "關閉", font: "字型", defaultFont: "預設字型",
    fontNames: { sans: "無襯線", serif: "襯線", mono: "等寬" },
    size: "字級", defaultSize: "預設字級", alignment: "對齊",
    alignments: { left: "靠左對齊", center: "置中", right: "靠右對齊", justify: "左右對齊" },
    lineSpacing: "行距", defaultLineSpacing: "預設行距", image: "圖片",
    addCaption: "新增圖說", removeCaption: "移除圖說", table: "表格",
    mergeCells: "合併儲存格", splitCell: "分割儲存格", headerRow: "標題列", headerColumn: "標題欄",
    cellColor: "儲存格顏色", noCellColor: "無顏色", cellBorder: "儲存格框線", defaultBorder: "預設框線", noBorder: "無框線",
    colors: { gray: "灰色", brown: "棕色", orange: "橙色", yellow: "黃色", green: "綠色", blue: "藍色", purple: "紫色", pink: "粉紅色", red: "紅色" },
  },
  ja: {
    title: "書式", close: "閉じる", font: "フォント", defaultFont: "既定のフォント",
    fontNames: { sans: "ゴシック体", serif: "明朝体", mono: "等幅" },
    size: "サイズ", defaultSize: "既定のサイズ", alignment: "配置",
    alignments: { left: "左揃え", center: "中央揃え", right: "右揃え", justify: "両端揃え" },
    lineSpacing: "行間", defaultLineSpacing: "既定の行間", image: "画像",
    addCaption: "キャプションを追加", removeCaption: "キャプションを削除", table: "表",
    mergeCells: "セルを結合", splitCell: "セルを分割", headerRow: "見出し行", headerColumn: "見出し列",
    cellColor: "セルの色", noCellColor: "色なし", cellBorder: "セルの罫線", defaultBorder: "既定の罫線", noBorder: "罫線なし",
    colors: { gray: "グレー", brown: "ブラウン", orange: "オレンジ", yellow: "イエロー", green: "グリーン", blue: "ブルー", purple: "パープル", pink: "ピンク", red: "レッド" },
  },
  pl: {
    title: "Formatowanie", close: "Zamknij", font: "Czcionka", defaultFont: "Domyślna czcionka",
    fontNames: { sans: "Bezszeryfowa", serif: "Szeryfowa", mono: "Stałej szerokości" },
    size: "Rozmiar", defaultSize: "Domyślny rozmiar", alignment: "Wyrównanie",
    alignments: { left: "Wyrównaj do lewej", center: "Wyśrodkuj", right: "Wyrównaj do prawej", justify: "Wyjustuj" },
    lineSpacing: "Interlinia", defaultLineSpacing: "Domyślna interlinia", image: "Obraz",
    addCaption: "Dodaj podpis", removeCaption: "Usuń podpis", table: "Tabela",
    mergeCells: "Scal komórki", splitCell: "Podziel komórkę", headerRow: "Wiersz nagłówka", headerColumn: "Kolumna nagłówka",
    cellColor: "Kolor komórki", noCellColor: "Bez koloru", cellBorder: "Obramowanie komórki", defaultBorder: "Domyślne obramowanie", noBorder: "Bez obramowania",
    colors: { gray: "Szary", brown: "Brązowy", orange: "Pomarańczowy", yellow: "Żółty", green: "Zielony", blue: "Niebieski", purple: "Fioletowy", pink: "Różowy", red: "Czerwony" },
  },
  ru: {
    title: "Формат", close: "Закрыть", font: "Шрифт", defaultFont: "Шрифт по умолчанию",
    fontNames: { sans: "Без засечек", serif: "С засечками", mono: "Моноширинный" },
    size: "Размер", defaultSize: "Размер по умолчанию", alignment: "Выравнивание",
    alignments: { left: "По левому краю", center: "По центру", right: "По правому краю", justify: "По ширине" },
    lineSpacing: "Межстрочный интервал", defaultLineSpacing: "Интервал по умолчанию", image: "Изображение",
    addCaption: "Добавить подпись", removeCaption: "Удалить подпись", table: "Таблица",
    mergeCells: "Объединить ячейки", splitCell: "Разделить ячейку", headerRow: "Строка заголовка", headerColumn: "Столбец заголовка",
    cellColor: "Цвет ячейки", noCellColor: "Без цвета", cellBorder: "Граница ячейки", defaultBorder: "Граница по умолчанию", noBorder: "Без границы",
    colors: { gray: "Серый", brown: "Коричневый", orange: "Оранжевый", yellow: "Жёлтый", green: "Зелёный", blue: "Синий", purple: "Фиолетовый", pink: "Розовый", red: "Красный" },
  },
  es: {
    title: "Formato", close: "Cerrar", font: "Fuente", defaultFont: "Fuente predeterminada",
    fontNames: { sans: "Sans serif", serif: "Serif", mono: "Monoespaciada" },
    size: "Tamaño", defaultSize: "Tamaño predeterminado", alignment: "Alineación",
    alignments: { left: "Alinear a la izquierda", center: "Centrar", right: "Alinear a la derecha", justify: "Justificar" },
    lineSpacing: "Interlineado", defaultLineSpacing: "Interlineado predeterminado", image: "Imagen",
    addCaption: "Añadir pie de foto", removeCaption: "Quitar pie de foto", table: "Tabla",
    mergeCells: "Combinar celdas", splitCell: "Dividir celda", headerRow: "Fila de encabezado", headerColumn: "Columna de encabezado",
    cellColor: "Color de celda", noCellColor: "Sin color", cellBorder: "Borde de celda", defaultBorder: "Borde predeterminado", noBorder: "Sin borde",
    colors: { gray: "Gris", brown: "Marrón", orange: "Naranja", yellow: "Amarillo", green: "Verde", blue: "Azul", purple: "Morado", pink: "Rosa", red: "Rojo" },
  },
  de: {
    title: "Format", close: "Schließen", font: "Schriftart", defaultFont: "Standardschrift",
    fontNames: { sans: "Serifenlos", serif: "Serifen", mono: "Festbreite" },
    size: "Größe", defaultSize: "Standardgröße", alignment: "Ausrichtung",
    alignments: { left: "Linksbündig", center: "Zentriert", right: "Rechtsbündig", justify: "Blocksatz" },
    lineSpacing: "Zeilenabstand", defaultLineSpacing: "Standardabstand", image: "Bild",
    addCaption: "Bildunterschrift hinzufügen", removeCaption: "Bildunterschrift entfernen", table: "Tabelle",
    mergeCells: "Zellen verbinden", splitCell: "Zelle teilen", headerRow: "Kopfzeile", headerColumn: "Kopfspalte",
    cellColor: "Zellenfarbe", noCellColor: "Keine Farbe", cellBorder: "Zellenrahmen", defaultBorder: "Standardrahmen", noBorder: "Kein Rahmen",
    colors: { gray: "Grau", brown: "Braun", orange: "Orange", yellow: "Gelb", green: "Grün", blue: "Blau", purple: "Lila", pink: "Rosa", red: "Rot" },
  },
  fr: {
    title: "Mise en forme", close: "Fermer", font: "Police", defaultFont: "Police par défaut",
    fontNames: { sans: "Sans empattement", serif: "Avec empattement", mono: "Chasse fixe" },
    size: "Taille", defaultSize: "Taille par défaut", alignment: "Alignement",
    alignments: { left: "Aligner à gauche", center: "Centrer", right: "Aligner à droite", justify: "Justifier" },
    lineSpacing: "Interligne", defaultLineSpacing: "Interligne par défaut", image: "Image",
    addCaption: "Ajouter une légende", removeCaption: "Supprimer la légende", table: "Tableau",
    mergeCells: "Fusionner les cellules", splitCell: "Scinder la cellule", headerRow: "Ligne d’en-tête", headerColumn: "Colonne d’en-tête",
    cellColor: "Couleur de cellule", noCellColor: "Aucune couleur", cellBorder: "Bordure de cellule", defaultBorder: "Bordure par défaut", noBorder: "Aucune bordure",
    colors: { gray: "Gris", brown: "Marron", orange: "Orange", yellow: "Jaune", green: "Vert", blue: "Bleu", purple: "Violet", pink: "Rose", red: "Rouge" },
  },
};

export const getMobileFormatPanelCopy = (locale: MobileEditorLocale) => FORMAT_PANEL_COPY[locale] ?? FORMAT_PANEL_COPY["en-US"];

/** Placeholder for an empty caption in the mobile editors. */
export const getMobileCaptionPlaceholder = (locale: MobileEditorLocale) => {
  const copy = getMobileFormatPanelCopy(locale);
  return copy.addCaption;
};

const PANEL_STYLE_ID = "rtnote-format-panel-style";
const PANEL_CSS = `
.rtnote-format-panel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; max-height: 60vh; overflow-y: auto; padding: 8px 14px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid #e2e8f0; border-radius: 14px 14px 0 0; background: #ffffff; color: #1e293b; box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.12); font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-overflow-scrolling: touch; }
.rtnote-format-panel[hidden] { display: none; }
.rtnote-format-panel[data-theme="dark"] { border-color: #334155; background: #0f172a; color: #e2e8f0; }
.rtnote-format-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; font-weight: 600; }
.rtnote-format-panel-section { padding: 8px 0; border-top: 1px solid rgba(148, 163, 184, 0.25); }
.rtnote-format-panel-section:first-of-type { border-top: 0; }
.rtnote-format-panel-label { margin-bottom: 6px; font-size: 12px; color: #64748b; }
.rtnote-format-panel-row { display: flex; flex-wrap: wrap; gap: 6px; }
.rtnote-format-panel button, .rtnote-format-panel select { min-height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; background: transparent; color: inherit; font: inherit; }
.rtnote-format-panel button { padding: 0 12px; }
.rtnote-format-panel button[aria-pressed="true"] { border-color: #16a06e; background: rgba(22, 160, 110, 0.12); }
.rtnote-format-panel button:disabled { opacity: 0.4; }
.rtnote-format-panel select { flex: 1 1 140px; min-width: 0; padding: 0 8px; }
.rtnote-format-panel[data-theme="dark"] button, .rtnote-format-panel[data-theme="dark"] select { border-color: #475569; }
.rtnote-format-panel-close { border: 0 !important; font-size: 20px; line-height: 1; }
`;

const ALIGNMENT_GLYPHS: Record<TextAlignment, string> = {
  left: "M3 6h18M3 10h12M3 14h18M3 18h12",
  center: "M3 6h18M6 10h12M3 14h18M6 18h12",
  right: "M3 6h18M9 10h12M3 14h18M9 18h12",
  justify: "M3 6h18M3 10h18M3 14h18M3 18h18",
};

const alignmentIcon = (alignment: TextAlignment) =>
  `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${ALIGNMENT_GLYPHS[alignment]}"/></svg>`;

export type MobileFormatPanelOptions = {
  editor: Editor;
  locale: MobileEditorLocale;
  theme?: "light" | "dark";
  /** Called after the panel changed the document (iOS must report edits itself). */
  onChange?: () => void;
  /** Called when the panel opens or closes, for example to toggle a toolbar button. */
  onOpenChange?: (open: boolean) => void;
};

/** Image the selection is on, or null for images in galleries (they have no captions). */
const selectedImage = (editor: Editor) => {
  const { selection } = editor.state;
  if (!(selection instanceof NodeSelection)) return null;
  const node = selection.node;
  const position = node.type.name === IMAGE_FIGURE_NODE_TYPE ? selection.from + 1 : selection.from;
  const image = editor.state.doc.nodeAt(position);
  if (image?.type.name !== "image") return null;
  const parent = editor.state.doc.resolve(position).parent;
  if (parent.type.name === IMAGE_GALLERY_NODE_TYPE) return null;
  return { position, captioned: parent.type.name === IMAGE_FIGURE_NODE_TYPE };
};

const captionFigureImage = (editor: Editor) => {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === IMAGE_FIGURE_NODE_TYPE) return { position: $from.before(depth) + 1, captioned: true };
  }
  return null;
};

export const createMobileFormatPanel = (options: MobileFormatPanelOptions) => {
  const { editor } = options;
  const copy = getMobileFormatPanelCopy(options.locale);
  const document = editor.view.dom.ownerDocument;
  if (!document.getElementById(PANEL_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = PANEL_STYLE_ID;
    style.textContent = PANEL_CSS;
    document.head.appendChild(style);
  }

  const panel = document.createElement("div");
  panel.className = "rtnote-format-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", copy.title);
  panel.dataset.theme = options.theme ?? "light";
  panel.hidden = true;
  // Taps on buttons must not move focus out of the editor and hide the keyboard.
  panel.addEventListener("mousedown", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest("select")) event.preventDefault();
  });

  let isOpen = false;

  const changed = () => {
    options.onChange?.();
    refresh();
  };

  const run = (command: () => boolean) => {
    if (!editor.isEditable) return;
    if (command()) changed();
  };

  const button = (label: string, onClick: () => void, opts: { pressed?: boolean; disabled?: boolean; html?: string } = {}) => {
    const element = document.createElement("button");
    element.type = "button";
    element.setAttribute("aria-label", label);
    if (opts.html) element.innerHTML = opts.html;
    else element.textContent = label;
    if (opts.pressed !== undefined) element.setAttribute("aria-pressed", String(opts.pressed));
    element.disabled = Boolean(opts.disabled);
    element.addEventListener("click", onClick);
    return element;
  };

  const select = (label: string, value: string, choices: Array<{ value: string; label: string; style?: string }>, onChange: (value: string) => void) => {
    const element = document.createElement("select");
    element.setAttribute("aria-label", label);
    for (const choice of choices) {
      const option = document.createElement("option");
      option.value = choice.value;
      option.textContent = choice.label;
      if (choice.style) option.setAttribute("style", choice.style);
      element.appendChild(option);
    }
    element.value = value;
    element.addEventListener("change", () => onChange(element.value));
    return element;
  };

  const section = (label: string, ...children: Node[]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "rtnote-format-panel-section";
    const heading = document.createElement("div");
    heading.className = "rtnote-format-panel-label";
    heading.textContent = label;
    const row = document.createElement("div");
    row.className = "rtnote-format-panel-row";
    // appendChild, not append: Bun's HTMLRewriter types shadow Element.append in some builds.
    for (const child of children) row.appendChild(child);
    wrapper.appendChild(heading);
    wrapper.appendChild(row);
    return wrapper;
  };

  const colorChoices = (property: "backgroundColor" | "borderColor") => [
    { value: "", label: property === "backgroundColor" ? copy.noCellColor : copy.defaultBorder },
    ...(property === "borderColor" ? [{ value: CELL_BORDER_NONE, label: copy.noBorder }] : []),
    ...TEXT_COLORS.map((color) => ({ value: property === "backgroundColor" ? color.background : color.text, label: copy.colors[color.name] })),
  ];

  function refresh() {
    if (!isOpen) return;
    panel.replaceChildren();
    const header = document.createElement("div");
    header.className = "rtnote-format-panel-header";
    const title = document.createElement("span");
    title.textContent = copy.title;
    const close = button(copy.close, () => setOpen(false));
    close.className = "rtnote-format-panel-close";
    close.textContent = "×";
    header.appendChild(title);
    header.appendChild(close);
    panel.appendChild(header);

    const inCode = editor.isActive("codeBlock") || editor.isActive("code");
    const textStyle = editor.getAttributes("textStyle");
    if (!inCode) {
      const family = normalizeFontFamily(textStyle.fontFamily) ?? "";
      const familyChoices: Array<{ value: string; label: string; style?: string }> = [
        { value: "", label: copy.defaultFont },
        ...NOTE_FONT_FAMILIES.map((font) => ({
          value: font.value,
          label: font.id === "sans" || font.id === "serif" || font.id === "mono" ? copy.fontNames[font.id] : font.label,
          style: `font-family: ${font.value}`,
        })),
      ];
      if (family && !familyChoices.some((choice) => choice.value === family)) {
        familyChoices.push({ value: family, label: family.split(",")[0]!.replaceAll("'", ""), style: `font-family: ${family}` });
      }
      const size = normalizeFontSize(textStyle.fontSize) ?? NOTE_DEFAULT_FONT_SIZE;
      panel.appendChild(section(copy.font,
        select(copy.font, family, familyChoices, (value) => run(() => value
          ? editor.chain().focus().setFontFamily(value).run()
          : editor.chain().focus().unsetFontFamily().run())),
        select(copy.size, size, NOTE_FONT_SIZES.map((value) => ({
          value,
          label: value === NOTE_DEFAULT_FONT_SIZE ? `${copy.defaultSize} (${value.replace("px", "")})` : value.replace("px", ""),
        })), (value) => run(() => editor.chain().focus().setFontSize(value).run())),
      ));
    }

    if (editor.can().setTextAlign("center")) {
      const block = editor.isActive("heading") ? editor.getAttributes("heading") : editor.getAttributes("paragraph");
      const alignment = normalizeTextAlignment(block.textAlign) ?? "left";
      const lineHeight = normalizeLineHeight(block.lineHeight) ?? "";
      panel.appendChild(section(copy.alignment,
        ...TEXT_ALIGNMENTS.map((value) => button(copy.alignments[value], () => run(() => editor.chain().focus().setTextAlign(value).run()), {
          pressed: alignment === value,
          html: alignmentIcon(value),
        })),
        select(copy.lineSpacing, lineHeight, [
          { value: "", label: copy.defaultLineSpacing },
          ...NOTE_LINE_HEIGHTS.map((value) => ({ value, label: value })),
        ], (value) => run(() => value
          ? editor.chain().focus().setLineHeight(value).run()
          : editor.chain().focus().unsetLineHeight().run())),
      ));
    }

    const image = selectedImage(editor) ?? captionFigureImage(editor);
    if (image) {
      panel.appendChild(section(copy.image, button(
        image.captioned ? copy.removeCaption : copy.addCaption,
        () => run(() => image.captioned
          ? editor.chain().focus().removeImageCaption(image.position).run()
          : editor.chain().focus().addImageCaption(image.position).run()),
        { pressed: image.captioned },
      )));
    }

    if (editor.isActive("table") && isInTable(editor.state)) {
      const cell = editor.isActive("tableHeader") ? editor.getAttributes("tableHeader") : editor.getAttributes("tableCell");
      const setCell = (property: "backgroundColor" | "borderColor", value: string) => run(() => editor.chain().focus().setCellAttribute(
        property,
        property === "borderColor" ? normalizeCellBorder(value) : normalizeTextColor(value),
      ).run());
      panel.appendChild(section(copy.table,
        button(copy.mergeCells, () => run(() => editor.chain().focus().mergeCells().run()), { disabled: !editor.can().mergeCells() }),
        button(copy.splitCell, () => run(() => editor.chain().focus().splitCell().run()), { disabled: !editor.can().splitCell() }),
        button(copy.headerRow, () => run(() => editor.chain().focus().toggleHeaderRow().run())),
        button(copy.headerColumn, () => run(() => editor.chain().focus().toggleHeaderColumn().run())),
        select(copy.cellColor, normalizeTextColor(cell.backgroundColor) ?? "", colorChoices("backgroundColor"), (value) => setCell("backgroundColor", value)),
        select(copy.cellBorder, normalizeCellBorder(cell.borderColor) ?? "", colorChoices("borderColor"), (value) => setCell("borderColor", value)),
      ));
    }
  }

  function setOpen(open: boolean) {
    if (isOpen === open) return;
    isOpen = open;
    panel.hidden = !open;
    if (open) refresh();
    options.onOpenChange?.(open);
  }

  const onSelectionUpdate = () => refresh();
  editor.on("selectionUpdate", onSelectionUpdate);
  editor.on("update", onSelectionUpdate);

  return {
    element: panel,
    isOpen: () => isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!isOpen),
    refresh,
    setTheme: (theme: "light" | "dark") => { panel.dataset.theme = theme; },
    destroy: () => {
      editor.off("selectionUpdate", onSelectionUpdate);
      editor.off("update", onSelectionUpdate);
      panel.remove();
    },
  };
};

export type MobileFormatPanel = ReturnType<typeof createMobileFormatPanel>;
