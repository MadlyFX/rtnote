import type { Editor } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import type { ImageWidthPresetId } from "./image-display";
import { ATTACHMENT_TEXT_PREFIX } from "./edgeever-legacy-values";
import { MOBILE_EDITOR_COPY_JA } from "./mobile-editor.ja";
import { MOBILE_EDITOR_COPY_ZH_CN } from "./mobile-editor.zh-CN";
import { MOBILE_EDITOR_COPY_ZH_TW } from "./mobile-editor.zh-TW";

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

export type MobileEditorCopy = {
  placeholder: string;
  toolbar: string;
  actions: Record<MobileEditorToolbarActionId, string>;
  imageScale: string;
  imageSizes: Record<ImageWidthPresetId, string>;
  /** Written before attachment links in new notes. English for every locale; see edgeever-legacy-values. */
  attachmentPrefix: string;
  close: string;
  codeBlock: {
    mermaidPreview: string;
    copy: string;
    copied: string;
    copyFailed: string;
    mermaidSource: string;
    codeSource: string;
    mermaidEmpty: string;
    rendering: string;
    renderFailed: string;
  };
  diagram: {
    mindMap: string;
    architecture: string;
    flowchart: string;
  };
  image: {
    loadFailed: string;
    uploading: string;
    actions: string;
  };
};

const MOBILE_EDITOR_COPY: Record<MobileEditorLocale, MobileEditorCopy> = {
  "zh-CN": MOBILE_EDITOR_COPY_ZH_CN,
  "zh-TW": MOBILE_EDITOR_COPY_ZH_TW,
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
    attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
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
  ja: MOBILE_EDITOR_COPY_JA,
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
    attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
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
    attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
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
    attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
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
    attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
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
    attachmentPrefix: ATTACHMENT_TEXT_PREFIX,
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
};

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
