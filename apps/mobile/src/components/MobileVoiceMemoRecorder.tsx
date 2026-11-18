import {
  AudioQuality,
  IOSOutputFormat,
  requestNotificationPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
  type RecordingStatus,
} from "expo-audio";
import { formatVoiceMemoDuration } from "@edgeever/shared";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { Linking, Modal, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Mic, Pause, Play, Square, Trash2 } from "./icons";
import { Alert, Pressable, Text } from "./LocalizedText";
import { formatMobileCopy, getMobileCatalog, useMobileLocale } from "../lib/mobile-locale";
import { resolveMobileThemeStyles, useMobileTheme } from "../lib/mobile-theme";
import {
  INITIAL_MOBILE_VOICE_MEMO_RECORDER_STATE,
  MOBILE_VOICE_MEMO_EXTENSION,
  hasReachedVoiceMemoLimit,
  meteringToLevel,
  reduceMobileVoiceMemoRecorder,
  voiceMemoMaxDurationMs,
} from "../lib/mobile-voice-memo";

/** Mono AAC at 64 kbps: clear speech at about 0.5 MB per minute. */
const VOICE_MEMO_RECORDING_OPTIONS: RecordingOptions = {
  extension: `.${MOBILE_VOICE_MEMO_EXTENSION}`,
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: { audioQuality: AudioQuality.HIGH, outputFormat: IOSOutputFormat.MPEG4AAC },
  web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
};

const LEVEL_BARS = 24;

export type MobileVoiceMemoRecorderResult = {
  uri: string;
  durationMs: number;
  stoppedAtLimit: boolean;
};

