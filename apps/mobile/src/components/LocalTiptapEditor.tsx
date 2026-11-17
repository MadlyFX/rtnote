'use dom';

import { prepareNoteImageAssets } from "@edgeever/shared/note-image-fonts";
import { noteImageAssetUrls } from "./note-image-asset-urls";
import "katex/dist/katex.min.css";
import { stripMobileAttachmentPrefix } from "../lib/mobile-attachment-prefix";
import { attachMobileReaderScroll } from "../lib/mobile-reader-scroll";
import { Graph } from "@antv/x6";
import Image from "@tiptap/extension-image";
import CodeBlock from "@tiptap/extension-code-block";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, Extension, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { EdgeEverLink } from "@edgeever/shared/editor-link";
import * as Clipboard from "expo-clipboard";
import {
  createNativeUnsupportedContentExtensions,
  MEMO_CONTENT_STYLE,
  createEdgeEverDocumentExtensions,
  applyImageAlignment,
  DETAILS_EDITOR_CSS,
  wrapDetailsContentHtml,
  NativeAttachmentMetadata,
  prepareNativeEditorContent,
  restoreNativeEditorContent,
  getImageReferrerPolicy,
  ImageGallery,
  getResourceIdFromUrl,
  DIAGRAM_CANVAS_DARK,
  DIAGRAM_CANVAS_LIGHT,
  diagramDocumentToX6Cells,
  attachDiagramReader,
  MIND_MAP_CONNECTOR_NAME,
  mindMapConnector,
  type TiptapDoc,
  type DiagramDocument,
} from "@edgeever/shared";
import { createEdgeEverMathematics } from "@edgeever/shared/mathematics";
import { createMobileFormatPanel, getMobileCaptionPlaceholder, type MobileFormatPanel } from "@edgeever/shared/mobile-format-panel";
import { NATIVE_VOICE_MEMO_CSS, createNativeVoiceMemoExtension } from "@edgeever/shared/native-voice-memo";
import {
  NEW_IMAGE_WIDTH_PERCENT,
  IMAGE_WIDTH_PRESETS,
  PHONE_IMAGE_FILL_CSS,
  clampImageWidth,
  parseImageWidth,
} from "@edgeever/shared/image-display";
import {
  MOBILE_EDITOR_ACTIVE_FLAGS,
  MOBILE_EDITOR_TOOLBAR_ACTIONS,
  clearMobileEditorUndoHistory,
  getMobileEditorInputAttributes,
  getMobileEditorImageScaleLabel,
  getMobileEditorImageWidthPresetLabel,
  getMobileEditorCopy,
  type MobileEditorLocale,
  getMobileEditorPlaceholder,
  getMobileEditorToolbarActionLabel,
  getMobileEditorToolbarLabel,
  type MobileEditorToolbarActionId,
} from "@edgeever/shared/mobile-editor";
import {
  type NoteImageTheme,
  type NoteImageFontStyle,
  type NoteImageFontSize,
  type NoteImageCardWidth,
  NOTE_IMAGE_CARD_WIDTH_PIXELS,
  NOTE_IMAGE_BACKGROUND_COLORS,
  NOTE_IMAGE_THEMES,
  resolveTheme,
  buildImageExportBasename,
  buildNoteImageCardMarkup,
  generateCardCss,
  prepareNoteImageContent,
} from "@edgeever/shared/note-image-card";
import { useDOMImperativeHandle, type DOMImperativeFactory, type DOMProps } from "expo/dom";
import { toCanvas } from "html-to-image";
import { createImageInsertTransaction, createNativeImageGalleryView, groupUploadedImages, NATIVE_IMAGE_GALLERY_CSS } from "@edgeever/shared/native-image-gallery";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import {
  createMobileImageUploadPlaceholderSource,
  isMobileImageUploadPlaceholderSource,
  stripMobileImageUploadPlaceholders,
} from "../lib/mobile-image-upload-placeholder";
import {
  getMobileAttachmentLinkClass,
  resolveMobileAttachmentContent,
} from "../lib/mobile-attachment-content";
import {
  MOBILE_NOTE_SEARCH_HIGHLIGHT_PLUGIN_KEY,
  createMobileNoteSearchHighlightPlugin,
  getMobileNoteSearchMatches,
} from "../lib/mobile-note-search";
import { planMobileNoteImageRender } from "../lib/mobile-note-image-export";
import { toProtectedResourceLoadPath } from "../lib/mobile-protected-resources";
import { completePendingVoiceMemo, findVoiceMemoMimeType, parseVoiceMemoAttrsJson } from "../lib/mobile-voice-memo-editor";

type EditorDoc = TiptapDoc;

type DOMValue = Parameters<DOMImperativeFactory[string]>[0];

export interface LocalTiptapEditorRef extends DOMImperativeFactory {
  beginImageUpload: (uploadId: DOMValue, previewDataUrl: DOMValue) => void;
  cancelImageUpload: (uploadId: DOMValue) => void;
  completeImageUpload: (uploadId: DOMValue, imageUrl: DOMValue, alt: DOMValue) => void;
  finishImageBatch: (sources: DOMValue) => void;
  appendAttachment: (attachmentUrl: DOMValue, filename: DOMValue, mimeType: DOMValue, byteSize: DOMValue) => void;
  /** Inserts a voice memo block at the caret (JSON of its attributes). */
  insertVoiceMemo: (attrsJson: DOMValue) => void;
  /** Fills in the pending voice memo block with `clientId` once its recording uploaded. */
  completeVoiceMemo: (clientId: DOMValue, attrsJson: DOMValue) => void;
  removeResource: (targetJson: DOMValue) => void;
  renameResource: (targetJson: DOMValue, filename: DOMValue) => void;
  /** Replace body without remounting the DomWebView (JSON string of TipTap doc). */
  setContent: (contentJsonSerialized: DOMValue) => void;
  flush: () => void;
  focusEnd: () => void;
  replaceAll: (query: DOMValue, replacement: DOMValue) => void;
  search: (query: DOMValue, index: DOMValue) => void;
  exportImage: (requestJson: DOMValue) => void;
}

type LocalTiptapEditorSharedProps = {
  baseUrl: string;
  content: EditorDoc;
  dom?: DOMProps;
  onLoadResource: (source: string) => Promise<string | null>;
  onResourcePress?: (targetJson: string) => Promise<void>;
  onReady?: (startupMs: number) => Promise<void>;
  onSearchResult?: (count: number, index: number, query: string) => Promise<void>;
  onReaderScroll?: (collapsed: boolean) => Promise<void>;
  onImageExportEvent?: (payloadJson: string) => Promise<void>;
  ref: Ref<LocalTiptapEditorRef>;
  locale: MobileEditorLocale;
  theme: "light" | "dark";
  /** Live-switchable. The same DomWebView stays mounted across viewer → editor. */
  mode?: "editor" | "viewer";
  autoFocus?: boolean;
  onChange?: (content: EditorDoc) => Promise<void>;
  onPickImage?: () => Promise<void>;
  /** Opens the native voice memo recorder. */
  onRecordVoiceMemo?: () => Promise<void>;
  /** Loads a voice memo's audio as a URL the WebView can play. */
  onLoadVoiceMemoAudio?: (url: string, mimeType: string) => Promise<string | null>;
  visualDiagramJson?: string;
  visualDiagramNote?: boolean;
  onImagePreview?: (payloadJson: string) => Promise<void>;
  onDoublePress?: () => Promise<void>;
};

type LocalTiptapEditorProps = LocalTiptapEditorSharedProps;

type MermaidRendererProps = {
  diagramsJson: string;
  dom?: DOMProps;
  mode: "mermaid-renderer";
  onRendered: (resultsJson: string) => Promise<void>;
  theme: "light" | "dark";
};

const CHANGE_IDLE_MS = 500;
const TRANSIENT_IMAGE_UPLOAD_META = "edgeeverImageUploadPlaceholder";
const ignoreSearchResult = async () => undefined;
const IMAGE_EXPORT_CHUNK_BYTES = 192 * 1024;

type ImageExportRequest = {
  requestId: string;
  format: "jpeg" | "png";
  title: string;
  fallbackTitle: string;
  notebook?: string;
  tags?: string[];
  updatedAt?: string;
  background?: "mint" | "slate" | "warm" | NoteImageTheme;
  theme?: NoteImageTheme;
  fontStyle?: NoteImageFontStyle;
  fontSize?: NoteImageFontSize;
  cardWidth?: NoteImageCardWidth;
  showTitle?: boolean;
  showNotebook?: boolean;
  showTags?: boolean;
  showUpdatedAt?: boolean;
  branding?: boolean;
};

type EditorResourceTarget = {
  filename: string;
  href: string;
  kind: "attachment" | "image";
  resourceId: string;
};

const parseMobileResourceTarget = (value: string): EditorResourceTarget | null => {
  try {
    const parsed = JSON.parse(value) as Partial<EditorResourceTarget>;
    if (typeof parsed.href !== "string" || typeof parsed.filename !== "string") return null;
    if (parsed.kind !== "attachment" && parsed.kind !== "image") return null;
    const resourceId = getResourceIdFromUrl(parsed.href);
    if (!resourceId || (parsed.resourceId && parsed.resourceId !== resourceId)) return null;
    return { filename: parsed.filename, href: parsed.href, kind: parsed.kind, resourceId };
  } catch {
    return null;
  }
};

const normalizeEditorAttachmentFilename = (label: string, resourceId: string) =>
  stripMobileAttachmentPrefix(label) || resourceId;

