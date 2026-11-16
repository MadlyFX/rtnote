import { Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  VOICE_MEMO_MAX_DURATION_OPTIONS,
  normalizeVoiceMemoMaxDuration,
} from "@edgeever/shared/voice-memo-names";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVoiceMemoMaxDuration, writeVoiceMemoMaxDuration } from "@/lib/voice-memo-preferences";
import { SETTINGS_ITEM_DESCRIPTION_CLASSNAME, SETTINGS_ITEM_TITLE_CLASSNAME } from "./settings-ui";

/** Maximum voice memo length on this device. */
export const VoiceMemoSettingsItem = () => {
  const { t } = useTranslation();
  const maxDuration = useVoiceMemoMaxDuration();

  return (
    <div className="flex min-h-16 flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Mic className="h-4 w-4 shrink-0 text-slate-500" />
        <div className="min-w-0">
          <div className={SETTINGS_ITEM_TITLE_CLASSNAME}>{t("voiceMemo.maxDuration")}</div>
          <div className={SETTINGS_ITEM_DESCRIPTION_CLASSNAME}>{t("voiceMemo.maxDurationHint")}</div>
        </div>
      </div>
      <div className="flex w-full shrink-0 justify-start sm:w-44 sm:justify-end">
        <Select
          value={String(maxDuration)}
          onValueChange={(value) => writeVoiceMemoMaxDuration(normalizeVoiceMemoMaxDuration(value))}
        >
          <SelectTrigger aria-label={t("voiceMemo.maxDuration")} className="h-9 w-full bg-card sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_MEMO_MAX_DURATION_OPTIONS.map((minutes) => (
              <SelectItem key={minutes} value={String(minutes)}>
                {t("voiceMemo.minutes", { count: minutes })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
