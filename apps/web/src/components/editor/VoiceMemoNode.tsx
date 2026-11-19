import {
  VoiceMemo,
  createVoiceMemoClientId,
  formatVoiceMemoDuration,
  getResourceIdFromUrl,
  readVoiceMemoAttrs,
  type TranscriptionSettings,
} from "@rtnote/shared";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { NodeViewWrapper, ReactNodeViewRenderer, useEditorState, type NodeViewProps } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { Download, LoaderCircle, Mic, Pause, Square, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { VoiceMemoPlayer } from "@/components/voice-memo/VoiceMemoPlayer";
import { VoiceMemoLevelMeter } from "@/components/voice-memo/VoiceMemoLevelMeter";
import { api } from "@/lib/api";
import { isDesktopResourceRuntime, toApiResourceUrl, toDesktopResourceDownloadUrl } from "@/lib/desktop-resources";
import { cn } from "@/lib/utils";
import { useVoiceMemoMaxDuration } from "@/lib/voice-memo-preferences";
import {
  voiceMemoSessions,
  type VoiceMemoSessionSnapshot,
  type VoiceMemoUploadedResource,
} from "@/lib/voice-memo-recorder";

export type VoiceMemoEditorContextValue = {
  /** The note recordings are attached to; null while it is not known yet. */
  memoId: string | null;
  upload: (memoId: string, file: File) => Promise<VoiceMemoUploadedResource>;
  /** Transcribes a synced resource; omitted where transcription is unavailable. */
  transcribe?: (memoId: string, resourceId: string, signal: AbortSignal, onProgress: (segments: number) => void) => Promise<string>;
};

export const VoiceMemoEditorContext = createContext<VoiceMemoEditorContextValue | null>(null);

/** Inserts an empty voice memo block that starts recording as soon as it appears. */
export const insertVoiceMemoAndRecord = (editor: Editor) => {
  if (!editor.isEditable) return false;
  const clientId = createVoiceMemoClientId();
  voiceMemoSessions.requestAutoStart(clientId);
  return editor.chain().focus().insertVoiceMemo({ clientId }).run();
};

export const isSpeechTranscriptionReady = (settings: TranscriptionSettings | undefined) => Boolean(
  settings?.enabled && settings.providers.some((provider) => provider.isEnabled
    && provider.hasApiKey
    && provider.models.some((model) => model.id === settings.defaultModelId)),
);

const useVoiceMemoSession = (clientId: string) => {
  useSyncExternalStore(voiceMemoSessions.subscribe, voiceMemoSessions.getVersion, voiceMemoSessions.getVersion);
  const session = clientId ? voiceMemoSessions.get(clientId) : null;
  return { session, snapshot: session?.getSnapshot() ?? null };
};

const isLocalResourceUrl = (url: string) => url.startsWith("rtnote-staged:") || url.includes("local_resource_");

const RecorderPanel = ({
  snapshot,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: {
  snapshot: VoiceMemoSessionSnapshot;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}) => {
  const { t } = useTranslation();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const recording = snapshot.status === "recording";
  const preparing = snapshot.status === "preparing";

  return (
    <span className="flex flex-col gap-3">
      <span className="flex flex-wrap items-center gap-3">
        <span className={cn("flex items-center gap-2 text-sm font-semibold", recording ? "text-rose-600" : "text-slate-700")} role="status">
          {preparing ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <span className={cn("h-2.5 w-2.5 rounded-full", recording ? "animate-pulse bg-rose-500" : "bg-slate-400")} aria-hidden="true" />
          )}
          {preparing ? t("voiceMemo.preparing") : recording ? t("voiceMemo.recording") : t("voiceMemo.paused")}
        </span>
        <span className="text-lg font-semibold tabular-nums text-slate-900" aria-label={t("voiceMemo.elapsed")}>
          {formatVoiceMemoDuration(snapshot.elapsedMs)}
        </span>
        <span className="text-xs text-slate-500">
          {t("voiceMemo.stopsAt", { duration: formatVoiceMemoDuration(snapshot.maxDurationMs) })}
        </span>
      </span>
      <VoiceMemoLevelMeter levels={snapshot.levels} active={recording} label={t("voiceMemo.level")} />
      <span className="flex flex-wrap items-center gap-2">
        {confirmDiscard ? (
          <>
            <span className="text-sm text-slate-700">{t("voiceMemo.discardConfirm")}</span>
            <Button type="button" size="sm" variant="danger" onClick={onDiscard}>{t("voiceMemo.discard")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDiscard(false)}>{t("common.cancel")}</Button>
          </>
        ) : (
          <>
            {recording ? (
              <Button type="button" size="sm" variant="outline" onClick={onPause}>
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                {t("voiceMemo.pause")}
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled={preparing} onClick={onResume}>
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                {t("voiceMemo.resume")}
              </Button>
            )}
            <Button type="button" size="sm" variant="solid" disabled={preparing} onClick={onStop}>
              <Square className="h-3 w-3 fill-current" aria-hidden="true" />
              {t("voiceMemo.stop")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDiscard(true)}>
              {t("voiceMemo.discard")}
            </Button>
          </>
        )}
      </span>
    </span>
  );
};

/** Offers transcription when a speech provider is set up, and says how to set one up otherwise. */
const TranscribeAction = ({ onTranscribe }: { onTranscribe: () => void }) => {
  const { t } = useTranslation();
  const settings = useQuery({
    queryKey: ["ai-transcription-settings"],
    queryFn: api.getTranscriptionSettings,
    staleTime: 60_000,
    retry: false,
  });
  if (isSpeechTranscriptionReady(settings.data)) {
    return <Button type="button" size="sm" variant="outline" onClick={onTranscribe}>{t("voiceMemo.transcribe")}</Button>;
  }
  return settings.isSuccess ? <span className="text-xs text-slate-500">{t("voiceMemo.transcribeUnavailable")}</span> : null;
};

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const VoiceMemoNodeView = ({ node, editor, updateAttributes, deleteNode, selected }: NodeViewProps) => {
  const { t } = useTranslation();
  const attrs = readVoiceMemoAttrs(node.attrs);
  const context = useContext(VoiceMemoEditorContext);
  const editable = useEditorState({ editor, selector: ({ editor: current }) => Boolean(current?.isEditable) }) ?? false;
  const maxDurationMinutes = useVoiceMemoMaxDuration();
  const { session, snapshot } = useVoiceMemoSession(attrs.clientId);
  const [title, setTitle] = useState(attrs.title);
  const [transcript, setTranscript] = useState(attrs.transcript);
  const [transcribing, setTranscribing] = useState<{ segments: number } | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [maxReachedNotice, setMaxReachedNotice] = useState(false);
  const transcribeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => setTitle(attrs.title), [attrs.title]);
  useEffect(() => setTranscript(attrs.transcript), [attrs.transcript]);
  useEffect(() => () => transcribeAbortRef.current?.abort(), []);

  useEffect(() => (attrs.clientId ? voiceMemoSessions.registerView(attrs.clientId) : undefined), [attrs.clientId]);

  const startRecording = () => {
    const memoId = context?.memoId;
    if (!context || !memoId || !editable) return;
    let clientId = attrs.clientId;
    if (!clientId) {
      clientId = createVoiceMemoClientId();
      updateAttributes({ clientId });
    }
    voiceMemoSessions.start({
      clientId,
      memoId,
      maxDurationMinutes,
      upload: (file) => context.upload(memoId, file),
      filenamePrefix: t("voiceMemo.name"),
    });
  };

  // A block inserted from the toolbar, slash menu or "New voice memo" starts right away.
  useEffect(() => {
    if (attrs.url || !attrs.clientId || session || !editable || !context?.memoId) return;
    if (voiceMemoSessions.consumeAutoStart(attrs.clientId)) startRecording();
  }, [attrs.clientId, attrs.url, editable, context?.memoId, session]);

  // Put a saved recording into the block.
  useEffect(() => {
    if (!snapshot || snapshot.status !== "saved" || !snapshot.result || attrs.url || !editable) return;
    const { result } = snapshot;
    if (snapshot.maxReached) setMaxReachedNotice(true);
    updateAttributes({
      url: result.url,
      filename: result.filename,
      mimeType: result.mimeType,
      byteSize: result.byteSize,
      durationMs: result.durationMs,
      clientId: "",
    });
    voiceMemoSessions.remove(snapshot.clientId);
  }, [attrs.url, editable, snapshot, updateAttributes]);

  const resourceId = attrs.url ? getResourceIdFromUrl(attrs.url) : null;
  const localOnly = Boolean(attrs.url && isLocalResourceUrl(attrs.url));
  const canTranscribe = Boolean(editable && context?.transcribe && context.memoId && resourceId && !localOnly);

  const commitTitle = () => {
    const next = title.trim();
    if (next !== attrs.title) updateAttributes({ title: next });
  };
  const commitTranscript = () => {
    if (transcript !== attrs.transcript) updateAttributes({ transcript: transcript.trimEnd() });
  };

  const transcribe = async () => {
    if (!canTranscribe || !resourceId || !context?.transcribe || !context.memoId) return;
    transcribeAbortRef.current?.abort();
    const controller = new AbortController();
    transcribeAbortRef.current = controller;
    setTranscribeError(null);
    setTranscribing({ segments: 0 });
    try {
      const text = await context.transcribe(context.memoId, resourceId, controller.signal, (segments) => {
        if (transcribeAbortRef.current === controller) setTranscribing({ segments });
      });
      if (transcribeAbortRef.current !== controller) return;
      if (text.trim()) updateAttributes({ transcript: text.trim() });
    } catch (error) {
      if (controller.signal.aborted) return;
      setTranscribeError(error instanceof Error ? error.message : String(error));
    } finally {
      if (transcribeAbortRef.current === controller) {
        transcribeAbortRef.current = null;
        setTranscribing(null);
      }
    }
  };

  const resolvedUrl = attrs.url ? (isDesktopResourceRuntime() ? attrs.url : toApiResourceUrl(attrs.url)) : "";
  const downloadName = attrs.filename || `${t("voiceMemo.name")}.${attrs.mimeType === "audio/mp4" ? "m4a" : "webm"}`;
  const showTranscript = Boolean(attrs.url) && (editable || attrs.transcript.trim());

  const body = (() => {
    if (snapshot && !attrs.url && editable) {
      if (snapshot.status === "preparing" || snapshot.status === "recording" || snapshot.status === "paused") {
        return (
          <RecorderPanel
            snapshot={snapshot}
            onPause={() => session?.pause()}
            onResume={() => session?.resume()}
            onStop={() => session?.stop()}
            onDiscard={() => {
              voiceMemoSessions.remove(snapshot.clientId);
              deleteNode();
            }}
          />
        );
      }
      if (snapshot.status === "saving" || snapshot.status === "saved") {
        return (
          <span className="flex items-center gap-2 text-sm text-slate-600" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            {snapshot.maxReached
              ? `${t("voiceMemo.maxReached", { minutes: Math.round(snapshot.maxDurationMs / 60_000) })} ${t("voiceMemo.saving")}`
              : t("voiceMemo.saving")}
          </span>
        );
      }
      if (snapshot.status === "failed") {
        const file = session?.recordedFile ?? null;
        return (
          <span className="flex flex-col gap-2" role="alert">
            <span className="text-sm text-rose-600">{t("voiceMemo.uploadFailed")}</span>
            {snapshot.uploadError ? <span className="text-xs text-slate-500">{snapshot.uploadError}</span> : null}
            <span className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="solid" disabled={!file} onClick={() => void session?.upload()}>{t("voiceMemo.retry")}</Button>
              {file ? (
                <Button type="button" size="sm" variant="outline" onClick={() => downloadFile(file)}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("voiceMemo.download")}
                </Button>
              ) : null}
            </span>
          </span>
        );
      }
      if (snapshot.status === "error") {
        const message = snapshot.startError === "micDenied" ? t("voiceMemo.micDenied")
          : snapshot.startError === "micUnavailable" ? t("voiceMemo.micUnavailable")
          : snapshot.startError === "unsupported" ? t("voiceMemo.unsupported")
          : t("voiceMemo.uploadFailed");
        return (
          <span className="flex flex-col gap-2" role="alert">
            <span className="text-sm text-rose-600">{message}</span>
            <span className="flex flex-wrap gap-2">
              {snapshot.startError !== "unsupported" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  voiceMemoSessions.remove(snapshot.clientId);
                  startRecording();
                }}>{t("voiceMemo.retry")}</Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => {
                voiceMemoSessions.remove(snapshot.clientId);
                deleteNode();
              }}>{t("voiceMemo.delete")}</Button>
            </span>
          </span>
        );
      }
    }
    if (!attrs.url) {
      return (
        <span className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-500" role="status">{t("voiceMemo.noRecording")}</span>
          {editable && context?.memoId ? (
            <Button type="button" size="sm" variant="solid" onClick={startRecording}>
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              {t("voiceMemo.record")}
            </Button>
          ) : null}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2">
        <VoiceMemoPlayer key={resolvedUrl} src={resolvedUrl} durationMs={attrs.durationMs} />
        <ButtonTooltip title={t("voiceMemo.download")}>
          <a
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A06E]"
            href={toDesktopResourceDownloadUrl(resolvedUrl, downloadName)}
            download={downloadName}
            aria-label={t("voiceMemo.download")}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </a>
        </ButtonTooltip>
      </span>
    );
  })();

  return (
    <NodeViewWrapper
      className={cn(
        "rtnote-voice-memo-node my-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-3 shadow-sm",
        selected && "ring-2 ring-[#16A06E] ring-offset-2",
      )}
      data-type="rtnote-voice-memo"
      data-url={attrs.url || undefined}
      contentEditable={false}
    >
      <span className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#16A06E]" aria-hidden="true">
          <Mic className="h-4 w-4" />
        </span>
        {editable ? (
          <input
            type="text"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400"
            value={title}
            placeholder={t("voiceMemo.titlePlaceholder")}
            aria-label={t("voiceMemo.titlePlaceholder")}
            onChange={(event) => setTitle(event.currentTarget.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{attrs.title || t("voiceMemo.name")}</span>
        )}
        {editable && attrs.url ? (
          <Button type="button" size="icon-sm" variant="ghost" title={t("voiceMemo.delete")} aria-label={t("voiceMemo.delete")} onClick={() => deleteNode()}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </span>
      {body}
      {maxReachedNotice && attrs.url ? (
        <span className="text-xs text-slate-500" role="status">
          {t("voiceMemo.maxReached", { minutes: maxDurationMinutes })}
        </span>
      ) : null}
      {localOnly ? <span className="text-xs text-slate-500" role="status">{t("voiceMemo.savedOffline")}</span> : null}
      {showTranscript ? (
        <span className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("voiceMemo.transcript")}</span>
            {canTranscribe && !attrs.transcript.trim() && !transcribing ? (
              <TranscribeAction onTranscribe={() => void transcribe()} />
            ) : null}
          </span>
          {transcribing ? (
            <span className="flex items-center gap-2 text-sm text-slate-600" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              {transcribing.segments > 0
                ? t("voiceMemo.transcribingProgress", { count: transcribing.segments })
                : t("voiceMemo.transcribing")}
            </span>
          ) : null}
          {transcribeError ? (
            <span className="text-sm text-rose-600" role="alert">{t("voiceMemo.transcriptionFailed", { error: transcribeError })}</span>
          ) : null}
          {editable ? (
            <textarea
              className="min-h-[64px] w-full resize-y rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#16A06E]"
              value={transcript}
              placeholder={t("voiceMemo.transcriptPlaceholder")}
              aria-label={t("voiceMemo.transcript")}
              rows={Math.min(12, Math.max(2, transcript.split("\n").length))}
              onChange={(event) => setTranscript(event.currentTarget.value)}
              onBlur={commitTranscript}
            />
          ) : (
            <span className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{attrs.transcript}</span>
          )}
        </span>
      ) : null}
    </NodeViewWrapper>
  );
};

/** The voice memo node with the recorder and player block. */
export const VoiceMemoExtension = VoiceMemo.extend({
  addNodeView() {
    return ReactNodeViewRenderer(VoiceMemoNodeView);
  },
});