/** Accept both `/api/v1/resources/:id/blob` and bare `/api/v1/resources/:id` image srcs. */
const getMobileImageResourceId = (href: string): string | null => {
  const fromBlob = getResourceIdFromUrl(href);
  if (fromBlob) return fromBlob;
  try {
    const parsed = new URL(href, "http://edgeever.local");
    const match = parsed.pathname.match(/^\/api\/v1\/resources\/([^/]+)\/?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const normalizeMobileResourceHref = (href: string, resourceId: string) => {
  if (getResourceIdFromUrl(href)) return href;
  if (href.startsWith("/api/v1/resources/")) {
    return `/api/v1/resources/${encodeURIComponent(resourceId)}/blob`;
  }
  return href;
};

const buildImageResourceTargetJson = (figure: HTMLElement): string | null => {
  const href = figure.dataset.resourceHref ?? "";
  const resourceId = getMobileImageResourceId(href);
  if (!resourceId) return null;
  return JSON.stringify({
    filename: figure.dataset.resourceFilename || `image-${resourceId}`,
    href: normalizeMobileResourceHref(href, resourceId),
    kind: "image",
    resourceId,
  } satisfies EditorResourceTarget);
};

const buildMobileImagePreviewPayload = (figure: HTMLElement): string => {
  const source = figure.dataset.resourceHref ?? "";
  const alt = figure.dataset.resourceFilename || "";
  const allFigures = typeof document !== "undefined"
    ? Array.from(document.querySelectorAll<HTMLElement>("figure.edgeever-image-node[data-resource-href]"))
    : [];
  const images = allFigures
    .map((fig) => ({
      alt: fig.dataset.resourceFilename || "",
      source: fig.dataset.resourceHref || "",
    }))
    .filter((img) => Boolean(img.source));

  let index = allFigures.indexOf(figure);
  if (index < 0 && source) {
    index = images.findIndex((img) => img.source === source);
  }

  return JSON.stringify({
    alt,
    source,
    index: Math.max(0, index),
    images: images.length > 0 ? images : [{ alt, source }],
  });
};

const handleMobileResourceEvent = (
  event: Event,
  onResourcePress?: (targetJson: string) => Promise<void>,
  options?: { allowImagePreview?: boolean; onImagePreview?: (payloadJson: string) => Promise<void> }
) => {
  const element = event.target instanceof Element ? event.target : null;
  const link = element?.closest<HTMLAnchorElement>('a.edgeever-attachment-link, a[href*="/api/v1/resources/"]');
  const href = link?.getAttribute("href") ?? "";
  const resourceId = getResourceIdFromUrl(href) ?? getMobileImageResourceId(href);
  if (link && resourceId && onResourcePress) {
    event.preventDefault();
    event.stopPropagation();
    void onResourcePress(JSON.stringify({
      filename: normalizeEditorAttachmentFilename(link.textContent ?? "", resourceId),
      href: normalizeMobileResourceHref(href, resourceId),
      kind: "attachment",
      resourceId,
    } satisfies EditorResourceTarget));
    return true;
  }

  const imageFigure = element?.closest<HTMLElement>("figure.edgeever-image-node");
  const imageHref = imageFigure?.dataset.resourceHref ?? "";
  if (!imageFigure || !imageHref) return false;

  const imageActionRequested = event.type === "contextmenu" || Boolean(element?.closest(".edgeever-image-actions"));
  if (imageActionRequested && onResourcePress) {
    const targetJson = buildImageResourceTargetJson(imageFigure);
    if (!targetJson) return false;
    event.preventDefault();
    event.stopPropagation();
    void onResourcePress(targetJson);
    return true;
  }

  // Viewer: plain image tap opens native fullscreen preview.
  if (options?.allowImagePreview && options.onImagePreview && !imageActionRequested) {
    event.preventDefault();
    event.stopPropagation();
    void options.onImagePreview(buildMobileImagePreviewPayload(imageFigure));
    return true;
  }

  return false;
};

export default function LocalTiptapEditor(props: LocalTiptapEditorProps | MermaidRendererProps) {
  return props.mode === "mermaid-renderer"
    ? <MermaidRenderRuntime {...props} />
    : <LocalTiptapEditorImpl {...props} />;
}

const MermaidRenderRuntime = (props: MermaidRendererProps) => {
  useEffect(() => {
    let cancelled = false;

    const renderDiagrams = async () => {
      let sources: string[] = [];
      try {
        const parsed = JSON.parse(props.diagramsJson) as unknown;
        sources = Array.isArray(parsed)
          ? parsed.filter((source): source is string => typeof source === "string" && source.trim().length > 0)
          : [];
      } catch {
        sources = [];
      }

      const results: Array<{ source: string; svg: string | null }> = [];
      for (const source of sources) {
        if (cancelled) return;
        try {
          const { svg } = await renderMobileMermaid(source, props.theme, false);
          results.push({ source, svg: inlineMermaidSvgStyles(svg) });
        } catch {
          results.push({ source, svg: null });
        }
      }

      if (!cancelled) {
        await props.onRendered(JSON.stringify(results));
      }
    };

    void renderDiagrams().catch(() => {
      if (!cancelled) {
        void props.onRendered("[]");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [props.diagramsJson, props.onRendered, props.theme]);

  return null;
};

Graph.registerConnector(MIND_MAP_CONNECTOR_NAME, mindMapConnector, true);

const ReadOnlyX6Diagram = ({
  diagram,
  locale,
  theme,
}: {
  diagram: DiagramDocument;
  locale: MobileEditorLocale;
  theme: "light" | "dark";
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const parent = container.parentElement;
    const measureWidth = () => {
      if (!parent) return Math.max(1, container.clientWidth);
      const style = getComputedStyle(parent);
      const containerStyle = getComputedStyle(container);
      const horizontalPadding = Number.parseFloat(style.paddingLeft || "0")
        + Number.parseFloat(style.paddingRight || "0");
      const horizontalMargin = Number.parseFloat(containerStyle.marginLeft || "0")
        + Number.parseFloat(containerStyle.marginRight || "0");
      return Math.max(1, parent.clientWidth - horizontalPadding - horizontalMargin);
    };
    const cells = diagramDocumentToX6Cells(diagram, theme);
    const graph = new Graph({
      container,
      // The empty mount node can report 0 before X6 assigns its own inline size.
      // Measure the stable parent instead so the graph never locks itself to 1px.
      width: measureWidth(),
      height: Math.max(1, container.clientHeight),
      background: { color: cells.canvas },
      grid: false,
      interacting: false,
      panning: { enabled: true },
      mousewheel: { enabled: true, minScale: 0.1, maxScale: 2.5 },
    });
    graph.addNodes(cells.nodes);
    graph.addEdges(cells.edges);

    const reader = attachDiagramReader(graph, container, { ...diagram, nodes: diagram.nodes.map((node, index) => ({ ...node, width: cells.nodes[index].width, height: cells.nodes[index].height })) }, locale, theme === "dark");
    const fit = () => reader.resize(measureWidth(), Math.max(1, container.clientHeight));
    const frame = window.requestAnimationFrame(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(parent ?? container);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      reader.dispose();
      graph.dispose();
    };
  }, [diagram, theme, locale]);

  const title = diagram.kind === "mind-map"
    ? getMobileEditorCopy(locale).diagram.mindMap
    : diagram.kind === "architecture"
      ? getMobileEditorCopy(locale).diagram.architecture
      : getMobileEditorCopy(locale).diagram.flowchart;
  return (
    <section className="edgeever-x6-document">
      <div aria-label={title} className="edgeever-x6-diagram" key={diagram.kind} ref={containerRef} role="img" />
    </section>
  );
};

const inlineMermaidSvgStyles = (svg: string) => {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:-10000px;visibility:hidden;";
  container.innerHTML = svg;
  document.body.append(container);

  const root = container.querySelector("svg");
  if (!root) {
    container.remove();
    return svg;
  }

  for (const foreignObject of root.querySelectorAll("foreignObject")) {
    const label = foreignObject.textContent?.replace(/\s+/g, " ").trim();
    if (!label) {
      foreignObject.remove();
      continue;
    }
    const x = Number.parseFloat(foreignObject.getAttribute("x") ?? "0");
    const y = Number.parseFloat(foreignObject.getAttribute("y") ?? "0");
    const width = Number.parseFloat(foreignObject.getAttribute("width") ?? "0");
    const height = Number.parseFloat(foreignObject.getAttribute("height") ?? "0");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(x + width / 2));
    text.setAttribute("y", String(y + height / 2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-size", "16px");
    text.textContent = label;
    foreignObject.replaceWith(text);
  }

  const properties = [
    "color",
    "fill",
    "fill-opacity",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "opacity",
    "stroke",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-opacity",
    "stroke-width",
    "text-anchor",
  ] as const;

  for (const element of root.querySelectorAll<SVGElement>("*")) {
    const computed = getComputedStyle(element);
    for (const property of properties) {
      const value = computed.getPropertyValue(property);
      if (value) {
        element.setAttribute(property, value);
      }
    }
  }

  const serialized = new XMLSerializer().serializeToString(root);
  container.remove();
  return serialized;
};

const getEditorScrollContainer = (editor: Editor) =>
  editor.view.dom.closest<HTMLElement>(".edgeever-editor-scroll");

const updateEditorKeyboardInset = (editor: Editor) => {
  const scrollContainer = getEditorScrollContainer(editor);
  if (!scrollContainer) {
    return;
  }
  const visualViewport = window.visualViewport;
  const visibleBottom = visualViewport
    ? visualViewport.offsetTop + visualViewport.height
    : window.innerHeight;
  const keyboardInset = Math.max(0, window.innerHeight - visibleBottom);
  scrollContainer.style.setProperty("--edgeever-keyboard-inset", `${Math.round(keyboardInset)}px`);
};

const scrollEditorPositionIntoView = (
  editor: Editor,
  position: number,
  options: { behavior?: ScrollBehavior; center?: boolean } = {}
) => {
  const scrollContainer = getEditorScrollContainer(editor);
  if (!scrollContainer) {
    return;
  }
  try {
    const containerRect = scrollContainer.getBoundingClientRect();
    const positionRect = editor.view.coordsAtPos(position);
    const visualViewport = window.visualViewport;
    const visibleTop = Math.max(containerRect.top, visualViewport?.offsetTop ?? containerRect.top);
    const visibleBottom = Math.min(
      containerRect.bottom,
      visualViewport ? visualViewport.offsetTop + visualViewport.height : containerRect.bottom
    );
    const padding = 24;
    const isAbove = positionRect.top < visibleTop + padding;
    const isBelow = positionRect.bottom > visibleBottom - padding;
    if (!isAbove && !isBelow) {
      return;
    }
    const targetTop = options.center
      ? scrollContainer.scrollTop + positionRect.top - visibleTop
        - (visibleBottom - visibleTop - Math.max(positionRect.bottom - positionRect.top, 1)) / 2
      : scrollContainer.scrollTop + (isAbove
        ? positionRect.top - visibleTop - padding
        : positionRect.bottom - visibleBottom + padding);
    scrollContainer.scrollTo({
      behavior: options.behavior ?? "auto",
      top: Math.max(0, targetTop),
    });
  } catch {
    // The selection can disappear while content is being replaced. The next
    // selection/viewport update will retry with a valid document position.
  }
};

function LocalTiptapEditorImpl(props: LocalTiptapEditorProps) {
  const isViewer = props.mode === "viewer";
  const isViewerRef = useRef(isViewer);
  isViewerRef.current = isViewer;
  const visualDiagram = useMemo(() => {
    if (props.mode !== "viewer" || !props.visualDiagramJson) return null;
    try {
      return JSON.parse(props.visualDiagramJson) as DiagramDocument;
    } catch {
      return null;
    }
  }, [props.mode, props.mode === "viewer" ? props.visualDiagramJson : undefined]);
  const autoFocus = props.mode === "viewer" ? false : Boolean(props.autoFocus);
  const startedAtRef = useRef(performance.now());
  const changeTimerRef = useRef<number | null>(null);
  const imageUploadInFlightRef = useRef(false);
  const pendingImageSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const onChangeRef = useRef(props.mode === "viewer" ? undefined : props.onChange);
  const onLoadResourceRef = useRef(props.onLoadResource);
  const onResourcePressRef = useRef(props.onResourcePress);
  const onImagePreviewRef = useRef(props.mode === "viewer" ? props.onImagePreview : undefined);
  const onDoublePressRef = useRef(props.mode === "viewer" ? props.onDoublePress : undefined);
  const onPickImageRef = useRef(props.mode === "viewer" ? undefined : props.onPickImage);
  const onRecordVoiceMemoRef = useRef(props.mode === "viewer" ? undefined : props.onRecordVoiceMemo);
  const onLoadVoiceMemoAudioRef = useRef(props.onLoadVoiceMemoAudio);
  const editorInstanceRef = useRef<Editor | null>(null);
  const onReadyRef = useRef(props.onReady ?? (async () => undefined));
  const onSearchResultRef = useRef(props.onSearchResult ?? ignoreSearchResult);
  const onReaderScrollRef = useRef(props.onReaderScroll);
  const onImageExportEventRef = useRef(props.onImageExportEvent);
  const searchStateRef = useRef({ activeIndex: -1, query: "" });
  const [formatPanelOpen, setFormatPanelOpen] = useState(false);
  const formatPanelRef = useRef<MobileFormatPanel | null>(null);

  onChangeRef.current = props.mode === "viewer" ? undefined : props.onChange;
  onLoadResourceRef.current = props.onLoadResource;
  onResourcePressRef.current = props.onResourcePress;
  onImagePreviewRef.current = props.mode === "viewer" ? props.onImagePreview : undefined;
  onDoublePressRef.current = props.mode === "viewer" ? props.onDoublePress : undefined;
  onPickImageRef.current = props.mode === "viewer" ? undefined : props.onPickImage;
  onRecordVoiceMemoRef.current = props.mode === "viewer" ? undefined : props.onRecordVoiceMemo;
  onLoadVoiceMemoAudioRef.current = props.onLoadVoiceMemoAudio;
  onReadyRef.current = props.onReady ?? (async () => undefined);
  onSearchResultRef.current = props.onSearchResult ?? ignoreSearchResult;
  onReaderScrollRef.current = props.onReaderScroll;
  onImageExportEventRef.current = props.onImageExportEvent;
  const protectedImageExtension = useMemo(
    () => createProtectedImageExtension(
      props.baseUrl,
      props.locale,
      (source) => onLoadResourceRef.current(source),
      {
        readOnly: () => isViewerRef.current,
        // NodeView binds ⋯ / image taps directly — Android WebView often drops
        // click after pointerdown preventDefault, so PM handleClick is not enough.
        onResourcePress: (targetJson) => onResourcePressRef.current?.(targetJson),
        onImagePreview: (payloadJson) => onImagePreviewRef.current?.(payloadJson),
      }
    ),
    [props.baseUrl, props.locale]
  );
  const voiceMemoExtension = useMemo(
    () => createNativeVoiceMemoExtension({
      getLocale: () => props.locale,
      resolveAudioUrl: (url) => {
        const load = onLoadVoiceMemoAudioRef.current;
        if (!load) return null;
        return load(url, findVoiceMemoMimeType(editorInstanceRef.current?.state, url));
      },
    }),
    [props.locale]
  );
  const diagramViewer = isViewer && Boolean(props.mode === "viewer" && props.visualDiagramNote);
  const mermaidCodeBlockExtension = useMemo(
    () => createMobileCodeBlockExtension(props.locale, props.theme, diagramViewer),
    [diagramViewer, props.locale, props.theme]
  );
  const searchHighlightExtension = useMemo(
    () => Extension.create({
      name: "edgeeverMobileNoteSearchHighlight",
      addProseMirrorPlugins() {
        return [createMobileNoteSearchHighlightPlugin({
          getActiveIndex: () => searchStateRef.current.activeIndex,
          getQuery: () => searchStateRef.current.query,
        })];
      },
    }),
    []
  );

  const editor = useEditor({
    editable: !isViewer,
    // Focus only after the DOM view reports ready. Initial TipTap autofocus plus
    // the Android bridge retry raced each other and could leave the WebView stuck.
    autofocus: false,
    extensions: [
      ...createEdgeEverDocumentExtensions({
        mathematics: createEdgeEverMathematics(),
        starterKit: { codeBlock: false, link: false },
        image: protectedImageExtension,
        gallery: ImageGallery.extend({
          addNodeView() { return createNativeImageGalleryView(() => props.locale); },
        }),
        pdf: false,
        file: false,
        pluginEmbed: false,
        table: { table: { renderWrapper: true } },
        imageCaption: { placeholder: getMobileCaptionPlaceholder(props.locale) },
        voiceMemo: voiceMemoExtension,
      }),
      EdgeEverLink.configure({ openOnClick: false }),
      NativeAttachmentMetadata,
      mermaidCodeBlockExtension,
      searchHighlightExtension,
      ...createNativeUnsupportedContentExtensions(),
      Placeholder.configure({
        placeholder: () => isViewerRef.current ? "" : getMobileEditorPlaceholder(props.locale),
      }),
    ],
    content: prepareNativeEditorContent(
      resolveImageSources(resolveMobileAttachmentContent(props.content), props.baseUrl),
      props.locale,
    ),
    editorProps: {
      attributes: getMobileEditorInputAttributes(
        isViewer ? "edgeever-editor-content edgeever-viewer-content" : "edgeever-editor-content"
      ),
      transformPastedHTML: (html) => wrapDetailsContentHtml(html),
      handleDOMEvents: {
        // Intercept attachment anchors before ProseMirror's later click phase so
        // the embedded file:// WebView never follows relative resource URLs.
        click: (_view, event) => handleMobileResourceEvent(event, onResourcePressRef.current, {
          allowImagePreview: isViewerRef.current,
          onImagePreview: onImagePreviewRef.current,
        }),
        contextmenu: (_view, event) => handleMobileResourceEvent(event, onResourcePressRef.current, {
          allowImagePreview: false,
          onImagePreview: onImagePreviewRef.current,
        }),
        dblclick: (_view, event) => {
          if (!isViewerRef.current || !onDoublePressRef.current) return false;
          const target = event.target as HTMLElement | null;
          if (!target || target.closest("a, button, img, input, textarea, select, .edgeever-image-node")) {
            return false;
          }
          event.preventDefault();
          event.stopPropagation();
          void onDoublePressRef.current();
          return true;
        },
      },
    },
    onUpdate: ({ editor: activeEditor, transaction }) => {
      if (isViewerRef.current || !onChangeRef.current) {
        return;
      }
      if (transaction.getMeta(TRANSIENT_IMAGE_UPLOAD_META)) {
        return;
      }
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
      }
      changeTimerRef.current = window.setTimeout(() => {
        changeTimerRef.current = null;
        void onChangeRef.current?.(getPersistableEditorDoc(activeEditor.getJSON() as EditorDoc, props.baseUrl));
      }, CHANGE_IDLE_MS);
    },
  });

  editorInstanceRef.current = editor ?? null;

  const flush = useCallback(() => {
    if (isViewerRef.current || !editor || editor.isDestroyed || !onChangeRef.current) {
      return;
    }
    if (changeTimerRef.current !== null) {
      window.clearTimeout(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    void onChangeRef.current(getPersistableEditorDoc(editor.getJSON() as EditorDoc, props.baseUrl));
  }, [editor, props.baseUrl]);

  const setContent = useCallback((contentJsonSerialized: DOMValue) => {
    if (!editor || editor.isDestroyed || typeof contentJsonSerialized !== "string") {
      return;
    }
    try {
      const parsed = JSON.parse(contentJsonSerialized) as EditorDoc;
      const next = prepareNativeEditorContent(
        resolveImageSources(resolveMobileAttachmentContent(parsed), props.baseUrl),
        props.locale,
      );
      // Do not focus while replacing content. Callers decide when the editor should
      // take focus and place the caret via focusEnd().
      // This command synchronizes native-owned state (draft restore/template/new
      // composer reset). Callers already own persistence for that state, so an
      // emitted update would create a delayed stale write during screen teardown.
      editor.commands.setContent(next, { emitUpdate: false });
      clearMobileEditorUndoHistory(editor);
    } catch {
      // Ignore malformed payloads from the native bridge.
    }
  }, [editor, props.baseUrl, props.locale]);

  const search = useCallback((query: DOMValue, requestedIndex: DOMValue) => {
    const normalizedQuery = typeof query === "string" ? query : "";
    const matches = editor && !editor.isDestroyed
      ? getMobileNoteSearchMatches(editor.state.doc, normalizedQuery)
      : [];
    const requestedMatchIndex = typeof requestedIndex === "number" ? requestedIndex : 0;
    const index = matches.length > 0
      ? requestedMatchIndex < 0
        ? -1
        : Math.min(Math.max(requestedMatchIndex, 0), matches.length - 1)
      : 0;
    searchStateRef.current = {
      activeIndex: matches.length > 0 ? index : -1,
      query: normalizedQuery,
    };
    const match = index >= 0 ? matches[index] : undefined;
    if (editor && !editor.isDestroyed) {
      if (match) {
        editor.chain().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
        window.requestAnimationFrame(() => {
          scrollEditorPositionIntoView(editor, match.from, { behavior: "smooth", center: true });
        });
      } else {
        editor.view.dispatch(editor.state.tr.setMeta(MOBILE_NOTE_SEARCH_HIGHLIGHT_PLUGIN_KEY, true));
      }
    }
    void onSearchResultRef.current(matches.length, index, normalizedQuery);
  }, [editor]);

  const replaceAll = useCallback((query: DOMValue, replacement: DOMValue) => {
    const normalizedQuery = typeof query === "string" ? query : "";
    const normalizedReplacement = typeof replacement === "string" ? replacement : "";
    const matches = editor && !editor.isDestroyed
      ? getMobileNoteSearchMatches(editor.state.doc, normalizedQuery)
      : [];
    if (!editor || editor.isDestroyed || matches.length === 0) {
      void onSearchResultRef.current(0, 0, normalizedQuery);
      return;
    }
    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        for (const match of [...matches].reverse()) {
          tr.insertText(normalizedReplacement, match.from, match.to);
        }
        dispatch?.(tr);
        return true;
      })
      .run();
    window.requestAnimationFrame(() => search(normalizedQuery, 0));
  }, [editor, search]);

  const beginImageUpload = useCallback((uploadIdValue: DOMValue, previewDataUrlValue: DOMValue) => {
    if (isViewer || !editor || typeof uploadIdValue !== "string" || typeof previewDataUrlValue !== "string") {
      return;
    }
    insertImageUploadPlaceholder(
      editor,
      createMobileImageUploadPlaceholderSource(uploadIdValue),
      getMobileEditorCopy(props.locale).image.uploading,
      previewDataUrlValue,
      pendingImageSelectionRef.current
    );
    // The initial selection is consumed once; subsequent batch images follow
    // the previous placeholder instead of replacing it.
    pendingImageSelectionRef.current = null;
  }, [editor, isViewer, props.locale]);

  const cancelImageUpload = useCallback((uploadIdValue: DOMValue) => {
    if (!editor || typeof uploadIdValue !== "string") {
      return;
    }
    removeImageUploadPlaceholder(editor, createMobileImageUploadPlaceholderSource(uploadIdValue));
  }, [editor]);

  const completeImageUpload = useCallback((uploadIdValue: DOMValue, imageUrlValue: DOMValue, altValue: DOMValue) => {
    if (!editor || typeof uploadIdValue !== "string" || typeof imageUrlValue !== "string") {
      return;
    }
    replaceImageUploadPlaceholder(
      editor,
      createMobileImageUploadPlaceholderSource(uploadIdValue),
      resolveUrl(imageUrlValue, props.baseUrl),
      typeof altValue === "string" ? altValue : ""
    );
  }, [editor, props.baseUrl]);

  const finishImageBatch = useCallback((sources: DOMValue) => {
    if (!editor || !Array.isArray(sources)) return;
    groupUploadedImages(editor, sources.filter((source): source is string => typeof source === "string")
      .map((source) => resolveUrl(source, props.baseUrl)));
  }, [editor, props.baseUrl]);

  const appendAttachment = useCallback((
    attachmentUrlValue: DOMValue,
    filenameValue: DOMValue,
    mimeTypeValue: DOMValue,
    byteSizeValue: DOMValue,
  ) => {
    if (!editor || typeof attachmentUrlValue !== "string" || typeof filenameValue !== "string") {
      return;
    }
    const mimeType = typeof mimeTypeValue === "string" ? mimeTypeValue : "";
    const byteSize = typeof byteSizeValue === "number" || typeof byteSizeValue === "string" ? Number(byteSizeValue) : null;

    editor.chain().focus().insertContent({
      type: "paragraph",
      content: [{
        type: "text",
        text: `${getMobileEditorCopy(props.locale).attachmentPrefix}${filenameValue}`,
        marks: [{
          type: "link",
          attrs: {
            href: resolveUrl(attachmentUrlValue, props.baseUrl),
            target: "_blank",
            class: getMobileAttachmentLinkClass(filenameValue, mimeType),
            attachmentFilename: filenameValue,
            attachmentMimeType: mimeType,
            attachmentByteSize: byteSize !== null && Number.isFinite(byteSize) && byteSize > 0 ? byteSize : null,
          },
        }],
      }],
    }).run();
  }, [editor, props.baseUrl, props.locale]);

  const insertVoiceMemo = useCallback((attrsJsonValue: DOMValue) => {
    if (!editor || editor.isDestroyed || !editor.isEditable || typeof attrsJsonValue !== "string") return;
    const attrs = parseVoiceMemoAttrsJson(attrsJsonValue);
    if (!attrs || (!attrs.url && !attrs.clientId)) return;
    editor.chain().focus().insertVoiceMemo(attrs).run();
  }, [editor]);

  const completeVoiceMemo = useCallback((clientIdValue: DOMValue, attrsJsonValue: DOMValue) => {
    if (!editor || editor.isDestroyed || typeof clientIdValue !== "string" || typeof attrsJsonValue !== "string") return;
    const attrs = parseVoiceMemoAttrsJson(attrsJsonValue);
    const tr = attrs ? completePendingVoiceMemo(editor.state, clientIdValue, attrs) : null;
    if (tr) editor.view.dispatch(tr);
  }, [editor]);

  const renameResource = useCallback((targetJsonValue: DOMValue, filenameValue: DOMValue) => {
    if (!editor || typeof targetJsonValue !== "string" || typeof filenameValue !== "string") return;
    const target = parseMobileResourceTarget(targetJsonValue);
    if (!target) return;
    if (target.kind === "image") {
      const match = findMobileImageRange(editor, target.resourceId);
      if (!match) return;
      const imageNode = editor.state.doc.nodeAt(match.pos);
      if (!imageNode) return;
      editor.view.dispatch(editor.state.tr.setNodeMarkup(match.pos, imageNode.type, {
        ...imageNode.attrs,
        alt: filenameValue,
        title: filenameValue,
      }));
      return;
    }
    const range = findMobileAttachmentRange(editor, target.resourceId);
    if (!range) return;
    const linkMark = editor.schema.marks.link?.create({
      ...range.linkAttrs,
      class: getMobileAttachmentLinkClass(filenameValue, null, range.linkAttrs.class),
    });
    if (!linkMark) return;
    editor.view.dispatch(editor.state.tr.replaceWith(
      range.from,
      range.to,
      editor.schema.text(`${getMobileEditorCopy(props.locale).attachmentPrefix}${filenameValue}`, [linkMark])
    ));
  }, [editor, props.locale]);

  const removeResource = useCallback((targetJsonValue: DOMValue) => {
    if (!editor || typeof targetJsonValue !== "string") return;
    const target = parseMobileResourceTarget(targetJsonValue);
    if (!target) return;
    if (target.kind === "image") {
      const match = findMobileImageRange(editor, target.resourceId);
      if (match) editor.view.dispatch(editor.state.tr.delete(match.pos, match.pos + match.nodeSize));
      return;
    }
    const range = findMobileAttachmentRange(editor, target.resourceId);
    if (!range) return;
    const resolved = editor.state.doc.resolve(range.from);
    let from = range.from;
    let to = range.to;
    for (let depth = resolved.depth; depth > 0; depth -= 1) {
      const node = resolved.node(depth);
      if (node.type.name !== "paragraph") continue;
      const nodeFrom = resolved.before(depth);
      if (range.from === nodeFrom + 1 && range.to === nodeFrom + node.nodeSize - 1) {
        from = nodeFrom;
        to = nodeFrom + node.nodeSize;
      }
      break;
    }
    editor.view.dispatch(editor.state.tr.delete(from, to));
  }, [editor]);

  const exportImage = useCallback((requestJsonValue: DOMValue) => {
    if (typeof requestJsonValue !== "string" || !editor || editor.isDestroyed || !onImageExportEventRef.current) return;

    let request: ImageExportRequest;
    try {
      request = JSON.parse(requestJsonValue) as ImageExportRequest;
      if (!request.requestId || (request.format !== "png" && request.format !== "jpeg")) return;
    } catch {
      return;
    }

    const notify = (payload: Record<string, unknown>) =>
      onImageExportEventRef.current?.(JSON.stringify({ requestId: request.requestId, ...payload }));
    const exportStartedAt = performance.now();
    const reportProgress = (stage: "prepare" | "render" | "transfer") => {
      void Promise.resolve(notify({ type: "progress", stage, elapsedMs: Math.round(performance.now() - exportStartedAt) })).catch(() => {});
    };
    const missingImagePlaceholder = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

    void (async () => {
      reportProgress("prepare");
      const resolvedTheme = resolveTheme(request.background, request.theme);
      const fontStyle = request.fontStyle ?? "auto";
      const fontSize = request.fontSize ?? "lg";
      const cardWidth = request.cardWidth ?? "wide";
      const targetWidth = NOTE_IMAGE_CARD_WIDTH_PIXELS[cardWidth] || NOTE_IMAGE_CARD_WIDTH_PIXELS.wide;
      const themeCfg = NOTE_IMAGE_THEMES[resolvedTheme] || NOTE_IMAGE_THEMES.aurora;

      const editorClone = editor.view.dom.cloneNode(true) as HTMLElement;
      editorClone.removeAttribute("contenteditable");
      editorClone.querySelectorAll("button, [contenteditable='true']").forEach((element) => {
        element.removeAttribute("contenteditable");
        if (element instanceof HTMLButtonElement) element.remove();
      });

      prepareNoteImageContent(editorClone);
      const bodyHtml = editorClone.innerHTML;

      const host = document.createElement("div");
      host.style.cssText = `position:fixed;left:-100000px;top:0;width:${targetWidth}px;pointer-events:none;`;
      const style = document.createElement("style");
      style.textContent = generateCardCss({ theme: resolvedTheme, fontStyle, fontSize, cardWidth });

      const cardMarkup = buildNoteImageCardMarkup({
        title: request.title || request.fallbackTitle,
        notebook: request.notebook,
        tags: request.tags,
        updatedAt: request.updatedAt,
        bodyHtml,
        theme: resolvedTheme,
        fontStyle,
        showTitle: request.showTitle ?? false,
        showNotebook: request.showNotebook ?? false,
        showTags: request.showTags ?? false,
        showUpdatedAt: request.showUpdatedAt ?? true,
        showBranding: request.branding ?? true,
      });

      host.appendChild(style);
      host.insertAdjacentHTML("beforeend", cardMarkup);
      const documentRoot = host.lastElementChild as HTMLElement;
      documentRoot.style.width = `${targetWidth}px`;
      documentRoot.style.maxWidth = "none";
      documentRoot.style.margin = "0";

      document.body.appendChild(host);

      try {
        await notify({ type: "font-status", status: "loading" });
        const assets = await prepareNoteImageAssets({ theme: resolvedTheme, fontStyle, text: [request.title, request.notebook, ...(request.tags || []), request.updatedAt, bodyHtml].join(" "), urls: noteImageAssetUrls });
        await notify({ type: "font-status", status: assets.fontFallback ? "fallback" : "ready" });
        void assets.fontsReady?.then(() => notify({ type: "fonts-ready" }), () => {}).catch(() => {});
        style.textContent = assets.css + generateCardCss({ theme: resolvedTheme, fontStyle, fontSize, cardWidth });
        const images = Array.from(documentRoot.querySelectorAll<HTMLImageElement>("img"));
        await Promise.race([
          Promise.all([
            document.fonts?.ready,
            ...images.map(async (image) => {
              if (image.complete) return;
              try { await image.decode(); } catch { /* Export the readable remainder. */ }
            }),
          ]),
          new Promise<void>((resolve) => window.setTimeout(resolve, 8_000)),
        ]);
        const exportedImages = Array.from(
          documentRoot.querySelectorAll<HTMLImageElement>(".edgeever-card-body img"),
        );
        const failedImages = exportedImages.filter((image) => !image.complete || image.naturalWidth === 0).length;
        const totalHeight = Math.max(1, Math.ceil(documentRoot.getBoundingClientRect().height));
        const renderPlan = planMobileNoteImageRender(targetWidth, totalHeight);
        let embedFailedImages = 0;
        let captureRoot = documentRoot;
        let captureWrapper: HTMLDivElement | null = null;
        if (renderPlan.sourceScale < 1) {
          const wrapper = document.createElement("div");
          wrapper.style.cssText = `position:relative;width:${renderPlan.sourceWidth}px;height:${renderPlan.sourceHeight}px;overflow:hidden;`;
          documentRoot.replaceWith(wrapper);
          wrapper.appendChild(documentRoot);
          documentRoot.style.transform = `scale(${renderPlan.sourceScale})`;
          documentRoot.style.transformOrigin = "top left";
          captureRoot = wrapper;
          captureWrapper = wrapper;
        }
        const backgroundColor = NOTE_IMAGE_BACKGROUND_COLORS[resolvedTheme] || themeCfg.canvasBg;

        reportProgress("render");
        const renderCanvas = (root: HTMLElement, width: number, height: number) => toCanvas(root, {
          backgroundColor,
          cacheBust: false,
          height,
          imagePlaceholder: missingImagePlaceholder,
          onImageErrorHandler: (event) => {
            embedFailedImages += 1;
            if (event instanceof Event && event.target instanceof HTMLImageElement) {
              event.target.src = missingImagePlaceholder;
            }
          },
          pixelRatio: renderPlan.pixelRatio,
          fontEmbedCSS: assets.fontCss,
          width,
        });
        let canvas: HTMLCanvasElement;
        try {
          canvas = await renderCanvas(captureRoot, renderPlan.sourceWidth, renderPlan.sourceHeight);
        } catch {
          // Android WebView can reject a large SVG image without an Error message.
          // Try a smaller source once while keeping the entire card visible.
          const retryScale = renderPlan.sourceScale * 0.75;
          const retryWidth = Math.max(1, Math.floor(targetWidth * retryScale));
          const retryHeight = Math.max(1, Math.floor(totalHeight * retryScale));
          if (retryScale < 0.5) throw new Error("NOTE_IMAGE_RENDER_FAILED");
          if (!captureWrapper) {
            captureWrapper = document.createElement("div");
            documentRoot.replaceWith(captureWrapper);
            captureWrapper.appendChild(documentRoot);
          }
          captureWrapper.style.cssText = `position:relative;width:${retryWidth}px;height:${retryHeight}px;overflow:hidden;`;
          documentRoot.style.transform = `scale(${retryScale})`;
          documentRoot.style.transformOrigin = "top left";
          try {
            canvas = await renderCanvas(captureWrapper, retryWidth, retryHeight);
          } catch {
            throw new Error("NOTE_IMAGE_RENDER_FAILED");
          }
        }
        const extension = request.format === "jpeg" ? "jpg" : "png";
        const basename = buildImageExportBasename(request.title, request.fallbackTitle);
        const filename = `${basename}.${extension}`;
        const mimeType = request.format === "jpeg" ? "image/jpeg" : "image/png";
        // Android WebView can take many seconds to return canvas.toBlob for a
        // long note. This encodes promptly and gives the bridge base64 directly.
        const dataUrl = canvas.toDataURL(mimeType, request.format === "jpeg" ? 0.92 : 1);
        const dataUrlPrefix = `data:${mimeType};base64,`;
        if (!dataUrl.startsWith(dataUrlPrefix)) throw new Error("Image renderer returned an empty file");
        const base64 = dataUrl.slice(dataUrlPrefix.length);

        reportProgress("transfer");
        const chunkChars = (IMAGE_EXPORT_CHUNK_BYTES / 3) * 4;
        for (let offset = 0; offset < base64.length; offset += chunkChars) {
          await notify({ type: "chunk", chunk: base64.slice(offset, offset + chunkChars) });
        }
        await notify({
          type: "complete",
          fontFallback: assets.fontFallback,
          filename,
          mimeType,
          width: canvas.width,
          height: canvas.height,
          totalImages: exportedImages.length,
          failedImages: Math.min(exportedImages.length, failedImages + embedFailedImages),
        });
      } catch (error) {
        await notify({ type: "error", message: error instanceof Error ? error.message : "Image export failed" });
      } finally {
        host.remove();
      }
    })().catch((error: unknown) => {
      void notify({ type: "error", message: error instanceof Error ? error.message : "Image export failed" });
    });
  }, [editor]);

  useDOMImperativeHandle(
    props.ref,
    () => ({
      beginImageUpload,
      cancelImageUpload,
      completeImageUpload,
      finishImageBatch,
      appendAttachment,
      insertVoiceMemo,
      completeVoiceMemo,
      setContent,
      flush,
      focusEnd: () => {
        if (!isViewer && editor && !editor.isDestroyed) {
          editor.commands.focus("end");
          window.requestAnimationFrame(() => {
            scrollEditorPositionIntoView(editor, editor.state.selection.head);
          });
        }
      },
      removeResource,
      renameResource,
      replaceAll,
      search,
      exportImage,
    }),
    [appendAttachment, beginImageUpload, cancelImageUpload, completeImageUpload, completeVoiceMemo, finishImageBatch, editor, exportImage, flush, insertVoiceMemo, isViewer, removeResource, renameResource, replaceAll, search, setContent]
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    editor.setEditable(!isViewer);
    editor.view.dom.classList.toggle("edgeever-viewer-content", isViewer);
  }, [editor, isViewer]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    void onReadyRef.current(Math.round(performance.now() - startedAtRef.current));
    const handlePageHide = () => flush();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (changeTimerRef.current !== null) {
        window.clearTimeout(changeTimerRef.current);
      }
    };
  }, [editor, flush]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || isViewer || !autoFocus) {
      return;
    }
    const focusAtEnd = () => {
      if (!editor.isDestroyed) {
        editor.commands.focus("end");
      }
    };
    const focusFrame = window.requestAnimationFrame(focusAtEnd);
    // The DOM view can report ready one bridge turn before Android attaches
    // its input connection. Keep the HTML selection ready for the native IME
    // handoff without delaying the editor's first visible frame.
    const focusRetry = window.setTimeout(focusAtEnd, 120);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.clearTimeout(focusRetry);
    };
  }, [autoFocus, editor, isViewer]);

  // Keep the viewer in sync when the parent swaps memo content.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !isViewer) {
      return;
    }
    const next = prepareNativeEditorContent(
      resolveImageSources(resolveMobileAttachmentContent(props.content), props.baseUrl),
      props.locale,
    );
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(next);
    if (current !== incoming) {
      editor.commands.setContent(next, { emitUpdate: false });
      clearMobileEditorUndoHistory(editor);
    }
  }, [editor, isViewer, props.baseUrl, props.content, props.locale]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || isViewer) {
      return;
    }

    let scrollFrame = 0;
    let settledScrollTimer: number | null = null;
    const ensureSelectionVisible = () => {
      updateEditorKeyboardInset(editor);
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(() => {
        if (!editor.isDestroyed && editor.isFocused) {
          scrollEditorPositionIntoView(editor, editor.state.selection.head);
        }
      });
      if (settledScrollTimer !== null) {
        window.clearTimeout(settledScrollTimer);
      }
      // Android IMEs animate the visible viewport after focus. Recheck once the
      // animation settles so the last line stays above the keyboard.
      settledScrollTimer = window.setTimeout(() => {
        settledScrollTimer = null;
        if (!editor.isDestroyed && editor.isFocused) {
          updateEditorKeyboardInset(editor);
          scrollEditorPositionIntoView(editor, editor.state.selection.head);
        }
      }, 180);
    };

    const handleSelectionUpdate = () => {
      if (editor.isFocused) {
        ensureSelectionVisible();
      }
    };
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", ensureSelectionVisible);
    visualViewport?.addEventListener("resize", ensureSelectionVisible);
    visualViewport?.addEventListener("scroll", ensureSelectionVisible);
    editor.on("focus", ensureSelectionVisible);
    editor.on("selectionUpdate", handleSelectionUpdate);
    updateEditorKeyboardInset(editor);

    return () => {
      window.cancelAnimationFrame(scrollFrame);
      if (settledScrollTimer !== null) {
        window.clearTimeout(settledScrollTimer);
      }
      window.removeEventListener("resize", ensureSelectionVisible);
      visualViewport?.removeEventListener("resize", ensureSelectionVisible);
      visualViewport?.removeEventListener("scroll", ensureSelectionVisible);
      editor.off("focus", ensureSelectionVisible);
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, isViewer]);

  useEffect(() => {
    if (!editor || !isViewer) return;
    const scrollContainer = document.querySelector<HTMLElement>(".edgeever-editor-scroll");
    if (!scrollContainer) return;

    return attachMobileReaderScroll(scrollContainer, (collapsed) => {
      void onReaderScrollRef.current?.(collapsed);
    });
  }, [editor, isViewer, visualDiagram]);

  // The Format sheet (font, size, alignment, captions, table cells) is shared
  // with iOS. It lives outside React because both editors build it from DOM.
  useEffect(() => {
    if (!editor || editor.isDestroyed || isViewer) return;
    const panel = createMobileFormatPanel({
      editor,
      locale: props.locale,
      theme: props.theme === "dark" ? "dark" : "light",
      onOpenChange: setFormatPanelOpen,
    });
    document.body.appendChild(panel.element);
    formatPanelRef.current = panel;
    return () => {
      panel.destroy();
      if (formatPanelRef.current === panel) formatPanelRef.current = null;
      setFormatPanelOpen(false);
    };
  }, [editor, isViewer, props.locale, props.theme]);

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: activeEditor }) =>
      (activeEditor?.isActive("bold") ? MOBILE_EDITOR_ACTIVE_FLAGS.bold : 0) |
      (activeEditor?.isActive("bulletList") ? MOBILE_EDITOR_ACTIVE_FLAGS.bulletList : 0) |
      (activeEditor?.isActive("taskList") ? MOBILE_EDITOR_ACTIVE_FLAGS.taskList : 0) |
      (activeEditor?.isActive("blockquote") ? MOBILE_EDITOR_ACTIVE_FLAGS.blockquote : 0),
  });
  const historyState = useEditorState({
    editor,
    selector: ({ editor: activeEditor }) => {
      if (!activeEditor) return 0;
      const available = (command: "undo" | "redo") => {
        try {
          return activeEditor.can().chain().focus()[command]().run();
        } catch {
          return false;
        }
      };
      return (available("undo") ? 1 : 0) | (available("redo") ? 2 : 0);
    },
  });
  const insertImage = async () => {
    if (isViewer || !editor || imageUploadInFlightRef.current || !onPickImageRef.current) {
      return;
    }

    imageUploadInFlightRef.current = true;
    pendingImageSelectionRef.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    try {
      await onPickImageRef.current();
    } finally {
      pendingImageSelectionRef.current = null;
      imageUploadInFlightRef.current = false;
    }
  };

  const toolbarIcons: Record<MobileEditorToolbarActionId, ReactNode> = {
    undo: <UndoIcon />,
    redo: <RedoIcon />,
    image: <ImagePlusIcon />,
    voiceMemo: <MicIcon />,
    bold: <BoldIcon />,
    bulletList: <ListIcon />,
    taskList: <ListTodoIcon />,
    increaseListIndent: <ListIndentIncreaseIcon />,
    decreaseListIndent: <ListIndentDecreaseIcon />,
    blockquote: <QuoteIcon />,
    horizontalRule: <MinusIcon />,
    format: <FormatIcon />,
  };
  const activeListItemType = editor?.isActive("taskItem") ? "taskItem" : "listItem";
  const toolbarHandlers: Record<MobileEditorToolbarActionId, () => void> = {
    undo: () => editor?.chain().focus().undo().run(),
    redo: () => editor?.chain().focus().redo().run(),
    image: () => void insertImage(),
    voiceMemo: () => {
      if (isViewer || !editor || !onRecordVoiceMemoRef.current) return;
      void onRecordVoiceMemoRef.current();
    },
    bold: () => editor?.chain().focus().toggleBold().run(),
    bulletList: () => editor?.chain().focus().toggleBulletList().run(),
    taskList: () => editor?.chain().focus().toggleTaskList().run(),
    increaseListIndent: () => editor?.chain().focus().sinkListItem(activeListItemType).run(),
    decreaseListIndent: () => editor?.chain().focus().liftListItem(activeListItemType).run(),
    blockquote: () => editor?.chain().focus().toggleBlockquote().run(),
    horizontalRule: () => editor?.chain().focus().setHorizontalRule().run(),
    format: () => formatPanelRef.current?.toggle(),
  };

  return (
    <div className={isViewer ? "edgeever-editor-shell edgeever-viewer-shell" : "edgeever-editor-shell"}>
      <style>{getEditorStyles(props.theme, { viewer: isViewer })}</style>
      <style>{NATIVE_VOICE_MEMO_CSS}</style>
      {!isViewer ? (
        <div aria-label={getMobileEditorToolbarLabel(props.locale)} className="edgeever-editor-toolbar" role="toolbar">
          {MOBILE_EDITOR_TOOLBAR_ACTIONS.map((action) => (
              <ToolbarButton
                key={action.id}
                active={action.id === "format" ? formatPanelOpen : action.activeFlag > 0 && Boolean(toolbarState & action.activeFlag)}
                disabled={(action.id === "voiceMemo" && !props.onRecordVoiceMemo)
                  || (action.id === "undo" && ((historyState ?? 0) & 1) === 0)
                  || (action.id === "redo" && ((historyState ?? 0) & 2) === 0)
                  || (action.id === "increaseListIndent"
                    && !editor?.can().chain().focus().sinkListItem(activeListItemType).run())
                  || (action.id === "decreaseListIndent"
                    && !editor?.can().chain().focus().liftListItem(activeListItemType).run())}
                icon={toolbarIcons[action.id]}
                label={getMobileEditorToolbarActionLabel(action.id, props.locale)}
                onRun={toolbarHandlers[action.id]}
              />
            ))}
        </div>
      ) : null}
      {isViewer && visualDiagram ? (
        <div className="edgeever-editor-scroll">
          <ReadOnlyX6Diagram diagram={visualDiagram} locale={props.locale} theme={props.theme} />
        </div>
      ) : (
        <EditorContent className="edgeever-editor-scroll" editor={editor} />
      )}
    </div>
  );
}

