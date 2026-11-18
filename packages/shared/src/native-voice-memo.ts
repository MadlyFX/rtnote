import type { NodeViewRenderer } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { MobileEditorLocale } from "./mobile-editor";
import { NATIVE_VOICE_MEMO_COPY_JA } from "./native-voice-memo.ja";
import { NATIVE_VOICE_MEMO_COPY_ZH_CN } from "./native-voice-memo.zh-CN";
import { NATIVE_VOICE_MEMO_COPY_ZH_TW } from "./native-voice-memo.zh-TW";
import { VoiceMemo, readVoiceMemoAttrs } from "./voice-memo";
import { VOICE_MEMO_NODE_TYPE, formatVoiceMemoDuration } from "./voice-memo-names";

/**
 * The voice memo block in the Android and iOS WebView editors. Recording
 * happens in the native app, which inserts a finished memo; this view plays it
 * and shows its title and transcript. The title can be edited while the
 * editor is editable; the transcript is edited on web and desktop.
 */

export type NativeVoiceMemoCopy = {
  play: string;
  pause: string;
  seek: string;
  playerLabel: string;
  titlePlaceholder: string;
  transcript: string;
  noRecording: string;
  saving: string;
  unavailable: string;
};

const NATIVE_VOICE_MEMO_COPY: Record<MobileEditorLocale, NativeVoiceMemoCopy> = {
  "en-US": { play: "Play", pause: "Pause", seek: "Playback position", playerLabel: "Voice memo player", titlePlaceholder: "Add a title", transcript: "Transcript", noRecording: "No recording yet.", saving: "Saving the recording…", unavailable: "This recording cannot be played on this device." },
  "zh-CN": NATIVE_VOICE_MEMO_COPY_ZH_CN,
  "zh-TW": NATIVE_VOICE_MEMO_COPY_ZH_TW,
  ja: NATIVE_VOICE_MEMO_COPY_JA,
  pl: { play: "Odtwórz", pause: "Wstrzymaj", seek: "Pozycja odtwarzania", playerLabel: "Odtwarzacz notatki głosowej", titlePlaceholder: "Dodaj tytuł", transcript: "Transkrypcja", noRecording: "Brak nagrania.", saving: "Zapisywanie nagrania…", unavailable: "Tego nagrania nie można odtworzyć na tym urządzeniu." },
  ru: { play: "Воспроизвести", pause: "Пауза", seek: "Позиция воспроизведения", playerLabel: "Проигрыватель голосовой заметки", titlePlaceholder: "Добавить заголовок", transcript: "Расшифровка", noRecording: "Записи пока нет.", saving: "Сохранение записи…", unavailable: "Эту запись нельзя воспроизвести на этом устройстве." },
  es: { play: "Reproducir", pause: "Pausar", seek: "Posición de reproducción", playerLabel: "Reproductor de nota de voz", titlePlaceholder: "Añadir un título", transcript: "Transcripción", noRecording: "Todavía no hay grabación.", saving: "Guardando la grabación…", unavailable: "Esta grabación no se puede reproducir en este dispositivo." },
  de: { play: "Abspielen", pause: "Pausieren", seek: "Wiedergabeposition", playerLabel: "Sprachmemo-Player", titlePlaceholder: "Titel hinzufügen", transcript: "Transkript", noRecording: "Noch keine Aufnahme.", saving: "Aufnahme wird gespeichert…", unavailable: "Diese Aufnahme kann auf diesem Gerät nicht abgespielt werden." },
  fr: { play: "Lire", pause: "Pause", seek: "Position de lecture", playerLabel: "Lecteur de mémo vocal", titlePlaceholder: "Ajouter un titre", transcript: "Transcription", noRecording: "Pas encore d'enregistrement.", saving: "Enregistrement du fichier…", unavailable: "Cet enregistrement ne peut pas être lu sur cet appareil." },
};

export const getNativeVoiceMemoCopy = (locale: string): NativeVoiceMemoCopy =>
  NATIVE_VOICE_MEMO_COPY[locale as MobileEditorLocale] ?? NATIVE_VOICE_MEMO_COPY["en-US"];

export type NativeVoiceMemoOptions = {
  getLocale: () => string;
  /**
   * Turns the stored resource URL into one the WebView can load (for example
   * an authenticated or local file URL). Return null when it is not available.
   */
  resolveAudioUrl: (url: string) => string | null | Promise<string | null>;
};

