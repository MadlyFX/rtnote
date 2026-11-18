import { useSyncExternalStore } from "react";
import {
  DEFAULT_VOICE_MEMO_MAX_DURATION_MINUTES,
  normalizeVoiceMemoMaxDuration,
  type VoiceMemoMaxDurationMinutes,
} from "@edgeever/shared/voice-memo-names";

export const VOICE_MEMO_MAX_DURATION_STORAGE_KEY = "edgeever.voiceMemoMaxDurationMinutes";
const CHANGE_EVENT = "edgeever:voice-memo-preferences-changed";

export const readVoiceMemoMaxDuration = (): VoiceMemoMaxDurationMinutes => {
  try {
    return normalizeVoiceMemoMaxDuration(window.localStorage.getItem(VOICE_MEMO_MAX_DURATION_STORAGE_KEY));
  } catch {
    return DEFAULT_VOICE_MEMO_MAX_DURATION_MINUTES;
  }
};

export const writeVoiceMemoMaxDuration = (minutes: VoiceMemoMaxDurationMinutes) => {
  try {
    window.localStorage.setItem(VOICE_MEMO_MAX_DURATION_STORAGE_KEY, String(minutes));
  } catch {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribe = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === VOICE_MEMO_MAX_DURATION_STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** The maximum recording length on this device, kept in sync across tabs. */
export const useVoiceMemoMaxDuration = () => useSyncExternalStore(
  subscribe,
  readVoiceMemoMaxDuration,
  () => DEFAULT_VOICE_MEMO_MAX_DURATION_MINUTES,
);