const ToolbarButton = ({ active = false, disabled = false, icon, label, onRun }: { active?: boolean; disabled?: boolean; icon: ReactNode; label: string; onRun: () => void }) => (
  <button
    aria-label={label}
    aria-pressed={active}
    className={active ? "is-active" : undefined}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onRun}
    type="button"
  >
    {icon}
  </button>
);

const EditorIcon = ({ children, size, strokeWidth }: { children: ReactNode; size: number; strokeWidth: number }) => (
  <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 24 24" width={size}>
    {children}
  </svg>
);

// Keep the same Lucide paths as the PWA toolbar without pulling the full icon
// barrel into the standalone DOM bundle (which adds roughly 1.8 MB in Metro).
const UndoIcon = () => (
  <EditorIcon size={18} strokeWidth={2}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
  </EditorIcon>
);

const RedoIcon = () => (
  <EditorIcon size={18} strokeWidth={2}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
  </EditorIcon>
);

const ImagePlusIcon = () => (
  <EditorIcon size={18} strokeWidth={2}>
    <path d="M16 5h6" />
    <path d="M19 2v6" />
    <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    <circle cx="9" cy="9" r="2" />
  </EditorIcon>
);

const MicIcon = () => (
  <EditorIcon size={18} strokeWidth={2}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </EditorIcon>
);