export const MobileVoiceMemoRecorder = ({
  maxMinutes,
  onCancel,
  onFinished,
  visible,
}: {
  maxMinutes: number;
  onCancel: () => void;
  onFinished: (result: MobileVoiceMemoRecorderResult) => void | Promise<void>;
  visible: boolean;
}) => {
  const { resolvedLocale } = useMobileLocale();
  const { resolvedTheme, themeKey } = useMobileTheme();
  const insets = useSafeAreaInsets();
  // themeKey also changes with the server branding colours.
  const styles = useMemo(() => resolveMobileThemeStyles(baseStyles, resolvedTheme), [resolvedTheme, themeKey]);
  const copy = getMobileCatalog(resolvedLocale).voiceMemo;
  const [state, dispatch] = useReducer(reduceMobileVoiceMemoRecorder, INITIAL_MOBILE_VOICE_MEMO_RECORDER_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastDurationRef = useRef(0);
  const finishingRef = useRef(false);
  const levelsRef = useRef<number[]>(Array.from({ length: LEVEL_BARS }, () => 0));

  const handleNativeStatus = useCallback((status: RecordingStatus) => {
    if (status.hasError) {
      dispatch({ type: "fail", error: status.error || copy.uploadFailed });
      return;
    }
    // The native recorder stops on its own at the length limit (record({ forDuration })).
    if (status.isFinished && !finishingRef.current && (stateRef.current.status === "recording" || stateRef.current.status === "paused")) {
      void finishRef.current(true);
    }
  }, [copy.uploadFailed]);

  const recorder = useAudioRecorder(VOICE_MEMO_RECORDING_OPTIONS, handleNativeStatus);
  const recorderState = useAudioRecorderState(recorder, 120);
  if (recorderState.durationMillis > lastDurationRef.current) lastDurationRef.current = recorderState.durationMillis;
  const durationMs = Math.max(recorderState.durationMillis, lastDurationRef.current);

  if (state.status === "recording") {
    levelsRef.current = [...levelsRef.current.slice(1), meteringToLevel(recorderState.metering)];
  }

  const releaseAudioMode = () =>
    setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false }).catch(() => undefined);

  const finish = async (atLimit: boolean) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const finalDuration = Math.max(lastDurationRef.current, recorder.getStatus().durationMillis || 0);
    dispatch({ type: "stop", atLimit });
    try {
      if (recorder.isRecording || stateRef.current.status === "paused" || stateRef.current.status === "saving") {
        await recorder.stop().catch(() => undefined);
      }
      const uri = recorder.uri;
      await releaseAudioMode();
      if (!uri) throw new Error(copy.uploadFailed);
      await onFinished({ uri, durationMs: finalDuration, stoppedAtLimit: atLimit });
      dispatch({ type: "reset" });
    } catch (error) {
      dispatch({ type: "fail", error: error instanceof Error ? error.message : copy.uploadFailed });
    } finally {
      finishingRef.current = false;
    }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const start = async () => {
    dispatch({ type: "prepare" });
    lastDurationRef.current = 0;
    levelsRef.current = Array.from({ length: LEVEL_BARS }, () => 0);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        dispatch({ type: "fail", error: copy.micDenied });
        if (!permission.canAskAgain) {
          Alert.alert(copy.name, copy.micDenied, [
            { text: "Cancel", style: "cancel" },
            { text: "Open settings", onPress: () => void Linking.openSettings() },
          ]);
        }
        return;
      }
      // Android 13+ shows the recording notification of the foreground service only with this permission.
      if (Platform.OS === "android") await requestNotificationPermissionsAsync().catch(() => undefined);
      await setAudioModeAsync({
        allowsRecording: true,
        allowsBackgroundRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
        interruptionMode: "doNotMix",
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: voiceMemoMaxDurationMs(maxMinutes) / 1000 });
      dispatch({ type: "started" });
    } catch (error) {
      await releaseAudioMode();
      dispatch({ type: "fail", error: error instanceof Error ? error.message : copy.micDenied });
    }
  };
  const startRef = useRef(start);
  startRef.current = start;

  useEffect(() => {
    if (visible && stateRef.current.status === "idle") void startRef.current();
  }, [visible]);

  // A JS-side guard for the limit, in case the native timer does not fire.
  useEffect(() => {
    if (state.status === "recording" && hasReachedVoiceMemoLimit(durationMs, maxMinutes)) void finishRef.current(true);
  }, [durationMs, maxMinutes, state.status]);

  useEffect(() => () => {
    void releaseAudioMode();
  }, []);

  const pause = () => {
    if (state.status !== "recording") return;
    recorder.pause();
    dispatch({ type: "pause" });
  };

  const resume = () => {
    if (state.status !== "paused") return;
    recorder.record({ forDuration: Math.max(1, (voiceMemoMaxDurationMs(maxMinutes) - durationMs) / 1000) });
    dispatch({ type: "resume" });
  };

  const discard = () => {
    Alert.alert(copy.discardConfirm, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: copy.discard,
        style: "destructive",
        onPress: () => {
          finishingRef.current = true;
          void (async () => {
            await recorder.stop().catch(() => undefined);
            await releaseAudioMode();
            finishingRef.current = false;
            dispatch({ type: "reset" });
            onCancel();
          })();
        },
      },
    ]);
  };

  const close = () => {
    // Closing never loses audio: a running recording is stopped and saved.
    if (state.status === "recording" || state.status === "paused") {
      void finish(false);
      return;
    }
    if (state.status === "saving" || state.status === "preparing") return;
    dispatch({ type: "reset" });
    onCancel();
  };

  const busy = state.status === "preparing" || state.status === "saving";
  const active = state.status === "recording" || state.status === "paused";
  const maxDurationLabel = formatVoiceMemoDuration(voiceMemoMaxDurationMs(maxMinutes));
  const statusLabel = state.status === "preparing" ? copy.preparing
    : state.status === "saving" ? copy.saving
    : state.status === "paused" ? copy.paused
    : state.status === "recording" ? copy.recording
    : state.error ?? copy.name;

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Mic color={state.status === "recording" ? "#dc2626" : "#0f172a"} size={18} />
            <Text accessibilityRole="header" style={styles.title}>{copy.name}</Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={[styles.status, state.status === "error" && styles.statusError]}>{statusLabel}</Text>
          <Text accessibilityLabel={`${copy.elapsed} ${formatVoiceMemoDuration(durationMs)}`} style={styles.timer}>
            {formatVoiceMemoDuration(durationMs)}
          </Text>
          <Text style={styles.limit}>{formatMobileCopy(copy.stopsAt, { duration: maxDurationLabel })}</Text>
          <View accessibilityLabel={copy.level} accessibilityRole="progressbar" style={styles.meter}>
            {levelsRef.current.map((level, index) => (
              <View
                key={index}
                style={[styles.meterBar, { height: 4 + Math.round(level * 36) }, state.status !== "recording" && styles.meterBarIdle]}
              />
            ))}
          </View>
          <View style={styles.controls}>
            <Pressable
              accessibilityLabel={copy.discard}
              accessibilityRole="button"
              disabled={!active}
              onPress={discard}
              style={[styles.secondaryButton, !active && styles.disabled]}
            >
              <Trash2 color="#64748b" size={20} />
            </Pressable>
            {state.status === "error" ? (
              <Pressable accessibilityLabel={copy.record} accessibilityRole="button" onPress={() => void start()} style={styles.primaryButton}>
                <Mic color="#ffffff" size={26} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel={copy.stop}
                accessibilityRole="button"
                disabled={!active}
                onPress={() => void finish(false)}
                style={[styles.primaryButton, !active && styles.disabled]}
              >
                {busy ? <ActivityIndicator color="#ffffff" /> : <Square color="#ffffff" size={24} />}
              </Pressable>
            )}
            <Pressable
              accessibilityLabel={state.status === "paused" ? copy.resume : copy.pause}
              accessibilityRole="button"
              disabled={!active}
              onPress={state.status === "paused" ? resume : pause}
              style={[styles.secondaryButton, !active && styles.disabled]}
            >
              {state.status === "paused" ? <Play color="#0f172a" size={20} /> : <Pause color="#0f172a" size={20} />}
            </Pressable>
          </View>
          {state.status === "error" ? (
            <Pressable accessibilityRole="button" onPress={close} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>{getMobileCatalog(resolvedLocale).common.close}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const baseStyles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  handle: {
    backgroundColor: "#cbd5e1",
    borderRadius: 999,
    height: 4,
    marginTop: 8,
    width: 42,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  title: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
  },
  status: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  statusError: {
    color: "#dc2626",
  },
  timer: {
    color: "#0f172a",
    fontSize: 44,
    fontVariant: ["tabular-nums"],
    fontWeight: "300",
    marginTop: 12,
  },
  limit: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  meter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    height: 44,
    justifyContent: "center",
    marginTop: 16,
  },
  meterBar: {
    backgroundColor: "#16A06E",
    borderRadius: 2,
    width: 4,
  },
  meterBarIdle: {
    backgroundColor: "#cbd5e1",
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 28,
    marginTop: 20,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#dc2626",
    borderRadius: 999,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  disabled: {
    opacity: 0.4,
  },
  textButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textButtonLabel: {
    color: "#047857",
    fontSize: 15,
    fontWeight: "600",
  },
});
