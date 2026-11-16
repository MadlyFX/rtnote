import type { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import type { ImageWidthPresetId } from "./image-display";

export type MobileEditorLocale = "zh-CN" | "zh-TW" | "en-US" | "ja" | "pl" | "ru" | "es" | "de" | "fr";

export type MobileEditorToolbarActionId =
  | "undo"
  | "redo"
  | "image"
  | "voiceMemo"
  | "bold"
  | "bulletList"
  | "taskList"
  | "increaseListIndent"
  | "decreaseListIndent"
  | "blockquote"
  | "horizontalRule"
  | "format";

export const MOBILE_EDITOR_ACTIVE_FLAGS = {
  bold: 1,
  taskList: 2,
  bulletList: 8,
  blockquote: 16,
  format: 32,
} as const;

export const MOBILE_EDITOR_TOOLBAR_ACTIONS = [
  { id: "undo", activeFlag: 0 },
  { id: "redo", activeFlag: 0 },
  { id: "image", activeFlag: 0 },
  { id: "voiceMemo", activeFlag: 0 },
  { id: "bold", activeFlag: MOBILE_EDITOR_ACTIVE_FLAGS.bold },
  { id: "bulletList", activeFlag: MOBILE_EDITOR_ACTIVE_FLAGS.bulletList },
  { id: "taskList", activeFlag: MOBILE_EDITOR_ACTIVE_FLAGS.taskList },
  { id: "increaseListIndent", activeFlag: 0 },
  { id: "decreaseListIndent", activeFlag: 0 },
  { id: "blockquote", activeFlag: MOBILE_EDITOR_ACTIVE_FLAGS.blockquote },
  { id: "horizontalRule", activeFlag: 0 },
  { id: "format", activeFlag: MOBILE_EDITOR_ACTIVE_FLAGS.format },
] as const satisfies ReadonlyArray<{
  id: MobileEditorToolbarActionId;
  activeFlag: number;
}>;

const MOBILE_EDITOR_COPY = {
  "zh-CN": {
    placeholder: "开始记录...",
    toolbar: "编辑器工具栏",
    actions: {
      undo: "撤销",
      redo: "重做",
      image: "上传图片",
      voiceMemo: "语音备忘",
      bold: "加粗",
      bulletList: "无序列表",
      taskList: "任务清单",
      increaseListIndent: "增加列表层级（Tab）",
      decreaseListIndent: "减少列表层级（Shift + Tab）",
      blockquote: "引用",
      horizontalRule: "分割线",
      format: "格式",
    },
    imageScale: "图片显示尺寸",
    imageSizes: {
      small: "较小",
      medium: "适中",
      large: "较大",
      full: "铺满",
    },
    attachmentPrefix: "附件：",
    close: "关闭",
    codeBlock: {
      mermaidPreview: "Mermaid 图表预览",
      copy: "复制代码",
      copied: "已复制",
      copyFailed: "复制失败",
      mermaidSource: "Mermaid 源码",
      codeSource: "代码源码",
      mermaidEmpty: "请在下方输入 Mermaid 源码。",
      rendering: "正在渲染图表…",
      renderFailed: "无法渲染此图表，请检查语法。",
    },
    diagram: {
      mindMap: "思维导图",
      architecture: "架构图",
      flowchart: "流程图",
    },
    image: {
      loadFailed: "图片加载失败",
      uploading: "图片上传中…",
      actions: "图片操作",
    },
  },
"zh-TW": {
    placeholder: "開始記錄...",
    toolbar: "編輯器工具欄",
    actions: {
      undo: "撤銷",
      redo: "重做",
      image: "上傳圖片",
      voiceMemo: "語音備忘",
      bold: "加粗",
      bulletList: "無序列表",
      taskList: "任務清單",
      increaseListIndent: "增加列表層級（Tab）",
      decreaseListIndent: "減少列表層級（Shift + Tab）",
      blockquote: "引用",
      horizontalRule: "分割線",
      format: "格式",
    },
    imageScale: "圖片顯示尺寸",
    imageSizes: {
      small: "較小",
      medium: "適中",
      large: "較大",
      full: "鋪滿",
    },
    attachmentPrefix: "附件：",
    close: "關閉",
    codeBlock: {
      mermaidPreview: "Mermaid 圖表預覽",
      copy: "複製程式碼",
      copied: "已複製",
      copyFailed: "複製失敗",
      mermaidSource: "Mermaid 原始碼",
      codeSource: "程式碼原始碼",
      mermaidEmpty: "請在下方輸入 Mermaid 原始碼。",
      rendering: "正在渲染圖表…",
      renderFailed: "無法渲染此圖表，請檢查語法。",
    },
    diagram: {
      mindMap: "思維導圖",
      architecture: "架構圖",
      flowchart: "流程圖",
    },
    image: {
      loadFailed: "圖片載入失敗",
      uploading: "圖片上傳中…",
      actions: "圖片操作",
    },
  },
  "en-US": {
    placeholder: "Start writing...",
    toolbar: "Editor toolbar",
    actions: {
      undo: "Undo",
      redo: "Redo",
      image: "Upload image",
      voiceMemo: "Voice memo",
      bold: "Bold",
      bulletList: "Bullet list",
      taskList: "Task list",
      increaseListIndent: "Increase list level (Tab)",
      decreaseListIndent: "Decrease list level (Shift + Tab)",
      blockquote: "Quote",
      horizontalRule: "Horizontal rule",
      format: "Format",
    },
    imageScale: "Image display size",
    imageSizes: {
      small: "Small",
      medium: "Medium",
      large: "Large",
      full: "Full",
    },
    attachmentPrefix: "Attachment: ",
    close: "Close",
    codeBlock: {
      mermaidPreview: "Mermaid diagram preview",
      copy: "Copy code",
      copied: "Copied",
      copyFailed: "Copy failed",
      mermaidSource: "Mermaid source",
      codeSource: "Code source",
      mermaidEmpty: "Enter Mermaid source below.",
      rendering: "Rendering diagram…",
      renderFailed: "Unable to render this diagram. Check its syntax.",
    },
    diagram: {
      mindMap: "Mind map",
      architecture: "Architecture diagram",
      flowchart: "Flowchart",
    },
    image: {
      loadFailed: "Image failed to load",
      uploading: "Uploading image…",
      actions: "Image actions",
    },
  },
  ja: {
    placeholder: "書き始める...",
    toolbar: "エディタのツールバー",
    actions: {
      undo: "元に戻す",
      redo: "やり直す",
      image: "画像をアップロード",
      voiceMemo: "ボイスメモ",
      bold: "太字",
      bulletList: "箇条書き",
      taskList: "タスクリスト",
      increaseListIndent: "リストの階層を上げる（Tab）",
      decreaseListIndent: "リストの階層を下げる（Shift + Tab）",
      blockquote: "引用",
      horizontalRule: "区切り線",
      format: "書式",
    },
    imageScale: "画像の表示サイズ",
    imageSizes: {
      small: "小",
      medium: "中",
      large: "大",
      full: "幅いっぱい",
    },
    attachmentPrefix: "添付: ",
    close: "閉じる",
    codeBlock: {
      mermaidPreview: "Mermaid 図のプレビュー",
      copy: "コードをコピー",
      copied: "コピーしました",
      copyFailed: "コピーできませんでした",
      mermaidSource: "Mermaid ソース",
      codeSource: "コードのソース",
      mermaidEmpty: "下に Mermaid のソースを入力してください。",
      rendering: "図をレンダリング中…",
      renderFailed: "この図をレンダリングできません。構文を確認してください。",
    },
    diagram: {
      mindMap: "マインドマップ",
      architecture: "アーキテクチャ図",
      flowchart: "フローチャート",
    },
    image: {
      loadFailed: "画像を読み込めませんでした",
      uploading: "画像をアップロード中…",
      actions: "画像の操作",
    },
  },
  pl: {
    placeholder: "Zacznij pisać...",
    toolbar: "Pasek narzędzi edytora",
    actions: {
      undo: "Cofnij",
      redo: "Ponów",
      image: "Prześlij obraz",
      voiceMemo: "Notatka głosowa",
      bold: "Pogrubienie",
      bulletList: "Lista punktowana",
      taskList: "Lista zadań",
      increaseListIndent: "Zwiększ poziom listy (Tab)",
      decreaseListIndent: "Zmniejsz poziom listy (Shift + Tab)",
      blockquote: "Cytat",
      horizontalRule: "Linia pozioma",
      format: "Formatowanie",
    },
    imageScale: "Rozmiar wyświetlania obrazu",
    imageSizes: {
      small: "Mały",
      medium: "Średni",
      large: "Duży",
      full: "Pełna szerokość",
    },
    attachmentPrefix: "Załącznik: ",
    close: "Zamknij",
    codeBlock: {
      mermaidPreview: "Podgląd diagramu Mermaid",
      copy: "Kopiuj kod",
      copied: "Skopiowano",
      copyFailed: "Nie udało się skopiować",
      mermaidSource: "Źródło Mermaid",
      codeSource: "Kod źródłowy",
      mermaidEmpty: "Wpisz poniżej kod źródłowy Mermaid.",
      rendering: "Renderowanie diagramu…",
      renderFailed: "Nie można wyrenderować tego diagramu. Sprawdź składnię.",
    },
    diagram: {
      mindMap: "Mapa myśli",
      architecture: "Diagram architektury",
      flowchart: "Schemat blokowy",
    },
    image: {
      loadFailed: "Nie udało się wczytać obrazu",
      uploading: "Przesyłanie obrazu…",
      actions: "Działania na obrazie",
    },
  },
  ru: {
    placeholder: "Начните запись...",
    toolbar: "Панель редактора",
    actions: {
      undo: "Отменить",
      redo: "Повторить",
      image: "Загрузить изображение",
      voiceMemo: "Голосовая заметка",
      bold: "Полужирный",
      bulletList: "Маркированный список",
      taskList: "Список задач",
      increaseListIndent: "Увеличить уровень списка (Tab)",
      decreaseListIndent: "Уменьшить уровень списка (Shift + Tab)",
      blockquote: "Цитата",
      horizontalRule: "Горизонтальная линия",
      format: "Формат",
    },
    imageScale: "Размер изображения",
    imageSizes: {
      small: "Маленький",
      medium: "Средний",
      large: "Большой",
      full: "На всю ширину",
    },
    attachmentPrefix: "Вложение: ",
    close: "Закрыть",
    codeBlock: {
      mermaidPreview: "Предпросмотр диаграммы Mermaid",
      copy: "Копировать код",
      copied: "Скопировано",
      copyFailed: "Не удалось скопировать",
      mermaidSource: "Исходный код Mermaid",
      codeSource: "Исходный код",
      mermaidEmpty: "Введите исходный код Mermaid ниже.",
      rendering: "Отрисовка диаграммы…",
      renderFailed: "Не удалось отрисовать диаграмму. Проверьте синтаксис.",
    },
    diagram: {
      mindMap: "Интеллект-карта",
      architecture: "Архитектурная схема",
      flowchart: "Блок-схема",
    },
    image: {
      loadFailed: "Не удалось загрузить изображение",
      uploading: "Загрузка изображения…",
      actions: "Действия с изображением",
    },
  },
  es: {
    placeholder: "Empieza a escribir...",
    toolbar: "Barra de herramientas del editor",
    actions: {
      undo: "Deshacer",
      redo: "Rehacer",
      image: "Subir imagen",
      voiceMemo: "Nota de voz",
      bold: "Negrita",
      bulletList: "Lista con viñetas",
      taskList: "Lista de tareas",
      increaseListIndent: "Aumentar sangría (Tab)",
      decreaseListIndent: "Disminuir sangría (Mayús + Tab)",
      blockquote: "Cita",
      horizontalRule: "Línea horizontal",
      format: "Formato",
    },
    imageScale: "Tamaño de la imagen",
    imageSizes: {
      small: "Pequeño",
      medium: "Mediano",
      large: "Grande",
      full: "Ancho completo",
    },
    attachmentPrefix: "Archivo adjunto: ",
    close: "Cerrar",
    codeBlock: {
      mermaidPreview: "Vista previa del diagrama Mermaid",
      copy: "Copiar código",
      copied: "Copiado",
      copyFailed: "Error al copiar",
      mermaidSource: "Código fuente Mermaid",
      codeSource: "Código fuente",
      mermaidEmpty: "Introduzca código fuente Mermaid abajo.",
      rendering: "Renderizando diagrama...",
      renderFailed: "No se pudo renderizar el diagrama. Compruebe la sintaxis.",
    },
    diagram: {
      mindMap: "Mapa mental",
      architecture: "Diagrama de arquitectura",
      flowchart: "Diagrama de flujo",
    },
    image: {
      loadFailed: "No se pudo cargar la imagen",
      uploading: "Subiendo imagen...",
      actions: "Acciones de imagen",
    },
  },
  de: {
    placeholder: "Beginnen Sie mit dem Schreiben...",
    toolbar: "Editor-Symbolleiste",
    actions: {
      undo: "Rückgängig",
      redo: "Wiederholen",
      image: "Bild hochladen",
      voiceMemo: "Sprachmemo",
      bold: "Fett",
      bulletList: "Aufzählung",
      taskList: "Aufgabenliste",
      increaseListIndent: "Einzug vergrößern (Tab)",
      decreaseListIndent: "Einzug verkleinern (Umschalt + Tab)",
      blockquote: "Zitat",
      horizontalRule: "Trennlinie",
      format: "Format",
    },
    imageScale: "Bildgröße",
    imageSizes: {
      small: "Klein",
      medium: "Mittel",
      large: "Groß",
      full: "Volle Breite",
    },
    attachmentPrefix: "Anhang: ",
    close: "Schließen",
    codeBlock: {
      mermaidPreview: "Mermaid-Diagrammvorschau",
      copy: "Code kopieren",
      copied: "Kopiert",
      copyFailed: "Kopieren fehlgeschlagen",
      mermaidSource: "Mermaid-Quellcode",
      codeSource: "Quellcode",
      mermaidEmpty: "Geben Sie unten Mermaid-Quellcode ein.",
      rendering: "Diagramm wird gerendert...",
      renderFailed: "Diagramm konnte nicht gerendert werden. Bitte Syntax prüfen.",
    },
    diagram: {
      mindMap: "Mindmap",
      architecture: "Architekturdiagramm",
      flowchart: "Flussdiagramm",
    },
    image: {
      loadFailed: "Bild konnte nicht geladen werden",
      uploading: "Bild wird hochgeladen...",
      actions: "Bildaktionen",
    },
  },
  fr: {
    placeholder: "Commencez à écrire...",
    toolbar: "Barre d'outils de l'éditeur",
    actions: {
      undo: "Annuler",
      redo: "Rétablir",
      image: "Téléverser une image",
      voiceMemo: "Mémo vocal",
      bold: "Gras",
      bulletList: "Liste à puces",
      taskList: "Liste de tâches",
      increaseListIndent: "Augmenter le retrait (Tab)",
      decreaseListIndent: "Diminuer le retrait (Maj + Tab)",
      blockquote: "Citation",
      horizontalRule: "Ligne horizontale",
      format: "Mise en forme",
    },
    imageScale: "Taille de l'image",
    imageSizes: {
      small: "Petite",
      medium: "Moyenne",
      large: "Grande",
      full: "Pleine largeur",
    },
    attachmentPrefix: "Pièce jointe : ",
    close: "Fermer",
    codeBlock: {
      mermaidPreview: "Aperçu du diagramme Mermaid",
      copy: "Copier le code",
      copied: "Copié",
      copyFailed: "Échec de la copie",
      mermaidSource: "Code source Mermaid",
      codeSource: "Code source",
      mermaidEmpty: "Saisissez le code source Mermaid ci-dessous.",
      rendering: "Rendu du diagramme en cours...",
      renderFailed: "Impossible de générer le diagramme. Veuillez vérifier la syntaxe.",
    },
    diagram: {
      mindMap: "Carte heuristique",
      architecture: "Diagramme d'architecture",
      flowchart: "Organigramme",
    },
    image: {
      loadFailed: "Impossible de charger l'image",
      uploading: "Téléversement de l'image...",
      actions: "Actions sur l'image",
    },
  },
} as const;

export const getMobileEditorCopy = (locale: MobileEditorLocale) => MOBILE_EDITOR_COPY[locale];

export const getMobileEditorPlaceholder = (locale: MobileEditorLocale): string =>
  MOBILE_EDITOR_COPY[locale].placeholder;

export const getMobileEditorToolbarLabel = (locale: MobileEditorLocale): string =>
  MOBILE_EDITOR_COPY[locale].toolbar;

export const getMobileEditorToolbarActionLabel = (
  action: MobileEditorToolbarActionId,
  locale: MobileEditorLocale
): string => MOBILE_EDITOR_COPY[locale].actions[action];

export const getMobileEditorImageScaleLabel = (locale: MobileEditorLocale): string =>
  MOBILE_EDITOR_COPY[locale].imageScale;

export const getMobileEditorImageWidthPresetLabel = (
  preset: ImageWidthPresetId,
  locale: MobileEditorLocale
): string => MOBILE_EDITOR_COPY[locale].imageSizes[preset];

/**
 * Opening a note, restoring a draft, or applying a template replaces the
 * document. That replacement must not become an undo step, or the first undo
 * would wipe the note back to the previous document.
 */
export const clearMobileEditorUndoHistory = (editor: Editor): void => {
  try {
    const state = editor.state;
    editor.view.updateState(EditorState.create({
      doc: state.doc,
      plugins: state.plugins,
      schema: state.schema,
      selection: state.selection,
    }));
    // updateState does not emit a transaction, so toolbar subscribers would
    // keep the pre-reset undo flag. A no-step transaction refreshes them
    // without recording a new history event or a save.
    editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false).setMeta("preventUpdate", true));
  } catch {
    try {
      const state = editor.state;
      editor.view.updateState(EditorState.create({
        doc: state.doc,
        plugins: state.plugins,
        schema: state.schema,
      }));
    } catch {
      // The view is not mounted yet. The next user edit still starts a new history.
    }
  }
};

export const getMobileEditorInputAttributes = (className: string): Record<string, string> => ({
  autocapitalize: "sentences",
  autocomplete: "on",
  autocorrect: "on",
  class: className,
  inputmode: "text",
  spellcheck: "true",
});