const BoldIcon = () => (
  <EditorIcon size={17} strokeWidth={2.4}>
    <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
  </EditorIcon>
);

const ListIcon = () => (
  <EditorIcon size={18} strokeWidth={2.2}>
    <path d="M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13" />
  </EditorIcon>
);

const ListTodoIcon = () => (
  <EditorIcon size={18} strokeWidth={2.1}>
    <rect height="6" rx="1" width="6" x="3" y="3" />
    <path d="m4.5 6 1 1 2-2M13 6h8" />
    <rect height="6" rx="1" width="6" x="3" y="15" />
    <path d="M13 18h8" />
  </EditorIcon>
);

const ListIndentIncreaseIcon = () => (
  <EditorIcon size={18} strokeWidth={2.1}>
    <path d="M4 5h16M4 12h10M4 19h16" />
    <path d="m14 9 3 3-3 3" />
  </EditorIcon>
);

const ListIndentDecreaseIcon = () => (
  <EditorIcon size={18} strokeWidth={2.1}>
    <path d="M4 5h16M10 12h10M4 19h16" />
    <path d="m10 9-3 3 3 3" />
  </EditorIcon>
);

const QuoteIcon = () => (
  <EditorIcon size={17} strokeWidth={2.2}>
    <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
  </EditorIcon>
);

