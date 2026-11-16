import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatVoiceMemoDuration } from "@edgeever/shared/voice-memo-names";
import { pauseOtherMediaPlayers } from "@/components/attachments/pause-other-media";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { cn } from "@/lib/utils";

/** Seconds the player can use as the length: the file's own, else the recorded one. */
export const resolvePlayableDuration = (mediaDuration: number, storedDurationMs: number | null) => {
  if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
  return storedDurationMs === null ? 0 : storedDurationMs / 1000;
};

export const VoiceMemoPlayer = ({
  src,
  durationMs,
  className,
}: {
  src: string;
  durationMs: number | null;
  className?: string;
}) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(Number.NaN);
  const [failed, setFailed] = useState(false);
  const duration = resolvePlayableDuration(mediaDuration, durationMs);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    setCurrentTime(0);
    setMediaDuration(Number.NaN);
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      pauseOtherMediaPlayers(audio);
      void audio.play().catch(() => setFailed(true));
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  if (failed) {
    return (
      <span className={cn("flex min-h-10 items-center text-sm text-slate-500", className)} role="status">
        {t("voiceMemo.unavailable")}
      </span>
    );
  }

  return (
    <span className={cn("flex min-h-10 w-full items-center gap-3", className)} role="group" aria-label={t("voiceMemo.playerLabel")}>
      <ButtonTooltip title={playing ? t("voiceMemo.pausePlayback") : t("voiceMemo.play")}>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16A06E] text-white transition hover:bg-[#12895e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A06E] focus-visible:ring-offset-2"
          aria-label={playing ? t("voiceMemo.pausePlayback") : t("voiceMemo.play")}
          onClick={toggle}
        >
          {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />}
        </button>
      </ButtonTooltip>
      <input
        type="range"
        className="rtnote-voice-memo-seek min-w-0 flex-1 accent-[#16A06E]"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || currentTime)}
        disabled={!duration}
        aria-label={t("voiceMemo.seek")}
        aria-valuetext={`${formatVoiceMemoDuration(currentTime * 1000)} / ${formatVoiceMemoDuration(duration * 1000)}`}
        onChange={(event) => seek(Number(event.currentTarget.value))}
      />
      <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500">
        {formatVoiceMemoDuration(currentTime * 1000)} / {formatVoiceMemoDuration(duration * 1000)}
      </span>
      <audio
        ref={audioRef}
        data-edgeever-audio-player
        preload="metadata"
        src={src}
        className="hidden"
        onPlay={(event) => {
          pauseOtherMediaPlayers(event.currentTarget);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setMediaDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setMediaDuration(event.currentTarget.duration)}
        onError={() => setFailed(true)}
      />
    </span>
  );
};
