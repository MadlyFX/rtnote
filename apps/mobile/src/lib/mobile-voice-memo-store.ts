import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File as ExpoFile, Paths } from "expo-file-system";
import {
  parsePendingVoiceMemos,
  removePendingVoiceMemo,
  upsertPendingVoiceMemo,
  voiceMemoAudioCacheName,
  type MobileVoiceMemoAttrs,
  type MobileVoiceMemoRecording,
} from "./mobile-voice-memo";

/**
 * Recordings are copied into the app's document directory before anything
 * else happens, so a memo recorded offline (or in a note that has not synced
 * yet) survives restarts. The copy is deleted once the upload succeeds.
 */
const PENDING_KEY = "edgeever.mobile.pendingVoiceMemos";
const RECORDINGS_DIRECTORY = "voice-memos";
const AUDIO_CACHE_DIRECTORY = "voice-memo-audio";

let queue: Promise<unknown> = Promise.resolve();
/** Serializes read-modify-write cycles on the pending list. */
const withPendingList = <T>(task: () => Promise<T>): Promise<T> => {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
};

const ensureDirectory = (parent: Directory, name: string) => {
  const directory = new Directory(parent, name);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
};

export const readPendingVoiceMemos = async () =>
  parsePendingVoiceMemos(await AsyncStorage.getItem(PENDING_KEY));

/** Moves a finished recording into durable storage and returns its new URI. */
export const keepVoiceMemoRecording = (sourceUri: string, clientId: string, filename: string) => {
  const directory = ensureDirectory(Paths.document, RECORDINGS_DIRECTORY);
  const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".") + 1) : "m4a";
  const destination = new ExpoFile(directory, `${clientId}.${extension}`);
  if (destination.exists) destination.delete();
  const source = new ExpoFile(sourceUri);
  source.copy(destination);
  try {
    source.delete();
  } catch {
    // The recorder's cache file is cleaned up by the system later.
  }
  return { uri: destination.uri, byteSize: destination.size || null };
};

export const savePendingVoiceMemo = (recording: MobileVoiceMemoRecording) => withPendingList(async () => {
  const list = await readPendingVoiceMemos();
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(upsertPendingVoiceMemo(list, recording)));
});

/** Records that the file uploaded; the record stays until the note holds the finished block. */
export const markVoiceMemoUploaded = (clientId: string, uploaded: MobileVoiceMemoAttrs) => withPendingList(async () => {
  const list = await readPendingVoiceMemos();
  const recording = list.find((item) => item.clientId === clientId);
  if (!recording) return;
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(upsertPendingVoiceMemo(list, { ...recording, uploaded })));
});

/** Forgets a pending recording and deletes its durable copy. */
export const discardPendingVoiceMemo = (clientId: string) => withPendingList(async () => {
  const list = await readPendingVoiceMemos();
  const recording = list.find((item) => item.clientId === clientId);
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(removePendingVoiceMemo(list, clientId)));
  if (recording) deleteVoiceMemoFile(recording.uri);
});

export const deleteVoiceMemoFile = (uri: string) => {
  try {
    const file = new ExpoFile(uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing else to do; a leftover file only costs storage.
  }
};

/**
 * Seeds the playback cache with a just-uploaded recording so the note plays it
 * without downloading the file again.
 */
export const cacheUploadedVoiceMemoAudio = (sourceUri: string, url: string, mimeType: string) => {
  try {
    const directory = ensureDirectory(Paths.cache, AUDIO_CACHE_DIRECTORY);
    const destination = new ExpoFile(directory, voiceMemoAudioCacheName(url, mimeType));
    if (destination.exists) destination.delete();
    new ExpoFile(sourceUri).copy(destination);
  } catch {
    // Playback falls back to downloading the resource.
  }
};

const audioDataUrlCache = new Map<string, Promise<string | null>>();

/**
 * A data URL for a voice memo's audio. The WebView cannot send the session's
 * bearer token, so the file is downloaded natively into the cache (where it
 * stays for offline playback) and handed over as base64.
 */
export const loadVoiceMemoAudioDataUrl = (
  url: string,
  options: { baseUrl: string; token?: string | null; mimeType?: string | null },
): Promise<string | null> => {
  const key = `${options.baseUrl}|${url}`;
  const cached = audioDataUrlCache.get(key);
  if (cached) return cached;
  const request = (async () => {
    const path = /\/api\/v1\/resources\/([^/?#]+)/.exec(url);
    if (!path) return null;
    const blobPath = `/api/v1/resources/${path[1]}/blob`;
    const directory = ensureDirectory(Paths.cache, AUDIO_CACHE_DIRECTORY);
    const file = new ExpoFile(directory, voiceMemoAudioCacheName(url, options.mimeType));
    if (!file.exists || !file.size) {
      await ExpoFile.downloadFileAsync(`${options.baseUrl.replace(/\/+$/, "")}${blobPath}`, file, {
        headers: options.token ? { Authorization: `Bearer ${options.token}` } : {},
        idempotent: true,
      });
    }
    const mimeType = options.mimeType || file.type || "audio/mp4";
    return `data:${mimeType};base64,${await file.base64()}`;
  })().catch((error: unknown) => {
    audioDataUrlCache.delete(key);
    console.warn(`[RTNote] voice memo audio load failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  audioDataUrlCache.set(key, request);
  return request;
};