const MinusIcon = () => (
  <EditorIcon size={18} strokeWidth={2.4}>
    <path d="M5 12h14" />
  </EditorIcon>
);

const FormatIcon = () => (
  <EditorIcon size={18} strokeWidth={2.2}>
    <path d="M4 7V4h16v3" />
    <path d="M9 20h6" />
    <path d="M12 4v16" />
  </EditorIcon>
);

const mapImageSources = (doc: EditorDoc, mapSource: (source: string) => string): EditorDoc => {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(visit);
    }
    if (!value || typeof value !== "object") {
      return value;
    }
    const node = value as Record<string, unknown>;
    const next = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]));
    if (node.type === "image" && next.attrs && typeof next.attrs === "object") {
      const attrs = next.attrs as Record<string, unknown>;
      if (typeof attrs.src === "string") {
        next.attrs = { ...attrs, src: mapSource(attrs.src) };
      }
    }
    return next;
  };

  return visit(doc) as EditorDoc;
};

const resolveImageSources = (doc: EditorDoc, baseUrl: string) => mapImageSources(doc, (source) => resolveUrl(source, baseUrl));

const normalizeImageSources = (doc: EditorDoc, baseUrl: string) => {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return mapImageSources(doc, (source) => source.startsWith(`${normalizedBaseUrl}/`) ? source.slice(normalizedBaseUrl.length) : source);
};

const getPersistableEditorDoc = (doc: EditorDoc, baseUrl: string) =>
  normalizeImageSources(
    restoreNativeEditorContent(stripMobileImageUploadPlaceholders(doc)),
    baseUrl,
  );

const normalizeProtectedResourceSource = (source: string, baseUrl: string) =>
  // Shared normalizer adds `/blob` so editor loads hit the API blob route even when
  // note content stores the bare `/api/v1/resources/:id` form.
  toProtectedResourceLoadPath(source, baseUrl);

const resolveUrl = (source: string, baseUrl: string) => {
  if (!source.startsWith("/")) {
    return source;
  }
  return `${baseUrl.replace(/\/+$/, "")}${source}`;
};

const applyImageWidth = (
  element: HTMLElement,
  attributes: Record<string, unknown>
): number => {
  const width = parseImageWidth(attributes.width) ?? NEW_IMAGE_WIDTH_PERCENT;
  element.style.width = `${width}%`;
  element.dataset.width = String(width);
  applyImageAlignment(element, attributes.alignment);
  return width;
};

let mermaidRenderSequence = 0;

const getMobileMermaidThemeVariables = (theme: "light" | "dark") => {
  const ink = theme === "dark" ? "#cbd5e1" : "#26384a";
  const surface = theme === "dark" ? "#0f172a" : "#ffffff";
  return {
    background: "transparent",
    primaryColor: surface,
    primaryTextColor: ink,
    primaryBorderColor: ink,
    lineColor: ink,
    textColor: ink,
    mainBkg: surface,
    nodeBorder: ink,
    edgeLabelBackground: surface,
    actorBkg: surface,
    actorBorder: ink,
    actorTextColor: ink,
    signalColor: ink,
    signalTextColor: ink,
  };
};

let mermaidRuntime: Promise<typeof import("mermaid")["default"]> | null = null;

const loadMermaid = () => {
  mermaidRuntime ??= import("mermaid/dist/mermaid.min.js").then(() => {
    const mermaid = (globalThis as typeof globalThis & {
      mermaid?: typeof import("mermaid")["default"];
    }).mermaid;
    if (!mermaid) throw new Error("Mermaid runtime unavailable");
    return mermaid;
  });
  return mermaidRuntime;
};

let mermaidRenderQueue: Promise<unknown> = Promise.resolve();

const renderMobileMermaid = (source: string, theme: "light" | "dark", htmlLabels = true) => {
  // Mermaid shares its configuration across renders, including different themes.
  const result = mermaidRenderQueue.then(async () => {
    const mermaid = await loadMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: getMobileMermaidThemeVariables(theme),
      htmlLabels,
      flowchart: { nodeSpacing: 25, rankSpacing: 30, subGraphTitleMargin: { bottom: 12 } },
    });
    return mermaid.render(`edgeever-mobile-mermaid-${++mermaidRenderSequence}`, source);
  });
  mermaidRenderQueue = result.catch(() => undefined);
  return result;
};

const createMobileCodeBlockExtension = (
  locale: MobileEditorLocale,
  theme: "light" | "dark",
  hideCopyForVisualDiagram = false,
) => CodeBlock.extend({
  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement("div");
      const preview = document.createElement("div");
      const message = document.createElement("p");
      const svgContainer = document.createElement("div");
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      const copyButton = document.createElement("button");
      let copyResetTimer: number | null = null;
      preview.contentEditable = "false";
      preview.className = "edgeever-mermaid-preview";
      preview.tabIndex = 0;
      preview.setAttribute("role", "button");
      preview.addEventListener("click", () => wrapper.classList.toggle("is-source-visible"));
      preview.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          wrapper.classList.toggle("is-source-visible");
        }
      });
      message.className = "edgeever-mermaid-message";
      svgContainer.className = "edgeever-mermaid-svg";
      svgContainer.setAttribute("role", "img");
      svgContainer.setAttribute("aria-label", getMobileEditorCopy(locale).codeBlock.mermaidPreview);
      copyButton.type = "button";
      copyButton.className = "edgeever-code-copy-button";
      copyButton.contentEditable = "false";
      copyButton.setAttribute("aria-label", getMobileEditorCopy(locale).codeBlock.copy);
      copyButton.textContent = getMobileEditorCopy(locale).codeBlock.copy;
      copyButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      copyButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void Clipboard.setStringAsync(currentNode.textContent).then(() => {
          copyButton.textContent = getMobileEditorCopy(locale).codeBlock.copied;
          copyButton.setAttribute("aria-label", getMobileEditorCopy(locale).codeBlock.copied);
          if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
          copyResetTimer = window.setTimeout(() => {
            copyButton.textContent = getMobileEditorCopy(locale).codeBlock.copy;
            copyButton.setAttribute("aria-label", getMobileEditorCopy(locale).codeBlock.copy);
            copyResetTimer = null;
          }, 1800);
        }).catch(() => {
          copyButton.textContent = getMobileEditorCopy(locale).codeBlock.copyFailed;
          copyButton.setAttribute("aria-label", getMobileEditorCopy(locale).codeBlock.copyFailed);
          if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
          copyResetTimer = window.setTimeout(() => {
            copyButton.textContent = getMobileEditorCopy(locale).codeBlock.copy;
            copyButton.setAttribute("aria-label", getMobileEditorCopy(locale).codeBlock.copy);
            copyResetTimer = null;
          }, 1800);
        });
      });
      pre.append(code);
      wrapper.append(...(hideCopyForVisualDiagram ? [preview, pre] : [copyButton, preview, pre]));

      let currentNode = node;
      let renderTimer: number | null = null;
      let renderRequest = 0;

      const clearRender = () => {
        renderRequest += 1;
        if (renderTimer !== null) {
          window.clearTimeout(renderTimer);
          renderTimer = null;
        }
      };

      const renderNode = () => {
        clearRender();
        const language = typeof currentNode.attrs.language === "string"
          ? currentNode.attrs.language.toLowerCase()
          : "plaintext";
        const isMermaid = language === "mermaid";
        wrapper.className = isMermaid ? "edgeever-mermaid-code-block" : "edgeever-code-block";
        wrapper.dataset.language = language;
        preview.hidden = !isMermaid;
        code.setAttribute("aria-label", isMermaid
          ? getMobileEditorCopy(locale).codeBlock.mermaidSource
          : getMobileEditorCopy(locale).codeBlock.codeSource);
        if (!isMermaid) {
          preview.replaceChildren();
          return;
        }

        const source = currentNode.textContent.trim();
        if (!source) {
          message.className = "edgeever-mermaid-message";
          message.textContent = getMobileEditorCopy(locale).codeBlock.mermaidEmpty;
          preview.replaceChildren(message);
          return;
        }

        const activeRequest = renderRequest;
        renderTimer = window.setTimeout(() => {
          message.className = "edgeever-mermaid-message";
          message.textContent = getMobileEditorCopy(locale).codeBlock.rendering;
          preview.replaceChildren(message);
          void renderMobileMermaid(source, theme)
            .then(({ svg }) => {
              if (activeRequest !== renderRequest) {
                return;
              }
              svgContainer.innerHTML = svg;
              const renderedSvg = svgContainer.querySelector("svg");
              const viewBox = renderedSvg?.viewBox.baseVal;
              if (renderedSvg && viewBox && viewBox.width > 0 && viewBox.height > 0) {
                renderedSvg.style.width = `${Math.ceil(viewBox.width)}px`;
                renderedSvg.style.height = `${Math.ceil(viewBox.height)}px`;
                renderedSvg.style.maxWidth = "none";
              }
              preview.replaceChildren(svgContainer);
            })
            .catch(() => {
              if (activeRequest !== renderRequest) {
                return;
              }
              message.className = "edgeever-mermaid-error";
              message.textContent = getMobileEditorCopy(locale).codeBlock.renderFailed;
              preview.replaceChildren(message);
            });
        }, 300);
      };

      renderNode();
      return {
        dom: wrapper,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type !== currentNode.type) {
            return false;
          }
          currentNode = updatedNode;
          renderNode();
          return true;
        },
        destroy: () => {
          clearRender();
          if (copyResetTimer !== null) window.clearTimeout(copyResetTimer);
        },
      };
    };
  },
});

const createMobileImageSizeControls = (
  locale: MobileEditorLocale,
  updateWidth: (width: number) => void
) => {
  const controls = document.createElement("div");
  controls.className = "edgeever-image-size-controls";
  controls.contentEditable = "false";
  controls.hidden = true;
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", getMobileEditorImageScaleLabel(locale));

  const buttons = IMAGE_WIDTH_PRESETS.map((preset) => {
    const button = document.createElement("button");
    const label = getMobileEditorImageWidthPresetLabel(preset.id, locale);
    button.type = "button";
    button.className = "edgeever-image-size-button";
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", "false");

    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    button.append(labelNode);

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      updateWidth(preset.width);
    });
    controls.append(button);
    return { button, width: preset.width };
  });

  return {
    dom: controls,
    setActiveWidth: (width: number) => {
      for (const item of buttons) {
        const active = item.width === width;
        item.button.classList.toggle("is-active", active);
        item.button.setAttribute("aria-pressed", String(active));
      }
    },
    setVisible: (visible: boolean) => {
      controls.hidden = !visible;
    },
  };
};

