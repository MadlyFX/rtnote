import type { createRTNoteClient } from "@rtnote/client";
import { createVoiceMemoClientId, type TiptapDoc } from "@rtnote/shared";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { AppState } from "react-native";
import { File as ExpoFile } from "expo-file-system";
import type { LocalTiptapEditorRef } from "../components/LocalTiptapEditor";
import { Alert } from "../components/LocalizedText";
import { MobileVoiceMemoRecorder, type MobileVoiceMemoRecorderResult } from "../components/MobileVoiceMemoRecorder";
import { formatMobileCopy, getMobileCatalog, useMobileLocale } from "../lib/mobile-locale";
import { uploadMobileResource } from "../lib/mobile-resource-upload";
import {
  MOBILE_VOICE_MEMO_MIME_TYPE,
  buildPendingVoiceMemoAttrs,
  buildUploadedVoiceMemoAttrs,
  createMobileVoiceMemoFilename,
  planPendingVoiceMemos,
  type MobileVoiceMemoRecording,
} from "../lib/mobile-voice-memo";
import {
  cacheUploadedVoiceMemoAudio,
  discardPendingVoiceMemo,
  keepVoiceMemoRecording,
  loadVoiceMemoAudioDataUrl,
  markVoiceMemoUploaded,
  readPendingVoiceMemos,
  savePendingVoiceMemo,
} from "../lib/mobile-voice-memo-store";
import { readMobileVoiceMemoMaxDuration } from "../lib/preferences";
import { safeDomCall } from "../lib/safe-dom-call";

type Client = ReturnType<typeof createRTNoteClient> | null;

const PENDING_RETRY_MS = 30_000;
/** Time for the editor's debounced change to reach `getDoc` before confirming. */
const CONFIRM_DELAY_MS = 2_500;

/**
 * Voice memos in an Android editor. A finished recording is first kept in
 * durable storage and listed as pending; then it uploads like any other
 * attachment. When the upload cannot happen yet (offline, or a note that has
 * not synced), a pending block goes into the note instead and is filled in
 * the next time this note is open with a connection. A recording is only
 * forgotten once the note is seen holding its finished block.
 */
