import { useSyncExternalStore } from "react";
import { LoaderCircle, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatVoiceMemoDuration } from "@rtnote/shared/voice-memo-names";
import { Button } from "@/components/ui/button";
import { voiceMemoSessions } from "@/lib/voice-memo-recorder";

/**
 * Shows recordings that keep going after their note was closed, so they can
 * always be seen and stopped. The recording is saved to its note when it
 * stops and fills its block the next time that note opens.
 */
export const VoiceMemoRecordingIndicator = () => {
  const { t } = useTranslation();
  useSyncExternalStore(voiceMemoSessions.subscribe, voiceMemoSessions.getVersion, voiceMemoSessions.getVersion);
  const sessions = voiceMemoSessions.listUnattended();
  if (!sessions.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {sessions.map((session) => {
        const snapshot = session.getSnapshot();
        const live = snapshot.status === "recording" || snapshot.status === "paused" || snapshot.status === "preparing";
        return (
          <div
            key={snapshot.clientId}
            className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-slate-200 bg-card px-4 py-2 text-sm shadow-lg"
            role="status"
          >
            {live ? (
              <span className={snapshot.status === "recording" ? "h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" : "h-2.5 w-2.5 rounded-full bg-slate-400"} aria-hidden="true" />
            ) : (
              <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" aria-hidden="true" />
            )}
            <span className="truncate text-slate-700">
              {snapshot.status === "failed" ? t("voiceMemo.uploadFailed")
                : live ? t("voiceMemo.recordingElsewhere") : t("voiceMemo.saving")}
            </span>
            {live ? (
              <>
                <span className="font-semibold tabular-nums text-slate-900">{formatVoiceMemoDuration(snapshot.elapsedMs)}</span>
                <Button type="button" size="sm" variant="solid" onClick={() => session.stop()}>
                  <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                  {t("voiceMemo.stop")}
                </Button>
              </>
            ) : snapshot.status === "failed" ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void session.upload()}>{t("voiceMemo.retry")}</Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