export const NATIVE_VOICE_MEMO_CSS = `
.rtnote-native-voice-memo { margin: 12px 0; padding: 12px; border: 1px solid rgba(148, 163, 184, 0.45); border-radius: 12px; background: rgba(148, 163, 184, 0.08); font: inherit; }
.rtnote-native-voice-memo.ProseMirror-selectednode { outline: 2px solid #16A06E; outline-offset: 2px; }
.rtnote-native-voice-memo-title { display: block; width: 100%; margin: 0 0 8px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 600; outline: none; }
.rtnote-native-voice-memo-title::placeholder { color: #94a3b8; font-weight: 500; }
.rtnote-native-voice-memo-player { display: flex; align-items: center; gap: 10px; }
.rtnote-native-voice-memo-toggle { flex: none; width: 36px; height: 36px; border: 0; border-radius: 999px; background: #16A06E; color: #ffffff; font-size: 14px; line-height: 36px; text-align: center; }
.rtnote-native-voice-memo-toggle:disabled { opacity: 0.45; }
.rtnote-native-voice-memo-seek { flex: 1; min-width: 0; accent-color: #16A06E; }
.rtnote-native-voice-memo-time { flex: none; min-width: 72px; color: #64748b; font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; }
.rtnote-native-voice-memo-status { color: #64748b; font-size: 13px; }
.rtnote-native-voice-memo-transcript { margin-top: 10px; font-size: 14px; }
.rtnote-native-voice-memo-transcript summary { color: #64748b; font-size: 12px; font-weight: 600; }
.rtnote-native-voice-memo-transcript p { margin: 6px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
`;

const playIcon = "▶";
const pauseIcon = "❚❚";