const createProtectedImageExtension = (
  baseUrl: string,
  locale: MobileEditorLocale,
  loadResource: (source: string) => Promise<string | null>,
  options?: {
    readOnly?: boolean | (() => boolean);
    onResourcePress?: (targetJson: string) => void | Promise<void>;
    onImagePreview?: (payloadJson: string) => void | Promise<void>;
  }
) => Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          parseImageWidth(element.getAttribute("data-width") ?? element.getAttribute("width") ?? element.style.width),
        renderHTML: (attributes) => {
          const width = parseImageWidth(attributes.width);
          return width ? { "data-width": String(width), style: `width: ${width}%` } : {};
        },
      },
    };
  },
  addNodeView() {
    return ({ editor, getPos, node }) => {
      const isReadOnly = () => {
        const option = options?.readOnly;
        const fromOption = typeof option === "function" ? option() : Boolean(option);
        return fromOption || !editor.isEditable;
      };
      const readOnly = isReadOnly();
      const updateWidth = (width: number) => {
        if (isReadOnly()) {
          return;
        }
        const position = getPos();
        if (typeof position !== "number") {
          return;
        }
        editor
          .chain()
          .focus()
          .setNodeSelection(position)
          .updateAttributes("image", { width: clampImageWidth(width) })
          .run();
      };
      const sizeControls = createMobileImageSizeControls(locale, updateWidth);
      if (readOnly) {
        sizeControls.setVisible(false);
      }

      const emitImageResourcePress = (figure: HTMLElement) => {
        const targetJson = buildImageResourceTargetJson(figure);
        if (!targetJson || !options?.onResourcePress) return false;
        void options.onResourcePress(targetJson);
        return true;
      };

      const emitImagePreview = (figure: HTMLElement) => {
        if (!options?.onImagePreview) return false;
        const source = figure.dataset.resourceHref ?? "";
        if (!source) return false;
        void options.onImagePreview(buildMobileImagePreviewPayload(figure));
        return true;
      };

      const bindImageActionButton = (figure: HTMLElement, button: HTMLButtonElement) => {
        // Only stop bubbling so the editor doesn't steal focus/selection.
        // preventDefault on pointerdown suppresses click on Android WebView.
        button.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
        });
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          emitImageResourcePress(figure);
        });
      };

      if (isMobileImageUploadPlaceholderSource(node.attrs.src)) {
        const placeholder = document.createElement("div");
        placeholder.className = "edgeever-image-upload-placeholder";
        placeholder.contentEditable = "false";
        placeholder.setAttribute("role", "status");
        placeholder.setAttribute("aria-live", "polite");

        const preview = document.createElement("img");
        preview.className = "edgeever-image-upload-preview";
        preview.alt = "";
        const previewSource = String(node.attrs.title ?? "");
        if (previewSource) {
          const previewReferrerPolicy = getImageReferrerPolicy(previewSource);
          if (previewReferrerPolicy) {
            preview.referrerPolicy = previewReferrerPolicy;
          }
          preview.src = previewSource;
        }

        const overlay = document.createElement("div");
        overlay.className = "edgeever-image-upload-overlay";
        const spinner = document.createElement("span");
        spinner.className = "edgeever-image-upload-spinner";
        spinner.setAttribute("aria-hidden", "true");
        overlay.append(spinner, getMobileEditorCopy(locale).image.uploading);
        if (previewSource) {
          placeholder.append(preview);
        }
        placeholder.append(overlay, sizeControls.dom);
        sizeControls.setActiveWidth(applyImageWidth(placeholder, node.attrs));

        let requestId = 0;
        let renderedSource = String(node.attrs.src ?? "");
        let completed = false;
        let selected = false;

        const applyImageAttributes = (attributes: Record<string, unknown>) => {
          preview.alt = String(attributes.alt ?? "");
          const title = String(attributes.title ?? "");
          if (title && !title.startsWith("data:")) {
            preview.title = title;
          } else {
            preview.removeAttribute("title");
          }
        };

        const revealLoadedImage = (
          displaySource: string,
          attributes: Record<string, unknown>,
          activeRequestId: number
        ) => {
          const preload = document.createElement("img");
          const preloadReferrerPolicy = getImageReferrerPolicy(displaySource);
          if (preloadReferrerPolicy) {
            preload.referrerPolicy = preloadReferrerPolicy;
          }
          preload.onload = () => {
            if (activeRequestId !== requestId) {
              return;
            }
            applyImageAttributes(attributes);
            preview.src = displaySource;
            preview.className = "";
            overlay.remove();
            placeholder.className = "edgeever-image-upload-result";
            completed = true;
            if (selected) {
              placeholder.classList.add("is-selected");
              sizeControls.setVisible(true);
            }
            placeholder.removeAttribute("role");
            placeholder.removeAttribute("aria-live");
          };
          // Keep the upload preview until decode succeeds — never swap to a
          // 401-prone bare resource URL that flashes a broken icon.
          preload.onerror = () => {
            if (activeRequestId !== requestId) {
              return;
            }
            overlay.textContent = getMobileEditorCopy(locale).image.loadFailed;
          };
          preload.src = displaySource;
        };

        const loadCompletedImage = (attributes: Record<string, unknown>) => {
          requestId += 1;
          const activeRequestId = requestId;
          const source = String(attributes.src ?? "");
          renderedSource = source;
          const protectedSource = normalizeProtectedResourceSource(source, baseUrl);
          if (!protectedSource) {
            revealLoadedImage(resolveUrl(source, baseUrl), attributes, activeRequestId);
            return;
          }

          void loadResource(protectedSource)
            .then((dataUrl) => {
              if (activeRequestId !== requestId) {
                return;
              }
              if (dataUrl) {
                revealLoadedImage(dataUrl, attributes, activeRequestId);
                return;
              }
              overlay.textContent = getMobileEditorCopy(locale).image.loadFailed;
            })
            .catch(() => {
              if (activeRequestId === requestId) {
                overlay.textContent = getMobileEditorCopy(locale).image.loadFailed;
              }
            });
        };

        return {
          dom: placeholder,
          update: (updatedNode) => {
            if (updatedNode.type !== node.type) {
              return false;
            }
            const source = String(updatedNode.attrs.src ?? "");
            sizeControls.setActiveWidth(applyImageWidth(placeholder, updatedNode.attrs));
            if (isMobileImageUploadPlaceholderSource(source)) {
              return true;
            }
            if (source === renderedSource) {
              applyImageAttributes(updatedNode.attrs);
              return true;
            }
            loadCompletedImage(updatedNode.attrs);
            return true;
          },
          selectNode: () => {
            selected = true;
            if (completed) {
              placeholder.classList.add("is-selected");
              sizeControls.setVisible(true);
            }
          },
          deselectNode: () => {
            selected = false;
            placeholder.classList.remove("is-selected");
            sizeControls.setVisible(false);
          },
          destroy: () => {
            requestId += 1;
          },
        };
      }

      const wrapper = document.createElement("figure");
      wrapper.className = "edgeever-image-node is-loading";
      wrapper.contentEditable = "false";
      wrapper.setAttribute("role", "img");
      wrapper.setAttribute("aria-busy", "true");

      const loading = document.createElement("div");
      loading.className = "edgeever-image-loading";
      loading.setAttribute("aria-hidden", "true");
      const spinner = document.createElement("span");
      spinner.className = "edgeever-image-upload-spinner";
      loading.append(spinner);

      const image = document.createElement("img");
      // Never leave <img> without a successful src — empty/401 src paints the
      // browser broken-image glyph before the authenticated data URL arrives.
      image.hidden = true;

      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = "edgeever-image-actions";
      actionButton.contentEditable = "false";
      actionButton.hidden = true;
      actionButton.setAttribute("aria-label", getMobileEditorCopy(locale).image.actions);
      actionButton.textContent = "⋯";
      bindImageActionButton(wrapper, actionButton);
      image.addEventListener("click", (event) => {
        if (!isReadOnly()) {
          return;
        }
        // Ignore taps that originated on the ⋯ control (event target would be button).
        if (event.target instanceof Element && event.target.closest(".edgeever-image-actions")) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        emitImagePreview(wrapper);
      });
      wrapper.append(loading, image, actionButton, sizeControls.dom);
      const imageType = node.type;
      let requestId = 0;
      let renderedSource = "";
      let displayReady = false;

      const clearRequest = () => {
        requestId += 1;
      };

      const setImagePhase = (phase: "loading" | "ready" | "failed") => {
        wrapper.classList.toggle("is-loading", phase === "loading");
        wrapper.classList.toggle("is-failed", phase === "failed");
        wrapper.setAttribute("aria-busy", phase === "loading" ? "true" : "false");
        loading.hidden = phase === "ready";
        image.hidden = phase !== "ready";
        actionButton.hidden = phase !== "ready";
        if (phase === "failed") {
          loading.replaceChildren();
          const label = document.createElement("span");
          label.className = "edgeever-image-loading-label";
          label.textContent = getMobileEditorCopy(locale).image.loadFailed;
          loading.append(label);
          loading.hidden = false;
        } else if (phase === "loading") {
          loading.replaceChildren(spinner);
        }
      };

      const applyImageMeta = (attributes: Record<string, unknown>) => {
        const alt = String(attributes.alt ?? "");
        const title = String(attributes.title ?? "");
        const source = String(attributes.src ?? "");
        wrapper.dataset.resourceHref = source;
        wrapper.dataset.resourceFilename = alt || title;
        image.alt = alt;
        if (alt) {
          wrapper.setAttribute("aria-label", alt);
        } else {
          wrapper.removeAttribute("aria-label");
        }
        const referrerPolicy = getImageReferrerPolicy(source);
        if (referrerPolicy) {
          image.referrerPolicy = referrerPolicy;
        } else {
          image.removeAttribute("referrerpolicy");
        }
        if (title) {
          image.title = title;
        } else {
          image.removeAttribute("title");
        }
      };

      /** Decode off-DOM first so the visible <img> never paints a broken glyph. */
      const revealDisplaySource = (displaySource: string, activeRequestId: number) => {
        const preload = document.createElement("img");
        const preloadReferrerPolicy = getImageReferrerPolicy(displaySource);
        if (preloadReferrerPolicy) {
          preload.referrerPolicy = preloadReferrerPolicy;
        }
        preload.onload = () => {
          if (activeRequestId !== requestId) {
            return;
          }
          image.src = displaySource;
          displayReady = true;
          setImagePhase("ready");
        };
        preload.onerror = () => {
          if (activeRequestId !== requestId) {
            return;
          }
          displayReady = false;
          image.removeAttribute("src");
          setImagePhase("failed");
        };
        preload.src = displaySource;
      };

      const renderNode = (attributes: Record<string, unknown>) => {
        sizeControls.setActiveWidth(applyImageWidth(wrapper, attributes));
        applyImageMeta(attributes);
        const source = String(attributes.src ?? "");

        // Width / alt-only updates must not tear down a successfully loaded image.
        if (source === renderedSource && displayReady && image.getAttribute("src")) {
          return;
        }

        clearRequest();
        renderedSource = source;
        displayReady = false;
        image.removeAttribute("src");
        setImagePhase("loading");

        const activeRequestId = requestId;
        const protectedSource = normalizeProtectedResourceSource(source, baseUrl);
        if (!protectedSource) {
          revealDisplaySource(resolveUrl(source, baseUrl), activeRequestId);
          return;
        }

        void loadResource(protectedSource)
          .then((dataUrl) => {
            if (activeRequestId !== requestId) {
              return;
            }
            // Do not fall back to an unauthenticated absolute URL — that 401s and
            // briefly shows the broken-image icon before any error UI.
            if (!dataUrl) {
              setImagePhase("failed");
              return;
            }
            revealDisplaySource(dataUrl, activeRequestId);
          })
          .catch(() => {
            if (activeRequestId === requestId) {
              setImagePhase("failed");
            }
          });
      };

      renderNode(node.attrs);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type !== imageType) {
            return false;
          }
          renderNode(updatedNode.attrs);
          return true;
        },
        selectNode: () => {
          wrapper.classList.add("is-selected");
          sizeControls.setVisible(!isReadOnly() && displayReady);
        },
        deselectNode: () => {
          wrapper.classList.remove("is-selected");
          sizeControls.setVisible(false);
        },
        destroy: clearRequest,
      };
    };
  },
}).configure({
  allowBase64: false,
  inline: false,
});

type TiptapEditor = NonNullable<ReturnType<typeof useEditor>>;
type ImageUploadPlaceholderMatch = { nodeSize: number; pos: number };
type AttachmentRange = { from: number; linkAttrs: Record<string, unknown>; to: number };

const findMobileAttachmentRange = (editor: TiptapEditor, resourceId: string): AttachmentRange | null => {
  let match: AttachmentRange | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const resourceLink = node.marks.find((mark) =>
      mark.type.name === "link" &&
      typeof mark.attrs.href === "string" &&
      getResourceIdFromUrl(mark.attrs.href) === resourceId
    );
    if (!resourceLink) return;
    match = { from: pos, linkAttrs: resourceLink.attrs, to: pos + node.nodeSize };
    return false;
  });
  return match;
};

const findMobileImageRange = (editor: TiptapEditor, resourceId: string): ImageUploadPlaceholderMatch | null => {
  let match: ImageUploadPlaceholderMatch | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && typeof node.attrs.src === "string" && getResourceIdFromUrl(node.attrs.src) === resourceId) {
      match = { nodeSize: node.nodeSize, pos };
      return false;
    }
  });
  return match;
};

const findImageUploadPlaceholder = (
  editor: TiptapEditor,
  source: string
): ImageUploadPlaceholderMatch | null => {
  let match: ImageUploadPlaceholderMatch | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === source) {
      match = { nodeSize: node.nodeSize, pos };
      return false;
    }
  });
  return match as ImageUploadPlaceholderMatch | null;
};

const insertImageUploadPlaceholder = (
  editor: TiptapEditor,
  source: string,
  alt: string,
  previewDataUrl: string,
  selection: { from: number; to: number } | null
) => {
  const imageType = editor.schema.nodes.image;
  if (!imageType) {
    return;
  }
  const tr = createImageInsertTransaction(editor.state, {
      alt,
      src: source,
      title: previewDataUrl,
      width: NEW_IMAGE_WIDTH_PERCENT,
  }, selection ?? editor.state.selection);
  tr.setMeta(TRANSIENT_IMAGE_UPLOAD_META, true);
  editor.view.dispatch(tr);
};

const replaceImageUploadPlaceholder = (
  editor: TiptapEditor,
  placeholderSource: string,
  imageSource: string,
  alt: string
) => {
  const match = findImageUploadPlaceholder(editor, placeholderSource);
  if (!match) {
    return;
  }
  editor.chain().command(({ tr, dispatch }) => {
    const node = tr.doc.nodeAt(match.pos);
    if (!node) {
      return false;
    }
    tr.setNodeMarkup(match.pos, node.type, { ...node.attrs, alt, src: imageSource, title: null });
    dispatch?.(tr);
    return true;
  }).run();
};

const removeImageUploadPlaceholder = (editor: TiptapEditor, source: string) => {
  const match = findImageUploadPlaceholder(editor, source);
  if (!match) {
    return;
  }
  editor.chain().command(({ tr, dispatch }) => {
    tr.delete(match.pos, match.pos + match.nodeSize);
    tr.setMeta(TRANSIENT_IMAGE_UPLOAD_META, true);
    dispatch?.(tr);
    return true;
  }).run();
};

