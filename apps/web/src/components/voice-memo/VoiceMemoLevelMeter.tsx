import { cn } from "@/lib/utils";

const BARS = 32;

/** Recent microphone levels as bars, newest on the right. */
export const VoiceMemoLevelMeter = ({
  levels,
  active,
  label,
}: {
  levels: readonly number[];
  active: boolean;
  label: string;
}) => {
  const padded = [...Array.from({ length: Math.max(0, BARS - levels.length) }, () => 0), ...levels.slice(-BARS)];
  const latest = levels.at(-1) ?? 0;
  return (
    <span
      className="flex h-8 items-center gap-[3px]"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(latest * 100)}
    >
      {padded.map((level, index) => (
        <span
          // Bars are positional; the index is the identity.
          key={index}
          className={cn("w-1 rounded-full transition-[height] duration-100", active ? "bg-rose-400" : "bg-slate-300")}
          style={{ height: `${Math.max(12, Math.round(level * 100))}%` }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
};