export const useMobileVoiceMemo = ({
  baseUrl,
  client,
  editorRef,
  getDoc,
  onBusyChange,
  ready,
  reportRetryBusy = false,
  resolveUploadMemoId,
  token,
}: {
  baseUrl: string;
  client: Client;
  editorRef: RefObject<LocalTiptapEditorRef | null>;
  /** The editor's current document, used to find pending blocks. */
  getDoc: () => TiptapDoc;
  onBusyChange?: (busy: boolean) => void;
  /** Whether the editor can receive bridge calls. */
  ready: boolean;
  /** Also report busy for background retries (when resolving the note changes editor state). */
  reportRetryBusy?: boolean;
  /** The server id of the note uploads attach to, or null when there is none yet. */
  resolveUploadMemoId: () => Promise<string | null>;
  token?: string | null;
}) => {
  const { resolvedLocale } = useMobileLocale();
  const [recorderVisible, setRecorderVisible] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState(30);
  const inFlightRef = useRef(new Set<string>());
  const getDocRef = useRef(getDoc);
  getDocRef.current = getDoc;
  const resolveUploadMemoIdRef = useRef(resolveUploadMemoId);
  resolveUploadMemoIdRef.current = resolveUploadMemoId;
  const onBusyChangeRef = useRef(onBusyChange);
  onBusyChangeRef.current = onBusyChange;

  const upload = useCallback(async (recording: MobileVoiceMemoRecording, memoId: string) => {
    if (!client) throw new Error(getMobileCatalog(resolvedLocale).voiceMemo.uploadFailed);
    const { resource } = await uploadMobileResource(client, memoId, {
      uri: recording.uri,
      name: recording.filename,
      type: recording.mimeType,
    });
    cacheUploadedVoiceMemoAudio(recording.uri, resource.url, recording.mimeType);
    return buildUploadedVoiceMemoAttrs(recording, resource);
  }, [client, resolvedLocale]);

  const openRecorder = useCallback(async () => {
    setMaxMinutes(await readMobileVoiceMemoMaxDuration());
    setRecorderVisible(true);
  }, []);

  const handleFinished = useCallback(async (result: MobileVoiceMemoRecorderResult) => {
    const copy = getMobileCatalog(resolvedLocale).voiceMemo;
    const clientId = createVoiceMemoClientId();
    const filename = createMobileVoiceMemoFilename();
    // Durable copy and pending record first: nothing after this can lose the audio.
    const kept = keepVoiceMemoRecording(result.uri, clientId, filename);
    const recording: MobileVoiceMemoRecording = {
      clientId,
      uri: kept.uri,
      filename,
      mimeType: MOBILE_VOICE_MEMO_MIME_TYPE,
      byteSize: kept.byteSize ?? (new ExpoFile(kept.uri).size || null),
      durationMs: Math.round(result.durationMs),
      createdAt: new Date().toISOString(),
    };
    await savePendingVoiceMemo(recording);
    setRecorderVisible(false);
    onBusyChangeRef.current?.(true);
    inFlightRef.current.add(clientId);
    try {
      // The block shows "Saving the recording…" until the upload fills it in.
      safeDomCall(() => editorRef.current?.insertVoiceMemo(JSON.stringify(buildPendingVoiceMemoAttrs(recording))));
      const memoId = await resolveUploadMemoIdRef.current().catch(() => null);
      if (memoId) {
        try {
          const attrs = await upload(recording, memoId);
          await markVoiceMemoUploaded(clientId, attrs);
          safeDomCall(() => editorRef.current?.completeVoiceMemo(clientId, JSON.stringify(attrs)));
          setTimeout(() => void flushRef.current(), CONFIRM_DELAY_MS);
        } catch (error) {
          console.warn(`[RTNote] voice memo upload deferred: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (result.stoppedAtLimit) {
        Alert.alert(copy.name, formatMobileCopy(copy.maxReached, { minutes: maxMinutes }));
      }
    } finally {
      inFlightRef.current.delete(clientId);
      onBusyChangeRef.current?.(false);
    }
  }, [editorRef, maxMinutes, resolvedLocale, upload]);

  /**
   * Brings the open note's voice memos up to date: forgets recordings whose
   * finished block the note holds, fills in blocks whose file already
   * uploaded, and uploads the rest.
   */
  const flushPendingVoiceMemos = useCallback(async () => {
    const records = (await readPendingVoiceMemos()).filter((item) => !inFlightRef.current.has(item.clientId));
    if (!records.length) return;
    const plan = planPendingVoiceMemos(getDocRef.current(), records);
    for (const recording of plan.forget) await discardPendingVoiceMemo(recording.clientId);
    for (const recording of plan.complete) {
      safeDomCall(() => editorRef.current?.completeVoiceMemo(recording.clientId, JSON.stringify(recording.uploaded)));
    }
    const toUpload = plan.upload.filter((item) => new ExpoFile(item.uri).exists);
    if (!toUpload.length || !client) return;
    toUpload.forEach((item) => inFlightRef.current.add(item.clientId));
    // Resolving can create the server note and change editor state in the new-note editor.
    if (reportRetryBusy) onBusyChangeRef.current?.(true);
    let uploadedAny = false;
    try {
      const memoId = await resolveUploadMemoIdRef.current().catch(() => null);
      if (!memoId) return;
      for (const recording of toUpload) {
        try {
          const attrs = await upload(recording, memoId);
          await markVoiceMemoUploaded(recording.clientId, attrs);
          safeDomCall(() => editorRef.current?.completeVoiceMemo(recording.clientId, JSON.stringify(attrs)));
          uploadedAny = true;
        } catch (error) {
          console.warn(`[RTNote] voice memo upload retry failed: ${error instanceof Error ? error.message : String(error)}`);
          break;
        }
      }
    } finally {
      toUpload.forEach((item) => inFlightRef.current.delete(item.clientId));
      if (reportRetryBusy) onBusyChangeRef.current?.(false);
      if (uploadedAny) setTimeout(() => void flushRef.current(), CONFIRM_DELAY_MS);
    }
  }, [client, editorRef, reportRetryBusy, upload]);
  const flushRef = useRef(flushPendingVoiceMemos);
  flushRef.current = flushPendingVoiceMemos;

  useEffect(() => {
    if (!ready) return;
    void flushPendingVoiceMemos();
    const interval = setInterval(() => void flushPendingVoiceMemos(), PENDING_RETRY_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void flushPendingVoiceMemos();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [flushPendingVoiceMemos, ready]);

  const loadVoiceMemoAudio = useCallback(
    (url: string, mimeType: string) => loadVoiceMemoAudioDataUrl(url, { baseUrl, token, mimeType }),
    [baseUrl, token]
  );

  return {
    flushPendingVoiceMemos,
    loadVoiceMemoAudio,
    openRecorder,
    voiceMemoRecorder: (
      <MobileVoiceMemoRecorder
        maxMinutes={maxMinutes}
        onCancel={() => setRecorderVisible(false)}
        onFinished={handleFinished}
        visible={recorderVisible}
      />
    ),
  };
};