const getEditorStyles = (theme: "light" | "dark", options?: { viewer?: boolean }) => {
  const bodyFontSize = MEMO_CONTENT_STYLE.body.fontSize;
  const bodyLineHeight = 24 / bodyFontSize;
  const paragraphSpacing = 6;
  return `
  :root {
    color-scheme: ${theme};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-feature-settings: "chws" 1;
    /* Keep the shared body font size while using tighter spacing on mobile. */
    --editor-body-font-size: ${bodyFontSize}px;
    --editor-body-line-height: ${bodyLineHeight};
    --editor-paragraph-spacing: ${paragraphSpacing}px;
  }
  * { box-sizing: border-box; }
  /* Cap layout to the WebView viewport. Wide tables/attachments must scroll
     inside their own wrappers — never expand the page and clip on the right. */
  html, body, #root {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    height: 100%;
    margin: 0;
    background: ${theme === "dark" ? "#0f172a" : "#fff"};
  }
  html { font-size: var(--editor-body-font-size); }
  body { overflow: hidden; color: ${theme === "dark" ? "#f8fafc" : "#0f172a"}; font-size: 1rem; }
  .edgeever-editor-shell {
    position: relative;
    display: flex;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 100%;
    flex-direction: column;
    background: ${theme === "dark" ? "#0f172a" : "#fff"};
    overflow: hidden;
  }
  .edgeever-viewer-shell { -webkit-user-select: text; user-select: text; }
  .edgeever-editor-toolbar { display: flex; flex: 0 0 auto; align-items: center; gap: 4px; min-height: 38px; overflow-x: auto; padding: 6px 12px; border-block: 1px solid ${theme === "dark" ? "#334155" : "#f1f5f9"}; background: ${theme === "dark" ? "#0f172a" : "#fff"}; scrollbar-width: none; }
  .edgeever-editor-toolbar::-webkit-scrollbar { display: none; }
  .edgeever-editor-toolbar button { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 36px; min-height: 32px; padding: 0; border: 1px solid transparent; border-radius: 999px; background: transparent; color: ${theme === "dark" ? "#cbd5e1" : "#64748b"}; }
  .edgeever-editor-toolbar button:active, .edgeever-editor-toolbar button.is-active { border-color: ${theme === "dark" ? "#166534" : "#bbf7d0"}; background: ${theme === "dark" ? "#14532d" : "#ecfdf5"}; color: ${theme === "dark" ? "#86efac" : "#047857"}; }
  .edgeever-editor-toolbar button:disabled { opacity: 0.38; }
  .tiptap { min-height: 100%; max-width: 100%; min-width: 0; outline: none; }
  .edgeever-editor-scroll {
    --edgeever-keyboard-inset: 0px;
    min-height: 0;
    min-width: 0;
    flex: 1;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .edgeever-editor-content {
    min-height: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 18px 12px calc(32px + var(--edgeever-keyboard-inset));
    scroll-padding-bottom: calc(32px + var(--edgeever-keyboard-inset));
    font-size: 1rem;
    line-height: var(--editor-body-line-height);
    overflow-wrap: anywhere;
    word-break: break-word;
    font-feature-settings: "chws" 1;
    caret-color: ${options?.viewer ? "transparent" : "#0f766e"};
  }
  .edgeever-viewer-content { -webkit-user-select: text; user-select: text; cursor: text; }
  .edgeever-search-match {
    border-radius: 0.2rem;
    background-color: rgb(254 240 138 / 0.8);
    box-shadow: 0 0 0 1px rgb(234 179 8 / 0.25);
  }
  .edgeever-search-match-active {
    background-color: rgb(251 191 36 / 0.9);
    box-shadow: 0 0 0 2px rgb(217 119 6 / 0.45);
  }
  .edgeever-editor-content > :first-child { margin-top: 0; }
  .edgeever-editor-content p {
    margin: 0 0 var(--editor-paragraph-spacing) 0;
    padding: 0;
    max-width: 100%;
    font-size: 1rem;
    line-height: var(--editor-body-line-height);
  }
  .edgeever-editor-content p.is-editor-empty:first-child::before { float: left; height: 0; color: #94a3b8; content: attr(data-placeholder); pointer-events: none; }
  .edgeever-editor-content h1,
  .edgeever-editor-content h2,
  .edgeever-editor-content h3,
  .edgeever-editor-content h4,
  .edgeever-editor-content h5,
  .edgeever-editor-content h6 {
    max-width: 100%;
    overflow-wrap: anywhere;
    line-height: 1.3;
    font-weight: 800;
  }
  .edgeever-editor-content h1 { margin: 0.7em 0 0.4em; font-size: 1.6rem; }
  .edgeever-editor-content h2 { margin: 0.85em 0 0.35em; font-size: 1.35rem; }
  .edgeever-editor-content h3 { margin: 0.75em 0 0.3em; font-size: 1.15rem; }
  .edgeever-editor-content h4 { margin: 0.7em 0 0.28em; font-size: 1.05rem; font-weight: 700; }
  .edgeever-editor-content h5 { margin: 0.65em 0 0.25em; font-size: 1rem; font-weight: 700; }
  .edgeever-editor-content h6 { margin: 0.6em 0 0.22em; font-size: 0.95rem; font-weight: 700; }
  .edgeever-editor-content ul[data-type="taskList"] { margin: 0 0 var(--editor-paragraph-spacing); padding-left: 0; list-style: none; }
  .edgeever-editor-content ul[data-type="taskList"] li[data-checked] { display: flex; align-items: flex-start; gap: 9px; margin: 4px 0; }
  .edgeever-editor-content ul[data-type="taskList"] li[data-checked] > label { display: inline-flex; flex: 0 0 auto; align-items: center; margin-top: 3px; user-select: none; }
  .edgeever-editor-content ul[data-type="taskList"] li[data-checked] > label input { width: 18px; height: 18px; margin: 0; border-radius: 3px; accent-color: #1a1d21; }
  .edgeever-editor-content ul[data-type="taskList"] li[data-checked] > div { min-width: 0; flex: 1 1 auto; }
  .edgeever-editor-content ul[data-type="taskList"] li[data-checked] > div > p { margin-bottom: 0; }
  .edgeever-editor-content ul[data-type="taskList"] li[data-checked="true"] > div > p { color: #94a3b8; text-decoration: line-through; }
  .edgeever-editor-content ul[data-type="taskList"] ul[data-type="taskList"] { margin: 4px 0 0; padding-left: 24px; }
  .edgeever-editor-content blockquote { margin-left: 0; margin-right: 0; max-width: 100%; padding: 6px 12px; border-left: 3px solid ${theme === "dark" ? "#475569" : "#cbd5e1"}; border-radius: 1px 4px 4px 1px; background: ${theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f3f5f7"}; color: ${theme === "dark" ? "#f8fafc" : "#3d4450"}; }
  .edgeever-editor-content figure[data-type="image-figure"] { margin: 1em 0; padding: 0; }
  .edgeever-editor-content figure[data-type="image-figure"] > figcaption { position: relative; margin: 0.45em 0 0; font-size: 0.875em; line-height: 1.45; color: ${theme === "dark" ? "#9ca3af" : "#6b7280"}; text-align: left; }
  .edgeever-editor-content figure[data-type="image-figure"][data-image-align="center"] > figcaption { text-align: center; }
  .edgeever-editor-content figure[data-type="image-figure"][data-image-align="right"] > figcaption { text-align: right; }
  .edgeever-editor-content figcaption.is-caption-empty::before { content: attr(data-caption-placeholder); position: absolute; inset: 0; color: ${theme === "dark" ? "#64748b" : "#9ca3af"}; pointer-events: none; text-align: inherit; }
  .edgeever-editor-content[contenteditable="false"] figcaption.is-caption-empty { display: none; }
  .edgeever-editor-content pre { max-width: 100%; overflow-x: auto; border-radius: 8px; border: 1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}; padding: 12px 90px 12px 14px; background: ${theme === "dark" ? "#1e293b" : "#f8fafc"}; color: ${theme === "dark" ? "#e2e8f0" : "#0f172a"}; font-size: 0.88rem; box-shadow: 0 1px 2px ${theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(15, 23, 42, 0.03)"}; }
  .edgeever-editor-content code { border-radius: 4px; padding: 2px 5px; border: 1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "#e1e5ea"}; background: ${theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "#f3f5f7"}; color: ${theme === "dark" ? "#f8fafc" : "#3d4450"}; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; font-weight: 400; }
  .edgeever-editor-content pre code { padding: 0; border: 0; background: transparent; font-size: inherit; font-weight: normal; color: inherit; }
  .edgeever-editor-content .tiptap-mathematics-render[data-type="block-math"] { max-width: 100%; margin: 16px 0; overflow-x: auto; overflow-y: hidden; padding: 4px 0; text-align: center; -webkit-overflow-scrolling: touch; }
  .edgeever-editor-content .inline-math-error, .edgeever-editor-content .block-math-error { color: ${theme === "dark" ? "#fda4af" : "#be123c"}; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  /* External hyperlinks (match Web default ProseMirror). Attachment chips override below. */
  .edgeever-editor-content a {
    color: ${theme === "dark" ? "#cad4ce" : "#404040"};
    font-weight: 500;
    text-decoration: underline;
    text-decoration-color: ${theme === "dark" ? "rgba(202, 212, 206, 0.45)" : "rgba(64, 64, 64, 0.45)"};
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .edgeever-editor-content a:active {
    color: ${theme === "dark" ? "#eef3f0" : "#0a0a0a"};
    text-decoration-color: ${theme === "dark" ? "#eef3f0" : "#0a0a0a"};
  }
  /* Compact attachment chips: still ≥48px touch height, less vertical bulk than 58px. */
  .edgeever-editor-content a.edgeever-attachment-link, .edgeever-editor-content a[href*="/api/v1/resources/"] {
    display: flex;
    min-width: 0;
    max-width: 100%;
    min-height: 48px;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
    border: 1px solid ${theme === "dark" ? "#334155" : "#cbd5e1"};
    border-radius: 10px;
    padding: 7px 10px;
    background: ${theme === "dark" ? "#172033" : "#f8fafc"};
    color: ${theme === "dark" ? "#f1f5f9" : "#1e293b"};
    font-size: 0.93rem;
    font-weight: 700;
    line-height: 1.3;
    text-decoration: none;
    overflow: hidden;
  }
  .edgeever-editor-content a.edgeever-attachment-link::before, .edgeever-editor-content a[href*="/api/v1/resources/"]::before {
    display: inline-flex;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: ${theme === "dark" ? "#134e4a" : "#ecfdf5"};
    color: ${theme === "dark" ? "#cbd5e1" : "#64748b"};
    content: "FILE";
    font-size: 8px;
    font-weight: 800;
    letter-spacing: -0.2px;
  }
  .edgeever-editor-content a.edgeever-attachment-kind-image::before { background: ${theme === "dark" ? "#064e3b" : "#ecfdf5"}; color: ${theme === "dark" ? "#6ee7b7" : "#10b981"}; content: "▧"; font-size: 20px; }
  .edgeever-editor-content a.edgeever-attachment-kind-audio::before { background: ${theme === "dark" ? "#0c4a6e" : "#f0f9ff"}; color: ${theme === "dark" ? "#7dd3fc" : "#0ea5e9"}; content: "♪"; font-size: 21px; }
  .edgeever-editor-content a.edgeever-attachment-kind-video::before { background: ${theme === "dark" ? "#881337" : "#fff1f2"}; color: ${theme === "dark" ? "#fda4af" : "#f43f5e"}; content: "▶"; font-size: 15px; }
  .edgeever-editor-content a.edgeever-attachment-kind-pdf::before { background: ${theme === "dark" ? "#881337" : "#fff1f2"}; color: ${theme === "dark" ? "#fda4af" : "#e11d48"}; content: "PDF"; }
  .edgeever-editor-content a.edgeever-attachment-kind-spreadsheet::before { background: ${theme === "dark" ? "#14532d" : "#f0fdf4"}; color: ${theme === "dark" ? "#86efac" : "#16a34a"}; content: "XLS"; }
  .edgeever-editor-content a.edgeever-attachment-kind-document::before { background: ${theme === "dark" ? "#1e3a8a" : "#eff6ff"}; color: ${theme === "dark" ? "#93c5fd" : "#2563eb"}; content: "DOC"; }
  .edgeever-editor-content a.edgeever-attachment-kind-presentation::before { background: ${theme === "dark" ? "#7c2d12" : "#fff7ed"}; color: ${theme === "dark" ? "#fdba74" : "#f97316"}; content: "PPT"; }
  .edgeever-editor-content a.edgeever-attachment-kind-archive::before { background: ${theme === "dark" ? "#713f12" : "#fffbeb"}; color: ${theme === "dark" ? "#fde68a" : "#d97706"}; content: "ZIP"; }
  .edgeever-editor-content a.edgeever-attachment-kind-code::before { background: ${theme === "dark" ? "#581c87" : "#faf5ff"}; color: ${theme === "dark" ? "#d8b4fe" : "#8b5cf6"}; content: "</>"; }
  .edgeever-editor-content a.edgeever-attachment-kind-text::before { background: ${theme === "dark" ? "#334155" : "#f1f5f9"}; color: ${theme === "dark" ? "#cbd5e1" : "#64748b"}; content: "TXT"; }
  .edgeever-editor-content a.edgeever-attachment-kind-apk::before { background: ${theme === "dark" ? "#064e3b" : "#ecfdf5"}; color: ${theme === "dark" ? "#6ee7b7" : "#059669"}; content: "APK"; }
  .edgeever-editor-content a.edgeever-attachment-kind-exe::before { background: ${theme === "dark" ? "#0c4a6e" : "#f0f9ff"}; color: ${theme === "dark" ? "#7dd3fc" : "#0284c7"}; content: "EXE"; }
  .edgeever-editor-content a.edgeever-attachment-kind-dmg::before { background: ${theme === "dark" ? "#4c1d95" : "#f5f3ff"}; color: ${theme === "dark" ? "#c4b5fd" : "#7c3aed"}; content: "DMG"; }
  .edgeever-editor-content a.edgeever-attachment-kind-linux::before { background: ${theme === "dark" ? "#7c2d12" : "#fff7ed"}; color: ${theme === "dark" ? "#fdba74" : "#ea580c"}; content: "LINUX"; }
  .edgeever-editor-content a.edgeever-attachment-kind-executable::before { background: ${theme === "dark" ? "#134e4a" : "#ccfbf1"}; color: ${theme === "dark" ? "#5eead4" : "#0d9488"}; content: "BIN"; }
  .edgeever-editor-content a.edgeever-attachment-kind-book::before { background: ${theme === "dark" ? "#78350f" : "#fef3c7"}; color: ${theme === "dark" ? "#fcd34d" : "#b45309"}; content: "BOOK"; }
  .edgeever-editor-content a.edgeever-attachment-kind-font::before { background: ${theme === "dark" ? "#312e81" : "#e0e7ff"}; color: ${theme === "dark" ? "#a5b4fc" : "#4f46e5"}; content: "FONT"; }
  .edgeever-editor-content a.edgeever-attachment-kind-diskimage::before { background: ${theme === "dark" ? "#164e63" : "#cffafe"}; color: ${theme === "dark" ? "#67e8f9" : "#0891b2"}; content: "ISO"; }
  .edgeever-editor-content a.edgeever-attachment-kind-database::before { background: ${theme === "dark" ? "#701a75" : "#fae8ff"}; color: ${theme === "dark" ? "#f0abfc" : "#c026d3"}; content: "DB"; }
  .edgeever-editor-content a.edgeever-attachment-kind-design::before { background: ${theme === "dark" ? "#831843" : "#fdf2f8"}; color: ${theme === "dark" ? "#f472b6" : "#db2777"}; content: "DESIGN"; }
  .edgeever-editor-content a.edgeever-attachment-kind-model3d::before { background: ${theme === "dark" ? "#1e3a8a" : "#eff6ff"}; color: ${theme === "dark" ? "#93c5fd" : "#2563eb"}; content: "3D"; }
  .edgeever-editor-content a.edgeever-attachment-kind-script::before { background: ${theme === "dark" ? "#064e3b" : "#ecfdf5"}; color: ${theme === "dark" ? "#6ee7b7" : "#059669"}; content: "SHELL"; }
  .edgeever-editor-content a.edgeever-attachment-kind-log::before { background: ${theme === "dark" ? "#27272a" : "#f4f4f5"}; color: ${theme === "dark" ? "#a1a1aa" : "#71717a"}; content: "LOG"; }
  .edgeever-editor-content a.edgeever-attachment-kind-certificate::before { background: ${theme === "dark" ? "#713f12" : "#fefce8"}; color: ${theme === "dark" ? "#fde047" : "#ca8a04"}; content: "KEY"; }
  .edgeever-editor-content a.edgeever-attachment-kind-diagram::before { background: ${theme === "dark" ? "#134e4a" : "#f0fdfa"}; color: ${theme === "dark" ? "#5eead4" : "#0d9488"}; content: "DIAG"; }
  .edgeever-editor-content .edgeever-unsupported-content {
    border: 1px dashed ${theme === "dark" ? "#64748b" : "#94a3b8"};
    border-radius: 8px;
    background: ${theme === "dark" ? "#1e293b" : "#f8fafc"};
    color: ${theme === "dark" ? "#cbd5e1" : "#475569"};
    font-size: 12px;
    font-weight: 600;
  }
  ${DETAILS_EDITOR_CSS}
  .edgeever-editor-content .edgeever-unsupported-content--block { display: block; margin: 8px 0; padding: 12px; }
  .edgeever-editor-content .edgeever-unsupported-content--inline { display: inline-block; margin: 0 2px; padding: 2px 6px; }
  .edgeever-editor-content .edgeever-unsupported-mark { border-bottom: 1px dashed ${theme === "dark" ? "#94a3b8" : "#64748b"}; }
  .edgeever-editor-content a.edgeever-attachment-link::after, .edgeever-editor-content a[href*="/api/v1/resources/"]::after {
    margin-left: auto;
    flex: 0 0 auto;
    color: ${theme === "dark" ? "#94a3b8" : "#64748b"};
    content: attr(data-attachment-meta) "  ⋯";
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .edgeever-code-block, .edgeever-mermaid-code-block { position: relative; margin: 18px 0; overflow: visible; background: transparent; }
  .edgeever-code-copy-button { position: absolute; top: 8px; right: 8px; z-index: 1; border: 1px solid ${theme === "dark" ? "#475569" : "#cbded1"}; border-radius: 6px; padding: 5px 8px; background: ${theme === "dark" ? "rgba(30, 41, 59, 0.94)" : "rgba(247, 251, 248, 0.94)"}; color: ${theme === "dark" ? "#cbd5e1" : "#475569"}; font: inherit; font-size: 12px; line-height: 1.35; }
  .edgeever-code-copy-button:active { border-color: #0f766e; color: ${theme === "dark" ? "#86efac" : "#0f766e"}; }
  .edgeever-editor-scroll:has(.edgeever-x6-document) { display: flex; flex-direction: column; overflow: hidden; }
  .edgeever-x6-document, .edgeever-diagram-reader-host { display: flex; flex-direction: column; height: 100%; min-height: 100%; padding: 8px 12px 12px; background: ${theme === "dark" ? "#0f172a" : "#fff"}; }
  .edgeever-diagram-reader-controls { flex: 0 0 auto; }
  .edgeever-x6-diagram { flex: 1 1 auto; width: 100%; height: auto; min-height: 240px; overflow: hidden; border: 1px solid ${theme === "dark" ? "#26382f" : "#e3ece7"}; border-radius: 14px; background: ${theme === "dark" ? DIAGRAM_CANVAS_DARK : DIAGRAM_CANVAS_LIGHT}; touch-action: none; }
  .edgeever-x6-diagram .x6-graph-svg { overflow: hidden; }
  .edgeever-x6-diagram .x6-node { cursor: pointer; }
  .edgeever-mermaid-code-block > pre { display: none; margin: 8px 0 0; }
  .edgeever-mermaid-code-block.is-source-visible > pre { display: block; }
  .edgeever-mermaid-preview { display: flex; min-height: 72px; align-items: center; justify-content: flex-start; overflow-x: auto; padding: 8px 4px; background: transparent; }
  .edgeever-mermaid-preview[hidden] { display: none; }
  .edgeever-mermaid-svg { display: flex; width: max-content; min-width: 100%; flex: none; justify-content: center; }
  .edgeever-mermaid-svg svg { display: block; max-width: none; max-height: none; flex: none; }
  .edgeever-mermaid-message, .edgeever-mermaid-error { margin: 0; font-size: 14px; line-height: 1.5; text-align: center; }
  .edgeever-mermaid-message { color: ${theme === "dark" ? "#94a3b8" : "#64748b"}; }
  .edgeever-mermaid-error { color: ${theme === "dark" ? "#fda4af" : "#be123c"}; }
  .edgeever-editor-content img { display: block; max-width: 100%; height: auto; margin: 14px auto; border-radius: 10px; }
  /* Shared by preview + edit (same LocalTiptapEditor styles).
     Prefer shrinking columns to the content box (≈4 equal cols on a phone) with
     text wrap; when n * col-width still exceeds the wrapper, scroll inside
     .tableWrapper only — never widen the page via 100vw / desktop col widths. */
  .edgeever-editor-content .tableWrapper {
    /* ~24% of wrapper → 4 cols fit; more cols overflow and scroll */
    --mobile-table-column-width: clamp(4.25rem, 24cqi, 10rem);
    container-type: inline-size;
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    margin-top: 20px;
    margin-right: 0;
    margin-bottom: 20px;
    margin-left: 0;
    border: 1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"};
    border-radius: 6px;
    background: ${theme === "dark" ? "#0f172a" : "#fff"};
    box-shadow: 0 1px 3px ${theme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(15, 23, 42, 0.03)"};
    overscroll-behavior-inline: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(100, 116, 139, 0.45) transparent;
  }
  .edgeever-editor-content .tableWrapper::-webkit-scrollbar {
    height: 6px;
  }
  .edgeever-editor-content .tableWrapper::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(100, 116, 139, 0.4);
  }
  .edgeever-editor-content table {
    width: 100%;
    max-width: none;
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }
  /* Let compact tables use the full content width. The fallback on
     .tableWrapper remains the minimum column budget for 5+ columns, so only
     wider tables scroll. TipTap always renders one <col> per logical column. */
  .edgeever-editor-content table:has(> colgroup > col:first-child:last-child) {
    --mobile-table-column-width: 100cqi;
  }
  .edgeever-editor-content table:has(> colgroup > col:first-child:nth-last-child(2)) {
    --mobile-table-column-width: 50cqi;
  }
  .edgeever-editor-content table:has(> colgroup > col:first-child:nth-last-child(3)) {
    --mobile-table-column-width: calc(100cqi / 3);
  }
  .edgeever-editor-content table:has(> colgroup > col:first-child:nth-last-child(4)) {
    --mobile-table-column-width: 25cqi;
  }
  .edgeever-editor-content table:has(> colgroup > col:first-child:nth-last-child(n+5)) {
    width: max-content;
    --mobile-table-column-width: clamp(4.25rem, 24cqi, 10rem);
  }
  .edgeever-editor-content table:not(:has(colgroup)) {
    table-layout: auto;
    width: 100%;
    min-width: 100%;
  }
  /* Override TipTap/desktop col widths with the mobile equal-ish column budget. */
  .edgeever-editor-content table col {
    width: var(--mobile-table-column-width) !important;
    min-width: var(--mobile-table-column-width) !important;
  }
  .edgeever-editor-content th, .edgeever-editor-content td {
    position: relative;
    width: var(--mobile-table-column-width, auto);
    min-width: var(--mobile-table-column-width, 3.5rem);
    max-width: var(--mobile-table-column-width, none);
    border: 0;
    border-right: 1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"};
    border-bottom: 1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"};
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    line-height: 1.4;
    transition: background-color 120ms ease;
  }
  .edgeever-editor-content th { background: ${theme === "dark" ? "#1e293b" : "#f8fafc"}; color: ${theme === "dark" ? "#f8fafc" : "#0f172a"}; font-size: 0.93rem; font-weight: 600; }
  .edgeever-editor-content th:last-child, .edgeever-editor-content td:last-child { border-right: 0; }
  .edgeever-editor-content tr:last-child td { border-bottom: 0; }
  .edgeever-editor-content tbody tr:nth-child(even) td { background: ${theme === "dark" ? "rgba(15, 23, 42, 0.6)" : "#fafafa"}; }
  .edgeever-editor-content tbody tr:hover td { background: ${theme === "dark" ? "#1e293b" : "#f1f5f9"}; }
  .edgeever-editor-content th p, .edgeever-editor-content td p { margin: 0; }
  .edgeever-editor-content .selectedCell::after { position: absolute; inset: 0; content: ""; pointer-events: none; background: rgba(16, 185, 129, 0.14); }
  .edgeever-image-upload-placeholder { position: relative; max-width: 100%; min-height: 112px; margin: 14px auto; overflow: hidden; border-radius: 10px; background: ${theme === "dark" ? "#1e293b" : "#f1f5f9"}; }
  .edgeever-image-upload-preview { display: block; width: 100%; max-height: 360px; margin: 0 !important; object-fit: contain; border-radius: 10px; }
  .edgeever-image-upload-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; border-radius: 10px; background: rgba(15, 23, 42, 0.38); color: #fff; font-size: 14px; font-weight: 600; text-shadow: 0 1px 2px rgba(15, 23, 42, 0.45); }
  .edgeever-image-node, .edgeever-image-upload-result { position: relative; display: block; max-width: 100%; margin: 14px auto; line-height: 0; }
  .edgeever-image-node.is-loading, .edgeever-image-node.is-failed { min-height: 120px; overflow: hidden; border-radius: 10px; background: ${theme === "dark" ? "#1e293b" : "#f1f5f9"}; }
  .edgeever-image-loading { display: flex; min-height: 120px; align-items: center; justify-content: center; gap: 10px; padding: 16px; color: ${theme === "dark" ? "#94a3b8" : "#64748b"}; font-size: 13px; font-weight: 600; line-height: 1.3; }
  .edgeever-image-loading[hidden] { display: none; }
  .edgeever-image-loading-label { text-align: center; }
  .edgeever-image-node > img, .edgeever-image-upload-result > img { display: block; width: 100%; margin: 0; border-radius: 10px; }
  .edgeever-image-node > img[hidden] { display: none; }
  [data-edgeever-image-gallery] { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 8px; margin: 14px 0; }
  [data-edgeever-image-gallery][data-image-gallery-layout="3"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  [data-edgeever-image-gallery][data-image-gallery-layout="1"] { grid-template-columns: minmax(0, 1fr); }
  [data-edgeever-image-gallery] > .edgeever-image-node, [data-edgeever-image-gallery] > img { width: 100% !important; min-width: 0; height: 100%; min-height: 112px; max-height: 220px; margin: 0 !important; overflow: hidden; border-radius: 10px; background: ${theme === "dark" ? "#1e293b" : "#f1f5f9"}; }
  [data-edgeever-image-gallery] > .edgeever-image-node > img, [data-edgeever-image-gallery] > img { width: 100%; height: 100%; min-height: 112px; max-height: 220px; object-fit: cover; }
  ${NATIVE_IMAGE_GALLERY_CSS}
  .edgeever-image-node.is-selected > img, .edgeever-image-upload-result.is-selected > img { outline: 2px solid #0f766e; outline-offset: 3px; }
  .edgeever-image-actions { position: absolute; right: 8px; bottom: 8px; z-index: 3; display: inline-flex; width: 42px; height: 42px; appearance: none; align-items: center; justify-content: center; border: 1px solid ${theme === "dark" ? "#475569" : "#cbd5e1"}; border-radius: 999px; background: ${theme === "dark" ? "rgba(15, 23, 42, 0.9)" : "rgba(255, 255, 255, 0.92)"}; color: ${theme === "dark" ? "#e2e8f0" : "#334155"}; font-size: 24px; font-weight: 700; line-height: 1; box-shadow: 0 3px 12px rgba(15, 23, 42, 0.2); }
  .edgeever-image-actions[hidden] { display: none; }
  .edgeever-image-size-controls { position: absolute; top: 8px; left: 50%; z-index: 2; display: flex; width: max-content; max-width: calc(100vw - 40px); align-items: center; gap: 3px; transform: translateX(-50%); border: 1px solid ${theme === "dark" ? "#475569" : "#bbf7d0"}; border-radius: 9px; padding: 4px; background: ${theme === "dark" ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.96)"}; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2); line-height: 1.15; }
  .edgeever-image-size-controls[hidden] { display: none; }
  .edgeever-image-size-button { display: inline-flex; min-width: 52px; min-height: 38px; appearance: none; align-items: center; justify-content: center; border: 0; border-radius: 7px; padding: 4px 7px; background: transparent; color: ${theme === "dark" ? "#cbd5e1" : "#475569"}; font: inherit; font-size: 12px; font-weight: 700; }
  .edgeever-image-size-button.is-active { background: ${theme === "dark" ? "#134e4a" : "#ccfbf1"}; color: ${theme === "dark" ? "#99f6e4" : "#0f766e"}; }
  .edgeever-image-upload-spinner { width: 18px; height: 18px; border: 2px solid ${theme === "dark" ? "#475569" : "#cbd5e1"}; border-top-color: #0f766e; border-radius: 999px; animation: edgeever-image-upload-spin 0.8s linear infinite; }
  @keyframes edgeever-image-upload-spin { to { transform: rotate(360deg); } }
  .edgeever-editor-content hr { margin: 24px 0; border: 0; border-top: 1px solid #cbd5e1; }
  ${PHONE_IMAGE_FILL_CSS}
`;
};