const createNativeVoiceMemoView = (options: NativeVoiceMemoOptions): NodeViewRenderer => ({ editor, node, getPos }) => {
  let current: ProseMirrorNode = node;
  let resolvedFor: string | null = null;
  let resolveRequest = 0;
  const copy = () => getNativeVoiceMemoCopy(options.getLocale());

  const dom = document.createElement("div");
  dom.className = "rtnote-voice-memo rtnote-native-voice-memo";
  dom.dataset.type = "rtnote-voice-memo";
  dom.contentEditable = "false";

  const title = document.createElement("input");
  title.type = "text";
  title.className = "rtnote-native-voice-memo-title";
  title.enterKeyHint = "done";

  const player = document.createElement("div");
  player.className = "rtnote-native-voice-memo-player";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "rtnote-native-voice-memo-toggle";
  const seek = document.createElement("input");
  seek.type = "range";
  seek.min = "0";
  seek.step = "0.1";
  seek.value = "0";
  seek.className = "rtnote-native-voice-memo-seek";
  const time = document.createElement("span");
  time.className = "rtnote-native-voice-memo-time";
  const audio = document.createElement("audio");
  audio.preload = "metadata";
  for (const child of [toggle, seek, time, audio]) player.appendChild(child);

  const status = document.createElement("div");
  status.className = "rtnote-native-voice-memo-status";
  status.setAttribute("role", "status");

  const transcript = document.createElement("details");
  transcript.className = "rtnote-native-voice-memo-transcript";
  const transcriptSummary = document.createElement("summary");
  const transcriptText = document.createElement("p");
  transcript.appendChild(transcriptSummary);
  transcript.appendChild(transcriptText);

  for (const child of [title, player, status, transcript]) dom.appendChild(child);

  // Keep taps on the controls from selecting the node or moving the caret.
  for (const element of [title, toggle, seek]) {
    element.addEventListener("pointerdown", (event) => event.stopPropagation());
    element.addEventListener("mousedown", (event) => event.stopPropagation());
  }

  const knownDuration = () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    const stored = readVoiceMemoAttrs(current.attrs).durationMs;
    return stored === null ? 0 : stored / 1000;
  };

  const renderTime = () => {
    const duration = knownDuration();
    seek.max = String(duration || 0);
    if (document.activeElement !== seek) seek.value = String(Math.min(audio.currentTime, duration || audio.currentTime));
    time.textContent = `${formatVoiceMemoDuration(audio.currentTime * 1000)} / ${formatVoiceMemoDuration(duration * 1000)}`;
    toggle.textContent = audio.paused ? playIcon : pauseIcon;
    toggle.setAttribute("aria-label", audio.paused ? copy().play : copy().pause);
  };

  const showStatus = (message: string | null) => {
    status.textContent = message ?? "";
    status.hidden = !message;
  };

  const loadAudio = (url: string) => {
    if (resolvedFor === url) return;
    resolvedFor = url;
    const request = ++resolveRequest;
    audio.removeAttribute("src");
    Promise.resolve(options.resolveAudioUrl(url)).then((resolved) => {
      if (request !== resolveRequest) return;
      if (!resolved) {
        showStatus(copy().unavailable);
        return;
      }
      audio.src = resolved;
      audio.load();
    }).catch(() => {
      if (request === resolveRequest) showStatus(copy().unavailable);
    });
  };

  const render = () => {
    const attrs = readVoiceMemoAttrs(current.attrs);
    const strings = copy();
    title.placeholder = strings.titlePlaceholder;
    if (document.activeElement !== title) title.value = attrs.title;
    title.readOnly = !editor.isEditable;
    title.hidden = !editor.isEditable && !attrs.title;
    toggle.disabled = !attrs.url;
    seek.disabled = !attrs.url;
    seek.setAttribute("aria-label", strings.seek);
    player.setAttribute("aria-label", strings.playerLabel);
    player.hidden = !attrs.url;
    if (attrs.url) {
      showStatus(null);
      loadAudio(attrs.url);
    } else {
      resolvedFor = null;
      showStatus(attrs.clientId ? strings.saving : strings.noRecording);
    }
    transcriptSummary.textContent = strings.transcript;
    transcriptText.textContent = attrs.transcript;
    transcript.hidden = !attrs.transcript.trim();
    renderTime();
  };

  const commitTitle = () => {
    const pos = typeof getPos === "function" ? getPos() : null;
    if (!editor.isEditable || typeof pos !== "number") return;
    const target = editor.state.doc.nodeAt(pos);
    if (target?.type.name !== VOICE_MEMO_NODE_TYPE) return;
    const next = title.value.trim();
    if (next === readVoiceMemoAttrs(target.attrs).title) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...target.attrs, title: next }));
  };

  title.addEventListener("blur", commitTitle);
  title.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      title.blur();
    }
  });
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (audio.paused) {
      // Only one recording plays at a time.
      dom.ownerDocument.querySelectorAll("audio").forEach((other) => { if (other !== audio) other.pause(); });
      void audio.play().catch(() => showStatus(copy().unavailable));
    } else {
      audio.pause();
    }
  });
  seek.addEventListener("input", () => {
    const value = Number(seek.value);
    if (Number.isFinite(value)) audio.currentTime = value;
    renderTime();
  });
  for (const type of ["timeupdate", "durationchange", "loadedmetadata", "play", "pause", "ended"]) {
    audio.addEventListener(type, renderTime);
  }
  audio.addEventListener("error", () => {
    if (audio.getAttribute("src")) showStatus(copy().unavailable);
  });

  render();

  return {
    dom,
    stopEvent: (event) => event.target instanceof HTMLElement && event.target !== dom,
    ignoreMutation: () => true,
    update: (updated) => {
      if (updated.type.name !== VOICE_MEMO_NODE_TYPE) return false;
      current = updated;
      render();
      return true;
    },
    destroy: () => {
      resolveRequest += 1;
      audio.pause();
      audio.removeAttribute("src");
    },
  };
};

/** The voice memo node with the WebView player view. */
export const createNativeVoiceMemoExtension = (options: NativeVoiceMemoOptions) => VoiceMemo.extend({
  addNodeView() {
    return createNativeVoiceMemoView(options);
  },
});

/** Inserts a finished recording as a voice memo block after the selection. */
export const insertNativeVoiceMemo = (
  editor: import("@tiptap/core").Editor,
  attrs: { url: string; filename?: string; mimeType?: string; byteSize?: number | null; durationMs?: number | null; title?: string },
) => {
  if (!editor.isEditable || editor.isDestroyed || !editor.schema.nodes[VOICE_MEMO_NODE_TYPE]) return false;
  return editor.chain().focus().insertVoiceMemo({
    url: attrs.url,
    filename: attrs.filename ?? "",
    mimeType: attrs.mimeType ?? "",
    byteSize: attrs.byteSize ?? null,
    durationMs: attrs.durationMs ?? null,
    title: attrs.title ?? "",
  }).run();
};
